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
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "ZOIA emulator", "ZOIA_Patch_Simulator_v5_2_21_2026.html");
const MANIFEST_PATH = resolve(PROJECT_ROOT, "ParserHarness", "zoia-parser-fixture-harness", "fixtures", "manifests", "zoia-fixture-manifest.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "TestWorkflow", "evidence", "q094-all-patch-browser-baseline");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const COMMAND = "npm run zoia:test:playwright:all-patches";
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

async function loadManifest() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) {
    throw new Error(`Fixture manifest has no fixtures: ${MANIFEST_PATH}`);
  }
  return manifest;
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
          paramCount: module.params ? module.params.length : 0,
          optionBytes: module.options || []
        })),
        connections: patch.connections.map((connection) => ({ ...connection }))
      } : null,
      ui: {
        toolbarButtons: Array.from(document.querySelectorAll("#toolbar button")).map((button) => button.textContent.trim()),
        patchSummaryText: document.querySelector("#patch-summary")?.textContent?.replace(/\s+/g, " ").trim() || null,
        gridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn").length,
        occupiedGridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn.occupied").length,
        schematicButtonActive: document.querySelector(".view-btn[data-view='sch']")?.classList.contains("active") || false,
        hardwareButtonActive: document.querySelector(".view-btn[data-view='hw']")?.classList.contains("active") || false
      },
      moduleCatalog: {
        count: Object.keys(zoia.MODULE_DB || {}).length
      }
    };
  });
  await writeJson(path, state);
  return state;
}

async function captureDom(page, path) {
  await writeText(path, await page.evaluate(() => document.documentElement.outerHTML));
}

async function captureArtifacts(page, testDir, prefix) {
  const screenshotPath = resolve(testDir, `${prefix}-screenshot.png`);
  const domPath = resolve(testDir, `${prefix}-dom.html`);
  const statePath = resolve(testDir, `${prefix}-state.json`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await captureDom(page, domPath);
  const state = await snapshotState(page, statePath);
  return { screenshotPath, domPath, statePath, state };
}

async function writeConsole(testDir, consoleEntries, prefix = "console") {
  const consolePath = resolve(testDir, `${prefix}.json`);
  await writeJson(consolePath, consoleEntries);
  return consolePath;
}

async function runPatch(browser, metadata, fixture) {
  const patchDir = resolve(EVIDENCE_ROOT, sanitizePathPart(fixture.category), sanitizePathPart(fixture.pairId));
  await mkdir(patchDir, { recursive: true });

  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => {
    consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null });
  });

  const inputSteps = [];
  const resultPath = resolve(patchDir, "result.json");
  const startedAt = nowIso();
  const recordStep = async (description, action) => {
    const step = { description, startedAt: nowIso(), completedAt: null };
    inputSteps.push(step);
    await action();
    step.completedAt = nowIso();
  };

  try {
    const fixtureBytes = await readFile(fixture.binPath);
    const observedSha256 = sha256Buffer(fixtureBytes);
    const fixtureReference = {
      pairId: fixture.pairId,
      category: fixture.category,
      binPath: fixture.binPath,
      jsonPath: fixture.jsonPath,
      manifestSha256: fixture.binSha256,
      observedSha256,
      observedBytes: fixtureBytes.length,
      readOnlySource: fixture.readOnlySource,
      pairStatus: fixture.pairStatus
    };
    await writeJson(resolve(patchDir, "fixture-reference.json"), fixtureReference);

    await recordStep("Load ZOIA HTML simulator", async () => { await loadSimulator(page); });
    await recordStep("Import staged .bin through browser file input", async () => {
      await page.locator("#file-input").setInputFiles(fixture.binPath);
    });
    await page.waitForFunction(
      () => Boolean(window.ZOIA?.state?.patch?.modules?.length > 0 && document.querySelectorAll("#dual-grid-area .grid-btn").length === 80),
      null,
      { timeout: PATCH_TIMEOUT_MS }
    );
    const finalArtifacts = await captureArtifacts(page, patchDir, "final");
    const consolePath = await writeConsole(patchDir, consoleEntries);

    const state = finalArtifacts.state;
    const assertionFailures = [];
    if (observedSha256 !== fixture.binSha256) assertionFailures.push("fixture hash did not match manifest hash");
    if (!state.patch?.name || state.patch.name.length === 0) assertionFailures.push("imported patch name is empty");
    if (!state.patch || state.patch.moduleCount <= 0 || state.patch.actualModuleCount !== state.patch.moduleCount) assertionFailures.push("module count is invalid or inconsistent");
    if (!state.patch || state.patch.pageCount <= 0) assertionFailures.push("page count is invalid");
    if (state.ui.gridButtonCount !== EXPECTED_GRID_BUTTON_COUNT) assertionFailures.push("hardware grid did not render expected 80 buttons");
    if (pageErrors.length > 0) assertionFailures.push("page emitted uncaught errors");

    const status = assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS;
    const result = {
      schemaVersion: "zoia.playwright-all-patch-browser-patch-result.v0",
      pairId: fixture.pairId,
      category: fixture.category,
      status,
      startedAt,
      completedAt: nowIso(),
      command: COMMAND,
      metadata,
      fixtureReference,
      inputSteps,
      assertions: [
        "fixture hash matches manifest hash",
        "browser import path loads the .bin through #file-input",
        "loaded patch has non-empty name",
        "loaded patch has consistent module count",
        "loaded patch has at least one page",
        "hardware grid renders 80 buttons",
        "page emits no uncaught errors"
      ],
      assertionFailures,
      artifacts: {
        fixtureReferencePath: resolve(patchDir, "fixture-reference.json"),
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
    const failureArtifacts = await captureArtifacts(page, patchDir, "failure").catch((captureError) => ({ captureError: captureError.message }));
    const consolePath = await writeConsole(patchDir, consoleEntries, "failure-console");
    const result = {
      schemaVersion: "zoia.playwright-all-patch-browser-patch-result.v0",
      pairId: fixture.pairId,
      category: fixture.category,
      status: FAIL_STATUS,
      startedAt,
      completedAt: nowIso(),
      command: COMMAND,
      metadata,
      inputSteps,
      error: { message: error.message, stack: error.stack || null },
      pageErrors,
      artifacts: {
        failureArtifacts,
        failureConsolePath: consolePath,
        resultPath
      }
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  }
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(MANIFEST_PATH)) throw new Error(`Fixture manifest not found: ${MANIFEST_PATH}`);

  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const manifest = await loadManifest();
  const fixtures = manifest.fixtures.filter((fixture) => fixture.pairStatus === "paired" && fixture.readOnlySource);
  const missingBins = fixtures.filter((fixture) => !existsSync(fixture.binPath));
  if (missingBins.length > 0) {
    throw new Error(`Manifest references missing .bin files: ${missingBins.map((fixture) => fixture.pairId).join(", ")}`);
  }

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
    fixtureManifestPath: MANIFEST_PATH,
    evidenceRoot: EVIDENCE_ROOT,
    fixtureCount: fixtures.length
  };

  const startedAt = nowIso();
  const results = [];
  for (const fixture of fixtures) {
    results.push(await runPatch(browser, metadata, fixture));
  }
  await browser.close();

  const byCategory = {};
  for (const result of results) {
    if (!byCategory[result.category]) byCategory[result.category] = { total: 0, pass: 0, fail: 0 };
    byCategory[result.category].total += 1;
    if (result.status === PASS_STATUS) byCategory[result.category].pass += 1;
    else byCategory[result.category].fail += 1;
  }

  const summary = {
    schemaVersion: "zoia.playwright-all-patch-browser-baseline-result.v0",
    status: results.every((result) => result.status === PASS_STATUS) ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    metadata,
    fixtureCount: fixtures.length,
    patchCount: results.length,
    passCount: results.filter((result) => result.status === PASS_STATUS).length,
    failCount: results.filter((result) => result.status === FAIL_STATUS).length,
    byCategory,
    claimBoundaries: {
      audioSimulationClaim: false,
      emulatorCompletenessClaim: false,
      binaryExportFidelityClaim: false,
      publicSharingClaim: false
    },
    tests: results.map((result) => ({
      pairId: result.pairId,
      category: result.category,
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
    fixtureCount: summary.fixtureCount,
    passCount: summary.passCount,
    failCount: summary.failCount,
    evidenceRoot: EVIDENCE_ROOT
  }, null, JSON_SPACES));
  if (summary.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

