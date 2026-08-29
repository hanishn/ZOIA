#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const MANIFEST_PATH = resolve(PROJECT_ROOT, "tests/workflow/patch-library-cache/zoia-patch-library-manifest.json");
const Q097_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/q097-community-library-deep-consolidated/run-result.json");
const Q106_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-playability-full-r1/run-result.json");
const ROLLUP_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-community-modality-rollup/run-result.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/community-coverage-index");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const CSV_PATH = resolve(EVIDENCE_ROOT, "community-patch-verification-index.csv");
const DOC_PATH = resolve(PROJECT_ROOT, "docs/COMMUNITY_COVERAGE.md");
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

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function firstFileName(metadata) {
  const files = Array.isArray(metadata?.files) ? metadata.files : [];
  return files[0]?.filename || null;
}

function categoryNames(metadata) {
  return Array.isArray(metadata?.categories)
    ? metadata.categories.map((item) => item.name).filter(Boolean)
    : [];
}

function tagNames(metadata) {
  return Array.isArray(metadata?.tags)
    ? metadata.tags.map((item) => item.name).filter(Boolean)
    : [];
}

function relativeToProject(path) {
  if (!path) return null;
  return resolve(path).startsWith(PROJECT_ROOT)
    ? resolve(path).slice(PROJECT_ROOT.length + 1)
    : path;
}

function existingPath(path) {
  if (!path) return null;
  if (existsSync(path)) return path;
  const normalized = path.replace(/\\TestWorkflow\\/i, "\\tests\\workflow\\");
  return existsSync(normalized) ? normalized : path;
}

function q106PatchResultPath(pairId, category = "patch-library") {
  return resolve(dirname(Q106_PATH), category, pairId, "result.json");
}

function coverageStateFor(record) {
  if (record.q106Status === "pass") return "verified-measured";
  if (record.rollupStatus === "pass") return "verified-measured";
  if (record.rollupStatus === "classified") return "verified-static-structural";
  if (record.q106Status === "classified") return "blocked-unrolled-classification";
  if (record.q097Status === "pass") return "blocked-missing-modality-evidence";
  if (record.q097Status === "fail") return "blocked-import-render";
  return "blocked-missing-source";
}

function verificationKindFor(state) {
  if (state === "verified-measured") return "measured-signal";
  if (state === "verified-static-structural") return "static-structural-proof";
  return "blocked";
}

function extractSignalSummary(q106Result) {
  const summary = q106Result?.audioSummary || {};
  return {
    bestMasterRms: summary.bestMaster?.rms ?? null,
    bestMasterPeak: summary.bestMaster?.peak ?? null,
    bestInputRms: summary.bestInput?.rms ?? null,
    bestInputPeak: summary.bestInput?.peak ?? null,
    stimulusEventCount: Array.isArray(summary.stimulusEvents) ? summary.stimulusEvents.length : null
  };
}

async function buildRollupLookup(rollup) {
  const byPairId = new Map();
  for (const evidence of rollup.evidence || []) {
    const resultPath = evidence.resultPath;
    if (!resultPath || !existsSync(resultPath)) continue;
    const result = await readJson(resultPath);
    for (const item of result.results || []) {
      byPairId.set(normalizeId(item.pairId), {
        sourceClassification: evidence.sourceClassification,
        rollupStatus: item.status,
        rollupClassification: item.classification || evidence.sourceClassification,
        rollupEvidencePath: resultPath
      });
    }
  }
  return byPairId;
}

async function readMetadata(patch) {
  const metadataPath = existingPath(patch.metadataPath);
  if (!metadataPath || !existsSync(metadataPath)) return null;
  return readJson(metadataPath);
}

async function main() {
  const missingInputs = [MANIFEST_PATH, Q097_PATH, Q106_PATH, ROLLUP_PATH].filter((path) => !existsSync(path));
  if (missingInputs.length > 0) {
    throw new Error(`Missing required input(s): ${missingInputs.join(", ")}`);
  }

  const [manifest, q097, q106, rollup] = await Promise.all([
    readJson(MANIFEST_PATH),
    readJson(Q097_PATH),
    readJson(Q106_PATH),
    readJson(ROLLUP_PATH)
  ]);

  const q097ByPairId = new Map((q097.tests || []).map((item) => [normalizeId(item.pairId), item]));
  const q106ByPairId = new Map((q106.results || []).map((item) => [normalizeId(item.pairId), item]));
  const rollupByPairId = await buildRollupLookup(rollup);
  const records = [];

  for (const patch of manifest.patches || []) {
    const pairId = normalizeId(patch.patchId);
    const metadata = await readMetadata(patch);
    const q097Item = q097ByPairId.get(pairId) || null;
    const q106Item = q106ByPairId.get(pairId) || null;
    const rollupItem = rollupByPairId.get(pairId) || null;
    const category = patch.category || q106Item?.category || q097Item?.category || "patch-library";
    const q106ResultPath = q106PatchResultPath(pairId, category);
    const signalSummary = extractSignalSummary(q106Item);
    const record = {
      pairId,
      pageUrl: metadata?.url || null,
      slug: metadata?.slug || null,
      title: metadata?.title || null,
      author: metadata?.author?.name || null,
      categories: categoryNames(metadata),
      tags: tagNames(metadata),
      filename: firstFileName(metadata),
      binSha256: patch.binSha256 || null,
      binSize: patch.binSize || null,
      manifestStatus: "present",
      q097Status: q097Item?.status || null,
      q097Classification: Object.keys(q097Item?.failureClassifications || {})[0] || null,
      q097EvidencePath: q097Item?.artifacts?.resultPath || null,
      q106Status: q106Item?.status || null,
      q106Classification: q106Item?.classification || null,
      q106EvidencePath: existsSync(q106ResultPath) ? q106ResultPath : null,
      rollupStatus: rollupItem?.rollupStatus || null,
      rollupClassification: rollupItem?.rollupClassification || null,
      rollupEvidencePath: rollupItem?.rollupEvidencePath || null,
      sourceClassification: rollupItem?.sourceClassification || q106Item?.classification || null,
      ...signalSummary
    };
    record.coverageState = coverageStateFor(record);
    record.verificationKind = verificationKindFor(record.coverageState);
    records.push(record);
  }

  records.sort((a, b) => a.pairId.localeCompare(b.pairId, undefined, { numeric: true }));

  const manifestPatchIds = records.map((item) => item.pairId);
  const q097PairIds = [...q097ByPairId.keys()];
  const q106PairIds = [...q106ByPairId.keys()];
  const rollupPairIds = [...rollupByPairId.keys()];
  const manifestSet = new Set(manifestPatchIds);
  const unexpectedQ097PairIds = q097PairIds.filter((pairId) => !manifestSet.has(pairId)).sort();
  const unexpectedQ106PairIds = q106PairIds.filter((pairId) => !manifestSet.has(pairId)).sort();
  const unexpectedRollupPairIds = rollupPairIds.filter((pairId) => !manifestSet.has(pairId)).sort();
  const duplicateManifestPairIds = [...new Set(manifestPatchIds.filter((pairId, index) => manifestPatchIds.indexOf(pairId) !== index))].sort();
  const verifiedCount = records.filter((item) => item.coverageState.startsWith("verified-")).length;
  const blockedCount = records.length - verifiedCount;
  const status = blockedCount === 0 &&
    unexpectedQ097PairIds.length === 0 &&
    unexpectedQ106PairIds.length === 0 &&
    unexpectedRollupPairIds.length === 0 &&
    duplicateManifestPairIds.length === 0
    ? "pass"
    : "fail";

  const result = {
    schemaVersion: "zoia.community-coverage-index.v1",
    version: "0.4.0",
    revision: 1,
    status,
    generatedAt: nowIso(),
    inputs: {
      manifestPath: MANIFEST_PATH,
      q097ConsolidatedResultPath: Q097_PATH,
      q106CommunityStimulusResultPath: Q106_PATH,
      modalityRollupPath: ROLLUP_PATH
    },
    summary: {
      discoveredCommunityPageCount: records.length,
      discoveredPatchCount: records.length,
      verifiedPatchCount: verifiedCount,
      blockedPatchCount: blockedCount,
      measuredSignalCount: records.filter((item) => item.verificationKind === "measured-signal").length,
      staticStructuralCount: records.filter((item) => item.verificationKind === "static-structural-proof").length,
      byCoverageState: countBy(records, (item) => item.coverageState),
      byVerificationKind: countBy(records, (item) => item.verificationKind),
      byQ106Classification: countBy(records, (item) => item.q106Classification),
      byRollupClassification: countBy(records.filter((item) => item.rollupClassification), (item) => item.rollupClassification)
    },
    validation: {
      duplicateManifestPairIds,
      unexpectedQ097PairIds,
      unexpectedQ106PairIds,
      unexpectedRollupPairIds,
      blockedPairIds: records.filter((item) => !item.coverageState.startsWith("verified-")).map((item) => item.pairId)
    },
    claimBoundaries: {
      communityPageCoverageClaim: status === "pass",
      fullCommunityCorpusAudioClaim: false,
      fullPatchAudioCorrectnessClaim: false,
      generatedPatchReadinessClaim: false
    },
    records,
    artifacts: {
      resultPath: RESULT_PATH,
      csvPath: CSV_PATH,
      docPath: DOC_PATH
    }
  };

  await writeJson(RESULT_PATH, result);
  await writeCsv(records);
  await writeDoc(result);

  console.log(JSON.stringify({
    status: result.status,
    discoveredCommunityPageCount: result.summary.discoveredCommunityPageCount,
    verifiedPatchCount: result.summary.verifiedPatchCount,
    blockedPatchCount: result.summary.blockedPatchCount,
    measuredSignalCount: result.summary.measuredSignalCount,
    staticStructuralCount: result.summary.staticStructuralCount,
    resultPath: RESULT_PATH,
    csvPath: CSV_PATH,
    docPath: DOC_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

async function writeCsv(records) {
  const headers = [
    "pairId",
    "title",
    "pageUrl",
    "author",
    "filename",
    "coverageState",
    "verificationKind",
    "q097Status",
    "q106Status",
    "q106Classification",
    "rollupClassification",
    "bestMasterRms",
    "bestMasterPeak",
    "q106EvidencePath",
    "rollupEvidencePath"
  ];
  const rows = [headers.map(csvCell).join(",")];
  for (const record of records) {
    rows.push(headers.map((header) => csvCell(record[header])).join(","));
  }
  await mkdir(dirname(CSV_PATH), { recursive: true });
  await writeFile(CSV_PATH, `${rows.join("\n")}\n`, "utf8");
}

async function writeDoc(result) {
  const lines = [
    "# ZOIA Community Coverage",
    "",
    "Version: 0.4.0",
    "Revision: 1",
    "",
    "## Scope",
    "",
    "This document summarizes the local community page and patch coverage index. The index reconciles the patch library manifest, Q097 import/render evidence, Q106 community stimulus evidence, and the v0.4 classified modality rollup.",
    "",
    "## Result",
    "",
    `Status: ${result.status}`,
    "",
    `Generated: ${result.generatedAt}`,
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Discovered community pages | ${result.summary.discoveredCommunityPageCount} |`,
    `| Discovered patches | ${result.summary.discoveredPatchCount} |`,
    `| Verified patches | ${result.summary.verifiedPatchCount} |`,
    `| Blocked patches | ${result.summary.blockedPatchCount} |`,
    `| Measured-signal verifications | ${result.summary.measuredSignalCount} |`,
    `| Static structural verifications | ${result.summary.staticStructuralCount} |`,
    "",
    "## Coverage States",
    "",
    "| State | Count |",
    "| --- | ---: |",
    ...Object.entries(result.summary.byCoverageState).sort().map(([state, count]) => `| ${state} | ${count} |`),
    "",
    "## Claim Boundary",
    "",
    "The current evidence supports a 100% local coverage claim for the discovered community patch-library corpus in the cached manifest. It does not claim that every patch produces measured audio, and it does not claim generated-patch readiness.",
    "",
    "## Artifacts",
    "",
    `- JSON index: \`${relativeToProject(result.artifacts.resultPath)}\``,
    `- CSV index: \`${relativeToProject(result.artifacts.csvPath)}\``,
    `- Q097 consolidated evidence: \`${relativeToProject(result.inputs.q097ConsolidatedResultPath)}\``,
    `- Q106 community stimulus evidence: \`${relativeToProject(result.inputs.q106CommunityStimulusResultPath)}\``,
    `- v0.4 modality rollup: \`${relativeToProject(result.inputs.modalityRollupPath)}\``,
    "",
    "## Next Phase",
    "",
    "1. Add generated-patch schemas for a patch intent, an intermediate graph, and a verification result.",
    "2. Implement selection-based generation from verified community templates.",
    "3. Require generated candidates to pass import, render, simulator initialization, modality checks, and requirement-trace checks before presenting them as usable.",
    "4. Expand from template selection to constraint-based graph construction after generated-patch verification is stable.",
    ""
  ];
  await mkdir(dirname(DOC_PATH), { recursive: true });
  await writeFile(DOC_PATH, `${lines.join("\n")}`, "utf8");
}

main().catch(async (error) => {
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.community-coverage-index.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    generatedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    artifacts: {
      resultPath: RESULT_PATH,
      csvPath: CSV_PATH,
      docPath: DOC_PATH
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
