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
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-filter-modulation-semantics");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-filter-modulation-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 1.25;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const MIN_TRACE_RMS = 0.05;
const MAX_FREQUENCY_ERROR_HZ = 0.25;
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

function expectedFrequencyHz(lfo) {
  return 0.01 + ((lfo?.params?.[0] || 0) / 65535) * 19.99;
}

function makeFixture(sourcePatch, mode) {
  const patch = clone(sourcePatch);
  const filter = findFilter(patch);
  const lfo = findLfo(patch);
  const cutoffBlock = blockIndex(filter, "cv_in", "freq");
  const resonanceBlock = blockIndex(filter, "cv_in", "res");
  const outputGain = patch.modules.find((module) => module.typeName === "Audio Output");
  const outputGainBlock = blockIndex(outputGain, "cv_in", "gain");
  const lfoOutBlock = blockIndex(lfo, "cv_out", "output");
  patch.name = `${patch.name || "Generated Filter"} Filter Modulation ${mode}`;
  patch.labels = Array.from(new Set([...(patch.labels || []), "filter-modulation-semantics", mode]));
  patch.connections = (patch.connections || []).filter((connection) => !(connection.srcMod === lfo?.idx));
  if (mode === "positive-cutoff-route") {
    patch.connections.push({ srcMod: lfo.idx, srcBlock: lfoOutBlock, dstMod: filter.idx, dstBlock: cutoffBlock, strength: 10000 });
  } else if (mode === "wrong-target-resonance") {
    patch.connections.push({ srcMod: lfo.idx, srcBlock: lfoOutBlock, dstMod: filter.idx, dstBlock: resonanceBlock, strength: 10000 });
  } else if (mode === "wrong-target-output-gain") {
    patch.connections.push({ srcMod: lfo.idx, srcBlock: lfoOutBlock, dstMod: outputGain.idx, dstBlock: outputGainBlock, strength: 10000 });
  }
  return {
    patch,
    route: {
      mode,
      lfoModuleId: lfo?.sourceGeneratedModuleId || null,
      lfoModuleIndex: lfo?.idx ?? null,
      lfoOutBlock,
      filterModuleId: filter?.sourceGeneratedModuleId || null,
      filterModuleIndex: filter?.idx ?? null,
      cutoffBlock,
      resonanceBlock,
      outputGainModuleIndex: outputGain?.idx ?? null,
      outputGainBlock,
      expectedFrequencyHz: expectedFrequencyHz(lfo),
      expectedDepth: (lfo?.params?.[1] || 0) / 65535
    }
  };
}

async function main() {
  const { patchRoot, resultPath, evidenceRoot } = parseArgs(process.argv.slice(2));
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(patchRoot)) throw new Error(`Generated emulator patch root not found: ${patchRoot}`);

  await rm(evidenceRoot, { recursive: true, force: true });
  await mkdir(resolve(evidenceRoot, "traces"), { recursive: true });
  await mkdir(resolve(evidenceRoot, "fixtures"), { recursive: true });

  const patchFiles = (await readdir(patchRoot)).filter((name) => name.endsWith(".patch.json")).sort();
  if (patchFiles.length === 0) throw new Error(`No .patch.json files found in ${patchRoot}`);
  const fixtures = [];
  for (const fileName of patchFiles) {
    const sourcePatchPath = join(patchRoot, fileName);
    const sourcePatch = await readJson(sourcePatchPath);
    const baseId = fileName.replace(/\.patch\.json$/, "");
    for (const mode of ["positive-cutoff-route", "disconnected-cutoff-route", "wrong-target-resonance", "wrong-target-output-gain"]) {
      const fixture = makeFixture(sourcePatch, mode);
      const fixturePath = resolve(evidenceRoot, "fixtures", `${baseId}.${mode}.patch.json`);
      await writeJson(fixturePath, fixture.patch);
      fixtures.push({
        id: `${baseId}-${mode}`,
        sourcePatchPath,
        patchPath: fixturePath,
        mode,
        patch: fixture.patch,
        route: fixture.route,
        expectedClassification: mode === "positive-cutoff-route" ? "lfo-cutoff-route-traced" : `${mode}-classified`
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
    const renderResult = await page.evaluate(async ({ patch, route, settings }) => {
      function connectIfPossible(source, target) {
        if (!source || !target || typeof source.connect !== 'function') return false;
        try {
          source.connect(target);
          return true;
        } catch (error) {
          return false;
        }
      }
      function traceFeatures(samples, sampleRate) {
        var sumSquares = 0;
        var peak = 0;
        var zeroCrossings = 0;
        var previous = samples[0] || 0;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          sumSquares += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
          if ((previous < 0 && sample >= 0) || (previous >= 0 && sample < 0)) zeroCrossings++;
          previous = sample;
        }
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak,
          zeroCrossings,
          estimatedFrequencyHz: zeroCrossings / 2 / (samples.length / sampleRate),
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var ctx = new OAC(1, settings.frameCount, settings.sampleRate);
      var nodes = [];
      var unsupportedModules = [];
      var wiringEvents = [];
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
      var lfoNode = nodes[route.lfoModuleIndex];
      var lfoOut = lfoNode && lfoNode.outputs ? lfoNode.outputs[route.lfoOutBlock] : null;
      if (lfoOut) lfoOut.connect(ctx.destination);
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
          gain.gain.value = strength;
          connected = connectIfPossible(srcOut, gain) && connectIfPossible(gain, dstIn);
        }
        wiringEvents.push({ connectionIndex: c, srcMod: connection.srcMod, srcBlock: connection.srcBlock, dstMod: connection.dstMod, dstBlock: connection.dstBlock, strength, connected });
      }
      var rendered = await ctx.startRendering();
      var samples = Array.from(rendered.getChannelData(0));
      for (var n = 0; n < nodes.length; n++) {
        if (nodes[n] && nodes[n].dispose) nodes[n].dispose();
      }
      return { unsupportedModules, wiringEvents, features: traceFeatures(samples, settings.sampleRate), samples };
    }, {
      patch: fixture.patch,
      route: fixture.route,
      settings: { sampleRate: SAMPLE_RATE, frameCount: FRAME_COUNT }
    });

    const samples = renderResult.samples || [];
    delete renderResult.samples;
    const tracePath = resolve(evidenceRoot, "traces", `${fixture.id}.lfo.wav`);
    await writeFile(tracePath, wavBufferFromSamples(samples, SAMPLE_RATE));

    const lfoRouteToCutoff = (renderResult.wiringEvents || []).some((event) => (
      event.srcMod === fixture.route.lfoModuleIndex &&
      event.srcBlock === fixture.route.lfoOutBlock &&
      event.dstMod === fixture.route.filterModuleIndex &&
      event.dstBlock === fixture.route.cutoffBlock &&
      event.connected
    ));
    const lfoRouteWrongTarget = (renderResult.wiringEvents || []).some((event) => (
      event.srcMod === fixture.route.lfoModuleIndex &&
      event.srcBlock === fixture.route.lfoOutBlock &&
      event.connected &&
      !(event.dstMod === fixture.route.filterModuleIndex && event.dstBlock === fixture.route.cutoffBlock)
    ));
    const failures = [];
    assertCondition(failures, (renderResult.unsupportedModules || []).length === 0, "runtime", "filter modulation fixture has unsupported runtime modules", renderResult.unsupportedModules);
    assertCondition(failures, renderResult.features.rms >= MIN_TRACE_RMS, "control-trace", "generated LFO trace RMS is below threshold", { observed: renderResult.features.rms, threshold: MIN_TRACE_RMS });
    assertCondition(failures, Math.abs(renderResult.features.estimatedFrequencyHz - fixture.route.expectedFrequencyHz) <= MAX_FREQUENCY_ERROR_HZ, "control-trace", "generated LFO trace frequency does not match generated rate parameter", {
      observed: renderResult.features.estimatedFrequencyHz,
      expected: fixture.route.expectedFrequencyHz,
      tolerance: MAX_FREQUENCY_ERROR_HZ
    });

    let classification = fixture.expectedClassification;
    if (fixture.mode === "positive-cutoff-route") {
      assertCondition(failures, lfoRouteToCutoff, "filter-modulation-route", "generated LFO route did not connect to filter cutoff input", { route: fixture.route, wiringEvents: renderResult.wiringEvents });
    } else if (fixture.mode === "disconnected-cutoff-route") {
      assertCondition(failures, !lfoRouteToCutoff && !lfoRouteWrongTarget, "filter-negative-control", "disconnected filter modulation control retained an LFO modulation route", renderResult.wiringEvents);
    } else {
      assertCondition(failures, !lfoRouteToCutoff && lfoRouteWrongTarget, "filter-negative-control", "wrong-target filter modulation control did not move LFO route away from cutoff", renderResult.wiringEvents);
    }
    if (failures.length > 0) classification = "filter-modulation-not-proven";

    const record = {
      id: fixture.id,
      status: failures.length === 0 ? (fixture.mode === "positive-cutoff-route" ? PASS_STATUS : CLASSIFIED_STATUS) : FAIL_STATUS,
      classification,
      mode: fixture.mode,
      sourcePatchPath: fixture.sourcePatchPath,
      patchPath: fixture.patchPath,
      tracePath,
      route: fixture.route,
      assertionFailures: failures,
      traceEvidence: renderResult
    };
    await writeJson(resolve(evidenceRoot, `${fixture.id}.json`), record);
    records.push(record);
  }

  await browser.close();

  const assertionFailures = [];
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  assertCondition(assertionFailures, records.some((record) => record.classification === "lfo-cutoff-route-traced"), "filter-positive", "positive generated LFO-to-cutoff route did not classify", records);
  assertCondition(assertionFailures, records.some((record) => record.classification === "disconnected-cutoff-route-classified"), "filter-negative-control", "disconnected cutoff-route control did not classify", records);
  assertCondition(assertionFailures, records.some((record) => record.classification === "wrong-target-resonance-classified"), "filter-negative-control", "wrong-target resonance control did not classify", records);
  assertCondition(assertionFailures, records.some((record) => record.classification === "wrong-target-output-gain-classified"), "filter-negative-control", "wrong-target output-gain control did not classify", records);

  const stimulusManifest = {
    schemaVersion: "zoia.generated-patch-filter-modulation-semantics-stimulus-manifest.v1",
    generatedAt: nowIso(),
    patchRoot,
    renderSettings: { sampleRate: SAMPLE_RATE, durationSeconds: DURATION_SECONDS, frameCount: FRAME_COUNT, channelCount: 1 },
    trace: { kind: "generated LFO output captured as WAV/PCM trace" },
    thresholds: { minTraceRms: MIN_TRACE_RMS, maxFrequencyErrorHz: MAX_FREQUENCY_ERROR_HZ },
    negativeControls: { disconnectedCutoffRoute: true, wrongTargetResonance: true, wrongTargetOutputGain: true }
  };
  const classificationLog = {
    schemaVersion: "zoia.generated-patch-filter-modulation-semantics-classification-log.v1",
    generatedAt: nowIso(),
    classifications: records.map((record) => ({
      id: record.id,
      status: record.status,
      classification: record.classification,
      mode: record.mode,
      traceRms: record.traceEvidence.features?.rms ?? null,
      estimatedFrequencyHz: record.traceEvidence.features?.estimatedFrequencyHz ?? null,
      expectedFrequencyHz: record.route.expectedFrequencyHz,
      tracePath: record.tracePath,
      assertionFailureCount: record.assertionFailures.length
    }))
  };
  await writeJson(resolve(evidenceRoot, "stimulus-manifest.json"), stimulusManifest);
  await writeJson(resolve(evidenceRoot, "classification-log.json"), classificationLog);
  await writeJson(resolve(evidenceRoot, "console.json"), consoleEntries);
  await writeJson(resolve(evidenceRoot, "page-errors.json"), pageErrors);

  const result = {
    schemaVersion: "zoia.generated-patch-filter-modulation-semantics-evidence.v1",
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
      lfoCutoffRouteClassifiedCount: records.filter((record) => record.classification === "lfo-cutoff-route-traced").length,
      disconnectedControlClassifiedCount: records.filter((record) => record.classification === "disconnected-cutoff-route-classified").length,
      wrongTargetControlClassifiedCount: records.filter((record) => record.classification === "wrong-target-resonance-classified" || record.classification === "wrong-target-output-gain-classified").length,
      traceCount: records.length
    },
    assertionFailures,
    records,
    artifacts: {
      resultPath,
      evidenceRoot,
      stimulusManifestPath: resolve(evidenceRoot, "stimulus-manifest.json"),
      classificationLogPath: resolve(evidenceRoot, "classification-log.json"),
      tracesRoot: resolve(evidenceRoot, "traces"),
      fixturesRoot: resolve(evidenceRoot, "fixtures")
    },
    claimBoundaries: {
      generatedFilterLfoCutoffRouteClaim: assertionFailures.length === 0,
      lfoTraceClaim: assertionFailures.length === 0,
      audibleCutoffSweepClaim: false,
      resonanceSemanticsClaim: false,
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
    schemaVersion: "zoia.generated-patch-filter-modulation-semantics-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
