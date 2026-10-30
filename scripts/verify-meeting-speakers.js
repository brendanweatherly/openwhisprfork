#!/usr/bin/env node
"use strict";

/**
 * Offline/local validation of the meeting-speaker branch.
 *
 * This deliberately does NOT launch Electron, download diarization models,
 * publish audio, or use GitHub Actions. Run after npm ci in a fresh checkout:
 *   npm run verify:meeting-speakers
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tests = [
  "test/helpers/conservativeSpeakerGrouping.test.js",
  "test/helpers/diarizationPolicy.test.js",
  "test/helpers/diarizationSpeakerMerge.test.js",
  "test/helpers/meetingSpeakerReconcile.test.js",
  "test/helpers/meetingDiarizationDiagnostics.test.js",
  "test/helpers/meetingDiarizationEpochTimestamps.test.js",
  "test/helpers/meetingDiarizationInput.test.js",
  "test/helpers/speakerAssignmentPolicy.test.js",
  "test/helpers/speakerConfidencePolicy.test.js",
  "test/helpers/speakerCount.test.js",
  "test/helpers/speakerEmbeddingsClusterCentroids.test.js",
  "test/helpers/speakerEmbeddingsLifecycle.test.js",
  "test/helpers/speakerIndexBase.test.js",
  "test/helpers/speakerIdentificationTimeline.test.js",
  "test/helpers/speakerMerge.test.js",
  "test/helpers/liveSpeakerIdPolicy.test.js",
  "test/helpers/meetingTranscriptPersistence.test.js",
  "test/helpers/transcriptFormatter.test.js",
  "test/helpers/transcriptRetention.test.js",
  "test/helpers/meetingCorrections.test.js",
  "test/utils/transcriptSpeakerStateBatch.test.js",
  "test/utils/diarizationCompletion.test.js",
  "test/utils/segmentSpeakerName.test.js",
  "test/utils/transcriptSelfSide.test.js",
  "test/components/meetingTranscriptChat.test.js",
  "test/components/meetingTranscriptSpeakerPicker.test.js",
];

const missing = tests.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Meeting-speaker validation cannot start; missing test files:");
  missing.forEach((file) => console.error("  " + file));
  process.exit(1);
}
if (!fs.existsSync(path.join(root, "node_modules", "tsx"))) {
  console.error("Dependencies are not installed in this checkout. First run: npm ci");
  process.exit(1);
}

const environment = { ...process.env, OPENWHISPR_LOG_LEVEL: "info" };
const stages = [
  {
    label: "Focused speaker, transcript, persistence and export regressions",
    command: process.execPath,
    args: ["--import", "tsx", "--test", "--test-concurrency=2", ...tests],
  },
  { label: "TypeScript check", npmScript: "typecheck" },
  { label: "Renderer build", npmScript: "build:renderer" },
];

for (let i = 0; i < stages.length; i += 1) {
  const stage = stages[i];
  console.log("\n" + "=".repeat(66));
  console.log("Meeting speaker validation " + (i + 1) + "/" + stages.length + ": " + stage.label);
  console.log("=".repeat(66));
  const windowsNpm = Boolean(stage.npmScript && process.platform === "win32");
  const executable = windowsNpm
    ? (process.env.ComSpec || "cmd.exe")
    : stage.npmScript
      ? "npm"
      : stage.command;
  const args = windowsNpm
    ? ["/d", "/s", "/c", "npm run " + stage.npmScript]
    : stage.npmScript
      ? ["run", stage.npmScript]
      : stage.args;
  const result = spawnSync(executable, args, {
    cwd: root,
    env: environment,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    console.error("\nFAILED at stage " + (i + 1) + "/" + stages.length + ": " + stage.label);
    if (result.error) console.error(result.error.message);
    console.error("Do not run a new Teams replay until this stage is fixed.");
    process.exit(result.status && result.status > 0 ? result.status : 1);
  }
}

console.log("\nPASS: All three stages completed on this checkout.");
console.log("Real speaker identity accuracy still requires a separate same-audio benchmark.");
