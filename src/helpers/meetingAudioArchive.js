"use strict";

// Private, note/session-owned source archive for future non-destructive speaker
// reprocessing. Not wired to live recording until retention policy and cleanup
// integration can be validated together.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { constants } = require("node:fs");

const ARCHIVE_FOLDER = "meeting-source-audio";
const FORMAT = "pcm_s16le";
const SAMPLE_RATE = 24000;
const CHANNELS = 1;

// Both tracks and note deletion serialize through the same note-owned queue.
// Never allow a concurrent mic/system write to drop one track from manifest.
const noteWrites = new Map();
async function withNoteLock(noteDir, task) {
  const previous = noteWrites.get(noteDir) ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  noteWrites.set(noteDir, current);
  try {
    await previous;
    return await task();
  } finally {
    release();
    if (noteWrites.get(noteDir) === current) noteWrites.delete(noteDir);
  }
}

function validateOwner(noteId, sessionId) {
  if (!Number.isSafeInteger(noteId) || noteId <= 0) throw new Error("Invalid note ownership");
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(sessionId)) {
    throw new Error("Invalid meeting session");
  }
}

function validateSource(source) {
  if (source !== "mic" && source !== "system") throw new Error("Invalid audio source");
}

// A synced renderer default is not sufficient consent for a managed account.
// This does not replace the caller's live note-ownership / tombstone check.
function mayRetainMeetingSource({
  retentionSettingsSynced, retentionSettings, hasActiveAccountScope, noteAuthorized,
}) {
  return retentionSettingsSynced === true &&
    noteAuthorized === true &&
    retentionSettings?.dataRetentionEnabled === true &&
    Number.isSafeInteger(retentionSettings.audioRetentionDays) &&
    retentionSettings.audioRetentionDays >= 0 &&
    (hasActiveAccountScope === false ||
      (hasActiveAccountScope === true && retentionSettings.localHistoryPolicyResolved === true));
}

async function requireArchiveAuthorization(authorize, action, noteId, sessionId, source) {
  // Explicit and re-evaluated under the per-note lock: preflight consent may
  // become stale while another track is being saved or the note is deleted.
  // The callback supplies current settings/account/note evidence, not a bare
  // boolean that could accidentally bypass the retention-policy gate.
  if (typeof authorize !== "function" ||
      !mayRetainMeetingSource(await authorize(Object.freeze({ action, noteId, sessionId, source })))) {
    const error = new Error("Source audio authorization denied");
    error.code = "SOURCE_AUDIO_NOT_AUTHORIZED";
    throw error;
  }
}

function ownerPaths(userDataDir, noteId, sessionId) {
  validateOwner(noteId, sessionId);
  if (typeof userDataDir !== "string" || !path.isAbsolute(userDataDir)) {
    throw new Error("Invalid local data directory");
  }
  const root = path.join(userDataDir, ARCHIVE_FOLDER);
  const noteDir = path.join(root, `note-${noteId}`);
  const sessionDir = path.join(noteDir, `session-${sessionId}`);
  return { root, noteDir, sessionDir, manifestPath: path.join(sessionDir, "manifest.json") };
}

async function readManifest(manifestPath) {
  try {
    const info = await fs.lstat(manifestPath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Unsafe source audio manifest");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (manifest.version !== 1 || !Array.isArray(manifest.tracks)) {
      throw new Error("Invalid source audio manifest");
    }
    return manifest;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function safeExistingDirectory(dir) {
  try {
    const info = await fs.lstat(dir);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function assertPrivateDirectory(dir) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const info = await fs.lstat(dir);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe local archive path");
  // Windows may not implement Unix permissions; on supported systems this
  // prevents another local account from browsing private recordings.
  if (process.platform !== "win32") await fs.chmod(dir, 0o700);
}

/**
 * Archives an internally captured, already-closed raw PCM source without
 * deleting the original. An explicit callback must verify current retention,
 * account permission and a live, non-deleted note under the note write lock.
 * It must return the policy snapshot required by mayRetainMeetingSource.
 * No transcript text, names, speaker embeddings or customer metadata written.
 */
async function archiveMeetingSource({
  userDataDir, noteId, sessionId, source, inputPath, startedAt, authorize,
}) {
  const paths = ownerPaths(userDataDir, noteId, sessionId);
  validateSource(source);
  if (typeof inputPath !== "string" || !path.isAbsolute(inputPath)) {
    throw new Error("Invalid captured PCM source");
  }
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    throw new Error("Invalid audio time anchor");
  }
  return withNoteLock(paths.noteDir, async () => {
    await requireArchiveAuthorization(authorize, "write", noteId, sessionId, source);
    const input = await fs.lstat(inputPath);
    if (!input.isFile() || input.isSymbolicLink() || input.size <= 0) {
      throw new Error("Captured PCM source is empty or unsafe");
    }
    await assertPrivateDirectory(paths.root);
    await assertPrivateDirectory(paths.noteDir);
    await assertPrivateDirectory(paths.sessionDir);
    const manifest = await readManifest(paths.manifestPath) ?? {
      version: 1, noteId, sessionId, createdAt: Date.now(), tracks: [],
    };
    if (manifest.noteId !== noteId || manifest.sessionId !== sessionId) {
      throw new Error("Source audio manifest belongs to another recording");
    }
    if (manifest.tracks.some((item) => item.source === source)) {
      throw new Error("This source track has already been archived");
    }

    const destination = path.join(paths.sessionDir, source + ".pcm");
    const temp = destination + "." + crypto.randomUUID() + ".tmp";
    const manifestTemp = paths.manifestPath + "." + crypto.randomUUID() + ".tmp";
    let published = false;
    try {
      await fs.copyFile(inputPath, temp, constants.COPYFILE_EXCL);
      if (process.platform !== "win32") await fs.chmod(temp, 0o600);
      const copied = await fs.stat(temp);
      if (copied.size !== input.size) throw new Error("Incomplete source audio copy");

      // Hard-link in the same directory provides atomic, no-overwrite
      // publication; rename could replace an existing user's source on Windows.
      await fs.link(temp, destination);
      published = true;
      manifest.tracks.push({
        source,
        file: source + ".pcm",
        bytes: copied.size,
        startedAt,
        format: FORMAT,
        sampleRate: SAMPLE_RATE,
        channels: CHANNELS,
      });
      await fs.writeFile(manifestTemp, JSON.stringify(manifest, null, 2), {
        flag: "wx", mode: 0o600,
      });
      await fs.rename(manifestTemp, paths.manifestPath);
      return { noteId, sessionId, source, bytes: copied.size };
    } catch (error) {
      // Never delete the original input, nor an existing source that was not
      // created by this operation. The manifest remains the source of truth.
      if (published) await fs.unlink(destination).catch(() => {});
      throw error;
    } finally {
      await fs.unlink(temp).catch(() => {});
      await fs.unlink(manifestTemp).catch(() => {});
    }
  });
}
async function getArchivedMeetingSource({ userDataDir, noteId, sessionId, source, authorize }) {
  const paths = ownerPaths(userDataDir, noteId, sessionId);
  validateSource(source);
  return withNoteLock(paths.noteDir, async () => {
  await requireArchiveAuthorization(authorize, "read", noteId, sessionId, source);
  if (
    !await safeExistingDirectory(paths.root) ||
    !await safeExistingDirectory(paths.noteDir) ||
    !await safeExistingDirectory(paths.sessionDir)
  ) return null;
  const manifest = await readManifest(paths.manifestPath);
  if (!manifest || manifest.noteId !== noteId || manifest.sessionId !== sessionId) return null;
  const entry = manifest.tracks.find((track) =>
    track.source === source &&
    track.file === source + ".pcm" &&
    track.format === FORMAT &&
    track.sampleRate === SAMPLE_RATE &&
    track.channels === CHANNELS
  );
  if (!entry) return null;
  const filename = path.join(paths.sessionDir, entry.file);
  const info = await fs.lstat(filename).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink() || info.size !== entry.bytes) return null;
  return { path: filename, startedAt: entry.startedAt, bytes: entry.bytes };
  });
}

/**
 * Public metadata only: enumerate usable source tracks for one authorized note.
 * Do not expose filesystem paths or enumerate any other note's recordings.
 * This runs under the same lock as source writes, reads and note deletion.
 */
async function listArchivedMeetingSessions({ userDataDir, noteId, authorize }) {
  const paths = ownerPaths(userDataDir, noteId, "enumerate");
  return withNoteLock(paths.noteDir, async () => {
    await requireArchiveAuthorization(authorize, "list", noteId, "enumerate", "system");
    if (!await safeExistingDirectory(paths.root) ||
        !await safeExistingDirectory(paths.noteDir)) return [];
    const rows = [];
    for (const entry of await fs.readdir(paths.noteDir, { withFileTypes: true })) {
      const match = /^session-([A-Za-z0-9][A-Za-z0-9_-]{0,100})$/.exec(entry.name);
      if (!match || !entry.isDirectory()) continue;
      const sessionId = match[1];
      const sessionDir = path.join(paths.noteDir, entry.name);
      if (!await safeExistingDirectory(sessionDir)) continue;
      let manifest;
      try {
        manifest = await readManifest(path.join(sessionDir, "manifest.json"));
      } catch {
        continue;
      }
      if (!manifest || manifest.noteId !== noteId || manifest.sessionId !== sessionId ||
          !Number.isFinite(manifest.createdAt) || manifest.createdAt <= 0) continue;
      const tracks = [];
      for (const source of ["system", "mic"]) {
        const item = manifest.tracks.find((track) =>
          track.source === source && track.file === source + ".pcm" &&
          track.format === FORMAT && track.sampleRate === SAMPLE_RATE &&
          track.channels === CHANNELS && Number.isFinite(track.startedAt) &&
          track.startedAt > 0 && Number.isSafeInteger(track.bytes) && track.bytes > 0);
        if (!item) continue;
        const stat = await fs.lstat(path.join(sessionDir, source + ".pcm")).catch(() => null);
        if (stat?.isFile() && !stat.isSymbolicLink() && stat.size === item.bytes) {
          tracks.push({ source, startedAt: item.startedAt,
            durationSeconds: item.bytes / (SAMPLE_RATE * CHANNELS * 2) });
        }
      }
      if (tracks.length) rows.push({ sessionId, createdAt: manifest.createdAt, tracks });
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  });
}

async function deleteArchivedMeetingNote({ userDataDir, noteId }) {
  // Validated numeric note ID prevents arbitrary filesystem deletion.
  const { root, noteDir } = ownerPaths(userDataDir, noteId, "cleanup");
  return withNoteLock(noteDir, async () => {
    if (!await safeExistingDirectory(root)) return false;
    const info = await fs.lstat(noteDir).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!info) return false;
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe note audio path");
    await fs.rm(noteDir, { recursive: true, force: false });
    return true;
  });
}

async function deleteArchivedMeetingSession({ userDataDir, noteId, sessionId }) {
  const paths = ownerPaths(userDataDir, noteId, sessionId);
  return withNoteLock(paths.noteDir, async () => {
    if (!await safeExistingDirectory(paths.root) ||
        !await safeExistingDirectory(paths.noteDir) ||
        !await safeExistingDirectory(paths.sessionDir)) return false;
    await fs.rm(paths.sessionDir, { recursive: true, force: false });
    try {
      await fs.rmdir(paths.noteDir);
    } catch (error) {
      if (error.code !== "ENOTEMPTY" && error.code !== "ENOENT") throw error;
    }
    return true;
  });
}

/**
 * Sweep locally retained audio without crossing account boundaries. The caller
 * must only approve notes in the currently resolved account; an unscoped
 * database lookup is NOT permission to delete another account's recordings.
 * A zero-day retention value means "keep forever" unless purge is explicit.
 * The sweep does not touch temporary recording inputs.
 */
async function cleanupArchivedMeetingSources({
  userDataDir, retentionDays, canSweepNote, purge = false, now = Date.now(),
}) {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 0 ||
      !Number.isFinite(now) || now <= 0 || typeof canSweepNote !== "function") {
    throw new Error("Invalid source audio cleanup policy");
  }
  const { root } = ownerPaths(userDataDir, 1, "sweep");
  const rootInfo = await fs.lstat(root).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const result = { scannedNotes: 0, skippedNotes: 0, deletedSessions: 0, deletedNotes: 0 };
  if (!rootInfo) return result;
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error("Unsafe source audio archive root");
  }
  const cutoff = now - retentionDays * 86400000;
  for (const row of await fs.readdir(root, { withFileTypes: true })) {
    const match = /^note-([1-9]\d*)$/.exec(row.name);
    if (!match || !row.isDirectory()) continue;
    const noteId = Number(match[1]);
    if (!Number.isSafeInteger(noteId)) continue;
    result.scannedNotes += 1;
    let approved;
    try {
      approved = (await canSweepNote(noteId)) === true;
    } catch {
      approved = false;
    }
    if (!approved) {
      result.skippedNotes += 1;
      continue;
    }
    const noteDir = path.join(root, row.name);
    await withNoteLock(noteDir, async () => {
      if (!await safeExistingDirectory(noteDir)) return;
      if (purge) {
        await fs.rm(noteDir, { recursive: true, force: false });
        result.deletedNotes += 1;
        return;
      }
      if (retentionDays === 0) return;
      const sessions = await fs.readdir(noteDir, { withFileTypes: true });
      for (const sessionRow of sessions) {
        if (!sessionRow.isDirectory() || !/^session-[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(sessionRow.name)) {
          continue;
        }
        const sessionDir = path.join(noteDir, sessionRow.name);
        if (!await safeExistingDirectory(sessionDir)) continue;
        let manifest;
        try {
          manifest = await readManifest(path.join(sessionDir, "manifest.json"));
        } catch {
          // Corrupt/unsafe manifests are not a reason to delete unknown files.
          continue;
        }
        if (!manifest || manifest.noteId !== noteId ||
            manifest.sessionId !== sessionRow.name.slice("session-".length) ||
            !Number.isFinite(manifest.createdAt) || manifest.createdAt <= 0 ||
            manifest.createdAt >= cutoff) continue;
        await fs.rm(sessionDir, { recursive: true, force: false });
        result.deletedSessions += 1;
      }
      try {
        await fs.rmdir(noteDir);
        result.deletedNotes += 1;
      } catch (error) {
        if (error.code !== "ENOTEMPTY" && error.code !== "ENOENT") throw error;
      }
    });
  }
  return result;
}

async function deleteAllArchivedMeetingSources({ userDataDir }) {
  return cleanupArchivedMeetingSources({
    userDataDir, retentionDays: 0, purge: true, canSweepNote: async () => true,
  });
}

module.exports = {
  ARCHIVE_FOLDER,
  mayRetainMeetingSource,
  archiveMeetingSource,
  getArchivedMeetingSource,
  listArchivedMeetingSessions,
  deleteArchivedMeetingNote,
  deleteArchivedMeetingSession,
  cleanupArchivedMeetingSources,
  deleteAllArchivedMeetingSources,
};
