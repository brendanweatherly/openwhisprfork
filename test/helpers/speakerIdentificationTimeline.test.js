const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLiveSpeakerWindow } = require("../../src/helpers/speakerIdentificationTimeline.cjs");

test("converts live speaker offsets to transcript epoch milliseconds", () => {
  const startedAt = 1793211000000;
  const identification = {
    speakerId: "speaker_1",
    displayName: "Speaker A",
    startTime: 20.2,
    endTime: 24.8,
  };
  assert.deepEqual(normalizeLiveSpeakerWindow(identification, startedAt), {
    ...identification,
    startTime: startedAt + 20200,
    endTime: startedAt + 24800,
  });
});

test("leaves already absolute windows untouched", () => {
  const identification = {
    speakerId: "speaker_1", startTime: 1793211000100, endTime: 1793211005400,
  };
  assert.equal(normalizeLiveSpeakerWindow(identification, 1793211000000), identification);
});

test("leaves invalid windows untouched", () => {
  const invalid = { speakerId: "speaker_4", startTime: 21, endTime: 20 };
  assert.equal(normalizeLiveSpeakerWindow(invalid, 1793211000000), invalid);
  assert.equal(normalizeLiveSpeakerWindow({ startTime: 3, endTime: 5 }, null).startTime, 3);
});

test("normalized speaker windows compare directly to meeting transcription timestamps", () => {
  const start = 1793211000000;
  const w = normalizeLiveSpeakerWindow({ speakerId: "speaker_3", startTime: 19, endTime: 23 }, start);
  assert.equal(start + 21000 >= w.startTime && start + 21000 <= w.endTime, true);
  assert.equal(start + 45000 >= w.startTime && start + 45000 <= w.endTime, false);
});
