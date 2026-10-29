# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-29 (after real replay and transcript comparison)
**State confidence:** Direct evidence for real replay failure (user-supplied diarization log and side-by-side transcript exports); user-reported passing unit tests, typecheck, renderer build, and source-app launch; exact cause of each misattribution still under investigation.
**Current milestone:** Correct speaker-attribution defects exposed by the real Teams replay
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-SPK-QUALITY-20261029`
**Canonical next action:** Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.
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
| Automatic speaker cap folds distinct acoustic clusters into the longest voice | Final diarization | Can misattribute real speakers | Real replay: 9 raw clusters -> 7 final with `speakerCapSource=auto`; meeting `capSpeakerClusters` indiscriminately folds both extras to the primary cluster |
| Mixed and fragmented speaker IDs in real transcription | Speaker attribution / transcript alignment | Speaker labels unreliable | Anonymous 4-minute comparison: about 6 actual voices, 7 final labels, one label used on 21/35 transcript segments across multiple people; same real voice also split into several labels |
| Diarization progress not visible enough | Post-stop UX | User cannot tell what work is running or whether stalled | User explicitly requests a full progress overlay; current transcript shows only a small "finalizing" pill with no stages or elapsed time; Decision 0006 |

## 6. Observations, Hypotheses, and Unknowns

| Type | Item | Evidence / next proof |
|---|---|---|
| Confirmed code change | Native final diarization now runs without forcing a fixed cluster count. | Working-branch commit `c0e30a83`, focused tests user-reported clean. This avoided the former single-cluster failure but not identity errors. |
| Confirmed replay observation | The Oct. 29 replay of a multi-person segment yielded `nativeAudioClusters=9`, `speakerCap=7`, `speakerCapSource=auto`, `audioClusters=7`, `diarizationTurns=36`, `transcriptSegments=35`, and `namedSegments=0` for a fresh note. | User-provided log; diarization completed, but quality failed. |
| Confirmed transcript comparison | Approx. six distinct real voices occur in the overlapping reference segment, vs seven final placeholder IDs; one ID covers 21/35 transcript chunks and multiple different people. | User-provided text and Teams export; exact voice-to-cluster mapping still unknown without native cluster details. |
| Confirmed implementation risk | The meeting auto cap still folds surplus clusters into the single longest-duration speaker even when source is `auto`. | `diarization.js` `capSpeakerClusters`, invoked from `ipcHandlers.js` after native auto clustering. The upload path uses a different voice-aware cap. |
| Confirmed UI gap | Current note transcript shows a small finalizing indicator, not a stage-aware overlay. | `NoteEditor.tsx`, `MeetingTranscriptChat.tsx`; user request captured in Decision 0006. |
| Observed timing | Comparable utterances align with an approximately 88-second offset because OpenWhispr recorded a later excerpt; no clear cumulative timestamp drift in the sample. | Text alignment across multiple matching passages, not a waveform-level test. |
| Hypothesis | Incorrect attribution combines native over-segmentation, destructive cap folding, and transcript chunks crossing actual speaker turns. | Require anonymized code tests and raw/retained audio diagnostics before tuning thresholds or changing model. |
| Unknown | Which of the two folded native clusters contributed to which wrong final label, and how often ASR chunks span speaker boundaries. | Add non-content diagnostic logging for cluster-remap and overlap, then validate with source audio; do not publish private transcripts. |
| Unknown | Whether reviewed user locks/global rename, separate live mic/system routing, and source-audio retention work end to end. | Regression and separate acceptance tests after acoustic correctness. |
| Interpretation | `namedSegments=0` confirms no automatic names; it is not evidence of failed acoustic discovery by itself. | Conservative identity policy prioritizes unassigned names over confident wrong names. |

## 7. Current Decisions

| ID / record | Status | Current decision | Reopen only if... |
|---|---|---|---|
| `decisions/0001-local-first-fork-boundaries.md` | Accepted | Hide paid UI; preserve upstream architecture | Product goal changes |
| `decisions/0002-selectable-windows-output.md` | Accepted | Explicit output device; no silent fallback | Better verified route exists |
| `decisions/0003-conservative-speaker-identity.md` | Accepted | Unknown beats false labels; user locks win | Real evidence changes tradeoff |
| `decisions/0004-orukeet-post-decode-corrections.md` | Accepted current behavior | Device-local explicit substitutions | ASR interface changes |
| `decisions/0005-final-diarization-speaker-count-policy.md` | **Proposed / real replay failed** | Native auto-discovery trial; automatic maximum still destructively folds 9 to 7 | Revise based on measured identity and cap evidence; do not promote |
| `decisions/0006-diarization-progress-visibility.md` | **Accepted requirement; implementation pending** | Visible post-stop progress overlay with genuine stage updates and clear terminal states | Only if user changes the requested UX |

## 8. Dependencies

- Preserve the known-good AirPods audio route, native Windows helper and Orukeet transcription baseline; the replay confirms text is captured and diarization executes, not that live mic/system isolation is fully validated.
- Fix speaker attribution upstream of global rename UX. A 9-to-7 automatic cap and transcript-chunk alignment can corrupt identities regardless of later manual renaming.
- The meeting path's duration-only cap differs from the existing voice-similarity-aware cap for uploaded audio. Do not assume the latter can be copied without measuring its embedding/extraction cost, quality and interaction with per-note speaker-index ceilings.
- The user-supplied side-by-side reference is a **partial** recording starting roughly 88 seconds into the Teams transcript. Compare only overlapping content; Teams speaker identities are useful reference labels, while Teams ASR words are not guaranteed to be perfect.
- Add a separate post-stop progress overlay while preserving the ability to navigate notes and raw-transcript fallback; full stage progress requires valid IPC events, not invented percentages.
- No participant names, private meeting words, media, or customer vocabulary from the reference may be committed to the public GitHub repository.

## 9. Current Priority Order

1. [OW-SPK-QUALITY-20261029] Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.
2. Use those regressions to address destructive auto-cap folding and transcript-voice turn mismatch, then rerun the *same* known recording and compare actual identities before considering policy 0005 accepted.
3. Implement the requested diarization progress overlay (Decision 0006) with actual stage transitions, elapsed time, persistent per-note job state and error/skip behavior; no fabricated percentages.
4. Validate speaker mapping/locks, global rename, audio retention, and live mic/system separation; preserve earlier passing timestamp and Orukeet corrections.
5. Continue technical-ASR accuracy/performance and Windows clean installer validation only after the speaker correctness gate.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-SPK-QUALITY-20261029`
- Current target: [OW-SPK-QUALITY-20261029] Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: Real replay **completed but failed speaker attribution**. The log showed 9 native clusters reduced to 7 with automatic cap, while the text comparison showed mixed and split IDs. No code fix or full diarization progress overlay has been implemented in response yet.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Oct. 28 timestamp/confidence/stale-name protection | Focused tests passed earlier | Preserve in the working branch |
| Orukeet post-decode corrections | Focused tests and a live correction passed earlier | Preserve device-local behavior |
| Turbo full-video comparison | ~45 min processing for 37 min; material meaning error | Do not replace Orukeet default based on word improvements |
| Auto-cluster-before-cap + explicit/saved-count policy trial | Code commit `c0e30a83`, tests `1bf18822` and `c730772`; user-reported passing checks; replay showed 9 -> 7 automatic cap and mixed identities | **Real-world speaker attribution failed; proposal remains unaccepted** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |
| Visible diarization progress overlay | User-requested requirement, Decision 0006 recorded | **Pending design/implementation**; tiny finalizing pill is insufficient |

## 12. Open Risks / Regression Watchlist

- Real 4-minute excerpt showed six reference voices but seven final speaker IDs, with one ID assigned across several real people; quality is **confirmed broken** despite passing synthetic code tests.
- `speakerCapSource=auto` still applies a hard seven-cluster ceiling and folds extra native clusters into the dominant cluster; do not promote trial policy 0005.
- Preserve speaker locks, separate mic/system timestamps, stale-name protection, and completion delivery when adjusting acoustic grouping or segment matching.
- Word-level transcription and speaker labeling are distinct: speech chunks can straddle two real people. The Teams reference itself is imperfect text; do not call WER proven from a partial excerpt.
- `namedSegments=0` may be appropriate with no trusted speaker profiles. Do not automatically assign names merely to make this metric nonzero.
- Diarization progress overlay remains unimplemented; ensure no indefinite spinner on failure/skip and no unsupported percentage claims.
- Protect known-good AirPods output capture and device-local Orukeet corrections. Keep company/customer transcripts and voice audio out of the public repo.
- Preserve Oct. 28 working baseline; no new clustering patch has passed live-replay acceptance.

## 13. Next Best Step

**Active work ID:** `OW-SPK-QUALITY-20261029`
**Next:** [OW-SPK-QUALITY-20261029] Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.
**Why:** The first real replay provides a reproducible failure that synthetic tests missed: 9 native clusters reduced to 7 by the automatic maximum, plus incorrect final speaker grouping across 35 transcript segments. A controlled regression and alignment audit must precede any acoustic threshold or merge-policy change.
**It should prove:** Deterministically capture the harmful behavior of duration-only extra-cluster folding and mixed/split final labels in generic fixtures; separate acoustic clustering, cap policy and text-to-voice overlap before selecting a safe fix.
**After that:** Correct the measured issue, retest the same speaker excerpt, and build the requested diarization progress overlay as a separate UI improvement.

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
