#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");
const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/q110-test-patch-loader");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const ENTRY_PATH = resolve(PROJECT_ROOT, "products/zoia/dist/zoia-emulator.html");
const ENTRY_URL = pathToFileURL(ENTRY_PATH).href;
const EDGE_CHANNEL = "msedge";
const EXPECTED_MIN_TEST_PATCHES = 88;
const EXPECTED_FIRST_PATCH_LABEL = "_prototype/PROTOTYPE_A01_Spring_Reverb";

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertCondition(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const startedAt = new Date();
  const consoleEntries = [];
  let browser;
  let status = "pass";
  let errorPayload = null;
  const artifacts = {
    screenshotPath: resolve(EVIDENCE_ROOT, "test-patch-loader.png"),
    statePath: resolve(EVIDENCE_ROOT, "state.json"),
    consolePath: resolve(EVIDENCE_ROOT, "console.json"),
  };

  try {
    browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (entry) => {
      consoleEntries.push({ type: entry.type(), text: entry.text(), location: entry.location() });
    });
    await page.goto(ENTRY_URL, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Test Patches" }).click();
    await page.waitForFunction(
      (expectedCount) => document.querySelectorAll("#test-patch-select option").length >= expectedCount,
      EXPECTED_MIN_TEST_PATCHES,
    );
    const state = await page.evaluate(() => ({
      buttonExists: !!document.querySelector('button[title="Load a committed canonical test patch"]'),
      dialogDisplay: window.getComputedStyle(document.querySelector("#test-patch-dialog")).display,
      optionCount: document.querySelectorAll("#test-patch-select option").length,
      firstOptionText: document.querySelector("#test-patch-select option")?.textContent || null,
      statusText: document.querySelector("#test-patch-status")?.textContent || null,
    }));
    assertCondition(state.buttonExists, "Test Patches button is missing", state);
    assertCondition(state.dialogDisplay !== "none", "Test patch selector did not open", state);
    assertCondition(state.optionCount >= EXPECTED_MIN_TEST_PATCHES, "Test patch selector did not load manifest entries", state);
    assertCondition(state.firstOptionText === EXPECTED_FIRST_PATCH_LABEL, "Unexpected first test patch option", state);
    await page.screenshot({ path: artifacts.screenshotPath, fullPage: true });
    await writeJson(artifacts.statePath, state);
  } catch (error) {
    status = "fail";
    errorPayload = { message: error.message, stack: error.stack, details: error.details || null };
  } finally {
    if (browser) await browser.close();
    await writeJson(artifacts.consolePath, consoleEntries);
  }

  const finishedAt = new Date();
  const result = {
    schemaVersion: "zoia.test-patch-loader-evidence.v1",
    status,
    command: "npm run zoia:test:playwright:test-patch-loader",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    entryPath: ENTRY_PATH,
    entryUrl: ENTRY_URL,
    expectedMinTestPatches: EXPECTED_MIN_TEST_PATCHES,
    playwrightVersion: playwrightPackage.version,
    browser: "chromium",
    browserChannel: EDGE_CHANNEL,
    evidenceRoot: EVIDENCE_ROOT,
    artifacts,
    error: errorPayload,
  };
  await writeJson(RESULT_PATH, result);
  console.log(RESULT_PATH);
  if (status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.test-patch-loader-evidence.v1",
    status: "fail",
    error: { message: error.message, stack: error.stack },
  });
  console.error(error);
  process.exitCode = 1;
});
