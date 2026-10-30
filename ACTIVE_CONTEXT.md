# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - expanded pure tests to 81/81; one-command native Windows validation committed
**Current milestone:** Validate the confidence-or-unassigned speaker pipeline across capture, notes and review UI
**Active work ID:** `OW-SPK-UNKNOWN-VALIDATE-20261030`
**Canonical next action:** Run the one-command native Windows gate (`npm run verify:meeting-speakers`) on the refreshed branch, then correct any actual failures before a real recording benchmark.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-UNKNOWN-VALIDATE-20261030] Run the one-command native Windows gate (`npm run verify:meeting-speakers`) on the refreshed branch, then correct any actual failures before a real recording benchmark.

## Why This Is Next

The latest real Teams diagnostic established that weak and missing-embedding groups were being forcibly assigned to existing people. The working branch now contains a complete **automatic system-audio confidence-or-unassigned** pipeline: weak/missing groups become an internal unknown acoustic sentinel, then an unassigned transcript row, without fabricated numeric identity; locked edits win. Review of the recently committed UI found a remaining real problem: a user who manually named an unknown row saved the name but the transcript displayed no name chip because the row had no numeric speaker ID. That was corrected, and renderer/interaction/end-to-end no-embedding regression fixtures were added. The next meaningful gate is running those exact tests and the Windows app build, not asking for another Teams replay on unverified code.

## Latest Material Evidence

- Three Teams replay comparisons before the new unknown-handling code failed speaker-accuracy acceptance. Latest diagnostic: 17 native clusters, 13 embeddings, 10 remaps, four without matching evidence, 59 transcript chunks, 30 overlapping final acoustic groups. Those results motivated conservative unknown over unsupported identity.
- Existing source on the working branch now has `capMeetingSpeakersWithUnknown` and `UNASSIGNED_ACOUSTIC_SPEAKER` in `diarizationPolicy.js`; main IPC uses it **only when countSource=auto and diarizedSource=system** with overflow. Weak/missing/overlapping candidates remain unknown. Explicit or saved user-set counts and mic-mode retain prior policy.
- `diarization.js` converts the sentinel to a row with `speaker:undefined`, `speakerStatus:"unassigned"`, and stale live names cleared. `speakerAssignmentPolicy.js` preserves user locks. `transcriptSpeakerState.ts` serializes the state and prevents stale IDs/names from being restored during delayed note merges.
- `MeetingTranscriptChat.tsx` displays Unknown Speaker for unreviewed rows; the existing NoteEditor selection bar allows manually naming a chosen line. `transcriptFormatter.js` keeps unknown labels in TXT/SRT/Markdown, JSON reports unassigned count separately and excludes them from speaker count.
- **New review fixes this turn:** `cfaae2f8` displays a manually named unknown row even though the cluster ID remains absent. `a94bea2d` assigns independently keyed speaker colors to those manually identified remote voices. Tests `5d9c215`, `9ec6a49`, `53a8e88` exercise rendering, re-selection and colors; `fa61fd5` protects end-to-end nine-native-cluster auto results when voice embeddings are unavailable.
- Proposed Decision 0009 records the confidence-or-unassigned persistence and review behavior; Decisions 0005 and 0008 remain proposed, and 0006 (progress overlay) plus 0007 (retain and re-diarize) remain accepted **but not implemented**.
- **October 30 expanded source-level execution:** GitHub connector fetched nine real JavaScript test modules and their production sources (speaker grouping 8, diarization policy 37, diagnostics 5, speaker assignment 6, meeting corrections 7, confidence 5, index base 5, diarization input 5, speaker count 3); **81/81 executed and passed** in an isolated V8 CommonJS/assert shim. This **does not** establish native Node/Electron/React/TypeScript or Windows results.
- **New Windows verification path:** `scripts/verify-meeting-speakers.js` commit `60a56bf`, package command `verify:meeting-speakers` commit `9f4a074`, stages: 26 focused `node --import tsx --test` files (bounded concurrency=2), `npm run typecheck`, `npm run build:renderer`. Actual file paths all verified in GitHub. Script syntax and simulated Linux/Windows success, failure and missing-dependency branches all passed. **No native Windows execution yet**; GitHub connector reads/writes work, container DNS for `github.com` still fails.

## Current Hypothesis or Decision Point

- Unknown-over-wrong is the accepted product safety principle (Decision 0003). This particular automatic system-overflow implementation is **proposed for validation**, not an accepted real-world speaker policy.
- The strict mutual pre-cap similarity pass may produce zero merges, and the seven retained acoustic IDs can still include duplicate real people. The new unknown fallback can reduce false assignments for overflow but does not solve native over-fragmentation or mixed-speaker ASR chunks.
- Additional manual speaker-name workflow review confirmed an actual gap and patched it without inventing speaker numbers. The speakerless/locked state survives exports by design, but needs actual renderer and persistence test execution.
- Do not alter native thresholds, force five speakers, replace Orukeet or reopen known-good timestamps/AirPods capture without contrary real evidence.

## Next Action / Test

**Active work ID:** `OW-SPK-UNKNOWN-VALIDATE-20261030`
**Action:** [OW-SPK-UNKNOWN-VALIDATE-20261030] Run the one-command native Windows gate (`npm run verify:meeting-speakers`) on the refreshed branch, then correct any actual failures before a real recording benchmark.

1. Download the **latest** ZIP for `fix/meeting-auto-speaker-discovery-20261029` into a fresh folder (the previous October 30 extracted ZIP predates the newer code), then open the folder containing `package.json` in **x64 Native Tools Command Prompt for VS**.
2. If fresh, install dependencies once with `npm ci`. This also restores `tsx` and React test dependencies. Do not run `npm start` or re-record Teams yet.
3. Run just **one command**:

```cmd
npm run verify:meeting-speakers
```

4. The script runs 26 native Node/tsx regression files (speaker/locked/unknown, backend diarization, UI, note merge, exports), then the real `npm run typecheck` and `npm run build:renderer`; it stops and exits nonzero on the first failing stage, showing the original error. No GitHub Actions or paid cloud minutes needed.
5. If all stages pass, run the same original Teams excerpt once to judge actual speaker identity and `unassignedNativeClusters`; no further manual audio replay before the build gate.

**Validation achieved here:** 81/81 actual GitHub source/test bodies passed under a limited V8 shim; the command-orchestration logic and all referenced test paths passed source/mock checks. **Full native app build and real speaker accuracy remain unverified** until step 3 and subsequent controlled replay.
## Regression Checks

- Existing fallback for user-selected/saved speaker totals stays unchanged; auto-system unknown handling must not fabricate numbered speaker IDs or overwrite named/locked rows.
- Anonymous nine-cluster native-to-transcript test protects preservation of each word and conservative unknown status when embeddings are absent.
- Native validation command includes actual renderer SSR and DOM tests for unknown/locked labels, re-selection and distinct colors, plus note merge/export tests; these have **not yet executed in native Node** and may reveal errors that need correcting.
- Export tests must continue counting identified people independently of unknown lines and show manually assigned names correctly across TXT, SRT, Markdown and JSON.
- Preserve October 28 timestamp fixes, mic/system separation, Windows AirPods output, Orukeet corrections and profile reconciliation.
- Remaining work includes speaker accuracy acceptance, progress overlay (0006), retained-source re-diarization (0007) and global rename everywhere; nothing in this patch proves them resolved.

## Immediate Branches

- Windows tests/typecheck/renderer pass -> compare same Teams excerpt once and inspect whether weak groups become unknown instead of falsely being named; assess actual voice accuracy rather than only number of labels.
- Test fails in UI/serialization -> patch the exact transition with a regression; do not change acoustic thresholds as a workaround.
- Unknown fallback causes excessive manual review -> evaluate confidence evidence and identity grouping while preserving Decision 0003's conservative policy, without assuming same-speaker cosine thresholds are calibrated.
- New mic-mode/in-person false matches -> keep that as a distinct validated policy change; the current path is system-auto only.

## Blockers / Needed Inputs

- Source and tests are committed and read-back verified on GitHub. **81/81 pure-JS GitHub source tests** passed in isolated V8, and the one-command native verification launcher passed static/mock control tests. Container GitHub DNS remains unavailable for a full npm checkout; **native Windows test, TS check, renderer build and actual recorded speaker accuracy are still unverified**.
- No more user's audio/transcript input is needed before running the focused Windows code checks. GitHub Actions is not used.
- The current public repository has only anonymous synthetic tests/numeric diagnostics. Private Teams source files, participant identities and customer vocabulary remain off GitHub.

