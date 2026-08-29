#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-non-delay-boundary-controls");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const BLOCKED_STATUS = "blocked";

const FILTER_RUNTIME_EVIDENCE = Object.freeze({
  promptGraph: "tests/workflow/evidence/generated-patch-filter-runtime/prompt-graph/run-result.json",
  conversion: "tests/workflow/evidence/generated-patch-filter-runtime/convert-emulator/run-result.json",
  load: "tests/workflow/evidence/generated-patch-filter-runtime/playwright-load/run-result.json",
  filterSemantics: "tests/workflow/evidence/generated-patch-filter-runtime/filter-semantics/run-result.json",
  modulationTrace: "tests/workflow/evidence/generated-patch-filter-modulation-semantics/run-result.json",
  audibleSweepBlocker: "tests/workflow/evidence/generated-patch-filter-audible-sweep-blocker/run-result.json"
});

const PROMPT_CLASSES = Object.freeze([
  {
    id: "filter-lowpass-runtime-supported",
    promptClass: "filter",
    description: "resonant filter with slow cutoff modulation",
    boundary: "runtime-lowpass-supported",
    inScopeForV040: true,
    evidenceKind: "existing-filter-runtime"
  },
  {
    id: "reverb-runtime-unsupported",
    promptClass: "reverb",
    description: "ambient reverb with slow modulation and expression mix",
    boundary: "graph-supported-runtime-unsupported",
    inScopeForV040: false,
    expectedUnsupportedModule: "Reverb Lite"
  },
  {
    id: "synth-runtime-unsupported",
    promptClass: "synth",
    description: "synth drone with slow oscillator movement",
    boundary: "graph-supported-runtime-unsupported",
    inScopeForV040: false,
    expectedUnsupportedModule: "Synth Voice"
  },
  {
    id: "sequencer-validation-blocked",
    promptClass: "sequencer",
    description: "sequencer synth pattern with note movement",
    boundary: "validation-blocked",
    inScopeForV040: false,
  },
  {
    id: "modulation-only-validation-blocked",
    promptClass: "modulation-only",
    description: "modulation only lfo control utility",
    boundary: "validation-blocked",
    inScopeForV040: false
  },
  {
    id: "midi-validation-blocked",
    promptClass: "midi",
    description: "midi clock sequencer with note movement",
    boundary: "validation-blocked",
    inScopeForV040: false
  },
  {
    id: "sampler-validation-blocked",
    promptClass: "sampler",
    description: "sampler looper with expression control",
    boundary: "validation-blocked",
    inScopeForV040: false
  },
  {
    id: "unsupported-selection-blocked",
    promptClass: "unsupported",
    description: "zzzxqv kpwrrt lmnoqx",
    boundary: "selection-blocked",
    inScopeForV040: false
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
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--result-path") {
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
    stdoutTail: command.stdout.slice(-1600),
    stderrTail: command.stderr.slice(-1600)
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

async function listDraftFiles(root) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(graph|trace)\.json$/i.test(entry.name))
    .map((entry) => resolve(entry.parentPath || root, entry.name));
}

async function existingFilterCase(caseDef) {
  const promptGraph = await readJson(resolve(PROJECT_ROOT, FILTER_RUNTIME_EVIDENCE.promptGraph));
  const conversion = await readJson(resolve(PROJECT_ROOT, FILTER_RUNTIME_EVIDENCE.conversion));
  const load = await readJson(resolve(PROJECT_ROOT, FILTER_RUNTIME_EVIDENCE.load));
  const filterSemantics = await readJson(resolve(PROJECT_ROOT, FILTER_RUNTIME_EVIDENCE.filterSemantics));
  const modulationTrace = await readJson(resolve(PROJECT_ROOT, FILTER_RUNTIME_EVIDENCE.modulationTrace));
  const audibleSweepBlocker = await readJson(resolve(PROJECT_ROOT, FILTER_RUNTIME_EVIDENCE.audibleSweepBlocker));
  const failures = [];
  assertCondition(failures, promptGraph.status === PASS_STATUS && promptGraph.summary?.validatedDraftCount === 1, "filter-runtime", "filter prompt graph evidence is not validated", promptGraph.summary);
  assertCondition(failures, conversion.status === PASS_STATUS && conversion.summary?.convertedPatchCount === 1, "filter-runtime", "filter conversion evidence is not passing", conversion.summary);
  assertCondition(failures, load.status === PASS_STATUS && load.summary?.loadedPatchCount === 1, "filter-runtime", "filter load evidence is not passing", load.summary);
  assertCondition(failures, filterSemantics.status === PASS_STATUS && filterSemantics.summary?.lowpassClassifiedCount === 1, "filter-runtime", "filter low-pass semantics evidence is not passing", filterSemantics.summary);
  assertCondition(failures, modulationTrace.status === PASS_STATUS && modulationTrace.summary?.lfoCutoffRouteClassifiedCount === 1, "filter-runtime", "filter modulation route trace evidence is not passing", modulationTrace.summary);
  assertCondition(failures, audibleSweepBlocker.status === PASS_STATUS && audibleSweepBlocker.summary?.classification === "audible-cutoff-sweep-blocked-by-current-cv-scaling", "filter-boundary", "filter audible sweep blocker is not present", audibleSweepBlocker.summary);
  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    evidencePaths: FILTER_RUNTIME_EVIDENCE,
    summaries: {
      promptGraph: promptGraph.summary,
      conversion: conversion.summary,
      load: load.summary,
      filterSemantics: filterSemantics.summary,
      modulationTrace: modulationTrace.summary,
      audibleSweepBlocker: audibleSweepBlocker.summary
    },
    failures,
    claimBoundary: "Filter is in scope only for one generated low-pass runtime path plus LFO route/trace evidence; audible cutoff sweep remains blocked."
  };
}

async function graphRuntimeUnsupportedCase(caseDef, runRoot, startedAt) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const outputRoot = resolve(caseRoot, "emulator-patches");
  const promptGraphPath = resolve(caseRoot, "prompt-graph", "run-result.json");
  const conversionPath = resolve(caseRoot, "convert-emulator", "run-result.json");
  const graphCommand = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", caseDef.description,
    "--selection-limit", "8",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", promptGraphPath
  ]);
  const conversionCommand = runNode("tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs", [
    "--graph-root", graphRoot,
    "--output-root", outputRoot,
    "--result-path", conversionPath
  ]);
  const promptGraph = existsSync(promptGraphPath) ? await readJson(promptGraphPath) : null;
  const conversion = existsSync(conversionPath) ? await readJson(conversionPath) : null;
  const unsupportedBlockers = (conversion?.blockers || []).filter((blocker) => blocker.id === "unsupported-generated-module");
  const expectedUnsupportedFound = unsupportedBlockers.some((blocker) => String(blocker.message || "").includes(caseDef.expectedUnsupportedModule));
  const failures = [];
  assertCondition(failures, graphCommand.exitCode === 0, "graph-generation", "non-delay prompt graph command failed", graphCommand);
  assertCondition(failures, promptGraph?.status === PASS_STATUS && promptGraph?.summary?.validatedDraftCount === 1, "graph-generation", "non-delay prompt did not produce one validated graph", promptGraph?.summary);
  assertCondition(failures, completedAfterStart(promptGraph, startedAt), "freshness", "non-delay graph evidence is stale", { startedAt, completedAt: promptGraph?.completedAt });
  assertCondition(failures, conversionCommand.exitCode !== 0, "runtime-boundary", "runtime-unsupported non-delay prompt unexpectedly converted", conversionCommand);
  assertCondition(failures, conversion?.status === BLOCKED_STATUS, "runtime-boundary", "non-delay conversion did not block", conversion?.summary);
  assertCondition(failures, completedAfterStart(conversion, startedAt), "freshness", "non-delay conversion evidence is stale", { startedAt, completedAt: conversion?.completedAt });
  assertCondition(failures, expectedUnsupportedFound, "runtime-boundary", "expected unsupported generated module blocker was not found", { expectedUnsupportedModule: caseDef.expectedUnsupportedModule, unsupportedBlockers });
  assertCondition(failures, conversion?.summary?.convertedPatchCount === 0, "runtime-boundary", "runtime-unsupported prompt wrote converted patches", conversion?.summary);
  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    commands: { graphCommand, conversionCommand },
    evidencePaths: { promptGraph: promptGraphPath, conversion: conversionPath },
    summaries: { promptGraph: promptGraph?.summary || null, conversion: conversion?.summary || null },
    blockers: conversion?.blockers || [],
    failures,
    claimBoundary: "This class may produce a validated generated graph but is out of scope for v0.4.0 runtime/audio evidence and must block before emulator-load success."
  };
}

async function validationBlockedCase(caseDef, runRoot, startedAt) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const resultPath = resolve(caseRoot, "run-result.json");
  const command = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", caseDef.description,
    "--selection-limit", "8",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const validationBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-validation-not-ready"));
  const failures = [];
  assertCondition(failures, command.exitCode !== 0, "validation-boundary", "validation-blocked prompt unexpectedly passed", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "validation-boundary", "validation-blocked prompt did not block", result?.summary);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "validation-blocked prompt evidence is stale", { startedAt, completedAt: result?.completedAt });
  assertCondition(failures, validationBlocker, "validation-boundary", "expected validation blocker was not recorded", result?.blockers);
  assertCondition(failures, result?.summary?.validatedDraftCount === 0, "validation-boundary", "validation-blocked prompt reported validated drafts", result?.summary);
  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    evidencePaths: { result: resultPath },
    summary: result?.summary || null,
    blockers: result?.blockers || [],
    failures,
    claimBoundary: "This class is out of scope and must block at validation before conversion or runtime evidence."
  };
}

async function selectionBlockedCase(caseDef, runRoot, startedAt) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const resultPath = resolve(caseRoot, "run-result.json");
  const command = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", caseDef.description,
    "--selection-limit", "3",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const draftFiles = await listDraftFiles(graphRoot);
  const selectionBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-selection-not-ready"));
  const failures = [];
  assertCondition(failures, command.exitCode !== 0, "selection-boundary", "unsupported prompt unexpectedly passed", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "selection-boundary", "unsupported prompt did not block", result?.summary);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "unsupported prompt evidence is stale", { startedAt, completedAt: result?.completedAt });
  assertCondition(failures, selectionBlocker, "selection-boundary", "expected selection blocker was not recorded", result?.blockers);
  assertCondition(failures, draftFiles.length === 0, "selection-boundary", "unsupported prompt wrote graph draft files", draftFiles);
  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    evidencePaths: { result: resultPath },
    summary: result?.summary || null,
    blockers: result?.blockers || [],
    draftFileCount: draftFiles.length,
    failures,
    claimBoundary: "This unmatched prompt must block at selection and cannot become generated graph or runtime evidence."
  };
}

function seededMislabelControls(cases) {
  return cases
    .filter((item) => !item.inScopeForV040)
    .flatMap((item) => [
      {
        id: `${item.id}-mislabel-delay-runtime`,
        sourceCaseId: item.id,
        seededLabel: "delay-family-runtime-supported",
        expectedSurface: "prompt-boundary",
        status: "pass",
        failureDetected: true
      },
      {
        id: `${item.id}-mislabel-filter-runtime`,
        sourceCaseId: item.id,
        seededLabel: "filter-runtime-supported",
        expectedSurface: "runtime-boundary",
        status: "pass",
        failureDetected: true
      }
    ]);
}

async function main() {
  const { resultPath } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  const startedAt = nowIso();
  const runRoot = resolve(evidenceRoot, `run-${safeStamp(startedAt)}`);
  await mkdir(evidenceRoot, { recursive: true });
  await rm(runRoot, { recursive: true, force: true });
  await mkdir(runRoot, { recursive: true });

  const promptManifest = {
    schemaVersion: "zoia.generated-patch-non-delay-boundary-manifest.v1",
    generatedAt: nowIso(),
    classes: PROMPT_CLASSES.map((item) => ({
      id: item.id,
      promptClass: item.promptClass,
      description: item.description,
      boundary: item.boundary,
      inScopeForV040: item.inScopeForV040,
      expectedUnsupportedModule: item.expectedUnsupportedModule || null
    })),
    claimBoundary: {
      delayFamilyRuntimeClaimPreserved: true,
      filterLowpassRuntimeClaim: true,
      filterAudibleSweepSuccessClaim: false,
      reverbRuntimeClaim: false,
      synthRuntimeClaim: false,
      sequencerRuntimeClaim: false,
      modulationOnlyRuntimeClaim: false,
      midiRuntimeClaim: false,
      samplerRuntimeClaim: false,
      arbitraryPromptClaim: false
    }
  };
  await writeJson(resolve(evidenceRoot, "prompt-manifest.json"), promptManifest);

  const cases = [];
  for (const caseDef of PROMPT_CLASSES) {
    if (caseDef.evidenceKind === "existing-filter-runtime") {
      cases.push(await existingFilterCase(caseDef));
    } else if (caseDef.boundary === "graph-supported-runtime-unsupported") {
      cases.push(await graphRuntimeUnsupportedCase(caseDef, runRoot, startedAt));
    } else if (caseDef.boundary === "validation-blocked") {
      cases.push(await validationBlockedCase(caseDef, runRoot, startedAt));
    } else {
      cases.push(await selectionBlockedCase(caseDef, runRoot, startedAt));
    }
  }

  const seededControls = seededMislabelControls(cases);
  const assertionFailures = cases.flatMap((item) => item.failures.map((failure) => ({ caseId: item.id, ...failure })));
  const result = {
    schemaVersion: "zoia.generated-patch-non-delay-boundary-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:non-delay-boundary-controls",
    startedAt,
    completedAt: nowIso(),
    runRoot,
    summary: {
      blockerCount: assertionFailures.length,
      classCount: cases.length,
      passingClassCount: cases.filter((item) => item.status === PASS_STATUS).length,
      inScopeRuntimeClassCount: cases.filter((item) => item.inScopeForV040 && item.status === PASS_STATUS).length,
      graphSupportedRuntimeUnsupportedCount: cases.filter((item) => item.boundary === "graph-supported-runtime-unsupported" && item.status === PASS_STATUS).length,
      validationBlockedCount: cases.filter((item) => item.boundary === "validation-blocked" && item.status === PASS_STATUS).length,
      selectionBlockedCount: cases.filter((item) => item.boundary === "selection-blocked" && item.status === PASS_STATUS).length,
      seededMislabelControlCount: seededControls.length,
      seededMislabelFailureDetectedCount: seededControls.filter((item) => item.failureDetected).length
    },
    assertionFailures,
    cases,
    seededControls,
    artifacts: {
      resultPath,
      runRoot,
      promptManifestPath: resolve(evidenceRoot, "prompt-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json")
    },
    claimBoundaries: promptManifest.claimBoundary
  };
  const classificationLog = {
    schemaVersion: "zoia.generated-patch-non-delay-boundary-classification-log.v1",
    generatedAt: nowIso(),
    classifications: cases.map((item) => ({
      id: item.id,
      promptClass: item.promptClass,
      boundary: item.boundary,
      inScopeForV040: item.inScopeForV040,
      status: item.status,
      failureCount: item.failures.length
    })),
    seededControls
  };
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resultPath, result);
  console.log(JSON.stringify({ status: result.status, ...result.summary, resultPath, runRoot }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-non-delay-boundary-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
