#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-final-evidence-inventory");
const RESULT_PATH = process.env.ZOIA_FINAL_INVENTORY_RESULT_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_FINAL_INVENTORY_RESULT_PATH)
  : resolve(EVIDENCE_ROOT, "run-result.json");
const INVENTORY_JSON_PATH = process.env.ZOIA_FINAL_INVENTORY_JSON_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_FINAL_INVENTORY_JSON_PATH)
  : resolve(EVIDENCE_ROOT, "claim-inventory.json");
const INVENTORY_REPORT_PATH = process.env.ZOIA_FINAL_INVENTORY_REPORT_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_FINAL_INVENTORY_REPORT_PATH)
  : resolve(PROJECT_ROOT, "docs/TEXT_PROMPT_GENERATED_PATCH_EVIDENCE_INVENTORY.md");
const JSON_SPACES = 2;

const DOC_PATHS = Object.freeze((process.env.ZOIA_FINAL_INVENTORY_DOC_PATHS
  ? process.env.ZOIA_FINAL_INVENTORY_DOC_PATHS.split(/[;,]/u).map((item) => item.trim()).filter(Boolean)
  : [
    "README.md",
    "CHANGELOG.md",
    "GITHUB_READINESS.md",
    "docs/COMMUNITY_COVERAGE.md",
    "docs/FEATURE_COVERAGE.md",
    "docs/PATCH_GENERATION.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_EVIDENCE_INVENTORY.md",
    "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md",
    "docs/VALIDATION.md",
    "July24_2026_Demo/README_DEMO.md",
    "July24_2026_Demo/DEMO_STATUS.md"
  ]));

const RELEASE_REVIEW_PATH = process.env.ZOIA_FINAL_INVENTORY_RELEASE_REVIEW_PATH ||
  "tests/workflow/evidence/release-review-summary/run-result.json";
const CLEAN_CONSUMER_SMOKE_PATH = process.env.ZOIA_FINAL_INVENTORY_CLEAN_SMOKE_PATH ||
  "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json";
const CLAIM_BOUNDARY_PATH = process.env.ZOIA_FINAL_INVENTORY_CLAIM_BOUNDARY_PATH ||
  "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json";
const V04_READINESS_PATH = process.env.ZOIA_FINAL_INVENTORY_V04_READINESS_PATH ||
  "tests/workflow/evidence/v0.4-readiness/run-result.json";
const PACKAGE_JSON_PATH = process.env.ZOIA_FINAL_INVENTORY_PACKAGE_JSON_PATH || "package.json";
const MAX_DEPENDENCY_AGE_MS = Number(process.env.ZOIA_FINAL_INVENTORY_MAX_DEPENDENCY_AGE_MS || 24 * 60 * 60 * 1000);
const INVENTORIED_PACKAGE_SCRIPT_PATTERN = /^zoia:(?:generate:patch|release:review|verify:v04)(?::|$)/u;
const EXPLICIT_SUPPORT_PACKAGE_SCRIPTS = Object.freeze(new Set([
  "zoia:generate:patch:convert-emulator",
  "zoia:generate:patch:convert-emulator:negative-controls",
  "zoia:generate:patch:filter-repeatability:negative-controls",
  "zoia:generate:patch:final-evidence-inventory",
  "zoia:generate:patch:final-evidence-inventory:negative-controls",
  "zoia:generate:patch:prompt-breadth-rollup:negative-controls",
  "zoia:generate:patch:prompt-corpus-rollup:negative-controls",
  "zoia:generate:patch:prompt-repeatability-rollup:negative-controls"
]));
const SUPPORT_EVIDENCE_PATTERNS = Object.freeze([
  /^docs\//u,
  /^README\.md$/u,
  /^CHANGELOG\.md$/u,
  /^GITHUB_READINESS\.md$/u,
  /^tests\/workflow\/schemas\//u,
  /^tests\/workflow\/evidence\/q097-community-library-deep-consolidated\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/q110-test-patch-loader(?:\/|$)/u,
  /^tests\/workflow\/evidence\/community-coverage-index\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/community-coverage-index\/community-patch-verification-index\.csv$/u,
  /^tests\/workflow\/evidence\/q109-ci-gate-integration\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/q104-staged-patch-audio-all-baseline\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/v0\.4-test-patch-stimulus\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/v0\.3-trace-baseline(?:\/|$)/u,
  /^tests\/workflow\/evidence\/q106-community-patch-audio-classification-(?:baseline|v0\.4-playability-full-r1)\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/v0\.4-community-modality-rollup\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/v0\.4-community-playability-backlog(?:\/|$)/u,
  /^tests\/workflow\/evidence\/generated-patch-draft-guard-negative\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/manual-text-prompt-(?:test|emulator-conversion)\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/generated-patches\/(?:from-selection|manual-test|manual-test-emulator)(?:\/|$)/u,
  /^tests\/workflow\/evidence\/generated-patch-emulator-conversion-negative-controls\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/generated-patch-filter-runtime\/(?:prompt-graph|convert-emulator|playwright-load|filter-semantics|filter-semantics-cv-scaling)\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/generated-patch-filter-modulation-semantics-cv-scaling\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/generated-patch-filter-audible-sweep\/run-result\.json$/u,
  /^tests\/workflow\/evidence\/generated-patch-final-evidence-inventory(?:-negative-controls)?(?:\/|$)/u,
  /^July24_2026_Demo(?:\/|$)/u
]);

const REQUIRED_LIMITATION_PHRASE_GROUPS = Object.freeze([
  ["does not prove npm publication readiness", "must not imply npm publication readiness", "not npm publication readiness"],
  ["does not prove GitHub readiness", "must not imply GitHub readiness", "not GitHub readiness", "GitHub readiness"],
  ["does not prove copied evidence bundle publication", "must not imply copied evidence bundle publication", "copied evidence bundle publication"],
  ["does not prove release readiness", "must not imply release readiness", "not release readiness", "not mark the release ready"],
  ["does not prove broad text-to-ZOIA support", "must not imply release readiness, broad text-to-ZOIA support", "not prove broad text-to-ZOIA support", "does not claim arbitrary prompt coverage"],
  ["does not prove arbitrary prompt support", "must not imply release readiness, broad text-to-ZOIA support, broad audible cutoff sweep support, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support", "not prove arbitrary prompt coverage", "does not claim arbitrary prompt coverage"],
  ["does not prove broad audible cutoff sweep support", "does not prove arbitrary audible cutoff sweep support", "does not prove all filter cutoff sweep behavior", "must not imply release readiness, broad text-to-ZOIA support, broad audible cutoff sweep support"],
  ["does not prove hardware parity", "must not imply release readiness, broad text-to-ZOIA support, broad audible cutoff sweep support, unsupported non-delay runtime support, hardware export, hardware parity", "not prove hardware parity", "hardware parity"],
  ["does not prove complete patch semantics", "must not imply release readiness, broad text-to-ZOIA support, broad audible cutoff sweep support, unsupported non-delay runtime support, hardware export, hardware parity, full DSP accuracy, arbitrary prompt support, or complete patch semantics", "not prove complete patch semantics", "complete patch semantics"]
]);

const CLAIMS = Object.freeze([
  claim("selection", "Verified template selection from a text description", ["tests/workflow/evidence/generated-patch-selection/run-result.json", "tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json"], "npm run zoia:generate:patch:select", ["unmatched selection regression"], ["novel synthesis", "binary export"]),
  claim("graph-drafting", "Generated intermediate graph and requirement-trace drafts from selected measured templates", ["tests/workflow/evidence/generated-patch-drafts/run-result.json"], "npm run zoia:generate:patch:draft-from-selection", ["missing selection metadata guard"], ["runtime audio", "binary export"]),
  claim("pre-export-validation", "Pre-export generated graph validation rejects unsupported structure before export", ["tests/workflow/evidence/generated-patch-validation/run-result.json", "tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json"], "npm run zoia:generate:patch:validate", ["29 trace/graph negative fixtures"], ["hardware binary export"]),
  claim("provenance", "Generated drafts preserve provenance from selected measured candidates", ["tests/workflow/evidence/generated-patch-draft-provenance/run-result.json"], "npm run zoia:generate:patch:provenance", ["provenance mismatch checks"], ["musical quality"]),
  claim("prompt-smoke", "Prompt smoke paths resolve concrete core modules for supported smoke prompts", ["tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json"], "npm run zoia:generate:patch:prompt-smoke", ["missing concrete-core summary blocks readiness"], ["runtime semantics"]),
  claim("one-command-description", "One-command description workflow produces bounded generated graph candidates", ["tests/workflow/evidence/generated-patch-from-description/run-result.json"], "npm run zoia:generate:patch:from-description", ["unmatched-description negative control"], ["full novel synthesis"]),
  claim("description-negative-control", "Unmatched descriptions block without leaving stale drafts", ["tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json"], "npm run zoia:generate:patch:from-description:negative-controls", ["unmatched description"], ["arbitrary prompt support"]),
  claim("export-boundary", "Export-looking payload fields are rejected before readiness", ["tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json"], "npm run zoia:generate:patch:export-boundary:negative-controls", ["export payload seed"], ["binary export"]),
  claim("candidate-review", "Candidate review summarizes source, graph, trace, validation, and boundary evidence", ["tests/workflow/evidence/generated-patch-candidate-review/run-result.json"], "npm run zoia:generate:patch:candidate-review", ["candidate review negative controls"], ["release readiness"]),
  claim("candidate-review-controls", "Candidate review blocks missing source evidence, family/role mismatch, trace gaps, and intent mismatch", ["tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json"], "npm run zoia:generate:patch:candidate-review:negative-controls", ["five seeded candidate-review cases"], ["arbitrary prompt support"]),
  claim("generated-readiness", "Generated-patch readiness consumes current generated-patch evidence and blocks degraded runtime-audio controls", ["tests/workflow/evidence/generated-patch-readiness/run-result.json", "tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json"], "npm run zoia:generate:patch:readiness", ["generated readiness negative controls"], ["ready_for_review"]),
  claim("runtime-audio-controls", "Runtime-audio classification rejects silent, missing, stale, unsupported, and classified-only false passes", ["tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json"], "npm run zoia:generate:patch:runtime-negative-controls", ["five runtime-audio seeded cases"], ["new audio behavior"]),
  claim("load-runtime", "Generated emulator patch JSON loads in browser runtime with expected state counts", ["tests/workflow/evidence/manual-text-prompt-generated-patch-load/run-result.json"], "npm run zoia:test:playwright:generated-patch-load", ["unsupported generated module load blocker"], ["audio output"]),
  claim("delay-signal", "Generated delay-path patches produce measured signal under deterministic impulse stimulus", ["tests/workflow/evidence/generated-patch-audio/run-result.json"], "npm run zoia:test:playwright:generated-patch-audio", ["silent no-route control"], ["delay timing"]),
  claim("delay-semantics", "Stabilized generated delay fixtures produce delayed-window timing and reject bypassed delay", ["tests/workflow/evidence/generated-patch-delay-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-delay-semantics", ["bypassed-delay signal control"], ["original unmodified timing"]),
  claim("delay-modulation-route", "Deterministic CV into generated delay time route shifts delay timing", ["tests/workflow/evidence/generated-patch-modulation-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-modulation-semantics", ["disconnected route", "wrong target"], ["actual LFO waveform"]),
  claim("delay-lfo", "Generated LFO waveform and LFO-to-delay-time route are measurable in stabilized fixtures", ["tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-lfo-semantics", ["disconnected", "muted", "wrong target"], ["all modulation states"]),
  claim("expression-feedback", "Deterministic expression input through generated feedback route creates feedback-tail repeats", ["tests/workflow/evidence/generated-patch-expression-feedback-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-expression-feedback-semantics", ["disconnected", "low-expression", "inverted", "wrong target"], ["physical pedal hardware"]),
  claim("unmodified-timing", "Original generated delay patches classify under deterministic runtime inputs", ["tests/workflow/evidence/generated-patch-unmodified-modulated-timing/run-result.json"], "npm run zoia:test:playwright:generated-patch-unmodified-modulated-timing", ["muted audio input"], ["all prompt timing states"]),
  claim("corrupted-routes", "Corrupted generated routes change classification or block instead of preserving positive timing classification", ["tests/workflow/evidence/generated-patch-corrupted-route-negative-controls/run-result.json"], "npm run zoia:test:playwright:generated-patch-corrupted-route-negative-controls", ["LFO", "expression", "feedback", "audio route corruption"], ["complete patch semantics"]),
  claim("text-prompt-runtime-rollup", "Fresh delay prompt reaches generated graph, conversion, browser load, and runtime audio checks", ["tests/workflow/evidence/generated-patch-text-prompt-runtime-rollup/run-result.json"], "npm run zoia:generate:patch:text-prompt-runtime-rollup", ["child freshness checks"], ["broad prompt support"]),
  claim("prompt-breadth", "Prompt breadth distinguishes delay runtime support from non-delay blockers", ["tests/workflow/evidence/generated-patch-prompt-breadth-rollup/run-result.json", "tests/workflow/evidence/generated-patch-prompt-breadth-rollup-negative-controls/run-result.json"], "npm run zoia:generate:patch:prompt-breadth-rollup", ["unsupported/non-delay mislabel controls"], ["arbitrary prompt support"]),
  claim("prompt-corpus", "Representative prompt corpus maps delay success and non-delay blockers", ["tests/workflow/evidence/generated-patch-prompt-corpus-rollup/run-result.json", "tests/workflow/evidence/generated-patch-prompt-corpus-rollup-negative-controls/run-result.json"], "npm run zoia:generate:patch:prompt-corpus-rollup", ["filter/modulation/unsupported mislabel controls"], ["non-delay runtime semantics except filter"]),
  claim("delay-repeatability", "Delay-family route-semantics workflow repeats across two fresh variants", ["tests/workflow/evidence/generated-patch-prompt-repeatability-rollup/run-result.json", "tests/workflow/evidence/generated-patch-prompt-repeatability-rollup-negative-controls/run-result.json"], "npm run zoia:generate:patch:prompt-repeatability-rollup", ["stale evidence", "missing audio", "unsupported mislabel"], ["arbitrary prompts"]),
  claim("filter-runtime", "One generated filter prompt validates, converts, loads, and produces measured low-pass behavior", ["tests/workflow/evidence/generated-patch-filter-runtime/filter-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-filter-semantics", ["bypass", "high-pass wrong output"], ["resonance", "all filter modes"]),
  claim("filter-modulation-trace", "Generated LFO-to-filter-cutoff route has measurable LFO/cutoff trace evidence", ["tests/workflow/evidence/generated-patch-filter-modulation-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-filter-modulation-semantics", ["disconnected cutoff", "wrong target"], ["audible cutoff sweep beyond bounded fixture"]),
  claim("filter-audible-sweep", "Bounded generated filter LFO-to-cutoff route produces measured audible sweep evidence", ["tests/workflow/evidence/generated-patch-filter-audible-sweep/run-result.json"], "npm run zoia:test:playwright:generated-patch-filter-audible-sweep", ["disconnected cutoff", "exaggerated sweep positive detector"], ["broad audible cutoff sweep support"]),
  claim("reverb-runtime", "One generated Reverb Lite graph validates, converts, and produces measured wet-tail evidence", ["tests/workflow/evidence/generated-patch-reverb-validation/run-result.json", "tests/workflow/evidence/generated-patch-reverb-semantics/run-result.json"], "npm run zoia:test:playwright:generated-patch-reverb-semantics", ["bypass dry route"], ["broad reverb semantics", "decay CV", "tone semantics"]),
  claim("non-delay-boundaries", "Reachable non-delay prompt classes have explicit runtime or blocker boundaries", ["tests/workflow/evidence/generated-patch-non-delay-boundary-controls/run-result.json"], "npm run zoia:generate:patch:non-delay-boundary-controls", ["seeded delay/filter mislabel controls"], ["synth/sequencer/MIDI/sampler runtime"]),
  claim("filter-repeatability", "Low-pass filter runtime repeats across four fresh generated filter prompt variants", ["tests/workflow/evidence/generated-patch-filter-repeatability-rollup/run-result.json", "tests/workflow/evidence/generated-patch-filter-repeatability-negative-controls/run-result.json"], "npm run zoia:generate:patch:filter-repeatability-rollup", ["stale trace", "missing trace"], ["broad audible cutoff sweep support"]),
  claim("v04-readiness", "v0.4 readiness consumes generated-patch runtime-audio dependency and blocks degraded evidence", ["tests/workflow/evidence/v0.4-readiness/run-result.json", "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json"], "npm run zoia:verify:v04", ["13 v0.4 seeded controls"], ["release readiness"]),
  claim("release-review-chain", "Release-review consumes current generated-patch runtime/audio evidence and rejects stale/missing/uncategorized evidence", ["tests/workflow/evidence/release-review-summary/run-result.json", "tests/workflow/evidence/release-review-freshness-negative-controls/run-result.json", "tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json", "tests/workflow/evidence/release-review-summary-quality-negative-controls/run-result.json"], "npm run zoia:release:review-summary", ["freshness", "documented evidence", "quality controls"], ["ready_for_review"]),
  claim("release-overclaim", "Human-facing release-review overclaims are rejected", ["tests/workflow/evidence/release-review-overclaim-negative-controls/run-result.json"], "npm run zoia:release:review-summary:overclaim-negative-controls", ["five seeded overclaim summaries"], ["release readiness"]),
  claim("clean-consumer-smoke", "Local package artifact installs into a clean consumer directory and runs installed gates against copied JSON evidence", ["tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json"], "npm run zoia:verify:v04:clean-consumer-smoke", ["missing generated evidence", "stale release-review", "missing installed script/doc", "copied evidence omissions"], ["npm publication"]),
  claim("clean-smoke-controls", "Release-review and v0.4 gates reject stale or missing clean consumer smoke evidence", ["tests/workflow/evidence/release-review-clean-consumer-smoke-negative-controls/run-result.json"], "npm run zoia:release:review-summary:clean-consumer-smoke-negative-controls", ["missing clean-smoke", "stale clean-smoke"], ["package publication"]),
  claim("package-boundary-export", "Clean consumer smoke verifies package-owned docs, scripts, metadata, and copied evidence JSON controls", ["tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json"], "npm run zoia:verify:v04:clean-consumer-smoke", ["manifest omissions", "metadata/script omissions", "copied evidence omissions"], ["npm publication readiness"]),
  claim("package-boundary-overclaim", "Package-boundary summary overclaims are rejected", ["tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json"], "npm run zoia:release:review-summary:package-boundary-overclaim-negative-controls", ["five publication-wording seeded summaries"], ["publication readiness"]),
  claim("publication-protection", "Release-review and v0.4 workflows do not invoke protected publication/source-control commands", ["tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json"], "npm run zoia:release:review-summary:publication-protection-negative-controls", ["six protected-command seeds"], ["human passcode authorization", "remote state"])
]);

function claim(id, capability, evidencePaths, requiredGate, negativeControls, excludedClaims) {
  return { id, capability, evidencePaths, requiredGate, negativeControls, excludedClaims };
}

function nowIso() {
  return new Date().toISOString();
}

async function readText(relativePath) {
  return readFile(resolve(PROJECT_ROOT, relativePath), "utf8");
}

async function readJson(relativePath) {
  const text = await readText(relativePath);
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function statusOfEvidence(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.status === "string") return value.status;
  if (typeof value.summary?.status === "string") return value.summary.status;
  return null;
}

function evidenceTimestamp(value) {
  if (!value || typeof value !== "object") return null;
  return value.completedAt || value.generatedAt || value.startedAt || null;
}

function dependencyFreshnessCheck(id, evidencePath, value, generatedAt) {
  const timestamp = evidenceTimestamp(value);
  const timestampMs = Date.parse(timestamp || "");
  const generatedAtMs = Date.parse(generatedAt);
  const ageMs = Number.isFinite(timestampMs) ? Math.max(0, generatedAtMs - timestampMs) : null;
  const status = timestamp && Number.isFinite(timestampMs) && ageMs <= MAX_DEPENDENCY_AGE_MS ? "fresh" : "stale";
  return {
    id,
    evidencePath,
    status,
    timestamp,
    ageMs,
    maxAgeMs: MAX_DEPENDENCY_AGE_MS
  };
}

function normalizeConsumedPath(path) {
  if (typeof path !== "string" || path.trim() === "") return null;
  const normalizedProjectRoot = PROJECT_ROOT.replace(/\\/gu, "/").toLowerCase();
  const resolvedPath = resolve(PROJECT_ROOT, path).replace(/\\/gu, "/");
  if (resolvedPath.toLowerCase().startsWith(`${normalizedProjectRoot}/`)) {
    return resolvedPath.slice(PROJECT_ROOT.length + 1).replace(/\\/gu, "/");
  }
  return path.replace(/\\/gu, "/");
}

function consumedPathEntriesFromFileChecks(owner, fileChecks) {
  return Object.entries(fileChecks || {})
    .map(([id, value]) => ({ owner, id, path: normalizeConsumedPath(value?.path) }))
    .filter((item) => item.path);
}

function consumedPathEntriesFromReleaseReview(releaseReview) {
  return (releaseReview.evidence || [])
    .map((item) => ({ owner: "releaseReview", id: item.id || null, path: normalizeConsumedPath(item.path) }))
    .filter((item) => item.path);
}

function categorizeConsumedPath(path, inventoryEvidencePathSet, requiredDependencyPathSet) {
  if (inventoryEvidencePathSet.has(path)) return "inventory-claim-evidence";
  if (requiredDependencyPathSet.has(path)) return "inventory-required-dependency";
  if (SUPPORT_EVIDENCE_PATTERNS.some((pattern) => pattern.test(path))) return "explicit-support-evidence";
  return null;
}

function inventoryEvidenceRoots() {
  return [...new Set(CLAIMS.flatMap((item) => item.evidencePaths)
    .map(normalizeConsumedPath)
    .filter(Boolean)
    .map((path) => path.replace(/\/[^/]*$/u, "")))];
}

function categorizeDocumentedPath(path, inventoryEvidencePathSet, requiredDependencyPathSet, evidenceRoots) {
  const directCategory = categorizeConsumedPath(path, inventoryEvidencePathSet, requiredDependencyPathSet);
  if (directCategory) return directCategory;
  if (evidenceRoots.some((root) => path === root || path.startsWith(`${root}/`))) {
    return "inventory-claim-artifact";
  }
  return null;
}

function scriptNameFromNpmRun(command) {
  if (typeof command !== "string") return null;
  const match = command.match(/^npm\s+run\s+([^\s]+)(?:\s|$)/u);
  return match ? match[1] : null;
}

function validationCommandManifest(validationCommands, packageScripts) {
  return (validationCommands || []).map((command) => {
    const scriptName = scriptNameFromNpmRun(command);
    const packageScript = scriptName ? packageScripts[scriptName] || null : null;
    return {
      command,
      scriptName,
      category: packageScript ? "package-script" : null,
      packageScript
    };
  });
}

function packageScriptSurfaceManifest(packageScripts, commandManifest) {
  const claimGateScripts = new Set(CLAIMS
    .map((item) => scriptNameFromNpmRun(item.requiredGate))
    .filter(Boolean));
  const releaseReviewScripts = new Set(commandManifest
    .map((item) => item.scriptName)
    .filter(Boolean));
  return Object.entries(packageScripts || {})
    .filter(([scriptName]) => INVENTORIED_PACKAGE_SCRIPT_PATTERN.test(scriptName))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scriptName, packageScript]) => {
      let category = null;
      if (claimGateScripts.has(scriptName)) category = "inventory-claim-required-gate";
      else if (releaseReviewScripts.has(scriptName)) category = "release-review-validation-command";
      else if (EXPLICIT_SUPPORT_PACKAGE_SCRIPTS.has(scriptName)) category = "explicit-support-package-script";
      return { scriptName, category, packageScript };
    });
}

function findBoundaryProblems(text, options = {}) {
  const lower = text.toLowerCase();
  const problems = [];
  const requireLimitations = options.requireLimitations === true;
  const forbiddenPositivePatterns = [
    { id: "ready-for-review-positive", pattern: /\b(?:is|now|ready)\s+ready_for_review\b/iu },
    { id: "release-ready-positive", pattern: /\b(?:is|now|ready)\s+(?:release-ready|ready for release)\b/iu },
    { id: "production-ready-release-positive", pattern: /\bproduction-ready release\b/iu },
    { id: "broad-text-to-zoia-positive", pattern: /\b(?:proves|supports|delivers)\s+broad text-to-zoia support\b/iu },
    { id: "arbitrary-prompt-positive", pattern: /\b(?:proves|supports|delivers)\s+arbitrary prompt support\b/iu },
    { id: "arbitrary-text-prompts-positive", pattern: /\b(?:arbitrary|any)\s+text prompts?\b/iu },
    { id: "audible-sweep-positive", pattern: /\b(?:proves|supports|delivers)\s+audible cutoff sweep(?: success)?\b/iu },
    { id: "hardware-export-positive", pattern: /\b(?:proves|supports|delivers)\s+hardware (?:binary )?export\b/iu },
    { id: "hardware-equivalent-output-positive", pattern: /\bhardware-equivalent output\b/iu },
    { id: "full-dsp-positive", pattern: /\b(?:proves|supports|delivers)\s+full DSP accuracy\b/iu },
    { id: "complete-semantics-positive", pattern: /\b(?:proves|supports|delivers)\s+complete patch semantics\b/iu },
    { id: "npm-publication-positive", pattern: /\b(?:proves|supports|delivers)\s+npm publication readiness\b/iu },
    { id: "publishable-package-positive", pattern: /\bpublishable package\b/iu },
    { id: "github-readiness-positive", pattern: /\b(?:proves|supports|delivers)\s+GitHub readiness\b/iu }
  ];
  for (const entry of forbiddenPositivePatterns) {
    if (entry.pattern.test(text)) problems.push(entry.id);
  }
  if (requireLimitations) {
    for (const group of REQUIRED_LIMITATION_PHRASE_GROUPS) {
      if (!group.some((phrase) => lower.includes(phrase.toLowerCase()))) {
        problems.push(`missing-limitation:${group[0]}`);
      }
    }
  }
  return problems;
}

function humanFacingManifestDocPaths(cleanConsumerSmoke) {
  const paths = [
    ...(cleanConsumerSmoke.packageManifestChecks || []).map((item) => item.path),
    ...(cleanConsumerSmoke.installedChecks || []).map((item) => item.path)
  ].filter((item) => typeof item === "string" && item.toLowerCase().endsWith(".md"));
  return [...new Set(paths)].sort();
}

function renderReport(generatedAt, inventory, releaseReview) {
  const rows = inventory.map((item) => [
    item.id,
    item.capability,
    item.requiredGate,
    item.evidencePaths.join("<br>"),
    item.negativeControls.join("<br>"),
    item.excludedClaims.join("<br>")
  ]);
  return [
    "# Text-Prompt Generated Patch Evidence Inventory",
    "",
    `Version: 0.4.0`,
    `Revision: 1`,
    `Generated: ${generatedAt}`,
    "",
    "This inventory is the bounded local evidence map for the text-prompt generated-patch feature. It is not release readiness, npm publication readiness, GitHub readiness, broad text-to-ZOIA support, arbitrary prompt support, broad audible cutoff sweep support, hardware parity, hardware export, full DSP accuracy, or complete patch semantics.",
    "",
    `Release-review status: ${releaseReview.status}`,
    `Release-review evidence count: ${(releaseReview.evidence || []).length}`,
    "",
    "| Claim | Capability | Required Gate | Evidence Paths | Negative Controls | Excluded Claims |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    ""
  ].join("\n");
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const generatedAt = nowIso();
  const problems = [];
  const evidenceStatus = {};

  for (const item of CLAIMS) {
    if (!item.id || !item.capability || !item.requiredGate || item.evidencePaths.length === 0 || item.negativeControls.length === 0 || item.excludedClaims.length === 0) {
      problems.push({ id: "inventory-claim-incomplete", claimId: item.id || null });
    }
    for (const relativePath of item.evidencePaths) {
      if (!existsSync(resolve(PROJECT_ROOT, relativePath))) {
        problems.push({ id: "inventory-evidence-missing", claimId: item.id, evidencePath: relativePath });
        continue;
      }
      if (!evidenceStatus[relativePath]) {
        const parsed = await readJson(relativePath);
        evidenceStatus[relativePath] = {
          status: statusOfEvidence(parsed),
          blockerCount: Array.isArray(parsed.blockers) ? parsed.blockers.length : parsed.summary?.blockerCount ?? null,
          problemCount: Array.isArray(parsed.problems) ? parsed.problems.length : parsed.summary?.problemCount ?? null
        };
      }
      const status = evidenceStatus[relativePath].status;
      if (status && !["pass", "blocked"].includes(status)) {
        problems.push({ id: "inventory-evidence-unexpected-status", claimId: item.id, evidencePath: relativePath, observed: evidenceStatus[relativePath] });
      }
    }
  }

  if (new Set(CLAIMS.map((item) => item.id)).size !== CLAIMS.length) {
    problems.push({ id: "inventory-duplicate-claim-id" });
  }

  const releaseReview = await readJson(RELEASE_REVIEW_PATH);
  if (releaseReview.status !== "pass" || (releaseReview.blockers || []).length !== 0) {
    problems.push({
      id: "release-review-not-current-pass",
      evidencePath: RELEASE_REVIEW_PATH,
      observed: { status: releaseReview.status, blockerCount: (releaseReview.blockers || []).length }
    });
  }
  const cleanConsumerSmoke = await readJson(CLEAN_CONSUMER_SMOKE_PATH);
  if (cleanConsumerSmoke.status !== "pass" || (cleanConsumerSmoke.problems || []).length !== 0) {
    problems.push({
      id: "clean-consumer-smoke-not-current-pass",
      evidencePath: CLEAN_CONSUMER_SMOKE_PATH,
      observed: { status: cleanConsumerSmoke.status, problemCount: (cleanConsumerSmoke.problems || []).length }
    });
  }
  const claimBoundary = await readJson(CLAIM_BOUNDARY_PATH);
  if (claimBoundary.status !== "pass" || (claimBoundary.problems || []).length !== 0) {
    problems.push({
      id: "claim-boundary-not-current-pass",
      evidencePath: CLAIM_BOUNDARY_PATH,
      observed: { status: claimBoundary.status, problemCount: (claimBoundary.problems || []).length }
    });
  }
  const v04Readiness = await readJson(V04_READINESS_PATH);
  const dependencyFreshness = [
    dependencyFreshnessCheck("releaseReview", RELEASE_REVIEW_PATH, releaseReview, generatedAt),
    dependencyFreshnessCheck("generatedPatchClaimBoundary", CLAIM_BOUNDARY_PATH, claimBoundary, generatedAt),
    dependencyFreshnessCheck("cleanConsumerSmoke", CLEAN_CONSUMER_SMOKE_PATH, cleanConsumerSmoke, generatedAt)
  ];
  for (const item of dependencyFreshness) {
    if (item.status !== "fresh") {
      problems.push({
        id: "final-inventory-dependency-stale",
        evidenceId: item.id,
        evidencePath: item.evidencePath,
        observed: item
      });
    }
  }
  const inventoryEvidencePathSet = new Set(CLAIMS.flatMap((item) => item.evidencePaths).map(normalizeConsumedPath));
  const inventoryEvidenceRootPaths = inventoryEvidenceRoots();
  const requiredDependencyPathSet = new Set([
    RELEASE_REVIEW_PATH,
    CLEAN_CONSUMER_SMOKE_PATH,
    CLAIM_BOUNDARY_PATH,
    V04_READINESS_PATH,
    "tests/workflow/evidence/release-review-summary/run-result.json",
    "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json",
    "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json",
    "tests/workflow/evidence/v0.4-readiness/run-result.json"
  ].map(normalizeConsumedPath));
  const consumedEvidenceManifest = [
    ...consumedPathEntriesFromReleaseReview(releaseReview),
    ...consumedPathEntriesFromFileChecks("v04Readiness", v04Readiness.fileChecks),
    ...consumedPathEntriesFromFileChecks("generatedPatchClaimBoundary", claimBoundary.fileChecks)
  ].map((item) => ({
    ...item,
    category: categorizeConsumedPath(item.path, inventoryEvidencePathSet, requiredDependencyPathSet)
  }));
  const uncategorizedConsumedEvidence = consumedEvidenceManifest.filter((item) => !item.category);
  for (const item of uncategorizedConsumedEvidence) {
    problems.push({
      id: "final-inventory-consumed-evidence-uncategorized",
      owner: item.owner,
      evidenceId: item.id,
      evidencePath: item.path
    });
  }
  const documentedEvidenceReferences = releaseReview.documentedEvidenceReferences?.references || [];
  const documentedEvidenceManifest = documentedEvidenceReferences
    .map((item) => ({
      docPath: normalizeConsumedPath(item.docPath),
      path: normalizeConsumedPath(item.path),
      exists: item.exists === true
    }))
    .filter((item) => item.path)
    .map((item) => ({
      ...item,
      category: categorizeDocumentedPath(item.path, inventoryEvidencePathSet, requiredDependencyPathSet, inventoryEvidenceRootPaths)
    }));
  const uncategorizedDocumentedEvidence = documentedEvidenceManifest.filter((item) => !item.category);
  for (const item of uncategorizedDocumentedEvidence) {
    problems.push({
      id: "final-inventory-documented-evidence-uncategorized",
      docPath: item.docPath,
      evidencePath: item.path
    });
  }

  const docsText = [];
  for (const docPath of DOC_PATHS) {
    const text = await readText(docPath);
    docsText.push(text);
    const docProblems = findBoundaryProblems(text);
    if (docProblems.length > 0) {
      problems.push({ id: "doc-boundary-validation-failed", path: docPath, observed: docProblems });
    }
  }
  const docCorpusProblems = findBoundaryProblems(docsText.join("\n"), { requireLimitations: true });
  if (docCorpusProblems.length > 0) {
    problems.push({ id: "doc-corpus-boundary-validation-failed", paths: DOC_PATHS, observed: docCorpusProblems });
  }
  const manifestDocPaths = humanFacingManifestDocPaths(cleanConsumerSmoke);
  const docPathSet = new Set(DOC_PATHS);
  const unscannedManifestDocPaths = manifestDocPaths.filter((docPath) => !docPathSet.has(docPath));
  if (unscannedManifestDocPaths.length > 0) {
    problems.push({
      id: "package-boundary-doc-not-in-inventory-scanner",
      evidencePath: CLEAN_CONSUMER_SMOKE_PATH,
      observed: unscannedManifestDocPaths
    });
  }
  const releaseReviewText = JSON.stringify({
    claimBoundaries: releaseReview.claimBoundaries,
    reviewerSummaryQuality: releaseReview.reviewerSummaryQuality
  });
  const releaseReviewBoundaryProblems = findBoundaryProblems(releaseReviewText, { requireLimitations: true });
  if (releaseReviewBoundaryProblems.length > 0) {
    problems.push({ id: "release-review-boundary-validation-failed", evidencePath: RELEASE_REVIEW_PATH, observed: releaseReviewBoundaryProblems });
  }
  const packageJson = await readJson(PACKAGE_JSON_PATH);
  const commandManifest = validationCommandManifest(releaseReview.validationCommands || [], packageJson.scripts || {});
  const uncategorizedValidationCommands = commandManifest.filter((item) => !item.category);
  for (const item of uncategorizedValidationCommands) {
    problems.push({
      id: "final-inventory-validation-command-uncategorized",
      command: item.command,
      scriptName: item.scriptName
    });
  }
  const packageScriptManifest = packageScriptSurfaceManifest(packageJson.scripts || {}, commandManifest);
  const uncategorizedPackageScripts = packageScriptManifest.filter((item) => !item.category);
  for (const item of uncategorizedPackageScripts) {
    problems.push({
      id: "final-inventory-package-script-uncategorized",
      scriptName: item.scriptName,
      packageScript: item.packageScript
    });
  }

  const inventory = {
    schemaVersion: "zoia.generated-patch-final-evidence-inventory.v1",
    generatedAt,
    version: "0.4.0",
    claimCount: CLAIMS.length,
    claims: CLAIMS,
    evidenceStatus,
    excludedClaims: [
      "ready_for_review",
      "release readiness",
      "npm publication readiness",
      "GitHub readiness",
      "copied evidence bundle publication",
      "broad text-to-ZOIA support",
      "arbitrary prompt support",
      "audible cutoff sweep success",
      "hardware parity",
      "hardware export",
      "full DSP accuracy",
      "complete patch semantics"
    ],
    scannerDocPaths: DOC_PATHS,
    packageBoundaryDocPaths: manifestDocPaths,
    consumedEvidenceManifest,
    documentedEvidenceManifest,
    commandManifest,
    packageScriptManifest
  };
  await writeJson(INVENTORY_JSON_PATH, inventory);
  await writeFile(INVENTORY_REPORT_PATH, renderReport(generatedAt, CLAIMS, releaseReview), "utf8");

  const result = {
    schemaVersion: "zoia.generated-patch-final-evidence-inventory-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt,
    summary: {
      problemCount: problems.length,
      claimCount: CLAIMS.length,
      evidencePathCount: Object.keys(evidenceStatus).length,
      docPathCount: DOC_PATHS.length,
      packageBoundaryDocPathCount: manifestDocPaths.length,
      packageBoundaryDocMissingFromScannerCount: unscannedManifestDocPaths.length,
      releaseReviewStatus: releaseReview.status,
      cleanConsumerSmokeStatus: cleanConsumerSmoke.status,
      claimBoundaryStatus: claimBoundary.status,
      releaseReviewBlockerCount: (releaseReview.blockers || []).length,
      requiredLimitationPhraseCount: REQUIRED_LIMITATION_PHRASE_GROUPS.length,
      dependencyFreshnessCheckCount: dependencyFreshness.length,
      dependencyFreshnessProblemCount: dependencyFreshness.filter((item) => item.status !== "fresh").length,
      consumedEvidencePathCount: consumedEvidenceManifest.length,
      consumedEvidenceUncategorizedCount: uncategorizedConsumedEvidence.length,
      documentedEvidenceReferenceCount: documentedEvidenceManifest.length,
      documentedEvidenceUncategorizedCount: uncategorizedDocumentedEvidence.length,
      validationCommandCount: commandManifest.length,
      validationCommandUncategorizedCount: uncategorizedValidationCommands.length,
      packageScriptSurfaceCount: packageScriptManifest.length,
      packageScriptUncategorizedCount: uncategorizedPackageScripts.length
    },
    problems,
    dependencyFreshness,
    artifacts: {
      resultPath: RESULT_PATH,
      inventoryJsonPath: INVENTORY_JSON_PATH,
      inventoryReportPath: INVENTORY_REPORT_PATH
    },
    claimBoundary: "This gate maps accepted local ZOIA 0.4.0 generated-patch claims to current evidence paths, required gates, negative controls, and excluded claims. It validates docs and release-review boundaries against that inventory. It is not readiness or publication evidence."
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    problemCount: result.summary.problemCount,
    claimCount: result.summary.claimCount,
    evidencePathCount: result.summary.evidencePathCount,
    resultPath: RESULT_PATH,
    inventoryReportPath: INVENTORY_REPORT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exit(1);
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.generated-patch-final-evidence-inventory-result.v1",
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
  };
  await writeJson(RESULT_PATH, result);
  console.error(error.stack || error.message);
  process.exit(1);
});
