# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - Windows debug-mode regression failures diagnosed; test harness patched, rerun pending
**Current milestone:** Validate voice-aware meeting speaker clustering against a real Teams replay
**Active work ID:** `OW-SPK-CAP-VALIDATE-20261029`
**Canonical next action:** Re-run focused speaker regression tests without inherited debug logging, inspect any remaining failures, then replay the same Teams excerpt only after the tests pass.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-CAP-VALIDATE-20261029] Re-run focused speaker regression tests without inherited debug logging, inspect any remaining failures, then replay the same Teams excerpt only after the tests pass.

## Why This Is Next

The previous multi-person Teams replay failed speaker-quality acceptance, so the working branch now attempts voice-aware remapping for surplus native clusters. The user ran the focused Windows regression suite on the refreshed code: **56 passed, 13 failed (69 total)**. All 13 failed with `TypeError: app.isReady is not a function` because the user's command prompt still had `OPENWHISPR_LOG_LEVEL=debug`, and two unit-test Electron mocks omitted `app.isReady`. Commits `f82e7f5` and `74530ec` now provide `isReady: () => false` in those test-only mocks. No application logic changed. The run must be repeated before concluding that the voice-aware fix is correct.

## Latest Material Evidence

- User's October 29 Windows console output: `npm ci` completed, then `node --import tsx --test` returned **69 tests, 56 passed, 13 failed**. All failure stacks point to `src/helpers/debugLogger.js:58` calling `app.isReady()` on an incomplete test-only Electron app stub. The later build/typecheck commands were not shown as executed after this failure.
- Test scaffolding corrections: `test/helpers/meetingSpeakerReconcile.test.js` commit `f82e7f5` and `test/helpers/meetingDiarizationEpochTimestamps.test.js` commit `74530ec`. These are committed but **not rerun**. For a quick rerun using the already-extracted same source, change the current Command Prompt to `set OPENWHISPR_LOG_LEVEL=info` before executing the same focused test command; this bypasses debug-file initialization. A refreshed ZIP with the two committed test fixes should also tolerate `debug`.
- The console log includes older app recordings with `nativeAudioClusters=32` to `audioClusters=7` on one note, and the known `9` to `7` on another. These lack newly added `capStrategy` fields, so **neither proves or disproves** the voice-aware follow-up patch on the refreshed branch.
- The older runtime portion repeatedly reports PowerShell failure to resolve Windows default microphone. The logger includes the command rather than actionable stderr; track microphone selection/reliability separately before validating dual-track capture.
- `npm ci` reported 4 dependency advisories (2 low, 1 moderate, 1 critical), not analyzed yet. Do not use `npm audit fix --force` blindly during this speaker regression investigation.
- Current acoustic candidate: `8bab551` voice-aware overflow remapping and diagnostic log, `d95a7ec` nine-to-seven synthetic end-to-end fixture; real replay **pending**.
- Baseline timestamps, speaker locks, separate audio routes, and Orukeet corrections remain protected. Accepted pending requirements: visible diarization progress overlay (Decision 0006), rerun speaker identification from retained audio without destroying reviewed transcript (Decision 0007).

## Current Hypothesis or Decision Point

- Proposed policy 0005 remains unaccepted: voice-aware overflow merging may reduce destructive joins, but can still merge different people or use duration-only fallback when centroids cannot be extracted.
- Need to determine whether any remaining errors come from native over-splitting versus transcript chunks crossing real speaker turns, since `mergeWithTranscript` still assigns one speaker per chunk.
- No ASR model or speaker-count UX change until the new cap strategy is tested and compared against the same recording.

## Next Action / Test

**Active work ID:** `OW-SPK-CAP-VALIDATE-20261029`
**Action:** [OW-SPK-CAP-VALIDATE-20261029] Re-run focused speaker regression tests without inherited debug logging, inspect any remaining failures, then replay the same Teams excerpt only after the tests pass.

**Fastest check without another download:** Open the same extracted **new-code** folder where the 69-case test ran. In that Command Prompt execute:

```cmd
set OPENWHISPR_LOG_LEVEL=info
node --import tsx --test test/helpers/meetingSpeakerReconcile.test.js test/helpers/meetingDiarizationEpochTimestamps.test.js test/helpers/diarizationSpeakerMerge.test.js test/helpers/speakerCount.test.js test/helpers/diarizationPolicy.test.js
```

This suppresses debug file logging and avoids the defective mock in the currently extracted ZIP. If all 69 pass, run `npm run typecheck` and `npm run build:renderer`, then download the branch containing the test-mock fixes when convenient and perform the same Teams excerpt real replay. If failures remain, inspect their **new** actual assertion messages rather than rerunning with debug. The source folder being tested must contain `d95a7ec` (the nine-to-seven test).

For the real replay, verify the new numeric `Post-meeting speaker cap audit` / `capStrategy` logs exist. The prior logs lacking these fields are from the older code. Preserve private audio/transcripts locally.

## Regression Checks

- No change to selectable Windows output, known-good AirPods capture, mic/system separation or local Orukeet corrections.
- Preserve October 28 time alignment and corrections. Mixed transcript turns may still require conservative unknown labeling rather than guessing names.
- Honor explicit/saved speaker count caps and user locks; do not let default attendees/live provisional counts destructively force native clusters.
- Keep remap telemetry numeric and anonymous. Watch for duration-fallback and low embedding coverage.
- Prior post-stop test still protects original text and stale-name cleanup; regression suite must be rerun after the code change.
- Speaker-index reservations, note persistence and source audio retention for re-diarization remain acceptance checks.
- Progress overlay must show accurate stages/elapsed time and terminal states when later implemented; no fake percentage or frozen UI.

## Immediate Branches

- Tests pass with loglevel `info`: proceed to typecheck/renderer build and repeat the same reference recording using the latest source branch; inspect new capStrategy metrics and stable identities.
- Tests still fail: identify the newly exposed real assertion/logic errors after the mock blocker is gone; do not assume all 13 are resolved by the fixture correction.
- Replayed speaker IDs remain mixed: separate native over-splitting (an earlier session showed 32 clusters), overflow remap fallback and transcript-turn alignment, one variable at a time.
- Mic selection fails on live Teams despite successful system audio: isolate PowerShell default-input resolver and selected device behavior; do not disrupt the known-good AirPods system route.

## Blockers / Needed Inputs

- Debug-logging Electron mock fixed in the GitHub working branch but not yet user-validated; user can rerun immediately from the existing refreshed checkout with `OPENWHISPR_LOG_LEVEL=info`.
- Full repository execution unavailable in current cloud container (GitHub DNS resolution failure); no GitHub Actions minutes consumed.
- Keep meeting audio/transcripts and customer details private and off public GitHub. Real replay, progress overlay and retained-audio reprocessing remain unverified.

