const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const i18next = require("i18next");
const { initReactI18next } = require("react-i18next");
const { renderStatic } = require("../helpers/harness/reactSsr");

async function renderProgress(progress) {
  if (!i18next.isInitialized) {
    const en = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../src/locales/en/translation.json"), "utf8")
    );
    await i18next.use(initReactI18next).init({
      lng: "en", resources: { en: { translation: en } },
      interpolation: { escapeValue: false },
    });
  }
  const mod = await import("../../src/components/notes/MeetingDiarizationProgressOverlay.tsx");
  return renderStatic(mod.default, { progress, onDismiss: () => {} });
}

const example = {
  noteId: 12, sessionId: "diar-synthetic", stage: "matching",
  status: "running", startedAt: Date.now() - 5300, updatedAt: Date.now(),
};

test("active diarization overlay describes real ordered stages and elapsed time, not a percentage", async () => {
  const html = await renderProgress(example);
  assert.match(html, /Identifying speakers/);
  assert.match(html, /Preparing recorded audio/);
  assert.match(html, /Finding distinct voices/);
  assert.match(html, /Matching speakers to transcript/);
  assert.match(html, /Saving final speaker labels/);
  assert.match(html, /Elapsed time: \d+:\d\d/);
  assert.doesNotMatch(html, /\d+%/);
  assert.match(html, /data-testid="meeting-diarization-progress-overlay"/);
});

test("failed and skipped diarization are visibly distinct from success", async () => {
  const failed = await renderProgress({ ...example, status: "failed" });
  assert.match(failed, /Speaker identification could not finish/);
  assert.match(failed, /transcript is still available/);
  assert.match(failed, />Close</);
  const skipped = await renderProgress({ ...example, status: "skipped" });
  assert.match(skipped, /Speaker identification skipped/);
  assert.doesNotMatch(skipped, /Matching speakers to transcript/);
});

test("successful saving shows a terminal confirmation; no-progress note renders no overlay", async () => {
  const done = await renderProgress({ ...example, status: "success", stage: "saving" });
  assert.match(done, /Speaker identification complete/);
  assert.equal(await renderProgress(null), "");
});
