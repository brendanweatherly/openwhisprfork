# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-30 (after real voice-aware Teams replay and diagnostic code checkpoint)
**State confidence:** October 30 real Teams replay directly evidenced voice-aware execution and continued misattribution (log plus paired excerpts). User-reported prior focused tests, typecheck and renderer build succeeded; new diagnostics code/test commits are unverified in full Windows app. Four mirrored pure diagnostic tests passed locally, not the full integration suite.
**Current milestone:** Diagnose native speaker fragmentation and transcript alignment after the October 30 replay
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-SPK-DIAG-20261030`
**Canonical next action:** Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.
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
| Voice-aware cap is used but final speaker attribution remains wrong | Native clustering / merging / transcript alignment | Prevents trustworthy meeting minutes | Oct. 30 replay: 14 native -> 7 final, 11/14 centroids, 7 remaps, 39 turns, 43 text chunks; five identifiable real voices still split/merged across labels; cause not yet isolated |
| Mixed and fragmented speaker IDs in real transcription | Speaker attribution / transcript alignment | Speaker labels unreliable | Anonymous 4-minute comparison: about 6 actual voices, 7 final labels, one label used on 21/35 transcript segments across multiple people; same real voice also split into several labels |
| Diarization progress not visible enough | Post-stop UX | User cannot tell what work is running or whether stalled | User explicitly requests a full progress overlay; current transcript shows only a small "finalizing" pill with no stages or elapsed time; Decision 0006 |
| Fresh October 30 checkout missing installed npm dependencies | Windows prestart / sherpa extraction | Blocks launching the diagnostic build | `npm start` downloaded sherpa-onnx v1.13.8 but could not unpack it: `Cannot find module 'unbzip2-stream'`. Both `package.json` and `package-lock.json` already declare this package; local dependency installation (`npm ci`) is the first recovery step. No source or acoustic code defect established. |

## 6. Observations, Hypotheses, and Unknowns

| Type | Item | Evidence / next proof |
|---|---|---|
| Confirmed Oct. 30 runtime path | The real recording used `capStrategy=voice-similarity` with 14 native clusters reduced to 7, 11 usable native centroids, 7 remaps, 39 acoustic turns, 43 transcript segments and `namedSegments=0`. | User-provided source-app log; the previous duration-only global fallback was **not** used. Individual remaps can still lack embeddings. |
| Confirmed reference comparison | The overlapping Teams excerpt contains approximately five real speakers. OpenWhispr assigned seven labels, repeatedly splitting one real speaker and reusing labels for different people. | Two uploaded transcripts compared privately in conversation; names/audio/words are not committed to the public repo. |
| Confirmed prior replay | Oct. 29 real run produced nine native clusters reduced to seven under the original duration-only cap, with misattribution. | Prior log and excerpt; the different selected portion makes raw cluster-count differences non-comparable as a performance metric. |
| Confirmed source-code risk | `diarizationPolicy.capSpeakerClustersByVoice` selects the seven longest-duration native groups to keep and maps the rest to their nearest available centroid; a missing centroid folds into the largest group, and there is no minimum-similarity requirement. | Source inspection, `src/helpers/diarizationPolicy.js`; `11/14` embedding coverage means not every native group had voice evidence. |
| Confirmed source-code risk | `diarization.js.mergeWithTranscript` gives a whole ASR chunk the speaker of its strongest **single** overlapping acoustic turn; it cannot faithfully split words spanning multiple voices without finer timestamps. | Source inspection; the attached transcript shows some chunks covering two actual voices. |
| Proven limited test status | User reports earlier 69-case focused Windows speaker suite passed on the voice-aware candidate, and `npm run typecheck`/`npm run build:renderer` completed. | User statements; raw stdout not supplied. New code after this point is only diagnostics, not a change to acoustic labels. |
| Diagnostics committed / unverified in app | New numeric-only helper `88abab3`, four synthetic regression cases `7bc8cba`, main meeting audit wiring `f6c2904`. | Four equivalent pure helper tests passed locally in Node; new integrated Windows suite/replay **not run**. |
| Observation, not proof of mechanism | 14 native clusters across roughly five people indicates marked over-fragmentation, but it does not prove whether native clustering, voice centroid selection, missing embeddings or coarse text alignment dominates the final errors. | New cluster-duration, similarity/fallback and chunk-overlap metrics are needed before threshold changes. |
| Separate open user requirements | Visible stage-aware diarization progress overlay and rerun from retained mic/system audio without altering reviewed transcripts. | Decisions 0006 and 0007 accepted; neither implemented. |
| Interpretation | `namedSegments=0` only means names were not automatically confirmed. | No grounds for forcing names to make this value nonzero. |

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

## 8. Dependencies

- Preserve confirmed AirPods system-output recording, separate mic/system routing, Orukeet transcription, October 28 timestamp repairs, reviewed speaker locks and local vocabulary corrections.
- The Oct. 30 replay proves the voice-similarity code executes but **not** that the speaker labels are reliable; no branch promotion or diarization policy acceptance.
- Determine the shape of native clusters (duration/turn counts), missing centroids, individual remap similarities, and multi-cluster ASR chunks before selecting a threshold, deleting short clusters, or changing an implicit seven-speaker cap.
- The new `meetingDiarizationDiagnostics.js` and tests are intentionally privacy-preserving and do **not** change speaker identity decisions. Source app integration needs a fresh validation.
- Replaying Teams audio repeatedly is an unsatisfactory long-term workflow; retained-source re-diarization (Decision 0007) is still a necessary product feature, but temporary WAVs/raw PCM are deleted today.
- The stage-aware progress overlay (Decision 0006) remains accepted but **not implemented**; update UI only when the backend event lifecycle can show actual progress.
- Customer/company-specific audio, transcript words and participant names remain confined to this conversation and local PC, never the public repo.

## 9. Current Priority Order

1. [OW-SPK-DIAG-20261030] Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.
2. Use the diagnostics to isolate the larger root cause: native over-splitting, absent/low-quality centroids and unconditional seven-cluster folding versus coarse ASR chunk attribution.
3. Add a narrow, reproducible corrective regression and algorithm change for the demonstrated failure; retest the **same** audio and preserve timestamp/lock regressions.
4. Implement stage-aware diarization progress overlay (Decision 0006) and retained-audio re-diarization (Decision 0007), avoiding further routine replay burden.
5. Validate speaker rename everywhere, live mic/system isolation, clean Windows installer and technical ASR improvements in dependency order.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-SPK-DIAG-20261030`
- Current target: [OW-SPK-DIAG-20261030] Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: **Second real voice-attribution benchmark failed**, despite entering `capStrategy=voice-similarity`. Eleven of fourteen native clusters had voice embeddings, seven were remapped, and final transcript still mixed/split approximately five real voices into seven labels. New numeric-only diagnostics and four test cases committed, pure helper smoke-checked 4/4 locally; full Windows integration and diagnostic replay pending.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Oct. 28 timestamp/confidence/stale-name protection | Focused tests passed earlier | Preserve in the working branch |
| Orukeet post-decode corrections | Focused tests and a live correction passed earlier | Preserve device-local behavior |
| Turbo full-video comparison | ~45 min processing for 37 min; material meaning error | Do not replace Orukeet default based on word improvements |
| Auto-discovery + voice-aware cap trial | User reports prior focused tests/build clean; Oct. 30 real replay used `voice-similarity` (14 raw -> 7 final) but labels still wrong | **Executed in app, speaker-accuracy acceptance failed; Decision 0005 remains proposed** |
| Numeric-only native/centroid/overlap diagnostics | Commits `88abab3`, `7bc8cba`, `f6c2904`; four equivalent helper smoke tests passed locally | **New code committed, Windows test and replay pending; speaker behavior deliberately unchanged** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |
| Visible diarization progress overlay | User-requested requirement, Decision 0006 recorded | **Pending design/implementation**; tiny finalizing pill is insufficient |

## 12. Open Risks / Regression Watchlist

- Voice-aware cap is not a proven speaker-correctness solution: Oct. 30 result assigned seven labels across roughly five real speakers, including reused labels for different people. The first Oct. 29 replay also failed.
- `embeddingCoverage=11` for 14 raw clusters; the seven remaps lack per-pair similarity evidence in the old log, and missing-embedding extras can still be blindly folded into the longest retained voice.
- A fixed seven-speaker auto ceiling remains despite incomplete roster and no user-selected count. The raw 14 native clusters include likely over-segmentation; simply removing the cap could create even more phantom identities.
- Multi-second transcript chunks can contain speech from more than one speaker; single-turn maximum-overlap logic may assign the chunk to the wrong one. New overlap audit measures this without changing assignments.
- User reports successful previous typecheck/build; diagnostics commits now need focused regression and Windows integration verification. No GitHub Actions usage.
- The fresh October 30 extracted checkout failed in the sherpa-onnx unpack step because `unbzip2-stream` was not installed locally; `npm ci` should restore it from the existing lockfile. Do not alter repository dependencies or re-download ZIP without an npm install error.
- Progress overlay, retained-audio re-diarization, review-lock persistence, and global rename remain separate accepted/unproven behaviors.
- Preserve the Oct. 28 known-good baseline, AirPods audio output, Orukeet, and private technical corrections. No customer transcription/voice data in public GitHub.

## 13. Next Best Step

**Active work ID:** `OW-SPK-DIAG-20261030`
**Next:** [OW-SPK-DIAG-20261030] Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.
**Why:** The second real recording disproved the idea that selecting voice similarity alone fixes speaker identification. The new diagnostics expose raw cluster durations, embeddings missing for each group, per-remap cosine similarity (or explicit unknown), and how many text chunks span multiple acoustic speakers. This prevents further speculative acoustic tuning.
**It should prove:** First, four pure helper regression cases and the existing focused speaker suite still run on Windows. Second, the next same-clip result reports `Post-meeting native speaker cluster audit`, `Post-meeting speaker cap audit` with `capRemapDiagnostics`, and `Post-meeting transcript-to-speaker overlap audit`, allowing one measured root-cause choice. It is **not** an end-to-end correctness fix yet.
**Afterwards:** Patch the demonstrated acoustic/overlap defect with a targeted regression, revalidate the source meeting, then implement the requested progress overlay and retained-audio reprocessing.

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
