# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-29 (after real replay and transcript comparison)
**State confidence:** Real replay failure directly evidenced (log and comparison); subsequent voice-aware cap code and regression tests committed, isolated pure-cap vector test passed; updated full repository tests and new real replay remain unverified.
**Current milestone:** Validate voice-aware meeting speaker clustering against a real Teams replay
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`
**Preserved code baseline branch:** `fix/meeting-speaker-timestamps-20261028`
**Active work ID:** `OW-SPK-CAP-VALIDATE-20261029`
**Canonical next action:** Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.
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
| Automatic speaker cap formerly folded all surplus clusters into the longest voice | Final diarization | Can misattribute real speakers | Real replay: 9 raw -> 7 final; voice-aware centroid mapping committed as trial (`8bab551`), with regression (`d95a7ec`); runtime validation pending, duration-only fallback remains possible if centroids fail |
| Mixed and fragmented speaker IDs in real transcription | Speaker attribution / transcript alignment | Speaker labels unreliable | Anonymous 4-minute comparison: about 6 actual voices, 7 final labels, one label used on 21/35 transcript segments across multiple people; same real voice also split into several labels |
| Diarization progress not visible enough | Post-stop UX | User cannot tell what work is running or whether stalled | User explicitly requests a full progress overlay; current transcript shows only a small "finalizing" pill with no stages or elapsed time; Decision 0006 |

## 6. Observations, Hypotheses, and Unknowns

| Type | Item | Evidence / next proof |
|---|---|---|
| Confirmed real replay failure | First Oct. 29 replay yielded `nativeAudioClusters=9`, `speakerCap=7`, `speakerCapSource=auto`, `audioClusters=7`, 36 turns, 35 transcript chunks, and 0 named chunks. | Log plus Teams/OpenWhispr side-by-side comparison. About six actual voices; one placeholder ID covered 21/35 chunks across multiple people. |
| Confirmed old code defect | Meeting-only duration cap reassigned all extra native voice clusters to the longest-duration speaker; unlike voice-aware upload path. | Old `diarization.js.capSpeakerClusters` and meeting call; avoid repeating blind folding. |
| Confirmed new code change | Meeting overflow cap now attempts existing voice-centroid matching, logs strategy/remaps, and falls back to duration-only when no centroids are usable. | Commit `8bab551`, new nine-to-seven regression test `d95a7ec`. Isolated pure-function synthetic vector test passed; complete integration tests and a real replay **not run yet**. |
| Observed source alignment | OpenWhispr's excerpt starts about 88 s into the Teams reference, without obvious accumulating text-level drift. | Previous timestamp/end-as-start fixes remain protected; waveform precision not proven. |
| Unresolved attribution issue | A single transcript chunk may span two speakers, while `mergeWithTranscript` chooses only one acoustic segment based on largest individual overlap; this may create additional wrong labels independent of cap strategy. | Add targeted synthetic tests after validating the cap change; do not change multiple causes at once without evidence. |
| Previous chat continuity | Earlier four-speaker replay collapsed to one final voice despite `numSpeakers=-1`; source WAV was temporary. User requested re-diarization after count adjustments **without re-recording**, while preserving the original transcript, corrections and reviewed speaker locks. | The one-speaker collapse was mitigated but reprocess/retention workflow is not yet proven; prioritize after acoustic attribution. |
| Confirmed progress UI gap | Current note UI exposes only a small finalizing indicator, not a stage-aware progress overlay. | User-requested requirement is recorded in Decision 0006; implementation pending. |
| Unknown | Whether the voice-aware cap improves correct speakers or instead combines acoustically similar but distinct voices, and whether the embedding extractor runs successfully on the Windows test. | Local focused tests and same-clip replay, inspect `capStrategy`, `capEmbeddingCoverage`, and numeric-only cluster remaps. |
| Interpretation | `namedSegments=0` means no automatic identity labels; by itself this is not a diarization failure. | Conservative unknown-over-wrong naming policy still applies. |

## 7. Current Decisions

| ID / record | Status | Current decision | Reopen only if... |
|---|---|---|---|
| `decisions/0001-local-first-fork-boundaries.md` | Accepted | Hide paid UI; preserve upstream architecture | Product goal changes |
| `decisions/0002-selectable-windows-output.md` | Accepted | Explicit output device; no silent fallback | Better verified route exists |
| `decisions/0003-conservative-speaker-identity.md` | Accepted | Unknown beats false labels; user locks win | Real evidence changes tradeoff |
| `decisions/0004-orukeet-post-decode-corrections.md` | Accepted current behavior | Device-local explicit substitutions | ASR interface changes |
| `decisions/0005-final-diarization-speaker-count-policy.md` | **Proposed / follow-up unvalidated** | Native auto-discovery plus voice-aware overflow remapping committed as a trial; fallback to duration-only if centroids unavailable | Re-evaluate after next actual Teams replay; do not promote prematurely |
| `decisions/0006-diarization-progress-visibility.md` | **Accepted requirement; implementation pending** | Visible post-stop progress overlay with genuine stage updates and clear terminal states | Only if user changes the requested UX |
| `decisions/0007-retained-audio-rediarization.md` | **Accepted requirement; implementation pending** | Preserve local mic/system audio and re-run speaker identification from retained audio while protecting original transcript/corrections/locks | Only if user changes the reprocessing workflow requirement |

## 8. Dependencies

- Preserve known-good selected AirPods system audio, separate mic/system tracks, Orukeet, corrected timestamp offsets and user speaker locks. Do not change ASR/model settings to mask a speaker-attribution defect.
- First retest the voice-aware cluster-cap change against the same known recording. Then isolate transcript-chunk alignment and native acoustic over-segmentation as separate variables before changing thresholds.
- Code reuse from the upload pipeline relies on `speakerEmbeddings.extractClusterCentroids`. When centroids are unavailable, the trial logs `duration-fallback` and remains potentially destructive; diagnose rather than declaring the issue resolved.
- A user-requested re-diarize workflow must retain/recover raw audio and preserve original text, technical corrections, and user review; prior diarization WAVs were temporary and not a dependable reprocessing source.
- The accepted diarization progress-overlay requirement (Decision 0006) calls for real stage notifications/elapsed time, not fabricated percentages. It remains open and should be implemented after the acoustic behavior is validated or as a separate independent UI change.
- Keep user-supplied Teams transcripts, customer names, local vocabulary and audio out of public GitHub; use only anonymous synthetic fixtures and numeric diagnostics.

## 9. Current Priority Order

1. [OW-SPK-CAP-VALIDATE-20261029] Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.
2. If the same clip still mixes voices, distinguish incorrect native acoustic clusters, fallback cap strategy, and transcript-chunk speaker-overlap assignments before changing additional code.
3. Add mixed-speaker transcript boundary regression tests and implement a conservative attribution strategy while preserving user locks and timestamp normalization.
4. Implement stage-aware diarization progress overlay (Decision 0006), then provide re-diarization from retained audio with safe original-transcript preservation.
5. Verify rename everywhere, live mic/system isolation, source audio retention and installer; return to technical ASR improvements after speaker correctness.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Active work ID: `OW-SPK-CAP-VALIDATE-20261029`
- Current target: [OW-SPK-CAP-VALIDATE-20261029] Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.
- Working branch: `fix/meeting-auto-speaker-discovery-20261029`
- Current status: First real replay **failed** speaker identity quality; code now attempts voice-aware remapping for overflow clusters (commit `8bab551`) with nine-to-seven regression fixture (`d95a7ec`). Isolated algorithm test passed; updated integration tests and new Teams replay **pending**.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Oct. 28 timestamp/confidence/stale-name protection | Focused tests passed earlier | Preserve in the working branch |
| Orukeet post-decode corrections | Focused tests and a live correction passed earlier | Preserve device-local behavior |
| Turbo full-video comparison | ~45 min processing for 37 min; material meaning error | Do not replace Orukeet default based on word improvements |
| Auto-discovery + follow-up voice-aware cap trial | Initial `c0e30a83` and tests; replay failed (9 -> 7 auto cap); updated meeting logic `8bab551` and nine-to-seven test `d95a7ec` | **New implementation unverified against real audio; policy remains proposed** |
| First v2 pilot state audit | Old current sections conflicted with appended event | Reconciled current sections; event moved to `history/`; decision 0005 created |
| Visible diarization progress overlay | User-requested requirement, Decision 0006 recorded | **Pending design/implementation**; tiny finalizing pill is insufficient |

## 12. Open Risks / Regression Watchlist

- The first real replay produced seven labels for about six people and mixed voices under the same ID; a new patch is **not** live-validated.
- If voice embeddings are unavailable or extract poorly, the current fallback still merges overflow clusters into the dominant voice. `capStrategy`, coverage and cluster remaps must be reviewed.
- An ASR chunk can cover more than one actual speaker; current transcript merger selects a single voice. Preserve text and mark ambiguity rather than confidently inventing identities.
- Speaker renumbering for resumed notes, user locks and speaker mappings must not collide after reprocessing.
- Prior timestamp/start-end and corrections fixes are known-good; do not reopen without contrary evidence.
- The full progress overlay is pending, despite existing small finalizing pill. Accurate stage updates and terminal states are required before calling it implemented.
- Reprocessing from retained mic/system audio remains an explicit outstanding user requirement; temporary conversion WAV files are deleted.
- User-provided Teams audio and customer vocabulary remain private; no confidential source material belongs in public test fixtures.

## 13. Next Best Step

**Active work ID:** `OW-SPK-CAP-VALIDATE-20261029`
**Next:** [OW-SPK-CAP-VALIDATE-20261029] Run focused speaker-cap regression tests on the updated working branch and replay the same Teams excerpt to assess cluster identity and transcript alignment.
**Why:** The previous meeting path had proven destructive duration-only 9-to-7 folding. A narrow follow-up now reuses the already-tested voice-aware upload cap in the post-stop recording path, but an isolated synthetic vector result is not proof the Windows native embeddings or transcript attribution work.
**It should prove:** The refreshed source passes the nine-to-seven integration regression plus the earlier speaker/timestamp/lock tests. On the same Teams excerpt, `capStrategy=voice-similarity` and cluster remaps should improve stable attribution without changing audio capture or text. If not, diagnose separate native fragmentation/ASR boundary issues before retuning.
**Remaining independent requirement:** Implement the visible diarization progress overlay and ability to re-run diarization from retained audio, keeping original content intact.

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
