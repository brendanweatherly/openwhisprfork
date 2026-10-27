const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = (file) => fs.readFileSync(path.join(__dirname, "../../", file), "utf8");
const loadConfig = () => import("../../src/config/localOnlyUi.ts");

test("local-only UI is enabled for this fork", async () => {
  const { LOCAL_ONLY_UI } = await loadConfig();
  assert.equal(LOCAL_ONLY_UI, true);
});

test("billing, account, and workspace settings are hidden; essential settings remain", async () => {
  const { isHiddenLocalOnlySettingsSection: hidden } = await loadConfig();
  for (const section of ["account", "plansBilling", "workspace"]) {
    assert.equal(hidden(section), true, section);
  }
  for (const section of ["general", "speechToText", "llms", "hotkeys", "privacyData", "system"]) {
    assert.equal(hidden(section), false, section);
  }
});

test("paid entry points respect the centralized flag", () => {
  for (const file of [
    "src/components/ControlPanel.tsx",
    "src/components/ControlPanelSidebar.tsx",
    "src/components/SettingsModal.tsx",
    "src/components/ProfileMenu.tsx",
    "src/components/IntegrationsView.tsx",
    "src/components/onboarding/SetupChoiceStep.tsx",
    "src/components/ui/SettingsSection.tsx",
  ]) {
    assert.match(source(file), /LOCAL_ONLY_UI/, file);
  }
});

test("local-only changes retain meeting output device selector", () => {
  assert.match(source("src/components/settings/MeetingSettings.tsx"), /Meeting audio output/);
  assert.match(source("src/stores/meetingRecordingStore.ts"), /selectedOutputDeviceId/);
});
