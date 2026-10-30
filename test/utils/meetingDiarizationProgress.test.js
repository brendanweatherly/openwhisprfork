const test = require("node:test");
const assert = require("node:assert/strict");
const {
  updateMeetingDiarizationProgress,
  settleMeetingDiarizationProgress,
  dismissMeetingDiarizationProgress,
  latestNoteDiarizationProgress,
} = require("../../src/utils/meetingDiarizationProgress.ts");

const update = (previous, sessionId, noteId, stage, status) =>
  updateMeetingDiarizationProgress(previous, {
    sessionId, noteId, stage, status, startedAt: 100, updatedAt: 110,
  });

test("session stages reflect actual pipeline boundaries and do not move backward", () => {
  const one = update({}, "diar-1", 12, "preparing", "running");
  const two = update(one, "diar-1", 12, "clustering", "running");
  const three = update(two, "diar-1", 12, "matching", "running");
  const four = update(three, "diar-1", 12, "saving", "running");
  assert.equal(four["diar-1"].stage, "saving");
  assert.equal(four["diar-1"].startedAt, 100);
  assert.strictEqual(update(four, "diar-1", 12, "clustering", "running"), four);
  assert.equal(settleMeetingDiarizationProgress(four, "diar-1", "success")["diar-1"].status, "success");
});

test("completion and failure states stay terminal even after stale events", () => {
  const failed = update({}, "diar-a", 12, "matching", "failed");
  assert.strictEqual(update(failed, "diar-a", 12, "saving", "running"), failed);
  assert.strictEqual(settleMeetingDiarizationProgress(failed, "diar-a", "success"), failed);
  const skipped = update({}, "diar-b", 12, "preparing", "skipped");
  assert.strictEqual(settleMeetingDiarizationProgress(skipped, "diar-b", "success"), skipped);
});

test("a stale session cannot move a progress event into a different note", () => {
  const initial = update({}, "diar-a", 12, "preparing", "running");
  assert.strictEqual(update(initial, "diar-a", 13, "clustering", "running"), initial);
  const both = update(initial, "diar-b", 13, "clustering", "running");
  assert.equal(both["diar-a"].noteId, 12);
  assert.equal(latestNoteDiarizationProgress(both, 99), null);
});

test("invalid events never create a false processing state", () => {
  const original = {};
  assert.strictEqual(updateMeetingDiarizationProgress(original, { noteId: 12 }), original);
  assert.strictEqual(updateMeetingDiarizationProgress(original, {
    sessionId: "bad", noteId: null, stage: "preparing",
  }), original);
  assert.strictEqual(updateMeetingDiarizationProgress(original, {
    sessionId: "bad", noteId: 12, stage: "invented",
  }), original);
});

test("navigation preserves the progress of the right note and dismiss only clears its session", () => {
  let progress = update({}, "diar-1", 12, "preparing", "running");
  progress = update(progress, "diar-2", 13, "saving", "running");
  const target = latestNoteDiarizationProgress(progress, 12);
  assert.equal(target.sessionId, "diar-1");
  const dismissed = dismissMeetingDiarizationProgress(progress, "diar-1");
  assert.equal(latestNoteDiarizationProgress(dismissed, 12), null);
  assert.equal(latestNoteDiarizationProgress(dismissed, 13).sessionId, "diar-2");
});

test("unmatched completion cannot create a progress entry or clear another job", () => {
  const original = update({}, "diar-2", 13, "preparing", "running");
  assert.strictEqual(settleMeetingDiarizationProgress(original, "diar-old", "success"), original);
  assert.strictEqual(dismissMeetingDiarizationProgress(original, "diar-old"), original);
});
