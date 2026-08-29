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
const DEFAULT_PATCH_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/filter-test-emulator");
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-filter-semantics");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-filter-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 0.5;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const LOW_FREQUENCY = 80;
const HIGH_FREQUENCY = 4000;
const AMPLITUDE = 0.35;
const MIN_RMS = 0.01;
const MAX_LOWPASS_RATIO = 0.22;
const MIN_CONTROL_RATIO = 0.6;
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBypassControl(entry, evidenceRoot) {
  const patch = clone(entry.patch);
  patch.name = `${patch.name || entry.id} Bypass Filter Control`;
  patch.sourcePatchId = `${patch.sourcePatchId || entry.id}-bypass-filter-control`;
  const audioIn = patch.modules.find((mod) => mod.typeName === "Audio Input");
  const audioOut = patch.modules.find((mod) => mod.typeName === "Audio Output");
  patch.connections = audioIn && audioOut
    ? [{ srcMod: audioIn.idx, srcBlock: 0, dstMod: audioOut.idx, dstBlock: 0, strength: 10000 }]
    : [];
  return {
    id: `${entry.id}-bypass-filter-control`,
    patchPath: resolve(evidenceRoot, "fixtures", `${entry.id}-bypass-filter-control.patch.json`),
    patch,
    expectLowpass: false,
    controlKind: "bypass-filter"
  };
}

function makeHighpassControl(entry, evidenceRoot) {
  const patch = clone(entry.patch);
  patch.name = `${patch.name || entry.id} Highpass Output Control`;
  patch.sourcePatchId = `${patch.sourcePatchId || entry.id}-highpass-output-control`;
  const filter = patch.modules.find((mod) => mod.typeName === "SV Filter");
  const audioOut = patch.modules.find((mod) => mod.typeName === "Audio Output");
  if (filter && audioOut) {
    filter.blocks = [
      { n: "Audio In", t: "audio_in" },
      { n: "Frequency", t: "cv_in" },
      { n: "Resonance", t: "cv_in" },
      { n: "LP Out", t: "audio_out" },
      { n: "BP Out", t: "audio_out" },
      { n: "HP Out", t: "audio_out" }
    ];
    filter.blockCount = filter.blocks.length;
    filter.options = [0, 0, 0, 0, 0, 0, 0, 0];
    filter.paramCount = filter.blocks.length;
    filter.params = [0, filter.params?.[1] ?? 0, filter.params?.[2] ?? 0, 0, 0, 0];
    patch.connections = patch.connections.map((connection) => {
      if (connection.srcMod === filter.idx && connection.dstMod === audioOut.idx) {
        return { ...connection, srcBlock: 5 };
      }
      return connection;
    });
  }
  return {
    id: `${entry.id}-highpass-output-control`,
    patchPath: resolve(evidenceRoot, "fixtures", `${entry.id}-highpass-output-control.patch.json`),
    patch,
    expectLowpass: false,
    controlKind: "wrong-output-highpass"
  };
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
  const positives = [];
  for (const fileName of patchFiles) {
    const patchPath = join(patchRoot, fileName);
    const patch = await readJson(patchPath);
    positives.push({ id: fileName.replace(/\.patch\.json$/, ""), patchPath, patch, expectLowpass: true, controlKind: "positive" });
  }
  const entries = [];
  for (const positive of positives) {
    entries.push(positive);
    entries.push(makeBypassControl(positive, evidenceRoot));
    entries.push(makeHighpassControl(positive, evidenceRoot));
  }
  for (const entry of entries.filter((item) => item.controlKind !== "positive")) {
    await writeJson(entry.patchPath, entry.patch);
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
  for (const entry of entries) {
    const renderResult = await page.evaluate(async ({ patch, settings }) => {
      function connectIfPossible(source, target) {
        if (!source || !target || typeof source.connect !== 'function') return false;
        try {
          source.connect(target);
          return true;
        } catch (error) {
          return false;
        }
      }

      function magnitudeAt(samples, sampleRate, frequency) {
        var start = Math.floor(samples.length * 0.1);
        var usable = samples.length - start;
        var real = 0;
        var imag = 0;
        for (var i = start; i < samples.length; i++) {
          var phase = 2 * Math.PI * frequency * (i - start) / sampleRate;
          real += samples[i] * Math.cos(phase);
          imag -= samples[i] * Math.sin(phase);
        }
        return Math.sqrt(real * real + imag * imag) / Math.max(usable, 1);
      }

      function features(samples, sampleRate) {
        var sumSquares = 0;
        var peak = 0;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
        }
        var lowMagnitude = magnitudeAt(samples, sampleRate, settings.lowFrequency);
        var highMagnitude = magnitudeAt(samples, sampleRate, settings.highFrequency);
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak,
          lowFrequency: settings.lowFrequency,
          highFrequency: settings.highFrequency,
          lowMagnitude,
          highMagnitude,
          highLowRatio: highMagnitude / Math.max(lowMagnitude, 0.000000001),
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      function makeTwoTone(ctx) {
        var buffer = ctx.createBuffer(1, settings.frameCount, settings.sampleRate);
        var channel = buffer.getChannelData(0);
        for (var i = 0; i < channel.length; i++) {
          var t = i / settings.sampleRate;
          channel[i] = settings.amplitude * Math.sin(2 * Math.PI * settings.lowFrequency * t)
            + settings.amplitude * Math.sin(2 * Math.PI * settings.highFrequency * t);
        }
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.start(0);
        return source;
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
          var stimulus = makeTwoTone(ctx);
          stimulus.connect(output);
          stimulusEvents.push({ moduleIndex: ai, outputBlock: outputIndex, stimulus: 'two-tone-sine', lowFrequency: settings.lowFrequency, highFrequency: settings.highFrequency });
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
          wiringEvents.push({ connectionIndex: c, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength, connected: Boolean(targetConnected) });
        } else {
          wiringEvents.push({ connectionIndex: c, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength, connected: false });
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
        patchName: patch.name,
        unsupportedModules,
        stimulusEvents,
        wiringEvents,
        destinationConnections,
        features: features(samples, settings.sampleRate),
        samples
      };
    }, {
      patch: entry.patch,
      settings: {
        sampleRate: SAMPLE_RATE,
        frameCount: FRAME_COUNT,
        lowFrequency: LOW_FREQUENCY,
        highFrequency: HIGH_FREQUENCY,
        amplitude: AMPLITUDE
      }
    });

    const samples = renderResult.samples || [];
    delete renderResult.samples;
    const capturePath = resolve(evidenceRoot, "captures", `${entry.id}.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));

    const failures = [];
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "audio-runtime", "filter patch has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "audio-stimulus", "two-tone stimulus was not connected", renderResult);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "no Audio Output module was connected to destination", renderResult);
    assertCondition(failures, renderResult.features.rms >= MIN_RMS, "audio-signal", "filter fixture did not produce measurable signal", { observed: renderResult.features.rms, threshold: MIN_RMS });

    let classification = "lowpass-filter-present";
    if (entry.expectLowpass) {
      assertCondition(failures, renderResult.features.highLowRatio <= MAX_LOWPASS_RATIO, "filter-semantics", "generated filter patch did not attenuate high-frequency stimulus enough for low-pass claim", {
        observed: renderResult.features.highLowRatio,
        threshold: MAX_LOWPASS_RATIO,
        lowMagnitude: renderResult.features.lowMagnitude,
        highMagnitude: renderResult.features.highMagnitude
      });
      if (failures.length > 0) classification = "lowpass-filter-not-proven";
    } else {
      const notLowpass = renderResult.features.highLowRatio >= MIN_CONTROL_RATIO;
      assertCondition(failures, notLowpass, "filter-negative-control", "negative control incorrectly satisfied low-pass filter classification", {
        observed: renderResult.features.highLowRatio,
        threshold: MIN_CONTROL_RATIO,
        lowMagnitude: renderResult.features.lowMagnitude,
        highMagnitude: renderResult.features.highMagnitude
      });
      classification = notLowpass ? `${entry.controlKind}-classified` : "unexpected-lowpass-classification";
    }

    const record = {
      id: entry.id,
      status: failures.length === 0 ? (entry.expectLowpass ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
      classification,
      expectedLowpass: entry.expectLowpass,
      controlKind: entry.controlKind,
      patchPath: entry.patchPath,
      capturePath,
      assertionFailures: failures,
      audioEvidence: renderResult
    };
    await writeJson(resolve(evidenceRoot, `${entry.id}.json`), record);
    records.push(record);
  }

  await browser.close();

  const positivesSeen = records.filter((record) => record.expectedLowpass);
  const controlsSeen = records.filter((record) => !record.expectedLowpass);
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, positivesSeen.length > 0 && positivesSeen.every((record) => record.status === PASS_STATUS), "filter-positive", "one or more generated filter patches did not prove low-pass behavior", positivesSeen);
  assertCondition(assertionFailures, controlsSeen.some((record) => record.controlKind === "bypass-filter" && record.classification === "bypass-filter-classified"), "filter-negative-control", "bypass filter negative control did not classify", controlsSeen);
  assertCondition(assertionFailures, controlsSeen.some((record) => record.controlKind === "wrong-output-highpass" && record.classification === "wrong-output-highpass-classified"), "filter-negative-control", "high-pass wrong-output negative control did not classify", controlsSeen);

  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-filter-semantics-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      frameCount: FRAME_COUNT,
      channelCount: 1
    },
    stimulus: {
      kind: "two-tone-sine",
      lowFrequency: LOW_FREQUENCY,
      highFrequency: HIGH_FREQUENCY,
      amplitude: AMPLITUDE,
      routedTo: "all Audio Input audio_out blocks"
    },
    thresholds: {
      minRms: MIN_RMS,
      maxLowpassHighLowRatio: MAX_LOWPASS_RATIO,
      minControlHighLowRatio: MIN_CONTROL_RATIO
    },
    negativeControls: {
      bypassFilterIncluded: true,
      wrongOutputHighpassIncluded: true
    }
  };

  const classificationLog = {
    schemaVersion: "zoia.generated-patch-filter-semantics-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      patchPath: record.patchPath,
      status: record.status,
      classification: record.classification,
      expectedLowpass: record.expectedLowpass,
      controlKind: record.controlKind,
      rms: record.audioEvidence.features?.rms ?? null,
      peak: record.audioEvidence.features?.peak ?? null,
      lowMagnitude: record.audioEvidence.features?.lowMagnitude ?? null,
      highMagnitude: record.audioEvidence.features?.highMagnitude ?? null,
      highLowRatio: record.audioEvidence.features?.highLowRatio ?? null,
      capturePath: record.capturePath,
      assertionFailureCount: record.assertionFailures.length
    }))
  };

  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-filter-semantics-evidence.v1",
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
      browserChannel: EDGE_CHANNEL,
      simulatorHtml: SIMULATOR_HTML
    },
    summary: {
      blockerCount: assertionFailures.length,
      patchCount: positivesSeen.length,
      lowpassClassifiedCount: positivesSeen.filter((record) => record.classification === "lowpass-filter-present").length,
      bypassControlClassifiedCount: controlsSeen.filter((record) => record.classification === "bypass-filter-classified").length,
      highpassControlClassifiedCount: controlsSeen.filter((record) => record.classification === "wrong-output-highpass-classified").length,
      captureCount: records.length
    },
    assertionFailures,
    records,
    artifacts: {
      resultPath,
      evidenceRoot,
      stimulusManifestPath: resolve(evidenceRoot, "stimulus-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json"),
      capturesRoot: resolve(evidenceRoot, "captures"),
      fixturesRoot: resolve(evidenceRoot, "fixtures")
    },
    claimBoundaries: {
      generatedFilterRuntimeClaim: assertionFailures.length === 0,
      lowpassSpectralEvidenceClaim: assertionFailures.length === 0,
      arbitraryFilterSemanticsClaim: false,
      musicalQualityClaim: false,
      fullDspAccuracyClaim: false,
      hardwareParityClaim: false,
      hardwareBinaryExportClaim: false
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({ status: result.status, ...result.summary, resultPath }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-filter-semantics-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
