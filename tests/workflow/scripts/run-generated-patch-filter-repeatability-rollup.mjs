#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-filter-repeatability-rollup");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const REQUIRED_FILTER_MODULE_TYPES = Object.freeze(["Audio Input", "Audio Output", "SV Filter", "LFO"]);
const CASES = Object.freeze([
  {
    id: "filter-resonant-cutoff-modulation",
    promptClass: "filter",
    description: "resonant filter with slow cutoff modulation",
    expectedClassification: "filter-lowpass-runtime-supported"
  },
  {
    id: "filter-lowpass-lfo-sweep",
    promptClass: "filter",
    description: "low pass filter with slow lfo cutoff movement",
    expectedClassification: "filter-lowpass-runtime-supported"
  },
  {
    id: "filter-bright-lowpass-motion",
    promptClass: "filter",
    description: "bright low pass filter with gentle lfo movement",
    expectedClassification: "filter-lowpass-runtime-supported"
  },
  {
    id: "filter-dark-resonant-sweep",
    promptClass: "filter",
    description: "dark resonant low pass filter with slow cutoff lfo",
    expectedClassification: "filter-lowpass-runtime-supported"
  }
]);

function nowIso() {
  return new Date().toISOString();
}

function safeStamp(iso) {
  return iso.replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  let resultPath = DEFAULT_RESULT_PATH;
  const seeds = {
    staleTraceEvidence: false,
    missingTraceEvidence: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (argv[index] === "--seed-stale-trace-evidence") {
      seeds.staleTraceEvidence = true;
    } else if (argv[index] === "--seed-missing-trace-evidence") {
      seeds.missingTraceEvidence = true;
    }
  }
  return { resultPath, seeds };
}

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function runNode(scriptPath, args) {
  const command = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    scriptPath,
    args,
    exitCode: command.status,
    signal: command.signal,
    stdoutTail: command.stdout.slice(-2000),
    stderrTail: command.stderr.slice(-2000)
  };
}

function assertCondition(failures, condition, surface, message, evidence = null) {
  if (condition) return;
  failures.push({ surface, message, evidence });
}

function completedAfterStart(result, startedAt) {
  const completedAt = result?.completedAt || result?.generatedAt || null;
  return Boolean(completedAt && completedAt >= startedAt);
}

async function listFiles(root, pattern) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => resolve(entry.parentPath || root, entry.name));
}

async function inspectPatchModules(patchRoot) {
  const patchFiles = await listFiles(patchRoot, /\.patch\.json$/i);
  const patches = [];
  for (const patchPath of patchFiles) {
    const patch = await readJson(patchPath);
    patches.push({
      patchPath,
      moduleTypes: [...new Set((patch.modules || []).map((module) => module.typeName))],
      moduleCount: patch.modules?.length || 0,
      connectionCount: patch.connections?.length || 0
    });
  }
  return patches;
}

async function runFilterCase(caseDef, runRoot, startedAt, seeds) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const patchRoot = resolve(caseRoot, "emulator-patches");
  const promptResultPath = resolve(caseRoot, "prompt-graph", "run-result.json");
  const conversionResultPath = resolve(caseRoot, "convert-emulator", "run-result.json");
  const loadResultPath = resolve(caseRoot, "playwright-load", "run-result.json");
  const semanticsResultPath = resolve(caseRoot, "filter-semantics", "run-result.json");
  const modulationResultPath = resolve(caseRoot, "filter-modulation-semantics", "run-result.json");
  const failures = [];

  const promptCommand = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", caseDef.description,
    "--selection-limit", "8",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", promptResultPath
  ]);
  const promptResult = existsSync(promptResultPath) ? await readJson(promptResultPath) : null;

  const conversionCommand = runNode("tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs", [
    "--graph-root", graphRoot,
    "--output-root", patchRoot,
    "--result-path", conversionResultPath
  ]);
  const conversionResult = existsSync(conversionResultPath) ? await readJson(conversionResultPath) : null;

  const loadCommand = runNode("tests/workflow/playwright/run-zoia-playwright-generated-patch-load-evidence.mjs", [
    "--patch-root", patchRoot,
    "--result-path", loadResultPath
  ]);
  const loadResult = existsSync(loadResultPath) ? await readJson(loadResultPath) : null;

  const semanticsCommand = runNode("tests/workflow/playwright/run-zoia-playwright-generated-patch-filter-semantics-evidence.mjs", [
    "--patch-root", patchRoot,
    "--result-path", semanticsResultPath
  ]);
  const semanticsResult = existsSync(semanticsResultPath) ? await readJson(semanticsResultPath) : null;
  const modulationCommand = runNode("tests/workflow/playwright/run-zoia-playwright-generated-patch-filter-modulation-semantics-evidence.mjs", [
    "--patch-root", patchRoot,
    "--result-path", modulationResultPath
  ]);
  const modulationResult = existsSync(modulationResultPath) ? await readJson(modulationResultPath) : null;
  const patches = await inspectPatchModules(patchRoot);

  assertCondition(failures, promptCommand.exitCode === 0, "prompt-graph", "filter repeatability prompt graph command exited non-zero", promptCommand);
  assertCondition(failures, promptResult?.status === PASS_STATUS, "prompt-graph", "filter repeatability prompt graph did not pass", promptResult?.summary || null);
  assertCondition(failures, completedAfterStart(promptResult, startedAt), "freshness", "filter repeatability prompt graph evidence is stale", { startedAt, completedAt: promptResult?.completedAt || null });
  assertCondition(failures, promptResult?.summary?.validatedDraftCount === 1 || promptResult?.validatedDraftCount === 1, "prompt-graph", "filter repeatability prompt graph did not validate one draft", promptResult?.summary || promptResult || null);

  assertCondition(failures, conversionCommand.exitCode === 0, "conversion", "filter repeatability conversion command exited non-zero", conversionCommand);
  assertCondition(failures, conversionResult?.status === PASS_STATUS, "conversion", "filter repeatability conversion did not pass", conversionResult?.summary || null);
  assertCondition(failures, conversionResult?.summary?.convertedPatchCount === 1 || conversionResult?.convertedPatchCount === 1, "conversion", "filter repeatability conversion did not write one emulator patch", conversionResult?.summary || conversionResult || null);

  assertCondition(failures, loadCommand.exitCode === 0, "emulator-load", "filter repeatability load command exited non-zero", loadCommand);
  assertCondition(failures, loadResult?.status === PASS_STATUS, "emulator-load", "filter repeatability browser load did not pass", loadResult?.summary || null);
  assertCondition(failures, loadResult?.summary?.loadedPatchCount === 1 || loadResult?.loadedPatchCount === 1, "emulator-load", "filter repeatability browser load did not load one patch", loadResult?.summary || loadResult || null);

  assertCondition(failures, semanticsCommand.exitCode === 0, "audio-evidence", "filter repeatability semantics command exited non-zero", semanticsCommand);
  assertCondition(failures, semanticsResult?.status === PASS_STATUS, "audio-evidence", "filter repeatability semantics did not pass", semanticsResult?.summary || null);
  assertCondition(failures, semanticsResult?.summary?.lowpassClassifiedCount === 1 || semanticsResult?.lowpassClassifiedCount === 1, "audio-evidence", "filter repeatability did not classify one low-pass patch", semanticsResult?.summary || semanticsResult || null);
  assertCondition(failures, semanticsResult?.summary?.bypassControlClassifiedCount === 1 || semanticsResult?.bypassControlClassifiedCount === 1, "negative-control", "filter repeatability bypass control did not classify", semanticsResult?.summary || semanticsResult || null);
  assertCondition(failures, semanticsResult?.summary?.highpassControlClassifiedCount === 1 || semanticsResult?.highpassControlClassifiedCount === 1, "negative-control", "filter repeatability high-pass wrong-output control did not classify", semanticsResult?.summary || semanticsResult || null);
  assertCondition(failures, semanticsResult?.summary?.captureCount === 3 || semanticsResult?.captureCount === 3, "audio-evidence", "filter repeatability did not write three WAV captures", semanticsResult?.summary || semanticsResult || null);

  const traceStartedAt = seeds.staleTraceEvidence && caseDef.id === "filter-lowpass-lfo-sweep" ? "9999-12-31T23:59:59.999Z" : startedAt;
  const traceSummary = seeds.missingTraceEvidence && caseDef.id === "filter-resonant-cutoff-modulation"
    ? { ...(modulationResult?.summary || modulationResult || {}), traceCount: 0 }
    : modulationResult?.summary || modulationResult || null;
  assertCondition(failures, modulationCommand.exitCode === 0, "control-trace", "filter repeatability modulation trace command exited non-zero", modulationCommand);
  assertCondition(failures, modulationResult?.status === PASS_STATUS, "control-trace", "filter repeatability modulation trace evidence did not pass", modulationResult?.summary || null);
  assertCondition(failures, completedAfterStart(modulationResult, traceStartedAt), "freshness", "filter repeatability modulation trace evidence is stale", { startedAt: traceStartedAt, completedAt: modulationResult?.completedAt || null });
  assertCondition(failures, traceSummary?.lfoCutoffRouteClassifiedCount === 1, "control-trace", "filter repeatability did not classify one LFO-to-cutoff route", traceSummary);
  assertCondition(failures, traceSummary?.disconnectedControlClassifiedCount === 1, "negative-control", "filter repeatability disconnected cutoff control did not classify", traceSummary);
  assertCondition(failures, traceSummary?.wrongTargetControlClassifiedCount === 2, "negative-control", "filter repeatability wrong-target controls did not classify", traceSummary);
  assertCondition(failures, traceSummary?.traceCount === 4, "control-trace", "filter repeatability did not write four LFO trace captures", traceSummary);

  assertCondition(failures, patches.length === 1, "module-family", "filter repeatability case did not write exactly one emulator patch JSON", { patchRoot, patchCount: patches.length });
  for (const patch of patches) {
    const missing = REQUIRED_FILTER_MODULE_TYPES.filter((typeName) => !patch.moduleTypes.includes(typeName));
    assertCondition(failures, missing.length === 0, "module-family", "filter repeatability patch is missing required filter module types", { patchPath: patch.patchPath, missing, moduleTypes: patch.moduleTypes });
  }

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    commands: { promptCommand, conversionCommand, loadCommand, semanticsCommand, modulationCommand },
    evidencePaths: {
      promptGraph: promptResultPath,
      conversion: conversionResultPath,
      load: loadResultPath,
      filterSemantics: semanticsResultPath,
      filterModulationSemantics: modulationResultPath
    },
    summaries: {
      promptGraph: promptResult?.summary || promptResult || null,
      conversion: conversionResult?.summary || conversionResult || null,
      load: loadResult?.summary || loadResult || null,
      filterSemantics: semanticsResult?.summary || semanticsResult || null,
      filterModulationSemantics: modulationResult?.summary || modulationResult || null
    },
    moduleFamilies: patches,
    failures,
    claimBoundary: "This case claims only fresh generated low-pass filter graph, conversion, browser load, measured low-pass spectral behavior, generated LFO-to-cutoff route trace evidence, and local negative controls for one filter prompt variant."
  };
}

async function main() {
  const { resultPath, seeds } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  const startedAt = nowIso();
  const runRoot = resolve(evidenceRoot, `run-${safeStamp(startedAt)}`);
  await mkdir(evidenceRoot, { recursive: true });
  await rm(runRoot, { recursive: true, force: true });
  await mkdir(runRoot, { recursive: true });

  const manifest = {
    schemaVersion: "zoia.generated-patch-filter-repeatability-manifest.v1",
    generatedAt: nowIso(),
    cases: CASES,
    claimBoundary: {
      filterLowpassRepeatabilityClaim: true,
      audibleCutoffSweepClaim: false,
      resonanceClaim: false,
      arbitraryFilterPromptClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resolve(evidenceRoot, "prompt-manifest.json"), manifest);

  const cases = [];
  for (const caseDef of CASES) {
    cases.push(await runFilterCase(caseDef, runRoot, startedAt, seeds));
  }

  const assertionFailures = cases.flatMap((item) => item.failures.map((failure) => ({ caseId: item.id, ...failure })));
  const classificationLog = {
    schemaVersion: "zoia.generated-patch-filter-repeatability-classification-log.v1",
    generatedAt: nowIso(),
    classifications: cases.map((item) => ({
      id: item.id,
      promptClass: item.promptClass,
      description: item.description,
      expectedClassification: item.expectedClassification,
      status: item.status,
      failures: item.failures
    }))
  };
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);

  const result = {
    schemaVersion: "zoia.generated-patch-filter-repeatability-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:filter-repeatability-rollup",
    startedAt,
    completedAt: nowIso(),
    runRoot,
    summary: {
      blockerCount: assertionFailures.length,
      caseCount: cases.length,
      passingCaseCount: cases.filter((item) => item.status === PASS_STATUS).length,
      filterVariantCount: cases.length,
      filterVariantPassCount: cases.filter((item) => item.status === PASS_STATUS).length,
      lowpassRuntimeSupportedCount: cases.filter((item) => item.status === PASS_STATUS && item.expectedClassification === "filter-lowpass-runtime-supported").length,
      missingRuntimeEvidenceFailureCount: assertionFailures.filter((failure) => failure.surface === "audio-evidence").length,
      missingTraceEvidenceFailureCount: assertionFailures.filter((failure) => failure.surface === "control-trace").length,
      staleTraceEvidenceFailureCount: assertionFailures.filter((failure) => failure.surface === "freshness").length,
      negativeControlFailureCount: assertionFailures.filter((failure) => failure.surface === "negative-control").length
    },
    assertionFailures,
    cases,
    artifacts: {
      resultPath,
      runRoot,
      promptManifestPath: resolve(evidenceRoot, "prompt-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json")
    },
    claimBoundaries: {
      filterLowpassRepeatabilityClaim: assertionFailures.length === 0,
      audibleCutoffSweepClaim: false,
      resonanceClaim: false,
      arbitraryFilterPromptClaim: false,
      arbitraryPromptClaim: false,
      musicalQualityClaim: false,
      fullDspAccuracyClaim: false,
      hardwareParityClaim: false,
      completePatchSemanticsClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({ status: result.status, ...result.summary, resultPath, runRoot }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-filter-repeatability-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
