#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-clean-consumer-smoke-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const SOURCE_CLEAN_CONSUMER_SMOKE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json");
const MISSING_CLEAN_CONSUMER_SMOKE_PATH = resolve(EVIDENCE_ROOT, "missing-clean-consumer-smoke.json");
const DEGRADED_STALE_CLEAN_CONSUMER_SMOKE_PATH = resolve(EVIDENCE_ROOT, "degraded-stale-clean-consumer-smoke.json");
const BLOCKED_MISSING_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-missing-clean-smoke.json");
const BLOCKED_STALE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-stale-clean-smoke.json");
const JSON_SPACES = 2;

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

function runReleaseReview(cleanSmokePath, resultPath) {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(cleanSmokePath),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(resultPath)
    }
  });
}

function hasProtectedBoundary(result) {
  return (result?.protectedActionBlockers || [])
    .some((blocker) => blocker.status === "blocked-unless-exact-human-passcode-is-provided");
}

function cleanSmokeEvidence(result) {
  return (result?.evidence || []).find((item) => item.id === "cleanConsumerSmoke") || null;
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  if (!existsSync(SOURCE_CLEAN_CONSUMER_SMOKE_PATH)) {
    throw new Error(`Missing source clean consumer smoke evidence: ${SOURCE_CLEAN_CONSUMER_SMOKE_PATH}`);
  }

  const sourceCleanConsumerSmoke = await readJson(SOURCE_CLEAN_CONSUMER_SMOKE_PATH);
  const degradedStaleCleanConsumerSmoke = {
    ...sourceCleanConsumerSmoke,
    completedAt: "2000-01-01T00:00:00.000Z",
    generatedAt: "2000-01-01T00:00:00.000Z",
    negativeControl: true,
    negativeControlCase: "stale-clean-consumer-smoke"
  };
  await writeJson(DEGRADED_STALE_CLEAN_CONSUMER_SMOKE_PATH, degradedStaleCleanConsumerSmoke);

  const missingCommand = runReleaseReview(MISSING_CLEAN_CONSUMER_SMOKE_PATH, BLOCKED_MISSING_RELEASE_REVIEW_PATH);
  const missingResult = existsSync(BLOCKED_MISSING_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_MISSING_RELEASE_REVIEW_PATH)
    : null;
  const staleCommand = runReleaseReview(DEGRADED_STALE_CLEAN_CONSUMER_SMOKE_PATH, BLOCKED_STALE_RELEASE_REVIEW_PATH);
  const staleResult = existsSync(BLOCKED_STALE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_STALE_RELEASE_REVIEW_PATH)
    : null;

  const missingEvidenceBlocker = (missingResult?.blockers || [])
    .find((blocker) => blocker.id === "missing-release-review-evidence" && blocker.path === relativeToProject(MISSING_CLEAN_CONSUMER_SMOKE_PATH));
  const missingQualityBlocker = (missingResult?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-quality-failed" && blocker.problemId === "reviewer-summary-clean-consumer-smoke-missing");
  const staleEvidenceBlocker = (staleResult?.blockers || [])
    .find((blocker) => blocker.id === "release-review-evidence-stale" && blocker.evidenceId === "cleanConsumerSmoke");
  const missingCleanSmokeEvidence = cleanSmokeEvidence(missingResult);
  const staleCleanSmokeEvidence = cleanSmokeEvidence(staleResult);
  const problems = [];

  if (missingCommand.status === 0) {
    problems.push({
      id: "missing-clean-smoke-release-review-command-passed",
      message: "Release-review summary command passed with missing clean consumer smoke evidence."
    });
  }
  if (!missingResult) {
    problems.push({
      id: "missing-clean-smoke-release-review-result-missing",
      message: "Missing-clean-smoke release-review result was not written.",
      evidencePath: BLOCKED_MISSING_RELEASE_REVIEW_PATH
    });
  } else {
    if (missingResult.status !== "blocked") {
      problems.push({
        id: "missing-clean-smoke-release-review-not-blocked",
        message: "Release-review summary did not block with missing clean consumer smoke evidence.",
        evidencePath: BLOCKED_MISSING_RELEASE_REVIEW_PATH,
        observed: { status: missingResult.status }
      });
    }
    if (!missingEvidenceBlocker) {
      problems.push({
        id: "missing-clean-smoke-evidence-blocker-missing",
        message: "Release-review summary did not report missing clean consumer smoke evidence.",
        evidencePath: BLOCKED_MISSING_RELEASE_REVIEW_PATH,
        observed: { blockers: missingResult.blockers || [] }
      });
    }
    if (!missingQualityBlocker) {
      problems.push({
        id: "missing-clean-smoke-quality-blocker-missing",
        message: "Release-review summary did not report clean consumer smoke quality failure for missing evidence.",
        evidencePath: BLOCKED_MISSING_RELEASE_REVIEW_PATH,
        observed: { blockers: missingResult.blockers || [] }
      });
    }
    if (missingCleanSmokeEvidence?.exists !== false) {
      problems.push({
        id: "missing-clean-smoke-evidence-marker-invalid",
        message: "Release-review summary did not record clean consumer smoke as a missing evidence item.",
        evidencePath: BLOCKED_MISSING_RELEASE_REVIEW_PATH,
        observed: missingCleanSmokeEvidence
      });
    }
    if (!hasProtectedBoundary(missingResult)) {
      problems.push({
        id: "missing-clean-smoke-protected-boundary-missing",
        message: "Blocked release-review summary did not preserve the protected source-control boundary.",
        evidencePath: BLOCKED_MISSING_RELEASE_REVIEW_PATH
      });
    }
  }

  if (staleCommand.status === 0) {
    problems.push({
      id: "stale-clean-smoke-release-review-command-passed",
      message: "Release-review summary command passed with stale clean consumer smoke evidence."
    });
  }
  if (!staleResult) {
    problems.push({
      id: "stale-clean-smoke-release-review-result-missing",
      message: "Stale-clean-smoke release-review result was not written.",
      evidencePath: BLOCKED_STALE_RELEASE_REVIEW_PATH
    });
  } else {
    if (staleResult.status !== "blocked") {
      problems.push({
        id: "stale-clean-smoke-release-review-not-blocked",
        message: "Release-review summary did not block with stale clean consumer smoke evidence.",
        evidencePath: BLOCKED_STALE_RELEASE_REVIEW_PATH,
        observed: { status: staleResult.status }
      });
    }
    if (!staleEvidenceBlocker) {
      problems.push({
        id: "stale-clean-smoke-evidence-blocker-missing",
        message: "Release-review summary did not report stale clean consumer smoke evidence.",
        evidencePath: BLOCKED_STALE_RELEASE_REVIEW_PATH,
        observed: { blockers: staleResult.blockers || [] }
      });
    }
    if (staleCleanSmokeEvidence?.exists !== true || staleCleanSmokeEvidence?.status !== "pass") {
      problems.push({
        id: "stale-clean-smoke-evidence-marker-invalid",
        message: "Release-review summary did not record stale clean consumer smoke as consumed evidence.",
        evidencePath: BLOCKED_STALE_RELEASE_REVIEW_PATH,
        observed: staleCleanSmokeEvidence
      });
    }
    if (!hasProtectedBoundary(staleResult)) {
      problems.push({
        id: "stale-clean-smoke-protected-boundary-missing",
        message: "Blocked release-review summary did not preserve the protected source-control boundary.",
        evidencePath: BLOCKED_STALE_RELEASE_REVIEW_PATH
      });
    }
  }

  const result = {
    schemaVersion: "zoia.release-review-clean-consumer-smoke-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: 2,
      passingCaseCount: [
        missingEvidenceBlocker && missingQualityBlocker && missingCleanSmokeEvidence?.exists === false && hasProtectedBoundary(missingResult),
        staleEvidenceBlocker && staleCleanSmokeEvidence?.exists === true && staleCleanSmokeEvidence?.status === "pass" && hasProtectedBoundary(staleResult)
      ].filter(Boolean).length,
      missingReleaseReviewCommandExitCode: missingCommand.status,
      missingReleaseReviewStatus: missingResult?.status || null,
      missingCleanConsumerSmokeEvidenceBlockerFound: Boolean(missingEvidenceBlocker),
      missingCleanConsumerSmokeQualityBlockerFound: Boolean(missingQualityBlocker),
      missingCleanConsumerSmokeEvidenceMarkerFound: missingCleanSmokeEvidence?.exists === false,
      missingProtectedBoundaryFound: hasProtectedBoundary(missingResult),
      staleReleaseReviewCommandExitCode: staleCommand.status,
      staleReleaseReviewStatus: staleResult?.status || null,
      staleCleanConsumerSmokeEvidenceBlockerFound: Boolean(staleEvidenceBlocker),
      staleCleanConsumerSmokeEvidenceMarkerFound: staleCleanSmokeEvidence?.exists === true && staleCleanSmokeEvidence?.status === "pass",
      staleProtectedBoundaryFound: hasProtectedBoundary(staleResult)
    },
    cases: [
      {
        id: "missing-clean-consumer-smoke",
        expectedFailureSurface: "release-review summary blocks with missing-release-review-evidence and clean-smoke quality failure",
        commandExitCode: missingCommand.status,
        blockedResultPath: BLOCKED_MISSING_RELEASE_REVIEW_PATH,
        evidencePath: MISSING_CLEAN_CONSUMER_SMOKE_PATH,
        blockerFound: Boolean(missingEvidenceBlocker),
        qualityBlockerFound: Boolean(missingQualityBlocker),
        evidenceMarkerFound: missingCleanSmokeEvidence?.exists === false,
        protectedBoundaryFound: hasProtectedBoundary(missingResult)
      },
      {
        id: "stale-clean-consumer-smoke",
        expectedFailureSurface: "release-review summary blocks with release-review-evidence-stale for cleanConsumerSmoke",
        commandExitCode: staleCommand.status,
        blockedResultPath: BLOCKED_STALE_RELEASE_REVIEW_PATH,
        evidencePath: DEGRADED_STALE_CLEAN_CONSUMER_SMOKE_PATH,
        blockerFound: Boolean(staleEvidenceBlocker),
        evidenceMarkerFound: staleCleanSmokeEvidence?.exists === true && staleCleanSmokeEvidence?.status === "pass",
        protectedBoundaryFound: hasProtectedBoundary(staleResult)
      }
    ],
    command: {
      missingStdout: missingCommand.stdout,
      missingStderr: missingCommand.stderr,
      staleStdout: staleCommand.stdout,
      staleStderr: staleCommand.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies release-review summary blocks directly when clean consumer smoke evidence is missing or stale. It does not modify canonical release-review or clean consumer smoke evidence.",
    artifacts: {
      resultPath: RESULT_PATH,
      sourceCleanConsumerSmokePath: SOURCE_CLEAN_CONSUMER_SMOKE_PATH,
      missingCleanConsumerSmokePath: MISSING_CLEAN_CONSUMER_SMOKE_PATH,
      degradedStaleCleanConsumerSmokePath: DEGRADED_STALE_CLEAN_CONSUMER_SMOKE_PATH,
      blockedMissingReleaseReviewPath: BLOCKED_MISSING_RELEASE_REVIEW_PATH,
      blockedStaleReleaseReviewPath: BLOCKED_STALE_RELEASE_REVIEW_PATH
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
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.release-review-clean-consumer-smoke-negative-controls-result.v1",
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
