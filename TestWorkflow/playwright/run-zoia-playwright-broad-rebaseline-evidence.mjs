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
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "TestWorkflow", "evidence", "q093-broad-rebaseline");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const COMMAND = "npm run zoia:test:playwright:broad";
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const JSON_SPACES = 2;
const EXPECTED_INITIAL_PATCH_NAME = "Audio Passthrough";
const TEST_PATCH_NAME = "Q093 Non Audio Rebaseline";
const MODULE_CATALOG_COUNT = 98;
const FULL_STRENGTH = 10000;
const HALF_STRENGTH = 5000;
const FIRST_PAGE_INDEX = 0;
const SECOND_PAGE_INDEX = 1;

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

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function writeText(path, value) {
  await writeFile(path, value, "utf8");
}

async function loadFixtureReference() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const fixture = manifest.fixtures.find((item) => item.pairId === "PROTOTYPE_A01_Spring_Reverb")
    || manifest.fixtures.find((item) => item.pairStatus === "paired" && item.readOnlySource);
  assertEvidence(Boolean(fixture), "Manifest must contain at least one read-only paired fixture", { manifestPath: MANIFEST_PATH });
  assertEvidence(existsSync(fixture.binPath), "Selected fixture .bin must exist", { fixture });
  return fixture;
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
}

async function installRebaselinePatch(page) {
  await page.evaluate((patchName) => {
    const DB = window.ZOIA.MODULE_DB;
    const modules = [
      { idx: 0, typeIdx: 45, page: 0, colorId: 4, gridPos: 0, name: "Source Value", typeName: "Value", blocks: DB[45].blocks, blockCount: DB[45].blocks.length, category: "CV", params: [32768], options: [0,0,0,0,0,0,0,0], paramCount: 1 },
      { idx: 1, typeIdx: 45, page: 0, colorId: 5, gridPos: 8, name: "Target Value", typeName: "Value", blocks: DB[45].blocks, blockCount: DB[45].blocks.length, category: "CV", params: [32768], options: [0,0,0,0,0,0,0,0], paramCount: 1 },
      { idx: 2, typeIdx: 16, page: 1, colorId: 6, gridPos: 0, name: "Meta Keyboard", typeName: "Keyboard", blocks: DB[16].blocks, blockCount: DB[16].blocks.length, category: "Interface", params: [], options: [0,0,0,0,0,0,0,0], paramCount: 0 }
    ];
    window.ZOIA.loadPatch({
      name: patchName,
      moduleCount: modules.length,
      modules,
      connections: [{ srcMod: 0, srcBlock: 0, dstMod: 1, dstBlock: 0, strength: 10000 }],
      pages: ["Main", "Controls"],
      labels: [],
      description: "Q093 deterministic non-audio rebaseline patch"
    });
    window.ZOIA.viewManager.switchView("hw");
  }, TEST_PATCH_NAME);
  await page.waitForFunction((patchName) => window.ZOIA?.state?.patch?.name === patchName, TEST_PATCH_NAME, { timeout: 10000 });
}

async function snapshotState(page, path) {
  const state = await page.evaluate(() => {
    const zoia = window.ZOIA;
    const patch = zoia.state.patch;
    const selected = zoia.state.selectedModule !== null && patch?.modules?.[zoia.state.selectedModule]
      ? patch.modules[zoia.state.selectedModule]
      : null;
    return {
      title: document.title,
      currentView: zoia.state.currentView,
      currentPage: zoia.state.currentPage,
      secondaryPage: zoia.state.secondaryPage,
      selectedModule: zoia.state.selectedModule,
      selectedBlock: zoia.state.selectedBlock,
      selectedConnection: zoia.state.selectedConnection,
      connectionView: Boolean(zoia.state.connectionView),
      connectionListLength: zoia.state.connectionList ? zoia.state.connectionList.length : 0,
      selectedModuleSummary: selected ? {
        idx: selected.idx,
        typeIdx: selected.typeIdx,
        name: selected.name,
        typeName: selected.typeName,
        params: selected.params || [],
        blockCount: selected.blockCount
      } : null,
      patch: patch ? {
        name: patch.name,
        moduleCount: patch.moduleCount,
        modules: patch.modules.map((module) => ({
          idx: module.idx,
          typeIdx: module.typeIdx,
          name: module.name,
          typeName: module.typeName,
          category: module.category,
          page: module.page,
          gridPos: module.gridPos,
          blockCount: module.blockCount,
          params: module.params || [],
          options: module.options || []
        })),
        connectionCount: patch.connections.length,
        connections: patch.connections.map((connection) => ({ ...connection })),
        pages: patch.pages.slice(),
        labels: patch.labels ? patch.labels.slice() : [],
        description: patch.description || ""
      } : null,
      ui: {
        toolbarButtons: Array.from(document.querySelectorAll("#toolbar button")).map((button) => button.textContent.trim()),
        patchSummaryText: document.querySelector("#patch-summary")?.textContent?.replace(/\s+/g, " ").trim() || null,
        labelText: document.querySelector("#patch-labels")?.textContent?.replace(/\s+/g, " ").trim() || null,
        paramInputValue: document.querySelector("#param-input")?.value || null,
        paramLabel: document.querySelector("#param-input-area .param-label")?.textContent?.trim() || null,
        gridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn").length,
        occupiedGridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn.occupied").length,
        contextMenuVisible: document.querySelector("#grid-context-menu")?.classList.contains("visible") || false,
        libraryModalVisible: Boolean(document.querySelector(".pb-modal,.patch-browser-modal,#patch-browser-modal,[data-patch-browser-modal]"))
      },
      moduleCatalog: {
        count: Object.keys(zoia.MODULE_DB || {}).length,
        categories: Object.values(zoia.MODULE_DB || {}).reduce((acc, module) => {
          acc[module.cat] = (acc[module.cat] || 0) + 1;
          return acc;
        }, {})
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

async function clickContextAction(page, action) {
  const item = page.locator(`#grid-context-menu .ctx-item[data-action="${action}"]`);
  await item.waitFor({ state: "visible", timeout: 10000 });
  await item.click();
}

function occupiedGridButton(page, modIdx, blockOrdinal = 0) {
  return page.locator(`#dual-grid-area .grid-btn.occupied[data-mod-idx="${modIdx}"]`).nth(blockOrdinal);
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
    const finalArtifacts = await captureArtifacts(page, testDir, "final");
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
    const failureArtifacts = await captureArtifacts(page, testDir, "failure").catch((captureError) => ({ captureError: captureError.message }));
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

function definitions(fixture) {
  return [
    {
      id: "export-file-hash-evidence",
      name: "Export JSON and BIN File Hash Evidence",
      assertions: [
        "export path emits JSON and BIN outputs through the simulator export helpers",
        "JSON export parses and preserves patch name, modules, connections, pages, labels, and description",
        "BIN export is exactly 32768 bytes and is recorded only as structural export evidence, not fidelity proof",
        "SHA-256 hashes are written for both exported files"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and install deterministic rebaseline patch", async () => { await loadSimulator(page); await installRebaselinePatch(page); });
        await recordStep("Install deterministic export capture hooks", async () => {
          await page.evaluate(() => {
            window.__q093Downloads = [];
            window.ZOIA._downloadFile = function(content, filename, mimeType) {
              window.__q093Downloads.push({ kind: "text", filename, mimeType, content });
              window.ZOIA.log("Captured export: " + filename);
            };
            window.ZOIA._downloadBinary = function(data, filename) {
              const bytes = Array.from(new Uint8Array(data));
              window.__q093Downloads.push({ kind: "binary", filename, mimeType: "application/octet-stream", bytes });
              window.ZOIA.log("Captured binary export: " + filename);
            };
          });
        });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Call simulator save file export helper", async () => { await page.evaluate(() => window.ZOIA._doSaveFiles(window.ZOIA.state.patch.name)); });
        const downloads = await page.evaluate(() => window.__q093Downloads);
        const jsonDownload = downloads.find((item) => item.kind === "text" && item.filename.endsWith(".json"));
        const binDownload = downloads.find((item) => item.kind === "binary" && item.filename.endsWith(".bin"));
        assertEvidence(Boolean(jsonDownload && binDownload), "Export must capture both JSON and BIN outputs", { downloads });

        const jsonObject = JSON.parse(jsonDownload.content);
        const binBuffer = Buffer.from(binDownload.bytes);
        const jsonPath = resolve(testDir, jsonDownload.filename);
        const binPath = resolve(testDir, binDownload.filename);
        await writeText(jsonPath, jsonDownload.content);
        await writeFile(binPath, binBuffer);
        const hashes = {
          jsonSha256: sha256Text(jsonDownload.content),
          binSha256: sha256Buffer(binBuffer),
          jsonBytes: Buffer.byteLength(jsonDownload.content, "utf8"),
          binBytes: binBuffer.length,
          binFidelityClaim: false
        };
        await writeJson(resolve(testDir, "export-hashes.json"), hashes);
        assertEvidence(jsonObject.name === TEST_PATCH_NAME, "JSON export must preserve patch name", { jsonObject });
        assertEvidence(jsonObject.moduleCount === before.patch.moduleCount, "JSON export module count must match state", { jsonObject, before: before.patch });
        assertEvidence(jsonObject.connections.length === before.patch.connectionCount, "JSON export connection count must match state", { jsonObject, before: before.patch });
        assertEvidence(jsonObject.pages.length === before.patch.pages.length, "JSON export page count must match state", { jsonObject, before: before.patch });
        assertEvidence(hashes.binBytes === 32768, "BIN export must be 32768 bytes for structural export evidence", hashes);
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          exportedJsonPath: jsonPath,
          exportedBinPath: binPath,
          exportHashesPath: resolve(testDir, "export-hashes.json")
        };
      }
    },
    {
      id: "browser-bin-import-path",
      name: "Browser BIN Import Path",
      assertions: [
        "file input accepts a staged read-only .bin fixture referenced by the parser manifest",
        "browser import calls the simulator parse/load path",
        "loaded patch has non-empty name, modules, pages, and 80 rendered grid buttons",
        "fixture file hash in evidence matches manifest hash"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator", async () => { await loadSimulator(page); await resetInitialPatch(page); });
        const fixtureBytes = await readFile(fixture.binPath);
        const fixtureEvidence = {
          pairId: fixture.pairId,
          category: fixture.category,
          binPath: fixture.binPath,
          manifestSha256: fixture.binSha256,
          observedSha256: sha256Buffer(fixtureBytes),
          observedBytes: fixtureBytes.length,
          readOnlySource: fixture.readOnlySource
        };
        await writeJson(resolve(testDir, "fixture-reference.json"), fixtureEvidence);
        assertEvidence(fixtureEvidence.observedSha256 === fixture.binSha256, "Fixture hash must match manifest before browser import", fixtureEvidence);
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Set browser file input to staged fixture .bin", async () => { await page.locator("#file-input").setInputFiles(fixture.binPath); });
        await page.waitForFunction((initialName) => window.ZOIA.state.patch.name !== initialName && window.ZOIA.state.patch.modules.length > 0, EXPECTED_INITIAL_PATCH_NAME, { timeout: 10000 });
        const after = await snapshotState(page, resolve(testDir, "after-import-state.json"));
        assertEvidence(after.patch.name.length > 0, "Imported patch must have a non-empty name", { after: after.patch });
        assertEvidence(after.patch.moduleCount > 0 && after.patch.modules.length === after.patch.moduleCount, "Imported patch must expose modules", { after: after.patch });
        assertEvidence(after.patch.pages.length > 0, "Imported patch must expose pages", { after: after.patch });
        assertEvidence(after.ui.gridButtonCount === 80, "Hardware grid must render after import", { after: after.ui });
        assertEvidence(before.patch.name === EXPECTED_INITIAL_PATCH_NAME, "Import test must start from initial patch", { before: before.patch });
        return {
          fixtureReferencePath: resolve(testDir, "fixture-reference.json"),
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterImportStatePath: resolve(testDir, "after-import-state.json")
        };
      }
    },
    {
      id: "metadata-labels-rename",
      name: "Patch Labels Page Rename And Module Rename",
      assertions: [
        "label add UI creates a patch label",
        "duplicate label entry is rejected without adding a second copy",
        "label remove UI removes the label",
        "page rename prompt updates page metadata",
        "module rename context menu updates module metadata"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and install deterministic rebaseline patch", async () => { await loadSimulator(page); await installRebaselinePatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Add label via toolbar label UI", async () => {
          await page.locator("#add-label-btn").click();
          await page.locator("#oled-label-input").fill("q093");
          await page.locator("#oled-label-input").press("Enter");
        });
        await page.waitForFunction(() => window.ZOIA.state.patch.labels.includes("q093"), null, { timeout: 10000 });
        const afterLabel = await snapshotState(page, resolve(testDir, "after-label-state.json"));
        await recordStep("Attempt duplicate label add", async () => {
          await page.locator("#add-label-btn").click();
          await page.locator("#oled-label-input").fill("Q093");
          await page.locator("#oled-label-input").press("Enter");
        });
        const afterDuplicate = await snapshotState(page, resolve(testDir, "after-duplicate-label-state.json"));
        await recordStep("Remove label via label pill x", async () => { await page.locator(".patch-label-x[data-idx='0']").click(); });
        await page.waitForFunction(() => window.ZOIA.state.patch.labels.length === 0, null, { timeout: 10000 });
        const afterRemove = await snapshotState(page, resolve(testDir, "after-remove-label-state.json"));
        await recordStep("Rename page 0 through prompt-backed page rename control", async () => {
          page.once("dialog", (dialog) => dialog.accept("Main Renamed"));
          await page.locator("#page-selector .util-btn", { hasText: "✎" }).click();
        });
        await page.waitForFunction(() => window.ZOIA.state.patch.pages[0] === "Main Renamed", null, { timeout: 10000 });
        const afterPageRename = await snapshotState(page, resolve(testDir, "after-page-rename-state.json"));
        await recordStep("Rename module 0 through grid context menu", async () => {
          page.once("dialog", (dialog) => dialog.accept("Value Renamed"));
          await occupiedGridButton(page, 0, 0).click({ button: "right" });
          await clickContextAction(page, "rename");
        });
        await page.waitForFunction(() => window.ZOIA.state.patch.modules[0].name === "Value Renamed", null, { timeout: 10000 });
        const afterModuleRename = await snapshotState(page, resolve(testDir, "after-module-rename-state.json"));
        assertEvidence(afterLabel.patch.labels.includes("q093"), "Label add must create q093 label", { afterLabel: afterLabel.patch.labels });
        assertEvidence(afterDuplicate.patch.labels.filter((label) => label.toLowerCase() === "q093").length === 1, "Duplicate label must not add a second label", { afterDuplicate: afterDuplicate.patch.labels });
        assertEvidence(afterRemove.patch.labels.length === 0, "Label remove must clear label list", { afterRemove: afterRemove.patch.labels });
        assertEvidence(afterPageRename.patch.pages[0] === "Main Renamed", "Page rename must update page 0", { pages: afterPageRename.patch.pages });
        assertEvidence(afterModuleRename.patch.modules[0].name === "Value Renamed", "Module rename must update module 0", { module: afterModuleRename.patch.modules[0] });
        assertEvidence(before.patch.labels.length === 0, "Metadata test must start with no labels", { before: before.patch.labels });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterLabelStatePath: resolve(testDir, "after-label-state.json"),
          afterDuplicateLabelStatePath: resolve(testDir, "after-duplicate-label-state.json"),
          afterRemoveLabelStatePath: resolve(testDir, "after-remove-label-state.json"),
          afterPageRenameStatePath: resolve(testDir, "after-page-rename-state.json"),
          afterModuleRenameStatePath: resolve(testDir, "after-module-rename-state.json")
        };
      }
    },
    {
      id: "connection-strength-disconnect",
      name: "Connection Strength And Disconnect",
      assertions: [
        "selecting a grid-dot connection exposes connection strength in the encoder input",
        "manual strength input updates connection raw strength deterministically",
        "context-menu disconnect removes all connections for the selected module",
        "patch summary and state reflect zero remaining connections"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and install deterministic rebaseline patch", async () => { await loadSimulator(page); await installRebaselinePatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Select connection 0 through grid-dot connection API", async () => {
          await page.evaluate(() => window.ZOIA.selectConnection(0));
        });
        await page.waitForFunction(() => window.ZOIA.state.selectedConnection === 0, null, { timeout: 10000 });
        const afterSelect = await snapshotState(page, resolve(testDir, "after-select-connection-state.json"));
        await recordStep("Edit selected connection strength to 50 percent through param input", async () => {
          await page.locator("#param-input").fill("50");
          await page.locator("#param-input").press("Enter");
        });
        await page.waitForFunction((expected) => window.ZOIA.state.patch.connections[0]?.strength === expected, HALF_STRENGTH, { timeout: 10000 });
        const afterStrength = await snapshotState(page, resolve(testDir, "after-strength-state.json"));
        await recordStep("Disconnect all connections for module 0 through context menu", async () => {
          await occupiedGridButton(page, 0, 0).click({ button: "right" });
          await clickContextAction(page, "disconnect");
        });
        await page.waitForFunction(() => window.ZOIA.state.patch.connections.length === 0, null, { timeout: 10000 });
        const afterDisconnect = await snapshotState(page, resolve(testDir, "after-disconnect-state.json"));
        assertEvidence(before.patch.connectionCount === 1 && before.patch.connections[0].strength === FULL_STRENGTH, "Connection test must start with one full-strength connection", { before: before.patch.connections });
        assertEvidence(afterSelect.selectedConnection === 0 && afterSelect.ui.paramLabel === "CONN STRENGTH", "Selected connection must expose connection strength controls", { afterSelect });
        assertEvidence(afterStrength.patch.connections[0].strength === HALF_STRENGTH, "Connection strength input must set raw strength to 5000", { afterStrength: afterStrength.patch.connections[0] });
        assertEvidence(afterDisconnect.patch.connectionCount === 0, "Disconnect action must remove all module connections", { afterDisconnect: afterDisconnect.patch });
        assertEvidence(afterDisconnect.ui.patchSummaryText.includes("0 connections"), "Patch summary must reflect zero connections", { summary: afterDisconnect.ui.patchSummaryText });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterSelectConnectionStatePath: resolve(testDir, "after-select-connection-state.json"),
          afterStrengthStatePath: resolve(testDir, "after-strength-state.json"),
          afterDisconnectStatePath: resolve(testDir, "after-disconnect-state.json")
        };
      }
    },
    {
      id: "module-catalog-inventory",
      name: "Module Catalog Inventory And Search Coverage",
      assertions: [
        "module database contains the expected 98 definitions",
        "category counts match the current evidence baseline",
        "module-add search can find every distinct module name",
        "module-add category search can expose each category"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and reset initial patch", async () => { await loadSimulator(page); await resetInitialPatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Open module add popup on an empty grid cell", async () => { await page.locator('#grid-left .grid-btn[data-pos="16"]:not(.occupied)').click(); });
        await page.locator("#module-add-popup.visible").waitFor({ timeout: 10000 });
        const inventory = await page.evaluate(async () => {
          const dbEntries = Object.entries(window.ZOIA.MODULE_DB).map(([typeId, module]) => ({
            typeId: Number(typeId),
            name: module.name,
            category: module.cat,
            blockCount: module.blocks.length,
            variantCount: module.variants ? Object.keys(module.variants).length : 0
          })).sort((a, b) => a.typeId - b.typeId);
          const byCategory = dbEntries.reduce((acc, entry) => {
            acc[entry.category] = (acc[entry.category] || 0) + 1;
            return acc;
          }, {});
          const distinctNames = Array.from(new Set(dbEntries.map((entry) => entry.name))).sort();
          const nameSearches = [];
          for (const name of distinctNames) {
            window.ZOIA.moduleAdd.filter(name);
            const visibleNames = Array.from(document.querySelectorAll("#popup-list .popup-item .mi-name")).map((el) => el.textContent.trim());
            nameSearches.push({ query: name, visibleNames, matched: visibleNames.includes(name) });
          }
          const categorySearches = [];
          for (const category of Object.keys(byCategory).sort()) {
            window.ZOIA.moduleAdd.filter(category);
            const visibleCategories = Array.from(document.querySelectorAll("#popup-list .popup-item .mi-cat")).map((el) => el.textContent.trim());
            categorySearches.push({ query: category, visibleCount: visibleCategories.length, visibleCategories });
          }
          return { dbEntries, byCategory, distinctNames, nameSearches, categorySearches };
        });
        await writeJson(resolve(testDir, "module-catalog-inventory.json"), inventory);
        assertEvidence(inventory.dbEntries.length === MODULE_CATALOG_COUNT, "Module database must contain 98 definitions", { count: inventory.dbEntries.length });
        assertEvidence(inventory.byCategory.Audio === 23 && inventory.byCategory.Effect === 24 && inventory.byCategory.CV === 33 && inventory.byCategory.Interface === 9 && inventory.byCategory.MIDI === 9, "Category counts must match Q089 baseline", { byCategory: inventory.byCategory });
        const missingNameSearches = inventory.nameSearches.filter((item) => !item.matched);
        assertEvidence(missingNameSearches.length === 0, "Every distinct module name must be findable by module-add search", { missingNameSearches });
        const emptyCategorySearches = inventory.categorySearches.filter((item) => item.visibleCount === 0);
        assertEvidence(emptyCategorySearches.length === 0, "Every module category must produce search results", { emptyCategorySearches });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          moduleCatalogInventoryPath: resolve(testDir, "module-catalog-inventory.json")
        };
      }
    }
  ];
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(MANIFEST_PATH)) throw new Error(`Fixture manifest not found: ${MANIFEST_PATH}`);
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const fixture = await loadFixtureReference();

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
    selectedImportFixture: fixture,
    evidenceRoot: EVIDENCE_ROOT
  };

  const startedAt = nowIso();
  const results = [];
  for (const definition of definitions(fixture)) {
    results.push(await runTest(browser, metadata, definition));
  }
  await browser.close();

  const summary = {
    schemaVersion: "zoia.playwright-broad-rebaseline-evidence-result.v0",
    status: results.every((result) => result.status === PASS_STATUS) ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    metadata,
    testCount: results.length,
    passCount: results.filter((result) => result.status === PASS_STATUS).length,
    failCount: results.filter((result) => result.status === FAIL_STATUS).length,
    tests: results.map((result) => ({ id: result.id, name: result.name, status: result.status, artifacts: result.artifacts, error: result.error || null }))
  };
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), summary);
  console.log(JSON.stringify(summary, null, JSON_SPACES));
  if (summary.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
