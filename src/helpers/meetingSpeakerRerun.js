"use strict";

/**
 * Pure speaker-only rerun policy. A rerun may annotate only rows explicitly
 * tagged with this captured session. All words, order, IDs, timestamps,
 * unrelated recording sessions, locked assignments and note fields survive.
 */
const { isSpeakerLocked } = require("./speakerAssignmentPolicy");
const { capMeetingSpeakersWithUnknown } = require("./diarizationPolicy");
const SPEAKER_FIELDS = [
  "speaker", "speakerName", "speakerIsPlaceholder", "suggestedName",
  "suggestedProfileId", "speakerStatus", "speakerLocked", "speakerLockSource",
];

function validateRerunRequest({ noteId, sessionId, source, expectedCount }, maxSpeakerCount) {
  if (!Number.isSafeInteger(noteId) || noteId <= 0) throw new Error("Invalid note ID");
  if (typeof sessionId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(sessionId)) {
    throw new Error("Invalid recording session ID");
  }
  if (source !== "system" && source !== "mic") throw new Error("Invalid audio source");
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 1 ||
      expectedCount > maxSpeakerCount) throw new Error("Invalid speaker count");
  return { noteId, sessionId, source, expectedCount };
}

function parseRerunTranscript(value) {
  if (typeof value !== "string" || !value.trim().startsWith("[")) {
    throw new Error("This note does not have a timed meeting transcript");
  }
  let rows;
  try { rows = JSON.parse(value); } catch { throw new Error("Invalid saved transcript"); }
  if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== "object" ||
      typeof row.text !== "string" || !["mic", "system"].includes(row.source))) {
    throw new Error("Invalid saved transcript segments");
  }
  return rows;
}

function getRerunBaseIndex(rows) {
  let max = -1;
  for (const row of rows) {
    const match = /^speaker_(\d+)$/.exec(String(row.speaker || ""));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function selectTimedSourceRows(rows, { sessionId, source, startedAt, bytes }) {
  if (!Number.isFinite(startedAt) || startedAt <= 0 ||
      !Number.isSafeInteger(bytes) || bytes <= 0) throw new Error("Invalid archived audio");
  const duration = bytes / 48000; // 24 kHz, mono PCM16
  const selected = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    // A historical transcript without an explicit recording-session identity
    // cannot be safely associated with one of the note's multiple recordings.
    if (row.recordingSessionId !== sessionId || row.source !== source) continue;
    const stamp = row.timestamp;
    if (!Number.isFinite(stamp)) continue;
    const seconds = stamp > 1e11 ? (stamp - startedAt) / 1000 : stamp;
    if (seconds < -0.25 || seconds > duration + 1) continue;
    selected.push({ index, segment: { ...row, timestamp: Math.max(0, seconds) } });
  }
  selected.sort((a, b) => a.segment.timestamp - b.segment.timestamp || a.index - b.index);
  if (!selected.length) throw new Error(
    "No timed transcript rows belong to this recording. Older untagged notes cannot be reprocessed safely."
  );
  return selected;
}

async function capRerunSpeakerGroups({
  segments, expectedCount, source, wavPath, diarizationManager, embeddings,
}) {
  if (!Array.isArray(segments) || !segments.length) {
    throw new Error("Speaker model could not detect any voices");
  }
  const count = new Set(segments.map((s) => s.speaker)).size;
  const cap = Math.max(1, expectedCount - (source === "system" ? 1 : 0));
  if (count <= cap) return { segments, detectedCount: count, cap, method: "native" };
  let centroids = new Map();
  try {
    if (embeddings?.isAvailable?.()) {
      centroids = await embeddings.extractClusterCentroids(wavPath, segments);
    }
  } catch { /* No unvalidated confidence claims when embeddings are unavailable. */ }
  // A duration-only remap can falsely label a completely different person.
  // Unknown/unassigned is safer, even for an explicit count, when voice
  // embeddings are missing or do not confidently match a retained cluster.
  const result = capMeetingSpeakersWithUnknown(
    segments, cap, centroids,
    (a, b) => embeddings.cosineSimilarity(a, b)
  );
  return { segments: result.segments, detectedCount: count, cap,
    method: "confidence-or-unassigned",
    unassignedNativeClusters: result.unassignedNativeClusters.length };
}

function buildSpeakerRerunPreview({
  originalTranscript, sessionId, source, startedAt, bytes, diarizationSegments,
  diarizationManager,
}) {
  const rows = parseRerunTranscript(originalTranscript);
  const selected = selectTimedSourceRows(rows, { sessionId, source, startedAt, bytes });
  const base = getRerunBaseIndex(rows);
  const enriched = diarizationManager.mergeWithTranscript(
    selected.map((item) => item.segment),
    diarizationSegments,
    { diarizedSource: source, speakerIndexBase: base }
  );
  if (!Array.isArray(enriched) || enriched.length !== selected.length) {
    throw new Error("Speaker matching did not return every transcript row");
  }
  const proposed = rows.map((row) => ({ ...row }));
  let changedCount = 0;
  let lockedCount = 0;
  for (let i = 0; i < selected.length; i++) {
    const { index } = selected[i];
    const previous = rows[index];
    if (isSpeakerLocked(previous)) { lockedCount++; continue; }
    const candidate = enriched[i];
    // Never let a matching failure erase a previously reviewed transcript.
    if (candidate.speakerStatus !== "confirmed" && candidate.speakerStatus !== "unassigned") {
      continue;
    }
    const updated = proposed[index];
    for (const key of SPEAKER_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(candidate, key) && candidate[key] !== undefined) {
        updated[key] = candidate[key];
      } else {
        delete updated[key];
      }
    }
    if (SPEAKER_FIELDS.some((key) => previous[key] !== updated[key])) changedCount++;
  }
  return { proposedTranscript: JSON.stringify(proposed), changedCount, lockedCount,
    matchedCount: selected.length };
}

module.exports = {
  validateRerunRequest, parseRerunTranscript, getRerunBaseIndex,
  selectTimedSourceRows, capRerunSpeakerGroups, buildSpeakerRerunPreview,
};
