import { access, copyFile, mkdir } from "node:fs/promises";

const requiredFiles = ["worker/index.js", ".openai/hosting.json"];

await Promise.all(requiredFiles.map((file) => access(file)));

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await copyFile("worker/index.js", "dist/server/index.js");
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
try {
  await access("dist/404.html");
} catch {
  await copyFile("dist/index.html", "dist/404.html");
}
