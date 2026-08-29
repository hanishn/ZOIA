#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const CLASSIFICATION_LOG_PATH = resolve(EVIDENCE_ROOT, "classification-log.json");
const STIMULUS_MANIFEST_PATH = resolve(EVIDENCE_ROOT, "seeded-summary-manifest.json");
const SEED_ROOT = resolve(EVIDENCE_ROOT, "seeded-summaries");
const RELEASE_REVIEW_SUMMARY_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-summary/run-result.json");
const CLEAN_CONSUMER_SMOKE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json");
const CAPABILITY_DOC_PATH = resolve(PROJECT_ROOT, "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md");
const TEST_MATRIX_PATH = resolve(PROJECT_ROOT, "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md");
const JSON_SPACES = 2;

const SEEDS = Object.freeze([
  {
    id: "npm-package-ready-publishable",
    expectedSurface: "npm-publication-readiness",
    text: "The local package boundary smoke proves the npm package is ready and publishable."
  },
  {
    id: "evidence-bundle-published",
    expectedSurface: "evidence-bundle-publication",
    text: "The copied generated-patch evidence bundle is published and ready for external consumers."
  },
  {
    id: "release-ready",
    expectedSurface: "release-readiness",
    text: "The clean consumer smoke means the v0.4 release is ready_for_review and release-ready."
  },
  {
    id: "package-artifact-proves-github-npm-publication",
    expectedSurface: "publication-proof",
    text: "The package artifact proves GitHub and npm publication readiness."
  },
  {
    id: "clean-consumer-smoke-proves-publication-readiness",
    expectedSurface: "broader-publication-readiness",
    text: "Clean consumer smoke proves broader publication readiness for the package and copied evidence."
  }
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  {
    surface: "npm-publication-readiness",
    pattern: /\bnpm package\b[\s\S]{0,120}\b(?:ready|publishable|publish readiness|ready to publish)\b/iu
  },
  {
    surface: "evidence-bundle-publication",
    pattern: /\b(?:copied )?(?:generated-patch )?evidence bundle\b[\s\S]{0,120}\b(?:published|external consumers|publication)\b/iu
  },
  {
    surface: "release-readiness",
    pattern: /\bready_for_review\b|\brelease[- ]ready\b|\bready for release\b/iu
  },
  {
    surface: "publication-proof",
    pattern: /\bpackage artifact\b[\s\S]{0,160}\b(?:GitHub|npm)\b[\s\S]{0,120}\bpublication readiness\b/iu
  },
  {
    surface: "broader-publication-readiness",
    pattern: /\bclean consumer smoke\b[\s\S]{0,160}\bbroader publication readiness\b/iu
  }
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function readText(path) {
  return readFile(path, "utf8");
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function classifyText(text) {
  return FORBIDDEN_PATTERNS
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.surface);
}

function includesPhrase(text, phrase) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

async function baselineBoundaryChecks() {
  const releaseReview = await readJson(RELEASE_REVIEW_SUMMARY_PATH);
  const cleanConsumerSmoke = await readJson(CLEAN_CONSUMER_SMOKE_PATH);
  const capabilityDoc = await readText(CAPABILITY_DOC_PATH);
  const testMatrix = await readText(TEST_MATRIX_PATH);
  const claimBoundaryText = [
    ...(releaseReview.claimBoundaries || []),
    cleanConsumerSmoke.claimBoundary || "",
    capabilityDoc,
    testMatrix
  ].join("\n");
  const protectedBoundaryPresent = (releaseReview.protectedActionBlockers || [])
    .some((blocker) => blocker.status === "blocked-unless-exact-human-passcode-is-provided");
  const checks = [
    {
      id: "release-review-summary-consumable",
      status: releaseReview.schemaVersion === "zoia.release-review-summary.v1" ? "pass" : "fail",
      observed: releaseReview.status
    },
    {
      id: "clean-consumer-smoke-package-fields-present",
      status: cleanConsumerSmoke.summary?.packageMetadataValid === true &&
        cleanConsumerSmoke.summary?.packageScriptReferenceCount === 4 &&
        cleanConsumerSmoke.summary?.packageScriptMissingReferenceCount === 0 &&
        cleanConsumerSmoke.summary?.copiedEvidenceNegativeControlCount >= 4 &&
        cleanConsumerSmoke.summary?.copiedEvidencePassingNegativeControlCount >= 4
        ? "pass"
        : "fail",
      observed: {
        status: cleanConsumerSmoke.status,
        summary: cleanConsumerSmoke.summary || null
      }
    },
    {
      id: "protected-source-control-publication-boundary",
      status: protectedBoundaryPresent ? "pass" : "fail"
    },
    {
      id: "package-boundary-not-publication-readiness",
      status: includesPhrase(claimBoundaryText, "not npm publication readiness") ||
        includesPhrase(claimBoundaryText, "does not prove npm publication readiness")
        ? "pass"
        : "fail"
    },
    {
      id: "package-boundary-not-release-readiness",
      status: includesPhrase(claimBoundaryText, "not release readiness") ||
        includesPhrase(claimBoundaryText, "does not mark work ready")
        ? "pass"
        : "fail"
    },
    {
      id: "package-boundary-not-github-readiness",
      status: includesPhrase(claimBoundaryText, "not GitHub readiness") ||
        includesPhrase(claimBoundaryText, "does not prove GitHub")
        ? "pass"
        : "fail"
    },
    {
      id: "capability-doc-package-overclaim-controls",
      status: includesPhrase(capabilityDoc, "Package-boundary overclaim controls") &&
        includesPhrase(testMatrix, "package-boundary summary overclaims")
        ? "pass"
        : "fail"
    }
  ];
  return {
    status: checks.every((check) => check.status === "pass") ? "pass" : "fail",
    checks
  };
}

async function main() {
  await mkdir(SEED_ROOT, { recursive: true });
  const startedAt = nowIso();
  const problems = [];

  for (const requiredPath of [RELEASE_REVIEW_SUMMARY_PATH, CLEAN_CONSUMER_SMOKE_PATH, CAPABILITY_DOC_PATH, TEST_MATRIX_PATH]) {
    if (!existsSync(requiredPath)) {
      problems.push({
        id: "required-source-missing",
        path: requiredPath
      });
    }
  }

  const baseline = problems.length === 0 ? await baselineBoundaryChecks() : { status: "fail", checks: [] };
  if (baseline.status !== "pass") {
    problems.push({
      id: "baseline-package-boundary-invalid",
      checks: baseline.checks
    });
  }

  const classifications = [];
  for (const seed of SEEDS) {
    const seedPath = resolve(SEED_ROOT, `${seed.id}.json`);
    await writeJson(seedPath, {
      id: seed.id,
      text: seed.text,
      expectedSurface: seed.expectedSurface,
      negativeControl: true
    });
    const surfaces = classifyText(seed.text);
    const expectedFailureFound = surfaces.includes(seed.expectedSurface);
    const status = expectedFailureFound ? "pass" : "fail";
    if (status !== "pass") {
      problems.push({
        id: "seeded-package-boundary-overclaim-not-detected",
        seedId: seed.id,
        expectedSurface: seed.expectedSurface,
        observedSurfaces: surfaces
      });
    }
    classifications.push({
      id: seed.id,
      status,
      expectedSurface: seed.expectedSurface,
      observedSurfaces: surfaces,
      expectedFailureFound,
      seedPath
    });
  }

  const manifest = {
    schemaVersion: "zoia.release-review-package-boundary-overclaim-negative-controls-manifest.v1",
    generatedAt: nowIso(),
    seedCount: SEEDS.length,
    seeds: classifications.map((item) => ({
      id: item.id,
      expectedSurface: item.expectedSurface,
      seedPath: item.seedPath
    }))
  };
  const classificationLog = {
    schemaVersion: "zoia.release-review-package-boundary-overclaim-negative-controls-classification-log.v1",
    generatedAt: nowIso(),
    classifications
  };
  await writeJson(STIMULUS_MANIFEST_PATH, manifest);
  await writeJson(CLASSIFICATION_LOG_PATH, classificationLog);

  const result = {
    schemaVersion: "zoia.release-review-package-boundary-overclaim-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    startedAt,
    completedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      baselineBoundaryStatus: baseline.status,
      caseCount: SEEDS.length,
      passingCaseCount: classifications.filter((item) => item.status === "pass").length,
      seededFailureCount: SEEDS.length,
      expectedFailureFoundCount: classifications.filter((item) => item.expectedFailureFound).length
    },
    baseline,
    classifications,
    problems,
    claimBoundary: "This gate checks human-facing package-boundary summary text. It proves local clean consumer package-boundary evidence is not described as npm publication readiness, GitHub readiness, copied evidence publication, release readiness, or broader publication readiness.",
    artifacts: {
      resultPath: RESULT_PATH,
      manifestPath: STIMULUS_MANIFEST_PATH,
      classificationLogPath: CLASSIFICATION_LOG_PATH,
      seedRoot: SEED_ROOT
    }
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

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
