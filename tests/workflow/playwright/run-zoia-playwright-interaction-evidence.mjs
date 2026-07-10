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
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "products", "zoia", "index.html");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow", "evidence", "q076-interaction-slice");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const COMMAND = "npm run zoia:test:playwright:interactions";
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const JSON_SPACES = 2;
const EXPECTED_TITLE = "ZOIA Patch Simulator 6";
const EXPECTED_INITIAL_PATCH_NAME = "Audio Passthrough";
const EMPTY_TARGET_POS = 16;
const PASTE_TARGET_POS = 24;

function nowIso() {
  return new Date().toISOString();
}

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function assertEvidence(condition, message, details = {}) {
  if (!condition) fail(message, details);
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function writeText(path, value) {
  await writeFile(path, value, "utf8");
}

async function loadSimulator(page) {
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.MODULE_DB && window.ZOIA.state), null, { timeout: 10000 });
  await page.locator(".view-btn[data-view='hw']").click();
  await page.waitForFunction(() => document.querySelectorAll("#dual-grid-area .grid-btn").length === 80, null, { timeout: 10000 });
}

async function resetInitialPatch(page) {
  await page.evaluate(() => {
    window.ZOIA.loadInitial();
    window.ZOIA.viewManager.switchView("hw");
  });
  await page.waitForFunction((patchName) => window.ZOIA?.state?.patch?.name === patchName, EXPECTED_INITIAL_PATCH_NAME, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelectorAll("#dual-grid-area .grid-btn").length === 80, null, { timeout: 10000 });
}

async function snapshotState(page, path) {
  const state = await page.evaluate(() => {
    const zoia = window.ZOIA;
    const patch = zoia.state.patch;
    const summarizeModule = (mod) => ({
      idx: mod.idx,
      typeIdx: mod.typeIdx,
      name: mod.name,
      typeName: mod.typeName,
      category: mod.category,
      page: mod.page,
      gridPos: mod.gridPos,
      blockCount: mod.blockCount,
      blocks: (mod.blocks || []).map((block) => ({ name: block.n, type: block.t })),
      options: mod.options || []
    });
    return {
      title: document.title,
      currentView: zoia.state.currentView,
      patch: {
        name: patch.name,
        moduleCount: patch.moduleCount,
        modules: patch.modules.map(summarizeModule),
        connectionCount: patch.connections.length,
        connections: patch.connections.map((conn) => ({ ...conn })),
        pageCount: patch.pages.length,
        pages: patch.pages.slice()
      },
      selectedModule: zoia.state.selectedModule,
      selectedBlock: zoia.state.selectedBlock,
      clipboard: zoia.state.clipboard ? {
        typeIdx: zoia.state.clipboard.typeIdx,
        name: zoia.state.clipboard.name,
        typeName: zoia.state.clipboard.typeName,
        blockCount: zoia.state.clipboard.blockCount,
        category: zoia.state.clipboard.category
      } : null,
      popupVisible: document.querySelector("#module-add-popup")?.classList.contains("visible") || false,
      contextMenuVisible: document.querySelector("#grid-context-menu")?.classList.contains("visible") || false,
      hardware: {
        gridColumnCount: document.querySelectorAll("#dual-grid-area .grid-column").length,
        gridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn").length,
        occupiedGridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn.occupied").length
      },
      patchSummaryText: document.querySelector("#patch-summary")?.textContent?.replace(/\s+/g, " ").trim() || null
    };
  });
  await writeJson(path, state);
  return state;
}

async function captureDom(page, path) {
  await writeText(path, await page.evaluate(() => document.documentElement.outerHTML));
}

async function captureNamedArtifacts(page, testDir, consoleEntries, prefix) {
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

function emptyGridButton(page, pos) {
  return page.locator(`#dual-grid-area .grid-btn[data-pos="${pos}"]:not(.occupied)`).first();
}

function occupiedGridButton(page, modIdx, blockOrdinal = 0) {
  return page.locator(`#dual-grid-area .grid-btn.occupied[data-mod-idx="${modIdx}"]`).nth(blockOrdinal);
}

async function clickContextAction(page, action) {
  const item = page.locator(`#grid-context-menu .ctx-item[data-action="${action}"]`);
  await item.waitFor({ state: "visible", timeout: 10000 });
  await item.click();
}

async function dragBetween(page, source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assertEvidence(Boolean(sourceBox && targetBox), "Source and target drag elements must have bounding boxes", { sourceBox, targetBox });
  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.waitForTimeout(260);
  await page.mouse.move(tx, ty, { steps: 8 });
  await page.mouse.up();
}

async function runTest(browser, metadata, definition) {
  const testDir = resolve(EVIDENCE_ROOT, definition.id);
  await mkdir(testDir, { recursive: true });
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

  const steps = [];
  const recordStep = async (description, action) => {
    const startedAt = nowIso();
    await action();
    steps.push({ description, startedAt, completedAt: nowIso() });
  };

  const resultPath = resolve(testDir, "result.json");
  try {
    const runArtifacts = await definition.run({ page, recordStep, testDir, consoleEntries }) || {};
    assertEvidence(pageErrors.length === 0, "No uncaught page errors are allowed", { pageErrors });
    const finalArtifacts = await captureNamedArtifacts(page, testDir, consoleEntries, "final");
    const consolePath = await writeConsole(testDir, consoleEntries);
    const result = {
      id: definition.id,
      name: definition.name,
      status: PASS_STATUS,
      command: COMMAND,
      metadata,
      inputSteps: steps,
      assertions: definition.assertions,
      artifacts: {
        ...runArtifacts,
        finalScreenshotPath: finalArtifacts.screenshotPath,
        finalDomSnapshotPath: finalArtifacts.domPath,
        finalStateSnapshotPath: finalArtifacts.statePath,
        consoleLogPath: consolePath,
        resultPath
      },
      observedFinalState: finalArtifacts.state
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  } catch (error) {
    const failureArtifacts = await captureNamedArtifacts(page, testDir, consoleEntries, "failure").catch((captureError) => ({ captureError: captureError.message }));
    const consolePath = await writeConsole(testDir, consoleEntries, "failure-console");
    const result = {
      id: definition.id,
      name: definition.name,
      status: FAIL_STATUS,
      command: COMMAND,
      metadata,
      inputSteps: steps,
      assertions: definition.assertions,
      error: { message: error.message, details: error.details || null, stack: error.stack || null },
      artifacts: { failureArtifacts, failureConsolePath: consolePath, resultPath }
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  }
}

function definitions() {
  return [
    {
      id: "module-add-search-variant",
      name: "Module Add Search Variant",
      assertions: [
        "empty grid click opens module add popup",
        "searching for VCA filters module list",
        "clicking VCA opens variant panel",
        "clicking Stereo variant adds one VCA module at target grid position",
        "new module has typeIdx 7, option byte 1, blockCount 5, and selected state"
      ],
      artifacts: {},
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and reset to initial patch", async () => { await loadSimulator(page); await resetInitialPatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Click empty grid position 16", async () => { await emptyGridButton(page, EMPTY_TARGET_POS).click(); });
        await page.locator("#module-add-popup.visible").waitFor({ timeout: 10000 });
        await recordStep("Search for VCA", async () => { await page.locator("#popup-search").fill("VCA"); });
        const filteredNames = await page.locator("#popup-list .popup-item .mi-name").allTextContents();
        assertEvidence(filteredNames.includes("VCA"), "VCA must appear in filtered module list", { filteredNames });
        await recordStep("Open VCA variants", async () => { await page.locator("#popup-list .popup-item", { hasText: "VCA" }).first().click(); });
        await page.locator("#variant-panel .variant-item", { hasText: "Stereo" }).waitFor({ state: "visible", timeout: 10000 });
        await recordStep("Choose Stereo VCA variant", async () => { await page.locator("#variant-panel .variant-item", { hasText: "Stereo" }).first().click(); });
        await page.waitForFunction((targetPos) => window.ZOIA.state.patch.modules.some((mod) => mod.typeIdx === 7 && mod.gridPos === targetPos && mod.blockCount === 5), EMPTY_TARGET_POS);
        const after = await snapshotState(page, resolve(testDir, "after-state.json"));
        const added = after.patch.modules.find((mod) => mod.typeIdx === 7 && mod.gridPos === EMPTY_TARGET_POS && mod.blockCount === 5);
        assertEvidence(after.patch.moduleCount === before.patch.moduleCount + 1, "Module count must increase by one", { before: before.patch.moduleCount, after: after.patch.moduleCount });
        assertEvidence(Boolean(added), "Stereo VCA module must be present at target position", { modules: after.patch.modules });
        assertEvidence(added.options[0] === 1, "Stereo VCA option byte must be 1", { added });
        assertEvidence(after.selectedModule === added.idx && after.selectedBlock === 0, "New module must be selected", { selectedModule: after.selectedModule, addedIdx: added.idx });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterStatePath: resolve(testDir, "after-state.json")
        };
      }
    },
    {
      id: "grid-context-menu-copy-paste-delete",
      name: "Grid Context Menu Copy Paste Delete",
      assertions: [
        "right-clicking occupied module opens context menu",
        "copy action writes structured clipboard state",
        "right-clicking empty slot exposes paste action",
        "paste action creates copied module at target grid position",
        "delete action removes pasted module and reindexes module list"
      ],
      artifacts: {},
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and reset to initial patch", async () => { await loadSimulator(page); await resetInitialPatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Open context menu for module 0", async () => { await occupiedGridButton(page, 0, 0).click({ button: "right" }); });
        await page.locator("#grid-context-menu.visible").waitFor({ timeout: 10000 });
        await recordStep("Copy module 0", async () => { await clickContextAction(page, "copy"); });
        const afterCopy = await snapshotState(page, resolve(testDir, "after-copy-state.json"));
        assertEvidence(afterCopy.clipboard?.name === "Main Input", "Clipboard must contain copied Main Input module", { clipboard: afterCopy.clipboard });
        await recordStep("Open empty-slot context menu at position 24", async () => { await emptyGridButton(page, PASTE_TARGET_POS).click({ button: "right" }); });
        await page.locator('#grid-context-menu .ctx-item[data-action="paste"]').waitFor({ state: "visible", timeout: 10000 });
        await recordStep("Paste copied module", async () => { await clickContextAction(page, "paste"); });
        await page.waitForFunction((targetPos) => window.ZOIA.state.patch.modules.some((mod) => mod.name === "Main Input copy" && mod.gridPos === targetPos), PASTE_TARGET_POS);
        const afterPaste = await snapshotState(page, resolve(testDir, "after-paste-state.json"));
        const pasted = afterPaste.patch.modules.find((mod) => mod.name === "Main Input copy" && mod.gridPos === PASTE_TARGET_POS);
        assertEvidence(afterPaste.patch.moduleCount === before.patch.moduleCount + 1, "Paste must increase module count by one", { before: before.patch.moduleCount, after: afterPaste.patch.moduleCount });
        assertEvidence(Boolean(pasted), "Pasted Main Input copy must exist at target position", { modules: afterPaste.patch.modules });
        await recordStep("Open context menu for pasted module", async () => { await occupiedGridButton(page, pasted.idx, 0).click({ button: "right" }); });
        await page.locator('#grid-context-menu .ctx-item[data-action="delete"]').waitFor({ state: "visible", timeout: 10000 });
        await recordStep("Delete pasted module", async () => { await clickContextAction(page, "delete"); });
        await page.waitForFunction(() => !window.ZOIA.state.patch.modules.some((mod) => mod.name === "Main Input copy"));
        const afterDelete = await snapshotState(page, resolve(testDir, "after-delete-state.json"));
        assertEvidence(afterDelete.patch.moduleCount === before.patch.moduleCount, "Delete must restore original module count", { before: before.patch.moduleCount, after: afterDelete.patch.moduleCount });
        assertEvidence(!afterDelete.patch.modules.some((mod) => mod.name === "Main Input copy"), "Pasted module must be removed", { modules: afterDelete.patch.modules });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterCopyStatePath: resolve(testDir, "after-copy-state.json"),
          afterPasteStatePath: resolve(testDir, "after-paste-state.json"),
          afterDeleteStatePath: resolve(testDir, "after-delete-state.json")
        };
      }
    },
    {
      id: "drag-connect",
      name: "Drag Connect",
      assertions: [
        "drag from one occupied block to another creates one new connection",
        "connection endpoints match rendered source and target modules",
        "connection strength is default full strength",
        "patch summary connection count updates"
      ],
      artifacts: {},
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and reset to initial patch", async () => { await loadSimulator(page); await resetInitialPatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        const source = occupiedGridButton(page, 0, 0);
        const target = occupiedGridButton(page, 1, 2);
        await recordStep("Drag module 0 block 0 to module 1 block 2", async () => { await dragBetween(page, source, target); });
        await page.waitForFunction((count) => window.ZOIA.state.patch.connections.length === count + 1, before.patch.connectionCount, { timeout: 10000 });
        const after = await snapshotState(page, resolve(testDir, "after-state.json"));
        const created = after.patch.connections.find((conn) => conn.srcMod === 0 && conn.srcBlock === 0 && conn.dstMod === 1 && conn.dstBlock === 2);
        assertEvidence(after.patch.connectionCount === before.patch.connectionCount + 1, "Drag-connect must add exactly one connection", { before: before.patch.connectionCount, after: after.patch.connectionCount });
        assertEvidence(Boolean(created), "Expected drag-created connection endpoint not found", { connections: after.patch.connections });
        assertEvidence(created.strength === 10000, "Drag-created connection must use default full strength", { created });
        assertEvidence(after.patchSummaryText.includes(`${after.patch.connectionCount} connections`), "Patch summary must reflect new connection count", { patchSummaryText: after.patchSummaryText });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterStatePath: resolve(testDir, "after-state.json")
        };
      }
    }
  ];
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) fail(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

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
    evidenceRoot: EVIDENCE_ROOT
  };

  const startedAt = nowIso();
  const results = [];
  for (const definition of definitions()) {
    results.push(await runTest(browser, metadata, definition));
  }
  await browser.close();

  const summary = {
    schemaVersion: "zoia.playwright-interaction-evidence-result.v0",
    status: results.every((result) => result.status === PASS_STATUS) ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    metadata,
    testCount: results.length,
    passCount: results.filter((result) => result.status === PASS_STATUS).length,
    failCount: results.filter((result) => result.status === FAIL_STATUS).length,
    tests: results.map((result) => ({ id: result.id, name: result.name, status: result.status, artifacts: result.artifacts }))
  };
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), summary);
  console.log(JSON.stringify(summary, null, JSON_SPACES));
  if (summary.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
