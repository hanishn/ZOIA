#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-prompt-breadth-rollup");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const BLOCKED_STATUS = "blocked";
const DELAY_VARIANT_DESCRIPTION = "ambient tape delay with slow modulation and expression pedal feedback control";
const REVERB_VARIANT_DESCRIPTION = "ambient reverb with slow modulation and expression mix";
const UNSUPPORTED_DESCRIPTION = "zzzxqv kpwrrt lmnoqx";
const REVERB_RUNTIME_EVIDENCE = Object.freeze({
  validation: "tests/workflow/evidence/generated-patch-reverb-validation/run-result.json",
  semantics: "tests/workflow/evidence/generated-patch-reverb-semantics/run-result.json"
});
const NON_DELAY_GRAPH_CONTROLS = Object.freeze([
  {
    id: "synth-supported-graph-runtime-unsupported",
    description: "synth drone with slow oscillator movement",
    expectedUnsupportedModule: "Synth Voice"
  }
]);
const VALIDATION_BLOCKED_CONTROLS = Object.freeze([
  {
    id: "midi-validation-blocked",
    description: "midi clock sequencer with note movement"
  },
  {
    id: "sampler-validation-blocked",
    description: "sampler looper with expression control"
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
  let seedMislabelNonDelayAsDelay = false;
  let seedStaleDelayEvidence = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--seed-mislabel-non-delay-as-delay") {
      seedMislabelNonDelayAsDelay = true;
    } else if (arg === "--seed-stale-delay-evidence") {
      seedStaleDelayEvidence = true;
    }
  }
  return { resultPath, seedMislabelNonDelayAsDelay, seedStaleDelayEvidence };
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

async function listDraftFiles(root) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(graph|trace)\.json$/i.test(entry.name))
    .map((entry) => resolve(entry.parentPath || root, entry.name));
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

async function runDelayVariant(runRoot, startedAt) {
  const resultPath = resolve(runRoot, "delay-family-variant", "run-result.json");
  const command = runNode("tests/workflow/scripts/run-generated-patch-text-prompt-runtime-rollup.mjs", [
    "--description", DELAY_VARIANT_DESCRIPTION,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const failures = [];
  const audioSignal = childStep(result, "audio-signal");
  const unmodifiedTiming = childStep(result, "unmodified-timing");
  const corruptedControls = childStep(result, "corrupted-route-negative-controls");

  assertCondition(failures, command.exitCode === 0, "command", "delay-family runtime rollup exited non-zero", command);
  assertCondition(failures, result?.status === PASS_STATUS, "result", "delay-family runtime rollup did not pass", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "delay-family runtime evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, audioSignal?.summary?.captureCount > 0, "audio-evidence", "delay-family runtime rollup did not include WAV capture evidence", audioSignal);
  assertCondition(failures, unmodifiedTiming?.summary?.lfoTraceCount > 0 && unmodifiedTiming?.summary?.expressionTraceCount > 0, "trace-evidence", "delay-family runtime rollup did not include control trace evidence", unmodifiedTiming);
  assertCondition(failures, corruptedControls?.summary?.audioInputRouteSignalLostCount > 0, "negative-control", "delay-family runtime rollup did not include corrupted-route audio-input negative control", corruptedControls);

  return {
    id: "delay-family-variant",
    description: DELAY_VARIANT_DESCRIPTION,
    expectedClassification: "delay-runtime-supported",
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    childRunRoot: result?.runRoot || null,
    summary: result?.summary || null,
    childEvidence: {
      audioSignal: audioSignal?.resultPath || null,
      unmodifiedTiming: unmodifiedTiming?.resultPath || null,
      corruptedRouteNegativeControls: corruptedControls?.resultPath || null
    },
    failures,
    claimBoundary: "Delay-family prompt variant is tested through generated graph, conversion, emulator load, runtime audio gates, timing traces, and corrupted-route negative controls."
  };
}

async function runReverbVariant(runRoot, startedAt) {
  const caseRoot = resolve(runRoot, "reverb-lite-runtime-supported");
  const validationPath = resolve(caseRoot, "validation", "run-result.json");
  const semanticsPath = resolve(caseRoot, "runtime", "run-result.json");
  const validationCommand = runNode("tests/workflow/scripts/validate-generated-patch-candidates.mjs", [
    "--fixture-root",
    "tests/workflow/generated-patches/reverb-test",
    "--no-negative-fixtures",
    "--result-path",
    validationPath
  ]);
  const semanticsCommand = runNode("tests/workflow/playwright/run-zoia-playwright-generated-patch-reverb-semantics-evidence.mjs", [
    "--graph-root",
    "tests/workflow/generated-patches/reverb-test",
    "--result-path",
    semanticsPath
  ]);
  const validation = existsSync(validationPath) ? await readJson(validationPath) : null;
  const semantics = existsSync(semanticsPath) ? await readJson(semanticsPath) : null;
  const failures = [];
  assertCondition(failures, validationCommand.exitCode === 0, "command", "reverb validation command exited non-zero", validationCommand);
  assertCondition(failures, semanticsCommand.exitCode === 0, "command", "reverb runtime command exited non-zero", semanticsCommand);
  assertCondition(failures, validation?.status === PASS_STATUS && validation?.summary?.passingCandidateCount === 1, "validation", "reverb generated graph validation did not pass", validation?.summary || null);
  assertCondition(failures, semantics?.status === PASS_STATUS && semantics?.summary?.positiveTailCount === 1, "runtime-audio", "reverb runtime tail evidence did not pass", semantics?.summary || null);
  assertCondition(failures, semantics?.summary?.negativeTailAbsentCount === 1, "negative-control", "reverb bypass negative control did not pass", semantics?.summary || null);
  assertCondition(failures, completedAfterStart(semantics, startedAt), "freshness", "reverb runtime evidence is stale", { startedAt, completedAt: semantics?.completedAt || null });
  return {
    id: "reverb-lite-runtime-supported",
    description: REVERB_VARIANT_DESCRIPTION,
    expectedClassification: "reverb-runtime-supported",
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    commands: { validation: validationCommand, semantics: semanticsCommand },
    evidencePaths: { validation: validationPath, semantics: semanticsPath },
    summaries: {
      validation: validation?.summary || null,
      semantics: semantics?.summary || null
    },
    failures,
    claimBoundary: "Reverb prompt support is bounded to the committed Reverb Lite generated graph fixture, converter mapping, measured wet-tail evidence, and bypass negative control."
  };
}

async function runNonDelayControl(runRoot, startedAt, control) {
  const caseRoot = resolve(runRoot, control.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const patchRoot = resolve(caseRoot, "emulator-patches");
  const graphResultPath = resolve(caseRoot, "prompt-graph", "run-result.json");
  const convertResultPath = resolve(caseRoot, "convert-emulator", "run-result.json");
  const graphCommand = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", control.description,
    "--selection-limit", "8",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", graphResultPath
  ]);
  const convertCommand = runNode("tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs", [
    "--graph-root", graphRoot,
    "--output-root", patchRoot,
    "--result-path", convertResultPath
  ]);
  const graphResult = existsSync(graphResultPath) ? await readJson(graphResultPath) : null;
  const convertResult = existsSync(convertResultPath) ? await readJson(convertResultPath) : null;
  const unsupportedModuleBlockers = (convertResult?.blockers || []).filter((blocker) => blocker.id === "unsupported-generated-module");
  const expectedUnsupportedModuleFound = unsupportedModuleBlockers.some((blocker) => blocker.message?.includes(control.expectedUnsupportedModule));
  const failures = [];

  assertCondition(failures, graphCommand.exitCode === 0, "command", "non-delay graph generation exited non-zero", graphCommand);
  assertCondition(failures, graphResult?.status === PASS_STATUS, "graph-generation", "non-delay prompt did not produce a validated generated graph", graphResult?.summary || null);
  assertCondition(failures, completedAfterStart(graphResult, startedAt), "freshness", "non-delay graph evidence is stale", { startedAt, completedAt: graphResult?.completedAt || null });
  assertCondition(failures, convertCommand.exitCode !== 0, "negative-control", "non-delay prompt unexpectedly converted as emulator-loadable delay evidence", convertCommand);
  assertCondition(failures, convertResult?.status === BLOCKED_STATUS, "negative-control", "non-delay prompt conversion did not block", convertResult?.summary || null);
  assertCondition(failures, completedAfterStart(convertResult, startedAt), "freshness", "non-delay conversion evidence is stale", { startedAt, completedAt: convertResult?.completedAt || null });
  assertCondition(failures, unsupportedModuleBlockers.length > 0, "unsupported-boundary", "non-delay prompt did not record an unsupported module blocker", convertResult?.blockers || []);
  assertCondition(failures, expectedUnsupportedModuleFound, "unsupported-boundary", "non-delay prompt did not record the expected unsupported generated module", { expectedUnsupportedModule: control.expectedUnsupportedModule, unsupportedModuleBlockers });
  assertCondition(failures, convertResult?.summary?.convertedPatchCount === 0, "negative-control", "non-delay prompt wrote converted emulator patches", convertResult?.summary || null);

  return {
    id: control.id,
    description: control.description,
    expectedClassification: "graph-supported-runtime-unsupported",
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    commands: { graphCommand, convertCommand },
    graphResultPath,
    convertResultPath,
    graphRoot,
    patchRoot,
    summary: {
      graph: graphResult?.summary || null,
      conversion: convertResult?.summary || null,
      unsupportedModuleBlockerCount: unsupportedModuleBlockers.length,
      expectedUnsupportedModule: control.expectedUnsupportedModule
    },
    blockers: convertResult?.blockers || [],
    failures,
    claimBoundary: "This proves the non-delay prompt can reach generated graph validation but is not accepted as emulator-loadable delay runtime/audio evidence."
  };
}

async function runValidationBlockedControl(runRoot, startedAt, control) {
  const caseRoot = resolve(runRoot, control.id);
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const resultPath = resolve(caseRoot, "run-result.json");
  const command = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", control.description,
    "--selection-limit", "8",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const expectedValidationBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-validation-not-ready"));
  const failures = [];

  assertCondition(failures, command.exitCode !== 0, "negative-control", "validation-blocked prompt command unexpectedly passed", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "negative-control", "validation-blocked prompt did not block", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "validation-blocked prompt evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, expectedValidationBlocker, "unsupported-boundary", "validation-blocked prompt did not record the expected validation blocker", result?.blockers || []);
  assertCondition(failures, result?.summary?.validatedDraftCount === 0, "negative-control", "validation-blocked prompt reported validated drafts", result?.summary || null);

  return {
    id: control.id,
    description: control.description,
    expectedClassification: "validation-blocked-unsupported-prompt",
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    graphRoot,
    summary: result?.summary || null,
    blockers: result?.blockers || [],
    failures,
    claimBoundary: "This proves the prompt can select candidates and draft a graph, but validation blocks it before conversion or runtime evidence."
  };
}

async function runUnsupportedControl(runRoot, startedAt) {
  const caseRoot = resolve(runRoot, "unsupported-unmatched-prompt");
  const graphRoot = resolve(caseRoot, "generated-graphs");
  const resultPath = resolve(caseRoot, "run-result.json");
  const command = runNode("tests/workflow/scripts/generate-patch-from-description.mjs", [
    "--description", UNSUPPORTED_DESCRIPTION,
    "--selection-limit", "3",
    "--draft-limit", "1",
    "--draft-root", graphRoot,
    "--result-path", resultPath
  ]);
  const result = existsSync(resultPath) ? await readJson(resultPath) : null;
  const draftFiles = await listDraftFiles(graphRoot);
  const expectedSelectionBlocker = Boolean((result?.blockers || []).find((blocker) => blocker.id === "description-selection-not-ready"));
  const failures = [];

  assertCondition(failures, command.exitCode !== 0, "negative-control", "unsupported prompt command unexpectedly passed", command);
  assertCondition(failures, result?.status === BLOCKED_STATUS, "negative-control", "unsupported prompt did not block", result?.summary || null);
  assertCondition(failures, completedAfterStart(result, startedAt), "freshness", "unsupported prompt evidence is stale", { startedAt, completedAt: result?.completedAt || null });
  assertCondition(failures, expectedSelectionBlocker, "unsupported-boundary", "unsupported prompt did not record the expected selection blocker", result?.blockers || []);
  assertCondition(failures, draftFiles.length === 0, "negative-control", "unsupported prompt left generated draft files", draftFiles);

  return {
    id: "unsupported-unmatched-prompt",
    description: UNSUPPORTED_DESCRIPTION,
    expectedClassification: "blocked-unsupported-prompt",
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command,
    resultPath,
    graphRoot,
    summary: result?.summary || null,
    blockers: result?.blockers || [],
    draftFileCount: draftFiles.length,
    failures,
    claimBoundary: "This proves an unmatched prompt blocks at selection and cannot be counted as generated delay runtime evidence."
  };
}

async function main() {
  const { resultPath, seedMislabelNonDelayAsDelay, seedStaleDelayEvidence } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  const startedAt = nowIso();
  const runRoot = resolve(evidenceRoot, `run-${safeStamp(startedAt)}`);
  await mkdir(evidenceRoot, { recursive: true });
  await rm(runRoot, { recursive: true, force: true });
  await mkdir(runRoot, { recursive: true });

  const promptManifest = {
    schemaVersion: "zoia.generated-patch-prompt-breadth-manifest.v1",
    generatedAt: nowIso(),
    prompts: [
      { id: "delay-family-variant", description: DELAY_VARIANT_DESCRIPTION, expectedClassification: "delay-runtime-supported", runtimeAudioRequired: true },
      { id: "reverb-lite-runtime-supported", description: REVERB_VARIANT_DESCRIPTION, expectedClassification: "reverb-runtime-supported", runtimeAudioRequired: true },
      ...NON_DELAY_GRAPH_CONTROLS.map((control) => ({ id: control.id, description: control.description, expectedClassification: "graph-supported-runtime-unsupported", runtimeAudioRequired: false })),
      ...VALIDATION_BLOCKED_CONTROLS.map((control) => ({ id: control.id, description: control.description, expectedClassification: "validation-blocked-unsupported-prompt", runtimeAudioRequired: false })),
      { id: "unsupported-unmatched-prompt", description: UNSUPPORTED_DESCRIPTION, expectedClassification: "blocked-unsupported-prompt", runtimeAudioRequired: false }
    ],
    claimBoundary: {
      delayFamilyRuntimeClaim: true,
      reverbLiteRuntimeClaim: true,
      nonDelayRuntimeClaim: true,
      arbitraryPromptClaim: false,
      musicalQualityClaim: false,
      fullDspAccuracyClaim: false,
      hardwareParityClaim: false,
      completePatchSemanticsClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resolve(evidenceRoot, "prompt-manifest.json"), promptManifest);

  const cases = [
    await runDelayVariant(runRoot, startedAt),
    await runReverbVariant(runRoot, startedAt),
    ...(await Promise.all(NON_DELAY_GRAPH_CONTROLS.map((control) => runNonDelayControl(runRoot, startedAt, control)))),
    ...(await Promise.all(VALIDATION_BLOCKED_CONTROLS.map((control) => runValidationBlockedControl(runRoot, startedAt, control)))),
    await runUnsupportedControl(runRoot, startedAt)
  ];
  if (seedMislabelNonDelayAsDelay) {
    const seededCase = cases.find((item) => item.expectedClassification === "graph-supported-runtime-unsupported");
    if (seededCase) seededCase.expectedClassification = "delay-runtime-supported";
  }
  if (seedStaleDelayEvidence) {
    const seededCase = cases.find((item) => item.id === "delay-family-variant");
    if (seededCase) seededCase.completedAt = "1970-01-01T00:00:00.000Z";
  }
  const classificationLog = {
    schemaVersion: "zoia.generated-patch-prompt-breadth-classification-log.v1",
    generatedAt: nowIso(),
    classifications: cases.map((item) => ({
      id: item.id,
      description: item.description,
      expectedClassification: item.expectedClassification,
      status: item.status,
      failures: item.failures
    }))
  };
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);

  const assertionFailures = cases.flatMap((item) => item.failures.map((failure) => ({ caseId: item.id, ...failure })));
  for (const item of cases) {
    if (item.expectedClassification === "delay-runtime-supported" && item.id !== "delay-family-variant") {
      assertionFailures.push({
        caseId: item.id,
        surface: "prompt-boundary",
        message: "non-delay prompt case is mislabeled as delay runtime supported",
        evidence: { expectedClassification: item.expectedClassification, description: item.description }
      });
    }
    if (item.completedAt && item.completedAt < startedAt) {
      assertionFailures.push({
        caseId: item.id,
        surface: "freshness",
        message: "prompt breadth case evidence predates rollup start",
        evidence: { startedAt, completedAt: item.completedAt }
      });
    }
  }
  const result = {
    schemaVersion: "zoia.generated-patch-prompt-breadth-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:prompt-breadth-rollup",
    startedAt,
    completedAt: nowIso(),
    runRoot,
    summary: {
      blockerCount: assertionFailures.length,
      caseCount: cases.length,
      passingCaseCount: cases.filter((item) => item.status === PASS_STATUS).length,
      delayRuntimeSupportedCount: cases.filter((item) => item.expectedClassification === "delay-runtime-supported" && item.status === PASS_STATUS).length,
      reverbRuntimeSupportedCount: cases.filter((item) => item.expectedClassification === "reverb-runtime-supported" && item.status === PASS_STATUS).length,
      graphSupportedRuntimeUnsupportedCount: cases.filter((item) => item.expectedClassification === "graph-supported-runtime-unsupported" && item.status === PASS_STATUS).length,
      validationBlockedUnsupportedPromptCount: cases.filter((item) => item.expectedClassification === "validation-blocked-unsupported-prompt" && item.status === PASS_STATUS).length,
      blockedUnsupportedPromptCount: cases.filter((item) => item.expectedClassification === "blocked-unsupported-prompt" && item.status === PASS_STATUS).length
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
      promptBreadthBoundaryClaim: assertionFailures.length === 0,
      seededMislabelNonDelayAsDelay: seedMislabelNonDelayAsDelay,
      seededStaleDelayEvidence: seedStaleDelayEvidence,
      delayFamilyRuntimeClaim: assertionFailures.length === 0,
      reverbLiteRuntimeClaim: assertionFailures.length === 0,
      nonDelayGraphBoundaryClaim: assertionFailures.length === 0,
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
    schemaVersion: "zoia.generated-patch-prompt-breadth-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
