# PROJECT STATE - OpenWhispr Fork / Meeting Recorder

**Last reconciled:** 2026-10-29
**State confidence:** High for pushed code; Medium for live runtime behavior not yet revalidated after all Oct. 28 fixes
**Current milestone:** Stabilize the meeting capture -> transcription -> diarization -> speaker-correction pipeline on Windows
**Authoritative pushed branch:** `fix/meeting-speaker-timestamps-20261028`
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

| Problem | Layer | Impact | Evidence / date / source |
|---|---|---|---|
| Technical transcription accuracy is still insufficient | Transcription | Wrong technical terms can corrupt minutes/summaries | Orukeet live transcripts; Turbo comparison still contained serious errors |
| Whisper Large V3 Turbo is too slow for daily default and can still reverse meaning | Transcription | ~45 min for 37 min audio; semantic risk | 2026-10-29 same-video comparison |
| Live/final speaker assignment has produced false merges, phantom attendees, and wrong names | Speaker pipeline | Transcript cannot be trusted by speaker | Oct. 28 real meeting; user abandoned mapping after assignments degraded |
| Final diarization on active branch still forces native `numSpeakers` when a count is inferred/set | Diarization | Native clustering can collapse distinct voices before later capping/merge logic | Active-branch `src/helpers/ipcHandlers.js` still calls `diarize(tmpWav, numSpeakers > 0 ? { numSpeakers } : {})` |
| Four-participant test with unset count collapsed output to one cluster | Diarization | Multiple remote speakers lost | 2026-10-29 real upload/test |
| Auto-cluster-before-cap fix is isolated, not integrated into active Oct. 28 branch | Integration | A promising fix exists but is not in the authoritative baseline | `codex/raw-speaker-collapse-fix` commit `6adfb773...`; active branch does not contain its call pattern |
| Orukeet has no raw hotword/prompt interface in this fork | Transcription | Dictionary cannot improve recognition before decoding | `docs/local-meeting-corrections.md` |
| "Rename speaker everywhere" behavior was observed not to propagate as expected | Speaker correction UI/state | Manual cleanup becomes impractical | User live test; no newer end-to-end proof that this is resolved |
| Full clean Windows installer validation is incomplete | Packaging | Working dev environment does not prove distributable app | Fork docs / prior development status |

## 6. Observations, Hypotheses, and Unknowns

| Type | Item | Evidence for / against | Next proof |
|---|---|---|---|
| Observation | Speaker errors were compound, not a single-threshold problem | Oct. 28 branch added timestamp normalization, stale-name clearing, confidence policy, mixed-clock fixes, and final-delivery logging | Real replay/live meeting after all fixes |
| Hypothesis | Forcing a native speaker count is still a major cause of remote-speaker collapse | Real four-participant collapse + isolated `6adfb773...` test fixture showing forced count collapsed voices while automatic clustering preserved them | Integrate compatible auto-cluster-before-cap change into active branch and replay known recording |
| Hypothesis | Better timestamp boundaries will improve final speaker voting even when transcript wording is imperfect | Oct. 28 timing fixes/tests support alignment correctness | Full known-meeting replay |
| Unknown | Whether the Oct. 28 pushed branch fully fixes phantom names/false live merges in a long real meeting | Unit/focused tests pass, but live test after full fix set is not recorded as successful | Real 30-60 minute Teams test |
| Unknown | Best practical ASR path after Orukeet | Turbo too slow; post-decode corrections help only explicit mishearings | Compare a practical alternative/longer-context path only after speaker pipeline baseline is stable |
| Unknown | Whether source-audio retention/reprocessing is complete across all failure paths | Requirement exists; not yet proven end-to-end in current state | Inspect/replay saved meeting audio during validation |
| Unknown | Whether global speaker rename now persists across all matching segments after latest state fixes | Prior user report says no | Explicit rename-everywhere regression test + live UI check |

## 7. Current Decisions

| ID / record | Status | Current decision | Reopen only if... |
|---|---|---|---|
| `decisions/0001-local-first-fork-boundaries.md` | Accepted | Keep the fork local-first and hide paid UI without deleting upstream architecture | Upstream architecture or product goal changes |
| `decisions/0002-selectable-windows-output.md` | Accepted | Support explicit Windows output selection; selected-device failure must be visible | A more reliable OS-level routing design replaces it |
| `decisions/0003-conservative-speaker-identity.md` | Accepted | Prefer conservative/unknown speaker identity, preserve user locks, and let final evidence replace provisional live labels | Real validation shows this blocks correct identification |
| `decisions/0004-orukeet-post-decode-corrections.md` | Accepted current behavior | Keep device-local literal corrections after Orukeet decode; do not claim they are model hotwords | Orukeet gains a reliable prompt/hotword interface or ASR baseline changes |

## 8. Dependencies

- Reliable speaker validation depends on confirmed usable system + mic audio.
- Final speaker mapping depends on timestamp alignment and diarization; UI rename behavior should not be used to mask an upstream clustering failure.
- AI summaries depend on transcript correctness; summary quality cannot repair wrong scope wording.
- Technical dictionary corrections depend on the base ASR output and only fix explicit known phrases after decode.
- Installer validation should happen after the core recording/transcription/speaker pipeline is stable enough to freeze a release candidate.
- The isolated auto-clustering speaker fix must be reconciled into the active Oct. 28 branch rather than switching development back to its older branch base.

## 9. Current Priority Order

1. **Reconcile automatic native clustering into the active Oct. 28 branch** without losing the timestamp/confidence/correction/output work.
2. **Run targeted regression tests** for diarization, timestamp alignment, user locks, corrections, and speaker-state persistence.
3. **Replay the known multi-participant Teams recording / run a real 30-60 minute meeting** and verify distinct remote speakers, final assignments, source retention, and delivery completion.
4. **Fix rename-everywhere / manual correction workflow** only after final clusters are stable.
5. **Improve practical transcription accuracy** using a model/path that beats Orukeet materially without Turbo-level latency or semantic regression.
6. **Complete clean Windows build/install validation** and final regression suite.

## 10. Current Focus

- Active context: `ACTIVE_CONTEXT.md`
- Current target: integrate and validate the auto-cluster-before-cap behavior in the authoritative Oct. 28 branch.

## 11. Recent Material State Changes

| Change / test | Result | State impact |
|---|---|---|
| Added device-local Orukeet meeting corrections | Targeted tests passed; live correction observed | Explicit recurring mishearings can be fixed post-decode |
| Added timestamp normalization and capture-time alignment | Focused tests passed | Mixed epoch/relative timestamp corruption is no longer assumed acceptable |
| Added conservative speaker confidence policy and stale-name clearing | Focused tests/build passed | Automatic speaker labels should be treated as provisional unless evidence is strong |
| Added final diarization delivery logging | Committed | Future live tests can distinguish "ran" from "result actually delivered" |
| Full Turbo transcription comparison | ~45 min / 37 min; some wording improved, one material meaning reversal remained | Turbo is not the daily default |
| Reconciled GitHub branches on 2026-10-29 | Active Oct. 28 branch identified; isolated auto-cluster fix confirmed absent | Speaker-count collapse remains open |

## 12. Open Risks / Regression Watchlist

- Do not regress selectable Windows output or AirPods working capture while changing meeting pipeline code.
- Do not reintroduce stale live names over final diarization clusters.
- Do not let provisional speaker IDs inherit user-reviewed names.
- Preserve user-locked speaker identity through refinement.
- Preserve mic/system source separation and timestamps.
- Keep correction rules device-local and out of public source.
- Do not silently fall back from a selected Windows output device.
- Avoid a "fix" that improves diarization tests but makes real meeting latency or transcript quality worse.

## 13. Next Best Step

**Next:** Port/reconcile the automatic-clustering-before-cap logic from `codex/raw-speaker-collapse-fix` into `fix/meeting-speaker-timestamps-20261028`, adapting it to the newer Oct. 28 speaker/timestamp code rather than cherry-picking the old branch wholesale.

**Why:** The active branch still contains the exact forced-count behavior implicated by the real four-participant collapse, while the separate branch contains a focused fix and regression fixture. This is a high-impact upstream diarization issue and must be resolved before tuning manual speaker UI.

**It should prove:** Final diarization can preserve distinct native voice clusters and apply expected speaker count as a ceiling without collapsing real speakers before transcript reconciliation.

## 14. Parking Lot

- Evaluate Qwen3-ASR / other practical ASR alternatives only after the speaker baseline is stable.
- Consider longer-context Orukeet changes if supported without large latency.
- Installer signing/distribution polish.
- Additional UI polish unrelated to meeting correctness.

## 15. Recent Checkpoints

- 2026-10-28: corrections, timestamp alignment, speaker confidence, stale-name protection, and delivery logging added/tested.
- 2026-10-29: Turbo full-meeting comparison completed and rejected as daily default.
- 2026-10-29: durable project-state reconstruction identified `fix/meeting-speaker-timestamps-20261028` as authoritative pushed baseline and confirmed isolated auto-cluster fix is not integrated.

## 16. Archive / Supporting Context

- Active handoff: `ACTIVE_CONTEXT.md`
- Decisions: `decisions/`
- Checkpoint history: `history/checkpoints-2026-10.md`
- Fork design docs: `docs/windows-selectable-output.md`, `docs/local-only-interface.md`, `docs/local-meeting-corrections.md`

## 17. 2026-10-29 - Auto speaker discovery patch (validation pending)

- New work branch: `fix/meeting-auto-speaker-discovery-20261029`, based on the authoritative Oct. 28 branch.
- Commits: `c0e30a83` changes final-meeting diarization; `1bf18822` updates expectation regression tests.
- Confirmed code change: native sherpa diarization is now called without forcing `numSpeakers`; count ceilings apply after native cluster discovery.
- Confirmed code change: an untouched default of 2, incomplete calendar roster, or provisional live speaker count no longer serves as a destructive final count; auto discovery caps at 7 remote/system voices or 8 mic-track voices (supported total maximum of 8).
- User explicit stepper count and stored `expected_speaker_count` remain hard ceilings; session explicit choice takes precedence over saved value.
- Added logging: `nativeAudioClusters`, `audioClusters`, `speakerCap`, `speakerCapSource`.
- Updated tests: `test/helpers/meetingSpeakerReconcile.test.js` now asserts explicit saved/session limits, default auto discovery, incomplete roster behavior, and mic mode.
- **Validation status:** patch and tests committed, but tests have not yet been executed in a Node/Electron environment; full real-recording validation remains required. Do not represent as proven fixed.
- Residual risk: `DiarizationManager.capSpeakerClusters` folds extra acoustic clusters into the largest kept cluster; this may still misattribute speech when native clustering over-splits. Revisit only after examining raw/final speaker counts on a known meeting.
- Preserve the old Oct. 28 branch as baseline until tests and real replay pass.

