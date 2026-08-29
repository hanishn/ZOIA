#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-export-boundary-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const VALIDATION_RESULT_PATH = resolve(EVIDENCE_ROOT, "validation-result.json");
const FIXTURE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/export-boundary");
const JSON_SPACES = 2;

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function runValidation() {
  return spawnSync(process.execPath, [
    "tests/workflow/scripts/validate-generated-patch-candidates.mjs",
    "--fixture-root",
    FIXTURE_ROOT,
    "--result-path",
    VALIDATION_RESULT_PATH
  ], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const command = runValidation();
  const validation = existsSync(VALIDATION_RESULT_PATH) ? await readJson(VALIDATION_RESULT_PATH) : null;
  const errorCodes = (validation?.results || []).flatMap((item) => (item.errors || []).map((error) => error.code));
  const expectedExportBoundaryFound = errorCodes.includes("export-boundary-field") &&
    errorCodes.includes("module-export-boundary-field");
  const problems = [];

  if (command.status !== 0) {
    problems.push({
      id: "export-boundary-validation-command-failed",
      message: "Generated-patch export-boundary validation command failed.",
      observed: {
        exitCode: command.status,
        stdout: command.stdout,
        stderr: command.stderr
      }
    });
  }
  if (!validation) {
    problems.push({
      id: "export-boundary-validation-result-missing",
      message: "Export-boundary validation result was not written.",
      evidencePath: VALIDATION_RESULT_PATH
    });
  } else {
    if (validation.status !== "pass") {
      problems.push({
        id: "export-boundary-validation-status-invalid",
        message: "Export-boundary validation fixture run did not complete as an expected negative-control pass.",
        evidencePath: VALIDATION_RESULT_PATH,
        observed: {
          status: validation.status,
          summary: validation.summary
        }
      });
    }
    if (!expectedExportBoundaryFound) {
      problems.push({
        id: "export-boundary-error-missing",
        message: "Export-boundary validation did not report both graph and module export-boundary errors.",
        evidencePath: VALIDATION_RESULT_PATH,
        observed: {
          errorCodes
        }
      });
    }
  }

  const result = {
    schemaVersion: "zoia.generated-patch-export-boundary-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      caseCount: 1,
      passingCaseCount: problems.length === 0 ? 1 : 0,
      problemCount: problems.length,
      commandExitCode: command.status,
      validationStatus: validation?.status || null,
      expectedExportBoundaryFound
    },
    command: {
      stdout: command.stdout,
      stderr: command.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies generated-patch validation rejects export-looking payload fields before binary export support exists.",
    artifacts: {
      resultPath: RESULT_PATH,
      validationResultPath: VALIDATION_RESULT_PATH,
      fixtureRoot: FIXTURE_ROOT
    }
  };

  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH,
    validationResultPath: VALIDATION_RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-export-boundary-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    generatedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    artifacts: {
      resultPath: RESULT_PATH
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
