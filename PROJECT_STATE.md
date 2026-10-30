# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-30 (stage overlay committed; private source archive foundation passes 9/9 native Node tests)
**State confidence:** Prior Windows-focused speaker gate passed 245/249 tests (four skipped, zero failures), TypeScript and renderer build. Since then, stage-aware progress overlay code was committed (6/6 exact reducer cases passed in an isolated V8 test runner; updated React/Windows stage tests still pending). A private note/session PCM archive foundation is now committed; exact-source/native Node v22 Linux filesystem tests passed 9/9 and both tested files' Git blob hashes matched the branch. Archive is **not wired to capture** and re-diarization is **not implemented**; privacy/retention integration and Windows/real Teams acceptance remain pending. Older real speaker benchmark failed attribution.
**Current milestone:** Enable non-destructive speaker reprocessing from retained meeting audio
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-AUDIO-RERUN-20261030`
**Canonical next action:** Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.
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
| Unvalidated conservative automatic speaker overflow policy | Diarization / review | Could hide legitimate voices as unknown or still over-segment the seven retained native IDs | Auto **system** overflow now routes embedding-missing / insufficiently confident extras to reviewable unknown, instead of another person's speaker ID. Explicit/saved and mic paths stay as before. Windows and real audio acceptance pending (Decision 0009) |
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
| Residual policy boundary | The previous generic cap can still force extra clusters onto a speaker under saved/explicit counts and mic-auto modes. Automatic **system** overflow now uses confidence-or-unassigned, but seven retained native IDs may still be fragments of fewer real people. | `capMeetingSpeakersWithUnknown` in the system-auto IPC branch, original generic fallback elsewhere, Decisions 0005/0009 still Proposed; real replay unverified. |
| Reviewable unknown state implemented / test gate pending | Automatic system overflow with missing or weak voice evidence becomes an unassigned row without a fabricated speaker ID; the user can select/name it and locked names now remain visible, with persistence/export support. | Code and tests are committed on the working branch; complete Windows tests/build and real accuracy proof pending under Decision 0009. |
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
| `decisions/0006-diarization-progress-visibility.md` | **Accepted requirement; code committed, native/live validation pending** | Visible post-stop progress overlay with genuine stage updates and clear terminal states | Only if user changes the requested UX |
| `decisions/0007-retained-audio-rediarization.md` | **Accepted requirement; archive foundation tested, full implementation pending** | Retain local mic/system audio and safely re-run identification without changing reviewed transcript/locks; isolated archive helper passes 9/9 native Linux filesystem tests | Only if user changes the reprocessing workflow requirement |
| `decisions/0008-mutual-high-confidence-precap-grouping.md` | **Proposed / implemented for validation** | Auto-only mutual-nearest, strong-evidence coalescence before the seven-cluster cap; never force a pair to satisfy a target count | Full tests and matched real Teams evidence show false joins, poor quality or unacceptable latency |
| `decisions/0009-confidence-or-unassigned-automatic-overflow.md` | **Proposed / implemented for validation** | System-track automatic overflow without a trustworthy voice match becomes an editable unassigned transcript line, not a false existing speaker; locks and transcript words are preserved | Windows/real evidence shows data loss, false identities, manual review failure or another better strategy |

## 8. Dependencies

- Preserve known-good AirPods/selectable Windows output, mic/system separation, Orukeet transcription/corrections, timestamp normalization and manually reviewed/locked names.
- Automatic **system-track** overflow now uses the existing speaker-confidence thresholds. Native speaker groups without embeddings or credible similarity become `unassigned_acoustic`, converted to transcript `speakerStatus="unassigned"` with no numeric ID, stale name or profile. Manual locks take precedence.
- Backend, note persistence, transcript UI and TXT/SRT/Markdown/JSON exporters have corresponding code and tests. Review fixed a UX gap: manually naming an unknown line could save correctly but lacked a visible label; it now renders and can be selected again, with distinct name colors.
- Saved/explicit count behavior and mic-mode grouping were deliberately not changed; their older cap behavior remains a separate risk to evaluate only with evidence.
- Seven retained native speaker groups are still not guaranteed to represent seven people. The proposed high-confidence pre-cap grouping (Decision 0008) and aggregated turn matching need real validation.
- Unassigned acoustic clusters lose automatic cross-line identity continuity; a word-level ASR chunk covering two people remains ambiguous. Do not claim overall speaker accuracy is solved.
- Before another user Teams playback, run the full focused Windows regressions/typecheck/renderer build. No GitHub Actions minutes should be spent. Decisions 0006 and 0007 (progress overlay and re-diarization from retained audio) remain accepted pending features.
- A new `meetingAudioArchive.js` private archive primitive isolates note/session/track PCM and prevents duplicate overwrites, with 9/9 native Linux Node tests. **Not yet active in production:** the stop pipeline still deletes original temp PCM and drops mic audio early on calls. Enforce resolved retention settings, authorized note ownership and deletion/cleanup before wiring it to recording.
- Keep customer audio, participant names, confidential transcription and local vocabulary out of the public GitHub repo.

## 9. Current Priority Order

1. [OW-AUDIO-RERUN-20261030] Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.
2. Re-run the updated focused Windows suite/typecheck/renderer build (which now includes progress tests), then compare the original Teams audio once and use retained local tracks for subsequent speaker algorithm experiments without repeated manual recording.
3. Resolve measured native voice fragmentation/ASR-turn attribution and accept Decisions 0005/0008/0009 only after actual participant identity improves. The earlier real tests failed despite code-level passes.
4. Validate the new stage-aware progress overlay (accepted Decision 0006), including success, skipped, failed, navigation and elapsed-time behavior while source audio is preserved.
5. Complete global rename, technical ASR accuracy, full Windows output/installer and long-meeting reliability gates without regressing AirPods/Orukeet.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-AUDIO-RERUN-20261030`
- Current target: [OW-AUDIO-RERUN-20261030] Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: Previous focused Windows tests/typecheck/renderer passed (245 pass, four skipped) on the speaker candidate, but not on this turn's committed progress overlay. Six pure progress-reducer checks passed in isolation; full new native/real overlay checks pending. The upstream daily-use blocker is **source PCM deletion after diarization**, preventing non-destructive reruns and forcing repeated recordings. A tested private archive primitive now exists (9/9 exact-source native Node/Linux tests); it is deliberately **not wired to live capture** until retention/account deletion can be protected. Preserve the Oct. 28 baseline while completing Decision 0007.

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
| Confidence-or-unassigned automatic system overflow | Backend sentinel/policy, persistence, exports and manual-label UI committed; new regression fixtures for unknown and locked speakers | **Candidate in GitHub; 81/81 pure-JS GitHub-source tests passed in isolated V8, not native Node/Windows/real-world; Decision 0009 Proposed** |
| One-command local speaker verification | `scripts/verify-meeting-speakers.js` (`60a56bf`) and package script (`9f4a074`); 26 referenced test files exist; success, failure, missing-dependency and Windows cmd paths exercised in mocked runner | **USER-VERIFIED native Windows PASS: 245 tests passed, 4 skipped, 0 failed, TypeScript and renderer build passed; real-audio result pending. No GitHub Actions** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |
| Visible diarization progress overlay | Main pipeline stage IPC, preload/type bridge, note-scoped store, overlay, English labels and regression fixtures committed | **Accepted requirement implemented for validation; 6/6 isolated reducer cases pass, native Windows/real UI still untested (Decision 0006)** |
| Private raw meeting-audio archive foundation | `meetingAudioArchive.js` plus nine-file-system-case regression; original Git blob hashes matched locally under Node 22 | **9/9 native Node/Linux tests passed; note/session segregated, dual track, duplicate and symlink protections. Not wired to capture, retention or re-diarization; Win32 untested. Decision 0007 still pending.** |

## 12. Open Risks / Regression Watchlist

- The latest three real Teams trials predate the confidence-or-unassigned candidate, and **none** proved speaker accuracy. Do not promote the code based solely on synthetic fixtures or the output containing fewer named people.
- Retaining the seven longest acoustic groups can still preserve duplicate speakers; strict pre-cap pair matching can legitimately produce zero merges in noisy recordings.
- A previously unsupported cluster may now be shown as Unknown Speaker instead of being misattributed. That is intentionally safer, but can increase manual review and loses automatic linking among separate unknown lines.
- Explicit/saved count and mic-track overflow continue their prior behavior. Ensure their test expectations are unchanged before broadening policies.
- A manually assigned unknown line intentionally has no numeric speaker cluster; its user-locked name must remain visible and editable after save/reload, and exports must show it without counting unknown as an identified participant.
- Expanded October 30 source-level execution to **81/81 passing pure-JS tests** across nine GitHub source/test suites, using a limited V8 test/assert shim; this **does not** validate Electron IPC, React, TS, Windows or audio. Container `git` cannot resolve github.com. `npm run verify:meeting-speakers` is committed, covers 26 native test files + typecheck + renderer build, and its orchestration paths were tested with mocks; native code/build verification passed; real replay remains unverified.
- Progress overlay is newly committed but must pass updated native Windows tests and a real long/failed diarization check; retained-audio re-diarization (Decision 0007) remains unimplemented and repeated manual replay remains costly.
- Preserve the Oct. 28 baseline, selected AirPods output, transcript text, timestamps, user corrections and privacy; no GitHub Actions use.

## 13. Next Best Step

**Active work ID:** `OW-AUDIO-RERUN-20261030`
**Next:** [OW-AUDIO-RERUN-20261030] Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.
**Why:** Real speaker attribution still lacks matched evidence, but asking the user to replay Teams repeatedly is an avoidable burden and won't support iterative fixes. The current post-stop pipeline deletes temporary raw PCM and can drop the mic track after system audio becomes audible. Preserving original tracks with note/session ownership and compliant deletion is the critical prerequisite for re-running speakers safely. This work is explicitly accepted as Decision 0007.
**It should prove:** The already-tested private archive is safely integrated into capture and note lifecycle, both relevant tracks survive according to resolved user retention policy, and a note can be re-diarized with a revised count without re-recording or rerunning ASR. Existing words/summaries/manual locks remain intact; deletion leaves no orphaned private source.
**Afterwards:** Re-run the expanded native Windows verification, test the new progress overlay, then perform one matched real Teams benchmark and repeat diarization locally without further recording. Maintain Decisions 0005/0008/0009 as Proposed until accurate speaker identity is proven.
