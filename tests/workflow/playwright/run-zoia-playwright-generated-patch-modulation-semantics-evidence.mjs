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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-modulation-semantics");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-modulation-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 0.45;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const IMPULSE_AMPLITUDE = 0.75;
const BASE_DELAY_SECONDS = 0.1;
const MODULATION_OFFSET_SECONDS = 0.05;
const MODULATION_STRENGTH = 10000;
const SEMANTIC_FEEDBACK = 0;
const SEMANTIC_MIX = 1;
const WINDOW_RADIUS_SECONDS = 0.005;
const MIN_WINDOW_PEAK = 0.2;
const MIN_RMS = 0.0005;
const MAX_ABSENT_WINDOW_PEAK = 0.000001;
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function setDeterministicDelayParams(delayModule) {
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
  patch.name = `${sourcePatch.name} Modulation ${mode}`;
  patch.labels = Array.from(new Set([...(patch.labels || []), "modulation-semantics", mode]));
  patch.description = `${patch.description || ""} Deterministic modulation-semantics fixture: generated LFO to Delay Line time route is tested with a fixed CV source.`.trim();
  const delayModule = findDelayModule(patch);
  const audioInput = findAudioInputModule(patch);
  const audioOutput = findAudioOutputModule(patch);
  if (!delayModule || !audioInput || !audioOutput) return { patch, problem: "required-module-missing", route: null };

  setDeterministicDelayParams(delayModule);
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
  if (!generatedTimeRoute) return { patch, problem: "generated-time-route-missing", route: null };

  patch.connections = [
    { srcMod: audioInput.idx, srcBlock: audioInputOutBlock, dstMod: delayIndex, dstBlock: audioInBlock, strength: 10000 },
    { srcMod: delayIndex, srcBlock: delayOutBlock, dstMod: audioOutput.idx, dstBlock: audioOutputInBlock, strength: 10000 }
  ];

  if (mode === "positive-time-modulation") {
    patch.connections.push({
      srcMod: generatedTimeRoute.srcMod,
      srcBlock: generatedTimeRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: timeBlock,
      strength: MODULATION_STRENGTH
    });
  } else if (mode === "wrong-target-feedback") {
    patch.connections.push({
      srcMod: generatedTimeRoute.srcMod,
      srcBlock: generatedTimeRoute.srcBlock,
      dstMod: delayIndex,
      dstBlock: feedbackBlock,
      strength: MODULATION_STRENGTH
    });
  }

  return {
    patch,
    problem: null,
    route: {
      generatedSourceModuleId: sourcePatch.modules[generatedTimeRoute.srcMod]?.sourceGeneratedModuleId || null,
      generatedSourceTypeName: sourcePatch.modules[generatedTimeRoute.srcMod]?.typeName || null,
      generatedSourceBlock: generatedTimeRoute.srcBlock,
      generatedTargetModuleId: delayModule.sourceGeneratedModuleId || null,
      generatedTargetTypeName: delayModule.typeName,
      generatedTargetTimeBlock: timeBlock,
      generatedTargetFeedbackBlock: feedbackBlock,
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
  await mkdir(resolve(evidenceRoot, "fixtures"), { recursive: true });

  const patchFiles = (await readdir(patchRoot)).filter((name) => name.endsWith(".patch.json")).sort();
  if (patchFiles.length === 0) throw new Error(`No .patch.json files found in ${patchRoot}`);

  const fixtures = [];
  for (const fileName of patchFiles) {
    const sourcePatchPath = join(patchRoot, fileName);
    const sourcePatch = await readJson(sourcePatchPath);
    const baseId = fileName.replace(/\.patch\.json$/, "");
    for (const mode of ["positive-time-modulation", "disconnected-modulation", "wrong-target-feedback"]) {
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
        expectedClassification: mode === "positive-time-modulation" ? "modulation-shifts-delay-window" : mode === "disconnected-modulation" ? "modulation-disconnected-classified" : "wrong-target-classified"
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
        var baselineWindow = peakInWindow(samples, settings.baseDelaySeconds, settings.windowRadiusSeconds);
        var shiftedWindow = peakInWindow(samples, settings.baseDelaySeconds + settings.modulationOffsetSeconds, settings.windowRadiusSeconds);
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak: peak,
          peakIndex: peakIndex,
          baselineWindowPeak: baselineWindow.peak,
          baselineWindowPeakIndex: baselineWindow.peakIndex,
          baselineWindowStart: baselineWindow.start,
          baselineWindowEnd: baselineWindow.end,
          shiftedWindowPeak: shiftedWindow.peak,
          shiftedWindowPeakIndex: shiftedWindow.peakIndex,
          shiftedWindowStart: shiftedWindow.start,
          shiftedWindowEnd: shiftedWindow.end,
          expectedBaseDelaySeconds: settings.baseDelaySeconds,
          expectedShiftedDelaySeconds: settings.baseDelaySeconds + settings.modulationOffsetSeconds,
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
      var modulationStimulusEvents = [];
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

      function isDeterministicModulationConnection(connection) {
        if (!fixture.route || (fixture.mode !== 'positive-time-modulation' && fixture.mode !== 'wrong-target-feedback')) return false;
        var sourceModule = patch.modules[connection.srcMod];
        if (!sourceModule) return false;
        var routeSourceMatches = sourceModule.typeName === fixture.route.generatedSourceTypeName &&
          sourceModule.sourceGeneratedModuleId === fixture.route.generatedSourceModuleId &&
          connection.srcBlock === fixture.route.generatedSourceBlock;
        if (!routeSourceMatches) return false;
        if (fixture.mode === 'positive-time-modulation') {
          return connection.dstBlock === fixture.route.generatedTargetTimeBlock;
        }
        return connection.dstBlock === fixture.route.generatedTargetFeedbackBlock;
      }

      for (var c = 0; c < patch.connections.length; c++) {
        var connection = patch.connections[c];
        var srcNode = nodes[connection.srcMod];
        var dstNode = nodes[connection.dstMod];
        var deterministicModulation = isDeterministicModulationConnection(connection);
        var srcOut = srcNode && srcNode.outputs ? srcNode.outputs[connection.srcBlock] : null;
        var dstIn = dstNode && dstNode.inputs ? dstNode.inputs[connection.dstBlock] : null;
        var strength = (connection.strength !== undefined ? connection.strength : 10000) / 10000;
        if (deterministicModulation) {
          var constant = ctx.createConstantSource();
          constant.offset.value = settings.modulationOffsetSeconds;
          constant.start(0);
          srcOut = constant;
          modulationStimulusEvents.push({
            connectionIndex: c,
            sourceModuleIndex: connection.srcMod,
            sourceBlock: connection.srcBlock,
            targetModuleIndex: connection.dstMod,
            targetBlock: connection.dstBlock,
            stimulus: 'deterministic-constant-cv-offset',
            offsetSeconds: settings.modulationOffsetSeconds
          });
        }
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
        modulationStimulusEvents: modulationStimulusEvents,
        wiringEvents: wiringEvents,
        destinationConnections: destinationConnections,
        features: features(samples),
        samples: samples
      };
    }, {
      patch: fixture.patch,
      fixture: { mode: fixture.mode, route: fixture.route },
      settings: {
        sampleRate: SAMPLE_RATE,
        frameCount: FRAME_COUNT,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        baseDelaySeconds: BASE_DELAY_SECONDS,
        modulationOffsetSeconds: MODULATION_OFFSET_SECONDS,
        windowRadiusSeconds: WINDOW_RADIUS_SECONDS
      }
    });

    const samples = renderResult.samples || [];
    delete renderResult.samples;
    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));

    const failures = [];
    assertCondition(failures, !fixture.derivationProblem, "fixture-derivation", "modulation fixture could not be derived", fixture.derivationProblem);
    assertCondition(failures, renderResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", renderResult);
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "impulse stimulus was not connected", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to destination", renderResult);
    assertCondition(failures, renderResult.features.rms >= MIN_RMS, "audio-signal", "fixture did not produce measurable signal", { observed: renderResult.features.rms, threshold: MIN_RMS });

    let classification = fixture.expectedClassification;
    if (fixture.mode === "positive-time-modulation") {
      assertCondition(failures, (renderResult.modulationStimulusEvents || []).length > 0, "modulation-stimulus", "constant CV modulation stimulus was not connected", renderResult);
      assertCondition(failures, renderResult.features.shiftedWindowPeak >= MIN_WINDOW_PEAK, "modulation-semantics", "positive time modulation did not produce shifted delay-window peak", {
        observed: renderResult.features.shiftedWindowPeak,
        threshold: MIN_WINDOW_PEAK,
        shiftedWindowStart: renderResult.features.shiftedWindowStart,
        shiftedWindowEnd: renderResult.features.shiftedWindowEnd
      });
      assertCondition(failures, renderResult.features.baselineWindowPeak <= MAX_ABSENT_WINDOW_PEAK, "modulation-semantics", "positive time modulation still produced baseline-window peak", {
        observed: renderResult.features.baselineWindowPeak,
        threshold: MAX_ABSENT_WINDOW_PEAK,
        baselineWindowStart: renderResult.features.baselineWindowStart,
        baselineWindowEnd: renderResult.features.baselineWindowEnd
      });
      if (failures.length > 0) classification = "modulation-shift-not-proven";
    } else if (fixture.mode === "disconnected-modulation") {
      assertCondition(failures, renderResult.features.baselineWindowPeak >= MIN_WINDOW_PEAK, "modulation-negative-control", "disconnected modulation did not preserve baseline-window peak", {
        observed: renderResult.features.baselineWindowPeak,
        threshold: MIN_WINDOW_PEAK
      });
      assertCondition(failures, renderResult.features.shiftedWindowPeak <= MAX_ABSENT_WINDOW_PEAK, "modulation-negative-control", "disconnected modulation produced shifted-window peak", {
        observed: renderResult.features.shiftedWindowPeak,
        threshold: MAX_ABSENT_WINDOW_PEAK
      });
      if (failures.length > 0) classification = "disconnected-control-failed";
    } else if (fixture.mode === "wrong-target-feedback") {
      assertCondition(failures, (renderResult.modulationStimulusEvents || []).length > 0, "modulation-stimulus", "constant CV modulation stimulus was not connected", renderResult);
      assertCondition(failures, renderResult.features.baselineWindowPeak >= MIN_WINDOW_PEAK, "modulation-negative-control", "wrong-target modulation did not preserve baseline-window peak", {
        observed: renderResult.features.baselineWindowPeak,
        threshold: MIN_WINDOW_PEAK
      });
      assertCondition(failures, renderResult.features.shiftedWindowPeak <= MAX_ABSENT_WINDOW_PEAK, "modulation-negative-control", "wrong-target modulation produced shifted-window peak", {
        observed: renderResult.features.shiftedWindowPeak,
        threshold: MAX_ABSENT_WINDOW_PEAK
      });
      if (failures.length > 0) classification = "wrong-target-control-failed";
    }

    const record = {
      id: fixture.id,
      mode: fixture.mode,
      status: failures.length === 0 ? (fixture.mode === "positive-time-modulation" ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
      classification,
      expectedClassification: fixture.expectedClassification,
      route: fixture.route,
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

  const positives = records.filter((record) => record.mode === "positive-time-modulation");
  const disconnectedControls = records.filter((record) => record.mode === "disconnected-modulation");
  const wrongTargetControls = records.filter((record) => record.mode === "wrong-target-feedback");
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, positives.every((record) => record.status === PASS_STATUS), "modulation-semantics", "one or more positive modulation fixtures did not prove shifted timing", positives);
  assertCondition(assertionFailures, disconnectedControls.every((record) => record.classification === "modulation-disconnected-classified"), "modulation-negative-control", "one or more disconnected controls failed classification", disconnectedControls);
  assertCondition(assertionFailures, wrongTargetControls.every((record) => record.classification === "wrong-target-classified"), "modulation-negative-control", "one or more wrong-target controls failed classification", wrongTargetControls);

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-modulation-semantics-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      mode: record.mode,
      status: record.status,
      classification: record.classification,
      patchPath: record.patchPath,
      capturePath: record.capturePath,
      rms: record.audioEvidence.features?.rms ?? null,
      baselineWindowPeak: record.audioEvidence.features?.baselineWindowPeak ?? null,
      shiftedWindowPeak: record.audioEvidence.features?.shiftedWindowPeak ?? null,
      baselineWindowPeakIndex: record.audioEvidence.features?.baselineWindowPeakIndex ?? null,
      shiftedWindowPeakIndex: record.audioEvidence.features?.shiftedWindowPeakIndex ?? null,
      assertionFailureCount: record.assertionFailures.length
    }))
  };
  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-modulation-semantics-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      frameCount: FRAME_COUNT,
      channelCount: 1
    },
    routeUnderTest: {
      generatedRoute: "LFO cv output to Delay Line time_cv input",
      audioProperty: "delay-window timing",
      baseDelaySeconds: BASE_DELAY_SECONDS,
      modulationOffsetSeconds: MODULATION_OFFSET_SECONDS,
      expectedShiftedDelaySeconds: BASE_DELAY_SECONDS + MODULATION_OFFSET_SECONDS
    },
    deterministicFixtureBoundary: {
      source: "generated delay-path emulator patch JSON",
      transformation: "fix base delay time to 100 ms, feedback to 0, wet-only mix; replace LFO behavior with constant CV offset for route-under-test fixtures",
      actualLfoWaveformSemanticsClaim: false,
      expressionPedalFeedbackSemanticsClaim: false
    },
    stimulus: {
      audio: { kind: "single-sample-impulse", amplitude: IMPULSE_AMPLITUDE },
      modulation: { kind: "constant-cv-offset", offsetSeconds: MODULATION_OFFSET_SECONDS }
    },
    thresholds: {
      minRms: MIN_RMS,
      minWindowPeak: MIN_WINDOW_PEAK,
      maxAbsentWindowPeak: MAX_ABSENT_WINDOW_PEAK,
      windowRadiusSeconds: WINDOW_RADIUS_SECONDS
    },
    negativeControls: {
      disconnectedModulationIncluded: true,
      wrongTargetFeedbackIncluded: true
    }
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-modulation-semantics-evidence.v1",
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
      modulationShiftCount: positives.filter((record) => record.status === PASS_STATUS).length,
      disconnectedControlClassifiedCount: disconnectedControls.filter((record) => record.classification === "modulation-disconnected-classified").length,
      wrongTargetClassifiedCount: wrongTargetControls.filter((record) => record.classification === "wrong-target-classified").length,
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
      generatedTimeModulationRouteSemanticsClaim: assertionFailures.length === 0,
      deterministicConstantCvStimulusClaim: true,
      actualLfoWaveformSemanticsClaim: false,
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
    captureRoot: result.artifacts.captureRoot
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath, evidenceRoot } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-modulation-semantics-evidence.v1",
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
