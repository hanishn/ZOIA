#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-final-evidence-inventory-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const FIXTURE_ROOT = resolve(EVIDENCE_ROOT, "fixtures");
const JSON_SPACES = 2;

const SOURCE_DOCS = Object.freeze({
  readme: "README.md",
  changelog: "CHANGELOG.md",
  githubReadiness: "GITHUB_READINESS.md",
  communityCoverage: "docs/COMMUNITY_COVERAGE.md",
  featureCoverage: "docs/FEATURE_COVERAGE.md",
  patchGeneration: "docs/PATCH_GENERATION.md",
  capability: "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
  evidenceInventory: "docs/TEXT_PROMPT_GENERATED_PATCH_EVIDENCE_INVENTORY.md",
  validation: "docs/VALIDATION.md",
  testMatrix: "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md",
  demoReadme: "July24_2026_Demo/README_DEMO.md",
  demoStatus: "July24_2026_Demo/DEMO_STATUS.md"
});
const SOURCE_RELEASE_REVIEW = "tests/workflow/evidence/release-review-summary/run-result.json";
const SOURCE_CLEAN_CONSUMER_SMOKE = "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json";
const SOURCE_CLAIM_BOUNDARY = "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json";
const SOURCE_V04_READINESS = "tests/workflow/evidence/v0.4-readiness/run-result.json";
const SOURCE_PACKAGE_JSON = "package.json";

const CASES = Object.freeze([
  {
    id: "doc-release-ready-overclaim",
    target: "patchGeneration",
    appendText: "\nSeeded invalid statement: The v0.4 generated-patch work is now release-ready.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "release-ready-positive"
  },
  {
    id: "doc-broad-text-to-zoia-overclaim",
    target: "testMatrix",
    appendText: "\nSeeded invalid statement: This proves broad text-to-ZOIA support.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "broad-text-to-zoia-positive"
  },
  {
    id: "doc-audible-cutoff-sweep-overclaim",
    target: "capability",
    appendText: "\nSeeded invalid statement: This proves audible cutoff sweep success.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "audible-sweep-positive"
  },
  {
    id: "readme-arbitrary-prompt-overclaim",
    target: "readme",
    appendText: "\nSeeded invalid statement: This proves arbitrary prompt support.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "arbitrary-prompt-positive"
  },
  {
    id: "changelog-npm-publication-overclaim",
    target: "changelog",
    appendText: "\nSeeded invalid statement: This proves npm publication readiness.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "npm-publication-positive"
  },
  {
    id: "github-readiness-overclaim",
    target: "githubReadiness",
    appendText: "\nSeeded invalid statement: This proves GitHub readiness.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "github-readiness-positive"
  },
  {
    id: "validation-full-dsp-overclaim",
    target: "validation",
    appendText: "\nSeeded invalid statement: This proves full DSP accuracy.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "full-dsp-positive"
  },
  {
    id: "feature-coverage-complete-semantics-overclaim",
    target: "featureCoverage",
    appendText: "\nSeeded invalid statement: This proves complete patch semantics.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "complete-semantics-positive"
  },
  {
    id: "release-review-hardware-export-overclaim",
    target: "releaseReview",
    claimBoundary: "This proves hardware export for generated patches.",
    expectedProblemId: "release-review-boundary-validation-failed",
    expectedSurface: "hardware-export-positive"
  },
  {
    id: "readme-arbitrary-text-prompts-paraphrase",
    target: "readme",
    appendText: "\nSeeded invalid statement: The generated-patch flow supports arbitrary text prompts.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "arbitrary-text-prompts-positive"
  },
  {
    id: "changelog-publishable-package-paraphrase",
    target: "changelog",
    appendText: "\nSeeded invalid statement: The local package is now a publishable package.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "publishable-package-positive"
  },
  {
    id: "validation-hardware-equivalent-output-paraphrase",
    target: "validation",
    appendText: "\nSeeded invalid statement: The emulator output is hardware-equivalent output.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "hardware-equivalent-output-positive"
  },
  {
    id: "release-review-production-ready-release-paraphrase",
    target: "releaseReview",
    claimBoundary: "This is a production-ready release.",
    expectedProblemId: "release-review-boundary-validation-failed",
    expectedSurface: "production-ready-release-positive"
  },
  {
    id: "clean-smoke-package-manifest-unscanned-doc",
    target: "cleanConsumerSmoke",
    manifestField: "packageManifestChecks",
    seededPath: "docs/UNSCANNED_PACKAGE_BOUNDARY_DOC.md",
    expectedProblemId: "package-boundary-doc-not-in-inventory-scanner",
    expectedSurface: "docs/UNSCANNED_PACKAGE_BOUNDARY_DOC.md"
  },
  {
    id: "clean-smoke-installed-unscanned-doc",
    target: "cleanConsumerSmoke",
    manifestField: "installedChecks",
    seededPath: "docs/UNSCANNED_INSTALLED_DOC.md",
    expectedProblemId: "package-boundary-doc-not-in-inventory-scanner",
    expectedSurface: "docs/UNSCANNED_INSTALLED_DOC.md"
  },
  {
    id: "stale-release-review-dependency",
    target: "staleDependency",
    dependency: "releaseReview",
    expectedProblemId: "final-inventory-dependency-stale",
    expectedSurface: "releaseReview"
  },
  {
    id: "stale-claim-boundary-dependency",
    target: "staleDependency",
    dependency: "claimBoundary",
    expectedProblemId: "final-inventory-dependency-stale",
    expectedSurface: "generatedPatchClaimBoundary"
  },
  {
    id: "stale-clean-smoke-dependency",
    target: "staleDependency",
    dependency: "cleanConsumerSmoke",
    expectedProblemId: "final-inventory-dependency-stale",
    expectedSurface: "cleanConsumerSmoke"
  },
  {
    id: "release-review-uncategorized-evidence",
    target: "uncategorizedConsumedEvidence",
    owner: "releaseReview",
    seededPath: "tests/workflow/evidence/uncategorized-generated-patch-runtime/run-result.json",
    expectedProblemId: "final-inventory-consumed-evidence-uncategorized",
    expectedSurface: "uncategorized-generated-patch-runtime"
  },
  {
    id: "v04-uncategorized-evidence",
    target: "uncategorizedConsumedEvidence",
    owner: "v04Readiness",
    seededPath: "tests/workflow/evidence/uncategorized-v04-runtime/run-result.json",
    expectedProblemId: "final-inventory-consumed-evidence-uncategorized",
    expectedSurface: "uncategorized-v04-runtime"
  },
  {
    id: "claim-boundary-uncategorized-evidence",
    target: "uncategorizedConsumedEvidence",
    owner: "claimBoundary",
    seededPath: "tests/workflow/evidence/uncategorized-claim-boundary-runtime/run-result.json",
    expectedProblemId: "final-inventory-consumed-evidence-uncategorized",
    expectedSurface: "uncategorized-claim-boundary-runtime"
  },
  {
    id: "release-review-documented-uncategorized-evidence",
    target: "uncategorizedDocumentedEvidence",
    seededPath: "tests/workflow/evidence/uncategorized-documented-review-evidence/run-result.json",
    expectedProblemId: "final-inventory-documented-evidence-uncategorized",
    expectedSurface: "uncategorized-documented-review-evidence"
  },
  {
    id: "release-review-uncategorized-validation-command",
    target: "uncategorizedValidationCommand",
    seededCommand: "npm run zoia:unknown:drift",
    expectedProblemId: "final-inventory-validation-command-uncategorized",
    expectedSurface: "zoia:unknown:drift"
  },
  {
    id: "package-json-uncategorized-review-surface-script",
    target: "uncategorizedPackageScript",
    seededScriptName: "zoia:generate:patch:uncategorized-review-surface",
    seededScript: "node tests/workflow/scripts/uncategorized-review-surface.mjs",
    expectedProblemId: "final-inventory-package-script-uncategorized",
    expectedSurface: "zoia:generate:patch:uncategorized-review-surface"
  },
  {
    id: "demo-status-release-ready-overclaim",
    target: "demoStatus",
    appendText: "\nSeeded invalid statement: This demo is ready for release.\n",
    expectedProblemId: "doc-boundary-validation-failed",
    expectedSurface: "release-ready-positive"
  }
]);

function nowIso() {
  return new Date().toISOString();
}

async function readText(path) {
  return readFile(path, "utf8");
}

async function readJson(path) {
  return JSON.parse((await readText(path)).replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function copyCanonicalInputs(caseRoot) {
  const docsRoot = resolve(caseRoot, "docs");
  await mkdir(docsRoot, { recursive: true });
  const copiedDocs = {};
  for (const [id, relativePath] of Object.entries(SOURCE_DOCS)) {
    const destination = resolve(docsRoot, `${id}.md`);
    await cp(resolve(PROJECT_ROOT, relativePath), destination);
    copiedDocs[id] = destination;
  }
  const releaseReviewPath = resolve(caseRoot, "release-review-summary.json");
  await cp(resolve(PROJECT_ROOT, SOURCE_RELEASE_REVIEW), releaseReviewPath);
  const cleanConsumerSmokePath = resolve(caseRoot, "clean-consumer-smoke.json");
  await cp(resolve(PROJECT_ROOT, SOURCE_CLEAN_CONSUMER_SMOKE), cleanConsumerSmokePath);
  const claimBoundaryPath = resolve(caseRoot, "claim-boundary.json");
  await cp(resolve(PROJECT_ROOT, SOURCE_CLAIM_BOUNDARY), claimBoundaryPath);
  const v04ReadinessPath = resolve(caseRoot, "v04-readiness.json");
  await cp(resolve(PROJECT_ROOT, SOURCE_V04_READINESS), v04ReadinessPath);
  const packageJsonPath = resolve(caseRoot, "package.json");
  await cp(resolve(PROJECT_ROOT, SOURCE_PACKAGE_JSON), packageJsonPath);
  return { copiedDocs, releaseReviewPath, cleanConsumerSmokePath, claimBoundaryPath, v04ReadinessPath, packageJsonPath };
}

function relativeToProject(path) {
  return resolve(path).slice(PROJECT_ROOT.length + 1);
}

function runInventory(caseRoot, copiedDocs, releaseReviewPath, cleanConsumerSmokePath, claimBoundaryPath, v04ReadinessPath, packageJsonPath) {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-generated-patch-final-evidence-inventory.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_FINAL_INVENTORY_DOC_PATHS: Object.values(copiedDocs).map(relativeToProject).join(";"),
      ZOIA_FINAL_INVENTORY_RELEASE_REVIEW_PATH: relativeToProject(releaseReviewPath),
      ZOIA_FINAL_INVENTORY_CLEAN_SMOKE_PATH: relativeToProject(cleanConsumerSmokePath),
      ZOIA_FINAL_INVENTORY_CLAIM_BOUNDARY_PATH: relativeToProject(claimBoundaryPath),
      ZOIA_FINAL_INVENTORY_V04_READINESS_PATH: relativeToProject(v04ReadinessPath),
      ZOIA_FINAL_INVENTORY_PACKAGE_JSON_PATH: relativeToProject(packageJsonPath),
      ZOIA_FINAL_INVENTORY_RESULT_PATH: relativeToProject(resolve(caseRoot, "inventory-result.json")),
      ZOIA_FINAL_INVENTORY_JSON_PATH: relativeToProject(resolve(caseRoot, "claim-inventory.json")),
      ZOIA_FINAL_INVENTORY_REPORT_PATH: relativeToProject(resolve(caseRoot, "inventory-report.md"))
    }
  });
}

function markStale(value) {
  value.generatedAt = "2000-01-01T00:00:00.000Z";
  value.completedAt = "2000-01-01T00:00:00.000Z";
  value.startedAt = "2000-01-01T00:00:00.000Z";
  return value;
}

async function seedCase(testCase, caseRoot, copiedDocs, releaseReviewPath, cleanConsumerSmokePath, claimBoundaryPath, v04ReadinessPath, packageJsonPath) {
  if (testCase.target === "releaseReview") {
    const releaseReview = await readJson(releaseReviewPath);
    releaseReview.claimBoundaries = [
      ...(releaseReview.claimBoundaries || []),
      testCase.claimBoundary
    ];
    await writeJson(releaseReviewPath, releaseReview);
    return;
  }
  if (testCase.target === "cleanConsumerSmoke") {
    const cleanConsumerSmoke = await readJson(cleanConsumerSmokePath);
    cleanConsumerSmoke[testCase.manifestField] = [
      ...(cleanConsumerSmoke[testCase.manifestField] || []),
      { path: testCase.seededPath, included: true, exists: true }
    ];
    await writeJson(cleanConsumerSmokePath, cleanConsumerSmoke);
    return;
  }
  if (testCase.target === "staleDependency") {
    const targetPathByDependency = {
      releaseReview: releaseReviewPath,
      cleanConsumerSmoke: cleanConsumerSmokePath,
      claimBoundary: claimBoundaryPath
    };
    const targetPath = targetPathByDependency[testCase.dependency];
    await writeJson(targetPath, markStale(await readJson(targetPath)));
    return;
  }
  if (testCase.target === "uncategorizedConsumedEvidence") {
    if (testCase.owner === "releaseReview") {
      const releaseReview = await readJson(releaseReviewPath);
      releaseReview.evidence = [
        ...(releaseReview.evidence || []),
        { id: "seededUncategorizedRuntime", path: testCase.seededPath, exists: true, status: "pass" }
      ];
      await writeJson(releaseReviewPath, releaseReview);
      return;
    }
    if (testCase.owner === "v04Readiness") {
      const v04Readiness = await readJson(v04ReadinessPath);
      v04Readiness.fileChecks = {
        ...(v04Readiness.fileChecks || {}),
        seededUncategorizedRuntime: { path: testCase.seededPath, exists: true }
      };
      await writeJson(v04ReadinessPath, v04Readiness);
      return;
    }
    if (testCase.owner === "claimBoundary") {
      const claimBoundary = await readJson(claimBoundaryPath);
      claimBoundary.fileChecks = {
        ...(claimBoundary.fileChecks || {}),
        seededUncategorizedRuntime: { path: testCase.seededPath, exists: true }
      };
      await writeJson(claimBoundaryPath, claimBoundary);
      return;
    }
  }
  if (testCase.target === "uncategorizedDocumentedEvidence") {
    const releaseReview = await readJson(releaseReviewPath);
    releaseReview.documentedEvidenceReferences = {
      ...(releaseReview.documentedEvidenceReferences || {}),
      references: [
        ...(releaseReview.documentedEvidenceReferences?.references || []),
        { docPath: "docs/VALIDATION.md", path: testCase.seededPath, exists: true }
      ],
      referenceCount: (releaseReview.documentedEvidenceReferences?.referenceCount || 0) + 1,
      missingReferenceCount: releaseReview.documentedEvidenceReferences?.missingReferenceCount || 0
    };
    await writeJson(releaseReviewPath, releaseReview);
    return;
  }
  if (testCase.target === "uncategorizedValidationCommand") {
    const releaseReview = await readJson(releaseReviewPath);
    releaseReview.validationCommands = [
      ...(releaseReview.validationCommands || []),
      testCase.seededCommand
    ];
    await writeJson(releaseReviewPath, releaseReview);
    return;
  }
  if (testCase.target === "uncategorizedPackageScript") {
    const packageJson = await readJson(packageJsonPath);
    packageJson.scripts = {
      ...(packageJson.scripts || {}),
      [testCase.seededScriptName]: testCase.seededScript
    };
    await writeJson(packageJsonPath, packageJson);
    return;
  }
  const targetPath = copiedDocs[testCase.target];
  await writeFile(targetPath, `${await readText(targetPath)}${testCase.appendText}`, "utf8");
}

function expectedProblemFound(result, testCase) {
  return (result?.problems || []).some((problem) =>
    problem.id === testCase.expectedProblemId &&
    JSON.stringify(problem).includes(testCase.expectedSurface)
  );
}

async function main() {
  await mkdir(FIXTURE_ROOT, { recursive: true });
  const startedAt = nowIso();
  const problems = [];
  const classifications = [];

  for (const requiredPath of [...Object.values(SOURCE_DOCS), SOURCE_RELEASE_REVIEW, SOURCE_CLEAN_CONSUMER_SMOKE, SOURCE_CLAIM_BOUNDARY, SOURCE_V04_READINESS, SOURCE_PACKAGE_JSON]) {
    if (!existsSync(resolve(PROJECT_ROOT, requiredPath))) {
      problems.push({ id: "required-source-missing", path: requiredPath });
    }
  }

  for (const testCase of CASES) {
    const caseRoot = resolve(FIXTURE_ROOT, testCase.id);
    const { copiedDocs, releaseReviewPath, cleanConsumerSmokePath, claimBoundaryPath, v04ReadinessPath, packageJsonPath } = await copyCanonicalInputs(caseRoot);
    await seedCase(testCase, caseRoot, copiedDocs, releaseReviewPath, cleanConsumerSmokePath, claimBoundaryPath, v04ReadinessPath, packageJsonPath);
    const command = runInventory(caseRoot, copiedDocs, releaseReviewPath, cleanConsumerSmokePath, claimBoundaryPath, v04ReadinessPath, packageJsonPath);
    const resultPath = resolve(caseRoot, "inventory-result.json");
    const result = existsSync(resultPath) ? await readJson(resultPath) : null;
    const blocked = command.status !== 0 && result?.status === "fail";
    const found = expectedProblemFound(result, testCase);
    if (!blocked || !found) {
      problems.push({
        id: "seeded-inventory-overclaim-not-detected",
        caseId: testCase.id,
        expectedProblemId: testCase.expectedProblemId,
        expectedSurface: testCase.expectedSurface,
        observed: {
          exitCode: command.status,
          status: result?.status || null,
          problems: result?.problems || null
        }
      });
    }
    classifications.push({
      id: testCase.id,
      status: blocked && found ? "pass" : "fail",
      expectedProblemId: testCase.expectedProblemId,
      expectedSurface: testCase.expectedSurface,
      commandExitCode: command.status,
      inventoryStatus: result?.status || null,
      expectedFailureFound: found,
      resultPath
    });
  }

  const result = {
    schemaVersion: "zoia.generated-patch-final-evidence-inventory-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    startedAt,
    completedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: CASES.length,
      passingCaseCount: classifications.filter((item) => item.status === "pass").length,
      expectedFailureFoundCount: classifications.filter((item) => item.expectedFailureFound).length
    },
    classifications,
    problems,
    artifacts: {
      resultPath: RESULT_PATH,
      fixtureRoot: FIXTURE_ROOT
    },
    claimBoundary: "This gate seeds overbroad final-inventory doc and release-review text in isolated fixtures and proves the inventory boundary scanner fails on those fixtures. It does not modify canonical docs or release-review evidence."
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    problemCount: result.summary.problemCount,
    caseCount: result.summary.caseCount,
    passingCaseCount: result.summary.passingCaseCount,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exit(1);
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.generated-patch-final-evidence-inventory-negative-controls-result.v1",
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
  process.exit(1);
});
