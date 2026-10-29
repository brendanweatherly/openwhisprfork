# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - user reports working-branch app now launches; replay next
**Current milestone:** Validate automatic speaker discovery with a real Teams recording replay
**Active work ID:** `OW-SPK-REPLAY-20261029`
**Canonical next action:** Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-REPLAY-20261029] Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.

## Why This Is Next

The source-app launch was blocked by missing C++ compiler executables. The user now reports that it works after the toolchain instructions; no startup log was supplied, so this is user-confirmed startup, not independently verified helper behavior. No reason to repeat the code tests. The next decisive gate is acoustic speaker discovery from a recorded, multi-person Teams segment through the working-branch meeting recording path.

## Latest Material Evidence

- `c0e30a83`, `1bf18822`, and `c730772`: automatic speaker-discovery implementation and regression fixtures committed; user reported clean focused test suite, typecheck, and renderer build.
- `npm start` initially failed due to `cl.exe`/`gcc.exe` ENOENT in the native Windows audio-helper build. The user subsequently reported **"ok it works"** in response to developer-prompt/build guidance. App launch now appears operational; no build or runtime logs were inspected.
- Prior AirPods capture worked, while FxSound was effectively silent. The selected-output capture, real meeting diarization, and identity mappings on this working branch are still unverified with replay.

## Current Hypothesis or Decision Point

- Proposed decision 0005 remains **Proposed / implemented for validation** despite user-reported clean automated checks; acoustic replay must confirm it before acceptance.
- Hypothesis: automatic native discovery avoids falsely merging multiple voices due to an untouched default or incomplete roster.
- Unknown: over-segmentation, false identities, quiet-speaker filtering, speaker locks and replay reliability in actual audio.

## Next Action / Test

**Active work ID:** `OW-SPK-REPLAY-20261029`
**Action:** [OW-SPK-REPLAY-20261029] Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.

1. Keep the development app running from the extracted `fix/meeting-auto-speaker-discovery-20261029` checkout; it stores data under `%APPDATA%\OpenWhispr-development`.
2. Select Orukeet if needed and confirm diarization/models are available. Set Meeting audio output to the same AirPods endpoint that Windows uses for video playback; avoid the previously silent FxSound endpoint.
3. Create a **new** meeting note and start recording. Do **not** touch the speaker-count stepper for this initial automatic-discovery trial.
4. Play approximately 5–10 minutes of the existing Teams MP4 through AirPods, selecting a portion with 3+ identifiable remote voices. Do not import the MP4 into OpenWhispr; the import pipeline does not prove the modified post-stop meeting pipeline.
5. Stop recording, let final diarization complete, and review how many distinct speakers appeared and whether their voices/names are correct. Do not manually rename before inspection.
6. Check the latest `%APPDATA%\OpenWhispr-development\logs\debug-*.log` for `Post-meeting diarization result delivered`. Capture `nativeAudioClusters`, `speakerCap`, `speakerCapSource`, and `audioClusters` plus any errors. Share only sanitized metrics and non-sensitive discrepancies; never commit private Teams audio/transcript to public GitHub.

**Acceptance:** Actual distinct voices survive automatic discovery without false forced cap, and final diarization events complete. Separate real-live mic/system split validation is still required.

## Regression Checks

- Native versus capped audio cluster counts, plus cap source `auto` when no stepper selection was made.
- Accurate diarization timestamps, final segment delivery, and distinct acoustic voices.
- User locks/reviewed identities and note/transcript persistence; no stale provisional labels.
- Playback uses selected AirPods output; the prior FxSound silent behavior is not mistaken for a diarization problem.
- Real live mic/system separation, device selection failure behavior, and retained source audio remain separate later acceptance checks.
- Device-local Orukeet corrections remain untouched.

## Immediate Branches

- Replay captures 3+ voices accurately -> Document evidence, then test actual live mic/system separation and assess decision 0005.
- Replay merges voices/creates phantom speakers -> Inspect raw/final cluster counts, cap source, timing, and identity mapping; avoid speculative threshold changes.
- Playback is silent or diarization unavailable -> Check selected AirPods endpoint, Orukeet, models, and dev-profile logs before changing acoustic logic.

## Blockers / Needed Inputs

- **Startup blocker appears resolved:** User confirmed the development app works after C++ toolchain guidance; build log not independently reviewed.
- **Pending evidence:** Real multi-person MP4 replay through the modified meeting capture pipeline, final speaker clustering, and diarization logs.
- Keep confidential meeting content off the public GitHub repository.

