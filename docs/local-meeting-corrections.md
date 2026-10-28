# Local meeting transcription corrections

This optional feature runs **after** a local Orukeet transcription chunk is decoded. It does not train
or alter the model and does not touch the Windows audio helper, captured audio, or other speech engines.

## Usage

1. Open **Dictionary > Meeting corrections** in the desktop app.
2. Paste literal rules, one per line, using 'heard phrase => intended spelling'.
3. Rules save automatically in the current computer's app preferences. They take effect on the
   **next** local Orukeet meeting recording; existing transcripts are not changed.

Example (generic fictional terms):

    onyx controller => OnyxController
    network two => Network 2

Use only **unambiguous** phrases. Do not map ordinary words like "mission" to a
product name; every such occurrence would be changed, including legitimate ones.

Blank lines and lines starting with '#' are ignored. The first 150 valid rules
are accepted, with a maximum of 16,000 characters of source text and 90 characters
per phrase. Replacements use literal whole-phrase matching (not regular expressions),
case-insensitively; longest phrases match first, and the replacements do not cascade.

These rules are kept in **device-local** 'localStorage' instead of the existing
cloud-syncable Dictionary. Only the correction text is passed via Electron IPC to
the local meeting transcription process. Do not commit meeting-derived vocabulary
or customer-specific rules to public source control.

## Verify before installation

Run targeted unit tests without invoking GitHub Actions:

    node --test test/helpers/meetingCorrections.test.js

Also run project-wide typecheck, lint and renderer build. On Windows, test a real
30-60 minute meeting using the configured microphone and output device, and
confirm that both speakers, the transcript and AI summary remain correct.

The existing Dictionary still helps on transcription paths that accept prompt hints.
The local Orukeet model currently has no hotword/prompt interface in this fork,
so this feature intentionally corrects only explicit mishearings **after** decoding.
