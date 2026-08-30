#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-overclaim-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const CLASSIFICATION_LOG_PATH = resolve(EVIDENCE_ROOT, "classification-log.json");
const STIMULUS_MANIFEST_PATH = resolve(EVIDENCE_ROOT, "seeded-summary-manifest.json");
const SEED_ROOT = resolve(EVIDENCE_ROOT, "seeded-summaries");
const RELEASE_REVIEW_SUMMARY_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-summary/run-result.json");
const CAPABILITY_DOC_PATH = resolve(PROJECT_ROOT, "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md");
const TEST_MATRIX_PATH = resolve(PROJECT_ROOT, "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md");
const JSON_SPACES = 2;

const SEEDS = Object.freeze([
  {
    id: "ready-for-review-overclaim",
    expectedSurface: "release-readiness",
    text: "This generated-patch feature is ready_for_review and release-ready for v0.4."
  },
  {
    id: "broad-text-to-zoia-overclaim",
    expectedSurface: "prompt-boundary",
    text: "The workflow now supports broad text-to-ZOIA generation and arbitrary prompt support."
  },
  {
    id: "audible-cutoff-sweep-overclaim",
    expectedSurface: "blocked-audio-claim",
    text: "Generated filter now has broad audible cutoff sweep support for arbitrary filter prompts."
  },
  {
    id: "unsupported-non-delay-runtime-overclaim",
    expectedSurface: "unsupported-runtime",
    text: "Synth, sequencer, modulation-only, MIDI, and sampler prompts have runtime support."
  },
  {
    id: "hardware-export-parity-overclaim",
    expectedSurface: "hardware-boundary",
    text: "Generated patches now have hardware export, hardware parity, full DSP accuracy, and complete patch semantics."
  }
]);

const FORBIDDEN_PATTERNS = Object.freeze([
  {
    surface: "release-readiness",
    pattern: /\bready_for_review\b|\brelease[- ]ready\b|\bready for release\b/iu
  },
  {
    surface: "prompt-boundary",
    pattern: /\bbroad text-to-ZOIA\b|\barbitrary prompt support\b|\bany text prompt\b/iu
  },
  {
    surface: "blocked-audio-claim",
    pattern: /\bbroad audible cutoff sweep support\b|\barbitrary filter prompts?\b[\s\S]{0,80}\baudible cutoff sweep\b/iu
  },
  {
    surface: "unsupported-runtime",
    pattern: /\b(?:synth|sequencer|modulation-only|MIDI|sampler)\b[\s\S]{0,160}\bruntime support\b/iu
  },
  {
    surface: "hardware-boundary",
    pattern: /\bhardware export\b|\bhardware parity\b|\bfull DSP accuracy\b|\bcomplete patch semantics\b|\bbinary export\b/iu
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

function findPhrase(text, phrase) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

async function baselineBoundaryChecks() {
  const releaseReview = await readJson(RELEASE_REVIEW_SUMMARY_PATH);
  const capabilityDoc = await readText(CAPABILITY_DOC_PATH);
  const testMatrix = await readText(TEST_MATRIX_PATH);
  const claimBoundaryText = (releaseReview.claimBoundaries || []).join("\n");
  const protectedBoundaryPresent = (releaseReview.protectedActionBlockers || [])
    .some((blocker) => blocker.status === "blocked-unless-exact-human-passcode-is-provided");
  const checks = [
    {
      id: "release-review-summary-consumable",
      status: releaseReview.schemaVersion === "zoia.release-review-summary.v1" ? "pass" : "fail",
      observed: releaseReview.status
    },
    {
      id: "claim-boundary-bounded-runtime-audio",
      status: findPhrase(claimBoundaryText, "bounded runtime/audio evidence") ? "pass" : "fail"
    },
    {
      id: "claim-boundary-no-binary-export",
      status: findPhrase(claimBoundaryText, "does not claim binary .bin export") ? "pass" : "fail"
    },
    {
      id: "protected-source-control-boundary",
      status: protectedBoundaryPresent ? "pass" : "fail"
    },
    {
      id: "capability-doc-bounded-audible-sweep",
      status: findPhrase(capabilityDoc, "bounded generated audible cutoff sweep as supported") &&
        findPhrase(capabilityDoc, "does not prove resonance semantics")
        ? "pass"
        : "fail"
    },
    {
      id: "test-matrix-next-overclaim-control",
      status: findPhrase(testMatrix, "Release-review human-facing summary overclaims are rejected") ? "pass" : "fail"
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

  for (const requiredPath of [RELEASE_REVIEW_SUMMARY_PATH, CAPABILITY_DOC_PATH, TEST_MATRIX_PATH]) {
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
      id: "baseline-boundary-invalid",
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
        id: "seeded-overclaim-not-detected",
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
    schemaVersion: "zoia.release-review-overclaim-negative-controls-manifest.v1",
    generatedAt: nowIso(),
    seedCount: SEEDS.length,
    seeds: classifications.map((item) => ({
      id: item.id,
      expectedSurface: item.expectedSurface,
      seedPath: item.seedPath
    }))
  };
  const classificationLog = {
    schemaVersion: "zoia.release-review-overclaim-negative-controls-classification-log.v1",
    generatedAt: nowIso(),
    classifications
  };
  await writeJson(STIMULUS_MANIFEST_PATH, manifest);
  await writeJson(CLASSIFICATION_LOG_PATH, classificationLog);

  const result = {
    schemaVersion: "zoia.release-review-overclaim-negative-controls-result.v1",
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
    claimBoundary: "This gate checks consumed release-review summary text and generated-patch capability documents for overclaim protection. It does not mark work ready for review or expand runtime/audio support.",
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
