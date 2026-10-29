# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-29 - real replay failed speaker-attribution quality; progress-overlay requirement captured
**Current milestone:** Correct speaker-attribution defects exposed by the real Teams replay
**Active work ID:** `OW-SPK-QUALITY-20261029`
**Canonical next action:** Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-QUALITY-20261029] Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.

## Why This Is Next

The working branch launched and completed a genuine multi-voice recording replay. The automatic diarization avoided the old one-speaker collapse but **failed real speaker-attribution acceptance**: initial nine acoustic clusters were reduced to seven and the final transcript repeatedly gave the same label to different people while splitting the same person across multiple labels. The prior regression tests only exercised synthetic cases and did not expose this observed failure. Avoid guessing a new clustering threshold, upgrading ASR, or attempting to fix poor acoustic attribution solely by UI renaming.

## Latest Material Evidence

- The user-provided post-stop log reports `nativeAudioClusters=9`, `speakerCap=7`, `speakerCapSource=auto`, `audioClusters=7`, `diarizationTurns=36`, `transcriptSegments=35`, and `namedSegments=0`.
- Source inspection: `ipcHandlers.js` invokes `diarizationManager.capSpeakerClusters` on the meeting path even for `auto`; `diarization.js` keeps the seven longest-duration clusters and relabels **every extra** segment as the dominant/longest cluster. The upload/batch path already uses `capSpeakerClustersByVoice` with similarity-weighted remapping; these behaviors are not equivalent.
- Anonymous comparison of the approximately 4-minute overlapping transcript segment against the Teams speaker-labeled reference yields about **six** real voices, **seven** placeholder speaker IDs, and **21/35** segments assigned to one placeholder that belongs to multiple real people. Individual continuous turns also jump between several labels.
- Times align at an approximately +88-second source-video offset; no clear accumulating timestamp drift is evident at text resolution.
- `namedSegments=0` indicates no high-confidence automatic naming, not necessarily missing diarization; do not infer the speaker IDs are correct merely because there are seven.
- The current note transcript only shows a small `isDiarizing`/finalizing pill. The user explicitly requested a progress overlay. This accepted requirement and its acceptance checks are preserved in `decisions/0006-diarization-progress-visibility.md`.
- No actual confidential text, participant names, or customer terms were committed; this diagnostic summary is intentionally anonymous.

## Current Hypothesis or Decision Point

- Confirmed: duration-only automatic 9-to-7 folding can create destructive misattribution. Whether it accounts for all specific errors requires native cluster-to-final ID tracing.
- Likely additional cause: text chunks are assigned to a single speaker using overlap/nearest logic even when a speech chunk contains a turn change; real voices are also split into multiple native clusters.
- Decision 0005 remains **Proposed / failed real replay**; do not promote it or silently revise its original rule without tests and an explicit tradeoff.
- Progress-overlay requirement (Decision 0006) is **Accepted**, but implementation is **pending**, not completed.

## Next Action / Test

**Active work ID:** `OW-SPK-QUALITY-20261029`
**Action:** [OW-SPK-QUALITY-20261029] Add failing regression coverage for automatic cluster folding and transcript-to-speaker alignment before modifying the meeting diarization logic.

1. Add **generic, anonymous** regression fixtures for nine acoustic clusters auto-reduced to seven; the tests should demonstrate that the current policy collapses extra voices into the dominant one without acoustic similarity evidence.
2. Audit `diarization.js` `capSpeakerClusters`, `diarizationPolicy.js` voice-aware batch remapping, and `mergeWithTranscript` timestamp/overlap logic; distinguish native over-splitting from cap damage and transcript-chunk boundaries.
3. Add non-content diagnostic counts of native cluster durations, which native IDs are folded to which final ID, and the speaker overlap score for each transcript chunk. Never log or commit private speech, reference names, or meeting content.
4. Select a safe isolated patch only after those fixtures identify the mechanism; preserve user locks, note persistence, timestamps, selected Windows output and Orukeet corrections.
5. Re-run focused tests/typecheck/renderer build locally, then replay the same excerpt and compare stable labels. Separately implement the user-requested stage-aware, reliable progress overlay after acoustic correctness is addressed.

**Expected proof:** Controlled tests fail on the current destructive behavior and pass after a narrow, reviewable correction. The next real replay should show speaker IDs that remain stable per real voice without collapsing different voices.

## Regression Checks

- System output audio captured on known-good endpoint; no silent fallback to FxSound.
- No default/calendar/provisional count may silently force final acoustic identity collapse; respect genuine user-set limits without inventing confidence.
- Preserve distinct voices and stable speaker IDs across extended turns, interruptions, and brief backchannels.
- Attribute transcript chunks only where audio overlap supports it; do not propagate wrong provisional names.
- Preserve timestamp normalization and mic/system separation, user locks, source-audio retention, persisted note updates and summary/export correctness.
- Do not treat `namedSegments=0` as an invitation to force name guesses.
- New progress overlay must reflect real processing stages, elapsed time, completion/skip/failure, and survive editor navigation without an indefinite spinner or fake percentage.

## Immediate Branches

- Regression exposes duration-only cap folding as material -> trial voice-aware or non-destructive policy within supported speaker limits, carefully measuring false joins and performance before selecting a behavior.
- Distinct native speakers remain correctly separated but transcript text is mapped incorrectly -> fix timestamp/overlap/turn boundaries first instead of changing clustering threshold.
- Native clusters themselves fragment a single voice -> diagnose embedding threshold/model and voice grouping using real audio evidence; avoid tuning based only on the final label count.
- After the acoustic gate -> implement the requested progress overlay as a separate, stage-driven UI change.

## Blockers / Needed Inputs

- No new Windows/compiler blocker: the development app completed the test.
- Real failure evidence is present in the user's October 29 log and two uploaded comparison files in the chat. **The media/identity benchmark stays private; do not commit it to public GitHub.**
- Actual native-cluster-to-final mapping and word-level voice overlap were not exported; add harmless diagnostic instrumentation as needed.
- Progress overlay is a recorded requirement, not an implemented feature.

