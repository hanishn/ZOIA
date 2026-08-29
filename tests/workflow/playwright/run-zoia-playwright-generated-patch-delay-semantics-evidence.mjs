#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");
const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "products", "zoia", "index.html");
const DEFAULT_PATCH_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/manual-test-emulator");
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-delay-semantics");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-delay-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 0.5;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const IMPULSE_AMPLITUDE = 0.75;
const SEMANTIC_DELAY_SECONDS = 0.1;
const SEMANTIC_FEEDBACK = 0;
const SEMANTIC_MIX = 1;
const DELAY_WINDOW_RADIUS_SECONDS = 0.004;
const IMMEDIATE_WINDOW_SECONDS = 0.02;
const MIN_DELAYED_WINDOW_PEAK = 0.2;
const MAX_IMMEDIATE_WINDOW_PEAK = 0.000001;
const MIN_RMS = 0.0005;
const MAX_SILENCE_RMS = 0.000001;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const CLASSIFIED_STATUS = "classified";

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let patchRoot = DEFAULT_PATCH_ROOT;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--patch-root") {
      patchRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return { patchRoot, resultPath, evidenceRoot: dirname(resultPath) };
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function assertCondition(failures, condition, surface, message, evidence = null) {
  if (condition) return;
  failures.push({ surface, message, evidence });
}

function toParam(normalized) {
  return Math.max(0, Math.min(65535, Math.round(normalized * 65535)));
}

function delaySecondsToParam(seconds) {
  return toParam((seconds - 0.005) / 1.5);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isGeneratedDelayLineModule(module) {
  return module && module.typeName === "Delay Line";
}

function makeDeterministicDelayPatch(patch) {
  const derived = clone(patch);
  derived.name = `${patch.name} Delay Semantics`;
  derived.labels = Array.from(new Set([...(derived.labels || []), "delay-semantics"]));
  derived.description = `${derived.description || ""} Deterministic delay-semantics fixture: generated modulation/control connections are disconnected, delay time is fixed, feedback is disabled, and mix is wet-only.`.trim();
  const delayModule = derived.modules.find((module) => isGeneratedDelayLineModule(module));
  if (!delayModule) return { patch: derived, problem: "generated-delay-line-module-missing" };
  for (let blockIndex = 0; blockIndex < delayModule.blocks.length; blockIndex += 1) {
    const block = delayModule.blocks[blockIndex];
    const name = String(block?.n || "").toLowerCase();
    if (name.includes("time")) delayModule.params[blockIndex] = delaySecondsToParam(SEMANTIC_DELAY_SECONDS);
    if (name.includes("feed")) delayModule.params[blockIndex] = toParam(SEMANTIC_FEEDBACK);
    if (name.includes("mix")) delayModule.params[blockIndex] = toParam(SEMANTIC_MIX);
  }
  const delayIndex = delayModule.idx;
  derived.connections = derived.connections.filter((connection) => {
    if (connection.dstMod !== delayIndex) return true;
    const block = delayModule.blocks[connection.dstBlock];
    return block && block.t === "audio_in";
  });
  return { patch: derived, problem: null };
}

function makeBypassedDelayPatch(patch) {
  const derived = clone(patch);
  derived.name = `${patch.name} Bypassed Delay Negative`;
  derived.labels = Array.from(new Set([...(derived.labels || []), "delay-semantics-negative-control"]));
  derived.description = "Negative control: generated patch lineage retained, but audio input is routed directly to output and delay module output is bypassed.";
  const audioInput = derived.modules.find((module) => module.typeIdx === 1);
  const audioOutput = derived.modules.find((module) => module.typeIdx === 2);
  if (!audioInput || !audioOutput) return { patch: derived, problem: "audio-io-missing" };
  const inputOutBlock = audioInput.blocks.findIndex((block) => block.t === "audio_out");
  const outputInBlock = audioOutput.blocks.findIndex((block) => block.t === "audio_in");
  derived.connections = [{
    srcMod: audioInput.idx,
    srcBlock: inputOutBlock,
    dstMod: audioOutput.idx,
    dstBlock: outputInBlock,
    strength: 10000
  }];
  return { patch: derived, problem: null };
}

function wavBufferFromSamples(samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * 2);
  }
  return buffer;
}

async function main() {
  const { patchRoot, resultPath, evidenceRoot } = parseArgs(process.argv.slice(2));
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(patchRoot)) throw new Error(`Generated emulator patch root not found: ${patchRoot}`);

  await rm(evidenceRoot, { recursive: true, force: true });
  await mkdir(resolve(evidenceRoot, "captures"), { recursive: true });
  await mkdir(resolve(evidenceRoot, "fixtures"), { recursive: true });

  const patchFiles = (await readdir(patchRoot)).filter((name) => name.endsWith(".patch.json")).sort();
  if (patchFiles.length === 0) throw new Error(`No .patch.json files found in ${patchRoot}`);

  const fixtures = [];
  for (const fileName of patchFiles) {
    const patchPath = join(patchRoot, fileName);
    const sourcePatch = await readJson(patchPath);
    const positive = makeDeterministicDelayPatch(sourcePatch);
    const positivePath = resolve(evidenceRoot, "fixtures", fileName.replace(/\.patch\.json$/, ".delay-semantics.patch.json"));
    await writeJson(positivePath, positive.patch);
    fixtures.push({
      id: fileName.replace(/\.patch\.json$/, ""),
      kind: "delay-semantics",
      sourcePatchPath: patchPath,
      patchPath: positivePath,
      patch: positive.patch,
      expectedClassification: "delay-window-present",
      expectedSignal: true,
      expectedDelaySemantics: true,
      derivationProblem: positive.problem
    });
  }

  const negativeSource = await readJson(join(patchRoot, patchFiles[0]));
  const negative = makeBypassedDelayPatch(negativeSource);
  const negativePath = resolve(evidenceRoot, "fixtures", "bypassed-delay-negative.patch.json");
  await writeJson(negativePath, negative.patch);
  fixtures.push({
    id: "bypassed-delay-negative",
    kind: "bypassed-delay-negative-control",
    sourcePatchPath: join(patchRoot, patchFiles[0]),
    patchPath: negativePath,
    patch: negative.patch,
    expectedClassification: "bypassed-delay-classified",
    expectedSignal: true,
    expectedDelaySemantics: false,
    derivationProblem: negative.problem
  });

  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() }));
  page.on("pageerror", (error) => pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null }));

  const startedAt = nowIso();
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.sim && window.ZOIA.MODULE_DB), null, { timeout: 15000 });

  const records = [];
  for (const fixture of fixtures) {
    const renderResult = await page.evaluate(async ({ patch, settings }) => {
      function makeImpulse(ctx) {
        var buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        buffer.getChannelData(0)[0] = settings.impulseAmplitude;
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.start(0);
        return source;
      }

      function connectIfPossible(source, target) {
        if (!source || !target || typeof source.connect !== 'function') return false;
        try {
          source.connect(target);
          return true;
        } catch (error) {
          return false;
        }
      }

      function peakInWindow(samples, start, end) {
        var peak = 0;
        var peakIndex = null;
        for (var i = Math.max(0, start); i <= Math.min(samples.length - 1, end); i++) {
          var abs = Math.abs(samples[i]);
          if (abs > peak) {
            peak = abs;
            peakIndex = i;
          }
        }
        return { peak: peak, peakIndex: peakIndex, start: Math.max(0, start), end: Math.min(samples.length - 1, end) };
      }

      function features(samples) {
        var sumSquares = 0;
        var peak = 0;
        var peakIndex = null;
        var nonZeroFrameCount = 0;
        var firstNonZeroIndex = null;
        var lastNonZeroIndex = null;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          var abs = Math.abs(sample);
          if (abs > peak) {
            peak = abs;
            peakIndex = i;
          }
          if (abs > 0.000001) {
            nonZeroFrameCount++;
            if (firstNonZeroIndex === null) firstNonZeroIndex = i;
            lastNonZeroIndex = i;
          }
        }
        var immediateEnd = Math.round(settings.immediateWindowSeconds * settings.sampleRate);
        var delayCenter = Math.round(settings.semanticDelaySeconds * settings.sampleRate);
        var delayRadius = Math.round(settings.delayWindowRadiusSeconds * settings.sampleRate);
        var immediate = peakInWindow(samples, 0, immediateEnd);
        var delayed = peakInWindow(samples, delayCenter - delayRadius, delayCenter + delayRadius);
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          peakIndex: peakIndex,
          nonZeroFrameCount: nonZeroFrameCount,
          firstNonZeroIndex: firstNonZeroIndex,
          lastNonZeroIndex: lastNonZeroIndex,
          immediateWindowPeak: immediate.peak,
          immediateWindowPeakIndex: immediate.peakIndex,
          immediateWindowStart: immediate.start,
          immediateWindowEnd: immediate.end,
          delayedWindowPeak: delayed.peak,
          delayedWindowPeakIndex: delayed.peakIndex,
          delayedWindowStart: delayed.start,
          delayedWindowEnd: delayed.end,
          expectedDelaySeconds: settings.semanticDelaySeconds,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') {
        return { offlineAudioSupported: false, samples: [] };
      }
      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var ctx = new OAC(1, settings.frameCount, settings.sampleRate);
      var nodes = [];
      var unsupportedModules = [];
      var stimulusEvents = [];
      var wiringEvents = [];
      var destinationConnections = 0;

      for (var m = 0; m < patch.modules.length; m++) {
        var module = patch.modules[m];
        var factory = ZOIA.sim._moduleFactories[module.typeIdx];
        if (!factory) {
          unsupportedModules.push({ idx: module.idx, typeIdx: module.typeIdx, typeName: module.typeName });
          nodes[m] = null;
          continue;
        }
        nodes[m] = factory(ctx, module);
      }

      for (var ai = 0; ai < nodes.length; ai++) {
        var audioInputNode = nodes[ai];
        if (!audioInputNode || audioInputNode.type !== 'audio_input') continue;
        for (var outputIndex = 0; outputIndex < audioInputNode.outputs.length; outputIndex++) {
          var output = audioInputNode.outputs[outputIndex];
          if (!output) continue;
          var impulse = makeImpulse(ctx);
          impulse.connect(output);
          stimulusEvents.push({ moduleIndex: ai, outputBlock: outputIndex, stimulus: 'single-sample-impulse', amplitude: settings.impulseAmplitude });
        }
      }

      for (var c = 0; c < patch.connections.length; c++) {
        var connection = patch.connections[c];
        var srcNode = nodes[connection.srcMod];
        var dstNode = nodes[connection.dstMod];
        var srcOut = srcNode && srcNode.outputs ? srcNode.outputs[connection.srcBlock] : null;
        var dstIn = dstNode && dstNode.inputs ? dstNode.inputs[connection.dstBlock] : null;
        var strength = (connection.strength !== undefined ? connection.strength : 10000) / 10000;
        if (srcOut && dstIn) {
          var gain = ctx.createGain();
          gain.gain.value = strength;
          var sourceConnected = connectIfPossible(srcOut, gain);
          var targetConnected = sourceConnected && connectIfPossible(gain, dstIn);
          wiringEvents.push({ connectionIndex: c, connected: Boolean(targetConnected), srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength: strength });
        } else {
          wiringEvents.push({ connectionIndex: c, connected: false, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength: strength });
        }
      }

      for (var out = 0; out < nodes.length; out++) {
        var node = nodes[out];
        if (node && node.type === 'audio_output' && node._outGain) {
          node._outGain.connect(ctx.destination);
          destinationConnections++;
        }
      }

      var rendered = await ctx.startRendering();
      var samples = Array.from(rendered.getChannelData(0));
      for (var n = 0; n < nodes.length; n++) {
        if (nodes[n] && nodes[n].dispose) nodes[n].dispose();
      }
      return {
        offlineAudioSupported: true,
        patchName: patch.name,
        unsupportedModules: unsupportedModules,
        stimulusEvents: stimulusEvents,
        wiringEvents: wiringEvents,
        destinationConnections: destinationConnections,
        features: features(samples),
        samples: samples
      };
    }, {
      patch: fixture.patch,
      settings: {
        sampleRate: SAMPLE_RATE,
        frameCount: FRAME_COUNT,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        semanticDelaySeconds: SEMANTIC_DELAY_SECONDS,
        delayWindowRadiusSeconds: DELAY_WINDOW_RADIUS_SECONDS,
        immediateWindowSeconds: IMMEDIATE_WINDOW_SECONDS
      }
    });

    const samples = renderResult.samples || [];
    delete renderResult.samples;
    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));

    const failures = [];
    assertCondition(failures, !fixture.derivationProblem, "fixture-derivation", "deterministic delay fixture could not be derived", fixture.derivationProblem);
    assertCondition(failures, renderResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", renderResult);
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "impulse stimulus was not connected", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to destination", renderResult);
    assertCondition(failures, renderResult.features.rms >= MIN_RMS, "audio-signal", "fixture did not produce measurable signal", { observed: renderResult.features.rms, threshold: MIN_RMS });

    let classification = "delay-window-present";
    if (fixture.expectedDelaySemantics) {
      assertCondition(failures, renderResult.features.immediateWindowPeak <= MAX_IMMEDIATE_WINDOW_PEAK, "delay-semantics", "deterministic wet-only delay fixture leaked immediate impulse above threshold", {
        observed: renderResult.features.immediateWindowPeak,
        threshold: MAX_IMMEDIATE_WINDOW_PEAK,
        immediateWindowStart: renderResult.features.immediateWindowStart,
        immediateWindowEnd: renderResult.features.immediateWindowEnd
      });
      assertCondition(failures, renderResult.features.delayedWindowPeak >= MIN_DELAYED_WINDOW_PEAK, "delay-semantics", "deterministic delay fixture did not produce expected delayed-window peak", {
        observed: renderResult.features.delayedWindowPeak,
        threshold: MIN_DELAYED_WINDOW_PEAK,
        delayedWindowStart: renderResult.features.delayedWindowStart,
        delayedWindowEnd: renderResult.features.delayedWindowEnd,
        expectedDelaySeconds: SEMANTIC_DELAY_SECONDS
      });
      if (failures.length > 0) classification = "delay-window-not-proven";
    } else {
      const bypassed = renderResult.features.immediateWindowPeak > MIN_DELAYED_WINDOW_PEAK && renderResult.features.delayedWindowPeak <= MAX_SILENCE_RMS;
      assertCondition(failures, bypassed, "delay-negative-control", "bypassed-delay negative control did not produce immediate-only signal", {
        immediateWindowPeak: renderResult.features.immediateWindowPeak,
        delayedWindowPeak: renderResult.features.delayedWindowPeak,
        maxDelayedWindowPeakForBypass: MAX_SILENCE_RMS
      });
      classification = bypassed ? "bypassed-delay-classified" : "bypassed-delay-control-failed";
    }

    const record = {
      id: fixture.id,
      kind: fixture.kind,
      status: failures.length === 0 ? (fixture.expectedDelaySemantics ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
      classification,
      expectedClassification: fixture.expectedClassification,
      sourcePatchPath: fixture.sourcePatchPath,
      patchPath: fixture.patchPath,
      capturePath,
      assertionFailures: failures,
      audioEvidence: renderResult
    };
    await writeJson(resolve(evidenceRoot, `${fixture.id}.json`), record);
    records.push(record);
  }

  await browser.close();

  const positiveRecords = records.filter((record) => record.kind === "delay-semantics");
  const negativeRecords = records.filter((record) => record.kind === "bypassed-delay-negative-control");
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, positiveRecords.every((record) => record.status === PASS_STATUS), "delay-semantics", "one or more deterministic generated delay fixtures did not prove delayed-window behavior", positiveRecords);
  assertCondition(assertionFailures, negativeRecords.some((record) => record.classification === "bypassed-delay-classified"), "delay-negative-control", "bypassed-delay negative control did not classify as bypassed", negativeRecords);

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-delay-semantics-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      kind: record.kind,
      status: record.status,
      classification: record.classification,
      patchPath: record.patchPath,
      capturePath: record.capturePath,
      rms: record.audioEvidence.features?.rms ?? null,
      immediateWindowPeak: record.audioEvidence.features?.immediateWindowPeak ?? null,
      delayedWindowPeak: record.audioEvidence.features?.delayedWindowPeak ?? null,
      delayedWindowPeakIndex: record.audioEvidence.features?.delayedWindowPeakIndex ?? null,
      assertionFailureCount: record.assertionFailures.length
    }))
  };
  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-delay-semantics-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      frameCount: FRAME_COUNT,
      channelCount: 1
    },
    deterministicFixtureBoundary: {
      source: "generated delay-path emulator patch JSON",
      transformation: "disconnect generated CV/control modulation into Delay Line; set delay time to 100 ms; set feedback to 0; set mix to wet-only",
      generatedPatchIdentityPreserved: true,
      modulationSemanticsClaim: false
    },
    stimulus: {
      kind: "single-sample-impulse",
      amplitude: IMPULSE_AMPLITUDE,
      routedTo: "all Audio Input audio_out blocks"
    },
    thresholds: {
      semanticDelaySeconds: SEMANTIC_DELAY_SECONDS,
      minRms: MIN_RMS,
      minDelayedWindowPeak: MIN_DELAYED_WINDOW_PEAK,
      maxImmediateWindowPeak: MAX_IMMEDIATE_WINDOW_PEAK,
      delayWindowRadiusSeconds: DELAY_WINDOW_RADIUS_SECONDS,
      immediateWindowSeconds: IMMEDIATE_WINDOW_SECONDS
    },
    negativeControls: {
      bypassedDelayIncluded: true,
      expectedClassification: "bypassed-delay-classified"
    }
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-delay-semantics-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: COMMAND,
    startedAt,
    completedAt: nowIso(),
    metadata: {
      cwd: PROJECT_ROOT,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      playwrightVersion: playwrightPackage.version,
      browserName: "chromium",
      browserChannel: EDGE_CHANNEL,
      browserVersion: browser.version(),
      viewport: VIEWPORT,
      simulatorHtmlPath: SIMULATOR_HTML,
      evidenceRoot
    },
    summary: {
      blockerCount: assertionFailures.length,
      patchCount: positiveRecords.length,
      delayWindowPresentCount: positiveRecords.filter((record) => record.status === PASS_STATUS).length,
      bypassedDelayClassifiedCount: negativeRecords.filter((record) => record.classification === "bypassed-delay-classified").length,
      captureCount: records.length
    },
    assertionFailures,
    results: records,
    artifacts: {
      resultPath,
      stimulusManifestPath: resolve(evidenceRoot, "stimulus-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json"),
      consoleLogPath: resolve(evidenceRoot, "console.json"),
      pageErrorsPath: resolve(evidenceRoot, "page-errors.json"),
      fixtureRoot: resolve(evidenceRoot, "fixtures"),
      captureRoot: resolve(evidenceRoot, "captures")
    },
    claimBoundaries: {
      generatedPatchDelayWindowClaim: assertionFailures.length === 0,
      deterministicDerivedFixtureClaim: true,
      generatedCvModulationNeutralized: true,
      generatedModulationSemanticsClaim: false,
      musicalQualityClaim: false,
      fullDspAccuracyClaim: false,
      hardwareParityClaim: false,
      completePatchSemanticsClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath,
    stimulusManifestPath: result.artifacts.stimulusManifestPath,
    classificationLogPath: result.artifacts.classificationLogPath,
    captureRoot: result.artifacts.captureRoot
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath, evidenceRoot } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-delay-semantics-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    artifacts: { resultPath, evidenceRoot },
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
