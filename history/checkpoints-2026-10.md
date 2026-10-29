# Checkpoints - 2026-10

## 2026-10-28 - Windows capture / local meeting workflow baseline
**What changed:** Selectable Windows output, local-only UI behavior, device-local Orukeet corrections, timestamp normalization, speaker-confidence policy, stale-name cleanup, and final-diarization delivery logging were developed on the fork.
**Still true:** AirPods system capture works in the tested path; FxSound was effectively silent. Orukeet runs locally. Corrections work only after decode.
**Implication:** Capture is no longer the only blocker; correctness now depends heavily on transcription timing and speaker reconciliation.
**Priority now:** Validate the full speaker pipeline on a real meeting rather than continue isolated UI polish.

## 2026-10-28 - Speaker assignment remained poor in live meeting
**What changed:** A real meeting still produced bad speaker assignment and too many/incorrect attendee identities; manual mapping was abandoned.
**Still true:** Focused tests around corrections and speaker logic passed.
**Implication:** Passing unit tests did not prove end-to-end speaker correctness.
**Priority now:** Strengthen timestamps/confidence/final diarization and require real-meeting validation.

## 2026-10-29 - Full Whisper Large V3 Turbo comparison
**What changed:** The same 37-minute Teams video completed in about 45 minutes. Turbo improved several technical terms but still made material errors, including reversing a scope statement.
**Still true:** Better word recognition alone is insufficient if latency is impractical or meaning is changed.
**Implication:** Turbo is not the daily default.
**Priority now:** Keep Orukeet as the practical baseline while evaluating future ASR changes only against speed + semantic accuracy together.

## 2026-10-29 - Durable-state reconstruction
**What changed:** The active pushed branch was identified as `fix/meeting-speaker-timestamps-20261028`, 72 commits ahead of main and 0 behind before project-context commits. The branch includes the Oct. 28 capture/UI/corrections/timestamp/speaker work.
**Still true:** The active branch still forces native `numSpeakers` during final meeting diarization.
**New evidence:** Separate branch `codex/raw-speaker-collapse-fix` commit `6adfb77361c88dd8e0559fb9ce1d884e58d57050` contains a focused auto-cluster-before-cap fix and regression coverage, but it is based on an older line and is not integrated into the Oct. 28 branch.
**Implication:** The four-participant one-cluster failure remains open in the authoritative baseline.
**Priority now:** Reconcile the automatic clustering behavior into the Oct. 28 branch, then run focused regressions and a known-recording/live meeting validation.

## 2026-10-29 - Speaker discovery implementation committed, validation pending

**What changed:** Work branch `fix/meeting-auto-speaker-discovery-20261029` gained the auto-cluster-before-cap implementation (`c0e30a83`), count policy regression tests (`1bf18822`), and raw/final cluster and cap-source logging.
**Still true:** The Oct. 28 baseline remains intact. Code and tests are committed; tests, typecheck, Windows build, and real Teams replay have **not** been executed.
**Proposed decision:** `decisions/0005-final-diarization-speaker-count-policy.md` records the trial policy; it is not accepted as a proven production fix.
**Residual risk:** `capSpeakerClusters` may fold extra acoustic clusters into retained ones if native output over-splits.
**Implication:** Development has moved from implementation to verification. The earlier current-state references telling agents to implement the fix were stale.
**Priority now:** Run focused speaker-regression tests, typecheck/build, then the known four-person Teams replay.

## 2026-10-29 - v2.1 state-reconciliation repair

**What changed:** Removed the dated append-only Section 17 from `PROJECT_STATE.md`, reconciled milestone/priority/focus/next step to speaker **validation**, and aligned `ACTIVE_CONTEXT.md`. Added a proposed decision record for the new count-policy rule.
**Still true:** No claims of tests passing or real replay succeeding; the current work branch is unpromoted.
**Implication:** The current-state and handoff documents now describe the same open work item rather than conflicting old/new activities.
**Priority now:** Run the recorded test command and report actual evidence.

## 2026-10-29 - Automated speaker checks reported clean; advance to real audio replay

**What changed:** The user reported that the five-file focused speaker regression command, `npm run typecheck`, and `npm run build:renderer` completed on their Windows checkout with **no errors**. This includes the newly committed full post-stop cluster regression fixtures.
**Evidence level:** User-reported test/build outcome; no raw test summary, counts, build logs, or executable artifacts were inspected by the assistant. Do not misstate this as independently executed/verified.
**Still true:** The Oct. 28 baseline branch is preserved; decision 0005 (native speaker auto-discovery and explicit-only final cap) remains **Proposed** until representative audio replay. The automatic-discovery change has not yet been tested against actual multi-speaker Teams audio.
**Implication:** Advance priority from executing code tests to exercising the modified **meeting capture/post-stop diarization** path. Importing the MP4 alone uses a potentially different upload path and cannot conclusively validate this fix.
**Priority now:** Run the extracted working branch as a development app, capture a representative portion of the locally available Teams recording over the previously working AirPods output while a meeting note is recording, then compare native cluster count, final count, cap source, speaker names, timestamps, and retained source audio. Keep private meeting data off public GitHub.

## 2026-10-29 - Windows native helper startup blocked by inaccessible C++ compiler

**Direct evidence:** User ran `npm start` from the extracted `fix/meeting-auto-speaker-discovery-20261029` checkout with `OPENWHISPR_CHANNEL=development` and debug logging. The `prestart` step `compile:windows-system-audio-helper` failed: `cl.exe spawnSync cl.exe ENOENT` and `gcc.exe spawnSync gcc.exe ENOENT`. The app did not launch. Node v24.22.1 is installed.
**Code verified:** `scripts/build-windows-system-audio-helper.js` invokes either MSVC or GCC to compile the fork's modified source into `resources/bin/windows-system-audio-helper.exe`, intentionally rejecting the upstream prebuilt helper, which lacks `--device-id` support.
**Not invalidated:** User-reported passing speaker regression suite, TypeScript typecheck and renderer build. These do not exercise the native Windows helper. Speaker replay and release validation remain outstanding.
**Priority now:** Locate installed MSVC via x64 Native Tools Command Prompt for Visual Studio; otherwise install Build Tools with Desktop development with C++, compiler, and Windows SDK. Re-run `npm start` inside the developer environment, inspect any additional prestart errors, then resume real Teams audio replay.

## 2026-10-29 - Working-branch app startup now reported successful

**What changed:** After instructions to make the Microsoft C++ compiler available through an x64 Native Tools Command Prompt, the user replied "ok it works". This is user confirmation that the prior startup obstacle is cleared; successful build/compiler diagnostic logs were not shared.
**Still true:** The source branch still carries the automatic speaker-discovery changes. Automated tests/typecheck/renderer build were user-reported clean. No representative full meeting capture and final diarization has been verified.
**Implication:** The missing compiler is no longer the current blocker. Resume the actual multi-speaker recording replay rather than reinstall tools or change acoustic thresholds.
**Priority now:** Capture 5–10 minutes of the existing Teams MP4 playing through the known-good AirPods endpoint while the development fork records a new meeting note. Keep the initial speaker-count stepper untouched. Inspect native/final cluster counts, cap source, final names/timestamps and retained audio. Do not upload confidential content to the public repo.
