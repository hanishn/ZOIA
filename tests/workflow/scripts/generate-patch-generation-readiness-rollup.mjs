#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-readiness");
const RESULT_PATH = process.env.ZOIA_GENERATED_PATCH_READINESS_RESULT_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_GENERATED_PATCH_READINESS_RESULT_PATH)
  : resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;

const REQUIRED_FILES = Object.freeze({
  generationDoc: "docs/PATCH_GENERATION.md",
  intentSchema: "tests/workflow/schemas/patch-generation-intent.schema.json",
  selectionSchema: "tests/workflow/schemas/patch-template-selection-result.schema.json",
  graphSchema: "tests/workflow/schemas/generated-patch-graph.schema.json",
  traceSchema: "tests/workflow/schemas/generated-patch-requirement-trace.schema.json",
  validationSchema: "tests/workflow/schemas/generated-patch-validation-result.schema.json",
  selectionResult: "tests/workflow/evidence/generated-patch-selection/run-result.json",
  selectorScoringRegression: "tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json",
  draftResult: "tests/workflow/evidence/generated-patch-drafts/run-result.json",
  validationResult: "tests/workflow/evidence/generated-patch-validation/run-result.json",
  traceEvidenceNegativeControls: "tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json",
  provenanceResult: process.env.ZOIA_GENERATED_PATCH_PROVENANCE_PATH ||
    "tests/workflow/evidence/generated-patch-draft-provenance/run-result.json",
  promptSmokeResult: process.env.ZOIA_GENERATED_PATCH_PROMPT_SMOKE_PATH ||
    "tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json",
  descriptionWorkflowResult: process.env.ZOIA_GENERATED_PATCH_FROM_DESCRIPTION_PATH ||
    "tests/workflow/evidence/generated-patch-from-description/run-result.json",
  descriptionWorkflowNegativeControls: "tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json",
  exportBoundaryNegativeControls: "tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json",
  candidateReviewResult: process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_PATH ||
    "tests/workflow/evidence/generated-patch-candidate-review/run-result.json",
  candidateReviewNegativeControls: "tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json",
  runtimeAudioNegativeControls: process.env.ZOIA_GENERATED_PATCH_RUNTIME_NEGATIVE_CONTROLS_PATH ||
    "tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json",
  readinessNegativeControls: "tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json",
  negativeGuardResult: "tests/workflow/evidence/generated-patch-draft-guard-negative/run-result.json"
});

function nowIso() {
  return new Date().toISOString();
}

async function readJson(relativePath) {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  const text = await readFile(fullPath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function addBlocker(blockers, id, message, evidencePath, observed = null) {
  blockers.push({ id, message, evidencePath, observed });
}

function fullPath(relativePath) {
  return resolve(PROJECT_ROOT, relativePath);
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const startedAt = nowIso();
  const blockers = [];
  const fileChecks = {};

  for (const [id, relativePath] of Object.entries(REQUIRED_FILES)) {
    const path = fullPath(relativePath);
    const exists = existsSync(path);
    fileChecks[id] = { path, exists };
    if (!exists) addBlocker(blockers, `missing-${id}`, `Required generated-patch artifact is missing: ${relativePath}`, path);
  }

  let selectionResult = null;
  let selectorScoringRegression = null;
  let draftResult = null;
  let validationResult = null;
  let traceEvidenceNegativeControls = null;
  let provenanceResult = null;
  let promptSmokeResult = null;
  let descriptionWorkflowResult = null;
  let descriptionWorkflowNegativeControls = null;
  let exportBoundaryNegativeControls = null;
  let candidateReviewResult = null;
  let candidateReviewNegativeControls = null;
  let runtimeAudioNegativeControls = null;
  let readinessNegativeControls = null;
  let negativeGuardResult = null;

  if (fileChecks.selectionResult.exists) selectionResult = await readJson(REQUIRED_FILES.selectionResult);
  if (fileChecks.selectorScoringRegression.exists) selectorScoringRegression = await readJson(REQUIRED_FILES.selectorScoringRegression);
  if (fileChecks.draftResult.exists) draftResult = await readJson(REQUIRED_FILES.draftResult);
  if (fileChecks.validationResult.exists) validationResult = await readJson(REQUIRED_FILES.validationResult);
  if (fileChecks.traceEvidenceNegativeControls.exists) traceEvidenceNegativeControls = await readJson(REQUIRED_FILES.traceEvidenceNegativeControls);
  if (fileChecks.provenanceResult.exists) provenanceResult = await readJson(REQUIRED_FILES.provenanceResult);
  if (fileChecks.promptSmokeResult.exists) promptSmokeResult = await readJson(REQUIRED_FILES.promptSmokeResult);
  if (fileChecks.descriptionWorkflowResult.exists) descriptionWorkflowResult = await readJson(REQUIRED_FILES.descriptionWorkflowResult);
  if (fileChecks.descriptionWorkflowNegativeControls.exists) descriptionWorkflowNegativeControls = await readJson(REQUIRED_FILES.descriptionWorkflowNegativeControls);
  if (fileChecks.exportBoundaryNegativeControls.exists) exportBoundaryNegativeControls = await readJson(REQUIRED_FILES.exportBoundaryNegativeControls);
  if (fileChecks.candidateReviewResult.exists) candidateReviewResult = await readJson(REQUIRED_FILES.candidateReviewResult);
  if (fileChecks.candidateReviewNegativeControls.exists) candidateReviewNegativeControls = await readJson(REQUIRED_FILES.candidateReviewNegativeControls);
  if (fileChecks.runtimeAudioNegativeControls.exists) runtimeAudioNegativeControls = await readJson(REQUIRED_FILES.runtimeAudioNegativeControls);
  if (fileChecks.readinessNegativeControls.exists) readinessNegativeControls = await readJson(REQUIRED_FILES.readinessNegativeControls);
  if (fileChecks.negativeGuardResult.exists) negativeGuardResult = await readJson(REQUIRED_FILES.negativeGuardResult);

  if (selectionResult) {
    if (
      selectionResult.status !== "pass" ||
      selectionResult.summary?.candidateCount < 1 ||
      selectionResult.summary?.verifiedCandidateCount !== selectionResult.summary?.candidateCount ||
      selectionResult.summary?.measuredCandidateCount < 1 ||
      selectionResult.validation?.missingEvidenceCandidateIds?.length > 0
    ) {
      addBlocker(blockers, "generated-selection-not-ready", "Generated-patch template selection is not clean.", fileChecks.selectionResult.path, {
        status: selectionResult.status,
        summary: selectionResult.summary,
        validation: selectionResult.validation
      });
    }
  }

  if (selectorScoringRegression) {
    if (
      selectorScoringRegression.status !== "pass" ||
      selectorScoringRegression.summary?.problemCount !== 0 ||
      selectorScoringRegression.summary?.commandExitCode === 0 ||
      selectorScoringRegression.summary?.measuredSignalRecordCount < 1 ||
      selectorScoringRegression.summary?.unmatchedSelectionStatus !== "fail" ||
      selectorScoringRegression.summary?.unmatchedCandidateCount !== 0
    ) {
      addBlocker(blockers, "generated-selector-scoring-regression-failed", "Selector scoring regression did not prove measured-signal-only matches are rejected.", fileChecks.selectorScoringRegression.path, {
        status: selectorScoringRegression.status,
        summary: selectorScoringRegression.summary,
        problems: selectorScoringRegression.problems
      });
    }
  }

  if (draftResult) {
    if (
      draftResult.status !== "pass" ||
      draftResult.summary?.draftCount < 1 ||
      draftResult.summary?.measuredCandidateCount < draftResult.summary?.draftCount
    ) {
      addBlocker(blockers, "generated-drafts-not-ready", "Selected measured candidates did not produce clean generated graph drafts.", fileChecks.draftResult.path, {
        status: draftResult.status,
        summary: draftResult.summary,
        error: draftResult.error || null
      });
    }
  }

  if (validationResult) {
    if (
      validationResult.status !== "pass" ||
      validationResult.summary?.candidateCount < 1 ||
      validationResult.summary?.passingCandidateCount !== validationResult.summary?.candidateCount ||
      validationResult.summary?.unexpectedPositiveFailureCount !== 0 ||
      validationResult.summary?.unexpectedNegativePassCount !== 0
    ) {
      addBlocker(blockers, "generated-draft-validation-not-ready", "Generated graph draft validation is not clean.", fileChecks.validationResult.path, {
        status: validationResult.status,
        summary: validationResult.summary
      });
    }
  }

  if (traceEvidenceNegativeControls) {
    const missingTraceEvidenceRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-missing-trace-evidence" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "trace-expected-evidence-missing")
      );
    const duplicateGridPositionRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-duplicate-grid-position" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-grid-position-duplicate")
      );
    const unsupportedModuleRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-unsupported-module" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-type-unsupported")
      );
    const unsupportedParamRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-unsupported-param" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-param-contract-unsupported")
      );
    const paramRangeRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-param-range" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-param-out-of-range")
      );
    const paramNormalizationRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-param-normalization" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-param-not-normalized-number")
      );
    const unsupportedPortRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-unsupported-port" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-input-contract-unsupported")
      );
    const duplicateModulePortRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-duplicate-module-port" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-port-duplicate")
      );
    const portKindMismatchRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-port-kind-mismatch" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "connection-port-kind-mismatch")
      );
    const connectionGainNormalizationRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-connection-gain-normalization" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "connection-gain-not-normalized-number")
      );
    const connectionGainRangeRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-connection-gain-range" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "connection-gain-out-of-range")
      );
    const duplicateConnectionEndpointRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-duplicate-connection-endpoint" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "connection-endpoint-pair-duplicate")
      );
    const selfRouteRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-self-route" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "connection-self-route-unsupported")
      );
    const modulationRouteRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-modulation-route-missing" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "cv-route-required") &&
        (item.errors || []).some((error) => error.code === "control-route-required")
      );
    const traceGraphCoverageRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-trace-graph-coverage" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => ["trace-module-uncovered", "trace-connection-uncovered"].includes(error.code))
      );
    const blockedRequirementRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-blocked-requirement" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "trace-blocked-requirement")
      );
    const traceModalityCoverageRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-trace-modality-coverage" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "trace-modality-uncovered")
      );
    const audioRouteBypassRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-audio-route-bypass" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "audio-route-direct-bypass-unsupported")
      );
    const audioCycleRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-audio-feedback-cycle" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "audio-cycle-unsupported")
      );
    const graphComplexityRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-graph-complexity" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => ["module-count-exceeds-limit", "connection-count-exceeds-limit"].includes(error.code))
      );
    const traceVerificationMethodRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-trace-verification-method" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "trace-verification-method-unsupported")
      );
    const audioProcessorOrphanRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-orphan-audio-processor" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "audio-processor-orphan")
      );
    const moduleOrphanRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-orphan-cv-source" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "module-orphan")
      );
    const undeclaredModalityRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-undeclared-cv-route" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "expected-modality-missing" && error.modality === "cv")
      );
    const audioModalityRequiredRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-effect-without-audio-modality" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "audio-modality-required")
      );
    const declaredRoleCoreRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-synth-with-effect-core" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "synth-core-required")
      );
    const unsupportedMidiModalityRejected = (traceEvidenceNegativeControls.results || [])
      .some((item) =>
        item.fixtureName === "invalid-midi-modality" &&
        item.status === "fail" &&
        (item.errors || []).some((error) => error.code === "midi-modality-unsupported")
      );
    if (
      traceEvidenceNegativeControls.status !== "pass" ||
      traceEvidenceNegativeControls.summary?.negativeFixtureCount < 28 ||
      traceEvidenceNegativeControls.summary?.unexpectedNegativePassCount !== 0 ||
      missingTraceEvidenceRejected !== true ||
      duplicateGridPositionRejected !== true ||
      unsupportedModuleRejected !== true ||
      unsupportedParamRejected !== true ||
      paramRangeRejected !== true ||
      paramNormalizationRejected !== true ||
      unsupportedPortRejected !== true ||
      duplicateModulePortRejected !== true ||
      portKindMismatchRejected !== true ||
      connectionGainNormalizationRejected !== true ||
      connectionGainRangeRejected !== true ||
      duplicateConnectionEndpointRejected !== true ||
      selfRouteRejected !== true ||
      modulationRouteRejected !== true ||
      traceGraphCoverageRejected !== true ||
      blockedRequirementRejected !== true ||
      traceModalityCoverageRejected !== true ||
      audioRouteBypassRejected !== true ||
      audioCycleRejected !== true ||
      graphComplexityRejected !== true ||
      traceVerificationMethodRejected !== true ||
      audioProcessorOrphanRejected !== true ||
      moduleOrphanRejected !== true ||
      undeclaredModalityRejected !== true ||
      audioModalityRequiredRejected !== true ||
      declaredRoleCoreRejected !== true ||
      unsupportedMidiModalityRejected !== true
    ) {
      addBlocker(blockers, "generated-trace-evidence-negative-controls-failed", "Generated-patch graph/trace negative controls did not prove missing expected evidence paths, duplicate grid positions, unsupported module semantics, unsupported module params, and unsupported module ports are rejected.", fileChecks.traceEvidenceNegativeControls.path, {
        status: traceEvidenceNegativeControls.status,
        summary: traceEvidenceNegativeControls.summary,
        missingTraceEvidenceRejected,
        duplicateGridPositionRejected,
        unsupportedModuleRejected,
        unsupportedParamRejected,
        paramRangeRejected,
        paramNormalizationRejected,
        unsupportedPortRejected,
        duplicateModulePortRejected,
        portKindMismatchRejected,
        connectionGainNormalizationRejected,
        connectionGainRangeRejected,
        duplicateConnectionEndpointRejected,
        selfRouteRejected,
        modulationRouteRejected,
        traceGraphCoverageRejected,
        blockedRequirementRejected,
        traceModalityCoverageRejected,
        audioRouteBypassRejected,
        audioCycleRejected,
        graphComplexityRejected,
        traceVerificationMethodRejected,
        audioProcessorOrphanRejected,
        moduleOrphanRejected,
        undeclaredModalityRejected,
        audioModalityRequiredRejected,
        declaredRoleCoreRejected,
        unsupportedMidiModalityRejected
      });
    }
  }

  if (provenanceResult) {
    if (
      provenanceResult.status !== "pass" ||
      provenanceResult.summary?.problemCount !== 0 ||
      provenanceResult.summary?.draftCount < 1 ||
      provenanceResult.summary?.passingDraftCount !== provenanceResult.summary?.draftCount
    ) {
      addBlocker(blockers, "generated-draft-provenance-not-ready", "Generated graph draft provenance consistency is not clean.", fileChecks.provenanceResult.path, {
        status: provenanceResult.status,
        summary: provenanceResult.summary,
        problems: provenanceResult.problems
      });
    }
  }

  if (promptSmokeResult) {
    if (
      promptSmokeResult.status !== "pass" ||
      promptSmokeResult.summary?.problemCount !== 0 ||
      promptSmokeResult.summary?.promptCount < 2 ||
      !Number.isInteger(promptSmokeResult.summary?.requiredCorePromptCount) ||
      promptSmokeResult.summary?.requiredCorePromptCount < 1 ||
      !Number.isInteger(promptSmokeResult.summary?.concreteCoreTypeCount) ||
      promptSmokeResult.summary?.concreteCoreTypeCount < 1 ||
      !Number.isInteger(promptSmokeResult.summary?.unresolvedAbstractionCount) ||
      promptSmokeResult.summary?.passingPromptCount !== promptSmokeResult.summary?.promptCount
    ) {
      addBlocker(blockers, "generated-prompt-smoke-not-ready", "Generated-patch prompt smoke matrix is not clean.", fileChecks.promptSmokeResult.path, {
        status: promptSmokeResult.status,
        summary: promptSmokeResult.summary,
        problems: promptSmokeResult.problems
      });
    }
  }

  if (descriptionWorkflowResult) {
    if (
      descriptionWorkflowResult.status !== "pass" ||
      descriptionWorkflowResult.summary?.blockerCount !== 0 ||
      descriptionWorkflowResult.summary?.measuredCandidateCount < 1 ||
      descriptionWorkflowResult.summary?.draftCount < 1 ||
      descriptionWorkflowResult.summary?.validatedDraftCount !== descriptionWorkflowResult.summary?.draftCount ||
      descriptionWorkflowResult.claimBoundaries?.exportedPatchClaim !== false ||
      descriptionWorkflowResult.claimBoundaries?.fullNovelSynthesisClaim !== false
    ) {
      addBlocker(blockers, "generated-description-workflow-not-ready", "Human-description generated-patch workflow is not clean.", fileChecks.descriptionWorkflowResult.path, {
        status: descriptionWorkflowResult.status,
        summary: descriptionWorkflowResult.summary,
        claimBoundaries: descriptionWorkflowResult.claimBoundaries,
        blockers: descriptionWorkflowResult.blockers
      });
    }
  }

  if (descriptionWorkflowNegativeControls) {
    if (
      descriptionWorkflowNegativeControls.status !== "pass" ||
      descriptionWorkflowNegativeControls.summary?.caseCount !== 1 ||
      descriptionWorkflowNegativeControls.summary?.passingCaseCount !== 1 ||
      descriptionWorkflowNegativeControls.summary?.problemCount !== 0 ||
      descriptionWorkflowNegativeControls.summary?.commandExitCode === 0 ||
      descriptionWorkflowNegativeControls.summary?.blockedDescriptionStatus !== "blocked" ||
      descriptionWorkflowNegativeControls.summary?.expectedBlockerFound !== true ||
      descriptionWorkflowNegativeControls.summary?.leftoverDraftFileCount !== 0 ||
      descriptionWorkflowNegativeControls.summary?.blockedSelectionIsIsolated !== true ||
      descriptionWorkflowNegativeControls.summary?.blockedSelectionStatus !== "fail" ||
      descriptionWorkflowNegativeControls.summary?.blockedSelectionCandidateCount !== 0 ||
      descriptionWorkflowNegativeControls.summary?.canonicalPositiveSelectionPreserved !== true
    ) {
      addBlocker(blockers, "generated-description-workflow-negative-controls-failed", "Human-description workflow negative controls did not prove unmatched descriptions block before readiness.", fileChecks.descriptionWorkflowNegativeControls.path, {
        status: descriptionWorkflowNegativeControls.status,
        summary: descriptionWorkflowNegativeControls.summary,
        problems: descriptionWorkflowNegativeControls.problems
      });
    }
  }

  if (exportBoundaryNegativeControls) {
    if (
      exportBoundaryNegativeControls.status !== "pass" ||
      exportBoundaryNegativeControls.summary?.caseCount !== 1 ||
      exportBoundaryNegativeControls.summary?.passingCaseCount !== 1 ||
      exportBoundaryNegativeControls.summary?.problemCount !== 0 ||
      exportBoundaryNegativeControls.summary?.validationStatus !== "pass" ||
      exportBoundaryNegativeControls.summary?.expectedExportBoundaryFound !== true
    ) {
      addBlocker(blockers, "generated-export-boundary-negative-controls-failed", "Generated-patch export-boundary negative controls did not prove export-looking payloads are rejected before readiness.", fileChecks.exportBoundaryNegativeControls.path, {
        status: exportBoundaryNegativeControls.status,
        summary: exportBoundaryNegativeControls.summary,
        problems: exportBoundaryNegativeControls.problems
      });
    }
  }

  if (candidateReviewResult) {
    if (
      candidateReviewResult.status !== "pass" ||
      candidateReviewResult.summary?.draftCount < 1 ||
      candidateReviewResult.summary?.passingDraftCount !== candidateReviewResult.summary?.draftCount ||
      candidateReviewResult.summary?.exportFieldCount !== 0 ||
      !Number.isInteger(candidateReviewResult.summary?.unresolvedAbstractionCount) ||
      !Number.isInteger(candidateReviewResult.summary?.sourceGraphFamilyMismatchCount) ||
      candidateReviewResult.summary?.sourceGraphFamilyMismatchCount !== 0 ||
      !Number.isInteger(candidateReviewResult.summary?.sourceGraphRoleMismatchCount) ||
      candidateReviewResult.summary?.sourceGraphRoleMismatchCount !== 0 ||
      !Number.isInteger(candidateReviewResult.summary?.traceGraphCoverageIncompleteCount) ||
      candidateReviewResult.summary?.traceGraphCoverageIncompleteCount !== 0 ||
      !Number.isInteger(candidateReviewResult.summary?.intentGraphModalityMismatchCount) ||
      candidateReviewResult.summary?.intentGraphModalityMismatchCount !== 0 ||
      candidateReviewResult.summary?.problemCount !== 0
    ) {
      addBlocker(blockers, "generated-candidate-review-not-ready", "Generated-patch candidate review summary is not clean or does not record source-to-graph family comparison, module-role comparison, intent-to-graph modality comparison, trace-to-graph coverage, and unresolved abstractions.", fileChecks.candidateReviewResult.path, {
        status: candidateReviewResult.status,
        summary: candidateReviewResult.summary,
        problems: candidateReviewResult.problems
      });
    }
  }

  if (candidateReviewNegativeControls) {
    if (
      candidateReviewNegativeControls.status !== "pass" ||
      candidateReviewNegativeControls.summary?.problemCount !== 0 ||
      candidateReviewNegativeControls.summary?.caseCount !== 5 ||
      candidateReviewNegativeControls.summary?.passingCaseCount !== 5 ||
      candidateReviewNegativeControls.summary?.candidateReviewCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.sourceEvidenceBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.generatedReadinessCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.generatedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.sourceGraphMismatchCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedMismatchCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.sourceGraphMismatchBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.sourceGraphRoleMismatchBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.mismatchGeneratedReadinessCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedMismatchGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.mismatchGeneratedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.roleOnlyCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedRoleOnlyCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.roleOnlyFamilyMismatchBlockerFound !== false ||
      candidateReviewNegativeControls.summary?.roleOnlyRoleMismatchBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.roleOnlyGeneratedReadinessCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedRoleOnlyGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.roleOnlyGeneratedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.traceIncompleteCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedTraceIncompleteCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.traceGraphCoverageBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.traceIncompleteGeneratedReadinessCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedTraceIncompleteGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.traceIncompleteGeneratedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.intentModalityCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedIntentModalityCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.intentModalityBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.intentModalityGeneratedReadinessCommandExitCode === 0 ||
      candidateReviewNegativeControls.summary?.blockedIntentModalityGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.intentModalityGeneratedReadinessBlockerFound !== true
    ) {
      addBlocker(blockers, "generated-candidate-review-negative-controls-failed", "Generated-patch candidate-review negative controls did not prove missing source evidence, source-to-graph family mismatch, source-to-graph module-role mismatch, incomplete trace-to-graph coverage, and intent-to-graph modality mismatch block candidate review and generated readiness.", fileChecks.candidateReviewNegativeControls.path, {
        status: candidateReviewNegativeControls.status,
        summary: candidateReviewNegativeControls.summary,
        problems: candidateReviewNegativeControls.problems
      });
    }
  }

  if (runtimeAudioNegativeControls) {
    if (
      runtimeAudioNegativeControls.status !== "pass" ||
      runtimeAudioNegativeControls.summary?.controlCount !== 5 ||
      runtimeAudioNegativeControls.summary?.passingControlCount !== 5 ||
      runtimeAudioNegativeControls.summary?.seededFailureCount !== 5 ||
      runtimeAudioNegativeControls.summary?.expectedFailureFoundCount !== 5 ||
      runtimeAudioNegativeControls.summary?.blockerCount !== 0
    ) {
      addBlocker(blockers, "generated-runtime-audio-negative-controls-not-ready", "Runtime audio negative-control evidence is not clean.", fileChecks.runtimeAudioNegativeControls.path, {
        status: runtimeAudioNegativeControls.status,
        summary: runtimeAudioNegativeControls.summary,
        assertionFailures: runtimeAudioNegativeControls.assertionFailures || []
      });
    }
  }

  if (readinessNegativeControls) {
    if (
      readinessNegativeControls.status !== "pass" ||
      readinessNegativeControls.summary?.problemCount !== 0 ||
      readinessNegativeControls.summary?.caseCount < 3 ||
      readinessNegativeControls.summary?.passingCaseCount !== readinessNegativeControls.summary?.caseCount
    ) {
      addBlocker(blockers, "generated-readiness-negative-controls-failed", "Generated-patch readiness negative controls did not prove degraded provenance, prompt-smoke, or description-workflow evidence blocks readiness.", fileChecks.readinessNegativeControls.path, {
        status: readinessNegativeControls.status,
        summary: readinessNegativeControls.summary,
        problems: readinessNegativeControls.problems
      });
    }
  }

  if (negativeGuardResult) {
    if (
      negativeGuardResult.status !== "fail" ||
      !/evidence is required/.test(negativeGuardResult.error?.message || "")
    ) {
      addBlocker(blockers, "generated-negative-guard-not-ready", "Malformed selection guard did not fail for the expected evidence-metadata reason.", fileChecks.negativeGuardResult.path, {
        status: negativeGuardResult.status,
        error: negativeGuardResult.error || null
      });
    }
  }

  const result = {
    schemaVersion: "zoia.generated-patch-readiness-result.v1",
    version: "0.4.0",
    revision: 1,
    status: blockers.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    evidenceRoot: EVIDENCE_ROOT,
    fileChecks,
    summary: {
      blockerCount: blockers.length,
      selection: selectionResult ? {
        status: selectionResult.status,
        candidateCount: selectionResult.summary?.candidateCount ?? null,
        verifiedCandidateCount: selectionResult.summary?.verifiedCandidateCount ?? null,
        measuredCandidateCount: selectionResult.summary?.measuredCandidateCount ?? null,
        missingEvidenceCandidateCount: selectionResult.validation?.missingEvidenceCandidateIds?.length ?? null
      } : null,
      selectorScoringRegression: selectorScoringRegression ? {
        status: selectorScoringRegression.status,
        measuredSignalRecordCount: selectorScoringRegression.summary?.measuredSignalRecordCount ?? null,
        unmatchedSelectionStatus: selectorScoringRegression.summary?.unmatchedSelectionStatus ?? null,
        unmatchedCandidateCount: selectorScoringRegression.summary?.unmatchedCandidateCount ?? null,
        problemCount: selectorScoringRegression.summary?.problemCount ?? null
      } : null,
      drafts: draftResult ? {
        status: draftResult.status,
        draftCount: draftResult.summary?.draftCount ?? null,
        measuredCandidateCount: draftResult.summary?.measuredCandidateCount ?? null
      } : null,
      validation: validationResult ? {
        status: validationResult.status,
        candidateCount: validationResult.summary?.candidateCount ?? null,
        passingCandidateCount: validationResult.summary?.passingCandidateCount ?? null,
        rejectedCandidateCount: validationResult.summary?.rejectedCandidateCount ?? null,
        unexpectedPositiveFailureCount: validationResult.summary?.unexpectedPositiveFailureCount ?? null,
        unexpectedNegativePassCount: validationResult.summary?.unexpectedNegativePassCount ?? null
      } : null,
      traceEvidenceNegativeControls: traceEvidenceNegativeControls ? {
        status: traceEvidenceNegativeControls.status,
        negativeFixtureCount: traceEvidenceNegativeControls.summary?.negativeFixtureCount ?? null,
        unexpectedNegativePassCount: traceEvidenceNegativeControls.summary?.unexpectedNegativePassCount ?? null,
        missingTraceEvidenceRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-missing-trace-evidence" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "trace-expected-evidence-missing")
          ),
        duplicateGridPositionRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-duplicate-grid-position" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-grid-position-duplicate")
          ),
        unsupportedModuleRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-unsupported-module" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-type-unsupported")
          ),
        unsupportedParamRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-unsupported-param" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-param-contract-unsupported")
          ),
        paramRangeRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-param-range" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-param-out-of-range")
          ),
        paramNormalizationRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-param-normalization" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-param-not-normalized-number")
          ),
        unsupportedPortRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-unsupported-port" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-input-contract-unsupported")
          ),
        duplicateModulePortRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-duplicate-module-port" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-port-duplicate")
          ),
        portKindMismatchRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-port-kind-mismatch" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "connection-port-kind-mismatch")
          ),
        connectionGainNormalizationRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-connection-gain-normalization" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "connection-gain-not-normalized-number")
          ),
        connectionGainRangeRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-connection-gain-range" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "connection-gain-out-of-range")
          ),
        duplicateConnectionEndpointRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-duplicate-connection-endpoint" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "connection-endpoint-pair-duplicate")
          ),
        selfRouteRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-self-route" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "connection-self-route-unsupported")
          ),
        modulationRouteRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-modulation-route-missing" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "cv-route-required") &&
            (item.errors || []).some((error) => error.code === "control-route-required")
          ),
        traceGraphCoverageRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-trace-graph-coverage" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => ["trace-module-uncovered", "trace-connection-uncovered"].includes(error.code))
          ),
        blockedRequirementRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-blocked-requirement" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "trace-blocked-requirement")
          ),
        traceModalityCoverageRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-trace-modality-coverage" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "trace-modality-uncovered")
          ),
        audioRouteBypassRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-audio-route-bypass" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "audio-route-direct-bypass-unsupported")
          ),
        audioCycleRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-audio-feedback-cycle" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "audio-cycle-unsupported")
          ),
        graphComplexityRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-graph-complexity" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => ["module-count-exceeds-limit", "connection-count-exceeds-limit"].includes(error.code))
          ),
        traceVerificationMethodRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-trace-verification-method" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "trace-verification-method-unsupported")
          ),
        audioProcessorOrphanRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-orphan-audio-processor" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "audio-processor-orphan")
          ),
        moduleOrphanRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-orphan-cv-source" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "module-orphan")
          ),
        undeclaredModalityRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-undeclared-cv-route" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "expected-modality-missing" && error.modality === "cv")
          ),
        audioModalityRequiredRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-effect-without-audio-modality" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "audio-modality-required")
          ),
        declaredRoleCoreRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-synth-with-effect-core" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "synth-core-required")
          ),
        unsupportedMidiModalityRejected: (traceEvidenceNegativeControls.results || [])
          .some((item) =>
            item.fixtureName === "invalid-midi-modality" &&
            item.status === "fail" &&
            (item.errors || []).some((error) => error.code === "midi-modality-unsupported")
          )
      } : null,
      provenance: provenanceResult ? {
        status: provenanceResult.status,
        draftCount: provenanceResult.summary?.draftCount ?? null,
        passingDraftCount: provenanceResult.summary?.passingDraftCount ?? null,
        problemCount: provenanceResult.summary?.problemCount ?? null
      } : null,
      promptSmoke: promptSmokeResult ? {
        status: promptSmokeResult.status,
        promptCount: promptSmokeResult.summary?.promptCount ?? null,
        passingPromptCount: promptSmokeResult.summary?.passingPromptCount ?? null,
        requiredCorePromptCount: promptSmokeResult.summary?.requiredCorePromptCount ?? null,
        concreteCoreTypeCount: promptSmokeResult.summary?.concreteCoreTypeCount ?? null,
        unresolvedAbstractionCount: promptSmokeResult.summary?.unresolvedAbstractionCount ?? null,
        problemCount: promptSmokeResult.summary?.problemCount ?? null
      } : null,
      descriptionWorkflow: descriptionWorkflowResult ? {
        status: descriptionWorkflowResult.status,
        selectedCandidateCount: descriptionWorkflowResult.summary?.selectedCandidateCount ?? null,
        measuredCandidateCount: descriptionWorkflowResult.summary?.measuredCandidateCount ?? null,
        draftCount: descriptionWorkflowResult.summary?.draftCount ?? null,
        validatedDraftCount: descriptionWorkflowResult.summary?.validatedDraftCount ?? null,
        blockerCount: descriptionWorkflowResult.summary?.blockerCount ?? null
      } : null,
      descriptionWorkflowNegativeControls: descriptionWorkflowNegativeControls ? {
        status: descriptionWorkflowNegativeControls.status,
        caseCount: descriptionWorkflowNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: descriptionWorkflowNegativeControls.summary?.passingCaseCount ?? null,
        problemCount: descriptionWorkflowNegativeControls.summary?.problemCount ?? null,
        commandExitCode: descriptionWorkflowNegativeControls.summary?.commandExitCode ?? null,
        blockedDescriptionStatus: descriptionWorkflowNegativeControls.summary?.blockedDescriptionStatus ?? null,
        expectedBlockerFound: descriptionWorkflowNegativeControls.summary?.expectedBlockerFound ?? null,
        leftoverDraftFileCount: descriptionWorkflowNegativeControls.summary?.leftoverDraftFileCount ?? null,
        blockedSelectionIsIsolated: descriptionWorkflowNegativeControls.summary?.blockedSelectionIsIsolated ?? null,
        blockedSelectionStatus: descriptionWorkflowNegativeControls.summary?.blockedSelectionStatus ?? null,
        blockedSelectionCandidateCount: descriptionWorkflowNegativeControls.summary?.blockedSelectionCandidateCount ?? null,
        canonicalPositiveSelectionPreserved: descriptionWorkflowNegativeControls.summary?.canonicalPositiveSelectionPreserved ?? null
      } : null,
      exportBoundaryNegativeControls: exportBoundaryNegativeControls ? {
        status: exportBoundaryNegativeControls.status,
        caseCount: exportBoundaryNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: exportBoundaryNegativeControls.summary?.passingCaseCount ?? null,
        problemCount: exportBoundaryNegativeControls.summary?.problemCount ?? null,
        validationStatus: exportBoundaryNegativeControls.summary?.validationStatus ?? null,
        expectedExportBoundaryFound: exportBoundaryNegativeControls.summary?.expectedExportBoundaryFound ?? null
      } : null,
      candidateReview: candidateReviewResult ? {
        status: candidateReviewResult.status,
        draftCount: candidateReviewResult.summary?.draftCount ?? null,
        passingDraftCount: candidateReviewResult.summary?.passingDraftCount ?? null,
        exportFieldCount: candidateReviewResult.summary?.exportFieldCount ?? null,
        unresolvedAbstractionCount: candidateReviewResult.summary?.unresolvedAbstractionCount ?? null,
        sourceGraphFamilyMismatchCount: candidateReviewResult.summary?.sourceGraphFamilyMismatchCount ?? null,
        sourceGraphRoleMismatchCount: candidateReviewResult.summary?.sourceGraphRoleMismatchCount ?? null,
        traceGraphCoverageIncompleteCount: candidateReviewResult.summary?.traceGraphCoverageIncompleteCount ?? null,
        intentGraphModalityMismatchCount: candidateReviewResult.summary?.intentGraphModalityMismatchCount ?? null,
        problemCount: candidateReviewResult.summary?.problemCount ?? null
      } : null,
      candidateReviewNegativeControls: candidateReviewNegativeControls ? {
        status: candidateReviewNegativeControls.status,
        problemCount: candidateReviewNegativeControls.summary?.problemCount ?? null,
        caseCount: candidateReviewNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: candidateReviewNegativeControls.summary?.passingCaseCount ?? null,
        sourceEvidenceBlockerFound: candidateReviewNegativeControls.summary?.sourceEvidenceBlockerFound ?? null,
        sourceGraphMismatchBlockerFound: candidateReviewNegativeControls.summary?.sourceGraphMismatchBlockerFound ?? null,
        sourceGraphRoleMismatchBlockerFound: candidateReviewNegativeControls.summary?.sourceGraphRoleMismatchBlockerFound ?? null,
        roleOnlyRoleMismatchBlockerFound: candidateReviewNegativeControls.summary?.roleOnlyRoleMismatchBlockerFound ?? null,
        roleOnlyGeneratedReadinessBlockerFound: candidateReviewNegativeControls.summary?.roleOnlyGeneratedReadinessBlockerFound ?? null,
        traceGraphCoverageBlockerFound: candidateReviewNegativeControls.summary?.traceGraphCoverageBlockerFound ?? null,
        traceIncompleteGeneratedReadinessBlockerFound: candidateReviewNegativeControls.summary?.traceIncompleteGeneratedReadinessBlockerFound ?? null,
        intentModalityBlockerFound: candidateReviewNegativeControls.summary?.intentModalityBlockerFound ?? null,
        intentModalityGeneratedReadinessBlockerFound: candidateReviewNegativeControls.summary?.intentModalityGeneratedReadinessBlockerFound ?? null,
        generatedReadinessBlockerFound: candidateReviewNegativeControls.summary?.generatedReadinessBlockerFound ?? null
      } : null,
      runtimeAudioNegativeControls: runtimeAudioNegativeControls ? {
        status: runtimeAudioNegativeControls.status,
        controlCount: runtimeAudioNegativeControls.summary?.controlCount ?? null,
        passingControlCount: runtimeAudioNegativeControls.summary?.passingControlCount ?? null,
        seededFailureCount: runtimeAudioNegativeControls.summary?.seededFailureCount ?? null,
        expectedFailureFoundCount: runtimeAudioNegativeControls.summary?.expectedFailureFoundCount ?? null,
        blockerCount: runtimeAudioNegativeControls.summary?.blockerCount ?? null
      } : null,
      readinessNegativeControls: readinessNegativeControls ? {
        status: readinessNegativeControls.status,
        caseCount: readinessNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: readinessNegativeControls.summary?.passingCaseCount ?? null,
        problemCount: readinessNegativeControls.summary?.problemCount ?? null
      } : null,
      negativeGuard: negativeGuardResult ? {
        status: negativeGuardResult.status,
        message: negativeGuardResult.error?.message || null
      } : null
    },
    blockers,
    claimBoundary: "Generated-patch readiness covers template selection, graph/trace draft generation, pre-export graph validation, candidate-review disclosure of unresolved template-core abstractions, runtime-audio negative-control evidence, and malformed-selection guard evidence. It does not claim binary export, full novel synthesis, hardware-realizable module graphs, musical quality, hardware parity, or complete runtime audio behavior for generated output.",
    artifacts: {
      resultPath: RESULT_PATH
    }
  };

  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.log(JSON.stringify({
    status: result.status,
    blockerCount: result.summary.blockerCount,
    selection: result.summary.selection,
    drafts: result.summary.drafts,
    validation: result.summary.validation,
    negativeGuard: result.summary.negativeGuard,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.generated-patch-readiness-result.v1",
    version: "0.4.0",
    revision: 1,
    status: "blocked",
    startedAt: nowIso(),
    completedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    artifacts: {
      resultPath: RESULT_PATH
    }
  };
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
