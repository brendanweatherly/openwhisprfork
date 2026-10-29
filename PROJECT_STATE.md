# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-29
**State confidence:** High for committed code; user reports focused tests, typecheck, renderer build, and Windows source-app launch succeeded (logs not supplied); unverified in real recording.
**Current milestone:** Validate automatic speaker discovery with a real Teams recording replay
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-SPK-REPLAY-20261029`
**Canonical next action:** Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.
**Code baseline commit before project-context-only commits:** `26e7f9184a4a50b2f5239f4c8f1229c949175fd2`
**Active context:** `ACTIVE_CONTEXT.md`

## 1. Objective / Definition of Done

Build a dependable local-first Windows meeting recorder based on OpenWhispr that preserves useful upstream workflows while adding the fork-specific behavior needed for daily use.

Done means:
- selectable Windows meeting output works reliably with real Teams calls
- microphone and remote/system audio remain correctly separated
- source audio is retained/recoverable for reprocessing
- transcription is accurate enough for technical meetings at practical speed
- speaker diarization produces stable distinct speakers rather than false merges/phantoms
- user speaker assignments/locks survive refinement and "rename everywhere" behaves predictably
- meeting corrections improve explicit recurring mishearings without corrupting unrelated speech
- summaries/exports use the corrected, trustworthy transcript
- paid/subscription UI remains hidden without destructively removing upstream architecture
- Windows build/install works from a clean environment

## 2. System / Workflow Map

Meeting detection/start
-> select microphone + Windows output endpoint
-> capture separate mic/system audio
-> retain source audio
-> local transcription (Orukeet is current practical baseline)
-> timestamp normalization/alignment
-> device-local post-decode meeting corrections
-> provisional live speaker identification
-> final offline diarization
-> reconcile final clusters with user locks/names
-> transcript review / rename speakers
-> AI summary / export

## 3. Constraints / Non-Negotiables

- Windows desktop is the primary target.
- Preserve OpenWhispr's useful existing features and mergeability; do not rip out upstream paid/cloud implementation merely to hide it.
- Paid/subscription entry points are hidden by UI policy, not treated as free entitlements.
- Meeting audio output must be selectable; a user-selected endpoint should fail clearly if unavailable rather than silently switching to the wrong device.
- Customer/company vocabulary and meeting-derived corrections must remain device-local and must not be committed to this public repository.
- GitHub Actions/storage should not be required for validation; local tests/builds are the normal path.
- Prefer accurate "unknown/unassigned" speaker state over confidently assigning the wrong person.
- User-reviewed speaker identity/locks must outrank provisional automatic labels.
- Daily-use performance matters; a model taking longer than the meeting itself is not an acceptable default merely because some terms improve.
- Do not treat post-decode dictionary substitutions as a substitute for fundamentally correct recognition.

## 4. Known-Good Baseline

| Component / behavior | Status | Evidence / date / source | Regression watch |
|---|---|---|---|
| Fork baseline branch | Confirmed | GitHub: `fix/meeting-speaker-timestamps-20261028` was 72 commits ahead of `main`, 0 behind at code baseline `26e7f918...`; later commits add project-context docs only | Do not resume work from older speaker branches by accident |
| Selectable Windows output implementation | Confirmed in code | `docs/windows-selectable-output.md`; helper/device selector changes present on active branch | Full validation checklist still incomplete |
| AirPods system-audio capture | Confirmed working in live test | 2026-10-28 user test: peak ~26449, RMS ~1667; captured Teams audio audible | Device routing changes / installer build |
| FxSound system-audio capture | Confirmed broken for tested path | 2026-10-28 user test: peak ~1 / effectively silent | Do not assume all output endpoints behave like AirPods |
| Local-only/paid UI hiding | Confirmed in code | `docs/local-only-interface.md`, `src/config/localOnlyUi.ts` | Fresh-install/deep-link/install regression |
| Orukeet local meeting transcription launches and works | Confirmed | User live meeting test on 2026-10-28; selecting Orukeet resolved missing `whisper-server` blocker | Accuracy on technical vocabulary |
| Device-local meeting corrections | Confirmed | `docs/local-meeting-corrections.md`; 7/7 targeted tests; user observed "CORRECTION WORKED" | Orukeet-only post-decode scope; avoid ambiguous substitutions |
| Speaker timestamp/confidence/final-name fixes | Confirmed in pushed code and focused tests | Oct. 28 commit series on active branch; prior local runs reported 32/32 + 7/7, then 37 focused timing/transcript + 8 updater-safety checks; typecheck and renderer build passed | Real full-meeting validation still required |
| Cloud AI summary path | Confirmed working in prior live use | Switching from missing local llama-server to cloud produced summary | Network/provider availability |
| Whisper Large V3 Turbo comparison | Confirmed evaluated, not suitable as default | Same 37-minute Teams video completed in ~45 minutes; improved several technical terms but introduced a material scope-wording reversal | Do not select solely from word-level improvements |

## 5. Confirmed Problems

| Problem | Layer | Impact | Evidence / status |
|---|---|---|---|
| Native forced-count and inferred single-remote cap caused speaker-collapse risk | Final diarization | Real voices can be lost | Confirmed in Oct. 28 baseline; mitigation committed; focused tests/build reportedly completed without errors, but real meeting behavior remains unverified |
| Real meeting produced wrong/phantom speaker names and merges | Identity reconciliation | Attribution cannot be trusted | Oct. 28 live meeting; newer confidence/timestamp fixes require re-validation |
| Global speaker rename did not propagate as expected | Correction workflow | User cannot efficiently repair transcript | User-observed failure; not yet proven corrected |
| Technical ASR errors remain, including meaningful wording reversals | Transcription | Invalid scope statements/meeting minutes | Orukeet comparison; Whisper Turbo took ~45 min for 37 min and still reversed a statement |
| Final speaker-cap folding could merge excess acoustic clusters | Diarization | Residual misattribution | Current `capSpeakerClusters` behavior; observe native/final counts before changing it |
| Windows clean installer and source-audio retention are not validated end-to-end | Release/reprocessing | Daily use/replay could fail | Existing open acceptance checks |
| Windows native helper initially failed to compile | Toolchain / startup | Startup had been blocked | On Oct. 29 `cl.exe` and `gcc.exe` were initially missing; user subsequently confirmed app launch works after toolchain guidance. Exact build logs not inspected; Windows installer still not validated |

## 6. Observations, Hypotheses, and Unknowns

| Type | Item | Evidence / next proof |
|---|---|---|
| Confirmed code change | On working branch native final diarization no longer receives forced `numSpeakers`; count cap follows native discovery | Commits `c0e30a83`, `1bf18822`, `c730772`; user reports test run without errors, detailed output not retained |
| Hypothesis | Auto clustering plus explicit-only cap will preserve remote speakers better than baseline | Targeted tests then known four-participant replay |
| Observation | Earlier false speaker labels had multiple causes: clocks, stale names, provisional merge, and native clustering | Do not attribute all errors to one threshold |
| Unknown | Whether the new cap source policy preserves user locks, note state, source audio, and timestamp mapping in real meetings | Regression tests + replay |
| Unknown | Whether `rename everywhere` now behaves correctly after final speaker mapping | UI regression test following clustering validation |

## 7. Current Decisions

| ID / record | Status | Current decision | Reopen only if... |
|---|---|---|---|
| `decisions/0001-local-first-fork-boundaries.md` | Accepted | Hide paid UI; preserve upstream architecture | Product goal changes |
| `decisions/0002-selectable-windows-output.md` | Accepted | Explicit output device; no silent fallback | Better verified route exists |
| `decisions/0003-conservative-speaker-identity.md` | Accepted | Unknown beats false labels; user locks win | Real evidence changes tradeoff |
| `decisions/0004-orukeet-post-decode-corrections.md` | Accepted current behavior | Device-local explicit substitutions | ASR interface changes |
| `decisions/0005-final-diarization-speaker-count-policy.md` | **Proposed / implemented for validation** | Native auto-discovery, explicit/saved caps only | Tests/replay show regressions |

## 8. Dependencies

- Speaker validation requires correctly captured mic/system tracks; AirPods is the known working path, FxSound was silent in the tested path.
- Speaker reconciliation depends on accurate timestamp alignment and final acoustic clusters; UI renaming is a downstream recovery tool, not a substitute for acoustic correctness.
- **Implementation, focused test/typecheck/renderer-build results, and successful Windows app launch were reported by the user; underlying command output has not been independently inspected.** The missing-compiler startup blocker appears cleared. The next dependency is a controlled real-audio replay on the working branch, not additional tuning or rebuilding. Keep the fork-specific audio helper and selected-output capture path intact.
- Real Teams replay must check native count, capped count, final names, locks, source retention, and completion delivery; do not infer success from a code diff.
- Summaries and minutes depend on transcript semantics; do not choose a slower ASR model merely for isolated vocabulary improvement.

## 9. Current Priority Order

1. [OW-SPK-REPLAY-20261029] Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.
2. Check the source audio is actually recorded through the selected AirPods output and final diarization completes with `speakerCapSource: "auto"` when the default count is untouched.
3. Compare native and final speaker counts against actual recorded voices, and inspect transcript timestamps, identity suggestions/locks, and retention.
4. Investigate any measured clustering/name errors before changing diarization policy; if replay succeeds, test live mic/system capture separately and consider promoting proposed decision 0005.
5. Address global rename/re-diarization UX and then technical ASR accuracy, full installer validation, and daily-use reliability.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-SPK-REPLAY-20261029`
- Current target: [OW-SPK-REPLAY-20261029] Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: user reports automated tests/typecheck/renderer build and development app startup succeeded; native helper's earlier toolchain failure appears resolved. Actual Teams recording replay and post-stop speaker correctness remain untested.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Oct. 28 timestamp/confidence/stale-name protection | Focused tests passed earlier | Preserve in the working branch |
| Orukeet post-decode corrections | Focused tests and a live correction passed earlier | Preserve device-local behavior |
| Turbo full-video comparison | ~45 min processing for 37 min; material meaning error | Do not replace Orukeet default based on word improvements |
| Auto-cluster-before-cap + explicit-only final speaker limits | Code commit `c0e30a83`, tests `1bf18822` and `c730772`; user-reported focused tests/build had no errors | **Automated stage user-reported clean; real replay pending** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |

## 12. Open Risks / Regression Watchlist

- User reports focused speaker tests, typecheck and renderer build completed with no errors, but test output was not provided; real audio replay is **not validated**.
- Windows native audio-helper originally failed because `cl.exe`/`gcc.exe` were missing; the user now reports the source app launches. Treat startup as user-confirmed, not independently log-verified; continue watching selected-output behavior.
- `capSpeakerClusters` can fold over-segmented voices into retained clusters; inspect raw and final counts.
- Preserve user speaker locks, separate mic/system source timestamps, and final speaker delivery.
- Prevent stale provisional speaker names from overriding final identities.
- Keep local correction vocabulary device-local and outside public source.
- Protect AirPods capture and explicit Windows output selection without silent device fallback.
- Preserve old Oct. 28 branch as the known code baseline until validation passes.

## 13. Next Best Step

**Active work ID:** `OW-SPK-REPLAY-20261029`
**Next:** [OW-SPK-REPLAY-20261029] Capture a multi-speaker Teams video segment through the working-branch meeting recorder and inspect the final speaker clusters, names, timestamps, and logs.
**Why:** The user reports that the previous compiler/startup blocker has been cleared and the working-branch app opens. Representative acoustic input is the missing evidence before accepting the speaker-count policy or changing additional speaker code.
**It should prove:** A segment containing multiple known voices captured through the AirPods system output reaches post-stop diarization, does not collapse voices under the untouched default speaker count, and produces usable final speaker identities. Playback alone does not establish live mic/system separation.

## 14. Parking Lot

- Evaluate Qwen3-ASR / other practical ASR alternatives only after the speaker baseline is stable.
- Consider longer-context Orukeet changes if supported without large latency.
- Installer signing/distribution polish.
- Additional UI polish unrelated to meeting correctness.

## 15. Recent Checkpoints

- 2026-10-28: capture, corrections, timestamps, confidence, and final speaker delivery changes committed/tested.
- 2026-10-29: branch/repository reconstruction identified the missing auto-cluster-before-cap integration.
- 2026-10-29: integration committed on `fix/meeting-auto-speaker-discovery-20261029` and test fixtures added; **neither run nor real replay completed**.
- 2026-10-29: v2.1 reconciliation moved append-only detail to `history/`, repaired priority/current-focus/next-step alignment, and recorded proposed decision 0005.
- 2026-10-29: regression tests extended to cover full post-stop four-voice discovery and selected/saved count caps (`c730772`); source inspected, tests still not executed against the repository.

## 16. Archive / Supporting Context

- Active handoff: `ACTIVE_CONTEXT.md`
- Decisions: `decisions/`
- Checkpoint history: `history/checkpoints-2026-10.md`
- Fork design docs: `docs/windows-selectable-output.md`, `docs/local-only-interface.md`, `docs/local-meeting-corrections.md`
