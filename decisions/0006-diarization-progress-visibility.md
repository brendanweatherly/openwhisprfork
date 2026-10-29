# Decision 0006 - Visible diarization progress after meeting stop

**Status:** Accepted requirement; implementation pending
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

The requirement is accepted because the user directly requested it. The exact UI appearance and event wiring remain to be designed and implemented, with stage events ideally driven by the actual post-stop pipeline and reflected in the central meeting recording store. This record does **not** claim an overlay exists today.

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
- Existing `NoteEditor.tsx` tracks `isDiarizing`, and `MeetingTranscriptChat.tsx` renders a small "finalizing" pill; no equivalent diarization overlay or detailed stage progress was found in the inspected code.
