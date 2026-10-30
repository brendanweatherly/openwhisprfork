// Numeric-only meeting diarization diagnostics. Do not log transcript words,
// participant names, audio data, speaker profiles, or device-specific vocabulary.
// These metrics diagnose over-clustering versus ASR chunk-to-speaker alignment.

function summarizeNativeClusters(segments, centroids = null) {
  const clusters = new Map();
  for (const segment of segments || []) {
    if (!segment || segment.speaker == null) continue;
    const duration = Number.isFinite(segment.start) && Number.isFinite(segment.end)
      ? Math.max(0, segment.end - segment.start)
      : 0;
    const row = clusters.get(segment.speaker) || { turns: 0, speechSeconds: 0, longestTurnSeconds: 0 };
    row.turns += 1;
    row.speechSeconds += duration;
    row.longestTurnSeconds = Math.max(row.longestTurnSeconds, duration);
    clusters.set(segment.speaker, row);
  }
  return [...clusters]
    .sort((a, b) => b[1].speechSeconds - a[1].speechSeconds)
    .map(([speaker, row]) => ({
      speaker,
      turns: row.turns,
      speechSeconds: Number(row.speechSeconds.toFixed(2)),
      longestTurnSeconds: Number(row.longestTurnSeconds.toFixed(2)),
      ...(centroids instanceof Map ? { hasEmbedding: centroids.has(speaker) } : {}),
    }));
}

function summarizeCapRemaps(before, after, centroids, similarity) {
  if ((before || []).length !== (after || []).length) {
    throw new Error("Diarization remap must preserve the original acoustic turns");
  }
  const targets = new Map();
  for (let i = 0; i < (before || []).length; i += 1) {
    const from = before[i]?.speaker;
    const to = after[i]?.speaker;
    if (from != null && to != null && from !== to) {
      targets.set(from, to);
    }
  }
  return [...targets].map(([from, to]) => {
    const a = centroids instanceof Map ? centroids.get(from) : null;
    const b = centroids instanceof Map ? centroids.get(to) : null;
    const score = a && b && typeof similarity === "function" ? similarity(a, b) : null;
    return {
      from,
      to,
      sourceHasEmbedding: !!a,
      targetHasEmbedding: !!b,
      similarity: Number.isFinite(score) ? Number(score.toFixed(3)) : null,
    };
  });
}

function summarizeTranscriptOverlap(transcriptSegments, diarizationSegments, diarizedSource = "system") {
  const chunks = (transcriptSegments || []).filter(
    (segment) => segment?.source === diarizedSource && Number.isFinite(segment.timestamp)
  );
  let withMultipleClusters = 0;
  let balancedMultipleClusters = 0;
  let withNoAcousticOverlap = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const start = chunks[i].timestamp;
    const end = i + 1 < chunks.length ? chunks[i + 1].timestamp : start + 2.5;
    const bySpeaker = new Map();
    for (const seg of diarizationSegments || []) {
      if (!seg || seg.speaker == null) continue;
      const overlap = Math.min(end, seg.end) - Math.max(start, seg.start);
      if (overlap > 0) bySpeaker.set(seg.speaker, (bySpeaker.get(seg.speaker) || 0) + overlap);
    }
    if (bySpeaker.size === 0) {
      withNoAcousticOverlap += 1;
    } else if (bySpeaker.size > 1) {
      withMultipleClusters += 1;
      const ranked = [...bySpeaker.values()].sort((a, b) => b - a);
      const total = ranked.reduce((sum, seconds) => sum + seconds, 0);
      // Diagnostic only: a substantial second cluster prevents confidence
      // that one speaker owns the full text chunk. This never changes a label.
      if (total > 0 && ranked[0] / total < 0.7) balancedMultipleClusters += 1;
    }
  }
  return {
    chunksWithTimestamps: chunks.length,
    withMultipleClusters,
    balancedMultipleClusters,
    withNoAcousticOverlap,
  };
}

module.exports = {
  summarizeNativeClusters,
  summarizeCapRemaps,
  summarizeTranscriptOverlap,
};
