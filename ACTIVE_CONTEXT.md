# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29
**Current milestone:** Validate automatic speaker discovery, then known multi-participant replay
**Source of truth:** `PROJECT_STATE.md`
**Baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Completed in this continuation

- Inspected both the active Oct. 28 code and the isolated earlier `codex/raw-speaker-collapse-fix`.
- Identified two interacting risks: forced native `numSpeakers` and an inferred/default final cluster cap of one remote voice.
- Patched final meeting diarization to auto-discover native clusters first and only enforce explicit/saved user counts (or supported maximum) afterward.
- Added before/after cluster counts and cap-source diagnostics.
- Updated focused speaker-expectation tests for automatic discovery vs explicit limits.
- Code commit: `c0e30a83`; test commit: `1bf18822`.

## Verification status

**Code inspected and pushed. Unit tests, typecheck, renderer build, Windows run, and real Teams replay NOT executed.** Do not call the speaker issue resolved based on GitHub writes alone.

## Next action

1. On the working branch, execute `node --import tsx --test test/helpers/meetingSpeakerReconcile.test.js test/helpers/meetingDiarizationEpochTimestamps.test.js test/helpers/diarizationSpeakerMerge.test.js test/helpers/speakerCount.test.js test/helpers/diarizationPolicy.test.js`.
2. Run `npm run typecheck` and `npm run build:renderer` in a ready local dependency environment; ensure existing tests remain passing.
3. Replay the same known four-participant Teams recording. Compare the number of remote voices actually heard, `nativeAudioClusters`, `audioClusters`, named/unknown speaker assignments, and whether completion is delivered.
4. If multiple raw clusters survive but names are wrong, focus on alignment and live-to-final identity reconciliation, not clustering thresholds. If the raw result is a single cluster, investigate input audio and native acoustic model/threshold with isolated evidence.
5. Confirm user locks, note persistence, AirPods output, and local correction behavior are not regressed.
6. Only then merge or promote the working branch and update `PROJECT_STATE.md`.

## Unresolved

- The real recording and Windows execution results are not accessible to this branch's connector-side static inspection.
- Renaming speakers everywhere and reliable re-run diarization remain separately open.
- Audio-source retention and installer validation remain incomplete.
