#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const SOURCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-playability-full-r1");
const SOURCE_RESULT_PATH = resolve(SOURCE_ROOT, "run-result.json");
const OUTPUT_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-community-playability-backlog");
const OUTPUT_JSON = resolve(OUTPUT_ROOT, "run-result.json");
const OUTPUT_CSV = resolve(OUTPUT_ROOT, "backlog.csv");
const JSON_SPACES = 2;

const PLAYABILITY_PRIORITY = Object.freeze({
  "deterministic-stimulus-applied-no-qualifying-signal": 1,
  "external-cv-midi-control-required": 2,
  "patch-requires-control-interaction": 3,
  "no-audio-routing-present": 4,
  "no-audio-output-module": 5,
  "empty-or-blank-patch": 6,
  "q097-non-audio-unsupported-or-malformed-patch-data": 7
});

function nowIso() {
  return new Date().toISOString();
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function classifyBacklogItem(result, consoleEntries) {
  const skipEntries = consoleEntries.filter((entry) => /SIM:\s+SKIP|SIM:\s+ERROR/.test(entry.text || ""));
  const nullEndpointCount = skipEntries.filter((entry) => /null endpoint/.test(entry.text || "")).length;
  const vcaLevelSkips = skipEntries.filter((entry) => /"VCA .*"\[\d+:Audio Out\]/.test(entry.text || ""));
  const adsrCvOutSkips = skipEntries.filter((entry) => /"ADSR .*"\[\d+:CV Out\]/.test(entry.text || ""));
  const routingSkips = skipEntries.filter((entry) => /Audio Output|Audio In/.test(entry.text || ""));
  const audioSummary = result.audioSummary || {};
  const staticAnalysis = result.staticAnalysis || {};

  let suspectedRootCause = "classification-policy";
  if (vcaLevelSkips.length > 0) {
    suspectedRootCause = "vca-level-destination-compatibility";
  } else if (adsrCvOutSkips.length > 0) {
    suspectedRootCause = "adsr-control-destination-compatibility";
  } else if (result.classification === "external-cv-midi-control-required") {
    suspectedRootCause = "external-control-stimulus-required";
  } else if (result.classification === "no-audio-output-module") {
    suspectedRootCause = "non-audio-or-control-patch";
  } else if (result.classification === "empty-or-blank-patch") {
    suspectedRootCause = "empty-source-patch";
  } else if (result.classification === "no-audio-routing-present") {
    suspectedRootCause = "source-model-has-no-audio-route";
  }

  return {
    pairId: result.pairId,
    category: result.category,
    status: result.status,
    classification: result.classification,
    priority: PLAYABILITY_PRIORITY[result.classification] || 99,
    suspectedRootCause,
    moduleCount: staticAnalysis.moduleCount ?? null,
    connectionCount: staticAnalysis.connectionCount ?? null,
    audioInputModuleCount: staticAnalysis.audioInputModuleCount ?? null,
    audioOutputModuleCount: staticAnalysis.audioOutputModuleCount ?? null,
    oscillatorModuleCount: staticAnalysis.oscillatorModuleCount ?? null,
    keyboardModuleCount: staticAnalysis.keyboardModuleCount ?? null,
    controlModuleCount: staticAnalysis.controlModuleCount ?? null,
    externalControlModuleCount: staticAnalysis.externalControlModuleCount ?? null,
    inputConnections: staticAnalysis.inputConnections ?? null,
    outputConnections: staticAnalysis.outputConnections ?? null,
    bestMasterRms: audioSummary.bestMaster?.rms ?? null,
    bestMasterPeak: audioSummary.bestMaster?.peak ?? null,
    bestInputRms: audioSummary.bestInput?.rms ?? null,
    bestInputPeak: audioSummary.bestInput?.peak ?? null,
    stimulusEventCount: Array.isArray(audioSummary.stimulusEvents) ? audioSummary.stimulusEvents.length : 0,
    nullEndpointCount,
    vcaLevelSkipCount: vcaLevelSkips.length,
    adsrCvOutSkipCount: adsrCvOutSkips.length,
    routingSkipCount: routingSkips.length,
    firstSkip: skipEntries[0]?.text || null,
    resultPath: resolve(SOURCE_ROOT, result.category || "patch-library", result.pairId || "unknown", "result.json")
  };
}

async function main() {
  if (!existsSync(SOURCE_RESULT_PATH)) {
    throw new Error(`Missing source result: ${SOURCE_RESULT_PATH}`);
  }

  const sourceResult = await readJson(SOURCE_RESULT_PATH);
  const classifiedItems = [];

  for (const item of sourceResult.results || []) {
    if (item.status !== "classified") continue;
    const patchDir = resolve(SOURCE_ROOT, item.category || "patch-library", item.pairId || "unknown");
    const patchResultPath = resolve(patchDir, "result.json");
    const consolePath = resolve(patchDir, "console.json");
    const patchResult = existsSync(patchResultPath) ? await readJson(patchResultPath) : item;
    const consoleEntries = existsSync(consolePath) ? await readJson(consolePath) : [];
    classifiedItems.push(classifyBacklogItem(patchResult, consoleEntries));
  }

  classifiedItems.sort((a, b) => a.priority - b.priority || b.nullEndpointCount - a.nullEndpointCount || String(a.pairId).localeCompare(String(b.pairId)));

  const byClassification = {};
  const bySuspectedRootCause = {};
  for (const item of classifiedItems) {
    byClassification[item.classification] = (byClassification[item.classification] || 0) + 1;
    bySuspectedRootCause[item.suspectedRootCause] = (bySuspectedRootCause[item.suspectedRootCause] || 0) + 1;
  }

  const result = {
    schemaVersion: "zoia.community-playability-backlog.v1",
    version: "0.4.0",
    revision: 2,
    status: "pass",
    generatedAt: nowIso(),
    sourceResultPath: SOURCE_RESULT_PATH,
    evidenceRoot: OUTPUT_ROOT,
    summary: {
      sourceFixtureCount: sourceResult.fixtureCount,
      sourcePassCount: sourceResult.passCount,
      sourceClassifiedCount: sourceResult.classifiedCount,
      sourceFailCount: sourceResult.failCount,
      backlogCount: classifiedItems.length,
      byClassification,
      bySuspectedRootCause
    },
    acceptanceTarget: "Every community patch must either produce deterministic evidence for import, UI render, signal flow, audio/playability behavior where applicable, or have a defensible source/provenance/non-audio classification.",
    items: classifiedItems
  };

  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeFile(OUTPUT_JSON, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");

  const headers = [
    "priority",
    "pairId",
    "classification",
    "suspectedRootCause",
    "moduleCount",
    "connectionCount",
    "audioInputModuleCount",
    "audioOutputModuleCount",
    "oscillatorModuleCount",
    "keyboardModuleCount",
    "controlModuleCount",
    "externalControlModuleCount",
    "inputConnections",
    "outputConnections",
    "bestMasterRms",
    "bestMasterPeak",
    "bestInputRms",
    "bestInputPeak",
    "stimulusEventCount",
    "nullEndpointCount",
    "vcaLevelSkipCount",
    "adsrCvOutSkipCount",
    "routingSkipCount",
    "firstSkip",
    "resultPath"
  ];
  const rows = [headers.map(csvCell).join(",")];
  for (const item of classifiedItems) {
    rows.push(headers.map((header) => csvCell(item[header])).join(","));
  }
  await writeFile(OUTPUT_CSV, `${rows.join("\n")}\n`, "utf8");

  console.log(OUTPUT_JSON);
  console.log(OUTPUT_CSV);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
