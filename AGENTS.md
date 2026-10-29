# AGENTS.md

## Project objective

This fork is a local-first Windows meeting recorder derived from OpenWhispr. Correct end-to-end meeting behavior is more important than making an isolated test pass.

## Before material work

1. Read `PROJECT_STATE.md`.
2. Read `ACTIVE_CONTEXT.md`.
3. Read only the relevant records under `decisions/` and `history/`.
4. Confirm the active development branch and do not assume `main` contains the fork's current meeting work.
5. Preserve the workflow:
   capture -> retained audio -> transcription -> timestamp alignment -> corrections -> diarization -> speaker reconciliation -> review -> summary/export.

## Change discipline

- Do not let the newest error become the whole project.
- Separate confirmed facts, observations, hypotheses, and unknowns.
- Protect known-good AirPods capture, mic/system separation, selectable output, timestamp fixes, user locks, and device-local corrections.
- Prefer unknown/unassigned speaker state over a confident wrong identity.
- Do not use UI renaming to mask upstream diarization failure.
- Do not silently switch a user-selected Windows output endpoint.
- Never commit customer/company meeting vocabulary or real confidential transcript content.
- Significant architecture/workflow decisions belong in `decisions/`; supersede old decisions rather than rewriting history.
- After two failed attempts at the same issue, stop changing thresholds/logic and run a system-level checkpoint.

## Validation

Before calling a meeting-pipeline change complete:
- run the targeted relevant tests
- run typecheck and renderer build when the changed area warrants them
- verify critical known-good behavior did not regress
- for speaker/capture changes, perform a real or known-recording end-to-end validation
- update `PROJECT_STATE.md` and `ACTIVE_CONTEXT.md` after material evidence

Do not rely on GitHub Actions as the normal validation path for this fork.
