#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-prompt-breadth-rollup-negative-controls");
const DEFAULT_RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";

function nowIso() {
  return new Date().toISOString();
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

function runSeededCase(id, seedFlag, resultPath) {
  const command = spawnSync(process.execPath, [
    "tests/workflow/scripts/run-generated-patch-prompt-breadth-rollup.mjs",
    seedFlag,
    "--result-path",
    resultPath
  ], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    id,
    seedFlag,
    resultPath,
    exitCode: command.status,
    stdoutTail: command.stdout.slice(-2000),
    stderrTail: command.stderr.slice(-2000)
  };
}

async function main() {
  const { resultPath } = parseArgs(process.argv.slice(2));
  const evidenceRoot = dirname(resultPath);
  await mkdir(evidenceRoot, { recursive: true });
  const startedAt = nowIso();
  const seededCases = [
    {
      id: "mislabel-non-delay-as-delay",
      seedFlag: "--seed-mislabel-non-delay-as-delay",
      expectedSurface: "prompt-boundary"
    },
    {
      id: "stale-delay-evidence",
      seedFlag: "--seed-stale-delay-evidence",
      expectedSurface: "freshness"
    }
  ];

  const records = [];
  for (const seededCase of seededCases) {
    const seededResultPath = resolve(evidenceRoot, seededCase.id, "run-result.json");
    const command = runSeededCase(seededCase.id, seededCase.seedFlag, seededResultPath);
    const childResult = existsSync(seededResultPath) ? await readJson(seededResultPath) : null;
    const expectedFailureFound = Boolean((childResult?.assertionFailures || []).find((failure) => failure.surface === seededCase.expectedSurface));
    const failures = [];
    if (command.exitCode === 0) {
      failures.push({ surface: "command", message: "seeded prompt-breadth rollup command unexpectedly passed", evidence: command });
    }
    if (childResult?.status !== FAIL_STATUS) {
      failures.push({ surface: "child-result", message: "seeded prompt-breadth rollup did not fail", evidence: childResult?.summary || null });
    }
    if (!expectedFailureFound) {
      failures.push({ surface: "expected-failure", message: "seeded prompt-breadth rollup did not record the expected failure surface", evidence: { expectedSurface: seededCase.expectedSurface, assertionFailures: childResult?.assertionFailures || [] } });
    }
    records.push({
      ...seededCase,
      status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
      command,
      childStatus: childResult?.status || null,
      childSummary: childResult?.summary || null,
      expectedFailureFound,
      failures
    });
  }

  const assertionFailures = records.flatMap((record) => record.failures.map((failure) => ({ caseId: record.id, ...failure })));
  const result = {
    schemaVersion: "zoia.generated-patch-prompt-breadth-rollup-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:prompt-breadth-rollup:negative-controls",
    startedAt,
    completedAt: nowIso(),
    summary: {
      blockerCount: assertionFailures.length,
      caseCount: records.length,
      passingCaseCount: records.filter((record) => record.status === PASS_STATUS).length,
      seededFailureCount: records.filter((record) => record.childStatus === FAIL_STATUS).length,
      expectedFailureFoundCount: records.filter((record) => record.expectedFailureFound).length
    },
    assertionFailures,
    records,
    artifacts: {
      resultPath,
      evidenceRoot
    },
    claimBoundary: {
      seededNegativeControlClaim: assertionFailures.length === 0,
      promptBreadthPositiveClaim: false,
      arbitraryPromptClaim: false,
      nonDelayRuntimeClaim: false
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({ status: result.status, ...result.summary, resultPath }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-prompt-breadth-rollup-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
