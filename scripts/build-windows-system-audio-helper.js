#!/usr/bin/env node
/* Build the fork's modified Windows WASAPI helper.
 * Do not download upstream's helper: it cannot accept --device-id.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
if (process.platform !== "win32") {
  console.log("Skipping Windows audio helper compilation outside Windows.");
  process.exit(0);
}
const root = path.join(__dirname, "..");
const source = path.join(root, "resources", "windows-system-audio-helper.c");
const target = path.join(root, "resources", "bin", "windows-system-audio-helper.exe");
fs.mkdirSync(path.dirname(target), { recursive: true });
const attempts = [
  ["cl.exe", ["/nologo", "/O2", "/W3", source, "/Fe:" + target,
    "ole32.lib", "mmdevapi.lib", "uuid.lib", "propsys.lib"]],
  ["gcc.exe", ["-O2", "-std=c11", source, "-o", target,
    "-lole32", "-lmmdevapi", "-luuid", "-lpropsys"]],
];
for (const [command, args] of attempts) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status === 0 && fs.existsSync(target)) {
    console.log("Built modified audio helper:", target);
    process.exit(0);
  }
  console.warn(command, result.error?.message || result.stderr || result.stdout || "failed");
}
throw new Error("Modified audio helper could not be built. Install Visual Studio C++ Build Tools or MinGW-w64; upstream prebuilt helper does not support device selection.");
