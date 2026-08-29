#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-from-description");
const DEFAULT_RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const DEFAULT_DRAFT_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/from-description");
const DEFAULT_DESCRIPTION = "ambient delay with slow modulation and expression pedal feedback control";
const JSON_SPACES = 2;

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let description = null;
  let selectionLimit = 8;
  let draftLimit = 3;
  let resultPath = DEFAULT_RESULT_PATH;
  let draftRoot = DEFAULT_DRAFT_ROOT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--description") {
      description = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--selection-limit") {
      selectionLimit = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
    } else if (arg === "--draft-limit") {
      draftLimit = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--draft-root") {
      draftRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (!arg.startsWith("--")) {
      description = [description, arg].filter(Boolean).join(" ");
    }
  }

  return {
    description: (description || DEFAULT_DESCRIPTION).trim(),
    selectionLimit: Number.isFinite(selectionLimit) && selectionLimit > 0 ? Math.min(selectionLimit, 50) : 8,
    draftLimit: Number.isFinite(draftLimit) && draftLimit > 0 ? Math.min(draftLimit, 20) : 3,
    resultPath,
    draftRoot
  };
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function runNodeScript(scriptPath, args) {
  const command = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    scriptPath,
    args,
    exitCode: command.status,
    stdout: command.stdout,
    stderr: command.stderr
  };
}

async function main() {
  const { description, selectionLimit, draftLimit, resultPath, draftRoot } = parseArgs(process.argv.slice(2));
  const resultRoot = dirname(resultPath);
  await mkdir(resultRoot, { recursive: true });
  const startedAt = nowIso();
  const selectionResultPath = resolve(resultRoot, "selection-result.json");
  const draftResultPath = resolve(resultRoot, "draft-result.json");
  const validationResultPath = resolve(resultRoot, "validation-result.json");

  await rm(draftRoot, { recursive: true, force: true });
  const commands = [];
  const selectionCommand = runNodeScript("tests/workflow/scripts/select-verified-patch-template.mjs", [
      "--description",
      description,
      "--limit",
      String(selectionLimit),
      "--result-path",
      selectionResultPath
  ]);
  commands.push(selectionCommand);

  if (selectionCommand.exitCode === 0) {
    const draftCommand = runNodeScript("tests/workflow/scripts/draft-generated-graphs-from-selection.mjs", [
      "--selection-result",
      selectionResultPath,
      "--limit",
      String(draftLimit),
      "--draft-root",
      draftRoot,
      "--result-path",
      draftResultPath
    ]);
    commands.push(draftCommand);

    if (draftCommand.exitCode === 0) {
      commands.push(runNodeScript("tests/workflow/scripts/validate-generated-patch-candidates.mjs", [
        "--fixture-root",
        draftRoot,
        "--no-negative-fixtures",
        "--result-path",
        validationResultPath
      ]));
    }
  }

  const selection = existsSync(selectionResultPath) ? await readJson(selectionResultPath) : null;
  const drafts = existsSync(draftResultPath) ? await readJson(draftResultPath) : null;
  const validation = existsSync(validationResultPath) ? await readJson(validationResultPath) : null;
  const blockers = [];

  if (commands.some((command) => command.exitCode !== 0)) {
    blockers.push({
      id: "description-workflow-command-failed",
      message: "One or more generated-patch description workflow commands failed.",
      commands: commands.filter((command) => command.exitCode !== 0)
    });
  }
  if (!selection || selection.status !== "pass" || selection.summary?.measuredCandidateCount < 1) {
    blockers.push({
      id: "description-selection-not-ready",
      message: "Human-description template selection did not produce measured verified candidates.",
      evidencePath: selectionResultPath,
      observed: selection?.summary || null
    });
  }
  if (!drafts || drafts.status !== "pass" || drafts.summary?.draftCount < 1) {
    blockers.push({
      id: "description-drafts-not-ready",
      message: "Human-description selected candidates did not produce generated graph drafts.",
      evidencePath: draftResultPath,
      observed: drafts?.summary || null
    });
  }
  if (
    !validation ||
    validation.status !== "pass" ||
    validation.summary?.candidateCount < 1 ||
    validation.summary?.passingCandidateCount !== validation.summary?.candidateCount
  ) {
    blockers.push({
      id: "description-validation-not-ready",
      message: "Human-description generated graph drafts did not pass pre-export validation.",
      evidencePath: validationResultPath,
      observed: validation?.summary || null
    });
  }

  const result = {
    schemaVersion: "zoia.generated-patch-from-description-result.v1",
    version: "0.4.0",
    revision: 1,
    status: blockers.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    description,
    inputs: {
      selectionLimit,
      draftLimit
    },
    commands,
    summary: {
      blockerCount: blockers.length,
      selectedCandidateCount: selection?.summary?.candidateCount ?? null,
      measuredCandidateCount: selection?.summary?.measuredCandidateCount ?? null,
      draftCount: drafts?.summary?.draftCount ?? null,
      validatedDraftCount: validation?.summary?.passingCandidateCount ?? null
    },
    blockers,
    claimBoundaries: {
      humanDescriptionInputClaim: true,
      selectedExistingTemplateOnly: true,
      generatedIntermediateGraphClaim: true,
      preExportValidationOnly: true,
      exportedPatchClaim: false,
      fullNovelSynthesisClaim: false,
      runtimeAudioClaim: false
    },
    artifacts: {
      resultPath,
      selectionResultPath,
      draftResultPath,
      validationResultPath,
      draftRoot
    }
  };

  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath,
    draftRoot
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-from-description-result.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    completedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
