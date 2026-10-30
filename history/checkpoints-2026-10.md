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

## 2026-10-29 - Real speaker-quality replay failed with automatic cluster folding

**Direct evidence:** A real recorded multi-voice test completed post-meeting diarization. The sanitized debug log reports 9 native acoustic clusters, automatic cap 7, final 7 clusters, 36 diarization turns, 35 transcript segments, and 0 named segments.
**Transcript-level comparison:** The overlapping reference contains about 6 real voices. The app assigned 7 placeholder labels, including one label used on 21 of 35 text chunks across several actual speakers. Some continuous speaking turns are split among several IDs. Source timestamps generally align after accounting for the recording beginning about 88 seconds into the reference video.
**Code confirmation:** Meeting path `diarization.js::capSpeakerClusters` assigns all above-cap clusters to the primary longest-duration cluster. A different, voice-aware merging routine exists in the batch-upload path. `mergeWithTranscript` assigns one voice per text chunk based on overlap and fallback, so boundaries crossing true speaker changes can cause independent misattribution.
**Status:** The earlier single-speaker collapse was not repeated, but the real speaker-accuracy acceptance test **failed**; proposed decision 0005 stays unaccepted. Do not conflate zero automatic speaker names with a failure to detect acoustic clusters. Uploaded reference content, customer names and raw audio stay outside the public repository.
**New user requirement:** Show a prominent, stage-aware progress overlay during post-stop diarization so the user knows what the app is doing. The existing small finalizing pill is insufficient. Decision 0006 records the request, stage/elapsed-time behavior, terminal states and no-fake-percent rule. Implementation pending.
**Priority now:** Build anonymized failing tests to separate cap folding from acoustic over-splitting and transcript-to-voice alignment; fix the measured root cause without regressing known-good capture, timestamp and correction behavior. Then implement visible diarization progress and replay validation.

## 2026-10-29 - Voice-aware cap candidate integrated after prior-chat recovery

**Prior chat recovered:** Earlier four-speaker meeting showed `numSpeakers=-1` but only one final cluster due to the default/inferred cap, despite mixed voices. Oct. 28 timestamp/end-as-start and stale-name fixes remain known-good. User specifically required re-diarization from retained audio after changing speaker count without repeating the meeting, preserving original transcript, technical corrections, and user locks. Conversion WAVs were temporary; durable source-audio availability is still to be proven. These requirements are now recorded in Decision 0007.

**Confirmed first replay failure:** Six people in an overlapping Teams transcript excerpt vs seven app speaker placeholders, and one label covered 21 of 35 chunks across different people. Native diarization produced nine clusters and auto mode folded to seven via duration-only logic.

**Code change:** `8bab551` reuses the existing upload path's `speakerEmbeddings.extractClusterCentroids` plus `capSpeakerClustersByVoice` in the post-stop meeting pipeline when the native number exceeds the cap; adds numeric remap and strategy diagnostics. It still logs/uses a duration-only fallback if centroids are unavailable. The source transcription and timestamp/lock logic was intentionally left unchanged to isolate the effect.

**New regression:** `d95a7ec` exercises nine synthetic acoustic groups and verifies both overflow clusters route to their acoustically matching retained voices, not automatically to the dominant cluster. An isolated standalone run of the pure voice-cap algorithm passed; full repository tests and real replay remain unrun after this patch.

**Unresolved:** Native over-segmentation, ASR chunks crossing speaker turns, the ability to reprocess from retained audio, and the user-requested progress overlay. Decision 0005 remains proposed; Decision 0006 and Decision 0007 are accepted user requirements with implementation pending.

**Priority now:** Execute updated focused tests and a new replay of the **same** Teams excerpt, checking `capStrategy`, `capEmbeddingCoverage`, numeric remaps and stable human speaker attribution. If this fails, separate native acoustic clustering from text-chunk speaker alignment rather than tuning models speculatively.

## 2026-10-29 - Debug-inherited Windows regression suite exposed Electron test-stub omission

**User-supplied Windows output (no private transcript text retained):** The focused Node test command ran **69 cases: 56 passed, 13 failed**. Every failure had `TypeError: app.isReady is not a function` at `debugLogger.js:58`, including the new nine-to-seven regression. The Command Prompt previously set `OPENWHISPR_LOG_LEVEL=debug`, so writing even routine info/warn lines tried to initialize the debug file logger in Node's mocked Electron environment.
**Cause / fix:** The Electron app mocks in the speaker reconciliation and epoch-timestamp test suites lacked `app.isReady()`. Committed test-only `isReady: () => false` in `test/helpers/meetingSpeakerReconcile.test.js` (`f82e7f5`) and `test/helpers/meetingDiarizationEpochTimestamps.test.js` (`74530ec`). This is not evidence the actual Electron app's `isReady` is absent; **tests remain unrerun** after correction. The existing updated-code ZIP can be retested immediately by setting `OPENWHISPR_LOG_LEVEL=info` before the same Node test command, bypassing logger file initialization.
**Additional log evidence:** Old app runtime output contained two post-stop diarization results: one note with **32 native clusters reduced to 7**, and the previously reviewed short note with **9 to 7**; neither log included new `capStrategy` fields and therefore these runs **predate the voice-aware cap patch**. A long meeting producing 32 raw clusters is a reason to separately investigate native over-segmentation once the cap test is proven.
**Separate warnings:** The old console also logged several failed PowerShell default-microphone resolver attempts, repeated Parakeet empty-text retries on low-RMS snippets, and routine WebSocket close code 1000 / shutdown error messages. None is shown to be the cause of the 13 Node tests. Dependency install completed but reported **four advisories (2 low, 1 moderate, 1 critical)** requiring later security review; do not apply forced npm upgrades during speaker correctness validation.
**Priority:** Rerun the focused regression suite under `OPENWHISPR_LOG_LEVEL=info` and inspect any true assertions. Only after green code tests and build checks, repeat the same Teams clip using updated app code, inspect `capStrategy`, cap remaps and real voice stability. Continue tracking progress overlay and retained-audio re-diarization as accepted requirements.

## 2026-10-30 - Focused Windows speaker regression rerun user-reported passing

**User-provided outcome:** On October 30, the user reported that they reran the focused speaker regression tests and "everything passed" after the earlier 13/69 debug-logger mock failures. The previous suite comprised 69 tests. **No exact green stdout or totals were supplied for the rerun**; mark as user-reported success, not independently run by ChatGPT.

**What this resolves:** The test-harness blocker caused by the missing Electron `app.isReady()` method in Node mocks is no longer reported. Previous mock corrections (`f82e7f5`, `74530ec`) and/or the recommended `OPENWHISPR_LOG_LEVEL=info` setting allowed the focused tests to proceed. The user did not specify which path they used.

**What this does not establish:** `npm run typecheck` and `npm run build:renderer` on the updated code were not separately confirmed; voice-aware meeting remapping (`8bab551`) still needs a new recorded Teams benchmark. The earlier real test failed attribution with nine native groups reduced to seven, mixed placeholder labels; audio embedding fallback is possible. Proposed decision 0005 remains unaccepted.

**Current next action:** Confirm typecheck/renderer build if necessary and replay **the same Teams excerpt** on the updated development branch, inspecting new `capStrategy`, embedding coverage and numeric remaps, and actual stable speaker identity. Keep the progress overlay (Decision 0006) and retained-audio re-diarization (Decision 0007) in the upcoming work, not silently dropped.

## 2026-10-30 - Voice-similarity replay failed; numeric-only causal diagnostics added

**Evidence:** Real source-app run reported `nativeAudioClusters=14`, `speakerCap=7`, `speakerCapSource=auto`, `capStrategy=voice-similarity`, `capEmbeddingCoverage=11`, `capRemapCount=7`, `audioClusters=7`, `diarizationTurns=39`, `transcriptSegments=43`, `namedSegments=0`. The voice-similarity path was exercised, but it did not meet the real-world speaker-label acceptance criteria.
**Private transcript comparison:** In the overlapping excerpt, approximately five identifiable actual people were split among seven unnamed app labels. Several labels were shared by different voices; some individual people's continuous speech changed labels. The source excerpt starts about three minutes into the Teams transcript. Actual speech/participant identities were reviewed privately and **not included** here.
**Code audit:** `capSpeakerClustersByVoice` preserves the seven longest-duration native clusters and maps extras to a closest available centroid; absent centroid means fallback to the dominant kept cluster, and no absolute similarity threshold guards a weak merge. `mergeWithTranscript` uses the highest *single acoustic turn* overlap per ASR chunk, which is insufficient for a chunk containing multiple speakers. These are plausible contributors, but their relative contribution is not yet measured.
**New commits:** `88abab3`: numeric-only helper to summarize native group durations, per-remap similarity/missing embeddings and chunk overlap; `7bc8cba`: four anonymous synthetic tests; `f6c2904`: main recording pipeline emits the diagnostic events. These logs must not contain private transcript content or identity names.
**Test status:** Four equivalent synthetic helper cases passed in isolated Node 22 execution; a complete app regression/build and a replay with these diagnostics have **not** been executed. Older user-reported 69-case suite/typecheck/renderer-build passed **before** this instrumentation.
**Decision state:** Policy decision 0005 remains Proposed, now with two failed real speaker-accuracy benchmarks. No threshold, count cap, acoustic model or text assignment behavior changed in the new commits. Progress overlay (0006) and retained-audio rerun (0007) remain accepted requirements with implementation pending.
**Next:** Validate the diagnostic tests in the refreshed Windows checkout and collect one same-clip, numeric-only native/centroid/overlap log to choose the next corrective algorithm change.
