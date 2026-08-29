#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-filter-repeatability-negative-controls");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const CONTROLS = Object.freeze([
  {
    id: "stale-trace-evidence",
    args: ["--seed-stale-trace-evidence"],
    expectedSurface: "freshness"
  },
  {
    id: "missing-trace-evidence",
    args: ["--seed-missing-trace-evidence"],
    expectedSurface: "control-trace"
  }
]);

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

function runControl(control, evidenceRoot) {
  const resultPath = resolve(evidenceRoot, control.id, "run-result.json");
  const command = spawnSync(process.execPath, [
    "tests/workflow/scripts/run-generated-patch-filter-repeatability-rollup.mjs",
    ...control.args,
    "--result-path", resultPath
  ], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    resultPath,
    command: {
      scriptPath: "tests/workflow/scripts/run-generated-patch-filter-repeatability-rollup.mjs",
      args: [...control.args, "--result-path", resultPath],
      exitCode: command.status,
      signal: command.signal,
      stdoutTail: command.stdout.slice(-2000),
      stderrTail: command.stderr.slice(-2000)
    }
  };
}

async function main() {
  const { resultPath } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  const startedAt = nowIso();
  await mkdir(evidenceRoot, { recursive: true });

  const controls = [];
  for (const control of CONTROLS) {
    const run = runControl(control, evidenceRoot);
    const child = existsSync(run.resultPath) ? await readJson(run.resultPath) : null;
    const expectedFailureFound = Boolean((child?.assertionFailures || []).find((failure) => failure.surface === control.expectedSurface));
    const passed = run.command.exitCode !== 0 && child?.status === FAIL_STATUS && expectedFailureFound;
    controls.push({
      ...control,
      status: passed ? PASS_STATUS : FAIL_STATUS,
      childStatus: child?.status || null,
      expectedFailureFound,
      resultPath: run.resultPath,
      command: run.command,
      assertionFailures: child?.assertionFailures || []
    });
  }

  const failures = controls.filter((control) => control.status !== PASS_STATUS);
  const result = {
    schemaVersion: "zoia.generated-patch-filter-repeatability-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:filter-repeatability:negative-controls",
    startedAt,
    completedAt: nowIso(),
    summary: {
      blockerCount: failures.length,
      controlCount: controls.length,
      passingControlCount: controls.filter((control) => control.status === PASS_STATUS).length,
      seededFailureCount: controls.length,
      expectedFailureFoundCount: controls.filter((control) => control.expectedFailureFound).length
    },
    assertionFailures: failures.map((control) => ({
      controlId: control.id,
      surface: control.expectedSurface,
      message: "seeded filter repeatability control did not fail on expected surface",
      evidence: { childStatus: control.childStatus, expectedFailureFound: control.expectedFailureFound, resultPath: control.resultPath }
    })),
    controls,
    artifacts: { resultPath },
    claimBoundaries: {
      filterRepeatabilityFalsePassSensitivityClaim: failures.length === 0,
      filterRuntimeSupportClaim: false,
      audibleCutoffSweepClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({ status: result.status, ...result.summary, resultPath }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-filter-repeatability-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
