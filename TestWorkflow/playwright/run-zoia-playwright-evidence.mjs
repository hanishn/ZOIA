#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "ZOIA emulator", "ZOIA_Patch_Simulator_v5_2_21_2026.html");
const EVIDENCE_ROOT = resolve(__dirname, "evidence", "q069-first-slice");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const EXPECTED_TITLE = "ZOIA Patch Simulator 6";
const EXPECTED_MODULE_DB_COUNT = 98;
const EXPECTED_GRID_SIZE = 40;
const EXPECTED_DUAL_GRID_SIZE = EXPECTED_GRID_SIZE * 2;
const EXPECTED_DEMO_PATCH_NAME = "Demo: Tremolo + Filter";
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const JSON_SPACES = 2;
const COMMAND = "npm run zoia:test:playwright";

function nowIso() {
  return new Date().toISOString();
}

function assertEvidence(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function writeText(path, value) {
  await writeFile(path, value, "utf8");
}

async function captureDom(page, path) {
  const dom = await page.evaluate(() => document.documentElement.outerHTML);
  await writeText(path, dom);
}

async function captureState(page, path) {
  const state = await page.evaluate(() => {
    const zoia = window.ZOIA || {};
    const patch = zoia.state && zoia.state.patch ? zoia.state.patch : null;
    const moduleDb = zoia.MODULE_DB || {};
    const categories = {};
    for (const mod of Object.values(moduleDb)) {
      categories[mod.cat] = (categories[mod.cat] || 0) + 1;
    }
    const visible = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return {
      title: document.title,
      locationHref: window.location.href,
      moduleDbCount: Object.keys(moduleDb).length,
      moduleCategories: categories,
      currentView: visible("#sch-view") ? "schematic" : visible("#hw-view") ? "hardware" : "unknown",
      hwViewVisible: visible("#hw-view"),
      schViewVisible: visible("#sch-view"),
      hardwareGridColumnCount: document.querySelectorAll("#dual-grid-area .grid-column").length,
      gridButtonCount: document.querySelectorAll("#btn-grid .grid-btn, #dual-grid-area .grid-btn").length,
      occupiedGridButtonCount: document.querySelectorAll("#btn-grid .grid-btn.occupied, #dual-grid-area .grid-btn.occupied").length,
      schematicGridColumnCount: document.querySelectorAll("#sch-dual-grid-area .sch-grid-column").length,
      schematicCellCount: document.querySelectorAll("#sch-grid .cell, #sch-grid-left .cell, #sch-grid-right .cell").length,
      schematicOccupiedCellCount: document.querySelectorAll("#sch-grid .cell.occupied, #sch-grid-left .cell.occupied, #sch-grid-right .cell.occupied").length,
      patchSummaryText: document.querySelector("#patch-summary")?.textContent?.trim() || null,
      oledText: document.querySelector("#oled")?.textContent?.replace(/\s+/g, " ").trim() || null,
      patch: patch ? {
        name: patch.name,
        moduleCount: patch.moduleCount,
        modulesLength: patch.modules?.length || 0,
        connectionCount: patch.connections?.length || 0,
        pageCount: patch.pages?.length || 0,
        firstModules: (patch.modules || []).slice(0, 5).map((mod) => ({
          idx: mod.idx,
          typeIdx: mod.typeIdx,
          name: mod.name,
          typeName: mod.typeName,
          category: mod.category,
          blockCount: mod.blockCount
        }))
      } : null
    };
  });
  await writeJson(path, state);
  return state;
}

async function captureStandardArtifacts(page, testDir, consoleEntries) {
  const screenshotPath = resolve(testDir, "screenshot.png");
  const domPath = resolve(testDir, "dom.html");
  const statePath = resolve(testDir, "state.json");
  const consolePath = resolve(testDir, "console.json");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await captureDom(page, domPath);
  const state = await captureState(page, statePath);
  await writeJson(consolePath, consoleEntries);
  return { screenshotPath, domPath, statePath, consolePath, state };
}

async function captureFailureArtifacts(page, testDir, consoleEntries, error) {
  const artifacts = {
    failureScreenshotPath: resolve(testDir, "failure-screenshot.png"),
    failureDomPath: resolve(testDir, "failure-dom.html"),
    failureStatePath: resolve(testDir, "failure-state.json"),
    failureConsolePath: resolve(testDir, "failure-console.json"),
    failureResultPath: resolve(testDir, "failure-result.json")
  };
  try {
    await page.screenshot({ path: artifacts.failureScreenshotPath, fullPage: true });
  } catch (screenshotError) {
    artifacts.failureScreenshotError = screenshotError.message;
  }
  try {
    await captureDom(page, artifacts.failureDomPath);
  } catch (domError) {
    artifacts.failureDomError = domError.message;
  }
  try {
    await captureState(page, artifacts.failureStatePath);
  } catch (stateError) {
    artifacts.failureStateError = stateError.message;
  }
  await writeJson(artifacts.failureConsolePath, consoleEntries);
  await writeJson(artifacts.failureResultPath, {
    status: FAIL_STATUS,
    error: error.message,
    details: error.details || null,
    artifacts
  });
  return artifacts;
}

async function runTest(browser, metadata, definition) {
  const testDir = resolve(EVIDENCE_ROOT, definition.id);
  await mkdir(testDir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => {
    consoleEntries.push({
      timestamp: nowIso(),
      type: message.type(),
      text: message.text(),
      location: message.location()
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({
      timestamp: nowIso(),
      message: error.message,
      stack: error.stack || null
    });
  });

  const steps = [];
  const recordStep = async (description, action) => {
    const startedAt = nowIso();
    await action();
    steps.push({ description, startedAt, completedAt: nowIso() });
  };

  const resultPath = resolve(testDir, "result.json");
  try {
    await definition.run({ page, recordStep, pageErrors });
    assertEvidence(pageErrors.length === 0, "No uncaught page errors are allowed", { pageErrors });
    const artifacts = await captureStandardArtifacts(page, testDir, consoleEntries);
    const result = {
      id: definition.id,
      name: definition.name,
      status: PASS_STATUS,
      command: COMMAND,
      metadata,
      inputSteps: steps,
      assertions: definition.assertions,
      artifacts: {
        screenshotPath: artifacts.screenshotPath,
        domSnapshotPath: artifacts.domPath,
        stateSnapshotPath: artifacts.statePath,
        consoleLogPath: artifacts.consolePath,
        resultPath
      },
      observedState: artifacts.state
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  } catch (error) {
    const failureArtifacts = await captureFailureArtifacts(page, testDir, consoleEntries, error);
    const result = {
      id: definition.id,
      name: definition.name,
      status: FAIL_STATUS,
      command: COMMAND,
      metadata,
      inputSteps: steps,
      assertions: definition.assertions,
      error: {
        message: error.message,
        details: error.details || null,
        stack: error.stack || null
      },
      artifacts: failureArtifacts
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  }
}

async function loadSimulator(page) {
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.MODULE_DB && window.ZOIA.state), null, { timeout: 10000 });
}

async function loadDemoPatch(page) {
  await page.getByRole("button", { name: "Demo Patch" }).click();
  await page.waitForFunction((expectedName) => window.ZOIA?.state?.patch?.name === expectedName, EXPECTED_DEMO_PATCH_NAME, { timeout: 10000 });
}

function getDefinitions() {
  return [
    {
      id: "simulator-load",
      name: "Simulator Load",
      assertions: [
        "title is exactly ZOIA Patch Simulator 6",
        "window.ZOIA and MODULE_DB are initialized",
        "MODULE_DB contains exactly 98 module definitions",
        "toolbar has hardware and schematic view buttons",
        "file input accepts .bin files",
        "hardware view is visible on initial load"
      ],
      run: async ({ page, recordStep }) => {
        await recordStep("Open simulator HTML from project-owned path", async () => loadSimulator(page));
        const observed = await page.evaluate(() => ({
          title: document.title,
          moduleDbCount: Object.keys(window.ZOIA.MODULE_DB).length,
          viewButtons: Array.from(document.querySelectorAll(".view-btn")).map((btn) => btn.getAttribute("data-view")),
          fileAccept: document.querySelector("#file-input")?.getAttribute("accept"),
          hwVisible: window.getComputedStyle(document.querySelector("#hw-view")).display !== "none"
        }));
        assertEvidence(observed.title === EXPECTED_TITLE, "Unexpected simulator title", observed);
        assertEvidence(observed.moduleDbCount === EXPECTED_MODULE_DB_COUNT, "Unexpected module database count", observed);
        assertEvidence(observed.viewButtons.includes("hw") && observed.viewButtons.includes("sch"), "Missing expected view buttons", observed);
        assertEvidence(observed.fileAccept === ".bin", "File input must accept .bin", observed);
        assertEvidence(observed.hwVisible, "Hardware view must be visible on load", observed);
      }
    },
    {
      id: "hardware-view",
      name: "Hardware View Render",
      assertions: [
        "demo patch loads with exact expected name",
        "hardware view is visible",
        "dual hardware view renders two 8x5 grids and exactly 80 grid buttons",
        "demo patch produces occupied grid buttons",
        "OLED renders demo patch text",
        "patch summary renders demo patch module and connection facts"
      ],
      run: async ({ page, recordStep }) => {
        await recordStep("Open simulator HTML from project-owned path", async () => loadSimulator(page));
        await recordStep("Load built-in demo patch", async () => loadDemoPatch(page));
        await recordStep("Switch to hardware view", async () => page.locator(".view-btn[data-view='hw']").click());
        await page.waitForFunction((expectedCount) => {
          return document.querySelectorAll("#btn-grid .grid-btn, #dual-grid-area .grid-btn").length === expectedCount;
        }, EXPECTED_DUAL_GRID_SIZE, { timeout: 10000 });
        const observed = await page.evaluate(() => {
          const style = window.getComputedStyle(document.querySelector("#hw-view"));
          return {
            patchName: window.ZOIA.state.patch.name,
            moduleCount: window.ZOIA.state.patch.moduleCount,
            connectionCount: window.ZOIA.state.patch.connections.length,
            hwDisplay: style.display,
            hardwareGridColumnCount: document.querySelectorAll("#dual-grid-area .grid-column").length,
            gridButtonCount: document.querySelectorAll("#btn-grid .grid-btn, #dual-grid-area .grid-btn").length,
            occupiedGridButtonCount: document.querySelectorAll("#btn-grid .grid-btn.occupied, #dual-grid-area .grid-btn.occupied").length,
            oledText: document.querySelector("#oled")?.textContent?.replace(/\s+/g, " ").trim(),
            patchSummaryText: document.querySelector("#patch-summary")?.textContent?.replace(/\s+/g, " ").trim()
          };
        });
        assertEvidence(observed.patchName === EXPECTED_DEMO_PATCH_NAME, "Demo patch did not load", observed);
        assertEvidence(observed.hwDisplay !== "none", "Hardware view is not visible", observed);
        assertEvidence(observed.hardwareGridColumnCount === 2, "Hardware dual-grid must render two grid columns", observed);
        assertEvidence(observed.gridButtonCount === EXPECTED_DUAL_GRID_SIZE, "Hardware dual-grid must render exactly 80 buttons", observed);
        assertEvidence(observed.occupiedGridButtonCount > 0, "Hardware grid must contain occupied demo patch buttons", observed);
        assertEvidence(observed.oledText.includes(EXPECTED_DEMO_PATCH_NAME), "OLED does not show demo patch", observed);
        assertEvidence(observed.patchSummaryText.includes(EXPECTED_DEMO_PATCH_NAME), "Patch summary does not show demo patch", observed);
        assertEvidence(observed.patchSummaryText.includes(`${observed.moduleCount} modules`), "Patch summary missing module count", observed);
      }
    },
    {
      id: "schematic-view",
      name: "Schematic View Render",
      assertions: [
        "demo patch loads with exact expected name",
        "schematic view button switches to visible schematic view",
        "schematic dual-grid renders two 8x5 grids and exactly 80 cells",
        "schematic grid contains occupied demo patch cells",
        "module list renders demo patch modules",
        "schematic patch info renders real demo patch state"
      ],
      run: async ({ page, recordStep }) => {
        await recordStep("Open simulator HTML from project-owned path", async () => loadSimulator(page));
        await recordStep("Load built-in demo patch", async () => loadDemoPatch(page));
        await recordStep("Switch to schematic view", async () => page.locator(".view-btn[data-view='sch']").click());
        await page.waitForFunction((expectedCount) => {
          return document.querySelectorAll("#sch-grid .cell, #sch-grid-left .cell, #sch-grid-right .cell").length === expectedCount;
        }, EXPECTED_DUAL_GRID_SIZE, { timeout: 10000 });
        const observed = await page.evaluate(() => {
          const schStyle = window.getComputedStyle(document.querySelector("#sch-view"));
          const hwStyle = window.getComputedStyle(document.querySelector("#hw-view"));
          return {
            patchName: window.ZOIA.state.patch.name,
            moduleCount: window.ZOIA.state.patch.moduleCount,
            connectionCount: window.ZOIA.state.patch.connections.length,
            schDisplay: schStyle.display,
            hwDisplay: hwStyle.display,
            dualGridPresent: Boolean(document.querySelector("#sch-dual-grid-area")),
            schematicGridColumnCount: document.querySelectorAll("#sch-dual-grid-area .sch-grid-column").length,
            schematicCellCount: document.querySelectorAll("#sch-grid .cell, #sch-grid-left .cell, #sch-grid-right .cell").length,
            schematicOccupiedCellCount: document.querySelectorAll("#sch-grid .cell.occupied, #sch-grid-left .cell.occupied, #sch-grid-right .cell.occupied").length,
            moduleListItems: document.querySelectorAll("#sch-module-list .module-item").length,
            patchInfoText: document.querySelector("#sch-patch-info")?.textContent?.replace(/\s+/g, " ").trim()
          };
        });
        assertEvidence(observed.patchName === EXPECTED_DEMO_PATCH_NAME, "Demo patch did not load", observed);
        assertEvidence(observed.schDisplay !== "none" && observed.hwDisplay === "none", "Schematic view did not become the active view", observed);
        assertEvidence(observed.dualGridPresent, "Schematic dual-grid area must exist", observed);
        assertEvidence(observed.schematicGridColumnCount === 2, "Schematic dual-grid must render two grid columns", observed);
        assertEvidence(observed.schematicCellCount === EXPECTED_DUAL_GRID_SIZE, "Schematic dual-grid must render exactly 80 cells", observed);
        assertEvidence(observed.schematicOccupiedCellCount > 0, "Schematic grid must contain occupied demo patch cells", observed);
        assertEvidence(observed.moduleListItems === observed.moduleCount, "Module list count must match demo patch module count", observed);
        assertEvidence(observed.patchInfoText.includes(EXPECTED_DEMO_PATCH_NAME), "Schematic patch info must include demo patch name", observed);
      }
    }
  ];
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) {
    throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  }

  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const browserVersion = browser.version();
  const metadata = {
    command: COMMAND,
    cwd: PROJECT_ROOT,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    playwrightVersion: playwrightPackage.version,
    browserName: "chromium",
    browserChannel: EDGE_CHANNEL,
    browserVersion,
    viewport: VIEWPORT,
    simulatorHtmlPath: SIMULATOR_HTML,
    evidenceRoot: EVIDENCE_ROOT
  };

  const startedAt = nowIso();
  const results = [];
  for (const definition of getDefinitions()) {
    results.push(await runTest(browser, metadata, definition));
  }
  await browser.close();

  const summary = {
    schemaVersion: "zoia.playwright-evidence-result.v0",
    status: results.every((result) => result.status === PASS_STATUS) ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    metadata,
    testCount: results.length,
    passCount: results.filter((result) => result.status === PASS_STATUS).length,
    failCount: results.filter((result) => result.status === FAIL_STATUS).length,
    tests: results.map((result) => ({
      id: result.id,
      name: result.name,
      status: result.status,
      artifacts: result.artifacts
    }))
  };

  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), summary);
  console.log(JSON.stringify(summary, null, JSON_SPACES));
  if (summary.status !== PASS_STATUS) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
