# Decision 0009 - Preserve unassigned speech when automatic speaker matching has insufficient evidence

**Status:** Proposed / implemented for validation; focused Windows tests/build passed, real-meeting accuracy pending
**Date:** 2026-10-30
**Decision owner:** OpenWhispr fork technical implementation, implementing the accepted safety principle in Decision 0003
**Extends:** Decisions 0003, 0005 and 0008
**Supersedes:** No accepted decision; changes only the automatic **system/remote** overflow behavior on the isolated working branch

## Context

Three real Teams replay tests still assigned statements to the wrong speakers. In the latest diagnostic run, 17 native groups were reduced to seven labels; ten were remapped and four had no acoustic embedding at all. The former automatic cap assigned all overflow groups to a retained speaker, even without a plausible match. User-reviewed names, corrected transcript words and speaker locks must not be compromised.

## Candidate behavior

- Native meeting diarization first discovers clusters without an inferred speaker count. The optional mutual high-confidence pre-cap grouping from Decision 0008 remains a separate, unvalidated step.
- For automatic **system-audio** recordings with more native groups than the supported cap, `capMeetingSpeakersWithUnknown` compares overflow groups to the retained groups. It reuses `LIVE_RECLUSTER_SIMILARITY=0.93` and `BATCH_LABEL_MARGIN=0.10`, and refuses matches where acoustic turns overlap.
- When no embedding, no usable candidate or no sufficiently confident match exists, the group becomes `unassigned_acoustic`, not a fabricated numeric speaker identity or the dominant speaker.
- `mergeWithTranscript` maps that internal sentinel to a transcript row with `speaker: undefined`, `speakerStatus: "unassigned"`, cleared stale provisional names/suggestions and an editable placeholder. A manually user-locked line stays authoritative.
- The unassigned sentinel does not consume a speaker number, speaker mapping, voice profile or next-session reservation. Existing explicit/saved user speaker-count behavior stays unchanged.
- The transcript UI shows an **Unknown Speaker** label for unresolved lines. The user can select them and use the existing bulk name-assignment workflow. Manually assigning a name creates a locked line **without** inventing a numeric cluster; the displayed name remains visible and selectable for correction, with distinct name-based speaker colors.
- Note serialization and delayed diarization persistence retain this state and do not resurrect a stale automatic identity. TXT/SRT/Markdown exports show an unknown label; JSON retains the text and marks unassigned segment count separately, excluding unknown from the identified speaker count.

## Tradeoffs and boundaries

- Keeping seven native groups as separate numbered speakers does not prove they are seven real people; confidence-gated pre-cap grouping remains unvalidated.
- All otherwise-unmergeable overflow groups currently share an internal sentinel, then appear as independent unknown transcript rows. That intentionally gives up automatic cross-line identity tracking for uncertainty; it may increase manual review.
- The thresholds come from existing speaker recognition code and are **not yet calibrated for final native-cluster centroids**. A high cosine similarity is not identity proof.
- This pathway currently applies to auto **system** sessions. Mic-mode and explicit/saved limits retain prior behavior and need separate policy evaluation if real evidence shows false joins there.
- Multi-speaker ASR chunks still cannot reliably be attributed word-for-word without finer timestamps. The overlap-voting patch and numerical diagnostics are separate trials.
- This decision does not implement the user's requested diarization progress overlay or retained-audio re-diarization (Decisions 0006 and 0007).

## Implementation and evidence

Main branch (isolated working branch `fix/meeting-auto-speaker-discovery-20261029`):
- Acoustic fallback in `diarizationPolicy.js` and main IPC pipeline: commits `cb97ea63`, `a64827b1`.
- Unknown transcript conversion, lock safety, persistence, UI and export: commits `a6fab688`, `6f57fa6c`, `f2fa1c49`, `ee66e04f`, `d3037d30`.
- Acoustic/persistence/export regression fixtures: commits `3507482f`, `d615f0f`, `a6b69fa9`, `ee35c565`, `2ca483cf`.
- Additional review fixed a manually assigned unknown label being invisible (UI commits `cfaae2f8`, `a94bea2d`) and added SSR/interaction/IPC tests (`5d9c215`, `9ec6a49`, `53a8e88`, `fa61fd5`).

**Evidence level:** source and test fixtures committed and read-back verified; full focused Windows suite, typecheck, renderer build and one matched real Teams replay have **not** been executed after these changes. No user approval or runtime correctness is implied.

## Acceptance gate

1. Focused regression tests show weak, missing, overlapping and strong matches behave as intended; explicit counts and the earlier known-good baseline stay intact.
2. An actual Windows build renders unassigned and manually named, locked speakerless rows correctly; note persistence and all export formats preserve their meaning.
3. A new comparison using the same previously tested Teams excerpt reduces **false attribution to another real person**, without erasing words or breaking selected AirPods audio, timestamps or user edits.
4. Decision 0005 and this trial remain Proposed until that real-world quality evidence is reviewed.

## Reopen only if

The implementation loses data, makes manual review unusable, confuses valid in-person mic sources, mislabels voices more often, or produces evidence supporting a better calibrated matching strategy.

## Validation update - 2026-10-30

The user ran the focused `npm run verify:meeting-speakers` gate after the automatic unknown-speaker and native-coalescence code was committed: **249 tests, 245 passed, four skipped, zero failed**, plus successful TypeScript and Vite renderer build. This satisfies the **focused Windows code/build** portion of the acceptance gate, but the names/reasons of the four skips were not supplied. No matched real Teams replay of these changes has yet established actual voice accuracy; this proposal is **not Accepted**. The subsequent progress-overlay commits (Decision 0006) are outside that earlier Windows test run.
