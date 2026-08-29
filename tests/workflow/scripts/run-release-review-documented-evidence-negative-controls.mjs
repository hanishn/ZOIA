#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-documented-evidence-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const DEGRADED_DOC_PATH = resolve(EVIDENCE_ROOT, "degraded-documented-evidence.md");
const BLOCKED_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary.json");
const BLOCKED_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-documented-evidence.json");
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

async function writeDegradedDoc() {
  await writeFile(DEGRADED_DOC_PATH, [
    "# Degraded Documented Evidence Fixture",
    "",
    "This fixture intentionally references missing evidence:",
    "",
    "```text",
    "tests/workflow/evidence/negative-control-missing-documented-evidence/run-result.json",
    "```",
    ""
  ].join("\n"), "utf8");
}

function runReleaseReviewWithMissingDocumentedEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_DOC_EVIDENCE_REFERENCE_DOCS: relativeToProject(DEGRADED_DOC_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_RELEASE_REVIEW_PATH)
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

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeDegradedDoc();

  const releaseReviewCommand = runReleaseReviewWithMissingDocumentedEvidence();
  const blockedReleaseReview = existsSync(BLOCKED_RELEASE_REVIEW_PATH) ? await readJson(BLOCKED_RELEASE_REVIEW_PATH) : null;
  const missingDocEvidenceBlocker = (blockedReleaseReview?.blockers || [])
    .find((blocker) => blocker.id === "release-review-documented-evidence-missing");

  const v04Command = runV04WithBlockedReleaseReview();
  const blockedV04 = existsSync(BLOCKED_V04_PATH) ? await readJson(BLOCKED_V04_PATH) : null;
  const v04Blocker = (blockedV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const problems = [];
  if (releaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-documented-evidence-negative-control-command-passed",
      message: "Release-review summary passed with a missing documented evidence reference."
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
        message: "Release-review summary did not block with missing documented evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_PATH,
        observed: { status: blockedReleaseReview.status }
      });
    }
    if (!missingDocEvidenceBlocker) {
      problems.push({
        id: "documented-evidence-missing-blocker-missing",
        message: "Release-review summary did not report missing documented evidence.",
        evidencePath: BLOCKED_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedReleaseReview.blockers || [] }
      });
    }
  }
  if (v04Command.status === 0) {
    problems.push({
      id: "v04-documented-evidence-negative-control-command-passed",
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

  const result = {
    schemaVersion: "zoia.release-review-documented-evidence-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: 1,
      passingCaseCount: problems.length === 0 ? 1 : 0,
      releaseReviewCommandExitCode: releaseReviewCommand.status,
      blockedReleaseReviewStatus: blockedReleaseReview?.status || null,
      documentedEvidenceMissingBlockerFound: Boolean(missingDocEvidenceBlocker),
      v04CommandExitCode: v04Command.status,
      blockedV04Status: blockedV04?.status || null,
      v04ReleaseReviewBlockerFound: Boolean(v04Blocker)
    },
    command: {
      releaseReviewStdout: releaseReviewCommand.stdout,
      releaseReviewStderr: releaseReviewCommand.stderr,
      v04Stdout: v04Command.stdout,
      v04Stderr: v04Command.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies missing documented evidence paths block release-review summary and v0.4 readiness through isolated evidence paths.",
    artifacts: {
      resultPath: RESULT_PATH,
      degradedDocPath: DEGRADED_DOC_PATH,
      blockedReleaseReviewPath: BLOCKED_RELEASE_REVIEW_PATH,
      blockedV04Path: BLOCKED_V04_PATH
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
    schemaVersion: "zoia.release-review-documented-evidence-negative-controls-result.v1",
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
