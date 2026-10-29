# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - user-reported automated checks complete; recorded replay pending
**Current milestone:** Validate automatic speaker discovery with a real Teams recording replay
**Active work ID:** `OW-SPK-REPLAY-20261029`
**Canonical next action:** Replay the known multi-participant Teams recording through the working-branch Windows capture path and inspect detected speakers, identities, timestamps, and retained audio.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-REPLAY-20261029] Replay the known multi-participant Teams recording through the working-branch Windows capture path and inspect detected speakers, identities, timestamps, and retained audio.

## Why This Is Next

The user reports no errors running the five-file speaker regression suite, `npm run typecheck`, and `npm run build:renderer` on Windows. Detailed test/build logs were not shared, so this is **user-reported success**, not independently inspected output. We now need actual recording input through the changed meeting-capture/post-stop pipeline. Merely importing an MP4 may exercise the upload pipeline instead and would not prove this fix.

## Latest Material Evidence

- `c0e30a83`: final meeting diarization discovers native clusters without forcing a count and applies only explicit/saved hard caps after discovery.
- `1bf18822` and `c730772`: speaker policy and post-stop regression tests committed.
- 2026-10-29: user reported **no errors** with all requested local commands: focused speaker regression suite, `npm run typecheck`, and `npm run build:renderer`. No raw stdout, test totals, or artifacts have been inspected.
- AirPods system capture was previously observed working; FxSound was silent in the prior route.
- **A replay through this working branch, speaker identity review, audio retention, and Windows installer validation remain untested.**

## Current Hypothesis or Decision Point

- Proposed decision 0005 remains **Proposed / implemented for validation** despite user-reported clean automated checks; acoustic replay must confirm it before acceptance.
- Hypothesis: automatic native discovery avoids falsely merging multiple voices due to an untouched default or incomplete roster.
- Unknown: over-segmentation, false identities, quiet-speaker filtering, speaker locks and replay reliability in actual audio.

## Next Action / Test

**Active work ID:** `OW-SPK-REPLAY-20261029`
**Action:** [OW-SPK-REPLAY-20261029] Replay the known multi-participant Teams recording through the working-branch Windows capture path and inspect detected speakers, identities, timestamps, and retained audio.

Use the extracted working-branch source checkout; launch with `npm start` (which must compile the modified Windows output helper and downloads). This dev Electron launch uses a separate `OpenWhispr-development` profile, not the installed production app's userData. Ensure the existing Teams MP4 is locally accessible, selected Windows output is the previously working AirPods endpoint, and native diarization models are installed.

Play a representative segment containing multiple distinct speakers **through that AirPods output while OpenWhispr is actively recording a meeting note**. Do not manually change the default speaker stepper for the first run. Let final diarization complete after Stop. Review actual detected voices vs known voices and collect application logs reporting `nativeAudioClusters`, `speakerCap`, `speakerCapSource`, `audioClusters`, and any misidentified passages. Keep customer/private meeting audio off public GitHub.

**Expected proof:** Real final diarization preserves the distinct voices despite the untouched default, does not apply stale live names incorrectly, and saves final transcript. A playback of the Teams MP4 entirely through system audio does **not** validate real live mic/system separation; that remains a separate acceptance check.

## Regression Checks

- Native versus capped audio cluster counts, plus cap source `auto` when no stepper selection was made.
- Accurate diarization timestamps, final segment delivery, and distinct acoustic voices.
- User locks/reviewed identities and note/transcript persistence; no stale provisional labels.
- Playback uses selected AirPods output; the prior FxSound silent behavior is not mistaken for a diarization problem.
- Real live mic/system separation, device selection failure behavior, and retained source audio remain separate later acceptance checks.
- Device-local Orukeet corrections remain untouched.

## Immediate Branches

- Positive -> Preserve playback evidence, independently validate live mic/system split, then decide whether to accept decision 0005 and promote the branch.
- Negative -> Inspect raw/final cluster counts and actual speech before tuning thresholds or changing identity policy.
- Inconclusive -> Confirm the source checkout is the working branch, the AirPods playback was recorded, and diarization models were available before repeating.

## Blockers / Needed Inputs

- Local Windows working-branch checkout already has dependencies, and the user reports successful automated checks. The next real replay requires an available Teams recording and a startable source app.
- `npm start` may compile/download native resources; missing diarization models can cause a silent diarization skip. No user data or customer transcripts should be committed to the public repo.
