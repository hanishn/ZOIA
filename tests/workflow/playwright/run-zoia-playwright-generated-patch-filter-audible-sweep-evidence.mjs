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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-filter-audible-sweep");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-filter-audible-sweep";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 1.25;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const LOW_FREQUENCY = 160;
const MID_FREQUENCY = 360;
const HIGH_FREQUENCY = 1200;
const AMPLITUDE = 0.22;
const MIN_GENERATED_DIFF_RMS = 0.02;
const MIN_EXAGGERATED_DIFF_RMS = 0.02;
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

function findFilter(patch) {
  return patch.modules.find((module) => module.typeName === "SV Filter") || null;
}

function findLfo(patch) {
  return patch.modules.find((module) => module.typeName === "LFO") || null;
}

function blockIndex(module, type, needle) {
  return module?.blocks?.findIndex((block) => block.t === type && String(block.n || "").toLowerCase().includes(needle)) ?? -1;
}

function deriveFixture(sourcePatch, mode) {
  const patch = clone(sourcePatch);
  const filter = findFilter(patch);
  const lfo = findLfo(patch);
  const cutoffBlock = blockIndex(filter, "cv_in", "freq");
  const lfoOutBlock = blockIndex(lfo, "cv_out", "output");
  patch.name = `${patch.name || "Generated Filter"} Audible Sweep ${mode}`;
  patch.labels = Array.from(new Set([...(patch.labels || []), "filter-audible-sweep", mode]));
  const nonLfoConnections = (patch.connections || []).filter((connection) => !(connection.srcMod === lfo?.idx));
  patch.connections = [...nonLfoConnections];
  if (mode === "generated-cutoff-route" || mode === "exaggerated-cutoff-route") {
    patch.connections.push({
      srcMod: lfo.idx,
      srcBlock: lfoOutBlock,
      dstMod: filter.idx,
      dstBlock: cutoffBlock,
      strength: mode === "exaggerated-cutoff-route" ? 10000000 : 3500
    });
  }
  return {
    patch,
    route: {
      mode,
      lfoModuleIndex: lfo?.idx ?? null,
      lfoOutBlock,
      filterModuleIndex: filter?.idx ?? null,
      cutoffBlock,
      expectedFrequencyHz: 0.01 + ((lfo?.params?.[0] || 0) / 65535) * 19.99,
      expectedDepth: (lfo?.params?.[1] || 0) / 65535
    }
  };
}

function rms(samples) {
  return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / Math.max(samples.length, 1));
}

function diffRms(a, b) {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const diff = a[index] - b[index];
    sum += diff * diff;
  }
  return Math.sqrt(sum / Math.max(length, 1));
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
    const sourcePatch = await readJson(join(patchRoot, fileName));
    const baseId = fileName.replace(/\.patch\.json$/, "");
    for (const mode of ["disconnected-cutoff-route", "generated-cutoff-route", "exaggerated-cutoff-route"]) {
      const fixture = deriveFixture(sourcePatch, mode);
      const fixturePath = resolve(evidenceRoot, "fixtures", `${baseId}.${mode}.patch.json`);
      await writeJson(fixturePath, fixture.patch);
      fixtures.push({ id: `${baseId}-${mode}`, mode, patchPath: fixturePath, patch: fixture.patch, route: fixture.route });
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

  const renderedByMode = new Map();
  const records = [];
  for (const fixture of fixtures) {
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
      function makeStimulus(ctx) {
        var buffer = ctx.createBuffer(1, settings.frameCount, settings.sampleRate);
        var channel = buffer.getChannelData(0);
        for (var i = 0; i < channel.length; i++) {
          var t = i / settings.sampleRate;
          channel[i] = settings.amplitude * Math.sin(2 * Math.PI * settings.lowFrequency * t)
            + settings.amplitude * Math.sin(2 * Math.PI * settings.midFrequency * t)
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
      var wiringEvents = [];
      var stimulusEvents = [];
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
        var audioInput = nodes[ai];
        if (!audioInput || audioInput.type !== 'audio_input') continue;
        for (var out = 0; out < audioInput.outputs.length; out++) {
          var audioOut = audioInput.outputs[out];
          if (!audioOut) continue;
          makeStimulus(ctx).connect(audioOut);
          stimulusEvents.push({ moduleIndex: ai, outputBlock: out, stimulus: 'three-tone-sine' });
        }
      }
      for (var c = 0; c < patch.connections.length; c++) {
        var connection = patch.connections[c];
        var srcNode = nodes[connection.srcMod];
        var dstNode = nodes[connection.dstMod];
        var srcOut = srcNode && srcNode.outputs ? srcNode.outputs[connection.srcBlock] : null;
        var dstIn = dstNode && dstNode.inputs ? dstNode.inputs[connection.dstBlock] : null;
        var strength = (connection.strength !== undefined ? connection.strength : 10000) / 10000;
        var connected = false;
        if (srcOut && dstIn) {
          var gain = ctx.createGain();
          var effectiveStrength = strength;
          if (dstNode && dstNode.type === 'sv_filter' && connection.dstBlock === dstNode.freqIdx && srcNode && srcNode.type === 'lfo') {
            effectiveStrength = Math.min(Math.abs(strength), 1) * 1200;
          }
          gain.gain.value = effectiveStrength;
          connected = connectIfPossible(srcOut, gain) && connectIfPossible(gain, dstIn);
        }
        wiringEvents.push({ connectionIndex: c, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength, effectiveStrength, connected });
      }
      for (var outputIndex = 0; outputIndex < nodes.length; outputIndex++) {
        var node = nodes[outputIndex];
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
      return { unsupportedModules, wiringEvents, stimulusEvents, destinationConnections, samples };
    }, {
      patch: fixture.patch,
      settings: {
        sampleRate: SAMPLE_RATE,
        frameCount: FRAME_COUNT,
        amplitude: AMPLITUDE,
        lowFrequency: LOW_FREQUENCY,
        midFrequency: MID_FREQUENCY,
        highFrequency: HIGH_FREQUENCY
      }
    });

    const samples = renderResult.samples || [];
    renderedByMode.set(fixture.mode, samples);
    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    await writeFile(capturePath, wavBufferFromSamples(samples, SAMPLE_RATE));
    const failures = [];
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "runtime", "filter sweep fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, (renderResult.stimulusEvents || []).length > 0, "stimulus", "audio stimulus did not route to Audio Input", renderResult.stimulusEvents);
    assertCondition(failures, renderResult.destinationConnections > 0, "audio-output", "fixture did not connect Audio Output to destination", renderResult);
    records.push({
      id: fixture.id,
      mode: fixture.mode,
      status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
      classification: fixture.mode,
      patchPath: fixture.patchPath,
      capturePath,
      route: fixture.route,
      audioRms: rms(samples),
      assertionFailures: failures,
      renderEvidence: { ...renderResult, samples: undefined }
    });
  }

  await browser.close();

  const disconnected = renderedByMode.get("disconnected-cutoff-route") || [];
  const generated = renderedByMode.get("generated-cutoff-route") || [];
  const exaggerated = renderedByMode.get("exaggerated-cutoff-route") || [];
  const generatedDiffRms = diffRms(generated, disconnected);
  const exaggeratedDiffRms = diffRms(exaggerated, disconnected);
  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, records.every((record) => record.status === PASS_STATUS), "runtime", "one or more filter sweep fixtures failed to render", records);
  assertCondition(assertionFailures, generatedDiffRms >= MIN_GENERATED_DIFF_RMS, "filter-audible-sweep", "generated LFO cutoff route did not produce a measurable audible sweep", { observed: generatedDiffRms, threshold: MIN_GENERATED_DIFF_RMS });
  assertCondition(assertionFailures, exaggeratedDiffRms >= MIN_EXAGGERATED_DIFF_RMS, "seeded-positive-control", "exaggerated cutoff route did not produce measurable sweep difference", { observed: exaggeratedDiffRms, threshold: MIN_EXAGGERATED_DIFF_RMS });

  const classification = assertionFailures.length === 0 ? "audible-cutoff-sweep-supported" : "audible-cutoff-sweep-not-proven";
  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-filter-audible-sweep-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: { sampleRate: SAMPLE_RATE, durationSeconds: DURATION_SECONDS, frameCount: FRAME_COUNT, channelCount: 1 },
    stimulus: { kind: "three-tone-sine", lowFrequency: LOW_FREQUENCY, midFrequency: MID_FREQUENCY, highFrequency: HIGH_FREQUENCY, amplitude: AMPLITUDE },
    thresholds: { minGeneratedDiffRms: MIN_GENERATED_DIFF_RMS, minExaggeratedDiffRms: MIN_EXAGGERATED_DIFF_RMS }
  };
  const classificationLog = {
    schemaVersion: "zoia.generated-patch-filter-audible-sweep-classification-log.v1",
    generatedAt: nowIso(),
    classification,
    generatedDiffRms,
    exaggeratedDiffRms,
    records: records.map((record) => ({ id: record.id, mode: record.mode, audioRms: record.audioRms, capturePath: record.capturePath, assertionFailureCount: record.assertionFailures.length }))
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-filter-audible-sweep-evidence.v1",
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
      fixtureCount: records.length,
      captureCount: records.length,
      generatedDiffRms,
      exaggeratedDiffRms,
      classification
    },
    assertionFailures,
    records: records.map((record) => ({ ...record, renderEvidence: { ...record.renderEvidence, samples: undefined } })),
    artifacts: {
      resultPath,
      evidenceRoot,
      stimulusManifestPath: resolve(evidenceRoot, "stimulus-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json"),
      capturesRoot: resolve(evidenceRoot, "captures"),
      fixturesRoot: resolve(evidenceRoot, "fixtures")
    },
    claimBoundaries: {
      audibleCutoffSweepBlockedClaim: false,
      lfoCutoffRouteClaim: true,
      audibleCutoffSweepSuccessClaim: assertionFailures.length === 0,
      arbitraryFilterPromptClaim: false,
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
    schemaVersion: "zoia.generated-patch-filter-audible-sweep-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
