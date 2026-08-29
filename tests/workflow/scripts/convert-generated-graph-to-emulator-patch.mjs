#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_GRAPH_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patches/manual-test");
const DEFAULT_OUTPUT_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patches/manual-test-emulator");
const DEFAULT_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-emulator-conversion/run-result.json");
const JSON_SPACES = 2;
const GRID_SIZE = 40;
const MAX_PARAM = 65535;
const MAX_STRENGTH = 10000;

const MODULE_CONTRACTS = {
  "Audio Input": {
    typeIdx: 1,
    typeName: "Audio Input",
    category: "Interface",
    colorId: 5,
    blocks: [{ n: "Output", t: "audio_out" }],
    params: [],
    options: [0, 0, 0, 0, 0, 0, 0, 0],
    outputs: { audio: 0 }
  },
  "Audio Output": {
    typeIdx: 2,
    typeName: "Audio Output",
    category: "Interface",
    colorId: 5,
    blocks: [{ n: "Input", t: "audio_in" }, { n: "Gain", t: "cv_in" }],
    params: [0, MAX_PARAM],
    options: [0, 0, 0, 0, 0, 0, 0, 0],
    inputs: { audio: 0, gain_cv: 1 }
  },
  "Delay Line": {
    typeIdx: 13,
    typeName: "Delay Line",
    category: "Audio",
    colorId: 4,
    blocks: [
      { n: "Audio In", t: "audio_in" },
      { n: "Time", t: "cv_in" },
      { n: "Feedback", t: "cv_in" },
      { n: "Mix", t: "cv_in" },
      { n: "Audio Out", t: "audio_out" }
    ],
    options: [0, 0, 0, 0, 0, 0, 0, 0],
    paramOrder: ["audio", "time", "feedback", "mix", "audio_out"],
    inputs: { audio: 0, time_cv: 1, feedback_cv: 2, mix_cv: 3 },
    outputs: { audio: 4 }
  },
  "State Variable Filter": {
    typeIdx: 0,
    typeName: "SV Filter",
    category: "Audio",
    colorId: 4,
    blocks: [
      { n: "Audio In", t: "audio_in" },
      { n: "Frequency", t: "cv_in" },
      { n: "Resonance", t: "cv_in" },
      { n: "Output", t: "audio_out" }
    ],
    options: [1, 0, 0, 0, 0, 0, 0, 0],
    paramOrder: ["audio", "cutoff", "resonance", "audio_out"],
    inputs: { audio: 0, cutoff_cv: 1, resonance_cv: 2 },
    outputs: { audio: 3 }
  },
  "LFO": {
    typeIdx: 5,
    typeName: "LFO",
    category: "CV",
    colorId: 1,
    blocks: [{ n: "Rate", t: "cv_in" }, { n: "Depth", t: "cv_in" }, { n: "Output", t: "cv_out" }],
    options: [1, 0, 0, 0, 0, 0, 0, 0],
    paramOrder: ["rate", "depth", "cv"],
    outputs: { cv: 2 }
  },
  "Expression Pedal": {
    typeIdx: 54,
    typeName: "Cport Exp/CV",
    category: "Interface",
    colorId: 3,
    blocks: [{ n: "Output", t: "cv_out" }],
    params: [],
    options: [0, 0, 0, 0, 0, 0, 0, 0],
    outputs: { cv: 0 }
  }
};

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let graphRoot = DEFAULT_GRAPH_ROOT;
  let outputRoot = DEFAULT_OUTPUT_ROOT;
  let resultPath = DEFAULT_RESULT_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--graph-root") {
      graphRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--output-root") {
      outputRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }

  return { graphRoot, outputRoot, resultPath };
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function toParam(value, fallback = 0) {
  const number = Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(MAX_PARAM, Math.round(number * MAX_PARAM)));
}

function toStrength(value) {
  const number = Number.isFinite(value) ? value : 1;
  return Math.max(-MAX_STRENGTH, Math.min(MAX_STRENGTH, Math.round(number * MAX_STRENGTH)));
}

function makeParams(contract, graphModule) {
  if (contract.params) return contract.params.slice();
  return contract.paramOrder.map((key) => {
    if (key === "audio" || key === "audio_out" || key === "cv") return 0;
    return toParam(graphModule.params?.[key], key === "mix" ? 0.5 : 0);
  });
}

function fits(occupied, start, blockCount) {
  if (!Number.isInteger(start) || start < 0 || start + blockCount > GRID_SIZE) return false;
  for (let offset = 0; offset < blockCount; offset += 1) {
    if (occupied.has(start + offset)) return false;
  }
  return true;
}

function allocateGrid(occupied, preferred, blockCount) {
  if (fits(occupied, preferred, blockCount)) {
    for (let offset = 0; offset < blockCount; offset += 1) occupied.add(preferred + offset);
    return preferred;
  }
  for (let start = 0; start < GRID_SIZE; start += 1) {
    if (fits(occupied, start, blockCount)) {
      for (let offset = 0; offset < blockCount; offset += 1) occupied.add(start + offset);
      return start;
    }
  }
  throw new Error(`No non-overlapping grid position available for ${blockCount}-block module.`);
}

function convertGraph(graph, graphPath) {
  const blockers = [];
  const occupiedByPage = new Map();
  const moduleIndexById = new Map();
  const convertedModules = [];

  for (const [index, graphModule] of (graph.modules || []).entries()) {
    const contract = MODULE_CONTRACTS[graphModule.type];
    if (!contract) {
      blockers.push({
        id: "unsupported-generated-module",
        message: `Generated module type is not supported by the emulator converter: ${graphModule.type}`,
        moduleId: graphModule.id || null
      });
      continue;
    }

    const page = Number.isInteger(graphModule.page) ? graphModule.page : 0;
    if (!occupiedByPage.has(page)) occupiedByPage.set(page, new Set());
    const blocks = contract.blocks.map((block) => ({ ...block }));
    const gridPos = allocateGrid(occupiedByPage.get(page), graphModule.grid, blocks.length);
    moduleIndexById.set(graphModule.id, index);
    convertedModules.push({
      idx: index,
      typeIdx: contract.typeIdx,
      page,
      colorId: contract.colorId,
      gridPos,
      name: graphModule.id || contract.typeName,
      typeName: contract.typeName,
      blocks,
      blockCount: blocks.length,
      category: contract.category,
      params: makeParams(contract, graphModule),
      options: contract.options.slice(),
      paramCount: blocks.length,
      sourceGeneratedModuleId: graphModule.id || null
    });
  }

  const convertedConnections = [];
  for (const connection of graph.connections || []) {
    const sourceIndex = moduleIndexById.get(connection.from?.moduleId);
    const targetIndex = moduleIndexById.get(connection.to?.moduleId);
    const sourceModule = (graph.modules || [])[sourceIndex];
    const targetModule = (graph.modules || [])[targetIndex];
    const sourceContract = sourceModule ? MODULE_CONTRACTS[sourceModule.type] : null;
    const targetContract = targetModule ? MODULE_CONTRACTS[targetModule.type] : null;
    const sourceBlock = sourceContract?.outputs?.[connection.from?.port];
    const targetBlock = targetContract?.inputs?.[connection.to?.port];

    if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex) || !Number.isInteger(sourceBlock) || !Number.isInteger(targetBlock)) {
      blockers.push({
        id: "unsupported-generated-connection",
        message: "Generated connection cannot be mapped to emulator module block indices.",
        connectionId: connection.id || null,
        from: connection.from || null,
        to: connection.to || null
      });
      continue;
    }

    convertedConnections.push({
      srcMod: sourceIndex,
      srcBlock: sourceBlock,
      dstMod: targetIndex,
      dstBlock: targetBlock,
      strength: toStrength(connection.gain)
    });
  }

  if (blockers.length > 0) {
    return { status: "blocked", blockers, graphPath };
  }

  const pages = [];
  for (const module of convertedModules) {
    while (pages.length <= module.page) pages.push(`Page ${pages.length + 1}`);
  }
  if (pages.length === 0) pages.push("Main");
  pages[0] = "Generated";

  return {
    status: "pass",
    blockers,
    graphPath,
    patch: {
      schemaVersion: "zoia.emulator-patch-from-generated-graph.v1",
      sourceGraphSchemaVersion: graph.schemaVersion || null,
      sourcePatchId: graph.patchId || null,
      name: graph.name || "Generated Patch",
      moduleCount: convertedModules.length,
      modules: convertedModules,
      connections: convertedConnections,
      pages,
      labels: ["generated", "text-prompt"],
      description: graph.description || ""
    }
  };
}

async function main() {
  const { graphRoot, outputRoot, resultPath } = parseArgs(process.argv.slice(2));
  const startedAt = nowIso();
  const blockers = [];
  const converted = [];

  if (!existsSync(graphRoot)) {
    blockers.push({
      id: "graph-root-missing",
      message: "Generated graph root does not exist.",
      graphRoot
    });
  } else {
    await mkdir(outputRoot, { recursive: true });
    const fileNames = (await readdir(graphRoot)).filter((name) => name.endsWith(".graph.json")).sort();
    if (fileNames.length === 0) {
      blockers.push({
        id: "graph-root-empty",
        message: "Generated graph root does not contain .graph.json files.",
        graphRoot
      });
    }

    for (const fileName of fileNames) {
      const graphPath = join(graphRoot, fileName);
      const graph = await readJson(graphPath);
      const conversion = convertGraph(graph, graphPath);
      if (conversion.status !== "pass") {
        blockers.push(...conversion.blockers.map((blocker) => ({ ...blocker, graphPath })));
        continue;
      }
      const outputPath = join(outputRoot, fileName.replace(/\.graph\.json$/, ".patch.json"));
      await writeJson(outputPath, conversion.patch);
      converted.push({
        graphPath,
        patchPath: outputPath,
        sourcePatchId: conversion.patch.sourcePatchId,
        moduleCount: conversion.patch.moduleCount,
        connectionCount: conversion.patch.connections.length
      });
    }
  }

  const result = {
    schemaVersion: "zoia.generated-graph-to-emulator-patch-result.v1",
    version: "0.4.0",
    revision: 1,
    status: blockers.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    inputs: {
      graphRoot,
      outputRoot
    },
    summary: {
      blockerCount: blockers.length,
      convertedPatchCount: converted.length
    },
    blockers,
    converted,
    claimBoundaries: {
      generatedGraphInputClaim: true,
      emulatorPatchJsonClaim: true,
      emulatorLoadClaim: false,
      runtimeAudioClaim: false,
      hardwareBinaryExportClaim: false
    }
  };

  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath,
    outputRoot
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-graph-to-emulator-patch-result.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    completedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
