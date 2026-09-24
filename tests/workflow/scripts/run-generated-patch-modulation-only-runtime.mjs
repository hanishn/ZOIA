#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-modulation-only-runtime");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const DESCRIPTION = "modulation only lfo control utility";
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return { resultPath };
}

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function runNode(scriptPath, args) {
  const startedAt = nowIso();
  const child = spawnSync(process.execPath, [resolve(PROJECT_ROOT, scriptPath), ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  return {
    scriptPath,
    args,
    startedAt,
    completedAt: nowIso(),
    exitCode: child.status ?? 1,
    stdout: child.stdout || "",
    stderr: child.stderr || ""
  };
}

async function findFirstJson(root, suffix) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFirstJson(path, suffix);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      return path;
    }
  }
  return null;
}

function hasModule(graph, type) {
  return (graph.modules || []).some((module) => module.type === type || module.typeName === type);
}

function hasConnection(graph, sourceId, targetId, targetPort = "cv") {
  return (graph.connections || []).some((connection) =>
    connection.from?.moduleId === sourceId &&
    connection.to?.moduleId === targetId &&
    connection.to?.port === targetPort
  );
}

function classifyGraph(graph) {
  const hasAudioModule = (graph.modules || []).some((module) => module.domain === "audio");
  const hasCvOutput = hasModule(graph, "CV Output");
  const hasLfo = hasModule(graph, "LFO");
  const hasExpression = hasModule(graph, "Expression Pedal");
  const hasLfoRoute = hasConnection(graph, "mod-source-1", "modulation-utility-1");
  const hasExpressionRoute = hasConnection(graph, "control-source-1", "modulation-utility-1");
  const modalities = new Set(graph.expectedModalities || []);
  return {
    hasAudioModule,
    hasCvOutput,
    hasLfo,
    hasExpression,
    hasLfoRoute,
    hasExpressionRoute,
    declaresCv: modalities.has("cv"),
    declaresControl: modalities.has("control"),
    supported: !hasAudioModule && hasCvOutput && hasLfo && hasExpression && hasLfoRoute && hasExpressionRoute && modalities.has("cv") && modalities.has("control")
  };
}

function classifyPatch(patch) {
  const moduleByName = new Map((patch.modules || []).map((module) => [module.name, module]));
  const hasLfo = (patch.modules || []).some((module) => module.typeIdx === 5 && module.typeName === "LFO");
  const hasExpression = (patch.modules || []).some((module) => module.typeIdx === 54 && module.typeName === "Cport Exp/CV");
  const hasCvOutput = (patch.modules || []).some((module) => module.typeIdx === 99 && module.typeName === "Euroburo CV Output");
  const cvOutput = moduleByName.get("modulation-utility-1");
  const lfo = moduleByName.get("mod-source-1");
  const expression = moduleByName.get("control-source-1");
  const routes = (patch.connections || []).filter((connection) => connection.dstMod === cvOutput?.idx && connection.dstBlock === 0);
  const hasLfoRoute = routes.some((connection) => connection.srcMod === lfo?.idx);
  const hasExpressionRoute = routes.some((connection) => connection.srcMod === expression?.idx);
  return {
    hasLfo,
    hasExpression,
    hasCvOutput,
    hasLfoRoute,
    hasExpressionRoute,
    moduleCount: patch.modules?.length || 0,
    connectionCount: patch.connections?.length || 0,
    supported: hasLfo && hasExpression && hasCvOutput && hasLfoRoute && hasExpressionRoute
  };
}

function addFailure(failures, id, message, details = {}) {
  failures.push({ id, message, details });
}

async function main() {
  const { resultPath } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  const graphRoot = resolve(evidenceRoot, "generated-graphs");
  const patchRoot = resolve(evidenceRoot, "emulator-patches");
  const promptResultPath = resolve(evidenceRoot, "prompt-graph", "run-result.json");
  const validationResultPath = resolve(evidenceRoot, "validation", "run-result.json");
  const conversionResultPath = resolve(evidenceRoot, "convert-emulator", "run-result.json");
  const loadResultPath = resolve(evidenceRoot, "browser-load", "run-result.json");

  const commands = [
    runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
      "--description", DESCRIPTION,
      "--selection-limit", "8",
      "--draft-limit", "1",
      "--draft-root", graphRoot,
      "--result-path", promptResultPath
    ]),
    runNode("tests/workflow/scripts/validate-generated-patch-candidates.mjs", [
      "--fixture-root", graphRoot,
      "--no-negative-fixtures",
      "--result-path", validationResultPath
    ]),
    runNode("tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs", [
      "--graph-root", graphRoot,
      "--output-root", patchRoot,
      "--result-path", conversionResultPath
    ]),
    runNode("tests/workflow/playwright/run-zoia-playwright-generated-patch-load-evidence.mjs", [
      "--patch-root", patchRoot,
      "--result-path", loadResultPath
    ])
  ];

  const promptResult = existsSync(promptResultPath) ? await readJson(promptResultPath) : null;
  const validationResult = existsSync(validationResultPath) ? await readJson(validationResultPath) : null;
  const conversionResult = existsSync(conversionResultPath) ? await readJson(conversionResultPath) : null;
  const loadResult = existsSync(loadResultPath) ? await readJson(loadResultPath) : null;
  const graphPath = await findFirstJson(graphRoot, ".graph.json");
  const patchPath = await findFirstJson(patchRoot, ".patch.json");
  const graph = graphPath ? await readJson(graphPath) : null;
  const patch = patchPath ? await readJson(patchPath) : null;
  const graphClassification = graph ? classifyGraph(graph) : null;
  const patchClassification = patch ? classifyPatch(patch) : null;
  const seededMissingRouteGraph = graph ? {
    ...graph,
    connections: (graph.connections || []).filter((connection) => connection.id !== "conn-mod-template")
  } : null;
  const seededMissingRouteDetected = seededMissingRouteGraph ? classifyGraph(seededMissingRouteGraph).supported === false : false;

  const failures = [];
  if (!commands.every((command) => command.exitCode === 0)) {
    addFailure(failures, "child-command-failed", "One or more modulation-only runtime child commands failed.", { commands });
  }
  if (promptResult?.status !== PASS_STATUS || promptResult?.summary?.validatedDraftCount !== 1) {
    addFailure(failures, "prompt-graph-not-supported", "Modulation-only prompt did not generate one validated graph.", promptResult?.summary);
  }
  if (validationResult?.status !== PASS_STATUS || validationResult?.summary?.passingCandidateCount !== 1) {
    addFailure(failures, "validation-not-supported", "Modulation-only generated graph did not pass validation.", validationResult?.summary);
  }
  if (conversionResult?.status !== PASS_STATUS || conversionResult?.summary?.convertedPatchCount !== 1) {
    addFailure(failures, "conversion-not-supported", "Modulation-only generated graph did not convert to one emulator patch.", conversionResult?.summary);
  }
  if (loadResult?.status !== PASS_STATUS || loadResult?.summary?.loadedPatchCount !== 1) {
    addFailure(failures, "browser-load-not-supported", "Converted modulation-only patch did not load in browser runtime.", loadResult?.summary);
  }
  if (!graphClassification?.supported) {
    addFailure(failures, "graph-shape-invalid", "Generated graph does not satisfy the bounded CV-only modulation shape.", graphClassification || {});
  }
  if (!patchClassification?.supported) {
    addFailure(failures, "patch-shape-invalid", "Converted patch does not preserve the bounded CV-only modulation route.", patchClassification || {});
  }
  if (!seededMissingRouteDetected) {
    addFailure(failures, "missing-route-negative-control-not-detected", "Seeded missing LFO-to-CV-output route did not fail the modulation-only classifier.");
  }

  const result = {
    schemaVersion: "zoia.generated-patch-modulation-only-runtime.v1",
    version: "0.4.0",
    revision: 1,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    startedAt: commands[0]?.startedAt || nowIso(),
    completedAt: nowIso(),
    description: DESCRIPTION,
    commands,
    evidencePaths: {
      promptGraph: promptResultPath,
      validation: validationResultPath,
      conversion: conversionResultPath,
      browserLoad: loadResultPath,
      graph: graphPath,
      patch: patchPath
    },
    summary: {
      problemCount: failures.length,
      generatedGraphCount: promptResult?.summary?.draftCount || 0,
      validatedGraphCount: validationResult?.summary?.passingCandidateCount || 0,
      convertedPatchCount: conversionResult?.summary?.convertedPatchCount || 0,
      loadedPatchCount: loadResult?.summary?.loadedPatchCount || 0,
      cvOnlyGraphSupportedCount: graphClassification?.supported ? 1 : 0,
      cvOnlyPatchSupportedCount: patchClassification?.supported ? 1 : 0,
      seededMissingRouteDetectedCount: seededMissingRouteDetected ? 1 : 0
    },
    graphClassification,
    patchClassification,
    failures,
    claimBoundaries: {
      modulationOnlyRuntimeClaim: failures.length === 0,
      audioRuntimeClaim: false,
      midiRuntimeClaim: false,
      samplerRuntimeClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    problemCount: failures.length,
    generatedGraphCount: result.summary.generatedGraphCount,
    convertedPatchCount: result.summary.convertedPatchCount,
    loadedPatchCount: result.summary.loadedPatchCount,
    seededMissingRouteDetectedCount: result.summary.seededMissingRouteDetectedCount,
    resultPath
  }, null, JSON_SPACES));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
