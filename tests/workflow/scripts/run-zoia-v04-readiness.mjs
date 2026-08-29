#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-readiness");
const RESULT_PATH = process.env.ZOIA_V04_READINESS_RESULT_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_V04_READINESS_RESULT_PATH)
  : resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const CLEAN_CONSUMER_BOOTSTRAP = process.env.ZOIA_V04_CLEAN_CONSUMER_BOOTSTRAP === "1";

const REQUIRED_FILES = Object.freeze({
  featureCoverage: "docs/FEATURE_COVERAGE.md",
  validation: "docs/VALIDATION.md",
  patchSchema: "tests/workflow/schemas/patch-verification-result.schema.json",
  ci: "tests/workflow/evidence/q109-ci-gate-integration/run-result.json",
  stagedAudio: "tests/workflow/evidence/q104-staged-patch-audio-all-baseline/run-result.json",
  testPatchStimulus: "tests/workflow/evidence/v0.4-test-patch-stimulus/run-result.json",
  stagedTrace: "tests/workflow/evidence/v0.3-trace-baseline/run-result.json",
  communityTrace: "tests/workflow/evidence/v0.3-trace-baseline/community-run-result.json",
  communityAudio: "tests/workflow/evidence/q106-community-patch-audio-classification-baseline/run-result.json",
  communityStimulus: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-playability-full-r1/run-result.json",
  communityModalityRollup: "tests/workflow/evidence/v0.4-community-modality-rollup/run-result.json",
  generatedPatchReadiness: process.env.ZOIA_GENERATED_PATCH_READINESS_PATH ||
    "tests/workflow/evidence/generated-patch-readiness/run-result.json",
  readinessNegativeControls: "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json",
  releaseReviewFreshnessNegativeControls: "tests/workflow/evidence/release-review-freshness-negative-controls/run-result.json",
  releaseReviewCleanConsumerSmokeNegativeControls: "tests/workflow/evidence/release-review-clean-consumer-smoke-negative-controls/run-result.json",
  releaseReviewDocumentedEvidenceNegativeControls: "tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json",
  releaseReviewSummaryQualityNegativeControls: "tests/workflow/evidence/release-review-summary-quality-negative-controls/run-result.json",
  releaseReviewOverclaimNegativeControls: "tests/workflow/evidence/release-review-overclaim-negative-controls/run-result.json",
  releaseReviewPackageBoundaryOverclaimNegativeControls: "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json",
  releaseReviewPublicationProtectionNegativeControls: process.env.ZOIA_RELEASE_REVIEW_PUBLICATION_PROTECTION_NEGATIVE_CONTROLS_PATH ||
    "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json",
  ...(CLEAN_CONSUMER_BOOTSTRAP ? {} : {
    cleanConsumerSmoke: process.env.ZOIA_CLEAN_CONSUMER_SMOKE_PATH ||
      "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json",
    releaseReviewSummary: process.env.ZOIA_RELEASE_REVIEW_SUMMARY_PATH ||
      "tests/workflow/evidence/release-review-summary/run-result.json"
  })
});

const TEST_PATCH_BLOCKING_CLASSIFICATIONS = Object.freeze([
  "patch-requires-external-input-midi-cv"
]);

const COMMUNITY_BLOCKING_CLASSIFICATIONS = Object.freeze([
  "patch-requires-external-input-midi-cv",
  "stimulus-policy-required"
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(relativePath) {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  return JSON.parse(await readFile(fullPath, "utf8"));
}

function addBlocker(blockers, id, message, evidencePath, observed = null) {
  blockers.push({
    id,
    message,
    evidencePath,
    observed
  });
}

function countBlockedClassifications(byClassification, blockingClassifications) {
  const blocked = {};
  let count = 0;
  for (const classification of blockingClassifications) {
    const value = Number(byClassification?.[classification] || 0);
    if (value > 0) {
      blocked[classification] = value;
      count += value;
    }
  }
  return { count, blocked };
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const startedAt = nowIso();
  const blockers = [];
  const fileChecks = {};

  for (const [id, relativePath] of Object.entries(REQUIRED_FILES)) {
    const fullPath = resolve(PROJECT_ROOT, relativePath);
    const exists = existsSync(fullPath);
    fileChecks[id] = { path: fullPath, exists };
    if (!exists) addBlocker(blockers, `missing-${id}`, `Required 0.4 artifact is missing: ${relativePath}`, fullPath);
  }

  let ci = null;
  let stagedAudio = null;
  let testPatchStimulus = null;
  let stagedTrace = null;
  let communityTrace = null;
  let communityAudio = null;
  let communityStimulusResult = null;
  let communityModalityRollup = null;
  let generatedPatchReadiness = null;
  let readinessNegativeControls = null;
  let releaseReviewFreshnessNegativeControls = null;
  let releaseReviewCleanConsumerSmokeNegativeControls = null;
  let releaseReviewDocumentedEvidenceNegativeControls = null;
  let releaseReviewSummaryQualityNegativeControls = null;
  let releaseReviewOverclaimNegativeControls = null;
  let releaseReviewPackageBoundaryOverclaimNegativeControls = null;
  let releaseReviewPublicationProtectionNegativeControls = null;
  let cleanConsumerSmoke = null;
  let releaseReviewSummary = null;

  if (fileChecks.ci.exists) ci = await readJson(REQUIRED_FILES.ci);
  if (fileChecks.stagedAudio.exists) stagedAudio = await readJson(REQUIRED_FILES.stagedAudio);
  if (fileChecks.testPatchStimulus.exists) testPatchStimulus = await readJson(REQUIRED_FILES.testPatchStimulus);
  if (fileChecks.stagedTrace.exists) stagedTrace = await readJson(REQUIRED_FILES.stagedTrace);
  if (fileChecks.communityTrace.exists) communityTrace = await readJson(REQUIRED_FILES.communityTrace);
  if (fileChecks.communityAudio.exists) communityAudio = await readJson(REQUIRED_FILES.communityAudio);
  if (fileChecks.communityStimulus.exists) communityStimulusResult = await readJson(REQUIRED_FILES.communityStimulus);
  if (fileChecks.communityModalityRollup.exists) communityModalityRollup = await readJson(REQUIRED_FILES.communityModalityRollup);
  if (fileChecks.generatedPatchReadiness.exists) generatedPatchReadiness = await readJson(REQUIRED_FILES.generatedPatchReadiness);
  if (fileChecks.readinessNegativeControls.exists) readinessNegativeControls = await readJson(REQUIRED_FILES.readinessNegativeControls);
  if (fileChecks.releaseReviewFreshnessNegativeControls.exists) releaseReviewFreshnessNegativeControls = await readJson(REQUIRED_FILES.releaseReviewFreshnessNegativeControls);
  if (fileChecks.releaseReviewCleanConsumerSmokeNegativeControls.exists) releaseReviewCleanConsumerSmokeNegativeControls = await readJson(REQUIRED_FILES.releaseReviewCleanConsumerSmokeNegativeControls);
  if (fileChecks.releaseReviewDocumentedEvidenceNegativeControls.exists) releaseReviewDocumentedEvidenceNegativeControls = await readJson(REQUIRED_FILES.releaseReviewDocumentedEvidenceNegativeControls);
  if (fileChecks.releaseReviewSummaryQualityNegativeControls.exists) releaseReviewSummaryQualityNegativeControls = await readJson(REQUIRED_FILES.releaseReviewSummaryQualityNegativeControls);
  if (fileChecks.releaseReviewOverclaimNegativeControls.exists) releaseReviewOverclaimNegativeControls = await readJson(REQUIRED_FILES.releaseReviewOverclaimNegativeControls);
  if (fileChecks.releaseReviewPackageBoundaryOverclaimNegativeControls.exists) releaseReviewPackageBoundaryOverclaimNegativeControls = await readJson(REQUIRED_FILES.releaseReviewPackageBoundaryOverclaimNegativeControls);
  if (fileChecks.releaseReviewPublicationProtectionNegativeControls.exists) releaseReviewPublicationProtectionNegativeControls = await readJson(REQUIRED_FILES.releaseReviewPublicationProtectionNegativeControls);
  if (fileChecks.cleanConsumerSmoke?.exists) cleanConsumerSmoke = await readJson(REQUIRED_FILES.cleanConsumerSmoke);
  if (fileChecks.releaseReviewSummary?.exists) releaseReviewSummary = await readJson(REQUIRED_FILES.releaseReviewSummary);

  if (ci && (ci.status !== "pass" || ci.failCount !== 0)) {
    addBlocker(blockers, "ci-gate-failed", "Clone-safe CI gate is not passing.", fileChecks.ci.path, { status: ci.status, failCount: ci.failCount });
  }

  if (stagedAudio) {
    if (stagedAudio.status !== "pass" || stagedAudio.failCount !== 0 || stagedAudio.fixtureCount !== 88) {
      addBlocker(blockers, "staged-audio-hard-failure", "Committed test patch staged audio gate is not clean.", fileChecks.stagedAudio.path, {
        status: stagedAudio.status,
        fixtureCount: stagedAudio.fixtureCount,
        failCount: stagedAudio.failCount
      });
    }
    const stagedStimulus = countBlockedClassifications(stagedAudio.byClassification, TEST_PATCH_BLOCKING_CLASSIFICATIONS);
    if (stagedStimulus.count > 0) {
      if (!testPatchStimulus || testPatchStimulus.status !== "pass" || testPatchStimulus.fixtureCount !== stagedStimulus.count || testPatchStimulus.failCount !== 0) {
        addBlocker(blockers, "test-patch-stimulus-unproven", "Committed test patches still require deterministic MIDI/CV/external stimulus proof.", fileChecks.testPatchStimulus.path, {
          stagedAudioClassification: stagedStimulus,
          stimulusGate: testPatchStimulus ? {
            status: testPatchStimulus.status,
            fixtureCount: testPatchStimulus.fixtureCount,
            passCount: testPatchStimulus.passCount,
            failCount: testPatchStimulus.failCount,
            byClassification: testPatchStimulus.byClassification
          } : null
        });
      }
    }
  }

  if (stagedTrace && (stagedTrace.status !== "pass" || stagedTrace.failCount !== 0 || stagedTrace.patchCount !== 88)) {
    addBlocker(blockers, "staged-trace-failed", "Committed test patch trace gate is not passing.", fileChecks.stagedTrace.path, {
      status: stagedTrace.status,
      patchCount: stagedTrace.patchCount,
      failCount: stagedTrace.failCount
    });
  }

  if (communityTrace) {
    if (communityTrace.status !== "pass" || communityTrace.failCount !== 0 || communityTrace.patchCount !== 1884) {
      addBlocker(blockers, "community-trace-failed", "Community patch trace gate is not clean.", fileChecks.communityTrace.path, {
        status: communityTrace.status,
        patchCount: communityTrace.patchCount,
        failCount: communityTrace.failCount
      });
    }
  }

  if (communityAudio) {
    if (communityAudio.status !== "pass" || communityAudio.failCount !== 0 || communityAudio.fixtureCount !== 1884) {
      addBlocker(blockers, "community-audio-hard-failure", "Community audio classification gate has hard failures.", fileChecks.communityAudio.path, {
        status: communityAudio.status,
        fixtureCount: communityAudio.fixtureCount,
        failCount: communityAudio.failCount
      });
    }
    const communityStimulus = countBlockedClassifications(communityAudio.byClassification, COMMUNITY_BLOCKING_CLASSIFICATIONS);
    if (communityStimulus.count > 0) {
      if (!communityStimulusResult || communityStimulusResult.status !== "pass" || communityStimulusResult.failCount !== 0 || communityStimulusResult.fixtureCount !== 1884) {
        addBlocker(blockers, "community-stimulus-unproven", "Community patches still require deterministic MIDI/CV/control/stimulus proof or source-data remediation.", fileChecks.communityStimulus.path, {
          baselineBlocked: communityStimulus,
          stimulusGate: communityStimulusResult ? {
            status: communityStimulusResult.status,
            fixtureCount: communityStimulusResult.fixtureCount,
            passCount: communityStimulusResult.passCount,
            classifiedCount: communityStimulusResult.classifiedCount,
            failCount: communityStimulusResult.failCount,
            byClassification: communityStimulusResult.byClassification
          } : null
        });
      } else {
        const remainingStimulus = countBlockedClassifications(communityStimulusResult.byClassification, COMMUNITY_BLOCKING_CLASSIFICATIONS);
        if (remainingStimulus.count > 0) {
          addBlocker(blockers, "community-stimulus-classifications-remain", "v0.4 community stimulus gate still contains unproven stimulus classifications.", fileChecks.communityStimulus.path, remainingStimulus);
        }
      }
    }
  }

  if (communityModalityRollup) {
    if (
      communityModalityRollup.status !== "pass" ||
      communityModalityRollup.summary?.sourceBacklogCount !== 514 ||
      communityModalityRollup.summary?.coveredCount !== 514 ||
      communityModalityRollup.summary?.missingPairCount !== 0 ||
      communityModalityRollup.summary?.duplicatePairCount !== 0 ||
      communityModalityRollup.summary?.unexpectedPairCount !== 0 ||
      communityModalityRollup.summary?.problemCount !== 0
    ) {
      addBlocker(blockers, "community-modality-rollup-failed", "Community classified modality rollup does not cover the full v0.4 backlog cleanly.", fileChecks.communityModalityRollup.path, {
        status: communityModalityRollup.status,
        summary: communityModalityRollup.summary,
        validation: communityModalityRollup.validation
      });
    }
  }

  if (generatedPatchReadiness) {
    if (
      generatedPatchReadiness.status !== "pass" ||
      generatedPatchReadiness.summary?.blockerCount !== 0 ||
      generatedPatchReadiness.summary?.selection?.candidateCount < 1 ||
      generatedPatchReadiness.summary?.drafts?.draftCount < 1 ||
      generatedPatchReadiness.summary?.validation?.candidateCount < 1 ||
      generatedPatchReadiness.summary?.validation?.passingCandidateCount !== generatedPatchReadiness.summary?.validation?.candidateCount ||
      !Number.isInteger(generatedPatchReadiness.summary?.promptSmoke?.requiredCorePromptCount) ||
      generatedPatchReadiness.summary?.promptSmoke?.requiredCorePromptCount < 1 ||
      !Number.isInteger(generatedPatchReadiness.summary?.promptSmoke?.concreteCoreTypeCount) ||
      generatedPatchReadiness.summary?.promptSmoke?.concreteCoreTypeCount < 1 ||
      !Number.isInteger(generatedPatchReadiness.summary?.promptSmoke?.unresolvedAbstractionCount) ||
      !Number.isInteger(generatedPatchReadiness.summary?.candidateReview?.unresolvedAbstractionCount) ||
      !Number.isInteger(generatedPatchReadiness.summary?.candidateReview?.sourceGraphFamilyMismatchCount) ||
      generatedPatchReadiness.summary?.candidateReview?.sourceGraphFamilyMismatchCount !== 0 ||
      !Number.isInteger(generatedPatchReadiness.summary?.candidateReview?.sourceGraphRoleMismatchCount) ||
      generatedPatchReadiness.summary?.candidateReview?.sourceGraphRoleMismatchCount !== 0 ||
      !Number.isInteger(generatedPatchReadiness.summary?.candidateReview?.traceGraphCoverageIncompleteCount) ||
      generatedPatchReadiness.summary?.candidateReview?.traceGraphCoverageIncompleteCount !== 0 ||
      generatedPatchReadiness.summary?.runtimeAudioNegativeControls?.status !== "pass" ||
      generatedPatchReadiness.summary?.runtimeAudioNegativeControls?.controlCount !== 5 ||
      generatedPatchReadiness.summary?.runtimeAudioNegativeControls?.passingControlCount !== 5 ||
      generatedPatchReadiness.summary?.runtimeAudioNegativeControls?.seededFailureCount !== 5 ||
      generatedPatchReadiness.summary?.runtimeAudioNegativeControls?.expectedFailureFoundCount !== 5 ||
      generatedPatchReadiness.summary?.runtimeAudioNegativeControls?.blockerCount !== 0 ||
      generatedPatchReadiness.summary?.negativeGuard?.status !== "fail"
    ) {
      addBlocker(blockers, "generated-patch-readiness-failed", "Generated-patch selection, draft, validation, prompt-smoke concrete-core evidence, candidate-review source-to-graph family and module-role comparison, trace-to-graph coverage, abstraction disclosure, runtime-audio negative controls, and guard rollup is not clean.", fileChecks.generatedPatchReadiness.path, {
        status: generatedPatchReadiness.status,
        summary: generatedPatchReadiness.summary,
        blockers: generatedPatchReadiness.blockers
      });
    }
  }

  if (readinessNegativeControls) {
    if (
      readinessNegativeControls.status !== "pass" ||
      readinessNegativeControls.summary?.problemCount !== 0 ||
      readinessNegativeControls.summary?.caseCount !== 13 ||
      readinessNegativeControls.summary?.passingCaseCount !== 13 ||
      readinessNegativeControls.summary?.commandExitCode === 0 ||
      readinessNegativeControls.summary?.blockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedBlockerFound !== true ||
      readinessNegativeControls.summary?.abstractionDisclosureCommandExitCode === 0 ||
      readinessNegativeControls.summary?.abstractionDisclosureBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedAbstractionDisclosureBlockerFound !== true ||
      readinessNegativeControls.summary?.runtimeAudioDependencyCommandExitCode === 0 ||
      readinessNegativeControls.summary?.runtimeAudioDependencyBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedRuntimeAudioDependencyBlockerFound !== true ||
      readinessNegativeControls.summary?.releaseReviewCommandExitCode === 0 ||
      readinessNegativeControls.summary?.releaseReviewBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedReleaseReviewBlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokeCommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokeBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokeBlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokeMissingRegenerationBlockerCommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokeMissingRegenerationBlockerBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingRegenerationBlockerFound !== true ||
      readinessNegativeControls.summary?.missingCleanConsumerSmokeCommandExitCode === 0 ||
      readinessNegativeControls.summary?.missingCleanConsumerSmokeBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedMissingCleanConsumerSmokeBlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokeSourceTreeImportCommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokeSourceTreeImportBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokeSourceTreeImportBlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokePackageManifestCommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokePackageManifestBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokePackageManifestBlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokePackageBoundaryExportCommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokePackageBoundaryExportBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokePackageBoundaryExportBlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledV04CommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledV04BlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingInstalledV04BlockerFound !== true ||
      readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledClaimBoundaryCommandExitCode === 0 ||
      readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedV04Status !== "blocked" ||
      readinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlockerFound !== true ||
      readinessNegativeControls.summary?.expectedReleaseReviewPublicationProtectionBlockerFound !== true
    ) {
      addBlocker(blockers, "v04-readiness-negative-controls-failed", "v0.4 readiness negative controls did not prove degraded generated-patch or release-review evidence blocks release readiness.", fileChecks.readinessNegativeControls.path, {
        status: readinessNegativeControls.status,
        summary: readinessNegativeControls.summary,
        problems: readinessNegativeControls.problems
      });
    }
  }

  if (releaseReviewFreshnessNegativeControls) {
    if (
      releaseReviewFreshnessNegativeControls.status !== "pass" ||
      releaseReviewFreshnessNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewFreshnessNegativeControls.summary?.caseCount !== 3 ||
      releaseReviewFreshnessNegativeControls.summary?.passingCaseCount !== 3 ||
      releaseReviewFreshnessNegativeControls.summary?.releaseReviewCommandExitCode === 0 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedReleaseReviewStatus !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.candidateReviewStaleBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.v04CommandExitCode === 0 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedV04Status !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.v04ReleaseReviewBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.validationReleaseReviewCommandExitCode === 0 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedValidationReleaseReviewStatus !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.generatedValidationStaleBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.validationV04CommandExitCode === 0 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedValidationV04Status !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.validationV04ReleaseReviewBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.cleanSmokeReleaseReviewCommandExitCode === 0 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedCleanSmokeReleaseReviewStatus !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.cleanConsumerSmokeStaleBlockerFound !== true ||
      releaseReviewFreshnessNegativeControls.summary?.cleanSmokeV04CommandExitCode === 0 ||
      releaseReviewFreshnessNegativeControls.summary?.blockedCleanSmokeV04Status !== "blocked" ||
      releaseReviewFreshnessNegativeControls.summary?.cleanSmokeV04ReleaseReviewBlockerFound !== true
    ) {
      addBlocker(blockers, "release-review-freshness-negative-controls-failed", "Release-review freshness negative controls did not prove stale candidate-review, generated validation, and clean consumer smoke evidence block release-review summary and v0.4 readiness.", fileChecks.releaseReviewFreshnessNegativeControls.path, {
        status: releaseReviewFreshnessNegativeControls.status,
        summary: releaseReviewFreshnessNegativeControls.summary,
        problems: releaseReviewFreshnessNegativeControls.problems
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
      addBlocker(blockers, "release-review-clean-consumer-smoke-negative-controls-failed", "Release-review clean consumer smoke negative controls did not prove missing and stale clean-smoke evidence block release-review summary directly.", fileChecks.releaseReviewCleanConsumerSmokeNegativeControls.path, {
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
      releaseReviewDocumentedEvidenceNegativeControls.summary?.releaseReviewCommandExitCode === 0 ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.blockedReleaseReviewStatus !== "blocked" ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.documentedEvidenceMissingBlockerFound !== true ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.v04CommandExitCode === 0 ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.blockedV04Status !== "blocked" ||
      releaseReviewDocumentedEvidenceNegativeControls.summary?.v04ReleaseReviewBlockerFound !== true
    ) {
      addBlocker(blockers, "release-review-documented-evidence-negative-controls-failed", "Release-review documented-evidence negative controls did not prove missing documented evidence paths block release-review summary and v0.4 readiness.", fileChecks.releaseReviewDocumentedEvidenceNegativeControls.path, {
        status: releaseReviewDocumentedEvidenceNegativeControls.status,
        summary: releaseReviewDocumentedEvidenceNegativeControls.summary,
        problems: releaseReviewDocumentedEvidenceNegativeControls.problems
      });
    }
  }

  if (releaseReviewSummaryQualityNegativeControls) {
    if (
      releaseReviewSummaryQualityNegativeControls.status !== "pass" ||
      releaseReviewSummaryQualityNegativeControls.summary?.problemCount !== 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.caseCount !== 22 ||
      releaseReviewSummaryQualityNegativeControls.summary?.passingCaseCount !== 22 ||
      releaseReviewSummaryQualityNegativeControls.summary?.releaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.summaryQualityBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.v04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.v04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.contractReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedContractReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedContractEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.contractV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedContractV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.contractV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateModulePortReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateModulePortReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedDuplicateModulePortEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateModulePortV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateModulePortV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateModulePortV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramRangeReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamRangeReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedParamRangeEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramRangeV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamRangeV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramRangeV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramNormalizationReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamNormalizationReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedParamNormalizationEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramNormalizationV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedParamNormalizationV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.paramNormalizationV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.portKindReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedPortKindReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedPortKindEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.portKindV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedPortKindV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.portKindV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedConnectionGainNormalizationEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainRangeReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainRangeReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedConnectionGainRangeEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainRangeV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedConnectionGainRangeV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.connectionGainRangeV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateConnectionReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateConnectionReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedDuplicateConnectionEndpointEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateConnectionV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedDuplicateConnectionV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.duplicateConnectionV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.selfRouteReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedSelfRouteReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedSelfRouteEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.selfRouteV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedSelfRouteV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.selfRouteV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.modulationRouteReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModulationRouteReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedModulationRouteEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.modulationRouteV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModulationRouteV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.modulationRouteV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceCoverageReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceCoverageReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceGraphCoverageEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceCoverageV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceCoverageV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceCoverageV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedRequirementReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedBlockedRequirementReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedBlockedRequirementEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedRequirementV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedBlockedRequirementV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedRequirementV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceModalityReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceModalityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceModalityCoverageEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceModalityV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceModalityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceModalityV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioRouteReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioRouteReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioRouteBypassEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioRouteV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioRouteV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioRouteV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioCycleReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioCycleReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioCycleEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioCycleV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioCycleV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioCycleV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.graphComplexityReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedGraphComplexityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedGraphComplexityEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.graphComplexityV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedGraphComplexityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.graphComplexityV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceVerificationMethodReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceVerificationMethodReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceVerificationMethodEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceVerificationMethodV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedTraceVerificationMethodV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.traceVerificationMethodV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioProcessorOrphanReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioProcessorOrphanReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioProcessorOrphanEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioProcessorOrphanV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioProcessorOrphanV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioProcessorOrphanV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.moduleOrphanReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModuleOrphanReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedModuleOrphanEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.moduleOrphanV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedModuleOrphanV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.moduleOrphanV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.undeclaredModalityReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedUndeclaredModalityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedUndeclaredModalityEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.undeclaredModalityV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedUndeclaredModalityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.undeclaredModalityV04ReleaseReviewBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioModalityReleaseReviewCommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioModalityReleaseReviewStatus !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioModalityEvidenceBlockerFound !== true ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioModalityV04CommandExitCode === 0 ||
      releaseReviewSummaryQualityNegativeControls.summary?.blockedAudioModalityV04Status !== "blocked" ||
      releaseReviewSummaryQualityNegativeControls.summary?.audioModalityV04ReleaseReviewBlockerFound !== true
    ) {
      addBlocker(blockers, "release-review-summary-quality-negative-controls-failed", "Release-review summary-quality negative controls did not prove degraded reviewer-summary quality blocks release-review summary and v0.4 readiness.", fileChecks.releaseReviewSummaryQualityNegativeControls.path, {
        status: releaseReviewSummaryQualityNegativeControls.status,
        summary: releaseReviewSummaryQualityNegativeControls.summary,
        problems: releaseReviewSummaryQualityNegativeControls.problems
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
      addBlocker(blockers, "release-review-overclaim-negative-controls-failed", "Release-review overclaim negative controls did not prove human-facing overclaim text is rejected.", fileChecks.releaseReviewOverclaimNegativeControls.path, {
        status: releaseReviewOverclaimNegativeControls.status,
        summary: releaseReviewOverclaimNegativeControls.summary,
        problems: releaseReviewOverclaimNegativeControls.problems
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
      addBlocker(blockers, "release-review-package-boundary-overclaim-negative-controls-failed", "Release-review package-boundary overclaim negative controls did not prove package publication overclaim text is rejected.", fileChecks.releaseReviewPackageBoundaryOverclaimNegativeControls.path, {
        status: releaseReviewPackageBoundaryOverclaimNegativeControls.status,
        summary: releaseReviewPackageBoundaryOverclaimNegativeControls.summary,
        problems: releaseReviewPackageBoundaryOverclaimNegativeControls.problems
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
      addBlocker(blockers, "release-review-publication-protection-negative-controls-failed", "Release-review publication-protection negative controls did not prove protected Git, GitHub, tag, release, and npm publication commands are blocked.", fileChecks.releaseReviewPublicationProtectionNegativeControls.path, {
        status: releaseReviewPublicationProtectionNegativeControls.status,
        summary: releaseReviewPublicationProtectionNegativeControls.summary,
        problems: releaseReviewPublicationProtectionNegativeControls.problems
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
      cleanConsumerSmoke.summary?.copiedJsonEvidenceCount < 32 ||
      cleanConsumerSmoke.summary?.copiedEvidenceNegativeControlCount !== 4 ||
      cleanConsumerSmoke.summary?.copiedEvidencePassingNegativeControlCount !== 4 ||
      cleanConsumerSmoke.summary?.v04ReadinessStatus !== "pass" ||
      cleanConsumerSmoke.summary?.v04ReadinessBlockerCount !== 0 ||
      cleanConsumerSmoke.summary?.v04ReadinessCleanConsumerBootstrap !== true ||
      cleanConsumerSmoke.summary?.v04ReadinessReleaseReviewSummarySkippedForBootstrap !== true ||
      cleanConsumerSmoke.summary?.v04ReadinessCleanConsumerSmokeSkippedForBootstrap !== true ||
      cleanConsumerSmoke.summary?.claimBoundaryStatus !== "pass" ||
      cleanConsumerSmoke.summary?.claimBoundaryProblemCount !== 0 ||
      cleanConsumerSmoke.summary?.sourceTreeImportsUsedByInstalledCommands !== false ||
      cleanConsumerSmoke.summary?.installedCommandAuditCount !== 5 ||
      cleanConsumerSmoke.summary?.installedCommandSourceTreeFindingCount !== 0 ||
      cleanConsumerSmoke.summary?.missingGeneratedEvidenceExitCode === 0 ||
      cleanConsumerSmoke.summary?.missingGeneratedEvidenceBlockedStatus !== "blocked" ||
      cleanConsumerSmoke.summary?.staleReleaseReviewExitCode === 0 ||
      cleanConsumerSmoke.summary?.staleReleaseReviewBlockedStatus !== "blocked" ||
      cleanConsumerSmoke.summary?.missingInstalledReadinessScriptExitCode === 0 ||
      cleanConsumerSmoke.summary?.missingInstalledReadinessScriptBlocked !== true ||
      cleanConsumerSmoke.summary?.missingInstalledCapabilityDocExitCode === 0 ||
      cleanConsumerSmoke.summary?.missingInstalledCapabilityDocBlockedStatus !== "fail" ||
      cleanConsumerSmoke.summary?.releaseReviewRegenerationProbeExitCode === 0 ||
      cleanConsumerSmoke.summary?.releaseReviewRegenerationGitWorktreeBlockerFound !== true ||
      cleanConsumerSmoke.summary?.claimBoundaryCleanConsumerBootstrap !== true ||
      cleanConsumerSmoke.summary?.claimBoundaryCleanConsumerSmokeSkippedForBootstrap !== true
    ) {
      addBlocker(blockers, "clean-consumer-smoke-failed", "Clean consumer smoke did not prove installed-package v0.4/generated-patch gates and missing/stale evidence blockers.", fileChecks.cleanConsumerSmoke.path, {
        status: cleanConsumerSmoke.status,
        summary: cleanConsumerSmoke.summary,
        problems: cleanConsumerSmoke.problems
      });
    }
  }

  if (releaseReviewSummary) {
    const protectedActionBoundary = (releaseReviewSummary.protectedActionBlockers || [])
      .some((blocker) => blocker.status === "blocked-unless-exact-human-passcode-is-provided");
    const v04CommandListed = (releaseReviewSummary.validationCommands || [])
      .includes("npm run zoia:verify:v04");
    const generatedReadinessEvidence = (releaseReviewSummary.evidence || [])
      .find((item) => item.id === "generatedPatchReadiness");

    if (
      releaseReviewSummary.status !== "pass" ||
      releaseReviewSummary.version !== "0.4.0" ||
      releaseReviewSummary.git?.sourceControlSideEffectsPerformed !== false ||
      !protectedActionBoundary ||
      !v04CommandListed ||
      generatedReadinessEvidence?.status !== "pass"
    ) {
      addBlocker(blockers, "release-review-summary-failed", "Release-review summary is missing, stale, degraded, or does not preserve protected action boundaries.", fileChecks.releaseReviewSummary.path, {
        status: releaseReviewSummary.status,
        version: releaseReviewSummary.version,
        sourceControlSideEffectsPerformed: releaseReviewSummary.git?.sourceControlSideEffectsPerformed ?? null,
        protectedActionBoundary,
        v04CommandListed,
        generatedReadinessEvidence
      });
    }
  }

  const result = {
    schemaVersion: "zoia.v04-readiness-result.v1",
    version: "0.4.0",
    revision: 3,
    status: blockers.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    evidenceRoot: EVIDENCE_ROOT,
    fileChecks,
    summary: {
      blockerCount: blockers.length,
      ciStatus: ci?.status || null,
      stagedAudio: stagedAudio ? {
        fixtureCount: stagedAudio.fixtureCount,
        passCount: stagedAudio.passCount,
        classifiedCount: stagedAudio.classifiedCount,
        failCount: stagedAudio.failCount,
        byClassification: stagedAudio.byClassification
      } : null,
      stagedTrace: stagedTrace ? {
        patchCount: stagedTrace.patchCount,
        passCount: stagedTrace.passCount,
        failCount: stagedTrace.failCount
      } : null,
      testPatchStimulus: testPatchStimulus ? {
        fixtureCount: testPatchStimulus.fixtureCount,
        passCount: testPatchStimulus.passCount,
        classifiedCount: testPatchStimulus.classifiedCount,
        failCount: testPatchStimulus.failCount,
        byClassification: testPatchStimulus.byClassification
      } : null,
      communityTrace: communityTrace ? {
        patchCount: communityTrace.patchCount,
        passCount: communityTrace.passCount,
        classifiedCount: communityTrace.classifiedCount,
        failCount: communityTrace.failCount,
        traceableCount: communityTrace.traceableCount
      } : null,
      communityAudio: communityAudio ? {
        fixtureCount: communityAudio.fixtureCount,
        passCount: communityAudio.passCount,
        classifiedCount: communityAudio.classifiedCount,
        failCount: communityAudio.failCount,
        byClassification: communityAudio.byClassification
      } : null,
      communityStimulus: communityStimulusResult ? {
        fixtureCount: communityStimulusResult.fixtureCount,
        passCount: communityStimulusResult.passCount,
        classifiedCount: communityStimulusResult.classifiedCount,
        failCount: communityStimulusResult.failCount,
        byClassification: communityStimulusResult.byClassification
      } : null,
      communityModalityRollup: communityModalityRollup ? {
        sourceBacklogCount: communityModalityRollup.summary?.sourceBacklogCount ?? null,
        coveredCount: communityModalityRollup.summary?.coveredCount ?? null,
        measuredSignalCount: communityModalityRollup.summary?.measuredSignalCount ?? null,
        staticClassifiedCount: communityModalityRollup.summary?.staticClassifiedCount ?? null,
        problemCount: communityModalityRollup.summary?.problemCount ?? null,
        missingPairCount: communityModalityRollup.summary?.missingPairCount ?? null,
        duplicatePairCount: communityModalityRollup.summary?.duplicatePairCount ?? null,
        unexpectedPairCount: communityModalityRollup.summary?.unexpectedPairCount ?? null
      } : null,
      generatedPatchReadiness: generatedPatchReadiness ? {
        status: generatedPatchReadiness.status,
        blockerCount: generatedPatchReadiness.summary?.blockerCount ?? null,
        selectionCandidateCount: generatedPatchReadiness.summary?.selection?.candidateCount ?? null,
        draftCount: generatedPatchReadiness.summary?.drafts?.draftCount ?? null,
        validatedDraftCount: generatedPatchReadiness.summary?.validation?.passingCandidateCount ?? null,
        promptSmokeRequiredCorePromptCount: generatedPatchReadiness.summary?.promptSmoke?.requiredCorePromptCount ?? null,
        promptSmokeConcreteCoreTypeCount: generatedPatchReadiness.summary?.promptSmoke?.concreteCoreTypeCount ?? null,
        promptSmokeUnresolvedAbstractionCount: generatedPatchReadiness.summary?.promptSmoke?.unresolvedAbstractionCount ?? null,
        unresolvedAbstractionCount: generatedPatchReadiness.summary?.candidateReview?.unresolvedAbstractionCount ?? null,
        sourceGraphFamilyMismatchCount: generatedPatchReadiness.summary?.candidateReview?.sourceGraphFamilyMismatchCount ?? null,
        sourceGraphRoleMismatchCount: generatedPatchReadiness.summary?.candidateReview?.sourceGraphRoleMismatchCount ?? null,
        traceGraphCoverageIncompleteCount: generatedPatchReadiness.summary?.candidateReview?.traceGraphCoverageIncompleteCount ?? null,
        runtimeAudioNegativeControls: generatedPatchReadiness.summary?.runtimeAudioNegativeControls ?? null,
        negativeGuardStatus: generatedPatchReadiness.summary?.negativeGuard?.status ?? null
      } : null,
      readinessNegativeControls: readinessNegativeControls ? {
        status: readinessNegativeControls.status,
        problemCount: readinessNegativeControls.summary?.problemCount ?? null,
        caseCount: readinessNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: readinessNegativeControls.summary?.passingCaseCount ?? null,
        commandExitCode: readinessNegativeControls.summary?.commandExitCode ?? null,
        blockedV04Status: readinessNegativeControls.summary?.blockedV04Status ?? null,
        expectedBlockerFound: readinessNegativeControls.summary?.expectedBlockerFound ?? null,
        abstractionDisclosureCommandExitCode: readinessNegativeControls.summary?.abstractionDisclosureCommandExitCode ?? null,
        abstractionDisclosureBlockedV04Status: readinessNegativeControls.summary?.abstractionDisclosureBlockedV04Status ?? null,
        expectedAbstractionDisclosureBlockerFound: readinessNegativeControls.summary?.expectedAbstractionDisclosureBlockerFound ?? null,
        runtimeAudioDependencyCommandExitCode: readinessNegativeControls.summary?.runtimeAudioDependencyCommandExitCode ?? null,
        runtimeAudioDependencyBlockedV04Status: readinessNegativeControls.summary?.runtimeAudioDependencyBlockedV04Status ?? null,
        expectedRuntimeAudioDependencyBlockerFound: readinessNegativeControls.summary?.expectedRuntimeAudioDependencyBlockerFound ?? null,
        releaseReviewCommandExitCode: readinessNegativeControls.summary?.releaseReviewCommandExitCode ?? null,
        releaseReviewBlockedV04Status: readinessNegativeControls.summary?.releaseReviewBlockedV04Status ?? null,
        expectedReleaseReviewBlockerFound: readinessNegativeControls.summary?.expectedReleaseReviewBlockerFound ?? null,
        cleanConsumerSmokeCommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokeCommandExitCode ?? null,
        cleanConsumerSmokeBlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokeBlockedV04Status ?? null,
        expectedCleanConsumerSmokeBlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokeBlockerFound ?? null,
        cleanConsumerSmokeMissingRegenerationBlockerCommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokeMissingRegenerationBlockerCommandExitCode ?? null,
        cleanConsumerSmokeMissingRegenerationBlockerBlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokeMissingRegenerationBlockerBlockedV04Status ?? null,
        expectedCleanConsumerSmokeMissingRegenerationBlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingRegenerationBlockerFound ?? null,
        missingCleanConsumerSmokeCommandExitCode: readinessNegativeControls.summary?.missingCleanConsumerSmokeCommandExitCode ?? null,
        missingCleanConsumerSmokeBlockedV04Status: readinessNegativeControls.summary?.missingCleanConsumerSmokeBlockedV04Status ?? null,
        expectedMissingCleanConsumerSmokeBlockerFound: readinessNegativeControls.summary?.expectedMissingCleanConsumerSmokeBlockerFound ?? null,
        cleanConsumerSmokeSourceTreeImportCommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokeSourceTreeImportCommandExitCode ?? null,
        cleanConsumerSmokeSourceTreeImportBlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokeSourceTreeImportBlockedV04Status ?? null,
        expectedCleanConsumerSmokeSourceTreeImportBlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokeSourceTreeImportBlockerFound ?? null,
        cleanConsumerSmokePackageManifestCommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokePackageManifestCommandExitCode ?? null,
        cleanConsumerSmokePackageManifestBlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokePackageManifestBlockedV04Status ?? null,
        expectedCleanConsumerSmokePackageManifestBlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokePackageManifestBlockerFound ?? null,
        cleanConsumerSmokePackageBoundaryExportCommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokePackageBoundaryExportCommandExitCode ?? null,
        cleanConsumerSmokePackageBoundaryExportBlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokePackageBoundaryExportBlockedV04Status ?? null,
        expectedCleanConsumerSmokePackageBoundaryExportBlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokePackageBoundaryExportBlockerFound ?? null,
        cleanConsumerSmokeMissingInstalledV04CommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledV04CommandExitCode ?? null,
        cleanConsumerSmokeMissingInstalledV04BlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledV04BlockedV04Status ?? null,
        expectedCleanConsumerSmokeMissingInstalledV04BlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingInstalledV04BlockerFound ?? null,
        cleanConsumerSmokeMissingInstalledClaimBoundaryCommandExitCode: readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledClaimBoundaryCommandExitCode ?? null,
        cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedV04Status: readinessNegativeControls.summary?.cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedV04Status ?? null,
        expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlockerFound: readinessNegativeControls.summary?.expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlockerFound ?? null,
        releaseReviewPublicationProtectionCommandExitCode: readinessNegativeControls.summary?.releaseReviewPublicationProtectionCommandExitCode ?? null,
        releaseReviewPublicationProtectionBlockedV04Status: readinessNegativeControls.summary?.releaseReviewPublicationProtectionBlockedV04Status ?? null,
        expectedReleaseReviewPublicationProtectionBlockerFound: readinessNegativeControls.summary?.expectedReleaseReviewPublicationProtectionBlockerFound ?? null
      } : null,
      releaseReviewFreshnessNegativeControls: releaseReviewFreshnessNegativeControls ? {
        status: releaseReviewFreshnessNegativeControls.status,
        problemCount: releaseReviewFreshnessNegativeControls.summary?.problemCount ?? null,
        caseCount: releaseReviewFreshnessNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: releaseReviewFreshnessNegativeControls.summary?.passingCaseCount ?? null,
        candidateReviewStaleBlockerFound: releaseReviewFreshnessNegativeControls.summary?.candidateReviewStaleBlockerFound ?? null,
        v04ReleaseReviewBlockerFound: releaseReviewFreshnessNegativeControls.summary?.v04ReleaseReviewBlockerFound ?? null,
        generatedValidationStaleBlockerFound: releaseReviewFreshnessNegativeControls.summary?.generatedValidationStaleBlockerFound ?? null,
        validationV04ReleaseReviewBlockerFound: releaseReviewFreshnessNegativeControls.summary?.validationV04ReleaseReviewBlockerFound ?? null
      } : null,
      releaseReviewCleanConsumerSmokeNegativeControls: releaseReviewCleanConsumerSmokeNegativeControls ? {
        status: releaseReviewCleanConsumerSmokeNegativeControls.status,
        problemCount: releaseReviewCleanConsumerSmokeNegativeControls.summary?.problemCount ?? null,
        caseCount: releaseReviewCleanConsumerSmokeNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: releaseReviewCleanConsumerSmokeNegativeControls.summary?.passingCaseCount ?? null,
        missingCleanConsumerSmokeEvidenceBlockerFound: releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingCleanConsumerSmokeEvidenceBlockerFound ?? null,
        missingCleanConsumerSmokeQualityBlockerFound: releaseReviewCleanConsumerSmokeNegativeControls.summary?.missingCleanConsumerSmokeQualityBlockerFound ?? null,
        staleCleanConsumerSmokeEvidenceBlockerFound: releaseReviewCleanConsumerSmokeNegativeControls.summary?.staleCleanConsumerSmokeEvidenceBlockerFound ?? null
      } : null,
      releaseReviewDocumentedEvidenceNegativeControls: releaseReviewDocumentedEvidenceNegativeControls ? {
        status: releaseReviewDocumentedEvidenceNegativeControls.status,
        problemCount: releaseReviewDocumentedEvidenceNegativeControls.summary?.problemCount ?? null,
        caseCount: releaseReviewDocumentedEvidenceNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: releaseReviewDocumentedEvidenceNegativeControls.summary?.passingCaseCount ?? null,
        documentedEvidenceMissingBlockerFound: releaseReviewDocumentedEvidenceNegativeControls.summary?.documentedEvidenceMissingBlockerFound ?? null,
        v04ReleaseReviewBlockerFound: releaseReviewDocumentedEvidenceNegativeControls.summary?.v04ReleaseReviewBlockerFound ?? null
      } : null,
      releaseReviewSummaryQualityNegativeControls: releaseReviewSummaryQualityNegativeControls ? {
        status: releaseReviewSummaryQualityNegativeControls.status,
        problemCount: releaseReviewSummaryQualityNegativeControls.summary?.problemCount ?? null,
        caseCount: releaseReviewSummaryQualityNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: releaseReviewSummaryQualityNegativeControls.summary?.passingCaseCount ?? null,
        summaryQualityBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.summaryQualityBlockerFound ?? null,
        v04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.v04ReleaseReviewBlockerFound ?? null,
        generatedContractEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedContractEvidenceBlockerFound ?? null,
        contractV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.contractV04ReleaseReviewBlockerFound ?? null,
        generatedDuplicateModulePortEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedDuplicateModulePortEvidenceBlockerFound ?? null,
        duplicateModulePortV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.duplicateModulePortV04ReleaseReviewBlockerFound ?? null,
        generatedParamRangeEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedParamRangeEvidenceBlockerFound ?? null,
        paramRangeV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.paramRangeV04ReleaseReviewBlockerFound ?? null,
        generatedParamNormalizationEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedParamNormalizationEvidenceBlockerFound ?? null,
        paramNormalizationV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.paramNormalizationV04ReleaseReviewBlockerFound ?? null,
        generatedPortKindEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedPortKindEvidenceBlockerFound ?? null,
        portKindV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.portKindV04ReleaseReviewBlockerFound ?? null,
        generatedConnectionGainNormalizationEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedConnectionGainNormalizationEvidenceBlockerFound ?? null,
        connectionGainV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.connectionGainV04ReleaseReviewBlockerFound ?? null,
        generatedConnectionGainRangeEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedConnectionGainRangeEvidenceBlockerFound ?? null,
        connectionGainRangeV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.connectionGainRangeV04ReleaseReviewBlockerFound ?? null,
        generatedDuplicateConnectionEndpointEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedDuplicateConnectionEndpointEvidenceBlockerFound ?? null,
        duplicateConnectionV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.duplicateConnectionV04ReleaseReviewBlockerFound ?? null,
        generatedSelfRouteEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedSelfRouteEvidenceBlockerFound ?? null,
        selfRouteV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.selfRouteV04ReleaseReviewBlockerFound ?? null,
        generatedModulationRouteEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedModulationRouteEvidenceBlockerFound ?? null,
        modulationRouteV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.modulationRouteV04ReleaseReviewBlockerFound ?? null,
        generatedTraceGraphCoverageEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceGraphCoverageEvidenceBlockerFound ?? null,
        traceCoverageV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.traceCoverageV04ReleaseReviewBlockerFound ?? null,
        generatedBlockedRequirementEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedBlockedRequirementEvidenceBlockerFound ?? null,
        blockedRequirementV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.blockedRequirementV04ReleaseReviewBlockerFound ?? null,
        generatedTraceModalityCoverageEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceModalityCoverageEvidenceBlockerFound ?? null,
        traceModalityV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.traceModalityV04ReleaseReviewBlockerFound ?? null,
        generatedAudioRouteBypassEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioRouteBypassEvidenceBlockerFound ?? null,
        audioRouteV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.audioRouteV04ReleaseReviewBlockerFound ?? null,
        generatedAudioCycleEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioCycleEvidenceBlockerFound ?? null,
        audioCycleV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.audioCycleV04ReleaseReviewBlockerFound ?? null,
        generatedGraphComplexityEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedGraphComplexityEvidenceBlockerFound ?? null,
        graphComplexityV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.graphComplexityV04ReleaseReviewBlockerFound ?? null,
        generatedTraceVerificationMethodEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedTraceVerificationMethodEvidenceBlockerFound ?? null,
        traceVerificationMethodV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.traceVerificationMethodV04ReleaseReviewBlockerFound ?? null,
        generatedAudioProcessorOrphanEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioProcessorOrphanEvidenceBlockerFound ?? null,
        audioProcessorOrphanV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.audioProcessorOrphanV04ReleaseReviewBlockerFound ?? null,
        generatedModuleOrphanEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedModuleOrphanEvidenceBlockerFound ?? null,
        moduleOrphanV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.moduleOrphanV04ReleaseReviewBlockerFound ?? null,
        generatedUndeclaredModalityEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedUndeclaredModalityEvidenceBlockerFound ?? null,
        undeclaredModalityV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.undeclaredModalityV04ReleaseReviewBlockerFound ?? null,
        generatedAudioModalityEvidenceBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.generatedAudioModalityEvidenceBlockerFound ?? null,
        audioModalityV04ReleaseReviewBlockerFound: releaseReviewSummaryQualityNegativeControls.summary?.audioModalityV04ReleaseReviewBlockerFound ?? null
      } : null,
      releaseReviewOverclaimNegativeControls: releaseReviewOverclaimNegativeControls ? {
        status: releaseReviewOverclaimNegativeControls.status,
        problemCount: releaseReviewOverclaimNegativeControls.summary?.problemCount ?? null,
        baselineBoundaryStatus: releaseReviewOverclaimNegativeControls.summary?.baselineBoundaryStatus ?? null,
        caseCount: releaseReviewOverclaimNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: releaseReviewOverclaimNegativeControls.summary?.passingCaseCount ?? null,
        seededFailureCount: releaseReviewOverclaimNegativeControls.summary?.seededFailureCount ?? null,
        expectedFailureFoundCount: releaseReviewOverclaimNegativeControls.summary?.expectedFailureFoundCount ?? null
      } : null,
      releaseReviewPackageBoundaryOverclaimNegativeControls: releaseReviewPackageBoundaryOverclaimNegativeControls ? {
        status: releaseReviewPackageBoundaryOverclaimNegativeControls.status,
        problemCount: releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.problemCount ?? null,
        baselineBoundaryStatus: releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.baselineBoundaryStatus ?? null,
        caseCount: releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.caseCount ?? null,
        passingCaseCount: releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.passingCaseCount ?? null,
        seededFailureCount: releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.seededFailureCount ?? null,
        expectedFailureFoundCount: releaseReviewPackageBoundaryOverclaimNegativeControls.summary?.expectedFailureFoundCount ?? null
      } : null,
      releaseReviewPublicationProtectionNegativeControls: releaseReviewPublicationProtectionNegativeControls ? {
        status: releaseReviewPublicationProtectionNegativeControls.status,
        problemCount: releaseReviewPublicationProtectionNegativeControls.summary?.problemCount ?? null,
        actualCommandCount: releaseReviewPublicationProtectionNegativeControls.summary?.actualCommandCount ?? null,
        protectedActualCommandCount: releaseReviewPublicationProtectionNegativeControls.summary?.protectedActualCommandCount ?? null,
        scriptTextFindingCount: releaseReviewPublicationProtectionNegativeControls.summary?.scriptTextFindingCount ?? null,
        seededControlCount: releaseReviewPublicationProtectionNegativeControls.summary?.seededControlCount ?? null,
        passingSeededControlCount: releaseReviewPublicationProtectionNegativeControls.summary?.passingSeededControlCount ?? null,
        expectedFailureFoundCount: releaseReviewPublicationProtectionNegativeControls.summary?.expectedFailureFoundCount ?? null,
        protectedBoundaryPresent: releaseReviewPublicationProtectionNegativeControls.summary?.protectedBoundaryPresent ?? null,
        sourceControlSideEffectsPerformed: releaseReviewPublicationProtectionNegativeControls.summary?.sourceControlSideEffectsPerformed ?? null
      } : null,
      cleanConsumerBootstrap: CLEAN_CONSUMER_BOOTSTRAP,
      releaseReviewSummarySkippedForCleanConsumerBootstrap: CLEAN_CONSUMER_BOOTSTRAP,
      cleanConsumerSmokeSkippedForCleanConsumerBootstrap: CLEAN_CONSUMER_BOOTSTRAP,
      cleanConsumerSmoke: cleanConsumerSmoke ? {
        status: cleanConsumerSmoke.status,
        problemCount: cleanConsumerSmoke.summary?.problemCount ?? null,
        packageManifestRequiredPathCount: cleanConsumerSmoke.summary?.packageManifestRequiredPathCount ?? null,
        packageManifestMissingPathCount: cleanConsumerSmoke.summary?.packageManifestMissingPathCount ?? null,
        packageManifestNegativeControlCount: cleanConsumerSmoke.summary?.packageManifestNegativeControlCount ?? null,
        packageManifestPassingNegativeControlCount: cleanConsumerSmoke.summary?.packageManifestPassingNegativeControlCount ?? null,
        packageMetadataValid: cleanConsumerSmoke.summary?.packageMetadataValid ?? null,
        packageScriptReferenceCount: cleanConsumerSmoke.summary?.packageScriptReferenceCount ?? null,
        packageScriptMissingReferenceCount: cleanConsumerSmoke.summary?.packageScriptMissingReferenceCount ?? null,
        installedRequiredPathCount: cleanConsumerSmoke.summary?.installedRequiredPathCount ?? null,
        installedMissingPathCount: cleanConsumerSmoke.summary?.installedMissingPathCount ?? null,
        copiedJsonEvidenceCount: cleanConsumerSmoke.summary?.copiedJsonEvidenceCount ?? null,
        copiedEvidenceNegativeControlCount: cleanConsumerSmoke.summary?.copiedEvidenceNegativeControlCount ?? null,
        copiedEvidencePassingNegativeControlCount: cleanConsumerSmoke.summary?.copiedEvidencePassingNegativeControlCount ?? null,
        v04ReadinessStatus: cleanConsumerSmoke.summary?.v04ReadinessStatus ?? null,
        v04ReadinessBlockerCount: cleanConsumerSmoke.summary?.v04ReadinessBlockerCount ?? null,
        v04ReadinessCleanConsumerBootstrap: cleanConsumerSmoke.summary?.v04ReadinessCleanConsumerBootstrap ?? null,
        v04ReadinessReleaseReviewSummarySkippedForBootstrap: cleanConsumerSmoke.summary?.v04ReadinessReleaseReviewSummarySkippedForBootstrap ?? null,
        v04ReadinessCleanConsumerSmokeSkippedForBootstrap: cleanConsumerSmoke.summary?.v04ReadinessCleanConsumerSmokeSkippedForBootstrap ?? null,
        claimBoundaryStatus: cleanConsumerSmoke.summary?.claimBoundaryStatus ?? null,
        claimBoundaryProblemCount: cleanConsumerSmoke.summary?.claimBoundaryProblemCount ?? null,
        claimBoundaryCleanConsumerBootstrap: cleanConsumerSmoke.summary?.claimBoundaryCleanConsumerBootstrap ?? null,
        claimBoundaryCleanConsumerSmokeSkippedForBootstrap: cleanConsumerSmoke.summary?.claimBoundaryCleanConsumerSmokeSkippedForBootstrap ?? null,
        sourceTreeImportsUsedByInstalledCommands: cleanConsumerSmoke.summary?.sourceTreeImportsUsedByInstalledCommands ?? null,
        installedCommandAuditCount: cleanConsumerSmoke.summary?.installedCommandAuditCount ?? null,
        installedCommandSourceTreeFindingCount: cleanConsumerSmoke.summary?.installedCommandSourceTreeFindingCount ?? null,
        missingGeneratedEvidenceBlockedStatus: cleanConsumerSmoke.summary?.missingGeneratedEvidenceBlockedStatus ?? null,
        staleReleaseReviewBlockedStatus: cleanConsumerSmoke.summary?.staleReleaseReviewBlockedStatus ?? null,
        missingInstalledReadinessScriptBlocked: cleanConsumerSmoke.summary?.missingInstalledReadinessScriptBlocked ?? null,
        missingInstalledCapabilityDocBlockedStatus: cleanConsumerSmoke.summary?.missingInstalledCapabilityDocBlockedStatus ?? null
      } : null,
      releaseReviewSummary: releaseReviewSummary ? {
        status: releaseReviewSummary.status,
        evidenceCount: releaseReviewSummary.evidence?.length ?? null,
        sourceControlSideEffectsPerformed: releaseReviewSummary.git?.sourceControlSideEffectsPerformed ?? null,
        protectedActionBlockerCount: releaseReviewSummary.protectedActionBlockers?.length ?? null,
        blockerCount: releaseReviewSummary.blockers?.length ?? null
      } : null
    },
    blockers,
    claimBoundary: "This readiness gate blocks 0.4 until every committed test patch and every available community patch has deterministic evidence for import, UI/rendering, signal-flow, audio/playability where applicable, or an explicit non-emulator/source/provenance classification."
  };

  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.log(RESULT_PATH);
  if (result.status !== "pass") process.exit(1);
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.v04-readiness-result.v1",
    version: "0.4.0",
    revision: 3,
    status: "fail",
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack },
    evidenceRoot: EVIDENCE_ROOT
  };
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
