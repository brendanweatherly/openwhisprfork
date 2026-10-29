# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - Windows compiler missing during speaker replay startup
**Current milestone:** Validate automatic speaker discovery with a real Teams recording replay
**Active work ID:** `OW-WIN-TOOLCHAIN-20261029`
**Canonical next action:** Enable a Windows C++ compiler in a Developer Command Prompt and relaunch the working-branch app to build the modified audio helper.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-WIN-TOOLCHAIN-20261029] Enable a Windows C++ compiler in a Developer Command Prompt and relaunch the working-branch app to build the modified audio helper.

## Why This Is Next

The user's focused regression tests, typecheck and renderer build reportedly completed without errors. On Oct. 29, running `npm start` in the extracted working-branch checkout failed immediately in `compile:windows-system-audio-helper`, because both `cl.exe` and `gcc.exe` returned `spawnSync ... ENOENT`. This is a missing/inaccessible C++ compiler, not evidence of an acoustic clustering regression. Restore the compiler environment and launch before attempting the real Teams replay.

## Latest Material Evidence

- Code commits `c0e30a83`, `1bf18822`, `c730772` remain on the working branch; automated tests/typecheck/renderer build were user-reported clean without raw logs.
- On 2026-10-29 `npm start` failed during `prestart` at `compile:windows-system-audio-helper` with `cl.exe spawnSync cl.exe ENOENT` and `gcc.exe spawnSync gcc.exe ENOENT`. Node version was v24.22.1 and is not the cause.
- Verified build script `scripts/build-windows-system-audio-helper.js` compiles `resources/windows-system-audio-helper.c` into `resources/bin/windows-system-audio-helper.exe` using MSVC or GCC; it rejects replacing this modified helper with an upstream binary lacking `--device-id`.
- Prior AirPods capture worked; FxSound was silent. A working-branch meeting replay remains unperformed.

## Current Hypothesis or Decision Point

- Proposed decision 0005 remains **Proposed / implemented for validation** despite user-reported clean automated checks; acoustic replay must confirm it before acceptance.
- Hypothesis: automatic native discovery avoids falsely merging multiple voices due to an untouched default or incomplete roster.
- Unknown: over-segmentation, false identities, quiet-speaker filtering, speaker locks and replay reliability in actual audio.

## Next Action / Test

**Active work ID:** `OW-WIN-TOOLCHAIN-20261029`
**Action:** [OW-WIN-TOOLCHAIN-20261029] Enable a Windows C++ compiler in a Developer Command Prompt and relaunch the working-branch app to build the modified audio helper.

1. From Windows Start, check for **x64 Native Tools Command Prompt for VS**. If present, open it, run `cl`, and navigate to the already-extracted working-branch folder.
2. If missing, install **Build Tools for Visual Studio** with **Desktop development with C++**, MSVC x64/x86 toolset, and Windows SDK. Then open its x64 Native Tools Command Prompt (not ordinary cmd).
3. In that developer prompt, `cd /d` to the exact extracted branch directory, set `OPENWHISPR_CHANNEL=development` and `OPENWHISPR_LOG_LEVEL=debug`, and run `npm start`.
4. Verify `Built modified audio helper:` and successful Electron launch. If another prestart stage errors, record the new error and retain this as a blocker.

**Once launched:** Replay a known Teams MP4 section through the selected, known-good AirPods output while recording a meeting note; do not import it directly or touch the default speaker stepper. Evaluate final clusters/names and logs before adjusting algorithms. Playback via system output does not test real simultaneous mic/system capture.

## Regression Checks

- Native versus capped audio cluster counts, plus cap source `auto` when no stepper selection was made.
- Accurate diarization timestamps, final segment delivery, and distinct acoustic voices.
- User locks/reviewed identities and note/transcript persistence; no stale provisional labels.
- Playback uses selected AirPods output; the prior FxSound silent behavior is not mistaken for a diarization problem.
- Real live mic/system separation, device selection failure behavior, and retained source audio remain separate later acceptance checks.
- Device-local Orukeet corrections remain untouched.

## Immediate Branches

- Compiler available and app starts -> Resume Teams system-output playback and final diarization validation.
- Compiler unavailable or native build fails -> Resolve installation/environment or compiler diagnostics; never bypass the custom helper with upstream binary.
- Another prestart error -> Troubleshoot the new prerequisite independently, preserving successful speaker test results and known-good code.

## Blockers / Needed Inputs

- **Current blocker:** Visual C++ `cl.exe` and GCC `gcc.exe` not found when building the mandatory modified Windows audio helper, so `npm start` stops before Electron.
- Once fixed: real Teams MP4 playback through the working-branch meeting recording pipeline and diarization model availability remain to be verified.
- Do not commit customer audio, private technical terms, or confidential transcripts to this public repository.

