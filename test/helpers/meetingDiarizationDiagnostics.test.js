const test = require("node:test");
const assert = require("node:assert/strict");
const {
  summarizeNativeClusters,
  summarizeCapRemaps,
  summarizeTranscriptOverlap,
} = require("../../src/helpers/meetingDiarizationDiagnostics");

// These are invented acoustic windows and embeddings. No real meeting text or
// private participant data belongs in the public project tests.
test("native cluster audit records short fragmented clusters and embedding gaps without speech", () => {
  const segments = [
    { speaker: "speaker_04", start: 0, end: 1.1 },
    { speaker: "speaker_02", start: 2, end: 7 },
    { speaker: "speaker_02", start: 8, end: 11.5 },
    { speaker: "speaker_04", start: 12, end: 12.5 },
  ];
  const centroids = new Map([["speaker_02", [1, 0]]]);
  assert.deepEqual(summarizeNativeClusters(segments, centroids), [
    { speaker: "speaker_02", turns: 2, speechSeconds: 8.5, longestTurnSeconds: 5, hasEmbedding: true },
    { speaker: "speaker_04", turns: 2, speechSeconds: 1.6, longestTurnSeconds: 1.1, hasEmbedding: false },
  ]);
});

test("cap remap audit distinguishes a measured similarity from a missing embedding fallback", () => {
  const before = [
    { speaker: "speaker_0", start: 0, end: 5 },
    { speaker: "speaker_2", start: 10, end: 12 },
    { speaker: "speaker_3", start: 20, end: 21 },
  ];
  const after = [
    { speaker: "speaker_0", start: 0, end: 5 },
    { speaker: "speaker_0", start: 10, end: 12 },
    { speaker: "speaker_0", start: 20, end: 21 },
  ];
  const centroids = new Map([
    ["speaker_0", [1, 0]],
    ["speaker_2", [0.66, 0.34]],
  ]);
  const sim = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  assert.deepEqual(summarizeCapRemaps(before, after, centroids, sim), [
    { from: "speaker_2", to: "speaker_0", sourceHasEmbedding: true, targetHasEmbedding: true, similarity: 0.66 },
    { from: "speaker_3", to: "speaker_0", sourceHasEmbedding: false, targetHasEmbedding: true, similarity: null },
  ]);
  assert.throws(() => summarizeCapRemaps(before, after.slice(1), centroids, sim), /preserve/);
});

test("overlap audit detects one ASR chunk spanning two actual acoustic speaker clusters", () => {
  const chunks = [
    { source: "system", timestamp: 0, text: "synthetic chunk" },
    { source: "system", timestamp: 5, text: "next chunk" },
    { source: "system", timestamp: 10, text: "late chunk" },
    { source: "mic", timestamp: 2, text: "unrelated mic text" },
  ];
  const audio = [
    { speaker: "a", start: 0, end: 2.5 },
    { speaker: "b", start: 2.5, end: 5 },
    { speaker: "b", start: 5, end: 9 },
  ];
  assert.deepEqual(summarizeTranscriptOverlap(chunks, audio), {
    chunksWithTimestamps: 3,
    withMultipleClusters: 1,
    balancedMultipleClusters: 1,
    withNoAcousticOverlap: 1,
    aggregateVoteDiffersFromSingleTurn: 0,
  });
});

test("overlap audit reports native fragmentation in one chunk even if no speaker is named", () => {
  const chunks = [
    { source: "system", timestamp: 0, text: "synthetic text only" },
    { source: "system", timestamp: 5, text: "more text" },
  ];
  const audio = [
    { speaker: "speaker_00", start: 0, end: 1 },
    { speaker: "speaker_01", start: 1, end: 2 },
    { speaker: "speaker_00", start: 2, end: 5 },
    { speaker: "speaker_01", start: 5, end: 7.5 },
  ];
  assert.deepEqual(summarizeTranscriptOverlap(chunks, audio), {
    chunksWithTimestamps: 2,
    withMultipleClusters: 1,
    balancedMultipleClusters: 0,
    withNoAcousticOverlap: 0,
    aggregateVoteDiffersFromSingleTurn: 0,
  });
});


test("overlap audit quantifies a previous single-turn vote error without changing content", () => {
  const chunks = [
    { source: "system", timestamp: 10, text: "synthetic multi-turn voice" },
    { source: "system", timestamp: 15, text: "next transcript chunk" },
  ];
  const audio = [
    { speaker: "a", start: 10, end: 11.2 },
    { speaker: "b", start: 11.2, end: 13 },
    { speaker: "a", start: 13, end: 14.7 },
  ];
  assert.deepEqual(summarizeTranscriptOverlap(chunks, audio), {
    chunksWithTimestamps: 2,
    withMultipleClusters: 1,
    balancedMultipleClusters: 1,
    withNoAcousticOverlap: 1,
    aggregateVoteDiffersFromSingleTurn: 1,
  });
});
