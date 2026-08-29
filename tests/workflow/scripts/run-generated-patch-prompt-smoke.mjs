#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-prompt-smoke");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;

const PROMPTS = Object.freeze([
  {
    id: "ambient-delay-expression",
    description: "ambient delay with slow modulation and expression pedal feedback control",
    requiredCoreTypes: ["Delay Line"]
  },
  {
    id: "self-playing-synth-loop",
    description: "self playing synth loop with sequencer movement and audio output",
    requiredCoreTypes: ["Synth Voice"]
  },
  {
    id: "modulated-reverb-effect",
    description: "modulated reverb effect for guitar with control over mix",
    requiredCoreTypes: ["Reverb Lite"]
  }
]);

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

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function addProblem(problems, id, message, evidencePath, observed = null) {
  problems.push({ id, message, evidencePath, observed });
}

async function summarizeValidatedGraphs(validation) {
  const summaries = [];
  for (const item of validation?.results || []) {
    if (!item.graphPath || !existsSync(item.graphPath)) continue;
    const graph = await readJson(item.graphPath);
    const modules = graph.modules || [];
    const concreteCoreTypes = [...new Set(modules
      .filter((module) => ["Delay Line", "Reverb Lite", "Synth Voice"].includes(module.type))
      .map((module) => module.type))]
      .sort();
    const unresolvedAbstractionCount = modules
      .filter((module) => module.type === "Verified Template Core")
      .length;
    summaries.push({
      fixtureName: item.fixtureName,
      patchId: graph.patchId,
      graphPath: item.graphPath,
      concreteCoreTypes,
      unresolvedAbstractionCount
    });
  }
  return summaries;
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const promptResults = [];
  const problems = [];

  for (const prompt of PROMPTS) {
    const promptRoot = resolve(EVIDENCE_ROOT, prompt.id);
    const workflowPath = resolve(promptRoot, "workflow.json");
    const draftRoot = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/prompt-smoke", prompt.id);

    await mkdir(promptRoot, { recursive: true });
    const workflowCommand = runNode([
      "tests/workflow/scripts/generate-patch-from-description.mjs",
      "--description",
      prompt.description,
      "--selection-limit",
      "5",
      "--draft-limit",
      "2",
      "--result-path",
      workflowPath,
      "--draft-root",
      draftRoot
    ]);

    const workflow = existsSync(workflowPath) ? await readJson(workflowPath) : null;
    const selectionPath = workflow?.artifacts?.selectionResultPath || resolve(promptRoot, "selection-result.json");
    const draftPath = workflow?.artifacts?.draftResultPath || resolve(promptRoot, "draft-result.json");
    const validationPath = workflow?.artifacts?.validationResultPath || resolve(promptRoot, "validation-result.json");
    const selection = existsSync(selectionPath) ? await readJson(selectionPath) : null;
    const drafts = existsSync(draftPath) ? await readJson(draftPath) : null;
    const validation = existsSync(validationPath) ? await readJson(validationPath) : null;
    const graphSummaries = await summarizeValidatedGraphs(validation);
    const concreteCoreTypes = [...new Set(graphSummaries.flatMap((item) => item.concreteCoreTypes))].sort();
    const unresolvedAbstractionCount = graphSummaries
      .reduce((total, item) => total + item.unresolvedAbstractionCount, 0);
    const promptResult = {
      id: prompt.id,
      description: prompt.description,
      requiredCoreTypes: prompt.requiredCoreTypes || [],
      status: "pass",
      workflowPath,
      selectionPath,
      draftPath,
      validationPath,
      draftRoot,
      workflow: workflow ? {
        status: workflow.status,
        blockerCount: workflow.summary?.blockerCount ?? null,
        selectedCandidateCount: workflow.summary?.selectedCandidateCount ?? null,
        draftCount: workflow.summary?.draftCount ?? null,
        validatedDraftCount: workflow.summary?.validatedDraftCount ?? null
      } : null,
      selection: selection ? {
        status: selection.status,
        candidateCount: selection.summary?.candidateCount ?? null,
        measuredCandidateCount: selection.summary?.measuredCandidateCount ?? null,
        missingEvidenceCandidateCount: selection.validation?.missingEvidenceCandidateIds?.length ?? null
      } : null,
      drafts: drafts ? {
        status: drafts.status,
        draftCount: drafts.summary?.draftCount ?? null
      } : null,
      validation: validation ? {
        status: validation.status,
        candidateCount: validation.summary?.candidateCount ?? null,
        passingCandidateCount: validation.summary?.passingCandidateCount ?? null,
        unexpectedPositiveFailureCount: validation.summary?.unexpectedPositiveFailureCount ?? null
      } : null,
      graphSummary: {
        graphCount: graphSummaries.length,
        concreteCoreTypes,
        unresolvedAbstractionCount,
        graphs: graphSummaries
      }
    };

    if (workflowCommand.status !== 0 || workflow?.status !== "pass") {
      promptResult.status = "fail";
      addProblem(problems, "prompt-workflow-failed", "Prompt did not pass the one-command human-description workflow.", workflowPath, {
        prompt: prompt.id,
        commandStatus: workflowCommand.status,
        workflow: promptResult.workflow,
        stderr: workflowCommand.stderr
      });
    }
    if (selection?.status !== "pass" || selection?.summary?.measuredCandidateCount < 1) {
      promptResult.status = "fail";
      addProblem(problems, "prompt-selection-failed", "Prompt did not produce measured verified selection candidates.", selectionPath, {
        prompt: prompt.id,
        selection: promptResult.selection,
        stderr: workflowCommand.stderr
      });
    }
    if (drafts?.status !== "pass" || drafts?.summary?.draftCount < 1) {
      promptResult.status = "fail";
      addProblem(problems, "prompt-draft-failed", "Prompt selection did not produce graph/trace drafts.", draftPath, {
        prompt: prompt.id,
        drafts: promptResult.drafts,
        stderr: workflowCommand.stderr
      });
    }
    if (
      validation?.status !== "pass" ||
      validation?.summary?.passingCandidateCount !== validation?.summary?.candidateCount ||
      validation?.summary?.unexpectedPositiveFailureCount !== 0
    ) {
      promptResult.status = "fail";
      addProblem(problems, "prompt-validation-failed", "Prompt graph/trace drafts did not pass pre-export validation.", validationPath, {
        prompt: prompt.id,
        validation: promptResult.validation,
        stderr: workflowCommand.stderr
      });
    }
    const missingRequiredCoreTypes = (prompt.requiredCoreTypes || [])
      .filter((type) => !concreteCoreTypes.includes(type));
    if (missingRequiredCoreTypes.length > 0) {
      promptResult.status = "fail";
      addProblem(problems, "prompt-core-resolution-missing", "Prompt did not resolve to the required concrete core module type.", validationPath, {
        prompt: prompt.id,
        missingRequiredCoreTypes,
        concreteCoreTypes,
        graphSummaries
      });
    }
    promptResults.push(promptResult);
  }

  const result = {
    schemaVersion: "zoia.generated-patch-prompt-smoke-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      promptCount: promptResults.length,
      passingPromptCount: promptResults.filter((item) => item.status === "pass").length,
      failingPromptCount: promptResults.filter((item) => item.status !== "pass").length,
      requiredCorePromptCount: promptResults.filter((item) => item.requiredCoreTypes.length > 0).length,
      concreteCoreTypeCount: new Set(promptResults.flatMap((item) => item.graphSummary.concreteCoreTypes)).size,
      unresolvedAbstractionCount: promptResults.reduce((total, item) => total + item.graphSummary.unresolvedAbstractionCount, 0),
      problemCount: problems.length
    },
    prompts: promptResults,
    problems,
    claimBoundary: "This gate verifies that multiple human descriptions can produce measured template selections, generated graph/trace drafts, and passing pre-export validation. It does not claim binary export, full novel synthesis, or runtime behavior for generated output.",
    artifacts: {
      resultPath: RESULT_PATH
    }
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-prompt-smoke-result.v1",
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
