#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");
const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const ENTRY_PATH = resolve(PROJECT_ROOT, "products/zoia/dist/zoia-emulator.html");
const ENTRY_URL = pathToFileURL(ENTRY_PATH).href;
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.3-trace-baseline/test-patches");
const SUMMARY_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.3-trace-baseline/summaries");
const RUN_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.3-trace-baseline/run-result.json");
const EDGE_CHANNEL = "msedge";
const JSON_SPACES = 2;
const EXPECTED_PATCH_COUNT = 88;

function safeName(value) {
  return String(value || "patch").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await writeFile(filePath, value, "utf8");
}

function addCount(map, key) {
  map[key] = (map[key] || 0) + 1;
}

async function main() {
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await rm(SUMMARY_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await mkdir(SUMMARY_ROOT, { recursive: true });

  const startedAt = new Date();
  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleEntries = [];
  page.on("console", (entry) => {
    consoleEntries.push({ type: entry.type(), text: entry.text(), location: entry.location() });
  });

  const patchResults = [];
  const rootCauseSummary = {};
  const unsupportedModuleSummary = {};
  const signalFlowSummary = {};
  let status = "pass";
  let topLevelError = null;

  try {
    await page.goto(ENTRY_URL, { waitUntil: "domcontentloaded" });
    const embeddedInfo = await page.evaluate(() => {
      const payload = JSON.parse(document.querySelector("#zoia-embedded-test-patches").textContent);
      return {
        patchCount: payload.patchCount,
        byteCount: payload.byteCount,
        paths: payload.patches.map((patch) => patch.relativePath),
      };
    });
    if (embeddedInfo.patchCount !== EXPECTED_PATCH_COUNT) {
      throw new Error(`Expected ${EXPECTED_PATCH_COUNT} embedded patches, observed ${embeddedInfo.patchCount}`);
    }

    for (let index = 0; index < embeddedInfo.paths.length; index++) {
      const relativePath = embeddedInfo.paths[index];
      const patchId = `${String(index + 1).padStart(3, "0")}-${safeName(relativePath.replace(/\.bin$/i, ""))}`;
      const patchDir = resolve(EVIDENCE_ROOT, patchId);
      await mkdir(patchDir, { recursive: true });
      const beforeConsoleCount = consoleEntries.length;
      let patchStatus = "pass";
      let errorPayload = null;
      let traceBundle = null;

      try {
        traceBundle = await page.evaluate((patchIndex) => {
          function base64ToArrayBuffer(base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
          }
          const payload = JSON.parse(document.querySelector("#zoia-embedded-test-patches").textContent);
          const entry = payload.patches[patchIndex];
          const patch = window.ZOIA.parsePatch(base64ToArrayBuffer(entry.base64));
          if (!patch.name || patch.name.length === 0) patch.name = entry.relativePath.replace(/\.bin$/i, "").split("/").pop();
          patch.sourceRelativePath = entry.relativePath;
          window.ZOIA.loadPatch(patch);
          const trace = window.ZOIA.traceDiagnostics.collectAll();
          trace.source = {
            relativePath: entry.relativePath,
            size: entry.size,
            sha256: entry.sha256,
          };
          return trace;
        }, index);
      } catch (error) {
        patchStatus = "fail";
        errorPayload = { message: error.message, stack: error.stack };
        status = "fail";
      }

      const dom = await page.evaluate(() => document.documentElement.outerHTML);
      const screenshotPath = resolve(patchDir, "screenshot.png");
      const domPath = resolve(patchDir, "dom.html");
      const consolePath = resolve(patchDir, "console.json");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await writeText(domPath, dom);
      await writeJson(consolePath, consoleEntries.slice(beforeConsoleCount));

      if (traceBundle) {
        await writeJson(resolve(patchDir, "trace.import.json"), traceBundle.importTrace);
        await writeJson(resolve(patchDir, "trace.model.json"), traceBundle.modelTrace);
        await writeJson(resolve(patchDir, "trace.render.json"), traceBundle.renderTrace);
        await writeJson(resolve(patchDir, "trace.signal-flow.json"), traceBundle.signalFlowTrace);
        await writeJson(resolve(patchDir, "trace.audio.json"), traceBundle.audioTrace);
        await writeJson(resolve(patchDir, "trace.bundle.json"), traceBundle);
        for (const cause of traceBundle.summary.signalRootCauses) addCount(rootCauseSummary, cause);
        for (const mod of traceBundle.modelTrace.unknownModules) addCount(unsupportedModuleSummary, `type-${mod.typeIdx}`);
        for (const cause of traceBundle.signalFlowTrace.rootCauses) addCount(signalFlowSummary, cause);
      }

      const result = {
        schemaVersion: "zoia.patch-trace-result.v1",
        status: patchStatus,
        index,
        relativePath,
        evidenceDir: patchDir,
        artifacts: {
          screenshotPath,
          domPath,
          consolePath,
          importTracePath: resolve(patchDir, "trace.import.json"),
          modelTracePath: resolve(patchDir, "trace.model.json"),
          renderTracePath: resolve(patchDir, "trace.render.json"),
          signalFlowTracePath: resolve(patchDir, "trace.signal-flow.json"),
          audioTracePath: resolve(patchDir, "trace.audio.json"),
          traceBundlePath: resolve(patchDir, "trace.bundle.json"),
        },
        summary: traceBundle ? traceBundle.summary : null,
        error: errorPayload,
      };
      await writeJson(resolve(patchDir, "result.json"), result);
      patchResults.push(result);
    }
  } catch (error) {
    status = "fail";
    topLevelError = { message: error.message, stack: error.stack };
  } finally {
    await browser.close();
  }

  const finishedAt = new Date();
  const failureSummary = patchResults
    .filter((result) => result.status !== "pass" || (result.summary && result.summary.invalidConnectionCount > 0))
    .map((result) => ({
      relativePath: result.relativePath,
      status: result.status,
      rootCauses: result.summary ? result.summary.signalRootCauses : [],
      unknownModuleCount: result.summary ? result.summary.unknownModuleCount : null,
      invalidConnectionCount: result.summary ? result.summary.invalidConnectionCount : null,
      error: result.error,
    }));
  const runResult = {
    schemaVersion: "zoia.trace-baseline-run-result.v1",
    status,
    command: "npm run zoia:trace:test-patches",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    entryPath: ENTRY_PATH,
    entryUrl: ENTRY_URL,
    playwrightVersion: playwrightPackage.version,
    browser: "chromium",
    browserChannel: EDGE_CHANNEL,
    expectedPatchCount: EXPECTED_PATCH_COUNT,
    patchCount: patchResults.length,
    passCount: patchResults.filter((result) => result.status === "pass").length,
    failCount: patchResults.filter((result) => result.status !== "pass").length,
    traceableCount: patchResults.filter((result) => !!result.summary).length,
    evidenceRoot: EVIDENCE_ROOT,
    summaryRoot: SUMMARY_ROOT,
    topLevelError,
  };
  await writeJson(resolve(SUMMARY_ROOT, "failure-summary.json"), failureSummary);
  await writeJson(resolve(SUMMARY_ROOT, "root-cause-summary.json"), rootCauseSummary);
  await writeJson(resolve(SUMMARY_ROOT, "unsupported-module-summary.json"), unsupportedModuleSummary);
  await writeJson(resolve(SUMMARY_ROOT, "signal-flow-summary.json"), signalFlowSummary);
  await writeJson(RUN_RESULT_PATH, runResult);
  console.log(RUN_RESULT_PATH);
  if (status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(SUMMARY_ROOT, { recursive: true });
  await writeJson(RUN_RESULT_PATH, {
    schemaVersion: "zoia.trace-baseline-run-result.v1",
    status: "fail",
    error: { message: error.message, stack: error.stack },
  });
  console.error(error);
  process.exitCode = 1;
});
