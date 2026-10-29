# Decision 0005 - Final diarization uses native speaker discovery; only user-set counts limit it

**Status:** Proposed (implemented on the working branch; tests and real replay pending)
**Date:** 2026-10-29
**Decision owner:** OpenWhispr fork project (technical proposal; user approval not inferred)
**Supersedes:** Previous implicit behavior that allowed defaults, calendar rosters, and provisional live cluster counts to cap final results
**Superseded by:** none

## Context

The October 28 meeting fork could pass an inferred or default speaker count into native diarization and cap its output to one remote voice. In a real four-participant meeting, the final result collapsed to one cluster. A separate older branch's test fixture indicated that forcing native count could merge distinct voices before later reconciliation.

## Proposed decision

On the isolated branch `fix/meeting-auto-speaker-discovery-20261029`:
- Let native final meeting diarization discover speakers automatically first.
- Apply any speaker-count ceiling after acoustic discovery.
- Treat **explicit user-selected** or **persisted user-entered** speaker totals as hard ceilings, with the active explicit choice taking precedence over the saved value.
- Do **not** let untouched defaults, incomplete calendar rosters, or provisional live speaker labels destructively cap final speakers.
- Respect the supported maximum (7 remote/system speakers or 8 mic-track speakers).
- Log raw clusters, final clusters, cap, and cap source for reproducible diagnosis.

## Rationale

An inferred count is not strong enough evidence to discard genuine voices. Speaker identity should be grounded in the actual acoustic results, while genuine user decisions remain authoritative.

## Alternatives considered

- Force native speaker count from default/calendar/live guesses: rejected for this trial because it can erase distinct voices.
- Force native count from an explicit user selection: not used in the trial because cluster discovery should still occur before applying the user's ceiling.
- Remove all count limits: rejected because an explicitly chosen user count and supported maximum must still be honored.

## Tradeoffs and residual risk

- Auto-clustering may over-segment one person's voice.
- The current `capSpeakerClusters` routine can fold extra clusters into retained clusters; this remains a possible misattribution source.
- Focused code changes and committed tests are **not equivalent to passed tests or real-meeting proof**.

## Evidence / sources

- Working branch code commit `c0e30a83c7d73ebe5fd5f4ea0f21b18af5045fb4`.
- Working branch tests commit `1bf18822b319348485815acb58fd9f710bfab4d8` (committed, not yet executed at time of this decision).
- Prior isolated fix `codex/raw-speaker-collapse-fix` commit `6adfb77361c88dd8e0559fb9ce1d884e58d57050`.
- Prior real meeting reportedly collapsed four participants to one cluster.

## Acceptance gate

Promote this proposed decision to **Accepted** only after focused regression tests, typecheck/build, and a representative multi-speaker replay demonstrate correct behavior without regressing user locks, timestamps, identity persistence, corrections, or working audio paths.

## Reopen only if

Testing shows over-splitting, harmful cap folding, false identity, or a newer acoustic model/policy proves a better strategy.
