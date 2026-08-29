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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-corrupted-route-negative-controls");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-corrupted-route-negative-controls";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 2.7;
const IMPULSE_AMPLITUDE = 0.75;
const IMPULSE_TIMES = Object.freeze([0.02]);
const MIN_LFO_TRACE_RMS = 0.05;
const MIN_FIRST_PEAK = 0.05;
const MIN_PEAK_DELTA_SECONDS = 0.01;
const MIN_TAIL_RATIO = 0.02;
const MAX_MUTED_AUDIO_RMS = 0.000001;
const MIN_BASE_FEEDBACK_DOMINANCE = 0.5;
const MAX_CORRUPTED_LFO_DELTA_SECONDS = 0.05;
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

function assertCondition(failures, condition, surface, message, evidence = null) {
  if (condition) return;
  failures.push({ surface, message, evidence });
}

function delayParamToSeconds(param) {
  return 0.005 + (param / 65535) * 1.5;
}

function findDelayModule(patch) {
  return patch.modules.find((module) => module.typeIdx === 13 || module.typeIdx === 85 || module.typeIdx === 86) || null;
}

function blockIndexByNameAndType(module, type, needle) {
  return module.blocks.findIndex((block) => block.t === type && String(block.n || "").toLowerCase().includes(needle));
}

function findRouteMetadata(patch) {
  const delayModule = findDelayModule(patch);
  if (!delayModule) return { problem: "delay-module-missing" };
  const timeBlock = blockIndexByNameAndType(delayModule, "cv_in", "time");
  const feedbackBlock = blockIndexByNameAndType(delayModule, "cv_in", "feed");
  const mixBlock = blockIndexByNameAndType(delayModule, "cv_in", "mix");
  const audioInBlock = blockIndexByNameAndType(delayModule, "audio_in", "audio");
  const lfoTimeRoute = patch.connections.find((connection) => (
    connection.dstMod === delayModule.idx &&
    connection.dstBlock === timeBlock &&
    patch.modules[connection.srcMod]?.typeName === "LFO"
  )) || null;
  const expressionFeedbackRoute = patch.connections.find((connection) => (
    connection.dstMod === delayModule.idx &&
    connection.dstBlock === feedbackBlock &&
    patch.modules[connection.srcMod]?.typeName === "Cport Exp/CV"
  )) || null;
  const audioInputRoute = patch.connections.find((connection) => (
    connection.dstMod === delayModule.idx &&
    connection.dstBlock === audioInBlock &&
    patch.modules[connection.srcMod]?.typeName === "Audio Input"
  )) || null;
  return {
    problem: null,
    delayModuleIdx: delayModule.idx,
    delayModuleId: delayModule.sourceGeneratedModuleId || null,
    timeBlock,
    feedbackBlock,
    mixBlock,
    audioInBlock,
    baseDelaySeconds: delayParamToSeconds(delayModule.params?.[timeBlock] ?? 0),
    baseFeedbackNormalized: (delayModule.params?.[feedbackBlock] ?? 0) / 65535,
    baseMixNormalized: (delayModule.params?.[mixBlock] ?? 0) / 65535,
    lfoTimeRoute,
    expressionFeedbackRoute,
    audioInputRoute,
    lfoModule: lfoTimeRoute ? patch.modules[lfoTimeRoute.srcMod] : null,
    expressionModule: expressionFeedbackRoute ? patch.modules[expressionFeedbackRoute.srcMod] : null,
    audioInputModule: audioInputRoute ? patch.modules[audioInputRoute.srcMod] : null
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function removeConnection(connections, route) {
  if (!route) return connections;
  return connections.filter((connection) => !(
    connection.srcMod === route.srcMod &&
    connection.srcBlock === route.srcBlock &&
    connection.dstMod === route.dstMod &&
    connection.dstBlock === route.dstBlock
  ));
}

function zeroDelayFeedbackParam(patch, routeMetadata) {
  const delayModule = patch.modules[routeMetadata.delayModuleIdx];
  if (!delayModule || routeMetadata.feedbackBlock === -1) return;
  delayModule.params[routeMetadata.feedbackBlock] = 0;
}

function deriveCorruptedFixture(sourcePatch, mode) {
  const patch = clone(sourcePatch);
  const metadata = findRouteMetadata(patch);
  patch.labels = Array.from(new Set([...(patch.labels || []), "corrupted-route-negative-control", mode]));
  patch.description = `${patch.description || ""} Corrupted route negative control: ${mode}.`.trim();
  if (mode === "remove-lfo-time-route") {
    patch.connections = removeConnection(patch.connections, metadata.lfoTimeRoute);
  } else if (mode === "remove-expression-feedback-route") {
    patch.connections = removeConnection(patch.connections, metadata.expressionFeedbackRoute);
  } else if (mode === "disable-feedback-sources") {
    zeroDelayFeedbackParam(patch, metadata);
    patch.connections = removeConnection(patch.connections, metadata.expressionFeedbackRoute);
  } else if (mode === "remove-audio-input-route") {
    patch.connections = removeConnection(patch.connections, metadata.audioInputRoute);
  }
  return { patch, metadata: findRouteMetadata(patch), sourceMetadata: metadata };
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
    for (const mode of ["remove-lfo-time-route", "remove-expression-feedback-route", "disable-feedback-sources", "remove-audio-input-route"]) {
      const derived = deriveCorruptedFixture(sourcePatch, mode);
      const fixturePath = resolve(evidenceRoot, "fixtures", `${baseId}.${mode}.patch.json`);
      await writeJson(fixturePath, derived.patch);
      fixtures.push({
        id: `${baseId}-${mode}`,
        sourcePatchPath,
        patchPath: fixturePath,
        patch: derived.patch,
        mode,
        expressionValue: 1,
        mutedAudioInput: false,
        route: derived.metadata,
        sourceRoute: derived.sourceMetadata
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
        var peakValue = 0;
        var peakIndex = null;
        for (var i = start; i <= end; i++) {
          var sample = samples[i];
          var abs = Math.abs(sample);
          if (abs > peak) {
            peak = abs;
            peakValue = sample;
            peakIndex = i;
          }
        }
        return { peak: peak, peakValue: peakValue, peakIndex: peakIndex, peakSeconds: peakIndex === null ? null : peakIndex / settings.sampleRate, start: start, end: end };
      }

      function features(samples) {
        var sumSquares = 0;
        var peak = 0;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
        }
        var impulseWindows = settings.impulseTimes.map(function(impulseTime) {
          var center = impulseTime + settings.baseDelaySeconds;
          var first = peakInWindow(samples, center, 0.25);
          var repeat = peakInWindow(samples, center + settings.baseDelaySeconds, 0.25);
          return {
            impulseTime: impulseTime,
            baselineCenterSeconds: center,
            firstPeak: first.peak,
            firstPeakValue: first.peakValue,
            firstPeakSeconds: first.peakSeconds,
            firstDeltaSeconds: first.peakSeconds === null ? null : first.peakSeconds - center,
            repeatPeak: repeat.peak,
            repeatPeakValue: repeat.peakValue,
            repeatPeakSeconds: repeat.peakSeconds,
            repeatToFirstRatio: first.peak > 0 ? repeat.peak / first.peak : null
          };
        });
        var firstPeakCount = impulseWindows.filter(function(window) { return window.firstPeak >= settings.minFirstPeak; }).length;
        var maxAbsPeakDelta = impulseWindows.reduce(function(max, window) {
          return Math.max(max, Math.abs(window.firstDeltaSeconds || 0));
        }, 0);
        var maxRepeatRatio = impulseWindows.reduce(function(max, window) {
          return Math.max(max, window.repeatToFirstRatio || 0);
        }, 0);
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          firstPeakCount: firstPeakCount,
          maxAbsPeakDeltaSeconds: maxAbsPeakDelta,
          maxRepeatToFirstRatio: maxRepeatRatio,
          impulseWindows: impulseWindows,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      function traceFeatures(samples) {
        var sumSquares = 0;
        var min = 0;
        var max = 0;
        var positiveCrossings = [];
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          min = Math.min(min, sample);
          max = Math.max(max, sample);
          if (i > 0 && samples[i - 1] <= 0 && sample > 0) positiveCrossings.push(i);
        }
        var periods = [];
        for (var c = 1; c < positiveCrossings.length; c++) {
          periods.push((positiveCrossings[c] - positiveCrossings[c - 1]) / settings.sampleRate);
        }
        var averagePeriod = periods.length > 0 ? periods.reduce(function(sum, period) { return sum + period; }, 0) / periods.length : null;
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          min: min,
          max: max,
          estimatedFrequencyHz: averagePeriod ? 1 / averagePeriod : null,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') {
        return { offlineAudioSupported: false, samples: [], lfoTraceSamples: [], expressionTraceSamples: [] };
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
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n] && nodes[n].type === 'cport_exp_cv' && typeof nodes[n].setValue === 'function') {
            nodes[n].setValue(fixture.expressionValue);
          }
        }
        return { nodes: nodes, unsupportedModules: unsupportedModules };
      }

      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var traceCtx = new OAC(1, Math.round(settings.durationSeconds * settings.sampleRate), settings.sampleRate);
      var traceBuild = buildNodes(traceCtx);
      var lfoTraceConnections = 0;
      var expressionTraceConnections = 0;
      for (var t = 0; t < traceBuild.nodes.length; t++) {
        var traceNode = traceBuild.nodes[t];
        if (traceNode && traceNode.type === 'lfo' && fixture.sourceRoute.lfoTimeRoute && traceNode.outputs && traceNode.outputs[fixture.sourceRoute.lfoTimeRoute.srcBlock]) {
          traceNode.outputs[fixture.sourceRoute.lfoTimeRoute.srcBlock].connect(traceCtx.destination);
          lfoTraceConnections++;
        }
        if (traceNode && traceNode.type === 'cport_exp_cv' && fixture.sourceRoute.expressionFeedbackRoute && traceNode.outputs && traceNode.outputs[fixture.sourceRoute.expressionFeedbackRoute.srcBlock]) {
          traceNode.outputs[fixture.sourceRoute.expressionFeedbackRoute.srcBlock].connect(traceCtx.destination);
          expressionTraceConnections++;
        }
      }
      var traceRendered = await traceCtx.startRendering();
      var combinedTraceSamples = Array.from(traceRendered.getChannelData(0));
      for (var td = 0; td < traceBuild.nodes.length; td++) {
        if (traceBuild.nodes[td] && traceBuild.nodes[td].dispose) traceBuild.nodes[td].dispose();
      }

      var lfoTraceCtx = new OAC(1, Math.round(settings.durationSeconds * settings.sampleRate), settings.sampleRate);
      var lfoTraceBuild = buildNodes(lfoTraceCtx);
      for (var lt = 0; lt < lfoTraceBuild.nodes.length; lt++) {
        var lfoNode = lfoTraceBuild.nodes[lt];
        if (lfoNode && lfoNode.type === 'lfo' && fixture.sourceRoute.lfoTimeRoute && lfoNode.outputs && lfoNode.outputs[fixture.sourceRoute.lfoTimeRoute.srcBlock]) {
          lfoNode.outputs[fixture.sourceRoute.lfoTimeRoute.srcBlock].connect(lfoTraceCtx.destination);
        }
      }
      var lfoRendered = await lfoTraceCtx.startRendering();
      var lfoTraceSamples = Array.from(lfoRendered.getChannelData(0));
      for (var ld = 0; ld < lfoTraceBuild.nodes.length; ld++) {
        if (lfoTraceBuild.nodes[ld] && lfoTraceBuild.nodes[ld].dispose) lfoTraceBuild.nodes[ld].dispose();
      }

      var expressionTraceCtx = new OAC(1, Math.round(settings.durationSeconds * settings.sampleRate), settings.sampleRate);
      var expressionTraceBuild = buildNodes(expressionTraceCtx);
      for (var et = 0; et < expressionTraceBuild.nodes.length; et++) {
        var expressionNode = expressionTraceBuild.nodes[et];
        if (expressionNode && expressionNode.type === 'cport_exp_cv' && fixture.sourceRoute.expressionFeedbackRoute && expressionNode.outputs && expressionNode.outputs[fixture.sourceRoute.expressionFeedbackRoute.srcBlock]) {
          expressionNode.outputs[fixture.sourceRoute.expressionFeedbackRoute.srcBlock].connect(expressionTraceCtx.destination);
        }
      }
      var expressionRendered = await expressionTraceCtx.startRendering();
      var expressionTraceSamples = Array.from(expressionRendered.getChannelData(0));
      for (var ed = 0; ed < expressionTraceBuild.nodes.length; ed++) {
        if (expressionTraceBuild.nodes[ed] && expressionTraceBuild.nodes[ed].dispose) expressionTraceBuild.nodes[ed].dispose();
      }

      var audioCtx = new OAC(1, Math.round(settings.durationSeconds * settings.sampleRate), settings.sampleRate);
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
          if (fixture.mutedAudioInput) continue;
          for (var it = 0; it < settings.impulseTimes.length; it++) {
            var impulse = makeImpulse(audioCtx, settings.impulseTimes[it]);
            impulse.connect(output);
            stimulusEvents.push({ moduleIndex: ai, outputBlock: outputIndex, stimulus: 'single-sample-impulse', when: settings.impulseTimes[it], amplitude: settings.impulseAmplitude });
          }
        }
      }
      for (var c = 0; c < patch.connections.length; c++) {
        var connection = patch.connections[c];
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
          wiringEvents.push({ connectionIndex: c, connected: Boolean(targetConnected), srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength: strength });
        } else {
          wiringEvents.push({ connectionIndex: c, connected: false, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength: strength });
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
        lfoTraceConnections: lfoTraceConnections,
        expressionTraceConnections: expressionTraceConnections,
        stimulusEvents: stimulusEvents,
        wiringEvents: wiringEvents,
        destinationConnections: destinationConnections,
        features: features(samples),
        lfoTraceFeatures: traceFeatures(lfoTraceSamples),
        expressionTraceFeatures: traceFeatures(expressionTraceSamples),
        combinedTraceFeatures: traceFeatures(combinedTraceSamples),
        samples: samples,
        lfoTraceSamples: lfoTraceSamples,
        expressionTraceSamples: expressionTraceSamples
      };
    }, {
      patch: fixture.patch,
      fixture: {
        mode: fixture.mode,
        expressionValue: fixture.expressionValue,
        mutedAudioInput: fixture.mutedAudioInput,
        route: fixture.route,
        sourceRoute: fixture.sourceRoute
      },
      settings: {
        sampleRate: SAMPLE_RATE,
        durationSeconds: DURATION_SECONDS,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        impulseTimes: IMPULSE_TIMES,
        baseDelaySeconds: fixture.route.baseDelaySeconds,
        minFirstPeak: MIN_FIRST_PEAK
      }
    });

    const samples = renderResult.samples || [];
    const lfoTraceSamples = renderResult.lfoTraceSamples || [];
    const expressionTraceSamples = renderResult.expressionTraceSamples || [];
    delete renderResult.samples;
    delete renderResult.lfoTraceSamples;
    delete renderResult.expressionTraceSamples;
    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    const lfoTracePath = resolve(evidenceRoot, "traces", `${fixture.id}.lfo.wav`);
    const expressionTracePath = resolve(evidenceRoot, "traces", `${fixture.id}.expression.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));
    await writeFile(lfoTracePath, wavBufferFromSamples(lfoTraceSamples, SAMPLE_RATE));
    await writeFile(expressionTracePath, wavBufferFromSamples(expressionTraceSamples, SAMPLE_RATE));

    const failures = [];
    assertCondition(failures, !fixture.sourceRoute.problem, "fixture-derivation", "source delay route metadata could not be derived", fixture.sourceRoute.problem);
    assertCondition(failures, Boolean(fixture.sourceRoute.lfoTimeRoute), "source-route", "source generated LFO-to-delay-time route missing", fixture.sourceRoute);
    assertCondition(failures, Boolean(fixture.sourceRoute.expressionFeedbackRoute), "source-route", "source generated expression-to-feedback route missing", fixture.sourceRoute);
    assertCondition(failures, Boolean(fixture.sourceRoute.audioInputRoute), "source-route", "source generated audio-input-to-delay route missing", fixture.sourceRoute);
    assertCondition(failures, renderResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", renderResult);
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, renderResult.lfoTraceConnections > 0, "lfo-trace", "generated LFO trace was not connected", renderResult);
    assertCondition(failures, renderResult.expressionTraceConnections > 0, "expression-trace", "generated expression trace was not connected", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to destination", renderResult);
    assertCondition(failures, renderResult.lfoTraceFeatures.rms >= MIN_LFO_TRACE_RMS, "lfo-trace", "generated LFO trace RMS is below threshold", { observed: renderResult.lfoTraceFeatures.rms, threshold: MIN_LFO_TRACE_RMS });
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "impulse stimulus was not connected", renderResult);
    if (fixture.mode !== "remove-audio-input-route") {
      assertCondition(failures, renderResult.features.rms > MAX_MUTED_AUDIO_RMS, "audio-output", "corrupted fixture produced no measurable signal", renderResult.features);
    }

    const allImpulsesMeasured = renderResult.features.firstPeakCount === IMPULSE_TIMES.length;
    const signalPresent = renderResult.features.rms > MAX_MUTED_AUDIO_RMS;
    const modulatedTiming = renderResult.features.maxAbsPeakDeltaSeconds >= MIN_PEAK_DELTA_SECONDS;
    const feedbackTail = renderResult.features.maxRepeatToFirstRatio >= MIN_TAIL_RATIO;
    let classification = "signal-present only";
    if (signalPresent && allImpulsesMeasured && modulatedTiming && feedbackTail) classification = "stable measured modulation behavior";
    else if (signalPresent && (modulatedTiming || feedbackTail || renderResult.features.firstPeakCount > 0)) classification = "measurable but unstable modulation behavior";
    if (fixture.mode === "remove-lfo-time-route") {
      assertCondition(failures, !fixture.route.lfoTimeRoute, "negative-control", "corrupted fixture still has generated LFO-to-delay-time route", fixture.route);
      assertCondition(failures, renderResult.features.maxAbsPeakDeltaSeconds < MAX_CORRUPTED_LFO_DELTA_SECONDS, "negative-control", "removed LFO timing route did not reduce timing movement below route-loss threshold", {
        observed: renderResult.features.maxAbsPeakDeltaSeconds,
        threshold: MAX_CORRUPTED_LFO_DELTA_SECONDS
      });
      if (failures.length === 0) classification = "corrupted-lfo-route-classified";
    } else if (fixture.mode === "remove-expression-feedback-route") {
      assertCondition(failures, !fixture.route.expressionFeedbackRoute, "negative-control", "corrupted fixture still has generated expression-to-feedback route", fixture.route);
      const baseFeedbackDominates = fixture.sourceRoute.baseFeedbackNormalized >= MIN_BASE_FEEDBACK_DOMINANCE && feedbackTail;
      assertCondition(failures, baseFeedbackDominates, "negative-control", "removed expression route did not record base-feedback dominance evidence", {
        baseFeedbackNormalized: fixture.sourceRoute.baseFeedbackNormalized,
        feedbackTail,
        maxRepeatToFirstRatio: renderResult.features.maxRepeatToFirstRatio,
        threshold: MIN_BASE_FEEDBACK_DOMINANCE
      });
      if (failures.length === 0) classification = "corrupted-expression-route-classified-base-feedback-dominates";
    } else if (fixture.mode === "disable-feedback-sources") {
      assertCondition(failures, !fixture.route.expressionFeedbackRoute, "negative-control", "feedback-disabled fixture still has generated expression-to-feedback route", fixture.route);
      assertCondition(failures, fixture.route.baseFeedbackNormalized === 0, "negative-control", "feedback-disabled fixture still has base feedback parameter", fixture.route);
      assertCondition(failures, !feedbackTail, "negative-control", "feedback-disabled fixture still has feedback-tail classification evidence", renderResult.features);
      if (failures.length === 0) classification = "corrupted-feedback-route-classified-tail-lost";
    } else if (fixture.mode === "remove-audio-input-route") {
      assertCondition(failures, !fixture.route.audioInputRoute, "negative-control", "corrupted fixture still has generated audio-input-to-delay route", fixture.route);
      assertCondition(failures, !signalPresent && renderResult.features.firstPeakCount === 0, "negative-control", "removed audio input route still has generated-patch output signal", {
        signalPresent,
        audioRms: renderResult.features.rms,
        firstPeakCount: renderResult.features.firstPeakCount,
        peak: renderResult.features.peak,
        mutedAudioThreshold: MAX_MUTED_AUDIO_RMS
      });
      if (failures.length === 0) classification = "corrupted-audio-input-route-classified-signal-lost";
    }
    if (failures.length > 0) classification = `blocked with exact cause: ${failures[0].surface} ${failures[0].message}`;

    const record = {
      id: fixture.id,
      mode: fixture.mode,
      status: failures.length === 0 ? CLASSIFIED_STATUS : FAIL_STATUS,
      classification,
      route: fixture.route,
      sourceRoute: fixture.sourceRoute,
      expressionValue: fixture.expressionValue,
      mutedAudioInput: fixture.mutedAudioInput,
      sourcePatchPath: fixture.sourcePatchPath,
      patchPath: fixture.patchPath,
      capturePath,
      lfoTracePath,
      expressionTracePath,
      assertionFailures: failures,
      audioEvidence: renderResult
    };
    await writeJson(resolve(evidenceRoot, `${fixture.id}.json`), record);
    records.push(record);
  }

  await browser.close();

  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, records.every((record) => record.status === CLASSIFIED_STATUS), "unmodified-timing", "one or more original generated patches could not be classified", records);

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-corrupted-route-negative-controls-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      mode: record.mode,
      status: record.status,
      classification: record.classification,
      expressionValue: record.expressionValue,
      mutedAudioInput: record.mutedAudioInput,
      baseDelaySeconds: record.route.baseDelaySeconds,
      baseFeedbackNormalized: record.route.baseFeedbackNormalized,
      baseMixNormalized: record.route.baseMixNormalized,
      sourceBaseFeedbackNormalized: record.sourceRoute.baseFeedbackNormalized,
      lfoTraceRms: record.audioEvidence.lfoTraceFeatures?.rms ?? null,
      lfoEstimatedFrequencyHz: record.audioEvidence.lfoTraceFeatures?.estimatedFrequencyHz ?? null,
      expressionTraceRms: record.audioEvidence.expressionTraceFeatures?.rms ?? null,
      firstPeakCount: record.audioEvidence.features?.firstPeakCount ?? null,
      maxAbsPeakDeltaSeconds: record.audioEvidence.features?.maxAbsPeakDeltaSeconds ?? null,
      maxRepeatToFirstRatio: record.audioEvidence.features?.maxRepeatToFirstRatio ?? null,
      audioRms: record.audioEvidence.features?.rms ?? null,
      assertionFailureCount: record.assertionFailures.length,
      capturePath: record.capturePath,
      lfoTracePath: record.lfoTracePath,
      expressionTracePath: record.expressionTracePath
    }))
  };
  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-corrupted-route-negative-controls-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      channelCount: 1,
      impulseAmplitude: IMPULSE_AMPLITUDE,
      impulseTimes: IMPULSE_TIMES
    },
    routeScope: {
      preservedOriginalPatchParameters: true,
      preservedOriginalConnections: false,
      lfoTimeRouteRequired: true,
      expressionFeedbackRouteRequired: true,
      audioInputRouteRequired: true,
      corruptionModes: ["remove-lfo-time-route", "remove-expression-feedback-route", "disable-feedback-sources", "remove-audio-input-route"],
      expressionValuesTested: [1]
    },
    thresholds: {
      minLfoTraceRms: MIN_LFO_TRACE_RMS,
      minFirstPeak: MIN_FIRST_PEAK,
      minPeakDeltaSeconds: MIN_PEAK_DELTA_SECONDS,
      minTailRatio: MIN_TAIL_RATIO
    },
    claimBoundary: {
      originalGeneratedPatchTimingClassificationClaim: true,
      stableMusicalTimingClaim: false,
      fullDspAccuracyClaim: false,
      hardwareParityClaim: false,
      completePatchSemanticsClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const classifiedCount = records.filter((record) => record.status === CLASSIFIED_STATUS).length;
  const lfoRouteControlClassifiedCount = records.filter((record) => record.classification === "corrupted-lfo-route-classified").length;
  const expressionRouteDominanceCount = records.filter((record) => record.classification === "corrupted-expression-route-classified-base-feedback-dominates").length;
  const feedbackTailLostCount = records.filter((record) => record.classification === "corrupted-feedback-route-classified-tail-lost").length;
  const audioInputRouteSignalLostCount = records.filter((record) => record.classification === "corrupted-audio-input-route-classified-signal-lost").length;
  const blockedClassificationCount = records.filter((record) => record.classification.startsWith("blocked with exact cause:")).length;
  const unchangedStableClassificationCount = records.filter((record) => record.classification === "stable measured modulation behavior").length;
  const result = {
    schemaVersion: "zoia.generated-patch-corrupted-route-negative-controls-evidence.v1",
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
      patchCount: patchFiles.length,
      fixtureCount: records.length,
      classifiedCount,
      lfoRouteControlClassifiedCount,
      expressionRouteDominanceCount,
      feedbackTailLostCount,
      audioInputRouteSignalLostCount,
      unchangedStableClassificationCount,
      blockedClassificationCount,
      captureCount: records.length,
      lfoTraceCount: records.length,
      expressionTraceCount: records.length
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
      unmodifiedTimingClassifierNegativeControlClaim: assertionFailures.length === 0,
      sourcePatchPathsPreserved: true,
      corruptedFixtureParametersPreservedExceptFeedbackDisableControl: true,
      corruptedFixtureConnectionsPreservedExceptTargetedRouteRemoval: true,
      audioInputRouteCorruptionClaim: assertionFailures.length === 0,
      originalGeneratedPatchTimingClassificationClaim: false,
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
    schemaVersion: "zoia.generated-patch-corrupted-route-negative-controls-evidence.v1",
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
