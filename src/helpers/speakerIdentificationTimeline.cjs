"use strict";

// The live speaker model reports offsets in seconds from the start of its
// recording. Meeting transcript chunks are stored with wall-clock timestamps
// in epoch milliseconds. Convert before matching a speaker to any chunk.
const EPOCH_MS_FLOOR = 1e11;

function normalizeLiveSpeakerWindow(identification, recordingStartedAtMs) {
  if (!identification) return identification;
  const { startTime, endTime } = identification;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return identification;
  }
  // Keep support for a future backend that already returns absolute times.
  if (startTime >= EPOCH_MS_FLOOR && endTime >= EPOCH_MS_FLOOR) {
    return identification;
  }
  if (
    !Number.isFinite(recordingStartedAtMs) ||
    recordingStartedAtMs < EPOCH_MS_FLOOR ||
    startTime < 0 ||
    endTime < startTime
  ) {
    return identification;
  }
  return {
    ...identification,
    startTime: recordingStartedAtMs + Math.round(startTime * 1000),
    endTime: recordingStartedAtMs + Math.round(endTime * 1000),
  };
}

module.exports = { normalizeLiveSpeakerWindow };
