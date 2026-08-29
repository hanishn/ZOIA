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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-lfo-semantics");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-lfo-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const AUDIO_DURATION_SECONDS = 1.5;
const TRACE_DURATION_SECONDS = 1.2;
const IMPULSE_AMPLITUDE = 0.75;
const BASE_DELAY_SECONDS = 0.25;
const SEMANTIC_FEEDBACK = 0;
const SEMANTIC_MIX = 1;
const MIN_LFO_TRACE_RMS = 0.05;
const MAX_MUTED_LFO_TRACE_RMS = 0.000001;
const MIN_AUDIO_DIFF_RMS = 0.0001;
const MIN_PEAK_TIME_DELTA_SECONDS = 0.005;
const MIN_WINDOW_PEAK = 0.2;
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
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function findDelayModule(patch) {
  return patch.modules.find((module) => module.typeIdx === 13 || module.typeIdx === 85 || module.typeIdx === 86) || null;
}

function findAudioInputModule(patch) {
  return patch.modules.find((module) => module.typeIdx === 1) || null;
}

function findAudioOutputModule(patch) {
  return patch.modules.find((module) => module.typeIdx === 2) || null;
}

function blockIndexByNameAndType(module, type, needle) {
  return module.blocks.findIndex((block) => block.t === type && String(block.n || "").toLowerCase().includes(needle));
}

function setStableDelayParams(delayModule) {
  for (let blockIndex = 0; blockIndex < delayModule.blocks.length; blockIndex += 1) {
    const block = delayModule.blocks[blockIndex];
    const name = String(block?.n || "").toLowerCase();
    if (name.includes("time")) delayModule.params[blockIndex] = delaySecondsToParam(BASE_DELAY_SECONDS);
    if (name.includes("feed")) delayModule.params[blockIndex] = toParam(SEMANTIC_FEEDBACK);
    if (name.includes("mix")) delayModule.params[blockIndex] = toParam(SEMANTIC_MIX);
  }
}

function deriveFixture(sourcePatch, mode) {
  const patch = clone(sourcePatch);
  patch.name = `${sourcePatch.name} LFO Semantics ${mode}`;
  patch.labels = Array.from(new Set([...(patch.labels || []), "lfo-semantics", mode]));
  patch.description = `${patch.description || ""} Deterministic LFO-semantics fixture: generated LFO waveform remains in use; delay core is stabilized for measurement.`.trim();
  const delayModule = findDelayModule(patch);
  const audioInput = findAudioInputModule(patch);
  const audioOutput = findAudioOutputModule(patch);
  if (!delayModule || !audioInput || !audioOutput) return { patch, problem: "required-module-missing", route: null };

  setStableDelayParams(delayModule);
  const delayIndex = delayModule.idx;
  const audioInBlock = blockIndexByNameAndType(delayModule, "audio_in", "audio");
  const delayOutBlock = delayModule.blocks.findIndex((block) => block.t === "audio_out");
  const timeBlock = blockIndexByNameAndType(delayModule, "cv_in", "time");
  const feedbackBlock = blockIndexByNameAndType(delayModule, "cv_in", "feed");
  const audioInputOutBlock = audioInput.blocks.findIndex((block) => block.t === "audio_out");
  const audioOutputInBlock = audioOutput.blocks.findIndex((block) => block.t === "audio_in");
  const generatedTimeRoute = sourcePatch.connections.find((connection) => (
    connection.dstMod === delayIndex &&
    connection.dstBlock === timeBlock &&
    sourcePatch.modules[connection.srcMod]?.typeName === "LFO"
  )) || null;
  if (!generatedTimeRoute) return { patch, problem: "generated-lfo-time-route-missing", route: null };

  patch.connections = [
    { srcMod: audioInput.idx, srcBlock: audioInputOutBlock, dstMod: delayIndex, dstBlock: audioInBlock, strength: 10000 },
    { srcMod: delayIndex, srcBlock: delayOutBlock, dstMod: audioOutput.idx, dstBlock: audioOutputInBlock, strength: 10000 }
  ];

  if (mode === "positive-lfo-time-route" || mode === "muted-lfo-output") {
    patch.connections.push({
      srcMod: generatedTimeRoute.srcMod,
      srcBlock: generatedTimeRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: timeBlock,
      strength: generatedTimeRoute.strength ?? 10000
    });
  } else if (mode === "wrong-target-feedback") {
    patch.connections.push({
      srcMod: generatedTimeRoute.srcMod,
      srcBlock: generatedTimeRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: feedbackBlock,
      strength: generatedTimeRoute.strength ?? 10000
    });
  }

  const lfoModule = patch.modules[generatedTimeRoute.srcMod];
  return {
    patch,
    problem: null,
    route: {
      generatedSourceModuleId: lfoModule?.sourceGeneratedModuleId || null,
      generatedSourceTypeName: lfoModule?.typeName || null,
      generatedSourceBlock: generatedTimeRoute.srcBlock,
      generatedTargetModuleId: delayModule.sourceGeneratedModuleId || null,
      generatedTargetTypeName: delayModule.typeName,
      generatedTargetTimeBlock: timeBlock,
      generatedTargetFeedbackBlock: feedbackBlock,
      generatedStrength: generatedTimeRoute.strength ?? 10000,
      lfoRateParam: lfoModule?.params?.[0] ?? null,
      lfoDepthParam: lfoModule?.params?.[1] ?? null,
      expectedFrequencyHz: lfoModule?.params?.[0] !== undefined ? 0.01 + (lfoModule.params[0] / 65535) * 19.99 : null,
      expectedDepth: lfoModule?.params?.[1] !== undefined ? lfoModule.params[1] / 65535 : null,
      mode
    }
  };
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
  await mkdir(resolve(evidenceRoot, "traces"), { recursive: true });
  await mkdir(resolve(evidenceRoot, "fixtures"), { recursive: true });

  const patchFiles = (await readdir(patchRoot)).filter((name) => name.endsWith(".patch.json")).sort();
  if (patchFiles.length === 0) throw new Error(`No .patch.json files found in ${patchRoot}`);

  const fixtures = [];
  for (const fileName of patchFiles) {
    const sourcePatchPath = join(patchRoot, fileName);
    const sourcePatch = await readJson(sourcePatchPath);
    const baseId = fileName.replace(/\.patch\.json$/, "");
    for (const mode of ["disconnected-lfo-time-route", "positive-lfo-time-route", "muted-lfo-output", "wrong-target-feedback"]) {
      const derived = deriveFixture(sourcePatch, mode);
      const fixturePath = resolve(evidenceRoot, "fixtures", `${baseId}.${mode}.patch.json`);
      await writeJson(fixturePath, derived.patch);
      fixtures.push({
        id: `${baseId}-${mode}`,
        sourcePatchPath,
        patchPath: fixturePath,
        patch: derived.patch,
        mode,
        route: derived.route,
        derivationProblem: derived.problem,
        expectedClassification: mode === "positive-lfo-time-route" ? "lfo-waveform-shifts-delay-output" : mode === "disconnected-lfo-time-route" ? "lfo-route-disconnected-classified" : mode === "muted-lfo-output" ? "lfo-output-muted-classified" : "lfo-wrong-target-classified"
      });
    }
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

  const baselineByPatch = new Map();
  const records = [];
  for (const fixture of fixtures) {
    const renderResult = await page.evaluate(async ({ patch, fixture, settings }) => {
      function connectIfPossible(source, target) {
        if (!source || !target || typeof source.connect !== 'function') return false;
        try {
          source.connect(target);
          return true;
        } catch (error) {
          return false;
        }
      }

      function makeImpulse(ctx, when) {
        var buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        buffer.getChannelData(0)[0] = settings.impulseAmplitude;
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.start(when);
        return source;
      }

      function peakInWindow(samples, centerSeconds, radiusSeconds) {
        var center = Math.round(centerSeconds * settings.sampleRate);
        var radius = Math.round(radiusSeconds * settings.sampleRate);
        var start = Math.max(0, center - radius);
        var end = Math.min(samples.length - 1, center + radius);
        var peak = 0;
        var peakIndex = null;
        for (var i = start; i <= end; i++) {
          var abs = Math.abs(samples[i]);
          if (abs > peak) {
            peak = abs;
            peakIndex = i;
          }
        }
        return { peak: peak, peakIndex: peakIndex, start: start, end: end };
      }

      function sampleFeatures(samples) {
        var sumSquares = 0;
        var peak = 0;
        var peakIndex = null;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          var abs = Math.abs(sample);
          if (abs > peak) {
            peak = abs;
            peakIndex = i;
          }
        }
        var impulseWindows = settings.impulseTimes.map(function(impulseTime) {
          var center = impulseTime + settings.baseDelaySeconds;
          var window = peakInWindow(samples, center, 0.12);
          return {
            impulseTime: impulseTime,
            baselineCenterSeconds: center,
            peak: window.peak,
            peakIndex: window.peakIndex,
            peakSeconds: window.peakIndex === null ? null : window.peakIndex / settings.sampleRate,
            deltaFromBaselineSeconds: window.peakIndex === null ? null : (window.peakIndex / settings.sampleRate) - center,
            start: window.start,
            end: window.end
          };
        });
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          peakIndex: peakIndex,
          impulseWindows: impulseWindows,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      function traceFeatures(samples) {
        var sumSquares = 0;
        var peak = 0;
        var min = 0;
        var max = 0;
        var positiveCrossings = [];
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
          min = Math.min(min, sample);
          max = Math.max(max, sample);
          if (i > 0 && samples[i - 1] <= 0 && sample > 0) positiveCrossings.push(i);
        }
        var crossingPeriods = [];
        for (var c = 1; c < positiveCrossings.length; c++) {
          crossingPeriods.push((positiveCrossings[c] - positiveCrossings[c - 1]) / settings.sampleRate);
        }
        var averagePeriod = crossingPeriods.length > 0 ? crossingPeriods.reduce(function(a, b) { return a + b; }, 0) / crossingPeriods.length : null;
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          min: min,
          max: max,
          positiveCrossingCount: positiveCrossings.length,
          estimatedPeriodSeconds: averagePeriod,
          estimatedFrequencyHz: averagePeriod ? 1 / averagePeriod : null,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') {
        return { offlineAudioSupported: false, samples: [], traceSamples: [] };
      }

      function buildNodes(ctx) {
        window.ZOIA.state.patch = patch;
        var nodes = [];
        var unsupportedModules = [];
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
        if (fixture.mode === 'muted-lfo-output') {
          for (var n = 0; n < nodes.length; n++) {
            if (nodes[n] && nodes[n].type === 'lfo' && nodes[n]._outGain) nodes[n]._outGain.gain.value = 0;
          }
        }
        return { nodes: nodes, unsupportedModules: unsupportedModules };
      }

      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var traceCtx = new OAC(1, Math.round(settings.traceDurationSeconds * settings.sampleRate), settings.sampleRate);
      var traceBuild = buildNodes(traceCtx);
      var traceConnections = 0;
      for (var l = 0; l < traceBuild.nodes.length; l++) {
        var lfoNode = traceBuild.nodes[l];
        if (lfoNode && lfoNode.type === 'lfo' && lfoNode.outputs && lfoNode.outputs[fixture.route.generatedSourceBlock]) {
          lfoNode.outputs[fixture.route.generatedSourceBlock].connect(traceCtx.destination);
          traceConnections++;
        }
      }
      var traceRendered = await traceCtx.startRendering();
      var traceSamples = Array.from(traceRendered.getChannelData(0));
      for (var td = 0; td < traceBuild.nodes.length; td++) {
        if (traceBuild.nodes[td] && traceBuild.nodes[td].dispose) traceBuild.nodes[td].dispose();
      }

      var audioCtx = new OAC(1, Math.round(settings.audioDurationSeconds * settings.sampleRate), settings.sampleRate);
      var audioBuild = buildNodes(audioCtx);
      var stimulusEvents = [];
      var wiringEvents = [];
      var destinationConnections = 0;
      for (var ai = 0; ai < audioBuild.nodes.length; ai++) {
        var audioInputNode = audioBuild.nodes[ai];
        if (!audioInputNode || audioInputNode.type !== 'audio_input') continue;
        for (var outputIndex = 0; outputIndex < audioInputNode.outputs.length; outputIndex++) {
          var output = audioInputNode.outputs[outputIndex];
          if (!output) continue;
          for (var it = 0; it < settings.impulseTimes.length; it++) {
            var impulse = makeImpulse(audioCtx, settings.impulseTimes[it]);
            impulse.connect(output);
            stimulusEvents.push({ moduleIndex: ai, outputBlock: outputIndex, stimulus: 'single-sample-impulse', when: settings.impulseTimes[it], amplitude: settings.impulseAmplitude });
          }
        }
      }
      for (var cc = 0; cc < patch.connections.length; cc++) {
        var connection = patch.connections[cc];
        var srcNode = audioBuild.nodes[connection.srcMod];
        var dstNode = audioBuild.nodes[connection.dstMod];
        var srcOut = srcNode && srcNode.outputs ? srcNode.outputs[connection.srcBlock] : null;
        var dstIn = dstNode && dstNode.inputs ? dstNode.inputs[connection.dstBlock] : null;
        var strength = (connection.strength !== undefined ? connection.strength : 10000) / 10000;
        if (srcOut && dstIn) {
          var gain = audioCtx.createGain();
          gain.gain.value = strength;
          var sourceConnected = connectIfPossible(srcOut, gain);
          var targetConnected = sourceConnected && connectIfPossible(gain, dstIn);
          wiringEvents.push({ connectionIndex: cc, connected: Boolean(targetConnected), srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength: strength });
        } else {
          wiringEvents.push({ connectionIndex: cc, connected: false, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength: strength });
        }
      }
      for (var out = 0; out < audioBuild.nodes.length; out++) {
        var node = audioBuild.nodes[out];
        if (node && node.type === 'audio_output' && node._outGain) {
          node._outGain.connect(audioCtx.destination);
          destinationConnections++;
        }
      }
      var audioRendered = await audioCtx.startRendering();
      var samples = Array.from(audioRendered.getChannelData(0));
      for (var ad = 0; ad < audioBuild.nodes.length; ad++) {
        if (audioBuild.nodes[ad] && audioBuild.nodes[ad].dispose) audioBuild.nodes[ad].dispose();
      }

      return {
        offlineAudioSupported: true,
        patchName: patch.name,
        unsupportedModules: audioBuild.unsupportedModules.concat(traceBuild.unsupportedModules),
        traceConnections: traceConnections,
        stimulusEvents: stimulusEvents,
        wiringEvents: wiringEvents,
        destinationConnections: destinationConnections,
        features: sampleFeatures(samples),
        traceFeatures: traceFeatures(traceSamples),
        samples: samples,
        traceSamples: traceSamples
      };
    }, {
      patch: fixture.patch,
      fixture: { mode: fixture.mode, route: fixture.route },
      settings: {
        sampleRate: SAMPLE_RATE,
        audioDurationSeconds: AUDIO_DURATION_SECONDS,
        traceDurationSeconds: TRACE_DURATION_SECONDS,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        baseDelaySeconds: BASE_DELAY_SECONDS,
        impulseTimes: [0.02, 0.32, 0.62, 0.92]
      }
    });

    const samples = renderResult.samples || [];
    const traceSamples = renderResult.traceSamples || [];
    delete renderResult.samples;
    delete renderResult.traceSamples;
    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    const tracePath = resolve(evidenceRoot, "traces", `${fixture.id}.lfo.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));
    await writeFile(tracePath, wavBufferFromSamples(traceSamples, SAMPLE_RATE));

    if (fixture.mode === "disconnected-lfo-time-route") baselineByPatch.set(fixture.sourcePatchPath, renderResult.features);

    const failures = [];
    assertCondition(failures, !fixture.derivationProblem, "fixture-derivation", "LFO fixture could not be derived", fixture.derivationProblem);
    assertCondition(failures, renderResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", renderResult);
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, renderResult.traceConnections > 0, "lfo-trace", "LFO output was not connected for trace capture", renderResult);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "impulse stimulus was not connected", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to destination", renderResult);

    let classification = fixture.expectedClassification;
    if (fixture.mode === "positive-lfo-time-route") {
      const expectedFrequency = fixture.route?.expectedFrequencyHz ?? null;
      const observedFrequency = renderResult.traceFeatures.estimatedFrequencyHz;
      const frequencyTolerance = expectedFrequency === null ? null : Math.max(0.2, expectedFrequency * 0.25);
      const peakTimeDeltas = renderResult.features.impulseWindows.map((window) => Math.abs(window.deltaFromBaselineSeconds || 0));
      const maxPeakTimeDelta = Math.max(...peakTimeDeltas);
      const measurablePeakCount = renderResult.features.impulseWindows.filter((window) => window.peak >= MIN_WINDOW_PEAK).length;
      const baseline = baselineByPatch.get(fixture.sourcePatchPath);
      const diffRms = baseline ? Math.sqrt(renderResult.features.impulseWindows.reduce((sum, window, index) => {
        const baseWindow = baseline.impulseWindows[index];
        return sum + Math.pow((window.peakSeconds || 0) - (baseWindow.peakSeconds || 0), 2);
      }, 0) / Math.max(renderResult.features.impulseWindows.length, 1)) : null;
      assertCondition(failures, renderResult.traceFeatures.rms >= MIN_LFO_TRACE_RMS, "lfo-waveform", "generated LFO output trace RMS is below threshold", { observed: renderResult.traceFeatures.rms, threshold: MIN_LFO_TRACE_RMS });
      assertCondition(failures, observedFrequency !== null && expectedFrequency !== null && Math.abs(observedFrequency - expectedFrequency) <= frequencyTolerance, "lfo-waveform", "generated LFO output frequency is outside expected range", { observed: observedFrequency, expected: expectedFrequency, tolerance: frequencyTolerance });
      assertCondition(failures, measurablePeakCount >= 3, "audio-route", "positive LFO route did not produce enough measurable delayed peaks", { observed: measurablePeakCount, threshold: 3, impulseWindows: renderResult.features.impulseWindows });
      assertCondition(failures, maxPeakTimeDelta >= MIN_PEAK_TIME_DELTA_SECONDS, "audio-route", "positive LFO route did not move delay peak timing", { observed: maxPeakTimeDelta, threshold: MIN_PEAK_TIME_DELTA_SECONDS });
      assertCondition(failures, diffRms !== null && diffRms >= MIN_AUDIO_DIFF_RMS, "audio-route", "positive LFO route did not differ from disconnected-route timing", { observed: diffRms, threshold: MIN_AUDIO_DIFF_RMS });
      if (failures.length > 0) classification = "lfo-waveform-route-not-proven";
    } else if (fixture.mode === "disconnected-lfo-time-route") {
      assertCondition(failures, renderResult.traceFeatures.rms >= MIN_LFO_TRACE_RMS, "lfo-negative-control", "disconnected control did not preserve generated LFO waveform", { observed: renderResult.traceFeatures.rms, threshold: MIN_LFO_TRACE_RMS });
      assertCondition(failures, renderResult.features.impulseWindows.every((window) => window.peak >= MIN_WINDOW_PEAK && Math.abs(window.deltaFromBaselineSeconds || 0) <= MIN_PEAK_TIME_DELTA_SECONDS), "lfo-negative-control", "disconnected route did not preserve unmodulated delay timing", renderResult.features.impulseWindows);
      if (failures.length > 0) classification = "disconnected-lfo-route-control-failed";
    } else if (fixture.mode === "muted-lfo-output") {
      assertCondition(failures, renderResult.traceFeatures.rms <= MAX_MUTED_LFO_TRACE_RMS, "lfo-negative-control", "muted LFO control still produced trace output", { observed: renderResult.traceFeatures.rms, threshold: MAX_MUTED_LFO_TRACE_RMS });
      assertCondition(failures, renderResult.features.impulseWindows.every((window) => window.peak >= MIN_WINDOW_PEAK && Math.abs(window.deltaFromBaselineSeconds || 0) <= MIN_PEAK_TIME_DELTA_SECONDS), "lfo-negative-control", "muted LFO output did not preserve baseline delay timing", renderResult.features.impulseWindows);
      if (failures.length > 0) classification = "muted-lfo-output-control-failed";
    } else if (fixture.mode === "wrong-target-feedback") {
      assertCondition(failures, renderResult.traceFeatures.rms >= MIN_LFO_TRACE_RMS, "lfo-negative-control", "wrong-target control did not preserve generated LFO waveform", { observed: renderResult.traceFeatures.rms, threshold: MIN_LFO_TRACE_RMS });
      assertCondition(failures, renderResult.features.impulseWindows.every((window) => window.peak >= MIN_WINDOW_PEAK && Math.abs(window.deltaFromBaselineSeconds || 0) <= MIN_PEAK_TIME_DELTA_SECONDS), "lfo-negative-control", "wrong-target route shifted delay timing", renderResult.features.impulseWindows);
      if (failures.length > 0) classification = "wrong-target-lfo-control-failed";
    }

    const record = {
      id: fixture.id,
      mode: fixture.mode,
      status: failures.length === 0 ? (fixture.mode === "positive-lfo-time-route" ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
      classification,
      expectedClassification: fixture.expectedClassification,
      route: fixture.route,
      sourcePatchPath: fixture.sourcePatchPath,
      patchPath: fixture.patchPath,
      capturePath,
      tracePath,
      assertionFailures: failures,
      audioEvidence: renderResult
    };
    await writeJson(resolve(evidenceRoot, `${fixture.id}.json`), record);
    records.push(record);
  }

  await browser.close();

  const positives = records.filter((record) => record.mode === "positive-lfo-time-route");
  const disconnectedControls = records.filter((record) => record.mode === "disconnected-lfo-time-route");
  const mutedControls = records.filter((record) => record.mode === "muted-lfo-output");
  const wrongTargetControls = records.filter((record) => record.mode === "wrong-target-feedback");
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, positives.every((record) => record.status === PASS_STATUS), "lfo-semantics", "one or more positive LFO fixtures did not prove waveform-route behavior", positives);
  assertCondition(assertionFailures, disconnectedControls.every((record) => record.classification === "lfo-route-disconnected-classified"), "lfo-negative-control", "one or more disconnected controls failed classification", disconnectedControls);
  assertCondition(assertionFailures, mutedControls.every((record) => record.classification === "lfo-output-muted-classified"), "lfo-negative-control", "one or more muted LFO controls failed classification", mutedControls);
  assertCondition(assertionFailures, wrongTargetControls.every((record) => record.classification === "lfo-wrong-target-classified"), "lfo-negative-control", "one or more wrong-target controls failed classification", wrongTargetControls);

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-lfo-semantics-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      mode: record.mode,
      status: record.status,
      classification: record.classification,
      patchPath: record.patchPath,
      capturePath: record.capturePath,
      tracePath: record.tracePath,
      lfoTraceRms: record.audioEvidence.traceFeatures?.rms ?? null,
      lfoTraceEstimatedFrequencyHz: record.audioEvidence.traceFeatures?.estimatedFrequencyHz ?? null,
      audioRms: record.audioEvidence.features?.rms ?? null,
      peakTimeDeltasSeconds: (record.audioEvidence.features?.impulseWindows || []).map((window) => window.deltaFromBaselineSeconds),
      assertionFailureCount: record.assertionFailures.length
    }))
  };
  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-lfo-semantics-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      audioDurationSeconds: AUDIO_DURATION_SECONDS,
      traceDurationSeconds: TRACE_DURATION_SECONDS,
      channelCount: 1,
      impulseAmplitude: IMPULSE_AMPLITUDE,
      impulseTimes: [0.02, 0.32, 0.62, 0.92]
    },
    routeUnderTest: {
      generatedRoute: "LFO cv output to Delay Line time_cv input",
      audioProperty: "periodic delay-window movement",
      controlProperty: "generated LFO output period and RMS/depth",
      baseDelaySeconds: BASE_DELAY_SECONDS
    },
    deterministicFixtureBoundary: {
      source: "generated delay-path emulator patch JSON",
      transformation: "preserve generated LFO module, generated LFO parameters, and generated LFO-to-delay-time route; fix base delay time to 250 ms, feedback to 0, wet-only mix, and multi-impulse stimulus for measurement",
      actualGeneratedLfoWaveformSemanticsClaim: true,
      originalUnmodifiedPatchTimingClaim: false,
      expressionPedalFeedbackSemanticsClaim: false
    },
    thresholds: {
      minLfoTraceRms: MIN_LFO_TRACE_RMS,
      maxMutedLfoTraceRms: MAX_MUTED_LFO_TRACE_RMS,
      minAudioDiffRms: MIN_AUDIO_DIFF_RMS,
      minPeakTimeDeltaSeconds: MIN_PEAK_TIME_DELTA_SECONDS,
      minWindowPeak: MIN_WINDOW_PEAK
    },
    negativeControls: {
      disconnectedLfoTimeRouteIncluded: true,
      mutedLfoOutputIncluded: true,
      wrongTargetFeedbackIncluded: true
    }
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-lfo-semantics-evidence.v1",
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
      patchCount: positives.length,
      lfoWaveformRouteCount: positives.filter((record) => record.status === PASS_STATUS).length,
      disconnectedControlClassifiedCount: disconnectedControls.filter((record) => record.classification === "lfo-route-disconnected-classified").length,
      mutedControlClassifiedCount: mutedControls.filter((record) => record.classification === "lfo-output-muted-classified").length,
      wrongTargetClassifiedCount: wrongTargetControls.filter((record) => record.classification === "lfo-wrong-target-classified").length,
      captureCount: records.length,
      traceCount: records.length
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
      captureRoot: resolve(evidenceRoot, "captures"),
      traceRoot: resolve(evidenceRoot, "traces")
    },
    claimBoundaries: {
      actualGeneratedLfoWaveformSemanticsClaim: assertionFailures.length === 0,
      generatedLfoTimeRouteAudioEffectClaim: assertionFailures.length === 0,
      originalUnmodifiedPatchTimingClaim: false,
      expressionPedalFeedbackSemanticsClaim: false,
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
    captureRoot: result.artifacts.captureRoot,
    traceRoot: result.artifacts.traceRoot
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath, evidenceRoot } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-lfo-semantics-evidence.v1",
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
