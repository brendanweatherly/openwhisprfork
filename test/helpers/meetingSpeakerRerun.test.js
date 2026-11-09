"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateRerunRequest, selectTimedSourceRows, capRerunSpeakerGroups,
  buildSpeakerRerunPreview, matchStableRerunSpeakerIds,
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
  assert.equal(result.method,"confidence-or-unassigned");
  assert.equal(result.unassignedNativeClusters,1);
  assert.ok(result.segments.some((s)=>s.speaker==="unassigned_acoustic"));
  assert.ok(result.segments.some((s)=>s.speaker==="speaker_0"));
});

test("stable reciprocal evidence reuses existing numeric IDs instead of renumbering all statements", () => {
  const rows = Array.from({ length: 16 }, (_, index) => ({
    speaker: index < 8 ? "speaker_1" : "speaker_2",
    source: "system", recordingSessionId: "d8-123",
    text: "Synthetic sentence " + index,
    timestamp: index,
    speakerStatus: "provisional",
  }));
  const enriched = rows.map((row, index) => ({
    ...row, speaker: index < 8 ? "speaker_11" : "speaker_12",
    speakerStatus: "confirmed",
  }));
  const selected = rows.map((segment, index) => ({index, segment}));
  const mapping = matchStableRerunSpeakerIds(rows, selected, enriched);
  assert.equal(mapping.get("speaker_11"), "speaker_1");
  assert.equal(mapping.get("speaker_12"), "speaker_2");
  const result = buildSpeakerRerunPreview({
    originalTranscript: JSON.stringify(rows), ...track,
    // A batch matcher might assign fresh numeric IDs, as normal diarization
    // does with speakerIndexBase. This is *not* evidence of a changed voice.
    diarizationManager: { mergeWithTranscript: () => enriched },
    diarizationSegments: [{speaker:"speaker_0",start:0,end:16}],
    bytes: 48000 * 20,
  });
  assert.equal(result.changedCount, 0, "existing identity must not look relabeled");
  assert.equal(result.reusedSpeakerClusters, 2);
  assert.ok(result.changedFieldsCount > 0, "metadata updates can differ from displayed labels");
  assert.deepEqual(JSON.parse(result.proposedTranscript).map(r=>r.speaker),
    rows.map(r=>r.speaker));
});

test("split or ambiguous candidate voices do not inherit a prior speaker number", () => {
  const rows=Array.from({length:12},(_,i)=>({speaker:"speaker_1",text:"Synthetic "+i}));
  const selected=rows.map((row,index)=>({index,segment:row}));
  const enriched=rows.map((row,i)=>({...row,speaker:i<6?"speaker_3":"speaker_4"}));
  assert.equal(matchStableRerunSpeakerIds(rows,selected,enriched).size,0,
    "a one-to-many split must not masquerade as a stable identity");
});
