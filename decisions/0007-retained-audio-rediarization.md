# Decision 0007 - Re-run speaker diarization from retained meeting audio

**Status:** Accepted user requirement; implementation and validation pending
**Date:** 2026-10-29
**Decision owner:** User (carried forward from the preceding OpenWhispr conversation)
**Supersedes:** No accepted decision; adds a required reprocessing workflow
**Superseded by:** None

## Context

Prior meeting tests produced inaccurate voice assignments and the user had forgotten to select the correct speaker count. The user requested the ability to adjust the speaker count and re-run diarization **after** the meeting. Earlier diagnostics established that conversion WAVs are temporary and deleted, while existing saved audio may not be complete or separately recoverable. Replaying or recording the entire meeting again is not an acceptable routine correction workflow.

## Accepted requirement

- Preserve original captured microphone and system audio tracks in recoverable local storage associated with their note/recording session. Do not assume a temporary diarization WAV suffices.
- Expose a post-meeting **Re-run speaker identification** operation that can use the retained audio and a revised speaker-count choice or automatic detection without repeating transcription or recording.
- Preserve original transcript text, user edits, device-local technical vocabulary corrections, manual speaker-name mappings and locks. Automatic reprocessing must not silently overwrite reviewed identity decisions or remove content.
- Provide a clear review/confirmation path before replacing a completed speaker-label version, plus an undo/restore route where technically feasible.
- Integrate with the user-requested diarization progress overlay (Decision 0006) so the rerun's stages and failure outcomes are visible.
- Never commit audio, customer speech, names or transcripts to the public GitHub repository.

## Architecture/validation implications

The post-stop code currently cleans its raw temporary PCM/WAV conversion files; verify the existing audio persistence format, source routing, and retention policy before implementing rerun. A newly reprocessed note must reconcile time offsets, continued recordings, manually assigned speaker locks, and separately recorded mic/system streams.

## Acceptance checks

1. Complete a meeting, change its speaker-count policy, and re-run diarization without rerecording or rerunning ASR.
2. The replay uses the original captured audio for the correct session and preserves every original transcript word, user correction, summary, and note.
3. Reviewed/locked speaker identities are preserved or explicitly presented for conflict resolution, never overwritten silently.
4. Failure/missing audio yields an actionable error without losing original results; progress is visible through all stages.
5. Stop/restart application and verify audio and reprocessing remain available according to retention settings.
6. Verify resumed note / multiple recording sessions do not misapply speaker IDs from other sessions.

## Priority

Unblocks repeated, evidence-based speaker-quality comparisons without tedious Teams audio playback. Implement after the current voice-cap and alignment root cause is isolated, or as an independent workflow on a separate branch that preserves the October 28 known-good baseline.

## Evidence

- Explicit user request and earlier meeting-test troubleshooting in the October 28-29 OpenWhispr chats; earlier conversion WAVs were temporary.
- Current fork project state and October 29 real Teams replay failure.
