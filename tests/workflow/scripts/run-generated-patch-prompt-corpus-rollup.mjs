#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-prompt-corpus-rollup");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const BLOCKED_STATUS = "blocked";
const CORPUS = Object.freeze([
  {
    id: "delay-runtime-semantics",
    promptClass: "delay",
    description: "ambient tape delay with slow modulation and expression pedal feedback control",
    expectedBoundary: "route-semantics",
    expectedClassification: "delay-runtime-route-semantics-supported"
  },
  {
    id: "filter-runtime-supported",
    promptClass: "filter",
    description: "resonant filter with slow cutoff modulation",
    expectedBoundary: "filter-runtime-supported",
    expectedClassification: "filter-runtime-supported"
  },
  {
    id: "modulation-only-runtime-supported",
    promptClass: "modulation-only",
    description: "modulation only lfo control utility",
    expectedBoundary: "cv-runtime-supported",
    expectedClassification: "modulation-only-cv-runtime-supported"
  },
  {
    id: "unsupported-selection-blocked",
    promptClass: "unsupported",
    description: "zzzxqv kpwrrt lmnoqx",
    expectedBoundary: "deterministic-blocker",
    expectedClassification: "unsupported-selection-blocked"
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
    mislabelFilterAsDelay: false,
    mislabelModulationOnlyAsDelay: false,
    mislabelUnsupportedAsDelay: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--seed-mislabel-filter-as-delay") {
      seeds.mislabelFilterAsDelay = true;
    } else if (arg === "--seed-mislabel-modulation-only-as-delay") {
      seeds.mislabelModulationOnlyAsDelay = true;
    } else if (arg === "--seed-mislabel-unsupported-as-delay") {
      seeds.mislabelUnsupportedAsDelay = true;
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

function childStep(result, id) {
  return (result?.steps || []).find((step) => step.id === id) || null;
}

async function listDraftFiles(root) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(graph|trace)\.json$/i.test(entry.name))
    .map((entry) => resolve(entry.parentPath || root, entry.name));
}

async function runDelayCorpusCase(caseDef, runRoot, startedAt) {
  const resultPath = resolve(runRoot, caseDef.id, "run-result.json");
  const command = runNode("tests/workflow/scripts/run-generated-patch-text-prompt-runtime-rollup.mjs", [
    "--description", caseDef.description,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const audioSignal = childStep(result, "audio-signal");
  const delaySemantics = childStep(result, "delay-semantics");
  const unmodifiedTiming = childStep(result, "unmodified-timing");
  const corruptedControls = childStep(result, "corrupted-route-negative-controls");
  const failures = [];

  assertCondition(failures, command.exitCode === 0, "command", "delay corpus runtime rollup exited non-zero", command);
  assertCondition(failures, result?.status === PASS_STATUS, "result", "delay corpus runtime rollup did not pass", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "delay corpus runtime evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, audioSignal?.summary?.captureCount > 0, "audio-evidence", "delay corpus case did not write audio captures", audioSignal);
  assertCondition(failures, delaySemantics?.summary?.delayWindowPresentCount > 0, "route-semantics", "delay corpus case did not prove delay-window semantics", delaySemantics);
  assertCondition(failures, unmodifiedTiming?.summary?.lfoTraceCount > 0, "control-trace", "delay corpus case did not write LFO traces", unmodifiedTiming);
  assertCondition(failures, corruptedControls?.summary?.unchangedStableClassificationCount === 0, "negative-control", "delay corpus corrupted-route control retained stable success classification", corruptedControls);

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    childRunRoot: result?.runRoot || null,
    summary: result?.summary || null,
    childEvidence: {
      audioSignal: audioSignal?.resultPath || null,
      delaySemantics: delaySemantics?.resultPath || null,
      unmodifiedTiming: unmodifiedTiming?.resultPath || null,
      corruptedRouteNegativeControls: corruptedControls?.resultPath || null
    },
    failures,
    claimBoundary: "This delay corpus case claims runtime load, audio signal-present evidence, delay route semantics, control traces, and corrupted-route negative controls only for the delay-family generated patch path."
  };
}

async function runValidationBlockedCorpusCase(caseDef, runRoot, startedAt, seeds) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const draftRoot = resolve(caseRoot, "generated-graphs");
  const resultPath = resolve(caseRoot, "run-result.json");
  const command = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", caseDef.description,
    "--selection-limit", "8",
    "--draft-limit", "1",
    "--draft-root", draftRoot,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const validationResultPath = result?.artifacts?.validationResultPath || resolve(caseRoot, "validation-result.json");
  const validation = existsSync(validationResultPath) ? await readJson(validationResultPath) : null;
  const expectedValidationBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-validation-not-ready"));
  const failures = [];

  assertCondition(failures, command.exitCode !== 0, "negative-control", "unsupported corpus prompt unexpectedly passed full graph validation", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "deterministic-blocker", "unsupported corpus prompt did not block", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "unsupported corpus prompt evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, result?.summary?.draftCount === 1, "text-prompt-path", "unsupported corpus prompt did not generate a fresh draft through the text path", result?.summary || null);
  assertCondition(failures, result?.summary?.validatedDraftCount === 0, "deterministic-blocker", "unsupported corpus prompt reported validated drafts", result?.summary || null);
  assertCondition(failures, expectedValidationBlocker, "deterministic-blocker", "unsupported corpus prompt did not record validation blocker", result?.blockers || []);
  assertCondition(failures, validation?.status === FAIL_STATUS, "deterministic-blocker", "validation evidence did not fail for unsupported corpus prompt", validation?.summary || null);
  const seededMislabel = (caseDef.promptClass === "filter" && seeds.mislabelFilterAsDelay)
    || (caseDef.promptClass === "modulation-only" && seeds.mislabelModulationOnlyAsDelay);
  assertCondition(failures, !seededMislabel, "prompt-boundary", "seeded non-delay corpus prompt was mislabeled as delay-family runtime support", {
    promptClass: caseDef.promptClass,
    expectedClassification: caseDef.expectedClassification,
    seededClassification: "delay-runtime-route-semantics-supported"
  });

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    draftRoot,
    validationResultPath,
    summary: result?.summary || null,
    validationSummary: validation?.summary || null,
    blockers: result?.blockers || [],
    failures,
    claimBoundary: "This corpus case claims only a deterministic validation blocker after fresh text-prompt graph drafting. It is not emulator-loadable and has no runtime/audio success claim."
  };
}

async function runFilterCorpusCase(caseDef, runRoot, startedAt, seeds) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const patchRoot = resolve(caseRoot, "emulator-patches");
  const promptResultPath = resolve(caseRoot, "prompt-graph", "run-result.json");
  const conversionResultPath = resolve(caseRoot, "convert-emulator", "run-result.json");
  const semanticsResultPath = resolve(caseRoot, "filter-semantics", "run-result.json");
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
  const semanticsCommand = runNode("tests/workflow/playwright/run-zoia-playwright-generated-patch-filter-semantics-evidence.mjs", [
    "--patch-root", patchRoot,
    "--result-path", semanticsResultPath
  ]);
  const semanticsResult = existsSync(semanticsResultPath) ? await readJson(semanticsResultPath) : null;
  const failures = [];

  assertCondition(failures, promptCommand.exitCode === 0, "prompt-graph", "filter corpus prompt graph command exited non-zero", promptCommand);
  assertCondition(failures, promptResult?.status === PASS_STATUS && promptResult?.summary?.validatedDraftCount === 1, "prompt-graph", "filter corpus prompt did not produce one validated graph", promptResult?.summary || null);
  assertCondition(failures, completedAfterStart(promptResult, startedAt), "freshness", "filter corpus prompt evidence is stale", { startedAt, completedAt: promptResult?.completedAt || null });
  assertCondition(failures, conversionCommand.exitCode === 0, "conversion", "filter corpus conversion command exited non-zero", conversionCommand);
  assertCondition(failures, conversionResult?.status === PASS_STATUS && conversionResult?.summary?.convertedPatchCount === 1, "conversion", "filter corpus conversion did not write one emulator patch", conversionResult?.summary || null);
  assertCondition(failures, semanticsCommand.exitCode === 0, "audio-evidence", "filter corpus semantics command exited non-zero", semanticsCommand);
  assertCondition(failures, semanticsResult?.status === PASS_STATUS && semanticsResult?.summary?.lowpassClassifiedCount === 1, "audio-evidence", "filter corpus semantics did not classify one low-pass patch", semanticsResult?.summary || null);
  assertCondition(failures, semanticsResult?.summary?.bypassControlClassifiedCount === 1, "negative-control", "filter corpus bypass control did not classify", semanticsResult?.summary || null);
  assertCondition(failures, semanticsResult?.summary?.highpassControlClassifiedCount === 1, "negative-control", "filter corpus high-pass wrong-output control did not classify", semanticsResult?.summary || null);
  assertCondition(failures, !seeds.mislabelFilterAsDelay, "prompt-boundary", "seeded filter corpus prompt was mislabeled as delay-family runtime support", {
    promptClass: caseDef.promptClass,
    expectedClassification: caseDef.expectedClassification,
    seededClassification: "delay-runtime-route-semantics-supported"
  });

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: { promptCommand, conversionCommand, semanticsCommand },
    resultPath: semanticsResultPath,
    summary: {
      prompt: promptResult?.summary || null,
      conversion: conversionResult?.summary || null,
      semantics: semanticsResult?.summary || null
    },
    childEvidence: {
      promptGraph: promptResultPath,
      conversion: conversionResultPath,
      filterSemantics: semanticsResultPath
    },
    failures,
    claimBoundary: "This filter corpus case claims bounded generated low-pass runtime evidence with bypass and high-pass wrong-output controls only."
  };
}

async function runModulationOnlyCorpusCase(caseDef, runRoot, startedAt, seeds) {
  const resultPath = resolve(runRoot, caseDef.id, "run-result.json");
  const command = runNode("tests/workflow/scripts/run-generated-patch-modulation-only-runtime.mjs", [
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const failures = [];

  assertCondition(failures, command.exitCode === 0, "command", "modulation-only corpus runtime command exited non-zero", command);
  assertCondition(failures, result?.status === PASS_STATUS, "result", "modulation-only corpus runtime result did not pass", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "modulation-only corpus runtime evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, result?.summary?.validatedGraphCount === 1, "validation", "modulation-only corpus case did not validate one generated graph", result?.summary || null);
  assertCondition(failures, result?.summary?.convertedPatchCount === 1, "conversion", "modulation-only corpus case did not convert one emulator patch", result?.summary || null);
  assertCondition(failures, result?.summary?.loadedPatchCount === 1, "browser-load", "modulation-only corpus case did not load one converted patch", result?.summary || null);
  assertCondition(failures, result?.summary?.seededMissingRouteDetectedCount === 1, "negative-control", "modulation-only corpus case did not detect the seeded missing-route control", result?.summary || null);
  assertCondition(failures, !seeds.mislabelModulationOnlyAsDelay, "prompt-boundary", "seeded modulation-only corpus prompt was mislabeled as delay-family runtime support", {
    promptClass: caseDef.promptClass,
    expectedClassification: caseDef.expectedClassification,
    seededClassification: "delay-runtime-route-semantics-supported"
  });

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    summary: result?.summary || null,
    childEvidence: result?.evidencePaths || null,
    failures,
    claimBoundary: "This modulation-only corpus case claims only bounded CV-only graph validation, emulator conversion, browser load, and missing-route negative-control evidence. It does not claim audio behavior."
  };
}

async function runSelectionBlockedCorpusCase(caseDef, runRoot, startedAt, seeds) {
  const caseRoot = resolve(runRoot, caseDef.id);
  const draftRoot = resolve(caseRoot, "generated-graphs");
  const resultPath = resolve(caseRoot, "run-result.json");
  const command = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", caseDef.description,
    "--selection-limit", "3",
    "--draft-limit", "1",
    "--draft-root", draftRoot,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const draftFiles = await listDraftFiles(draftRoot);
  const expectedSelectionBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-selection-not-ready"));
  const failures = [];

  assertCondition(failures, command.exitCode !== 0, "negative-control", "unmatched corpus prompt unexpectedly passed", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "deterministic-blocker", "unmatched corpus prompt did not block", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "unmatched corpus prompt evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, expectedSelectionBlocker, "deterministic-blocker", "unmatched corpus prompt did not record selection blocker", result?.blockers || []);
  assertCondition(failures, draftFiles.length === 0, "negative-control", "unmatched corpus prompt wrote graph draft files", draftFiles);
  assertCondition(failures, !seeds.mislabelUnsupportedAsDelay, "prompt-boundary", "seeded unsupported corpus prompt was mislabeled as delay-family runtime support", {
    promptClass: caseDef.promptClass,
    expectedClassification: caseDef.expectedClassification,
    seededClassification: "delay-runtime-route-semantics-supported"
  });

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    draftRoot,
    summary: result?.summary || null,
    blockers: result?.blockers || [],
    draftFileCount: draftFiles.length,
    failures,
    claimBoundary: "This corpus case claims only a deterministic selection blocker. It must not produce generated graph, emulator-load, or runtime/audio success evidence."
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

  const corpusManifest = {
    schemaVersion: "zoia.generated-patch-prompt-corpus-manifest.v1",
    generatedAt: nowIso(),
    corpus: CORPUS.map((item) => ({
      id: item.id,
      promptClass: item.promptClass,
      description: item.description,
      expectedBoundary: item.expectedBoundary,
      expectedClassification: item.expectedClassification
    })),
    claimBoundary: {
      delayRuntimeRouteSemanticsClaim: true,
      filterRuntimeClaim: true,
      modulationOnlyRuntimeClaim: true,
      unsupportedPromptRuntimeClaim: false,
      arbitraryPromptClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resolve(evidenceRoot, "corpus-manifest.json"), corpusManifest);

  const cases = [];
  for (const caseDef of CORPUS) {
    if (caseDef.expectedClassification === "delay-runtime-route-semantics-supported") {
      cases.push(await runDelayCorpusCase(caseDef, runRoot, startedAt));
    } else if (caseDef.expectedClassification === "filter-runtime-supported") {
      cases.push(await runFilterCorpusCase(caseDef, runRoot, startedAt, seeds));
    } else if (caseDef.expectedClassification === "modulation-only-cv-runtime-supported") {
      cases.push(await runModulationOnlyCorpusCase(caseDef, runRoot, startedAt, seeds));
    } else if (caseDef.expectedClassification === "unsupported-selection-blocked") {
      cases.push(await runSelectionBlockedCorpusCase(caseDef, runRoot, startedAt, seeds));
    } else {
      cases.push(await runValidationBlockedCorpusCase(caseDef, runRoot, startedAt, seeds));
    }
  }

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-prompt-corpus-classification-log.v1",
    generatedAt: nowIso(),
    classifications: cases.map((item) => ({
      id: item.id,
      promptClass: item.promptClass,
      description: item.description,
      expectedBoundary: item.expectedBoundary,
      expectedClassification: item.expectedClassification,
      status: item.status,
      failures: item.failures
    }))
  };
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);

  const assertionFailures = cases.flatMap((item) => item.failures.map((failure) => ({ caseId: item.id, ...failure })));
  const result = {
    schemaVersion: "zoia.generated-patch-prompt-corpus-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:prompt-corpus-rollup",
    startedAt,
    completedAt: nowIso(),
    runRoot,
    summary: {
      blockerCount: assertionFailures.length,
      caseCount: cases.length,
      passingCaseCount: cases.filter((item) => item.status === PASS_STATUS).length,
      delayRouteSemanticsSupportedCount: cases.filter((item) => item.expectedClassification === "delay-runtime-route-semantics-supported" && item.status === PASS_STATUS).length,
      filterRuntimeSupportedCount: cases.filter((item) => item.expectedClassification === "filter-runtime-supported" && item.status === PASS_STATUS).length,
      modulationOnlyRuntimeSupportedCount: cases.filter((item) => item.expectedClassification === "modulation-only-cv-runtime-supported" && item.status === PASS_STATUS).length,
      deterministicBlockerCount: cases.filter((item) => item.expectedBoundary === "deterministic-blocker" && item.status === PASS_STATUS).length,
      emulatorLoadOnlyCount: cases.filter((item) => item.expectedBoundary === "emulator-load-only" && item.status === PASS_STATUS).length,
      audioSignalPresentCount: cases.filter((item) => item.expectedBoundary === "audio-signal-present" && item.status === PASS_STATUS).length
    },
    assertionFailures,
    cases,
    artifacts: {
      resultPath,
      runRoot,
      corpusManifestPath: resolve(evidenceRoot, "corpus-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json")
    },
    claimBoundaries: {
      promptCorpusBoundaryClaim: assertionFailures.length === 0,
      delayRuntimeRouteSemanticsClaim: assertionFailures.length === 0,
      filterRuntimeClaim: assertionFailures.length === 0,
      modulationOnlyRuntimeClaim: assertionFailures.length === 0,
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
    schemaVersion: "zoia.generated-patch-prompt-corpus-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
