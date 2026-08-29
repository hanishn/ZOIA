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
    id: "filter-validation-blocked",
    promptClass: "filter",
    description: "resonant filter with slow cutoff modulation",
    expectedBoundary: "deterministic-blocker",
    expectedClassification: "filter-runtime-unsupported-validation-blocked"
  },
  {
    id: "modulation-only-validation-blocked",
    promptClass: "modulation-only",
    description: "modulation only lfo control utility",
    expectedBoundary: "deterministic-blocker",
    expectedClassification: "modulation-only-runtime-unsupported-validation-blocked"
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
      filterRuntimeClaim: false,
      modulationOnlyRuntimeClaim: false,
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
      filterRuntimeClaim: false,
      modulationOnlyRuntimeClaim: false,
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
