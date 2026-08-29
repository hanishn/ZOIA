#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-from-description-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const BLOCKED_DESCRIPTION_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-unmatched-description.json");
const DRAFT_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patches/negative-description/unmatched");
const CANONICAL_DESCRIPTION_SELECTION_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-from-description/selection-result.json");
const UNMATCHED_DESCRIPTION = "zzzxqv kpwrrt lmnoqx";
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

async function listGeneratedDraftFiles(root) {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(graph|trace)\.json$/i.test(entry.name))
    .map((entry) => resolve(entry.parentPath || root, entry.name));
}

function runBlockedDescriptionCase() {
  return spawnSync(process.execPath, [
    "tests/workflow/scripts/generate-patch-from-description.mjs",
    "--description",
    UNMATCHED_DESCRIPTION,
    "--selection-limit",
    "3",
    "--draft-limit",
    "1",
    "--result-path",
    BLOCKED_DESCRIPTION_RESULT_PATH,
    "--draft-root",
    DRAFT_ROOT
  ], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const command = runBlockedDescriptionCase();
  const blockedResult = existsSync(BLOCKED_DESCRIPTION_RESULT_PATH)
    ? await readJson(BLOCKED_DESCRIPTION_RESULT_PATH)
    : null;
  const blockedSelectionPath = blockedResult?.artifacts?.selectionResultPath || null;
  const blockedSelection = blockedSelectionPath && existsSync(blockedSelectionPath)
    ? await readJson(blockedSelectionPath)
    : null;
  const canonicalSelection = existsSync(CANONICAL_DESCRIPTION_SELECTION_PATH)
    ? await readJson(CANONICAL_DESCRIPTION_SELECTION_PATH)
    : null;
  const leftoverDraftFiles = await listGeneratedDraftFiles(DRAFT_ROOT);
  const expectedBlockerFound = Boolean((blockedResult?.blockers || [])
    .find((blocker) => blocker.id === "description-selection-not-ready"));
  const blockedSelectionIsIsolated = Boolean(
    blockedSelectionPath &&
    resolve(blockedSelectionPath) !== CANONICAL_DESCRIPTION_SELECTION_PATH &&
    resolve(blockedSelectionPath).startsWith(EVIDENCE_ROOT)
  );
  const canonicalPositiveSelectionPreserved = Boolean(
    canonicalSelection?.status === "pass" &&
    canonicalSelection.summary?.candidateCount > 0 &&
    canonicalSelection.intent?.description !== UNMATCHED_DESCRIPTION
  );
  const problems = [];

  if (command.status === 0) {
    problems.push({
      id: "negative-description-command-passed",
      message: "Human-description workflow passed with an unmatched negative-control description."
    });
  }
  if (!blockedResult) {
    problems.push({
      id: "negative-description-result-missing",
      message: "Blocked human-description workflow evidence was not written.",
      evidencePath: BLOCKED_DESCRIPTION_RESULT_PATH
    });
  } else {
    if (blockedResult.status !== "blocked") {
      problems.push({
        id: "negative-description-result-not-blocked",
        message: "Human-description workflow did not block with an unmatched negative-control description.",
        evidencePath: BLOCKED_DESCRIPTION_RESULT_PATH,
        observed: { status: blockedResult.status }
      });
    }
    if (!expectedBlockerFound) {
      problems.push({
        id: "negative-description-blocker-missing",
        message: "Human-description workflow did not report the expected selection blocker.",
        evidencePath: BLOCKED_DESCRIPTION_RESULT_PATH,
        observed: {
          blockers: blockedResult.blockers || []
        }
      });
    }
  }
  if (leftoverDraftFiles.length > 0) {
    problems.push({
      id: "negative-description-leftover-drafts",
      message: "Unmatched human-description negative control left generated draft files behind.",
      evidencePath: DRAFT_ROOT,
      observed: {
        leftoverDraftFiles
      }
    });
  }
  if (!blockedSelectionIsIsolated) {
    problems.push({
      id: "negative-description-selection-not-isolated",
      message: "Unmatched human-description negative control did not write selection evidence under its isolated result folder.",
      evidencePath: blockedSelectionPath,
      observed: {
        expectedRoot: EVIDENCE_ROOT,
        canonicalSelectionPath: CANONICAL_DESCRIPTION_SELECTION_PATH
      }
    });
  }
  if (!blockedSelection || blockedSelection.status !== "fail" || blockedSelection.summary?.candidateCount !== 0) {
    problems.push({
      id: "negative-description-selection-result-invalid",
      message: "Unmatched human-description negative control did not preserve isolated failing selection evidence.",
      evidencePath: blockedSelectionPath,
      observed: blockedSelection ? {
        status: blockedSelection.status,
        summary: blockedSelection.summary,
        description: blockedSelection.intent?.description || null
      } : null
    });
  }
  if (!canonicalPositiveSelectionPreserved) {
    problems.push({
      id: "canonical-description-selection-overwritten",
      message: "Unmatched human-description negative control overwrote or degraded canonical positive selection evidence.",
      evidencePath: CANONICAL_DESCRIPTION_SELECTION_PATH,
      observed: canonicalSelection ? {
        status: canonicalSelection.status,
        summary: canonicalSelection.summary,
        description: canonicalSelection.intent?.description || null
      } : null
    });
  }

  const result = {
    schemaVersion: "zoia.generated-patch-from-description-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      caseCount: 1,
      passingCaseCount: problems.length === 0 ? 1 : 0,
      problemCount: problems.length,
      commandExitCode: command.status,
      blockedDescriptionStatus: blockedResult?.status || null,
      expectedBlockerFound,
      leftoverDraftFileCount: leftoverDraftFiles.length,
      blockedSelectionIsIsolated,
      blockedSelectionStatus: blockedSelection?.status || null,
      blockedSelectionCandidateCount: blockedSelection?.summary?.candidateCount ?? null,
      canonicalPositiveSelectionPreserved
    },
    command: {
      stdout: command.stdout,
      stderr: command.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies the human-description workflow blocks when no verified template candidate is selected.",
    artifacts: {
      resultPath: RESULT_PATH,
      blockedDescriptionResultPath: BLOCKED_DESCRIPTION_RESULT_PATH,
      blockedSelectionPath,
      canonicalDescriptionSelectionPath: CANONICAL_DESCRIPTION_SELECTION_PATH,
      draftRoot: DRAFT_ROOT
    }
  };

  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH,
    blockedDescriptionResultPath: BLOCKED_DESCRIPTION_RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-from-description-negative-controls-result.v1",
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
