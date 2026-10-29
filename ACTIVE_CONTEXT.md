# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29
**Current milestone:** Stabilize final speaker diarization on the Oct. 28 baseline
**State source:** `PROJECT_STATE.md`
**Authoritative pushed branch:** `fix/meeting-speaker-timestamps-20261028` @ `26e7f9184a4a50b2f5239f4c8f1229c949175fd2`

## Current Target

Integrate the auto-cluster-before-cap final-diarization behavior into the Oct. 28 branch without losing its newer timestamp, confidence, corrections, selectable-output, or local-only work.

## Why This Is Next

The active branch still forces `numSpeakers` into native final diarization. A real four-participant test collapsed to one cluster, and a separate focused branch demonstrates why forcing native count can merge voices before later logic has a chance to recover them.

Manual speaker UI fixes should not be used to compensate for a bad upstream cluster result.

## Latest Material Evidence

- Active Oct. 28 branch is 72 commits ahead of `main`, 0 behind.
- Branch head: `26e7f9184a4a50b2f5239f4c8f1229c949175fd2`.
- Active `ipcHandlers.js` still calls final diarization with `numSpeakers > 0 ? { numSpeakers } : {}`.
- Isolated branch `codex/raw-speaker-collapse-fix` commit `6adfb77361c88dd8e0559fb9ce1d884e58d57050` changes this flow to automatic native clustering followed by a speaker-count cap and includes regression coverage.
- Oct. 28 timing/confidence/stale-name fixes are newer and must be preserved.
- Real AirPods system capture works; FxSound test path was effectively silent.
- Orukeet is the current practical local transcription baseline.
- Whisper Large V3 Turbo took ~45 minutes for a 37-minute recording and still reversed a material scope statement, so it is not the daily default.

## Current Hypothesis or Decision Point

**Leading hypothesis:** forcing native speaker count is still a primary contributor to remote-speaker collapse in final diarization.

**Decision point:** adapt the isolated automatic-clustering logic into the current branch rather than switching development to the older isolated branch.

## Next Action / Test

**Action:** review the current final-diarization block against `6adfb773...`, implement the minimal compatible change in the Oct. 28 branch, then run the focused diarization/timestamp/speaker-state tests.

**Expected proof:** the code no longer forces native cluster count in final meeting diarization; expected speaker count remains a post-clustering ceiling; existing timestamp/user-lock/stale-name protections still pass.

## Regression Checks

- Timestamp normalization/alignment tests
- Final diarization delivery test/logging
- User-locked speaker preservation
- No stale provisional name restoration
- Conservative live speaker confidence behavior
- Meeting corrections tests
- Mic/system source preservation
- Selectable Windows output behavior unaffected

## Immediate Branches

- **Positive ->** replay the known multi-participant Teams recording and verify distinct remote speakers plus final assignment stability.
- **Negative ->** inspect whether the newer Oct. 28 reconciliation code requires a different cap point or cluster-renumber strategy.
- **Inconclusive ->** capture raw diarization intervals and final merge output from the same recording before changing thresholds.

## Blockers / Needed Inputs

- None for code reconciliation/testing in the repository.
- A real/known Teams recording is required for the subsequent end-to-end validation step.
