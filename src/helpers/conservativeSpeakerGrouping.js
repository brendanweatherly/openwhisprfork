"use strict";

// A preliminary, conservative repair for native diarization over-fragmentation.
// Operates BEFORE the existing count-cap policy, so two large native clusters
// from one real voice can be considered for merging. No pair is merged solely
// to reach a target speaker count.
const {
  LIVE_RECLUSTER_SIMILARITY,
  BATCH_LABEL_MARGIN,
} = require("./speakerConfidencePolicy.cjs");

function coalesceConfidentSpeakerClusters(segments, centroids, similarity) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { segments, merges: [] };
  }
  if (!(centroids instanceof Map) || centroids.size < 2 || typeof similarity !== "function") {
    return { segments, merges: [] };
  }

  const clusters = new Map();
  for (const segment of segments) {
    if (!segment || typeof segment.speaker !== "string") continue;
    const row = clusters.get(segment.speaker) || { duration: 0, turns: [], count: 0 };
    row.count += 1;
    if (Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.end > segment.start) {
      row.duration += segment.end - segment.start;
      row.turns.push([segment.start, segment.end]);
    }
    clusters.set(segment.speaker, row);
  }

  // Require two independently segmented turns per group; a single long turn
  // provides only one voice embedding in today's extraction path.
  const eligible = [...clusters.keys()].filter((id) =>
    centroids.has(id) && clusters.get(id).turns.length >= 2
  );
  if (eligible.length < 2) return { segments, merges: [] };
  // One-turn embedded groups cannot be merged, but remain competitors: their
  // similarity can make a tempting pair ambiguous.
  const competitors = [...clusters.keys()].filter((id) => centroids.has(id));

  const pairScore = (a, b) => {
    try {
      const score = similarity(centroids.get(a), centroids.get(b));
      return Number.isFinite(score) ? score : null;
    } catch {
      return null;
    }
  };
  const ranked = new Map();
  for (const id of eligible) {
    const candidates = competitors
      .filter((other) => other !== id)
      .map((other) => ({ id: other, score: pairScore(id, other) }))
      .filter(({ score }) => score != null)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (candidates.length === 0) continue;
    const top = candidates[0];
    const runner = candidates[1]?.score ?? -1;
    if (top.score < LIVE_RECLUSTER_SIMILARITY || top.score - runner < BATCH_LABEL_MARGIN) continue;
    ranked.set(id, top);
  }

  const overlap = (a, b) => {
    // Overlapping speech is evidence against calling two acoustic groups one
    // person. Refuse a merge even if the same-model centroid is similar.
    for (const [aStart, aEnd] of clusters.get(a).turns) {
      for (const [bStart, bEnd] of clusters.get(b).turns) {
        if (Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > 0) return true;
      }
    }
    return false;
  };
  const mutual = [];
  for (const [a, top] of ranked) {
    const b = top.id;
    if (a.localeCompare(b) >= 0 || ranked.get(b)?.id !== a) continue;
    if (overlap(a, b)) continue;
    mutual.push({ a, b, score: top.score });
  }
  mutual.sort((a, b) => b.score - a.score || a.a.localeCompare(b.a));

  // One pass of disjoint, mutually supported merges. Never chain merges through
  // a weak intermediate cluster or recompute centroids from unknown identities.
  const remap = new Map();
  const merges = [];
  for (const { a, b, score } of mutual) {
    if (remap.has(a) || remap.has(b)) continue;
    const durA = clusters.get(a).duration;
    const durB = clusters.get(b).duration;
    const to = durA > durB || (durA === durB && a.localeCompare(b) < 0) ? a : b;
    const from = to === a ? b : a;
    remap.set(from, to);
    merges.push({ from, to, similarity: Number(score.toFixed(3)) });
  }

  if (merges.length === 0) return { segments, merges };
  return {
    segments: segments.map((segment) =>
      remap.has(segment.speaker)
        ? { ...segment, speaker: remap.get(segment.speaker) }
        : segment
    ),
    merges,
  };
}

module.exports = { coalesceConfidentSpeakerClusters };
