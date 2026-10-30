# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - third real diagnostic replay analyzed; narrow transcript overlap correction committed
**Current milestone:** Validate aggregated speaker overlap and resolve unsupported native speaker merges
**Active work ID:** `OW-SPK-ALIGN-20261030`
**Canonical next action:** Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-ALIGN-20261030] Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.

## Why This Is Next

Three real speaker tests have now reproduced incorrect identity assignments. The latest, with diagnostic instrumentation, measured **17 native voice clusters but only 7 final labels**, 10 remaps including four without acoustic evidence, and 30 of 59 ASR chunks intersecting multiple final speaker groups. The four unsupported merges account for only 4.95 seconds of speech (~2%), so fixating only on their fallback would miss the broader fragmentation and transcript-alignment problem. The prior merger chose the longest *single* acoustic turn; a tested A/B/A synthetic counterexample shows the correct dominant voice can own more total time across several shorter turns. That narrow source bug is now patched, but the automatic cap still keeps the seven largest native groups distinct regardless of whether some belong to the same person. We should validate the patch and then solve evidence-gated upstream grouping before asking the user to replay again.

## Latest Material Evidence

- New Oct. 30 diagnostic run: `nativeAudioClusters=17`, `capStrategy=voice-similarity`, `speakerCapSource=auto`, `speakerCap=7`, `capEmbeddingCoverage=13`, `capRemapCount=10`, `audioClusters=7`, `diarizationTurns=81`, `transcriptSegments=59`, `namedSegments=0`. No audio model failure or startup blocker in this run.
- Raw group durations total ~245.84 seconds. Missing centroids: four short native groups (2.38, 1.33, 1.00 and 0.24 s), all assigned to the longest retained cluster with null match score, ~4.95 s total or 2% of speech.
- Six centroid-supported remaps scored 0.451, 0.529, 0.589, 0.614, 0.635 and 0.795; there is no calibrated cutoff establishing each as the same real voice.
- Transcript-to-voice audit: 30/59 windows overlap more than one final group, 13/59 are balanced (top accumulated voice share below 70%), one window lacks any overlap. The private transcript includes two different introductions under one placeholder label; individual real speakers also split across IDs. Keep words/names private.
- `capSpeakerClustersByVoice` always preserves the seven longest-duration native groups, so it cannot coalesce two kept groups belonging to one person. It also silently maps all centroid-missing extras to the dominant kept speaker.
- Committed corrective trial `src/helpers/diarization.js` at `07cd6ae`: sum total audio overlap per final speaker, then choose the strongest speaker. Previously the longest individual acoustic turn won even when another speaker had the longer cumulative presence.
- Synthetic guards `9d031ff`: interleaved A/B/A segments and preserving manually locked identities; existing nearest-turn fallback remains unchanged.
- Numeric diagnostic `18fec36` now reports `aggregateVoteDiffersFromSingleTurn`; tests `88ed480`, corrected expectation `4e391be`. Seven isolated Node sanity checks (four overlap selection, three audit cases) passed locally; **full project tests, Windows typecheck/build and another real replay have not run after the commits**.
- Proposed policy 0005 is still unaccepted. Accepted requirements 0006 (diarization progress overlay) and 0007 (retain original audio and re-diarize without another recording) remain unimplemented.

## Current Hypothesis or Decision Point

- Confirmed limitation: the 7-retained-cluster cap may preserve multiple native IDs for the same real person, and blind centroid-missing joins remain wrong in principle.
- Hypothesis: the largest source of the repeated label switching combines native over-fragmentation/weak similarity joins with ASR chunks spanning real turn boundaries. The logged totals alone do not establish which factor dominates a particular line.
- Source correction is **only a candidate**: summed per-speaker overlap cannot split words from two voices contained in one chunk. An uncertainty/unknown policy may be preferable to forced confident attribution but is not yet implemented or accepted.
- Do not retune sherpa thresholds, force exactly five speakers, or merge all clusters based on uncalibrated similarity scores. Preserve approved capture, timestamps, user locks and local Orukeet processing.

## Next Action / Test

**Active work ID:** `OW-SPK-ALIGN-20261030`
**Action:** [OW-SPK-ALIGN-20261030] Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.

1. On a refreshed source checkout containing commits `07cd6ae`, `9d031ff`, `18fec36`, `88ed480`, `4e391be`, validate `node --test test/helpers/meetingDiarizationDiagnostics.test.js` and `node --import tsx --test test/helpers/diarizationSpeakerMerge.test.js test/helpers/meetingSpeakerReconcile.test.js test/helpers/meetingDiarizationEpochTimestamps.test.js test/helpers/speakerCount.test.js test/helpers/diarizationPolicy.test.js`. Keep `OPENWHISPR_LOG_LEVEL=info` when using old test mocks. Follow with `npm run typecheck` and `npm run build:renderer` before the eventual live app run.
2. Before asking for yet another full MP4 playback, investigate a conservative, testable policy to merge *any* acoustically matching native groups (including the seven currently protected) only when confidence is demonstrated, and safely handle centroid-missing short turns without silently attributing them to the longest voice. Do not pick an untested cosine threshold.
3. Keep chunk-ambiguity/unknown handling separate from acoustic grouping, with explicit user-lock and serialization regression checks. `aggregateVoteDiffersFromSingleTurn` will estimate the narrow alignment improvement next run.
4. When both acoustic merging and chunk attribution are ready for acceptance, run the **same** Teams excerpt in a new note, comparing distinct actual voices and stable IDs; capture anonymized metrics. Long-term, implement retained-audio reprocessing and the diarization progress overlay to avoid repeated playback.

**Proof gate:** Focused unit tests and full Windows build pass; no transcript text or manual identity lock regresses; only then judge a real recording's correct speakers, not the seven-label count. No recording requested from the user immediately after this checkpoint.

## Regression Checks

- Summed overlap must beat longest-single-turn for the anonymous A/B/A fixture; existing no-overlap nearest fallbacks and manually locked names remain unchanged.
- `mergeWithTranscript` must preserve all transcript words and epoch/relative timestamp conversions. Do not modify Orukeet ASR, model selection or device routing.
- Source over-clustering remains separate; seven retained groups must not be treated as seven proven distinct people.
- No similarity threshold has been calibrated; never assert `similarity: 0.451` represents the same real speaker by itself.
- Preserve microphone/system separation, Windows AirPods audio, note persistence, speaker index reservations, correct reprocessing source and user-owned locks.
- Newly added metric `aggregateVoteDiffersFromSingleTurn` is counts only and must not contain words or identity names.
- Preserve two user requirements: stage-aware diarization progress overlay and retained-audio re-diarization. No more routine replay requests unless a candidate fix is ready.

## Immediate Branches

- Full Windows tests fail -> fix exact assertion or integration regression without weakening the known-good baseline.
- Native group similarities/calibrated comparisons support merging duplicates among the top seven -> add evidence-gated clustering tests before altering the cap policy.
- Ambiguous short turns lack good embeddings -> preserve uncertainty instead of assigning dominant person silently; ensure renderer/export support and user review before implementing.
- Once both native grouping and text attribution are improved -> compare same audio once and measure real speaker identity stability, then address progress overlay and retained-audio rerun.

## Blockers / Needed Inputs

- No Windows startup blocker; user successfully ran the diagnostic app and delivered all requested logs/transcript.
- The new overlap correction and tests are committed in GitHub. Seven **isolated equivalent** Node checks passed in container, not the exact full project suite; the updated Windows checkout has not tested them.
- Original Teams audio and transcript remain private. Do not commit customer/person identifiers or meeting text to the public repository. The existing app does not yet provide repeat diarization from preserved audio, so avoid asking the user for repeated manual playback until additional corrections are ready.

