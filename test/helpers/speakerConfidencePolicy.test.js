const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isConfidentMatch, mayMergeLiveSpeakers, canLabelBatchSpeaker,
} = require("../../src/helpers/speakerConfidencePolicy.cjs");

test("a borderline match never receives another person's live speaker label", () => {
  assert.equal(isConfidentMatch(0.655, 0), false);
  assert.equal(isConfidentMatch(0.79, 0), false);
  assert.equal(isConfidentMatch(0.863, 0), false, "meeting false-merge scores should not label voices");
  assert.equal(isConfidentMatch(0.88, 0.85), false);
  assert.equal(isConfidentMatch(0.90, 0.70), true);
});

test("similarity values from the problematic meeting are not enough to merge identities", () => {
  for (const similarity of [0.655, 0.707, 0.815, 0.863]) {
    assert.equal(mayMergeLiveSpeakers({ similarity }), false);
  }
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.96 }), true);
});

test("a named cluster cannot silently absorb an unknown cluster", () => {
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.99, nameA: "Dan", nameB: null }), false);
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.99, nameA: "Dan", nameB: "Tracey" }), false);
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.99, nameA: "Dan", nameB: "Dan" }), true);
});

test("different or only-one-confirmed speaker profiles never merge", () => {
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.99, profileA: 1, profileB: 2 }), false);
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.99, profileA: 1, profileB: null }), false);
  assert.equal(mayMergeLiveSpeakers({ similarity: 0.99, profileA: 1, profileB: 1 }), true);
});

test("post-meeting names need a high-confidence unambiguous voice match", () => {
  assert.equal(canLabelBatchSpeaker(0.60, 0.10), false);
  assert.equal(canLabelBatchSpeaker(0.88, 0.84), false);
  assert.equal(canLabelBatchSpeaker(0.90, 0.70), true);
});
