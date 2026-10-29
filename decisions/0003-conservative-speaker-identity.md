# Decision 0003 - Prefer conservative speaker identity over confident false labels

**Status:** Accepted
**Date:** 2026-10-29
**Decision owner:** Fork project
**Supersedes:** none
**Superseded by:** none

## Context

Real meeting tests produced false merges, phantom attendees, stale names, and provisional identities being treated too confidently.

## Decision

Speaker identity must follow these principles:

- Prefer unknown/provisional identity when confidence is weak.
- Do not destructively merge distinct voices on weak evidence.
- Clear stale live names before final diarization assigns clusters.
- Final offline acoustic evidence may replace provisional live labels.
- User-reviewed/locked speaker identity outranks automatic refinement.
- Do not restore stale live identities over final clusters.

## Rationale

A transcript with an unknown speaker can be reviewed. A transcript confidently attributing statements to the wrong person is actively misleading.

## Alternatives Considered

- Aggressive automatic naming/merging - rejected after real false assignments.
- Preserve all live labels through final refinement - rejected because live labels are provisional and can be wrong.

## Consequences

### Positive
- Lower risk of false attribution.
- Manual review starts from safer evidence.
- User corrections remain authoritative.

### Negative / Tradeoffs
- More speakers may initially appear unassigned.
- Requires a usable correction/rename workflow after final clustering.

## Evidence / Sources

- Oct. 28 commit series on `fix/meeting-speaker-timestamps-20261028`
- `src/helpers/speakerConfidencePolicy.cjs`
- `src/helpers/liveSpeakerIdentifier.js`
- Focused tests for stale names, user locks, timestamps, and speaker confidence.

## Reopen Only If

Real end-to-end validation shows conservative policy materially prevents correct stable identification without reducing false attribution.
