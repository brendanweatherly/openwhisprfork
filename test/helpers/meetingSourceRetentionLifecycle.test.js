"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  isLiveOwnedNote, createMeetingSourceAuthorization,
  canRetainMeetingNote, retainClosedMeetingTracks,
} = require("../../src/helpers/meetingSourceRetentionLifecycle");
const { getArchivedMeetingSource, deleteArchivedMeetingNote } = require("../../src/helpers/meetingAudioArchive");

const makeDb = (overrides = {}) => ({
  activeAccountId: "account-A",
  getNote: () => ({ id: 15, space_id: 8, account_id: "account-A", deleted_at: null, cloud_id: null }),
  getSpace: () => ({ kind: "private", deleted_at: null }),
  ...overrides,
});
const settings = () => ({ audioRetentionDays: 30, dataRetentionEnabled: true, localHistoryPolicyResolved: true });
const getGate = (db, overrides = {}) => createMeetingSourceAuthorization({
  databaseManager: db,
  getRetentionSettings: settings,
  getRetentionSettingsSynced: () => true,
  getSignedIn: () => true,
  ...overrides,
});

test("rejects deleted, missing, wrong-account, and other-user cloud notes", () => {
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: makeDb(), signedIn: true }), true);
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: makeDb({ getNote: () => null }), signedIn: true }), false);
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: makeDb({
    getNote: () => ({ id: 15, space_id: 8, deleted_at: "2026-10-30" }),
  }), signedIn: true }), false);
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: makeDb({
    getNote: () => ({ id: 15, space_id: 8, account_id: "account-B" }),
  }), signedIn: true }), false);
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: makeDb({
    getNote: () => ({ id: 15, space_id: 8, cloud_id: "cloud", owner_user_id: "teammate" }),
    getSpace: () => ({ kind: "team" }),
  }), signedIn: true }), false);
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: makeDb({ activeAccountId: null }), signedIn: true }), false);
});

test("local draft and owned cloud notes are eligible; unowned team cloud notes are not", () => {
  const db = makeDb({ getNote: () => ({
    id: 15, space_id: 8, cloud_id: "cloud", owner_user_id: "account-A",
  }), getSpace: () => ({ kind: "team" }) });
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: db, signedIn: true }), true);
  db.getNote = () => ({ id: 15, space_id: 8, cloud_id: "cloud", owner_user_id: null });
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: db, signedIn: true }), false);
  db.getSpace = () => ({ kind: "private" });
  assert.equal(isLiveOwnedNote({ noteId: 15, databaseManager: db, signedIn: true }), true);
});

test("policy resolution, local history, and account scope are enforced at authorization time", async () => {
  const db = makeDb();
  let enabled = true;
  const authorize = getGate(db, {
    getRetentionSettings: () => ({ ...settings(), dataRetentionEnabled: enabled }),
  });
  assert.equal(await canRetainMeetingNote(authorize, 15, "meeting-1"), true);
  enabled = false;
  assert.equal(await canRetainMeetingNote(authorize, 15, "meeting-1"), false);
  assert.equal(await canRetainMeetingNote(getGate(db, { getRetentionSettingsSynced: () => false }), 15, "meeting-1"), false);
  assert.equal(await canRetainMeetingNote(getGate(db, {
    getRetentionSettings: () => ({ ...settings(), localHistoryPolicyResolved: false }),
  }), 15, "meeting-1"), false);
  assert.equal(await canRetainMeetingNote(getGate(makeDb({ activeAccountId: null })), 15, "meeting-1"), false);
});

test("retains both closed source PCM tracks and preserves the temporary recordings", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-retain-lifecycle-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const mic = path.join(root, "temporary-mic.pcm");
  const system = path.join(root, "temporary-system.pcm");
  await fs.writeFile(mic, Buffer.from([1, 0, 2, 0]));
  await fs.writeFile(system, Buffer.from([3, 0, 4, 0]));
  const authorize = getGate(makeDb());
  const result = await retainClosedMeetingTracks({
    userDataDir: root, noteId: 15, sessionId: "meeting-1", authorize,
    tracks: [
      { source: "mic", path: mic, startedAt: 1793300000000 },
      { source: "system", path: system, startedAt: 1793300000050 },
    ],
  });
  assert.equal(result.saved.length, 2);
  assert.deepEqual(result.errors, []);
  for (const src of ["mic", "system"]) {
    const existing = await getArchivedMeetingSource({
      userDataDir: root, noteId: 15, sessionId: "meeting-1", source: src, authorize,
    });
    assert.deepEqual(await fs.readFile(existing.path), await fs.readFile(src === "mic" ? mic : system));
  }
  assert.ok(await fs.stat(mic));
  assert.ok(await fs.stat(system));
});

test("policy revoked at stop leaves no persistent PCM and never deletes diarization input", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-retain-denied-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const system = path.join(root, "temporary-system.pcm");
  await fs.writeFile(system, Buffer.from([1, 0]));
  const deny = getGate(makeDb(), { getRetentionSettings: () => ({ ...settings(), dataRetentionEnabled: false }) });
  const result = await retainClosedMeetingTracks({
    userDataDir: root, noteId: 15, sessionId: "meeting-1", authorize: deny,
    tracks: [{ source: "system", path: system, startedAt: Date.now() }],
  });
  assert.equal(result.saved.length, 0);
  assert.equal(result.errors.length, 1);
  assert.ok(await fs.stat(system));
  await assert.rejects(fs.stat(path.join(root, "meeting-source-audio")), { code: "ENOENT" });
});

test("deleted note cannot retain new PCM; deletion concurrently wins against new requests", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-retain-tombstone-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const mic = path.join(root, "temporary-mic.pcm");
  await fs.writeFile(mic, Buffer.from([1, 0, 2, 0]));
  let deleted = false;
  const db = makeDb({ getNote: () => ({ id: 15, space_id: 8, deleted_at: deleted ? Date.now() : null }) });
  const authorize = getGate(db);
  const tracks = [{ source: "mic", path: mic, startedAt: Date.now() }];
  const args = { userDataDir: root, noteId: 15, sessionId: "meeting-1", tracks, authorize };
  const saved = await retainClosedMeetingTracks(args);
  assert.equal(saved.saved.length, 1);
  deleted = true;
  await deleteArchivedMeetingNote({ userDataDir: root, noteId: 15 });
  const denied = await retainClosedMeetingTracks({ ...args, sessionId: "meeting-2" });
  assert.equal(denied.saved.length, 0);
  assert.equal(denied.errors.length, 1);
});


test("mid-archive policy revocation rolls back only the current session", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-revoke-partial-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "live-capture.pcm");
  await fs.writeFile(file, Buffer.from([1, 0, 2, 0]));
  let permitted = true;
  const db = makeDb();
  const gate = getGate(db, {
    getRetentionSettings: () => ({ ...settings(), dataRetentionEnabled: permitted }),
  });
  const first = await retainClosedMeetingTracks({
    userDataDir: root, noteId: 15, sessionId: "meeting-older", authorize: gate,
    tracks: [{ source: "mic", path: file, startedAt: Date.now() }],
  });
  assert.equal(first.saved.length, 1);
  const changingGate = async (args) => {
    if (args.source === "system") permitted = false;
    return gate(args);
  };
  const second = await retainClosedMeetingTracks({
    userDataDir: root, noteId: 15, sessionId: "meeting-new", authorize: changingGate,
    tracks: [
      { source: "mic", path: file, startedAt: Date.now() },
      { source: "system", path: file, startedAt: Date.now() },
    ],
  });
  assert.equal(second.saved.length, 0);
  assert.equal(second.errors[0].code, "SOURCE_AUDIO_NOT_AUTHORIZED");
  permitted = true;
  assert.equal(await getArchivedMeetingSource({
    userDataDir: root, noteId: 15, sessionId: "meeting-new", source: "mic", authorize: gate,
  }), null);
  assert.ok(await getArchivedMeetingSource({
    userDataDir: root, noteId: 15, sessionId: "meeting-older", source: "mic", authorize: gate,
  }));
  assert.ok(await fs.stat(file));
});


test("delete-all epoch invalidates an in-progress dual-track archival attempt", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ow-purge-epoch-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const audio = path.join(root, "temp.pcm");
  await fs.writeFile(audio, Buffer.from([1, 0, 2, 0]));
  let epoch = 3;
  let checks = 0;
  const result = await retainClosedMeetingTracks({
    userDataDir: root, noteId: 15, sessionId: "meeting-active", authorize: getGate(makeDb()),
    tracks: [
      { source: "mic", path: audio, startedAt: Date.now() },
      { source: "system", path: audio, startedAt: Date.now() },
    ],
    canContinue: () => { if (++checks === 2) epoch = 4; return epoch === 3; },
  });
  assert.equal(result.saved.length, 0);
  assert.equal(result.errors[0].code, "recording-invalidated");
  assert.equal(await getArchivedMeetingSource({
    userDataDir: root, noteId: 15, sessionId: "meeting-active", source: "mic",
    authorize: getGate(makeDb()),
  }), null);
  assert.ok(await fs.stat(audio));
});
