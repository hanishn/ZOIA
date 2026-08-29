#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-candidate-review-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const SOURCE_DESCRIPTION_WORKFLOW_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-from-description/run-result.json");
const DEGRADED_DESCRIPTION_WORKFLOW_PATH = resolve(EVIDENCE_ROOT, "degraded-description-workflow.json");
const DEGRADED_DRAFT_RESULT_PATH = resolve(EVIDENCE_ROOT, "degraded-draft-result.json");
const BLOCKED_CANDIDATE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-candidate-review.json");
const BLOCKED_GENERATED_READINESS_PATH = resolve(EVIDENCE_ROOT, "blocked-generated-patch-readiness.json");
const MISSING_SOURCE_EVIDENCE_PATH = resolve(EVIDENCE_ROOT, "missing-source-evidence.json");
const MISMATCH_DESCRIPTION_WORKFLOW_PATH = resolve(EVIDENCE_ROOT, "mismatched-source-description-workflow.json");
const MISMATCH_DRAFT_RESULT_PATH = resolve(EVIDENCE_ROOT, "mismatched-source-draft-result.json");
const BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-candidate-review-source-graph-mismatch.json");
const BLOCKED_MISMATCH_GENERATED_READINESS_PATH = resolve(EVIDENCE_ROOT, "blocked-generated-patch-readiness-source-graph-mismatch.json");
const ROLE_ONLY_DESCRIPTION_WORKFLOW_PATH = resolve(EVIDENCE_ROOT, "role-only-mismatch-description-workflow.json");
const ROLE_ONLY_DRAFT_RESULT_PATH = resolve(EVIDENCE_ROOT, "role-only-mismatch-draft-result.json");
const ROLE_ONLY_SOURCE_EVIDENCE_PATH = resolve(EVIDENCE_ROOT, "role-only-mismatch-source-evidence.json");
const BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-candidate-review-source-role-mismatch.json");
const BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH = resolve(EVIDENCE_ROOT, "blocked-generated-patch-readiness-source-role-mismatch.json");
const TRACE_INCOMPLETE_DESCRIPTION_WORKFLOW_PATH = resolve(EVIDENCE_ROOT, "trace-incomplete-description-workflow.json");
const TRACE_INCOMPLETE_DRAFT_RESULT_PATH = resolve(EVIDENCE_ROOT, "trace-incomplete-draft-result.json");
const TRACE_INCOMPLETE_TRACE_PATH = resolve(EVIDENCE_ROOT, "trace-incomplete.trace.json");
const BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-candidate-review-trace-incomplete.json");
const BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH = resolve(EVIDENCE_ROOT, "blocked-generated-patch-readiness-trace-incomplete.json");
const INTENT_MODALITY_DESCRIPTION_WORKFLOW_PATH = resolve(EVIDENCE_ROOT, "intent-modality-mismatch-description-workflow.json");
const INTENT_MODALITY_DRAFT_RESULT_PATH = resolve(EVIDENCE_ROOT, "intent-modality-mismatch-draft-result.json");
const INTENT_MODALITY_GRAPH_PATH = resolve(EVIDENCE_ROOT, "intent-modality-mismatch.graph.json");
const BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-candidate-review-intent-modality-mismatch.json");
const BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH = resolve(EVIDENCE_ROOT, "blocked-generated-patch-readiness-intent-modality-mismatch.json");
const JSON_SPACES = 2;
const ROLE_SUPPORT_TYPES = new Set([
  "Audio Input",
  "Audio Output",
  "Audio Out",
  "Looper",
  "Delay Line",
  "LFO",
  "CV Sequencer",
  "Sequencer",
  "Random",
  "Sample & Hold",
  "CV Delay",
  "Cport Exp/CV",
  "Expression Pedal",
  "Pushbutton",
  "Stompswitch",
  "MIDI CC In",
  "MIDI Note In",
  "Tap Tempo",
  "Value"
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

function relativeToProject(path) {
  return resolve(path).slice(PROJECT_ROOT.length + 1);
}

async function writeDegradedWorkflow() {
  const workflow = await readJson(SOURCE_DESCRIPTION_WORKFLOW_PATH);
  const draftResultPath = workflow.artifacts?.draftResultPath;
  if (!draftResultPath || !existsSync(draftResultPath)) {
    throw new Error(`Missing source draft result for candidate-review negative control: ${draftResultPath}`);
  }

  const draftResult = await readJson(draftResultPath);
  const drafts = [...(draftResult.drafts || [])];
  if (drafts.length === 0) {
    throw new Error("Source draft result has no drafts for candidate-review negative control.");
  }
  drafts[0] = {
    ...drafts[0],
    sourceEvidencePath: MISSING_SOURCE_EVIDENCE_PATH
  };
  await writeJson(DEGRADED_DRAFT_RESULT_PATH, {
    ...draftResult,
    drafts
  });
  await writeJson(DEGRADED_DESCRIPTION_WORKFLOW_PATH, {
    ...workflow,
    artifacts: {
      ...workflow.artifacts,
      draftResultPath: DEGRADED_DRAFT_RESULT_PATH
    }
  });
}

async function writeMismatchedSourceWorkflow() {
  const workflow = await readJson(SOURCE_DESCRIPTION_WORKFLOW_PATH);
  const draftResultPath = workflow.artifacts?.draftResultPath;
  const selectionResultPath = workflow.artifacts?.selectionResultPath;
  if (!draftResultPath || !existsSync(draftResultPath)) {
    throw new Error(`Missing source draft result for candidate-review mismatch negative control: ${draftResultPath}`);
  }
  if (!selectionResultPath || !existsSync(selectionResultPath)) {
    throw new Error(`Missing source selection result for candidate-review mismatch negative control: ${selectionResultPath}`);
  }
  const draftResult = await readJson(draftResultPath);
  const selectionResult = await readJson(selectionResultPath);
  const drafts = [...(draftResult.drafts || [])];
  const mismatchedSource = (selectionResult.candidates || [])
    .find((candidate) => candidate.pairId === "111551")?.evidence?.q106EvidencePath;
  if (!mismatchedSource || !existsSync(mismatchedSource)) {
    throw new Error("Missing mismatched source evidence candidate 111551 for candidate-review negative control.");
  }
  if (drafts.length === 0) {
    throw new Error("Source draft result has no drafts for candidate-review mismatch negative control.");
  }
  drafts[0] = {
    ...drafts[0],
    sourceEvidencePath: mismatchedSource
  };
  await writeJson(MISMATCH_DRAFT_RESULT_PATH, {
    ...draftResult,
    drafts
  });
  await writeJson(MISMATCH_DESCRIPTION_WORKFLOW_PATH, {
    ...workflow,
    artifacts: {
      ...workflow.artifacts,
      draftResultPath: MISMATCH_DRAFT_RESULT_PATH
    }
  });
}

async function writeRoleOnlyMismatchedSourceWorkflow() {
  const workflow = await readJson(SOURCE_DESCRIPTION_WORKFLOW_PATH);
  const draftResultPath = workflow.artifacts?.draftResultPath;
  if (!draftResultPath || !existsSync(draftResultPath)) {
    throw new Error(`Missing source draft result for candidate-review role mismatch negative control: ${draftResultPath}`);
  }
  const draftResult = await readJson(draftResultPath);
  const drafts = [...(draftResult.drafts || [])];
  if (drafts.length === 0) {
    throw new Error("Source draft result has no drafts for candidate-review role mismatch negative control.");
  }
  const sourceEvidence = await readJson(drafts[0].sourceEvidencePath);
  const retainedModules = (sourceEvidence.staticAnalysis?.modules || [])
    .filter((module) => !ROLE_SUPPORT_TYPES.has(module.typeName || module.name));
  await writeJson(ROLE_ONLY_SOURCE_EVIDENCE_PATH, {
    ...sourceEvidence,
    staticAnalysis: {
      ...sourceEvidence.staticAnalysis,
      modules: retainedModules
    },
    degradedForNegativeControl: {
      reason: "source-to-graph module-role support removed while family/title evidence remains",
      originalSourceEvidencePath: drafts[0].sourceEvidencePath,
      removedRoleSupportModuleCount: (sourceEvidence.staticAnalysis?.modules || []).length - retainedModules.length
    }
  });
  drafts[0] = {
    ...drafts[0],
    sourceEvidencePath: ROLE_ONLY_SOURCE_EVIDENCE_PATH
  };
  await writeJson(ROLE_ONLY_DRAFT_RESULT_PATH, {
    ...draftResult,
    drafts
  });
  await writeJson(ROLE_ONLY_DESCRIPTION_WORKFLOW_PATH, {
    ...workflow,
    artifacts: {
      ...workflow.artifacts,
      draftResultPath: ROLE_ONLY_DRAFT_RESULT_PATH
    }
  });
}

async function writeTraceIncompleteWorkflow() {
  const workflow = await readJson(SOURCE_DESCRIPTION_WORKFLOW_PATH);
  const draftResultPath = workflow.artifacts?.draftResultPath;
  if (!draftResultPath || !existsSync(draftResultPath)) {
    throw new Error(`Missing source draft result for candidate-review trace completeness negative control: ${draftResultPath}`);
  }
  const draftResult = await readJson(draftResultPath);
  const drafts = [...(draftResult.drafts || [])];
  if (drafts.length === 0) {
    throw new Error("Source draft result has no drafts for candidate-review trace completeness negative control.");
  }
  const sourceTrace = await readJson(drafts[0].tracePath);
  const requirements = (sourceTrace.requirements || [])
    .filter((requirement) => requirement.id !== "req-modulation");
  await writeJson(TRACE_INCOMPLETE_TRACE_PATH, {
    ...sourceTrace,
    requirements,
    degradedForNegativeControl: {
      reason: "trace-to-graph coverage removed for modulation source and connection",
      originalTracePath: drafts[0].tracePath,
      removedRequirementId: "req-modulation"
    }
  });
  drafts[0] = {
    ...drafts[0],
    tracePath: TRACE_INCOMPLETE_TRACE_PATH
  };
  await writeJson(TRACE_INCOMPLETE_DRAFT_RESULT_PATH, {
    ...draftResult,
    drafts
  });
  await writeJson(TRACE_INCOMPLETE_DESCRIPTION_WORKFLOW_PATH, {
    ...workflow,
    artifacts: {
      ...workflow.artifacts,
      draftResultPath: TRACE_INCOMPLETE_DRAFT_RESULT_PATH
    }
  });
}

async function writeIntentModalityMismatchWorkflow() {
  const workflow = await readJson(SOURCE_DESCRIPTION_WORKFLOW_PATH);
  const draftResultPath = workflow.artifacts?.draftResultPath;
  if (!draftResultPath || !existsSync(draftResultPath)) {
    throw new Error(`Missing source draft result for candidate-review intent-modality mismatch negative control: ${draftResultPath}`);
  }
  const draftResult = await readJson(draftResultPath);
  const drafts = [...(draftResult.drafts || [])];
  if (drafts.length === 0) {
    throw new Error("Source draft result has no drafts for candidate-review intent-modality mismatch negative control.");
  }
  const sourceGraph = await readJson(drafts[0].graphPath);
  await writeJson(INTENT_MODALITY_GRAPH_PATH, {
    ...sourceGraph,
    expectedModalities: [...new Set([...(sourceGraph.expectedModalities || []), "midi"])].sort(),
    degradedForNegativeControl: {
      reason: "graph declares a modality not present in human intent or matched selection evidence",
      originalGraphPath: drafts[0].graphPath,
      addedUnsupportedModality: "midi"
    }
  });
  drafts[0] = {
    ...drafts[0],
    graphPath: INTENT_MODALITY_GRAPH_PATH
  };
  await writeJson(INTENT_MODALITY_DRAFT_RESULT_PATH, {
    ...draftResult,
    drafts
  });
  await writeJson(INTENT_MODALITY_DESCRIPTION_WORKFLOW_PATH, {
    ...workflow,
    artifacts: {
      ...workflow.artifacts,
      draftResultPath: INTENT_MODALITY_DRAFT_RESULT_PATH
    }
  });
}

function runCandidateReview(descriptionWorkflowPath, resultPath) {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-patch-candidate-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_DESCRIPTION_WORKFLOW_PATH: relativeToProject(descriptionWorkflowPath),
      ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_RESULT_PATH: relativeToProject(resultPath)
    }
  });
}

function runGeneratedReadinessWithBlockedCandidateReview(candidateReviewPath, resultPath) {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-patch-generation-readiness-rollup.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_PATH: relativeToProject(candidateReviewPath),
      ZOIA_GENERATED_PATCH_READINESS_RESULT_PATH: relativeToProject(resultPath)
    }
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  if (!existsSync(SOURCE_DESCRIPTION_WORKFLOW_PATH)) {
    throw new Error(`Missing source description workflow evidence: ${SOURCE_DESCRIPTION_WORKFLOW_PATH}`);
  }
  await writeDegradedWorkflow();
  await writeMismatchedSourceWorkflow();
  await writeRoleOnlyMismatchedSourceWorkflow();
  await writeTraceIncompleteWorkflow();
  await writeIntentModalityMismatchWorkflow();

  const candidateReviewCommand = runCandidateReview(DEGRADED_DESCRIPTION_WORKFLOW_PATH, BLOCKED_CANDIDATE_REVIEW_PATH);
  const blockedCandidateReview = existsSync(BLOCKED_CANDIDATE_REVIEW_PATH) ? await readJson(BLOCKED_CANDIDATE_REVIEW_PATH) : null;
  const sourceEvidenceBlocker = (blockedCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-source-evidence-missing");

  const generatedReadinessCommand = runGeneratedReadinessWithBlockedCandidateReview(BLOCKED_CANDIDATE_REVIEW_PATH, BLOCKED_GENERATED_READINESS_PATH);
  const blockedGeneratedReadiness = existsSync(BLOCKED_GENERATED_READINESS_PATH) ? await readJson(BLOCKED_GENERATED_READINESS_PATH) : null;
  const generatedReadinessBlocker = (blockedGeneratedReadiness?.blockers || [])
    .find((blocker) => blocker.id === "generated-candidate-review-not-ready");

  const mismatchCandidateReviewCommand = runCandidateReview(MISMATCH_DESCRIPTION_WORKFLOW_PATH, BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH);
  const blockedMismatchCandidateReview = existsSync(BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH) ? await readJson(BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH) : null;
  const sourceGraphMismatchBlocker = (blockedMismatchCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-source-graph-family-mismatch");
  const sourceGraphRoleMismatchBlocker = (blockedMismatchCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-source-graph-role-mismatch");

  const mismatchGeneratedReadinessCommand = runGeneratedReadinessWithBlockedCandidateReview(BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH, BLOCKED_MISMATCH_GENERATED_READINESS_PATH);
  const blockedMismatchGeneratedReadiness = existsSync(BLOCKED_MISMATCH_GENERATED_READINESS_PATH) ? await readJson(BLOCKED_MISMATCH_GENERATED_READINESS_PATH) : null;
  const mismatchGeneratedReadinessBlocker = (blockedMismatchGeneratedReadiness?.blockers || [])
    .find((blocker) => blocker.id === "generated-candidate-review-not-ready");

  const roleOnlyCandidateReviewCommand = runCandidateReview(ROLE_ONLY_DESCRIPTION_WORKFLOW_PATH, BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH);
  const blockedRoleOnlyCandidateReview = existsSync(BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH) ? await readJson(BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH) : null;
  const roleOnlyFamilyMismatchBlocker = (blockedRoleOnlyCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-source-graph-family-mismatch");
  const roleOnlyRoleMismatchBlocker = (blockedRoleOnlyCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-source-graph-role-mismatch");

  const roleOnlyGeneratedReadinessCommand = runGeneratedReadinessWithBlockedCandidateReview(BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH, BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH);
  const blockedRoleOnlyGeneratedReadiness = existsSync(BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH) ? await readJson(BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH) : null;
  const roleOnlyGeneratedReadinessBlocker = (blockedRoleOnlyGeneratedReadiness?.blockers || [])
    .find((blocker) => blocker.id === "generated-candidate-review-not-ready");

  const traceIncompleteCandidateReviewCommand = runCandidateReview(TRACE_INCOMPLETE_DESCRIPTION_WORKFLOW_PATH, BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH);
  const blockedTraceIncompleteCandidateReview = existsSync(BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH) ? await readJson(BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH) : null;
  const traceCoverageBlocker = (blockedTraceIncompleteCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-trace-graph-coverage-incomplete");

  const traceIncompleteGeneratedReadinessCommand = runGeneratedReadinessWithBlockedCandidateReview(BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH, BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH);
  const blockedTraceIncompleteGeneratedReadiness = existsSync(BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH) ? await readJson(BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH) : null;
  const traceIncompleteGeneratedReadinessBlocker = (blockedTraceIncompleteGeneratedReadiness?.blockers || [])
    .find((blocker) => blocker.id === "generated-candidate-review-not-ready");

  const intentModalityCandidateReviewCommand = runCandidateReview(INTENT_MODALITY_DESCRIPTION_WORKFLOW_PATH, BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH);
  const blockedIntentModalityCandidateReview = existsSync(BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH) ? await readJson(BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH) : null;
  const intentModalityBlocker = (blockedIntentModalityCandidateReview?.problems || [])
    .find((problem) => problem.id === "review-graph-modality-intent-mismatch");

  const intentModalityGeneratedReadinessCommand = runGeneratedReadinessWithBlockedCandidateReview(BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH, BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH);
  const blockedIntentModalityGeneratedReadiness = existsSync(BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH) ? await readJson(BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH) : null;
  const intentModalityGeneratedReadinessBlocker = (blockedIntentModalityGeneratedReadiness?.blockers || [])
    .find((blocker) => blocker.id === "generated-candidate-review-not-ready");

  const problems = [];
  if (candidateReviewCommand.status === 0) {
    problems.push({
      id: "candidate-review-negative-control-command-passed",
      message: "Generated-patch candidate review passed with a missing source evidence path."
    });
  }
  if (!blockedCandidateReview) {
    problems.push({
      id: "blocked-candidate-review-result-missing",
      message: "Blocked generated-patch candidate-review evidence was not written.",
      evidencePath: BLOCKED_CANDIDATE_REVIEW_PATH
    });
  } else {
    if (blockedCandidateReview.status !== "fail") {
      problems.push({
        id: "blocked-candidate-review-status-invalid",
        message: "Generated-patch candidate review did not fail with missing source evidence.",
        evidencePath: BLOCKED_CANDIDATE_REVIEW_PATH,
        observed: { status: blockedCandidateReview.status }
      });
    }
    if (!sourceEvidenceBlocker) {
      problems.push({
        id: "source-evidence-blocker-missing",
        message: "Generated-patch candidate review did not report missing source evidence.",
        evidencePath: BLOCKED_CANDIDATE_REVIEW_PATH,
        observed: { problems: blockedCandidateReview.problems || [] }
      });
    }
  }
  if (generatedReadinessCommand.status === 0) {
    problems.push({
      id: "generated-readiness-candidate-review-negative-control-command-passed",
      message: "Generated-patch readiness passed with blocked candidate-review evidence."
    });
  }
  if (!blockedGeneratedReadiness) {
    problems.push({
      id: "blocked-generated-readiness-result-missing",
      message: "Blocked generated-patch readiness evidence was not written.",
      evidencePath: BLOCKED_GENERATED_READINESS_PATH
    });
  } else {
    if (blockedGeneratedReadiness.status !== "blocked") {
      problems.push({
        id: "blocked-generated-readiness-status-invalid",
        message: "Generated-patch readiness did not block with blocked candidate-review evidence.",
        evidencePath: BLOCKED_GENERATED_READINESS_PATH,
        observed: { status: blockedGeneratedReadiness.status }
      });
    }
    if (!generatedReadinessBlocker) {
      problems.push({
        id: "generated-readiness-candidate-review-blocker-missing",
        message: "Generated-patch readiness did not report generated-candidate-review-not-ready.",
        evidencePath: BLOCKED_GENERATED_READINESS_PATH,
        observed: { blockers: blockedGeneratedReadiness.blockers || [] }
      });
    }
  }
  if (mismatchCandidateReviewCommand.status === 0) {
    problems.push({
      id: "candidate-review-source-graph-mismatch-command-passed",
      message: "Generated-patch candidate review passed with mismatched source-to-graph family evidence."
    });
  }
  if (!blockedMismatchCandidateReview) {
    problems.push({
      id: "blocked-mismatch-candidate-review-result-missing",
      message: "Blocked generated-patch candidate-review mismatch evidence was not written.",
      evidencePath: BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH
    });
  } else {
    if (blockedMismatchCandidateReview.status !== "fail") {
      problems.push({
        id: "blocked-mismatch-candidate-review-status-invalid",
        message: "Generated-patch candidate review did not fail with mismatched source-to-graph family evidence.",
        evidencePath: BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH,
        observed: { status: blockedMismatchCandidateReview.status }
      });
    }
    if (!sourceGraphMismatchBlocker) {
      problems.push({
        id: "source-graph-mismatch-blocker-missing",
        message: "Generated-patch candidate review did not report source-to-graph family mismatch.",
        evidencePath: BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH,
        observed: { problems: blockedMismatchCandidateReview.problems || [] }
      });
    }
    if (!sourceGraphRoleMismatchBlocker) {
      problems.push({
        id: "source-graph-role-mismatch-blocker-missing",
        message: "Generated-patch candidate review did not report source-to-graph module-role mismatch.",
        evidencePath: BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH,
        observed: { problems: blockedMismatchCandidateReview.problems || [] }
      });
    }
  }
  if (mismatchGeneratedReadinessCommand.status === 0) {
    problems.push({
      id: "generated-readiness-source-graph-mismatch-command-passed",
      message: "Generated-patch readiness passed with source-to-graph mismatched candidate-review evidence."
    });
  }
  if (!blockedMismatchGeneratedReadiness) {
    problems.push({
      id: "blocked-mismatch-generated-readiness-result-missing",
      message: "Blocked source-to-graph mismatch generated-patch readiness evidence was not written.",
      evidencePath: BLOCKED_MISMATCH_GENERATED_READINESS_PATH
    });
  } else {
    if (blockedMismatchGeneratedReadiness.status !== "blocked") {
      problems.push({
        id: "blocked-mismatch-generated-readiness-status-invalid",
        message: "Generated-patch readiness did not block with source-to-graph mismatched candidate-review evidence.",
        evidencePath: BLOCKED_MISMATCH_GENERATED_READINESS_PATH,
        observed: { status: blockedMismatchGeneratedReadiness.status }
      });
    }
    if (!mismatchGeneratedReadinessBlocker) {
      problems.push({
        id: "generated-readiness-source-graph-mismatch-blocker-missing",
        message: "Generated-patch readiness did not report generated-candidate-review-not-ready for source-to-graph mismatch.",
        evidencePath: BLOCKED_MISMATCH_GENERATED_READINESS_PATH,
        observed: { blockers: blockedMismatchGeneratedReadiness.blockers || [] }
      });
    }
  }
  if (roleOnlyCandidateReviewCommand.status === 0) {
    problems.push({
      id: "candidate-review-source-role-mismatch-command-passed",
      message: "Generated-patch candidate review passed with source-to-graph module-role evidence removed."
    });
  }
  if (!blockedRoleOnlyCandidateReview) {
    problems.push({
      id: "blocked-role-only-candidate-review-result-missing",
      message: "Blocked generated-patch candidate-review role-only mismatch evidence was not written.",
      evidencePath: BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH
    });
  } else {
    if (blockedRoleOnlyCandidateReview.status !== "fail") {
      problems.push({
        id: "blocked-role-only-candidate-review-status-invalid",
        message: "Generated-patch candidate review did not fail with source-to-graph module-role evidence removed.",
        evidencePath: BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH,
        observed: { status: blockedRoleOnlyCandidateReview.status }
      });
    }
    if (roleOnlyFamilyMismatchBlocker) {
      problems.push({
        id: "role-only-family-mismatch-unexpected",
        message: "Role-only negative control also reported a source-to-graph family mismatch.",
        evidencePath: BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH,
        observed: { problem: roleOnlyFamilyMismatchBlocker }
      });
    }
    if (!roleOnlyRoleMismatchBlocker) {
      problems.push({
        id: "role-only-role-mismatch-blocker-missing",
        message: "Generated-patch candidate review did not report source-to-graph module-role mismatch for the role-only case.",
        evidencePath: BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH,
        observed: { problems: blockedRoleOnlyCandidateReview.problems || [] }
      });
    }
  }
  if (roleOnlyGeneratedReadinessCommand.status === 0) {
    problems.push({
      id: "generated-readiness-source-role-mismatch-command-passed",
      message: "Generated-patch readiness passed with source-to-graph role-mismatched candidate-review evidence."
    });
  }
  if (!blockedRoleOnlyGeneratedReadiness) {
    problems.push({
      id: "blocked-role-only-generated-readiness-result-missing",
      message: "Blocked source-to-graph role mismatch generated-patch readiness evidence was not written.",
      evidencePath: BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH
    });
  } else {
    if (blockedRoleOnlyGeneratedReadiness.status !== "blocked") {
      problems.push({
        id: "blocked-role-only-generated-readiness-status-invalid",
        message: "Generated-patch readiness did not block with source-to-graph role-mismatched candidate-review evidence.",
        evidencePath: BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH,
        observed: { status: blockedRoleOnlyGeneratedReadiness.status }
      });
    }
    if (!roleOnlyGeneratedReadinessBlocker) {
      problems.push({
        id: "generated-readiness-source-role-mismatch-blocker-missing",
        message: "Generated-patch readiness did not report generated-candidate-review-not-ready for source-to-graph role mismatch.",
        evidencePath: BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH,
        observed: { blockers: blockedRoleOnlyGeneratedReadiness.blockers || [] }
      });
    }
  }
  if (traceIncompleteCandidateReviewCommand.status === 0) {
    problems.push({
      id: "candidate-review-trace-incomplete-command-passed",
      message: "Generated-patch candidate review passed with incomplete trace-to-graph coverage."
    });
  }
  if (!blockedTraceIncompleteCandidateReview) {
    problems.push({
      id: "blocked-trace-incomplete-candidate-review-result-missing",
      message: "Blocked generated-patch candidate-review trace-completeness evidence was not written.",
      evidencePath: BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH
    });
  } else {
    if (blockedTraceIncompleteCandidateReview.status !== "fail") {
      problems.push({
        id: "blocked-trace-incomplete-candidate-review-status-invalid",
        message: "Generated-patch candidate review did not fail with incomplete trace-to-graph coverage.",
        evidencePath: BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH,
        observed: { status: blockedTraceIncompleteCandidateReview.status }
      });
    }
    if (!traceCoverageBlocker) {
      problems.push({
        id: "trace-graph-coverage-blocker-missing",
        message: "Generated-patch candidate review did not report incomplete trace-to-graph coverage.",
        evidencePath: BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH,
        observed: { problems: blockedTraceIncompleteCandidateReview.problems || [] }
      });
    }
  }
  if (traceIncompleteGeneratedReadinessCommand.status === 0) {
    problems.push({
      id: "generated-readiness-trace-incomplete-command-passed",
      message: "Generated-patch readiness passed with incomplete trace-to-graph coverage in candidate-review evidence."
    });
  }
  if (!blockedTraceIncompleteGeneratedReadiness) {
    problems.push({
      id: "blocked-trace-incomplete-generated-readiness-result-missing",
      message: "Blocked trace-incomplete generated-patch readiness evidence was not written.",
      evidencePath: BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH
    });
  } else {
    if (blockedTraceIncompleteGeneratedReadiness.status !== "blocked") {
      problems.push({
        id: "blocked-trace-incomplete-generated-readiness-status-invalid",
        message: "Generated-patch readiness did not block with trace-incomplete candidate-review evidence.",
        evidencePath: BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH,
        observed: { status: blockedTraceIncompleteGeneratedReadiness.status }
      });
    }
    if (!traceIncompleteGeneratedReadinessBlocker) {
      problems.push({
        id: "generated-readiness-trace-incomplete-blocker-missing",
        message: "Generated-patch readiness did not report generated-candidate-review-not-ready for trace-incomplete candidate review.",
        evidencePath: BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH,
        observed: { blockers: blockedTraceIncompleteGeneratedReadiness.blockers || [] }
      });
    }
  }
  if (intentModalityCandidateReviewCommand.status === 0) {
    problems.push({
      id: "candidate-review-intent-modality-mismatch-command-passed",
      message: "Generated-patch candidate review passed with graph modalities unsupported by intent and matched selection evidence."
    });
  }
  if (!blockedIntentModalityCandidateReview) {
    problems.push({
      id: "blocked-intent-modality-candidate-review-result-missing",
      message: "Blocked generated-patch candidate-review intent-modality mismatch evidence was not written.",
      evidencePath: BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH
    });
  } else {
    if (blockedIntentModalityCandidateReview.status !== "fail") {
      problems.push({
        id: "blocked-intent-modality-candidate-review-status-invalid",
        message: "Generated-patch candidate review did not fail with graph modalities unsupported by selected intent.",
        evidencePath: BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH,
        observed: { status: blockedIntentModalityCandidateReview.status }
      });
    }
    if (!intentModalityBlocker) {
      problems.push({
        id: "intent-modality-blocker-missing",
        message: "Generated-patch candidate review did not report an intent-to-graph modality mismatch.",
        evidencePath: BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH,
        observed: { problems: blockedIntentModalityCandidateReview.problems || [] }
      });
    }
  }
  if (intentModalityGeneratedReadinessCommand.status === 0) {
    problems.push({
      id: "generated-readiness-intent-modality-mismatch-command-passed",
      message: "Generated-patch readiness passed with intent-modality mismatched candidate-review evidence."
    });
  }
  if (!blockedIntentModalityGeneratedReadiness) {
    problems.push({
      id: "blocked-intent-modality-generated-readiness-result-missing",
      message: "Blocked intent-modality mismatch generated-patch readiness evidence was not written.",
      evidencePath: BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH
    });
  } else {
    if (blockedIntentModalityGeneratedReadiness.status !== "blocked") {
      problems.push({
        id: "blocked-intent-modality-generated-readiness-status-invalid",
        message: "Generated-patch readiness did not block with intent-modality mismatched candidate-review evidence.",
        evidencePath: BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH,
        observed: { status: blockedIntentModalityGeneratedReadiness.status }
      });
    }
    if (!intentModalityGeneratedReadinessBlocker) {
      problems.push({
        id: "generated-readiness-intent-modality-blocker-missing",
        message: "Generated-patch readiness did not report generated-candidate-review-not-ready for intent-modality mismatch.",
        evidencePath: BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH,
        observed: { blockers: blockedIntentModalityGeneratedReadiness.blockers || [] }
      });
    }
  }

  const result = {
    schemaVersion: "zoia.generated-patch-candidate-review-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: 5,
      passingCaseCount: problems.length === 0 ? 5 : 0,
      candidateReviewCommandExitCode: candidateReviewCommand.status,
      blockedCandidateReviewStatus: blockedCandidateReview?.status || null,
      sourceEvidenceBlockerFound: Boolean(sourceEvidenceBlocker),
      generatedReadinessCommandExitCode: generatedReadinessCommand.status,
      blockedGeneratedReadinessStatus: blockedGeneratedReadiness?.status || null,
      generatedReadinessBlockerFound: Boolean(generatedReadinessBlocker),
      sourceGraphMismatchCommandExitCode: mismatchCandidateReviewCommand.status,
      blockedMismatchCandidateReviewStatus: blockedMismatchCandidateReview?.status || null,
      sourceGraphMismatchBlockerFound: Boolean(sourceGraphMismatchBlocker),
      sourceGraphRoleMismatchBlockerFound: Boolean(sourceGraphRoleMismatchBlocker),
      mismatchGeneratedReadinessCommandExitCode: mismatchGeneratedReadinessCommand.status,
      blockedMismatchGeneratedReadinessStatus: blockedMismatchGeneratedReadiness?.status || null,
      mismatchGeneratedReadinessBlockerFound: Boolean(mismatchGeneratedReadinessBlocker),
      roleOnlyCommandExitCode: roleOnlyCandidateReviewCommand.status,
      blockedRoleOnlyCandidateReviewStatus: blockedRoleOnlyCandidateReview?.status || null,
      roleOnlyFamilyMismatchBlockerFound: Boolean(roleOnlyFamilyMismatchBlocker),
      roleOnlyRoleMismatchBlockerFound: Boolean(roleOnlyRoleMismatchBlocker),
      roleOnlyGeneratedReadinessCommandExitCode: roleOnlyGeneratedReadinessCommand.status,
      blockedRoleOnlyGeneratedReadinessStatus: blockedRoleOnlyGeneratedReadiness?.status || null,
      roleOnlyGeneratedReadinessBlockerFound: Boolean(roleOnlyGeneratedReadinessBlocker),
      traceIncompleteCommandExitCode: traceIncompleteCandidateReviewCommand.status,
      blockedTraceIncompleteCandidateReviewStatus: blockedTraceIncompleteCandidateReview?.status || null,
      traceGraphCoverageBlockerFound: Boolean(traceCoverageBlocker),
      traceIncompleteGeneratedReadinessCommandExitCode: traceIncompleteGeneratedReadinessCommand.status,
      blockedTraceIncompleteGeneratedReadinessStatus: blockedTraceIncompleteGeneratedReadiness?.status || null,
      traceIncompleteGeneratedReadinessBlockerFound: Boolean(traceIncompleteGeneratedReadinessBlocker),
      intentModalityCommandExitCode: intentModalityCandidateReviewCommand.status,
      blockedIntentModalityCandidateReviewStatus: blockedIntentModalityCandidateReview?.status || null,
      intentModalityBlockerFound: Boolean(intentModalityBlocker),
      intentModalityGeneratedReadinessCommandExitCode: intentModalityGeneratedReadinessCommand.status,
      blockedIntentModalityGeneratedReadinessStatus: blockedIntentModalityGeneratedReadiness?.status || null,
      intentModalityGeneratedReadinessBlockerFound: Boolean(intentModalityGeneratedReadinessBlocker)
    },
    command: {
      candidateReviewStdout: candidateReviewCommand.stdout,
      candidateReviewStderr: candidateReviewCommand.stderr,
      generatedReadinessStdout: generatedReadinessCommand.stdout,
      generatedReadinessStderr: generatedReadinessCommand.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies candidate-review evidence fails when a generated draft points at missing source evidence, mismatched source-to-graph family evidence, mismatched source-to-graph module-role evidence, incomplete trace-to-graph coverage, or graph modalities unsupported by intent and matched selection evidence, and generated-patch readiness blocks on that failed review.",
    artifacts: {
      resultPath: RESULT_PATH,
      degradedDescriptionWorkflowPath: DEGRADED_DESCRIPTION_WORKFLOW_PATH,
      degradedDraftResultPath: DEGRADED_DRAFT_RESULT_PATH,
      blockedCandidateReviewPath: BLOCKED_CANDIDATE_REVIEW_PATH,
      blockedGeneratedReadinessPath: BLOCKED_GENERATED_READINESS_PATH,
      mismatchedDescriptionWorkflowPath: MISMATCH_DESCRIPTION_WORKFLOW_PATH,
      mismatchedDraftResultPath: MISMATCH_DRAFT_RESULT_PATH,
      blockedMismatchCandidateReviewPath: BLOCKED_MISMATCH_CANDIDATE_REVIEW_PATH,
      blockedMismatchGeneratedReadinessPath: BLOCKED_MISMATCH_GENERATED_READINESS_PATH,
      roleOnlyDescriptionWorkflowPath: ROLE_ONLY_DESCRIPTION_WORKFLOW_PATH,
      roleOnlyDraftResultPath: ROLE_ONLY_DRAFT_RESULT_PATH,
      roleOnlySourceEvidencePath: ROLE_ONLY_SOURCE_EVIDENCE_PATH,
      blockedRoleOnlyCandidateReviewPath: BLOCKED_ROLE_ONLY_CANDIDATE_REVIEW_PATH,
      blockedRoleOnlyGeneratedReadinessPath: BLOCKED_ROLE_ONLY_GENERATED_READINESS_PATH,
      traceIncompleteDescriptionWorkflowPath: TRACE_INCOMPLETE_DESCRIPTION_WORKFLOW_PATH,
      traceIncompleteDraftResultPath: TRACE_INCOMPLETE_DRAFT_RESULT_PATH,
      traceIncompleteTracePath: TRACE_INCOMPLETE_TRACE_PATH,
      blockedTraceIncompleteCandidateReviewPath: BLOCKED_TRACE_INCOMPLETE_CANDIDATE_REVIEW_PATH,
      blockedTraceIncompleteGeneratedReadinessPath: BLOCKED_TRACE_INCOMPLETE_GENERATED_READINESS_PATH,
      intentModalityDescriptionWorkflowPath: INTENT_MODALITY_DESCRIPTION_WORKFLOW_PATH,
      intentModalityDraftResultPath: INTENT_MODALITY_DRAFT_RESULT_PATH,
      intentModalityGraphPath: INTENT_MODALITY_GRAPH_PATH,
      blockedIntentModalityCandidateReviewPath: BLOCKED_INTENT_MODALITY_CANDIDATE_REVIEW_PATH,
      blockedIntentModalityGeneratedReadinessPath: BLOCKED_INTENT_MODALITY_GENERATED_READINESS_PATH
    }
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH,
    blockedCandidateReviewPath: BLOCKED_CANDIDATE_REVIEW_PATH,
    blockedGeneratedReadinessPath: BLOCKED_GENERATED_READINESS_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-candidate-review-negative-controls-result.v1",
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
