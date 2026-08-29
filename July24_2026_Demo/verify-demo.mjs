#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, dirname, isAbsolute, relative } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const DEMO_ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = resolve(DEMO_ROOT, "..");
const PROJECT_ROOT = process.env.ZOIA_DEMO_SOURCE_ROOT ? resolve(process.env.ZOIA_DEMO_SOURCE_ROOT) : DEFAULT_PROJECT_ROOT;
const IS_RELOCATED_CHILD = process.env.ZOIA_DEMO_RELOCATED_CHILD === "1";
const MAX_EVIDENCE_AGE_MS = Number(process.env.ZOIA_DEMO_MAX_EVIDENCE_AGE_MS || 48 * 60 * 60 * 1000);
const SOURCE_EVIDENCE_WARNING_MS = Number(process.env.ZOIA_DEMO_SOURCE_EVIDENCE_WARNING_MS || 8 * 60 * 60 * 1000);
const AUDIO_GENERATION_WINDOW_MS = 10 * 60 * 1000;
const AUDIO_GENERATION_WINDOW_MINUTES = AUDIO_GENERATION_WINDOW_MS / 60_000;
const MANIFEST_SCHEMA_VERSION = "zoia.july24-demo-manifest.v1";
const execFileAsync = promisify(execFile);

const jsonChecks = [
  {
    id: "final-inventory",
    source: "tests/workflow/evidence/generated-patch-final-evidence-inventory/run-result.json",
    copy: "artifacts/generated-patch-final-evidence-inventory/run-result.json",
    expected: {
      status: "pass",
      "summary.problemCount": 0,
      "summary.packageScriptUncategorizedCount": 0,
      "summary.validationCommandUncategorizedCount": 0
    }
  },
  {
    id: "final-inventory-negative-controls",
    source: "tests/workflow/evidence/generated-patch-final-evidence-inventory-negative-controls/run-result.json",
    copy: "artifacts/generated-patch-final-evidence-inventory-negative-controls/run-result.json",
    expected: {
      status: "pass",
      "summary.caseCount": 25,
      "summary.passingCaseCount": 25
    }
  },
  {
    id: "release-review-summary",
    source: "tests/workflow/evidence/release-review-summary/run-result.json",
    copy: "artifacts/release-review-summary/run-result.json",
    expected: {
      status: "pass"
    },
    custom(value, problems) {
      if ((value.blockers || []).length !== 0) {
        problems.push({ id: "release-review-has-blockers", observed: (value.blockers || []).length });
      }
    }
  },
  {
    id: "v04-readiness",
    source: "tests/workflow/evidence/v0.4-readiness/run-result.json",
    copy: "artifacts/v0.4-readiness/run-result.json",
    expected: {
      status: "pass",
      "summary.blockerCount": 0
    }
  },
  {
    id: "claim-boundary",
    source: "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json",
    copy: "artifacts/generated-patch-claim-boundary/run-result.json",
    expected: {
      status: "pass",
      "summary.problemCount": 0
    }
  },
  {
    id: "delay-audio",
    source: "tests/workflow/evidence/generated-patch-audio/run-result.json",
    copy: "artifacts/generated-patch-audio/run-result.json",
    expected: {
      status: "pass"
    }
  },
  {
    id: "delay-lfo-semantics",
    source: "tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json",
    copy: "artifacts/generated-patch-lfo-semantics/run-result.json",
    expected: {
      status: "pass"
    }
  },
  {
    id: "filter-low-pass-runtime",
    source: "tests/workflow/evidence/generated-patch-filter-semantics/run-result.json",
    copy: "artifacts/generated-patch-filter-runtime/run-result.json",
    expected: {
      status: "pass"
    }
  }
];

const requiredFiles = [
  "README_DEMO.md",
  "DEMO_STATUS.md",
  "run-demo.ps1",
  "artifacts/generated-patches/manual-test-emulator/01-143816-v2.patch.json",
  "artifacts/generated-patches/manual-test-emulator/02-108214.patch.json",
  "artifacts/generated-patches/manual-test-emulator/03-184325.patch.json",
  "artifacts/generated-patch-final-evidence-inventory/run-result.json",
  "artifacts/generated-patch-final-evidence-inventory/claim-inventory.json",
  "artifacts/generated-patch-final-evidence-inventory-negative-controls/run-result.json",
  "artifacts/release-review-summary/run-result.json",
  "artifacts/v0.4-readiness/run-result.json",
  "artifacts/generated-patch-claim-boundary/run-result.json",
  "artifacts/generated-patch-audio/run-result.json",
  "artifacts/generated-patch-audio/classification-log.json",
  "artifacts/generated-patch-audio/stimulus-manifest.json",
  "artifacts/generated-patch-audio/captures/01-143816-v2.wav",
  "artifacts/generated-patch-audio/captures/02-108214.wav",
  "artifacts/generated-patch-audio/captures/03-184325.wav",
  "artifacts/generated-patch-audio/captures/silent-negative-control.wav",
  "artifacts/generated-patch-lfo-semantics/run-result.json",
  "artifacts/generated-patch-lfo-semantics/classification-log.json",
  "artifacts/generated-patch-lfo-semantics/stimulus-manifest.json",
  "artifacts/generated-patch-lfo-semantics/traces/01-143816-v2-positive-lfo-time-route.lfo.wav",
  "artifacts/generated-patch-lfo-semantics/traces/02-108214-positive-lfo-time-route.lfo.wav",
  "artifacts/generated-patch-lfo-semantics/traces/03-184325-positive-lfo-time-route.lfo.wav",
  "artifacts/generated-patch-filter-runtime/run-result.json",
  "artifacts/generated-patch-filter-runtime/classification-log.json",
  "artifacts/generated-patch-filter-runtime/stimulus-manifest.json",
  "artifacts/generated-patch-filter-runtime/captures/01-107507.wav",
  "artifacts/generated-patch-filter-runtime/captures/01-107507-bypass-filter-control.wav",
  "artifacts/generated-patch-filter-runtime/captures/01-107507-highpass-output-control.wav"
];

const forbiddenHumanFacingText = [
  /\b(?:is|now|ready|proves|supports|delivers)\s+ready_for_review\b/iu,
  /\b(?:is|now|ready|proves|supports|delivers)\s+(?:release[- ]ready|ready for release)\b/iu,
  /\b(?:proves|supports|delivers)\s+npm publication readiness\b/iu,
  /\b(?:proves|supports|delivers)\s+GitHub readiness\b/iu,
  /\b(?:proves|supports|delivers)\s+broad text-to-ZOIA support\b/iu,
  /\b(?:proves|supports|delivers)\s+arbitrary prompt support\b/iu,
  /\b(?:proves|supports|delivers)\s+audible cutoff sweep success\b/iu,
  /\b(?:proves|supports|delivers)\s+hardware (?:parity|export)\b/iu,
  /\b(?:proves|supports|delivers)\s+full DSP accuracy\b/iu,
  /\b(?:proves|supports|delivers)\s+complete patch semantics\b/iu,
  /\bstandalone[- ]bundle\b/iu,
  /\bself[- ]contained\b/iu,
  /\bhardware[- ]equivalent\b/iu,
  /\bproduction[- ]ready\b/iu,
  /\bpublishable\b/iu,
  /\barbitrary (?:prompt|text prompt|generated patch)\b/iu,
  /\b(?:supports|proves|delivers)\s+(?:modulation-only|reverb|synth|sequencer|MIDI|sampler)\b/iu
];

const requiredDocSurfaces = [
  {
    file: "README_DEMO.md",
    phrases: [
      ".\\July24_2026_Demo\\run-demo.ps1",
      "node .\\July24_2026_Demo\\verify-demo.mjs",
      "verification-result.json",
      "DEMO_MANIFEST.json",
      "seededControlInventory",
      "seededControlRiskCategoryCounts",
      "In default verification mode, the wrapper emits verifier JSON on stdout",
      "Do not parse `-RunFullEvidence` stdout as the consumed result",
      "after the command exits, read `July24_2026_Demo/verification-result.json`",
      "The `-RunFullEvidence` wrapper path copies the refreshed final-inventory run result, final-inventory claim inventory, and final-inventory negative-control run result into `July24_2026_Demo/artifacts` before verification.",
      "wrapperJsonOutputBoundaryCheckCount",
      "wrapperResultDiscoveryCheckCount",
      "wrapperFullEvidenceCopySyncCheckCount",
      "wrapperFullEvidenceCopyFreshnessCheckCount",
      "wrapperFullEvidenceSmokeCheckCount",
      "sourceEvidenceWarningDocumentAgreementCheckCount",
      "manifestArtifactHashCheckCount",
      "audioCaptureMappingCheckCount",
      "audioManifestContentCoverageCheckCount",
      "audioCapabilityClaimChainCheckCount",
      "audioConsumedFieldArtifactCountCheckCount",
      "audioArtifactGenerationFreshnessCheckCount",
      "audioGenerationWindowSurfaceAgreementCheckCount",
      "audioGenerationWindowMaxDeltaMs",
      "audioGenerationWindowMinutes",
      "10-minute audio generation window",
      "audioClassificationAgreementCheckCount",
      "audioClassificationWavContentCheckCount",
      "lfoTraceWavContentCheckCount",
      "filterWavContentCheckCount",
      "sourceEvidenceNextStaleAt",
      "sourceEvidenceMinimumRemainingMs",
      "oldestSourceEvidenceId",
      "sourceEvidenceFreshnessLimitHours",
      "sourceEvidenceRefreshRecommended",
      "sourceEvidenceWarningThresholdHours",
      "8-hour refresh-warning window",
      "It is not a release artifact",
      "Use `DEMO_STATUS.md` as the claim boundary, evidence summary, and limitations list"
    ]
  },
  {
    file: "DEMO_STATUS.md",
    phrases: [
      "Not release readiness",
      "Not npm publication readiness",
      "Not GitHub readiness",
      "Not broad text-to-ZOIA support",
      "Not audible cutoff sweep",
      "No source-control side effects",
      ".\\July24_2026_Demo\\run-demo.ps1",
      "July24_2026_Demo/verification-result.json",
      "July24_2026_Demo/DEMO_MANIFEST.json",
      "seededControlInventory",
      "seededControlRiskCategoryCounts",
      "8 explicit source evidence files",
      "explicitSourceEvidenceCount",
      "sourceEvidenceMinimumRemainingMs",
      "oldestSourceEvidenceId",
      "sourceEvidenceFreshnessLimitHours",
      "wrapperFullEvidenceCopySyncCheckCount",
      "wrapperFullEvidenceCopyFreshnessCheckCount",
      "wrapperResultDiscoveryCheckCount",
      "wrapperFullEvidenceSmokeCheckCount",
      "sourceEvidenceWarningDocumentAgreementCheckCount",
      "audioManifestContentCoverageCheckCount",
      "audioCapabilityClaimChainCheckCount",
      "audioConsumedFieldArtifactCountCheckCount",
      "audioArtifactGenerationFreshnessCheckCount",
      "audioGenerationWindowSurfaceAgreementCheckCount",
      "audioGenerationWindowMaxDeltaMs",
      "audioGenerationWindowMinutes",
      "10-minute audio generation window",
      "audioClassificationWavContentCheckCount",
      "lfoTraceWavContentCheckCount",
      "filterWavContentCheckCount",
      "For `-RunFullEvidence`, do not parse wrapper stdout as the consumed result",
      "After the command exits, read `July24_2026_Demo/verification-result.json`",
      "The `-RunFullEvidence` wrapper path is expected to copy refreshed final-inventory artifacts into `July24_2026_Demo/artifacts` before verification.",
      "sourceEvidenceNextStaleAt",
      "sourceEvidenceRefreshRecommended",
      "sourceEvidenceWarningThresholdHours",
      "8-hour refresh-warning window",
      "48-hour freshness limit"
    ]
  }
];

const requiredConsumedMarkdownSections = [
  {
    file: "README_DEMO.md",
    headings: [
      "Quick Verification",
      "Full Local Evidence Commands",
      "Included Artifact Copies",
      "Source Evidence Dependencies",
      "Boundary"
    ]
  },
  {
    file: "DEMO_STATUS.md",
    headings: [
      "Scope",
      "Latest Accepted Evidence",
      "Supported Claims",
      "Deferred And Out Of Scope",
      "Protected-Action Boundary",
      "Verification"
    ]
  }
];

const statusAcceptedEvidencePaths = [
  "tests/workflow/evidence/generated-patch-final-evidence-inventory/run-result.json",
  "tests/workflow/evidence/generated-patch-final-evidence-inventory-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-summary/run-result.json",
  "tests/workflow/evidence/v0.4-readiness/run-result.json",
  "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json",
  "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json",
  "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json",
  "tests/workflow/evidence/generated-patch-text-prompt-runtime-rollup/run-result.json",
  "tests/workflow/evidence/generated-patch-audio/run-result.json",
  "tests/workflow/evidence/generated-patch-lfo-semantics/run-result.json",
  "tests/workflow/evidence/generated-patch-filter-semantics/run-result.json"
];

const documentedFullEvidenceScripts = [
  "zoia:generate:patch:text-prompt-runtime-rollup",
  "zoia:generate:patch:final-evidence-inventory",
  "zoia:generate:patch:final-evidence-inventory:negative-controls"
];

const wrapperFullEvidenceCopySyncs = [
  {
    source: "$ProjectRoot\\tests\\workflow\\evidence\\generated-patch-final-evidence-inventory\\run-result.json",
    destination: "$DemoRoot\\artifacts\\generated-patch-final-evidence-inventory\\run-result.json"
  },
  {
    source: "$ProjectRoot\\tests\\workflow\\evidence\\generated-patch-final-evidence-inventory\\claim-inventory.json",
    destination: "$DemoRoot\\artifacts\\generated-patch-final-evidence-inventory\\claim-inventory.json"
  },
  {
    source: "$ProjectRoot\\tests\\workflow\\evidence\\generated-patch-final-evidence-inventory-negative-controls\\run-result.json",
    destination: "$DemoRoot\\artifacts\\generated-patch-final-evidence-inventory-negative-controls\\run-result.json"
  }
];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isInsidePath(parent, child) {
  const relation = relative(resolve(parent), resolve(child));
  return relation === "" || (!!relation && !relation.startsWith("..") && !isAbsolute(relation));
}

function getByPath(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/u, ""));
}

async function fileManifestEntry(relativePath) {
  const absolutePath = resolve(DEMO_ROOT, relativePath);
  const buffer = await readFile(absolutePath);
  return {
    path: relativePath,
    byteLength: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
}

async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function evidenceTimestamp(value) {
  return value.completedAt || value.generatedAt || value.startedAt || null;
}

function checkFresh(id, value, path, problems) {
  const timestamp = evidenceTimestamp(value);
  const parsed = Date.parse(timestamp || "");
  if (!timestamp || !Number.isFinite(parsed)) {
    problems.push({ id: "evidence-timestamp-missing", evidenceId: id, path });
    return;
  }
  const ageMs = Date.now() - parsed;
  if (ageMs > MAX_EVIDENCE_AGE_MS) {
    problems.push({ id: "evidence-stale", evidenceId: id, path, timestamp, ageMs, maxAgeMs: MAX_EVIDENCE_AGE_MS });
  }
}

function checkSourceEvidenceFreshnessBoundary(id, value, path, problems) {
  const beforeCount = problems.length;
  checkFresh(id, value, path, problems);
  for (const problem of problems.slice(beforeCount)) {
    if (problem.id === "evidence-stale") {
      problems.push({ ...problem, id: "demo-source-evidence-stale" });
    } else if (problem.id === "evidence-timestamp-missing") {
      problems.push({ ...problem, id: "demo-source-evidence-invalid-timestamp" });
    }
  }
}

function checkExpectedValues(check, source, copy, problems) {
  for (const [path, expected] of Object.entries(check.expected)) {
    const observed = getByPath(source, path);
    if (observed !== expected) {
      problems.push({ id: "source-evidence-value-mismatch", evidenceId: check.id, path, expected, observed });
    }
    const copiedObserved = getByPath(copy, path);
    if (copiedObserved !== expected) {
      problems.push({ id: "demo-evidence-copy-value-mismatch", evidenceId: check.id, path, expected, observed: copiedObserved });
    }
  }
}

async function sourceEvidenceDependency(check, source, sourcePath, copyPath) {
  const timestamp = evidenceTimestamp(source);
  const parsed = Date.parse(timestamp || "");
  const sourceHash = await sha256File(sourcePath);
  const copyHash = await sha256File(copyPath);
  return {
    id: check.id,
    source: check.source,
    copy: check.copy,
    timestamp,
    ageMs: Number.isFinite(parsed) ? Date.now() - parsed : null,
    maxAgeMs: MAX_EVIDENCE_AGE_MS,
    expectedFailureIfMissingOrStale: "source-evidence-missing/evidence-stale",
    expectedFailureIfCopyMissingOrDrifted: "demo-file-missing/demo-evidence-copy-value-mismatch",
    sourceSha256: sourceHash,
    copySha256: copyHash
  };
}

function sourceEvidenceFreshnessSummary(dependencies) {
  const timedDependencies = dependencies.filter((dependency) => Number.isFinite(dependency.ageMs));
  if (timedDependencies.length === 0) {
    return {
      oldestSourceEvidenceId: null,
      oldestSourceEvidenceAgeMs: null,
      sourceEvidenceMinimumRemainingMs: null,
      sourceEvidenceNextStaleAt: null,
      sourceEvidenceFreshnessLimitHours: MAX_EVIDENCE_AGE_MS / (60 * 60 * 1000),
      sourceEvidenceRefreshRecommended: false,
      sourceEvidenceWarningThresholdHours: SOURCE_EVIDENCE_WARNING_MS / (60 * 60 * 1000)
    };
  }
  const oldest = timedDependencies.reduce((currentOldest, dependency) =>
    dependency.ageMs > currentOldest.ageMs ? dependency : currentOldest
  );
  const parsed = Date.parse(oldest.timestamp || "");
  return {
    oldestSourceEvidenceId: oldest.id,
    oldestSourceEvidenceAgeMs: oldest.ageMs,
    sourceEvidenceMinimumRemainingMs: oldest.maxAgeMs - oldest.ageMs,
    sourceEvidenceNextStaleAt: Number.isFinite(parsed) ? new Date(parsed + oldest.maxAgeMs).toISOString() : null,
    sourceEvidenceFreshnessLimitHours: MAX_EVIDENCE_AGE_MS / (60 * 60 * 1000),
    sourceEvidenceRefreshRecommended: oldest.maxAgeMs - oldest.ageMs <= SOURCE_EVIDENCE_WARNING_MS,
    sourceEvidenceWarningThresholdHours: SOURCE_EVIDENCE_WARNING_MS / (60 * 60 * 1000)
  };
}

function checkSourceEvidenceRefreshRecommendation(summary, problems) {
  if (
    Number.isFinite(summary.sourceEvidenceMinimumRemainingMs) &&
    summary.sourceEvidenceMinimumRemainingMs <= SOURCE_EVIDENCE_WARNING_MS &&
    summary.sourceEvidenceRefreshRecommended !== true
  ) {
    problems.push({
      id: "demo-source-evidence-refresh-recommendation-missing",
      sourceEvidenceMinimumRemainingMs: summary.sourceEvidenceMinimumRemainingMs,
      sourceEvidenceWarningThresholdMs: SOURCE_EVIDENCE_WARNING_MS
    });
  }
  return 1;
}

function checkSourceEvidenceFreshnessSummaryConsistency(summary, dependencies, problems) {
  const expected = sourceEvidenceFreshnessSummary(dependencies);
  const expectedFields = [
    "oldestSourceEvidenceId",
    "sourceEvidenceNextStaleAt",
    "sourceEvidenceFreshnessLimitHours",
    "sourceEvidenceRefreshRecommended",
    "sourceEvidenceWarningThresholdHours"
  ];
  for (const field of expectedFields) {
    if (summary[field] !== expected[field]) {
      problems.push({
        id: "demo-source-evidence-freshness-summary-mismatch",
        field,
        expected: expected[field],
        observed: summary[field]
      });
    }
  }
  if (
    Number.isFinite(expected.sourceEvidenceMinimumRemainingMs) &&
    Number.isFinite(summary.sourceEvidenceMinimumRemainingMs) &&
    Math.abs(summary.sourceEvidenceMinimumRemainingMs - expected.sourceEvidenceMinimumRemainingMs) > 1000
  ) {
    problems.push({
      id: "demo-source-evidence-freshness-summary-mismatch",
      field: "sourceEvidenceMinimumRemainingMs",
      expected: expected.sourceEvidenceMinimumRemainingMs,
      observed: summary.sourceEvidenceMinimumRemainingMs
    });
  }
  return 1;
}

function checkSourceCopyHashBoundary(dependency, problems) {
  if (dependency.sourceSha256 !== dependency.copySha256) {
    problems.push({
      id: "demo-source-copy-sha256-mismatch",
      evidenceId: dependency.id,
      source: dependency.source,
      copy: dependency.copy,
      sourceSha256: dependency.sourceSha256,
      copySha256: dependency.copySha256
    });
  }
}

function checkSourceCopyHashBoundaries(dependencies, problems) {
  for (const dependency of dependencies) {
    checkSourceCopyHashBoundary(dependency, problems);
  }
  return dependencies.length;
}

function artifactCategory(path) {
  if (path.startsWith("artifacts/generated-patches/")) return "Generated patch JSON";
  if (path.startsWith("artifacts/generated-patch-audio/")) return "Delay audio evidence";
  if (path.startsWith("artifacts/generated-patch-lfo-semantics/")) return "LFO trace evidence";
  if (path.startsWith("artifacts/generated-patch-filter-runtime/")) return "Filter runtime evidence";
  if (path.startsWith("artifacts/generated-patch-final-evidence-inventory/")) return "Final inventory evidence";
  if (path.startsWith("artifacts/")) return "Review/readiness JSON";
  return "Demo files";
}

function manifestCategoryCounts(artifacts) {
  const counts = new Map();
  for (const artifact of artifacts) {
    const category = artifactCategory(artifact.path);
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return counts;
}

function checkReadmeArtifactTable(readmeText, artifacts, problems) {
  const counts = manifestCategoryCounts(artifacts);
  for (const [category, count] of counts) {
    const rowPattern = new RegExp(`\\|\\s*${category.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\|\\s*${count}\\s*\\|`, "u");
    if (!rowPattern.test(readmeText)) {
      problems.push({ id: "demo-readme-artifact-table-count-mismatch", category, expected: count });
    }
  }
}

function checkRequiredFilePresence(existingPaths, problems) {
  for (const relativePath of requiredFiles) {
    if (!existingPaths.has(relativePath)) {
      problems.push({ id: "demo-file-missing", path: relativePath });
    }
  }
}

function checkReadmeArtifactReferences(readmeText, problems) {
  const artifactReferences = [...readmeText.matchAll(/`(artifacts[\\/][^`]+)`/giu)].map((match) =>
    match[1].replace(/\\/gu, "/")
  );
  for (const reference of artifactReferences) {
    if (!existsSync(resolve(DEMO_ROOT, reference))) {
      problems.push({ id: "demo-readme-artifact-reference-missing", path: reference });
    }
  }
  return artifactReferences.length;
}

function checkSourceDependencyDocumentation(readmeText, problems) {
  const expectedSources = new Set(jsonChecks.map((check) => check.source));
  const documentedSources = new Set(
    [...readmeText.matchAll(/`(tests[\\/]workflow[\\/]evidence[\\/][^`]+?\.json)`/giu)].map((match) =>
      match[1].replace(/\\/gu, "/")
    )
  );
  for (const source of expectedSources) {
    if (!documentedSources.has(source)) {
      problems.push({ id: "demo-source-dependency-doc-missing", source });
    }
  }
  for (const source of documentedSources) {
    if (!expectedSources.has(source)) {
      problems.push({ id: "demo-source-dependency-doc-extra", source });
    }
  }
  return documentedSources.size;
}

function checkStatusEvidenceDocumentation(statusText, problems) {
  const staleFilterPath = "tests/workflow/evidence/generated-patch-filter-runtime/filter-semantics/run-result.json";
  const expectedSources = new Set(statusAcceptedEvidencePaths);
  const documentedSources = new Set(
    [...statusText.matchAll(/`(tests[\\/]workflow[\\/]evidence[\\/][^`]+?\.json)`/giu)].map((match) =>
      match[1].replace(/\\/gu, "/")
    )
  );
  for (const source of expectedSources) {
    if (!documentedSources.has(source)) {
      problems.push({ id: "demo-status-accepted-evidence-missing", source });
    }
  }
  for (const source of documentedSources) {
    if (!expectedSources.has(source)) {
      problems.push({ id: "demo-status-accepted-evidence-extra", source });
    }
  }
  if (statusText.includes(staleFilterPath)) {
    problems.push({ id: "demo-status-stale-filter-evidence-present", source: staleFilterPath });
  }
  return documentedSources.size;
}

function readmeNpmScripts(readmeText) {
  return new Set([...readmeText.matchAll(/npm\s+run\s+([^\s`]+)/giu)].map((match) => match[1]));
}

function wrapperNpmScripts(runDemoText) {
  return new Set([...runDemoText.matchAll(/npm\s+run\s+([^\s`]+)/giu)].map((match) => match[1]));
}

function checkDocumentedFullEvidenceCommands(readmeText, packageJson, problems, runDemoText = null) {
  const documentedScripts = readmeNpmScripts(readmeText);
  const packageScripts = packageJson.scripts || {};
  const wrapperScripts = runDemoText ? wrapperNpmScripts(runDemoText) : null;
  for (const scriptName of documentedFullEvidenceScripts) {
    if (!documentedScripts.has(scriptName)) {
      problems.push({ id: "demo-readme-full-evidence-command-missing", scriptName });
    }
    if (!Object.hasOwn(packageScripts, scriptName)) {
      problems.push({ id: "demo-package-script-missing", scriptName });
    }
    if (wrapperScripts && !wrapperScripts.has(scriptName)) {
      problems.push({ id: "demo-wrapper-full-evidence-command-missing", scriptName });
    }
  }
  for (const scriptName of documentedScripts) {
    if (!documentedFullEvidenceScripts.includes(scriptName)) {
      problems.push({ id: "demo-readme-full-evidence-command-extra", scriptName });
    }
  }
  if (wrapperScripts) {
    for (const scriptName of wrapperScripts) {
      if (!documentedFullEvidenceScripts.includes(scriptName)) {
        problems.push({ id: "demo-wrapper-full-evidence-command-extra", scriptName });
      }
    }
  }
  return documentedScripts.size;
}

function checkWrapperFullEvidenceVerificationOrder(runDemoText, problems) {
  const verifyCommand = 'node "$DemoRoot\\verify-demo.mjs"';
  const verifyIndex = runDemoText.indexOf(verifyCommand);
  if (verifyIndex === -1) {
    problems.push({ id: "demo-wrapper-verifier-command-missing", command: verifyCommand });
    return 1;
  }
  const commandIndexes = documentedFullEvidenceScripts.map((scriptName) => ({
    scriptName,
    index: runDemoText.indexOf(`npm run ${scriptName}`)
  }));
  for (const command of commandIndexes) {
    if (command.index !== -1 && command.index > verifyIndex) {
      problems.push({
        id: "demo-wrapper-full-evidence-order-invalid",
        scriptName: command.scriptName,
        verifierCommand: verifyCommand
      });
    }
  }
  return 1;
}

function checkWrapperFullEvidenceCopySync(runDemoText, problems) {
  const verifyCommand = 'node "$DemoRoot\\verify-demo.mjs"';
  const verifyIndex = runDemoText.indexOf(verifyCommand);
  if (verifyIndex === -1) {
    problems.push({ id: "demo-wrapper-verifier-command-missing", command: verifyCommand });
    return wrapperFullEvidenceCopySyncs.length;
  }
  for (const sync of wrapperFullEvidenceCopySyncs) {
    const sourceIndex = runDemoText.indexOf(sync.source);
    const destinationIndex = runDemoText.indexOf(sync.destination);
    if (sourceIndex === -1 || destinationIndex === -1) {
      problems.push({
        id: "demo-wrapper-full-evidence-copy-sync-missing",
        source: sync.source,
        destination: sync.destination
      });
      continue;
    }
    if (sourceIndex > verifyIndex || destinationIndex > verifyIndex) {
      problems.push({
        id: "demo-wrapper-full-evidence-copy-sync-order-invalid",
        source: sync.source,
        destination: sync.destination,
        verifierCommand: verifyCommand
      });
    }
  }
  return wrapperFullEvidenceCopySyncs.length;
}

function wrapperFullEvidenceActualCopySyncs() {
  return wrapperFullEvidenceCopySyncs.map((sync) => ({
    source: sync.source.replace("$ProjectRoot\\", ""),
    copy: sync.destination.replace("$DemoRoot\\", "")
  }));
}

function checkWrapperFullEvidenceCopyFreshness(problems, pairs = null) {
  const syncs = pairs || wrapperFullEvidenceActualCopySyncs().map((sync) => ({
    ...sync,
    sourceMtimeMs: statSync(resolve(PROJECT_ROOT, sync.source)).mtimeMs,
    copyMtimeMs: statSync(resolve(DEMO_ROOT, sync.copy)).mtimeMs
  }));
  const toleranceMs = 2000;
  for (const sync of syncs) {
    if (sync.copyMtimeMs + toleranceMs < sync.sourceMtimeMs) {
      problems.push({
        id: "demo-wrapper-full-evidence-copied-artifact-stale",
        source: sync.source,
        copy: sync.copy,
        sourceMtimeMs: sync.sourceMtimeMs,
        copyMtimeMs: sync.copyMtimeMs
      });
    }
  }
  return syncs.length;
}

function checkWrapperFullEvidenceSmokeMarker(runDemoText, problems) {
  const markerCommand = '$env:ZOIA_DEMO_RUN_FULL_EVIDENCE = "1"';
  const verifyCommand = 'node "$DemoRoot\\verify-demo.mjs"';
  const markerIndex = runDemoText.indexOf(markerCommand);
  const verifyIndex = runDemoText.indexOf(verifyCommand);
  if (markerIndex === -1) {
    problems.push({ id: "demo-wrapper-full-evidence-smoke-marker-missing", command: markerCommand });
  } else if (verifyIndex !== -1 && markerIndex > verifyIndex) {
    problems.push({ id: "demo-wrapper-full-evidence-smoke-marker-order-invalid", command: markerCommand });
  }
  return 1;
}

function checkWrapperJsonOutputBoundary(runDemoText, problems) {
  const hostOutputPattern = /\bWrite-Host\b/iu;
  if (hostOutputPattern.test(runDemoText)) {
    problems.push({ id: "demo-wrapper-output-non-json-host-text", command: "Write-Host" });
  }
  return 1;
}

function checkWrapperResultDiscovery(readmeText, statusText, problems) {
  const requiredReadmePhrases = [
    "Do not parse `-RunFullEvidence` stdout as the consumed result",
    "after the command exits, read `July24_2026_Demo/verification-result.json`"
  ];
  const requiredStatusPhrases = [
    "For `-RunFullEvidence`, do not parse wrapper stdout as the consumed result",
    "After the command exits, read `July24_2026_Demo/verification-result.json`"
  ];
  let checkCount = 0;
  for (const phrase of requiredReadmePhrases) {
    checkCount += 1;
    if (!readmeText.includes(phrase)) {
      problems.push({ id: "demo-wrapper-result-discovery-doc-missing", file: "README_DEMO.md", phrase });
    }
  }
  for (const phrase of requiredStatusPhrases) {
    checkCount += 1;
    if (!statusText.includes(phrase)) {
      problems.push({ id: "demo-wrapper-result-discovery-doc-missing", file: "DEMO_STATUS.md", phrase });
    }
  }
  return checkCount;
}

function checkRelocatedSourceEvidenceInstructions(readmeText, runDemoText, problems) {
  const requiredReadmePhrases = [
    "ZOIA_DEMO_SOURCE_ROOT",
    "-SourceEvidenceRoot",
    "eight source evidence dependencies",
    "copied demo artifacts are still resolved from the relocated demo folder"
  ];
  let checkCount = 0;
  for (const phrase of requiredReadmePhrases) {
    checkCount += 1;
    if (!readmeText.includes(phrase)) {
      problems.push({ id: "demo-relocated-source-evidence-instruction-missing", phrase });
    }
  }
  const requiredWrapperPhrases = [
    "[string]$SourceEvidenceRoot",
    "$env:ZOIA_DEMO_SOURCE_ROOT = $ProjectRoot",
    "node \"$DemoRoot\\verify-demo.mjs\""
  ];
  for (const phrase of requiredWrapperPhrases) {
    checkCount += 1;
    if (!runDemoText.includes(phrase)) {
      problems.push({ id: "demo-relocated-source-evidence-wrapper-missing", phrase });
    }
  }
  return checkCount;
}

function checkNoUnexpectedAbsolutePaths(file, text, problems) {
  const windowsAbsolutePath = /[A-Z]:\\[^\s`)]+/giu;
  for (const match of text.matchAll(windowsAbsolutePath)) {
    problems.push({ id: "demo-human-facing-absolute-path-leak", file, path: match[0] });
  }
}

function checkDemoArtifactResolutionBoundary(manifest, sourceEvidenceDependencies, problems) {
  for (const artifact of manifest.artifacts || []) {
    const artifactPath = artifact.path || "";
    if (isAbsolute(artifactPath)) {
      problems.push({ id: "demo-artifact-path-absolute", path: artifactPath });
      continue;
    }
    const resolvedArtifactPath = resolve(DEMO_ROOT, artifactPath);
    if (!isInsidePath(DEMO_ROOT, resolvedArtifactPath)) {
      problems.push({ id: "demo-artifact-resolves-outside-demo-root", path: artifactPath, resolvedPathRole: "outside-demo-root" });
    }
  }
  for (const dependency of sourceEvidenceDependencies) {
    const resolvedCopyPath = resolve(DEMO_ROOT, dependency.copy);
    if (!isInsidePath(DEMO_ROOT, resolvedCopyPath)) {
      problems.push({ id: "demo-source-copy-resolves-outside-demo-root", evidenceId: dependency.id, copy: dependency.copy });
    }
    const resolvedSourcePath = resolve(PROJECT_ROOT, dependency.source);
    if (!isInsidePath(PROJECT_ROOT, resolvedSourcePath)) {
      problems.push({ id: "demo-source-evidence-resolves-outside-source-root", evidenceId: dependency.id, source: dependency.source });
    }
  }
}

function checkConsumedMarkdownSections(file, text, headings, problems) {
  for (const heading of headings) {
    const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*$`, "mu");
    if (!pattern.test(text)) {
      problems.push({ id: "demo-consumed-markdown-section-missing", file, heading });
    }
  }
}

function checkHumanFacingOverclaims(file, text, problems) {
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (/^(?:[-*]\s*)?(?:Not|No)\b/iu.test(trimmed)) continue;
    for (const pattern of forbiddenHumanFacingText) {
      if (pattern.test(line)) {
        problems.push({ id: "demo-human-facing-overclaim", file, pattern: String(pattern) });
      }
    }
  }
}

function checkDemoWalkthrough(readmeText, statusText, manifest, problems) {
  const requiredReadmePhrases = [
    "Best current demo artifact: `July24_2026_Demo/verification-result.json`",
    ".\\July24_2026_Demo\\run-demo.ps1",
    "Use `DEMO_STATUS.md` as the claim boundary, evidence summary, and limitations list",
    "`copiedPatchCheckCount`",
    "`runtimeConsumedArtifactCheckCount`",
    "`seededNegativeControlPassingCount`",
    "`seededControlInventory`",
    "`seededControlRiskCategoryCounts`",
    "`consumedMarkdownSectionCheckCount`",
    "`wrapperFullEvidenceCopyFreshnessCheckCount`",
    "`audioCaptureMappingCheckCount`",
    "`explicitSourceEvidenceCount`",
    "`copiedClaimedArtifactCount`"
  ];
  let checkCount = 0;
  for (const phrase of requiredReadmePhrases) {
    checkCount += 1;
    if (!readmeText.includes(phrase)) {
      problems.push({ id: "demo-walkthrough-readme-phrase-missing", phrase });
    }
  }
  for (const check of jsonChecks) {
    checkCount += 1;
    if (!readmeText.includes(check.source)) {
      problems.push({ id: "demo-walkthrough-source-dependency-missing", source: check.source });
    }
  }
  const requiredStatusPhrases = [
    "## Latest Accepted Evidence",
    "## Supported Claims",
    "## Deferred And Out Of Scope",
    "## Protected-Action Boundary",
    "Not release readiness",
    "Not npm publication readiness",
    "Not hardware parity",
    "Not complete patch semantics"
  ];
  for (const phrase of requiredStatusPhrases) {
    checkCount += 1;
    if (!statusText.includes(phrase)) {
      problems.push({ id: "demo-walkthrough-status-phrase-missing", phrase });
    }
  }
  const artifactPaths = new Set((manifest.artifacts || []).map((artifact) => artifact.path));
  const capabilityArtifacts = [
    "artifacts/generated-patches/manual-test-emulator/01-143816-v2.patch.json",
    "artifacts/generated-patch-audio/run-result.json",
    "artifacts/generated-patch-audio/classification-log.json",
    "artifacts/generated-patch-audio/captures/01-143816-v2.wav",
    "artifacts/generated-patch-lfo-semantics/run-result.json",
    "artifacts/generated-patch-lfo-semantics/classification-log.json",
    "artifacts/generated-patch-lfo-semantics/traces/01-143816-v2-positive-lfo-time-route.lfo.wav",
    "artifacts/generated-patch-filter-runtime/run-result.json",
    "artifacts/generated-patch-filter-runtime/classification-log.json",
    "artifacts/generated-patch-filter-runtime/captures/01-107507.wav"
  ];
  for (const path of capabilityArtifacts) {
    checkCount += 1;
    if (!artifactPaths.has(path)) {
      problems.push({ id: "demo-walkthrough-capability-artifact-missing", path });
    }
  }
  return checkCount;
}

function checkDemoHandoffCompleteness(inputs, problems) {
  const {
    readmeText,
    statusText,
    manifest,
    artifactManifestCount,
    manifestRequiredPathPresentCount,
    manifestSha256RecordCount,
    seededNegativeControls,
    relocatedBundleCheck
  } = inputs;
  let checkCount = 0;
  const requiredHandoffFiles = [
    "README_DEMO.md",
    "DEMO_STATUS.md",
    "run-demo.ps1",
    "verify-demo.mjs",
    "DEMO_MANIFEST.json",
    "verification-result.json"
  ];
  for (const path of requiredHandoffFiles) {
    checkCount += 1;
    const absolutePath = resolve(DEMO_ROOT, path);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile() || statSync(absolutePath).size === 0) {
      problems.push({ id: "demo-handoff-file-missing-or-empty", path });
    }
  }
  const readmeHandoffPhrases = [
    "Best current demo artifact: `July24_2026_Demo/verification-result.json`",
    ".\\July24_2026_Demo\\run-demo.ps1",
    "DEMO_MANIFEST.json",
    "Source Evidence Dependencies",
    "Boundary"
  ];
  for (const phrase of readmeHandoffPhrases) {
    checkCount += 1;
    if (!readmeText.includes(phrase)) {
      problems.push({ id: "demo-handoff-readme-phrase-missing", phrase });
    }
  }
  const statusHandoffPhrases = [
    "## Supported Claims",
    "## Deferred And Out Of Scope",
    "## Protected-Action Boundary",
    "Not release readiness",
    "No source-control side effects"
  ];
  for (const phrase of statusHandoffPhrases) {
    checkCount += 1;
    if (!statusText.includes(phrase)) {
      problems.push({ id: "demo-handoff-status-phrase-missing", phrase });
    }
  }
  const expectedCounts = [
    ["artifactManifestCount", artifactManifestCount, manifest.artifacts?.length],
    ["manifestRequiredPathPresentCount", manifestRequiredPathPresentCount, requiredFiles.length],
    ["manifestSha256RecordCount", manifestSha256RecordCount, requiredFiles.length],
    ["seededNegativeControlPassingCount", seededNegativeControls.filter((control) => control.status === "pass").length, seededNegativeControls.length]
  ];
  for (const [field, observed, expected] of expectedCounts) {
    checkCount += 1;
    if (observed !== expected) {
      problems.push({ id: "demo-handoff-count-mismatch", field, expected, observed });
    }
  }
  checkCount += 1;
  if (manifest.claimBoundary !== "This demo verifies local copied/source evidence for bounded ZOIA 0.4.0 generated-patch behavior. It is not release readiness or publication evidence.") {
    problems.push({ id: "demo-handoff-claim-boundary-mismatch", observed: manifest.claimBoundary });
  }
  checkCount += 1;
  if (!IS_RELOCATED_CHILD && (relocatedBundleCheck.status !== "pass" || relocatedBundleCheck.problemCount !== 0)) {
    problems.push({
      id: "demo-handoff-relocated-bundle-not-clean",
      status: relocatedBundleCheck.status,
      problemCount: relocatedBundleCheck.problemCount ?? null
    });
  }
  checkCount += 1;
  if (!Array.isArray(manifest.checkedEvidence) || manifest.checkedEvidence.length !== jsonChecks.length) {
    problems.push({
      id: "demo-handoff-checked-evidence-count-mismatch",
      expected: jsonChecks.length,
      observed: manifest.checkedEvidence?.length ?? null
    });
  }
  return checkCount;
}

function checkSourceEvidenceSurfaceAgreement(inputs, problems) {
  const {
    readmeText,
    statusText,
    manifest,
    sourceDependencyDocCount,
    sourceEvidenceDependencies,
    sourceFreshnessSummary
  } = inputs;
  const expectedCount = sourceEvidenceDependencies.length;
  const expectedCountPhrase = `${expectedCount} explicit source evidence files`;
  const freshnessFields = [
    "sourceEvidenceNextStaleAt",
    "sourceEvidenceMinimumRemainingMs",
    "oldestSourceEvidenceId",
    "sourceEvidenceFreshnessLimitHours",
    "sourceEvidenceRefreshRecommended",
    "sourceEvidenceWarningThresholdHours"
  ];
  let checkCount = 0;
  for (const [file, text] of [["README_DEMO.md", readmeText], ["DEMO_STATUS.md", statusText]]) {
    checkCount += 1;
    if (!text.includes(expectedCountPhrase)) {
      problems.push({ id: "demo-source-evidence-surface-count-mismatch", file, expectedPhrase: expectedCountPhrase });
    }
    for (const field of freshnessFields) {
      checkCount += 1;
      if (!text.includes(field)) {
        problems.push({ id: "demo-source-evidence-surface-freshness-field-missing", file, field });
      }
    }
  }
  checkCount += 1;
  if ((manifest.checkedEvidence || []).length !== expectedCount) {
    problems.push({
      id: "demo-source-evidence-surface-count-mismatch",
      file: "DEMO_MANIFEST.json",
      expected: expectedCount,
      observed: (manifest.checkedEvidence || []).length
    });
  }
  checkCount += 1;
  if (sourceDependencyDocCount !== expectedCount) {
    problems.push({
      id: "demo-source-evidence-surface-count-mismatch",
      file: "README_DEMO.md",
      field: "sourceDependencyDocCount",
      expected: expectedCount,
      observed: sourceDependencyDocCount
    });
  }
  const expectedFreshness = sourceEvidenceFreshnessSummary(sourceEvidenceDependencies);
  for (const field of freshnessFields) {
    checkCount += 1;
    const matches = field === "sourceEvidenceMinimumRemainingMs"
      ? Number.isFinite(sourceFreshnessSummary[field]) &&
        Number.isFinite(expectedFreshness[field]) &&
        Math.abs(sourceFreshnessSummary[field] - expectedFreshness[field]) <= 1000
      : sourceFreshnessSummary[field] === expectedFreshness[field];
    if (!matches) {
      problems.push({
        id: "demo-source-evidence-surface-freshness-mismatch",
        field,
        expected: expectedFreshness[field],
        observed: sourceFreshnessSummary[field]
      });
    }
  }
  return checkCount;
}

function checkSourceEvidenceWarningDocumentAgreement(readmeText, statusText, sourceFreshnessSummary, problems) {
  const expectedLimitPhrase = `${sourceFreshnessSummary.sourceEvidenceFreshnessLimitHours}-hour freshness limit`;
  const expectedWarningPhrase = `${sourceFreshnessSummary.sourceEvidenceWarningThresholdHours}-hour refresh-warning window`;
  let checkCount = 0;
  for (const [file, text] of [["README_DEMO.md", readmeText], ["DEMO_STATUS.md", statusText]]) {
    checkCount += 1;
    if (!text.includes(expectedLimitPhrase)) {
      problems.push({ id: "demo-source-evidence-warning-doc-value-mismatch", file, expectedPhrase: expectedLimitPhrase });
    }
    checkCount += 1;
    if (!text.includes(expectedWarningPhrase)) {
      problems.push({ id: "demo-source-evidence-warning-doc-value-mismatch", file, expectedPhrase: expectedWarningPhrase });
    }
  }
  return checkCount;
}

const capabilityChains = [
  {
    id: "generated-patch-json",
    readmePhrases: ["Generated patch JSON", "`copiedPatchCheckCount`"],
    statusPhrases: ["converted emulator patch JSON"],
    verifierFields: ["copiedPatchCheckCount"],
    artifacts: [
      "artifacts/generated-patches/manual-test-emulator/01-143816-v2.patch.json",
      "artifacts/generated-patches/manual-test-emulator/02-108214.patch.json",
      "artifacts/generated-patches/manual-test-emulator/03-184325.patch.json"
    ],
    sourceDependencyIds: ["delay-audio"],
    runtimeEvidence(runtimeLogs) {
      return runtimeLogs.delayAudioResult.summary?.patchCount === 3 &&
        runtimeLogs.delayAudioResult.results?.filter((entry) => entry.audioEvidence?.sourcePatchId).length >= 3;
    }
  },
  {
    id: "delay-audio-runtime",
    readmePhrases: ["Delay audio evidence", "`runtimeConsumedArtifactCheckCount`"],
    statusPhrases: ["WAV audio captures", "signal-present classification"],
    verifierFields: ["runtimeConsumedArtifactCheckCount"],
    artifacts: [
      "artifacts/generated-patch-audio/run-result.json",
      "artifacts/generated-patch-audio/classification-log.json",
      "artifacts/generated-patch-audio/stimulus-manifest.json",
      "artifacts/generated-patch-audio/captures/01-143816-v2.wav"
    ],
    sourceDependencyIds: ["delay-audio"],
    runtimeEvidence(runtimeLogs) {
      return runtimeLogs.delayAudio.classifications.filter((entry) => entry.status === "pass").length === 3;
    }
  },
  {
    id: "lfo-trace-runtime",
    readmePhrases: ["LFO trace evidence", "`runtimeConsumedArtifactCheckCount`"],
    statusPhrases: ["LFO/control trace evidence"],
    verifierFields: ["runtimeConsumedArtifactCheckCount"],
    artifacts: [
      "artifacts/generated-patch-lfo-semantics/run-result.json",
      "artifacts/generated-patch-lfo-semantics/classification-log.json",
      "artifacts/generated-patch-lfo-semantics/stimulus-manifest.json",
      "artifacts/generated-patch-lfo-semantics/traces/01-143816-v2-positive-lfo-time-route.lfo.wav"
    ],
    sourceDependencyIds: ["delay-lfo-semantics"],
    runtimeEvidence(runtimeLogs) {
      return runtimeLogs.lfoSemantics.classifications.filter((entry) => entry.status === "pass" && entry.mode === "positive-lfo-time-route").length === 3;
    }
  },
  {
    id: "filter-runtime",
    readmePhrases: ["Filter runtime evidence", "`runtimeConsumedArtifactCheckCount`"],
    statusPhrases: ["Static low-pass generated filter path"],
    verifierFields: ["runtimeConsumedArtifactCheckCount"],
    artifacts: [
      "artifacts/generated-patch-filter-runtime/run-result.json",
      "artifacts/generated-patch-filter-runtime/classification-log.json",
      "artifacts/generated-patch-filter-runtime/stimulus-manifest.json",
      "artifacts/generated-patch-filter-runtime/captures/01-107507.wav"
    ],
    sourceDependencyIds: ["filter-low-pass-runtime"],
    runtimeEvidence(runtimeLogs) {
      return runtimeLogs.filterRuntime.classifications.some((entry) => entry.status === "pass" && entry.classification === "lowpass-filter-present");
    }
  }
];

const audioCapabilityClaimChains = [
  {
    id: "delay-audio-wav-content",
    readmePhrase: "Delay audio evidence",
    statusPhrase: "WAV audio captures",
    manifestPathPrefix: "artifacts/generated-patch-audio/captures/",
    verifierFields: [
      "audioManifestContentCoverageCheckCount",
      "audioClassificationWavContentCheckCount",
      "audioCaptureMappingCheckCount",
      "audioStimulusManifestAgreementCheckCount"
    ],
    consumedContentField: "audioClassificationWavContentCheckCount",
    checksPerArtifact: 3,
    expectedWavCount(runtimeLogs) {
      return (runtimeLogs.delayAudio.classifications || []).length;
    }
  },
  {
    id: "lfo-trace-wav-content",
    readmePhrase: "LFO trace evidence",
    statusPhrase: "LFO/control trace evidence",
    manifestPathPrefix: "artifacts/generated-patch-lfo-semantics/traces/",
    verifierFields: [
      "audioManifestContentCoverageCheckCount",
      "lfoTraceWavContentCheckCount"
    ],
    consumedContentField: "lfoTraceWavContentCheckCount",
    checksPerArtifact: 2,
    expectedWavCount(runtimeLogs) {
      return (runtimeLogs.lfoSemantics.classifications || [])
        .filter((entry) => entry.status === "pass" && entry.mode === "positive-lfo-time-route").length;
    }
  },
  {
    id: "filter-runtime-wav-content",
    readmePhrase: "Filter runtime evidence",
    statusPhrase: "Static low-pass generated filter path",
    manifestPathPrefix: "artifacts/generated-patch-filter-runtime/captures/",
    verifierFields: [
      "audioManifestContentCoverageCheckCount",
      "filterWavContentCheckCount"
    ],
    consumedContentField: "filterWavContentCheckCount",
    checksPerArtifact: 5,
    expectedWavCount(runtimeLogs) {
      return (runtimeLogs.filterRuntime.classifications || []).length;
    }
  }
];

const audioArtifactFreshnessGroups = [
  {
    id: "delay-audio",
    jsonPaths: [
      "artifacts/generated-patch-audio/run-result.json",
      "artifacts/generated-patch-audio/classification-log.json",
      "artifacts/generated-patch-audio/stimulus-manifest.json"
    ],
    wavPrefix: "artifacts/generated-patch-audio/captures/",
    maxDeltaMs: AUDIO_GENERATION_WINDOW_MS
  },
  {
    id: "lfo-trace",
    jsonPaths: [
      "artifacts/generated-patch-lfo-semantics/run-result.json",
      "artifacts/generated-patch-lfo-semantics/classification-log.json",
      "artifacts/generated-patch-lfo-semantics/stimulus-manifest.json"
    ],
    wavPrefix: "artifacts/generated-patch-lfo-semantics/traces/",
    maxDeltaMs: AUDIO_GENERATION_WINDOW_MS
  },
  {
    id: "filter-runtime",
    jsonPaths: [
      "artifacts/generated-patch-filter-runtime/run-result.json",
      "artifacts/generated-patch-filter-runtime/classification-log.json",
      "artifacts/generated-patch-filter-runtime/stimulus-manifest.json"
    ],
    wavPrefix: "artifacts/generated-patch-filter-runtime/captures/",
    maxDeltaMs: AUDIO_GENERATION_WINDOW_MS
  }
];

function checkCapabilityChains(readmeText, statusText, manifest, runtimeLogs, sourceEvidenceDependencies, verifierFieldNames, problems) {
  const artifactPaths = new Set((manifest.artifacts || []).map((artifact) => artifact.path));
  const sourceDependencyIds = new Set(sourceEvidenceDependencies.map((dependency) => dependency.id));
  let checkCount = 0;
  for (const chain of capabilityChains) {
    for (const phrase of chain.readmePhrases) {
      checkCount += 1;
      if (!readmeText.includes(phrase)) {
        problems.push({ id: "demo-capability-chain-readme-link-missing", capabilityId: chain.id, phrase });
      }
    }
    for (const phrase of chain.statusPhrases) {
      checkCount += 1;
      if (!statusText.includes(phrase)) {
        problems.push({ id: "demo-capability-chain-status-link-missing", capabilityId: chain.id, phrase });
      }
    }
    for (const field of chain.verifierFields) {
      checkCount += 1;
      if (!verifierFieldNames.has(field)) {
        problems.push({ id: "demo-capability-chain-verifier-field-missing", capabilityId: chain.id, field });
      }
    }
    for (const path of chain.artifacts) {
      checkCount += 1;
      if (!artifactPaths.has(path)) {
        problems.push({ id: "demo-capability-chain-artifact-missing", capabilityId: chain.id, path });
      }
    }
    for (const dependencyId of chain.sourceDependencyIds) {
      checkCount += 1;
      if (!sourceDependencyIds.has(dependencyId)) {
        problems.push({ id: "demo-capability-chain-source-dependency-missing", capabilityId: chain.id, dependencyId });
      }
    }
    checkCount += 1;
    if (!chain.runtimeEvidence(runtimeLogs)) {
      problems.push({ id: "demo-capability-chain-runtime-evidence-missing", capabilityId: chain.id });
    }
  }
  return checkCount;
}

function checkAudioCapabilityClaimChains(readmeText, statusText, manifest, runtimeLogs, verifierFieldNames, verifierFieldValues, problems) {
  const manifestWavPaths = (manifest.artifacts || [])
    .map((artifact) => artifact.path)
    .filter((path) => path.endsWith(".wav"));
  let checkCount = 0;
  for (const chain of audioCapabilityClaimChains) {
    checkCount += 1;
    if (!readmeText.includes(chain.readmePhrase)) {
      problems.push({ id: "demo-audio-capability-chain-readme-claim-missing", capabilityId: chain.id, phrase: chain.readmePhrase });
    }

    checkCount += 1;
    if (!statusText.includes(chain.statusPhrase)) {
      problems.push({ id: "demo-audio-capability-chain-status-claim-missing", capabilityId: chain.id, phrase: chain.statusPhrase });
    }

    for (const field of chain.verifierFields) {
      checkCount += 1;
      if (!verifierFieldNames.has(field)) {
        problems.push({ id: "demo-audio-capability-chain-verifier-field-missing", capabilityId: chain.id, field });
        continue;
      }

      checkCount += 1;
      const value = verifierFieldValues.get(field);
      if (!Number.isFinite(value) || value <= 0) {
        problems.push({ id: "demo-audio-capability-chain-verifier-field-stale", capabilityId: chain.id, field, observed: value ?? null });
      }
    }

    const expectedWavCount = chain.expectedWavCount(runtimeLogs);
    const claimedWavPaths = manifestWavPaths.filter((path) => path.startsWith(chain.manifestPathPrefix));
    checkCount += 1;
    if (claimedWavPaths.length < expectedWavCount) {
      problems.push({
        id: "demo-audio-capability-chain-manifest-wav-missing",
        capabilityId: chain.id,
        manifestPathPrefix: chain.manifestPathPrefix,
        expectedAtLeast: expectedWavCount,
        observed: claimedWavPaths.length
      });
    }
  }
  return checkCount;
}

function checkAudioConsumedFieldArtifactCounts(manifest, runtimeLogs, verifierFieldValues, problems) {
  const manifestWavPaths = (manifest.artifacts || [])
    .map((artifact) => artifact.path)
    .filter((path) => path.endsWith(".wav"));
  let checkCount = 0;
  for (const chain of audioCapabilityClaimChains) {
    const expectedWavCount = chain.expectedWavCount(runtimeLogs);
    const claimedWavCount = manifestWavPaths.filter((path) => path.startsWith(chain.manifestPathPrefix)).length;
    const expectedFieldCount = expectedWavCount * chain.checksPerArtifact;
    const observedFieldCount = verifierFieldValues.get(chain.consumedContentField);
    checkCount += 1;
    if (claimedWavCount !== expectedWavCount) {
      problems.push({
        id: "demo-audio-consumed-field-manifest-count-mismatch",
        capabilityId: chain.id,
        manifestPathPrefix: chain.manifestPathPrefix,
        expectedWavCount,
        observedWavCount: claimedWavCount
      });
    }

    checkCount += 1;
    if (observedFieldCount !== expectedFieldCount) {
      problems.push({
        id: "demo-audio-consumed-field-artifact-count-mismatch",
        capabilityId: chain.id,
        field: chain.consumedContentField,
        expected: expectedFieldCount,
        observed: observedFieldCount ?? null,
        expectedWavCount,
        checksPerArtifact: chain.checksPerArtifact
      });
    }
  }
  return checkCount;
}

function checkAudioArtifactGenerationFreshness(manifest, problems, statProvider = statSync) {
  const artifactPaths = new Set((manifest.artifacts || []).map((artifact) => artifact.path));
  let checkCount = 0;
  for (const group of audioArtifactFreshnessGroups) {
    const groupPaths = [
      ...group.jsonPaths,
      ...(manifest.artifacts || [])
        .map((artifact) => artifact.path)
        .filter((path) => path.endsWith(".wav") && path.startsWith(group.wavPrefix))
    ];
    checkCount += 1;
    for (const path of groupPaths) {
      if (!artifactPaths.has(path)) {
        problems.push({ id: "demo-audio-artifact-generation-manifest-path-missing", groupId: group.id, path });
      }
    }

    const mtimes = [];
    for (const path of groupPaths) {
      const absolutePath = resolve(DEMO_ROOT, path);
      if (!existsSync(absolutePath)) {
        problems.push({ id: "demo-audio-artifact-generation-file-missing", groupId: group.id, path });
        continue;
      }
      mtimes.push({ path, mtimeMs: statProvider(absolutePath).mtimeMs });
    }
    if (mtimes.length === 0) continue;

    const newest = mtimes.reduce((a, b) => a.mtimeMs >= b.mtimeMs ? a : b);
    const oldest = mtimes.reduce((a, b) => a.mtimeMs <= b.mtimeMs ? a : b);
    checkCount += 1;
    const deltaMs = newest.mtimeMs - oldest.mtimeMs;
    if (deltaMs > group.maxDeltaMs) {
      problems.push({
        id: "demo-audio-artifact-generation-window-exceeded",
        groupId: group.id,
        maxDeltaMs: group.maxDeltaMs,
        observedDeltaMs: deltaMs,
        oldestPath: oldest.path,
        newestPath: newest.path
      });
    }
  }
  return checkCount;
}

function checkAudioGenerationWindowSurfaceAgreement(readmeText, statusText, manifest, resultFields, problems) {
  const expectedPhrase = `${AUDIO_GENERATION_WINDOW_MINUTES}-minute audio generation window`;
  let checkCount = 0;
  for (const [file, text] of [["README_DEMO.md", readmeText], ["DEMO_STATUS.md", statusText]]) {
    checkCount += 1;
    if (!text.includes(expectedPhrase)) {
      problems.push({ id: "demo-audio-generation-window-doc-missing", file, expectedPhrase });
    }
  }

  const surfaces = [
    ["DEMO_MANIFEST.json", manifest],
    ["verification-result.json", resultFields]
  ];
  for (const [file, surface] of surfaces) {
    checkCount += 1;
    if (surface.audioGenerationWindowMaxDeltaMs !== AUDIO_GENERATION_WINDOW_MS) {
      problems.push({
        id: "demo-audio-generation-window-threshold-mismatch",
        file,
        field: "audioGenerationWindowMaxDeltaMs",
        expected: AUDIO_GENERATION_WINDOW_MS,
        observed: surface.audioGenerationWindowMaxDeltaMs ?? null
      });
    }

    checkCount += 1;
    if (surface.audioGenerationWindowMinutes !== AUDIO_GENERATION_WINDOW_MINUTES) {
      problems.push({
        id: "demo-audio-generation-window-threshold-mismatch",
        file,
        field: "audioGenerationWindowMinutes",
        expected: AUDIO_GENERATION_WINDOW_MINUTES,
        observed: surface.audioGenerationWindowMinutes ?? null
      });
    }
  }
  return checkCount;
}

function expectedPatchPath(id) {
  return `artifacts/generated-patches/manual-test-emulator/${id}.patch.json`;
}

function hasConnection(patch, srcName, srcBlock, dstName, dstBlock) {
  const modulesByName = new Map((patch.modules || []).map((module) => [module.name, module]));
  const src = modulesByName.get(srcName);
  const dst = modulesByName.get(dstName);
  if (!src || !dst) return false;
  return (patch.connections || []).some((connection) =>
    connection.srcMod === src.idx &&
    connection.srcBlock === srcBlock &&
    connection.dstMod === dst.idx &&
    connection.dstBlock === dstBlock &&
    Number(connection.strength) > 0
  );
}

function checkPatchStructure(id, patch, runtimeLogs, problems) {
  if (patch.schemaVersion !== "zoia.emulator-patch-from-generated-graph.v1") {
    problems.push({ id: "demo-patch-schema-version-mismatch", patchId: id, observed: patch.schemaVersion });
  }
  if (!Array.isArray(patch.modules) || !Array.isArray(patch.connections)) {
    problems.push({ id: "demo-patch-structure-missing-arrays", patchId: id });
    return;
  }
  if (patch.moduleCount !== patch.modules.length || patch.modules.length !== 5) {
    problems.push({ id: "demo-patch-module-count-mismatch", patchId: id, expected: 5, observed: patch.modules.length, declared: patch.moduleCount });
  }
  if ((patch.connections || []).length !== 4) {
    problems.push({ id: "demo-patch-routing-edge-count-mismatch", patchId: id, expected: 4, observed: (patch.connections || []).length });
  }
  const typeNames = new Set(patch.modules.map((module) => module.typeName));
  for (const typeName of ["Audio Input", "Delay Line", "Audio Output", "LFO", "Cport Exp/CV"]) {
    if (!typeNames.has(typeName)) {
      problems.push({ id: "demo-patch-required-module-missing", patchId: id, typeName });
    }
  }
  const requiredRoutes = [
    ["audio-in-1", 0, "delay-1", 0],
    ["delay-1", 4, "audio-out-1", 0],
    ["mod-source-1", 2, "delay-1", 1],
    ["control-source-1", 0, "delay-1", 2]
  ];
  for (const [srcName, srcBlock, dstName, dstBlock] of requiredRoutes) {
    if (!hasConnection(patch, srcName, srcBlock, dstName, dstBlock)) {
      problems.push({ id: "demo-patch-required-routing-missing", patchId: id, srcName, srcBlock, dstName, dstBlock });
    }
  }
  if (!Array.isArray(patch.labels) || !patch.labels.includes("generated") || !patch.labels.includes("text-prompt")) {
    problems.push({ id: "demo-patch-label-boundary-missing", patchId: id, labels: patch.labels || [] });
  }
  const audioRuntime = runtimeLogs.delayAudio.classifications.find((entry) => entry.id === id);
  const audioRuntimeResult = runtimeLogs.delayAudioResult.results?.find((entry) => entry.id === id);
  const lfoRuntime = runtimeLogs.lfoSemantics.classifications.find((entry) => entry.id === `${id}-positive-lfo-time-route`);
  if (!audioRuntime || audioRuntime.status !== "pass") {
    problems.push({ id: "demo-patch-runtime-audio-link-missing", patchId: id });
  }
  if (!lfoRuntime || lfoRuntime.status !== "pass") {
    problems.push({ id: "demo-patch-runtime-lfo-link-missing", patchId: id });
  }
  if (audioRuntime?.patchPath && !audioRuntime.patchPath.endsWith(`${id}.patch.json`)) {
    problems.push({ id: "demo-patch-runtime-audio-path-mismatch", patchId: id, observed: audioRuntime.patchPath });
  }
  if (!audioRuntimeResult?.audioEvidence?.sourcePatchId) {
    problems.push({ id: "demo-patch-runtime-source-id-missing", patchId: id });
  } else if (patch.sourcePatchId !== audioRuntimeResult.audioEvidence.sourcePatchId) {
    problems.push({
      id: "demo-patch-runtime-source-id-mismatch",
      patchId: id,
      expected: audioRuntimeResult.audioEvidence.sourcePatchId,
      observed: patch.sourcePatchId
    });
  }
}

async function checkCopiedPatches(runtimeLogs, problems) {
  const patchIds = ["01-143816-v2", "02-108214", "03-184325"];
  for (const patchId of patchIds) {
    const patch = await readJson(resolve(DEMO_ROOT, expectedPatchPath(patchId)));
    checkPatchStructure(patchId, patch, runtimeLogs, problems);
  }
  return patchIds.length;
}

function analyzeWav(buffer, options = {}) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    return { valid: false, reason: "wav-header-invalid" };
  }
  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > buffer.length) break;
    if (chunkId === "fmt ") {
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channelCount: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14)
      };
    } else if (chunkId === "data") {
      data = buffer.subarray(chunkStart, chunkEnd);
    }
    offset = chunkEnd + (chunkSize % 2);
  }
  if (!format || !data || data.length === 0) return { valid: false, reason: "wav-data-missing" };
  const sampleCount = Math.floor(data.length / (format.bitsPerSample / 8));
  if (sampleCount <= 0) return { valid: false, reason: "wav-samples-missing" };
  const postInputTailStartIndex = Number.isFinite(options.postInputTailStartIndex)
    ? Math.max(0, Math.floor(options.postInputTailStartIndex))
    : null;
  let sumSquares = 0;
  let peak = 0;
  let postInputTailPeak = null;
  let zeroCrossings = 0;
  let previousSign = 0;
  const frequencyBins = new Map((options.frequencyBins || []).map((frequency) => [frequency, { real: 0, imaginary: 0 }]));
  for (let index = 0; index < sampleCount; index += 1) {
    let sample;
    if (format.audioFormat === 1 && format.bitsPerSample === 16) {
      sample = data.readInt16LE(index * 2) / 32768;
    } else if (format.audioFormat === 3 && format.bitsPerSample === 32) {
      sample = data.readFloatLE(index * 4);
    } else {
      return { valid: false, reason: "wav-format-unsupported", format };
    }
    sumSquares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
    const sign = Math.abs(sample) > 1e-9 ? Math.sign(sample) : 0;
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) {
      zeroCrossings += 1;
    }
    if (sign !== 0) {
      previousSign = sign;
    }
    if (postInputTailStartIndex != null && index >= postInputTailStartIndex) {
      postInputTailPeak = Math.max(postInputTailPeak ?? 0, Math.abs(sample));
    }
    for (const [frequency, accumulator] of frequencyBins) {
      const phase = (2 * Math.PI * frequency * index) / format.sampleRate;
      accumulator.real += sample * Math.cos(phase);
      accumulator.imaginary -= sample * Math.sin(phase);
    }
  }
  const durationSeconds = sampleCount / format.sampleRate;
  const frequencyMagnitudes = {};
  for (const [frequency, accumulator] of frequencyBins) {
    frequencyMagnitudes[frequency] = Math.sqrt((accumulator.real ** 2) + (accumulator.imaginary ** 2)) / sampleCount;
  }
  return {
    valid: true,
    sampleRate: format.sampleRate,
    channelCount: format.channelCount,
    sampleCount,
    rms: Math.sqrt(sumSquares / sampleCount),
    peak,
    postInputTailPeak,
    zeroCrossings,
    estimatedFrequencyHz: durationSeconds > 0 ? zeroCrossings / (2 * durationSeconds) : null,
    frequencyMagnitudes
  };
}

function silentPcm16Wav({ sampleRate = 48000, sampleCount = 4800, channelCount = 1 } = {}) {
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

function checkWavAnalysis(relativePath, buffer, expectations, problems) {
  const analysis = analyzeWav(buffer);
  if (!analysis.valid) {
    problems.push({ id: "demo-runtime-wav-invalid", path: relativePath, reason: analysis.reason });
    return analysis;
  }
  if (expectations.minRms != null && analysis.rms < expectations.minRms) {
    problems.push({ id: "demo-runtime-wav-rms-too-low", path: relativePath, expectedAtLeast: expectations.minRms, observed: analysis.rms });
  }
  if (expectations.maxRms != null && analysis.rms > expectations.maxRms) {
    problems.push({ id: "demo-runtime-wav-rms-too-high", path: relativePath, expectedAtMost: expectations.maxRms, observed: analysis.rms });
  }
  if (expectations.minPeak != null && analysis.peak < expectations.minPeak) {
    problems.push({ id: "demo-runtime-wav-peak-too-low", path: relativePath, expectedAtLeast: expectations.minPeak, observed: analysis.peak });
  }
  if (expectations.maxPeak != null && analysis.peak > expectations.maxPeak) {
    problems.push({ id: "demo-runtime-wav-peak-too-high", path: relativePath, expectedAtMost: expectations.maxPeak, observed: analysis.peak });
  }
  return analysis;
}

async function checkCopiedWav(relativePath, expectations, problems) {
  const absolutePath = resolve(DEMO_ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    problems.push({ id: "demo-runtime-wav-missing", path: relativePath });
    return null;
  }
  return checkWavAnalysis(relativePath, await readFile(absolutePath), expectations, problems);
}

async function checkRuntimeConsumedArtifacts(runtimeLogs, problems) {
  const delayLog = runtimeLogs.delayAudio;
  const delayPasses = delayLog.classifications.filter((entry) => entry.expectedSignal === true);
  const delaySilent = delayLog.classifications.find((entry) => entry.id === "silent-negative-control");
  if (delayPasses.length !== 3) {
    problems.push({ id: "demo-runtime-delay-pass-count-mismatch", expected: 3, observed: delayPasses.length });
  }
  for (const entry of delayPasses) {
    if (entry.status !== "pass" || entry.classification !== "signal-present" || entry.assertionFailureCount !== 0) {
      problems.push({ id: "demo-runtime-audio-classification-degraded", evidenceId: entry.id, status: entry.status, classification: entry.classification });
    }
    if (entry.rms < 0.0005 || entry.peak < 0.05 || entry.postInputTailPeak < 0.01) {
      problems.push({ id: "demo-runtime-audio-metrics-degraded", evidenceId: entry.id, rms: entry.rms, peak: entry.peak, postInputTailPeak: entry.postInputTailPeak });
    }
    await checkCopiedWav(`artifacts/generated-patch-audio/captures/${entry.id}.wav`, { minRms: 0.0005, minPeak: 0.05 }, problems);
  }
  if (!delaySilent || delaySilent.classification !== "expected-silence-classified" || delaySilent.expectedSignal !== false) {
    problems.push({ id: "demo-runtime-silent-negative-control-missing-or-degraded" });
  } else {
    await checkCopiedWav("artifacts/generated-patch-audio/captures/silent-negative-control.wav", { maxRms: 0.000001, maxPeak: 0.000001 }, problems);
  }

  const lfoPasses = runtimeLogs.lfoSemantics.classifications.filter((entry) => entry.status === "pass" && entry.mode === "positive-lfo-time-route");
  const lfoClassifiedControls = runtimeLogs.lfoSemantics.classifications.filter((entry) => entry.status === "classified");
  if (lfoPasses.length !== 3) {
    problems.push({ id: "demo-runtime-lfo-pass-count-mismatch", expected: 3, observed: lfoPasses.length });
  }
  if (lfoClassifiedControls.length < 9) {
    problems.push({ id: "demo-runtime-lfo-negative-control-count-mismatch", expectedAtLeast: 9, observed: lfoClassifiedControls.length });
  }
  for (const entry of lfoPasses) {
    if (entry.classification !== "lfo-waveform-shifts-delay-output" || entry.assertionFailureCount !== 0) {
      problems.push({ id: "demo-runtime-lfo-classification-degraded", evidenceId: entry.id, classification: entry.classification });
    }
    if (entry.lfoTraceRms < 0.1 || !Number.isFinite(entry.lfoTraceEstimatedFrequencyHz) || entry.lfoTraceEstimatedFrequencyHz <= 0) {
      problems.push({ id: "demo-runtime-lfo-trace-metrics-degraded", evidenceId: entry.id, lfoTraceRms: entry.lfoTraceRms, lfoTraceEstimatedFrequencyHz: entry.lfoTraceEstimatedFrequencyHz });
    }
    await checkCopiedWav(`artifacts/generated-patch-lfo-semantics/traces/${entry.id}.lfo.wav`, { minRms: 0.1, minPeak: 0.1 }, problems);
  }

  const filterPass = runtimeLogs.filterRuntime.classifications.find((entry) => entry.expectedLowpass === true);
  const filterControls = runtimeLogs.filterRuntime.classifications.filter((entry) => entry.expectedLowpass === false);
  if (!filterPass || filterPass.status !== "pass" || filterPass.classification !== "lowpass-filter-present" || filterPass.highLowRatio >= 0.1) {
    problems.push({ id: "demo-runtime-filter-classification-degraded", observed: filterPass || null });
  } else {
    await checkCopiedWav(`artifacts/generated-patch-filter-runtime/captures/${filterPass.id}.wav`, { minRms: 0.05, minPeak: 0.05 }, problems);
  }
  if (filterControls.length !== 2 || filterControls.some((entry) => entry.status !== "classified" || entry.assertionFailureCount !== 0)) {
    problems.push({ id: "demo-runtime-filter-negative-control-degraded", expected: 2, observed: filterControls.length });
  }
}

async function checkAudioStimulusManifestAgreement(runtimeLogs, problems) {
  const manifest = runtimeLogs.delayAudioStimulus;
  const result = runtimeLogs.delayAudioResult;
  let checkCount = 0;
  const expectedStimulus = manifest.stimulus || {};
  const expectedRender = manifest.renderSettings || {};
  const expectedThresholds = manifest.thresholds || {};
  checkCount += 1;
  if (manifest.schemaVersion !== "zoia.generated-patch-audio-stimulus-manifest.v1") {
    problems.push({ id: "demo-audio-stimulus-schema-mismatch", observed: manifest.schemaVersion || null });
  }
  checkCount += 1;
  if (expectedStimulus.kind !== "single-sample-impulse") {
    problems.push({ id: "demo-audio-stimulus-kind-mismatch", expected: "single-sample-impulse", observed: expectedStimulus.kind || null });
  }
  checkCount += 1;
  if (expectedStimulus.amplitude !== 0.75) {
    problems.push({ id: "demo-audio-stimulus-amplitude-mismatch", expected: 0.75, observed: expectedStimulus.amplitude ?? null });
  }
  for (const entry of result.results || []) {
    if (entry.expectedSignal !== true) continue;
    const event = entry.audioEvidence?.stimulusEvents?.[0] || null;
    checkCount += 1;
    if (!event || event.stimulus !== expectedStimulus.kind || event.amplitude !== expectedStimulus.amplitude) {
      problems.push({
        id: "demo-audio-stimulus-event-mismatch",
        evidenceId: entry.id,
        expectedStimulus: expectedStimulus.kind,
        expectedAmplitude: expectedStimulus.amplitude,
        observed: event
      });
    }
    const wavPath = `artifacts/generated-patch-audio/captures/${entry.id}.wav`;
    const wavAnalysis = analyzeWav(await readFile(resolve(DEMO_ROOT, wavPath)));
    checkCount += 1;
    if (!wavAnalysis.valid || wavAnalysis.sampleRate !== expectedRender.sampleRate || wavAnalysis.channelCount !== expectedRender.channelCount) {
      problems.push({
        id: "demo-audio-stimulus-render-settings-mismatch",
        evidenceId: entry.id,
        path: wavPath,
        expectedSampleRate: expectedRender.sampleRate,
        expectedChannelCount: expectedRender.channelCount,
        observed: wavAnalysis
      });
    }
  }
  checkCount += 1;
  if (expectedThresholds.minRms !== 0.0005 || expectedThresholds.minPeak !== 0.05 || expectedThresholds.minPostInputTailPeak !== 0.01) {
    problems.push({
      id: "demo-audio-stimulus-threshold-mismatch",
      expected: { minRms: 0.0005, minPeak: 0.05, minPostInputTailPeak: 0.01 },
      observed: {
        minRms: expectedThresholds.minRms,
        minPeak: expectedThresholds.minPeak,
        minPostInputTailPeak: expectedThresholds.minPostInputTailPeak
      }
    });
  }
  return checkCount;
}

async function checkAudioCaptureMapping(manifest, runtimeLogs, problems) {
  const artifactPaths = new Set((manifest.artifacts || []).map((artifact) => artifact.path));
  let checkCount = 0;
  for (const entry of runtimeLogs.delayAudioResult.results || []) {
    const wavPath = `artifacts/generated-patch-audio/captures/${entry.id}.wav`;
    checkCount += 1;
    if (!artifactPaths.has(wavPath)) {
      problems.push({ id: "demo-audio-capture-wav-path-missing", evidenceId: entry.id, path: wavPath });
      continue;
    }
    const absolutePath = resolve(DEMO_ROOT, wavPath);
    if (!existsSync(absolutePath)) {
      problems.push({ id: "demo-audio-capture-wav-file-missing", evidenceId: entry.id, path: wavPath });
      continue;
    }
    const analysis = analyzeWav(await readFile(absolutePath));
    const features = entry.audioEvidence?.features || {};
    for (const field of ["rms", "peak"]) {
      checkCount += 1;
      if (!analysis.valid || !Number.isFinite(analysis[field]) || !Number.isFinite(features[field]) || Math.abs(analysis[field] - features[field]) > 1e-4) {
        problems.push({
          id: "demo-audio-capture-wav-feature-mismatch",
          evidenceId: entry.id,
          path: wavPath,
          field,
          expected: features[field],
          observed: analysis.valid ? analysis[field] : null
        });
      }
    }
  }
  return checkCount;
}

async function checkAudioClassificationWavContent(runtimeLogs, problems, analysisById = null) {
  const resultsById = new Map((runtimeLogs.delayAudioResult.results || []).map((entry) => [entry.id, entry]));
  let checkCount = 0;
  for (const classification of runtimeLogs.delayAudio.classifications || []) {
    const result = resultsById.get(classification.id);
    if (!result) continue;
    const features = result.audioEvidence?.features || {};
    const wavPath = `artifacts/generated-patch-audio/captures/${classification.id}.wav`;
    const analysis = analysisById?.get(classification.id) || analyzeWav(
      await readFile(resolve(DEMO_ROOT, wavPath)),
      { postInputTailStartIndex: features.postInputTailStart }
    );
    for (const field of ["rms", "peak", "postInputTailPeak"]) {
      checkCount += 1;
      const tolerance = field === "postInputTailPeak" ? 1e-4 : 1e-4;
      if (
        !analysis.valid ||
        !Number.isFinite(classification[field]) ||
        !Number.isFinite(analysis[field]) ||
        Math.abs(classification[field] - analysis[field]) > tolerance
      ) {
        problems.push({
          id: "demo-audio-classification-wav-content-mismatch",
          evidenceId: classification.id,
          path: wavPath,
          field,
          expected: classification[field],
          observed: analysis.valid ? analysis[field] : null
        });
      }
    }
  }
  return checkCount;
}

async function checkLfoTraceWavContent(runtimeLogs, problems, analysisById = null) {
  const lfoPasses = runtimeLogs.lfoSemantics.classifications.filter((entry) =>
    entry.status === "pass" && entry.mode === "positive-lfo-time-route"
  );
  let checkCount = 0;
  for (const entry of lfoPasses) {
    const wavPath = `artifacts/generated-patch-lfo-semantics/traces/${entry.id}.lfo.wav`;
    const analysis = analysisById?.get(entry.id) || analyzeWav(await readFile(resolve(DEMO_ROOT, wavPath)));
    checkCount += 1;
    if (!analysis.valid || !Number.isFinite(analysis.rms) || Math.abs(entry.lfoTraceRms - analysis.rms) > 1e-4) {
      problems.push({
        id: "demo-lfo-trace-wav-content-mismatch",
        evidenceId: entry.id,
        path: wavPath,
        field: "lfoTraceRms",
        expected: entry.lfoTraceRms,
        observed: analysis.valid ? analysis.rms : null
      });
    }
    checkCount += 1;
    if (!analysis.valid || !Number.isFinite(analysis.estimatedFrequencyHz) || Math.abs(entry.lfoTraceEstimatedFrequencyHz - analysis.estimatedFrequencyHz) > 0.5) {
      problems.push({
        id: "demo-lfo-trace-wav-content-mismatch",
        evidenceId: entry.id,
        path: wavPath,
        field: "lfoTraceEstimatedFrequencyHz",
        expected: entry.lfoTraceEstimatedFrequencyHz,
        observed: analysis.valid ? analysis.estimatedFrequencyHz : null
      });
    }
  }
  return checkCount;
}

async function checkFilterWavContent(runtimeLogs, problems, analysisById = null) {
  const stimulus = runtimeLogs.filterStimulus.stimulus || {};
  let checkCount = 0;
  for (const entry of runtimeLogs.filterRuntime.classifications || []) {
    const wavPath = `artifacts/generated-patch-filter-runtime/captures/${entry.id}.wav`;
    const analysis = analysisById?.get(entry.id) || analyzeWav(
      await readFile(resolve(DEMO_ROOT, wavPath)),
      { frequencyBins: [stimulus.lowFrequency, stimulus.highFrequency] }
    );
    const lowMagnitude = analysis.frequencyMagnitudes?.[stimulus.lowFrequency];
    const highMagnitude = analysis.frequencyMagnitudes?.[stimulus.highFrequency];
    const highLowRatio = Number.isFinite(lowMagnitude) && lowMagnitude > 0 ? highMagnitude / lowMagnitude : null;
    const comparisons = [
      ["rms", entry.rms, analysis.rms, 1e-4],
      ["peak", entry.peak, analysis.peak, 1e-4],
      ["lowMagnitude", entry.lowMagnitude, lowMagnitude, 1e-4],
      ["highMagnitude", entry.highMagnitude, highMagnitude, 1e-4],
      ["highLowRatio", entry.highLowRatio, highLowRatio, 1e-2]
    ];
    for (const [field, expected, observed, tolerance] of comparisons) {
      checkCount += 1;
      if (!analysis.valid || !Number.isFinite(expected) || !Number.isFinite(observed) || Math.abs(expected - observed) > tolerance) {
        problems.push({
          id: "demo-filter-wav-content-mismatch",
          evidenceId: entry.id,
          path: wavPath,
          field,
          expected,
          observed: analysis.valid ? observed : null
        });
      }
    }
  }
  return checkCount;
}

function expectedConsumedContentWavCoverage(runtimeLogs) {
  return new Map([
    ...((runtimeLogs.delayAudio.classifications || []).map((entry) => [
      `artifacts/generated-patch-audio/captures/${entry.id}.wav`,
      "audioClassificationWavContentCheckCount"
    ])),
    ...((runtimeLogs.lfoSemantics.classifications || [])
      .filter((entry) => entry.status === "pass" && entry.mode === "positive-lfo-time-route")
      .map((entry) => [
        `artifacts/generated-patch-lfo-semantics/traces/${entry.id}.lfo.wav`,
        "lfoTraceWavContentCheckCount"
      ])),
    ...((runtimeLogs.filterRuntime.classifications || []).map((entry) => [
      `artifacts/generated-patch-filter-runtime/captures/${entry.id}.wav`,
      "filterWavContentCheckCount"
    ]))
  ]);
}

function checkAudioManifestContentCoverage(manifest, runtimeLogs, problems) {
  const expectedCoverage = expectedConsumedContentWavCoverage(runtimeLogs);
  const manifestWavPaths = new Set((manifest.artifacts || [])
    .map((artifact) => artifact.path)
    .filter((path) => path.endsWith(".wav")));
  let checkCount = 0;
  for (const [path, verifierField] of expectedCoverage) {
    checkCount += 1;
    if (!manifestWavPaths.has(path)) {
      problems.push({ id: "demo-audio-manifest-wav-content-covered-path-missing", path, verifierField });
    }
  }
  for (const path of manifestWavPaths) {
    checkCount += 1;
    if (!expectedCoverage.has(path)) {
      problems.push({ id: "demo-audio-manifest-wav-content-uncovered", path });
    }
  }
  return checkCount;
}

function checkAudioClassificationAgreement(runtimeLogs, problems) {
  const resultById = new Map((runtimeLogs.delayAudioResult.results || []).map((entry) => [entry.id, entry]));
  const classificationById = new Map((runtimeLogs.delayAudio.classifications || []).map((entry) => [entry.id, entry]));
  const seenClassificationIds = new Set();
  let checkCount = 0;
  for (const result of runtimeLogs.delayAudioResult.results || []) {
    checkCount += 1;
    if (!classificationById.has(result.id)) {
      problems.push({ id: "demo-audio-classification-log-entry-missing", evidenceId: result.id });
    }
  }
  for (const [index, classification] of (runtimeLogs.delayAudio.classifications || []).entries()) {
    const expectedResult = runtimeLogs.delayAudioResult.results?.[index] || null;
    checkCount += 1;
    if (!expectedResult || expectedResult.id !== classification.id) {
      problems.push({
        id: "demo-audio-classification-log-order-mismatch",
        index,
        expected: expectedResult?.id || null,
        observed: classification.id
      });
    }
    checkCount += 1;
    if (seenClassificationIds.has(classification.id)) {
      problems.push({ id: "demo-audio-classification-log-entry-duplicate", evidenceId: classification.id });
    }
    seenClassificationIds.add(classification.id);
    const result = resultById.get(classification.id);
    checkCount += 1;
    if (!result) {
      problems.push({ id: "demo-audio-classification-result-missing", evidenceId: classification.id });
      continue;
    }
    for (const field of ["status", "classification", "expectedSignal"]) {
      checkCount += 1;
      if (classification[field] !== result[field]) {
        problems.push({
          id: "demo-audio-classification-result-mismatch",
          evidenceId: classification.id,
          field,
          expected: result[field],
          observed: classification[field]
        });
      }
    }
    const features = result.audioEvidence?.features || {};
    for (const field of ["rms", "peak", "postInputTailPeak"]) {
      checkCount += 1;
      if (!Number.isFinite(classification[field]) || !Number.isFinite(features[field]) || Math.abs(classification[field] - features[field]) > 1e-12) {
        problems.push({
          id: "demo-audio-classification-metric-mismatch",
          evidenceId: classification.id,
          field,
          expected: features[field],
          observed: classification[field]
        });
      }
    }
  }
  return checkCount;
}

function validateManifest(manifest, problems) {
  const artifactPaths = new Set((manifest.artifacts || []).map((artifact) => artifact.path));
  const requiredPathSet = new Set(requiredFiles);
  const seenArtifactPaths = new Set();
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    problems.push({
      id: "demo-manifest-schema-version-mismatch",
      expected: MANIFEST_SCHEMA_VERSION,
      observed: manifest.schemaVersion
    });
  }
  if (manifest.artifactCount !== requiredFiles.length) {
    problems.push({
      id: "demo-manifest-artifact-count-mismatch",
      expected: requiredFiles.length,
      observed: manifest.artifactCount
    });
  }
  for (const path of requiredFiles) {
    if (!artifactPaths.has(path)) {
      problems.push({ id: "demo-manifest-required-path-missing", path });
    }
  }
  for (const artifact of manifest.artifacts || []) {
    if (seenArtifactPaths.has(artifact.path)) {
      problems.push({ id: "demo-manifest-artifact-path-duplicate", path: artifact.path });
    }
    seenArtifactPaths.add(artifact.path);
    if (!requiredPathSet.has(artifact.path)) {
      problems.push({ id: "demo-manifest-artifact-path-unexpected", path: artifact.path });
    }
    if (!/^[a-f0-9]{64}$/u.test(artifact.sha256 || "")) {
      problems.push({ id: "demo-manifest-sha256-invalid", path: artifact.path, observed: artifact.sha256 || null });
    }
    if (!Number.isInteger(artifact.byteLength) || artifact.byteLength <= 0) {
      problems.push({ id: "demo-manifest-byte-length-invalid", path: artifact.path, observed: artifact.byteLength });
    }
  }
}

async function checkManifestArtifactHashes(manifest, problems) {
  let checkCount = 0;
  for (const artifact of manifest.artifacts || []) {
    checkCount += 1;
    const absolutePath = resolve(DEMO_ROOT, artifact.path);
    if (!existsSync(absolutePath)) {
      problems.push({ id: "demo-manifest-artifact-file-missing", path: artifact.path });
      continue;
    }
    const buffer = await readFile(absolutePath);
    const expectedSha256 = createHash("sha256").update(buffer).digest("hex");
    if (artifact.sha256 !== expectedSha256) {
      problems.push({
        id: "demo-manifest-artifact-sha256-mismatch",
        path: artifact.path,
        expected: expectedSha256,
        observed: artifact.sha256 || null
      });
    }
    if (artifact.byteLength !== buffer.length) {
      problems.push({
        id: "demo-manifest-artifact-byte-length-mismatch",
        path: artifact.path,
        expected: buffer.length,
        observed: artifact.byteLength
      });
    }
  }
  return checkCount;
}

const seededControlInventory = [
  {
    id: "tampered-copied-json-evidence",
    expectedFailureSurface: "demo-evidence-copy-value-mismatch",
    riskCategory: "copied evidence value integrity"
  },
  {
    id: "copied-json-evidence-hash-drift",
    expectedFailureSurface: "demo-source-copy-sha256-mismatch",
    riskCategory: "single source/copy drift"
  },
  {
    id: "all-source-copy-sha256-drift-boundary",
    expectedFailureSurface: "demo-source-copy-sha256-mismatch",
    riskCategory: "all source/copy drift"
  },
  {
    id: "readme-release-standalone-overclaim",
    expectedFailureSurface: "demo-human-facing-overclaim",
    riskCategory: "overclaiming"
  },
  {
    id: "capability-chain-missing-runtime-artifact",
    expectedFailureSurface: "demo-capability-chain-artifact-missing",
    riskCategory: "capability chain completeness"
  },
  {
    id: "stale-source-evidence",
    expectedFailureSurface: "demo-source-evidence-stale",
    riskCategory: "single source freshness"
  },
  {
    id: "invalid-timestamp-source-evidence",
    expectedFailureSurface: "demo-source-evidence-invalid-timestamp",
    riskCategory: "source timestamp validity"
  },
  {
    id: "all-source-evidence-stale-boundary",
    expectedFailureSurface: "demo-source-evidence-stale",
    riskCategory: "all source freshness"
  },
  {
    id: "manifest-required-path-omission",
    expectedFailureSurface: "demo-manifest-required-path-missing",
    riskCategory: "manifest required path coverage"
  },
  {
    id: "manifest-copied-artifact-path-drift",
    expectedFailureSurface: "demo-manifest-required-path-missing",
    riskCategory: "manifest copied artifact path equality"
  },
  {
    id: "manifest-copied-artifact-duplicate-path",
    expectedFailureSurface: "demo-manifest-artifact-path-duplicate",
    riskCategory: "manifest copied artifact path uniqueness"
  },
  {
    id: "manifest-copied-artifact-unexpected-path",
    expectedFailureSurface: "demo-manifest-artifact-path-unexpected",
    riskCategory: "manifest copied artifact path allowlist"
  },
  {
    id: "manifest-copied-artifact-sha256-drift",
    expectedFailureSurface: "demo-manifest-artifact-sha256-mismatch",
    riskCategory: "manifest copied artifact hash equality"
  },
  {
    id: "readme-artifact-table-count-drift",
    expectedFailureSurface: "demo-readme-artifact-table-count-mismatch",
    riskCategory: "documentation artifact counts"
  },
  {
    id: "readme-source-dependency-list-omission",
    expectedFailureSurface: "demo-source-dependency-doc-missing",
    riskCategory: "documentation source dependency list"
  },
  {
    id: "status-stale-filter-evidence-path",
    expectedFailureSurface: "demo-status-stale-filter-evidence-present",
    riskCategory: "status evidence path freshness"
  },
  {
    id: "status-extra-accepted-evidence-path",
    expectedFailureSurface: "demo-status-accepted-evidence-extra",
    riskCategory: "status accepted-evidence allowlist"
  },
  {
    id: "readme-full-evidence-command-extra",
    expectedFailureSurface: "demo-readme-full-evidence-command-extra",
    riskCategory: "README full-evidence command allowlist"
  },
  {
    id: "readme-full-evidence-command-missing",
    expectedFailureSurface: "demo-readme-full-evidence-command-missing",
    riskCategory: "README full-evidence command required coverage"
  },
  {
    id: "package-full-evidence-script-missing",
    expectedFailureSurface: "demo-package-script-missing",
    riskCategory: "package full-evidence script availability"
  },
  {
    id: "wrapper-full-evidence-command-missing",
    expectedFailureSurface: "demo-wrapper-full-evidence-command-missing",
    riskCategory: "wrapper full-evidence command coverage"
  },
  {
    id: "wrapper-full-evidence-command-extra",
    expectedFailureSurface: "demo-wrapper-full-evidence-command-extra",
    riskCategory: "wrapper full-evidence command allowlist"
  },
  {
    id: "wrapper-full-evidence-verification-order",
    expectedFailureSurface: "demo-wrapper-full-evidence-order-invalid",
    riskCategory: "wrapper full-evidence verification order"
  },
  {
    id: "wrapper-full-evidence-copy-sync-omission",
    expectedFailureSurface: "demo-wrapper-full-evidence-copy-sync-missing",
    riskCategory: "wrapper full-evidence copy sync"
  },
  {
    id: "wrapper-full-evidence-copied-artifact-stale",
    expectedFailureSurface: "demo-wrapper-full-evidence-copied-artifact-stale",
    riskCategory: "wrapper full-evidence copied artifact freshness"
  },
  {
    id: "wrapper-full-evidence-smoke-marker-omission",
    expectedFailureSurface: "demo-wrapper-full-evidence-smoke-marker-missing",
    riskCategory: "wrapper full-evidence smoke marker"
  },
  {
    id: "wrapper-json-output-host-text",
    expectedFailureSurface: "demo-wrapper-output-non-json-host-text",
    riskCategory: "wrapper JSON output boundary"
  },
  {
    id: "wrapper-result-discovery-doc-omission",
    expectedFailureSurface: "demo-wrapper-result-discovery-doc-missing",
    riskCategory: "wrapper result discovery documentation"
  },
  {
    id: "readme-wrapper-json-output-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "README wrapper JSON output documentation"
  },
  {
    id: "readme-source-freshness-horizon-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "README source freshness horizon documentation"
  },
  {
    id: "readme-source-freshness-warning-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "README source freshness warning documentation"
  },
  {
    id: "status-source-freshness-warning-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "status source freshness warning documentation"
  },
  {
    id: "status-wrapper-copy-sync-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "status wrapper copy-sync documentation"
  },
  {
    id: "status-wrapper-command-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "status wrapper command documentation"
  },
  {
    id: "source-freshness-warning-recommendation-missing",
    expectedFailureSurface: "demo-source-evidence-refresh-recommendation-missing",
    riskCategory: "source freshness warning computation"
  },
  {
    id: "source-freshness-warning-threshold-boundary",
    expectedFailureSurface: "sourceEvidenceRefreshRecommended:true",
    riskCategory: "source freshness warning threshold boundary"
  },
  {
    id: "source-freshness-warning-doc-value-drift",
    expectedFailureSurface: "demo-source-evidence-warning-doc-value-mismatch",
    riskCategory: "source freshness warning document agreement"
  },
  {
    id: "source-freshness-summary-next-stale-mismatch",
    expectedFailureSurface: "demo-source-evidence-freshness-summary-mismatch",
    riskCategory: "source freshness summary consistency"
  },
  {
    id: "source-evidence-surface-manifest-count-drift",
    expectedFailureSurface: "demo-source-evidence-surface-count-mismatch",
    riskCategory: "source evidence surface count agreement"
  },
  {
    id: "source-evidence-surface-freshness-field-drift",
    expectedFailureSurface: "demo-source-evidence-surface-freshness-mismatch",
    riskCategory: "source evidence surface freshness agreement"
  },
  {
    id: "readme-relocated-source-evidence-instruction-omission",
    expectedFailureSurface: "demo-relocated-source-evidence-instruction-missing",
    riskCategory: "relocated source evidence instructions"
  },
  {
    id: "wrapper-relocated-source-evidence-override-omission",
    expectedFailureSurface: "demo-relocated-source-evidence-wrapper-missing",
    riskCategory: "relocated wrapper source evidence override"
  },
  {
    id: "demo-handoff-manifest-verifier-count-mismatch",
    expectedFailureSurface: "demo-handoff-count-mismatch",
    riskCategory: "handoff manifest/verifier count agreement"
  },
  {
    id: "runtime-audio-classification-degraded",
    expectedFailureSurface: "demo-runtime-audio-classification-degraded",
    riskCategory: "runtime/audio evidence"
  },
  {
    id: "runtime-audio-consumed-wav-invalid",
    expectedFailureSurface: "demo-runtime-wav-invalid",
    riskCategory: "consumed audio artifact bytes"
  },
  {
    id: "runtime-audio-consumed-wav-signal-too-low",
    expectedFailureSurface: "demo-runtime-wav-rms-too-low",
    riskCategory: "consumed audio artifact signal level"
  },
  {
    id: "runtime-audio-stimulus-manifest-amplitude-mismatch",
    expectedFailureSurface: "demo-audio-stimulus-amplitude-mismatch",
    riskCategory: "audio stimulus manifest agreement"
  },
  {
    id: "runtime-audio-capture-wav-path-mismatch",
    expectedFailureSurface: "demo-audio-capture-wav-path-missing",
    riskCategory: "audio capture artifact mapping"
  },
  {
    id: "runtime-audio-classification-log-label-drift",
    expectedFailureSurface: "demo-audio-classification-result-mismatch",
    riskCategory: "audio classification log agreement"
  },
  {
    id: "runtime-audio-classification-log-entry-omission",
    expectedFailureSurface: "demo-audio-classification-log-entry-missing",
    riskCategory: "audio classification log completeness"
  },
  {
    id: "runtime-audio-classification-log-duplicate-entry",
    expectedFailureSurface: "demo-audio-classification-log-entry-duplicate",
    riskCategory: "audio classification log uniqueness"
  },
  {
    id: "runtime-audio-classification-log-order-drift",
    expectedFailureSurface: "demo-audio-classification-log-order-mismatch",
    riskCategory: "audio classification log ordering"
  },
  {
    id: "runtime-audio-classification-wav-content-drift",
    expectedFailureSurface: "demo-audio-classification-wav-content-mismatch",
    riskCategory: "audio classification consumed WAV content"
  },
  {
    id: "runtime-lfo-trace-wav-content-drift",
    expectedFailureSurface: "demo-lfo-trace-wav-content-mismatch",
    riskCategory: "LFO trace consumed WAV content"
  },
  {
    id: "runtime-filter-wav-content-drift",
    expectedFailureSurface: "demo-filter-wav-content-mismatch",
    riskCategory: "filter consumed WAV content"
  },
  {
    id: "audio-manifest-uncovered-wav-artifact",
    expectedFailureSurface: "demo-audio-manifest-wav-content-uncovered",
    riskCategory: "audio manifest consumed-content coverage"
  },
  {
    id: "audio-manifest-covered-wav-artifact-missing",
    expectedFailureSurface: "demo-audio-manifest-wav-content-covered-path-missing",
    riskCategory: "audio manifest consumed-content coverage"
  },
  {
    id: "audio-capability-claim-verifier-field-missing",
    expectedFailureSurface: "demo-audio-capability-chain-verifier-field-missing",
    riskCategory: "audio capability claim chain"
  },
  {
    id: "audio-capability-claim-verifier-field-stale",
    expectedFailureSurface: "demo-audio-capability-chain-verifier-field-stale",
    riskCategory: "audio capability claim chain"
  },
  {
    id: "audio-consumed-field-artifact-count-mismatch",
    expectedFailureSurface: "demo-audio-consumed-field-artifact-count-mismatch",
    riskCategory: "audio consumed-content field count"
  },
  {
    id: "audio-artifact-generation-window-exceeded",
    expectedFailureSurface: "demo-audio-artifact-generation-window-exceeded",
    riskCategory: "audio artifact generation freshness"
  },
  {
    id: "readme-audio-generation-window-doc-omission",
    expectedFailureSurface: "demo-doc-surface-phrase-missing",
    riskCategory: "audio artifact generation freshness documentation"
  },
  {
    id: "audio-generation-window-manifest-threshold-drift",
    expectedFailureSurface: "demo-audio-generation-window-threshold-mismatch",
    riskCategory: "audio artifact generation freshness documentation"
  },
  {
    id: "generated-patch-required-routing-missing",
    expectedFailureSurface: "demo-patch-required-routing-missing",
    riskCategory: "patch routing semantics"
  },
  {
    id: "generated-patch-runtime-semantic-mismatch",
    expectedFailureSurface: "demo-patch-runtime-source-id-mismatch",
    riskCategory: "patch/runtime semantic linkage"
  },
  {
    id: "copied-generated-patch-artifact-missing",
    expectedFailureSurface: "demo-file-missing",
    riskCategory: "copied patch artifact presence"
  },
  {
    id: "claimed-artifact-resolves-outside-demo-root",
    expectedFailureSurface: "demo-artifact-resolves-outside-demo-root",
    riskCategory: "relocated bundle boundary"
  },
  {
    id: "copied-json-evidence-artifact-missing",
    expectedFailureSurface: "demo-file-missing",
    riskCategory: "copied JSON evidence presence"
  },
  {
    id: "relocated-copied-json-artifact-omission",
    expectedFailureSurface: "demo-file-missing",
    riskCategory: "relocated copied artifact omission"
  },
  {
    id: "seeded-control-inventory-control-omission",
    expectedFailureSurface: "demo-seeded-control-inventory-missing-control",
    riskCategory: "seeded control regression inventory"
  },
  {
    id: "seeded-control-inventory-duplicate-risk",
    expectedFailureSurface: "demo-seeded-control-inventory-duplicate-risk",
    riskCategory: "seeded control inventory duplicate-risk guard"
  }
];

function checkSeededControlInventory(controls, problems, inventoryItems = seededControlInventory) {
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const controlsById = new Map(controls.map((control) => [control.id, control]));
  const seenRiskKeys = new Set();
  for (const item of inventoryItems) {
    const control = controlsById.get(item.id);
    if (!control) {
      problems.push({ id: "demo-seeded-control-inventory-missing-control", controlId: item.id });
      continue;
    }
    if (control.expectedFailureSurface !== item.expectedFailureSurface) {
      problems.push({
        id: "demo-seeded-control-inventory-surface-mismatch",
        controlId: item.id,
        expected: item.expectedFailureSurface,
        observed: control.expectedFailureSurface
      });
    }
    const riskKey = `${item.riskCategory}|${item.expectedFailureSurface}`;
    if (seenRiskKeys.has(riskKey)) {
      problems.push({
        id: "demo-seeded-control-inventory-duplicate-risk",
        controlId: item.id,
        riskCategory: item.riskCategory,
        expectedFailureSurface: item.expectedFailureSurface
      });
    }
    seenRiskKeys.add(riskKey);
  }
  for (const control of controls) {
    if (!inventoryById.has(control.id)) {
      problems.push({ id: "demo-seeded-control-inventory-extra-control", controlId: control.id });
    }
  }
  return inventoryItems.length;
}

function seededControlRiskCategoryCounts() {
  const counts = new Map();
  for (const item of seededControlInventory) {
    counts.set(item.riskCategory, (counts.get(item.riskCategory) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

async function runSeededNegativeControls(readmeText, statusText, manifest, runtimeLogs, verifierFieldNames, verifierFieldValues) {
  const controls = [];
  const finalInventoryCheck = jsonChecks[0];
  const finalInventorySource = await readJson(resolve(PROJECT_ROOT, finalInventoryCheck.source));
  const finalInventoryCopy = await readJson(resolve(DEMO_ROOT, finalInventoryCheck.copy));
  const baselineArtifacts = [];
  for (const path of requiredFiles) {
    baselineArtifacts.push(await fileManifestEntry(path));
  }

  {
    const problems = [];
    const tamperedCopy = cloneJson(finalInventoryCopy);
    tamperedCopy.status = "tampered-demo-control";
    checkExpectedValues(finalInventoryCheck, finalInventorySource, tamperedCopy, problems);
    controls.push({
      id: "tampered-copied-json-evidence",
      expectedFailureSurface: "demo-evidence-copy-value-mismatch",
      status: problems.some((problem) => problem.id === "demo-evidence-copy-value-mismatch") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const dependency = await sourceEvidenceDependency(
      finalInventoryCheck,
      finalInventorySource,
      resolve(PROJECT_ROOT, finalInventoryCheck.source),
      resolve(DEMO_ROOT, finalInventoryCheck.copy)
    );
    const driftedDependency = { ...dependency, copySha256: "0".repeat(64) };
    checkSourceCopyHashBoundary(driftedDependency, problems);
    controls.push({
      id: "copied-json-evidence-hash-drift",
      expectedFailureSurface: "demo-source-copy-sha256-mismatch",
      status: problems.some((problem) => problem.id === "demo-source-copy-sha256-mismatch") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    for (const check of jsonChecks) {
      const source = await readJson(resolve(PROJECT_ROOT, check.source));
      const dependency = await sourceEvidenceDependency(
        check,
        source,
        resolve(PROJECT_ROOT, check.source),
        resolve(DEMO_ROOT, check.copy)
      );
      checkSourceCopyHashBoundary({ ...dependency, copySha256: "f".repeat(64) }, problems);
    }
    const driftedEvidenceIds = new Set(
      problems.filter((problem) => problem.id === "demo-source-copy-sha256-mismatch").map((problem) => problem.evidenceId)
    );
    controls.push({
      id: "all-source-copy-sha256-drift-boundary",
      expectedFailureSurface: "demo-source-copy-sha256-mismatch",
      status: driftedEvidenceIds.size === jsonChecks.length ? "pass" : "fail",
      expectedDriftedDependencyCount: jsonChecks.length,
      observedDriftedDependencyCount: driftedEvidenceIds.size,
      problems
    });
  }

  {
    const problems = [];
    const overclaimedReadme = `${readmeText}\nThis demo is a standalone-bundle and production-ready release.\n`;
    checkHumanFacingOverclaims("README_DEMO.md", overclaimedReadme, problems);
    controls.push({
      id: "readme-release-standalone-overclaim",
      expectedFailureSurface: "demo-human-facing-overclaim",
      status: problems.some((problem) => problem.id === "demo-human-facing-overclaim") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const manifest = {
      artifacts: requiredFiles.map((path) => ({ path })).filter((artifact) =>
        artifact.path !== "artifacts/generated-patch-audio/classification-log.json"
      )
    };
    const sourceEvidenceDependencies = jsonChecks.map((check) => ({ id: check.id }));
    const verifierFieldNames = new Set([
      "copiedPatchCheckCount",
      "runtimeConsumedArtifactCheckCount",
      "seededNegativeControlPassingCount",
      "explicitSourceEvidenceCount",
      "copiedClaimedArtifactCount"
    ]);
    checkCapabilityChains(readmeText, "", manifest, runtimeLogs, sourceEvidenceDependencies, verifierFieldNames, problems);
    controls.push({
      id: "capability-chain-missing-runtime-artifact",
      expectedFailureSurface: "demo-capability-chain-artifact-missing",
      status: problems.some((problem) =>
        problem.id === "demo-capability-chain-artifact-missing" &&
        problem.path === "artifacts/generated-patch-audio/classification-log.json"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const staleSource = cloneJson(finalInventorySource);
    staleSource.completedAt = "2000-01-01T00:00:00.000Z";
    checkSourceEvidenceFreshnessBoundary(finalInventoryCheck.id, staleSource, finalInventoryCheck.source, problems);
    controls.push({
      id: "stale-source-evidence",
      expectedFailureSurface: "demo-source-evidence-stale",
      status: problems.some((problem) => problem.id === "demo-source-evidence-stale") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const invalidTimestampSource = cloneJson(finalInventorySource);
    invalidTimestampSource.completedAt = "not-a-valid-timestamp";
    checkSourceEvidenceFreshnessBoundary(finalInventoryCheck.id, invalidTimestampSource, finalInventoryCheck.source, problems);
    controls.push({
      id: "invalid-timestamp-source-evidence",
      expectedFailureSurface: "demo-source-evidence-invalid-timestamp",
      status: problems.some((problem) => problem.id === "demo-source-evidence-invalid-timestamp") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    for (const check of jsonChecks) {
      const source = await readJson(resolve(PROJECT_ROOT, check.source));
      const staleSource = cloneJson(source);
      staleSource.completedAt = "2000-01-01T00:00:00.000Z";
      checkSourceEvidenceFreshnessBoundary(check.id, staleSource, check.source, problems);
    }
    const staleEvidenceIds = new Set(
      problems.filter((problem) => problem.id === "demo-source-evidence-stale").map((problem) => problem.evidenceId)
    );
    controls.push({
      id: "all-source-evidence-stale-boundary",
      expectedFailureSurface: "demo-source-evidence-stale",
      status: staleEvidenceIds.size === jsonChecks.length ? "pass" : "fail",
      expectedStaleDependencyCount: jsonChecks.length,
      observedStaleDependencyCount: staleEvidenceIds.size,
      problems
    });
  }

  {
    const problems = [];
    const omittedPath = requiredFiles[0];
    const manifestWithOmission = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      artifactCount: requiredFiles.length,
      artifacts: baselineArtifacts.filter((artifact) => artifact.path !== omittedPath),
      checkedEvidence: [],
      claimBoundary: "Seeded manifest omission control."
    };
    validateManifest(manifestWithOmission, problems);
    controls.push({
      id: "manifest-required-path-omission",
      expectedFailureSurface: "demo-manifest-required-path-missing",
      status: problems.some((problem) => problem.id === "demo-manifest-required-path-missing") ? "pass" : "fail",
      omittedPath,
      problems
    });
  }

  {
    const problems = [];
    const originalPath = requiredFiles[0];
    const driftedPath = `${originalPath}.stale`;
    const manifestWithDriftedPath = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      artifactCount: requiredFiles.length,
      artifacts: baselineArtifacts.map((artifact) =>
        artifact.path === originalPath ? { ...artifact, path: driftedPath } : artifact
      ),
      checkedEvidence: [],
      claimBoundary: "Seeded manifest path drift control."
    };
    validateManifest(manifestWithDriftedPath, problems);
    controls.push({
      id: "manifest-copied-artifact-path-drift",
      expectedFailureSurface: "demo-manifest-required-path-missing",
      status: problems.some((problem) =>
        problem.id === "demo-manifest-required-path-missing" &&
        problem.path === originalPath
      ) ? "pass" : "fail",
      originalPath,
      driftedPath,
      problems
    });
  }

  {
    const problems = [];
    const duplicatedPath = baselineArtifacts[0].path;
    const manifestWithDuplicatePath = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      artifactCount: requiredFiles.length,
      artifacts: baselineArtifacts.map((artifact, index) =>
        index === 1 ? { ...artifact, path: duplicatedPath } : artifact
      ),
      checkedEvidence: [],
      claimBoundary: "Seeded manifest duplicate path control."
    };
    validateManifest(manifestWithDuplicatePath, problems);
    controls.push({
      id: "manifest-copied-artifact-duplicate-path",
      expectedFailureSurface: "demo-manifest-artifact-path-duplicate",
      status: problems.some((problem) =>
        problem.id === "demo-manifest-artifact-path-duplicate" &&
        problem.path === duplicatedPath
      ) ? "pass" : "fail",
      duplicatedPath,
      problems
    });
  }

  {
    const problems = [];
    const unexpectedPath = "artifacts/unexpected-demo-artifact.json";
    const manifestWithUnexpectedPath = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      artifactCount: requiredFiles.length + 1,
      artifacts: [...baselineArtifacts, { ...baselineArtifacts[0], path: unexpectedPath }],
      checkedEvidence: [],
      claimBoundary: "Seeded manifest unexpected path control."
    };
    validateManifest(manifestWithUnexpectedPath, problems);
    controls.push({
      id: "manifest-copied-artifact-unexpected-path",
      expectedFailureSurface: "demo-manifest-artifact-path-unexpected",
      status: problems.some((problem) =>
        problem.id === "demo-manifest-artifact-path-unexpected" &&
        problem.path === unexpectedPath
      ) ? "pass" : "fail",
      unexpectedPath,
      problems
    });
  }

  {
    const problems = [];
    const driftedArtifact = {
      ...baselineArtifacts[0],
      sha256: baselineArtifacts[0].sha256.replace(/^./u, baselineArtifacts[0].sha256[0] === "0" ? "1" : "0")
    };
    const manifestWithDriftedHash = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      artifactCount: requiredFiles.length,
      artifacts: [driftedArtifact, ...baselineArtifacts.slice(1)],
      checkedEvidence: [],
      claimBoundary: "Seeded manifest hash drift control."
    };
    await checkManifestArtifactHashes(manifestWithDriftedHash, problems);
    controls.push({
      id: "manifest-copied-artifact-sha256-drift",
      expectedFailureSurface: "demo-manifest-artifact-sha256-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-manifest-artifact-sha256-mismatch" &&
        problem.path === driftedArtifact.path
      ) ? "pass" : "fail",
      driftedPath: driftedArtifact.path,
      problems
    });
  }

  {
    const problems = [];
    const driftedReadme = readmeText.replace(/\| Delay audio evidence \| \d+ \|/u, "| Delay audio evidence | 999 |");
    checkReadmeArtifactTable(driftedReadme, baselineArtifacts, problems);
    controls.push({
      id: "readme-artifact-table-count-drift",
      expectedFailureSurface: "demo-readme-artifact-table-count-mismatch",
      status: problems.some((problem) => problem.id === "demo-readme-artifact-table-count-mismatch") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedSource = jsonChecks[0].source;
    const driftedReadme = readmeText.replace(`- \`${omittedSource}\`\n`, "");
    checkSourceDependencyDocumentation(driftedReadme, problems);
    controls.push({
      id: "readme-source-dependency-list-omission",
      expectedFailureSurface: "demo-source-dependency-doc-missing",
      status: problems.some((problem) => problem.id === "demo-source-dependency-doc-missing" && problem.source === omittedSource)
        ? "pass"
        : "fail",
      omittedSource,
      problems
    });
  }

  {
    const problems = [];
    const staleStatusText = `${statusText}\n- \`tests/workflow/evidence/generated-patch-filter-runtime/filter-semantics/run-result.json\`\n`;
    checkStatusEvidenceDocumentation(staleStatusText, problems);
    controls.push({
      id: "status-stale-filter-evidence-path",
      expectedFailureSurface: "demo-status-stale-filter-evidence-present",
      status: problems.some((problem) => problem.id === "demo-status-stale-filter-evidence-present") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const extraSource = "tests/workflow/evidence/generated-patch-unsupported-extra/run-result.json";
    const extraStatusText = `${statusText}\n- \`${extraSource}\`\n`;
    checkStatusEvidenceDocumentation(extraStatusText, problems);
    controls.push({
      id: "status-extra-accepted-evidence-path",
      expectedFailureSurface: "demo-status-accepted-evidence-extra",
      status: problems.some((problem) =>
        problem.id === "demo-status-accepted-evidence-extra" &&
        problem.source === extraSource
      ) ? "pass" : "fail",
      extraSource,
      problems
    });
  }

  {
    const problems = [];
    const packageJson = await readJson(resolve(PROJECT_ROOT, "package.json"));
    const staleCommandReadme = `${readmeText}\n\`\`\`powershell\nnpm run zoia:generate:patch:unsupported-demo-command\n\`\`\`\n`;
    checkDocumentedFullEvidenceCommands(staleCommandReadme, packageJson, problems);
    controls.push({
      id: "readme-full-evidence-command-extra",
      expectedFailureSurface: "demo-readme-full-evidence-command-extra",
      status: problems.some((problem) =>
        problem.id === "demo-readme-full-evidence-command-extra" &&
        problem.scriptName === "zoia:generate:patch:unsupported-demo-command"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const packageJson = await readJson(resolve(PROJECT_ROOT, "package.json"));
    const omittedScript = documentedFullEvidenceScripts[0];
    const commandPattern = new RegExp(`\\n?npm\\s+run\\s+${omittedScript.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\n?`, "gu");
    const commandOmittedReadme = readmeText.replace(commandPattern, "\n");
    checkDocumentedFullEvidenceCommands(commandOmittedReadme, packageJson, problems);
    controls.push({
      id: "readme-full-evidence-command-missing",
      expectedFailureSurface: "demo-readme-full-evidence-command-missing",
      status: problems.some((problem) =>
        problem.id === "demo-readme-full-evidence-command-missing" &&
        problem.scriptName === omittedScript
      ) ? "pass" : "fail",
      omittedScript,
      problems
    });
  }

  {
    const problems = [];
    const packageJson = await readJson(resolve(PROJECT_ROOT, "package.json"));
    const omittedScript = documentedFullEvidenceScripts[0];
    const scriptOmittedPackageJson = cloneJson(packageJson);
    delete scriptOmittedPackageJson.scripts[omittedScript];
    checkDocumentedFullEvidenceCommands(readmeText, scriptOmittedPackageJson, problems);
    controls.push({
      id: "package-full-evidence-script-missing",
      expectedFailureSurface: "demo-package-script-missing",
      status: problems.some((problem) =>
        problem.id === "demo-package-script-missing" &&
        problem.scriptName === omittedScript
      ) ? "pass" : "fail",
      omittedScript,
      problems
    });
  }

  {
    const problems = [];
    const packageJson = await readJson(resolve(PROJECT_ROOT, "package.json"));
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const omittedScript = documentedFullEvidenceScripts[0];
    const commandPattern = new RegExp(`\\n?\\s*npm\\s+run\\s+${omittedScript.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\n?`, "gu");
    const wrapperCommandOmittedText = runDemoText.replace(commandPattern, "\n");
    checkDocumentedFullEvidenceCommands(readmeText, packageJson, problems, wrapperCommandOmittedText);
    controls.push({
      id: "wrapper-full-evidence-command-missing",
      expectedFailureSurface: "demo-wrapper-full-evidence-command-missing",
      status: problems.some((problem) =>
        problem.id === "demo-wrapper-full-evidence-command-missing" &&
        problem.scriptName === omittedScript
      ) ? "pass" : "fail",
      omittedScript,
      problems
    });
  }

  {
    const problems = [];
    const packageJson = await readJson(resolve(PROJECT_ROOT, "package.json"));
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const extraScript = "zoia:generate:patch:unsupported-wrapper-command";
    const extraCommandRunDemoText = runDemoText.replace(
      "npm run zoia:generate:patch:final-evidence-inventory:negative-controls",
      `npm run zoia:generate:patch:final-evidence-inventory:negative-controls\n    npm run ${extraScript}`
    );
    checkDocumentedFullEvidenceCommands(readmeText, packageJson, problems, extraCommandRunDemoText);
    controls.push({
      id: "wrapper-full-evidence-command-extra",
      expectedFailureSurface: "demo-wrapper-full-evidence-command-extra",
      status: problems.some((problem) =>
        problem.id === "demo-wrapper-full-evidence-command-extra" &&
        problem.scriptName === extraScript
      ) ? "pass" : "fail",
      extraScript,
      problems
    });
  }

  {
    const problems = [];
    const staleSync = {
      ...wrapperFullEvidenceActualCopySyncs()[0],
      sourceMtimeMs: Date.now(),
      copyMtimeMs: Date.now() - 60_000
    };
    checkWrapperFullEvidenceCopyFreshness(problems, [staleSync]);
    controls.push({
      id: "wrapper-full-evidence-copied-artifact-stale",
      expectedFailureSurface: "demo-wrapper-full-evidence-copied-artifact-stale",
      status: problems.some((problem) =>
        problem.id === "demo-wrapper-full-evidence-copied-artifact-stale" &&
        problem.source === staleSync.source &&
        problem.copy === staleSync.copy
      ) ? "pass" : "fail",
      staleSource: staleSync.source,
      staleCopy: staleSync.copy,
      problems
    });
  }

  {
    const problems = [];
    const driftedReadme = readmeText.replace("after the command exits, read `July24_2026_Demo/verification-result.json`", "parse the final stdout object");
    checkWrapperResultDiscovery(driftedReadme, statusText, problems);
    controls.push({
      id: "wrapper-result-discovery-doc-omission",
      expectedFailureSurface: "demo-wrapper-result-discovery-doc-missing",
      status: problems.some((problem) =>
        problem.id === "demo-wrapper-result-discovery-doc-missing" &&
        problem.file === "README_DEMO.md" &&
        problem.phrase === "after the command exits, read `July24_2026_Demo/verification-result.json`"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const markerOmittedRunDemoText = runDemoText.replace(/\n\s*\$env:ZOIA_DEMO_RUN_FULL_EVIDENCE = "1"\s*/u, "\n");
    checkWrapperFullEvidenceSmokeMarker(markerOmittedRunDemoText, problems);
    controls.push({
      id: "wrapper-full-evidence-smoke-marker-omission",
      expectedFailureSurface: "demo-wrapper-full-evidence-smoke-marker-missing",
      status: problems.some((problem) => problem.id === "demo-wrapper-full-evidence-smoke-marker-missing") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const verifierFirstRunDemoText = runDemoText
      .replace(/\s*node "\$DemoRoot\\verify-demo\.mjs"\s*/u, "\n")
      .replace(/\n\s*if \(\$RunFullEvidence\) \{/u, '\n  node "$DemoRoot\\verify-demo.mjs"\n\n  if ($RunFullEvidence) {');
    checkWrapperFullEvidenceVerificationOrder(verifierFirstRunDemoText, problems);
    controls.push({
      id: "wrapper-full-evidence-verification-order",
      expectedFailureSurface: "demo-wrapper-full-evidence-order-invalid",
      status: problems.some((problem) => problem.id === "demo-wrapper-full-evidence-order-invalid") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const omittedSync = wrapperFullEvidenceCopySyncs[0];
    const copyPattern = new RegExp(
      `\\n?\\s*Copy-Item\\s+-LiteralPath\\s+"${omittedSync.source.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"\\s+-Destination\\s+"${omittedSync.destination.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"\\s+-Force\\s*\\n?`,
      "u"
    );
    const copyOmittedRunDemoText = runDemoText.replace(copyPattern, "\n");
    checkWrapperFullEvidenceCopySync(copyOmittedRunDemoText, problems);
    controls.push({
      id: "wrapper-full-evidence-copy-sync-omission",
      expectedFailureSurface: "demo-wrapper-full-evidence-copy-sync-missing",
      status: problems.some((problem) =>
        problem.id === "demo-wrapper-full-evidence-copy-sync-missing" &&
        problem.source === omittedSync.source
      ) ? "pass" : "fail",
      omittedSource: omittedSync.source,
      omittedDestination: omittedSync.destination,
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseReadme = readmeText.replace("In default verification mode, the wrapper emits verifier JSON on stdout", "The wrapper prints the verification result");
    const surface = requiredDocSurfaces.find((item) => item.file === "README_DEMO.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseReadme.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "readme-wrapper-json-output-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "README_DEMO.md" &&
        problem.phrase === "In default verification mode, the wrapper emits verifier JSON on stdout"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseReadme = readmeText.replace("sourceEvidenceNextStaleAt", "sourceEvidenceStaleAt");
    const surface = requiredDocSurfaces.find((item) => item.file === "README_DEMO.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseReadme.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "readme-source-freshness-horizon-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "README_DEMO.md" &&
        problem.phrase === "sourceEvidenceNextStaleAt"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseReadme = readmeText.replace("sourceEvidenceRefreshRecommended", "sourceEvidenceRefreshStatus");
    const surface = requiredDocSurfaces.find((item) => item.file === "README_DEMO.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseReadme.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "readme-source-freshness-warning-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "README_DEMO.md" &&
        problem.phrase === "sourceEvidenceRefreshRecommended"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseReadme = readmeText.replace("10-minute audio generation window", "audio freshness check");
    const surface = requiredDocSurfaces.find((item) => item.file === "README_DEMO.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseReadme.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "readme-audio-generation-window-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "README_DEMO.md" &&
        problem.phrase === "10-minute audio generation window"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseStatus = statusText.replaceAll("sourceEvidenceRefreshRecommended", "sourceEvidenceRefreshStatus");
    const surface = requiredDocSurfaces.find((item) => item.file === "DEMO_STATUS.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseStatus.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "status-source-freshness-warning-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "DEMO_STATUS.md" &&
        problem.phrase === "sourceEvidenceRefreshRecommended"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseStatus = statusText.replaceAll("wrapperFullEvidenceCopySyncCheckCount", "wrapperFullEvidenceCopyStatus");
    const surface = requiredDocSurfaces.find((item) => item.file === "DEMO_STATUS.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseStatus.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "status-wrapper-copy-sync-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "DEMO_STATUS.md" &&
        problem.phrase === "wrapperFullEvidenceCopySyncCheckCount"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPhraseStatus = statusText.replaceAll(".\\July24_2026_Demo\\run-demo.ps1", ".\\July24_2026_Demo\\verify-demo.mjs");
    const surface = requiredDocSurfaces.find((item) => item.file === "DEMO_STATUS.md");
    for (const phrase of surface.phrases) {
      if (!omittedPhraseStatus.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
    controls.push({
      id: "status-wrapper-command-doc-omission",
      expectedFailureSurface: "demo-doc-surface-phrase-missing",
      status: problems.some((problem) =>
        problem.id === "demo-doc-surface-phrase-missing" &&
        problem.file === "DEMO_STATUS.md" &&
        problem.phrase === ".\\July24_2026_Demo\\run-demo.ps1"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const warningSummary = {
      sourceEvidenceMinimumRemainingMs: Math.max(0, SOURCE_EVIDENCE_WARNING_MS - 1000),
      sourceEvidenceRefreshRecommended: false
    };
    checkSourceEvidenceRefreshRecommendation(warningSummary, problems);
    controls.push({
      id: "source-freshness-warning-recommendation-missing",
      expectedFailureSurface: "demo-source-evidence-refresh-recommendation-missing",
      status: problems.some((problem) => problem.id === "demo-source-evidence-refresh-recommendation-missing") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const nearStaleTimestamp = new Date(Date.now() - (MAX_EVIDENCE_AGE_MS - SOURCE_EVIDENCE_WARNING_MS + 1000)).toISOString();
    const warningDependencies = [
      {
        id: "seeded-warning-window-source",
        timestamp: nearStaleTimestamp,
        ageMs: Date.now() - Date.parse(nearStaleTimestamp),
        maxAgeMs: MAX_EVIDENCE_AGE_MS
      }
    ];
    const warningSummary = sourceEvidenceFreshnessSummary(warningDependencies);
    checkSourceEvidenceRefreshRecommendation(warningSummary, problems);
    controls.push({
      id: "source-freshness-warning-threshold-boundary",
      expectedFailureSurface: "sourceEvidenceRefreshRecommended:true",
      status: problems.length === 0 &&
        warningSummary.sourceEvidenceRefreshRecommended === true &&
        warningSummary.sourceEvidenceMinimumRemainingMs > 0 &&
        warningSummary.sourceEvidenceMinimumRemainingMs <= SOURCE_EVIDENCE_WARNING_MS ? "pass" : "fail",
      observedSummary: warningSummary,
      problems
    });
  }

  {
    const problems = [];
    const driftedReadme = readmeText.replace("8-hour refresh-warning window", "6-hour refresh-warning window");
    const sourceDependencies = [];
    for (const check of jsonChecks) {
      const sourcePath = resolve(PROJECT_ROOT, check.source);
      const copyPath = resolve(DEMO_ROOT, check.copy);
      const source = await readJson(sourcePath);
      sourceDependencies.push(await sourceEvidenceDependency(check, source, sourcePath, copyPath));
    }
    const freshnessSummary = sourceEvidenceFreshnessSummary(sourceDependencies);
    checkSourceEvidenceWarningDocumentAgreement(driftedReadme, statusText, freshnessSummary, problems);
    controls.push({
      id: "source-freshness-warning-doc-value-drift",
      expectedFailureSurface: "demo-source-evidence-warning-doc-value-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-source-evidence-warning-doc-value-mismatch" &&
        problem.file === "README_DEMO.md" &&
        problem.expectedPhrase === "8-hour refresh-warning window"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const sourceDependencies = [];
    for (const check of jsonChecks) {
      const sourcePath = resolve(PROJECT_ROOT, check.source);
      const copyPath = resolve(DEMO_ROOT, check.copy);
      const source = await readJson(sourcePath);
      sourceDependencies.push(await sourceEvidenceDependency(check, source, sourcePath, copyPath));
    }
    const freshnessSummary = sourceEvidenceFreshnessSummary(sourceDependencies);
    const staleMismatchSummary = {
      ...freshnessSummary,
      sourceEvidenceNextStaleAt: "2099-01-01T00:00:00.000Z"
    };
    checkSourceEvidenceFreshnessSummaryConsistency(staleMismatchSummary, sourceDependencies, problems);
    controls.push({
      id: "source-freshness-summary-next-stale-mismatch",
      expectedFailureSurface: "demo-source-evidence-freshness-summary-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-source-evidence-freshness-summary-mismatch" &&
        problem.field === "sourceEvidenceNextStaleAt"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const sourceDependencies = [];
    for (const check of jsonChecks) {
      const sourcePath = resolve(PROJECT_ROOT, check.source);
      const copyPath = resolve(DEMO_ROOT, check.copy);
      const source = await readJson(sourcePath);
      sourceDependencies.push(await sourceEvidenceDependency(check, source, sourcePath, copyPath));
    }
    const sourceDocProblems = [];
    const sourceDependencyDocCount = checkSourceDependencyDocumentation(readmeText, sourceDocProblems);
    const manifest = {
      checkedEvidence: sourceDependencies.slice(1)
    };
    checkSourceEvidenceSurfaceAgreement(
      {
        readmeText,
        statusText,
        manifest,
        sourceDependencyDocCount,
        sourceEvidenceDependencies: sourceDependencies,
        sourceFreshnessSummary: sourceEvidenceFreshnessSummary(sourceDependencies)
      },
      problems
    );
    controls.push({
      id: "source-evidence-surface-manifest-count-drift",
      expectedFailureSurface: "demo-source-evidence-surface-count-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-source-evidence-surface-count-mismatch" &&
        problem.file === "DEMO_MANIFEST.json"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const sourceDependencies = [];
    for (const check of jsonChecks) {
      const sourcePath = resolve(PROJECT_ROOT, check.source);
      const copyPath = resolve(DEMO_ROOT, check.copy);
      const source = await readJson(sourcePath);
      sourceDependencies.push(await sourceEvidenceDependency(check, source, sourcePath, copyPath));
    }
    const sourceDocProblems = [];
    const sourceDependencyDocCount = checkSourceDependencyDocumentation(readmeText, sourceDocProblems);
    const freshnessSummary = sourceEvidenceFreshnessSummary(sourceDependencies);
    const manifest = {
      checkedEvidence: sourceDependencies
    };
    checkSourceEvidenceSurfaceAgreement(
      {
        readmeText,
        statusText,
        manifest,
        sourceDependencyDocCount,
        sourceEvidenceDependencies: sourceDependencies,
        sourceFreshnessSummary: {
          ...freshnessSummary,
          sourceEvidenceNextStaleAt: "2099-01-01T00:00:00.000Z"
        }
      },
      problems
    );
    controls.push({
      id: "source-evidence-surface-freshness-field-drift",
      expectedFailureSurface: "demo-source-evidence-surface-freshness-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-source-evidence-surface-freshness-mismatch" &&
        problem.field === "sourceEvidenceNextStaleAt"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const hostOutputRunDemoText = runDemoText.replace(
      'node "$DemoRoot\\verify-demo.mjs"',
      'Write-Host "Verification-only demo complete."\n  node "$DemoRoot\\verify-demo.mjs"'
    );
    checkWrapperJsonOutputBoundary(hostOutputRunDemoText, problems);
    controls.push({
      id: "wrapper-json-output-host-text",
      expectedFailureSurface: "demo-wrapper-output-non-json-host-text",
      status: problems.some((problem) => problem.id === "demo-wrapper-output-non-json-host-text") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const relocationInstructionOmittedReadme = readmeText.replace(/For a relocated demo copy,[\s\S]*?Intentional source evidence dependencies:/u, "Intentional source evidence dependencies:");
    checkRelocatedSourceEvidenceInstructions(relocationInstructionOmittedReadme, runDemoText, problems);
    controls.push({
      id: "readme-relocated-source-evidence-instruction-omission",
      expectedFailureSurface: "demo-relocated-source-evidence-instruction-missing",
      status: problems.some((problem) => problem.id === "demo-relocated-source-evidence-instruction-missing") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
    const wrapperOverrideOmittedText = runDemoText
      .replace(/\s*\[string\]\$SourceEvidenceRoot\s*/u, "\n")
      .replace(/\s*\$env:ZOIA_DEMO_SOURCE_ROOT = \$ProjectRoot\s*/u, "\n");
    checkRelocatedSourceEvidenceInstructions(readmeText, wrapperOverrideOmittedText, problems);
    controls.push({
      id: "wrapper-relocated-source-evidence-override-omission",
      expectedFailureSurface: "demo-relocated-source-evidence-wrapper-missing",
      status: problems.some((problem) => problem.id === "demo-relocated-source-evidence-wrapper-missing") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const manifest = {
      artifacts: baselineArtifacts,
      checkedEvidence: jsonChecks.map((check) => ({ id: check.id })),
      claimBoundary: "This demo verifies local copied/source evidence for bounded ZOIA 0.4.0 generated-patch behavior. It is not release readiness or publication evidence."
    };
    checkDemoHandoffCompleteness(
      {
        readmeText,
        statusText: "## Supported Claims\n## Deferred And Out Of Scope\n## Protected-Action Boundary\nNot release readiness.\nNo source-control side effects.\n",
        manifest,
        artifactManifestCount: baselineArtifacts.length - 1,
        manifestRequiredPathPresentCount: requiredFiles.length,
        manifestSha256RecordCount: requiredFiles.length,
        seededNegativeControls: [{ status: "pass" }],
        relocatedBundleCheck: { status: "pass", problemCount: 0 }
      },
      problems
    );
    controls.push({
      id: "demo-handoff-manifest-verifier-count-mismatch",
      expectedFailureSurface: "demo-handoff-count-mismatch",
      status: problems.some((problem) => problem.id === "demo-handoff-count-mismatch" && problem.field === "artifactManifestCount")
        ? "pass"
        : "fail",
      problems
    });
  }

  {
    const problems = [];
    const degradedRuntimeLogs = cloneJson(runtimeLogs);
    degradedRuntimeLogs.delayAudio.classifications[0].status = "classified";
    degradedRuntimeLogs.delayAudio.classifications[0].classification = "runtime-degraded-seed";
    degradedRuntimeLogs.delayAudio.classifications[0].rms = 0;
    degradedRuntimeLogs.delayAudio.classifications[0].peak = 0;
    degradedRuntimeLogs.delayAudio.classifications[0].postInputTailPeak = 0;
    await checkRuntimeConsumedArtifacts(degradedRuntimeLogs, problems);
    controls.push({
      id: "runtime-audio-classification-degraded",
      expectedFailureSurface: "demo-runtime-audio-classification-degraded",
      status: problems.some((problem) => problem.id === "demo-runtime-audio-classification-degraded") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const invalidWavPath = "artifacts/generated-patch-audio/captures/01-143816-v2.wav";
    checkWavAnalysis(invalidWavPath, Buffer.from("not a wav file", "utf8"), { minRms: 0.0005, minPeak: 0.05 }, problems);
    controls.push({
      id: "runtime-audio-consumed-wav-invalid",
      expectedFailureSurface: "demo-runtime-wav-invalid",
      status: problems.some((problem) =>
        problem.id === "demo-runtime-wav-invalid" &&
        problem.path === invalidWavPath
      ) ? "pass" : "fail",
      invalidWavPath,
      problems
    });
  }

  {
    const problems = [];
    const silentWavPath = "artifacts/generated-patch-audio/captures/01-143816-v2.wav";
    checkWavAnalysis(silentWavPath, silentPcm16Wav(), { minRms: 0.0005, minPeak: 0.05 }, problems);
    controls.push({
      id: "runtime-audio-consumed-wav-signal-too-low",
      expectedFailureSurface: "demo-runtime-wav-rms-too-low",
      secondaryFailureSurface: "demo-runtime-wav-peak-too-low",
      status: problems.some((problem) =>
        problem.id === "demo-runtime-wav-rms-too-low" &&
        problem.path === silentWavPath
      ) && problems.some((problem) =>
        problem.id === "demo-runtime-wav-peak-too-low" &&
        problem.path === silentWavPath
      ) ? "pass" : "fail",
      silentWavPath,
      problems
    });
  }

  {
    const problems = [];
    const driftedManifest = cloneJson(manifest);
    const missingId = runtimeLogs.delayAudioResult.results[0].id;
    const missingPath = `artifacts/generated-patch-audio/captures/${missingId}.wav`;
    driftedManifest.artifacts = driftedManifest.artifacts.filter((artifact) => artifact.path !== missingPath);
    await checkAudioCaptureMapping(driftedManifest, runtimeLogs, problems);
    controls.push({
      id: "runtime-audio-capture-wav-path-mismatch",
      expectedFailureSurface: "demo-audio-capture-wav-path-missing",
      status: problems.some((problem) =>
        problem.id === "demo-audio-capture-wav-path-missing" &&
        problem.evidenceId === missingId &&
        problem.path === missingPath
      ) ? "pass" : "fail",
      missingId,
      missingPath,
      problems
    });
  }

  {
    const problems = [];
    const driftedRuntimeLogs = cloneJson(runtimeLogs);
    driftedRuntimeLogs.delayAudioStimulus.stimulus.amplitude = 0.25;
    await checkAudioStimulusManifestAgreement(driftedRuntimeLogs, problems);
    controls.push({
      id: "runtime-audio-stimulus-manifest-amplitude-mismatch",
      expectedFailureSurface: "demo-audio-stimulus-amplitude-mismatch",
      secondaryFailureSurface: "demo-audio-stimulus-event-mismatch",
      status: problems.some((problem) => problem.id === "demo-audio-stimulus-amplitude-mismatch") &&
        problems.some((problem) => problem.id === "demo-audio-stimulus-event-mismatch") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const driftedRuntimeLogs = cloneJson(runtimeLogs);
    driftedRuntimeLogs.delayAudio.classifications[0].classification = "classification-log-drift-seed";
    checkAudioClassificationAgreement(driftedRuntimeLogs, problems);
    controls.push({
      id: "runtime-audio-classification-log-label-drift",
      expectedFailureSurface: "demo-audio-classification-result-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-audio-classification-result-mismatch" &&
        problem.field === "classification"
      ) ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const driftedRuntimeLogs = cloneJson(runtimeLogs);
    const omittedId = driftedRuntimeLogs.delayAudioResult.results[0].id;
    driftedRuntimeLogs.delayAudio.classifications = driftedRuntimeLogs.delayAudio.classifications.filter((entry) => entry.id !== omittedId);
    checkAudioClassificationAgreement(driftedRuntimeLogs, problems);
    controls.push({
      id: "runtime-audio-classification-log-entry-omission",
      expectedFailureSurface: "demo-audio-classification-log-entry-missing",
      status: problems.some((problem) =>
        problem.id === "demo-audio-classification-log-entry-missing" &&
        problem.evidenceId === omittedId
      ) ? "pass" : "fail",
      omittedId,
      problems
    });
  }

  {
    const problems = [];
    const driftedRuntimeLogs = cloneJson(runtimeLogs);
    const duplicatedId = driftedRuntimeLogs.delayAudio.classifications[0].id;
    driftedRuntimeLogs.delayAudio.classifications.push(cloneJson(driftedRuntimeLogs.delayAudio.classifications[0]));
    checkAudioClassificationAgreement(driftedRuntimeLogs, problems);
    controls.push({
      id: "runtime-audio-classification-log-duplicate-entry",
      expectedFailureSurface: "demo-audio-classification-log-entry-duplicate",
      status: problems.some((problem) =>
        problem.id === "demo-audio-classification-log-entry-duplicate" &&
        problem.evidenceId === duplicatedId
      ) ? "pass" : "fail",
      duplicatedId,
      problems
    });
  }

  {
    const problems = [];
    const driftedRuntimeLogs = cloneJson(runtimeLogs);
    const first = driftedRuntimeLogs.delayAudio.classifications[0];
    driftedRuntimeLogs.delayAudio.classifications[0] = driftedRuntimeLogs.delayAudio.classifications[1];
    driftedRuntimeLogs.delayAudio.classifications[1] = first;
    checkAudioClassificationAgreement(driftedRuntimeLogs, problems);
    controls.push({
      id: "runtime-audio-classification-log-order-drift",
      expectedFailureSurface: "demo-audio-classification-log-order-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-audio-classification-log-order-mismatch" &&
        problem.index === 0
      ) ? "pass" : "fail",
      swappedIds: [
        driftedRuntimeLogs.delayAudio.classifications[0].id,
        driftedRuntimeLogs.delayAudio.classifications[1].id
      ],
      problems
    });
  }

  {
    const problems = [];
    const driftedId = runtimeLogs.delayAudio.classifications.find((entry) => entry.expectedSignal === true).id;
    const result = runtimeLogs.delayAudioResult.results.find((entry) => entry.id === driftedId);
    const features = result.audioEvidence.features;
    const analysisById = new Map([
      [driftedId, {
        valid: true,
        rms: runtimeLogs.delayAudio.classifications.find((entry) => entry.id === driftedId).rms,
        peak: runtimeLogs.delayAudio.classifications.find((entry) => entry.id === driftedId).peak,
        postInputTailPeak: 0,
        sampleRate: runtimeLogs.delayAudioStimulus.renderSettings.sampleRate,
        channelCount: runtimeLogs.delayAudioStimulus.renderSettings.channelCount,
        sampleCount: runtimeLogs.delayAudioStimulus.renderSettings.frameCount,
        postInputTailStart: features.postInputTailStart
      }]
    ]);
    await checkAudioClassificationWavContent(runtimeLogs, problems, analysisById);
    controls.push({
      id: "runtime-audio-classification-wav-content-drift",
      expectedFailureSurface: "demo-audio-classification-wav-content-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-audio-classification-wav-content-mismatch" &&
        problem.evidenceId === driftedId &&
        problem.field === "postInputTailPeak"
      ) ? "pass" : "fail",
      driftedId,
      problems
    });
  }

  {
    const problems = [];
    const driftedEntry = runtimeLogs.lfoSemantics.classifications.find((entry) =>
      entry.status === "pass" && entry.mode === "positive-lfo-time-route"
    );
    const analysisById = new Map([
      [driftedEntry.id, {
        valid: true,
        rms: 0,
        peak: 0,
        estimatedFrequencyHz: driftedEntry.lfoTraceEstimatedFrequencyHz
      }]
    ]);
    await checkLfoTraceWavContent(runtimeLogs, problems, analysisById);
    controls.push({
      id: "runtime-lfo-trace-wav-content-drift",
      expectedFailureSurface: "demo-lfo-trace-wav-content-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-lfo-trace-wav-content-mismatch" &&
        problem.evidenceId === driftedEntry.id &&
        problem.field === "lfoTraceRms"
      ) ? "pass" : "fail",
      driftedId: driftedEntry.id,
      problems
    });
  }

  {
    const problems = [];
    const driftedEntry = runtimeLogs.filterRuntime.classifications.find((entry) => entry.expectedLowpass === true);
    const stimulus = runtimeLogs.filterStimulus.stimulus;
    const analysisById = new Map([
      [driftedEntry.id, {
        valid: true,
        rms: driftedEntry.rms,
        peak: driftedEntry.peak,
        frequencyMagnitudes: {
          [stimulus.lowFrequency]: driftedEntry.lowMagnitude,
          [stimulus.highFrequency]: driftedEntry.lowMagnitude
        }
      }]
    ]);
    await checkFilterWavContent(runtimeLogs, problems, analysisById);
    controls.push({
      id: "runtime-filter-wav-content-drift",
      expectedFailureSurface: "demo-filter-wav-content-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-filter-wav-content-mismatch" &&
        problem.evidenceId === driftedEntry.id &&
        problem.field === "highLowRatio"
      ) ? "pass" : "fail",
      driftedId: driftedEntry.id,
      problems
    });
  }

  {
    const problems = [];
    const driftedManifest = cloneJson(manifest);
    const uncoveredPath = "artifacts/generated-patch-audio/captures/uncovered-seeded.wav";
    driftedManifest.artifacts.push({ path: uncoveredPath, byteLength: 44, sha256: "0".repeat(64) });
    checkAudioManifestContentCoverage(driftedManifest, runtimeLogs, problems);
    controls.push({
      id: "audio-manifest-uncovered-wav-artifact",
      expectedFailureSurface: "demo-audio-manifest-wav-content-uncovered",
      status: problems.some((problem) =>
        problem.id === "demo-audio-manifest-wav-content-uncovered" &&
        problem.path === uncoveredPath
      ) ? "pass" : "fail",
      uncoveredPath,
      problems
    });
  }

  {
    const problems = [];
    const driftedManifest = cloneJson(manifest);
    const missingCoveredPath = "artifacts/generated-patch-filter-runtime/captures/01-107507.wav";
    driftedManifest.artifacts = driftedManifest.artifacts.filter((artifact) => artifact.path !== missingCoveredPath);
    checkAudioManifestContentCoverage(driftedManifest, runtimeLogs, problems);
    controls.push({
      id: "audio-manifest-covered-wav-artifact-missing",
      expectedFailureSurface: "demo-audio-manifest-wav-content-covered-path-missing",
      status: problems.some((problem) =>
        problem.id === "demo-audio-manifest-wav-content-covered-path-missing" &&
        problem.path === missingCoveredPath &&
        problem.verifierField === "filterWavContentCheckCount"
      ) ? "pass" : "fail",
      missingCoveredPath,
      problems
    });
  }

  {
    const problems = [];
    const driftedVerifierFieldNames = new Set(verifierFieldNames);
    driftedVerifierFieldNames.delete("filterWavContentCheckCount");
    checkAudioCapabilityClaimChains(readmeText, statusText, manifest, runtimeLogs, driftedVerifierFieldNames, verifierFieldValues, problems);
    controls.push({
      id: "audio-capability-claim-verifier-field-missing",
      expectedFailureSurface: "demo-audio-capability-chain-verifier-field-missing",
      status: problems.some((problem) =>
        problem.id === "demo-audio-capability-chain-verifier-field-missing" &&
        problem.capabilityId === "filter-runtime-wav-content" &&
        problem.field === "filterWavContentCheckCount"
      ) ? "pass" : "fail",
      removedField: "filterWavContentCheckCount",
      problems
    });
  }

  {
    const problems = [];
    const staleVerifierFieldValues = new Map(verifierFieldValues);
    staleVerifierFieldValues.set("filterWavContentCheckCount", 0);
    checkAudioCapabilityClaimChains(readmeText, statusText, manifest, runtimeLogs, verifierFieldNames, staleVerifierFieldValues, problems);
    controls.push({
      id: "audio-capability-claim-verifier-field-stale",
      expectedFailureSurface: "demo-audio-capability-chain-verifier-field-stale",
      status: problems.some((problem) =>
        problem.id === "demo-audio-capability-chain-verifier-field-stale" &&
        problem.capabilityId === "filter-runtime-wav-content" &&
        problem.field === "filterWavContentCheckCount" &&
        problem.observed === 0
      ) ? "pass" : "fail",
      staleField: "filterWavContentCheckCount",
      staleValue: 0,
      problems
    });
  }

  {
    const problems = [];
    const mismatchedVerifierFieldValues = new Map(verifierFieldValues);
    mismatchedVerifierFieldValues.set("lfoTraceWavContentCheckCount", 4);
    checkAudioConsumedFieldArtifactCounts(manifest, runtimeLogs, mismatchedVerifierFieldValues, problems);
    controls.push({
      id: "audio-consumed-field-artifact-count-mismatch",
      expectedFailureSurface: "demo-audio-consumed-field-artifact-count-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-audio-consumed-field-artifact-count-mismatch" &&
        problem.capabilityId === "lfo-trace-wav-content" &&
        problem.field === "lfoTraceWavContentCheckCount" &&
        problem.expected === 6 &&
        problem.observed === 4
      ) ? "pass" : "fail",
      mismatchedField: "lfoTraceWavContentCheckCount",
      staleValue: 4,
      problems
    });
  }

  {
    const problems = [];
    const stalePath = resolve(DEMO_ROOT, "artifacts/generated-patch-filter-runtime/captures/01-107507.wav");
    const realStats = new Map();
    const statProvider = (absolutePath) => {
      const key = String(absolutePath);
      if (!realStats.has(key)) realStats.set(key, statSync(key));
      const stats = realStats.get(key);
      if (key === stalePath) {
        return { ...stats, mtimeMs: stats.mtimeMs - (20 * 60 * 1000) };
      }
      return stats;
    };
    checkAudioArtifactGenerationFreshness(manifest, problems, statProvider);
    controls.push({
      id: "audio-artifact-generation-window-exceeded",
      expectedFailureSurface: "demo-audio-artifact-generation-window-exceeded",
      status: problems.some((problem) =>
        problem.id === "demo-audio-artifact-generation-window-exceeded" &&
        problem.groupId === "filter-runtime" &&
        problem.oldestPath === "artifacts/generated-patch-filter-runtime/captures/01-107507.wav"
      ) ? "pass" : "fail",
      stalePath: "artifacts/generated-patch-filter-runtime/captures/01-107507.wav",
      staleOffsetMs: 20 * 60 * 1000,
      problems
    });
  }

  {
    const problems = [];
    const driftedManifest = cloneJson(manifest);
    driftedManifest.audioGenerationWindowMaxDeltaMs = 5 * 60 * 1000;
    checkAudioGenerationWindowSurfaceAgreement(readmeText, statusText, driftedManifest, {
      audioGenerationWindowMaxDeltaMs: AUDIO_GENERATION_WINDOW_MS,
      audioGenerationWindowMinutes: AUDIO_GENERATION_WINDOW_MINUTES
    }, problems);
    controls.push({
      id: "audio-generation-window-manifest-threshold-drift",
      expectedFailureSurface: "demo-audio-generation-window-threshold-mismatch",
      status: problems.some((problem) =>
        problem.id === "demo-audio-generation-window-threshold-mismatch" &&
        problem.file === "DEMO_MANIFEST.json" &&
        problem.field === "audioGenerationWindowMaxDeltaMs" &&
        problem.expected === AUDIO_GENERATION_WINDOW_MS &&
        problem.observed === 5 * 60 * 1000
      ) ? "pass" : "fail",
      driftedField: "audioGenerationWindowMaxDeltaMs",
      driftedValue: 5 * 60 * 1000,
      problems
    });
  }

  {
    const problems = [];
    const patch = await readJson(resolve(DEMO_ROOT, expectedPatchPath("01-143816-v2")));
    const brokenPatch = cloneJson(patch);
    brokenPatch.connections = brokenPatch.connections.filter((connection) =>
      !(connection.srcMod === 1 && connection.srcBlock === 4 && connection.dstMod === 2 && connection.dstBlock === 0)
    );
    checkPatchStructure("01-143816-v2", brokenPatch, runtimeLogs, problems);
    controls.push({
      id: "generated-patch-required-routing-missing",
      expectedFailureSurface: "demo-patch-required-routing-missing",
      status: problems.some((problem) => problem.id === "demo-patch-required-routing-missing") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const patch = await readJson(resolve(DEMO_ROOT, expectedPatchPath("01-143816-v2")));
    const mismatchedPatch = cloneJson(patch);
    mismatchedPatch.sourcePatchId = "wrong-runtime-source-id-seed";
    const delayModule = mismatchedPatch.modules.find((module) => module.name === "delay-1");
    delayModule.typeName = "Audio Output";
    checkPatchStructure("01-143816-v2", mismatchedPatch, runtimeLogs, problems);
    controls.push({
      id: "generated-patch-runtime-semantic-mismatch",
      expectedFailureSurface: "demo-patch-runtime-source-id-mismatch",
      secondaryFailureSurface: "demo-patch-required-module-missing",
      status: problems.some((problem) => problem.id === "demo-patch-runtime-source-id-mismatch") &&
        problems.some((problem) => problem.id === "demo-patch-required-module-missing") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPath = expectedPatchPath("01-143816-v2");
    const existingPaths = new Set(requiredFiles.filter((path) => path !== omittedPath));
    checkRequiredFilePresence(existingPaths, problems);
    controls.push({
      id: "copied-generated-patch-artifact-missing",
      expectedFailureSurface: "demo-file-missing",
      status: problems.some((problem) => problem.id === "demo-file-missing" && problem.path === omittedPath) ? "pass" : "fail",
      omittedPath,
      problems
    });
  }

  {
    const problems = [];
    const manifest = {
      artifacts: [{ path: "../tests/workflow/evidence/generated-patch-audio/run-result.json" }]
    };
    checkDemoArtifactResolutionBoundary(manifest, [], problems);
    controls.push({
      id: "claimed-artifact-resolves-outside-demo-root",
      expectedFailureSurface: "demo-artifact-resolves-outside-demo-root",
      status: problems.some((problem) => problem.id === "demo-artifact-resolves-outside-demo-root") ? "pass" : "fail",
      problems
    });
  }

  {
    const problems = [];
    const omittedPath = jsonChecks[0].copy;
    const existingPaths = new Set(requiredFiles.filter((path) => path !== omittedPath));
    checkRequiredFilePresence(existingPaths, problems);
    controls.push({
      id: "copied-json-evidence-artifact-missing",
      expectedFailureSurface: "demo-file-missing",
      status: problems.some((problem) => problem.id === "demo-file-missing" && problem.path === omittedPath) ? "pass" : "fail",
      omittedPath,
      problems
    });
  }

  {
    const omittedPath = "artifacts/generated-patch-audio/captures/01-143816-v2.wav";
    const relocatedOmission = await runRelocatedBundleOmissionCheck(omittedPath);
    controls.push({
      id: "relocated-copied-json-artifact-omission",
      expectedFailureSurface: "demo-file-missing",
      status: relocatedOmission.status,
      omittedPath,
      relocatedOmission
    });
  }

  {
    const problems = [];
    const controlsWithOmission = controls.filter((control) => control.id !== "tampered-copied-json-evidence");
    checkSeededControlInventory(controlsWithOmission, problems);
    controls.push({
      id: "seeded-control-inventory-control-omission",
      expectedFailureSurface: "demo-seeded-control-inventory-missing-control",
      status: problems.some((problem) =>
        problem.id === "demo-seeded-control-inventory-missing-control" &&
        problem.controlId === "tampered-copied-json-evidence"
      ) ? "pass" : "fail",
      omittedControlId: "tampered-copied-json-evidence",
      problems
    });
  }

  {
    const problems = [];
    const syntheticControl = {
      id: "synthetic-duplicate-risk-control",
      expectedFailureSurface: "demo-evidence-copy-value-mismatch"
    };
    const inventoryWithDuplicateRisk = seededControlInventory.concat({
      id: syntheticControl.id,
      expectedFailureSurface: syntheticControl.expectedFailureSurface,
      riskCategory: "copied evidence value integrity"
    });
    checkSeededControlInventory(controls.concat(syntheticControl), problems, inventoryWithDuplicateRisk);
    controls.push({
      id: "seeded-control-inventory-duplicate-risk",
      expectedFailureSurface: "demo-seeded-control-inventory-duplicate-risk",
      status: problems.some((problem) =>
        problem.id === "demo-seeded-control-inventory-duplicate-risk" &&
        problem.controlId === syntheticControl.id
      ) ? "pass" : "fail",
      duplicateRiskControlId: syntheticControl.id,
      problems
    });
  }

  return controls;
}

async function runRelocatedBundleCheck() {
  if (IS_RELOCATED_CHILD) {
    return {
      status: "skipped",
      reason: "Relocated child verifier run does not spawn another relocated verifier."
    };
  }

  const tempParent = await mkdtemp(resolve(tmpdir(), "zoia-july24-demo-"));
  const tempDemoRoot = resolve(tempParent, "July24_2026_Demo");
  try {
    await cp(DEMO_ROOT, tempDemoRoot, { recursive: true });
    const command = `${process.execPath} ${resolve(tempDemoRoot, "verify-demo.mjs")}`;
    const { stdout } = await execFileAsync(process.execPath, [resolve(tempDemoRoot, "verify-demo.mjs")], {
      cwd: tempParent,
      env: {
        ...process.env,
        ZOIA_DEMO_SOURCE_ROOT: PROJECT_ROOT,
        ZOIA_DEMO_RELOCATED_CHILD: "1"
      },
      maxBuffer: 1024 * 1024 * 8
    });
    const childResult = await readJson(resolve(tempDemoRoot, "verification-result.json"));
    return {
      status: childResult.status === "pass" ? "pass" : "fail",
      temporaryPathRole: "temporary-relocated-demo-root",
      commandRole: "node relocated verify-demo.mjs",
      workingDirectoryRole: "temporary-relocated-parent",
      outputSummaryPath: "July24_2026_Demo/verification-result.json",
      problemCount: childResult.problemCount,
      copiedArtifactCount: childResult.copiedArtifactCount,
      artifactManifestCount: childResult.artifactManifestCount,
      seededNegativeControlPassingCount: childResult.seededNegativeControlPassingCount,
      explicitSourceEvidenceCount: childResult.explicitSourceEvidenceCount,
      copiedClaimedArtifactCount: childResult.copiedClaimedArtifactCount,
      sourceEvidenceRootRole: childResult.documentedWorkingDirectoryRole || "source-project-root",
      stdoutByteLength: Buffer.byteLength(stdout, "utf8")
    };
  } catch (error) {
    return {
      status: "fail",
      temporaryPathRole: "temporary-relocated-demo-root",
      commandRole: "node relocated verify-demo.mjs",
      workingDirectoryRole: "temporary-relocated-parent",
      outputSummaryPath: "July24_2026_Demo/verification-result.json",
      message: error.message,
      stdout: error.stdout || "",
      stderr: error.stderr || ""
    };
  } finally {
    await rm(tempParent, { recursive: true, force: true });
  }
}

async function runRelocatedBundleOmissionCheck(omittedPath) {
  if (IS_RELOCATED_CHILD) {
    return {
      status: "pass",
      omittedPath,
      skipped: true,
      reason: "Relocated child verifier run does not spawn another relocated omission verifier."
    };
  }

  const tempParent = await mkdtemp(resolve(tmpdir(), "zoia-july24-demo-omission-"));
  const tempDemoRoot = resolve(tempParent, "July24_2026_Demo");
  try {
    await cp(DEMO_ROOT, tempDemoRoot, { recursive: true });
    await rm(resolve(tempDemoRoot, omittedPath), { force: true });
    if (existsSync(resolve(tempDemoRoot, omittedPath))) {
      return {
        status: "fail",
        omittedPath,
        temporaryPathRole: "temporary-relocated-omission-demo-root",
        message: "Relocated omission fixture did not remove the copied artifact."
      };
    }
    const existingPaths = new Set(requiredFiles.filter((relativePath) =>
      existsSync(resolve(tempDemoRoot, relativePath))
    ));
    const problems = [];
    checkRequiredFilePresence(existingPaths, problems);
    const hasExpectedProblem = problems.some((problem) =>
      problem.id === "demo-file-missing" &&
      problem.path === omittedPath
    );
    return {
      status: hasExpectedProblem ? "pass" : "fail",
      omittedPath,
      temporaryPathRole: "temporary-relocated-omission-demo-root",
      workingDirectoryRole: "temporary-relocated-omission-parent",
      check: "relocated required-file presence",
      problemCount: problems.length,
      hasExpectedProblem,
      problems
    };
  } finally {
    await rm(tempParent, { recursive: true, force: true });
  }
}

async function main() {
  const problems = [];
  const checked = [];
  const sourceEvidenceDependencies = [];
  const artifactManifest = [];
  const existingRequiredPaths = new Set();

  for (const relativePath of requiredFiles) {
    const absolutePath = resolve(DEMO_ROOT, relativePath);
    if (!existsSync(absolutePath)) {
      problems.push({ id: "demo-file-missing", path: relativePath });
    } else if (statSync(absolutePath).isFile() && statSync(absolutePath).size === 0) {
      problems.push({ id: "demo-file-empty", path: relativePath });
    } else if (statSync(absolutePath).isFile()) {
      existingRequiredPaths.add(relativePath);
      artifactManifest.push(await fileManifestEntry(relativePath));
    }
  }
  checkRequiredFilePresence(existingRequiredPaths, problems);

  for (const check of jsonChecks) {
    const sourcePath = resolve(PROJECT_ROOT, check.source);
    const copyPath = resolve(DEMO_ROOT, check.copy);
    if (!existsSync(sourcePath)) {
      problems.push({ id: "source-evidence-missing", evidenceId: check.id, path: check.source });
      continue;
    }
    if (!existsSync(copyPath)) {
      problems.push({ id: "demo-evidence-copy-missing", evidenceId: check.id, path: check.copy });
      continue;
    }
    const source = await readJson(sourcePath);
    const copy = await readJson(copyPath);
    checkFresh(check.id, source, check.source, problems);
    checkExpectedValues(check, source, copy, problems);
    if (typeof check.custom === "function") check.custom(source, problems);
    sourceEvidenceDependencies.push(await sourceEvidenceDependency(check, source, sourcePath, copyPath));
    checked.push({ id: check.id, source: check.source, copy: check.copy, status: source.status || source.summary?.status || null });
  }

  const statusText = await readFile(resolve(DEMO_ROOT, "DEMO_STATUS.md"), "utf8");
  const readmeText = await readFile(resolve(DEMO_ROOT, "README_DEMO.md"), "utf8");
  const runDemoText = await readFile(resolve(DEMO_ROOT, "run-demo.ps1"), "utf8");
  checkNoUnexpectedAbsolutePaths("README_DEMO.md", readmeText, problems);
  checkNoUnexpectedAbsolutePaths("DEMO_STATUS.md", statusText, problems);
  let consumedMarkdownSectionCheckCount = 0;
  for (const surface of requiredConsumedMarkdownSections) {
    const text = surface.file === "README_DEMO.md" ? readmeText : statusText;
    checkConsumedMarkdownSections(surface.file, text, surface.headings, problems);
    consumedMarkdownSectionCheckCount += surface.headings.length;
  }
  const readmeArtifactReferenceCount = checkReadmeArtifactReferences(readmeText, problems);
  const sourceDependencyDocCount = checkSourceDependencyDocumentation(readmeText, problems);
  const statusAcceptedEvidenceDocCount = checkStatusEvidenceDocumentation(statusText, problems);
  const packageJson = await readJson(resolve(PROJECT_ROOT, "package.json"));
  const documentedFullEvidenceCommandCount = checkDocumentedFullEvidenceCommands(readmeText, packageJson, problems, runDemoText);
  const wrapperFullEvidenceCommandCount = wrapperNpmScripts(runDemoText).size;
  const relocatedSourceEvidenceInstructionCheckCount = checkRelocatedSourceEvidenceInstructions(readmeText, runDemoText, problems);
  const wrapperFullEvidenceOrderCheckCount = checkWrapperFullEvidenceVerificationOrder(runDemoText, problems);
  const wrapperFullEvidenceCopySyncCheckCount = checkWrapperFullEvidenceCopySync(runDemoText, problems);
  const wrapperFullEvidenceCopyFreshnessCheckCount = checkWrapperFullEvidenceCopyFreshness(problems);
  const wrapperFullEvidenceSmokeMarkerCheckCount = checkWrapperFullEvidenceSmokeMarker(runDemoText, problems);
  const wrapperFullEvidenceSmokeMode = process.env.ZOIA_DEMO_RUN_FULL_EVIDENCE === "1";
  const wrapperFullEvidenceSmokeCheckCount = wrapperFullEvidenceSmokeMode ? wrapperFullEvidenceCopySyncs.length : 0;
  const wrapperJsonOutputBoundaryCheckCount = checkWrapperJsonOutputBoundary(runDemoText, problems);
  const wrapperResultDiscoveryCheckCount = checkWrapperResultDiscovery(readmeText, statusText, problems);
  const runtimeLogs = {
    delayAudioResult: await readJson(resolve(DEMO_ROOT, "artifacts/generated-patch-audio/run-result.json")),
    delayAudio: await readJson(resolve(DEMO_ROOT, "artifacts/generated-patch-audio/classification-log.json")),
    delayAudioStimulus: await readJson(resolve(DEMO_ROOT, "artifacts/generated-patch-audio/stimulus-manifest.json")),
    lfoSemantics: await readJson(resolve(DEMO_ROOT, "artifacts/generated-patch-lfo-semantics/classification-log.json")),
    filterRuntime: await readJson(resolve(DEMO_ROOT, "artifacts/generated-patch-filter-runtime/classification-log.json")),
    filterStimulus: await readJson(resolve(DEMO_ROOT, "artifacts/generated-patch-filter-runtime/stimulus-manifest.json"))
  };
  const copiedPatchCheckCount = await checkCopiedPatches(runtimeLogs, problems);
  await checkRuntimeConsumedArtifacts(runtimeLogs, problems);
  const audioStimulusManifestAgreementCheckCount = await checkAudioStimulusManifestAgreement(runtimeLogs, problems);
  const audioClassificationAgreementCheckCount = checkAudioClassificationAgreement(runtimeLogs, problems);
  const audioClassificationWavContentCheckCount = await checkAudioClassificationWavContent(runtimeLogs, problems);
  const lfoTraceWavContentCheckCount = await checkLfoTraceWavContent(runtimeLogs, problems);
  const filterWavContentCheckCount = await checkFilterWavContent(runtimeLogs, problems);
  checkHumanFacingOverclaims("README_DEMO.md", readmeText, problems);
  checkHumanFacingOverclaims("DEMO_STATUS.md", statusText, problems);

  let docSurfaceCheckCount = 0;
  for (const surface of requiredDocSurfaces) {
    const text = surface.file === "README_DEMO.md" ? readmeText : await readFile(resolve(DEMO_ROOT, surface.file), "utf8");
    for (const phrase of surface.phrases) {
      docSurfaceCheckCount += 1;
      if (!text.includes(phrase)) {
        problems.push({ id: "demo-doc-surface-phrase-missing", file: surface.file, phrase });
      }
    }
  }
  const sourceFreshnessSummary = sourceEvidenceFreshnessSummary(sourceEvidenceDependencies);
  const sourceCopyHashCheckCount = checkSourceCopyHashBoundaries(sourceEvidenceDependencies, problems);
  const sourceEvidenceRefreshWarningCheckCount = checkSourceEvidenceRefreshRecommendation(sourceFreshnessSummary, problems);
  const sourceEvidenceFreshnessSummaryCheckCount = checkSourceEvidenceFreshnessSummaryConsistency(sourceFreshnessSummary, sourceEvidenceDependencies, problems);
  const sourceEvidenceWarningDocumentAgreementCheckCount = checkSourceEvidenceWarningDocumentAgreement(readmeText, statusText, sourceFreshnessSummary, problems);

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    artifactCount: artifactManifest.length,
    artifacts: artifactManifest,
    checkedEvidence: checked,
    audioGenerationWindowMaxDeltaMs: AUDIO_GENERATION_WINDOW_MS,
    audioGenerationWindowMinutes: AUDIO_GENERATION_WINDOW_MINUTES,
    claimBoundary: "This demo verifies local copied/source evidence for bounded ZOIA 0.4.0 generated-patch behavior. It is not release readiness or publication evidence."
  };
  validateManifest(manifest, problems);
  const audioCaptureMappingCheckCount = await checkAudioCaptureMapping(manifest, runtimeLogs, problems);
  const audioManifestContentCoverageCheckCount = checkAudioManifestContentCoverage(manifest, runtimeLogs, problems);
  const audioArtifactGenerationFreshnessCheckCount = checkAudioArtifactGenerationFreshness(manifest, problems);
  const manifestArtifactHashCheckCount = await checkManifestArtifactHashes(manifest, problems);
  const verifierFieldNames = new Set([
    "copiedPatchCheckCount",
    "runtimeConsumedArtifactCheckCount",
    "audioCaptureMappingCheckCount",
    "audioManifestContentCoverageCheckCount",
    "audioStimulusManifestAgreementCheckCount",
    "audioClassificationWavContentCheckCount",
    "lfoTraceWavContentCheckCount",
    "filterWavContentCheckCount",
    "audioArtifactGenerationFreshnessCheckCount",
    "seededNegativeControlPassingCount",
    "consumedMarkdownSectionCheckCount",
    "demoWalkthroughCheckCount",
    "explicitSourceEvidenceCount",
    "copiedClaimedArtifactCount"
  ]);
  const verifierFieldValues = new Map([
    ["copiedPatchCheckCount", copiedPatchCheckCount],
    ["runtimeConsumedArtifactCheckCount", 11],
    ["audioStimulusManifestAgreementCheckCount", audioStimulusManifestAgreementCheckCount],
    ["audioCaptureMappingCheckCount", audioCaptureMappingCheckCount],
    ["audioManifestContentCoverageCheckCount", audioManifestContentCoverageCheckCount],
    ["audioClassificationAgreementCheckCount", audioClassificationAgreementCheckCount],
    ["audioClassificationWavContentCheckCount", audioClassificationWavContentCheckCount],
    ["lfoTraceWavContentCheckCount", lfoTraceWavContentCheckCount],
    ["filterWavContentCheckCount", filterWavContentCheckCount],
    ["audioArtifactGenerationFreshnessCheckCount", audioArtifactGenerationFreshnessCheckCount],
    ["consumedMarkdownSectionCheckCount", consumedMarkdownSectionCheckCount],
    ["demoWalkthroughCheckCount", 35],
    ["explicitSourceEvidenceCount", sourceEvidenceDependencies.length],
    ["copiedClaimedArtifactCount", requiredFiles.length]
  ]);
  const audioGenerationWindowSurfaceAgreementCheckCount = checkAudioGenerationWindowSurfaceAgreement(
    readmeText,
    statusText,
    manifest,
    {
      audioGenerationWindowMaxDeltaMs: AUDIO_GENERATION_WINDOW_MS,
      audioGenerationWindowMinutes: AUDIO_GENERATION_WINDOW_MINUTES
    },
    problems
  );
  const seededNegativeControls = await runSeededNegativeControls(readmeText, statusText, manifest, runtimeLogs, verifierFieldNames, verifierFieldValues);
  for (const control of seededNegativeControls) {
    if (control.status !== "pass") {
      problems.push({
        id: "demo-seeded-negative-control-failed",
        controlId: control.id,
        expectedFailureSurface: control.expectedFailureSurface
      });
    }
  }
  const seededControlInventoryCount = checkSeededControlInventory(seededNegativeControls, problems);
  const sourceEvidenceSurfaceAgreementCheckCount = checkSourceEvidenceSurfaceAgreement(
    {
      readmeText,
      statusText,
      manifest,
      sourceDependencyDocCount,
      sourceEvidenceDependencies,
      sourceFreshnessSummary
    },
    problems
  );
  const manifestRequiredPathPresentCount = requiredFiles.filter((path) =>
    manifest.artifacts.some((artifact) => artifact.path === path)
  ).length;
  const manifestSha256RecordCount = manifest.artifacts.filter((artifact) => /^[a-f0-9]{64}$/u.test(artifact.sha256 || "")).length;
  checkDemoArtifactResolutionBoundary(manifest, sourceEvidenceDependencies, problems);
  checkReadmeArtifactTable(readmeText, manifest.artifacts, problems);
  const demoWalkthroughCheckCount = checkDemoWalkthrough(readmeText, statusText, manifest, problems);
  const capabilityChainCheckCount = checkCapabilityChains(
    readmeText,
    statusText,
    manifest,
    runtimeLogs,
    sourceEvidenceDependencies,
    verifierFieldNames,
    problems
  );
  const audioCapabilityClaimChainCheckCount = checkAudioCapabilityClaimChains(
    readmeText,
    statusText,
    manifest,
    runtimeLogs,
    verifierFieldNames,
    verifierFieldValues,
    problems
  );
  const audioConsumedFieldArtifactCountCheckCount = checkAudioConsumedFieldArtifactCounts(
    manifest,
    runtimeLogs,
    verifierFieldValues,
    problems
  );
  const relocatedBundleCheck = await runRelocatedBundleCheck();
  if (relocatedBundleCheck.status === "fail") {
    problems.push({
      id: "demo-relocated-bundle-check-failed",
      temporaryPathRole: relocatedBundleCheck.temporaryPathRole || "temporary-relocated-demo-root",
      outputSummaryPath: relocatedBundleCheck.outputSummaryPath,
      message: relocatedBundleCheck.message || null
    });
  }
  const demoHandoffCompletenessCheckCount = checkDemoHandoffCompleteness(
    {
      readmeText,
      statusText,
      manifest,
      artifactManifestCount: artifactManifest.length,
      manifestRequiredPathPresentCount,
      manifestSha256RecordCount,
      seededNegativeControls,
      relocatedBundleCheck
    },
    problems
  );

  const result = {
    status: problems.length === 0 ? "pass" : "fail",
    problemCount: problems.length,
    checkedEvidenceCount: checked.length,
    copiedArtifactCount: requiredFiles.length,
    artifactManifestCount: artifactManifest.length,
    copiedPatchCheckCount,
    runtimeConsumedArtifactCheckCount: 11,
    audioStimulusManifestAgreementCheckCount,
    audioCaptureMappingCheckCount,
    audioManifestContentCoverageCheckCount,
    audioClassificationAgreementCheckCount,
    audioClassificationWavContentCheckCount,
    lfoTraceWavContentCheckCount,
    filterWavContentCheckCount,
    seededNegativeControlCount: seededNegativeControls.length,
    seededNegativeControlPassingCount: seededNegativeControls.filter((control) => control.status === "pass").length,
    seededControlInventoryCount,
    seededControlInventory,
    seededControlRiskCategoryCounts: seededControlRiskCategoryCounts(),
    docSurfaceCheckCount,
    consumedMarkdownInspectionMode: "source-markdown",
    consumedMarkdownInspectionReason: "July24_2026_Demo is a local command-line demo; README_DEMO.md and DEMO_STATUS.md are the consumed instruction/evidence/limitation surfaces.",
    consumedMarkdownSectionCheckCount,
    demoWalkthroughCheckCount,
    capabilityChainCheckCount,
    audioCapabilityClaimChainCheckCount,
    audioConsumedFieldArtifactCountCheckCount,
    audioArtifactGenerationFreshnessCheckCount,
    audioGenerationWindowSurfaceAgreementCheckCount,
    audioGenerationWindowMaxDeltaMs: AUDIO_GENERATION_WINDOW_MS,
    audioGenerationWindowMinutes: AUDIO_GENERATION_WINDOW_MINUTES,
    demoHandoffCompletenessCheckCount,
    relocatedBundleCheckStatus: relocatedBundleCheck.status,
    relocatedBundleTemporaryPathRole: relocatedBundleCheck.temporaryPathRole || null,
    relocatedBundleCommandRole: relocatedBundleCheck.commandRole || null,
    relocatedBundleWorkingDirectoryRole: relocatedBundleCheck.workingDirectoryRole || null,
    relocatedBundleOutputSummaryPath: relocatedBundleCheck.outputSummaryPath || null,
    relocatedBundleProblemCount: relocatedBundleCheck.problemCount ?? null,
    relocatedBundleExplicitSourceEvidenceCount: relocatedBundleCheck.explicitSourceEvidenceCount ?? null,
    manifestSchemaVersion: manifest.schemaVersion,
    manifestRequiredPathCount: requiredFiles.length,
    manifestRequiredPathPresentCount,
    manifestSha256RecordCount,
    manifestArtifactHashCheckCount,
    readmeArtifactTableCategoryCount: manifestCategoryCounts(manifest.artifacts).size,
    readmeArtifactReferenceCount,
    sourceDependencyDocCount,
    statusAcceptedEvidenceDocCount,
    documentedFullEvidenceCommandCount,
    wrapperFullEvidenceCommandCount,
    wrapperFullEvidenceOrderCheckCount,
    wrapperFullEvidenceCopySyncCheckCount,
    wrapperFullEvidenceCopyFreshnessCheckCount,
    wrapperFullEvidenceSmokeMarkerCheckCount,
    wrapperFullEvidenceSmokeMode,
    wrapperFullEvidenceSmokeCheckCount,
    wrapperJsonOutputBoundaryCheckCount,
    wrapperResultDiscoveryCheckCount,
    relocatedSourceEvidenceInstructionCheckCount,
    documentedWorkingDirectoryRole: "project-root",
    documentedVerificationCommand: ".\\July24_2026_Demo\\run-demo.ps1",
    outputSummaryPath: "July24_2026_Demo/verification-result.json",
    explicitSourceEvidenceCount: jsonChecks.length,
    sourceCopyHashCheckCount,
    sourceEvidenceRefreshWarningCheckCount,
    sourceEvidenceFreshnessSummaryCheckCount,
    sourceEvidenceWarningDocumentAgreementCheckCount,
    sourceEvidenceSurfaceAgreementCheckCount,
    ...sourceFreshnessSummary,
    copiedClaimedArtifactCount: requiredFiles.length,
    sourceEvidenceDependencies,
    manifestPath: "DEMO_MANIFEST.json",
    maxEvidenceAgeMs: MAX_EVIDENCE_AGE_MS,
    checked,
    seededNegativeControls,
    problems,
    claimBoundary: manifest.claimBoundary
  };
  await writeFile(resolve(DEMO_ROOT, "DEMO_MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(resolve(DEMO_ROOT, "verification-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
  if (problems.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
