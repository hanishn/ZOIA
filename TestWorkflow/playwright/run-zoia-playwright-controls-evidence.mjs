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
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "TestWorkflow", "evidence", "q078-controls-slice");
const EDGE_CHANNEL = "msedge";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const COMMAND = "npm run zoia:test:playwright:controls";
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const JSON_SPACES = 2;
const EXPECTED_DEMO_PATCH_NAME = "Demo: Tremolo + Filter";
const PARAM_RAW_TOLERANCE = 2;

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

async function loadSimulator(page) {
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.MODULE_DB && window.ZOIA.state), null, { timeout: 10000 });
  await page.locator(".view-btn[data-view='hw']").click();
  await page.waitForFunction(() => document.querySelectorAll("#dual-grid-area .grid-btn").length === 80, null, { timeout: 10000 });
}

async function loadDemoPatch(page) {
  await page.getByRole("button", { name: "Demo Patch" }).click();
  await page.waitForFunction((name) => window.ZOIA?.state?.patch?.name === name, EXPECTED_DEMO_PATCH_NAME, { timeout: 10000 });
}

async function installControlPatch(page) {
  await page.evaluate(() => {
    const DB = window.ZOIA.MODULE_DB;
    const modules = [
      { idx: 0, typeIdx: 45, page: 0, colorId: 4, gridPos: 0, name: "Page0 Value", typeName: "Value", blocks: DB[45].blocks, blockCount: DB[45].blocks.length, category: "CV", params: [32768], options: [0,0,0,0,0,0,0,0], paramCount: 1 },
      { idx: 1, typeIdx: 45, page: 1, colorId: 5, gridPos: 0, name: "Page1 Value", typeName: "Value", blocks: DB[45].blocks, blockCount: DB[45].blocks.length, category: "CV", params: [32768], options: [0,0,0,0,0,0,0,0], paramCount: 1 },
      { idx: 2, typeIdx: 16, page: 0, colorId: 6, gridPos: 8, name: "Evidence Keyboard", typeName: "Keyboard", blocks: DB[16].blocks, blockCount: DB[16].blocks.length, category: "Interface", params: [], options: [0,0,0,0,0,0,0,0], paramCount: 0 }
    ];
    window.ZOIA.loadPatch({ name: "Q078 Control Patch", moduleCount: modules.length, modules, connections: [], pages: ["Page A", "Page B"] });
    window.ZOIA.viewManager.switchView("hw");
  });
  await page.waitForFunction(() => window.ZOIA?.state?.patch?.name === "Q078 Control Patch", null, { timeout: 10000 });
}

async function installMidiPatchWithStub(page) {
  await installControlPatch(page);
  await page.evaluate(() => {
    window.__q078MidiEvents = [];
    window.ZOIA.sim = {
      running: true,
      nodes: [
        null,
        null,
        {
          noteOn(note) { window.__q078MidiEvents.push({ type: "noteOn", note }); },
          noteOff() { window.__q078MidiEvents.push({ type: "noteOff" }); }
        }
      ]
    };
    window.ZOIA.midiKeyboard.render();
  });
  await page.waitForSelector("#midi-keyboard .midi-kb-key", { timeout: 10000 });
}

async function snapshotState(page, path) {
  const state = await page.evaluate(() => {
    const z = window.ZOIA;
    const patch = z.state.patch;
    const selected = z.state.selectedModule !== null && patch.modules[z.state.selectedModule]
      ? patch.modules[z.state.selectedModule]
      : null;
    return {
      title: document.title,
      currentView: z.state.currentView,
      currentPage: z.state.currentPage,
      secondaryPage: z.state.secondaryPage,
      selectedModule: z.state.selectedModule,
      selectedBlock: z.state.selectedBlock,
      bypassed: Boolean(z.state.bypassed),
      selectedModuleSummary: selected ? {
        idx: selected.idx,
        name: selected.name,
        typeIdx: selected.typeIdx,
        blockCount: selected.blockCount,
        params: selected.params || []
      } : null,
      patch: {
        name: patch.name,
        moduleCount: patch.moduleCount,
        modules: patch.modules.map((m) => ({
          idx: m.idx,
          typeIdx: m.typeIdx,
          name: m.name,
          typeName: m.typeName,
          page: m.page,
          gridPos: m.gridPos,
          blockCount: m.blockCount,
          params: m.params || [],
          options: m.options || []
        })),
        connectionCount: patch.connections.length,
        pages: patch.pages.slice()
      },
      controls: {
        paramInputValue: document.querySelector("#param-input")?.value || null,
        pageSelectValue: document.querySelector("#page-select")?.value || null,
        midiKeyboardVisible: Boolean(document.querySelector("#midi-keyboard")),
        midiBaseOctave: z.midiKeyboard ? z.midiKeyboard._baseOctave : null,
        midiActiveNote: z.midiKeyboard ? z.midiKeyboard._activeNote : null,
        midiReadout: document.querySelector("#midi-kb-readout")?.textContent?.trim() || null,
        midiKeyCount: document.querySelectorAll("#midi-keyboard .midi-kb-key").length,
        midiEvents: window.__q078MidiEvents ? window.__q078MidiEvents.slice() : []
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

async function runTest(browser, metadata, definition) {
  const testDir = resolve(EVIDENCE_ROOT, definition.id);
  await mkdir(testDir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() }));
  page.on("pageerror", (error) => pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null }));
  const steps = [];
  const recordStep = async (description, action) => {
    const startedAt = nowIso();
    await action();
    steps.push({ description, startedAt, completedAt: nowIso() });
  };
  const resultPath = resolve(testDir, "result.json");
  try {
    const runArtifacts = await definition.run({ page, recordStep, testDir }) || {};
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
      artifacts: { ...runArtifacts, finalScreenshotPath: finalArtifacts.screenshotPath, finalDomSnapshotPath: finalArtifacts.domPath, finalStateSnapshotPath: finalArtifacts.statePath, consoleLogPath: consolePath, resultPath },
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

function definitions() {
  return [
    {
      id: "parameter-editing",
      name: "Parameter Editing",
      assertions: [
        "selecting the Trem Depth value block exposes a parameter input",
        "entering 0.25 through the UI updates module params",
        "stored raw value matches normalized 0.25 within tolerance"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and demo patch", async () => { await loadSimulator(page); await loadDemoPatch(page); });
        await recordStep("Select Trem Depth value block", async () => { await page.locator('#dual-grid-area .grid-btn.occupied[data-mod-idx="6"]').first().click(); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Enter 0.25 in param input and commit blur", async () => {
          await page.locator("#param-input").fill("0.25");
          await page.locator("#param-input").press("Enter");
        });
        await page.waitForFunction(() => Math.abs((window.ZOIA.state.patch.modules[6].params[0] || 0) - Math.round(0.25 * 65535)) <= 2, null, { timeout: 10000 });
        const after = await snapshotState(page, resolve(testDir, "after-state.json"));
        const expectedRaw = Math.round(0.25 * 65535);
        const actualRaw = after.patch.modules[6].params[0];
        assertEvidence(before.selectedModule === 6 && before.selectedBlock === 0, "Trem Depth value block must be selected before editing", { before });
        assertEvidence(Math.abs(actualRaw - expectedRaw) <= PARAM_RAW_TOLERANCE, "Parameter raw value must reflect 0.25 input", { expectedRaw, actualRaw });
        return { beforeStatePath: resolve(testDir, "before-state.json"), afterStatePath: resolve(testDir, "after-state.json") };
      }
    },
    {
      id: "page-navigation",
      name: "Page Navigation",
      assertions: [
        "blank page selection creates a new page and navigates to it",
        "page-left and page-right controls update currentPage",
        "page selector remains synchronized with currentPage"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and deterministic control patch", async () => { await loadSimulator(page); await installControlPatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Select + Blank Page in page selector", async () => { await page.locator("#page-select").selectOption("blank"); });
        await page.waitForFunction(() => window.ZOIA.state.patch.pages.length === 3 && window.ZOIA.state.currentPage === 2, null, { timeout: 10000 });
        const afterBlank = await snapshotState(page, resolve(testDir, "after-blank-state.json"));
        await recordStep("Click page left control", async () => { await page.locator("#page-nav-row .util-btn").first().click(); });
        await page.waitForFunction(() => window.ZOIA.state.currentPage === 1, null, { timeout: 10000 });
        const afterLeft = await snapshotState(page, resolve(testDir, "after-left-state.json"));
        await recordStep("Click page right control", async () => { await page.locator("#page-nav-row .util-btn").nth(1).click(); });
        await page.waitForFunction(() => window.ZOIA.state.currentPage === 2, null, { timeout: 10000 });
        const afterRight = await snapshotState(page, resolve(testDir, "after-right-state.json"));
        assertEvidence(afterBlank.patch.pages.length === before.patch.pages.length + 1, "Blank page must add one page", { beforePages: before.patch.pages, afterPages: afterBlank.patch.pages });
        assertEvidence(afterLeft.currentPage === 1 && afterRight.currentPage === 2, "Page left/right must move current page deterministically", { afterLeft, afterRight });
        assertEvidence(afterRight.controls.pageSelectValue === "2", "Page selector value must match current page", { pageSelectValue: afterRight.controls.pageSelectValue });
        return { beforeStatePath: resolve(testDir, "before-state.json"), afterBlankStatePath: resolve(testDir, "after-blank-state.json"), afterLeftStatePath: resolve(testDir, "after-left-state.json"), afterRightStatePath: resolve(testDir, "after-right-state.json") };
      }
    },
    {
      id: "stomp-switch-combos",
      name: "Stomp Switch And Combo Behavior",
      assertions: [
        "select stomp selects the first page module",
        "scroll stomp advances selected block",
        "bypass stomp toggles bypass state",
        "select+scroll combo advances selected module",
        "scroll+bypass combo advances page when another page exists"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator and deterministic control patch", async () => { await loadSimulator(page); await installControlPatch(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Click Select stomp", async () => { await page.locator('.stomp-btn[title^="Select"]').click(); });
        await page.waitForFunction(() => window.ZOIA.state.selectedModule === 0, null, { timeout: 10000 });
        const afterSelect = await snapshotState(page, resolve(testDir, "after-select-state.json"));
        await recordStep("Click Scroll stomp", async () => { await page.locator('.stomp-btn[title^="Scroll"]').click(); });
        const afterScroll = await snapshotState(page, resolve(testDir, "after-scroll-state.json"));
        await recordStep("Click Bypass stomp", async () => { await page.locator('.stomp-btn[title^="Bypass"]').click(); });
        await page.waitForFunction(() => window.ZOIA.state.bypassed === true, null, { timeout: 10000 });
        const afterBypass = await snapshotState(page, resolve(testDir, "after-bypass-state.json"));
        await recordStep("Click Select+Scroll combo", async () => { await page.locator('.combo-stomp[title^="Combo: Select+Scroll"]').click(); });
        await page.waitForFunction(() => window.ZOIA.state.selectedModule === 2, null, { timeout: 10000 });
        const afterSelectScroll = await snapshotState(page, resolve(testDir, "after-select-scroll-state.json"));
        await recordStep("Click Scroll+Bypass combo", async () => { await page.locator('.combo-stomp[title^="Combo: Scroll+Bypass"]').click(); });
        await page.waitForFunction(() => window.ZOIA.state.currentPage === 1, null, { timeout: 10000 });
        const afterPageCombo = await snapshotState(page, resolve(testDir, "after-page-combo-state.json"));
        assertEvidence(before.selectedModule === null, "Initial selected module should be null", { before });
        assertEvidence(afterSelect.selectedModule === 0, "Select stomp must select first module", { afterSelect });
        assertEvidence(afterScroll.selectedModule === 0 && afterScroll.selectedBlock === 0, "Scroll stomp must keep valid selected block for one-block module", { afterScroll });
        assertEvidence(afterBypass.bypassed === true, "Bypass stomp must set bypass state true", { afterBypass });
        assertEvidence(afterSelectScroll.selectedModule === 2, "Select+Scroll combo must advance to next module on page", { afterSelectScroll });
        assertEvidence(afterPageCombo.currentPage === 1 && afterPageCombo.selectedModule === null, "Scroll+Bypass combo must advance page and clear selection", { afterPageCombo });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterSelectStatePath: resolve(testDir, "after-select-state.json"),
          afterScrollStatePath: resolve(testDir, "after-scroll-state.json"),
          afterBypassStatePath: resolve(testDir, "after-bypass-state.json"),
          afterSelectScrollStatePath: resolve(testDir, "after-select-scroll-state.json"),
          afterPageComboStatePath: resolve(testDir, "after-page-combo-state.json")
        };
      }
    },
    {
      id: "midi-keyboard-interaction",
      name: "MIDI Keyboard Interaction",
      assertions: [
        "MIDI keyboard renders with deterministic key count",
        "octave up changes base octave and label",
        "mouse down on C5 emits noteOn to stub node and marks key active",
        "mouse up emits noteOff and clears active note"
      ],
      run: async ({ page, recordStep, testDir }) => {
        await recordStep("Load simulator, control patch, and stubbed MIDI sim node", async () => { await loadSimulator(page); await installMidiPatchWithStub(page); });
        const before = await snapshotState(page, resolve(testDir, "before-state.json"));
        await recordStep("Click octave up", async () => { await page.locator("#midi-keyboard .midi-kb-oct-btn").nth(1).click(); });
        await page.waitForFunction(() => window.ZOIA.midiKeyboard._baseOctave === 4, null, { timeout: 10000 });
        const afterOctave = await snapshotState(page, resolve(testDir, "after-octave-state.json"));
        const key = page.locator('#midi-kb-piano .midi-kb-key[data-note="72"]');
        await recordStep("Press C5 key", async () => {
          const box = await key.boundingBox();
          assertEvidence(Boolean(box), "C5 key must have bounding box");
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
        });
        await page.waitForFunction(() => window.__q078MidiEvents?.some((event) => event.type === "noteOn" && event.note === 72), null, { timeout: 10000 });
        const afterNoteOn = await snapshotState(page, resolve(testDir, "after-note-on-state.json"));
        await recordStep("Release C5 key", async () => { await page.mouse.up(); });
        await page.waitForFunction(() => window.__q078MidiEvents?.some((event) => event.type === "noteOff"), null, { timeout: 10000 });
        const afterNoteOff = await snapshotState(page, resolve(testDir, "after-note-off-state.json"));
        assertEvidence(before.controls.midiKeyboardVisible && before.controls.midiKeyCount === 25, "MIDI keyboard must render 25 keys", { before: before.controls });
        assertEvidence(afterOctave.controls.midiBaseOctave === 4, "Octave up must increment base octave", { afterOctave: afterOctave.controls });
        assertEvidence(afterNoteOn.controls.midiActiveNote === 72 && afterNoteOn.controls.midiEvents.some((event) => event.type === "noteOn" && event.note === 72), "C5 press must emit noteOn and set active note", { afterNoteOn: afterNoteOn.controls });
        assertEvidence(afterNoteOff.controls.midiActiveNote === null && afterNoteOff.controls.midiEvents.some((event) => event.type === "noteOff"), "C5 release must emit noteOff and clear active note", { afterNoteOff: afterNoteOff.controls });
        return {
          beforeStatePath: resolve(testDir, "before-state.json"),
          afterOctaveStatePath: resolve(testDir, "after-octave-state.json"),
          afterNoteOnStatePath: resolve(testDir, "after-note-on-state.json"),
          afterNoteOffStatePath: resolve(testDir, "after-note-off-state.json")
        };
      }
    }
  ];
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
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
  for (const definition of definitions()) results.push(await runTest(browser, metadata, definition));
  await browser.close();

  const summary = {
    schemaVersion: "zoia.playwright-controls-evidence-result.v0",
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
