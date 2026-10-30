const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  ARCHIVE_FOLDER, archiveMeetingSource, getArchivedMeetingSource, deleteArchivedMeetingNote,
} = require("../../src/helpers/meetingAudioArchive");

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-test-archive-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = path.join(root, "synthetic-input.pcm");
  await fs.writeFile(input, Buffer.from([0, 0, 1, 0, 255, 255, 0, 0]));
  return { root, input };
}
const save = ({ root, input }, more = {}) => archiveMeetingSource({
  userDataDir: root, noteId: 12, sessionId: "meeting-001",
  source: "system", inputPath: input, startedAt: 1793371000000,
  ...more,
});
const lookup = (root, more = {}) => getArchivedMeetingSource({
  userDataDir: root, noteId: 12, sessionId: "meeting-001", source: "system",
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
