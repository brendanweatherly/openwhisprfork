# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-30 (after 17-cluster diagnostic replay and narrow alignment correction)
**State confidence:** Latest diagnostic replay directly evidenced 17 native clusters, 4 unsupported joins and 30/59 mixed acoustic windows; private transcript confirms incorrect labels. A narrow aggregate-overlap correction and synthetic tests are committed; 7 isolated Node checks passed, but the updated full Windows regression suite/build and a corrected real replay have not run.
**Current milestone:** Validate aggregated speaker overlap and resolve unsupported native speaker merges
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-SPK-ALIGN-20261030`
**Canonical next action:** Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.
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
| Confirmed latest run | 17 native acoustic clusters, 81 acoustic turns, seven final IDs, 13 usable cluster embeddings, 10 remaps, 59 transcript chunks and zero automatic names. | User-supplied third diagnostic run. Same audio source type as previous trials; label quality remains failed. |
| Confirmed blind merges | Four extra clusters had no usable embedding and were merged into the longest retained cluster with no similarity score. Their combined speech lasted **4.95 s / 245.84 s (~2%)**. | `capRemapDiagnostics` entries with `similarity:null`; a real risk, but too little duration to explain pervasive attribution error alone. |
| Confirmed uncalibrated merges | Six centroid-supported remaps used similarity values ranging **0.451–0.795**. | Log; a nearest neighbor is not automatically the same person. No validated similarity threshold for this meeting audio. |
| Confirmed native over-fragmentation | 17 initial clusters for a conversation containing considerably fewer actual voices, while the cap always keeps the seven longest source clusters separate. | Log, source `capSpeakerClustersByVoice`, and private transcript. Automatic seven labels cannot consolidate two kept fragments of one actual person. |
| Confirmed transcript conflict | **30/59** transcript chunks intersect multiple final acoustic groups; **13/59** have no dominant group reaching 70% of summed overlap. A single placeholder label is used for two distinct self-introductions. | Latest numeric log plus private exported transcript; these counts are not ground-truth speaker accuracy by themselves. |
| Confirmed original alignment limitation | `mergeWithTranscript` previously chose one *largest individual acoustic turn* for the entire text chunk, even when another final speaker collectively owned more of the time. | Exact source review and an anonymous interleaved A/B/A synthetic fixture. |
| Committed corrective trial | `diarization.js` now sums overlaps across all turns per final speaker (`07cd6ae`); two tests check aggregation and user locks (`9d031ff`). Diagnostic summary adds `aggregateVoteDiffersFromSingleTurn` (`18fec36`, tests `88ed480`, `4e391be`). | Seven equivalent isolated Node checks passed. Full Windows suite/typecheck/build **not run** on new patch; no live replay validation yet. |
| Residual uncertainty | A single multi-second ASR chunk can contain words from multiple people, so aggregated overlap still cannot split or accurately attribute every word. | Add separate confidence/unknown or word-alignment solution only with testing; do not force real people into one label. |
| Known-good baseline | AirPods system capture, local Orukeet, prior timestamp fixes, speaker locks and user corrections remain required. | No new source/ASR change in this turn; regression still required before promoting patch. |
| Pending user requirements | Stage-aware diarization progress overlay and retained-audio post-meeting reprocessing. | Decisions 0006 and 0007 accepted, implementation still pending; repeated external replay is an acknowledged workflow cost. |
| Interpretation | `namedSegments=0` indicates no automatic names were accepted, rather than failed speaker discovery. | Avoid guessing names from the participant list. |

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

- Upstream speaker clustering remains problematic; do not call the narrow transcript overlap-vote fix a complete diarization correction.
- The automatic seven-speaker ceiling always protects seven longest-duration native groups, even when some are duplicates of the same person; adjusting that needs a calibrated, evidence-gated policy rather than simply removing the cap or forcing a smaller count.
- Four unsupported remaps (4.95 seconds total) must be addressed conservatively, but their short duration does not explain all label errors. Similarity scores for six supported remaps lack a validated same-speaker cutoff.
- The A/B/A transcript-overlap fix changes the final label only when a speaker's total acoustic time outweighs another speaker's longest single turn. It must preserve text, corrected timestamps, manually locked speaker identities, Orukeet and separate system/mic audio.
- Audio-word alignment remains coarser than true speaker boundaries. Explicit uncertainty handling for balanced chunks requires UI/persistence/export review before implementing it.
- Retained source-audio re-diarization and visible processing progress (Decisions 0007 and 0006) remain accepted and should precede further routine user replay cycles where practical.
- Keep real meeting names, words, customer context and recordings out of the public repository; only anonymous synthetic fixtures and numeric-only diagnostics are committed.

## 9. Current Priority Order

1. [OW-SPK-ALIGN-20261030] Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.
2. Address the upstream seven-retained-clusters policy using calibrated centroid evidence and a conservative no-evidence/ambiguous outcome rather than another blind forced assignment.
3. Rerun full speaker regressions/typecheck and compare the same known Teams excerpt **only after** meaningful algorithm improvements; preserve manual locks and timestamps.
4. Implement stage-aware diarization progress overlay (Decision 0006) and retained-audio re-diarization (Decision 0007), reducing repeated playback burden.
5. Resolve global rename, Windows installer and real live mic/system reliability after the speaker-correctness gate.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-SPK-ALIGN-20261030`
- Current target: [OW-SPK-ALIGN-20261030] Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: Third real diagnostic run **completed**. Voice labels still incorrect with 17 raw clusters / 7 final, 4 no-embedding forced joins, and 30/59 overlapping text windows. Aggregated-per-speaker chunk attribution and numeric disagreement diagnostic have now been committed. Only isolated pure checks passed; full Windows suite/real corrected playback still pending.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Oct. 28 timestamp/confidence/stale-name protection | Focused tests passed earlier | Preserve in the working branch |
| Orukeet post-decode corrections | Focused tests and a live correction passed earlier | Preserve device-local behavior |
| Turbo full-video comparison | ~45 min processing for 37 min; material meaning error | Do not replace Orukeet default based on word improvements |
| Automatic cluster discovery + voice-aware cap trial | Three real trials still show wrong labels; latest: 17 raw -> 7 final, 4 missing embedding joins | **Real speaker-accuracy acceptance failed; Decision 0005 remains proposed** |
| Numeric-only native/centroid/overlap diagnostics | Latest Windows replay emitted all diagnostic events: 17 clusters; remap and overlap totals received | **Diagnostics operating in real app; no content committed** |
| Aggregated speaker-overlap correction | Code `07cd6ae`, regression `9d031ff`; audit counter `18fec36` and tests `88ed480`, `4e391be` | **Committed; seven isolated Node checks passed, full Windows/regression and real replay not run** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |
| Visible diarization progress overlay | User-requested requirement, Decision 0006 recorded | **Pending design/implementation**; tiny finalizing pill is insufficient |

## 12. Open Risks / Regression Watchlist

- Third real trial still merges and splits people despite voice-similarity routing. A fixed seven-retained-cluster policy can preserve duplicate speakers and still mix separate ones.
- Four blind no-embedding remaps lasted 4.95 s (2% of detected speech); the other six centroid remaps used similarities 0.451-0.795 without a calibrated same-voice threshold.
- 30 of 59 ASR text windows cover multiple final speaker IDs, 13 materially balanced. Aggregating acoustic duration per speaker may fix a subset, but cannot separate two people's words in a single chunk.
- New alignment and diagnostic code have not passed full Windows tests or real replay; only isolated equivalents passed. Do not promote the branch or accept Decision 0005 until field accuracy improves.
- Preserve known-good Windows AirPods capture, Orukeet corrections, October 28 timestamps, manually locked speakers, existing note content and prior speaker reconciliation tests.
- User expects full diarization progress overlay and re-run speaker identification from retained audio. Both are still open, and further repeated manual playback is costly.
- Existing fresh-checkout setup issues were resolved via `npm ci` and `npm run build:renderer`; streamlined first-run tooling remains separate, not a blocker now.
- No meeting audio or identifying customer transcript text in public GitHub.

## 13. Next Best Step

**Active work ID:** `OW-SPK-ALIGN-20261030`
**Next:** [OW-SPK-ALIGN-20261030] Verify the new overlap-vote regression tests, then design an evidence-gated alternative to blind speaker joins before another real recording.
**Why:** The new real data confirms not one but two architectural limits: keeping seven arbitrary native voice groups even if they include duplicates, and choosing the largest single acoustic turn for ASR chunks. The second error has a narrow isolated code correction; the first still needs evidence-gated grouping that avoids unsupported joins.
**It should prove:** The revised alignment tests and existing speaker regressions remain green without changing transcript words, manual locks or timestamps. Before requesting another audio replay, add a testable policy to handle missing embeddings and duplicates among the seven retained native groups; measure whether new labels become more stable, not merely fewer.
**Remaining:** Actual Windows integration test of new code, genuine speaker accuracy benchmark, progress overlay and retained-audio reprocessing.

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
