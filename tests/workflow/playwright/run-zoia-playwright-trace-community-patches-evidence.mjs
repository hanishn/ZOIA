#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");
const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const ENTRY_PATH = resolve(PROJECT_ROOT, "products/zoia/dist/zoia-emulator.html");
const ENTRY_URL = pathToFileURL(ENTRY_PATH).href;
const MANIFEST_PATH = resolve(PROJECT_ROOT, "tests/workflow/patch-library-cache/zoia-patch-library-manifest.json");
const BASE_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.3-trace-baseline");
const RAW_RUN_LABEL = process.env.ZOIA_TRACE_COMMUNITY_RUN_LABEL || "";
const RUN_LABEL = RAW_RUN_LABEL ? safeName(RAW_RUN_LABEL) : "";
const EVIDENCE_ROOT = RUN_LABEL
  ? resolve(BASE_EVIDENCE_ROOT, `community-patches-${RUN_LABEL}`)
  : resolve(BASE_EVIDENCE_ROOT, "community-patches");
const SUMMARY_ROOT = RUN_LABEL
  ? resolve(BASE_EVIDENCE_ROOT, `community-summaries-${RUN_LABEL}`)
  : resolve(BASE_EVIDENCE_ROOT, "community-summaries");
const RUN_RESULT_PATH = RUN_LABEL
  ? resolve(BASE_EVIDENCE_ROOT, `community-run-result-${RUN_LABEL}.json`)
  : resolve(BASE_EVIDENCE_ROOT, "community-run-result.json");
const EDGE_CHANNEL = "msedge";
const JSON_SPACES = 2;
const EXPECTED_PATCH_COUNT = 1884;
const DEFAULT_SCREENSHOT_POLICY = "fail";
const STALE_CACHE_SEGMENT = "\\TestWorkflow\\patch-library-cache\\";
const ACTIVE_CACHE_SEGMENT = "\\tests\\workflow\\patch-library-cache\\";
const APPLEDOUBLE_MAGIC_HEX = "00051607";

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

function resolvePatchPath(pathValue) {
  if (existsSync(pathValue)) return pathValue;
  const normalized = pathValue.replace(STALE_CACHE_SEGMENT, ACTIVE_CACHE_SEGMENT);
  if (existsSync(normalized)) return normalized;
  return pathValue;
}

function isAppleDoubleResourceFork(buffer) {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("hex") === APPLEDOUBLE_MAGIC_HEX;
}

function selectPatches(manifest) {
  const onlyIds = (process.env.ZOIA_TRACE_COMMUNITY_ONLY || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const limit = Number.parseInt(process.env.ZOIA_TRACE_COMMUNITY_LIMIT || "", 10);
  let patches = manifest.patches || [];
  if (onlyIds.length > 0) patches = patches.filter((patch) => onlyIds.includes(patch.patchId));
  if (Number.isFinite(limit) && limit > 0) patches = patches.slice(0, limit);
  return patches;
}

async function main() {
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await rm(SUMMARY_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await mkdir(SUMMARY_ROOT, { recursive: true });

  const screenshotPolicy = process.env.ZOIA_TRACE_SCREENSHOTS || DEFAULT_SCREENSHOT_POLICY;
  const manifest = JSON.parse((await readFile(MANIFEST_PATH, "utf8")).replace(/^\uFEFF/, ""));
  const patches = selectPatches(manifest);
  const expectedPatchCount = process.env.ZOIA_TRACE_COMMUNITY_LIMIT || process.env.ZOIA_TRACE_COMMUNITY_ONLY
    ? patches.length
    : EXPECTED_PATCH_COUNT;
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
    if (patches.length !== expectedPatchCount) {
      throw new Error(`Expected ${expectedPatchCount} community patches, observed ${patches.length}`);
    }

    for (let index = 0; index < patches.length; index++) {
      const source = patches[index];
      const relativePath = source.binPath.replace(String(manifest.cacheRoot), "").replace(/^\\+/, "").replace(/\\/g, "/");
      const patchId = `${String(index + 1).padStart(4, "0")}-${safeName(source.patchId || relativePath.replace(/\.bin$/i, ""))}`;
      const patchDir = resolve(EVIDENCE_ROOT, patchId);
      await mkdir(patchDir, { recursive: true });
      const beforeConsoleCount = consoleEntries.length;
      let patchStatus = "pass";
      let errorPayload = null;
      let traceBundle = null;
      let classifiedPayload = null;

      try {
        const resolvedBinPath = resolvePatchPath(source.binPath);
        const resolvedMetadataPath = source.metadataPath ? resolvePatchPath(source.metadataPath) : null;
        const patchBuffer = await readFile(resolvedBinPath);
        const sourceInfo = {
          patchId: source.patchId,
          relativePath,
          manifestBinPath: source.binPath,
          resolvedBinPath,
          manifestMetadataPath: source.metadataPath,
          resolvedMetadataPath,
          binSize: source.binSize,
          binSha256: source.binSha256,
        };
        if (isAppleDoubleResourceFork(patchBuffer)) {
          patchStatus = "classified";
          classifiedPayload = {
            classification: "non-zoia-appledouble-resource-fork",
            reason: "File starts with AppleDouble resource fork magic bytes and is not a ZOIA patch binary.",
            source: sourceInfo,
          };
        } else {
          const base64 = patchBuffer.toString("base64");
          traceBundle = await page.evaluate(({ base64Patch, sourceInfo }) => {
            function base64ToArrayBuffer(base64) {
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              return bytes.buffer;
            }
            const patch = window.ZOIA.parsePatch(base64ToArrayBuffer(base64Patch));
            if (!patch.name || patch.name.length === 0) patch.name = sourceInfo.patchId || "Community Patch";
            patch.sourceRelativePath = sourceInfo.relativePath;
            window.ZOIA.loadPatch(patch);
            const trace = window.ZOIA.traceDiagnostics.collectAll();
            trace.source = sourceInfo;
            return trace;
          }, { base64Patch: base64, sourceInfo });
        }
      } catch (error) {
        patchStatus = "fail";
        errorPayload = { message: error.message, stack: error.stack };
        status = "fail";
      }

      const consolePath = resolve(patchDir, "console.json");
      await writeJson(consolePath, consoleEntries.slice(beforeConsoleCount));

      let screenshotPath = null;
      if (screenshotPolicy === "all" || (screenshotPolicy === "fail" && patchStatus !== "pass")) {
        screenshotPath = resolve(patchDir, "screenshot.png");
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      if (traceBundle) {
        await writeJson(resolve(patchDir, "trace.import.json"), traceBundle.importTrace);
        await writeJson(resolve(patchDir, "trace.model.json"), traceBundle.modelTrace);
        await writeJson(resolve(patchDir, "trace.render.json"), traceBundle.renderTrace);
        await writeJson(resolve(patchDir, "trace.signal-flow.json"), traceBundle.signalFlowTrace);
        await writeJson(resolve(patchDir, "trace.audio.json"), traceBundle.audioTrace);
        await writeJson(resolve(patchDir, "trace.bundle.json"), traceBundle);
        await writeText(resolve(patchDir, "dom.html"), await page.evaluate(() => document.documentElement.outerHTML));
        for (const cause of traceBundle.summary.signalRootCauses) addCount(rootCauseSummary, cause);
        for (const mod of traceBundle.modelTrace.unknownModules) addCount(unsupportedModuleSummary, `type-${mod.typeIdx}`);
        for (const cause of traceBundle.signalFlowTrace.rootCauses) addCount(signalFlowSummary, cause);
      }

      const result = {
        schemaVersion: "zoia.community-patch-trace-result.v1",
        status: patchStatus,
        index,
        relativePath,
        evidenceDir: patchDir,
        artifacts: {
          screenshotPath,
          domPath: resolve(patchDir, "dom.html"),
          consolePath,
          importTracePath: resolve(patchDir, "trace.import.json"),
          modelTracePath: resolve(patchDir, "trace.model.json"),
          renderTracePath: resolve(patchDir, "trace.render.json"),
          signalFlowTracePath: resolve(patchDir, "trace.signal-flow.json"),
          audioTracePath: resolve(patchDir, "trace.audio.json"),
          traceBundlePath: resolve(patchDir, "trace.bundle.json"),
        },
        summary: traceBundle ? traceBundle.summary : null,
        classification: classifiedPayload,
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
    .filter((result) => result.status === "fail" || (result.summary && result.summary.invalidConnectionCount > 0))
    .map((result) => ({
      relativePath: result.relativePath,
      status: result.status,
      rootCauses: result.summary ? result.summary.signalRootCauses : [],
      unknownModuleCount: result.summary ? result.summary.unknownModuleCount : null,
      invalidConnectionCount: result.summary ? result.summary.invalidConnectionCount : null,
      error: result.error,
    }));
  const classificationSummary = patchResults
    .filter((result) => result.status === "classified")
    .map((result) => ({
      relativePath: result.relativePath,
      status: result.status,
      classification: result.classification,
    }));
  const runResult = {
    schemaVersion: "zoia.community-trace-baseline-run-result.v1",
    status,
    command: "npm run zoia:trace:community",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    entryPath: ENTRY_PATH,
    entryUrl: ENTRY_URL,
    manifestPath: MANIFEST_PATH,
    manifestPatchCount: manifest.patchCount,
    playwrightVersion: playwrightPackage.version,
    browser: "chromium",
    browserChannel: EDGE_CHANNEL,
    expectedPatchCount,
    patchCount: patchResults.length,
    passCount: patchResults.filter((result) => result.status === "pass").length,
    classifiedCount: patchResults.filter((result) => result.status === "classified").length,
    failCount: patchResults.filter((result) => result.status === "fail").length,
    traceableCount: patchResults.filter((result) => !!result.summary).length,
    evidenceRoot: EVIDENCE_ROOT,
    summaryRoot: SUMMARY_ROOT,
    topLevelError,
  };
  await writeJson(resolve(SUMMARY_ROOT, "failure-summary.json"), failureSummary);
  await writeJson(resolve(SUMMARY_ROOT, "classification-summary.json"), classificationSummary);
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
    schemaVersion: "zoia.community-trace-baseline-run-result.v1",
    status: "fail",
    error: { message: error.message, stack: error.stack },
  });
  console.error(error);
  process.exitCode = 1;
});
