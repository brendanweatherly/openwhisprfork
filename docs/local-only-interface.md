# Local-Only Interface (fork)

This fork uses `src/config/localOnlyUi.ts` to hide OpenWhispr subscription
advertising and paid-service entry points without deleting their underlying
implementation or claiming access to premium cloud infrastructure.

## Hidden by default

- Upgrade pop-ups, usage-limit sales messages and past-due billing banners
- Account avatar/referral navigation, Plans & Billing, workspace management
- Paid connector integrations, OpenWhispr API/MCP/CLI account controls
- OpenWhispr-hosted and enterprise AI model mode selectors
- OpenWhispr-hosted cloud setup cards and sign-in nudge
- Paid account registration as an onboarding requirement; setup offers
  **Continue locally** without an account

## Preserved

- Dictation and **Meeting** recording, including the separate Windows
  output-device selector from the parent feature branch
- Local models, diarization, AI cleanup, summaries, notes, import/export
- User-configured provider API keys (BYOK), where supported
- Calendar connection interface, app settings, local model downloads
- Existing underlying billing, subscription and cloud implementation, so
  the upstream architecture remains intact for future merges

**Important:** UI-only hiding does NOT remove network integrations, enforce
offline processing, grant paid entitlements, or retroactively change saved
model settings. Verify that each transcription and AI-processing scope is set
to **Local** before using the app for confidential meetings. Updating the
`LOCAL_ONLY_UI` flag to `false` restores the hidden interface.

## Validation

- Run `npm run test`, `npm run typecheck`, `npm run lint`,
  and `npm run format:check` on a development workstation.
- Fresh-install and existing-profile checks for Settings, onboarding,
  paid-feature deep links, notes, transcription, and meetings.
- Verify the **Meeting audio output** setting from the parent branch is
  still visible and works on the selected Windows output device.

**Status:** The code is committed; full app tests and an end-to-end Windows
installer test have not been run in this environment.
