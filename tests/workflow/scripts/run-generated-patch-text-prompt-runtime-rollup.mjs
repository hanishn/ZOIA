#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-text-prompt-runtime-rollup");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const DEFAULT_DESCRIPTION = "ambient delay with slow modulation and expression pedal feedback control";
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";

function nowIso() {
  return new Date().toISOString();
}

function safeStamp(iso) {
  return iso.replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  let description = DEFAULT_DESCRIPTION;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--description") {
      description = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return { description: description.trim() || DEFAULT_DESCRIPTION, resultPath };
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
    stdout: command.stdout,
    stderr: command.stderr
  };
}

function statusOf(result) {
  return result?.status || null;
}

async function main() {
  const { description, resultPath } = parseArgs(process.argv.slice(2));
  const startedAt = nowIso();
  const evidenceRoot = dirname(resultPath);
  const runRoot = resolve(evidenceRoot, `run-${safeStamp(startedAt)}`);
  const graphRoot = resolve(runRoot, "generated-graphs");
  const patchRoot = resolve(runRoot, "emulator-patches");
  await mkdir(evidenceRoot, { recursive: true });
  await rm(runRoot, { recursive: true, force: true });
  await mkdir(runRoot, { recursive: true });

  const steps = [
    {
      id: "prompt-graph",
      command: [
        "tests/workflow/scripts/generate-patch-from-description.mjs",
        "--description", description,
        "--draft-root", graphRoot,
        "--result-path", resolve(runRoot, "prompt-graph", "run-result.json")
      ]
    },
    {
      id: "convert-emulator",
      command: [
        "tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs",
        "--graph-root", graphRoot,
        "--output-root", patchRoot,
        "--result-path", resolve(runRoot, "convert-emulator", "run-result.json")
      ]
    },
    {
      id: "playwright-load",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-load-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "playwright-load", "run-result.json")
      ]
    },
    {
      id: "audio-signal",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-audio-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "audio-signal", "run-result.json")
      ]
    },
    {
      id: "delay-semantics",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-delay-semantics-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "delay-semantics", "run-result.json")
      ]
    },
    {
      id: "modulation-semantics",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-modulation-semantics-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "modulation-semantics", "run-result.json")
      ]
    },
    {
      id: "lfo-semantics",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-lfo-semantics-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "lfo-semantics", "run-result.json")
      ]
    },
    {
      id: "expression-feedback",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-expression-feedback-semantics-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "expression-feedback", "run-result.json")
      ]
    },
    {
      id: "unmodified-timing",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-unmodified-modulated-timing-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "unmodified-timing", "run-result.json")
      ]
    },
    {
      id: "corrupted-route-negative-controls",
      command: [
        "tests/workflow/playwright/run-zoia-playwright-generated-patch-corrupted-route-negative-controls-evidence.mjs",
        "--patch-root", patchRoot,
        "--result-path", resolve(runRoot, "corrupted-route-negative-controls", "run-result.json")
      ]
    }
  ];

  const executed = [];
  for (const step of steps) {
    const [scriptPath, ...args] = step.command;
    const command = runNode(scriptPath, args);
    let childResult = null;
    try {
      childResult = await readJson(args[args.indexOf("--result-path") + 1]);
    } catch (error) {
      childResult = { status: FAIL_STATUS, error: { message: error.message } };
    }
    executed.push({
      id: step.id,
      scriptPath,
      args,
      exitCode: command.exitCode,
      resultPath: args[args.indexOf("--result-path") + 1],
      status: statusOf(childResult),
      summary: childResult.summary || null,
      completedAt: childResult.completedAt || null,
      stdoutTail: command.stdout.slice(-2000),
      stderrTail: command.stderr.slice(-2000)
    });
    if (command.exitCode !== 0 || statusOf(childResult) !== PASS_STATUS) break;
  }

  const assertionFailures = [];
  for (const step of executed) {
    if (step.exitCode !== 0) assertionFailures.push({ step: step.id, surface: "command", message: "child command exited non-zero", exitCode: step.exitCode, resultPath: step.resultPath });
    if (step.status !== PASS_STATUS) assertionFailures.push({ step: step.id, surface: "child-result", message: "child result did not pass", status: step.status, resultPath: step.resultPath });
    if (step.completedAt && step.completedAt < startedAt) assertionFailures.push({ step: step.id, surface: "freshness", message: "child evidence completed before rollup start", completedAt: step.completedAt, startedAt });
  }
  if (executed.length !== steps.length) assertionFailures.push({ surface: "coverage", message: "not all child gates executed", executedCount: executed.length, expectedCount: steps.length });

  const result = {
    schemaVersion: "zoia.generated-patch-text-prompt-runtime-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:text-prompt-runtime-rollup",
    startedAt,
    completedAt: nowIso(),
    description,
    runRoot,
    graphRoot,
    patchRoot,
    summary: {
      blockerCount: assertionFailures.length,
      stepCount: steps.length,
      executedStepCount: executed.length,
      passedStepCount: executed.filter((step) => step.status === PASS_STATUS && step.exitCode === 0).length
    },
    assertionFailures,
    steps: executed,
    claimBoundaries: {
      freshRunScopedEvidenceClaim: assertionFailures.length === 0,
      promptToRuntimeTestedPatchClaim: assertionFailures.length === 0,
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
    schemaVersion: "zoia.generated-patch-text-prompt-runtime-rollup.v1",
    version: "0.4.0",
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
