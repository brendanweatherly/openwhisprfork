# Windows selectable meeting output (experimental)

This fork adds **Meeting Settings → Meeting audio output** on Windows. Choose
the same speaker/headset endpoint used by Microsoft Teams, or keep
**Automatic** for the original OpenWhispr behavior.

- The list of output devices comes from the Windows native WASAPI helper.
- Choosing a device captures that output's shared-mode mix directly, while the
  existing microphone track, transcription, notes, and diarization remain intact.
- The choice takes effect when a *new* meeting recording starts.
- If the selected device is unavailable or cannot start, meeting startup reports
  a failure rather than silently switching to a different output.
- **Automatic** keeps the upstream process-loopback and Chromium fallback.

## Windows build

This fork must compile its **modified** `windows-system-audio-helper.exe`.
The upstream downloadable helper does **not** support `--device-id`.

Install Visual Studio C++ Build Tools (including the Windows SDK), or MinGW-w64,
then run `npm install` and `npm run build:win`. The `prebuild:win` step
compiles the audio helper automatically. A failed native helper build is a
blocking error, not an acceptable fallback.

## Validation checklist (required before release)

1. Select the exact headset shown as **Speaker** in Teams.
2. Start a new meeting recording while another participant speaks. Verify the
   system transcript contains their speech with your microphone muted.
3. Speak locally. Verify mic and remote participants remain separate sources.
4. Verify 24 kHz output, continuous transcript timestamps, and no duplicates.
5. Run a new recording with **Automatic** selected to confirm original behavior.
6. Unplug the selected headset and verify startup warns/fails rather than silently
   switching to the wrong speaker.
7. Test Bluetooth headset switching, USB dock, Teams audio route changes,
   device silence and resumed playback, plus Windows sleep/resume.
8. Build/install from scratch on Windows; confirm the installed helper is the
   compiled fork version, not the upstream download.
9. Run `npm run test`, `npm run typecheck`, and `npm run lint`.

**Status:** Code committed to an isolated feature branch. Windows build and
actual headset/Teams capture have **not** been validated yet. Do not rely on it
for a live meeting until the checks above pass.
