#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-freshness-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const DEGRADED_CANDIDATE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "degraded-candidate-review.json");
const DEGRADED_GENERATED_VALIDATION_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-validation.json");
const DEGRADED_CLEAN_CONSUMER_SMOKE_PATH = resolve(EVIDENCE_ROOT, "degraded-clean-consumer-smoke.json");
const BLOCKED_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary.json");
const BLOCKED_RELEASE_REVIEW_VALIDATION_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-stale-validation.json");
const BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-stale-clean-smoke.json");
const BLOCKED_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-stale-candidate-review.json");
const BLOCKED_V04_VALIDATION_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-stale-validation.json");
const BLOCKED_V04_CLEAN_SMOKE_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-stale-clean-smoke.json");
const SOURCE_CANDIDATE_REVIEW_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-candidate-review/run-result.json");
const SOURCE_GENERATED_VALIDATION_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-validation/run-result.json");
const SOURCE_CLEAN_CONSUMER_SMOKE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json");
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

function runReleaseReviewWithStaleCandidateReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_PATH: relativeToProject(DEGRADED_CANDIDATE_REVIEW_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_PATH)
    }
  });
}

function runReleaseReviewWithStaleGeneratedValidation() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_VALIDATION_PATH: relativeToProject(DEGRADED_GENERATED_VALIDATION_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_VALIDATION_PATH)
    }
  });
}

function runReleaseReviewWithStaleCleanConsumerSmoke() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_CLEAN_CONSUMER_SMOKE_PATH: relativeToProject(DEGRADED_CLEAN_CONSUMER_SMOKE_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH)
    }
  });
}

function runV04WithBlockedReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_PATH)
    }
  });
}

function runV04WithBlockedValidationReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_VALIDATION_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_VALIDATION_PATH)
    }
  });
}

function runV04WithBlockedCleanSmokeReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_V04_CLEAN_SMOKE_PATH)
    }
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  if (!existsSync(SOURCE_CANDIDATE_REVIEW_PATH)) {
    throw new Error(`Missing source candidate-review evidence: ${SOURCE_CANDIDATE_REVIEW_PATH}`);
  }
  if (!existsSync(SOURCE_GENERATED_VALIDATION_PATH)) {
    throw new Error(`Missing source generated validation evidence: ${SOURCE_GENERATED_VALIDATION_PATH}`);
  }
  if (!existsSync(SOURCE_CLEAN_CONSUMER_SMOKE_PATH)) {
    throw new Error(`Missing source clean consumer smoke evidence: ${SOURCE_CLEAN_CONSUMER_SMOKE_PATH}`);
  }

  const source = await readJson(SOURCE_CANDIDATE_REVIEW_PATH);
  const sourceGeneratedValidation = await readJson(SOURCE_GENERATED_VALIDATION_PATH);
  const sourceCleanConsumerSmoke = await readJson(SOURCE_CLEAN_CONSUMER_SMOKE_PATH);
  const degraded = {
    ...source,
    generatedAt: "2000-01-01T00:00:00.000Z",
    negativeControl: true
  };
  await writeJson(DEGRADED_CANDIDATE_REVIEW_PATH, degraded);
  const degradedGeneratedValidation = {
    ...sourceGeneratedValidation,
    generatedAt: "2000-01-01T00:00:00.000Z",
    negativeControl: true
  };
  await writeJson(DEGRADED_GENERATED_VALIDATION_PATH, degradedGeneratedValidation);
  const degradedCleanConsumerSmoke = {
    ...sourceCleanConsumerSmoke,
    completedAt: "2000-01-01T00:00:00.000Z",
    generatedAt: "2000-01-01T00:00:00.000Z",
    negativeControl: true
  };
  await writeJson(DEGRADED_CLEAN_CONSUMER_SMOKE_PATH, degradedCleanConsumerSmoke);

  const releaseReviewCommand = runReleaseReviewWithStaleCandidateReview();
  const blockedReleaseReview = existsSync(BLOCKED_RELEASE_REVIEW_PATH) ? await readJson(BLOCKED_RELEASE_REVIEW_PATH) : null;
  const staleBlocker = (blockedReleaseReview?.blockers || [])
    .find((blocker) => blocker.id === "release-review-evidence-stale" && blocker.evidenceId === "generatedPatchCandidateReview");

  const v04Command = runV04WithBlockedReleaseReview();
  const blockedV04 = existsSync(BLOCKED_V04_PATH) ? await readJson(BLOCKED_V04_PATH) : null;
  const v04Blocker = (blockedV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");
  const validationReleaseReviewCommand = runReleaseReviewWithStaleGeneratedValidation();
  const blockedValidationReleaseReview = existsSync(BLOCKED_RELEASE_REVIEW_VALIDATION_PATH)
    ? await readJson(BLOCKED_RELEASE_REVIEW_VALIDATION_PATH)
    : null;
  const validationStaleBlocker = (blockedValidationReleaseReview?.blockers || [])
    .find((blocker) => blocker.id === "release-review-evidence-stale" && blocker.evidenceId === "generatedPatchValidation");
  const validationV04Command = runV04WithBlockedValidationReleaseReview();
  const blockedValidationV04 = existsSync(BLOCKED_V04_VALIDATION_PATH) ? await readJson(BLOCKED_V04_VALIDATION_PATH) : null;
  const validationV04Blocker = (blockedValidationV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");
  const cleanSmokeReleaseReviewCommand = runReleaseReviewWithStaleCleanConsumerSmoke();
  const blockedCleanSmokeReleaseReview = existsSync(BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH)
    ? await readJson(BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH)
    : null;
  const cleanSmokeStaleBlocker = (blockedCleanSmokeReleaseReview?.blockers || [])
    .find((blocker) => blocker.id === "release-review-evidence-stale" && blocker.evidenceId === "cleanConsumerSmoke");
  const cleanSmokeV04Command = runV04WithBlockedCleanSmokeReleaseReview();
  const blockedCleanSmokeV04 = existsSync(BLOCKED_V04_CLEAN_SMOKE_PATH) ? await readJson(BLOCKED_V04_CLEAN_SMOKE_PATH) : null;
  const cleanSmokeV04Blocker = (blockedCleanSmokeV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const problems = [];
  if (releaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-freshness-negative-control-command-passed",
      message: "Release-review summary passed with stale candidate-review evidence."
    });
  }
  if (!blockedReleaseReview) {
    problems.push({
      id: "blocked-release-review-result-missing",
      message: "Blocked release-review summary was not written.",
      evidencePath: BLOCKED_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-release-review-status-invalid",
        message: "Release-review summary did not block with stale candidate-review evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_PATH,
        observed: { status: blockedReleaseReview.status }
      });
    }
    if (!staleBlocker) {
      problems.push({
        id: "candidate-review-stale-blocker-missing",
        message: "Release-review summary did not report stale candidate-review evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedReleaseReview.blockers || [] }
      });
    }
  }
  if (v04Command.status === 0) {
    problems.push({
      id: "v04-freshness-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary."
    });
  }
  if (!blockedV04) {
    problems.push({
      id: "blocked-v04-result-missing",
      message: "Blocked v0.4 readiness result was not written.",
      evidencePath: BLOCKED_V04_PATH
    });
  } else {
    if (blockedV04.status !== "blocked") {
      problems.push({
        id: "blocked-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary.",
        evidencePath: BLOCKED_V04_PATH,
        observed: { status: blockedV04.status }
      });
    }
    if (!v04Blocker) {
      problems.push({
        id: "v04-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed.",
        evidencePath: BLOCKED_V04_PATH,
        observed: { blockers: blockedV04.blockers || [] }
      });
    }
  }
  if (validationReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-validation-freshness-negative-control-command-passed",
      message: "Release-review summary passed with stale generated validation evidence."
    });
  }
  if (!blockedValidationReleaseReview) {
    problems.push({
      id: "blocked-validation-release-review-result-missing",
      message: "Blocked release-review summary for stale generated validation was not written.",
      evidencePath: BLOCKED_RELEASE_REVIEW_VALIDATION_PATH
    });
  } else {
    if (blockedValidationReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-validation-release-review-status-invalid",
        message: "Release-review summary did not block with stale generated validation evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_VALIDATION_PATH,
        observed: { status: blockedValidationReleaseReview.status }
      });
    }
    if (!validationStaleBlocker) {
      problems.push({
        id: "generated-validation-stale-blocker-missing",
        message: "Release-review summary did not report stale generated validation evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_VALIDATION_PATH,
        observed: { blockers: blockedValidationReleaseReview.blockers || [] }
      });
    }
  }
  if (validationV04Command.status === 0) {
    problems.push({
      id: "v04-validation-freshness-negative-control-command-passed",
      message: "v0.4 readiness passed with release-review summary blocked by stale generated validation."
    });
  }
  if (!blockedValidationV04) {
    problems.push({
      id: "blocked-validation-v04-result-missing",
      message: "Blocked v0.4 readiness result for stale generated validation was not written.",
      evidencePath: BLOCKED_V04_VALIDATION_PATH
    });
  } else {
    if (blockedValidationV04.status !== "blocked") {
      problems.push({
        id: "blocked-validation-v04-status-invalid",
        message: "v0.4 readiness did not block with release-review summary blocked by stale generated validation.",
        evidencePath: BLOCKED_V04_VALIDATION_PATH,
        observed: { status: blockedValidationV04.status }
      });
    }
    if (!validationV04Blocker) {
      problems.push({
        id: "v04-validation-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for stale generated validation.",
        evidencePath: BLOCKED_V04_VALIDATION_PATH,
        observed: { blockers: blockedValidationV04.blockers || [] }
      });
    }
  }
  if (cleanSmokeReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-clean-smoke-freshness-negative-control-command-passed",
      message: "Release-review summary passed with stale clean consumer smoke evidence."
    });
  }
  if (!blockedCleanSmokeReleaseReview) {
    problems.push({
      id: "blocked-clean-smoke-release-review-result-missing",
      message: "Blocked release-review summary for stale clean consumer smoke was not written.",
      evidencePath: BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH
    });
  } else {
    if (blockedCleanSmokeReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-clean-smoke-release-review-status-invalid",
        message: "Release-review summary did not block with stale clean consumer smoke evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH,
        observed: { status: blockedCleanSmokeReleaseReview.status }
      });
    }
    if (!cleanSmokeStaleBlocker) {
      problems.push({
        id: "clean-smoke-stale-blocker-missing",
        message: "Release-review summary did not report stale clean consumer smoke evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH,
        observed: { blockers: blockedCleanSmokeReleaseReview.blockers || [] }
      });
    }
  }
  if (cleanSmokeV04Command.status === 0) {
    problems.push({
      id: "v04-clean-smoke-freshness-negative-control-command-passed",
      message: "v0.4 readiness passed with release-review summary blocked by stale clean consumer smoke."
    });
  }
  if (!blockedCleanSmokeV04) {
    problems.push({
      id: "blocked-clean-smoke-v04-result-missing",
      message: "Blocked v0.4 readiness result for stale clean consumer smoke was not written.",
      evidencePath: BLOCKED_V04_CLEAN_SMOKE_PATH
    });
  } else {
    if (blockedCleanSmokeV04.status !== "blocked") {
      problems.push({
        id: "blocked-clean-smoke-v04-status-invalid",
        message: "v0.4 readiness did not block with release-review summary blocked by stale clean consumer smoke.",
        evidencePath: BLOCKED_V04_CLEAN_SMOKE_PATH,
        observed: { status: blockedCleanSmokeV04.status }
      });
    }
    if (!cleanSmokeV04Blocker) {
      problems.push({
        id: "v04-clean-smoke-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for stale clean consumer smoke.",
        evidencePath: BLOCKED_V04_CLEAN_SMOKE_PATH,
        observed: { blockers: blockedCleanSmokeV04.blockers || [] }
      });
    }
  }

  const result = {
    schemaVersion: "zoia.release-review-freshness-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: 3,
      passingCaseCount: [
        staleBlocker && v04Blocker,
        validationStaleBlocker && validationV04Blocker,
        cleanSmokeStaleBlocker && cleanSmokeV04Blocker
      ].filter(Boolean).length,
      releaseReviewCommandExitCode: releaseReviewCommand.status,
      blockedReleaseReviewStatus: blockedReleaseReview?.status || null,
      candidateReviewStaleBlockerFound: Boolean(staleBlocker),
      v04CommandExitCode: v04Command.status,
      blockedV04Status: blockedV04?.status || null,
      v04ReleaseReviewBlockerFound: Boolean(v04Blocker),
      validationReleaseReviewCommandExitCode: validationReleaseReviewCommand.status,
      blockedValidationReleaseReviewStatus: blockedValidationReleaseReview?.status || null,
      generatedValidationStaleBlockerFound: Boolean(validationStaleBlocker),
      validationV04CommandExitCode: validationV04Command.status,
      blockedValidationV04Status: blockedValidationV04?.status || null,
      validationV04ReleaseReviewBlockerFound: Boolean(validationV04Blocker),
      cleanSmokeReleaseReviewCommandExitCode: cleanSmokeReleaseReviewCommand.status,
      blockedCleanSmokeReleaseReviewStatus: blockedCleanSmokeReleaseReview?.status || null,
      cleanConsumerSmokeStaleBlockerFound: Boolean(cleanSmokeStaleBlocker),
      cleanSmokeV04CommandExitCode: cleanSmokeV04Command.status,
      blockedCleanSmokeV04Status: blockedCleanSmokeV04?.status || null,
      cleanSmokeV04ReleaseReviewBlockerFound: Boolean(cleanSmokeV04Blocker)
    },
    command: {
      releaseReviewStdout: releaseReviewCommand.stdout,
      releaseReviewStderr: releaseReviewCommand.stderr,
      v04Stdout: v04Command.stdout,
      v04Stderr: v04Command.stderr,
      validationReleaseReviewStdout: validationReleaseReviewCommand.stdout,
      validationReleaseReviewStderr: validationReleaseReviewCommand.stderr,
      validationV04Stdout: validationV04Command.stdout,
      validationV04Stderr: validationV04Command.stderr,
      cleanSmokeReleaseReviewStdout: cleanSmokeReleaseReviewCommand.stdout,
      cleanSmokeReleaseReviewStderr: cleanSmokeReleaseReviewCommand.stderr,
      cleanSmokeV04Stdout: cleanSmokeV04Command.stdout,
      cleanSmokeV04Stderr: cleanSmokeV04Command.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies stale generated candidate-review, generated validation, and clean consumer smoke evidence block release-review summary and v0.4 readiness through isolated evidence paths.",
    artifacts: {
      resultPath: RESULT_PATH,
      degradedCandidateReviewPath: DEGRADED_CANDIDATE_REVIEW_PATH,
      degradedGeneratedValidationPath: DEGRADED_GENERATED_VALIDATION_PATH,
      degradedCleanConsumerSmokePath: DEGRADED_CLEAN_CONSUMER_SMOKE_PATH,
      blockedReleaseReviewPath: BLOCKED_RELEASE_REVIEW_PATH,
      blockedValidationReleaseReviewPath: BLOCKED_RELEASE_REVIEW_VALIDATION_PATH,
      blockedCleanSmokeReleaseReviewPath: BLOCKED_RELEASE_REVIEW_CLEAN_SMOKE_PATH,
      blockedV04Path: BLOCKED_V04_PATH,
      blockedValidationV04Path: BLOCKED_V04_VALIDATION_PATH,
      blockedCleanSmokeV04Path: BLOCKED_V04_CLEAN_SMOKE_PATH
    }
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH,
    blockedReleaseReviewPath: BLOCKED_RELEASE_REVIEW_PATH,
    blockedV04Path: BLOCKED_V04_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.release-review-freshness-negative-controls-result.v1",
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
