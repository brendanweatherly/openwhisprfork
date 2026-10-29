# Decision 0004 - Keep local meeting corrections as explicit post-decode Orukeet substitutions

**Status:** Accepted current behavior
**Date:** 2026-10-29
**Decision owner:** Fork project
**Supersedes:** none
**Superseded by:** none

## Context

Orukeet is the current practical local meeting transcription baseline, but recurring technical terms are sometimes misrecognized. The local Orukeet path in this fork does not expose a reliable hotword/prompt interface.

## Decision

Support device-local literal meeting correction rules after Orukeet decodes a chunk.

- Rules are explicit `heard phrase => intended spelling`.
- Use whole-phrase, case-insensitive literal matching.
- Longest phrases match first.
- Rules do not cascade.
- Keep rules device-local and out of source control.
- Do not present this as model training or hotword prompting.

## Rationale

This safely fixes known recurring mishearings without pretending to improve the model's raw recognition ability.

## Alternatives Considered

- Commit customer/project vocabulary into the repository - rejected for confidentiality and portability.
- Broad ambiguous substitutions - rejected because they can corrupt correct speech.
- Treat corrections as a complete ASR-quality solution - rejected because semantic recognition errors remain possible.

## Consequences

### Positive
- Useful for stable names/acronyms/product terms.
- No cloud synchronization of meeting-derived vocabulary.
- Easy to test deterministically.

### Negative / Tradeoffs
- Cannot repair unknown errors before decoding.
- Cannot safely fix ambiguous ordinary-language misrecognitions.
- Only applies to the scoped local Orukeet meeting path.

## Evidence / Sources

- `docs/local-meeting-corrections.md`
- `test/helpers/meetingCorrections.test.js`
- User live test observed the correction path working.

## Reopen Only If

Orukeet gains a reliable vocabulary/hotword interface, or the default local ASR path changes.
