# Decision 0001 - Keep the fork local-first without deleting upstream architecture

**Status:** Accepted
**Date:** 2026-10-29
**Decision owner:** Fork project
**Supersedes:** none
**Superseded by:** none

## Context

The fork is intended for reliable local-first meeting use, while OpenWhispr upstream contains subscription, cloud, team, and enterprise surfaces that are not needed for this workflow.

## Decision

Hide paid/subscription/cloud-service entry points through a local UI policy rather than deleting the underlying upstream implementation.

Preserve:
- local models
- meetings/dictation
- notes/import/export
- diarization
- AI cleanup/summaries
- BYOK provider support where available
- calendar/settings infrastructure
- upstream code structure needed for future merges

Do not imply that hiding a UI grants paid entitlements or guarantees offline processing.

## Rationale

This produces the desired local-first interface without turning the fork into a destructive rewrite that is difficult to merge or maintain.

## Alternatives Considered

- Delete all paid/cloud code - rejected because it damages mergeability and can remove useful shared infrastructure.
- Leave all paid UI visible - rejected because it creates clutter/confusion for the intended workflow.

## Consequences

### Positive
- Cleaner local-first experience.
- Better upstream mergeability.
- Underlying architecture remains available if requirements change.

### Negative / Tradeoffs
- UI hiding alone is not an offline/security boundary.
- Saved provider/model settings must still be verified when confidentiality matters.

## Evidence / Sources

- `docs/local-only-interface.md`
- `src/config/localOnlyUi.ts`

## Reopen Only If

The fork's product goal changes or upstream provides a cleaner supported local-only mode.
