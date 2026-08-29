#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-readiness-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const DEGRADED_GENERATED_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness.json");
const DEGRADED_GENERATED_ABSTRACTION_DISCLOSURE_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-missing-abstraction-disclosure.json");
const DEGRADED_GENERATED_RUNTIME_AUDIO_DEPENDENCY_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-runtime-audio-dependency.json");
const DEGRADED_RELEASE_REVIEW_SUMMARY_PATH = resolve(EVIDENCE_ROOT, "degraded-release-review-summary.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_REGEN_BLOCKER_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke-missing-regeneration-blocker.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke-source-tree-import.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke-package-manifest.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke-package-boundary-export.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke-missing-installed-v04.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke-missing-installed-claim-boundary.json");
const DEGRADED_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH = resolve(EVIDENCE_ROOT, "degraded-release-review-publication-protection.json");
const MISSING_CLEAN_CONSUMER_SMOKE_PATH = resolve(EVIDENCE_ROOT, "missing-clean-consumer-smoke.json");
const BLOCKED_V04_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness.json");
const BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-missing-abstraction-disclosure.json");
const BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-runtime-audio-dependency.json");
const BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-release-review.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke-missing-regeneration-blocker.json");
const BLOCKED_V04_MISSING_CLEAN_CONSUMER_SMOKE_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-missing-clean-consumer-smoke.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke-source-tree-import.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke-package-manifest.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke-package-boundary-export.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke-missing-installed-v04.json");
const BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-clean-consumer-smoke-missing-installed-claim-boundary.json");
const BLOCKED_V04_RELEASE_REVIEW_PUBLICATION_PROTECTION_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-release-review-publication-protection.json");
const SOURCE_GENERATED_READINESS_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-readiness/run-result.json");
const SOURCE_RELEASE_REVIEW_SUMMARY_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-summary/run-result.json");
const SOURCE_CLEAN_CONSUMER_SMOKE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json");
const SOURCE_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json");
const JSON_SPACES = 2;

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function relativeToProject(path) {
  return resolve(path).slice(PROJECT_ROOT.length + 1);
}

function runReadinessWithOverrides(envOverrides) {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ...envOverrides
    }
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  if (!existsSync(SOURCE_GENERATED_READINESS_PATH)) {
    throw new Error(`Missing source generated readiness evidence: ${SOURCE_GENERATED_READINESS_PATH}`);
  }
  if (!existsSync(SOURCE_RELEASE_REVIEW_SUMMARY_PATH)) {
    throw new Error(`Missing source release-review summary evidence: ${SOURCE_RELEASE_REVIEW_SUMMARY_PATH}`);
  }
  if (!existsSync(SOURCE_CLEAN_CONSUMER_SMOKE_PATH)) {
    throw new Error(`Missing source clean consumer smoke evidence: ${SOURCE_CLEAN_CONSUMER_SMOKE_PATH}`);
  }
  if (!existsSync(SOURCE_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH)) {
    throw new Error(`Missing source release-review publication-protection evidence: ${SOURCE_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH}`);
  }
  const source = await readJson(SOURCE_GENERATED_READINESS_PATH);
  const sourceReleaseReview = await readJson(SOURCE_RELEASE_REVIEW_SUMMARY_PATH);
  const sourceCleanConsumerSmoke = await readJson(SOURCE_CLEAN_CONSUMER_SMOKE_PATH);
  const sourceReleaseReviewPublicationProtection = await readJson(SOURCE_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH);
  const degraded = {
    ...source,
    status: "blocked",
    completedAt: nowIso(),
    summary: {
      ...(source.summary || {}),
      blockerCount: 1,
      validation: {
        ...(source.summary?.validation || {}),
        passingCandidateCount: 0,
        unexpectedPositiveFailureCount: 1
      }
    },
    blockers: [
      {
        id: "negative-control-generated-validation-degraded",
        message: "Negative control degraded generated-patch validation summary.",
        evidencePath: DEGRADED_GENERATED_READINESS_PATH
      }
    ],
    negativeControl: true
  };
  await writeJson(DEGRADED_GENERATED_READINESS_PATH, degraded);
  const degradedAbstractionDisclosure = {
    ...source,
    completedAt: nowIso(),
    summary: {
      ...(source.summary || {}),
      candidateReview: {
        ...(source.summary?.candidateReview || {})
      }
    },
    negativeControl: true
  };
  delete degradedAbstractionDisclosure.summary.candidateReview.unresolvedAbstractionCount;
  await writeJson(DEGRADED_GENERATED_ABSTRACTION_DISCLOSURE_PATH, degradedAbstractionDisclosure);
  const degradedRuntimeAudioDependency = {
    ...source,
    completedAt: nowIso(),
    summary: {
      ...(source.summary || {}),
      runtimeAudioNegativeControls: {
        ...(source.summary?.runtimeAudioNegativeControls || {}),
        status: "fail",
        blockerCount: 1,
        passingControlCount: 4,
        expectedFailureFoundCount: 4
      }
    },
    negativeControl: true
  };
  await writeJson(DEGRADED_GENERATED_RUNTIME_AUDIO_DEPENDENCY_PATH, degradedRuntimeAudioDependency);
  const degradedReleaseReview = {
    ...sourceReleaseReview,
    status: "blocked",
    completedAt: nowIso(),
    git: {
      ...(sourceReleaseReview.git || {}),
      sourceControlSideEffectsPerformed: true
    },
    blockers: [
      {
        id: "negative-control-release-review-protected-boundary-degraded",
        message: "Negative control degraded release-review protected action boundary.",
        evidencePath: DEGRADED_RELEASE_REVIEW_SUMMARY_PATH
      }
    ],
    negativeControl: true
  };
  await writeJson(DEGRADED_RELEASE_REVIEW_SUMMARY_PATH, degradedReleaseReview);
  const degradedCleanConsumerSmoke = {
    ...sourceCleanConsumerSmoke,
    status: "blocked",
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {}),
      problemCount: 1,
      v04ReadinessStatus: "blocked"
    },
    problems: [
      {
        id: "negative-control-clean-consumer-smoke-degraded",
        message: "Negative control degraded clean consumer smoke evidence.",
        evidencePath: DEGRADED_CLEAN_CONSUMER_SMOKE_PATH
      }
    ],
    negativeControl: true
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_PATH, degradedCleanConsumerSmoke);
  const degradedCleanConsumerSmokeMissingRegenBlocker = {
    ...sourceCleanConsumerSmoke,
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {})
    },
    negativeControl: true,
    negativeControlCase: "missing-release-review-regeneration-blocker-evidence"
  };
  delete degradedCleanConsumerSmokeMissingRegenBlocker.summary.releaseReviewRegenerationGitWorktreeBlockerFound;
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_REGEN_BLOCKER_PATH, degradedCleanConsumerSmokeMissingRegenBlocker);
  const degradedCleanConsumerSmokeSourceTreeImport = {
    ...sourceCleanConsumerSmoke,
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {}),
      sourceTreeImportsUsedByInstalledCommands: true
    },
    negativeControl: true,
    negativeControlCase: "source-tree-import-leakage"
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_PATH, degradedCleanConsumerSmokeSourceTreeImport);
  const degradedCleanConsumerSmokePackageManifest = {
    ...sourceCleanConsumerSmoke,
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {}),
      packageManifestMissingPathCount: 1,
      packageManifestPassingNegativeControlCount: 1
    },
    negativeControl: true,
    negativeControlCase: "package-manifest-required-path-missing"
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_PATH, degradedCleanConsumerSmokePackageManifest);
  const degradedCleanConsumerSmokePackageBoundaryExport = {
    ...sourceCleanConsumerSmoke,
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {}),
      packageMetadataValid: false,
      packageScriptMissingReferenceCount: 1,
      copiedEvidencePassingNegativeControlCount: 1
    },
    negativeControl: true,
    negativeControlCase: "package-boundary-export-metadata-script-evidence"
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_PATH, degradedCleanConsumerSmokePackageBoundaryExport);
  const degradedCleanConsumerSmokeMissingInstalledV04 = {
    ...sourceCleanConsumerSmoke,
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {}),
      v04ReadinessStatus: null,
      v04ReadinessBlockerCount: null,
      v04ReadinessCleanConsumerBootstrap: null
    },
    negativeControl: true,
    negativeControlCase: "missing-installed-v04-readiness"
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_PATH, degradedCleanConsumerSmokeMissingInstalledV04);
  const degradedCleanConsumerSmokeMissingInstalledClaimBoundary = {
    ...sourceCleanConsumerSmoke,
    completedAt: nowIso(),
    summary: {
      ...(sourceCleanConsumerSmoke.summary || {}),
      claimBoundaryStatus: null,
      claimBoundaryProblemCount: null,
      claimBoundaryCleanConsumerBootstrap: null
    },
    negativeControl: true,
    negativeControlCase: "missing-installed-claim-boundary"
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_PATH, degradedCleanConsumerSmokeMissingInstalledClaimBoundary);
  const degradedReleaseReviewPublicationProtection = {
    ...sourceReleaseReviewPublicationProtection,
    status: "fail",
    completedAt: nowIso(),
    summary: {
      ...(sourceReleaseReviewPublicationProtection.summary || {}),
      problemCount: 1,
      protectedActualCommandCount: 1,
      passingSeededControlCount: Math.max(0, Number(sourceReleaseReviewPublicationProtection.summary?.passingSeededControlCount || 0) - 1)
    },
    problems: [
      {
        id: "negative-control-publication-protection-degraded",
        message: "Negative control degraded release-review publication-protection evidence.",
        evidencePath: DEGRADED_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH
      }
    ],
    negativeControl: true
  };
  await writeJson(DEGRADED_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH, degradedReleaseReviewPublicationProtection);

  const command = runReadinessWithOverrides({
    ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_GENERATED_READINESS_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_RESULT_PATH)
  });
  const blockedResult = existsSync(BLOCKED_V04_RESULT_PATH) ? await readJson(BLOCKED_V04_RESULT_PATH) : null;
  const expectedBlocker = (blockedResult?.blockers || []).find((blocker) => blocker.id === "generated-patch-readiness-failed");
  const abstractionDisclosureCommand = runReadinessWithOverrides({
    ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_GENERATED_ABSTRACTION_DISCLOSURE_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH)
  });
  const abstractionDisclosureBlockedResult = existsSync(BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH)
    ? await readJson(BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH)
    : null;
  const expectedAbstractionDisclosureBlocker = (abstractionDisclosureBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "generated-patch-readiness-failed");
  const runtimeAudioDependencyCommand = runReadinessWithOverrides({
    ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_GENERATED_RUNTIME_AUDIO_DEPENDENCY_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH)
  });
  const runtimeAudioDependencyBlockedResult = existsSync(BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH)
    ? await readJson(BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH)
    : null;
  const expectedRuntimeAudioDependencyBlocker = (runtimeAudioDependencyBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "generated-patch-readiness-failed");
  const releaseReviewCommand = runReadinessWithOverrides({
    ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(DEGRADED_RELEASE_REVIEW_SUMMARY_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH)
  });
  const releaseReviewBlockedResult = existsSync(BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH)
    ? await readJson(BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH)
    : null;
  const expectedReleaseReviewBlocker = (releaseReviewBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");
  const cleanConsumerSmokeCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH)
  });
  const cleanConsumerSmokeBlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokeBlocker = (cleanConsumerSmokeBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const cleanConsumerSmokeMissingRegenBlockerCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_REGEN_BLOCKER_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH)
  });
  const cleanConsumerSmokeMissingRegenBlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokeMissingRegenBlocker = (cleanConsumerSmokeMissingRegenBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const missingCleanConsumerSmokeCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(MISSING_CLEAN_CONSUMER_SMOKE_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_MISSING_CLEAN_CONSUMER_SMOKE_RESULT_PATH)
  });
  const missingCleanConsumerSmokeBlockedResult = existsSync(BLOCKED_V04_MISSING_CLEAN_CONSUMER_SMOKE_RESULT_PATH)
    ? await readJson(BLOCKED_V04_MISSING_CLEAN_CONSUMER_SMOKE_RESULT_PATH)
    : null;
  const expectedMissingCleanConsumerSmokeBlocker = (missingCleanConsumerSmokeBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "missing-cleanConsumerSmoke");
  const cleanConsumerSmokeSourceTreeImportCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_RESULT_PATH)
  });
  const cleanConsumerSmokeSourceTreeImportBlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokeSourceTreeImportBlocker = (cleanConsumerSmokeSourceTreeImportBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const cleanConsumerSmokePackageManifestCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_RESULT_PATH)
  });
  const cleanConsumerSmokePackageManifestBlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokePackageManifestBlocker = (cleanConsumerSmokePackageManifestBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const cleanConsumerSmokePackageBoundaryExportCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_RESULT_PATH)
  });
  const cleanConsumerSmokePackageBoundaryExportBlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokePackageBoundaryExportBlocker = (cleanConsumerSmokePackageBoundaryExportBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const cleanConsumerSmokeMissingInstalledV04Command = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_RESULT_PATH)
  });
  const cleanConsumerSmokeMissingInstalledV04BlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokeMissingInstalledV04Blocker = (cleanConsumerSmokeMissingInstalledV04BlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const cleanConsumerSmokeMissingInstalledClaimBoundaryCommand = runReadinessWithOverrides({
    ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_RESULT_PATH)
  });
  const cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedResult = existsSync(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_RESULT_PATH)
    ? await readJson(BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_RESULT_PATH)
    : null;
  const expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlocker = (cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "clean-consumer-smoke-failed");
  const releaseReviewPublicationProtectionCommand = runReadinessWithOverrides({
    ZOIA_RELEASE_REVIEW_PUBLICATION_PROTECTION_NEGATIVE_CONTROLS_PATH: relativeToProject(DEGRADED_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH),
    ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_RELEASE_REVIEW_PUBLICATION_PROTECTION_RESULT_PATH)
  });
  const releaseReviewPublicationProtectionBlockedResult = existsSync(BLOCKED_V04_RELEASE_REVIEW_PUBLICATION_PROTECTION_RESULT_PATH)
    ? await readJson(BLOCKED_V04_RELEASE_REVIEW_PUBLICATION_PROTECTION_RESULT_PATH)
    : null;
  const expectedReleaseReviewPublicationProtectionBlocker = (releaseReviewPublicationProtectionBlockedResult?.blockers || [])
    .find((blocker) => blocker.id === "release-review-publication-protection-negative-controls-failed");
  const problems = [];
  if (command.status === 0) {
    problems.push({
      id: "negative-control-command-passed",
      message: "v0.4 readiness command passed with degraded generated-patch readiness evidence."
    });
  }
  if (!blockedResult) {
    problems.push({
      id: "negative-control-result-missing",
      message: "Negative-control v0.4 readiness result was not written.",
      evidencePath: BLOCKED_V04_RESULT_PATH
    });
  } else {
    if (blockedResult.status !== "blocked") {
      problems.push({
        id: "negative-control-result-not-blocked",
        message: "Negative-control v0.4 readiness result was not blocked.",
        evidencePath: BLOCKED_V04_RESULT_PATH,
        observed: { status: blockedResult.status }
      });
    }
    if (!expectedBlocker) {
      problems.push({
        id: "negative-control-blocker-missing",
        message: "Negative-control v0.4 readiness did not report generated-patch-readiness-failed.",
        evidencePath: BLOCKED_V04_RESULT_PATH,
        observed: { blockers: blockedResult.blockers || [] }
      });
    }
  }
  if (abstractionDisclosureCommand.status === 0) {
    problems.push({
      id: "abstraction-disclosure-negative-control-command-passed",
      message: "v0.4 readiness command passed with missing generated-patch abstraction disclosure."
    });
  }
  if (!abstractionDisclosureBlockedResult) {
    problems.push({
      id: "abstraction-disclosure-negative-control-result-missing",
      message: "Negative-control v0.4 abstraction-disclosure result was not written.",
      evidencePath: BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH
    });
  } else {
    if (abstractionDisclosureBlockedResult.status !== "blocked") {
      problems.push({
        id: "abstraction-disclosure-negative-control-result-not-blocked",
        message: "Negative-control v0.4 abstraction-disclosure result was not blocked.",
        evidencePath: BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH,
        observed: { status: abstractionDisclosureBlockedResult.status }
      });
    }
    if (!expectedAbstractionDisclosureBlocker) {
      problems.push({
        id: "abstraction-disclosure-negative-control-blocker-missing",
        message: "Negative-control v0.4 readiness did not report generated-patch-readiness-failed for missing abstraction disclosure.",
        evidencePath: BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH,
        observed: { blockers: abstractionDisclosureBlockedResult.blockers || [] }
      });
    }
  }
  if (releaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-negative-control-command-passed",
      message: "v0.4 readiness command passed with degraded release-review summary evidence."
    });
  }
  if (!releaseReviewBlockedResult) {
    problems.push({
      id: "release-review-negative-control-result-missing",
      message: "Negative-control v0.4 release-review result was not written.",
      evidencePath: BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH
    });
  } else {
    if (releaseReviewBlockedResult.status !== "blocked") {
      problems.push({
        id: "release-review-negative-control-result-not-blocked",
        message: "Negative-control v0.4 release-review result was not blocked.",
        evidencePath: BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH,
        observed: { status: releaseReviewBlockedResult.status }
      });
    }
    if (!expectedReleaseReviewBlocker) {
      problems.push({
        id: "release-review-negative-control-blocker-missing",
        message: "Negative-control v0.4 readiness did not report release-review-summary-failed.",
        evidencePath: BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH,
        observed: { blockers: releaseReviewBlockedResult.blockers || [] }
      });
    }
  }
  if (cleanConsumerSmokeCommand.status === 0) {
    problems.push({
      id: "clean-consumer-smoke-negative-control-command-passed",
      message: "v0.4 readiness command passed with degraded clean consumer smoke evidence."
    });
  }
  if (!cleanConsumerSmokeBlockedResult) {
    problems.push({
      id: "clean-consumer-smoke-negative-control-result-missing",
      message: "Negative-control v0.4 clean consumer smoke result was not written.",
      evidencePath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH
    });
  } else {
    if (cleanConsumerSmokeBlockedResult.status !== "blocked") {
      problems.push({
        id: "clean-consumer-smoke-negative-control-result-not-blocked",
        message: "Negative-control v0.4 clean consumer smoke result was not blocked.",
        evidencePath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH,
        observed: { status: cleanConsumerSmokeBlockedResult.status }
      });
    }
    if (!expectedCleanConsumerSmokeBlocker) {
      problems.push({
        id: "clean-consumer-smoke-negative-control-blocker-missing",
        message: "Negative-control v0.4 readiness did not report clean-consumer-smoke-failed.",
        evidencePath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH,
        observed: { blockers: cleanConsumerSmokeBlockedResult.blockers || [] }
      });
    }
  }
  if (runtimeAudioDependencyCommand.status === 0) {
    problems.push({
      id: "runtime-audio-dependency-negative-control-command-passed",
      message: "v0.4 readiness command passed with degraded generated-patch runtime-audio dependency evidence."
    });
  }
  if (!runtimeAudioDependencyBlockedResult) {
    problems.push({
      id: "runtime-audio-dependency-negative-control-result-missing",
      message: "Negative-control v0.4 runtime-audio dependency result was not written.",
      evidencePath: BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH
    });
  } else {
    if (runtimeAudioDependencyBlockedResult.status !== "blocked") {
      problems.push({
        id: "runtime-audio-dependency-negative-control-result-not-blocked",
        message: "Negative-control v0.4 runtime-audio dependency result was not blocked.",
        evidencePath: BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH,
        observed: { status: runtimeAudioDependencyBlockedResult.status }
      });
    }
    if (!expectedRuntimeAudioDependencyBlocker) {
      problems.push({
        id: "runtime-audio-dependency-negative-control-blocker-missing",
        message: "Negative-control v0.4 readiness did not report generated-patch-readiness-failed for degraded runtime-audio dependency evidence.",
        evidencePath: BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH,
        observed: { blockers: runtimeAudioDependencyBlockedResult.blockers || [] }
      });
    }
  }
  if (cleanConsumerSmokeMissingRegenBlockerCommand.status === 0) {
    problems.push({
      id: "clean-consumer-smoke-missing-regeneration-blocker-negative-control-command-passed",
      message: "v0.4 readiness command passed with missing clean consumer release-review regeneration blocker evidence."
    });
  }
  if (!cleanConsumerSmokeMissingRegenBlockedResult) {
    problems.push({
      id: "clean-consumer-smoke-missing-regeneration-blocker-negative-control-result-missing",
      message: "Negative-control v0.4 clean consumer regeneration-blocker result was not written.",
      evidencePath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH
    });
  } else {
    if (cleanConsumerSmokeMissingRegenBlockedResult.status !== "blocked") {
      problems.push({
        id: "clean-consumer-smoke-missing-regeneration-blocker-negative-control-result-not-blocked",
        message: "Negative-control v0.4 clean consumer regeneration-blocker result was not blocked.",
        evidencePath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH,
        observed: { status: cleanConsumerSmokeMissingRegenBlockedResult.status }
      });
    }
    if (!expectedCleanConsumerSmokeMissingRegenBlocker) {
      problems.push({
        id: "clean-consumer-smoke-missing-regeneration-blocker-negative-control-blocker-missing",
        message: "Negative-control v0.4 readiness did not report clean-consumer-smoke-failed for missing release-review regeneration blocker evidence.",
        evidencePath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH,
        observed: { blockers: cleanConsumerSmokeMissingRegenBlockedResult.blockers || [] }
      });
    }
  }
  const additionalCleanSmokeCases = [
    {
      key: "missingCleanConsumerSmoke",
      command: missingCleanConsumerSmokeCommand,
      result: missingCleanConsumerSmokeBlockedResult,
      expectedBlocker: expectedMissingCleanConsumerSmokeBlocker,
      resultPath: BLOCKED_V04_MISSING_CLEAN_CONSUMER_SMOKE_RESULT_PATH,
      expectedBlockerId: "missing-cleanConsumerSmoke",
      description: "missing clean consumer smoke evidence"
    },
    {
      key: "cleanConsumerSmokeSourceTreeImport",
      command: cleanConsumerSmokeSourceTreeImportCommand,
      result: cleanConsumerSmokeSourceTreeImportBlockedResult,
      expectedBlocker: expectedCleanConsumerSmokeSourceTreeImportBlocker,
      resultPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_RESULT_PATH,
      expectedBlockerId: "clean-consumer-smoke-failed",
      description: "clean consumer smoke source-tree import leakage"
    },
    {
      key: "cleanConsumerSmokePackageManifest",
      command: cleanConsumerSmokePackageManifestCommand,
      result: cleanConsumerSmokePackageManifestBlockedResult,
      expectedBlocker: expectedCleanConsumerSmokePackageManifestBlocker,
      resultPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_RESULT_PATH,
      expectedBlockerId: "clean-consumer-smoke-failed",
      description: "clean consumer smoke package manifest omission"
    },
    {
      key: "cleanConsumerSmokePackageBoundaryExport",
      command: cleanConsumerSmokePackageBoundaryExportCommand,
      result: cleanConsumerSmokePackageBoundaryExportBlockedResult,
      expectedBlocker: expectedCleanConsumerSmokePackageBoundaryExportBlocker,
      resultPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_RESULT_PATH,
      expectedBlockerId: "clean-consumer-smoke-failed",
      description: "clean consumer smoke package metadata, script reference, or copied evidence omission"
    },
    {
      key: "cleanConsumerSmokeMissingInstalledV04",
      command: cleanConsumerSmokeMissingInstalledV04Command,
      result: cleanConsumerSmokeMissingInstalledV04BlockedResult,
      expectedBlocker: expectedCleanConsumerSmokeMissingInstalledV04Blocker,
      resultPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_RESULT_PATH,
      expectedBlockerId: "clean-consumer-smoke-failed",
      description: "missing installed v0.4 readiness evidence"
    },
    {
      key: "cleanConsumerSmokeMissingInstalledClaimBoundary",
      command: cleanConsumerSmokeMissingInstalledClaimBoundaryCommand,
      result: cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedResult,
      expectedBlocker: expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlocker,
      resultPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_RESULT_PATH,
      expectedBlockerId: "clean-consumer-smoke-failed",
      description: "missing installed claim-boundary evidence"
    },
    {
      key: "releaseReviewPublicationProtection",
      command: releaseReviewPublicationProtectionCommand,
      result: releaseReviewPublicationProtectionBlockedResult,
      expectedBlocker: expectedReleaseReviewPublicationProtectionBlocker,
      resultPath: BLOCKED_V04_RELEASE_REVIEW_PUBLICATION_PROTECTION_RESULT_PATH,
      expectedBlockerId: "release-review-publication-protection-negative-controls-failed",
      description: "degraded release-review publication-protection evidence"
    }
  ];
  for (const testCase of additionalCleanSmokeCases) {
    if (testCase.command.status === 0) {
      problems.push({
        id: `${testCase.key}-negative-control-command-passed`,
        message: `v0.4 readiness command passed with ${testCase.description}.`
      });
    }
    if (!testCase.result) {
      problems.push({
        id: `${testCase.key}-negative-control-result-missing`,
        message: `Negative-control v0.4 result was not written for ${testCase.description}.`,
        evidencePath: testCase.resultPath
      });
      continue;
    }
    if (testCase.result.status !== "blocked") {
      problems.push({
        id: `${testCase.key}-negative-control-result-not-blocked`,
        message: `Negative-control v0.4 result did not block for ${testCase.description}.`,
        evidencePath: testCase.resultPath,
        observed: { status: testCase.result.status }
      });
    }
    if (!testCase.expectedBlocker) {
      problems.push({
        id: `${testCase.key}-negative-control-blocker-missing`,
        message: `Negative-control v0.4 readiness did not report ${testCase.expectedBlockerId} for ${testCase.description}.`,
        evidencePath: testCase.resultPath,
        observed: { blockers: testCase.result.blockers || [] }
      });
    }
  }

  const result = {
    schemaVersion: "zoia.v04-readiness-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: 13,
      passingCaseCount: [expectedBlocker, expectedAbstractionDisclosureBlocker, expectedRuntimeAudioDependencyBlocker, expectedReleaseReviewBlocker, expectedCleanConsumerSmokeBlocker, expectedCleanConsumerSmokeMissingRegenBlocker, expectedMissingCleanConsumerSmokeBlocker, expectedCleanConsumerSmokeSourceTreeImportBlocker, expectedCleanConsumerSmokePackageManifestBlocker, expectedCleanConsumerSmokePackageBoundaryExportBlocker, expectedCleanConsumerSmokeMissingInstalledV04Blocker, expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlocker, expectedReleaseReviewPublicationProtectionBlocker].filter(Boolean).length,
      commandExitCode: command.status,
      abstractionDisclosureCommandExitCode: abstractionDisclosureCommand.status,
      runtimeAudioDependencyCommandExitCode: runtimeAudioDependencyCommand.status,
      releaseReviewCommandExitCode: releaseReviewCommand.status,
      cleanConsumerSmokeCommandExitCode: cleanConsumerSmokeCommand.status,
      cleanConsumerSmokeMissingRegenerationBlockerCommandExitCode: cleanConsumerSmokeMissingRegenBlockerCommand.status,
      missingCleanConsumerSmokeCommandExitCode: missingCleanConsumerSmokeCommand.status,
      cleanConsumerSmokeSourceTreeImportCommandExitCode: cleanConsumerSmokeSourceTreeImportCommand.status,
      cleanConsumerSmokePackageManifestCommandExitCode: cleanConsumerSmokePackageManifestCommand.status,
      cleanConsumerSmokePackageBoundaryExportCommandExitCode: cleanConsumerSmokePackageBoundaryExportCommand.status,
      cleanConsumerSmokeMissingInstalledV04CommandExitCode: cleanConsumerSmokeMissingInstalledV04Command.status,
      cleanConsumerSmokeMissingInstalledClaimBoundaryCommandExitCode: cleanConsumerSmokeMissingInstalledClaimBoundaryCommand.status,
      releaseReviewPublicationProtectionCommandExitCode: releaseReviewPublicationProtectionCommand.status,
      degradedGeneratedReadinessStatus: degraded.status,
      degradedAbstractionDisclosureStatus: degradedAbstractionDisclosure.status,
      degradedRuntimeAudioDependencyStatus: degradedRuntimeAudioDependency.status,
      degradedReleaseReviewStatus: degradedReleaseReview.status,
      degradedCleanConsumerSmokeStatus: degradedCleanConsumerSmoke.status,
      degradedCleanConsumerSmokeMissingRegenerationBlockerStatus: degradedCleanConsumerSmokeMissingRegenBlocker.status,
      degradedCleanConsumerSmokeSourceTreeImportStatus: degradedCleanConsumerSmokeSourceTreeImport.status,
      degradedCleanConsumerSmokePackageManifestStatus: degradedCleanConsumerSmokePackageManifest.status,
      degradedCleanConsumerSmokePackageBoundaryExportStatus: degradedCleanConsumerSmokePackageBoundaryExport.status,
      degradedCleanConsumerSmokeMissingInstalledV04Status: degradedCleanConsumerSmokeMissingInstalledV04.status,
      degradedCleanConsumerSmokeMissingInstalledClaimBoundaryStatus: degradedCleanConsumerSmokeMissingInstalledClaimBoundary.status,
      degradedReleaseReviewPublicationProtectionStatus: degradedReleaseReviewPublicationProtection.status,
      blockedV04Status: blockedResult?.status || null,
      abstractionDisclosureBlockedV04Status: abstractionDisclosureBlockedResult?.status || null,
      runtimeAudioDependencyBlockedV04Status: runtimeAudioDependencyBlockedResult?.status || null,
      releaseReviewBlockedV04Status: releaseReviewBlockedResult?.status || null,
      cleanConsumerSmokeBlockedV04Status: cleanConsumerSmokeBlockedResult?.status || null,
      cleanConsumerSmokeMissingRegenerationBlockerBlockedV04Status: cleanConsumerSmokeMissingRegenBlockedResult?.status || null,
      missingCleanConsumerSmokeBlockedV04Status: missingCleanConsumerSmokeBlockedResult?.status || null,
      cleanConsumerSmokeSourceTreeImportBlockedV04Status: cleanConsumerSmokeSourceTreeImportBlockedResult?.status || null,
      cleanConsumerSmokePackageManifestBlockedV04Status: cleanConsumerSmokePackageManifestBlockedResult?.status || null,
      cleanConsumerSmokePackageBoundaryExportBlockedV04Status: cleanConsumerSmokePackageBoundaryExportBlockedResult?.status || null,
      cleanConsumerSmokeMissingInstalledV04BlockedV04Status: cleanConsumerSmokeMissingInstalledV04BlockedResult?.status || null,
      cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedV04Status: cleanConsumerSmokeMissingInstalledClaimBoundaryBlockedResult?.status || null,
      releaseReviewPublicationProtectionBlockedV04Status: releaseReviewPublicationProtectionBlockedResult?.status || null,
      expectedBlockerFound: Boolean(expectedBlocker),
      expectedAbstractionDisclosureBlockerFound: Boolean(expectedAbstractionDisclosureBlocker),
      expectedRuntimeAudioDependencyBlockerFound: Boolean(expectedRuntimeAudioDependencyBlocker),
      expectedReleaseReviewBlockerFound: Boolean(expectedReleaseReviewBlocker),
      expectedCleanConsumerSmokeBlockerFound: Boolean(expectedCleanConsumerSmokeBlocker),
      expectedCleanConsumerSmokeMissingRegenerationBlockerFound: Boolean(expectedCleanConsumerSmokeMissingRegenBlocker),
      expectedMissingCleanConsumerSmokeBlockerFound: Boolean(expectedMissingCleanConsumerSmokeBlocker),
      expectedCleanConsumerSmokeSourceTreeImportBlockerFound: Boolean(expectedCleanConsumerSmokeSourceTreeImportBlocker),
      expectedCleanConsumerSmokePackageManifestBlockerFound: Boolean(expectedCleanConsumerSmokePackageManifestBlocker),
      expectedCleanConsumerSmokePackageBoundaryExportBlockerFound: Boolean(expectedCleanConsumerSmokePackageBoundaryExportBlocker),
      expectedCleanConsumerSmokeMissingInstalledV04BlockerFound: Boolean(expectedCleanConsumerSmokeMissingInstalledV04Blocker),
      expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlockerFound: Boolean(expectedCleanConsumerSmokeMissingInstalledClaimBoundaryBlocker),
      expectedReleaseReviewPublicationProtectionBlockerFound: Boolean(expectedReleaseReviewPublicationProtectionBlocker)
    },
    command: {
      stdout: command.stdout,
      stderr: command.stderr,
      abstractionDisclosureStdout: abstractionDisclosureCommand.stdout,
      abstractionDisclosureStderr: abstractionDisclosureCommand.stderr,
      runtimeAudioDependencyStdout: runtimeAudioDependencyCommand.stdout,
      runtimeAudioDependencyStderr: runtimeAudioDependencyCommand.stderr,
      releaseReviewStdout: releaseReviewCommand.stdout,
      releaseReviewStderr: releaseReviewCommand.stderr,
      cleanConsumerSmokeStdout: cleanConsumerSmokeCommand.stdout,
      cleanConsumerSmokeStderr: cleanConsumerSmokeCommand.stderr,
      cleanConsumerSmokeMissingRegenerationBlockerStdout: cleanConsumerSmokeMissingRegenBlockerCommand.stdout,
      cleanConsumerSmokeMissingRegenerationBlockerStderr: cleanConsumerSmokeMissingRegenBlockerCommand.stderr,
      missingCleanConsumerSmokeStdout: missingCleanConsumerSmokeCommand.stdout,
      missingCleanConsumerSmokeStderr: missingCleanConsumerSmokeCommand.stderr,
      cleanConsumerSmokeSourceTreeImportStdout: cleanConsumerSmokeSourceTreeImportCommand.stdout,
      cleanConsumerSmokeSourceTreeImportStderr: cleanConsumerSmokeSourceTreeImportCommand.stderr,
      cleanConsumerSmokePackageManifestStdout: cleanConsumerSmokePackageManifestCommand.stdout,
      cleanConsumerSmokePackageManifestStderr: cleanConsumerSmokePackageManifestCommand.stderr,
      cleanConsumerSmokePackageBoundaryExportStdout: cleanConsumerSmokePackageBoundaryExportCommand.stdout,
      cleanConsumerSmokePackageBoundaryExportStderr: cleanConsumerSmokePackageBoundaryExportCommand.stderr,
      cleanConsumerSmokeMissingInstalledV04Stdout: cleanConsumerSmokeMissingInstalledV04Command.stdout,
      cleanConsumerSmokeMissingInstalledV04Stderr: cleanConsumerSmokeMissingInstalledV04Command.stderr,
      cleanConsumerSmokeMissingInstalledClaimBoundaryStdout: cleanConsumerSmokeMissingInstalledClaimBoundaryCommand.stdout,
      cleanConsumerSmokeMissingInstalledClaimBoundaryStderr: cleanConsumerSmokeMissingInstalledClaimBoundaryCommand.stderr,
      releaseReviewPublicationProtectionStdout: releaseReviewPublicationProtectionCommand.stdout,
      releaseReviewPublicationProtectionStderr: releaseReviewPublicationProtectionCommand.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies that v0.4 readiness blocks when generated-patch readiness evidence, generated-patch runtime-audio dependency evidence, release-review summary evidence, clean consumer smoke evidence, or clean consumer release-review regeneration blocker evidence is degraded. It does not modify canonical readiness evidence.",
    artifacts: {
      resultPath: RESULT_PATH,
      degradedGeneratedReadinessPath: DEGRADED_GENERATED_READINESS_PATH,
      degradedGeneratedAbstractionDisclosurePath: DEGRADED_GENERATED_ABSTRACTION_DISCLOSURE_PATH,
      degradedGeneratedRuntimeAudioDependencyPath: DEGRADED_GENERATED_RUNTIME_AUDIO_DEPENDENCY_PATH,
      degradedReleaseReviewSummaryPath: DEGRADED_RELEASE_REVIEW_SUMMARY_PATH,
      degradedCleanConsumerSmokePath: DEGRADED_CLEAN_CONSUMER_SMOKE_PATH,
      degradedCleanConsumerSmokeMissingRegenerationBlockerPath: DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_REGEN_BLOCKER_PATH,
      degradedCleanConsumerSmokeSourceTreeImportPath: DEGRADED_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_PATH,
      degradedCleanConsumerSmokePackageManifestPath: DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_PATH,
      degradedCleanConsumerSmokePackageBoundaryExportPath: DEGRADED_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_PATH,
      degradedCleanConsumerSmokeMissingInstalledV04Path: DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_PATH,
      degradedCleanConsumerSmokeMissingInstalledClaimBoundaryPath: DEGRADED_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_PATH,
      degradedReleaseReviewPublicationProtectionPath: DEGRADED_RELEASE_REVIEW_PUBLICATION_PROTECTION_PATH,
      missingCleanConsumerSmokePath: MISSING_CLEAN_CONSUMER_SMOKE_PATH,
      blockedV04ReadinessPath: BLOCKED_V04_RESULT_PATH,
      blockedV04AbstractionDisclosureReadinessPath: BLOCKED_V04_ABSTRACTION_DISCLOSURE_RESULT_PATH,
      blockedV04RuntimeAudioDependencyReadinessPath: BLOCKED_V04_RUNTIME_AUDIO_DEPENDENCY_RESULT_PATH,
      blockedV04ReleaseReviewReadinessPath: BLOCKED_V04_RELEASE_REVIEW_RESULT_PATH,
      blockedV04CleanConsumerSmokeReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_RESULT_PATH,
      blockedV04CleanConsumerSmokeMissingRegenerationBlockerReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_REGEN_BLOCKER_RESULT_PATH,
      blockedV04MissingCleanConsumerSmokeReadinessPath: BLOCKED_V04_MISSING_CLEAN_CONSUMER_SMOKE_RESULT_PATH,
      blockedV04CleanConsumerSmokeSourceTreeImportReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_SOURCE_TREE_IMPORT_RESULT_PATH,
      blockedV04CleanConsumerSmokePackageManifestReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_MANIFEST_RESULT_PATH,
      blockedV04CleanConsumerSmokePackageBoundaryExportReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_PACKAGE_BOUNDARY_EXPORT_RESULT_PATH,
      blockedV04CleanConsumerSmokeMissingInstalledV04ReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_V04_RESULT_PATH,
      blockedV04CleanConsumerSmokeMissingInstalledClaimBoundaryReadinessPath: BLOCKED_V04_CLEAN_CONSUMER_SMOKE_MISSING_INSTALLED_CLAIM_BOUNDARY_RESULT_PATH,
      blockedV04ReleaseReviewPublicationProtectionReadinessPath: BLOCKED_V04_RELEASE_REVIEW_PUBLICATION_PROTECTION_RESULT_PATH
    }
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH,
    blockedV04ReadinessPath: BLOCKED_V04_RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.v04-readiness-negative-controls-result.v1",
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
  await writeJson(RESULT_PATH, result);
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
