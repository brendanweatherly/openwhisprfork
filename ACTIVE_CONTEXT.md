# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**CURRENT — 2026-11-09, verified and superseding earlier next-action descriptions:** A live long-duration meeting rerun exposed excessive native acoustic grouping, unnecessary speaker-number churn, and a large loss of existing speaker labels to Unknown. The separate retained mic and system PCM tracks were recovered locally; content remains private and was **not** committed. The mic track had unusually low signal relative to system audio; whether that indicates a muted mic, source selection issue, or actual capture fault remains **unverified**.

**Correction committed:** `05fb3c45345aa2284865a2ff728022ed0a42da1f` on `feat/meeting-audio-retention-20261106`. All diarization entrypoints now use the existing duration-aware threshold policy by default (long audio ramps to 0.70 instead of retaining short-audio default 0.55). The rerun conservatively reuses previous speaker IDs only with strong reciprocal transcript agreement, differentiates visible label changes from metadata changes, and **prevents applying** a preview that would discard a large proportion of previous assignments. Explicit user locks and transcript words remain protected. Synthetic regression tests cover ID agreement, ambiguous splits, and unsafe-preview rejection. Bounded GitHub Actions run [42715214868](https://github.com/brendanweatherly/openwhisprfork/actions/runs/42715214868) **PASS**: 302 total / 298 pass / 4 skipped / 0 fail, TypeScript check PASS, renderer build PASS, no uploaded artifacts. **NOT VERIFIED:** real speaker correctness, how many actual voices survive at threshold 0.70, low mic-source signal root cause, new Windows executable behavior. Do not claim live accuracy is fixed; earlier test build predates this commit.

**One current next action:** benchmark the corrected app against the **same retained recording** and compare stable speaker identity, unknown label share, distinct acoustic groups, and transcript preservation. If safe, package one short-lived unsigned isolated Windows test build; do not merge or replace existing installation yet. Inspect microphone acquisition separately if mic speech was expected. Preserve historic known-good branches and keep CI minutes/storage low.

**2026-11-06 rerun milestone — verified in GitHub:** On unmerged feature branch `feat/meeting-audio-retention-20261106`, the authorized **Re-run Speaker Identification** workflow now includes note/session PCM enumeration, adjustable counts, secure preview/apply, a compare-and-save/60-minute one-level undo, recording-session IDs on new transcript rows, preserved transcript words/other sessions/explicit locks, and a transcript-view UI. For over-cap uncertain acoustic groups, the rerun leaves labels unassigned rather than making unsupported duration-only merges. Older recordings without verifiable session provenance deliberately cannot be rerun. GitHub Actions bounded Linux run [42291125117](https://github.com/brendanweatherly/openwhisprfork/actions/runs/42291125117) **PASS**: 299 focused tests / 295 passed / 4 skipped / 0 failed, TypeScript check PASS, renderer build PASS. Artifact-free Windows filesystem smoke [42291399762](https://github.com/brendanweatherly/openwhisprfork/actions/runs/42291399762) **PASS**: 36 synthetic tests / 34 passed / 2 skipped (Windows symlink privilege cases) / 0 failed. Neither job produced upload artifacts, a release, a Windows installer, nor a real Teams test. **NOT VERIFIED:** actual WASAPI/selected output and split-channel capture in this branch, native Windows diarization accuracy, live permissions/restarts, global speaker rename, Windows clean installer. No private meeting data pushed to the public repository.

**Canonical next action (2026-11-06):** Windows end-to-end acceptance with one *new* recorded meeting using the feature branch: verify both archived tracks, open the meeting transcript's rerun control, change expected speaker count, preview/apply/undo, preserve text/locks/summary, remove all audio and verify retention. Only then conduct one same-audio speaker-accuracy benchmark; do not merge into main or mark Decision 0007 complete until those pass. Keep Actions bounded, avoid release/artifact builds, preserve historical known-good branches.

**2026-11-06 verified continuation checkpoint:** Implemented guarded dual-track local PCM retention integration on `feat/meeting-audio-retention-20261106` (not merged); the original speaker branch remains untouched. The bounded GitHub workflow run [42288786791](https://github.com/brendanweatherly/openwhisprfork/actions/runs/42288786791) **passed** 283/287 focused tests (4 skipped, 0 failures), TypeScript validation, and renderer build. React SSR import interop required a narrowly scoped test fix after the first workflow failed 3/287. No private audio or transcripts were committed. No large artifacts or full release/Windows installer build were generated. **Not verified:** real Windows recording, retention/privacy across actual account lifecycles, reboot/installer, real Teams speaker labels; post-meeting Re-run Speaker Identification remains unimplemented.

**Canonical next action (re-ranked 2026-11-06):** Implement the authorized re-run speaker-identification IPC/UI using retained note/session PCM with speaker-count controls, immutable transcript words and locked IDs/names, original state snapshots/undo, progress/error reporting, then run targeted synthetic tests. Windows/real Teams validation follows. Do not request repeated recordings to tune speaker counts.

**Last updated:** 2026-10-30 - stage overlay committed; 9/9 native Node filesystem archive tests pass; live retention still pending
**Current milestone:** Enable non-destructive speaker reprocessing from retained meeting audio
**Active work ID:** `OW-AUDIO-RERUN-20261030`
**Canonical next action:** Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-AUDIO-RERUN-20261030] Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.

## Why This Is Next

The original requirement is not just passing diarization tests: it is a dependable Windows recorder whose source audio can be recovered and reprocessed. The user already repeated several Teams recordings while the upstream voice labeling continued to fail. The **current stop pipeline deletes raw PCM in `_startOrSkipDiarization` finally** and can discard the mic capture as soon as system output is audible, so an existing note cannot be re-diarized with a changed count or improved model without re-recording. Decision 0007 explicitly accepts retaining separate mic/system tracks and non-destructive re-run. Implement this prerequisite before asking for another manual replay. The completed stage-overlay code (Decision 0006) remains unvalidated on Windows and must be included in the consolidated test gate after this work.

## Latest Material Evidence

- Original objective: reliable Windows local-first meeting recorder with selected AirPods output, separated system/mic capture, Orukeet with device-local corrections, stable timestamps, conservative speaker names/locks, summary/export, a visible progress overlay, and retained audio for later re-diarization.
- Known-good protected branch: `fix/meeting-speaker-timestamps-20261028`. Active development branch: `fix/meeting-auto-speaker-discovery-20261029`. Do not alter selected-output fallback policy or Orukeet architecture.
- Real Teams benchmark before recent speaker patches: 17 raw groups, 81 turns, seven final IDs, 13 centroids, ten remaps (four missing embeddings), 59 text windows (30 overlapping groups). Different real people shared final labels. Ground-truth speaker quality on newest code is unknown.
- Current candidate: total-overlap transcript attribution, mutual high-confidence native groups before cap, and unassigned unknowns for unsupported system-auto overflow. User-reviewed locks remain authoritative. Decision records 0005/0008/0009 are **Proposed**, not proven in real audio.
- Prior Windows speaker validation directly user-reported: 249 tests, **245 passed, four skipped, zero failed**, TypeScript and Vite renderer built successfully (nonblocking >500 kB chunk warning). This was **before** the new progress overlay commits.
- Accepted Decision 0006 now has code: main stage events `preparing`, `clustering`, `matching`, `saving`, terminal skipped/failed; preload/type bridge, module-scoped progress map keyed by note/session, success only after transcript persistence, note-editor overlay showing actual stages and elapsed time with no fabricated percent. Action overlays retain precedence; no unsafe native cancellation.
- New `meetingDiarizationProgress.test.js` has six cases; the exact GitHub TS reducer (type-only syntax removed) passed **6/6** in an isolated V8 test harness. Existing post-stop mock tests updated to filter progress vs completion; three new IPC stage tests and three renderer SSR tests committed but **not yet run in native Windows/React**.
- Added the two new progress test files to `npm run verify:meeting-speakers` (now 28 files). Current source files and decisions were fetched directly from the connected GitHub repo. No confidential audio/transcript data written to public GitHub.
- **Decision 0007 implementation foundation:** New `src/helpers/meetingAudioArchive.js` atomically copies already-closed PCM to a private note/session/source archive, records each track's 24 kHz mono sample format, capture start and size, avoids original deletion and prevents duplicate publication; same-note mic/system operations serialize and note-specific deletion helper exists. `test/helpers/meetingAudioArchive.test.js` contains nine synthetic OS filesystem tests. **9/9 passed in native Node v22.16.0 on Linux using exact GitHub source and test blobs, both confirmed byte-for-byte by matching Git blob SHA**. Added test to `npm run verify:meeting-speakers`, now **29 files**. This component is intentionally **NOT wired to live capture**: privacy/retention, current-note authorization, note/account deletion, Win32 filesystem semantics, audio re-diarization UI and undo remain unimplemented.
- Older temp PCM is still deleted post-diarization and mic capture is discarded as soon as system audio becomes audible. No previously lost audio has been restored. Further outstanding items: global rename, clean installer, non-AirPods routes, technical ASR accuracy and daily-use performance.

## Current Hypothesis or Decision Point

- The revised confidence-or-unassigned algorithm may prevent some false attributions; the Windows test gate establishes code viability, **not real-world voice accuracy**.
- New overlay should reduce frozen-app uncertainty during long diarization; its stage order and note isolation have only unit-level evidence, so test real success, skip and failure before acceptance.
- Previous temp PCM is deleted on completion, so existing source audio cannot be used to reprocess notes; retaining/replaying audio (Decision 0007) is a critical follow-on. Do not silently store private recordings outside retention settings or add another mandatory manual replay loop.
- Deliberate exclusions remain: no automatic fallback from a user-selected device, no paid-feature entitlement claims, no uncalibrated native threshold changes, no customer vocabulary/public speech in GitHub.

## Next Action / Test

**Active work ID:** `OW-AUDIO-RERUN-20261030`
**Action:** [OW-AUDIO-RERUN-20261030] Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.

1. **Foundation completed and native-tested:** private note/session/source PCM archive helper with timestamps, dual tracks, duplicate-write exclusion and note-specific deletion (9/9 exact-source Node/Linux tests). NEXT: integrate it with the **resolved** user-data-retention/audio-retention preferences, note ownership/tombstone checks and cleanup on note/account deletion before enabling persistent recording. Never publish private audio/vocabulary to GitHub.
2. Stop deleting/discarding the only available recorded mic/system data until an approved local archival copy has been secured. Preserve current selected AirPods output, mic/system routing, Orukeet ASR and post-stop audio conversion as independent known-good workflows.
3. Add a post-meeting `Re-run speaker identification` operation that reads only the authorized retained audio for its note, accepts an updated automatic/manual speaker-count policy, leaves raw transcript text, notes, corrections and summaries intact, and preserves or explicitly reconciles user locks. Add a previous-label restore/undo path and enforce request/session ownership.
4. Integrate genuine progress stages with the new overlay and cover success, skip, unavailable/missing audio, crash/restart, stale note, concurrent/resumed sessions and deletion/retention. Re-run full focused native tests, TypeScript and renderer build once this candidate is ready.
5. Then use a **single** matched Teams excerpt to assess actual speaker accuracy; all subsequent parameter comparisons should use the retained local source rather than repeated recording.

**Current evidence:** Previous 245/249 Windows tests passed on the speaker candidate. The new progress overlay is committed and six reducer checks passed in an isolated V8 harness, but updated Windows typecheck/UI/real recording are not verified. Source retention/re-diarization has **not** been implemented yet.

## Regression Checks

- Earlier Windows gate passed 245/249 tests with four skipped. New code must re-pass actual typecheck and renderer build; no silent regression to Orukeet transcription, AirPods endpoint selection, mic/system separation or speaker timestamps.
- Progress event delivery must never abort diarization; the failed/disabled/model-unavailable paths must preserve original transcript and report terminal status.
- Progress must be tied to both session and note; stale or cross-note events cannot overwrite a current job. Main must not claim saved state; only after renderer persistence may status become success.
- Existing `ActionProcessingOverlay` must keep precedence. Failed progress remains dismissible, success/skip auto-dismiss; no unimplemented Cancel button and no invented percentages.
- Speaker clusters, manual locks and exports retain the previously established conservative unknown-over-false-label policy. Audio retention/rerun is still missing, not silently assumed to work.
- The new source may require another Windows run; do not count previous 245 passing tests as validation of code committed afterward.

## Immediate Branches

- Local retention architecture preserves both tracks and respects user storage settings -> implement per-note rereun/undo and test with anonymous synthetic files.
- Deleting a note/account or disabling audio retention leaves orphaned private audio -> treat as release-blocking; add cleanup/migration tests.
- Resumed meeting sessions create colliding offsets/IDs -> preserve per-session manifests and original track anchors; never silently overwrite the note's transcript.
- New Windows typecheck/renderer or progress test fails -> repair before asking for another Teams audio replay.
- End-to-end re-diarization passes -> one original Teams excerpt can benchmark false joins/splits; keep speaker decisions Proposed until then.

## Blockers / Needed Inputs

- Connected GitHub source is writable and has been updated with the progress overlay; the previous Windows 245-pass gate predates these latest commits. The progress state logic passed six isolated source tests, while the actual renderer/main integration and UI remain unverified.
- The model cannot drive the user's Windows audio device from this chat. Source retention and reprocessing can be developed and tested with synthetic fixtures before requesting one real Teams validation.
- Existing temporary raw PCM is deleted after old recordings, so prior notes cannot be reprocessed unless their audio was independently saved. The new archive helper is **not active in live recordings** yet. Native Node v22 filesystem tests of its exact GitHub source passed 9/9 on Linux; no Windows archive or reprocessing proof yet.
- Decision 0007 is Accepted as a requirement; implementation remains pending. No GitHub Actions minutes and no sensitive meeting data in public source.

