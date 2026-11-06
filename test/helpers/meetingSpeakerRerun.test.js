"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateRerunRequest, selectTimedSourceRows, capRerunSpeakerGroups,
  buildSpeakerRerunPreview,
} = require("../../src/helpers/meetingSpeakerRerun");
const base = { noteId: 2, sessionId: "d8-123", source: "system", expectedCount: 3 };
const track = { sessionId: "d8-123", source: "system", startedAt: 1_700_000_000_000, bytes: 48000 * 12 };
const makeDiarizer = () => ({
  mergeWithTranscript: (rows, diar, { speakerIndexBase }) => rows.map((row) => ({
    ...row, speaker: "speaker_" + speakerIndexBase, speakerName: undefined,
    speakerIsPlaceholder: false, speakerStatus: "confirmed", suggestedName: undefined,
    suggestedProfileId: undefined,
  })),
  capSpeakerClusters: (rows, cap) => rows.map((s) => ({
    ...s, speaker: s.speaker === "speaker_1" && cap === 1 ? "speaker_0" : s.speaker,
  })),
});
test("rejects invalid owner, audio source, session, and counts", () => {
  assert.throws(() => validateRerunRequest({ ...base, noteId: -1 }, 12));
  assert.throws(() => validateRerunRequest({ ...base, sessionId: "../hack" }, 12));
  assert.throws(() => validateRerunRequest({ ...base, source: "file" }, 12));
  assert.throws(() => validateRerunRequest({ ...base, expectedCount: 20 }, 12));
  assert.deepEqual(validateRerunRequest(base, 12), base);
});
test("only relabels the selected recording and retains all text and manually locked speakers", () => {
  const rows = [
    { text: "old", source: "system", timestamp: 1, speaker: "speaker_0",
      recordingSessionId: "other" },
    { text: "locked words", source: "system", timestamp: 2, speaker: "speaker_1",
      speakerName: "Pat", speakerLocked: true, speakerLockSource: "user",
      speakerStatus: "locked", recordingSessionId: "d8-123" },
    { text: "other words", source: "mic", timestamp: 3, speaker: "you",
      recordingSessionId: "d8-123" },
    { text: "my words unchanged", source: "system", timestamp: 4, speaker: "speaker_1",
      speakerName: "Wrong", recordingSessionId: "d8-123" },
  ];
  const input = JSON.stringify(rows);
  const output = buildSpeakerRerunPreview({ originalTranscript: input, ...track,
    diarizationSegments: [{start:0,end:10,speaker:"speaker_0"}],
    diarizationManager: makeDiarizer() });
  const result = JSON.parse(output.proposedTranscript);
  assert.equal(output.lockedCount, 1);
  assert.equal(output.changedCount, 1);
  assert.deepEqual(result[0], rows[0]);
  assert.deepEqual(result[1], rows[1]);
  assert.deepEqual(result[2], rows[2]);
  assert.equal(result[3].text, rows[3].text);
  assert.notEqual(result[3].speaker, rows[3].speaker);
  assert.equal(result[3].speakerName, undefined);
  assert.equal(result[3].recordingSessionId, "d8-123");
});
test("converts epoch milliseconds for the selected track, preserves relative seconds", () => {
  const rows = [
    { text: "a", source: "system", timestamp: track.startedAt + 3000,
      recordingSessionId: "d8-123" },
    { text: "b", source: "system", timestamp: 4.5,
      recordingSessionId: "d8-123" },
    { text: "out", source: "system", timestamp: 999,
      recordingSessionId: "d8-123" },
  ];
  const chosen = selectTimedSourceRows(rows, track);
  assert.equal(chosen.length, 2);
  assert.deepEqual(chosen.map((s) => s.segment.timestamp), [3, 4.5]);
});
test("never guesses legacy untagged or stale session transcript rows", () => {
  assert.throws(() => buildSpeakerRerunPreview({ originalTranscript: JSON.stringify([
    { text:"sensitive old", source:"system", timestamp:1 }
  ]), ...track, diarizationSegments:[{speaker:"speaker_0",start:0,end:3}],
    diarizationManager:makeDiarizer() }), /Older untagged/);
});
test("rejects malformed or plain text, without converting it to an empty transcript", () => {
  for(const originalTranscript of ["plain", "{}", '[{"text":"x"}]', "not json"]) {
    assert.throws(() => buildSpeakerRerunPreview({
      originalTranscript, ...track, diarizationSegments:[],
      diarizationManager:makeDiarizer() }));
  }
});
test("caps explicit system speaker count to count minus self", async () => {
  const segments = [
    {speaker:"speaker_0", start:0,end:2},
    {speaker:"speaker_1", start:2,end:4},
  ];
  const result = await capRerunSpeakerGroups({
    segments, expectedCount:2, source:"system", wavPath:"/tmp/synthetic.wav",
    diarizationManager:makeDiarizer(), embeddings:{isAvailable:()=>false}
  });
  assert.equal(result.cap,1);
  assert.equal(result.method,"duration-fallback");
  assert.equal(new Set(result.segments.map((s)=>s.speaker)).size,1);
});
