# Checkpoints - 2026-10

## 2026-10-28 - Windows capture / local meeting workflow baseline
**What changed:** Selectable Windows output, local-only UI behavior, device-local Orukeet corrections, timestamp normalization, speaker-confidence policy, stale-name cleanup, and final-diarization delivery logging were developed on the fork.
**Still true:** AirPods system capture works in the tested path; FxSound was effectively silent. Orukeet runs locally. Corrections work only after decode.
**Implication:** Capture is no longer the only blocker; correctness now depends heavily on transcription timing and speaker reconciliation.
**Priority now:** Validate the full speaker pipeline on a real meeting rather than continue isolated UI polish.

## 2026-10-28 - Speaker assignment remained poor in live meeting
**What changed:** A real meeting still produced bad speaker assignment and too many/incorrect attendee identities; manual mapping was abandoned.
**Still true:** Focused tests around corrections and speaker logic passed.
**Implication:** Passing unit tests did not prove end-to-end speaker correctness.
**Priority now:** Strengthen timestamps/confidence/final diarization and require real-meeting validation.

## 2026-10-29 - Full Whisper Large V3 Turbo comparison
**What changed:** The same 37-minute Teams video completed in about 45 minutes. Turbo improved several technical terms but still made material errors, including reversing a scope statement.
**Still true:** Better word recognition alone is insufficient if latency is impractical or meaning is changed.
**Implication:** Turbo is not the daily default.
**Priority now:** Keep Orukeet as the practical baseline while evaluating future ASR changes only against speed + semantic accuracy together.

## 2026-10-29 - Durable-state reconstruction
**What changed:** The active pushed branch was identified as `fix/meeting-speaker-timestamps-20261028`, 72 commits ahead of main and 0 behind before project-context commits. The branch includes the Oct. 28 capture/UI/corrections/timestamp/speaker work.
**Still true:** The active branch still forces native `numSpeakers` during final meeting diarization.
**New evidence:** Separate branch `codex/raw-speaker-collapse-fix` commit `6adfb77361c88dd8e0559fb9ce1d884e58d57050` contains a focused auto-cluster-before-cap fix and regression coverage, but it is based on an older line and is not integrated into the Oct. 28 branch.
**Implication:** The four-participant one-cluster failure remains open in the authoritative baseline.
**Priority now:** Reconcile the automatic clustering behavior into the Oct. 28 branch, then run focused regressions and a known-recording/live meeting validation.
