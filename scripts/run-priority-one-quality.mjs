import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightCli = path.join(root, "node_modules", "playwright", "cli.js");
const groups = [
  [
    "tests/browser/core-tool-reliability.spec.mjs",
    "tests/browser/editor-existing-text.spec.mjs",
    "tests/browser/editor-large-document.spec.mjs",
    "tests/browser/editor-recovery-and-history.spec.mjs",
    "--project=desktop-chromium",
    "--workers=1",
  ],
  [
    "tests/browser/pdf-comparison.spec.mjs",
    "tests/browser/priority-one-image-conversion.spec.mjs",
    "tests/browser/priority-one-recovery.spec.mjs",
    "tests/browser/protection-and-scanning.spec.mjs",
    "--project=desktop-chromium",
    "--workers=1",
  ],
  ["tests/browser/structured-converters.spec.mjs", "--project=desktop-chromium", "--workers=1"],
  ["tests/browser/to-pdf-and-ocr.spec.mjs", "--project=desktop-chromium", "--workers=1"],
  ["tests/browser/editor-recovery-and-history.spec.mjs", "--project=android-chromium", "--project=iphone-webkit"],
];

for (const args of groups) {
  const result = spawnSync(process.execPath, [playwrightCli, "test", ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
