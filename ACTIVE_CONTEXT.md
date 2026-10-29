# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - state consistency repair
**Current milestone:** Validate automatic speaker discovery before real-meeting replay
**Active work ID:** `OW-SPK-VALIDATION-20261029`
**Canonical next action:** Run focused speaker-regression tests on the working branch.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-VALIDATION-20261029] Run focused speaker-regression tests on the working branch.

## Why This Is Next

The speaker-count implementation has already been committed. The failure exposed in the real four-participant test cannot be declared corrected until focused tests and a representative meeting replay pass. Do not reopen transcription model tuning or rename UI work ahead of upstream validation.

## Latest Material Evidence

- `c0e30a83`: native final diarization now discovers clusters without a forced count, then applies a cap.
- `1bf18822`: tests added for user-selected/saved counts and automatic discovery.
- The untouched default speaker count, incomplete calendar roster, and provisional live labels no longer determine a destructive final cap on this work branch.
- Count source and pre-/post-cap acoustic cluster counts are now logged.
- **Code and tests were committed but no test suite, typecheck, renderer build, Windows run, or real Teams replay has yet been executed.**

## Current Hypothesis or Decision Point

- Proposed policy: explicit/saved user-selected counts alone form hard final speaker caps; other counts are hints, not proof. See `decisions/0005-final-diarization-speaker-count-policy.md`.
- Main unknown: whether the implementation preserves distinct remote speakers without over-splitting, cap folding, or violating existing user locks.

## Next Action / Test

**Active work ID:** `OW-SPK-VALIDATION-20261029`
**Action:** [OW-SPK-VALIDATION-20261029] Run focused speaker-regression tests on the working branch.

Run:
`node --import tsx --test test/helpers/meetingSpeakerReconcile.test.js test/helpers/meetingDiarizationEpochTimestamps.test.js test/helpers/diarizationSpeakerMerge.test.js test/helpers/speakerCount.test.js test/helpers/diarizationPolicy.test.js`

Then run `npm run typecheck` and `npm run build:renderer`.

**Expected proof:** Targeted tests exercise explicit vs automatic caps and preserve the Oct. 28 timestamp, identity, and merge behavior. These tests are the gate to real-recording validation, not the final proof.

## Regression Checks

- Native vs post-cap cluster counts and cap source.
- Correct timestamp normalization and final diarization delivery.
- User speaker locks, reviewed names, and note persistence.
- No stale live/provisional identities overriding final clusters.
- Mic/system separation and working AirPods output; no silent selected-device fallback.
- Device-local Orukeet corrections remain unchanged.

## Immediate Branches

- Positive -> Replay the known four-participant Teams meeting; compare heard voices, raw/final clusters, speaker names, completion delivery, and retained audio.
- Negative -> Diagnose the specific failed test without weakening unrelated guarantees or changing thresholds speculatively.
- Inconclusive -> Instrument the relevant stage and preserve the branch as unverified.

## Blockers / Needed Inputs

- Tests require a ready Node/Electron dependency environment; real replay requires the Teams reference recording.
- No further code change is justified before checking the committed implementation.
