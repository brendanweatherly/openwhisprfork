# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - progress overlay committed; previous Windows suite passed, updated tests and real audio pending
**Current milestone:** Validate end-to-end Teams speaker accuracy and the new progress overlay
**Active work ID:** `OW-REAL-PROGRESS-20261030`
**Canonical next action:** Run the updated Windows verification and one matched Teams excerpt, checking truthful progress stages and actual speaker identities.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-REAL-PROGRESS-20261030] Run the updated Windows verification and one matched Teams excerpt, checking truthful progress stages and actual speaker identities.

## Why This Is Next

The user confirmed that the prior native Windows speaker gate passed (249 tests, 245 passed, 4 skipped, zero failed; TypeScript and renderer build passed). The original daily-use goal is nevertheless not achieved until distinct real speakers are correctly identified and reviewable. The previous three real Teams trials failed identity accuracy and predate the new conservative voice grouping/unassigned changes. A newly accepted stage-aware progress overlay is now committed, driven by real main-process boundaries, so the **next meaningful gate is one updated Windows test run plus one matched real-audio benchmark**. Do not replace the proof with more speculative threshold tuning or repeated isolated-source tests. Retained source-audio re-diarization is the next major implementation dependency once accuracy evidence is available.

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

**Active work ID:** `OW-REAL-PROGRESS-20261030`
**Action:** [OW-REAL-PROGRESS-20261030] Run the updated Windows verification and one matched Teams excerpt, checking truthful progress stages and actual speaker identities.

1. Obtain the **updated** working branch code on the Windows laptop (earlier extracted ZIP predates this progress feature). Run `npm ci` only in a fresh extraction where dependencies are absent. Run `npm run verify:meeting-speakers` in the folder containing `package.json`; this runs the previous 26 suites **plus two new progress suites**, typecheck and renderer build without GitHub Actions.
2. If green, launch with `npm start` and make **one** same-excerpt Teams recording using the known-good AirPods Pro output and Orukeet, automatic diarization enabled. Verify the note-scoped overlay shows preparing / clustering / matching / saving with increasing elapsed time and ends after saved transcript, without fake percentages.
3. Compare the actual resultant speaker labels and Unknown Speaker rows against the previously provided private Teams reference; capture anonymized `Post-meeting...` audit metrics and private new transcript once. If native process fails, check failure/skip state and transcript preservation.
4. Keep proposed speaker decisions provisional until real labels are more accurate. Only after this evidence, prioritize Decision 0007 source-audio retention/re-diarization and the rest of the complete application acceptance gates.

**Validated now:** Source implementations committed and six isolated reducer checks passed. **Not yet verified:** Updated native Windows 28-suite gate, React UI, real progress events, new speaker-accuracy benchmark.

## Regression Checks

- Earlier Windows gate passed 245/249 tests with four skipped. New code must re-pass actual typecheck and renderer build; no silent regression to Orukeet transcription, AirPods endpoint selection, mic/system separation or speaker timestamps.
- Progress event delivery must never abort diarization; the failed/disabled/model-unavailable paths must preserve original transcript and report terminal status.
- Progress must be tied to both session and note; stale or cross-note events cannot overwrite a current job. Main must not claim saved state; only after renderer persistence may status become success.
- Existing `ActionProcessingOverlay` must keep precedence. Failed progress remains dismissible, success/skip auto-dismiss; no unimplemented Cancel button and no invented percentages.
- Speaker clusters, manual locks and exports retain the previously established conservative unknown-over-false-label policy. Audio retention/rerun is still missing, not silently assumed to work.
- The new source may require another Windows run; do not count previous 245 passing tests as validation of code committed afterward.

## Immediate Branches

- Updated Windows suite/build passes -> run one real Teams benchmark and evaluate speaker accuracy and progress UI together.
- Native test/typecheck fails -> fix the exact regression, keeping capture/transcription/locked speakers intact; do not bypass the gate.
- Overlay freezes or shows success before save -> trace note/session events and main/store serialization; update focused tests.
- Real speaker identity still fails -> use the private reference to fix a measured upstream clustering/alignment issue, not arbitrary voice-count or similarity thresholds.
- Real speaker identity improves -> move into retained-audio and non-destructive post-meeting re-diarization, then wider installed-app/end-to-end reliability testing.

## Blockers / Needed Inputs

- This environment can read/update GitHub source but cannot execute Electron/Windows audio or run the actual Teams recording; real benchmark remains dependent on one Windows replay using the user's existing reference file.
- Updated native Windows tests/renderer build are unexecuted after new progress changes; six isolated reducer tests passed. Earlier prior-build Windows run: 245 passed, four skipped, no failures.
- User has already supplied the Teams reference in previous conversation context; do not request it again. Do not write private transcripts, names or recordings to GitHub.
- GitHub Actions minutes are not needed. The current project state uses existing legacy paired records, not a new duplicate project checkpoint.

