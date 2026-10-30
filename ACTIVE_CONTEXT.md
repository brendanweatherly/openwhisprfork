# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - unknown-speaker pipeline reviewed and manual-name rendering fixed; test/build validation next
**Current milestone:** Validate the confidence-or-unassigned speaker pipeline across capture, notes and review UI
**Active work ID:** `OW-SPK-UNKNOWN-VALIDATE-20261030`
**Canonical next action:** Run focused speaker, transcript UI, persistence and export regressions plus TypeScript and renderer build on the updated branch.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-UNKNOWN-VALIDATE-20261030] Run focused speaker, transcript UI, persistence and export regressions plus TypeScript and renderer build on the updated branch.

## Why This Is Next

The latest real Teams diagnostic established that weak and missing-embedding groups were being forcibly assigned to existing people. The working branch now contains a complete **automatic system-audio confidence-or-unassigned** pipeline: weak/missing groups become an internal unknown acoustic sentinel, then an unassigned transcript row, without fabricated numeric identity; locked edits win. Review of the recently committed UI found a remaining real problem: a user who manually named an unknown row saved the name but the transcript displayed no name chip because the row had no numeric speaker ID. That was corrected, and renderer/interaction/end-to-end no-embedding regression fixtures were added. The next meaningful gate is running those exact tests and the Windows app build, not asking for another Teams replay on unverified code.

## Latest Material Evidence

- Three Teams replay comparisons before the new unknown-handling code failed speaker-accuracy acceptance. Latest diagnostic: 17 native clusters, 13 embeddings, 10 remaps, four without matching evidence, 59 transcript chunks, 30 overlapping final acoustic groups. Those results motivated conservative unknown over unsupported identity.
- Existing source on the working branch now has `capMeetingSpeakersWithUnknown` and `UNASSIGNED_ACOUSTIC_SPEAKER` in `diarizationPolicy.js`; main IPC uses it **only when countSource=auto and diarizedSource=system** with overflow. Weak/missing/overlapping candidates remain unknown. Explicit or saved user-set counts and mic-mode retain prior policy.
- `diarization.js` converts the sentinel to a row with `speaker:undefined`, `speakerStatus:"unassigned"`, and stale live names cleared. `speakerAssignmentPolicy.js` preserves user locks. `transcriptSpeakerState.ts` serializes the state and prevents stale IDs/names from being restored during delayed note merges.
- `MeetingTranscriptChat.tsx` displays Unknown Speaker for unreviewed rows; the existing NoteEditor selection bar allows manually naming a chosen line. `transcriptFormatter.js` keeps unknown labels in TXT/SRT/Markdown, JSON reports unassigned count separately and excludes them from speaker count.
- **New review fixes this turn:** `cfaae2f8` displays a manually named unknown row even though the cluster ID remains absent. `a94bea2d` assigns independently keyed speaker colors to those manually identified remote voices. Tests `5d9c215`, `9ec6a49`, `53a8e88` exercise rendering, re-selection and colors; `fa61fd5` protects end-to-end nine-native-cluster auto results when voice embeddings are unavailable.
- Proposed Decision 0009 records the confidence-or-unassigned persistence and review behavior; Decisions 0005 and 0008 remain proposed, and 0006 (progress overlay) plus 0007 (retain and re-diarize) remain accepted **but not implemented**.
- These latest GitHub files and fixtures were read/written directly. **No full Windows focused test suite, typecheck, renderer build, or new Teams accuracy replay has run since this latest code.** The isolated previous pure grouping check (8/8) predates this unknown-handling implementation.

## Current Hypothesis or Decision Point

- Unknown-over-wrong is the accepted product safety principle (Decision 0003). This particular automatic system-overflow implementation is **proposed for validation**, not an accepted real-world speaker policy.
- The strict mutual pre-cap similarity pass may produce zero merges, and the seven retained acoustic IDs can still include duplicate real people. The new unknown fallback can reduce false assignments for overflow but does not solve native over-fragmentation or mixed-speaker ASR chunks.
- Additional manual speaker-name workflow review confirmed an actual gap and patched it without inventing speaker numbers. The speakerless/locked state survives exports by design, but needs actual renderer and persistence test execution.
- Do not alter native thresholds, force five speakers, replace Orukeet or reopen known-good timestamps/AirPods capture without contrary real evidence.

## Next Action / Test

**Active work ID:** `OW-SPK-UNKNOWN-VALIDATE-20261030`
**Action:** [OW-SPK-UNKNOWN-VALIDATE-20261030] Run focused speaker, transcript UI, persistence and export regressions plus TypeScript and renderer build on the updated branch.

Use a refreshed Windows source checkout from branch `fix/meeting-auto-speaker-discovery-20261029` containing `fa61fd5`, `a94bea2`, `53a8e88`, and Decision 0009. In **x64 Native Tools Command Prompt** in the folder containing `package.json`, install dependencies once with `npm ci` only if it is a new extraction. Then execute:

```cmd
set OPENWHISPR_LOG_LEVEL=info
node --import tsx --test test/helpers/conservativeSpeakerGrouping.test.js test/helpers/diarizationPolicy.test.js test/helpers/diarizationSpeakerMerge.test.js test/helpers/meetingSpeakerReconcile.test.js test/helpers/meetingDiarizationEpochTimestamps.test.js test/helpers/transcriptFormatter.test.js test/utils/transcriptSpeakerStateBatch.test.js test/utils/diarizationCompletion.test.js test/components/meetingTranscriptChat.test.js test/components/meetingTranscriptSpeakerPicker.test.js
npm run typecheck
npm run build:renderer
```

If an assertion fails, inspect and repair the source/test against its actual behavior rather than weakening speaker-lock/timestamp protections. The `npm start` app launcher requires the renderer build in each new extraction; do **not** ask for another Teams playback until this code gate is green. If green, replay the **same** reference excerpt once using AirPods system output and log `capStrategy`, `unassignedNativeClusters`, `unassignedTranscriptSegments`, `confidentPreCapMergeCount`, `audioClusters`, and actual human speaker errors.

**Proof:** Code tests/typecheck/build pass on the latest checkout and, eventually, real attribution improves without losing transcript words or user locks. No Github Actions minutes should be spent.

## Regression Checks

- Existing fallback for user-selected/saved speaker totals stays unchanged; auto-system unknown handling must not fabricate numbered speaker IDs or overwrite named/locked rows.
- Anonymous nine-cluster native-to-transcript test protects preservation of each word and conservative unknown status when embeddings are absent.
- Renderer SSR and DOM tests cover unknown label, manually locked speakerless name visibility, re-selection and distinct color; note merges must not resurrect an older live name or speaker id.
- Export tests must continue counting identified people independently of unknown lines and show manually assigned names correctly across TXT, SRT, Markdown and JSON.
- Preserve October 28 timestamp fixes, mic/system separation, Windows AirPods output, Orukeet corrections and profile reconciliation.
- Remaining work includes speaker accuracy acceptance, progress overlay (0006), retained-source re-diarization (0007) and global rename everywhere; nothing in this patch proves them resolved.

## Immediate Branches

- Windows tests/typecheck/renderer pass -> compare same Teams excerpt once and inspect whether weak groups become unknown instead of falsely being named; assess actual voice accuracy rather than only number of labels.
- Test fails in UI/serialization -> patch the exact transition with a regression; do not change acoustic thresholds as a workaround.
- Unknown fallback causes excessive manual review -> evaluate confidence evidence and identity grouping while preserving Decision 0003's conservative policy, without assuming same-speaker cosine thresholds are calibrated.
- New mic-mode/in-person false matches -> keep that as a distinct validated policy change; the current path is system-auto only.

## Blockers / Needed Inputs

- Source and tests are committed and read-back verified on GitHub, but **not** executed in a full checkout here. Container GitHub DNS resolution is unavailable; do not claim green Windows tests or app behavior.
- No more user's audio/transcript input is needed before running the focused Windows code checks. GitHub Actions is not used.
- The current public repository has only anonymous synthetic tests/numeric diagnostics. Private Teams source files, participant identities and customer vocabulary remain off GitHub.

