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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-expression-feedback-semantics");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-expression-feedback-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 0.85;
const IMPULSE_TIME_SECONDS = 0.02;
const IMPULSE_AMPLITUDE = 0.75;
const BASE_DELAY_SECONDS = 0.1;
const SEMANTIC_FEEDBACK = 0;
const SEMANTIC_MIX = 1;
const HIGH_EXPRESSION_VALUE = 1;
const LOW_EXPRESSION_VALUE = 0;
const MIN_FIRST_PEAK = 0.2;
const MIN_TAIL_PEAK = 0.03;
const MIN_TAIL_RATIO = 0.05;
const MAX_CONTROL_TAIL_RATIO = 0.005;
const MAX_LOW_EXPRESSION_TRACE_RMS = 0.000001;
const MIN_HIGH_EXPRESSION_TRACE_RMS = 0.9;
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
  patch.name = `${sourcePatch.name} Expression Feedback ${mode}`;
  patch.labels = Array.from(new Set([...(patch.labels || []), "expression-feedback-semantics", mode]));
  patch.description = `${patch.description || ""} Expression feedback semantics fixture: generated Cport Exp/CV remains in use; delay core is stabilized for feedback-tail measurement.`.trim();
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
  const mixBlock = blockIndexByNameAndType(delayModule, "cv_in", "mix");
  const audioInputOutBlock = audioInput.blocks.findIndex((block) => block.t === "audio_out");
  const audioOutputInBlock = audioOutput.blocks.findIndex((block) => block.t === "audio_in");
  const generatedFeedbackRoute = sourcePatch.connections.find((connection) => (
    connection.dstMod === delayIndex &&
    connection.dstBlock === feedbackBlock &&
    sourcePatch.modules[connection.srcMod]?.typeName === "Cport Exp/CV"
  )) || null;
  if (!generatedFeedbackRoute) return { patch, problem: "generated-expression-feedback-route-missing", route: null };

  patch.connections = [
    { srcMod: audioInput.idx, srcBlock: audioInputOutBlock, dstMod: delayIndex, dstBlock: audioInBlock, strength: 10000 },
    { srcMod: delayIndex, srcBlock: delayOutBlock, dstMod: audioOutput.idx, dstBlock: audioOutputInBlock, strength: 10000 }
  ];

  if (mode === "positive-high-expression-feedback" || mode === "low-expression-feedback" || mode === "inverted-expression-feedback") {
    patch.connections.push({
      srcMod: generatedFeedbackRoute.srcMod,
      srcBlock: generatedFeedbackRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: feedbackBlock,
      strength: generatedFeedbackRoute.strength ?? 10000
    });
  } else if (mode === "wrong-target-time") {
    patch.connections.push({
      srcMod: generatedFeedbackRoute.srcMod,
      srcBlock: generatedFeedbackRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: timeBlock,
      strength: generatedFeedbackRoute.strength ?? 10000
    });
  } else if (mode === "wrong-target-mix") {
    patch.connections.push({
      srcMod: generatedFeedbackRoute.srcMod,
      srcBlock: generatedFeedbackRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: mixBlock,
      strength: generatedFeedbackRoute.strength ?? 10000
    });
  }

  const controlModule = patch.modules[generatedFeedbackRoute.srcMod];
  return {
    patch,
    problem: null,
    route: {
      generatedSourceModuleId: controlModule?.sourceGeneratedModuleId || null,
      generatedSourceTypeName: controlModule?.typeName || null,
      generatedSourceBlock: generatedFeedbackRoute.srcBlock,
      generatedTargetModuleId: delayModule.sourceGeneratedModuleId || null,
      generatedTargetTypeName: delayModule.typeName,
      generatedTargetFeedbackBlock: feedbackBlock,
      generatedTargetTimeBlock: timeBlock,
      generatedTargetMixBlock: mixBlock,
      generatedStrength: generatedFeedbackRoute.strength ?? 10000,
      expressionValue: mode === "low-expression-feedback" ? LOW_EXPRESSION_VALUE : HIGH_EXPRESSION_VALUE,
      invertedFeedbackControl: mode === "inverted-expression-feedback",
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
    for (const mode of ["positive-high-expression-feedback", "disconnected-expression-feedback", "low-expression-feedback", "inverted-expression-feedback", "wrong-target-mix"]) {
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
        expectedClassification: mode === "positive-high-expression-feedback" ? "expression-feedback-tail-present" : mode === "disconnected-expression-feedback" ? "expression-feedback-disconnected-classified" : mode === "low-expression-feedback" ? "low-expression-feedback-classified" : mode === "inverted-expression-feedback" ? "inverted-expression-feedback-classified" : "expression-wrong-target-mix-classified"
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

      function makeImpulse(ctx) {
        var buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        buffer.getChannelData(0)[0] = settings.impulseAmplitude;
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.start(settings.impulseTimeSeconds);
        return source;
      }

      function peakInWindow(samples, centerSeconds, radiusSeconds) {
        var center = Math.round(centerSeconds * settings.sampleRate);
        var radius = Math.round(radiusSeconds * settings.sampleRate);
        var start = Math.max(0, center - radius);
        var end = Math.min(samples.length - 1, center + radius);
        var peak = 0;
        var peakIndex = null;
        var peakValue = 0;
        var energy = 0;
        for (var i = start; i <= end; i++) {
          var sample = samples[i];
          energy += sample * sample;
          var abs = Math.abs(sample);
          if (abs > peak) {
            peak = abs;
            peakIndex = i;
            peakValue = sample;
          }
        }
        return { peak: peak, peakValue: peakValue, peakIndex: peakIndex, peakSeconds: peakIndex === null ? null : peakIndex / settings.sampleRate, energy: energy, start: start, end: end };
      }

      function features(samples) {
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
        var first = peakInWindow(samples, settings.impulseTimeSeconds + settings.baseDelaySeconds, 0.01);
        var repeat2 = peakInWindow(samples, settings.impulseTimeSeconds + settings.baseDelaySeconds * 2, 0.015);
        var repeat3 = peakInWindow(samples, settings.impulseTimeSeconds + settings.baseDelaySeconds * 3, 0.015);
        var repeat4 = peakInWindow(samples, settings.impulseTimeSeconds + settings.baseDelaySeconds * 4, 0.015);
        var tailPeak = Math.max(repeat2.peak, repeat3.peak, repeat4.peak);
        var tailEnergy = repeat2.energy + repeat3.energy + repeat4.energy;
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          peakIndex: peakIndex,
          firstPeak: first.peak,
          firstPeakValue: first.peakValue,
          firstPeakIndex: first.peakIndex,
          firstPeakSeconds: first.peakSeconds,
          repeat2Peak: repeat2.peak,
          repeat2PeakValue: repeat2.peakValue,
          repeat3Peak: repeat3.peak,
          repeat3PeakValue: repeat3.peakValue,
          repeat4Peak: repeat4.peak,
          repeat4PeakValue: repeat4.peakValue,
          repeat2PeakSeconds: repeat2.peakSeconds,
          repeat3PeakSeconds: repeat3.peakSeconds,
          repeat4PeakSeconds: repeat4.peakSeconds,
          tailPeak: tailPeak,
          tailToFirstPeakRatio: first.peak > 0 ? tailPeak / first.peak : null,
          tailEnergy: tailEnergy,
          repeatWindows: [first, repeat2, repeat3, repeat4],
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      function traceFeatures(samples) {
        var sumSquares = 0;
        var min = 0;
        var max = 0;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          min: min,
          max: max,
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
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n] && nodes[n].type === 'cport_exp_cv' && typeof nodes[n].setValue === 'function') {
            nodes[n].setValue(fixture.route.expressionValue);
          }
        }
        return { nodes: nodes, unsupportedModules: unsupportedModules };
      }

      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var traceCtx = new OAC(1, Math.round(settings.durationSeconds * settings.sampleRate), settings.sampleRate);
      var traceBuild = buildNodes(traceCtx);
      var traceConnections = 0;
      for (var t = 0; t < traceBuild.nodes.length; t++) {
        var controlNode = traceBuild.nodes[t];
        if (controlNode && controlNode.type === 'cport_exp_cv' && controlNode.outputs && controlNode.outputs[fixture.route.generatedSourceBlock]) {
          controlNode.outputs[fixture.route.generatedSourceBlock].connect(traceCtx.destination);
          traceConnections++;
        }
      }
      var traceRendered = await traceCtx.startRendering();
      var traceSamples = Array.from(traceRendered.getChannelData(0));
      for (var td = 0; td < traceBuild.nodes.length; td++) {
        if (traceBuild.nodes[td] && traceBuild.nodes[td].dispose) traceBuild.nodes[td].dispose();
      }

      var audioCtx = new OAC(1, Math.round(settings.durationSeconds * settings.sampleRate), settings.sampleRate);
      var audioBuild = buildNodes(audioCtx);
      var stimulusEvents = [];
      var controlStimulusEvents = [];
      var wiringEvents = [];
      var destinationConnections = 0;
      for (var ai = 0; ai < audioBuild.nodes.length; ai++) {
        var audioInputNode = audioBuild.nodes[ai];
        if (!audioInputNode || audioInputNode.type !== 'audio_input') continue;
        for (var outputIndex = 0; outputIndex < audioInputNode.outputs.length; outputIndex++) {
          var output = audioInputNode.outputs[outputIndex];
          if (!output) continue;
          var impulse = makeImpulse(audioCtx);
          impulse.connect(output);
          stimulusEvents.push({ moduleIndex: ai, outputBlock: outputIndex, stimulus: 'single-sample-impulse', when: settings.impulseTimeSeconds, amplitude: settings.impulseAmplitude });
        }
      }
      for (var c = 0; c < patch.connections.length; c++) {
        var connection = patch.connections[c];
        var srcNode = audioBuild.nodes[connection.srcMod];
        var dstNode = audioBuild.nodes[connection.dstMod];
        var srcOut = srcNode && srcNode.outputs ? srcNode.outputs[connection.srcBlock] : null;
        var dstIn = dstNode && dstNode.inputs ? dstNode.inputs[connection.dstBlock] : null;
        var strength = (connection.strength !== undefined ? connection.strength : 10000) / 10000;
        if (fixture.mode === 'inverted-expression-feedback' &&
            fixture.route &&
            connection.srcBlock === fixture.route.generatedSourceBlock &&
            connection.dstBlock === fixture.route.generatedTargetFeedbackBlock &&
            patch.modules[connection.srcMod] &&
            patch.modules[connection.srcMod].sourceGeneratedModuleId === fixture.route.generatedSourceModuleId) {
          var inverted = audioCtx.createConstantSource();
          inverted.offset.value = -settings.highExpressionValue;
          inverted.start(0);
          srcOut = inverted;
          controlStimulusEvents.push({
            connectionIndex: c,
            sourceModuleIndex: connection.srcMod,
            targetModuleIndex: connection.dstMod,
            targetBlock: connection.dstBlock,
            stimulus: 'deterministic-inverted-expression-cv',
            value: -settings.highExpressionValue
          });
        }
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
        traceConnections: traceConnections,
        stimulusEvents: stimulusEvents,
        controlStimulusEvents: controlStimulusEvents,
        wiringEvents: wiringEvents,
        destinationConnections: destinationConnections,
        features: features(samples),
        traceFeatures: traceFeatures(traceSamples),
        samples: samples,
        traceSamples: traceSamples
      };
    }, {
      patch: fixture.patch,
      fixture: { mode: fixture.mode, route: fixture.route },
      settings: {
        sampleRate: SAMPLE_RATE,
        durationSeconds: DURATION_SECONDS,
        impulseTimeSeconds: IMPULSE_TIME_SECONDS,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        baseDelaySeconds: BASE_DELAY_SECONDS,
        highExpressionValue: HIGH_EXPRESSION_VALUE
      }
    });

    const samples = renderResult.samples || [];
    const traceSamples = renderResult.traceSamples || [];
    delete renderResult.samples;
    delete renderResult.traceSamples;
    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    const tracePath = resolve(evidenceRoot, "traces", `${fixture.id}.expression.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));
    await writeFile(tracePath, wavBufferFromSamples(traceSamples, SAMPLE_RATE));

    const failures = [];
    assertCondition(failures, !fixture.derivationProblem, "fixture-derivation", "expression feedback fixture could not be derived", fixture.derivationProblem);
    assertCondition(failures, renderResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", renderResult);
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, renderResult.traceConnections > 0, "expression-trace", "Cport Exp/CV output was not connected for trace capture", renderResult);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "impulse stimulus was not connected", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to destination", renderResult);
    assertCondition(failures, renderResult.features.firstPeak >= MIN_FIRST_PEAK, "audio-route", "first delayed peak is below threshold", { observed: renderResult.features.firstPeak, threshold: MIN_FIRST_PEAK });

    let classification = fixture.expectedClassification;
    if (fixture.mode === "positive-high-expression-feedback") {
      assertCondition(failures, renderResult.traceFeatures.rms >= MIN_HIGH_EXPRESSION_TRACE_RMS, "expression-control", "high expression trace RMS is below threshold", { observed: renderResult.traceFeatures.rms, threshold: MIN_HIGH_EXPRESSION_TRACE_RMS });
      assertCondition(failures, renderResult.features.tailPeak >= MIN_TAIL_PEAK, "feedback-tail", "high expression feedback did not produce repeat tail peak", { observed: renderResult.features.tailPeak, threshold: MIN_TAIL_PEAK });
      assertCondition(failures, renderResult.features.tailToFirstPeakRatio >= MIN_TAIL_RATIO, "feedback-tail", "high expression feedback tail ratio is below threshold", { observed: renderResult.features.tailToFirstPeakRatio, threshold: MIN_TAIL_RATIO });
      assertCondition(failures, renderResult.features.repeat2PeakValue >= MIN_TAIL_PEAK, "feedback-tail", "high expression feedback repeat polarity was not positive", { observed: renderResult.features.repeat2PeakValue, threshold: MIN_TAIL_PEAK });
      if (failures.length > 0) classification = "expression-feedback-tail-not-proven";
    } else if (fixture.mode === "low-expression-feedback") {
      assertCondition(failures, renderResult.traceFeatures.rms <= MAX_LOW_EXPRESSION_TRACE_RMS, "expression-negative-control", "low expression trace was not silent", { observed: renderResult.traceFeatures.rms, threshold: MAX_LOW_EXPRESSION_TRACE_RMS });
      assertCondition(failures, renderResult.features.tailToFirstPeakRatio <= MAX_CONTROL_TAIL_RATIO, "expression-negative-control", "low expression control produced feedback tail", { observed: renderResult.features.tailToFirstPeakRatio, threshold: MAX_CONTROL_TAIL_RATIO });
      if (failures.length > 0) classification = "low-expression-feedback-control-failed";
    } else if (fixture.mode === "inverted-expression-feedback") {
      assertCondition(failures, (renderResult.controlStimulusEvents || []).length > 0, "expression-negative-control", "inverted feedback control stimulus was not applied", renderResult);
      assertCondition(failures, renderResult.features.tailPeak >= MIN_TAIL_PEAK, "expression-negative-control", "inverted feedback did not produce a measurable repeat tail", { observed: renderResult.features.tailPeak, threshold: MIN_TAIL_PEAK });
      assertCondition(failures, renderResult.features.repeat2PeakValue <= -MIN_TAIL_PEAK, "expression-negative-control", "inverted feedback repeat polarity did not invert", { observed: renderResult.features.repeat2PeakValue, threshold: -MIN_TAIL_PEAK });
      if (failures.length > 0) classification = "inverted-expression-feedback-control-failed";
    } else {
      assertCondition(failures, renderResult.traceFeatures.rms >= MIN_HIGH_EXPRESSION_TRACE_RMS, "expression-negative-control", "high expression trace was not preserved", { observed: renderResult.traceFeatures.rms, threshold: MIN_HIGH_EXPRESSION_TRACE_RMS });
      assertCondition(failures, renderResult.features.tailToFirstPeakRatio <= MAX_CONTROL_TAIL_RATIO, "expression-negative-control", "control route produced feedback tail", { observed: renderResult.features.tailToFirstPeakRatio, threshold: MAX_CONTROL_TAIL_RATIO });
      if (failures.length > 0) classification = `${fixture.mode}-control-failed`;
    }

    const record = {
      id: fixture.id,
      mode: fixture.mode,
      status: failures.length === 0 ? (fixture.mode === "positive-high-expression-feedback" ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
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

  const positives = records.filter((record) => record.mode === "positive-high-expression-feedback");
  const disconnectedControls = records.filter((record) => record.mode === "disconnected-expression-feedback");
  const lowControls = records.filter((record) => record.mode === "low-expression-feedback");
  const invertedControls = records.filter((record) => record.mode === "inverted-expression-feedback");
  const wrongMixControls = records.filter((record) => record.mode === "wrong-target-mix");
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, positives.every((record) => record.status === PASS_STATUS), "expression-feedback", "one or more positive expression feedback fixtures did not prove feedback-tail behavior", positives);
  assertCondition(assertionFailures, disconnectedControls.every((record) => record.classification === "expression-feedback-disconnected-classified"), "expression-negative-control", "one or more disconnected controls failed classification", disconnectedControls);
  assertCondition(assertionFailures, lowControls.every((record) => record.classification === "low-expression-feedback-classified"), "expression-negative-control", "one or more low-expression controls failed classification", lowControls);
  assertCondition(assertionFailures, invertedControls.every((record) => record.classification === "inverted-expression-feedback-classified"), "expression-negative-control", "one or more inverted expression controls failed classification", invertedControls);
  assertCondition(assertionFailures, wrongMixControls.every((record) => record.classification === "expression-wrong-target-mix-classified"), "expression-negative-control", "one or more wrong-target-mix controls failed classification", wrongMixControls);

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-expression-feedback-semantics-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      mode: record.mode,
      status: record.status,
      classification: record.classification,
      patchPath: record.patchPath,
      capturePath: record.capturePath,
      tracePath: record.tracePath,
      expressionTraceRms: record.audioEvidence.traceFeatures?.rms ?? null,
      expressionTraceMin: record.audioEvidence.traceFeatures?.min ?? null,
      expressionTraceMax: record.audioEvidence.traceFeatures?.max ?? null,
      firstPeak: record.audioEvidence.features?.firstPeak ?? null,
      firstPeakValue: record.audioEvidence.features?.firstPeakValue ?? null,
      tailPeak: record.audioEvidence.features?.tailPeak ?? null,
      tailToFirstPeakRatio: record.audioEvidence.features?.tailToFirstPeakRatio ?? null,
      repeat2Peak: record.audioEvidence.features?.repeat2Peak ?? null,
      repeat2PeakValue: record.audioEvidence.features?.repeat2PeakValue ?? null,
      repeat3Peak: record.audioEvidence.features?.repeat3Peak ?? null,
      repeat3PeakValue: record.audioEvidence.features?.repeat3PeakValue ?? null,
      repeat4Peak: record.audioEvidence.features?.repeat4Peak ?? null,
      repeat4PeakValue: record.audioEvidence.features?.repeat4PeakValue ?? null,
      assertionFailureCount: record.assertionFailures.length
    }))
  };
  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-expression-feedback-semantics-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      channelCount: 1,
      impulseTimeSeconds: IMPULSE_TIME_SECONDS,
      impulseAmplitude: IMPULSE_AMPLITUDE
    },
    routeUnderTest: {
      generatedRoute: "Cport Exp/CV output to Delay Line feedback_cv input",
      audioProperty: "feedback-tail repeat amplitude",
      controlProperty: "deterministic expression/CV value",
      baseDelaySeconds: BASE_DELAY_SECONDS,
      highExpressionValue: HIGH_EXPRESSION_VALUE,
      lowExpressionValue: LOW_EXPRESSION_VALUE
    },
    deterministicFixtureBoundary: {
      source: "generated delay-path emulator patch JSON",
      transformation: "preserve generated Cport Exp/CV module, generated expression-feedback route, and generated connection strength; fix delay time to 100 ms, base feedback to 0, wet-only mix, remove unrelated LFO time modulation, and use deterministic expression values for measurement",
      expressionPedalFeedbackSemanticsClaim: true,
      originalUnmodifiedPatchTimingClaim: false,
      actualPhysicalPedalHardwareClaim: false
    },
    thresholds: {
      minFirstPeak: MIN_FIRST_PEAK,
      minTailPeak: MIN_TAIL_PEAK,
      minTailRatio: MIN_TAIL_RATIO,
      maxControlTailRatio: MAX_CONTROL_TAIL_RATIO,
      minHighExpressionTraceRms: MIN_HIGH_EXPRESSION_TRACE_RMS,
      maxLowExpressionTraceRms: MAX_LOW_EXPRESSION_TRACE_RMS
    },
    negativeControls: {
      disconnectedFeedbackRouteIncluded: true,
      lowExpressionIncluded: true,
      invertedFeedbackIncluded: true,
      wrongTargetMixIncluded: true
    }
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-expression-feedback-semantics-evidence.v1",
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
      expressionFeedbackTailCount: positives.filter((record) => record.status === PASS_STATUS).length,
      disconnectedControlClassifiedCount: disconnectedControls.filter((record) => record.classification === "expression-feedback-disconnected-classified").length,
      lowExpressionControlClassifiedCount: lowControls.filter((record) => record.classification === "low-expression-feedback-classified").length,
      invertedControlClassifiedCount: invertedControls.filter((record) => record.classification === "inverted-expression-feedback-classified").length,
      wrongTargetMixClassifiedCount: wrongMixControls.filter((record) => record.classification === "expression-wrong-target-mix-classified").length,
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
      expressionPedalFeedbackSemanticsClaim: assertionFailures.length === 0,
      deterministicExpressionInputClaim: true,
      originalUnmodifiedPatchTimingClaim: false,
      physicalPedalHardwareClaim: false,
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
    schemaVersion: "zoia.generated-patch-expression-feedback-semantics-evidence.v1",
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
