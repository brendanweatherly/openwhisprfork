const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SPEAKER_STATUS,
  canonicalizeSpeakerStatus,
  isSpeakerLocked,
  canAutoRelabelSpeaker,
  applyProvisionalSpeaker,
  applyConfirmedSpeaker,
  applySuggestedSpeaker,
  applyUnassignedSpeaker,
} = require("../../src/helpers/speakerAssignmentPolicy");

test("canonicalizeSpeakerStatus maps legacy and current statuses correctly", () => {
  assert.equal(canonicalizeSpeakerStatus(SPEAKER_STATUS.PROVISIONAL), "provisional");
  assert.equal(canonicalizeSpeakerStatus(SPEAKER_STATUS.CONFIRMED), "confirmed");
  assert.equal(canonicalizeSpeakerStatus(SPEAKER_STATUS.SUGGESTED), "suggested");
  assert.equal(canonicalizeSpeakerStatus(SPEAKER_STATUS.LOCKED), "locked");

  assert.equal(canonicalizeSpeakerStatus("user_locked"), "locked");
  assert.equal(canonicalizeSpeakerStatus("suggested_profile"), "suggested");
  assert.equal(canonicalizeSpeakerStatus("uncertain_overlap"), "provisional");
  assert.equal(canonicalizeSpeakerStatus("unknown_status"), undefined);

  assert.equal(canonicalizeSpeakerStatus("provisional", { speakerLocked: true }), "locked");
  assert.equal(canonicalizeSpeakerStatus("provisional", { speakerLockSource: "user" }), "locked");
});

test("isSpeakerLocked and canAutoRelabelSpeaker check lock state accurately", () => {
  assert.equal(isSpeakerLocked({ speakerStatus: "locked" }), true);
  assert.equal(isSpeakerLocked({ speakerLocked: true }), true);
  assert.equal(isSpeakerLocked({ speakerLockSource: "user" }), true);
  assert.equal(isSpeakerLocked({ speakerStatus: "provisional" }), false);
  assert.equal(isSpeakerLocked(null), false);
  assert.equal(isSpeakerLocked(undefined), false);

  assert.equal(canAutoRelabelSpeaker({ speakerStatus: "provisional" }), true);
  assert.equal(canAutoRelabelSpeaker({ speakerStatus: "locked" }), false);
  assert.equal(canAutoRelabelSpeaker(null), true);
});

test("applyProvisionalSpeaker, applyConfirmedSpeaker, and applySuggestedSpeaker update segment fields", () => {
  const segment = { text: "hello", speaker: "A" };
  applyProvisionalSpeaker(segment, { speaker: "Speaker 1" });
  assert.equal(segment.speaker, "Speaker 1");
  assert.equal(segment.speakerStatus, "provisional");

  applyConfirmedSpeaker(segment, { speaker: "Alice" });
  assert.equal(segment.speaker, "Alice");
  assert.equal(segment.speakerStatus, "confirmed");

  applySuggestedSpeaker(segment, { speaker: "Bob" });
  assert.equal(segment.speaker, "Bob");
  assert.equal(segment.speakerStatus, "suggested");
});

test("locked segments preserve lock status on updates", () => {
  const lockedSegment = { text: "hello", speaker: "Alice", speakerLocked: true };
  applyProvisionalSpeaker(lockedSegment, { speaker: "Speaker 2" });
  assert.equal(lockedSegment.speaker, "Alice");
  assert.equal(lockedSegment.speakerStatus, "locked");
  assert.equal(lockedSegment.speakerLockSource, "user");

  applySuggestedSpeaker(lockedSegment, { speaker: "Bob" });
  assert.equal(lockedSegment.speaker, "Alice");
});


test("unassigned final speaker clears a live guess and does not erase the spoken words", () => {
  const row = {
    text: "synthetic statement",
    speaker: "speaker_4",
    speakerName: "Unreviewed live label",
    suggestedName: "Guessed profile",
    suggestedProfileId: 12,
    speakerStatus: "provisional",
  };
  applyUnassignedSpeaker(row);
  assert.equal(row.text, "synthetic statement");
  assert.equal(row.speaker, undefined);
  assert.equal(row.speakerName, undefined);
  assert.equal(row.suggestedName, undefined);
  assert.equal(row.suggestedProfileId, undefined);
  assert.equal(row.speakerIsPlaceholder, true);
  assert.equal(row.speakerStatus, "unassigned");
  assert.equal(canonicalizeSpeakerStatus("unassigned"), "unassigned");
});

test("a user-locked identity cannot be cleared by automatic unassigned processing", () => {
  const row = {
    text: "reviewed statement",
    speaker: "speaker_9",
    speakerName: "Reviewed person",
    speakerStatus: "locked",
    speakerLocked: true,
    speakerLockSource: "user",
  };
  applyUnassignedSpeaker(row);
  assert.equal(row.speaker, "speaker_9");
  assert.equal(row.speakerName, "Reviewed person");
  assert.equal(row.speakerStatus, "locked");
  assert.equal(row.speakerLocked, true);
});
