# Decision 0008 - Conservative mutual voice grouping before the automatic speaker cap

**Status:** Proposed / implemented for validation (not real-audio accepted)
**Date:** 2026-10-30
**Decision owner:** OpenWhispr fork technical trial; user approval not inferred
**Extends:** Decision 0005 (native discovery and explicit-count policy)
**Supersedes:** None

## Context

The October 30 Teams benchmark produced 17 native acoustic clusters, although the overlapping excerpt contains far fewer known voices. The existing cap always retains the seven longest native groups and only considers merging *other* clusters into those seven. Two of the seven retained groups can therefore represent the same person yet never be compared for coalescence. The latest debug result also revealed four forced joins without voice evidence; those are separate and still unresolved.

## Proposed limited behavior

For **automatic**, non-user-specified meeting counts and **only when native clusters exceed the supported cap**, run a conservative candidate coalescence pass *before* the existing cap:

1. Consider all native groups with available speaker embeddings as competitors in the similarity ranking, including one-turn groups.
2. Only allow a group to participate in a merge if it contains at least two valid acoustic turns and an embedding.
3. Require each partner to choose the other as its **mutual nearest** eligible match, with score at least the already-used `LIVE_RECLUSTER_SIMILARITY = 0.93` and margin at least the already-used `BATCH_LABEL_MARGIN = 0.10` against its next closest group.
4. Never merge two groups with overlapping acoustic speech.
5. Apply **disjoint one-pass pairs only**. Keep the longer-duration native group's ID and preserve every transcript and acoustic turn; avoid transitive chains through uncertain centroids.
6. If these checks fail or any embedding is unavailable, do not pre-merge the groups. Preserve current saved/explicit user-count behavior unchanged.
7. Report pre-cap merges and post-grouping counts in the existing numeric-only speaker-cap log.

This pass does **not** force a speaker count or introduce a new numerical confidence threshold. It reuses existing project recognition thresholds that were already in the source, but their application to native-cluster centroids **still requires real recording validation**.

## Tradeoffs and unsolved issues

- A false positive remains possible even with a high cosine score and mutual ranking; acoustic voice models are not identity proof.
- Short genuine speakers and one-turn clusters will not coalesce, deliberately favoring missed merges over incorrect identity.
- Existing seven-speaker overflow capping **still can forcibly assign low-confidence or embedding-missing extra clusters** to another person's ID. This is a separate open correctness defect and must not be described as solved by this decision.
- Mixed-person ASR chunks still cannot be split word-by-word without finer timestamps. The total-overlap patch is a distinct candidate.
- Performance impact: one extra all-pairs comparison of at most the native-cluster centroids already extracted, not another ONNX model pass.
- No UI/lock/ASR/device-route changes are introduced in this trial.

## Evidence and validation

- Code: `src/helpers/conservativeSpeakerGrouping.js` (commits `0b2816f` and `7f6cc24`).
- Tests: `test/helpers/conservativeSpeakerGrouping.test.js` (commits `87e6329` and `af6fd38`).
- Integration: `src/helpers/ipcHandlers.js` commit `160aa0d`; automatic mode receives the pre-cap group pass and adds `confidentPreCapMergeCount`, `confidentPreCapMerges` and `clustersAfterPreCapMerges` audit fields.
- Eight standalone Node.js synthetic tests passed on October 30, checking positive high-confidence pairs, weak/ambiguous matches, overlapping speech, no embeddings, single-turn veto, non-finite scores and one-pass behavior. The local harness reproduced this helper with the policy's exact threshold constants; **not** the full app regression suite.
- The Windows test suite, typecheck/build and real Teams speaker-attribution benchmark **have not been rerun since these commits**.

## Acceptance gate

Keep **Proposed** until updated focused tests pass and a controlled comparison with the same meeting shows fewer false splits **without** introducing wrong joins, preserving all manual speaker locks, timestamp corrections, text, source separation and audio capture. A count of seven is not proof of seven distinct people.

## Follow-up dependency

Introduce a trustworthy treatment of unmergeable or embedding-missing overflow groups rather than blindly assigning them to the dominant voice. Any new unassigned/uncertain state requires renderer, persistence, export and manual review regression checks. Do not tune arbitrary new thresholds without matched voice evidence.
