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

function validateOwner(noteId, sessionId) {
  if (!Number.isSafeInteger(noteId) || noteId <= 0) throw new Error("Invalid note ownership");
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(sessionId)) {
    throw new Error("Invalid meeting session");
  }
}

function validateSource(source) {
  if (source !== "mic" && source !== "system") throw new Error("Invalid audio source");
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
 * deleting the original. Caller must check data retention and note ownership.
 * No transcript text, names, speaker embeddings or customer metadata written.
 */
async function archiveMeetingSource({
  userDataDir, noteId, sessionId, source, inputPath, startedAt,
}) {
  const paths = ownerPaths(userDataDir, noteId, sessionId);
  validateSource(source);
  if (typeof inputPath !== "string" || !path.isAbsolute(inputPath)) {
    throw new Error("Invalid captured PCM source");
  }
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    throw new Error("Invalid audio time anchor");
  }
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
  try {
    await fs.access(destination);
    throw new Error("This source track already exists");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const temp = destination + "." + crypto.randomUUID() + ".tmp";
  const manifestTemp = paths.manifestPath + "." + crypto.randomUUID() + ".tmp";
  let committedAudio = false;
  try {
    await fs.copyFile(inputPath, temp, constants.COPYFILE_EXCL);
    if (process.platform !== "win32") await fs.chmod(temp, 0o600);
    const copied = await fs.stat(temp);
    if (copied.size !== input.size) throw new Error("Incomplete source audio copy");
    await fs.rename(temp, destination);
    committedAudio = true;

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
    // Never overwrite a previous source, and never delete the only original.
    if (committedAudio) await fs.unlink(destination).catch(() => {});
    throw error;
  } finally {
    await fs.unlink(temp).catch(() => {});
    await fs.unlink(manifestTemp).catch(() => {});
  }
}

async function getArchivedMeetingSource({ userDataDir, noteId, sessionId, source }) {
  const paths = ownerPaths(userDataDir, noteId, sessionId);
  validateSource(source);
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
}

async function deleteArchivedMeetingNote({ userDataDir, noteId }) {
  // Validated numeric note ID prevents arbitrary filesystem deletion.
  const { noteDir } = ownerPaths(userDataDir, noteId, "cleanup");
  const info = await fs.lstat(noteDir).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) return false;
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Unsafe note audio path");
  await fs.rm(noteDir, { recursive: true, force: false });
  return true;
}

module.exports = {
  ARCHIVE_FOLDER,
  archiveMeetingSource,
  getArchivedMeetingSource,
  deleteArchivedMeetingNote,
};
