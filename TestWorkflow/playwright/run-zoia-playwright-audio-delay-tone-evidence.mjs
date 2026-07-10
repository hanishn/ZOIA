#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "ZOIA emulator", "ZOIA_Patch_Simulator_v5_2_21_2026.html");
const MANIFEST_PATH = resolve(PROJECT_ROOT, "TestWorkflow", "audio-fixtures", "q100-audio-delay-tone-fixtures.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "TestWorkflow", "evidence", "q100-audio-delay-tone-baseline");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:audio-delay-tone";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const JSON_SPACES = 2;

function nowIso() {
  return new Date().toISOString();
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function writeText(path, value) {
  await writeFile(path, value, "utf8");
}

function assertCondition(failures, condition, surface, message, evidence = null) {
  if (condition) return;
  failures.push({ surface, message, evidence });
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(MANIFEST_PATH)) throw new Error(`Audio fixture manifest not found: ${MANIFEST_PATH}`);
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() }));
  page.on("pageerror", (error) => pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null }));

  const startedAt = nowIso();
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.sim && window.ZOIA.MODULE_DB), null, { timeout: 15000 });
  await page.screenshot({ path: resolve(EVIDENCE_ROOT, "loaded-simulator-screenshot.png"), fullPage: true });
  await writeText(resolve(EVIDENCE_ROOT, "loaded-simulator-dom.html"), await page.evaluate(() => document.documentElement.outerHTML));

  const fixtureResults = await page.evaluate(async ({ manifest }) => {
    function quantizedHash(samples) {
      var hash = 2166136261 >>> 0;
      for (var i = 0; i < samples.length; i++) {
        var q = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
        hash ^= q & 255;
        hash = Math.imul(hash, 16777619) >>> 0;
        hash ^= (q >> 8) & 255;
        hash = Math.imul(hash, 16777619) >>> 0;
      }
      return ('00000000' + hash.toString(16)).slice(-8);
    }

    function features(samples) {
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
      return {
        rms: Math.sqrt(sumSquares / samples.length),
        peak: peak,
        zeroCrossings: zeroCrossings,
        nonZeroFrameCount: nonZeroFrameCount,
        firstNonZeroIndex: firstNonZeroIndex,
        lastNonZeroIndex: lastNonZeroIndex,
        quantizedHash: quantizedHash(samples),
        firstSamples: Array.from(samples.slice(0, 32))
      };
    }

    function makeModule(typeIdx, idx, name, params, options) {
      var db = ZOIA.MODULE_DB[typeIdx];
      return {
        idx: idx,
        typeIdx: typeIdx,
        page: 0,
        colorId: 1,
        gridPos: idx,
        name: name,
        typeName: db ? db.name : 'Type ' + typeIdx,
        blocks: db ? ZOIA.resolveBlocks(typeIdx, options || [0,0,0,0,0,0,0,0], params ? params.length : 1) : [],
        blockCount: db ? ZOIA.resolveBlocks(typeIdx, options || [0,0,0,0,0,0,0,0], params ? params.length : 1).length : 0,
        category: db ? db.cat : 'Unknown',
        params: params || [],
        paramCount: params ? params.length : 0,
        options: options || [0,0,0,0,0,0,0,0]
      };
    }

    function createImpulseSource(ctx, amplitude) {
      var impulseFrameCount = 1;
      var buffer = ctx.createBuffer(1, impulseFrameCount, ctx.sampleRate);
      buffer.getChannelData(0)[0] = amplitude;
      var source = ctx.createBufferSource();
      source.buffer = buffer;
      source.start(0);
      return source;
    }

    function normalizedFrequencyParam(hertz) {
      return Math.round((Math.log(hertz / 20) / Math.log(1000)) * 65535);
    }

    async function renderFixture(fixture) {
      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var settings = manifest.renderSettings;
      var ctx = new OAC(settings.channelCount, settings.frameCount, settings.sampleRate);
      var gain = ctx.createGain();
      gain.gain.value = 0.5;
      gain.connect(ctx.destination);
      var disposables = [];

      if (fixture.chain === 'silence') {
        // No signal source by design.
      } else if (fixture.chain === 'invalid-routing') {
        var orphanOsc = ZOIA.sim._createOscillator(ctx, makeModule(14, 0, 'Orphan Oscillator', [29217, 0]));
        disposables.push(orphanOsc);
      } else if (fixture.chain === 'oscillator-direct') {
        var directOsc = ZOIA.sim._createOscillator(ctx, makeModule(14, 0, 'Direct Oscillator', [29217, 0]));
        directOsc.outputs[1].connect(gain);
        disposables.push(directOsc);
      } else if (fixture.chain === 'oscillator-through-vca') {
        var vcaOsc = ZOIA.sim._createOscillator(ctx, makeModule(14, 0, 'VCA Oscillator', [29217, 0]));
        var vca = ZOIA.sim._createVCA(ctx, makeModule(7, 1, 'Deterministic VCA', [0, 32768, 0]));
        vcaOsc.outputs[1].connect(vca.inputs[0]);
        vca.outputs[2].connect(gain);
        disposables.push(vcaOsc, vca);
      } else if (fixture.chain === 'oscillator-through-filter') {
        var filterOsc = ZOIA.sim._createOscillator(ctx, makeModule(14, 0, 'Filter Oscillator', [29217, 0]));
        var filter = ZOIA.sim._createSVFilter(ctx, makeModule(0, 1, 'Deterministic SV Filter', [0, 50000, 12000, 0, 0, 0]));
        filterOsc.outputs[1].connect(filter.inputs[0]);
        filter.outputs[3].connect(gain);
        disposables.push(filterOsc, filter);
      } else if (fixture.chain === 'impulse-through-delay-line') {
        var delayTimeParam = Math.round((fixture.delaySeconds / 5) * 65535);
        var feedbackParam = Math.round((fixture.feedback || 0) * 65535);
        var mixParam = Math.round((fixture.mix || 1) * 65535);
        var impulse = createImpulseSource(ctx, fixture.amplitude || 0.75);
        var delay = ZOIA.sim._createDelay(ctx, makeModule(13, 1, 'Deterministic Delay Line', [0, delayTimeParam, feedbackParam, mixParam, 0]));
        impulse.connect(delay.inputs[0]);
        delay.outputs[4].connect(gain);
        disposables.push(impulse, delay);
      } else if (fixture.chain === 'oscillator-through-tone-control') {
        var toneOscParam = normalizedFrequencyParam(fixture.frequencyHz || 440);
        var toneOsc = ZOIA.sim._createOscillator(ctx, makeModule(14, 0, 'Tone Test Oscillator', [toneOscParam, 0]));
        var tone = ZOIA.sim._createToneControl(ctx, makeModule(12, 1, 'Deterministic Tone Control', [0, 0, 0, 0, 0]));
        tone.inputs[1].value = fixture.bassDb || 0;
        tone.inputs[2].value = fixture.midDb || 0;
        tone.inputs[3].value = fixture.trebleDb || 0;
        toneOsc.outputs[1].connect(tone.inputs[0]);
        tone.outputs[4].connect(gain);
        disposables.push(toneOsc, tone);
      } else {
        throw new Error('Unknown audio fixture chain: ' + fixture.chain);
      }

      var rendered = await ctx.startRendering();
      var result = features(rendered.getChannelData(0));
      for (var i = 0; i < disposables.length; i++) {
        if (disposables[i].dispose) disposables[i].dispose();
      }
      return {
        id: fixture.id,
        description: fixture.description,
        kind: fixture.kind,
        chain: fixture.chain,
        criteria: fixture.criteria,
        expectedQuantizedHash: fixture.expectedQuantizedHash,
        features: result
      };
    }

    if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') {
      return { offlineAudioSupported: false, fixtures: [] };
    }
    var renderedFixtures = [];
    for (var i = 0; i < manifest.fixtures.length; i++) {
      renderedFixtures.push(await renderFixture(manifest.fixtures[i]));
    }
    return {
      offlineAudioSupported: true,
      renderSettings: manifest.renderSettings,
      fixtures: renderedFixtures,
      excludedUntilDeterministic: manifest.excludedUntilDeterministic
    };
  }, { manifest });

  const perFixtureResults = [];
  for (const fixture of fixtureResults.fixtures) {
    const failures = [];
    const criteria = fixture.criteria || {};
    if (fixture.kind === "signal") {
      if (criteria.minRms !== undefined) assertCondition(failures, fixture.features.rms >= criteria.minRms, "audio-signal", "RMS below minimum", { observed: fixture.features.rms, expected: criteria.minRms });
      if (criteria.maxRms !== undefined) assertCondition(failures, fixture.features.rms <= criteria.maxRms, "audio-signal", "RMS above maximum", { observed: fixture.features.rms, expected: criteria.maxRms });
      if (criteria.minZeroCrossings !== undefined) assertCondition(failures, fixture.features.zeroCrossings >= criteria.minZeroCrossings, "audio-signal", "zero crossings below minimum", { observed: fixture.features.zeroCrossings, expected: criteria.minZeroCrossings });
      if (criteria.maxPeak !== undefined) assertCondition(failures, fixture.features.peak <= criteria.maxPeak, "audio-signal", "peak above maximum", { observed: fixture.features.peak, expected: criteria.maxPeak });
      assertCondition(failures, fixture.features.peak > 0, "audio-signal", "signal peak is zero", { observed: fixture.features.peak });
    }
    if (fixture.kind === "silence") {
      if (criteria.maxRms !== undefined) assertCondition(failures, fixture.features.rms <= criteria.maxRms, "audio-silence", "silence RMS above maximum", { observed: fixture.features.rms, expected: criteria.maxRms });
      if (criteria.maxPeak !== undefined) assertCondition(failures, fixture.features.peak <= criteria.maxPeak, "audio-silence", "silence peak above maximum", { observed: fixture.features.peak, expected: criteria.maxPeak });
      if (criteria.maxZeroCrossings !== undefined) assertCondition(failures, fixture.features.zeroCrossings <= criteria.maxZeroCrossings, "audio-silence", "silence zero crossings above maximum", { observed: fixture.features.zeroCrossings, expected: criteria.maxZeroCrossings });
    }
    if (fixture.expectedQuantizedHash) {
      assertCondition(failures, fixture.features.quantizedHash === fixture.expectedQuantizedHash, "audio-fingerprint", "quantized hash mismatch", { observed: fixture.features.quantizedHash, expected: fixture.expectedQuantizedHash });
    }
    if (criteria.minNonZeroFrameCount !== undefined) assertCondition(failures, fixture.features.nonZeroFrameCount >= criteria.minNonZeroFrameCount, "audio-signal", "non-zero frame count below minimum", { observed: fixture.features.nonZeroFrameCount, expected: criteria.minNonZeroFrameCount });
    if (criteria.maxNonZeroFrameCount !== undefined) assertCondition(failures, fixture.features.nonZeroFrameCount <= criteria.maxNonZeroFrameCount, "audio-signal", "non-zero frame count above maximum", { observed: fixture.features.nonZeroFrameCount, expected: criteria.maxNonZeroFrameCount });
    if (criteria.minFirstNonZeroIndex !== undefined) assertCondition(failures, fixture.features.firstNonZeroIndex >= criteria.minFirstNonZeroIndex, "audio-timing", "first non-zero frame before minimum", { observed: fixture.features.firstNonZeroIndex, expected: criteria.minFirstNonZeroIndex });
    if (criteria.maxFirstNonZeroIndex !== undefined) assertCondition(failures, fixture.features.firstNonZeroIndex <= criteria.maxFirstNonZeroIndex, "audio-timing", "first non-zero frame after maximum", { observed: fixture.features.firstNonZeroIndex, expected: criteria.maxFirstNonZeroIndex });
    if (criteria.minLastNonZeroIndex !== undefined) assertCondition(failures, fixture.features.lastNonZeroIndex >= criteria.minLastNonZeroIndex, "audio-timing", "last non-zero frame before minimum", { observed: fixture.features.lastNonZeroIndex, expected: criteria.minLastNonZeroIndex });
    if (criteria.maxLastNonZeroIndex !== undefined) assertCondition(failures, fixture.features.lastNonZeroIndex <= criteria.maxLastNonZeroIndex, "audio-timing", "last non-zero frame after maximum", { observed: fixture.features.lastNonZeroIndex, expected: criteria.maxLastNonZeroIndex });
    const fixturePath = resolve(EVIDENCE_ROOT, `${fixture.id}.json`);
    const record = {
      ...fixture,
      status: failures.length === 0 ? PASS_STATUS : FAIL_STATUS,
      assertionFailures: failures,
      artifactPath: fixturePath
    };
    await writeJson(fixturePath, record);
    perFixtureResults.push(record);
  }

  const assertionFailures = [];
  assertCondition(assertionFailures, fixtureResults.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", fixtureResults);
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));
  for (const fixture of perFixtureResults) {
    assertCondition(assertionFailures, fixture.status === PASS_STATUS, "audio-fixture", "audio fixture failed", { id: fixture.id, failures: fixture.assertionFailures });
  }

  const metadata = {
    command: COMMAND,
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
    manifestPath: MANIFEST_PATH,
    evidenceRoot: EVIDENCE_ROOT
  };
  const result = {
    schemaVersion: "zoia.playwright-audio-delay-tone-baseline-result.v0",
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    metadata,
    command: COMMAND,
    manifest,
    assertionFailures,
    fixtureCount: perFixtureResults.length,
    passCount: perFixtureResults.filter((fixture) => fixture.status === PASS_STATUS).length,
    failCount: perFixtureResults.filter((fixture) => fixture.status === FAIL_STATUS).length,
    fixtures: perFixtureResults,
    claimBoundaries: {
      deterministicAudioFixturesMeasured: true,
      fullPatchAudioCorrectnessClaim: false,
      fullCommunityCorpusAudioClaim: false,
      emulatorCompletenessClaim: false,
      binaryExportFidelityClaim: false
    },
    artifacts: {
      resultPath: resolve(EVIDENCE_ROOT, "run-result.json"),
      consoleLogPath: resolve(EVIDENCE_ROOT, "console.json"),
      pageErrorsPath: resolve(EVIDENCE_ROOT, "page-errors.json"),
      screenshotPath: resolve(EVIDENCE_ROOT, "loaded-simulator-screenshot.png"),
      domSnapshotPath: resolve(EVIDENCE_ROOT, "loaded-simulator-dom.html")
    }
  };

  await writeJson(resolve(EVIDENCE_ROOT, "console.json"), consoleEntries);
  await writeJson(resolve(EVIDENCE_ROOT, "page-errors.json"), pageErrors);
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), result);
  await browser.close();

  console.log(JSON.stringify({
    status: result.status,
    fixtureCount: result.fixtureCount,
    passCount: result.passCount,
    failCount: result.failCount,
    hashes: result.fixtures.map((fixture) => ({ id: fixture.id, hash: fixture.features.quantizedHash })),
    evidenceRoot: EVIDENCE_ROOT
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
