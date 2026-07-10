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
const MANIFEST_PATH = resolve(PROJECT_ROOT, "tests/workflow", "canonical-patches", "Test_Modules.manifest.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow", "evidence", "q102-canonical-staged-deep-baseline");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const COMMAND = "npm run zoia:test:playwright:staged-deep";
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const CLASSIFIED_STATUS = "classified";
const JSON_SPACES = 2;
const EXPECTED_HARDWARE_GRID_BUTTON_COUNT = 80;
const EXPECTED_SCHEMATIC_GRID_CELL_COUNT_PER_SIDE = 40;
const PATCH_TIMEOUT_MS = 15000;
const SIM_START_WAIT_MS = 750;
const FIRST_MODULE_INDEX = 0;
const FIRST_BLOCK_INDEX = 0;
const AUDIO_SAMPLE_EVIDENCE_IMPLEMENTED = false;

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
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (!manifest.canonicalRoot || files.length === 0) {
    throw new Error(`Canonical fixture manifest has no files: ${MANIFEST_PATH}`);
  }
  const canonicalRootPath = resolve(PROJECT_ROOT, manifest.canonicalRoot);
  const byRelativePath = new Map(files.map((file) => [String(file.relativePath).toLowerCase(), file]));
  const fixtures = files
    .filter((file) => String(file.relativePath).toLowerCase().endsWith(".bin"))
    .map((binFile) => {
      const relativePath = String(binFile.relativePath);
      const parts = relativePath.split(/[\\/]/);
      const fileName = parts[parts.length - 1];
      const pairId = fileName.replace(/\.bin$/i, "");
      const category = parts.length > 1 ? parts.slice(0, -1).join("/") : "_root";
      const jsonRelativePath = relativePath.replace(/\.bin$/i, ".json");
      const jsonFile = byRelativePath.get(jsonRelativePath.toLowerCase());
      return {
        pairId,
        category,
        binPath: resolve(canonicalRootPath, relativePath),
        jsonPath: jsonFile ? resolve(canonicalRootPath, jsonFile.relativePath) : null,
        binSha256: String(binFile.sha256).toLowerCase(),
        jsonSha256: jsonFile ? String(jsonFile.sha256).toLowerCase() : null,
        binSize: binFile.size,
        jsonSize: jsonFile ? jsonFile.size : null,
        readOnlySource: true,
        pairStatus: jsonFile ? "paired" : "missing-json",
        canonicalRoot: canonicalRootPath,
        sourceArchive: manifest.sourceArchive,
        canonicalManifestPath: MANIFEST_PATH
      };
    });
  return { ...manifest, fixtures };
}

async function loadSimulator(page) {
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.MODULE_DB && window.ZOIA.state), null, { timeout: PATCH_TIMEOUT_MS });
  await page.locator(".view-btn[data-view='hw']").click();
  await page.waitForFunction(
    (expectedCount) => document.querySelectorAll("#dual-grid-area .grid-btn").length === expectedCount,
    EXPECTED_HARDWARE_GRID_BUTTON_COUNT,
    { timeout: PATCH_TIMEOUT_MS }
  );
}

async function captureDom(page, path) {
  await writeText(path, await page.evaluate(() => document.documentElement.outerHTML));
}

async function snapshotState(page, path, label) {
  const state = await page.evaluate((snapshotLabel) => {
    const zoia = window.ZOIA;
    const patch = zoia.state.patch;
    const currentPage = zoia.state.currentPage;
    const secondaryPage = zoia.state.secondaryPage;
    const visibleConnectionCountForPage = (pageIndex) => {
      if (!patch) return 0;
      return patch.connections.filter((connection) => {
        const sourceModule = patch.modules[connection.srcMod];
        const destinationModule = patch.modules[connection.dstMod];
        if (!sourceModule || !destinationModule) return false;
        if (sourceModule.page !== pageIndex || destinationModule.page !== pageIndex) return false;
        const sourceBlockCount = sourceModule.blockCount || (sourceModule.blocks ? sourceModule.blocks.length : 1);
        const destinationBlockCount = destinationModule.blockCount || (destinationModule.blocks ? destinationModule.blocks.length : 1);
        return connection.srcBlock < sourceBlockCount && connection.dstBlock < destinationBlockCount;
      }).length;
    };
    const moduleToSnapshot = (module) => ({
      idx: module.idx,
      typeIdx: module.typeIdx,
      name: module.name,
      typeName: module.typeName,
      category: module.category,
      page: module.page,
      gridPos: module.gridPos,
      blockCount: module.blockCount,
      paramCount: module.params ? module.params.length : 0,
      blockNames: module.blocks ? module.blocks.map((block) => block.n) : []
    });
    return {
      label: snapshotLabel,
      title: document.title,
      zoiaVersion: zoia.VERSION || null,
      currentView: zoia.state.currentView,
      currentPage,
      secondaryPage,
      selectedModule: zoia.state.selectedModule,
      selectedBlock: zoia.state.selectedBlock,
      selectedConnection: zoia.state.selectedConnection,
      mode: zoia.state.mode || null,
      patch: patch ? {
        name: patch.name,
        moduleCount: patch.moduleCount,
        actualModuleCount: patch.modules.length,
        connectionCount: patch.connections.length,
        pageCount: patch.pages.length,
        pages: patch.pages.slice(),
        modules: patch.modules.map(moduleToSnapshot),
        connections: patch.connections.map((connection) => ({ ...connection }))
      } : null,
      hardware: {
        patchSummaryText: document.querySelector("#patch-summary")?.textContent?.replace(/\s+/g, " ").trim() || null,
        gridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn").length,
        occupiedGridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn.occupied").length,
        selectedGridButtonCount: document.querySelectorAll("#dual-grid-area .grid-btn.selected").length,
        pageSelectOptionCount: document.querySelectorAll("#page-select option").length,
        oledText: document.querySelector("#oled")?.textContent?.replace(/\s+/g, " ").trim() || null,
        paramInputValue: document.querySelector("#param-input")?.value || null,
        paramInputLabel: document.querySelector("#param-input-area .param-label")?.textContent?.replace(/\s+/g, " ").trim() || null
      },
      schematic: {
        leftCellCount: document.querySelectorAll("#sch-grid-left .cell").length,
        rightCellCount: document.querySelectorAll("#sch-grid-right .cell").length,
        occupiedCellCount: document.querySelectorAll("#sch-grid-left .cell.occupied, #sch-grid-right .cell.occupied").length,
        moduleListItemCount: document.querySelectorAll("#sch-module-list .module-item").length,
        pageTabCount: document.querySelectorAll("#sch-page-tabs .page-tab").length,
        leftConnectionPathCount: document.querySelectorAll("#sch-svg-overlay-left path.conn-hover").length,
        rightConnectionPathCount: document.querySelectorAll("#sch-svg-overlay-right path.conn-hover").length,
        expectedLeftConnectionPathCount: visibleConnectionCountForPage(currentPage),
        expectedRightConnectionPathCount: visibleConnectionCountForPage(secondaryPage),
        moduleDetailText: document.querySelector("#sch-module-detail")?.textContent?.replace(/\s+/g, " ").trim() || null,
        patchInfoText: document.querySelector("#sch-patch-info")?.textContent?.replace(/\s+/g, " ").trim() || null,
        connectionFilterButtons: Array.from(document.querySelectorAll(".toggle-btn[data-type]")).map((button) => ({
          type: button.dataset.type,
          on: button.classList.contains("on")
        }))
      },
      patchBrowser: {
        modalVisible: document.querySelector("#pb-modal")?.classList.contains("visible") || false,
        searchValue: document.querySelector("#pb-search")?.value || "",
        countText: document.querySelector("#pb-count")?.textContent?.replace(/\s+/g, " ").trim() || null,
        listItemCount: document.querySelectorAll("#pb-list .pb-item").length,
        hasPublicApi: Boolean(zoia.patchBrowser && typeof zoia.patchBrowser.open === "function" && typeof zoia.patchBrowser.close === "function")
      },
      playability: {
        simApiPresent: Boolean(zoia.sim && typeof zoia.sim.toggle === "function" && typeof zoia.sim.start === "function" && typeof zoia.sim.stop === "function"),
        simStatusText: document.querySelector("#sim-status")?.textContent?.replace(/\s+/g, " ").trim() || null,
        simToggleText: document.querySelector("#sim-toggle")?.textContent?.replace(/\s+/g, " ").trim() || null,
        simRunning: Boolean(zoia.sim && zoia.sim.running),
        simNodeCount: zoia.sim && zoia.sim.nodes ? zoia.sim.nodes.length : null,
        simConnectionGainCount: zoia.sim && zoia.sim.connGains ? zoia.sim.connGains.length : null,
        audioContextState: zoia.sim && zoia.sim.ctx ? zoia.sim.ctx.state : null,
        audioSampleEvidenceImplemented: false
      },
      moduleCatalog: {
        count: Object.keys(zoia.MODULE_DB || {}).length
      }
    };
  }, label);
  await writeJson(path, state);
  return state;
}

async function captureArtifacts(page, testDir, prefix) {
  const screenshotPath = resolve(testDir, `${prefix}-screenshot.png`);
  const domPath = resolve(testDir, `${prefix}-dom.html`);
  const statePath = resolve(testDir, `${prefix}-state.json`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await captureDom(page, domPath);
  const state = await snapshotState(page, statePath, prefix);
  return { screenshotPath, domPath, statePath, state };
}

async function writeConsole(testDir, consoleEntries, prefix = "console") {
  const consolePath = resolve(testDir, `${prefix}.json`);
  await writeJson(consolePath, consoleEntries);
  return consolePath;
}

function assertCondition(failures, condition, surface, message, evidence = null) {
  if (condition) return;
  failures.push({ surface, message, evidence });
}

function countConsoleErrors(consoleEntries) {
  return consoleEntries.filter((entry) => entry.type === "error").length;
}

async function runPatch(browser, metadata, fixture) {
  const patchDir = resolve(EVIDENCE_ROOT, sanitizePathPart(fixture.category), sanitizePathPart(fixture.pairId));
  await mkdir(patchDir, { recursive: true });

  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  let fixtureReference = null;
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
    fixtureReference = {
      pairId: fixture.pairId,
      category: fixture.category,
      binPath: fixture.binPath,
      jsonPath: fixture.jsonPath,
      manifestSha256: fixture.binSha256,
      observedSha256,
      observedBytes: fixtureBytes.length,
      readOnlySource: fixture.readOnlySource,
      pairStatus: fixture.pairStatus,
      canonicalRoot: fixture.canonicalRoot,
      sourceArchive: fixture.sourceArchive,
      canonicalManifestPath: fixture.canonicalManifestPath
    };
    await writeJson(resolve(patchDir, "fixture-reference.json"), fixtureReference);

    await recordStep("Load ZOIA HTML simulator", async () => { await loadSimulator(page); });
    await recordStep("Import staged .bin through browser file input", async () => {
      await page.locator("#file-input").setInputFiles(fixture.binPath);
    });
    await page.waitForFunction(
      (expectedCount) => Boolean(window.ZOIA?.state?.patch && document.querySelectorAll("#dual-grid-area .grid-btn").length === expectedCount),
      EXPECTED_HARDWARE_GRID_BUTTON_COUNT,
      { timeout: PATCH_TIMEOUT_MS }
    );
    const hardwareArtifacts = await captureArtifacts(page, patchDir, "hardware-after-import");
    const hardwareState = hardwareArtifacts.state;
    const importedPatch = hardwareState.patch;
    if (importedPatch && importedPatch.actualModuleCount === 0) {
      const consolePath = await writeConsole(patchDir, consoleEntries);
      const result = {
        schemaVersion: "zoia.playwright-staged-deep-patch-result.v0",
        pairId: fixture.pairId,
        category: fixture.category,
        status: CLASSIFIED_STATUS,
        classification: "empty-audit-fixture",
        startedAt,
        completedAt: nowIso(),
        command: COMMAND,
        metadata,
        fixtureReference,
        inputSteps,
        assertions: [
          "fixture hash matches manifest hash",
          "browser import path loads the staged .bin through #file-input",
          "empty audit fixture is classified rather than treated as an emulator render failure"
        ],
        assertionFailures: [],
        classificationEvidence: {
          reason: "Imported patch contains zero modules and zero connections. Matching JSON also declares zero modules and zero connections.",
          patchName: importedPatch.name,
          moduleCount: importedPatch.actualModuleCount,
          connectionCount: importedPatch.connectionCount,
          pageCount: importedPatch.pageCount
        },
        audioEvidenceBoundary: {
          audioSignalMeasured: AUDIO_SAMPLE_EVIDENCE_IMPLEMENTED,
          audioBehaviorClaim: false,
          reason: "This slice records simulator API/status/node indicators only. It does not capture or fingerprint audio output."
        },
        artifacts: {
          fixtureReferencePath: resolve(patchDir, "fixture-reference.json"),
          hardwareScreenshotPath: hardwareArtifacts.screenshotPath,
          hardwareDomSnapshotPath: hardwareArtifacts.domPath,
          hardwareStateSnapshotPath: hardwareArtifacts.statePath,
          consoleLogPath: consolePath,
          resultPath
        },
        observedStateSummary: {
          patchName: importedPatch.name,
          moduleCount: importedPatch.moduleCount,
          connectionCount: importedPatch.connectionCount,
          pageCount: importedPatch.pageCount,
          occupiedGridButtonCount: hardwareState.hardware.occupiedGridButtonCount,
          visibleConnectionPathCount: 0,
          expectedVisibleConnectionPathCount: 0,
          simNodeCount: 0,
          simConnectionGainCount: 0,
          audioContextState: null
        }
      };
      await writeJson(resultPath, result);
      await context.close();
      return result;
    }

    await recordStep("Select first module in hardware view", async () => {
      await page.evaluate((selection) => {
        window.ZOIA.hardwareView.selectModule(selection.moduleIndex, selection.blockIndex);
      }, { moduleIndex: FIRST_MODULE_INDEX, blockIndex: FIRST_BLOCK_INDEX });
    });
    const hardwareSelectionArtifacts = await captureArtifacts(page, patchDir, "hardware-selected-module");

    await recordStep("Open patch browser and exercise search control", async () => {
      await page.evaluate(() => window.ZOIA.patchBrowser.open());
      await page.waitForSelector("#pb-modal.visible", { timeout: PATCH_TIMEOUT_MS });
      await page.locator("#pb-search").fill("verification");
    });
    const patchBrowserArtifacts = await captureArtifacts(page, patchDir, "patch-browser-open");
    await recordStep("Close patch browser", async () => {
      await page.evaluate(() => window.ZOIA.patchBrowser.close());
    });

    await recordStep("Switch to schematic view", async () => {
      await page.locator(".view-btn[data-view='sch']").click();
      await page.waitForSelector("#sch-dual-grid-area", { timeout: PATCH_TIMEOUT_MS });
    });
    const schematicArtifacts = await captureArtifacts(page, patchDir, "schematic-rendered");

    await recordStep("Select first module in schematic view", async () => {
      await page.evaluate((moduleIndex) => {
        if (window.ZOIA.state.selectedModule !== moduleIndex) {
          window.ZOIA.schematicView.selectModule(moduleIndex);
        } else {
          window.ZOIA.schematicView.renderModuleDetail();
        }
      }, FIRST_MODULE_INDEX);
    });
    const schematicSelectionArtifacts = await captureArtifacts(page, patchDir, "schematic-selected-module");

    await recordStep("Start and stop playability indicator path", async () => {
      await page.evaluate(() => {
        if (window.ZOIA?.sim?.running) window.ZOIA.sim.stop();
        window.ZOIA.sim.start();
      });
      await page.waitForTimeout(SIM_START_WAIT_MS);
    });
    const playabilityArtifacts = await captureArtifacts(page, patchDir, "playability-started");
    await recordStep("Stop playability indicator path", async () => {
      await page.evaluate(() => {
        if (window.ZOIA?.sim?.running) window.ZOIA.sim.stop();
      });
    });
    const finalArtifacts = await captureArtifacts(page, patchDir, "final");
    const consolePath = await writeConsole(patchDir, consoleEntries);

    const selectedHardwareState = hardwareSelectionArtifacts.state;
    const patchBrowserState = patchBrowserArtifacts.state;
    const schematicState = schematicArtifacts.state;
    const selectedSchematicState = schematicSelectionArtifacts.state;
    const playabilityState = playabilityArtifacts.state;
    const assertionFailures = [];
    const patch = hardwareState.patch;
    const visiblePathCount = schematicState.schematic.leftConnectionPathCount + schematicState.schematic.rightConnectionPathCount;
    const expectedVisiblePathCount = schematicState.schematic.expectedLeftConnectionPathCount + schematicState.schematic.expectedRightConnectionPathCount;

    assertCondition(assertionFailures, observedSha256 === fixture.binSha256, "fixture", "fixture hash did not match manifest hash", { observedSha256, manifestSha256: fixture.binSha256 });
    assertCondition(assertionFailures, Boolean(patch?.name), "import", "imported patch name is empty", { patchName: patch?.name || null });
    assertCondition(assertionFailures, Boolean(patch && patch.moduleCount > 0 && patch.actualModuleCount === patch.moduleCount), "model", "module count is invalid or inconsistent", { moduleCount: patch?.moduleCount || null, actualModuleCount: patch?.actualModuleCount || null });
    assertCondition(assertionFailures, Boolean(patch && patch.pageCount > 0), "model", "page count is invalid", { pageCount: patch?.pageCount || null });
    assertCondition(assertionFailures, hardwareState.hardware.gridButtonCount === EXPECTED_HARDWARE_GRID_BUTTON_COUNT, "hardware", "hardware grid did not render expected buttons", { observed: hardwareState.hardware.gridButtonCount, expected: EXPECTED_HARDWARE_GRID_BUTTON_COUNT });
    assertCondition(assertionFailures, hardwareState.hardware.occupiedGridButtonCount > 0, "hardware", "hardware grid has no occupied buttons", { observed: hardwareState.hardware.occupiedGridButtonCount });
    assertCondition(assertionFailures, selectedHardwareState.selectedModule === FIRST_MODULE_INDEX && selectedHardwareState.selectedBlock === FIRST_BLOCK_INDEX, "controls", "hardware module selection did not update ZOIA state", { selectedModule: selectedHardwareState.selectedModule, selectedBlock: selectedHardwareState.selectedBlock });
    assertCondition(assertionFailures, Boolean(selectedHardwareState.hardware.oledText && selectedHardwareState.hardware.oledText.length > 0), "controls", "hardware OLED/control text did not render after module selection", { oledText: selectedHardwareState.hardware.oledText });
    assertCondition(assertionFailures, patchBrowserState.patchBrowser.modalVisible, "patch-browser", "patch browser modal did not open", patchBrowserState.patchBrowser);
    assertCondition(assertionFailures, patchBrowserState.patchBrowser.hasPublicApi, "patch-browser", "patch browser public API missing", patchBrowserState.patchBrowser);
    assertCondition(assertionFailures, patchBrowserState.patchBrowser.searchValue === "verification", "patch-browser", "patch browser search control did not accept input", patchBrowserState.patchBrowser);
    assertCondition(assertionFailures, schematicState.schematic.leftCellCount === EXPECTED_SCHEMATIC_GRID_CELL_COUNT_PER_SIDE, "schematic", "left schematic grid cell count mismatch", { observed: schematicState.schematic.leftCellCount, expected: EXPECTED_SCHEMATIC_GRID_CELL_COUNT_PER_SIDE });
    assertCondition(assertionFailures, schematicState.schematic.rightCellCount === EXPECTED_SCHEMATIC_GRID_CELL_COUNT_PER_SIDE, "schematic", "right schematic grid cell count mismatch", { observed: schematicState.schematic.rightCellCount, expected: EXPECTED_SCHEMATIC_GRID_CELL_COUNT_PER_SIDE });
    assertCondition(assertionFailures, schematicState.schematic.moduleListItemCount === patch.moduleCount, "schematic", "schematic module list count did not match patch module count", { observed: schematicState.schematic.moduleListItemCount, expected: patch.moduleCount });
    assertCondition(assertionFailures, schematicState.schematic.pageTabCount === patch.pageCount, "schematic", "schematic page tabs did not match patch page count", { observed: schematicState.schematic.pageTabCount, expected: patch.pageCount });
    assertCondition(assertionFailures, visiblePathCount === expectedVisiblePathCount, "signal-flow", "visible schematic connection path count did not match resolved same-page connection count", { observed: visiblePathCount, expected: expectedVisiblePathCount });
    assertCondition(assertionFailures, selectedSchematicState.selectedModule === FIRST_MODULE_INDEX, "schematic", "schematic module selection did not update ZOIA state", { selectedModule: selectedSchematicState.selectedModule });
    assertCondition(assertionFailures, Boolean(selectedSchematicState.schematic.moduleDetailText && selectedSchematicState.schematic.moduleDetailText.includes("Module")), "schematic", "schematic module detail did not render selected module", { moduleDetailText: selectedSchematicState.schematic.moduleDetailText });
    assertCondition(assertionFailures, playabilityState.playability.simApiPresent, "playability", "simulation API was not present", playabilityState.playability);
    assertCondition(assertionFailures, playabilityState.playability.simRunning, "playability", "simulation did not enter running state", playabilityState.playability);
    assertCondition(assertionFailures, playabilityState.playability.simNodeCount === patch.moduleCount, "playability", "simulation node count did not match module count", { observed: playabilityState.playability.simNodeCount, expected: patch.moduleCount });
    assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
    assertCondition(assertionFailures, countConsoleErrors(consoleEntries) === 0, "runtime", "console emitted error messages", { consoleErrorCount: countConsoleErrors(consoleEntries) });

    const status = assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS;
    const result = {
      schemaVersion: "zoia.playwright-staged-deep-patch-result.v0",
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
        "browser import path loads the staged .bin through #file-input",
        "loaded patch has non-empty name, modules, pages, and stable counts",
        "hardware grid renders 80 buttons and occupied patch blocks",
        "hardware module selection updates ZOIA state and OLED/control text",
        "patch browser opens, exposes public API, and accepts search input",
        "schematic grid renders left and right 40-cell grids",
        "schematic module list, page tabs, and selected module detail match ZOIA state",
        "schematic visible connection paths match resolved same-page connections",
        "simulation API enters running state and creates one node per patch module",
        "page emits no uncaught errors and console emits no error messages"
      ],
      assertionFailures,
      audioEvidenceBoundary: {
        audioSignalMeasured: AUDIO_SAMPLE_EVIDENCE_IMPLEMENTED,
        audioBehaviorClaim: false,
        reason: "This slice records simulator API/status/node indicators only. It does not capture or fingerprint audio output."
      },
      artifacts: {
        fixtureReferencePath: resolve(patchDir, "fixture-reference.json"),
        hardwareScreenshotPath: hardwareArtifacts.screenshotPath,
        hardwareDomSnapshotPath: hardwareArtifacts.domPath,
        hardwareStateSnapshotPath: hardwareArtifacts.statePath,
        hardwareSelectionScreenshotPath: hardwareSelectionArtifacts.screenshotPath,
        hardwareSelectionDomSnapshotPath: hardwareSelectionArtifacts.domPath,
        hardwareSelectionStateSnapshotPath: hardwareSelectionArtifacts.statePath,
        patchBrowserScreenshotPath: patchBrowserArtifacts.screenshotPath,
        patchBrowserDomSnapshotPath: patchBrowserArtifacts.domPath,
        patchBrowserStateSnapshotPath: patchBrowserArtifacts.statePath,
        schematicScreenshotPath: schematicArtifacts.screenshotPath,
        schematicDomSnapshotPath: schematicArtifacts.domPath,
        schematicStateSnapshotPath: schematicArtifacts.statePath,
        schematicSelectionScreenshotPath: schematicSelectionArtifacts.screenshotPath,
        schematicSelectionDomSnapshotPath: schematicSelectionArtifacts.domPath,
        schematicSelectionStateSnapshotPath: schematicSelectionArtifacts.statePath,
        playabilityScreenshotPath: playabilityArtifacts.screenshotPath,
        playabilityDomSnapshotPath: playabilityArtifacts.domPath,
        playabilityStateSnapshotPath: playabilityArtifacts.statePath,
        finalScreenshotPath: finalArtifacts.screenshotPath,
        finalDomSnapshotPath: finalArtifacts.domPath,
        finalStateSnapshotPath: finalArtifacts.statePath,
        consoleLogPath: consolePath,
        resultPath
      },
      observedStateSummary: {
        patchName: patch?.name || null,
        moduleCount: patch?.moduleCount || null,
        connectionCount: patch?.connectionCount || null,
        pageCount: patch?.pageCount || null,
        occupiedGridButtonCount: hardwareState.hardware.occupiedGridButtonCount,
        visibleConnectionPathCount: visiblePathCount,
        expectedVisibleConnectionPathCount: expectedVisiblePathCount,
        simNodeCount: playabilityState.playability.simNodeCount,
        simConnectionGainCount: playabilityState.playability.simConnectionGainCount,
        audioContextState: playabilityState.playability.audioContextState
      }
    };
    await writeJson(resultPath, result);
    await context.close();
    return result;
  } catch (error) {
    const failureArtifacts = await captureArtifacts(page, patchDir, "failure").catch((captureError) => ({ captureError: captureError.message }));
    const consolePath = await writeConsole(patchDir, consoleEntries, "failure-console");
    const result = {
      schemaVersion: "zoia.playwright-staged-deep-patch-result.v0",
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
      audioEvidenceBoundary: {
        audioSignalMeasured: AUDIO_SAMPLE_EVIDENCE_IMPLEMENTED,
        audioBehaviorClaim: false,
        reason: "This slice records simulator API/status/node indicators only. It does not capture or fingerprint audio output."
      },
      artifacts: {
        failureArtifacts,
        failureConsolePath: consolePath,
        resultPath
      },
      fixtureReference
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
  const bySurface = {};
  const byClassification = {};
  for (const result of results) {
    if (!byCategory[result.category]) byCategory[result.category] = { total: 0, pass: 0, fail: 0, classified: 0 };
    byCategory[result.category].total += 1;
    if (result.status === PASS_STATUS) byCategory[result.category].pass += 1;
    else if (result.status === CLASSIFIED_STATUS) {
      byCategory[result.category].classified += 1;
      const classification = result.classification || "classified";
      byClassification[classification] = (byClassification[classification] || 0) + 1;
    } else {
      byCategory[result.category].fail += 1;
    }
    for (const failure of result.assertionFailures || []) {
      if (!bySurface[failure.surface]) bySurface[failure.surface] = 0;
      bySurface[failure.surface] += 1;
    }
  }

  const summary = {
    schemaVersion: "zoia.playwright-staged-deep-baseline-result.v0",
    status: results.some((result) => result.status === FAIL_STATUS) ? FAIL_STATUS : PASS_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    metadata,
    fixtureCount: fixtures.length,
    patchCount: results.length,
    passCount: results.filter((result) => result.status === PASS_STATUS).length,
    classifiedCount: results.filter((result) => result.status === CLASSIFIED_STATUS).length,
    failCount: results.filter((result) => result.status === FAIL_STATUS).length,
    byCategory,
    byClassification,
    bySurface,
    claimBoundaries: {
      audioSignalMeasured: AUDIO_SAMPLE_EVIDENCE_IMPLEMENTED,
      audioBehaviorClaim: false,
      audioSimulationCompletenessClaim: false,
      emulatorCompletenessClaim: false,
      binaryExportFidelityClaim: false,
      publicSharingClaim: false
    },
    tests: results.map((result) => ({
      pairId: result.pairId,
      category: result.category,
      status: result.status,
      classification: result.classification || null,
      assertionFailures: result.assertionFailures || [],
      error: result.error || null,
      artifacts: result.artifacts,
      observedStateSummary: result.observedStateSummary || null,
      audioEvidenceBoundary: result.audioEvidenceBoundary || null
    }))
  };
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), summary);
  console.log(JSON.stringify({
    status: summary.status,
    fixtureCount: summary.fixtureCount,
    passCount: summary.passCount,
    failCount: summary.failCount,
    bySurface: summary.bySurface,
    evidenceRoot: EVIDENCE_ROOT
  }, null, JSON_SPACES));
  if (summary.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
