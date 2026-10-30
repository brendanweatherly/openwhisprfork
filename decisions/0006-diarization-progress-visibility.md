# Decision 0006 - Visible diarization progress after meeting stop

**Status:** Accepted requirement; implementation committed, Windows/live validation pending
**Date:** 2026-10-29
**Decision owner:** User request
**Supersedes:** No prior explicit progress-overlay requirement
**Superseded by:** none

## Context

After stopping a meeting recording, final diarization can take noticeable time without clear progress. The existing transcript UI contains a small "finalizing" spinner/pill, but not a prominent progress overlay or meaningful stage feedback. The user explicitly requested a visible overlay showing what the application is doing while diarization runs.

## Requirement

- Show a clear, readable progress **overlay** promptly after recording stops and final speaker diarization is running.
- Communicate meaningful, **real** stages, e.g. preparing captured audio, finding voice clusters, matching speakers to transcript, and saving results. If a stage cannot report measured percentage, use an indeterminate indicator with elapsed time, not an invented percent.
- Make progress perceivable and responsive throughout a long diarization run; do not make the application appear frozen.
- Progress is tied to the meeting/session, so changing notes or remounting the editor does not silently erase job status.
- Provide explicit completion, skipped/unavailable, and failure states, then dismiss/clear properly. Preserve raw transcript and audio if diarization fails.
- Do not introduce a Cancel action unless it can safely stop the native child process and leave the note intact.
- Preserve existing processing overlays for other note actions and avoid regression to live capture or transcription.

## Status / implementation notes

The requirement is accepted because the user directly requested it. An initial implementation now emits stage events from real post-stop pipeline boundaries, stores them by note/session outside the editor, and displays an elapsed-time overlay. It remains **unverified in an actual Windows meeting**. Never equate committed code with a successful live overlay.

## Acceptance checks

1. Stop a recording with diarization enabled: overlay appears and updates as stages advance.
2. During a long run, elapsed time/indeterminate progress remains visible and the app responds to navigation.
3. On successful completion, overlay clears and final transcript persists.
4. On missing model, disabled diarization, or native error, no endless spinner or false success; raw transcript remains accessible.
5. Reopen/switch notes while processing: current job feedback is not lost or misapplied to another note.
6. No deceptive progress percentages.

## Priority / dependency

Implement after the upstream speaker-attribution defects exposed by the October 29 real replay are diagnosed or in an isolated independent UI change. This is a visible usability requirement, not a reason to weaken acoustic correctness.

## Evidence

- Direct user request on 2026-10-29 for an overlay showing diarization progress.
- The previous UI tracked `isDiarizing` and rendered only a small finalizing pill. The new note-scoped overlay and IPC stage events are implemented on `fix/meeting-auto-speaker-discovery-20261029`; live validation remains pending.

## Implementation checkpoint - 2026-10-30

- Main `ipcHandlers.js` emits `meeting-diarization-progress` with note/session ID at real preparing, clustering, matching and saving boundaries. Early skips and errors become explicit terminal statuses; progress notifications are non-blocking if renderer delivery fails.
- `preload.js` and `src/types/electron.ts` expose the event. `meetingRecordingStore.ts` retains per-session stages independent of NoteEditor mount and marks success only after the final transcript is persisted. Failure cannot be overwritten by a delayed success.
- `MeetingDiarizationProgressOverlay.tsx` renders stages, elapsed time and terminal states, never a fabricated percent or unsafe Cancel button. It yields to an already-running note action overlay. English labels added to the locale bundle.
- New deterministic reducer tests cover stage monotonicity, note isolation, stale events and terminal states; actual GitHub reducer/test source passed **6/6** in an isolated JS harness after type-only TS syntax was removed. Existing mock-IPC tests were updated to distinguish progress from completion events; additional main-path and renderer SSR tests were committed but **not yet executed in native Node/React/Windows**.
- User must rerun `npm run verify:meeting-speakers` after fetching these latest changes and confirm overlay stages on one real Teams excerpt. Previous 245/249 Windows test report predates this feature.

**Not implemented by this record:** retained-audio re-diarization (Decision 0007), stable real speaker identity (proposed Decisions 0005/0008/0009), native cancellation, or progress after full process restart.
