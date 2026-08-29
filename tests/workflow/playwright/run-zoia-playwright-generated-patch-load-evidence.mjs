#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");
const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_PATCH_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/manual-test-emulator");
const DEFAULT_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-load/run-result.json");
const ENTRY_PATH = resolve(PROJECT_ROOT, "products/zoia/dist/zoia-emulator.html");
const ENTRY_URL = pathToFileURL(ENTRY_PATH).href;
const EDGE_CHANNEL = "msedge";
const JSON_SPACES = 2;

function parseArgs(argv) {
  let patchRoot = DEFAULT_PATCH_ROOT;
  let resultPath = DEFAULT_RESULT_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--patch-root") {
      patchRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }

  return { patchRoot, resultPath };
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function assertCondition(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function main() {
  const { patchRoot, resultPath } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  const startedAt = new Date();
  await mkdir(evidenceRoot, { recursive: true });
  const consoleEntries = [];
  const blockers = [];
  const patches = [];
  const loaded = [];
  let browser = null;

  if (!existsSync(ENTRY_PATH)) {
    blockers.push({
      id: "emulator-dist-missing",
      message: "Built emulator HTML is missing. Run npm run zoia:build first.",
      entryPath: ENTRY_PATH
    });
  }

  if (!existsSync(patchRoot)) {
    blockers.push({
      id: "patch-root-missing",
      message: "Converted generated patch root does not exist.",
      patchRoot
    });
  } else {
    const names = (await readdir(patchRoot)).filter((name) => name.endsWith(".patch.json")).sort();
    for (const name of names) {
      const patchPath = join(patchRoot, name);
      patches.push({ name, patchPath, patch: await readJson(patchPath) });
    }
    if (patches.length === 0) {
      blockers.push({
        id: "patch-root-empty",
        message: "Converted generated patch root does not contain .patch.json files.",
        patchRoot
      });
    }
  }

  if (blockers.length === 0) {
    try {
      browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      page.on("console", (entry) => {
        consoleEntries.push({ type: entry.type(), text: entry.text(), location: entry.location() });
      });
      await page.goto(ENTRY_URL, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean(window.ZOIA?.loadPatch && window.ZOIA?.MODULE_DB), { timeout: 10000 });

      for (const entry of patches) {
        const state = await page.evaluate((patch) => {
          window.ZOIA.loadPatch(patch);
          window.ZOIA.viewManager.switchView("hw");
          const loadedPatch = window.ZOIA.state.patch;
          const summaryText = document.querySelector("#patch-summary")?.textContent || "";
          const renderedButtons = document.querySelectorAll(".grid-btn").length;
          const renderedModuleLabels = Array.from(document.querySelectorAll(".grid-btn .module-name, .grid-btn .module-label, .block-label"))
            .map((el) => el.textContent || "")
            .filter(Boolean);
          return {
            patchName: loadedPatch?.name || null,
            moduleCount: loadedPatch?.modules?.length || 0,
            patchModuleCount: loadedPatch?.moduleCount || 0,
            connectionCount: loadedPatch?.connections?.length || 0,
            pageCount: loadedPatch?.pages?.length || 0,
            summaryText,
            renderedButtons,
            renderedModuleLabels
          };
        }, entry.patch);

        assertCondition(state.patchName === entry.patch.name, "Generated emulator patch did not load with the expected name.", {
          patchPath: entry.patchPath,
          expectedName: entry.patch.name,
          state
        });
        assertCondition(state.moduleCount === entry.patch.modules.length, "Loaded generated patch module count does not match the converted patch.", {
          patchPath: entry.patchPath,
          expectedModuleCount: entry.patch.modules.length,
          state
        });
        assertCondition(state.connectionCount === entry.patch.connections.length, "Loaded generated patch connection count does not match the converted patch.", {
          patchPath: entry.patchPath,
          expectedConnectionCount: entry.patch.connections.length,
          state
        });
        assertCondition(state.renderedButtons >= 40, "Generated patch did not render the hardware grid.", {
          patchPath: entry.patchPath,
          state
        });

        const screenshotPath = resolve(evidenceRoot, `${basename(entry.name, ".patch.json")}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        loaded.push({
          patchPath: entry.patchPath,
          screenshotPath,
          state
        });
      }
    } catch (error) {
      blockers.push({
        id: "generated-patch-load-failed",
        message: error.message,
        details: error.details || null,
        stack: error.stack || null
      });
    } finally {
      if (browser) await browser.close();
    }
  }

  const finishedAt = new Date();
  const result = {
    schemaVersion: "zoia.generated-patch-load-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: blockers.length === 0 ? "pass" : "blocked",
    command: "npm run zoia:test:playwright:generated-patch-load",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    playwrightVersion: playwrightPackage.version,
    browser: "chromium",
    browserChannel: EDGE_CHANNEL,
    entryPath: ENTRY_PATH,
    entryUrl: ENTRY_URL,
    inputs: {
      patchRoot
    },
    summary: {
      blockerCount: blockers.length,
      patchCount: patches.length,
      loadedPatchCount: loaded.length
    },
    blockers,
    loaded,
    consolePath: resolve(evidenceRoot, "console.json"),
    claimBoundaries: {
      emulatorPatchJsonInputClaim: true,
      emulatorLoadClaim: blockers.length === 0,
      runtimeAudioClaim: false,
      hardwareBinaryExportClaim: false
    }
  };

  await writeJson(result.consolePath, consoleEntries);
  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-load-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    completedAt: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
