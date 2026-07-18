#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const BACKLOG_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-community-playability-backlog/run-result.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-community-classified-modalities");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const RAW_ARGS = process.argv.slice(2);
const ARG_SET = new Set(RAW_ARGS);

const CLASSIFICATION_MODALITIES = Object.freeze({
  "external-cv-midi-control-required": {
    testable: true,
    expectedResult: "audio-signal-after-expanded-stimulus",
    modalities: ["test-tone", "cv-value-sweep", "midi-note", "midi-cc", "midi-clock", "stomp-switch", "pushbutton"]
  },
  "patch-requires-control-interaction": {
    testable: true,
    expectedResult: "audio-signal-after-control-interaction",
    modalities: ["test-tone", "cv-value-sweep", "stomp-switch", "pushbutton"]
  },
  "sample-or-loop-content-required": {
    testable: true,
    expectedResult: "audio-signal-after-deterministic-sample-or-loop-fixture",
    modalities: ["sample-fixture", "loop-fixture"]
  },
  "midi-output-patch-no-master-audio-source": {
    testable: true,
    expectedResult: "midi-protocol-event-evidence",
    modalities: ["midi-note", "midi-cc", "midi-clock", "midi-output-sink"]
  },
  "no-audio-output-module": {
    testable: true,
    expectedResult: "non-audio-import-render-and-signal-flow-absence-proof",
    modalities: ["import", "ui-render", "signal-flow-static-analysis"]
  },
  "empty-or-blank-patch": {
    testable: true,
    expectedResult: "empty-patch-import-render-proof",
    modalities: ["import", "ui-render", "empty-model-static-analysis"]
  },
  "no-audio-source-to-output-route": {
    testable: true,
    expectedResult: "static-no-source-to-output-route-proof",
    modalities: ["import", "ui-render", "signal-flow-static-analysis"]
  },
  "no-audio-routing-present": {
    testable: true,
    expectedResult: "static-no-audio-routing-proof",
    modalities: ["import", "ui-render", "signal-flow-static-analysis"]
  },
  "q097-non-audio-unsupported-or-malformed-patch-data": {
    testable: true,
    expectedResult: "source-format-import-render-proof",
    modalities: ["parser-normalization", "import", "ui-render", "playability-state"]
  }
});

function nowIso() {
  return new Date().toISOString();
}

function readCliOption(name) {
  const prefix = `--${name}=`;
  const value = RAW_ARGS.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : "";
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function selectItems(backlog) {
  const classifications = parseList(readCliOption("classification") || process.env.ZOIA_CLASSIFIED_MODALITY_CLASSIFICATION || "");
  const targetIds = parseList(readCliOption("target-ids") || process.env.ZOIA_CLASSIFIED_MODALITY_TARGET_IDS || "");
  const limit = Number.parseInt(readCliOption("limit") || process.env.ZOIA_CLASSIFIED_MODALITY_LIMIT || "", 10);
  let items = backlog.items || [];
  if (classifications.length > 0) {
    const allowed = new Set(classifications);
    items = items.filter((item) => allowed.has(item.classification));
  }
  if (targetIds.length > 0) {
    const allowed = new Set(targetIds);
    items = items.filter((item) => allowed.has(item.pairId));
  }
  if (Number.isFinite(limit) && limit > 0) {
    items = items.slice(0, limit);
  }
  return items;
}

function classifyModalityResult(item, rerunRecord) {
  const policy = CLASSIFICATION_MODALITIES[item.classification] || {
    testable: false,
    expectedResult: "unmapped-classification",
    modalities: []
  };
  if (!policy.testable) {
    return {
      pairId: item.pairId,
      sourceClassification: item.classification,
      status: "blocked",
      classification: policy.expectedResult,
      modalities: policy.modalities,
      rerunResultPath: rerunRecord?.artifacts?.resultPath || null
    };
  }
  if (!rerunRecord) {
    return {
      pairId: item.pairId,
      sourceClassification: item.classification,
      status: "blocked",
      classification: "targeted-rerun-missing",
      modalities: policy.modalities,
      rerunResultPath: null
    };
  }
  if (rerunRecord.status === "pass") {
    return {
      pairId: item.pairId,
      sourceClassification: item.classification,
      status: "pass",
      classification: rerunRecord.classification || "signal-present",
      modalities: policy.modalities,
      rerunResultPath: rerunRecord.artifacts?.resultPath || null,
      bestMaster: rerunRecord.audioSummary?.bestMaster || null
    };
  }
  const staticAnalysis = rerunRecord.staticAnalysis || item;
  const rerunClassification = rerunRecord.classification || "";
  const nonAudioStructuralProof =
    rerunClassification === "no-audio-output-module" && Number(staticAnalysis.audioOutputModuleCount || 0) === 0 ||
    rerunClassification === "empty-or-blank-patch" && Number(staticAnalysis.moduleCount || 0) === 0 ||
    rerunClassification === "no-audio-source-to-output-route" && staticAnalysis.hasAudioSourceToOutputRoute === false ||
    rerunClassification === "no-audio-routing-present" &&
      Number(staticAnalysis.audioInputModuleCount || 0) > 0 &&
      Number(staticAnalysis.audioOutputModuleCount || 0) > 0 &&
      (Number(staticAnalysis.inputConnections || 0) === 0 || Number(staticAnalysis.outputConnections || 0) === 0);
  if (nonAudioStructuralProof) {
    return {
      pairId: item.pairId,
      sourceClassification: item.classification,
      status: "pass",
      classification: rerunClassification,
      modalities: CLASSIFICATION_MODALITIES[rerunClassification]?.modalities || policy.modalities,
      rerunResultPath: rerunRecord.artifacts?.resultPath || null
    };
  }
  return {
    pairId: item.pairId,
    sourceClassification: item.classification,
    status: "blocked",
    classification: rerunRecord.classification || policy.expectedResult,
    modalities: policy.modalities,
    rerunResultPath: rerunRecord.artifacts?.resultPath || null,
    bestMaster: rerunRecord.audioSummary?.bestMaster || null,
    assertionFailures: rerunRecord.assertionFailures || []
  };
}

function runTargetedEvidence(items, suffix) {
  if (items.length === 0) return null;
  const targetIds = items.map((item) => item.pairId).join(",");
  const args = [
    "tests/workflow/playwright/run-zoia-playwright-community-audio-evidence.mjs",
    "--v04-stimulus",
    "--deep-node-probes",
    `--evidence-suffix=${suffix}`,
    `--target-ids=${targetIds}`
  ];
  const child = spawnSync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ZOIA_COMMUNITY_AUDIO_V04_STIMULUS: "1",
      ZOIA_COMMUNITY_AUDIO_DEEP_NODE_PROBES: "1"
    }
  });
  const resultPath = resolve(PROJECT_ROOT, "tests/workflow/evidence", `q106-community-patch-audio-classification-${suffix}`, "run-result.json");
  if (child.status !== 0 && !existsSync(resultPath)) {
    throw new Error(`Targeted classified modality evidence run failed with exit code ${child.status}`);
  }
  return resultPath;
}

async function main() {
  if (!existsSync(BACKLOG_PATH)) throw new Error(`Missing backlog: ${BACKLOG_PATH}`);
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const startedAt = nowIso();
  const backlog = await readJson(BACKLOG_PATH);
  const selectedItems = selectItems(backlog);
  const runEvidence = ARG_SET.has("--run") || process.env.ZOIA_CLASSIFIED_MODALITY_RUN === "1";
  const suffix = readCliOption("evidence-suffix") || process.env.ZOIA_CLASSIFIED_MODALITY_EVIDENCE_SUFFIX || "v0.4-classified-modalities";
  const existingTargetedResultPath = readCliOption("targeted-result-path") || process.env.ZOIA_CLASSIFIED_MODALITY_TARGETED_RESULT_PATH || "";
  let targetedResultPath = null;
  let targetedResult = null;
  if (runEvidence) {
    targetedResultPath = runTargetedEvidence(selectedItems, suffix);
    targetedResult = await readJson(targetedResultPath);
  } else if (existingTargetedResultPath) {
    targetedResultPath = resolve(PROJECT_ROOT, existingTargetedResultPath);
    targetedResult = await readJson(targetedResultPath);
  }
  const rerunByPairId = new Map((targetedResult?.results || []).map((item) => [item.pairId, item]));
  const results = selectedItems.map((item) => classifyModalityResult(item, rerunByPairId.get(item.pairId)));
  const blocked = results.filter((item) => item.status === "blocked");
  const byClassification = results.reduce((acc, item) => {
    acc[item.classification] = (acc[item.classification] || 0) + 1;
    return acc;
  }, {});
  const bySourceClassification = results.reduce((acc, item) => {
    acc[item.sourceClassification] = (acc[item.sourceClassification] || 0) + 1;
    return acc;
  }, {});
  const output = {
    schemaVersion: "zoia.community-classified-modality-gate.v1",
    version: "0.4.0",
    revision: 1,
    status: blocked.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    command: `npm run zoia:verify:community:classified-modalities${runEvidence ? " -- --run" : ""}`,
    evidenceRoot: EVIDENCE_ROOT,
    backlogPath: BACKLOG_PATH,
    targetedResultPath,
    selection: {
      selectedCount: selectedItems.length,
      sourceBacklogCount: backlog.summary?.backlogCount || null,
      classificationFilter: parseList(readCliOption("classification") || process.env.ZOIA_CLASSIFIED_MODALITY_CLASSIFICATION || ""),
      targetIds: parseList(readCliOption("target-ids") || process.env.ZOIA_CLASSIFIED_MODALITY_TARGET_IDS || ""),
      limit: Number.parseInt(readCliOption("limit") || process.env.ZOIA_CLASSIFIED_MODALITY_LIMIT || "", 10) || null
    },
    summary: {
      passCount: results.filter((item) => item.status === "pass").length,
      blockedCount: blocked.length,
      byClassification,
      bySourceClassification
    },
    modalityPolicies: CLASSIFICATION_MODALITIES,
    results,
    claimBoundaries: {
      audioContextStateAloneIsProof: false,
      humanSpeakerAudibilityClaim: false,
      fullPatchAudioCorrectnessClaim: false,
      fullCommunityCorpusAudioClaim: false,
      binaryExportFidelityClaim: false
    },
    artifacts: {
      resultPath: RESULT_PATH,
      targetedResultPath
    }
  };
  await writeJson(RESULT_PATH, output);
  console.log(JSON.stringify({
    status: output.status,
    selectedCount: output.selection.selectedCount,
    passCount: output.summary.passCount,
    blockedCount: output.summary.blockedCount,
    byClassification: output.summary.byClassification,
    evidenceRoot: EVIDENCE_ROOT,
    resultPath: RESULT_PATH,
    targetedResultPath
  }, null, JSON_SPACES));
  if (output.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.community-classified-modality-gate.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack },
    artifacts: { resultPath: RESULT_PATH }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
