const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeTranscriptSegments } = require("../../src/utils/transcriptSpeakerState.ts");

const liveRow = {
  id: "seg-1",
  source: "system",
  text: "We need to meet with the customer.",
  timestamp: 19,
  speaker: "speaker_1",
  speakerName: "Dan",
  speakerStatus: "confirmed",
  speakerIsPlaceholder: false,
};

test("completed diarization cannot recover a wrong live speaker's name from persistence", () => {
  const [result] = mergeTranscriptSegments([liveRow], [{
    ...liveRow,
    speaker: "speaker_4",
    speakerName: undefined,
    speakerStatus: "confirmed",
  }]);
  assert.equal(result.speaker, "speaker_4");
  assert.equal(result.speakerName, undefined);
});

test("a user-locked name survives batch diarization", () => {
  const confirmed = {
    ...liveRow,
    speakerName: "Tracey",
    speakerStatus: "locked",
    speakerLocked: true,
    speakerLockSource: "user",
  };
  const [result] = mergeTranscriptSegments([confirmed], [{
    ...confirmed,
    speaker: "speaker_3",
    speakerName: undefined,
    speakerStatus: "confirmed",
    speakerLocked: false,
    speakerLockSource: undefined,
  }]);
  assert.equal(result.speaker, "speaker_3");
  assert.equal(result.speakerName, "Tracey");
  assert.equal(result.speakerLocked, true);
});

test("a verified incoming speaker identity is not overwritten by an old one", () => {
  const [result] = mergeTranscriptSegments([liveRow], [{
    ...liveRow, speaker: "speaker_5", speakerName: "Jamie",
  }]);
  assert.equal(result.speaker, "speaker_5");
  assert.equal(result.speakerName, "Jamie");
});


test("final unknown state survives stale live speaker and note serialization", async () => {
  const { serializeTranscriptSegments } = require("../../src/utils/transcriptSpeakerState.ts");
  const [result] = mergeTranscriptSegments([{
    ...liveRow,
    suggestedName: "Stale suggestion",
    suggestedProfileId: 27,
  }], [{
    ...liveRow,
    speaker: undefined,
    speakerName: undefined,
    suggestedName: undefined,
    suggestedProfileId: undefined,
    speakerStatus: "unassigned",
    speakerIsPlaceholder: true,
  }]);
  assert.equal(result.text, liveRow.text);
  assert.equal(result.speaker, undefined, "old live speaker ID must not come back");
  assert.equal(result.speakerName, undefined);
  assert.equal(result.suggestedName, undefined);
  assert.equal(result.speakerStatus, "unassigned");
  const parsed = JSON.parse(serializeTranscriptSegments([result]));
  assert.equal(parsed[0].speaker, undefined);
  assert.equal(parsed[0].speakerStatus, "unassigned");
  assert.equal(parsed[0].text, liveRow.text);
});

test("a user-locked speaker survives a final unassigned result during persistence merge", () => {
  const locked = {
    ...liveRow,
    speakerName: "Reviewed participant",
    speakerStatus: "locked",
    speakerLocked: true,
    speakerLockSource: "user",
  };
  const [result] = mergeTranscriptSegments([locked], [{
    ...liveRow,
    speaker: undefined,
    speakerName: undefined,
    speakerStatus: "unassigned",
    speakerIsPlaceholder: true,
    speakerLocked: false,
    speakerLockSource: undefined,
  }]);
  assert.equal(result.speaker, locked.speaker);
  assert.equal(result.speakerName, "Reviewed participant");
  assert.equal(result.speakerLocked, true);
  assert.equal(result.speakerStatus, "locked");
});
