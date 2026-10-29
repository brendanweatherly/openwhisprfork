# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - voice-aware cap code and regression committed; revalidation pending
**Current milestone:** Validate voice-aware meeting speaker clustering against a real Teams replay
**Active work ID:** `OW-SPK-CAP-VALIDATE-20261029`
**Canonical next action:** Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-CAP-VALIDATE-20261029] Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.

## Why This Is Next

The October 29 real Teams replay proved the old meeting auto cap folded nine native voice groups to seven and mixed multiple people under one label. Source review found the meeting cap used duration-only folding, while the upload path already had a voice-similarity strategy. The working branch now reuses that strategy for meeting overflow clusters, with targeted diagnostic logging and a new nine-to-seven integration regression. This is an unvalidated candidate fix. Re-run code checks and compare the **same recording** before changing transcription models, thresholds, or text alignment.

## Latest Material Evidence

- Earlier chat recovered: a previous four-person meeting reported `numSpeakers=-1` but only one final audio speaker because inferred/default limits overrode native discovery. A timestamp end/start mistake and stale name propagation were separately corrected in the Oct. 28 baseline; those fixes must remain intact.
- Recent replay (October 29): 9 native acoustic clusters, `speakerCap=7`, `speakerCapSource=auto`, 7 final clusters, 36 turns, 35 text chunks, 0 auto names. Six actual speakers in the overlapping Teams reference, with the same app speaker ID used across several real voices.
- New source commit `8bab551`: `ipcHandlers.js` gets source-WAV cluster centroids and uses `capSpeakerClustersByVoice` for overflow groups, matching the existing upload path rather than folding all extras into the longest speaker. It logs `capStrategy`, `capEmbeddingCoverage`, `capRemapCount` and a synthetic-ID-only remap audit.
- New test commit `d95a7ec`: nine-to-seven end-to-end post-stop fixture with distinct voice vectors and no confidential content; checks that extras map to separate acoustically matching retained groups.
- An isolated pure-algorithm test using the same nine synthetic vectors passed in the container. **Full repository regression tests/typecheck/renderer build after this change and a real Windows replay have not been run.**
- Prior chat's re-diarization from retained audio and preservation of transcript/corrections remain outstanding. The user-requested progress overlay is an accepted requirement (Decision 0006), not yet implemented.

## Current Hypothesis or Decision Point

- Proposed policy 0005 remains unaccepted: voice-aware overflow merging may reduce destructive joins, but can still merge different people or use duration-only fallback when centroids cannot be extracted.
- Need to determine whether any remaining errors come from native over-splitting versus transcript chunks crossing real speaker turns, since `mergeWithTranscript` still assigns one speaker per chunk.
- No ASR model or speaker-count UX change until the new cap strategy is tested and compared against the same recording.

## Next Action / Test

**Active work ID:** `OW-SPK-CAP-VALIDATE-20261029`
**Action:** [OW-SPK-CAP-VALIDATE-20261029] Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.

1. Refresh the Windows source checkout from GitHub branch `fix/meeting-auto-speaker-discovery-20261029`. The user's previously extracted ZIP predates commits `8bab551` and `d95a7ec`, so launching it would test the old logic.
2. Run `node --import tsx --test test/helpers/meetingSpeakerReconcile.test.js test/helpers/meetingDiarizationEpochTimestamps.test.js test/helpers/diarizationSpeakerMerge.test.js test/helpers/speakerCount.test.js test/helpers/diarizationPolicy.test.js`; then `npm run typecheck` and `npm run build:renderer`.
3. If tests pass, use the x64 Native Tools Command Prompt to launch the refreshed development app with `OPENWHISPR_CHANNEL=development` and `OPENWHISPR_LOG_LEVEL=debug`, then `npm start`.
4. Replay the same identifiable 5–10-minute Teams segment through the selected known-good AirPods output while recording a **new note**; leave the speaker count untouched. Wait for post-stop diarization completion.
5. Inspect the numeric-only `Post-meeting speaker cap audit` and `Post-meeting diarization result delivered` events: `capStrategy`, `embeddingCoverage`, remapped synthetic speaker IDs, counts, and whether actual people's turns hold stable speaker IDs. Do not publish private audio/text in GitHub.
6. If mixed attributions remain, add separate mixed-chunk overlap regression tests; do not retune thresholds or rebuild the ASR model before isolating the source.

**Proof:** Updated focused tests pass and the re-run shows whether voice-aware overflow reduces false assignment; it does not by itself guarantee correct word-level attribution. The prior raw-audio reprocessing request and progress overlay remain separate open requirements.

## Regression Checks

- No change to selectable Windows output, known-good AirPods capture, mic/system separation or local Orukeet corrections.
- Preserve October 28 time alignment and corrections. Mixed transcript turns may still require conservative unknown labeling rather than guessing names.
- Honor explicit/saved speaker count caps and user locks; do not let default attendees/live provisional counts destructively force native clusters.
- Keep remap telemetry numeric and anonymous. Watch for duration-fallback and low embedding coverage.
- Prior post-stop test still protects original text and stale-name cleanup; regression suite must be rerun after the code change.
- Speaker-index reservations, note persistence and source audio retention for re-diarization remain acceptance checks.
- Progress overlay must show accurate stages/elapsed time and terminal states when later implemented; no fake percentage or frozen UI.

## Immediate Branches

- Tests pass and repeat replay improves identities -> preserve evidence, then address transcript chunks crossing multiple speakers and accepted progress overlay.
- Tests fail -> debug exact assertion on this branch without weakening baseline lock/timestamp guarantees.
- Replay still shows bad merging with `capStrategy=voice-similarity` -> inspect native fragmentation, centroid similarity and alignment; do not assume more clustering thresholds solve it.
- Replay shows `capStrategy=duration-fallback` -> diagnose missing/error embedding extraction before interpreting speaker quality.
- Audio unavailable/replay blocked -> preserve the pre-patch baseline and diagnose capture separately.

## Blockers / Needed Inputs

- **Full test execution not available in this chat environment:** Direct GitHub clone failed due to DNS; an isolated pure algorithm vector test passed locally, but the complete project still needs the user's refreshed Windows checkout.
- The prior downloaded ZIP is stale; new source checkout must contain `8bab551` and `d95a7ec` before validating.
- Keep customer audio and real transcript material in the private conversation/local machine, never in the public repository. Progress overlay and re-diarization/reprocessing are tracked but not implemented.

