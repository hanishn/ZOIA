#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-prompt-repeatability-rollup");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const BLOCKED_STATUS = "blocked";
const REQUIRED_DELAY_MODULE_TYPES = Object.freeze(["Audio Input", "Audio Output", "Delay Line", "LFO", "Cport Exp/CV"]);
const CASES = Object.freeze([
  {
    id: "delay-ambient-expression",
    promptClass: "delay",
    description: "ambient tape delay with slow modulation and expression pedal feedback control",
    expectedBoundary: "route-semantics",
    expectedClassification: "delay-runtime-route-semantics-supported"
  },
  {
    id: "delay-dub-feedback",
    promptClass: "delay",
    description: "dub delay with slow lfo modulation and expression feedback",
    expectedBoundary: "route-semantics",
    expectedClassification: "delay-runtime-route-semantics-supported"
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
    staleDelayEvidence: false,
    missingRuntimeEvidence: false,
    mislabelUnsupportedAsDelay: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--seed-stale-delay-evidence") {
      seeds.staleDelayEvidence = true;
    } else if (arg === "--seed-missing-runtime-evidence") {
      seeds.missingRuntimeEvidence = true;
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

function requireChildEvidence(failures, step, field, surface, message) {
  assertCondition(failures, Boolean(step?.resultPath), surface, message, step || null);
  assertCondition(failures, Number(step?.summary?.[field] || 0) > 0, surface, message, step?.summary || null);
}

async function runDelayCase(caseDef, runRoot, startedAt, seeds) {
  const resultPath = resolve(runRoot, caseDef.id, "run-result.json");
  const command = runNode("tests/workflow/scripts/run-generated-patch-text-prompt-runtime-rollup.mjs", [
    "--description", caseDef.description,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const patches = result?.patchRoot ? await inspectPatchModules(result.patchRoot) : [];
  const promptGraph = childStep(result, "prompt-graph");
  const load = childStep(result, "playwright-load");
  const audioSignal = childStep(result, "audio-signal");
  const delaySemantics = childStep(result, "delay-semantics");
  const modulationSemantics = childStep(result, "modulation-semantics");
  const lfoSemantics = childStep(result, "lfo-semantics");
  const expressionFeedback = childStep(result, "expression-feedback");
  const unmodifiedTiming = childStep(result, "unmodified-timing");
  const corruptedControls = childStep(result, "corrupted-route-negative-controls");
  const failures = [];

  assertCondition(failures, command.exitCode === 0, "command", "delay repeatability runtime rollup exited non-zero", command);
  assertCondition(failures, result?.status === PASS_STATUS, "result", "delay repeatability runtime rollup did not pass", result?.summary || null);
  const freshnessStartedAt = seeds.staleDelayEvidence && caseDef.id === "delay-dub-feedback" ? "9999-12-31T23:59:59.999Z" : startedAt;
  const audioSignalForAssertion = seeds.missingRuntimeEvidence && caseDef.id === "delay-ambient-expression"
    ? { ...audioSignal, resultPath: null, summary: { ...(audioSignal?.summary || {}), captureCount: 0 } }
    : audioSignal;

  assertCondition(failures, completedAfterStart(result, freshnessStartedAt), "freshness", "delay repeatability runtime evidence is stale", { startedAt: freshnessStartedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, result?.summary?.stepCount === 10 && result?.summary?.passedStepCount === 10, "coverage", "delay repeatability case did not execute all runtime child gates", result?.summary || null);
  assertCondition(failures, promptGraph?.summary?.validatedDraftCount >= 1, "graph-family", "delay repeatability case did not produce validated graph drafts", promptGraph?.summary || null);
  assertCondition(failures, load?.summary?.loadedPatchCount === load?.summary?.patchCount && load?.summary?.patchCount > 0, "emulator-load", "delay repeatability case did not load every generated patch", load?.summary || null);
  requireChildEvidence(failures, audioSignalForAssertion, "captureCount", "audio-evidence", "delay repeatability case did not include consumed WAV capture evidence");
  requireChildEvidence(failures, delaySemantics, "delayWindowPresentCount", "route-semantics", "delay repeatability case did not prove delay-window semantics");
  requireChildEvidence(failures, modulationSemantics, "modulationShiftCount", "route-semantics", "delay repeatability case did not prove modulation route semantics");
  requireChildEvidence(failures, lfoSemantics, "lfoWaveformRouteCount", "control-trace", "delay repeatability case did not prove LFO waveform route semantics");
  requireChildEvidence(failures, expressionFeedback, "expressionFeedbackTailCount", "control-trace", "delay repeatability case did not prove expression feedback semantics");
  requireChildEvidence(failures, unmodifiedTiming, "lfoTraceCount", "control-trace", "delay repeatability case did not include LFO trace evidence");
  requireChildEvidence(failures, corruptedControls, "audioInputRouteSignalLostCount", "negative-control", "delay repeatability case did not include corrupted-route negative controls");
  assertCondition(failures, patches.length > 0, "module-family", "delay repeatability case did not write emulator patch JSON", { patchRoot: result?.patchRoot || null });
  for (const patch of patches) {
    const missing = REQUIRED_DELAY_MODULE_TYPES.filter((typeName) => !patch.moduleTypes.includes(typeName));
    assertCondition(failures, missing.length === 0, "module-family", "delay repeatability patch is missing required generated delay-family module types", { patchPath: patch.patchPath, missing, moduleTypes: patch.moduleTypes });
  }

  return {
    ...caseDef,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    childRunRoot: result?.runRoot || null,
    patchRoot: result?.patchRoot || null,
    summary: result?.summary || null,
    moduleFamilies: patches,
    childEvidence: {
      promptGraph: promptGraph?.resultPath || null,
      load: load?.resultPath || null,
      audioSignal: audioSignal?.resultPath || null,
      delaySemantics: delaySemantics?.resultPath || null,
      modulationSemantics: modulationSemantics?.resultPath || null,
      lfoSemantics: lfoSemantics?.resultPath || null,
      expressionFeedback: expressionFeedback?.resultPath || null,
      unmodifiedTiming: unmodifiedTiming?.resultPath || null,
      corruptedRouteNegativeControls: corruptedControls?.resultPath || null
    },
    failures,
    claimBoundary: "This repeatability case claims fresh delay-family graph generation, emulator load, audio capture, route semantics, control traces, and corrupted-route negative controls for one delay prompt variant."
  };
}

async function runUnsupportedCase(caseDef, runRoot, startedAt, seeds) {
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
  const draftFiles = await listFiles(draftRoot, /\.(graph|trace)\.json$/i);
  const expectedSelectionBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-selection-not-ready"));
  const failures = [];

  assertCondition(failures, command.exitCode !== 0, "negative-control", "unsupported repeatability variant unexpectedly passed", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "deterministic-blocker", "unsupported repeatability variant did not block", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "unsupported repeatability variant evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, expectedSelectionBlocker, "deterministic-blocker", "unsupported repeatability variant did not record selection blocker", result?.blockers || []);
  assertCondition(failures, draftFiles.length === 0, "negative-control", "unsupported repeatability variant wrote graph draft files", draftFiles);
  assertCondition(failures, !seeds.mislabelUnsupportedAsDelay, "prompt-boundary", "seeded unsupported repeatability variant was mislabeled as delay-family runtime support", {
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
    claimBoundary: "This repeatability case claims only deterministic selection blocking and must not become delay-family runtime/audio evidence."
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

  const repeatabilityManifest = {
    schemaVersion: "zoia.generated-patch-prompt-repeatability-manifest.v1",
    generatedAt: nowIso(),
    cases: CASES.map((item) => ({
      id: item.id,
      promptClass: item.promptClass,
      description: item.description,
      expectedBoundary: item.expectedBoundary,
      expectedClassification: item.expectedClassification
    })),
    claimBoundary: {
      delayRepeatabilityClaim: true,
      unsupportedVariantRuntimeClaim: false,
      arbitraryPromptClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resolve(evidenceRoot, "repeatability-manifest.json"), repeatabilityManifest);

  const cases = [];
  for (const caseDef of CASES) {
    if (caseDef.expectedClassification === "delay-runtime-route-semantics-supported") {
      cases.push(await runDelayCase(caseDef, runRoot, startedAt, seeds));
    } else {
      cases.push(await runUnsupportedCase(caseDef, runRoot, startedAt, seeds));
    }
  }

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-prompt-repeatability-classification-log.v1",
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
    schemaVersion: "zoia.generated-patch-prompt-repeatability-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:prompt-repeatability-rollup",
    startedAt,
    completedAt: nowIso(),
    runRoot,
    summary: {
      blockerCount: assertionFailures.length,
      caseCount: cases.length,
      passingCaseCount: cases.filter((item) => item.status === PASS_STATUS).length,
      delayVariantCount: cases.filter((item) => item.expectedClassification === "delay-runtime-route-semantics-supported").length,
      delayVariantPassCount: cases.filter((item) => item.expectedClassification === "delay-runtime-route-semantics-supported" && item.status === PASS_STATUS).length,
      unsupportedBlockedCount: cases.filter((item) => item.expectedClassification === "unsupported-selection-blocked" && item.status === PASS_STATUS).length,
      staleEvidenceFailureCount: assertionFailures.filter((failure) => failure.surface === "freshness").length,
      missingRuntimeEvidenceFailureCount: assertionFailures.filter((failure) => ["audio-evidence", "control-trace", "route-semantics"].includes(failure.surface)).length
    },
    assertionFailures,
    cases,
    artifacts: {
      resultPath,
      runRoot,
      repeatabilityManifestPath: resolve(evidenceRoot, "repeatability-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json")
    },
    claimBoundaries: {
      promptRepeatabilityBoundaryClaim: assertionFailures.length === 0,
      delayRepeatabilityClaim: assertionFailures.length === 0,
      unsupportedVariantRuntimeClaim: false,
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
    schemaVersion: "zoia.generated-patch-prompt-repeatability-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
