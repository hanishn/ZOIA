#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-claim-boundary");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const CLEAN_CONSUMER_BOOTSTRAP = process.env.ZOIA_CLAIM_BOUNDARY_CLEAN_CONSUMER_BOOTSTRAP === "1";

const REQUIRED_DOC_PHRASES = Object.freeze([
  "This checkpoint does not export a novel patch.",
  "Full novel patch synthesis.",
  "Exported binary patch generation.",
  "Audio-correctness proof for arbitrary descriptions.",
  "does not claim binary export, full novel synthesis, or runtime audio behavior for generated output",
  "hardware-realizable module graphs",
  "Generated candidate review evidence records unresolved template-core abstractions before generated-patch readiness passes.",
  "v0.4 readiness must block when generated-patch readiness evidence is degraded",
  "v0.4 readiness must block when generated abstraction disclosure is missing from generated-patch readiness evidence.",
  "Measured-signal scoring bonuses cannot select candidates without lexical or modality matches.",
  "An unmatched human description must block the one-command workflow and leave zero draft files before generated-patch readiness passes.",
  "Unmatched-description negative-control evidence must stay isolated from canonical positive from-description evidence.",
  "Export-looking payload fields must be rejected before generated-patch readiness passes.",
  "The validator rejects requirement traces that reference missing expected evidence paths.",
  "The validator rejects generated modules that occupy the same page/grid position.",
  "The validator rejects unsupported generated module semantics before export.",
  "The validator rejects unsupported generated module params before export.",
  "The validator rejects non-normalized generated module parameter values before export.",
  "The validator rejects out-of-range generated module parameter values before export.",
  "The validator rejects unsupported generated module ports before export.",
  "The validator rejects duplicate generated module port names before export.",
  "The validator rejects incompatible generated connection signal kinds before export.",
  "The validator rejects non-normalized generated connection gain values before export.",
  "The validator rejects out-of-range generated connection gain values before export.",
  "The validator rejects duplicate generated connection endpoint pairs before export.",
  "The validator rejects unsupported generated module self-routes before export.",
  "The validator rejects generated graphs with declared CV or control modalities but no connected CV or control route before export.",
  "The validator rejects generated graphs whose requirement traces do not cover every module and connection before export.",
  "The validator rejects blocked generated requirements before export.",
  "The validator rejects generated graphs whose requirement traces do not cover declared audio, CV, and control modalities before export.",
  "The validator rejects generated effect or synth graphs whose audio route bypasses the generated processor before export.",
  "The validator rejects unsupported generated audio feedback cycles before export.",
  "The validator rejects oversized generated pre-export graphs before export.",
  "The validator rejects unsupported generated trace verification methods before export.",
  "The validator rejects orphan generated audio processors before export.",
  "The validator rejects orphan generated modules before export.",
  "The validator rejects connected generated routes that omit their expected modality before export.",
  "The validator rejects generated effect or synth graphs that omit the audio modality before export.",
  "The validator rejects generated synth graphs that do not contain a concrete synth core before export.",
  "The validator rejects generated MIDI modality before a supported generated MIDI module contract exists.",
  "Generated candidate review must fail when a draft source evidence path is missing, source-to-graph family evidence is mismatched, source-to-graph module-role evidence is mismatched, trace-to-graph coverage is incomplete, or graph modalities are unsupported by intent and matched selection evidence, and generated-patch readiness must block on that failed review.",
  "Stale generated candidate-review evidence must block release-review summary and v0.4 readiness through isolated negative-control evidence.",
  "Stale generated validation evidence must block release-review summary and v0.4 readiness through isolated negative-control evidence.",
  "Documented generated evidence paths must exist before the release-review summary passes.",
  "Reviewer-summary quality failures must block release-review summary and v0.4 readiness through isolated negative-control evidence.",
  "Human-facing release-review summaries must not imply release readiness, broad text-to-ZOIA support, broad audible cutoff sweep support, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support, or complete patch semantics.",
  "Human-facing package-boundary summaries must not imply npm publication readiness, GitHub readiness, copied evidence bundle publication, release readiness, package artifact publication, or broader publication readiness.",
  "Release-review and v0.4 workflows must not invoke Git, GitHub, tag, release, or npm publication commands without exact human-only passcode evidence."
]);

const REQUIRED_EVIDENCE = Object.freeze({
  patchGenerationDoc: "docs/PATCH_GENERATION.md",
  validationDoc: "docs/VALIDATION.md",
  featureCoverageDoc: "docs/FEATURE_COVERAGE.md",
  generatedPatchReadiness: "tests/workflow/evidence/generated-patch-readiness/run-result.json",
  generatedPatchSelection: "tests/workflow/evidence/generated-patch-selection/run-result.json",
  generatedPatchSelectorScoringRegression: "tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json",
  generatedPatchDrafts: "tests/workflow/evidence/generated-patch-drafts/run-result.json",
  generatedPatchValidation: "tests/workflow/evidence/generated-patch-validation/run-result.json",
  generatedPatchTraceEvidenceNegativeControls: "tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json",
  generatedPatchCandidateReview: "tests/workflow/evidence/generated-patch-candidate-review/run-result.json",
  generatedPatchFromDescriptionNegativeControls: "tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json",
  generatedPatchExportBoundaryNegativeControls: "tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json",
  generatedPatchCandidateReviewNegativeControls: "tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json",
  generatedPatchNegativeGuard: "tests/workflow/evidence/generated-patch-draft-guard-negative/run-result.json",
  generatedPatchReadinessNegativeControls: "tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json",
  releaseReviewFreshnessNegativeControls: "tests/workflow/evidence/release-review-freshness-negative-controls/run-result.json",
  releaseReviewCleanConsumerSmokeNegativeControls: "tests/workflow/evidence/release-review-clean-consumer-smoke-negative-controls/run-result.json",
  releaseReviewDocumentedEvidenceNegativeControls: "tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json",
  releaseReviewSummaryQualityNegativeControls: "tests/workflow/evidence/release-review-summary-quality-negative-controls/run-result.json",
  releaseReviewOverclaimNegativeControls: "tests/workflow/evidence/release-review-overclaim-negative-controls/run-result.json",
  releaseReviewPackageBoundaryOverclaimNegativeControls: "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json",
  releaseReviewPublicationProtectionNegativeControls: "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json",
  ...(CLEAN_CONSUMER_BOOTSTRAP ? {} : {
    cleanConsumerSmoke: process.env.ZOIA_CLEAN_CONSUMER_SMOKE_PATH ||
      "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json"
  }),
  v04ReadinessNegativeControls: "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json",
  v04Readiness: "tests/workflow/evidence/v0.4-readiness/run-result.json"
});

function nowIso() {
  return new Date().toISOString();
}

async function readText(relativePath) {
  return readFile(resolve(PROJECT_ROOT, relativePath), "utf8");
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function addProblem(problems, id, message, evidencePath, observed = null) {
  problems.push({ id, message, evidencePath, observed });
}

function fullPath(relativePath) {
  return resolve(PROJECT_ROOT, relativePath);
}

function normalizePath(path) {
  return path ? resolve(path).toLowerCase() : "";
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const problems = [];
  const fileChecks = {};
  for (const [id, relativePath] of Object.entries(REQUIRED_EVIDENCE)) {
    const path = fullPath(relativePath);
    const exists = existsSync(path);
    fileChecks[id] = { path, exists };
    if (!exists) addProblem(problems, `missing-${id}`, `Required claim-boundary input is missing: ${relativePath}`, path);
  }

  let doc = "";
  let validationDoc = "";
  let featureCoverageDoc = "";
  let generatedReadiness = null;
  let selection = null;
  let selectorScoringRegression = null;
  let drafts = null;
  let validation = null;
  let traceEvidenceNegativeControls = null;
  let candidateReview = null;
  let descriptionWorkflowNegativeControls = null;
  let exportBoundaryNegativeControls = null;
  let candidateReviewNegativeControls = null;
  let negativeGuard = null;
  let generatedReadinessNegativeControls = null;
  let releaseReviewFreshnessNegativeControls = null;
  let releaseReviewCleanConsumerSmokeNegativeControls = null;
  let releaseReviewDocumentedEvidenceNegativeControls = null;
  let releaseReviewSummaryQualityNegativeControls = null;
  let releaseReviewOverclaimNegativeControls = null;
  let releaseReviewPackageBoundaryOverclaimNegativeControls = null;
  let releaseReviewPublicationProtectionNegativeControls = null;
  let cleanConsumerSmoke = null;
  let v04ReadinessNegativeControls = null;
  let v04 = null;

  if (fileChecks.patchGenerationDoc.exists) doc = await readText(REQUIRED_EVIDENCE.patchGenerationDoc);
  if (fileChecks.validationDoc.exists) validationDoc = await readText(REQUIRED_EVIDENCE.validationDoc);
  if (fileChecks.featureCoverageDoc.exists) featureCoverageDoc = await readText(REQUIRED_EVIDENCE.featureCoverageDoc);
  if (fileChecks.generatedPatchReadiness.exists) generatedReadiness = await readJson(REQUIRED_EVIDENCE.generatedPatchReadiness);
  if (fileChecks.generatedPatchSelection.exists) selection = await readJson(REQUIRED_EVIDENCE.generatedPatchSelection);
  if (fileChecks.generatedPatchSelectorScoringRegression.exists) selectorScoringRegression = await readJson(REQUIRED_EVIDENCE.generatedPatchSelectorScoringRegression);
  if (fileChecks.generatedPatchDrafts.exists) drafts = await readJson(REQUIRED_EVIDENCE.generatedPatchDrafts);
  if (fileChecks.generatedPatchValidation.exists) validation = await readJson(REQUIRED_EVIDENCE.generatedPatchValidation);
  if (fileChecks.generatedPatchTraceEvidenceNegativeControls.exists) traceEvidenceNegativeControls = await readJson(REQUIRED_EVIDENCE.generatedPatchTraceEvidenceNegativeControls);
  if (fileChecks.generatedPatchCandidateReview.exists) candidateReview = await readJson(REQUIRED_EVIDENCE.generatedPatchCandidateReview);
  if (fileChecks.generatedPatchFromDescriptionNegativeControls.exists) descriptionWorkflowNegativeControls = await readJson(REQUIRED_EVIDENCE.generatedPatchFromDescriptionNegativeControls);
  if (fileChecks.generatedPatchExportBoundaryNegativeControls.exists) exportBoundaryNegativeControls = await readJson(REQUIRED_EVIDENCE.generatedPatchExportBoundaryNegativeControls);
  if (fileChecks.generatedPatchCandidateReviewNegativeControls.exists) candidateReviewNegativeControls = await readJson(REQUIRED_EVIDENCE.generatedPatchCandidateReviewNegativeControls);
  if (fileChecks.generatedPatchNegativeGuard.exists) negativeGuard = await readJson(REQUIRED_EVIDENCE.generatedPatchNegativeGuard);
  if (fileChecks.generatedPatchReadinessNegativeControls.exists) generatedReadinessNegativeControls = await readJson(REQUIRED_EVIDENCE.generatedPatchReadinessNegativeControls);
  if (fileChecks.releaseReviewFreshnessNegativeControls.exists) releaseReviewFreshnessNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewFreshnessNegativeControls);
  if (fileChecks.releaseReviewCleanConsumerSmokeNegativeControls.exists) releaseReviewCleanConsumerSmokeNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewCleanConsumerSmokeNegativeControls);
  if (fileChecks.releaseReviewDocumentedEvidenceNegativeControls.exists) releaseReviewDocumentedEvidenceNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewDocumentedEvidenceNegativeControls);
  if (fileChecks.releaseReviewSummaryQualityNegativeControls.exists) releaseReviewSummaryQualityNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewSummaryQualityNegativeControls);
  if (fileChecks.releaseReviewOverclaimNegativeControls.exists) releaseReviewOverclaimNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewOverclaimNegativeControls);
  if (fileChecks.releaseReviewPackageBoundaryOverclaimNegativeControls.exists) releaseReviewPackageBoundaryOverclaimNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewPackageBoundaryOverclaimNegativeControls);
  if (fileChecks.releaseReviewPublicationProtectionNegativeControls.exists) releaseReviewPublicationProtectionNegativeControls = await readJson(REQUIRED_EVIDENCE.releaseReviewPublicationProtectionNegativeControls);
  if (fileChecks.cleanConsumerSmoke?.exists) cleanConsumerSmoke = await readJson(REQUIRED_EVIDENCE.cleanConsumerSmoke);
  if (fileChecks.v04ReadinessNegativeControls.exists) v04ReadinessNegativeControls = await readJson(REQUIRED_EVIDENCE.v04ReadinessNegativeControls);
  if (fileChecks.v04Readiness.exists) v04 = await readJson(REQUIRED_EVIDENCE.v04Readiness);

  for (const phrase of REQUIRED_DOC_PHRASES) {
    if (!doc.includes(phrase)) {
      addProblem(problems, "missing-doc-claim-boundary", "Patch generation doc is missing a required claim-boundary phrase.", fileChecks.patchGenerationDoc.path, { phrase });
    }
  }

  for (const [docId, text] of Object.entries({
    validationDoc,
    featureCoverageDoc
  })) {
    for (const phrase of [
      "degraded generated-patch readiness blocks v0.4 readiness",
      "generated-patch readiness"
    ]) {
      if (!text.includes(phrase)) {
        addProblem(problems, "missing-release-doc-negative-control-boundary", "Release/readiness doc is missing required generated-patch negative-control boundary text.", fileChecks[docId].path, { docId, phrase });
      }
    }
  }

  if (generatedReadiness) {
    const boundary = generatedReadiness.claimBoundary || "";
    for (const phrase of ["does not claim binary export", "full novel synthesis", "hardware-realizable module graphs", "runtime audio behavior"]) {
      if (!boundary.includes(phrase)) {
        addProblem(problems, "generated-readiness-boundary-overbroad", "Generated readiness claim boundary is missing required limitation text.", fileChecks.generatedPatchReadiness.path, { phrase, claimBoundary: boundary });
      }
    }
  }

  if (candidateReview) {
    if (
      candidateReview.status !== "pass" ||
      !Number.isInteger(candidateReview.summary?.unresolvedAbstractionCount) ||
      !/unresolved template-core abstractions/.test(candidateReview.claimBoundary || "")
    ) {
      addProblem(problems, "candidate-review-abstraction-disclosure-invalid", "Generated-patch candidate review must disclose unresolved template-core abstractions and deny hardware-realizable graph claims.", fileChecks.generatedPatchCandidateReview.path, {
        status: candidateReview.status,
        summary: candidateReview.summary,
        claimBoundary: candidateReview.claimBoundary || null
      });
    }
  }

  if (selection) {
    if (
      selection.claimBoundaries?.selectedExistingTemplateOnly !== true ||
      selection.claimBoundaries?.novelPatchClaim !== false ||
      selection.claimBoundaries?.exportedPatchClaim !== false
    ) {
      addProblem(problems, "selection-claim-boundary-invalid", "Selection evidence must explicitly deny novel/export claims.", fileChecks.generatedPatchSelection.path, selection.claimBoundaries || null);
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
      addProblem(problems, "selector-scoring-regression-invalid", "Selector scoring regression must prove measured-signal bonuses cannot select unmatched descriptions.", fileChecks.generatedPatchSelectorScoringRegression.path, {
        status: selectorScoringRegression.status,
        summary: selectorScoringRegression.summary
      });
    }
  }

  if (drafts) {
    if (
      drafts.claimBoundaries?.generatedIntermediateGraphClaim !== true ||
      drafts.claimBoundaries?.exportedPatchClaim !== false ||
      drafts.claimBoundaries?.novelPatchClaim !== false ||
      drafts.claimBoundaries?.runtimeAudioClaim !== false
    ) {
      addProblem(problems, "draft-claim-boundary-invalid", "Draft evidence must limit claims to intermediate graph generation.", fileChecks.generatedPatchDrafts.path, drafts.claimBoundaries || null);
    }
  }

  if (validation) {
    if (
      validation.claimBoundaries?.preExportGraphValidationOnly !== true ||
      validation.claimBoundaries?.exportedPatchClaim !== false ||
      validation.claimBoundaries?.novelPatchClaim !== false ||
      validation.claimBoundaries?.audioRuntimeClaim !== false
    ) {
      addProblem(problems, "validation-claim-boundary-invalid", "Validation evidence must limit claims to pre-export graph validation.", fileChecks.generatedPatchValidation.path, validation.claimBoundaries || null);
    }
  }

  if (negativeGuard) {
    if (
      negativeGuard.status !== "fail" ||
      negativeGuard.claimBoundaries?.generatedIntermediateGraphClaim !== false ||
      negativeGuard.claimBoundaries?.exportedPatchClaim !== false ||
      negativeGuard.claimBoundaries?.novelPatchClaim !== false ||
      negativeGuard.claimBoundaries?.runtimeAudioClaim !== false
    ) {
      addProblem(problems, "negative-guard-claim-boundary-invalid", "Negative guard evidence must fail closed and deny generation/export/runtime claims.", fileChecks.generatedPatchNegativeGuard.path, {
        status: negativeGuard.status,
        claimBoundaries: negativeGuard.claimBoundaries || null,
        error: negativeGuard.error || null
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
      addProblem(problems, "trace-evidence-negative-controls-invalid", "Generated-patch graph/trace negative controls must prove missing expected evidence paths, duplicate grid positions, unsupported module semantics, unsupported module params, and unsupported module ports are rejected.", fileChecks.generatedPatchTraceEvidenceNegativeControls.path, {
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

  if (descriptionWorkflowNegativeControls) {
    if (
      descriptionWorkflowNegativeControls.status !== "pass" ||
      descriptionWorkflowNegativeControls.summary?.problemCount !== 0 ||
      descriptionWorkflowNegativeControls.summary?.caseCount !== 1 ||
      descriptionWorkflowNegativeControls.summary?.passingCaseCount !== 1 ||
      descriptionWorkflowNegativeControls.summary?.commandExitCode === 0 ||
      descriptionWorkflowNegativeControls.summary?.blockedDescriptionStatus !== "blocked" ||
      descriptionWorkflowNegativeControls.summary?.expectedBlockerFound !== true ||
      descriptionWorkflowNegativeControls.summary?.leftoverDraftFileCount !== 0 ||
      descriptionWorkflowNegativeControls.summary?.blockedSelectionIsIsolated !== true ||
      descriptionWorkflowNegativeControls.summary?.blockedSelectionStatus !== "fail" ||
      descriptionWorkflowNegativeControls.summary?.blockedSelectionCandidateCount !== 0 ||
      descriptionWorkflowNegativeControls.summary?.canonicalPositiveSelectionPreserved !== true
    ) {
      addProblem(problems, "description-workflow-negative-controls-invalid", "Human-description workflow negative controls must prove unmatched descriptions block without stale draft files.", fileChecks.generatedPatchFromDescriptionNegativeControls.path, {
        status: descriptionWorkflowNegativeControls.status,
        summary: descriptionWorkflowNegativeControls.summary
      });
    }
  }

  if (exportBoundaryNegativeControls) {
    if (
      exportBoundaryNegativeControls.status !== "pass" ||
      exportBoundaryNegativeControls.summary?.problemCount !== 0 ||
      exportBoundaryNegativeControls.summary?.caseCount !== 1 ||
      exportBoundaryNegativeControls.summary?.passingCaseCount !== 1 ||
      exportBoundaryNegativeControls.summary?.validationStatus !== "pass" ||
      exportBoundaryNegativeControls.summary?.expectedExportBoundaryFound !== true
    ) {
      addProblem(problems, "export-boundary-negative-controls-invalid", "Export-boundary negative controls must prove export-looking payload fields are rejected.", fileChecks.generatedPatchExportBoundaryNegativeControls.path, {
        status: exportBoundaryNegativeControls.status,
        summary: exportBoundaryNegativeControls.summary
      });
    }
  }

  if (candidateReviewNegativeControls) {
    if (
      candidateReviewNegativeControls.status !== "pass" ||
      candidateReviewNegativeControls.summary?.problemCount !== 0 ||
      candidateReviewNegativeControls.summary?.caseCount !== 5 ||
      candidateReviewNegativeControls.summary?.passingCaseCount !== 5 ||
      candidateReviewNegativeControls.summary?.blockedCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.sourceEvidenceBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.generatedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedMismatchCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.sourceGraphMismatchBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.sourceGraphRoleMismatchBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedMismatchGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.mismatchGeneratedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedRoleOnlyCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.roleOnlyFamilyMismatchBlockerFound !== false ||
      candidateReviewNegativeControls.summary?.roleOnlyRoleMismatchBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedRoleOnlyGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.roleOnlyGeneratedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedTraceIncompleteCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.traceGraphCoverageBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedTraceIncompleteGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.traceIncompleteGeneratedReadinessBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedIntentModalityCandidateReviewStatus !== "fail" ||
      candidateReviewNegativeControls.summary?.intentModalityBlockerFound !== true ||
      candidateReviewNegativeControls.summary?.blockedIntentModalityGeneratedReadinessStatus !== "blocked" ||
      candidateReviewNegativeControls.summary?.intentModalityGeneratedReadinessBlockerFound !== true
    ) {
      addProblem(problems, "candidate-review-negative-controls-invalid", "Generated-patch candidate-review negative controls must prove missing source evidence, source-to-graph family mismatch, source-to-graph module-role mismatch, incomplete trace-to-graph coverage, and intent-to-graph modality mismatch block candidate review and generated-patch readiness.", fileChecks.generatedPatchCandidateReviewNegativeControls.path, {
        status: candidateReviewNegativeControls.status,
        summary: candidateReviewNegativeControls.summary
      });
    }
  }

  if (generatedReadinessNegativeControls) {
    if (
      generatedReadinessNegativeControls.status !== "pass" ||
      generatedReadinessNegativeControls.summary?.problemCount !== 0 ||
      generatedReadinessNegativeControls.summary?.caseCount < 3 ||
      generatedReadinessNegativeControls.summary?.passingCaseCount !== generatedReadinessNegativeControls.summary?.caseCount
    ) {
      addProblem(problems, "generated-readiness-negative-controls-invalid", "Generated-patch readiness negative controls must pass and cover degraded provenance, prompt-smoke, and description-workflow evidence.", fileChecks.generatedPatchReadinessNegativeControls.path, {
        status: generatedReadinessNegativeControls.status,
        summary: generatedReadinessNegativeControls.summary
      });
    }
    for (const expectedBlocker of [
      "generated-draft-provenance-not-ready",
      "generated-prompt-smoke-not-ready",
      "generated-description-workflow-not-ready"
    ]) {
      const found = (generatedReadinessNegativeControls.cases || [])
        .some((testCase) => testCase.status === "pass" && testCase.expectedBlocker === expectedBlocker && testCase.expectedBlockerFound === true);
      if (!found) {
        addProblem(problems, "generated-readiness-negative-control-case-missing", "Generated-patch readiness negative controls are missing an expected degraded-evidence blocker case.", fileChecks.generatedPatchReadinessNegativeControls.path, {
          expectedBlocker
        });
      }
    }
  }

  if (releaseReviewFreshnessNegativeControls) {
    if (
      releaseReviewFreshnessNegativeControls.status !== "pass" ||
      releaseReviewFreshnessNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewFreshnessNegativeControls.summary?.caseCount !== 3 ||
      releaseReviewFreshnessNegativeControls.summary?.passingCaseCount !== 3 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedReleaseReviewStatus !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.candidateReviewStaleBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.blockedV04Status !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.v04ReleaseReviewBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.blockedValidationReleaseReviewStatus !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.generatedValidationStaleBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.blockedValidationV04Status !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.validationV04ReleaseReviewBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.blockedCleanSmokeReleaseReviewStatus !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.cleanConsumerSmokeStaleBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.blockedCleanSmokeV04Status !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.cleanSmokeV04ReleaseReviewBlockerFound !== true
    ) {
      addProblem(problems, "release-review-freshness-negative-controls-invalid", "Release-review freshness negative controls must prove stale candidate-review, generated validation, and clean consumer smoke evidence block release-review summary and v0.4 readiness.", fileChecks.releaseReviewFreshnessNegativeControls.path, {
        status: releaseReviewFreshnessNegativeControls.status,
        summary: releaseReviewFreshnessNegativeControls.summary
      });
    }
  }

  if (releaseReviewCleanConsumerSmokeNegativeControls) {
    if (
      releaseReviewCleanConsumerSmokeNegativeControls.status !== "pass" ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.caseCount !== 2 ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.passingCaseCount !== 2 ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingReleaseReviewCommandExitCode === 0 ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingReleaseReviewStatus !== "blocked" ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingCleanConsumerSmokeEvidenceBlockerFound !== true ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingCleanConsumerSmokeQualityBlockerFound !== true ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingCleanConsumerSmokeEvidenceMarkerFound !== true ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingProtectedBoundaryFound !== true ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.staleReleaseReviewCommandExitCode === 0 ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.staleReleaseReviewStatus !== "blocked" ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.staleCleanConsumerSmokeEvidenceBlockerFound !== true ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.staleCleanConsumerSmokeEvidenceMarkerFound !== true ||
      releaseReviewCleanConsumerSmokeNegativeControls.summary?.staleProtectedBoundaryFound !== true
    ) {
      addProblem(problems, "release-review-clean-consumer-smoke-negative-controls-invalid", "Release-review clean consumer smoke negative controls must prove missing and stale clean-smoke evidence block release-review summary directly.", fileChecks.releaseReviewCleanConsumerSmokeNegativeControls.path, {
        status: releaseReviewCleanConsumerSmokeNegativeControls.status,
        summary: releaseReviewCleanConsumerSmokeNegativeControls.summary,
        problems: releaseReviewCleanConsumerSmokeNegativeControls.problems
      });
    }
  }

  if (releaseReviewDocumentedEvidenceNegativeControls) {
    if (
      releaseReviewDocumentedEvidenceNegativeControls.status !== "pass" ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.caseCount !== 1 ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.passingCaseCount !== 1 ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.blockedReleaseReviewStatus !== "blocked" ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.documentedEvidenceMissingBlockerFound !== true ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.blockedV04Status !== "blocked" ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.v04ReleaseReviewBlockerFound !== true
    ) {
      addProblem(problems, "release-review-documented-evidence-negative-controls-invalid", "Release-review documented-evidence negative controls must prove missing documented evidence paths block release-review summary and v0.4 readiness.", fileChecks.releaseReviewDocumentedEvidenceNegativeControls.path, {
        status: releaseReviewDocumentedEvidenceNegativeControls.status,
        summary: releaseReviewDocumentedEvidenceNegativeControls.summary
      });
    }
  }

  if (releaseReviewSummaryQualityNegativeControls) {
    if (
      releaseReviewSummaryQualityNegativeControls.status !== "pass" ||
      releaseReviewSummaryQualityNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.caseCount !== 22 ||
      releaseReviewSummaryQualityNegativeControls.summary?.passingCaseCount !== 22 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.summaryQualityBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.v04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedContractReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedContractEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedContractV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.contractV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateModulePortReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedDuplicateModulePortEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateModulePortV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateModulePortV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamRangeReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedParamRangeEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamRangeV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramRangeV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamNormalizationReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedParamNormalizationEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamNormalizationV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramNormalizationV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedPortKindReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedPortKindEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedPortKindV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.portKindV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedConnectionGainNormalizationEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainRangeReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedConnectionGainRangeEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainRangeV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainRangeV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateConnectionReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedDuplicateConnectionEndpointEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateConnectionV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateConnectionV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedSelfRouteReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedSelfRouteEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedSelfRouteV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.selfRouteV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModulationRouteReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedModulationRouteEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModulationRouteV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.modulationRouteV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceCoverageReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceGraphCoverageEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceCoverageV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceCoverageV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedBlockedRequirementReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedBlockedRequirementEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedBlockedRequirementV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedRequirementV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceModalityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceModalityCoverageEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceModalityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceModalityV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioRouteReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioRouteBypassEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioRouteV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioRouteV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioCycleReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioCycleEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioCycleV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioCycleV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedGraphComplexityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedGraphComplexityEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedGraphComplexityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.graphComplexityV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceVerificationMethodReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceVerificationMethodEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceVerificationMethodV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceVerificationMethodV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioProcessorOrphanReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioProcessorOrphanEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioProcessorOrphanV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioProcessorOrphanV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModuleOrphanReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedModuleOrphanEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModuleOrphanV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.moduleOrphanV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedUndeclaredModalityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedUndeclaredModalityEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedUndeclaredModalityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.undeclaredModalityV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioModalityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioModalityEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioModalityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioModalityV04ReleaseReviewBlockerFound !== true
    ) {
      addProblem(problems, "release-review-summary-quality-negative-controls-invalid", "Release-review summary-quality negative controls must prove degraded reviewer-summary quality blocks release-review summary and v0.4 readiness.", fileChecks.releaseReviewSummaryQualityNegativeControls.path, {
        status: releaseReviewSummaryQualityNegativeControls.status,
        summary: releaseReviewSummaryQualityNegativeControls.summary
      });
    }
  }

  if (releaseReviewOverclaimNegativeControls) {
    if (
      releaseReviewOverclaimNegativeControls.status !== "pass" ||
      releaseReviewOverclaimNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewOverclaimNegativeControls.summary?.baselineBoundaryStatus !== "pass" ||
      releaseReviewOverclaimNegativeControls.summary?.caseCount !== 5 ||
      releaseReviewOverclaimNegativeControls.summary?.passingCaseCount !== 5 ||
      releaseReviewOverclaimNegativeControls.summary?.seededFailureCount !== 5 ||
      releaseReviewOverclaimNegativeControls.summary?.expectedFailureFoundCount !== 5
    ) {
      addProblem(problems, "release-review-overclaim-negative-controls-invalid", "Release-review overclaim negative controls must prove human-facing release-review summary overclaims are rejected.", fileChecks.releaseReviewOverclaimNegativeControls.path, {
        status: releaseReviewOverclaimNegativeControls.status,
        summary: releaseReviewOverclaimNegativeControls.summary
      });
    }
  }

  if (releaseReviewPackageBoundaryOverclaimNegativeControls) {
    if (
      releaseReviewPackageBoundaryOverclaimNegativeControls.status !== "pass" ||
      releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.baselineBoundaryStatus !== "pass" ||
      releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.caseCount !== 5 ||
      releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.passingCaseCount !== 5 ||
      releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.seededFailureCount !== 5 ||
      releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.expectedFailureFoundCount !== 5
    ) {
      addProblem(problems, "release-review-package-boundary-overclaim-negative-controls-invalid", "Release-review package-boundary overclaim negative controls must prove publication-readiness overclaims are rejected.", fileChecks.releaseReviewPackageBoundaryOverclaimNegativeControls.path, {
        status: releaseReviewPackageBoundaryOverclaimNegativeControls.status,
        summary: releaseReviewPackageBoundaryOverclaimNegativeControls.summary
      });
    }
  }

  if (releaseReviewPublicationProtectionNegativeControls) {
    if (
      releaseReviewPublicationProtectionNegativeControls.status !== "pass" ||
      releaseReviewPublicationProtectionNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewPublicationProtectionNegativeControls.summary?.protectedActualCommandCount !== 0 ||
      releaseReviewPublicationProtectionNegativeControls.summary?.scriptTextFindingCount !== 0 ||
      releaseReviewPublicationProtectionNegativeControls.summary?.seededControlCount !== 6 ||
      releaseReviewPublicationProtectionNegativeControls.summary?.passingSeededControlCount !== 6 ||
      releaseReviewPublicationProtectionNegativeControls.summary?.expectedFailureFoundCount !== 6 ||
      releaseReviewPublicationProtectionNegativeControls.summary?.protectedBoundaryPresent !== true ||
      releaseReviewPublicationProtectionNegativeControls.summary?.sourceControlSideEffectsPerformed !== false
    ) {
      addProblem(problems, "release-review-publication-protection-negative-controls-invalid", "Release-review publication-protection negative controls must prove protected Git, GitHub, tag, release, and npm publication commands are rejected.", fileChecks.releaseReviewPublicationProtectionNegativeControls.path, {
        status: releaseReviewPublicationProtectionNegativeControls.status,
        summary: releaseReviewPublicationProtectionNegativeControls.summary
      });
    }
  }

  if (cleanConsumerSmoke) {
    if (
      cleanConsumerSmoke.status !== "pass" ||
      cleanConsumerSmoke.summary?.problemCount !== 0 ||
      cleanConsumerSmoke.summary?.packageManifestRequiredPathCount !== 6 ||
      cleanConsumerSmoke.summary?.packageManifestMissingPathCount !== 0 ||
      cleanConsumerSmoke.summary?.packageManifestNegativeControlCount !== 2 ||
      cleanConsumerSmoke.summary?.packageManifestPassingNegativeControlCount !== 2 ||
      cleanConsumerSmoke.summary?.packageMetadataValid !== true ||
      cleanConsumerSmoke.summary?.packageScriptReferenceCount !== 4 ||
      cleanConsumerSmoke.summary?.packageScriptMissingReferenceCount !== 0 ||
      cleanConsumerSmoke.summary?.installedRequiredPathCount !== 8 ||
      cleanConsumerSmoke.summary?.installedMissingPathCount !== 0 ||
      cleanConsumerSmoke.summary?.v04ReadinessStatus !== "pass" ||
      cleanConsumerSmoke.summary?.v04ReadinessBlockerCount !== 0 ||
      cleanConsumerSmoke.summary?.v04ReadinessCleanConsumerBootstrap !== true ||
      cleanConsumerSmoke.summary?.v04ReadinessReleaseReviewSummarySkippedForBootstrap !== true ||
      cleanConsumerSmoke.summary?.v04ReadinessCleanConsumerSmokeSkippedForBootstrap !== true ||
      cleanConsumerSmoke.summary?.claimBoundaryStatus !== "pass" ||
      cleanConsumerSmoke.summary?.claimBoundaryProblemCount !== 0 ||
      cleanConsumerSmoke.summary?.sourceTreeImportsUsedByInstalledCommands !== false ||
      cleanConsumerSmoke.summary?.copiedEvidenceNegativeControlCount !== 4 ||
      cleanConsumerSmoke.summary?.copiedEvidencePassingNegativeControlCount !== 4 ||
      cleanConsumerSmoke.summary?.installedCommandAuditCount !== 5 ||
      cleanConsumerSmoke.summary?.installedCommandSourceTreeFindingCount !== 0 ||
      cleanConsumerSmoke.summary?.missingGeneratedEvidenceBlockedStatus !== "blocked" ||
      cleanConsumerSmoke.summary?.staleReleaseReviewBlockedStatus !== "blocked" ||
      cleanConsumerSmoke.summary?.missingInstalledReadinessScriptBlocked !== true ||
      cleanConsumerSmoke.summary?.missingInstalledCapabilityDocBlockedStatus !== "fail" ||
      cleanConsumerSmoke.summary?.releaseReviewRegenerationProbeExitCode === 0 ||
      cleanConsumerSmoke.summary?.releaseReviewRegenerationGitWorktreeBlockerFound !== true ||
      cleanConsumerSmoke.summary?.claimBoundaryCleanConsumerBootstrap !== true ||
      cleanConsumerSmoke.summary?.claimBoundaryCleanConsumerSmokeSkippedForBootstrap !== true
    ) {
      addProblem(problems, "clean-consumer-smoke-invalid", "Clean consumer smoke must prove installed-package v0.4/generated-patch gates and missing/stale evidence blockers.", fileChecks.cleanConsumerSmoke.path, {
        status: cleanConsumerSmoke.status,
        summary: cleanConsumerSmoke.summary
      });
    }
  }

  if (v04ReadinessNegativeControls) {
    if (
      v04ReadinessNegativeControls.status !== "pass" ||
      v04ReadinessNegativeControls.summary?.problemCount !== 0 ||
      v04ReadinessNegativeControls.summary?.caseCount !== 13 ||
      v04ReadinessNegativeControls.summary?.passingCaseCount !== 13 ||
      v04ReadinessNegativeControls.summary?.commandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.blockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.abstractionDisclosureCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.abstractionDisclosureBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedAbstractionDisclosureBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.runtimeAudioDependencyCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.runtimeAudioDependencyBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedRuntimeAudioDependencyBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokeBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeMissingRegenerationBlockerCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeMissingRegenerationBlockerBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingRegenerationBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.missingCleanConsumerSmokeCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.missingCleanConsumerSmokeBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedMissingCleanConsumerSmokeBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeSourceTreeImportCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeSourceTreeImportBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokeSourceTreeImportBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokePackageManifestCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokePackageManifestBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokePackageManifestBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokePackageBoundaryExportCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokePackageBoundaryExportBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokePackageBoundaryExportBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledV04CommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledV04BlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingInstalledV04BlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledClaimBoundaryCommandExitCode === 0 ||
      v04ReadinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedV04Status !== "blocked" ||
      v04ReadinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlockerFound !== true ||
      v04ReadinessNegativeControls.summary?.expectedReleaseReviewPublicationProtectionBlockerFound !== true
    ) {
      addProblem(problems, "v04-readiness-negative-controls-invalid", "v0.4 readiness negative controls must prove degraded generated-patch readiness, missing generated abstraction disclosure, degraded runtime-audio dependency evidence, degraded clean consumer evidence, and missing clean consumer release-review regeneration blocker evidence block v0.4 readiness.", fileChecks.v04ReadinessNegativeControls.path, {
        status: v04ReadinessNegativeControls.status,
        summary: v04ReadinessNegativeControls.summary
      });
    }
  }

  if (v04) {
    const expectedReadinessPath = normalizePath(fileChecks.generatedPatchReadiness.path);
    const observedReadinessPath = normalizePath(v04.fileChecks?.generatedPatchReadiness?.path);
    if (expectedReadinessPath !== observedReadinessPath) {
      addProblem(problems, "v04-generated-readiness-path-mismatch", "v0.4 readiness points at a different generated-patch readiness path.", fileChecks.v04Readiness.path, {
        expected: fileChecks.generatedPatchReadiness.path,
        observed: v04.fileChecks?.generatedPatchReadiness?.path || null
      });
    }
  }

  const result = {
    schemaVersion: "zoia.generated-patch-claim-boundary-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    fileChecks,
    summary: {
      problemCount: problems.length,
      requiredDocPhraseCount: REQUIRED_DOC_PHRASES.length,
      generatedReadinessStatus: generatedReadiness?.status || null,
      v04ReadinessStatus: v04?.status || null,
      v04GeneratedReadinessPathIntegrated: Boolean(v04?.fileChecks?.generatedPatchReadiness?.path),
      generatedReadinessNegativeControlsStatus: generatedReadinessNegativeControls?.status || null,
      v04ReadinessNegativeControlsStatus: v04ReadinessNegativeControls?.status || null,
      releaseReviewCleanConsumerSmokeNegativeControlsStatus: releaseReviewCleanConsumerSmokeNegativeControls?.status || null,
      releaseReviewOverclaimNegativeControlsStatus: releaseReviewOverclaimNegativeControls?.status || null,
      releaseReviewPackageBoundaryOverclaimNegativeControlsStatus: releaseReviewPackageBoundaryOverclaimNegativeControls?.status || null,
      releaseReviewPublicationProtectionNegativeControlsStatus: releaseReviewPublicationProtectionNegativeControls?.status || null,
      cleanConsumerSmokeStatus: cleanConsumerSmoke?.status || null,
      cleanConsumerSmokePackageManifestRequiredPathCount: cleanConsumerSmoke?.summary?.packageManifestRequiredPathCount ?? null,
      cleanConsumerSmokePackageManifestMissingPathCount: cleanConsumerSmoke?.summary?.packageManifestMissingPathCount ?? null,
      cleanConsumerSmokePackageManifestNegativeControlCount: cleanConsumerSmoke?.summary?.packageManifestNegativeControlCount ?? null,
      cleanConsumerSmokePackageManifestPassingNegativeControlCount: cleanConsumerSmoke?.summary?.packageManifestPassingNegativeControlCount ?? null,
      cleanConsumerSmokePackageMetadataValid: cleanConsumerSmoke?.summary?.packageMetadataValid ?? null,
      cleanConsumerSmokePackageScriptReferenceCount: cleanConsumerSmoke?.summary?.packageScriptReferenceCount ?? null,
      cleanConsumerSmokePackageScriptMissingReferenceCount: cleanConsumerSmoke?.summary?.packageScriptMissingReferenceCount ?? null,
      cleanConsumerSmokeCopiedEvidenceNegativeControlCount: cleanConsumerSmoke?.summary?.copiedEvidenceNegativeControlCount ?? null,
      cleanConsumerSmokeCopiedEvidencePassingNegativeControlCount: cleanConsumerSmoke?.summary?.copiedEvidencePassingNegativeControlCount ?? null,
      cleanConsumerBootstrap: CLEAN_CONSUMER_BOOTSTRAP,
      cleanConsumerSmokeSkippedForCleanConsumerBootstrap: CLEAN_CONSUMER_BOOTSTRAP
    },
    problems,
    claimBoundary: "This gate checks that generated-patch documents and readiness evidence do not overclaim binary export, full novel synthesis, or runtime audio behavior for generated output.",
    artifacts: {
      resultPath: RESULT_PATH
    }
  };

  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.log(JSON.stringify({
    status: result.status,
    problemCount: result.summary.problemCount,
    generatedReadinessStatus: result.summary.generatedReadinessStatus,
    v04ReadinessStatus: result.summary.v04ReadinessStatus,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.generated-patch-claim-boundary-result.v1",
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
  };
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
