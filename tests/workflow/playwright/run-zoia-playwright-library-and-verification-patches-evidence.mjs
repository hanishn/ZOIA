#!/usr/bin/env node
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "products", "zoia", "index.html");
const LIBRARY_MANIFEST_PATH = resolve(PROJECT_ROOT, "tests/workflow", "patch-library-cache", "zoia-patch-library-manifest.json");
const VERIFICATION_MANIFEST_PATH = resolve(PROJECT_ROOT, "tests", "parser-harness", "fixtures", "manifests", "zoia-fixture-manifest.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow", "evidence", "q095-library-and-verification-patch-baseline");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const COMMAND = "npm run zoia:test:playwright:patch-library-full";
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const JSON_SPACES = 2;
const EXPECTED_GRID_BUTTON_COUNT = 80;
const PATCH_TIMEOUT_MS = 15000;

function nowIso() {
  return new Date().toISOString();
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function writeText(path, value) {
  await writeFile(path, value, "utf8");
}

async function loadTargets() {
  const readJson = async (path) => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
  const libraryManifest = await readJson(LIBRARY_MANIFEST_PATH);
  const verificationManifest = await readJson(VERIFICATION_MANIFEST_PATH);

  const libraryTargets = libraryManifest.patches.map((patch, index) => ({
    targetId: `library-${patch.patchId}`,
    source: "patch-library",
    sourceIndex: index,
    category: "patch-library",
    patchId: patch.patchId,
    pairId: null,
    binPath: patch.binPath,
    metadataPath: patch.metadataPath || null,
    manifestSha256: patch.binSha256,
    expectedSize: patch.binSize,
    readOnlySource: patch.readOnlySource
  }));

  const verificationTargets = verificationManifest.fixtures
    .filter((fixture) => fixture.pairStatus === "paired" && fixture.readOnlySource)
    .map((fixture, index) => ({
      targetId: `verification-${fixture.pairId}`,
      source: "verification-fixture",
      sourceIndex: index,
      category: fixture.category,
      patchId: fixture.pairId,
      pairId: fixture.pairId,
      binPath: fixture.binPath,
      metadataPath: fixture.jsonPath || null,
      manifestSha256: fixture.binSha256,
      expectedSize: fixture.binSize,
      readOnlySource: fixture.readOnlySource
    }));

  const targets = [...libraryTargets, ...verificationTargets];
  const limit = Number.parseInt(process.env.ZOIA_PATCH_BASELINE_LIMIT || "", 10);
  return Number.isFinite(limit) && limit > 0 ? targets.slice(0, limit) : targets;
}

async function loadSimulator(page) {
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.MODULE_DB && window.ZOIA.state), null, { timeout: PATCH_TIMEOUT_MS });
  await page.locator(".view-btn[data-view='hw']").click();
  await page.waitForFunction(
    (expectedCount) => document.querySelectorAll("#dual-grid-area .grid-btn").length === expectedCount,
    EXPECTED_GRID_BUTTON_COUNT,
    { timeout: PATCH_TIMEOUT_MS }
  );
}

async function snapshotState(page, path) {
  const state = await page.evaluate(() => {
    const zoia = window.ZOIA;
    const patch = zoia.state.patch;
    return {
      title: document.title,
      zoiaVersion: zoia.VERSION || null,
      currentView: zoia.state.currentView,
      currentPage: zoia.state.currentPage,
      secondaryPage: zoia.state.secondaryPage,
      selectedModule: zoia.state.selectedModule,
      selectedBlock: zoia.state.selectedBlock,
      selectedConnection: zoia.state.selectedConnection,
      patch: patch ? {
        name: patch.name,
        moduleCount: patch.moduleCount,
        actualModuleCount: patch.modules.length,
        connectionCount: patch.connections.length,
        pageCount: patch.pages.length,
        pages: patch.pages.slice(),
        modules: patch.modules.map((module) => ({
          idx: module.idx,
          typeIdx: module.typeIdx,
          name: module.name,
          typeName: module.typeName,
          category: module.category,
          page: module.page,
          gridPos: module.gridPos,
          blockCount: module.blockCount,
          paramCount: module.params ? module.params.length : 0
        }))
      } : null,
      ui: {
        patchSummaryText: document.querySelector("#patch-summary")?.textContent?.replace(/\s+/g, " ").trim() || null,
        gridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn").length,
        occupiedGridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn.occupied").length,
        toolbarButtons: Array.from(document.querySelectorAll("#toolbar button")).map((button) => button.textContent.trim())
      }
    };
  });
  await writeJson(path, state);
  return state;
}

async function captureArtifacts(page, testDir, prefix) {
  const screenshotPath = resolve(testDir, `${prefix}-screenshot.png`);
  const domPath = resolve(testDir, `${prefix}-dom.html`);
  const statePath = resolve(testDir, `${prefix}-state.json`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await writeText(domPath, await page.evaluate(() => document.documentElement.outerHTML));
  const state = await snapshotState(page, statePath);
  return { screenshotPath, domPath, statePath, state };
}

async function writeConsole(testDir, consoleEntries, prefix = "console") {
  const consolePath = resolve(testDir, `${prefix}.json`);
  await writeJson(consolePath, consoleEntries);
  return consolePath;
}

async function runPatch(browser, metadata, target) {
  const targetDir = resolve(EVIDENCE_ROOT, sanitizePathPart(target.source), sanitizePathPart(target.category), sanitizePathPart(target.patchId));
  await mkdir(targetDir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  let fixtureReference = null;
  page.on("console", (message) => consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() }));
  page.on("pageerror", (error) => pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null }));

  const inputSteps = [];
  const resultPath = resolve(targetDir, "result.json");
  const startedAt = nowIso();
  const recordStep = async (description, action) => {
    const step = { description, startedAt: nowIso(), completedAt: null };
    inputSteps.push(step);
    await action();
    step.completedAt = nowIso();
  };

  try {
    const fixtureBytes = await readFile(target.binPath);
    const observedSha256 = sha256Buffer(fixtureBytes);
    fixtureReference = {
      ...target,
      observedSha256,
      observedBytes: fixtureBytes.length
    };
    await writeJson(resolve(targetDir, "fixture-reference.json"), fixtureReference);
    await recordStep("Load ZOIA HTML simulator", async () => { await loadSimulator(page); });
    await recordStep("Import patch through browser file input", async () => { await page.locator("#file-input").setInputFiles(target.binPath); });
    await page.waitForFunction(
      () => Boolean(window.ZOIA?.state?.patch?.modules?.length > 0 && document.querySelectorAll("#dual-grid-area .grid-btn").length === 80),
      null,
      { timeout: PATCH_TIMEOUT_MS }
    );

    const finalArtifacts = await captureArtifacts(page, targetDir, "final");
    const consolePath = await writeConsole(targetDir, consoleEntries);
    const state = finalArtifacts.state;
    const assertionFailures = [];
    if (observedSha256 !== target.manifestSha256) assertionFailures.push("patch hash did not match manifest hash");
    if (target.expectedSize && fixtureBytes.length !== target.expectedSize) assertionFailures.push("patch byte size did not match manifest size");
    if (!state.patch?.name || state.patch.name.length === 0) assertionFailures.push("imported patch name is empty");
    if (!state.patch || state.patch.moduleCount <= 0 || state.patch.actualModuleCount !== state.patch.moduleCount) assertionFailures.push("module count is invalid or inconsistent");
    if (!state.patch || state.patch.pageCount <= 0) assertionFailures.push("page count is invalid");
    if (state.ui.gridButtonCount !== EXPECTED_GRID_BUTTON_COUNT) assertionFailures.push("hardware grid did not render expected 80 buttons");
    if (pageErrors.length > 0) assertionFailures.push("page emitted uncaught errors");

    const status = assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS;
    const result = {
      schemaVersion: "zoia.playwright-library-patch-baseline-patch-result.v0",
      targetId: target.targetId,
      source: target.source,
      category: target.category,
      patchId: target.patchId,
      status,
      startedAt,
      completedAt: nowIso(),
      command: COMMAND,
      metadata,
      fixtureReference,
      inputSteps,
      assertions: [
        "patch hash matches manifest hash",
        "browser import path loads the patch through #file-input",
        "loaded patch has non-empty name",
        "loaded patch has consistent module count",
        "loaded patch has at least one page",
        "hardware grid renders 80 buttons",
        "page emits no uncaught errors"
      ],
      assertionFailures,
      artifacts: {
        fixtureReferencePath: resolve(targetDir, "fixture-reference.json"),
        finalScreenshotPath: finalArtifacts.screenshotPath,
        finalDomSnapshotPath: finalArtifacts.domPath,
        finalStateSnapshotPath: finalArtifacts.statePath,
        consoleLogPath: consolePath,
        resultPath
      },
      observedFinalStateSummary: {
        patchName: state.patch?.name || null,
        moduleCount: state.patch?.moduleCount || null,
        connectionCount: state.patch?.connectionCount || null,
        pageCount: state.patch?.pageCount || null,
        occupiedGridButtonCount: state.ui.occupiedGridButtonCount,
        patchSummaryText: state.ui.patchSummaryText
      }
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  } catch (error) {
    const failureArtifacts = await captureArtifacts(page, targetDir, "failure").catch((captureError) => ({ captureError: captureError.message }));
    const consolePath = await writeConsole(targetDir, consoleEntries, "failure-console");
    const result = {
      schemaVersion: "zoia.playwright-library-patch-baseline-patch-result.v0",
      targetId: target.targetId,
      source: target.source,
      category: target.category,
      patchId: target.patchId,
      status: FAIL_STATUS,
      startedAt,
      completedAt: nowIso(),
      command: COMMAND,
      metadata,
      inputSteps,
      error: { message: error.message, stack: error.stack || null },
      pageErrors,
      artifacts: { failureArtifacts, failureConsolePath: consolePath, resultPath }
      ,
      fixtureReference
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  }
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(LIBRARY_MANIFEST_PATH)) throw new Error(`Patch library manifest not found. Run npm run zoia:patch-library:prepare first: ${LIBRARY_MANIFEST_PATH}`);
  if (!existsSync(VERIFICATION_MANIFEST_PATH)) throw new Error(`Verification manifest not found: ${VERIFICATION_MANIFEST_PATH}`);
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const targets = await loadTargets();
  const missingBins = targets.filter((target) => !existsSync(target.binPath));
  if (missingBins.length > 0) throw new Error(`Patch targets reference missing .bin files: ${missingBins.map((target) => target.targetId).join(", ")}`);

  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const metadata = {
    command: COMMAND,
    cwd: PROJECT_ROOT,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    playwrightVersion: playwrightPackage.version,
    browserName: "chromium",
    browserChannel: EDGE_CHANNEL,
    browserVersion: browser.version(),
    viewport: VIEWPORT,
    simulatorHtmlPath: SIMULATOR_HTML,
    libraryManifestPath: LIBRARY_MANIFEST_PATH,
    verificationManifestPath: VERIFICATION_MANIFEST_PATH,
    evidenceRoot: EVIDENCE_ROOT,
    targetCount: targets.length,
    limit: process.env.ZOIA_PATCH_BASELINE_LIMIT || null
  };

  const startedAt = nowIso();
  const results = [];
  for (const target of targets) results.push(await runPatch(browser, metadata, target));
  await browser.close();

  const bySource = {};
  const byCategory = {};
  for (const result of results) {
    if (!bySource[result.source]) bySource[result.source] = { total: 0, pass: 0, fail: 0 };
    if (!byCategory[result.category]) byCategory[result.category] = { total: 0, pass: 0, fail: 0 };
    bySource[result.source].total += 1;
    byCategory[result.category].total += 1;
    if (result.status === PASS_STATUS) {
      bySource[result.source].pass += 1;
      byCategory[result.category].pass += 1;
    } else {
      bySource[result.source].fail += 1;
      byCategory[result.category].fail += 1;
    }
  }

  const summary = {
    schemaVersion: "zoia.playwright-library-and-verification-patch-baseline-result.v0",
    status: results.every((result) => result.status === PASS_STATUS) ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    metadata,
    targetCount: targets.length,
    passCount: results.filter((result) => result.status === PASS_STATUS).length,
    failCount: results.filter((result) => result.status === FAIL_STATUS).length,
    bySource,
    byCategory,
    claimBoundaries: {
      audioSimulationClaim: false,
      emulatorCompletenessClaim: false,
      binaryExportFidelityClaim: false,
      publicSharingClaim: false
    },
    tests: results.map((result) => ({
      targetId: result.targetId,
      source: result.source,
      category: result.category,
      patchId: result.patchId,
      status: result.status,
      assertionFailures: result.assertionFailures || [],
      error: result.error || null,
      artifacts: result.artifacts,
      observedFinalStateSummary: result.observedFinalStateSummary || null
    }))
  };
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), summary);
  console.log(JSON.stringify({
    status: summary.status,
    targetCount: summary.targetCount,
    passCount: summary.passCount,
    failCount: summary.failCount,
    bySource: summary.bySource,
    evidenceRoot: EVIDENCE_ROOT
  }, null, JSON_SPACES));
  if (summary.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
