#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-community-modality-rollup");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const BACKLOG_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-community-playability-backlog/run-result.json");
const JSON_SPACES = 2;

const MODALITY_EVIDENCE = Object.freeze([
  {
    sourceClassification: "external-cv-midi-control-required",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-external-control-euroburo-audio-r3/run-result.json"
  },
  {
    sourceClassification: "patch-requires-control-interaction",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-control-interaction-euroburo-audio-r2/run-result.json"
  },
  {
    sourceClassification: "no-audio-routing-present",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-no-audio-routing-euroburo-audio-r3/run-result.json"
  },
  {
    sourceClassification: "no-audio-output-module",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-no-audio-output-euroburo-audio-r2/run-result.json"
  },
  {
    sourceClassification: "empty-or-blank-patch",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-empty-blank-euroburo-audio-r2/run-result.json"
  },
  {
    sourceClassification: "q097-non-audio-unsupported-or-malformed-patch-data",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-page127-euroburo-audio-r2/run-result.json"
  },
  {
    sourceClassification: "no-audio-source-to-output-route",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-no-source-route-euroburo-audio-r2/run-result.json"
  },
  {
    sourceClassification: "sample-or-loop-content-required",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-sample-loop-euroburo-audio-r3/run-result.json"
  },
  {
    sourceClassification: "midi-output-patch-no-master-audio-source",
    path: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-classified-modalities-midi-output-euroburo-audio-r2/run-result.json"
  }
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || "unclassified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function summarizeEvidenceRecord(record, sourceClassification, relativePath) {
  const resultPath = resolve(PROJECT_ROOT, relativePath);
  const results = record.results || [];
  const statusCounts = countBy(results, (item) => item.status);
  const classificationCounts = countBy(results, (item) => item.classification);
  const measuredSignalCount = results.filter((item) => item.status === "pass").length;
  const staticClassifiedCount = results.filter((item) => item.status === "classified").length;
  const problemCount = results.filter((item) => !["pass", "classified"].includes(item.status)).length;
  return {
    sourceClassification,
    resultPath,
    status: record.status,
    fixtureCount: record.fixtureCount,
    measuredSignalCount,
    staticClassifiedCount,
    problemCount,
    statusCounts,
    classificationCounts,
    pairIds: results.map((item) => item.pairId)
  };
}

function setDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  if (!existsSync(BACKLOG_PATH)) throw new Error(`Missing backlog result: ${BACKLOG_PATH}`);

  const backlog = await readJson(BACKLOG_PATH);
  const backlogItems = backlog.items || [];
  const backlogPairIds = backlogItems.map((item) => item.pairId);
  const backlogByClassification = countBy(backlogItems, (item) => item.classification);

  const evidenceSummaries = [];
  const coveredPairs = [];
  const missingEvidencePaths = [];
  for (const config of MODALITY_EVIDENCE) {
    const absolutePath = resolve(PROJECT_ROOT, config.path);
    if (!existsSync(absolutePath)) {
      missingEvidencePaths.push(absolutePath);
      continue;
    }
    const record = await readJson(absolutePath);
    const summary = summarizeEvidenceRecord(record, config.sourceClassification, config.path);
    evidenceSummaries.push(summary);
    coveredPairs.push(...summary.pairIds.map((pairId) => ({ pairId, sourceClassification: config.sourceClassification })));
  }

  const coveredPairIds = coveredPairs.map((item) => item.pairId);
  const duplicatePairIds = [...new Set(coveredPairIds.filter((pairId, index) => coveredPairIds.indexOf(pairId) !== index))].sort();
  const missingPairIds = setDifference(backlogPairIds, coveredPairIds).sort();
  const unexpectedPairIds = setDifference(coveredPairIds, backlogPairIds).sort();
  const coveredBySourceClassification = countBy(coveredPairs, (item) => item.sourceClassification);
  const mismatchedClassificationCounts = Object.entries(backlogByClassification)
    .filter(([classification, expected]) => (coveredBySourceClassification[classification] || 0) !== expected)
    .map(([classification, expected]) => ({
      classification,
      expected,
      observed: coveredBySourceClassification[classification] || 0
    }));
  const status = missingEvidencePaths.length === 0 &&
    duplicatePairIds.length === 0 &&
    missingPairIds.length === 0 &&
    unexpectedPairIds.length === 0 &&
    mismatchedClassificationCounts.length === 0 &&
    evidenceSummaries.every((item) => item.status === "pass")
    ? "pass"
    : "fail";

  const output = {
    schemaVersion: "zoia.community-modality-rollup.v1",
    version: "0.4.0",
    revision: 1,
    status,
    generatedAt: nowIso(),
    backlogPath: BACKLOG_PATH,
    evidenceRoot: EVIDENCE_ROOT,
    summary: {
      sourceBacklogCount: backlogItems.length,
      coveredCount: coveredPairIds.length,
      measuredSignalCount: evidenceSummaries.reduce((sum, item) => sum + item.measuredSignalCount, 0),
      staticClassifiedCount: evidenceSummaries.reduce((sum, item) => sum + item.staticClassifiedCount, 0),
      problemCount: evidenceSummaries.reduce((sum, item) => sum + item.problemCount, 0),
      missingPairCount: missingPairIds.length,
      duplicatePairCount: duplicatePairIds.length,
      unexpectedPairCount: unexpectedPairIds.length,
      bySourceClassification: coveredBySourceClassification
    },
    evidence: evidenceSummaries,
    validation: {
      missingEvidencePaths,
      missingPairIds,
      duplicatePairIds,
      unexpectedPairIds,
      mismatchedClassificationCounts
    },
    claimBoundaries: {
      fullCommunityCorpusAudioClaim: false,
      fullPatchAudioCorrectnessClaim: false,
      humanSpeakerAudibilityClaim: false,
      malformedSourceFixturesPlayableClaim: false
    },
    artifacts: {
      resultPath: RESULT_PATH
    }
  };

  await writeJson(RESULT_PATH, output);
  console.log(JSON.stringify({
    status: output.status,
    sourceBacklogCount: output.summary.sourceBacklogCount,
    coveredCount: output.summary.coveredCount,
    measuredSignalCount: output.summary.measuredSignalCount,
    staticClassifiedCount: output.summary.staticClassifiedCount,
    problemCount: output.summary.problemCount,
    missingPairCount: output.summary.missingPairCount,
    duplicatePairCount: output.summary.duplicatePairCount,
    unexpectedPairCount: output.summary.unexpectedPairCount,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (output.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.community-modality-rollup.v1",
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
