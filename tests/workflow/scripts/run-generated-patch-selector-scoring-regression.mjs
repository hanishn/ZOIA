#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-selector-scoring-regression");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const UNMATCHED_SELECTION_RESULT_PATH = resolve(EVIDENCE_ROOT, "unmatched-selection-result.json");
const COVERAGE_INDEX_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/community-coverage-index/run-result.json");
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

function runUnmatchedSelection() {
  return spawnSync(process.execPath, [
    "tests/workflow/scripts/select-verified-patch-template.mjs",
    "--description",
    "zzzxqv kpwrrt lmnoqx",
    "--limit",
    "10",
    "--result-path",
    UNMATCHED_SELECTION_RESULT_PATH
  ], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const problems = [];
  if (!existsSync(COVERAGE_INDEX_PATH)) {
    problems.push({
      id: "coverage-index-missing",
      message: "Community coverage index is missing.",
      evidencePath: COVERAGE_INDEX_PATH
    });
  }

  const coverageIndex = problems.length === 0 ? await readJson(COVERAGE_INDEX_PATH) : null;
  const measuredSignalRecordCount = (coverageIndex?.records || [])
    .filter((record) => record.verificationKind === "measured-signal").length;
  if (measuredSignalRecordCount < 1) {
    problems.push({
      id: "measured-signal-records-missing",
      message: "Selector scoring regression requires measured-signal records to prove the measured bonus cannot select by itself.",
      evidencePath: COVERAGE_INDEX_PATH,
      observed: { measuredSignalRecordCount }
    });
  }

  const command = runUnmatchedSelection();
  const selection = existsSync(UNMATCHED_SELECTION_RESULT_PATH)
    ? await readJson(UNMATCHED_SELECTION_RESULT_PATH)
    : null;
  if (command.status === 0) {
    problems.push({
      id: "unmatched-selection-command-passed",
      message: "Selector accepted an unmatched description.",
      observed: {
        exitCode: command.status,
        stdout: command.stdout,
        stderr: command.stderr
      }
    });
  }
  if (!selection) {
    problems.push({
      id: "unmatched-selection-result-missing",
      message: "Selector did not write unmatched-selection regression evidence.",
      evidencePath: UNMATCHED_SELECTION_RESULT_PATH
    });
  } else {
    if (selection.status !== "fail") {
      problems.push({
        id: "unmatched-selection-status-invalid",
        message: "Selector result for unmatched description must fail.",
        evidencePath: UNMATCHED_SELECTION_RESULT_PATH,
        observed: { status: selection.status }
      });
    }
    if (selection.summary?.candidateCount !== 0 || selection.candidates?.length !== 0) {
      problems.push({
        id: "measured-signal-only-candidate-leaked",
        message: "Selector produced candidates without lexical or modality matches.",
        evidencePath: UNMATCHED_SELECTION_RESULT_PATH,
        observed: {
          summary: selection.summary,
          candidateCount: selection.candidates?.length ?? null
        }
      });
    }
    if (selection.intent?.tokens?.length < 1) {
      problems.push({
        id: "unmatched-intent-tokenization-empty",
        message: "Regression input must tokenize to non-empty unmatched tokens.",
        evidencePath: UNMATCHED_SELECTION_RESULT_PATH,
        observed: { intent: selection.intent || null }
      });
    }
  }

  const result = {
    schemaVersion: "zoia.generated-patch-selector-scoring-regression-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      commandExitCode: command.status,
      measuredSignalRecordCount,
      unmatchedSelectionStatus: selection?.status || null,
      unmatchedCandidateCount: selection?.summary?.candidateCount ?? null
    },
    command: {
      stdout: command.stdout,
      stderr: command.stderr
    },
    problems,
    claimBoundary: "This regression verifies measured-signal scoring bonuses cannot select candidates without lexical or modality matches.",
    artifacts: {
      resultPath: RESULT_PATH,
      unmatchedSelectionResultPath: UNMATCHED_SELECTION_RESULT_PATH,
      coverageIndexPath: COVERAGE_INDEX_PATH
    }
  };

  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH,
    unmatchedSelectionResultPath: UNMATCHED_SELECTION_RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-selector-scoring-regression-result.v1",
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
