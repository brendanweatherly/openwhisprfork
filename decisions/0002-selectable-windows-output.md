# Decision 0002 - Support explicit Windows meeting output selection

**Status:** Accepted
**Date:** 2026-10-29
**Decision owner:** Fork project
**Supersedes:** none
**Superseded by:** none

## Context

Meeting system-audio capture on Windows can depend on the actual output device being used by Teams. Automatic capture paths were not sufficient for the required reliability.

## Decision

Expose a Windows **Meeting audio output** selector.

- **Automatic** preserves upstream process-loopback/Chromium fallback behavior.
- An explicitly selected output uses the modified WASAPI helper to capture that endpoint's shared-mode mix.
- If an explicit device is unavailable or cannot start, fail/warn rather than silently switching to another output.

## Rationale

The user needs deterministic control over which headset/speaker is captured. Silent fallback to a different device creates apparently successful recordings with missing remote audio.

## Alternatives Considered

- Automatic-only capture - rejected because device routing has already produced silent/wrong-path behavior.
- Silent fallback from an explicit device - rejected because it hides data loss.

## Consequences

### Positive
- Deterministic routing.
- Easier diagnostics.
- Preserves upstream behavior when Automatic is selected.

### Negative / Tradeoffs
- Fork must build its modified native Windows helper.
- Device switching and installer packaging require dedicated validation.

## Evidence / Sources

- `docs/windows-selectable-output.md`
- Live AirPods capture test succeeded; FxSound test path was effectively silent.

## Reopen Only If

A more reliable Windows capture mechanism makes explicit endpoint selection unnecessary.
