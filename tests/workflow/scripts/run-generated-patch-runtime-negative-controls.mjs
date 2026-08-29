#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_SOURCE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-audio/run-result.json");
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-runtime-negative-controls");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const MIN_RMS = 0.0005;
const MIN_PEAK = 0.05;
const MIN_POST_INPUT_TAIL_PEAK = 0.01;
const MAX_SILENCE_RMS = 0.000001;
const MAX_SILENCE_PEAK = 0.000001;
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let sourcePath = DEFAULT_SOURCE_PATH;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-path") {
      sourcePath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return { sourcePath, resultPath, evidenceRoot: dirname(resultPath) };
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isFresh(iso, nowMs) {
  const timestamp = Date.parse(iso || "");
  return Number.isFinite(timestamp) && timestamp - nowMs <= MAX_FUTURE_CLOCK_SKEW_MS && nowMs - timestamp <= MAX_EVIDENCE_AGE_MS;
}

function addFailure(failures, surface, message, evidence = null) {
  failures.push({ surface, message, evidence });
}

function validateRuntimeAudioEvidence(value, nowMs) {
  const failures = [];
  const results = Array.isArray(value.results) ? value.results : [];
  if (value.status !== PASS_STATUS) {
    addFailure(failures, "status", "runtime audio evidence is not passing", { status: value.status });
  }
  if (!isFresh(value.completedAt, nowMs)) {
    addFailure(failures, "freshness", "runtime audio evidence is stale or has invalid completion time", { completedAt: value.completedAt });
  }
  if (results.length === 0) {
    addFailure(failures, "results", "runtime audio evidence has no per-patch results");
  }
  const signalResults = results.filter((result) => result.expectedSignal === true);
  const silentResults = results.filter((result) => result.expectedSignal === false);
  for (const result of signalResults) {
    const features = result.audioEvidence?.features || {};
    if (result.status !== PASS_STATUS || result.classification !== "signal-present") {
      addFailure(failures, "classification", "required-audio result is not a passing signal-present classification", {
        id: result.id,
        status: result.status,
        classification: result.classification
      });
    }
    if ((result.audioEvidence?.unsupportedModules || []).length > 0) {
      addFailure(failures, "unsupported-runtime", "required-audio result has unsupported runtime modules", {
        id: result.id,
        unsupportedModules: result.audioEvidence.unsupportedModules
      });
    }
    if (!result.capturePath || !existsSync(result.capturePath)) {
      addFailure(failures, "capture", "required-audio result capture is missing", { id: result.id, capturePath: result.capturePath || null });
    }
    if (!(features.rms >= MIN_RMS && features.peak >= MIN_PEAK && features.postInputTailPeak >= MIN_POST_INPUT_TAIL_PEAK)) {
      addFailure(failures, "audio-features", "required-audio result does not have measured signal and tail features", {
        id: result.id,
        rms: features.rms,
        peak: features.peak,
        postInputTailPeak: features.postInputTailPeak,
        thresholds: {
          minRms: MIN_RMS,
          minPeak: MIN_PEAK,
          minPostInputTailPeak: MIN_POST_INPUT_TAIL_PEAK
        }
      });
    }
  }
  for (const result of silentResults) {
    const features = result.audioEvidence?.features || {};
    if (result.status !== "classified" || !["silence", "expected-silence-classified"].includes(result.classification)) {
      addFailure(failures, "silence-classification", "silent control is not classified as silence", {
        id: result.id,
        status: result.status,
        classification: result.classification
      });
    }
    if (!(features.rms <= MAX_SILENCE_RMS && features.peak <= MAX_SILENCE_PEAK)) {
      addFailure(failures, "silence-features", "silent control has measured output above silence threshold", {
        id: result.id,
        rms: features.rms,
        peak: features.peak,
        thresholds: {
          maxSilenceRms: MAX_SILENCE_RMS,
          maxSilencePeak: MAX_SILENCE_PEAK
        }
      });
    }
  }
  const summary = value.summary || {};
  const observedSignalPresentCount = signalResults.filter((result) => result.status === PASS_STATUS && result.classification === "signal-present").length;
  const observedCaptureCount = results.filter((result) => result.capturePath && existsSync(result.capturePath)).length;
  if (summary.signalPresentCount !== observedSignalPresentCount) {
    addFailure(failures, "summary", "signal-present summary count does not match validated per-result count", {
      observed: summary.signalPresentCount,
      expected: observedSignalPresentCount
    });
  }
  if (summary.captureCount !== observedCaptureCount) {
    addFailure(failures, "summary", "capture summary count does not match existing capture files", {
      observed: summary.captureCount,
      expected: observedCaptureCount
    });
  }
  return failures;
}

function firstSignalResult(value) {
  return value.results.find((result) => result.expectedSignal === true);
}

const CONTROL_CASES = Object.freeze([
  {
    id: "silent-required-audio-fixture",
    expectedSurface: "audio-features",
    degrade(value) {
      const result = firstSignalResult(value);
      result.audioEvidence.features.rms = 0;
      result.audioEvidence.features.peak = 0;
      result.audioEvidence.features.postInputTailPeak = 0;
      return value;
    }
  },
  {
    id: "missing-capture",
    expectedSurface: "capture",
    degrade(value) {
      const result = firstSignalResult(value);
      result.capturePath = resolve(DEFAULT_EVIDENCE_ROOT, "missing-capture.wav");
      return value;
    }
  },
  {
    id: "stale-capture-evidence",
    expectedSurface: "freshness",
    degrade(value) {
      value.completedAt = "2000-01-01T00:00:00.000Z";
      return value;
    }
  },
  {
    id: "unsupported-midi-counted-as-audio",
    expectedSurface: "unsupported-runtime",
    degrade(value) {
      const result = clone(firstSignalResult(value));
      result.id = "unsupported-midi-negative-control";
      result.audioEvidence.unsupportedModules = [{ idx: 99, typeIdx: 20, typeName: "MIDI Note In" }];
      value.results.push(result);
      value.summary.signalPresentCount += 1;
      value.summary.patchCount += 1;
      value.summary.captureCount += 1;
      return value;
    }
  },
  {
    id: "classified-only-counted-as-signal",
    expectedSurface: "classification",
    degrade(value) {
      const result = firstSignalResult(value);
      result.status = "classified";
      result.classification = "signal-present";
      return value;
    }
  }
]);

async function main() {
  const { sourcePath, resultPath, evidenceRoot } = parseArgs(process.argv.slice(2));
  if (!existsSync(sourcePath)) throw new Error(`Source runtime audio evidence is missing: ${sourcePath}`);
  await mkdir(evidenceRoot, { recursive: true });
  const source = await readJson(sourcePath);
  const nowMs = Date.now();
  const sourceFailures = validateRuntimeAudioEvidence(source, nowMs);
  const controls = [];
  for (const testCase of CONTROL_CASES) {
    const degraded = testCase.degrade(clone(source));
    degraded.negativeControl = true;
    degraded.negativeControlId = testCase.id;
    degraded.completedAt = testCase.id === "stale-capture-evidence" ? degraded.completedAt : nowIso();
    const degradedPath = resolve(evidenceRoot, `${testCase.id}.json`);
    await writeJson(degradedPath, degraded);
    const failures = validateRuntimeAudioEvidence(degraded, nowMs);
    const expectedFailureFound = failures.some((failure) => failure.surface === testCase.expectedSurface);
    controls.push({
      id: testCase.id,
      status: expectedFailureFound ? PASS_STATUS : FAIL_STATUS,
      expectedSurface: testCase.expectedSurface,
      expectedFailureFound,
      degradedPath,
      failureSurfaces: failures.map((failure) => failure.surface),
      failures
    });
  }
  const assertionFailures = [];
  if (sourceFailures.length > 0) {
    addFailure(assertionFailures, "source-evidence", "source runtime audio evidence did not satisfy baseline validator", sourceFailures);
  }
  if (controls.some((control) => control.status !== PASS_STATUS)) {
    addFailure(assertionFailures, "negative-control", "one or more runtime audio negative controls did not fail on the expected surface", controls);
  }
  const result = {
    schemaVersion: "zoia.generated-patch-runtime-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: "npm run zoia:generate:patch:runtime-negative-controls",
    startedAt: nowIso(),
    completedAt: nowIso(),
    sourcePath,
    summary: {
      blockerCount: assertionFailures.length,
      controlCount: controls.length,
      passingControlCount: controls.filter((control) => control.status === PASS_STATUS).length,
      seededFailureCount: controls.length,
      expectedFailureFoundCount: controls.filter((control) => control.expectedFailureFound).length
    },
    controls,
    assertionFailures,
    claimBoundaries: {
      runtimeAudioNegativeControlsClaim: assertionFailures.length === 0,
      notAudioRuntimeSuccessEvidence: true,
      notMusicalQualityEvidence: true,
      notHardwareParityEvidence: true,
      notCompletePatchSemanticsEvidence: true
    },
    evidencePaths: {
      resultPath,
      evidenceRoot
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    blockerCount: result.summary.blockerCount,
    controlCount: result.summary.controlCount,
    passingControlCount: result.summary.passingControlCount,
    expectedFailureFoundCount: result.summary.expectedFailureFoundCount,
    resultPath
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
