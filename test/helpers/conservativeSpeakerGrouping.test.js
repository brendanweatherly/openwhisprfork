const test = require("node:test");
const assert = require("node:assert/strict");
const { coalesceConfidentSpeakerClusters } = require("../../src/helpers/conservativeSpeakerGrouping");

const similarity = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const twoTurns = (spk, base, duration = 3) => [
  { speaker: spk, start: base, end: base + duration },
  { speaker: spk, start: base + duration + 1, end: base + duration * 2 + 1 },
];

test("high-confidence mutual pair coalesces even when both are among the seven largest native groups", () => {
  const segments = [
    ...twoTurns("top_a", 0, 10), ...twoTurns("top_b", 25, 9),
    ...twoTurns("real_c", 48, 7), ...twoTurns("real_d", 70, 6),
  ];
  const centroids = new Map([
    ["top_a", [1, 0, 0]], ["top_b", [0.96, 0.28, 0]],
    ["real_c", [0, 1, 0]], ["real_d", [0, 0, 1]],
  ]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.deepEqual(result.merges, [{ from: "top_b", to: "top_a", similarity: 0.96 }]);
  assert.equal(new Set(result.segments.map((x) => x.speaker)).size, 3);
  assert.equal(result.segments.length, segments.length);
  assert.equal(segments[2].speaker, "top_b", "original input not mutated");
});

test("below existing live-recluster threshold is never enough for a merge", () => {
  const segments = [...twoTurns("a", 0), ...twoTurns("b", 20)];
  const centroids = new Map([["a", [1, 0]], ["b", [0.8, 0.6]]]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.strictEqual(result.segments, segments);
  assert.deepEqual(result.merges, []);
});

test("ambiguous alternate voice with similar strength blocks a merge", () => {
  const segments = [...twoTurns("a", 0), ...twoTurns("b", 20), ...twoTurns("c", 40)];
  const centroids = new Map([
    ["a", [1, 0]], ["b", [0.99, 0.14]], ["c", [0.98, -0.2]],
  ]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.equal(result.merges.length, 0);
});

test("overlapping acoustic turns cannot merge even with identical centroids", () => {
  const segments = [...twoTurns("a", 0), ...twoTurns("b", 2)];
  const centroids = new Map([["a", [1, 0]], ["b", [1, 0]]]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.deepEqual(result.merges, []);
});

test("single-turn and no-embedding groups remain distinct", () => {
  const segments = [...twoTurns("a", 0), { speaker: "b", start: 20, end: 40 }, ...twoTurns("c", 50)];
  const centroids = new Map([["a", [1, 0]], ["b", [1, 0]]]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.strictEqual(result.segments, segments);
  assert.deepEqual(result.merges, []);
});

test("one-pass pairing cannot chain through multiple similar fragments", () => {
  const segments = [...twoTurns("a", 0), ...twoTurns("b", 20), ...twoTurns("c", 40), ...twoTurns("d", 60)];
  const centroids = new Map([
    ["a", [1, 0, 0]], ["b", [0.99, 0.14, 0]],
    ["c", [0, 1, 0]], ["d", [0, 0.1, 0.995]],
  ]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.equal(result.merges.length, 1);
  assert.equal(result.merges[0].to, "a");
});

test("non-finite and throwing comparators cannot create unsafe merges", () => {
  const segments = [...twoTurns("a", 0), ...twoTurns("b", 20)];
  const centroids = new Map([["a", [1]], ["b", [1]]]);
  assert.equal(coalesceConfidentSpeakerClusters(segments, centroids, () => NaN).merges.length, 0);
  assert.equal(
    coalesceConfidentSpeakerClusters(segments, centroids, () => { throw Error("model broken"); }).merges.length,
    0
  );
});

test("single-turn embedding can disqualify a misleading mutual pair", () => {
  const segments = [...twoTurns("a", 0), ...twoTurns("b", 20), { speaker: "c", start: 40, end: 50 }];
  const centroids = new Map([["a", [1, 0]], ["b", [0.96, 0.28]], ["c", [0.99, 0.14]]]);
  const result = coalesceConfidentSpeakerClusters(segments, centroids, similarity);
  assert.deepEqual(result.merges, []);
});
