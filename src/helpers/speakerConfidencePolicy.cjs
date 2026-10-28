"use strict";

// Conservative speaker identification: an uncertain label is preferable to
// assigning an entire person's statements to another named participant.
const LIVE_MATCH_SIMILARITY = 0.88;
const LIVE_MATCH_MARGIN = 0.08;
const LIVE_RECLUSTER_SIMILARITY = 0.93;
const LIVE_OVERFLOW_SIMILARITY = 0.88;
const BATCH_LABEL_SIMILARITY = 0.90;
const BATCH_LABEL_MARGIN = 0.10;

function isConfidentMatch(bestSimilarity, runnerUpSimilarity = 0, threshold = LIVE_MATCH_SIMILARITY, margin = LIVE_MATCH_MARGIN) {
  return Number.isFinite(bestSimilarity) &&
    bestSimilarity >= threshold &&
    bestSimilarity - (Number.isFinite(runnerUpSimilarity) ? runnerUpSimilarity : 0) >= margin;
}

function mayMergeLiveSpeakers({ similarity, nameA, nameB, profileA, profileB }) {
  if (!Number.isFinite(similarity) || similarity < LIVE_RECLUSTER_SIMILARITY) return false;
  // Without ground truth, do not let an unnamed cluster contaminate a voice
  // the user has identified. Two distinct known identities must never merge.
  if (Boolean(nameA) !== Boolean(nameB)) return false;
  if (nameA && nameB && nameA !== nameB) return false;
  if ((profileA != null) !== (profileB != null)) return false;
  if (profileA != null && profileA !== profileB) return false;
  return true;
}

function canLabelBatchSpeaker(bestSimilarity, runnerUpSimilarity) {
  return isConfidentMatch(bestSimilarity, runnerUpSimilarity, BATCH_LABEL_SIMILARITY, BATCH_LABEL_MARGIN);
}

module.exports = {
  LIVE_MATCH_SIMILARITY,
  LIVE_MATCH_MARGIN,
  LIVE_RECLUSTER_SIMILARITY,
  LIVE_OVERFLOW_SIMILARITY,
  BATCH_LABEL_SIMILARITY,
  BATCH_LABEL_MARGIN,
  isConfidentMatch,
  mayMergeLiveSpeakers,
  canLabelBatchSpeaker,
};
