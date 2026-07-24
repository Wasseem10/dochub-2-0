import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { priorityOneBrowserProjects, priorityOneScenarioCoverage, priorityOneToolCoverage } from "../config/priority-one-quality.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const testSources = new Map();
const priorityOneToolIds = priorityOneToolCoverage.map(({ toolId }) => toolId);
if (new Set(priorityOneToolIds).size !== priorityOneToolIds.length) problems.push("Priority 1 coverage contains duplicate tool IDs");

/** @param {string} relativePath */
async function sourceFor(relativePath) {
  if (!testSources.has(relativePath)) {
    const absolutePath = path.join(root, relativePath);
    await access(absolutePath).catch(() => problems.push(`Missing test file: ${relativePath}`));
    const source = await readFile(absolutePath, "utf8").catch(() => "");
    testSources.set(relativePath, source);
  }
  return testSources.get(relativePath);
}

for (const toolId of priorityOneToolIds) {
  const coverage = priorityOneToolCoverage.find((item) => item.toolId === toolId);
  if (!coverage) {
    problems.push(`No Priority 1 quality coverage is declared for ${toolId}`);
    continue;
  }
  const combinedSource = (await Promise.all(coverage.tests.map(sourceFor))).join("\n");
  for (const snippet of coverage.evidence) {
    if (!combinedSource.includes(snippet)) problems.push(`${toolId} is missing asserted evidence: ${snippet}`);
  }
}

for (const scenario of priorityOneScenarioCoverage) {
  const combinedSource = (await Promise.all(scenario.tests.map(sourceFor))).join("\n");
  for (const snippet of scenario.evidence) {
    if (!combinedSource.includes(snippet)) problems.push(`${scenario.scenario} scenario is missing asserted evidence: ${snippet}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: problems.length ? "failed" : process.argv.includes("--record-passed") ? "passed" : "coverage_ready",
  toolCount: priorityOneToolIds.length,
  tools: priorityOneToolCoverage.map(({ toolId, tests }) => ({ toolId, tests })),
  scenarios: priorityOneScenarioCoverage.map(({ scenario, tests }) => ({ scenario, tests })),
  browserProjects: priorityOneBrowserProjects,
  problems,
};

await mkdir(path.join(root, "test-results"), { recursive: true });
await writeFile(path.join(root, "test-results", "priority-one-quality.json"), `${JSON.stringify(report, null, 2)}\n`);

if (problems.length) {
  console.error(`Priority 1 quality audit failed with ${problems.length} problem(s):`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`Priority 1 quality coverage ready: ${report.toolCount} tools, ${report.scenarios.length} risk scenarios, ${report.browserProjects.length} browser classes.`);
  console.log("Report: test-results/priority-one-quality.json");
}
