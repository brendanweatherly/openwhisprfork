const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  ARCHIVE_FOLDER, mayRetainMeetingSource, archiveMeetingSource,
  getArchivedMeetingSource, deleteArchivedMeetingNote,
  cleanupArchivedMeetingSources, deleteAllArchivedMeetingSources,
} = require("../../src/helpers/meetingAudioArchive");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-test-archive-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, "synthetic-input.pcm");
  await fs.writeFile(input, Buffer.from([0, 0, 1, 0, 255, 255, 0, 0]));
  return { root, input };
}
const allowedRetention = {
  retentionSettingsSynced: true,
  retentionSettings: {
    audioRetentionDays: 30, dataRetentionEnabled: true, localHistoryPolicyResolved: false,
  },
  hasActiveAccountScope: false,
  noteAuthorized: true,
};
const authorize = async () => allowedRetention;
const save = ({ root, input }, more = {}) => archiveMeetingSource({
  userDataDir: root, noteId: 12, sessionId: "meeting-001",
  source: "system", inputPath: input, startedAt: 1793371000000, authorize,
  ...more,
});
const lookup = (root, more = {}) => getArchivedMeetingSource({
  userDataDir: root, noteId: 12, sessionId: "meeting-001", source: "system", authorize,
  ...more,
});

test("preserves a source recording byte-for-byte and keeps its time anchor", async (t) => {
  const fix = await fixture(t);
  const outcome = await save(fix);
  assert.deepEqual(outcome, { noteId: 12, sessionId: "meeting-001", source: "system", bytes: 8 });
  const found = await lookup(fix.root);
  assert.equal(found.startedAt, 1793371000000);
  assert.deepEqual(await fs.readFile(found.path), await fs.readFile(fix.input));
  assert.deepEqual(await fs.readFile(fix.input), Buffer.from([0, 0, 1, 0, 255, 255, 0, 0]));
  assert.ok(found.path.includes(ARCHIVE_FOLDER));
});

test("separately retains mic and system sources in a single note/session", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  await save(fix, { source: "mic", startedAt: 1793370999500 });
  assert.equal((await lookup(fix.root, { source: "mic" })).startedAt, 1793370999500);
  assert.equal((await lookup(fix.root)).startedAt, 1793371000000);
  const manifestPath = path.join(fix.root, ARCHIVE_FOLDER,
    "note-12", "session-meeting-001", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  assert.deepEqual(manifest.tracks.map((track) => track.source), ["system", "mic"]);
  assert.equal(manifest.tracks[0].sampleRate, 24000);
  assert.equal(manifest.tracks[0].format, "pcm_s16le");
});

test("concurrent mic and system archives cannot lose either manifest entry", async (t) => {
  const fix = await fixture(t);
  await Promise.all([
    save(fix),
    save(fix, { source: "mic", startedAt: 1793370999500 }),
  ]);
  assert.ok(await lookup(fix.root));
  assert.ok(await lookup(fix.root, { source: "mic" }));
  const manifestPath = path.join(fix.root, ARCHIVE_FOLDER,
    "note-12", "session-meeting-001", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  assert.equal(manifest.tracks.length, 2);
});

test("a duplicate cannot overwrite the first track even under concurrent writes", async (t) => {
  const fix = await fixture(t);
  const results = await Promise.allSettled([save(fix), save(fix)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  assert.equal((await lookup(fix.root)).bytes, 8);
  const manifest = JSON.parse(await fs.readFile(path.join(fix.root, ARCHIVE_FOLDER,
    "note-12", "session-meeting-001", "manifest.json"), "utf8"));
  assert.equal(manifest.tracks.length, 1);
  assert.ok(await fs.stat(fix.input), "the original capture remains intact");
});

test("valid numeric note and session ownership prevents cross-note reads", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  assert.equal(await lookup(fix.root, { noteId: 13 }), null);
  assert.equal(await lookup(fix.root, { sessionId: "meeting-002" }), null);
  await assert.rejects(save(fix, { noteId: -1 }), /Invalid note ownership/);
  await assert.rejects(save(fix, { sessionId: "../escape" }), /Invalid meeting session/);
  await assert.rejects(save(fix, { source: "../../metadata" }), /Invalid audio source/);
});

test("rejects empty inputs, symlink sources and invalid time anchors", async (t) => {
  const fix = await fixture(t);
  const empty = path.join(fix.root, "empty.pcm");
  await fs.writeFile(empty, "");
  await assert.rejects(save(fix, { inputPath: empty }), /empty or unsafe/);
  await assert.rejects(save(fix, { startedAt: 0 }), /Invalid audio time anchor/);
  if (process.platform !== "win32") {
    const symlink = path.join(fix.root, "source-link.pcm");
    await fs.symlink(fix.input, symlink);
    await assert.rejects(save(fix, { inputPath: symlink }), /empty or unsafe/);
  }
  assert.equal(await lookup(fix.root), null);
});

test("a forged note manifest cannot authorize a different note", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  const m = path.join(fix.root, ARCHIVE_FOLDER, "note-12", "session-meeting-001", "manifest.json");
  const record = JSON.parse(await fs.readFile(m, "utf8"));
  record.noteId = 13;
  await fs.writeFile(m, JSON.stringify(record));
  assert.equal(await lookup(fix.root), null);
  await assert.rejects(save(fix, { source: "mic" }), /another recording/);
});

test("deleting a note removes only its private audio and never the original PCM", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  await save(fix, { noteId: 13, sessionId: "meeting-002" });
  assert.equal(await deleteArchivedMeetingNote({ userDataDir: fix.root, noteId: 12 }), true);
  assert.equal(await lookup(fix.root), null);
  assert.ok(await lookup(fix.root, { noteId: 13, sessionId: "meeting-002" }));
  assert.ok(await fs.stat(fix.input));
  assert.equal(await deleteArchivedMeetingNote({ userDataDir: fix.root, noteId: 12 }), false);
});

test("archive does not read or delete through an unsafe note-directory symlink", async (t) => {
  if (process.platform === "win32") return t.skip("symlink creation requires Windows privilege");
  const fix = await fixture(t);
  const archiveRoot = path.join(fix.root, ARCHIVE_FOLDER);
  await fs.mkdir(archiveRoot, { recursive: true });
  await fs.symlink(fix.root, path.join(archiveRoot, "note-12"), "dir");
  await assert.rejects(save(fix), /Unsafe local archive path/);
  assert.equal(await lookup(fix.root), null);
  await assert.rejects(deleteArchivedMeetingNote({ userDataDir: fix.root, noteId: 12 }), /Unsafe note audio path/);
});


test("archive writes fail closed without live permission and never create note folders", async (t) => {
  const fix = await fixture(t);
  await assert.rejects(save(fix, { authorize: undefined }), /authorization denied/);
  await assert.rejects(save(fix, { authorize: () => false }), /authorization denied/);
  await assert.rejects(save(fix, { authorize: () => true }), /authorization denied/);
  await assert.rejects(save(fix, { authorize: () => ({
    ...allowedRetention, retentionSettingsSynced: false,
  }) }), /authorization denied/);
  await assert.rejects(save(fix, { authorize: () => { throw Error("permission provider unavailable"); } }),
    /permission provider unavailable/);
  await assert.rejects(fs.stat(path.join(fix.root, ARCHIVE_FOLDER)), { code: "ENOENT" });
  assert.ok(await fs.stat(fix.input), "denied write must preserve original recording");
});

test("authorization executes separately for both tracks within the per-note lock", async (t) => {
  const fix = await fixture(t);
  const checked = [];
  const gate = async ({ source, action, noteId, sessionId }) => {
    checked.push({ source, action, noteId, sessionId });
    return { ...allowedRetention, noteAuthorized: source === "system" };
  };
  const results = await Promise.allSettled([
    save(fix, { authorize: gate }),
    save(fix, { source: "mic", authorize: gate }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  assert.deepEqual(checked.map((v) => v.source), ["system", "mic"]);
  assert.ok(checked.every((v) => v.action === "write" &&
    v.noteId === 12 && v.sessionId === "meeting-001"));
  assert.ok(await lookup(fix.root));
  assert.equal(await lookup(fix.root, { source: "mic" }), null);
});

test("archive cannot be read after authorization is revoked", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  await assert.rejects(lookup(fix.root, { authorize: () => false }), /authorization denied/);
  await assert.rejects(lookup(fix.root, { authorize: undefined }), /authorization denied/);
  const result = await lookup(fix.root, {
    authorize: ({ action, noteId, sessionId, source }) => ({
      ...allowedRetention,
      noteAuthorized: action === "read" && noteId === 12 &&
        sessionId === "meeting-001" && source === "system",
    }),
  });
  assert.ok(result?.path);
});

test("archive retention policy rejects defaults, unresolved managed policies and deleted notes", () => {
  const base = {
    retentionSettingsSynced: true,
    retentionSettings: {
      audioRetentionDays: 30, dataRetentionEnabled: true,
      localHistoryPolicyResolved: false,
    },
    hasActiveAccountScope: false,
    noteAuthorized: true,
  };
  assert.equal(mayRetainMeetingSource(base), true, "signed-out users need no managed policy resolution");
  assert.equal(mayRetainMeetingSource({ ...base, retentionSettingsSynced: false }), false);
  assert.equal(mayRetainMeetingSource({ ...base, hasActiveAccountScope: true }), false);
  assert.equal(mayRetainMeetingSource({ ...base, hasActiveAccountScope: undefined }), false,
    "unknown account scope must not silently behave as signed out");
  assert.equal(mayRetainMeetingSource({ ...base, noteAuthorized: false }), false);
  assert.equal(mayRetainMeetingSource({ ...base, noteAuthorized: undefined }), false);
  assert.equal(mayRetainMeetingSource({ ...base, retentionSettings: {
    ...base.retentionSettings, dataRetentionEnabled: false,
  } }), false);
  assert.equal(mayRetainMeetingSource({ ...base, retentionSettings: {
    ...base.retentionSettings, audioRetentionDays: -1,
  } }), false);
  assert.equal(mayRetainMeetingSource({ ...base, hasActiveAccountScope: true,
    retentionSettings: { ...base.retentionSettings, localHistoryPolicyResolved: true },
  }), true);
  assert.equal(mayRetainMeetingSource({ ...base, retentionSettings: {
    ...base.retentionSettings, audioRetentionDays: 0,
  } }), true, "zero retains the existing keep-forever convention");
});


test("retention sweep keeps other accounts and only expires authorized notes", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  await save(fix, { noteId: 13, sessionId: "meeting-002" });
  const afterFortyDays = Date.now() + 40 * 86400000;
  const removed = await cleanupArchivedMeetingSources({
    userDataDir: fix.root, retentionDays: 30, now: afterFortyDays,
    canSweepNote: async (id) => id === 12,
  });
  assert.equal(removed.deletedSessions, 1);
  assert.equal(removed.skippedNotes, 1);
  assert.equal(await lookup(fix.root), null);
  assert.ok(await lookup(fix.root, { noteId: 13, sessionId: "meeting-002" }));
  assert.ok(await fs.stat(fix.input));
});

test("retention zero preserves recordings unless explicit purge, including multi-session notes", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  await save(fix, { sessionId: "meeting-002" });
  const keep = await cleanupArchivedMeetingSources({
    userDataDir: fix.root, retentionDays: 0, now: Date.now() + 9999 * 86400000,
    canSweepNote: async () => true,
  });
  assert.equal(keep.deletedSessions, 0);
  assert.ok(await lookup(fix.root));
  assert.ok(await lookup(fix.root, { sessionId: "meeting-002" }));
  const wipe = await deleteAllArchivedMeetingSources({ userDataDir: fix.root });
  assert.equal(wipe.deletedNotes, 1);
  assert.equal(await lookup(fix.root), null);
  assert.ok(await fs.stat(fix.input));
});

test("cleanup refuses unsafe roots and doesn't follow symlinked note directories", async (t) => {
  if (process.platform === "win32") return t.skip("symlink creation requires Windows privilege");
  const fix = await fixture(t);
  const outside = path.join(fix.root, "outside");
  await fs.mkdir(outside);
  const archive = path.join(fix.root, ARCHIVE_FOLDER);
  await fs.symlink(outside, archive, "dir");
  await assert.rejects(deleteAllArchivedMeetingSources({ userDataDir: fix.root }), /Unsafe source audio archive root/);
  await fs.unlink(archive);
  await fs.mkdir(archive);
  await fs.symlink(outside, path.join(archive, "note-12"), "dir");
  const sweep = await deleteAllArchivedMeetingSources({ userDataDir: fix.root });
  assert.equal(sweep.deletedNotes, 0);
  assert.ok(await fs.stat(outside));
});

test("failed or unresolved retention scope never removes old audio", async (t) => {
  const fix = await fixture(t);
  await save(fix);
  const result = await cleanupArchivedMeetingSources({
    userDataDir: fix.root, retentionDays: 1, now: Date.now() + 5 * 86400000,
    canSweepNote: async () => { throw new Error("account lookup unavailable"); },
  });
  assert.equal(result.skippedNotes, 1);
  assert.equal(result.deletedSessions, 0);
  assert.ok(await lookup(fix.root));
  await assert.rejects(cleanupArchivedMeetingSources({
    userDataDir: fix.root, retentionDays: -1, canSweepNote: async () => true,
  }), /Invalid source audio cleanup policy/);
});
