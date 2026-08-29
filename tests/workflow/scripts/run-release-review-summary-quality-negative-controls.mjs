#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-summary-quality-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const BLOCKED_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary.json");
const BLOCKED_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-summary-quality.json");
const DEGRADED_CONTRACT_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-contract-evidence.json");
const BLOCKED_CONTRACT_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-contract-evidence.json");
const BLOCKED_CONTRACT_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-contract-evidence.json");
const DEGRADED_DUPLICATE_MODULE_PORT_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-duplicate-module-port-evidence.json");
const BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-duplicate-module-port-evidence.json");
const BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-duplicate-module-port-evidence.json");
const DEGRADED_PARAM_RANGE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-param-range-evidence.json");
const BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-param-range-evidence.json");
const BLOCKED_PARAM_RANGE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-param-range-evidence.json");
const DEGRADED_PARAM_NORMALIZATION_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-param-normalization-evidence.json");
const BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-param-normalization-evidence.json");
const BLOCKED_PARAM_NORMALIZATION_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-param-normalization-evidence.json");
const DEGRADED_PORT_KIND_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-port-kind-evidence.json");
const BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-port-kind-evidence.json");
const BLOCKED_PORT_KIND_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-port-kind-evidence.json");
const DEGRADED_CONNECTION_GAIN_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-connection-gain-evidence.json");
const BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-connection-gain-evidence.json");
const BLOCKED_CONNECTION_GAIN_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-connection-gain-evidence.json");
const DEGRADED_CONNECTION_GAIN_RANGE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-connection-gain-range-evidence.json");
const BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-connection-gain-range-evidence.json");
const BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-connection-gain-range-evidence.json");
const DEGRADED_DUPLICATE_CONNECTION_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-duplicate-connection-evidence.json");
const BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-duplicate-connection-evidence.json");
const BLOCKED_DUPLICATE_CONNECTION_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-duplicate-connection-evidence.json");
const DEGRADED_SELF_ROUTE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-self-route-evidence.json");
const BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-self-route-evidence.json");
const BLOCKED_SELF_ROUTE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-self-route-evidence.json");
const DEGRADED_MODULATION_ROUTE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-modulation-route-evidence.json");
const BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-modulation-route-evidence.json");
const BLOCKED_MODULATION_ROUTE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-modulation-route-evidence.json");
const DEGRADED_TRACE_COVERAGE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-trace-coverage-evidence.json");
const BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-trace-coverage-evidence.json");
const BLOCKED_TRACE_COVERAGE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-trace-coverage-evidence.json");
const DEGRADED_BLOCKED_REQUIREMENT_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-blocked-requirement-evidence.json");
const BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-blocked-requirement-evidence.json");
const BLOCKED_BLOCKED_REQUIREMENT_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-blocked-requirement-evidence.json");
const DEGRADED_TRACE_MODALITY_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-trace-modality-evidence.json");
const BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-trace-modality-evidence.json");
const BLOCKED_TRACE_MODALITY_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-trace-modality-evidence.json");
const DEGRADED_AUDIO_ROUTE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-audio-route-evidence.json");
const BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-audio-route-evidence.json");
const BLOCKED_AUDIO_ROUTE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-audio-route-evidence.json");
const DEGRADED_AUDIO_CYCLE_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-audio-cycle-evidence.json");
const BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-audio-cycle-evidence.json");
const BLOCKED_AUDIO_CYCLE_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-audio-cycle-evidence.json");
const DEGRADED_GRAPH_COMPLEXITY_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-graph-complexity-evidence.json");
const BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-graph-complexity-evidence.json");
const BLOCKED_GRAPH_COMPLEXITY_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-graph-complexity-evidence.json");
const DEGRADED_TRACE_VERIFICATION_METHOD_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-trace-verification-method-evidence.json");
const BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-trace-verification-method-evidence.json");
const BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-trace-verification-method-evidence.json");
const DEGRADED_AUDIO_PROCESSOR_ORPHAN_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-audio-processor-orphan-evidence.json");
const BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-audio-processor-orphan-evidence.json");
const BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-audio-processor-orphan-evidence.json");
const DEGRADED_MODULE_ORPHAN_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-module-orphan-evidence.json");
const BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-module-orphan-evidence.json");
const BLOCKED_MODULE_ORPHAN_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-module-orphan-evidence.json");
const DEGRADED_UNDECLARED_MODALITY_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-undeclared-modality-evidence.json");
const BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-undeclared-modality-evidence.json");
const BLOCKED_UNDECLARED_MODALITY_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-undeclared-modality-evidence.json");
const DEGRADED_AUDIO_MODALITY_READINESS_PATH = resolve(EVIDENCE_ROOT, "degraded-generated-patch-readiness-audio-modality-evidence.json");
const BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH = resolve(EVIDENCE_ROOT, "blocked-release-review-summary-audio-modality-evidence.json");
const BLOCKED_AUDIO_MODALITY_V04_PATH = resolve(EVIDENCE_ROOT, "blocked-v04-readiness-audio-modality-evidence.json");
const EXTRA_REQUIRED_COMMAND = "npm run zoia:negative-control-required-reviewer-command";
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

function runReleaseReviewWithMissingQualityCommand() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_EXTRA_REQUIRED_COMMANDS: EXTRA_REQUIRED_COMMAND,
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

function runReleaseReviewWithDegradedContractEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_CONTRACT_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_CONTRACT_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedContractReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_CONTRACT_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_CONTRACT_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedDuplicateModulePortEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_DUPLICATE_MODULE_PORT_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedDuplicateModulePortReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedParamRangeEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_PARAM_RANGE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedParamRangeReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_PARAM_RANGE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedParamNormalizationEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_PARAM_NORMALIZATION_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedParamNormalizationReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_PARAM_NORMALIZATION_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedPortKindEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_PORT_KIND_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedPortKindReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_PORT_KIND_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedConnectionGainEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_CONNECTION_GAIN_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedConnectionGainReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_CONNECTION_GAIN_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedConnectionGainRangeEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_CONNECTION_GAIN_RANGE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedConnectionGainRangeReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedDuplicateConnectionEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_DUPLICATE_CONNECTION_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedDuplicateConnectionReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_DUPLICATE_CONNECTION_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedSelfRouteEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_SELF_ROUTE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedSelfRouteReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_SELF_ROUTE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedModulationRouteEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_MODULATION_ROUTE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedModulationRouteReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_MODULATION_ROUTE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedTraceCoverageEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_TRACE_COVERAGE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedTraceCoverageReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_TRACE_COVERAGE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedBlockedRequirementEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_BLOCKED_REQUIREMENT_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedBlockedRequirementReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_BLOCKED_REQUIREMENT_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedTraceModalityEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_TRACE_MODALITY_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedTraceModalityReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_TRACE_MODALITY_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedAudioRouteEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_AUDIO_ROUTE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedAudioRouteReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_ROUTE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedAudioCycleEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_AUDIO_CYCLE_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedAudioCycleReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_CYCLE_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedGraphComplexityEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_GRAPH_COMPLEXITY_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedGraphComplexityReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_GRAPH_COMPLEXITY_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedTraceVerificationMethodEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_TRACE_VERIFICATION_METHOD_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedTraceVerificationMethodReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedAudioProcessorOrphanEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_AUDIO_PROCESSOR_ORPHAN_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedAudioProcessorOrphanReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedModuleOrphanEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_MODULE_ORPHAN_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedModuleOrphanReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_MODULE_ORPHAN_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedUndeclaredModalityEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_UNDECLARED_MODALITY_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedUndeclaredModalityReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_UNDECLARED_MODALITY_V04_PATH)
    }
  });
}

function runReleaseReviewWithDegradedAudioModalityEvidence() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-release-review-summary.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_GENERATED_PATCH_READINESS_PATH: relativeToProject(DEGRADED_AUDIO_MODALITY_READINESS_PATH),
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH)
    }
  });
}

function runV04WithBlockedAudioModalityReleaseReview() {
  return spawnSync(process.execPath, ["tests/workflow/scripts/run-zoia-v04-readiness.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToProject(BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToProject(BLOCKED_AUDIO_MODALITY_V04_PATH)
    }
  });
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const releaseReviewCommand = runReleaseReviewWithMissingQualityCommand();
  const blockedReleaseReview = existsSync(BLOCKED_RELEASE_REVIEW_PATH) ? await readJson(BLOCKED_RELEASE_REVIEW_PATH) : null;
  const qualityBlocker = (blockedReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-required-command-missing" &&
      blocker.missingRequiredCommands?.includes(EXTRA_REQUIRED_COMMAND)
    );

  const v04Command = runV04WithBlockedReleaseReview();
  const blockedV04 = existsSync(BLOCKED_V04_PATH) ? await readJson(BLOCKED_V04_PATH) : null;
  const v04Blocker = (blockedV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const canonicalGeneratedReadiness = await readJson(resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-readiness/run-result.json"));
  const degradedContractReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedContractReadiness.summary.traceEvidenceNegativeControls.unsupportedPortRejected = false;
  await writeJson(DEGRADED_CONTRACT_READINESS_PATH, degradedContractReadiness);

  const contractReleaseReviewCommand = runReleaseReviewWithDegradedContractEvidence();
  const blockedContractReleaseReview = existsSync(BLOCKED_CONTRACT_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_CONTRACT_RELEASE_REVIEW_PATH)
    : null;
  const contractQualityBlocker = (blockedContractReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-contract-evidence-missing"
    );

  const contractV04Command = runV04WithBlockedContractReleaseReview();
  const blockedContractV04 = existsSync(BLOCKED_CONTRACT_V04_PATH) ? await readJson(BLOCKED_CONTRACT_V04_PATH) : null;
  const contractV04Blocker = (blockedContractV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedDuplicateModulePortReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedDuplicateModulePortReadiness.summary.traceEvidenceNegativeControls.duplicateModulePortRejected = false;
  await writeJson(DEGRADED_DUPLICATE_MODULE_PORT_READINESS_PATH, degradedDuplicateModulePortReadiness);

  const duplicateModulePortReleaseReviewCommand = runReleaseReviewWithDegradedDuplicateModulePortEvidence();
  const blockedDuplicateModulePortReleaseReview = existsSync(BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH)
    : null;
  const duplicateModulePortQualityBlocker = (blockedDuplicateModulePortReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-duplicate-module-port-evidence-missing"
    );

  const duplicateModulePortV04Command = runV04WithBlockedDuplicateModulePortReleaseReview();
  const blockedDuplicateModulePortV04 = existsSync(BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH) ? await readJson(BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH) : null;
  const duplicateModulePortV04Blocker = (blockedDuplicateModulePortV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedParamRangeReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedParamRangeReadiness.summary.traceEvidenceNegativeControls.paramRangeRejected = false;
  await writeJson(DEGRADED_PARAM_RANGE_READINESS_PATH, degradedParamRangeReadiness);

  const paramRangeReleaseReviewCommand = runReleaseReviewWithDegradedParamRangeEvidence();
  const blockedParamRangeReleaseReview = existsSync(BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH)
    : null;
  const paramRangeQualityBlocker = (blockedParamRangeReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-param-range-evidence-missing"
    );

  const paramRangeV04Command = runV04WithBlockedParamRangeReleaseReview();
  const blockedParamRangeV04 = existsSync(BLOCKED_PARAM_RANGE_V04_PATH) ? await readJson(BLOCKED_PARAM_RANGE_V04_PATH) : null;
  const paramRangeV04Blocker = (blockedParamRangeV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedParamNormalizationReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedParamNormalizationReadiness.summary.traceEvidenceNegativeControls.paramNormalizationRejected = false;
  await writeJson(DEGRADED_PARAM_NORMALIZATION_READINESS_PATH, degradedParamNormalizationReadiness);

  const paramNormalizationReleaseReviewCommand = runReleaseReviewWithDegradedParamNormalizationEvidence();
  const blockedParamNormalizationReleaseReview = existsSync(BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH)
    : null;
  const paramNormalizationQualityBlocker = (blockedParamNormalizationReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-param-normalization-evidence-missing"
    );

  const paramNormalizationV04Command = runV04WithBlockedParamNormalizationReleaseReview();
  const blockedParamNormalizationV04 = existsSync(BLOCKED_PARAM_NORMALIZATION_V04_PATH) ? await readJson(BLOCKED_PARAM_NORMALIZATION_V04_PATH) : null;
  const paramNormalizationV04Blocker = (blockedParamNormalizationV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedPortKindReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedPortKindReadiness.summary.traceEvidenceNegativeControls.portKindMismatchRejected = false;
  await writeJson(DEGRADED_PORT_KIND_READINESS_PATH, degradedPortKindReadiness);

  const portKindReleaseReviewCommand = runReleaseReviewWithDegradedPortKindEvidence();
  const blockedPortKindReleaseReview = existsSync(BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH)
    : null;
  const portKindQualityBlocker = (blockedPortKindReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-port-kind-evidence-missing"
    );

  const portKindV04Command = runV04WithBlockedPortKindReleaseReview();
  const blockedPortKindV04 = existsSync(BLOCKED_PORT_KIND_V04_PATH) ? await readJson(BLOCKED_PORT_KIND_V04_PATH) : null;
  const portKindV04Blocker = (blockedPortKindV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedConnectionGainReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedConnectionGainReadiness.summary.traceEvidenceNegativeControls.connectionGainNormalizationRejected = false;
  await writeJson(DEGRADED_CONNECTION_GAIN_READINESS_PATH, degradedConnectionGainReadiness);

  const connectionGainReleaseReviewCommand = runReleaseReviewWithDegradedConnectionGainEvidence();
  const blockedConnectionGainReleaseReview = existsSync(BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH)
    : null;
  const connectionGainQualityBlocker = (blockedConnectionGainReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-connection-gain-normalization-evidence-missing"
    );

  const connectionGainV04Command = runV04WithBlockedConnectionGainReleaseReview();
  const blockedConnectionGainV04 = existsSync(BLOCKED_CONNECTION_GAIN_V04_PATH) ? await readJson(BLOCKED_CONNECTION_GAIN_V04_PATH) : null;
  const connectionGainV04Blocker = (blockedConnectionGainV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedConnectionGainRangeReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedConnectionGainRangeReadiness.summary.traceEvidenceNegativeControls.connectionGainRangeRejected = false;
  await writeJson(DEGRADED_CONNECTION_GAIN_RANGE_READINESS_PATH, degradedConnectionGainRangeReadiness);

  const connectionGainRangeReleaseReviewCommand = runReleaseReviewWithDegradedConnectionGainRangeEvidence();
  const blockedConnectionGainRangeReleaseReview = existsSync(BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH)
    : null;
  const connectionGainRangeQualityBlocker = (blockedConnectionGainRangeReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-connection-gain-range-evidence-missing"
    );

  const connectionGainRangeV04Command = runV04WithBlockedConnectionGainRangeReleaseReview();
  const blockedConnectionGainRangeV04 = existsSync(BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH) ? await readJson(BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH) : null;
  const connectionGainRangeV04Blocker = (blockedConnectionGainRangeV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedDuplicateConnectionReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedDuplicateConnectionReadiness.summary.traceEvidenceNegativeControls.duplicateConnectionEndpointRejected = false;
  await writeJson(DEGRADED_DUPLICATE_CONNECTION_READINESS_PATH, degradedDuplicateConnectionReadiness);

  const duplicateConnectionReleaseReviewCommand = runReleaseReviewWithDegradedDuplicateConnectionEvidence();
  const blockedDuplicateConnectionReleaseReview = existsSync(BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH)
    : null;
  const duplicateConnectionQualityBlocker = (blockedDuplicateConnectionReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-duplicate-connection-endpoint-evidence-missing"
    );

  const duplicateConnectionV04Command = runV04WithBlockedDuplicateConnectionReleaseReview();
  const blockedDuplicateConnectionV04 = existsSync(BLOCKED_DUPLICATE_CONNECTION_V04_PATH) ? await readJson(BLOCKED_DUPLICATE_CONNECTION_V04_PATH) : null;
  const duplicateConnectionV04Blocker = (blockedDuplicateConnectionV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedSelfRouteReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedSelfRouteReadiness.summary.traceEvidenceNegativeControls.selfRouteRejected = false;
  await writeJson(DEGRADED_SELF_ROUTE_READINESS_PATH, degradedSelfRouteReadiness);

  const selfRouteReleaseReviewCommand = runReleaseReviewWithDegradedSelfRouteEvidence();
  const blockedSelfRouteReleaseReview = existsSync(BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH)
    : null;
  const selfRouteQualityBlocker = (blockedSelfRouteReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-self-route-evidence-missing"
    );

  const selfRouteV04Command = runV04WithBlockedSelfRouteReleaseReview();
  const blockedSelfRouteV04 = existsSync(BLOCKED_SELF_ROUTE_V04_PATH) ? await readJson(BLOCKED_SELF_ROUTE_V04_PATH) : null;
  const selfRouteV04Blocker = (blockedSelfRouteV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedModulationRouteReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedModulationRouteReadiness.summary.traceEvidenceNegativeControls.modulationRouteRejected = false;
  await writeJson(DEGRADED_MODULATION_ROUTE_READINESS_PATH, degradedModulationRouteReadiness);

  const modulationRouteReleaseReviewCommand = runReleaseReviewWithDegradedModulationRouteEvidence();
  const blockedModulationRouteReleaseReview = existsSync(BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH)
    : null;
  const modulationRouteQualityBlocker = (blockedModulationRouteReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-modulation-route-evidence-missing"
    );

  const modulationRouteV04Command = runV04WithBlockedModulationRouteReleaseReview();
  const blockedModulationRouteV04 = existsSync(BLOCKED_MODULATION_ROUTE_V04_PATH) ? await readJson(BLOCKED_MODULATION_ROUTE_V04_PATH) : null;
  const modulationRouteV04Blocker = (blockedModulationRouteV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedTraceCoverageReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedTraceCoverageReadiness.summary.traceEvidenceNegativeControls.traceGraphCoverageRejected = false;
  await writeJson(DEGRADED_TRACE_COVERAGE_READINESS_PATH, degradedTraceCoverageReadiness);

  const traceCoverageReleaseReviewCommand = runReleaseReviewWithDegradedTraceCoverageEvidence();
  const blockedTraceCoverageReleaseReview = existsSync(BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH)
    : null;
  const traceCoverageQualityBlocker = (blockedTraceCoverageReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-trace-graph-coverage-evidence-missing"
    );

  const traceCoverageV04Command = runV04WithBlockedTraceCoverageReleaseReview();
  const blockedTraceCoverageV04 = existsSync(BLOCKED_TRACE_COVERAGE_V04_PATH) ? await readJson(BLOCKED_TRACE_COVERAGE_V04_PATH) : null;
  const traceCoverageV04Blocker = (blockedTraceCoverageV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedBlockedRequirementReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedBlockedRequirementReadiness.summary.traceEvidenceNegativeControls.blockedRequirementRejected = false;
  await writeJson(DEGRADED_BLOCKED_REQUIREMENT_READINESS_PATH, degradedBlockedRequirementReadiness);

  const blockedRequirementReleaseReviewCommand = runReleaseReviewWithDegradedBlockedRequirementEvidence();
  const blockedBlockedRequirementReleaseReview = existsSync(BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH)
    : null;
  const blockedRequirementQualityBlocker = (blockedBlockedRequirementReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-blocked-requirement-evidence-missing"
    );

  const blockedRequirementV04Command = runV04WithBlockedBlockedRequirementReleaseReview();
  const blockedBlockedRequirementV04 = existsSync(BLOCKED_BLOCKED_REQUIREMENT_V04_PATH) ? await readJson(BLOCKED_BLOCKED_REQUIREMENT_V04_PATH) : null;
  const blockedRequirementV04Blocker = (blockedBlockedRequirementV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedTraceModalityReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedTraceModalityReadiness.summary.traceEvidenceNegativeControls.traceModalityCoverageRejected = false;
  await writeJson(DEGRADED_TRACE_MODALITY_READINESS_PATH, degradedTraceModalityReadiness);

  const traceModalityReleaseReviewCommand = runReleaseReviewWithDegradedTraceModalityEvidence();
  const blockedTraceModalityReleaseReview = existsSync(BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH)
    : null;
  const traceModalityQualityBlocker = (blockedTraceModalityReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-trace-modality-coverage-evidence-missing"
    );

  const traceModalityV04Command = runV04WithBlockedTraceModalityReleaseReview();
  const blockedTraceModalityV04 = existsSync(BLOCKED_TRACE_MODALITY_V04_PATH) ? await readJson(BLOCKED_TRACE_MODALITY_V04_PATH) : null;
  const traceModalityV04Blocker = (blockedTraceModalityV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedAudioRouteReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedAudioRouteReadiness.summary.traceEvidenceNegativeControls.audioRouteBypassRejected = false;
  await writeJson(DEGRADED_AUDIO_ROUTE_READINESS_PATH, degradedAudioRouteReadiness);

  const audioRouteReleaseReviewCommand = runReleaseReviewWithDegradedAudioRouteEvidence();
  const blockedAudioRouteReleaseReview = existsSync(BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH)
    : null;
  const audioRouteQualityBlocker = (blockedAudioRouteReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-audio-route-bypass-evidence-missing"
    );

  const audioRouteV04Command = runV04WithBlockedAudioRouteReleaseReview();
  const blockedAudioRouteV04 = existsSync(BLOCKED_AUDIO_ROUTE_V04_PATH) ? await readJson(BLOCKED_AUDIO_ROUTE_V04_PATH) : null;
  const audioRouteV04Blocker = (blockedAudioRouteV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedAudioCycleReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedAudioCycleReadiness.summary.traceEvidenceNegativeControls.audioCycleRejected = false;
  await writeJson(DEGRADED_AUDIO_CYCLE_READINESS_PATH, degradedAudioCycleReadiness);

  const audioCycleReleaseReviewCommand = runReleaseReviewWithDegradedAudioCycleEvidence();
  const blockedAudioCycleReleaseReview = existsSync(BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH)
    : null;
  const audioCycleQualityBlocker = (blockedAudioCycleReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-audio-cycle-evidence-missing"
    );

  const audioCycleV04Command = runV04WithBlockedAudioCycleReleaseReview();
  const blockedAudioCycleV04 = existsSync(BLOCKED_AUDIO_CYCLE_V04_PATH) ? await readJson(BLOCKED_AUDIO_CYCLE_V04_PATH) : null;
  const audioCycleV04Blocker = (blockedAudioCycleV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedGraphComplexityReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedGraphComplexityReadiness.summary.traceEvidenceNegativeControls.graphComplexityRejected = false;
  await writeJson(DEGRADED_GRAPH_COMPLEXITY_READINESS_PATH, degradedGraphComplexityReadiness);

  const graphComplexityReleaseReviewCommand = runReleaseReviewWithDegradedGraphComplexityEvidence();
  const blockedGraphComplexityReleaseReview = existsSync(BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH)
    : null;
  const graphComplexityQualityBlocker = (blockedGraphComplexityReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-graph-complexity-evidence-missing"
    );

  const graphComplexityV04Command = runV04WithBlockedGraphComplexityReleaseReview();
  const blockedGraphComplexityV04 = existsSync(BLOCKED_GRAPH_COMPLEXITY_V04_PATH) ? await readJson(BLOCKED_GRAPH_COMPLEXITY_V04_PATH) : null;
  const graphComplexityV04Blocker = (blockedGraphComplexityV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedTraceVerificationMethodReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedTraceVerificationMethodReadiness.summary.traceEvidenceNegativeControls.traceVerificationMethodRejected = false;
  await writeJson(DEGRADED_TRACE_VERIFICATION_METHOD_READINESS_PATH, degradedTraceVerificationMethodReadiness);

  const traceVerificationMethodReleaseReviewCommand = runReleaseReviewWithDegradedTraceVerificationMethodEvidence();
  const blockedTraceVerificationMethodReleaseReview = existsSync(BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH)
    : null;
  const traceVerificationMethodQualityBlocker = (blockedTraceVerificationMethodReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-trace-verification-method-evidence-missing"
    );

  const traceVerificationMethodV04Command = runV04WithBlockedTraceVerificationMethodReleaseReview();
  const blockedTraceVerificationMethodV04 = existsSync(BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH) ? await readJson(BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH) : null;
  const traceVerificationMethodV04Blocker = (blockedTraceVerificationMethodV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedAudioProcessorOrphanReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedAudioProcessorOrphanReadiness.summary.traceEvidenceNegativeControls.audioProcessorOrphanRejected = false;
  await writeJson(DEGRADED_AUDIO_PROCESSOR_ORPHAN_READINESS_PATH, degradedAudioProcessorOrphanReadiness);

  const audioProcessorOrphanReleaseReviewCommand = runReleaseReviewWithDegradedAudioProcessorOrphanEvidence();
  const blockedAudioProcessorOrphanReleaseReview = existsSync(BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH)
    : null;
  const audioProcessorOrphanQualityBlocker = (blockedAudioProcessorOrphanReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-audio-processor-orphan-evidence-missing"
    );

  const audioProcessorOrphanV04Command = runV04WithBlockedAudioProcessorOrphanReleaseReview();
  const blockedAudioProcessorOrphanV04 = existsSync(BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH) ? await readJson(BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH) : null;
  const audioProcessorOrphanV04Blocker = (blockedAudioProcessorOrphanV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedModuleOrphanReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedModuleOrphanReadiness.summary.traceEvidenceNegativeControls.moduleOrphanRejected = false;
  await writeJson(DEGRADED_MODULE_ORPHAN_READINESS_PATH, degradedModuleOrphanReadiness);

  const moduleOrphanReleaseReviewCommand = runReleaseReviewWithDegradedModuleOrphanEvidence();
  const blockedModuleOrphanReleaseReview = existsSync(BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH)
    : null;
  const moduleOrphanQualityBlocker = (blockedModuleOrphanReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-module-orphan-evidence-missing"
    );

  const moduleOrphanV04Command = runV04WithBlockedModuleOrphanReleaseReview();
  const blockedModuleOrphanV04 = existsSync(BLOCKED_MODULE_ORPHAN_V04_PATH) ? await readJson(BLOCKED_MODULE_ORPHAN_V04_PATH) : null;
  const moduleOrphanV04Blocker = (blockedModuleOrphanV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedUndeclaredModalityReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedUndeclaredModalityReadiness.summary.traceEvidenceNegativeControls.undeclaredModalityRejected = false;
  await writeJson(DEGRADED_UNDECLARED_MODALITY_READINESS_PATH, degradedUndeclaredModalityReadiness);

  const undeclaredModalityReleaseReviewCommand = runReleaseReviewWithDegradedUndeclaredModalityEvidence();
  const blockedUndeclaredModalityReleaseReview = existsSync(BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH)
    : null;
  const undeclaredModalityQualityBlocker = (blockedUndeclaredModalityReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-undeclared-modality-evidence-missing"
    );

  const undeclaredModalityV04Command = runV04WithBlockedUndeclaredModalityReleaseReview();
  const blockedUndeclaredModalityV04 = existsSync(BLOCKED_UNDECLARED_MODALITY_V04_PATH) ? await readJson(BLOCKED_UNDECLARED_MODALITY_V04_PATH) : null;
  const undeclaredModalityV04Blocker = (blockedUndeclaredModalityV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const degradedAudioModalityReadiness = structuredClone(canonicalGeneratedReadiness);
  degradedAudioModalityReadiness.summary.traceEvidenceNegativeControls.audioModalityRequiredRejected = false;
  await writeJson(DEGRADED_AUDIO_MODALITY_READINESS_PATH, degradedAudioModalityReadiness);

  const audioModalityReleaseReviewCommand = runReleaseReviewWithDegradedAudioModalityEvidence();
  const blockedAudioModalityReleaseReview = existsSync(BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH)
    ? await readJson(BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH)
    : null;
  const audioModalityQualityBlocker = (blockedAudioModalityReleaseReview?.blockers || [])
    .find((blocker) =>
      blocker.id === "release-review-summary-quality-failed" &&
      blocker.problemId === "reviewer-summary-generated-audio-modality-evidence-missing"
    );

  const audioModalityV04Command = runV04WithBlockedAudioModalityReleaseReview();
  const blockedAudioModalityV04 = existsSync(BLOCKED_AUDIO_MODALITY_V04_PATH) ? await readJson(BLOCKED_AUDIO_MODALITY_V04_PATH) : null;
  const audioModalityV04Blocker = (blockedAudioModalityV04?.blockers || [])
    .find((blocker) => blocker.id === "release-review-summary-failed");

  const problems = [];
  if (releaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-summary-quality-negative-control-command-passed",
      message: "Release-review summary passed with a required reviewer command omitted from validationCommands."
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
        message: "Release-review summary did not block with degraded reviewer-summary quality.",
        evidencePath: BLOCKED_RELEASE_REVIEW_PATH,
        observed: { status: blockedReleaseReview.status }
      });
    }
    if (!qualityBlocker) {
      problems.push({
        id: "summary-quality-blocker-missing",
        message: "Release-review summary did not report the missing reviewer command.",
        evidencePath: BLOCKED_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedReleaseReview.blockers || [] }
      });
    }
  }
  if (v04Command.status === 0) {
    problems.push({
      id: "v04-summary-quality-negative-control-command-passed",
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
  if (contractReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-contract-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated contract evidence degraded."
    });
  }
  if (!blockedContractReleaseReview) {
    problems.push({
      id: "blocked-contract-release-review-result-missing",
      message: "Blocked release-review summary for degraded contract evidence was not written.",
      evidencePath: BLOCKED_CONTRACT_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedContractReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-contract-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated contract evidence.",
        evidencePath: BLOCKED_CONTRACT_RELEASE_REVIEW_PATH,
        observed: { status: blockedContractReleaseReview.status }
      });
    }
    if (!contractQualityBlocker) {
      problems.push({
        id: "contract-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated contract evidence.",
        evidencePath: BLOCKED_CONTRACT_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedContractReleaseReview.blockers || [] }
      });
    }
  }
  if (contractV04Command.status === 0) {
    problems.push({
      id: "v04-contract-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated contract evidence."
    });
  }
  if (!blockedContractV04) {
    problems.push({
      id: "blocked-contract-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated contract evidence was not written.",
      evidencePath: BLOCKED_CONTRACT_V04_PATH
    });
  } else {
    if (blockedContractV04.status !== "blocked") {
      problems.push({
        id: "blocked-contract-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated contract evidence.",
        evidencePath: BLOCKED_CONTRACT_V04_PATH,
        observed: { status: blockedContractV04.status }
      });
    }
    if (!contractV04Blocker) {
      problems.push({
        id: "v04-contract-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated contract evidence.",
        evidencePath: BLOCKED_CONTRACT_V04_PATH,
        observed: { blockers: blockedContractV04.blockers || [] }
      });
    }
  }
  if (duplicateModulePortReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-duplicate-module-port-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated duplicate-module-port evidence degraded."
    });
  }
  if (!blockedDuplicateModulePortReleaseReview) {
    problems.push({
      id: "blocked-duplicate-module-port-release-review-result-missing",
      message: "Blocked release-review summary for degraded duplicate-module-port evidence was not written.",
      evidencePath: BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedDuplicateModulePortReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-duplicate-module-port-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated duplicate-module-port evidence.",
        evidencePath: BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH,
        observed: { status: blockedDuplicateModulePortReleaseReview.status }
      });
    }
    if (!duplicateModulePortQualityBlocker) {
      problems.push({
        id: "duplicate-module-port-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated duplicate-module-port evidence.",
        evidencePath: BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedDuplicateModulePortReleaseReview.blockers || [] }
      });
    }
  }
  if (duplicateModulePortV04Command.status === 0) {
    problems.push({
      id: "v04-duplicate-module-port-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated duplicate-module-port evidence."
    });
  }
  if (!blockedDuplicateModulePortV04) {
    problems.push({
      id: "blocked-duplicate-module-port-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated duplicate-module-port evidence was not written.",
      evidencePath: BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH
    });
  } else {
    if (blockedDuplicateModulePortV04.status !== "blocked") {
      problems.push({
        id: "blocked-duplicate-module-port-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated duplicate-module-port evidence.",
        evidencePath: BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH,
        observed: { status: blockedDuplicateModulePortV04.status }
      });
    }
    if (!duplicateModulePortV04Blocker) {
      problems.push({
        id: "v04-duplicate-module-port-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated duplicate-module-port evidence.",
        evidencePath: BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH,
        observed: { blockers: blockedDuplicateModulePortV04.blockers || [] }
      });
    }
  }
  if (paramRangeReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-param-range-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated parameter-range evidence degraded."
    });
  }
  if (!blockedParamRangeReleaseReview) {
    problems.push({
      id: "blocked-param-range-release-review-result-missing",
      message: "Blocked release-review summary for degraded parameter-range evidence was not written.",
      evidencePath: BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedParamRangeReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-param-range-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated parameter-range evidence.",
        evidencePath: BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH,
        observed: { status: blockedParamRangeReleaseReview.status }
      });
    }
    if (!paramRangeQualityBlocker) {
      problems.push({
        id: "param-range-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated parameter-range evidence.",
        evidencePath: BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedParamRangeReleaseReview.blockers || [] }
      });
    }
  }
  if (paramRangeV04Command.status === 0) {
    problems.push({
      id: "v04-param-range-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated parameter-range evidence."
    });
  }
  if (!blockedParamRangeV04) {
    problems.push({
      id: "blocked-param-range-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated parameter-range evidence was not written.",
      evidencePath: BLOCKED_PARAM_RANGE_V04_PATH
    });
  } else {
    if (blockedParamRangeV04.status !== "blocked") {
      problems.push({
        id: "blocked-param-range-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated parameter-range evidence.",
        evidencePath: BLOCKED_PARAM_RANGE_V04_PATH,
        observed: { status: blockedParamRangeV04.status }
      });
    }
    if (!paramRangeV04Blocker) {
      problems.push({
        id: "v04-param-range-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated parameter-range evidence.",
        evidencePath: BLOCKED_PARAM_RANGE_V04_PATH,
        observed: { blockers: blockedParamRangeV04.blockers || [] }
      });
    }
  }
  if (paramNormalizationReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-param-normalization-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated parameter-normalization evidence degraded."
    });
  }
  if (!blockedParamNormalizationReleaseReview) {
    problems.push({
      id: "blocked-param-normalization-release-review-result-missing",
      message: "Blocked release-review summary for degraded parameter-normalization evidence was not written.",
      evidencePath: BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedParamNormalizationReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-param-normalization-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated parameter-normalization evidence.",
        evidencePath: BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH,
        observed: { status: blockedParamNormalizationReleaseReview.status }
      });
    }
    if (!paramNormalizationQualityBlocker) {
      problems.push({
        id: "param-normalization-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated parameter-normalization evidence.",
        evidencePath: BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedParamNormalizationReleaseReview.blockers || [] }
      });
    }
  }
  if (paramNormalizationV04Command.status === 0) {
    problems.push({
      id: "v04-param-normalization-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated parameter-normalization evidence."
    });
  }
  if (!blockedParamNormalizationV04) {
    problems.push({
      id: "blocked-param-normalization-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated parameter-normalization evidence was not written.",
      evidencePath: BLOCKED_PARAM_NORMALIZATION_V04_PATH
    });
  } else {
    if (blockedParamNormalizationV04.status !== "blocked") {
      problems.push({
        id: "blocked-param-normalization-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated parameter-normalization evidence.",
        evidencePath: BLOCKED_PARAM_NORMALIZATION_V04_PATH,
        observed: { status: blockedParamNormalizationV04.status }
      });
    }
    if (!paramNormalizationV04Blocker) {
      problems.push({
        id: "v04-param-normalization-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated parameter-normalization evidence.",
        evidencePath: BLOCKED_PARAM_NORMALIZATION_V04_PATH,
        observed: { blockers: blockedParamNormalizationV04.blockers || [] }
      });
    }
  }
  if (portKindReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-port-kind-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated port-kind evidence degraded."
    });
  }
  if (!blockedPortKindReleaseReview) {
    problems.push({
      id: "blocked-port-kind-release-review-result-missing",
      message: "Blocked release-review summary for degraded port-kind evidence was not written.",
      evidencePath: BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedPortKindReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-port-kind-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated port-kind evidence.",
        evidencePath: BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH,
        observed: { status: blockedPortKindReleaseReview.status }
      });
    }
    if (!portKindQualityBlocker) {
      problems.push({
        id: "port-kind-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated port-kind evidence.",
        evidencePath: BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedPortKindReleaseReview.blockers || [] }
      });
    }
  }
  if (portKindV04Command.status === 0) {
    problems.push({
      id: "v04-port-kind-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated port-kind evidence."
    });
  }
  if (!blockedPortKindV04) {
    problems.push({
      id: "blocked-port-kind-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated port-kind evidence was not written.",
      evidencePath: BLOCKED_PORT_KIND_V04_PATH
    });
  } else {
    if (blockedPortKindV04.status !== "blocked") {
      problems.push({
        id: "blocked-port-kind-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated port-kind evidence.",
        evidencePath: BLOCKED_PORT_KIND_V04_PATH,
        observed: { status: blockedPortKindV04.status }
      });
    }
    if (!portKindV04Blocker) {
      problems.push({
        id: "v04-port-kind-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated port-kind evidence.",
        evidencePath: BLOCKED_PORT_KIND_V04_PATH,
        observed: { blockers: blockedPortKindV04.blockers || [] }
      });
    }
  }
  if (connectionGainReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-connection-gain-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated connection-gain evidence degraded."
    });
  }
  if (!blockedConnectionGainReleaseReview) {
    problems.push({
      id: "blocked-connection-gain-release-review-result-missing",
      message: "Blocked release-review summary for degraded connection-gain evidence was not written.",
      evidencePath: BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedConnectionGainReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-connection-gain-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated connection-gain evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH,
        observed: { status: blockedConnectionGainReleaseReview.status }
      });
    }
    if (!connectionGainQualityBlocker) {
      problems.push({
        id: "connection-gain-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated connection-gain evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedConnectionGainReleaseReview.blockers || [] }
      });
    }
  }
  if (connectionGainV04Command.status === 0) {
    problems.push({
      id: "v04-connection-gain-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated connection-gain evidence."
    });
  }
  if (!blockedConnectionGainV04) {
    problems.push({
      id: "blocked-connection-gain-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated connection-gain evidence was not written.",
      evidencePath: BLOCKED_CONNECTION_GAIN_V04_PATH
    });
  } else {
    if (blockedConnectionGainV04.status !== "blocked") {
      problems.push({
        id: "blocked-connection-gain-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated connection-gain evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_V04_PATH,
        observed: { status: blockedConnectionGainV04.status }
      });
    }
    if (!connectionGainV04Blocker) {
      problems.push({
        id: "v04-connection-gain-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated connection-gain evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_V04_PATH,
        observed: { blockers: blockedConnectionGainV04.blockers || [] }
      });
    }
  }
  if (connectionGainRangeReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-connection-gain-range-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated connection-gain range evidence degraded."
    });
  }
  if (!blockedConnectionGainRangeReleaseReview) {
    problems.push({
      id: "blocked-connection-gain-range-release-review-result-missing",
      message: "Blocked release-review summary for degraded connection-gain range evidence was not written.",
      evidencePath: BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedConnectionGainRangeReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-connection-gain-range-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated connection-gain range evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH,
        observed: { status: blockedConnectionGainRangeReleaseReview.status }
      });
    }
    if (!connectionGainRangeQualityBlocker) {
      problems.push({
        id: "connection-gain-range-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated connection-gain range evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedConnectionGainRangeReleaseReview.blockers || [] }
      });
    }
  }
  if (connectionGainRangeV04Command.status === 0) {
    problems.push({
      id: "v04-connection-gain-range-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated connection-gain range evidence."
    });
  }
  if (!blockedConnectionGainRangeV04) {
    problems.push({
      id: "blocked-connection-gain-range-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated connection-gain range evidence was not written.",
      evidencePath: BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH
    });
  } else {
    if (blockedConnectionGainRangeV04.status !== "blocked") {
      problems.push({
        id: "blocked-connection-gain-range-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated connection-gain range evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH,
        observed: { status: blockedConnectionGainRangeV04.status }
      });
    }
    if (!connectionGainRangeV04Blocker) {
      problems.push({
        id: "v04-connection-gain-range-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated connection-gain range evidence.",
        evidencePath: BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH,
        observed: { blockers: blockedConnectionGainRangeV04.blockers || [] }
      });
    }
  }
  if (duplicateConnectionReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-duplicate-connection-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated duplicate-connection evidence degraded."
    });
  }
  if (!blockedDuplicateConnectionReleaseReview) {
    problems.push({
      id: "blocked-duplicate-connection-release-review-result-missing",
      message: "Blocked release-review summary for degraded duplicate-connection evidence was not written.",
      evidencePath: BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedDuplicateConnectionReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-duplicate-connection-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated duplicate-connection evidence.",
        evidencePath: BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH,
        observed: { status: blockedDuplicateConnectionReleaseReview.status }
      });
    }
    if (!duplicateConnectionQualityBlocker) {
      problems.push({
        id: "duplicate-connection-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated duplicate-connection evidence.",
        evidencePath: BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedDuplicateConnectionReleaseReview.blockers || [] }
      });
    }
  }
  if (duplicateConnectionV04Command.status === 0) {
    problems.push({
      id: "v04-duplicate-connection-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated duplicate-connection evidence."
    });
  }
  if (!blockedDuplicateConnectionV04) {
    problems.push({
      id: "blocked-duplicate-connection-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated duplicate-connection evidence was not written.",
      evidencePath: BLOCKED_DUPLICATE_CONNECTION_V04_PATH
    });
  } else {
    if (blockedDuplicateConnectionV04.status !== "blocked") {
      problems.push({
        id: "blocked-duplicate-connection-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated duplicate-connection evidence.",
        evidencePath: BLOCKED_DUPLICATE_CONNECTION_V04_PATH,
        observed: { status: blockedDuplicateConnectionV04.status }
      });
    }
    if (!duplicateConnectionV04Blocker) {
      problems.push({
        id: "v04-duplicate-connection-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated duplicate-connection evidence.",
        evidencePath: BLOCKED_DUPLICATE_CONNECTION_V04_PATH,
        observed: { blockers: blockedDuplicateConnectionV04.blockers || [] }
      });
    }
  }
  if (selfRouteReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-self-route-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated self-route evidence degraded."
    });
  }
  if (!blockedSelfRouteReleaseReview) {
    problems.push({
      id: "blocked-self-route-release-review-result-missing",
      message: "Blocked release-review summary for degraded self-route evidence was not written.",
      evidencePath: BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedSelfRouteReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-self-route-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated self-route evidence.",
        evidencePath: BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH,
        observed: { status: blockedSelfRouteReleaseReview.status }
      });
    }
    if (!selfRouteQualityBlocker) {
      problems.push({
        id: "self-route-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated self-route evidence.",
        evidencePath: BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedSelfRouteReleaseReview.blockers || [] }
      });
    }
  }
  if (selfRouteV04Command.status === 0) {
    problems.push({
      id: "v04-self-route-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated self-route evidence."
    });
  }
  if (!blockedSelfRouteV04) {
    problems.push({
      id: "blocked-self-route-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated self-route evidence was not written.",
      evidencePath: BLOCKED_SELF_ROUTE_V04_PATH
    });
  } else {
    if (blockedSelfRouteV04.status !== "blocked") {
      problems.push({
        id: "blocked-self-route-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated self-route evidence.",
        evidencePath: BLOCKED_SELF_ROUTE_V04_PATH,
        observed: { status: blockedSelfRouteV04.status }
      });
    }
    if (!selfRouteV04Blocker) {
      problems.push({
        id: "v04-self-route-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated self-route evidence.",
        evidencePath: BLOCKED_SELF_ROUTE_V04_PATH,
        observed: { blockers: blockedSelfRouteV04.blockers || [] }
      });
    }
  }
  if (modulationRouteReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-modulation-route-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated modulation-route evidence degraded."
    });
  }
  if (!blockedModulationRouteReleaseReview) {
    problems.push({
      id: "blocked-modulation-route-release-review-result-missing",
      message: "Blocked release-review summary for degraded modulation-route evidence was not written.",
      evidencePath: BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedModulationRouteReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-modulation-route-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated modulation-route evidence.",
        evidencePath: BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH,
        observed: { status: blockedModulationRouteReleaseReview.status }
      });
    }
    if (!modulationRouteQualityBlocker) {
      problems.push({
        id: "modulation-route-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated modulation-route evidence.",
        evidencePath: BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedModulationRouteReleaseReview.blockers || [] }
      });
    }
  }
  if (modulationRouteV04Command.status === 0) {
    problems.push({
      id: "v04-modulation-route-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated modulation-route evidence."
    });
  }
  if (!blockedModulationRouteV04) {
    problems.push({
      id: "blocked-modulation-route-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated modulation-route evidence was not written.",
      evidencePath: BLOCKED_MODULATION_ROUTE_V04_PATH
    });
  } else {
    if (blockedModulationRouteV04.status !== "blocked") {
      problems.push({
        id: "blocked-modulation-route-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated modulation-route evidence.",
        evidencePath: BLOCKED_MODULATION_ROUTE_V04_PATH,
        observed: { status: blockedModulationRouteV04.status }
      });
    }
    if (!modulationRouteV04Blocker) {
      problems.push({
        id: "v04-modulation-route-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated modulation-route evidence.",
        evidencePath: BLOCKED_MODULATION_ROUTE_V04_PATH,
        observed: { blockers: blockedModulationRouteV04.blockers || [] }
      });
    }
  }
  if (traceCoverageReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-trace-coverage-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated trace-coverage evidence degraded."
    });
  }
  if (!blockedTraceCoverageReleaseReview) {
    problems.push({
      id: "blocked-trace-coverage-release-review-result-missing",
      message: "Blocked release-review summary for degraded trace-coverage evidence was not written.",
      evidencePath: BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedTraceCoverageReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-trace-coverage-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated trace-coverage evidence.",
        evidencePath: BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH,
        observed: { status: blockedTraceCoverageReleaseReview.status }
      });
    }
    if (!traceCoverageQualityBlocker) {
      problems.push({
        id: "trace-coverage-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated trace-coverage evidence.",
        evidencePath: BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedTraceCoverageReleaseReview.blockers || [] }
      });
    }
  }
  if (traceCoverageV04Command.status === 0) {
    problems.push({
      id: "v04-trace-coverage-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated trace-coverage evidence."
    });
  }
  if (!blockedTraceCoverageV04) {
    problems.push({
      id: "blocked-trace-coverage-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated trace-coverage evidence was not written.",
      evidencePath: BLOCKED_TRACE_COVERAGE_V04_PATH
    });
  } else {
    if (blockedTraceCoverageV04.status !== "blocked") {
      problems.push({
        id: "blocked-trace-coverage-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated trace-coverage evidence.",
        evidencePath: BLOCKED_TRACE_COVERAGE_V04_PATH,
        observed: { status: blockedTraceCoverageV04.status }
      });
    }
    if (!traceCoverageV04Blocker) {
      problems.push({
        id: "v04-trace-coverage-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated trace-coverage evidence.",
        evidencePath: BLOCKED_TRACE_COVERAGE_V04_PATH,
        observed: { blockers: blockedTraceCoverageV04.blockers || [] }
      });
    }
  }
  if (blockedRequirementReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-blocked-requirement-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated blocked-requirement evidence degraded."
    });
  }
  if (!blockedBlockedRequirementReleaseReview) {
    problems.push({
      id: "blocked-blocked-requirement-release-review-result-missing",
      message: "Blocked release-review summary for degraded blocked-requirement evidence was not written.",
      evidencePath: BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedBlockedRequirementReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-blocked-requirement-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated blocked-requirement evidence.",
        evidencePath: BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH,
        observed: { status: blockedBlockedRequirementReleaseReview.status }
      });
    }
    if (!blockedRequirementQualityBlocker) {
      problems.push({
        id: "blocked-requirement-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated blocked-requirement evidence.",
        evidencePath: BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedBlockedRequirementReleaseReview.blockers || [] }
      });
    }
  }
  if (blockedRequirementV04Command.status === 0) {
    problems.push({
      id: "v04-blocked-requirement-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated blocked-requirement evidence."
    });
  }
  if (!blockedBlockedRequirementV04) {
    problems.push({
      id: "blocked-blocked-requirement-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated blocked-requirement evidence was not written.",
      evidencePath: BLOCKED_BLOCKED_REQUIREMENT_V04_PATH
    });
  } else {
    if (blockedBlockedRequirementV04.status !== "blocked") {
      problems.push({
        id: "blocked-blocked-requirement-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated blocked-requirement evidence.",
        evidencePath: BLOCKED_BLOCKED_REQUIREMENT_V04_PATH,
        observed: { status: blockedBlockedRequirementV04.status }
      });
    }
    if (!blockedRequirementV04Blocker) {
      problems.push({
        id: "v04-blocked-requirement-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated blocked-requirement evidence.",
        evidencePath: BLOCKED_BLOCKED_REQUIREMENT_V04_PATH,
        observed: { blockers: blockedBlockedRequirementV04.blockers || [] }
      });
    }
  }
  if (traceModalityReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-trace-modality-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated trace-modality evidence degraded."
    });
  }
  if (!blockedTraceModalityReleaseReview) {
    problems.push({
      id: "blocked-trace-modality-release-review-result-missing",
      message: "Blocked release-review summary for degraded trace-modality evidence was not written.",
      evidencePath: BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedTraceModalityReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-trace-modality-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated trace-modality evidence.",
        evidencePath: BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH,
        observed: { status: blockedTraceModalityReleaseReview.status }
      });
    }
    if (!traceModalityQualityBlocker) {
      problems.push({
        id: "trace-modality-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated trace-modality evidence.",
        evidencePath: BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedTraceModalityReleaseReview.blockers || [] }
      });
    }
  }
  if (traceModalityV04Command.status === 0) {
    problems.push({
      id: "v04-trace-modality-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated trace-modality evidence."
    });
  }
  if (!blockedTraceModalityV04) {
    problems.push({
      id: "blocked-trace-modality-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated trace-modality evidence was not written.",
      evidencePath: BLOCKED_TRACE_MODALITY_V04_PATH
    });
  } else {
    if (blockedTraceModalityV04.status !== "blocked") {
      problems.push({
        id: "blocked-trace-modality-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated trace-modality evidence.",
        evidencePath: BLOCKED_TRACE_MODALITY_V04_PATH,
        observed: { status: blockedTraceModalityV04.status }
      });
    }
    if (!traceModalityV04Blocker) {
      problems.push({
        id: "v04-trace-modality-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated trace-modality evidence.",
        evidencePath: BLOCKED_TRACE_MODALITY_V04_PATH,
        observed: { blockers: blockedTraceModalityV04.blockers || [] }
      });
    }
  }
  if (audioRouteReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-audio-route-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated audio route evidence degraded."
    });
  }
  if (!blockedAudioRouteReleaseReview) {
    problems.push({
      id: "blocked-audio-route-release-review-result-missing",
      message: "Blocked release-review summary for degraded audio route evidence was not written.",
      evidencePath: BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedAudioRouteReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-audio-route-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated audio route evidence.",
        evidencePath: BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH,
        observed: { status: blockedAudioRouteReleaseReview.status }
      });
    }
    if (!audioRouteQualityBlocker) {
      problems.push({
        id: "audio-route-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated audio route evidence.",
        evidencePath: BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedAudioRouteReleaseReview.blockers || [] }
      });
    }
  }
  if (audioRouteV04Command.status === 0) {
    problems.push({
      id: "v04-audio-route-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated audio route evidence."
    });
  }
  if (!blockedAudioRouteV04) {
    problems.push({
      id: "blocked-audio-route-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated audio route evidence was not written.",
      evidencePath: BLOCKED_AUDIO_ROUTE_V04_PATH
    });
  } else {
    if (blockedAudioRouteV04.status !== "blocked") {
      problems.push({
        id: "blocked-audio-route-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated audio route evidence.",
        evidencePath: BLOCKED_AUDIO_ROUTE_V04_PATH,
        observed: { status: blockedAudioRouteV04.status }
      });
    }
    if (!audioRouteV04Blocker) {
      problems.push({
        id: "v04-audio-route-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated audio route evidence.",
        evidencePath: BLOCKED_AUDIO_ROUTE_V04_PATH,
        observed: { blockers: blockedAudioRouteV04.blockers || [] }
      });
    }
  }
  if (audioCycleReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-audio-cycle-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated audio-cycle evidence degraded."
    });
  }
  if (!blockedAudioCycleReleaseReview) {
    problems.push({
      id: "blocked-audio-cycle-release-review-result-missing",
      message: "Blocked release-review summary for degraded audio-cycle evidence was not written.",
      evidencePath: BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedAudioCycleReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-audio-cycle-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated audio-cycle evidence.",
        evidencePath: BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH,
        observed: { status: blockedAudioCycleReleaseReview.status }
      });
    }
    if (!audioCycleQualityBlocker) {
      problems.push({
        id: "audio-cycle-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated audio-cycle evidence.",
        evidencePath: BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedAudioCycleReleaseReview.blockers || [] }
      });
    }
  }
  if (audioCycleV04Command.status === 0) {
    problems.push({
      id: "v04-audio-cycle-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated audio-cycle evidence."
    });
  }
  if (!blockedAudioCycleV04) {
    problems.push({
      id: "blocked-audio-cycle-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated audio-cycle evidence was not written.",
      evidencePath: BLOCKED_AUDIO_CYCLE_V04_PATH
    });
  } else {
    if (blockedAudioCycleV04.status !== "blocked") {
      problems.push({
        id: "blocked-audio-cycle-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated audio-cycle evidence.",
        evidencePath: BLOCKED_AUDIO_CYCLE_V04_PATH,
        observed: { status: blockedAudioCycleV04.status }
      });
    }
    if (!audioCycleV04Blocker) {
      problems.push({
        id: "v04-audio-cycle-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated audio-cycle evidence.",
        evidencePath: BLOCKED_AUDIO_CYCLE_V04_PATH,
        observed: { blockers: blockedAudioCycleV04.blockers || [] }
      });
    }
  }
  if (graphComplexityReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-graph-complexity-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated graph-complexity evidence degraded."
    });
  }
  if (!blockedGraphComplexityReleaseReview) {
    problems.push({
      id: "blocked-graph-complexity-release-review-result-missing",
      message: "Blocked release-review summary for degraded graph-complexity evidence was not written.",
      evidencePath: BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedGraphComplexityReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-graph-complexity-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated graph-complexity evidence.",
        evidencePath: BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH,
        observed: { status: blockedGraphComplexityReleaseReview.status }
      });
    }
    if (!graphComplexityQualityBlocker) {
      problems.push({
        id: "graph-complexity-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated graph-complexity evidence.",
        evidencePath: BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedGraphComplexityReleaseReview.blockers || [] }
      });
    }
  }
  if (graphComplexityV04Command.status === 0) {
    problems.push({
      id: "v04-graph-complexity-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated graph-complexity evidence."
    });
  }
  if (!blockedGraphComplexityV04) {
    problems.push({
      id: "blocked-graph-complexity-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated graph-complexity evidence was not written.",
      evidencePath: BLOCKED_GRAPH_COMPLEXITY_V04_PATH
    });
  } else {
    if (blockedGraphComplexityV04.status !== "blocked") {
      problems.push({
        id: "blocked-graph-complexity-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated graph-complexity evidence.",
        evidencePath: BLOCKED_GRAPH_COMPLEXITY_V04_PATH,
        observed: { status: blockedGraphComplexityV04.status }
      });
    }
    if (!graphComplexityV04Blocker) {
      problems.push({
        id: "v04-graph-complexity-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated graph-complexity evidence.",
        evidencePath: BLOCKED_GRAPH_COMPLEXITY_V04_PATH,
        observed: { blockers: blockedGraphComplexityV04.blockers || [] }
      });
    }
  }
  if (traceVerificationMethodReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-trace-verification-method-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated trace-verification-method evidence degraded."
    });
  }
  if (!blockedTraceVerificationMethodReleaseReview) {
    problems.push({
      id: "blocked-trace-verification-method-release-review-result-missing",
      message: "Blocked release-review summary for degraded trace-verification-method evidence was not written.",
      evidencePath: BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedTraceVerificationMethodReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-trace-verification-method-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated trace-verification-method evidence.",
        evidencePath: BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH,
        observed: { status: blockedTraceVerificationMethodReleaseReview.status }
      });
    }
    if (!traceVerificationMethodQualityBlocker) {
      problems.push({
        id: "trace-verification-method-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated trace-verification-method evidence.",
        evidencePath: BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedTraceVerificationMethodReleaseReview.blockers || [] }
      });
    }
  }
  if (traceVerificationMethodV04Command.status === 0) {
    problems.push({
      id: "v04-trace-verification-method-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated trace-verification-method evidence."
    });
  }
  if (!blockedTraceVerificationMethodV04) {
    problems.push({
      id: "blocked-trace-verification-method-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated trace-verification-method evidence was not written.",
      evidencePath: BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH
    });
  } else {
    if (blockedTraceVerificationMethodV04.status !== "blocked") {
      problems.push({
        id: "blocked-trace-verification-method-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated trace-verification-method evidence.",
        evidencePath: BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH,
        observed: { status: blockedTraceVerificationMethodV04.status }
      });
    }
    if (!traceVerificationMethodV04Blocker) {
      problems.push({
        id: "v04-trace-verification-method-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated trace-verification-method evidence.",
        evidencePath: BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH,
        observed: { blockers: blockedTraceVerificationMethodV04.blockers || [] }
      });
    }
  }
  if (audioProcessorOrphanReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-audio-processor-orphan-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated audio-processor-orphan evidence degraded."
    });
  }
  if (!blockedAudioProcessorOrphanReleaseReview) {
    problems.push({
      id: "blocked-audio-processor-orphan-release-review-result-missing",
      message: "Blocked release-review summary for degraded audio-processor-orphan evidence was not written.",
      evidencePath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedAudioProcessorOrphanReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-audio-processor-orphan-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated audio-processor-orphan evidence.",
        evidencePath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH,
        observed: { status: blockedAudioProcessorOrphanReleaseReview.status }
      });
    }
    if (!audioProcessorOrphanQualityBlocker) {
      problems.push({
        id: "audio-processor-orphan-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated audio-processor-orphan evidence.",
        evidencePath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedAudioProcessorOrphanReleaseReview.blockers || [] }
      });
    }
  }
  if (audioProcessorOrphanV04Command.status === 0) {
    problems.push({
      id: "v04-audio-processor-orphan-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated audio-processor-orphan evidence."
    });
  }
  if (!blockedAudioProcessorOrphanV04) {
    problems.push({
      id: "blocked-audio-processor-orphan-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated audio-processor-orphan evidence was not written.",
      evidencePath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH
    });
  } else {
    if (blockedAudioProcessorOrphanV04.status !== "blocked") {
      problems.push({
        id: "blocked-audio-processor-orphan-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated audio-processor-orphan evidence.",
        evidencePath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH,
        observed: { status: blockedAudioProcessorOrphanV04.status }
      });
    }
    if (!audioProcessorOrphanV04Blocker) {
      problems.push({
        id: "v04-audio-processor-orphan-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated audio-processor-orphan evidence.",
        evidencePath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH,
        observed: { blockers: blockedAudioProcessorOrphanV04.blockers || [] }
      });
    }
  }
  if (moduleOrphanReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-module-orphan-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated module-orphan evidence degraded."
    });
  }
  if (!blockedModuleOrphanReleaseReview) {
    problems.push({
      id: "blocked-module-orphan-release-review-result-missing",
      message: "Blocked release-review summary for degraded module-orphan evidence was not written.",
      evidencePath: BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedModuleOrphanReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-module-orphan-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated module-orphan evidence.",
        evidencePath: BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH,
        observed: { status: blockedModuleOrphanReleaseReview.status }
      });
    }
    if (!moduleOrphanQualityBlocker) {
      problems.push({
        id: "module-orphan-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated module-orphan evidence.",
        evidencePath: BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedModuleOrphanReleaseReview.blockers || [] }
      });
    }
  }
  if (moduleOrphanV04Command.status === 0) {
    problems.push({
      id: "v04-module-orphan-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated module-orphan evidence."
    });
  }
  if (!blockedModuleOrphanV04) {
    problems.push({
      id: "blocked-module-orphan-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated module-orphan evidence was not written.",
      evidencePath: BLOCKED_MODULE_ORPHAN_V04_PATH
    });
  } else {
    if (blockedModuleOrphanV04.status !== "blocked") {
      problems.push({
        id: "blocked-module-orphan-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated module-orphan evidence.",
        evidencePath: BLOCKED_MODULE_ORPHAN_V04_PATH,
        observed: { status: blockedModuleOrphanV04.status }
      });
    }
    if (!moduleOrphanV04Blocker) {
      problems.push({
        id: "v04-module-orphan-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated module-orphan evidence.",
        evidencePath: BLOCKED_MODULE_ORPHAN_V04_PATH,
        observed: { blockers: blockedModuleOrphanV04.blockers || [] }
      });
    }
  }
  if (undeclaredModalityReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-undeclared-modality-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated undeclared-modality evidence degraded."
    });
  }
  if (!blockedUndeclaredModalityReleaseReview) {
    problems.push({
      id: "blocked-undeclared-modality-release-review-result-missing",
      message: "Blocked release-review summary for degraded undeclared-modality evidence was not written.",
      evidencePath: BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedUndeclaredModalityReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-undeclared-modality-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated undeclared-modality evidence.",
        evidencePath: BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH,
        observed: { status: blockedUndeclaredModalityReleaseReview.status }
      });
    }
    if (!undeclaredModalityQualityBlocker) {
      problems.push({
        id: "undeclared-modality-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated undeclared-modality evidence.",
        evidencePath: BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedUndeclaredModalityReleaseReview.blockers || [] }
      });
    }
  }
  if (undeclaredModalityV04Command.status === 0) {
    problems.push({
      id: "v04-undeclared-modality-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated undeclared-modality evidence."
    });
  }
  if (!blockedUndeclaredModalityV04) {
    problems.push({
      id: "blocked-undeclared-modality-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated undeclared-modality evidence was not written.",
      evidencePath: BLOCKED_UNDECLARED_MODALITY_V04_PATH
    });
  } else {
    if (blockedUndeclaredModalityV04.status !== "blocked") {
      problems.push({
        id: "blocked-undeclared-modality-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated undeclared-modality evidence.",
        evidencePath: BLOCKED_UNDECLARED_MODALITY_V04_PATH,
        observed: { status: blockedUndeclaredModalityV04.status }
      });
    }
    if (!undeclaredModalityV04Blocker) {
      problems.push({
        id: "v04-undeclared-modality-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated undeclared-modality evidence.",
        evidencePath: BLOCKED_UNDECLARED_MODALITY_V04_PATH,
        observed: { blockers: blockedUndeclaredModalityV04.blockers || [] }
      });
    }
  }
  if (audioModalityReleaseReviewCommand.status === 0) {
    problems.push({
      id: "release-review-audio-modality-evidence-negative-control-command-passed",
      message: "Release-review summary passed with generated audio-modality evidence degraded."
    });
  }
  if (!blockedAudioModalityReleaseReview) {
    problems.push({
      id: "blocked-audio-modality-release-review-result-missing",
      message: "Blocked release-review summary for degraded audio-modality evidence was not written.",
      evidencePath: BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH
    });
  } else {
    if (blockedAudioModalityReleaseReview.status !== "blocked") {
      problems.push({
        id: "blocked-audio-modality-release-review-status-invalid",
        message: "Release-review summary did not block with degraded generated audio-modality evidence.",
        evidencePath: BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH,
        observed: { status: blockedAudioModalityReleaseReview.status }
      });
    }
    if (!audioModalityQualityBlocker) {
      problems.push({
        id: "audio-modality-summary-quality-blocker-missing",
        message: "Release-review summary did not report degraded generated audio-modality evidence.",
        evidencePath: BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH,
        observed: { blockers: blockedAudioModalityReleaseReview.blockers || [] }
      });
    }
  }
  if (audioModalityV04Command.status === 0) {
    problems.push({
      id: "v04-audio-modality-evidence-negative-control-command-passed",
      message: "v0.4 readiness passed with blocked release-review summary for degraded generated audio-modality evidence."
    });
  }
  if (!blockedAudioModalityV04) {
    problems.push({
      id: "blocked-audio-modality-v04-result-missing",
      message: "Blocked v0.4 readiness result for degraded generated audio-modality evidence was not written.",
      evidencePath: BLOCKED_AUDIO_MODALITY_V04_PATH
    });
  } else {
    if (blockedAudioModalityV04.status !== "blocked") {
      problems.push({
        id: "blocked-audio-modality-v04-status-invalid",
        message: "v0.4 readiness did not block with blocked release-review summary for degraded generated audio-modality evidence.",
        evidencePath: BLOCKED_AUDIO_MODALITY_V04_PATH,
        observed: { status: blockedAudioModalityV04.status }
      });
    }
    if (!audioModalityV04Blocker) {
      problems.push({
        id: "v04-audio-modality-release-review-blocker-missing",
        message: "v0.4 readiness did not report release-review-summary-failed for degraded generated audio-modality evidence.",
        evidencePath: BLOCKED_AUDIO_MODALITY_V04_PATH,
        observed: { blockers: blockedAudioModalityV04.blockers || [] }
      });
    }
  }

  const result = {
    schemaVersion: "zoia.release-review-summary-quality-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      caseCount: 22,
      passingCaseCount: problems.length === 0 ? 22 : 0,
      releaseReviewCommandExitCode: releaseReviewCommand.status,
      blockedReleaseReviewStatus: blockedReleaseReview?.status || null,
      summaryQualityBlockerFound: Boolean(qualityBlocker),
      v04CommandExitCode: v04Command.status,
      blockedV04Status: blockedV04?.status || null,
      v04ReleaseReviewBlockerFound: Boolean(v04Blocker),
      contractReleaseReviewCommandExitCode: contractReleaseReviewCommand.status,
      blockedContractReleaseReviewStatus: blockedContractReleaseReview?.status || null,
      generatedContractEvidenceBlockerFound: Boolean(contractQualityBlocker),
      contractV04CommandExitCode: contractV04Command.status,
      blockedContractV04Status: blockedContractV04?.status || null,
      contractV04ReleaseReviewBlockerFound: Boolean(contractV04Blocker),
      duplicateModulePortReleaseReviewCommandExitCode: duplicateModulePortReleaseReviewCommand.status,
      blockedDuplicateModulePortReleaseReviewStatus: blockedDuplicateModulePortReleaseReview?.status || null,
      generatedDuplicateModulePortEvidenceBlockerFound: Boolean(duplicateModulePortQualityBlocker),
      duplicateModulePortV04CommandExitCode: duplicateModulePortV04Command.status,
      blockedDuplicateModulePortV04Status: blockedDuplicateModulePortV04?.status || null,
      duplicateModulePortV04ReleaseReviewBlockerFound: Boolean(duplicateModulePortV04Blocker),
      paramRangeReleaseReviewCommandExitCode: paramRangeReleaseReviewCommand.status,
      blockedParamRangeReleaseReviewStatus: blockedParamRangeReleaseReview?.status || null,
      generatedParamRangeEvidenceBlockerFound: Boolean(paramRangeQualityBlocker),
      paramRangeV04CommandExitCode: paramRangeV04Command.status,
      blockedParamRangeV04Status: blockedParamRangeV04?.status || null,
      paramRangeV04ReleaseReviewBlockerFound: Boolean(paramRangeV04Blocker),
      paramNormalizationReleaseReviewCommandExitCode: paramNormalizationReleaseReviewCommand.status,
      blockedParamNormalizationReleaseReviewStatus: blockedParamNormalizationReleaseReview?.status || null,
      generatedParamNormalizationEvidenceBlockerFound: Boolean(paramNormalizationQualityBlocker),
      paramNormalizationV04CommandExitCode: paramNormalizationV04Command.status,
      blockedParamNormalizationV04Status: blockedParamNormalizationV04?.status || null,
      paramNormalizationV04ReleaseReviewBlockerFound: Boolean(paramNormalizationV04Blocker),
      portKindReleaseReviewCommandExitCode: portKindReleaseReviewCommand.status,
      blockedPortKindReleaseReviewStatus: blockedPortKindReleaseReview?.status || null,
      generatedPortKindEvidenceBlockerFound: Boolean(portKindQualityBlocker),
      portKindV04CommandExitCode: portKindV04Command.status,
      blockedPortKindV04Status: blockedPortKindV04?.status || null,
      portKindV04ReleaseReviewBlockerFound: Boolean(portKindV04Blocker),
      connectionGainReleaseReviewCommandExitCode: connectionGainReleaseReviewCommand.status,
      blockedConnectionGainReleaseReviewStatus: blockedConnectionGainReleaseReview?.status || null,
      generatedConnectionGainNormalizationEvidenceBlockerFound: Boolean(connectionGainQualityBlocker),
      connectionGainV04CommandExitCode: connectionGainV04Command.status,
      blockedConnectionGainV04Status: blockedConnectionGainV04?.status || null,
      connectionGainV04ReleaseReviewBlockerFound: Boolean(connectionGainV04Blocker),
      connectionGainRangeReleaseReviewCommandExitCode: connectionGainRangeReleaseReviewCommand.status,
      blockedConnectionGainRangeReleaseReviewStatus: blockedConnectionGainRangeReleaseReview?.status || null,
      generatedConnectionGainRangeEvidenceBlockerFound: Boolean(connectionGainRangeQualityBlocker),
      connectionGainRangeV04CommandExitCode: connectionGainRangeV04Command.status,
      blockedConnectionGainRangeV04Status: blockedConnectionGainRangeV04?.status || null,
      connectionGainRangeV04ReleaseReviewBlockerFound: Boolean(connectionGainRangeV04Blocker),
      duplicateConnectionReleaseReviewCommandExitCode: duplicateConnectionReleaseReviewCommand.status,
      blockedDuplicateConnectionReleaseReviewStatus: blockedDuplicateConnectionReleaseReview?.status || null,
      generatedDuplicateConnectionEndpointEvidenceBlockerFound: Boolean(duplicateConnectionQualityBlocker),
      duplicateConnectionV04CommandExitCode: duplicateConnectionV04Command.status,
      blockedDuplicateConnectionV04Status: blockedDuplicateConnectionV04?.status || null,
      duplicateConnectionV04ReleaseReviewBlockerFound: Boolean(duplicateConnectionV04Blocker),
      selfRouteReleaseReviewCommandExitCode: selfRouteReleaseReviewCommand.status,
      blockedSelfRouteReleaseReviewStatus: blockedSelfRouteReleaseReview?.status || null,
      generatedSelfRouteEvidenceBlockerFound: Boolean(selfRouteQualityBlocker),
      selfRouteV04CommandExitCode: selfRouteV04Command.status,
      blockedSelfRouteV04Status: blockedSelfRouteV04?.status || null,
      selfRouteV04ReleaseReviewBlockerFound: Boolean(selfRouteV04Blocker),
      modulationRouteReleaseReviewCommandExitCode: modulationRouteReleaseReviewCommand.status,
      blockedModulationRouteReleaseReviewStatus: blockedModulationRouteReleaseReview?.status || null,
      generatedModulationRouteEvidenceBlockerFound: Boolean(modulationRouteQualityBlocker),
      modulationRouteV04CommandExitCode: modulationRouteV04Command.status,
      blockedModulationRouteV04Status: blockedModulationRouteV04?.status || null,
      modulationRouteV04ReleaseReviewBlockerFound: Boolean(modulationRouteV04Blocker),
      traceCoverageReleaseReviewCommandExitCode: traceCoverageReleaseReviewCommand.status,
      blockedTraceCoverageReleaseReviewStatus: blockedTraceCoverageReleaseReview?.status || null,
      generatedTraceGraphCoverageEvidenceBlockerFound: Boolean(traceCoverageQualityBlocker),
      traceCoverageV04CommandExitCode: traceCoverageV04Command.status,
      blockedTraceCoverageV04Status: blockedTraceCoverageV04?.status || null,
      traceCoverageV04ReleaseReviewBlockerFound: Boolean(traceCoverageV04Blocker),
      blockedRequirementReleaseReviewCommandExitCode: blockedRequirementReleaseReviewCommand.status,
      blockedBlockedRequirementReleaseReviewStatus: blockedBlockedRequirementReleaseReview?.status || null,
      generatedBlockedRequirementEvidenceBlockerFound: Boolean(blockedRequirementQualityBlocker),
      blockedRequirementV04CommandExitCode: blockedRequirementV04Command.status,
      blockedBlockedRequirementV04Status: blockedBlockedRequirementV04?.status || null,
      blockedRequirementV04ReleaseReviewBlockerFound: Boolean(blockedRequirementV04Blocker),
      traceModalityReleaseReviewCommandExitCode: traceModalityReleaseReviewCommand.status,
      blockedTraceModalityReleaseReviewStatus: blockedTraceModalityReleaseReview?.status || null,
      generatedTraceModalityCoverageEvidenceBlockerFound: Boolean(traceModalityQualityBlocker),
      traceModalityV04CommandExitCode: traceModalityV04Command.status,
      blockedTraceModalityV04Status: blockedTraceModalityV04?.status || null,
      traceModalityV04ReleaseReviewBlockerFound: Boolean(traceModalityV04Blocker),
      audioRouteReleaseReviewCommandExitCode: audioRouteReleaseReviewCommand.status,
      blockedAudioRouteReleaseReviewStatus: blockedAudioRouteReleaseReview?.status || null,
      generatedAudioRouteBypassEvidenceBlockerFound: Boolean(audioRouteQualityBlocker),
      audioRouteV04CommandExitCode: audioRouteV04Command.status,
      blockedAudioRouteV04Status: blockedAudioRouteV04?.status || null,
      audioRouteV04ReleaseReviewBlockerFound: Boolean(audioRouteV04Blocker),
      audioCycleReleaseReviewCommandExitCode: audioCycleReleaseReviewCommand.status,
      blockedAudioCycleReleaseReviewStatus: blockedAudioCycleReleaseReview?.status || null,
      generatedAudioCycleEvidenceBlockerFound: Boolean(audioCycleQualityBlocker),
      audioCycleV04CommandExitCode: audioCycleV04Command.status,
      blockedAudioCycleV04Status: blockedAudioCycleV04?.status || null,
      audioCycleV04ReleaseReviewBlockerFound: Boolean(audioCycleV04Blocker),
      graphComplexityReleaseReviewCommandExitCode: graphComplexityReleaseReviewCommand.status,
      blockedGraphComplexityReleaseReviewStatus: blockedGraphComplexityReleaseReview?.status || null,
      generatedGraphComplexityEvidenceBlockerFound: Boolean(graphComplexityQualityBlocker),
      graphComplexityV04CommandExitCode: graphComplexityV04Command.status,
      blockedGraphComplexityV04Status: blockedGraphComplexityV04?.status || null,
      graphComplexityV04ReleaseReviewBlockerFound: Boolean(graphComplexityV04Blocker),
      traceVerificationMethodReleaseReviewCommandExitCode: traceVerificationMethodReleaseReviewCommand.status,
      blockedTraceVerificationMethodReleaseReviewStatus: blockedTraceVerificationMethodReleaseReview?.status || null,
      generatedTraceVerificationMethodEvidenceBlockerFound: Boolean(traceVerificationMethodQualityBlocker),
      traceVerificationMethodV04CommandExitCode: traceVerificationMethodV04Command.status,
      blockedTraceVerificationMethodV04Status: blockedTraceVerificationMethodV04?.status || null,
      traceVerificationMethodV04ReleaseReviewBlockerFound: Boolean(traceVerificationMethodV04Blocker),
      audioProcessorOrphanReleaseReviewCommandExitCode: audioProcessorOrphanReleaseReviewCommand.status,
      blockedAudioProcessorOrphanReleaseReviewStatus: blockedAudioProcessorOrphanReleaseReview?.status || null,
      generatedAudioProcessorOrphanEvidenceBlockerFound: Boolean(audioProcessorOrphanQualityBlocker),
      audioProcessorOrphanV04CommandExitCode: audioProcessorOrphanV04Command.status,
      blockedAudioProcessorOrphanV04Status: blockedAudioProcessorOrphanV04?.status || null,
      audioProcessorOrphanV04ReleaseReviewBlockerFound: Boolean(audioProcessorOrphanV04Blocker),
      moduleOrphanReleaseReviewCommandExitCode: moduleOrphanReleaseReviewCommand.status,
      blockedModuleOrphanReleaseReviewStatus: blockedModuleOrphanReleaseReview?.status || null,
      generatedModuleOrphanEvidenceBlockerFound: Boolean(moduleOrphanQualityBlocker),
      moduleOrphanV04CommandExitCode: moduleOrphanV04Command.status,
      blockedModuleOrphanV04Status: blockedModuleOrphanV04?.status || null,
      moduleOrphanV04ReleaseReviewBlockerFound: Boolean(moduleOrphanV04Blocker),
      undeclaredModalityReleaseReviewCommandExitCode: undeclaredModalityReleaseReviewCommand.status,
      blockedUndeclaredModalityReleaseReviewStatus: blockedUndeclaredModalityReleaseReview?.status || null,
      generatedUndeclaredModalityEvidenceBlockerFound: Boolean(undeclaredModalityQualityBlocker),
      undeclaredModalityV04CommandExitCode: undeclaredModalityV04Command.status,
      blockedUndeclaredModalityV04Status: blockedUndeclaredModalityV04?.status || null,
      undeclaredModalityV04ReleaseReviewBlockerFound: Boolean(undeclaredModalityV04Blocker),
      audioModalityReleaseReviewCommandExitCode: audioModalityReleaseReviewCommand.status,
      blockedAudioModalityReleaseReviewStatus: blockedAudioModalityReleaseReview?.status || null,
      generatedAudioModalityEvidenceBlockerFound: Boolean(audioModalityQualityBlocker),
      audioModalityV04CommandExitCode: audioModalityV04Command.status,
      blockedAudioModalityV04Status: blockedAudioModalityV04?.status || null,
      audioModalityV04ReleaseReviewBlockerFound: Boolean(audioModalityV04Blocker)
    },
    command: {
      releaseReviewStdout: releaseReviewCommand.stdout,
      releaseReviewStderr: releaseReviewCommand.stderr,
      v04Stdout: v04Command.stdout,
      v04Stderr: v04Command.stderr,
      contractReleaseReviewStdout: contractReleaseReviewCommand.stdout,
      contractReleaseReviewStderr: contractReleaseReviewCommand.stderr,
      contractV04Stdout: contractV04Command.stdout,
      contractV04Stderr: contractV04Command.stderr,
      duplicateModulePortReleaseReviewStdout: duplicateModulePortReleaseReviewCommand.stdout,
      duplicateModulePortReleaseReviewStderr: duplicateModulePortReleaseReviewCommand.stderr,
      duplicateModulePortV04Stdout: duplicateModulePortV04Command.stdout,
      duplicateModulePortV04Stderr: duplicateModulePortV04Command.stderr,
      paramRangeReleaseReviewStdout: paramRangeReleaseReviewCommand.stdout,
      paramRangeReleaseReviewStderr: paramRangeReleaseReviewCommand.stderr,
      paramRangeV04Stdout: paramRangeV04Command.stdout,
      paramRangeV04Stderr: paramRangeV04Command.stderr,
      paramNormalizationReleaseReviewStdout: paramNormalizationReleaseReviewCommand.stdout,
      paramNormalizationReleaseReviewStderr: paramNormalizationReleaseReviewCommand.stderr,
      paramNormalizationV04Stdout: paramNormalizationV04Command.stdout,
      paramNormalizationV04Stderr: paramNormalizationV04Command.stderr,
      portKindReleaseReviewStdout: portKindReleaseReviewCommand.stdout,
      portKindReleaseReviewStderr: portKindReleaseReviewCommand.stderr,
      portKindV04Stdout: portKindV04Command.stdout,
      portKindV04Stderr: portKindV04Command.stderr,
      connectionGainReleaseReviewStdout: connectionGainReleaseReviewCommand.stdout,
      connectionGainReleaseReviewStderr: connectionGainReleaseReviewCommand.stderr,
      connectionGainV04Stdout: connectionGainV04Command.stdout,
      connectionGainV04Stderr: connectionGainV04Command.stderr,
      connectionGainRangeReleaseReviewStdout: connectionGainRangeReleaseReviewCommand.stdout,
      connectionGainRangeReleaseReviewStderr: connectionGainRangeReleaseReviewCommand.stderr,
      connectionGainRangeV04Stdout: connectionGainRangeV04Command.stdout,
      connectionGainRangeV04Stderr: connectionGainRangeV04Command.stderr,
      duplicateConnectionReleaseReviewStdout: duplicateConnectionReleaseReviewCommand.stdout,
      duplicateConnectionReleaseReviewStderr: duplicateConnectionReleaseReviewCommand.stderr,
      duplicateConnectionV04Stdout: duplicateConnectionV04Command.stdout,
      duplicateConnectionV04Stderr: duplicateConnectionV04Command.stderr,
      selfRouteReleaseReviewStdout: selfRouteReleaseReviewCommand.stdout,
      selfRouteReleaseReviewStderr: selfRouteReleaseReviewCommand.stderr,
      selfRouteV04Stdout: selfRouteV04Command.stdout,
      selfRouteV04Stderr: selfRouteV04Command.stderr,
      modulationRouteReleaseReviewStdout: modulationRouteReleaseReviewCommand.stdout,
      modulationRouteReleaseReviewStderr: modulationRouteReleaseReviewCommand.stderr,
      modulationRouteV04Stdout: modulationRouteV04Command.stdout,
      modulationRouteV04Stderr: modulationRouteV04Command.stderr,
      traceCoverageReleaseReviewStdout: traceCoverageReleaseReviewCommand.stdout,
      traceCoverageReleaseReviewStderr: traceCoverageReleaseReviewCommand.stderr,
      traceCoverageV04Stdout: traceCoverageV04Command.stdout,
      traceCoverageV04Stderr: traceCoverageV04Command.stderr,
      blockedRequirementReleaseReviewStdout: blockedRequirementReleaseReviewCommand.stdout,
      blockedRequirementReleaseReviewStderr: blockedRequirementReleaseReviewCommand.stderr,
      blockedRequirementV04Stdout: blockedRequirementV04Command.stdout,
      blockedRequirementV04Stderr: blockedRequirementV04Command.stderr,
      traceModalityReleaseReviewStdout: traceModalityReleaseReviewCommand.stdout,
      traceModalityReleaseReviewStderr: traceModalityReleaseReviewCommand.stderr,
      traceModalityV04Stdout: traceModalityV04Command.stdout,
      traceModalityV04Stderr: traceModalityV04Command.stderr,
      audioRouteReleaseReviewStdout: audioRouteReleaseReviewCommand.stdout,
      audioRouteReleaseReviewStderr: audioRouteReleaseReviewCommand.stderr,
      audioRouteV04Stdout: audioRouteV04Command.stdout,
      audioRouteV04Stderr: audioRouteV04Command.stderr,
      audioCycleReleaseReviewStdout: audioCycleReleaseReviewCommand.stdout,
      audioCycleReleaseReviewStderr: audioCycleReleaseReviewCommand.stderr,
      audioCycleV04Stdout: audioCycleV04Command.stdout,
      audioCycleV04Stderr: audioCycleV04Command.stderr,
      graphComplexityReleaseReviewStdout: graphComplexityReleaseReviewCommand.stdout,
      graphComplexityReleaseReviewStderr: graphComplexityReleaseReviewCommand.stderr,
      graphComplexityV04Stdout: graphComplexityV04Command.stdout,
      graphComplexityV04Stderr: graphComplexityV04Command.stderr,
      traceVerificationMethodReleaseReviewStdout: traceVerificationMethodReleaseReviewCommand.stdout,
      traceVerificationMethodReleaseReviewStderr: traceVerificationMethodReleaseReviewCommand.stderr,
      traceVerificationMethodV04Stdout: traceVerificationMethodV04Command.stdout,
      traceVerificationMethodV04Stderr: traceVerificationMethodV04Command.stderr,
      audioProcessorOrphanReleaseReviewStdout: audioProcessorOrphanReleaseReviewCommand.stdout,
      audioProcessorOrphanReleaseReviewStderr: audioProcessorOrphanReleaseReviewCommand.stderr,
      audioProcessorOrphanV04Stdout: audioProcessorOrphanV04Command.stdout,
      audioProcessorOrphanV04Stderr: audioProcessorOrphanV04Command.stderr,
      moduleOrphanReleaseReviewStdout: moduleOrphanReleaseReviewCommand.stdout,
      moduleOrphanReleaseReviewStderr: moduleOrphanReleaseReviewCommand.stderr,
      moduleOrphanV04Stdout: moduleOrphanV04Command.stdout,
      moduleOrphanV04Stderr: moduleOrphanV04Command.stderr,
      undeclaredModalityReleaseReviewStdout: undeclaredModalityReleaseReviewCommand.stdout,
      undeclaredModalityReleaseReviewStderr: undeclaredModalityReleaseReviewCommand.stderr,
      undeclaredModalityV04Stdout: undeclaredModalityV04Command.stdout,
      undeclaredModalityV04Stderr: undeclaredModalityV04Command.stderr,
      audioModalityReleaseReviewStdout: audioModalityReleaseReviewCommand.stdout,
      audioModalityReleaseReviewStderr: audioModalityReleaseReviewCommand.stderr,
      audioModalityV04Stdout: audioModalityV04Command.stdout,
      audioModalityV04Stderr: audioModalityV04Command.stderr
    },
    problems,
    claimBoundary: "This negative-control gate verifies reviewer-summary quality failures block release-review summary and v0.4 readiness through isolated evidence paths.",
    artifacts: {
      resultPath: RESULT_PATH,
      blockedReleaseReviewPath: BLOCKED_RELEASE_REVIEW_PATH,
      blockedV04Path: BLOCKED_V04_PATH,
      degradedContractReadinessPath: DEGRADED_CONTRACT_READINESS_PATH,
      blockedContractReleaseReviewPath: BLOCKED_CONTRACT_RELEASE_REVIEW_PATH,
      blockedContractV04Path: BLOCKED_CONTRACT_V04_PATH,
      degradedDuplicateModulePortReadinessPath: DEGRADED_DUPLICATE_MODULE_PORT_READINESS_PATH,
      blockedDuplicateModulePortReleaseReviewPath: BLOCKED_DUPLICATE_MODULE_PORT_RELEASE_REVIEW_PATH,
      blockedDuplicateModulePortV04Path: BLOCKED_DUPLICATE_MODULE_PORT_V04_PATH,
      degradedParamRangeReadinessPath: DEGRADED_PARAM_RANGE_READINESS_PATH,
      blockedParamRangeReleaseReviewPath: BLOCKED_PARAM_RANGE_RELEASE_REVIEW_PATH,
      blockedParamRangeV04Path: BLOCKED_PARAM_RANGE_V04_PATH,
      degradedParamNormalizationReadinessPath: DEGRADED_PARAM_NORMALIZATION_READINESS_PATH,
      blockedParamNormalizationReleaseReviewPath: BLOCKED_PARAM_NORMALIZATION_RELEASE_REVIEW_PATH,
      blockedParamNormalizationV04Path: BLOCKED_PARAM_NORMALIZATION_V04_PATH,
      degradedPortKindReadinessPath: DEGRADED_PORT_KIND_READINESS_PATH,
      blockedPortKindReleaseReviewPath: BLOCKED_PORT_KIND_RELEASE_REVIEW_PATH,
      blockedPortKindV04Path: BLOCKED_PORT_KIND_V04_PATH,
      degradedConnectionGainReadinessPath: DEGRADED_CONNECTION_GAIN_READINESS_PATH,
      blockedConnectionGainReleaseReviewPath: BLOCKED_CONNECTION_GAIN_RELEASE_REVIEW_PATH,
      blockedConnectionGainV04Path: BLOCKED_CONNECTION_GAIN_V04_PATH,
      degradedConnectionGainRangeReadinessPath: DEGRADED_CONNECTION_GAIN_RANGE_READINESS_PATH,
      blockedConnectionGainRangeReleaseReviewPath: BLOCKED_CONNECTION_GAIN_RANGE_RELEASE_REVIEW_PATH,
      blockedConnectionGainRangeV04Path: BLOCKED_CONNECTION_GAIN_RANGE_V04_PATH,
      degradedDuplicateConnectionReadinessPath: DEGRADED_DUPLICATE_CONNECTION_READINESS_PATH,
      blockedDuplicateConnectionReleaseReviewPath: BLOCKED_DUPLICATE_CONNECTION_RELEASE_REVIEW_PATH,
      blockedDuplicateConnectionV04Path: BLOCKED_DUPLICATE_CONNECTION_V04_PATH,
      degradedSelfRouteReadinessPath: DEGRADED_SELF_ROUTE_READINESS_PATH,
      blockedSelfRouteReleaseReviewPath: BLOCKED_SELF_ROUTE_RELEASE_REVIEW_PATH,
      blockedSelfRouteV04Path: BLOCKED_SELF_ROUTE_V04_PATH,
      degradedModulationRouteReadinessPath: DEGRADED_MODULATION_ROUTE_READINESS_PATH,
      blockedModulationRouteReleaseReviewPath: BLOCKED_MODULATION_ROUTE_RELEASE_REVIEW_PATH,
      blockedModulationRouteV04Path: BLOCKED_MODULATION_ROUTE_V04_PATH,
      degradedTraceCoverageReadinessPath: DEGRADED_TRACE_COVERAGE_READINESS_PATH,
      blockedTraceCoverageReleaseReviewPath: BLOCKED_TRACE_COVERAGE_RELEASE_REVIEW_PATH,
      blockedTraceCoverageV04Path: BLOCKED_TRACE_COVERAGE_V04_PATH,
      degradedBlockedRequirementReadinessPath: DEGRADED_BLOCKED_REQUIREMENT_READINESS_PATH,
      blockedBlockedRequirementReleaseReviewPath: BLOCKED_BLOCKED_REQUIREMENT_RELEASE_REVIEW_PATH,
      blockedBlockedRequirementV04Path: BLOCKED_BLOCKED_REQUIREMENT_V04_PATH,
      degradedTraceModalityReadinessPath: DEGRADED_TRACE_MODALITY_READINESS_PATH,
      blockedTraceModalityReleaseReviewPath: BLOCKED_TRACE_MODALITY_RELEASE_REVIEW_PATH,
      blockedTraceModalityV04Path: BLOCKED_TRACE_MODALITY_V04_PATH,
      degradedAudioRouteReadinessPath: DEGRADED_AUDIO_ROUTE_READINESS_PATH,
      blockedAudioRouteReleaseReviewPath: BLOCKED_AUDIO_ROUTE_RELEASE_REVIEW_PATH,
      blockedAudioRouteV04Path: BLOCKED_AUDIO_ROUTE_V04_PATH,
      degradedAudioCycleReadinessPath: DEGRADED_AUDIO_CYCLE_READINESS_PATH,
      blockedAudioCycleReleaseReviewPath: BLOCKED_AUDIO_CYCLE_RELEASE_REVIEW_PATH,
      blockedAudioCycleV04Path: BLOCKED_AUDIO_CYCLE_V04_PATH,
      degradedGraphComplexityReadinessPath: DEGRADED_GRAPH_COMPLEXITY_READINESS_PATH,
      blockedGraphComplexityReleaseReviewPath: BLOCKED_GRAPH_COMPLEXITY_RELEASE_REVIEW_PATH,
      blockedGraphComplexityV04Path: BLOCKED_GRAPH_COMPLEXITY_V04_PATH,
      degradedTraceVerificationMethodReadinessPath: DEGRADED_TRACE_VERIFICATION_METHOD_READINESS_PATH,
      blockedTraceVerificationMethodReleaseReviewPath: BLOCKED_TRACE_VERIFICATION_METHOD_RELEASE_REVIEW_PATH,
      blockedTraceVerificationMethodV04Path: BLOCKED_TRACE_VERIFICATION_METHOD_V04_PATH,
      degradedAudioProcessorOrphanReadinessPath: DEGRADED_AUDIO_PROCESSOR_ORPHAN_READINESS_PATH,
      blockedAudioProcessorOrphanReleaseReviewPath: BLOCKED_AUDIO_PROCESSOR_ORPHAN_RELEASE_REVIEW_PATH,
      blockedAudioProcessorOrphanV04Path: BLOCKED_AUDIO_PROCESSOR_ORPHAN_V04_PATH,
      degradedModuleOrphanReadinessPath: DEGRADED_MODULE_ORPHAN_READINESS_PATH,
      blockedModuleOrphanReleaseReviewPath: BLOCKED_MODULE_ORPHAN_RELEASE_REVIEW_PATH,
      blockedModuleOrphanV04Path: BLOCKED_MODULE_ORPHAN_V04_PATH,
      degradedUndeclaredModalityReadinessPath: DEGRADED_UNDECLARED_MODALITY_READINESS_PATH,
      blockedUndeclaredModalityReleaseReviewPath: BLOCKED_UNDECLARED_MODALITY_RELEASE_REVIEW_PATH,
      blockedUndeclaredModalityV04Path: BLOCKED_UNDECLARED_MODALITY_V04_PATH,
      degradedAudioModalityReadinessPath: DEGRADED_AUDIO_MODALITY_READINESS_PATH,
      blockedAudioModalityReleaseReviewPath: BLOCKED_AUDIO_MODALITY_RELEASE_REVIEW_PATH,
      blockedAudioModalityV04Path: BLOCKED_AUDIO_MODALITY_V04_PATH
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
    schemaVersion: "zoia.release-review-summary-quality-negative-controls-result.v1",
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
