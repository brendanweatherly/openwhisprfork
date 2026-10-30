# Decision 0005 - Final diarization uses native speaker discovery; only user-set counts limit it

**Status:** Proposed (voice-aware cap exercised in October 30 replay, but speaker attribution still fails; no policy acceptance)
**Date:** 2026-10-29
**Decision owner:** OpenWhispr fork project (technical proposal; user approval not inferred)
**Supersedes:** Previous implicit behavior that allowed defaults, calendar rosters, and provisional live cluster counts to cap final results
**Superseded by:** none

## Context

The October 28 meeting fork could pass an inferred or default speaker count into native diarization and cap its output to one remote voice. In a real four-participant meeting, the final result collapsed to one cluster. A separate older branch's test fixture indicated that forcing native count could merge distinct voices before later reconciliation.

## Proposed decision

On the isolated branch `fix/meeting-auto-speaker-discovery-20261029`:
- Let native final meeting diarization discover speakers automatically first.
- Apply any speaker-count ceiling after acoustic discovery.
- Treat **explicit user-selected** or **persisted user-entered** speaker totals as hard ceilings, with the active explicit choice taking precedence over the saved value.
- Do **not** let untouched defaults, incomplete calendar rosters, or provisional live speaker labels destructively cap final speakers.
- Respect the supported maximum (7 remote/system speakers or 8 mic-track speakers).
- Log raw clusters, final clusters, cap, and cap source for reproducible diagnosis.

## Rationale

An inferred count is not strong enough evidence to discard genuine voices. Speaker identity should be grounded in the actual acoustic results, while genuine user decisions remain authoritative.

## Alternatives considered

- Force native speaker count from default/calendar/live guesses: rejected for this trial because it can erase distinct voices.
- Force native count from an explicit user selection: not used in the trial because cluster discovery should still occur before applying the user's ceiling.
- Remove all count limits: rejected because an explicitly chosen user count and supported maximum must still be honored.

## Tradeoffs and residual risk

- Auto-clustering may over-segment one person's voice.
- The current `capSpeakerClusters` routine can fold extra clusters into retained clusters; this remains a possible misattribution source.
- Focused code changes and committed tests are **not equivalent to passed tests or real-meeting proof**.

## Evidence / sources

- Working branch code commit `c0e30a83c7d73ebe5fd5f4ea0f21b18af5045fb4`.
- Working branch tests commit `1bf18822b319348485815acb58fd9f710bfab4d8` (committed, not yet executed at time of this decision).
- Prior isolated fix `codex/raw-speaker-collapse-fix` commit `6adfb77361c88dd8e0559fb9ce1d884e58d57050`.
- Prior real meeting reportedly collapsed four participants to one cluster.

## Real-replay evidence (2026-10-29)

A real Teams playback through the working-branch meeting recorder produced native **9** acoustic clusters, automatically capped to **7**, over **36** acoustic turns and **35** transcript segments. The overlapping reference contained approximately **6** identifiable voices. One final placeholder label owned **21 of 35** transcript segments and was associated with multiple different real voices; other individual real voices were fragmented across several labels.

The log reported `speakerCapSource: "auto"` and `namedSegments: 0`. A missing assigned name is not by itself a clustering error; mixed and split voices are the failure. Code inspection confirms the meeting path's `capSpeakerClusters` folds all above-cap clusters onto the longest remaining speaker, unlike the voice-similarity-based strategy found in the separate upload pipeline.

The trial avoided the former single-speaker collapse but **did not satisfy** the acoustic-identity acceptance gate. The maximum-cap and transcript-turn alignment policy require diagnosis; do not silently call this proposed decision Accepted. The private transcript and participant names are intentionally not committed.

## Follow-up implementation under validation (2026-10-29)

After the failed replay, the meeting-only cap in `src/helpers/ipcHandlers.js` was changed on the same working branch (commit `8bab551`) to attempt `speakerEmbeddings.extractClusterCentroids` **before** folding clusters, and to use the existing `diarizationPolicy.capSpeakerClustersByVoice` mapping (already used by the upload path) when usable centroids exist. A nine-raw-to-seven-final synthetic end-to-end test was committed (`d95a7ec`) to protect against the former behavior that sent every overflow voice to the primary cluster. Numeric-only diagnostics now distinguish `voice-similarity` from `duration-fallback` and show remapped cluster IDs.

**Evidence:** The isolated pure voice-cap algorithm passed a container test with nine synthetic clusters and known vectors. The full repository regression tests, Windows renderer/typecheck on the updated code, and a second real Teams replay have **not** been executed since these commits.

**Residual risk:** If voice centroids cannot be extracted, the current implementation still falls back to duration-only folding to respect the configured ceiling; this must be clearly logged and addressed if it occurs in real use. Even with embeddings, clustering a real voice more than once or attributing a multi-speaker transcript chunk to one voice can remain incorrect. This patch does not resolve audio retention/re-diarization or the progress overlay.

## Real-replay evidence after voice-aware cap (2026-10-30)

The new Windows development-branch recording **did execute** `capStrategy: "voice-similarity"` (not the global duration-only fallback), but the user-supplied log shows **14 native acoustic clusters, 7 final clusters, 11 of 14 native clusters with embeddings, 7 remapped cluster IDs, 39 acoustic turns, 43 transcript chunks, and zero automatically named chunks**. The overlapping Teams reference contains approximately **five actual voices**, yet the final transcript repeatedly gives different speaker labels to the same real person and reuses one label for different people.

**Interpretation:** The embedding path was reached; it did **not** pass real speaker-accuracy acceptance. The label `voice-similarity` does not mean that all seven individual remaps have a measured similarity: `capSpeakerClustersByVoice` still routes extras without embeddings to the longest kept cluster and may select a weak nearest match without a minimum score. Also, `mergeWithTranscript` currently selects the single largest overlapping acoustic turn for a multi-second text chunk, which can span multiple actual speakers. It is not yet proven which mechanism dominates the mistakes.

**Next evidence gate:** Commits `88abab3`, `7bc8cba` and `f6c2904` add numeric-only diagnostics and anonymous tests for raw acoustic turn durations, missing embeddings, individual remap similarity/fallback evidence, and multi-cluster transcript overlap. Four equivalent synthetic diagnostics passed locally; the full fork/Windows integration suite and diagnostics replay have **not** been executed after these commits. No meeting words, names, or voice data were committed.

This decision remains **Proposed**. Do not tune the native clustering threshold, accept the cap as correct, or promote the working branch based only on a seven-cluster output.

## Acceptance gate

Keep this proposal **unaccepted** after the failed real replay. Diagnose the destructive 9-to-7 automatic cap and transcript-turn alignment; then require focused regression tests, typecheck/build, and a new representative replay demonstrating distinct, stable speaker IDs, correct timestamps and no regressions to user locks, corrections or selected audio paths.

## Reopen only if

Testing shows over-splitting, harmful cap folding, false identity, or a newer acoustic model/policy proves a better strategy.
