import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(new URL("../../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const EVIDENCE_ROOT = path.join(PROJECT_ROOT, "tests/workflow/evidence/q109-ci-gate-integration");
const RESULT_PATH = path.join(EVIDENCE_ROOT, "run-result.json");
const Q106_RESULT_PATH = path.join(
  PROJECT_ROOT,
  "tests/workflow/evidence/q106-community-patch-audio-classification-baseline/run-result.json",
);
const Q106_FAILURE_SUMMARY_PATH = path.join(
  PROJECT_ROOT,
  "tests/workflow/evidence/q106-community-patch-audio-classification-baseline/failure-summary.csv",
);
const EXPECTED_COMMUNITY_FIXTURE_COUNT = 1884;
const EXPECTED_COMMUNITY_FAIL_COUNT = 0;
const NPM_CLI = process.env.npm_execpath;
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";
const STAGED_FIXTURE_SENTINEL = path.join(
  PROJECT_ROOT,
  "tests/workflow/canonical-patches/Test_Modules/_prototype/PROTOTYPE_A01_Spring_Reverb.bin",
);

if (!NPM_CLI) {
  throw new Error("npm_execpath is required. Run this script through npm run zoia:test:ci.");
}

const gates = [
  {
    id: "shared-ssl-provenance",
    command: process.execPath,
    args: [NPM_CLI, "--prefix", "shared/ssl/zoia-shared-ssl", "run", "verify"],
  },
  {
    id: "ssl-proof",
    command: process.execPath,
    args: [NPM_CLI, "run", "zoia:ssl:proof"],
  },
  {
    id: "parser-and-no-magic",
    command: process.execPath,
    args: [NPM_CLI, "run", "zoia:lint:no-magic"],
  },
];

function runGate(gate) {
  const startedAt = new Date();
  return new Promise((resolve) => {
    const child = spawn(gate.command, gate.args, {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      const finishedAt = new Date();
      resolve({
        id: gate.id,
        command: [gate.command, ...gate.args].join(" "),
        status: code === 0 ? "pass" : "fail",
        exitCode: code,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-4000),
      });
    });
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function checkQ106Packaging() {
  const resultExists = fs.existsSync(Q106_RESULT_PATH);
  const failureSummaryExists = fs.existsSync(Q106_FAILURE_SUMMARY_PATH);
  const result = resultExists ? readJson(Q106_RESULT_PATH) : null;
  const pass =
    resultExists &&
    failureSummaryExists &&
    result.status === "pass" &&
    result.fixtureCount === EXPECTED_COMMUNITY_FIXTURE_COUNT &&
    result.failCount === EXPECTED_COMMUNITY_FAIL_COUNT;
  return {
    id: "q106-community-packaging",
    status: pass ? "pass" : "fail",
    resultPath: Q106_RESULT_PATH,
    failureSummaryPath: Q106_FAILURE_SUMMARY_PATH,
    resultExists,
    failureSummaryExists,
    observed: result
      ? {
          status: result.status,
          fixtureCount: result.fixtureCount,
          passCount: result.passCount,
          classifiedCount: result.classifiedCount,
          failCount: result.failCount,
        }
      : null,
    expected: {
      fixtureCount: EXPECTED_COMMUNITY_FIXTURE_COUNT,
      failCount: EXPECTED_COMMUNITY_FAIL_COUNT,
    },
  };
}

function skippedGate(id, reason) {
  return {
    id,
    status: "skipped",
    reason,
  };
}

async function main() {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const startedAt = new Date();
  const gateResults = [];
  for (const gate of gates) {
    gateResults.push(await runGate(gate));
  }
  if (!fs.existsSync(STAGED_FIXTURE_SENTINEL)) {
    gateResults.push(skippedGate("staged-audio", "canonical staged patch binaries are excluded from the repository"));
  } else {
    gateResults.push(
      await runGate({
        id: "staged-audio",
        command: process.execPath,
        args: [NPM_CLI, "run", "zoia:test:playwright:staged-patch-audio"],
      }),
    );
  }
  if (!fs.existsSync(Q106_RESULT_PATH)) {
    gateResults.push(skippedGate("q106-community-packaging", "generated community evidence is excluded from the repository"));
  } else {
    gateResults.push(checkQ106Packaging());
  }
  const finishedAt = new Date();
  const failed = gateResults.filter((gate) => gate.status === "fail");
  const payload = {
    status: failed.length === 0 ? "pass" : "fail",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    gateCount: gateResults.length,
    passCount: gateResults.filter((gate) => gate.status === "pass").length,
    skipCount: gateResults.filter((gate) => gate.status === "skipped").length,
    failCount: failed.length,
    evidenceRoot: EVIDENCE_ROOT,
    gates: gateResults,
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(RESULT_PATH);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
