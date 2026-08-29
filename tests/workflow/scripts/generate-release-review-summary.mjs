#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const RESULT_PATH = process.env.ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH)
  : resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-summary/run-result.json");
const JSON_SPACES = 2;

const EVIDENCE_PATHS = Object.freeze({
  communityCoverageIndex: "tests/workflow/evidence/community-coverage-index/run-result.json",
  generatedPatchSelection: "tests/workflow/evidence/generated-patch-selection/run-result.json",
  generatedPatchSelectorScoringRegression: "tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json",
  generatedPatchDrafts: "tests/workflow/evidence/generated-patch-drafts/run-result.json",
  generatedPatchValidation: process.env.ZOIA_GENERATED_PATCH_VALIDATION_PATH ||
    "tests/workflow/evidence/generated-patch-validation/run-result.json",
  generatedPatchTraceEvidenceNegativeControls: "tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json",
  generatedDraftProvenance: "tests/workflow/evidence/generated-patch-draft-provenance/run-result.json",
  generatedPatchPromptSmoke: "tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json",
  generatedPatchFromDescription: "tests/workflow/evidence/generated-patch-from-description/run-result.json",
  generatedPatchFromDescriptionNegativeControls: "tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json",
  generatedPatchExportBoundaryNegativeControls: "tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json",
  generatedPatchCandidateReview: process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_PATH ||
    "tests/workflow/evidence/generated-patch-candidate-review/run-result.json",
  generatedPatchCandidateReviewNegativeControls: "tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json",
  generatedReadinessNegativeControls: "tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json",
  generatedPatchClaimBoundary: "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json",
  generatedPatchReadiness: process.env.ZOIA_GENERATED_PATCH_READINESS_PATH ||
    "tests/workflow/evidence/generated-patch-readiness/run-result.json",
  v04ReadinessNegativeControls: "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json",
  releaseReviewFreshnessNegativeControls: "tests/workflow/evidence/release-review-freshness-negative-controls/run-result.json",
  releaseReviewCleanConsumerSmokeNegativeControls: "tests/workflow/evidence/release-review-clean-consumer-smoke-negative-controls/run-result.json",
  releaseReviewDocumentedEvidenceNegativeControls: "tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json",
  releaseReviewSummaryQualityNegativeControls: "tests/workflow/evidence/release-review-summary-quality-negative-controls/run-result.json",
  releaseReviewOverclaimNegativeControls: "tests/workflow/evidence/release-review-overclaim-negative-controls/run-result.json",
  releaseReviewPackageBoundaryOverclaimNegativeControls: "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json",
  releaseReviewPublicationProtectionNegativeControls: "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json",
  cleanConsumerSmoke: process.env.ZOIA_CLEAN_CONSUMER_SMOKE_PATH ||
    "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json",
  v04Readiness: "tests/workflow/evidence/v0.4-readiness/run-result.json"
});

const NON_BLOCKING_EVIDENCE_IDS = Object.freeze(new Set([
  "v04Readiness"
]));

const DOC_EVIDENCE_REFERENCE_DOCS = Object.freeze([
  ...(process.env.ZOIA_RELEASE_REVIEW_DOC_EVIDENCE_REFERENCE_DOCS
    ? process.env.ZOIA_RELEASE_REVIEW_DOC_EVIDENCE_REFERENCE_DOCS.split(/[;,]/u)
      .map((item) => item.trim())
      .filter(Boolean)
    : [
      "docs/VALIDATION.md",
      "docs/FEATURE_COVERAGE.md",
      "docs/PATCH_GENERATION.md",
      "docs/COMMUNITY_COVERAGE.md",
      "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
      "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md"
    ])
]);

const FRESHNESS_INPUTS = Object.freeze({
  communityCoverageIndex: [
    "tests/workflow/scripts/generate-community-coverage-index.mjs"
  ],
  generatedPatchSelection: [
    "tests/workflow/scripts/select-verified-patch-template.mjs",
    "tests/workflow/evidence/community-coverage-index/run-result.json"
  ],
  generatedPatchSelectorScoringRegression: [
    "tests/workflow/scripts/run-generated-patch-selector-scoring-regression.mjs",
    "tests/workflow/scripts/select-verified-patch-template.mjs",
    "tests/workflow/evidence/community-coverage-index/run-result.json"
  ],
  generatedPatchDrafts: [
    "tests/workflow/scripts/draft-generated-graphs-from-selection.mjs",
    "tests/workflow/evidence/generated-patch-selection/run-result.json"
  ],
  generatedPatchValidation: [
    "tests/workflow/scripts/validate-generated-patch-candidates.mjs",
    "tests/workflow/evidence/generated-patch-drafts/run-result.json"
  ],
  generatedPatchFromDescription: [
    "tests/workflow/scripts/generate-patch-from-description.mjs",
    "tests/workflow/scripts/select-verified-patch-template.mjs",
    "tests/workflow/scripts/draft-generated-graphs-from-selection.mjs",
    "tests/workflow/scripts/validate-generated-patch-candidates.mjs"
  ],
  generatedPatchTraceEvidenceNegativeControls: [
    "tests/workflow/scripts/validate-generated-patch-candidates.mjs",
    "tests/workflow/generated-patches/selection-bridge/invalid-missing-trace-evidence.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-missing-trace-evidence.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-duplicate-grid-position.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-duplicate-grid-position.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-duplicate-module-port.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-duplicate-module-port.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-effect-without-audio-modality.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-effect-without-audio-modality.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-blocked-requirement.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-blocked-requirement.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-audio-feedback-cycle.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-audio-feedback-cycle.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-graph-complexity.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-graph-complexity.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-trace-verification-method.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-trace-verification-method.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-orphan-audio-processor.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-orphan-audio-processor.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-orphan-cv-source.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-orphan-cv-source.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-undeclared-cv-route.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-undeclared-cv-route.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-synth-with-effect-core.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-synth-with-effect-core.trace.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-midi-modality.graph.json",
    "tests/workflow/generated-patches/selection-bridge/invalid-midi-modality.trace.json"
  ],
  generatedPatchFromDescriptionNegativeControls: [
    "tests/workflow/scripts/run-generated-patch-from-description-negative-controls.mjs",
    "tests/workflow/scripts/generate-patch-from-description.mjs",
    "tests/workflow/scripts/select-verified-patch-template.mjs"
  ],
  generatedPatchExportBoundaryNegativeControls: [
    "tests/workflow/scripts/run-generated-patch-export-boundary-negative-controls.mjs",
    "tests/workflow/scripts/validate-generated-patch-candidates.mjs",
    "tests/workflow/generated-patches/export-boundary/invalid-export-payload.graph.json",
    "tests/workflow/generated-patches/export-boundary/invalid-export-payload.trace.json"
  ],
  generatedPatchCandidateReview: [
    "tests/workflow/scripts/generate-patch-candidate-review-summary.mjs",
    "tests/workflow/evidence/generated-patch-from-description/run-result.json"
  ],
  generatedPatchCandidateReviewNegativeControls: [
    "tests/workflow/scripts/run-generated-patch-candidate-review-negative-controls.mjs",
    "tests/workflow/scripts/generate-patch-candidate-review-summary.mjs",
    "tests/workflow/scripts/generate-patch-generation-readiness-rollup.mjs",
    "tests/workflow/evidence/generated-patch-from-description/run-result.json"
  ],
  generatedDraftProvenance: [
    "tests/workflow/scripts/verify-generated-draft-provenance.mjs",
    "tests/workflow/evidence/generated-patch-drafts/run-result.json"
  ],
  generatedPatchPromptSmoke: [
    "tests/workflow/scripts/run-generated-patch-prompt-smoke.mjs",
    "tests/workflow/scripts/generate-patch-from-description.mjs",
    "tests/workflow/scripts/select-verified-patch-template.mjs",
    "tests/workflow/scripts/draft-generated-graphs-from-selection.mjs",
    "tests/workflow/scripts/validate-generated-patch-candidates.mjs"
  ],
  generatedReadinessNegativeControls: [
    "tests/workflow/scripts/run-generated-readiness-negative-controls.mjs",
    "tests/workflow/scripts/generate-patch-generation-readiness-rollup.mjs",
    "tests/workflow/evidence/generated-patch-draft-provenance/run-result.json",
    "tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json",
    "tests/workflow/evidence/generated-patch-from-description/run-result.json",
    "tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json"
  ],
  generatedPatchClaimBoundary: [
    "tests/workflow/scripts/verify-patch-generation-claim-boundary.mjs",
    "docs/PATCH_GENERATION.md",
    "docs/VALIDATION.md",
    "docs/FEATURE_COVERAGE.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md"
  ],
  generatedPatchReadiness: [
    "tests/workflow/scripts/generate-patch-generation-readiness-rollup.mjs",
    "docs/PATCH_GENERATION.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md",
    "tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json",
    "tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json",
    "tests/workflow/evidence/generated-patch-from-description/run-result.json",
    "tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json",
    "tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json",
    process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_PATH ||
      "tests/workflow/evidence/generated-patch-candidate-review/run-result.json",
    "tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json",
    "tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json",
    "tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json"
  ],
  v04ReadinessNegativeControls: [
    "tests/workflow/scripts/run-v04-readiness-negative-controls.mjs",
    "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
    "tests/workflow/evidence/generated-patch-readiness/run-result.json",
    "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json"
  ],
  releaseReviewFreshnessNegativeControls: [
    "tests/workflow/scripts/run-release-review-freshness-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
    process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_PATH ||
      "tests/workflow/evidence/generated-patch-candidate-review/run-result.json",
    process.env.ZOIA_GENERATED_PATCH_VALIDATION_PATH ||
      "tests/workflow/evidence/generated-patch-validation/run-result.json",
    process.env.ZOIA_CLEAN_CONSUMER_SMOKE_PATH ||
      "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json"
  ],
  releaseReviewCleanConsumerSmokeNegativeControls: [
    "tests/workflow/scripts/run-release-review-clean-consumer-smoke-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json"
  ],
  releaseReviewDocumentedEvidenceNegativeControls: [
    "tests/workflow/scripts/run-release-review-documented-evidence-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "tests/workflow/scripts/run-zoia-v04-readiness.mjs"
  ],
  releaseReviewSummaryQualityNegativeControls: [
    "tests/workflow/scripts/run-release-review-summary-quality-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "tests/workflow/scripts/run-zoia-v04-readiness.mjs"
  ],
  releaseReviewOverclaimNegativeControls: [
    "tests/workflow/scripts/run-release-review-overclaim-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md"
  ],
  releaseReviewPackageBoundaryOverclaimNegativeControls: [
    "tests/workflow/scripts/run-release-review-package-boundary-overclaim-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md"
  ],
  releaseReviewPublicationProtectionNegativeControls: [
    "tests/workflow/scripts/run-release-review-publication-protection-negative-controls.mjs",
    "tests/workflow/scripts/generate-release-review-summary.mjs",
    "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
    "tests/workflow/scripts/verify-patch-generation-claim-boundary.mjs",
    "package.json"
  ],
  cleanConsumerSmoke: [
    "tests/workflow/scripts/run-v04-clean-consumer-smoke.mjs",
    "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
    "tests/workflow/scripts/verify-patch-generation-claim-boundary.mjs",
    "package.json",
    "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md"
  ]
});

const VALIDATION_COMMANDS = Object.freeze([
  "npm run zoia:verify:community:coverage-index",
  "npm run zoia:generate:patch:select -- --description \"ambient delay with slow modulation and expression pedal feedback control\" --limit 8",
  "npm run zoia:generate:patch:select:regression",
  "npm run zoia:generate:patch:draft-from-selection -- --limit 3",
  "npm run zoia:generate:patch:validate -- --fixture-root tests/workflow/generated-patches/from-selection --no-negative-fixtures",
  "npm run zoia:generate:patch:trace-evidence:negative-controls",
  "npm run zoia:generate:patch:provenance",
  "npm run zoia:generate:patch:prompt-smoke",
  "npm run zoia:generate:patch:from-description",
  "npm run zoia:generate:patch:from-description:negative-controls",
  "npm run zoia:generate:patch:export-boundary:negative-controls",
  "npm run zoia:generate:patch:candidate-review",
  "npm run zoia:generate:patch:candidate-review:negative-controls",
  "npm run zoia:generate:patch:readiness:negative-controls",
  "npm run zoia:generate:patch:claim-boundary",
  "npm run zoia:generate:patch:readiness",
  "npm run zoia:verify:v04:negative-controls",
  "npm run zoia:release:review-summary:negative-controls",
  "npm run zoia:release:review-summary:clean-consumer-smoke-negative-controls",
  "npm run zoia:release:review-summary:doc-evidence-negative-controls",
  "npm run zoia:release:review-summary:quality-negative-controls",
  "npm run zoia:release:review-summary:overclaim-negative-controls",
  "npm run zoia:release:review-summary:package-boundary-overclaim-negative-controls",
  "npm run zoia:release:review-summary:publication-protection-negative-controls",
  "npm run zoia:verify:v04:clean-consumer-smoke",
  "npm run zoia:verify:v04"
]);

const REQUIRED_REVIEWER_COMMANDS = Object.freeze([
  ...[
    "npm run zoia:generate:patch:from-description",
    "npm run zoia:generate:patch:from-description:negative-controls",
    "npm run zoia:generate:patch:export-boundary:negative-controls",
    "npm run zoia:generate:patch:candidate-review",
    "npm run zoia:generate:patch:candidate-review:negative-controls",
    "npm run zoia:generate:patch:claim-boundary",
    "npm run zoia:generate:patch:readiness",
    "npm run zoia:release:review-summary:negative-controls",
    "npm run zoia:release:review-summary:doc-evidence-negative-controls",
    "npm run zoia:release:review-summary:quality-negative-controls",
    "npm run zoia:release:review-summary:overclaim-negative-controls",
    "npm run zoia:release:review-summary:package-boundary-overclaim-negative-controls",
    "npm run zoia:release:review-summary:publication-protection-negative-controls",
    "npm run zoia:verify:v04:clean-consumer-smoke",
    "npm run zoia:verify:v04"
  ],
  ...(process.env.ZOIA_RELEASE_REVIEW_EXTRA_REQUIRED_COMMANDS
    ? process.env.ZOIA_RELEASE_REVIEW_EXTRA_REQUIRED_COMMANDS.split(/;;/u)
      .map((item) => item.trim())
      .filter(Boolean)
    : [])
]);

const CLAIM_BOUNDARIES = Object.freeze([
  "Generated-patch work currently selects existing verified templates, emits intermediate graph and requirement-trace drafts, and validates those drafts before export.",
  "The current generated-patch path has bounded runtime/audio evidence for delay-family and static low-pass filter paths only; it does not claim binary .bin export or full novel patch synthesis.",
  "Human-facing release-review summaries must not imply release readiness, broad text-to-ZOIA support, audible cutoff sweep success, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support, or complete patch semantics.",
  "Human-facing package-boundary summaries must not imply npm publication readiness, GitHub readiness, copied evidence bundle publication, release readiness, package artifact publication, or broader publication readiness.",
  "Release-review and v0.4 workflows must not invoke Git, GitHub, tag, release, or npm publication commands without exact human-only passcode evidence.",
  "Community coverage evidence covers the local cached community corpus currently indexed by the workflow; it is not a rights, licensing, or future-corpus claim.",
  "Static structural classifications are explicit non-audio classifications and are not measured signal proofs."
]);

const CAPABILITY_RULES = Object.freeze([
  {
    capabilityArea: "community-coverage",
    patterns: [/^docs\/COMMUNITY_COVERAGE\.md$/, /^tests\/workflow\/scripts\/generate-community-coverage-index\.mjs$/]
  },
  {
    capabilityArea: "generated-patch-selection",
    patterns: [
      /^tests\/workflow\/scripts\/select-verified-patch-template\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-selector-scoring-regression\.mjs$/,
      /^tests\/workflow\/schemas\/patch-generation-intent\.schema\.json$/,
      /^tests\/workflow\/schemas\/patch-template-selection-result\.schema\.json$/
    ]
  },
  {
    capabilityArea: "generated-patch-draft-validation",
    patterns: [
      /^tests\/workflow\/scripts\/draft-generated-graphs-from-selection\.mjs$/,
      /^tests\/workflow\/scripts\/validate-generated-patch-candidates\.mjs$/,
      /^tests\/workflow\/scripts\/convert-generated-graph-to-emulator-patch\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-emulator-conversion-negative-controls\.mjs$/,
      /^tests\/workflow\/schemas\/generated-patch-/,
      /^tests\/workflow\/generated-patches\/from-/,
      /^tests\/workflow\/generated-patches\/manual-test\//,
      /^tests\/workflow\/generated-patches\/manual-test-emulator\//,
      /^tests\/workflow\/generated-patches\/selection-bridge\//,
      /^tests\/workflow\/generated-patches\/negative-selection\//
    ]
  },
  {
    capabilityArea: "generated-patch-export-boundary",
    patterns: [
      /^tests\/workflow\/scripts\/run-generated-patch-export-boundary-negative-controls\.mjs$/,
      /^tests\/workflow\/generated-patches\/export-boundary\//
    ]
  },
  {
    capabilityArea: "generated-patch-candidate-review",
    patterns: [
      /^tests\/workflow\/scripts\/generate-patch-candidate-review-summary\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-candidate-review-negative-controls\.mjs$/
    ]
  },
  {
    capabilityArea: "generated-patch-provenance-prompt-smoke",
    patterns: [
      /^tests\/workflow\/scripts\/verify-generated-draft-provenance\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-prompt-smoke\.mjs$/,
      /^tests\/workflow\/generated-patches\/prompt-smoke\//
    ]
  },
  {
    capabilityArea: "generated-patch-description-workflow",
    patterns: [
      /^tests\/workflow\/scripts\/generate-patch-from-description\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-from-description-negative-controls\.mjs$/,
      /^tests\/workflow\/generated-patches\/negative-description\//
    ]
  },
  {
    capabilityArea: "generated-patch-readiness-negative-controls",
    patterns: [
      /^tests\/workflow\/scripts\/generate-patch-generation-readiness-rollup\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-readiness-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/verify-patch-generation-claim-boundary\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-runtime-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-v04-clean-consumer-smoke\.mjs$/
    ]
  },
  {
    capabilityArea: "generated-patch-runtime-audio-evidence",
    patterns: [
      /^tests\/workflow\/playwright\/run-zoia-playwright-generated-patch-.*-evidence\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-text-prompt-runtime-rollup\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-prompt-breadth-rollup(?:-negative-controls)?\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-prompt-corpus-rollup(?:-negative-controls)?\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-prompt-repeatability-rollup(?:-negative-controls)?\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-non-delay-boundary-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-filter-repeatability-rollup\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-filter-repeatability-negative-controls\.mjs$/,
      /^tests\/workflow\/generated-patches\/filter-test\//,
      /^tests\/workflow\/generated-patches\/filter-test-emulator\//
    ]
  },
  {
    capabilityArea: "v04-readiness-negative-controls",
    patterns: [
      /^tests\/workflow\/scripts\/run-zoia-v04-readiness\.mjs$/,
      /^tests\/workflow\/scripts\/run-v04-readiness-negative-controls\.mjs$/
    ]
  },
  {
    capabilityArea: "release-readiness-docs",
    patterns: [
      /^docs\/VALIDATION\.md$/,
      /^docs\/FEATURE_COVERAGE\.md$/,
      /^docs\/PATCH_GENERATION\.md$/,
      /^docs\/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY\.md$/,
      /^docs\/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX\.md$/,
      /^docs\/TEXT_PROMPT_GENERATED_PATCH_EVIDENCE_INVENTORY\.md$/
    ]
  },
  {
    capabilityArea: "zoia-emulator-runtime",
    patterns: [
      /^products\/zoia\/index\.html$/,
      /^products\/zoia\/dist\/build-manifest\.json$/,
      /^products\/zoia\/dist\/zoia-emulator\.html$/,
      /^products\/zoia\/src\/scripts\/modules\/sim-engine\.js$/
    ]
  },
  {
    capabilityArea: "npm-script-surface",
    patterns: [/^package\.json$/]
  },
  {
    capabilityArea: "july24-local-demo-bundle",
    patterns: [/^July24_2026_Demo\//, /^\.gitignore$/]
  },
  {
    capabilityArea: "release-review-summary",
    patterns: [
      /^tests\/workflow\/scripts\/generate-release-review-summary\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-freshness-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-clean-consumer-smoke-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-documented-evidence-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-summary-quality-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-overclaim-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-package-boundary-overclaim-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/run-release-review-publication-protection-negative-controls\.mjs$/,
      /^tests\/workflow\/scripts\/generate-generated-patch-final-evidence-inventory\.mjs$/,
      /^tests\/workflow\/scripts\/run-generated-patch-final-evidence-inventory-negative-controls\.mjs$/
    ]
  }
]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeGitPath(path) {
  return path.replaceAll("\\", "/");
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout.trimEnd();
}

function currentBranch() {
  try {
    return runGit(["symbolic-ref", "--short", "HEAD"]);
  } catch {
    return runGit(["rev-parse", "--short", "HEAD"]);
  }
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const path = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) : rawPath;
  return {
    status,
    path: normalizeGitPath(path)
  };
}

function assignCapability(path) {
  const match = CAPABILITY_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(path)));
  return match?.capabilityArea || "uncategorized";
}

function reviewerSummaryQuality({ changedFilesByCapability, evidence, docEvidenceReferences, missingDocEvidenceReferences, uncategorizedFiles }) {
  const problems = [];
  const capabilityAreaCount = Object.keys(changedFilesByCapability).length;
  const protectedActionBoundaryPresent = true;
  const generatedPatchReadiness = evidence.find((item) => item.id === "generatedPatchReadiness");
  const generatedCandidateReview = generatedPatchReadiness?.summary?.candidateReview;
  const generatedCandidateReviewNegativeControls = generatedPatchReadiness?.summary?.candidateReviewNegativeControls;
  const generatedTraceEvidenceNegativeControls = generatedPatchReadiness?.summary?.traceEvidenceNegativeControls;
  const releaseReviewOverclaimNegativeControls = evidence.find((item) => item.id === "releaseReviewOverclaimNegativeControls");
  const releaseReviewPackageBoundaryOverclaimNegativeControls = evidence.find((item) =>
    item.id === "releaseReviewPackageBoundaryOverclaimNegativeControls"
  );
  const releaseReviewPublicationProtectionNegativeControls = evidence.find((item) =>
    item.id === "releaseReviewPublicationProtectionNegativeControls"
  );
  const releaseReviewCleanConsumerSmokeNegativeControls = evidence.find((item) => item.id === "releaseReviewCleanConsumerSmokeNegativeControls");
  const cleanConsumerSmoke = evidence.find((item) => item.id === "cleanConsumerSmoke");
  const missingRequiredCommands = REQUIRED_REVIEWER_COMMANDS
    .filter((command) => !VALIDATION_COMMANDS.includes(command));

  if (evidence.length !== Object.keys(EVIDENCE_PATHS).length) {
    problems.push({
      id: "reviewer-summary-evidence-count-mismatch",
      expected: Object.keys(EVIDENCE_PATHS).length,
      observed: evidence.length
    });
  }
  if (docEvidenceReferences.length === 0 || missingDocEvidenceReferences.length > 0) {
    problems.push({
      id: "reviewer-summary-documented-evidence-invalid",
      referenceCount: docEvidenceReferences.length,
      missingReferenceCount: missingDocEvidenceReferences.length
    });
  }
  if (CLAIM_BOUNDARIES.length < 4) {
    problems.push({
      id: "reviewer-summary-claim-boundaries-incomplete",
      claimBoundaryCount: CLAIM_BOUNDARIES.length
    });
  }
  if (missingRequiredCommands.length > 0) {
    problems.push({
      id: "reviewer-summary-required-command-missing",
      missingRequiredCommands
    });
  }
  if (!protectedActionBoundaryPresent) {
    problems.push({
      id: "reviewer-summary-protected-action-boundary-missing"
    });
  }
  if (uncategorizedFiles.length > 0) {
    problems.push({
      id: "reviewer-summary-uncategorized-files-present",
      uncategorizedCount: uncategorizedFiles.length
    });
  }
  if (
    !Number.isInteger(generatedCandidateReview?.sourceGraphRoleMismatchCount) ||
    generatedCandidateReview.sourceGraphRoleMismatchCount !== 0 ||
    generatedCandidateReviewNegativeControls?.roleOnlyRoleMismatchBlockerFound !== true ||
    generatedCandidateReviewNegativeControls?.roleOnlyGeneratedReadinessBlockerFound !== true ||
    !Number.isInteger(generatedCandidateReview?.traceGraphCoverageIncompleteCount) ||
    generatedCandidateReview.traceGraphCoverageIncompleteCount !== 0 ||
    generatedCandidateReviewNegativeControls?.traceGraphCoverageBlockerFound !== true ||
    generatedCandidateReviewNegativeControls?.traceIncompleteGeneratedReadinessBlockerFound !== true
  ) {
    problems.push({
      id: "reviewer-summary-generated-role-evidence-missing",
      observed: {
        sourceGraphRoleMismatchCount: generatedCandidateReview?.sourceGraphRoleMismatchCount ?? null,
        roleOnlyRoleMismatchBlockerFound: generatedCandidateReviewNegativeControls?.roleOnlyRoleMismatchBlockerFound ?? null,
        roleOnlyGeneratedReadinessBlockerFound: generatedCandidateReviewNegativeControls?.roleOnlyGeneratedReadinessBlockerFound ?? null,
        traceGraphCoverageIncompleteCount: generatedCandidateReview?.traceGraphCoverageIncompleteCount ?? null,
        traceGraphCoverageBlockerFound: generatedCandidateReviewNegativeControls?.traceGraphCoverageBlockerFound ?? null,
        traceIncompleteGeneratedReadinessBlockerFound: generatedCandidateReviewNegativeControls?.traceIncompleteGeneratedReadinessBlockerFound ?? null
      }
    });
  }
  if (
    generatedTraceEvidenceNegativeControls?.unsupportedModuleRejected !== true ||
    generatedTraceEvidenceNegativeControls?.unsupportedParamRejected !== true ||
    generatedTraceEvidenceNegativeControls?.unsupportedPortRejected !== true
  ) {
    problems.push({
      id: "reviewer-summary-generated-contract-evidence-missing",
      observed: {
        unsupportedModuleRejected: generatedTraceEvidenceNegativeControls?.unsupportedModuleRejected ?? null,
        unsupportedParamRejected: generatedTraceEvidenceNegativeControls?.unsupportedParamRejected ?? null,
        unsupportedPortRejected: generatedTraceEvidenceNegativeControls?.unsupportedPortRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.duplicateModulePortRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-duplicate-module-port-evidence-missing",
      observed: {
        duplicateModulePortRejected: generatedTraceEvidenceNegativeControls?.duplicateModulePortRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.paramRangeRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-param-range-evidence-missing",
      observed: {
        paramRangeRejected: generatedTraceEvidenceNegativeControls?.paramRangeRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.paramNormalizationRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-param-normalization-evidence-missing",
      observed: {
        paramNormalizationRejected: generatedTraceEvidenceNegativeControls?.paramNormalizationRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.portKindMismatchRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-port-kind-evidence-missing",
      observed: {
        portKindMismatchRejected: generatedTraceEvidenceNegativeControls?.portKindMismatchRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.connectionGainNormalizationRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-connection-gain-normalization-evidence-missing",
      observed: {
        connectionGainNormalizationRejected: generatedTraceEvidenceNegativeControls?.connectionGainNormalizationRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.connectionGainRangeRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-connection-gain-range-evidence-missing",
      observed: {
        connectionGainRangeRejected: generatedTraceEvidenceNegativeControls?.connectionGainRangeRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.duplicateConnectionEndpointRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-duplicate-connection-endpoint-evidence-missing",
      observed: {
        duplicateConnectionEndpointRejected: generatedTraceEvidenceNegativeControls?.duplicateConnectionEndpointRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.selfRouteRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-self-route-evidence-missing",
      observed: {
        selfRouteRejected: generatedTraceEvidenceNegativeControls?.selfRouteRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.modulationRouteRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-modulation-route-evidence-missing",
      observed: {
        modulationRouteRejected: generatedTraceEvidenceNegativeControls?.modulationRouteRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.traceGraphCoverageRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-trace-graph-coverage-evidence-missing",
      observed: {
        traceGraphCoverageRejected: generatedTraceEvidenceNegativeControls?.traceGraphCoverageRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.blockedRequirementRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-blocked-requirement-evidence-missing",
      observed: {
        blockedRequirementRejected: generatedTraceEvidenceNegativeControls?.blockedRequirementRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.traceModalityCoverageRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-trace-modality-coverage-evidence-missing",
      observed: {
        traceModalityCoverageRejected: generatedTraceEvidenceNegativeControls?.traceModalityCoverageRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.audioRouteBypassRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-audio-route-bypass-evidence-missing",
      observed: {
        audioRouteBypassRejected: generatedTraceEvidenceNegativeControls?.audioRouteBypassRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.audioCycleRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-audio-cycle-evidence-missing",
      observed: {
        audioCycleRejected: generatedTraceEvidenceNegativeControls?.audioCycleRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.graphComplexityRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-graph-complexity-evidence-missing",
      observed: {
        graphComplexityRejected: generatedTraceEvidenceNegativeControls?.graphComplexityRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.traceVerificationMethodRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-trace-verification-method-evidence-missing",
      observed: {
        traceVerificationMethodRejected: generatedTraceEvidenceNegativeControls?.traceVerificationMethodRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.audioProcessorOrphanRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-audio-processor-orphan-evidence-missing",
      observed: {
        audioProcessorOrphanRejected: generatedTraceEvidenceNegativeControls?.audioProcessorOrphanRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.moduleOrphanRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-module-orphan-evidence-missing",
      observed: {
        moduleOrphanRejected: generatedTraceEvidenceNegativeControls?.moduleOrphanRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.undeclaredModalityRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-undeclared-modality-evidence-missing",
      observed: {
        undeclaredModalityRejected: generatedTraceEvidenceNegativeControls?.undeclaredModalityRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.audioModalityRequiredRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-audio-modality-evidence-missing",
      observed: {
        audioModalityRequiredRejected: generatedTraceEvidenceNegativeControls?.audioModalityRequiredRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.declaredRoleCoreRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-declared-role-core-evidence-missing",
      observed: {
        declaredRoleCoreRejected: generatedTraceEvidenceNegativeControls?.declaredRoleCoreRejected ?? null
      }
    });
  }
  if (generatedTraceEvidenceNegativeControls?.unsupportedMidiModalityRejected !== true) {
    problems.push({
      id: "reviewer-summary-generated-unsupported-midi-modality-evidence-missing",
      observed: {
        unsupportedMidiModalityRejected: generatedTraceEvidenceNegativeControls?.unsupportedMidiModalityRejected ?? null
      }
    });
  }
  if (
    releaseReviewOverclaimNegativeControls?.status !== "pass" ||
    releaseReviewOverclaimNegativeControls?.summary?.baselineBoundaryStatus !== "pass" ||
    releaseReviewOverclaimNegativeControls?.summary?.caseCount !== 5 ||
    releaseReviewOverclaimNegativeControls?.summary?.passingCaseCount !== 5 ||
    releaseReviewOverclaimNegativeControls?.summary?.seededFailureCount !== 5 ||
    releaseReviewOverclaimNegativeControls?.summary?.expectedFailureFoundCount !== 5 ||
    releaseReviewOverclaimNegativeControls?.summary?.problemCount !== 0
  ) {
    problems.push({
      id: "reviewer-summary-overclaim-negative-controls-missing",
      observed: {
        status: releaseReviewOverclaimNegativeControls?.status ?? null,
        summary: releaseReviewOverclaimNegativeControls?.summary ?? null
      }
    });
  }
  if (
    releaseReviewPackageBoundaryOverclaimNegativeControls?.status !== "pass" ||
    releaseReviewPackageBoundaryOverclaimNegativeControls?.summary?.baselineBoundaryStatus !== "pass" ||
    releaseReviewPackageBoundaryOverclaimNegativeControls?.summary?.caseCount !== 5 ||
    releaseReviewPackageBoundaryOverclaimNegativeControls?.summary?.passingCaseCount !== 5 ||
    releaseReviewPackageBoundaryOverclaimNegativeControls?.summary?.seededFailureCount !== 5 ||
    releaseReviewPackageBoundaryOverclaimNegativeControls?.summary?.expectedFailureFoundCount !== 5 ||
    releaseReviewPackageBoundaryOverclaimNegativeControls?.summary?.problemCount !== 0
  ) {
    problems.push({
      id: "reviewer-summary-package-boundary-overclaim-negative-controls-missing",
      observed: {
        status: releaseReviewPackageBoundaryOverclaimNegativeControls?.status ?? null,
        summary: releaseReviewPackageBoundaryOverclaimNegativeControls?.summary ?? null
      }
    });
  }
  if (
    releaseReviewPublicationProtectionNegativeControls?.status !== "pass" ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.problemCount !== 0 ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.protectedActualCommandCount !== 0 ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.scriptTextFindingCount !== 0 ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.seededControlCount !== 6 ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.passingSeededControlCount !== 6 ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.expectedFailureFoundCount !== 6 ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.protectedBoundaryPresent !== true ||
    releaseReviewPublicationProtectionNegativeControls?.summary?.sourceControlSideEffectsPerformed !== false
  ) {
    problems.push({
      id: "reviewer-summary-publication-protection-negative-controls-missing",
      observed: {
        status: releaseReviewPublicationProtectionNegativeControls?.status ?? null,
        summary: releaseReviewPublicationProtectionNegativeControls?.summary ?? null
      }
    });
  }
  if (
    releaseReviewCleanConsumerSmokeNegativeControls?.status !== "pass" ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.problemCount !== 0 ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.caseCount !== 2 ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.passingCaseCount !== 2 ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.missingReleaseReviewCommandExitCode === 0 ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.missingReleaseReviewStatus !== "blocked" ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.missingCleanConsumerSmokeEvidenceBlockerFound !== true ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.missingCleanConsumerSmokeQualityBlockerFound !== true ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.missingCleanConsumerSmokeEvidenceMarkerFound !== true ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.missingProtectedBoundaryFound !== true ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.staleReleaseReviewCommandExitCode === 0 ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.staleReleaseReviewStatus !== "blocked" ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.staleCleanConsumerSmokeEvidenceBlockerFound !== true ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.staleCleanConsumerSmokeEvidenceMarkerFound !== true ||
    releaseReviewCleanConsumerSmokeNegativeControls?.summary?.staleProtectedBoundaryFound !== true
  ) {
    problems.push({
      id: "reviewer-summary-clean-consumer-smoke-negative-controls-missing",
      observed: {
        status: releaseReviewCleanConsumerSmokeNegativeControls?.status ?? null,
        summary: releaseReviewCleanConsumerSmokeNegativeControls?.summary ?? null
      }
    });
  }
  if (
    cleanConsumerSmoke?.status !== "pass" ||
    cleanConsumerSmoke?.summary?.problemCount !== 0 ||
    cleanConsumerSmoke?.summary?.packageManifestRequiredPathCount !== 6 ||
    cleanConsumerSmoke?.summary?.packageManifestMissingPathCount !== 0 ||
    cleanConsumerSmoke?.summary?.packageManifestNegativeControlCount !== 2 ||
    cleanConsumerSmoke?.summary?.packageManifestPassingNegativeControlCount !== 2 ||
    cleanConsumerSmoke?.summary?.packageMetadataValid !== true ||
    cleanConsumerSmoke?.summary?.packageScriptReferenceCount !== 4 ||
    cleanConsumerSmoke?.summary?.packageScriptMissingReferenceCount !== 0 ||
    cleanConsumerSmoke?.summary?.installedRequiredPathCount !== 8 ||
    cleanConsumerSmoke?.summary?.installedMissingPathCount !== 0 ||
    cleanConsumerSmoke?.summary?.v04ReadinessStatus !== "pass" ||
    cleanConsumerSmoke?.summary?.copiedEvidenceNegativeControlCount !== 4 ||
    cleanConsumerSmoke?.summary?.copiedEvidencePassingNegativeControlCount !== 4 ||
    cleanConsumerSmoke?.summary?.v04ReadinessBlockerCount !== 0 ||
    cleanConsumerSmoke?.summary?.v04ReadinessCleanConsumerBootstrap !== true ||
    cleanConsumerSmoke?.summary?.v04ReadinessReleaseReviewSummarySkippedForBootstrap !== true ||
    cleanConsumerSmoke?.summary?.v04ReadinessCleanConsumerSmokeSkippedForBootstrap !== true ||
    cleanConsumerSmoke?.summary?.claimBoundaryStatus !== "pass" ||
    cleanConsumerSmoke?.summary?.claimBoundaryProblemCount !== 0 ||
    cleanConsumerSmoke?.summary?.sourceTreeImportsUsedByInstalledCommands !== false ||
    cleanConsumerSmoke?.summary?.missingGeneratedEvidenceBlockedStatus !== "blocked" ||
    cleanConsumerSmoke?.summary?.staleReleaseReviewBlockedStatus !== "blocked" ||
    cleanConsumerSmoke?.summary?.releaseReviewRegenerationProbeExitCode === 0 ||
    cleanConsumerSmoke?.summary?.releaseReviewRegenerationGitWorktreeBlockerFound !== true ||
    cleanConsumerSmoke?.summary?.claimBoundaryCleanConsumerBootstrap !== true ||
    cleanConsumerSmoke?.summary?.claimBoundaryCleanConsumerSmokeSkippedForBootstrap !== true
  ) {
    problems.push({
      id: "reviewer-summary-clean-consumer-smoke-missing",
      observed: {
        status: cleanConsumerSmoke?.status ?? null,
        summary: cleanConsumerSmoke?.summary ?? null
      }
    });
  }

  return {
    status: problems.length === 0 ? "pass" : "blocked",
    problemCount: problems.length,
    capabilityAreaCount,
    evidenceCount: evidence.length,
    documentedEvidenceReferenceCount: docEvidenceReferences.length,
    documentedEvidenceMissingReferenceCount: missingDocEvidenceReferences.length,
    claimBoundaryCount: CLAIM_BOUNDARIES.length,
    validationCommandCount: VALIDATION_COMMANDS.length,
    missingRequiredCommands,
    protectedActionBoundaryPresent,
    generatedRoleEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-role-evidence-missing"),
    generatedTraceCoverageEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-role-evidence-missing"),
    generatedContractEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-contract-evidence-missing"),
    generatedDuplicateModulePortEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-duplicate-module-port-evidence-missing"),
    generatedParamRangeEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-param-range-evidence-missing"),
    generatedParamNormalizationEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-param-normalization-evidence-missing"),
    generatedPortKindEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-port-kind-evidence-missing"),
    generatedConnectionGainNormalizationEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-connection-gain-normalization-evidence-missing"),
    generatedConnectionGainRangeEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-connection-gain-range-evidence-missing"),
    generatedDuplicateConnectionEndpointEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-duplicate-connection-endpoint-evidence-missing"),
    generatedSelfRouteEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-self-route-evidence-missing"),
    generatedModulationRouteEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-modulation-route-evidence-missing"),
    generatedTraceGraphCoverageEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-trace-graph-coverage-evidence-missing"),
    generatedBlockedRequirementEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-blocked-requirement-evidence-missing"),
    generatedTraceModalityCoverageEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-trace-modality-coverage-evidence-missing"),
    generatedAudioRouteBypassEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-audio-route-bypass-evidence-missing"),
    generatedAudioCycleEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-audio-cycle-evidence-missing"),
    generatedGraphComplexityEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-graph-complexity-evidence-missing"),
    generatedTraceVerificationMethodEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-trace-verification-method-evidence-missing"),
    generatedAudioProcessorOrphanEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-audio-processor-orphan-evidence-missing"),
    generatedModuleOrphanEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-module-orphan-evidence-missing"),
    generatedUndeclaredModalityEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-undeclared-modality-evidence-missing"),
    generatedAudioModalityEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-audio-modality-evidence-missing"),
    generatedDeclaredRoleCoreEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-declared-role-core-evidence-missing"),
    generatedUnsupportedMidiModalityEvidencePresent: !problems.some((problem) => problem.id === "reviewer-summary-generated-unsupported-midi-modality-evidence-missing"),
    releaseReviewOverclaimNegativeControlsPresent: !problems.some((problem) => problem.id === "reviewer-summary-overclaim-negative-controls-missing"),
    releaseReviewPackageBoundaryOverclaimNegativeControlsPresent: !problems.some((problem) =>
      problem.id === "reviewer-summary-package-boundary-overclaim-negative-controls-missing"
    ),
    releaseReviewPublicationProtectionNegativeControlsPresent: !problems.some((problem) =>
      problem.id === "reviewer-summary-publication-protection-negative-controls-missing"
    ),
    releaseReviewCleanConsumerSmokeNegativeControlsPresent: !problems.some((problem) => problem.id === "reviewer-summary-clean-consumer-smoke-negative-controls-missing"),
    cleanConsumerSmokePresent: !problems.some((problem) => problem.id === "reviewer-summary-clean-consumer-smoke-missing"),
    problems
  };
}

async function readJsonIfPresent(relativePath) {
  const absolutePath = resolve(PROJECT_ROOT, relativePath);
  if (!existsSync(absolutePath)) return null;
  const text = await readFile(absolutePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function summarizeEvidence(id, relativePath, content) {
  if (!content) {
    return {
      id,
      path: relativePath,
      exists: false
    };
  }

  return {
    id,
    path: relativePath,
    exists: true,
    status: content.status ?? null,
    version: content.version ?? null,
    revision: content.revision ?? null,
    completedAt: content.completedAt ?? null,
    generatedAt: content.generatedAt ?? null,
    summary: content.summary ?? null,
    blockerCount: Array.isArray(content.blockers) ? content.blockers.length : null
  };
}

function evidenceTimestamp(item) {
  const value = item.completedAt || item.generatedAt || null;
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeEvidenceReference(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/[),.;:]+$/u, "");
}

function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^${escaped.replaceAll("*", ".*")}$`, "u");
}

async function evidenceReferenceExists(referencePath) {
  if (!referencePath.includes("*")) return existsSync(resolve(PROJECT_ROOT, referencePath));
  const normalized = normalizeGitPath(referencePath);
  const wildcardIndex = normalized.indexOf("*");
  const baseSlashIndex = normalized.slice(0, wildcardIndex).lastIndexOf("/");
  const baseDirectory = baseSlashIndex >= 0 ? normalized.slice(0, baseSlashIndex) : ".";
  const absoluteBaseDirectory = resolve(PROJECT_ROOT, baseDirectory);
  if (!existsSync(absoluteBaseDirectory)) return false;
  const matcher = wildcardToRegExp(normalized);
  for (const candidatePath of await recursiveFiles(absoluteBaseDirectory)) {
    const relativeCandidatePath = normalizeGitPath(candidatePath.slice(PROJECT_ROOT.length + 1));
    if (matcher.test(relativeCandidatePath)) return true;
  }
  return false;
}

async function recursiveFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await recursiveFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

async function documentedEvidenceReferences() {
  const references = [];
  for (const docPath of DOC_EVIDENCE_REFERENCE_DOCS) {
    const absoluteDocPath = resolve(PROJECT_ROOT, docPath);
    if (!existsSync(absoluteDocPath)) {
      references.push({
        docPath,
        path: docPath,
        exists: false,
        reason: "document missing"
      });
      continue;
    }

    const text = await readFile(absoluteDocPath, "utf8");
    const matches = text.matchAll(/tests[\\/]+workflow[\\/]+evidence[\\/]+[^\s`)]+/gu);
    for (const match of matches) {
      const referencePath = normalizeEvidenceReference(match[0]);
      references.push({
        docPath,
        path: referencePath,
        exists: await evidenceReferenceExists(referencePath)
      });
    }
  }

  const uniqueReferences = new Map();
  for (const reference of references) {
    const key = `${reference.docPath}:${reference.path}`;
    uniqueReferences.set(key, reference);
  }

  return [...uniqueReferences.values()];
}

async function sourceFreshnessCheck(item) {
  const sourcePaths = FRESHNESS_INPUTS[item.id] || [];
  if (!item.exists || sourcePaths.length === 0) return null;
  const evidenceTime = evidenceTimestamp(item);
  if (!evidenceTime) {
    return {
      id: item.id,
      evidencePath: item.path,
      sourcePaths,
      status: "stale",
      reason: "evidence timestamp is missing"
    };
  }
  const sourceStats = [];
  for (const sourcePath of sourcePaths) {
    const absolutePath = resolve(PROJECT_ROOT, sourcePath);
    if (!existsSync(absolutePath)) {
      sourceStats.push({
        path: sourcePath,
        exists: false,
        mtimeMs: null
      });
      continue;
    }
    const info = await stat(absolutePath);
    sourceStats.push({
      path: sourcePath,
      exists: true,
      mtimeMs: info.mtimeMs
    });
  }
  const newestSourceMtime = Math.max(...sourceStats.filter((item) => item.exists).map((item) => item.mtimeMs));
  const missingSources = sourceStats.filter((item) => !item.exists).map((item) => item.path);
  const stale = missingSources.length > 0 || newestSourceMtime > evidenceTime;
  return {
    id: item.id,
    evidencePath: item.path,
    sourcePaths,
    status: stale ? "stale" : "fresh",
    evidenceTimestamp: new Date(evidenceTime).toISOString(),
    newestSourceTimestamp: Number.isFinite(newestSourceMtime) ? new Date(newestSourceMtime).toISOString() : null,
    missingSources
  };
}

async function main() {
  await mkdir(dirname(RESULT_PATH), { recursive: true });

  const startedAt = nowIso();
  const statusLines = runGit(["status", "--short", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseStatusLine);
  const diffNameLines = runGit(["diff", "--name-only"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizeGitPath);

  const changedFilesByCapability = {};
  for (const entry of statusLines) {
    const capabilityArea = assignCapability(entry.path);
    changedFilesByCapability[capabilityArea] ||= [];
    changedFilesByCapability[capabilityArea].push(entry);
  }

  const evidence = [];
  for (const [id, relativePath] of Object.entries(EVIDENCE_PATHS)) {
    evidence.push(summarizeEvidence(id, relativePath, await readJsonIfPresent(relativePath)));
  }
  const freshness = (await Promise.all(evidence.map(sourceFreshnessCheck))).filter(Boolean);
  const docEvidenceReferences = await documentedEvidenceReferences();

  const blockingEvidence = evidence.filter((item) => !NON_BLOCKING_EVIDENCE_IDS.has(item.id));
  const missingEvidence = blockingEvidence.filter((item) => !item.exists).map((item) => item.path);
  const nonPassingEvidence = evidence
    .filter((item) => !NON_BLOCKING_EVIDENCE_IDS.has(item.id) && item.exists && item.status && item.status !== "pass")
    .map((item) => ({ id: item.id, path: item.path, status: item.status }));
  const uncategorizedFiles = changedFilesByCapability.uncategorized || [];
  const staleEvidence = freshness.filter((item) =>
    !NON_BLOCKING_EVIDENCE_IDS.has(item.id) && item.status !== "fresh"
  );
  const missingDocEvidenceReferences = docEvidenceReferences.filter((item) => !item.exists);
  const quality = reviewerSummaryQuality({
    changedFilesByCapability,
    evidence,
    docEvidenceReferences,
    missingDocEvidenceReferences,
    uncategorizedFiles
  });

  const result = {
    schemaVersion: "zoia.release-review-summary.v1",
    version: "0.4.0",
    releaseLine: "0.4.0 release-hardening",
    revision: 1,
    status: missingEvidence.length === 0 &&
      nonPassingEvidence.length === 0 &&
      uncategorizedFiles.length === 0 &&
      staleEvidence.length === 0 &&
      missingDocEvidenceReferences.length === 0 &&
      quality.status === "pass"
      ? "pass"
      : "blocked",
    startedAt,
    completedAt: nowIso(),
    git: {
      branch: currentBranch(),
      sourceControlSideEffectsPerformed: false,
      statusShort: statusLines,
      trackedDiffFiles: diffNameLines,
      changedFilesByCapability
    },
    evidence,
    freshness,
    reviewerSummaryQuality: quality,
    documentedEvidenceReferences: {
      docs: DOC_EVIDENCE_REFERENCE_DOCS,
      referenceCount: docEvidenceReferences.length,
      missingReferenceCount: missingDocEvidenceReferences.length,
      references: docEvidenceReferences
    },
    validationCommands: VALIDATION_COMMANDS,
    claimBoundaries: CLAIM_BOUNDARIES,
    protectedActionBlockers: [
      {
        actionClass: "github-remote-push-tag-release-source-control-side-effect",
        status: "blocked-unless-exact-human-passcode-is-provided",
        requiredPasscodeFormat: "HUMAN GITHUB APPROVAL: G:\\Projects\\MusicAndMidi\\ZOIA <specific git/source-control action>"
      }
    ],
    blockers: [
      ...missingEvidence.map((path) => ({
        id: "missing-release-review-evidence",
        path
      })),
      ...nonPassingEvidence.map((item) => ({
        id: "release-review-evidence-not-passing",
        ...item
      })),
      ...uncategorizedFiles.map((entry) => ({
        id: "release-review-file-uncategorized",
        ...entry
      })),
      ...staleEvidence.map((item) => ({
        ...item,
        id: "release-review-evidence-stale",
        evidenceId: item.id
      })),
      ...missingDocEvidenceReferences.map((item) => ({
        id: "release-review-documented-evidence-missing",
        docPath: item.docPath,
        path: item.path,
        reason: item.reason || "referenced evidence path missing"
      })),
      ...quality.problems.map((problem) => ({
        ...problem,
        id: "release-review-summary-quality-failed",
        problemId: problem.id
      }))
    ]
  };

  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");

  if (result.status !== "pass") {
    console.error(`Release-review summary blocked. See ${RESULT_PATH}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Release-review summary passed: ${RESULT_PATH}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
