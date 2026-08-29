#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const COVERAGE_INDEX_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/community-coverage-index/run-result.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-selection");
const DEFAULT_RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const DEFAULT_DESCRIPTION = "ambient delay with slow modulation and expression pedal feedback control";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "based", "be", "for", "from", "in", "into", "make", "of", "on", "or", "patch", "that", "the", "to", "with"
]);

const MODALITY_KEYWORDS = Object.freeze({
  audio: ["audio", "sound", "effect", "delay", "reverb", "filter", "distortion", "lofi", "ambient", "guitar"],
  cv: ["cv", "control-voltage", "modulation", "lfo", "envelope", "expression"],
  midi: ["midi", "clock", "note", "cc"],
  control: ["control", "expression", "pedal", "footswitch", "stompswitch", "button"],
  sample: ["sample", "sampler", "loop", "looper"],
  sequencer: ["sequence", "sequencer", "arp", "arpeggiator"],
  synth: ["synth", "oscillator", "drone", "voice"],
  effect: ["effect", "delay", "reverb", "chorus", "flanger", "phaser", "filter", "compressor"]
});

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

function parseArgs(argv) {
  let description = null;
  let limit = 10;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--description") {
      description = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--limit") {
      limit = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (!arg.startsWith("--")) {
      description = [description, arg].filter(Boolean).join(" ");
    }
  }
  return {
    description: (description || DEFAULT_DESCRIPTION).trim(),
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10,
    resultPath
  };
}

function tokenize(text) {
  return [...new Set(String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item)))];
}

function detectModalities(tokens) {
  const tokenSet = new Set(tokens);
  return Object.entries(MODALITY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => tokenSet.has(keyword)))
    .map(([modality]) => modality);
}

function buildIntent(description) {
  const tokens = tokenize(description);
  return {
    schemaVersion: "zoia.patch-generation-intent.v1",
    description,
    tokens,
    requestedModalities: detectModalities(tokens),
    requiredFeatures: tokens
  };
}

function searchableText(record) {
  return [
    record.title,
    record.slug,
    record.author,
    record.filename,
    ...(record.categories || []),
    ...(record.tags || []),
    record.q106Classification,
    record.rollupClassification,
    record.sourceClassification
  ].filter(Boolean).join(" ").toLowerCase();
}

function scoreRecord(record, intent) {
  if (!String(record.coverageState || "").startsWith("verified-")) return null;
  const text = searchableText(record);
  const matchedTokens = intent.tokens.filter((token) => text.includes(token));
  const matchedModalities = intent.requestedModalities.filter((modality) => {
    const keywords = MODALITY_KEYWORDS[modality] || [];
    return keywords.some((keyword) => text.includes(keyword));
  });
  if (matchedTokens.length === 0 && matchedModalities.length === 0) return null;
  const measuredBonus = record.verificationKind === "measured-signal" ? 6 : 0;
  const categoryBonus = matchedModalities.length * 4;
  const tokenScore = matchedTokens.length * 3;
  const popularityProxy = Number(record.bestMasterPeak || 0) > 0 ? 1 : 0;
  const score = tokenScore + categoryBonus + measuredBonus + popularityProxy;
  if (score <= 0) return null;
  return {
    score,
    matchedTokens,
    matchedModalities
  };
}

function candidateFrom(record, score) {
  return {
    pairId: record.pairId,
    title: record.title,
    pageUrl: record.pageUrl,
    author: record.author,
    filename: record.filename,
    score: score.score,
    matchedTokens: score.matchedTokens,
    matchedModalities: score.matchedModalities,
    coverageState: record.coverageState,
    verificationKind: record.verificationKind,
    q106Classification: record.q106Classification,
    rollupClassification: record.rollupClassification,
    bestMasterRms: record.bestMasterRms,
    bestMasterPeak: record.bestMasterPeak,
    evidence: {
      q106EvidencePath: record.q106EvidencePath,
      rollupEvidencePath: record.rollupEvidencePath
    },
    useBoundary: "Verified existing community template candidate. This is not a novel exported patch."
  };
}

async function main() {
  if (!existsSync(COVERAGE_INDEX_PATH)) {
    throw new Error(`Missing coverage index. Run npm run zoia:verify:community:coverage-index first: ${COVERAGE_INDEX_PATH}`);
  }
  const { description, limit, resultPath } = parseArgs(process.argv.slice(2));
  const intent = buildIntent(description);
  const coverageIndex = await readJson(COVERAGE_INDEX_PATH);
  const records = coverageIndex.records || [];
  const candidates = records
    .map((record) => {
      const score = scoreRecord(record, intent);
      return score ? candidateFrom(record, score) : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.title || a.pairId).localeCompare(String(b.title || b.pairId)))
    .slice(0, limit);

  const result = {
    schemaVersion: "zoia.patch-template-selection-result.v1",
    status: candidates.length > 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    intent,
    inputs: {
      coverageIndexPath: COVERAGE_INDEX_PATH
    },
    summary: {
      candidateCount: candidates.length,
      verifiedCandidateCount: candidates.filter((item) => String(item.coverageState || "").startsWith("verified-")).length,
      measuredCandidateCount: candidates.filter((item) => item.verificationKind === "measured-signal").length,
      staticStructuralCandidateCount: candidates.filter((item) => item.verificationKind === "static-structural-proof").length
    },
    candidates,
    validation: {
      rejectedUnverifiedCandidateCount: 0,
      missingEvidenceCandidateIds: candidates
        .filter((item) => !item.evidence.q106EvidencePath && !item.evidence.rollupEvidencePath)
        .map((item) => item.pairId)
    },
    claimBoundaries: {
      selectedExistingTemplateOnly: true,
      novelPatchClaim: false,
      exportedPatchClaim: false,
      verifiedCandidateClaim: candidates.length > 0
    },
    artifacts: {
      resultPath
    }
  };

  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    description,
    candidateCount: result.summary.candidateCount,
    measuredCandidateCount: result.summary.measuredCandidateCount,
    staticStructuralCandidateCount: result.summary.staticStructuralCandidateCount,
    topCandidate: candidates[0] ? {
      pairId: candidates[0].pairId,
      title: candidates[0].title,
      score: candidates[0].score,
      verificationKind: candidates[0].verificationKind
    } : null,
    resultPath
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.patch-template-selection-result.v1",
    status: "fail",
    generatedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    claimBoundaries: {
      selectedExistingTemplateOnly: true,
      novelPatchClaim: false,
      exportedPatchClaim: false,
      verifiedCandidateClaim: false
    },
    artifacts: {
      resultPath
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
