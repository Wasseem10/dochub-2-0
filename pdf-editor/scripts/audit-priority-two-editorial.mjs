import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import evidenceRecords from "../config/priority-two-evidence.mjs";
import { priorityOneBrowserProjects, priorityOneScenarioCoverage, priorityOneToolCoverage } from "../config/priority-one-quality.mjs";
import { EDITORIAL_RESOURCE_PAGES } from "../src/editorial/editorialResources.js";
import { EDITORIAL_RESOURCE_PATHS } from "../src/editorial/editorialRoutePaths.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "runtime-public");
/** @type {string[]} */
const failures = [];

/** @param {string} message */
function fail(message) {
  failures.push(message);
}

/** @param {Set<string>} left @param {Set<string>} right */
function equalSets(left, right) {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

/** @param {string} relativePath @param {string} [label] */
async function requireFile(relativePath, label = relativePath) {
  const absolutePath = path.join(publicRoot, relativePath.replace(/^\//, ""));
  try {
    const details = await stat(absolutePath);
    if (!details.isFile() || details.size === 0) fail(`${label} is missing or empty`);
    return absolutePath;
  } catch {
    fail(`${label} is missing`);
    return null;
  }
}

/** @param {string} relativePath @param {number} width @param {number} height */
async function requirePng(relativePath, width, height) {
  const absolutePath = await requireFile(relativePath);
  if (!absolutePath) return;
  const bytes = await readFile(absolutePath);
  const isPng = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPng) {
    fail(`${relativePath} is not a PNG`);
    return;
  }
  const actualWidth = bytes.readUInt32BE(16);
  const actualHeight = bytes.readUInt32BE(20);
  if (actualWidth !== width || actualHeight !== height) {
    fail(`${relativePath} is ${actualWidth}x${actualHeight}; expected ${width}x${height}`);
  }
}

const priorityOneIds = new Set(priorityOneToolCoverage.map(({ toolId }) => toolId));
const evidenceIds = new Set(evidenceRecords.map(({ toolId }) => toolId));
if (!equalSets(priorityOneIds, evidenceIds)) {
  fail("Priority 2 evidence must cover exactly the 21 Priority 1 tools");
}

const evidenceFields = /** @type {const} */ (["input", "output", "result", "method", "demoAlt"]);
for (const record of evidenceRecords) {
  for (const field of evidenceFields) {
    if (typeof record[field] !== "string" || record[field].trim().length < 24) {
      fail(`${record.toolId}.${field} must contain specific editorial evidence`);
    }
  }
  await requirePng(`/editorial/demos/${record.toolId}.png`, 1200, 675);
  await requirePng(`/share/${record.toolId}.png`, 1200, 630);
}

const resourcePaths = new Set(EDITORIAL_RESOURCE_PAGES.map(({ path: resourcePath }) => resourcePath));
if (!equalSets(resourcePaths, new Set(EDITORIAL_RESOURCE_PATHS))) {
  fail("Every editorial route must have exactly one complete resource record");
}

const uniqueEditorialFields = /** @type {const} */ (["title", "seoTitle", "metaDescription", "lede"]);
for (const key of uniqueEditorialFields) {
  const values = EDITORIAL_RESOURCE_PAGES.map((page) => page[key]);
  if (new Set(values).size !== values.length) fail(`Editorial ${key} values must be unique`);
}

for (const page of EDITORIAL_RESOURCE_PAGES) {
  if (!page.sections?.length || page.sections.length < 3) fail(`${page.path} needs at least three substantive sections`);
  if (!page.related?.length) fail(`${page.path} needs descriptive related links`);
  if (!page.reviewedIso || !page.owner) fail(`${page.path} needs a visible review date and owner`);
  const shareSlug = page.path.replace(/^\//, "").replaceAll("/", "-");
  await requirePng(`/share/${shareSlug}.png`, 1200, 630);
  const downloads = "downloads" in page ? page.downloads : undefined;
  for (const download of downloads || []) await requireFile(download[1], `${page.path} download ${download[0]}`);
}

const benchmarkPath = await requireFile("/research/benchmark/q3-2026-results.json");
if (benchmarkPath) {
  const benchmark = JSON.parse(await readFile(benchmarkPath, "utf8"));
  if (benchmark.status !== "passed" || benchmark.coreToolCount !== priorityOneIds.size) {
    fail("Benchmark summary does not match the released Priority 1 gate");
  }
  if (!equalSets(new Set(benchmark.tools.map(/** @param {{ toolId: string }} tool */ (tool) => tool.toolId)), priorityOneIds)) {
    fail("Benchmark tool results do not match Priority 1 coverage");
  }
  if (!equalSets(new Set(benchmark.riskScenarios), new Set(priorityOneScenarioCoverage.map(({ scenario }) => scenario)))) {
    fail("Benchmark risk scenarios do not match the regression gate");
  }
  if (!equalSets(new Set(benchmark.browserClasses), new Set(priorityOneBrowserProjects))) {
    fail("Benchmark browser classes do not match the regression gate");
  }
}

const proofPath = await requireFile("/research/redaction/redaction-proof.txt");
if (proofPath) {
  const proof = await readFile(proofPath, "utf8");
  if (!proof.includes("before=True") || !proof.includes("after=False")) {
    fail("Redaction proof must show the fictional secret before export and its absence afterward");
  }
}

for (const filename of [
  "small-business-invoice.docx",
  "candidate-evaluation-scorecard.docx",
  "property-inspection-checklist.docx",
  "mutual-nda-starter.docx",
  "education-support-request.docx",
]) {
  const templatePath = await requireFile(`/templates/editable/${filename}`);
  if (!templatePath) continue;
  const signature = (await readFile(templatePath)).subarray(0, 4).toString("hex");
  if (!signature.startsWith("504b0304")) fail(`${filename} is not a valid OOXML package`);
}

if (failures.length) {
  console.error("Priority 2 editorial audit failed:\n");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`Priority 2 editorial audit passed: ${evidenceRecords.length} evidence-backed tools, ${EDITORIAL_RESOURCE_PAGES.length} original resources, and all public downloads verified.`);
