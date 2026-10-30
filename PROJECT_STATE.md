# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-30 (conservative native-grouping trial committed after replay analysis)
**State confidence:** Third real Teams replay directly evidenced 17 native clusters, four unsupported joins, and 30/59 mixed acoustic windows. Aggregate overlap and high-confidence pre-cap coalescence are committed; eight new exact pure-module Node tests passed in a local harness using the existing threshold constants. Updated complete Windows regression/typecheck/renderer build and a real replay of these commits have not run.
**Current milestone:** Safely handle remaining automatic speaker overflow without false attribution
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-SPK-UNKNOWN-20261030`
**Canonical next action:** Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.
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
- when post-meeting diarization is active, a visible progress overlay explains its actual processing stage, elapsed time, and success/failure outcome
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
| Speaker attribution remains broken despite voice-aware cap | Native clustering / merging / transcript alignment | Prevents trustworthy meeting minutes | Third Oct. 30 replay: 17 native -> 7 final, 13/17 embeddings, 10 remaps (4 unsupported), 81 acoustic turns, 59 text chunks, 30 chunks multi-cluster. Distinct people still share labels. Narrow overlap-vote fix committed but not replay-validated |
| Mixed and fragmented speaker IDs in real transcription | Speaker attribution / transcript alignment | Speaker labels unreliable | Anonymous 4-minute comparison: about 6 actual voices, 7 final labels, one label used on 21/35 transcript segments across multiple people; same real voice also split into several labels |
| Diarization progress not visible enough | Post-stop UX | User cannot tell what work is running or whether stalled | User explicitly requests a full progress overlay; current transcript shows only a small "finalizing" pill with no stages or elapsed time; Decision 0006 |
| Fresh October 30 checkout required npm dependencies and a renderer build | Windows startup / packaging workflow | Resolved for current source checkout; could recur on fresh extraction | Missing `unbzip2-stream` during sherpa extraction and missing `src/dist/index.html` prevented startup. Existing lockfile declares package; renderer uses `npm run build:renderer`. User now confirms the app opens; clean-setup UX remains for future improvement. |

## 6. Observations, Hypotheses, and Unknowns

| Type | Item | Evidence / next proof |
|---|---|---|
| Direct real replay | Most recent 5-minute sample had 17 native acoustic groups, 81 turns, 7 final labels, 13 centroids, and 10 remaps. Four remaps with no embeddings were assigned to the dominant group. | User log. The missing-embedding groups held 4.95s (~2%) of detected speech. |
| Direct transcript comparison | 30 of 59 ASR chunks intersected multiple final acoustic groups; 13 had no 70%-dominant group. Different real participants shared final labels and the same participant could be fragmented. | User private Teams/OpenWhispr reference; no confidential speech committed. |
| Previously committed correction | `diarization.js` uses total overlap per final speaker rather than largest individual acoustic turn. | `07cd6ae` and regression `9d031ff`; previous isolated checks passed; full Windows suite after patch not run. |
| New conservative pre-cap candidate | `conservativeSpeakerGrouping.js` compares *all* native groups with embeddings before the auto cap; a pair must be reciprocal best, exceed existing live recluster similarity 0.93, beat competing voice by existing 0.10 margin, have two speech turns each, and not overlap in time. It performs only disjoint one-pass merges. | Helper `0b2816f`, safety change `7f6cc24`, tests `87e6329` and `af6fd38`, main IPC integration `160aa0d`. All **8** isolated synthetic helper tests passed under Node 22. Windows integration and live accuracy not established. |
| Protection | A one-turn group may **veto** a pair by providing competing similarity evidence even though it cannot itself be merged; under-identified user counts retain their current saved/explicit handling. | Test covers ambiguous one-turn distractor; source only invokes pre-cap in `countSource="auto"` when raw clusters exceed cap. |
| Residual known defect | After a high-confidence pass, the existing cap may still blindly attach centroids-missing or weakly matched excess clusters to retained voices; the pre-cap change is **not** a solution for those errors. | Existing `capSpeakerClustersByVoice` and the prior 10-remap log with low/unknown scores. |
| Next architecture dependency | Unmergeable clusters need a reviewable unassigned state rather than fabricated speaker identity. This requires consistent frontend display, note persistence, exports, and respect for user locks. | Decision 0003 prioritizes uncertainty over false identities; implementation remains open and proposed. |
| Continuing requirements | Progress overlay and re-diarization from retained source audio must remain in scope. | Decisions 0006 and 0007 accepted, neither implemented. |
| Unknown | Whether the new high-confidence pre-cap step identifies real duplicate native clusters in the same Teams recording, and whether sufficient pairs ever meet the strict gate. | `confidentPreCapMergeCount` and `confidentPreCapMerges` numeric-only logs on the next **consolidated** user replay. |

## 7. Current Decisions

| ID / record | Status | Current decision | Reopen only if... |
|---|---|---|---|
| `decisions/0001-local-first-fork-boundaries.md` | Accepted | Hide paid UI; preserve upstream architecture | Product goal changes |
| `decisions/0002-selectable-windows-output.md` | Accepted | Explicit output device; no silent fallback | Better verified route exists |
| `decisions/0003-conservative-speaker-identity.md` | Accepted | Unknown beats false labels; user locks win | Real evidence changes tradeoff |
| `decisions/0004-orukeet-post-decode-corrections.md` | Accepted current behavior | Device-local explicit substitutions | ASR interface changes |
| `decisions/0005-final-diarization-speaker-count-policy.md` | **Proposed / real replay failed** | Native auto-discovery and voice-aware overflow remapping executed but did not produce stable real speakers; some clusters lack centroids | Require evidence-driven fix and successful repeat replay before promotion |
| `decisions/0006-diarization-progress-visibility.md` | **Accepted requirement; implementation pending** | Visible post-stop progress overlay with genuine stage updates and clear terminal states | Only if user changes the requested UX |
| `decisions/0007-retained-audio-rediarization.md` | **Accepted requirement; implementation pending** | Preserve local mic/system audio and re-run speaker identification from retained audio while protecting original transcript/corrections/locks | Only if user changes the reprocessing workflow requirement |
| `decisions/0008-mutual-high-confidence-precap-grouping.md` | **Proposed / implemented for validation** | Auto-only mutual-nearest, strong-evidence coalescence before the seven-cluster cap; never force a pair to satisfy a target count | Full tests and matched real Teams evidence show false joins, poor quality or unacceptable latency |

## 8. Dependencies

- Preserve Windows selected AirPods/system capture, mic/system separation, Orukeet corrections, timestamps, live-name reconciliation and user speaker locks. No changes to these components in the new pre-cap patch.
- The new pre-cap pass uses **existing** project confidence thresholds and is enabled only for automatic counts when raw speakers exceed the cap. Saved and explicit user counts keep the previous path.
- The new pass can merge duplicates *among the seven largest native groups*, previously impossible; only high-evidence mutual nearest pairs qualify. **Do not** assume the pass runs in a given recording or produces correct identities until validation.
- The existing seven-speaker overflow cap still forcibly maps weak or centroid-missing clusters to retained groups. The next correction must preserve transcript text while representing unknown speaker provenance throughout UI/persistence/export without overriding manual locks.
- Balanced multi-speaker ASR chunks remain impossible to word-attribute without finer timestamps; do not claim summed overlap solves this.
- Avoid another user Teams playback until a more complete candidate and targeted Windows tests are ready. User has already provided adequate failure evidence.
- Accepted progress overlay (Decision 0006) and retained-audio re-diarization (Decision 0007) remain downstream requirements. Keep customer audio/transcripts out of public GitHub.

## 9. Current Priority Order

1. [OW-SPK-UNKNOWN-20261030] Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.
2. Validate pre-cap grouping (`8` isolated passing tests), overlap-vote and unknown-handling code with the focused Windows test suite, typecheck and renderer build before another actual audio replay.
3. Compare the same reference recording once, including `confidentPreCapMergeCount`, remap similarity, unassigned segments and actual stable speaker assignments; keep policy Decisions 0005 and 0008 proposed until then.
4. Implement stage-aware diarization progress overlay and retained-audio re-diarization, avoiding repeated external playback in daily use.
5. Complete global rename, source-audio retention, mic/system isolation and installer checks after core attribution is trustworthy.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-SPK-UNKNOWN-20261030`
- Current target: [OW-SPK-UNKNOWN-20261030] Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: Conservative pre-cap grouping is **committed** and eight synthetic pure-module Node tests passed. The IPC path uses it in auto mode only when native clusters exceed the cap. Full Windows regression/build and a real recording on this code are **unverified**. Weak and missing-embedding joins still remain in the ordinary overflow cap.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Oct. 28 timestamp/confidence/stale-name protection | Focused tests passed earlier | Preserve in the working branch |
| Orukeet post-decode corrections | Focused tests and a live correction passed earlier | Preserve device-local behavior |
| Turbo full-video comparison | ~45 min processing for 37 min; material meaning error | Do not replace Orukeet default based on word improvements |
| Automatic cluster discovery + voice-aware cap trial | Three real trials still show wrong labels; latest: 17 raw -> 7 final, 4 missing embedding joins | **Real speaker-accuracy acceptance failed; Decision 0005 remains proposed** |
| Numeric-only native/centroid/overlap diagnostics | Latest Windows replay emitted all diagnostic events: 17 clusters; remap and overlap totals received | **Diagnostics operating in real app; no content committed** |
| Aggregated speaker-overlap correction | Code `07cd6ae`, regression `9d031ff`; audit counter `18fec36` and tests `88ed480`, `4e391be` | **Committed; seven isolated Node checks passed, full Windows/regression and real replay not run** |
| Mutual high-confidence native pre-cap grouping | Pure helper `0b2816f` / `7f6cc24`, eight tests `87e6329` / `af6fd38`; main IPC `160aa0d` | **Candidate committed; 8/8 local synthetic checks passed, not Windows/live-validated; Decision 0008 Proposed** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |
| Visible diarization progress overlay | User-requested requirement, Decision 0006 recorded | **Pending design/implementation**; tiny finalizing pill is insufficient |

## 12. Open Risks / Regression Watchlist

- Three real recordings still showed incorrect diarization before this latest pre-cap code; no new benchmark proves the issue fixed.
- The pre-cap pass only merges existing mutually matching pairs at the already defined live-recluster similarity 0.93 and 0.10 runner-up gap; it may legitimately make **zero** merges in noisy real meetings, which is preferable to an unsupported join.
- The user-set/saved count path is intentionally unchanged; regression tests must ensure explicit count precedence, speaker-index uniqueness, profile reconciliation and manually locked names.
- The remaining overflow cap still maps weakly similar and centroid-missing extra clusters onto existing speakers, which can misattribute statements. Unknown/provisional UI behavior requires careful review before changing this.
- The ASR chunk may contain words from more than one real speaker. The summed-overlap patch does not split words or establish ground-truth identity.
- Existing Windows AirPods capture, Orukeet, fixed timestamps and customer-specific corrections are known-good; avoid collateral changes.
- Full new Windows regression/build, installation and real validation are not run; GitHub Actions minutes must not be used.
- User expects stage-aware diarization overlay and retained-audio rerun with no repeat meeting playback. Those user requirements remain accepted, not implemented.

## 13. Next Best Step

**Active work ID:** `OW-SPK-UNKNOWN-20261030`
**Next:** [OW-SPK-UNKNOWN-20261030] Implement a non-destructive unassigned-speaker fallback for unsupported automatic overflow, with renderer, export and user-lock regression tests.
**Why:** Conservative high-confidence grouping can now consider two duplicated native groups even when both were previously among the protected seven. But the **remaining** forced overflow remaps still violate the accepted preference for unassigned over incorrect identities, and fixing them without breaking UI/exports requires end-to-end coverage.
**It should prove:** A native cluster with no validated match can remain reviewable without falsely inheriting someone else's ID; transcript text, manual name locks, note serialization and exports remain intact. Only after the complete candidate passes focused Windows checks should another same-clip replay be requested.
**Validation boundary:** Eight local pure helper tests passed; full Windows tests and live speaker accuracy remain pending.

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
