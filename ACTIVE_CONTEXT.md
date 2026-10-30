# ACTIVE CONTEXT - OpenWhispr Fork / Meeting Recorder

**Last updated:** 2026-10-30 - real voice-aware replay failed identity benchmark; diagnostics committed
**Current milestone:** Diagnose native speaker fragmentation and transcript alignment after the October 30 replay
**Active work ID:** `OW-SPK-DIAG-20261030`
**Canonical next action:** Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.
**State source:** `PROJECT_STATE.md`
**Preserved baseline:** `fix/meeting-speaker-timestamps-20261028`
**Working branch:** `fix/meeting-auto-speaker-discovery-20261029`

## Current Target

[OW-SPK-DIAG-20261030] Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.

## Why This Is Next

The first failure was a duration-only automatic seven-speaker cap. The second test did invoke the voice-similarity remapping path, but paired transcripts still show the same real speaker split across labels and different people merged under a shared label. `nativeAudioClusters=14` across approximately five actual voices suggests source diarization fragmentation; `embeddingCoverage=11` and individual remap details were not sufficient to know which clusters merged on measured voice similarity versus fallback. `mergeWithTranscript` uses the highest single acoustic-turn overlap for an entire text chunk, so chunk boundaries may also be material. It would be premature to retune thresholds or automatically force five voices without diagnostics.

## Latest Material Evidence

- October 30 replay (user log): `capStrategy=voice-similarity`, `speakerCapSource=auto`, `nativeAudioClusters=14`, `speakerCap=7`, `capEmbeddingCoverage=11`, `capRemapCount=7`, `audioClusters=7`, `diarizationTurns=39`, `transcriptSegments=43`, `namedSegments=0`. The global duration-only cap fallback did not run, but overflow groups missing centroids still can fold blindly.
- Private reference comparison: about five real voices in the overlapping 4-minute excerpt; seven app labels, with both split same-person assignments and reused labels across people. No participant names, meeting audio, or transcript words committed to GitHub.
- New source review: `capSpeakerClustersByVoice` keeps the seven longest-duration native groups and maps surplus groups to the closest *available* centroid; no minimum match similarity, so a wrong join remains possible. `mergeWithTranscript` uses the single largest overlapping acoustic turn, not an aggregated per-speaker vote or word-level speaker boundaries.
- Commits `88abab3` (pure numeric-only native/acoustic/overlap diagnostic helper), `7bc8cba` (four anonymous synthetic unit tests), `f6c2904` (wired logs into the meeting path). Four mirrored standalone tests passed locally using Node 22; full Windows app suite and diagnostic logging **not yet executed**.
- Earlier code `8bab551` and nine-to-seven regression `d95a7ec` were tested by the user, and the user confirms `npm run typecheck` and `npm run build:renderer` ran before this October 30 replay. New diagnostics do not intentionally change speaker assignment.
- Proposed decision 0005 remains unaccepted following the second failed real benchmark. Overlay (Decision 0006) and retain-audio/re-diarize (Decision 0007) remain user-accepted, not implemented.

## Current Hypothesis or Decision Point

- Observed: many raw acoustic clusters for five distinct real voices; direct source attribution not yet possible from the 14-to-7 count alone.
- Risk: three native groups lacked centroids; some of the seven remaps may have been duration fallback even with `capStrategy=voice-similarity`.
- Risk: a 5-second ASR chunk can include multiple speakers; the current strongest-single-overlap method cannot split its text and may choose the wrong voice. Quantify multi-cluster overlap before changing this policy.
- Decision: preserve the Oct. 28 baseline, Orukeet and voice-profile locks. **Do not change model thresholds, automatic cap, or text alignment algorithm until one numeric-only diagnostic pass differentiates causes.**

## Next Action / Test

**Active work ID:** `OW-SPK-DIAG-20261030`
**Action:** [OW-SPK-DIAG-20261030] Validate the new speaker diagnostics on Windows, then capture one same-excerpt replay to isolate native fragmentation from transcript alignment.

1. Download a **fresh ZIP** of `fix/meeting-auto-speaker-discovery-20261029` containing `f6c2904`, `88abab3`, `7bc8cba`; the last extracted ZIP predates these logging additions.
2. In the ZIP's directory containing `package.json`, install dependencies with `npm ci` (only for the new extraction). Run the new pure test `node --test test/helpers/meetingDiarizationDiagnostics.test.js`; then rerun the previously passing five-file focused suite and `npm run typecheck`, `npm run build:renderer`. Keep GitHub Actions disabled; no repeated tests are needed on the old ZIP.
3. Launch with x64 Native Tools Command Prompt: `set OPENWHISPR_CHANNEL=development`; `set OPENWHISPR_LOG_LEVEL=debug`; `npm start`.
4. Once ready, start a **fresh meeting note** without manually changing count, and play the same previously assessed 4–5-minute Teams section through the known-good AirPods output. Do not use the MP4 import path. Stop and let diarization finish; no code has changed the speaker labels yet, so this is **diagnostic**, not a promised quality improvement.
5. Share **only** these new, non-content log entries: `Post-meeting native speaker cluster audit`, `Post-meeting speaker cap audit` (including `missingEmbeddingClusters` and `capRemapDiagnostics`), `Post-meeting transcript-to-speaker overlap audit`, and `Post-meeting diarization result delivered`. This should allow a defensible clustering-vs-alignment plan without publishing participant details.

**Expected proof:** New diagnostic tests pass, logs show which clusters are tiny/fragmented, whether remaps were supported by measured cosine similarity, and how many text chunks span more than one final acoustic speaker. These measurements are not proof of accurate voice identities.

## Regression Checks

- Numeric-only logs must not contain transcript words, meeting participants, audio, device-local technical vocabulary or saved speaker profiles.
- Diagnostics must not alter speaker labels, count policy, transcript words, timestamp normalization, mic/system track separation, reviewed identity locks, persistence, or Orukeet corrections.
- Auto native discovery remains `numSpeakers=-1`; current max is still seven remote clusters. A seven-cluster output is not an accuracy measure.
- Missing centroids must be explicit in diagnostics; a `voice-similarity` strategy flag does not guarantee every individual remap was based on embeddings.
- Keep the same source excerpt for future comparisons; compare actual voice identities, not raw cluster count alone.
- Preserve accepted but unimplemented stage-aware overlay and retained-source re-diarization requirements.

## Immediate Branches

- Diagnostics show many tiny raw clusters from the same voice -> assess evidence-driven native threshold or speaker embedding agglomeration, testing against quiet real speakers.
- Remap similarities are low or unavailable -> address blind nearest/longest folding before accepting automatic seven-speaker cap.
- Final acoustic clusters stable but many text chunks span multiple voices -> target transcript-to-diarization overlap attribution, with anonymous regression tests and an explicit uncertain-speaker path.
- Live mic/system problems arise -> keep known-good AirPods output separate from unrelated input-device resolver failures.
- Once real speaker IDs stabilize -> implement progress overlay and retained-audio re-diarization to avoid repeated playback tests.

## Blockers / Needed Inputs

- New code committed via GitHub directly; no GitHub Actions minutes used. Four mirrored pure-helper Node checks passed locally, but no complete current Windows suite or real replay has run since the diagnostic commits.
- The public repo intentionally contains only synthetic fixtures and numeric-only logging code. Original Teams transcript/audio stay private.
- Retained-audio reprocessing is not yet implemented, so a fresh recorded playback is currently necessary to collect new diagnostic-stage data.

