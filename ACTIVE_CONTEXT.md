# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - mutual high-confidence pre-cap grouping committed; unassigned overflow next
**Current milestone:** Safely handle remaining automatic speaker overflow without false attribution
**Active work ID:** `OW-SPK-UNKNOWN-20261030`
**Canonical next action:** Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-UNKNOWN-20261030] Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.

## Why This Is Next

The third real Teams diagnostic exposed two independent defects: the old automatic speaker cap protected the seven largest native group IDs (even if two belonged to the same real voice) and then forced excess native groups onto those seven even when embeddings were missing or their closest cosine match was weak. A narrow first correction now permits *mutual high-confidence native pairs* to merge before the automatic cap, using the project's existing live-recluster score and margin, without affecting manual count selection. That correction is only an acoustic grouping trial; it does not prevent the later cap from falsely assigning unmatched statements to somebody else's voice. The next highest-value fix is a safe, reviewable unassigned-speaker pathway spanning the engine, transcript UI, note persistence, exports and manual locks. Do not ask for another Teams playback before that and consolidated tests are ready.

## Latest Material Evidence

- Real benchmark still stands: 17 native groups, 81 turns, seven final IDs, 13 embeddings, ten remaps, four missing-embedding joins, 59 text segments. Real people are split/merged; no new recording tested the subsequent code.
- Earlier aggregated overlap matching code `07cd6ae`, regression `9d031ff` and audit `18fec36` remain committed but need Windows integration verification; they address **text-to-acoustic turn voting**, not native group identity.
- New pure function `src/helpers/conservativeSpeakerGrouping.js` (`0b2816f`, `7f6cc24`) examines native groups with at least two distinct turns and available centroids. It requires **mutual best matching** at existing `LIVE_RECLUSTER_SIMILARITY=0.93` with `BATCH_LABEL_MARGIN=0.10`, no overlapping speech and one-pass disjoint matching. One-turn groups are still ranked as competing evidence and can block an ambiguous merge.
- Node 22 local synthetic suite: **8 of 8 passed**, including matched top-7 native pair, weak/ambiguous/no-model cases, overlapping voices, one-turn veto, non-finite scores and no transitive chain. GitHub tests `87e6329` / `af6fd38`; local run used a copy of the new pure function and constants, **not the installed application**.
- `ipcHandlers.js` commit `160aa0d` integrates pre-cap coalescence only if `countSource="auto"` and native clusters exceed `cap`; explicit/saved user-count processing is unchanged. It logs `confidentPreCapMergeCount`, `confidentPreCapMerges`, and `clustersAfterPreCapMerges` plus existing cap diagnostics. **No Windows full suite or real-audio benchmark has run after this change**.
- New decision `decisions/0008-mutual-high-confidence-precap-grouping.md` is **Proposed / implemented for validation**, and existing decision 0005 remains Proposed / real speaker identity failed.
- In the existing overflow cap, an unavailable centroid still forces a native group onto the longest kept speaker; a weak nearest candidate is also merged without a validated absolute confidence. An unknown/unassigned representation and review UX are not implemented.
- Accepted user requirements: diarization progress overlay (0006), retained-source re-diarization without re-recording (0007); both pending.

## Current Hypothesis or Decision Point

- The high-confidence pre-cap pass may consolidate a few duplicated groups among the previous seven protected IDs, but can also conservatively do nothing. It is not validated for the real Teams sample and must not be called a complete fix.
- The remaining unconditional overflow cap is a confirmed correctness defect for centroids-missing groups; the source and prior log prove false attribution risk without identity evidence.
- Project Decision 0003 accepts conservative unknown-over-wrong identity; therefore a reviewable provisional/unassigned state is preferred, provided it survives renderer, persistence, exports, note merging and user locks.
- Do not apply new acoustic thresholds or remove the automatic speaker cap blindly. Do not replace Orukeet or regress the known-good AirPods and timestamp behavior.

## Next Action / Test

**Active work ID:** `OW-SPK-UNKNOWN-20261030`
**Action:** [OW-SPK-UNKNOWN-20261030] Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.

1. Inspect the complete flow of acoustic `speaker` IDs through `diarization.js::mergeWithTranscript`, `ipcHandlers.js` speaker-set/reservation/embed mapping, `meetingRecordingStore.ts`, `transcriptSpeakerState.ts`, `MeetingTranscriptChat.tsx` and exported transcript formatting. A null/empty speaker must not resurrect a stale provisional live name or create a fake speaker ID.
2. Design and implement a conservative auto-only unknown result for extras with no usable embedding or no confident match. Reuse established speaker confidence policy rather than choosing an arbitrary new cosine threshold. Explicit user-selected counts remain authoritative; prevent unexpected changes.
3. Add anonymous tests that confirm no forced assignment of unmatched fragments, preserve every transcript word, avoid speaker-ID collisions, keep manually locked names, and display/export an understandable 'unassigned' label.
4. Run the new pure grouping/unknown tests and full focused speaker suite/typecheck/renderer build on a refreshed Windows checkout **once the complete code candidate is ready**; preserve known-good baseline `fix/meeting-speaker-timestamps-20261028`.
5. Only then compare the same Teams excerpt in one new local recording. Inspect `confidentPreCapMergeCount`, low-confidence forced joins, mixed-chunk overlap and human speaker accuracy. Avoid additional GitHub Actions minutes and never publish real audio/transcript in public GitHub.

**Proof gate:** False low-evidence speaker assignments are not made silently. All app layers and previous tests still work; a clean synthetic suite does not equal real speaker correctness.

## Regression Checks

- New pre-cap code must only affect `auto` and only above the supported cap; explicit/saved stepper counts and post-stop completion still work.
- No new fabricated threshold: existing live recluster 0.93 and batch margin 0.10 apply in the optional high-confidence pass; no weak or overlapping clusters may pre-merge.
- Unassigned acoustic statements must remain reviewable in UI, preserve all transcript text, survive note save/reload/exports, not inherit provisional wrong names and respect manual user locks.
- Protect speaker index renumbering and separate mic/system tracks, historical timestamps, Orukeet corrections and confirmed AirPods capture.
- No customer names, actual transcript lines, private audio or vocabulary in public test fixtures or numeric audit logs.
- Progress overlay and retained-audio reprocess remain accepted requirements but are not yet implemented.

## Immediate Branches

- An unknown-speaker state can round-trip safely -> validate with full Windows tests and then compare the same Teams reference recording.
- Renderer/persistence cannot yet express unknown reliably -> implement the minimal durable representation and tests before changing live algorithm behavior.
- Confidence-gated grouping merges wrong real voices -> disable trial or tighten evidence based on matched recordings, preserving Oct. 28 baseline and user locks.
- Grouping does nothing in noisy audio -> do not relax uncalibrated thresholds; investigate embedding stability or alternative local diarization models after protecting uncertainty.

## Blockers / Needed Inputs

- No immediate user input or new recording required; sufficient failed-replay evidence is already available.
- GitHub branch contains the new pure helper, tests and IPC integration; eight local synthetic Node tests passed. Full project tests/typecheck/renderer build and real audio benchmark **pending**. Do not claim completion.
- Container cannot resolve github.com to clone complete dependencies; GitHub connector works for reading/writing source. No GitHub Actions minutes consumed.
- Private meeting transcript/audio must not be committed to the public repository.

