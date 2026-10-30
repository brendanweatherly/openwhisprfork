# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - progress overlay implemented; re-diarization from retained audio prioritized over another manual replay
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
- Accepted Decision 0007 (retain mic/system audio and non-destructive re-diarization) remains **unimplemented**. Further outstanding items: global rename, clean installer, output devices besides AirPods, long-meeting technical ASR accuracy and normal daily-use performance.

## Current Hypothesis or Decision Point

- The revised confidence-or-unassigned algorithm may prevent some false attributions; the Windows test gate establishes code viability, **not real-world voice accuracy**.
- New overlay should reduce frozen-app uncertainty during long diarization; its stage order and note isolation have only unit-level evidence, so test real success, skip and failure before acceptance.
- Previous temp PCM is deleted on completion, so existing source audio cannot be used to reprocess notes; retaining/replaying audio (Decision 0007) is a critical follow-on. Do not silently store private recordings outside retention settings or add another mandatory manual replay loop.
- Deliberate exclusions remain: no automatic fallback from a user-selected device, no paid-feature entitlement claims, no uncalibrated native threshold changes, no customer vocabulary/public speech in GitHub.

## Next Action / Test

**Active work ID:** `OW-AUDIO-RERUN-20261030`
**Action:** [OW-AUDIO-RERUN-20261030] Implement recoverable note/session-scoped mic and system audio retention with non-destructive re-diarization, preserving privacy settings, transcript text and locked speaker names.

1. Design private note/session-owned source storage under the app's local data directory with appropriate filesystem permissions, lifetime/retention behavior and cleanup on note/account deletion. Preserve track timestamps, source identity and multiple resumed recording sessions; never publish raw recordings or vocabulary to GitHub.
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
- Existing temporary raw PCM is deleted after old recordings, so prior notes cannot be reprocessed unless their audio was independently saved. Do not claim recovery of files that were never retained.
- Decision 0007 is Accepted as a requirement; implementation remains pending. No GitHub Actions minutes and no sensitive meeting data in public source.

