# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - user reports clean focused regression rerun; real Teams replay next
**Current milestone:** Validate voice-aware speaker attribution using the same real Teams recording
**Active work ID:** `OW-SPK-REPLAY-20261030`
**Canonical next action:** Confirm the current voice-aware branch builds cleanly, then replay the same Teams excerpt and inspect speaker accuracy plus capStrategy diagnostics.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-REPLAY-20261030] Confirm the current voice-aware branch builds cleanly, then replay the same Teams excerpt and inspect speaker accuracy plus capStrategy diagnostics.

## Why This Is Next

The user reports rerunning the focused speaker regression tests and **everything passed** after the previous 13/69 debug-logger mock failures. The exact green test output was not supplied, and the user did not separately confirm `npm run typecheck` or `npm run build:renderer` on the updated source. We should not ask for the same test suite again. The core open uncertainty is whether the candidate voice-aware overflow remapping improves the inaccurate real-world speaker assignments observed in the first Teams comparison. Rebuild and replay the **same** excerpt while recording the new `capStrategy` metrics. No need to tune models or change ASR before this benchmark.

## Latest Material Evidence

- **2026-10-30 user report:** The focused Windows speaker regression rerun completed with no failures. The prior suite contained 69 tests. This is a user-reported successful test result; raw stdout was not retained in chat and was not independently executed.
- Prior failure root cause: 13 cases were interrupted by test-only Electron `app.isReady` mocks when `OPENWHISPR_LOG_LEVEL=debug`. Test fixes were committed as `f82e7f5` and `74530ec`; an immediate workaround was to run with `OPENWHISPR_LOG_LEVEL=info`. Do not reopen these tests without new evidence.
- Candidate acoustic change: `8bab551` attempts voice-aware cluster remapping using `extractClusterCentroids` and the upload-path mapping strategy; nine-to-seven focused fixture `d95a7ec`. **Real audio replay after the change remains unverified.**
- Previous October 29 Teams test yielded 9 native clusters capped to 7 (`speakerCapSource=auto`) with some voice IDs shared across actual people. An earlier different recording yielded 32 raw clusters capped to 7, indicating possible acoustic over-splitting independently of the cap.
- Next real test should surface `capStrategy` as `voice-similarity`, `duration-fallback`, or `not-needed`; review `capEmbeddingCoverage` and safe cluster remaps. Record that raw speaker count is not itself a correctness score.
- Existing AirPods system capture, Orukeet and timestamp protection are the baseline. Previously observed Windows PowerShell default-microphone resolution errors remain separate reliability follow-up.
- User-requested post-stop progress overlay (Decision 0006) and re-diarization using retained audio (Decision 0007) remain **accepted requirements, implementation pending**.

## Current Hypothesis or Decision Point

- Proposed policy 0005 remains unaccepted: voice-aware overflow merging may reduce destructive joins, but can still merge different people or use duration-only fallback when centroids cannot be extracted.
- Need to determine whether any remaining errors come from native over-splitting versus transcript chunks crossing real speaker turns, since `mergeWithTranscript` still assigns one speaker per chunk.
- No ASR model or speaker-count UX change until the new cap strategy is tested and compared against the same recording.

## Next Action / Test

**Active work ID:** `OW-SPK-REPLAY-20261030`
**Action:** [OW-SPK-REPLAY-20261030] Confirm the current voice-aware branch builds cleanly, then replay the same Teams excerpt and inspect speaker accuracy plus capStrategy diagnostics.

1. On the **same updated-code checkout** that just passed the speaker suite, run `npm run typecheck` and `npm run build:renderer` if not already done. Do not repeat `npm ci` or the already-passing speaker suite.
2. From **x64 Native Tools Command Prompt** in that folder, set `OPENWHISPR_CHANNEL=development` and `OPENWHISPR_LOG_LEVEL=debug`, then run `npm start`.
3. Select the known-good AirPods system-audio output, enable speaker diarization, leave the automatic speaker-count control untouched, start a **new** meeting note, then play the **same** previously tested 5–10-minute Teams MP4 section through AirPods. Don't use MP4 import; it follows another pipeline.
4. Stop, allow final diarization to finish, and compare whether each actual person's speaking turns now have stable labels. Do not rename before inspecting the first results.
5. In `%APPDATA%\OpenWhispr-development\logs\debug-*.log`, obtain sanitized `Post-meeting speaker cap audit` (if emitted) and `Post-meeting diarization result delivered` entries. Focus on `nativeAudioClusters`, `speakerCapSource`, `capStrategy`, `capEmbeddingCoverage`, `capRemapCount`, `audioClusters` and whether multiple people are still assigned to the same speaker ID. Share no private meeting speech in public GitHub.

**Acceptance gate:** A clean test/build plus **measurably improved real speaker attribution** versus the original failed clip. A successful synthetic test alone cannot accept Decision 0005.

## Regression Checks

- No change to selectable Windows output, known-good AirPods capture, mic/system separation or local Orukeet corrections.
- Preserve October 28 time alignment and corrections. Mixed transcript turns may still require conservative unknown labeling rather than guessing names.
- Honor explicit/saved speaker count caps and user locks; do not let default attendees/live provisional counts destructively force native clusters.
- Keep remap telemetry numeric and anonymous. Watch for duration-fallback and low embedding coverage.
- Prior post-stop test still protects original text and stale-name cleanup; regression suite must be rerun after the code change.
- Speaker-index reservations, note persistence and source audio retention for re-diarization remain acceptance checks.
- Progress overlay must show accurate stages/elapsed time and terminal states when later implemented; no fake percentage or frozen UI.

## Immediate Branches

- Typecheck/build fails -> isolate compile error before replay; do not assume test success means Electron builds.
- Replay emits `capStrategy=voice-similarity` and labels improve -> preserve evidence and advance to transcript-speaker boundary defects / progress overlay.
- Replay emits `duration-fallback` -> investigate embedding model availability, extraction failures and diagnostics; do not count that as voice-aware validation.
- Replay still fragments or mixes voices -> compare native clusters and speaker-turn overlap; add tests for the measured root cause before changing ASR or thresholds.
- Mic input resolver fails separately -> diagnose PowerShell device selection without disturbing known-good AirPods system capture.

## Blockers / Needed Inputs

- **No test-harness blocker currently reported:** User says focused tests now pass.
- Typecheck and renderer build on the new branch were not separately confirmed by the user.
- A new real Teams replay using the code with `capStrategy` diagnostics is still needed; previous recordings used the older cap logic.
- Full repository test execution is not available from this chat runtime; no GitHub Actions minutes should be consumed. Preserve customer audio and names privately.

