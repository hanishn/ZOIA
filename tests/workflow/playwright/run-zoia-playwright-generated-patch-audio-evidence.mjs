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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-audio");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-audio";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 1.25;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const IMPULSE_AMPLITUDE = 0.75;
const MIN_RMS = 0.0005;
const MIN_PEAK = 0.05;
const MIN_POST_INPUT_TAIL_PEAK = 0.01;
const MAX_SILENCE_RMS = 0.000001;
const MAX_SILENCE_PEAK = 0.000001;
const DELAY_WINDOW_RADIUS_SECONDS = 0.025;
const POST_INPUT_TAIL_START_SECONDS = 0.05;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const CLASSIFIED_STATUS = "classified";

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let patchRoot = DEFAULT_PATCH_ROOT;
  let resultPath = DEFAULT_RESULT_PATH;
  let includeNegativeControls = true;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--patch-root") {
      patchRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--no-negative-controls") {
      includeNegativeControls = false;
    }
  }
  return { patchRoot, resultPath, evidenceRoot: dirname(resultPath), includeNegativeControls };
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
  const { patchRoot, resultPath, evidenceRoot, includeNegativeControls } = parseArgs(process.argv.slice(2));
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(patchRoot)) throw new Error(`Generated emulator patch root not found: ${patchRoot}`);

  await rm(evidenceRoot, { recursive: true, force: true });
  await mkdir(resolve(evidenceRoot, "captures"), { recursive: true });

  const patchFiles = (await readdir(patchRoot)).filter((name) => name.endsWith(".patch.json")).sort();
  if (patchFiles.length === 0) throw new Error(`No .patch.json files found in ${patchRoot}`);
  const patches = [];
  for (const fileName of patchFiles) {
    const patchPath = join(patchRoot, fileName);
    patches.push({ id: fileName.replace(/\.patch\.json$/, ""), patchPath, patch: await readJson(patchPath), expectSignal: true });
  }

  const silentNegativePatch = {
    id: "silent-negative-control",
    patchPath: resolve(evidenceRoot, "silent-negative-control.patch.json"),
    expectSignal: false,
    patch: {
      schemaVersion: "zoia.emulator-patch-from-generated-graph.v1",
      sourcePatchId: "negative-silent-generated-patch",
      name: "Silent Negative Control",
      moduleCount: 2,
      modules: [
        {
          idx: 0,
          typeIdx: 1,
          page: 0,
          colorId: 5,
          gridPos: 0,
          name: "audio-in-1",
          typeName: "Audio Input",
          blocks: [{ n: "Output", t: "audio_out" }],
          blockCount: 1,
          category: "Interface",
          params: [],
          options: [0,0,0,0,0,0,0,0],
          paramCount: 1
        },
        {
          idx: 1,
          typeIdx: 2,
          page: 0,
          colorId: 5,
          gridPos: 7,
          name: "audio-out-1",
          typeName: "Audio Output",
          blocks: [{ n: "Input", t: "audio_in" }, { n: "Gain", t: "cv_in" }],
          blockCount: 2,
          category: "Interface",
          params: [0, 65535],
          options: [0,0,0,0,0,0,0,0],
          paramCount: 2
        }
      ],
      connections: [],
      pages: ["Generated"],
      labels: ["generated", "negative-control"],
      description: "Negative control: audio input and output exist but no route connects them."
    }
  };
  if (includeNegativeControls) {
    await writeJson(silentNegativePatch.patchPath, silentNegativePatch.patch);
    patches.push(silentNegativePatch);
  }

  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() }));
  page.on("pageerror", (error) => pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null }));

  const startedAt = nowIso();
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.sim && window.ZOIA.MODULE_DB), null, { timeout: 15000 });

  const renderResults = [];
  for (const entry of patches) {
    const renderResult = await page.evaluate(async ({ patch, settings }) => {
      function features(samples, sampleRate, expectedDelaySeconds) {
        var nonZeroEpsilon = 0.000001;
        var sumSquares = 0;
        var peak = 0;
        var zeroCrossings = 0;
        var nonZeroFrameCount = 0;
        var firstNonZeroIndex = null;
        var lastNonZeroIndex = null;
        var previous = samples[0] || 0;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          var abs = Math.abs(sample);
          if (abs > peak) peak = abs;
          if (abs > nonZeroEpsilon) {
            nonZeroFrameCount++;
            if (firstNonZeroIndex === null) firstNonZeroIndex = i;
            lastNonZeroIndex = i;
          }
          if ((previous < 0 && sample >= 0) || (previous >= 0 && sample < 0)) zeroCrossings++;
          previous = sample;
        }
        var delayedCenter = expectedDelaySeconds === null ? null : Math.round(expectedDelaySeconds * sampleRate);
        var windowRadius = Math.round(settings.delayWindowRadiusSeconds * sampleRate);
        var delayedWindowPeak = 0;
        var delayedWindowStart = null;
        var delayedWindowEnd = null;
        if (delayedCenter !== null) {
          delayedWindowStart = Math.max(0, delayedCenter - windowRadius);
          delayedWindowEnd = Math.min(samples.length - 1, delayedCenter + windowRadius);
          for (var d = delayedWindowStart; d <= delayedWindowEnd; d++) {
            var delayedAbs = Math.abs(samples[d]);
            if (delayedAbs > delayedWindowPeak) delayedWindowPeak = delayedAbs;
          }
        }
        var postInputTailStart = Math.round(settings.postInputTailStartSeconds * sampleRate);
        var postInputTailPeak = 0;
        var postInputTailPeakIndex = null;
        for (var tail = postInputTailStart; tail < samples.length; tail++) {
          var tailAbs = Math.abs(samples[tail]);
          if (tailAbs > postInputTailPeak) {
            postInputTailPeak = tailAbs;
            postInputTailPeakIndex = tail;
          }
        }
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          zeroCrossings: zeroCrossings,
          nonZeroFrameCount: nonZeroFrameCount,
          firstNonZeroIndex: firstNonZeroIndex,
          lastNonZeroIndex: lastNonZeroIndex,
          expectedDelaySeconds: expectedDelaySeconds,
          delayedWindowStart: delayedWindowStart,
          delayedWindowEnd: delayedWindowEnd,
          delayedWindowPeak: delayedWindowPeak,
          postInputTailStart: postInputTailStart,
          postInputTailPeak: postInputTailPeak,
          postInputTailPeakIndex: postInputTailPeakIndex,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      function findDelaySeconds(patch) {
        for (var i = 0; i < patch.modules.length; i++) {
          var mod = patch.modules[i];
          if (mod.typeIdx !== 13 && mod.typeIdx !== 85 && mod.typeIdx !== 86) continue;
          var timeIndex = null;
          for (var b = 0; b < mod.blocks.length; b++) {
            var block = mod.blocks[b];
            if (block && block.t === 'cv_in' && String(block.n || '').toLowerCase().indexOf('time') >= 0) {
              timeIndex = b;
              break;
            }
          }
          if (timeIndex !== null && mod.params && mod.params[timeIndex] !== undefined) {
            return 0.005 + (mod.params[timeIndex] / 65535) * 1.5;
          }
        }
        return null;
      }

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

      if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') {
        return { offlineAudioSupported: false, samples: [] };
      }
      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var ctx = new OAC(1, settings.frameCount, settings.sampleRate);
      var nodes = [];
      var stimulusEvents = [];
      var wiringEvents = [];
      var unsupportedModules = [];
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
          stimulusEvents.push({
            moduleIndex: ai,
            outputBlock: outputIndex,
            stimulus: 'single-sample-impulse',
            amplitude: settings.impulseAmplitude
          });
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
          wiringEvents.push({
            connectionIndex: c,
            srcMod: connection.srcMod,
            srcBlock: connection.srcBlock,
            dstMod: connection.dstMod,
            dstBlock: connection.dstBlock,
            strength: strength,
            connected: Boolean(targetConnected)
          });
        } else {
          wiringEvents.push({
            connectionIndex: c,
            srcMod: connection.srcMod,
            srcBlock: connection.srcBlock,
            dstMod: connection.dstMod,
            dstBlock: connection.dstBlock,
            strength: strength,
            connected: false
          });
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
      var expectedDelaySeconds = findDelaySeconds(patch);
      for (var n = 0; n < nodes.length; n++) {
        if (nodes[n] && nodes[n].dispose) nodes[n].dispose();
      }

      return {
        offlineAudioSupported: true,
        patchName: patch.name,
        sourcePatchId: patch.sourcePatchId || null,
        expectedDelaySeconds: expectedDelaySeconds,
        unsupportedModules: unsupportedModules,
        stimulusEvents: stimulusEvents,
        wiringEvents: wiringEvents,
        destinationConnections: destinationConnections,
        features: features(samples, settings.sampleRate, expectedDelaySeconds),
        samples: samples
      };
    }, {
      patch: entry.patch,
      settings: {
        sampleRate: SAMPLE_RATE,
        frameCount: FRAME_COUNT,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        delayWindowRadiusSeconds: DELAY_WINDOW_RADIUS_SECONDS,
        postInputTailStartSeconds: POST_INPUT_TAIL_START_SECONDS
      }
    });

    const samples = renderResult.samples || [];
    delete renderResult.samples;
    const capturePath = resolve(evidenceRoot, "captures", `${entry.id}.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));

    const failures = [];
    assertCondition(failures, renderResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", renderResult);
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "generated patch has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "impulse stimulus was not connected to any Audio Input output", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to OfflineAudioContext destination", renderResult);

    let classification = "signal-present";
    if (entry.expectSignal) {
      assertCondition(failures, renderResult.features.rms >= MIN_RMS, "audio-signal", "generated patch RMS is below threshold", { observed: renderResult.features.rms, threshold: MIN_RMS });
      assertCondition(failures, renderResult.features.peak >= MIN_PEAK, "audio-signal", "generated patch peak is below threshold", { observed: renderResult.features.peak, threshold: MIN_PEAK });
      assertCondition(failures, renderResult.features.postInputTailPeak >= MIN_POST_INPUT_TAIL_PEAK, "audio-delay-tail", "generated delay patch has no post-input tail peak above threshold", {
        observed: renderResult.features.postInputTailPeak,
        threshold: MIN_POST_INPUT_TAIL_PEAK,
        postInputTailStart: renderResult.features.postInputTailStart,
        postInputTailPeakIndex: renderResult.features.postInputTailPeakIndex,
        expectedDelaySeconds: renderResult.features.expectedDelaySeconds,
        delayedWindowStart: renderResult.features.delayedWindowStart,
        delayedWindowEnd: renderResult.features.delayedWindowEnd,
        delayedWindowPeak: renderResult.features.delayedWindowPeak
      });
      if (failures.length > 0) classification = "required-audio-not-proven";
    } else {
      const isSilent = renderResult.features.rms <= MAX_SILENCE_RMS && renderResult.features.peak <= MAX_SILENCE_PEAK;
      assertCondition(failures, isSilent, "audio-negative-control", "silent negative control produced measurable output", {
        observedRms: renderResult.features.rms,
        maxSilenceRms: MAX_SILENCE_RMS,
        observedPeak: renderResult.features.peak,
        maxSilencePeak: MAX_SILENCE_PEAK
      });
      classification = isSilent ? "expected-silence-classified" : "unexpected-signal";
    }

    const record = {
      id: entry.id,
      status: failures.length === 0 ? (entry.expectSignal ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
      classification,
      expectedSignal: entry.expectSignal,
      patchPath: entry.patchPath,
      capturePath,
      assertionFailures: failures,
      audioEvidence: renderResult
    };
    await writeJson(resolve(evidenceRoot, `${entry.id}.json`), record);
    renderResults.push(record);
  }

  await browser.close();

  const positiveResults = renderResults.filter((result) => result.expectedSignal);
  const negativeResults = renderResults.filter((result) => !result.expectedSignal);
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, positiveResults.every((result) => result.status === PASS_STATUS), "audio-positive", "one or more generated patches did not prove required audio", positiveResults);
  if (includeNegativeControls) {
    assertCondition(assertionFailures, negativeResults.some((result) => result.classification === "expected-silence-classified"), "audio-negative-control", "silent negative control did not classify silence", negativeResults);
  }

  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-audio-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      frameCount: FRAME_COUNT,
      channelCount: 1
    },
    stimulus: {
      kind: "single-sample-impulse",
      amplitude: IMPULSE_AMPLITUDE,
      routedTo: "all Audio Input audio_out blocks"
    },
    thresholds: {
      minRms: MIN_RMS,
      minPeak: MIN_PEAK,
      minPostInputTailPeak: MIN_POST_INPUT_TAIL_PEAK,
      maxSilenceRms: MAX_SILENCE_RMS,
      maxSilencePeak: MAX_SILENCE_PEAK,
      delayWindowRadiusSeconds: DELAY_WINDOW_RADIUS_SECONDS,
      postInputTailStartSeconds: POST_INPUT_TAIL_START_SECONDS
    },
    negativeControls: {
      silentPatchIncluded: includeNegativeControls,
      expectedClassification: "expected-silence-classified"
    }
  };

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-audio-classification-log.v1",
    generatedAt: nowIso(),
    classifications: renderResults.map((result) => ({
      id: result.id,
      patchPath: result.patchPath,
      status: result.status,
      classification: result.classification,
      expectedSignal: result.expectedSignal,
      rms: result.audioEvidence.features?.rms ?? null,
      peak: result.audioEvidence.features?.peak ?? null,
      delayedWindowPeak: result.audioEvidence.features?.delayedWindowPeak ?? null,
      postInputTailPeak: result.audioEvidence.features?.postInputTailPeak ?? null,
      postInputTailPeakIndex: result.audioEvidence.features?.postInputTailPeakIndex ?? null,
      capturePath: result.capturePath,
      assertionFailureCount: result.assertionFailures.length
    }))
  };

  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const completedAt = nowIso();
  const result = {
    schemaVersion: "zoia.generated-patch-audio-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    command: COMMAND,
    startedAt,
    completedAt,
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
      patchCount: positiveResults.length,
      signalPresentCount: positiveResults.filter((item) => item.status === PASS_STATUS).length,
      classifiedSilenceCount: negativeResults.filter((item) => item.classification === "expected-silence-classified").length,
      captureCount: renderResults.length
    },
    assertionFailures,
    results: renderResults,
    artifacts: {
      resultPath,
      stimulusManifestPath: resolve(evidenceRoot, "stimulus-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json"),
      consoleLogPath: resolve(evidenceRoot, "console.json"),
      pageErrorsPath: resolve(evidenceRoot, "page-errors.json"),
      captureRoot: resolve(evidenceRoot, "captures")
    },
    claimBoundaries: {
      generatedPatchAudioSignalPresentClaim: assertionFailures.length === 0,
      deterministicImpulseStimulusClaim: true,
      measuredRmsPeakAndPostInputTailClaim: true,
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
    schemaVersion: "zoia.generated-patch-audio-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    artifacts: {
      resultPath,
      evidenceRoot
    },
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
