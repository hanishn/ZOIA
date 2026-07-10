#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "products", "zoia", "index.html");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow", "evidence", "q098-audio-provenance-proof");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:audio-provenance";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 0.25;
const FRAME_COUNT = SAMPLE_RATE * DURATION_SECONDS;
const MIN_SIGNAL_RMS = 0.05;
const MAX_SILENCE_RMS = 0.000001;
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
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

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

  const audioResult = await page.evaluate(async (settings) => {
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
      var sumSquares = 0;
      var peak = 0;
      var zeroCrossings = 0;
      var previous = samples[0] || 0;
      for (var i = 0; i < samples.length; i++) {
        var sample = samples[i];
        sumSquares += sample * sample;
        var abs = Math.abs(sample);
        if (abs > peak) peak = abs;
        if ((previous < 0 && sample >= 0) || (previous >= 0 && sample < 0)) zeroCrossings++;
        previous = sample;
      }
      return {
        rms: Math.sqrt(sumSquares / samples.length),
        peak: peak,
        zeroCrossings: zeroCrossings,
        quantizedHash: quantizedHash(samples),
        firstSamples: Array.from(samples.slice(0, 32))
      };
    }

    if (typeof OfflineAudioContext === 'undefined' && typeof webkitOfflineAudioContext === 'undefined') {
      return { offlineAudioSupported: false };
    }
    var OAC = OfflineAudioContext || webkitOfflineAudioContext;

    var signalContext = new OAC(1, settings.frameCount, settings.sampleRate);
    var oscillatorModule = {
      idx: 0,
      typeIdx: 14,
      page: 0,
      colorId: 1,
      gridPos: 0,
      name: 'Deterministic Oscillator',
      typeName: 'Oscillator',
      blocks: ZOIA.MODULE_DB[14].blocks,
      blockCount: ZOIA.MODULE_DB[14].blocks.length,
      category: 'Audio',
      params: [29217, 0],
      paramCount: 2,
      options: [0,0,0,0,0,0,0,0]
    };
    var node = ZOIA.sim._createOscillator(signalContext, oscillatorModule);
    var gain = signalContext.createGain();
    gain.gain.value = 0.5;
    node.outputs[1].connect(gain);
    gain.connect(signalContext.destination);
    var rendered = await signalContext.startRendering();
    var signalSamples = rendered.getChannelData(0);

    var silenceContext = new OAC(1, settings.frameCount, settings.sampleRate);
    var silenceBuffer = await silenceContext.startRendering();
    var silenceSamples = silenceBuffer.getChannelData(0);

    if (node.dispose) node.dispose();

    return {
      offlineAudioSupported: true,
      settings: settings,
      fixture: {
        id: 'offline-oscillator-direct',
        moduleType: 14,
        moduleName: 'Oscillator',
        outputBlock: 1,
        gain: 0.5
      },
      signal: features(signalSamples),
      silence: features(silenceSamples)
    };
  }, { sampleRate: SAMPLE_RATE, durationSeconds: DURATION_SECONDS, frameCount: FRAME_COUNT });

  const assertionFailures = [];
  assertCondition(assertionFailures, audioResult.offlineAudioSupported, "audio-engine", "OfflineAudioContext is not available", audioResult);
  if (audioResult.offlineAudioSupported) {
    assertCondition(assertionFailures, audioResult.signal.rms >= MIN_SIGNAL_RMS, "audio-signal", "deterministic oscillator RMS is below threshold", { observed: audioResult.signal.rms, threshold: MIN_SIGNAL_RMS });
    assertCondition(assertionFailures, audioResult.signal.peak > 0 && audioResult.signal.peak <= 1, "audio-signal", "deterministic oscillator peak is invalid", { observed: audioResult.signal.peak });
    assertCondition(assertionFailures, audioResult.signal.zeroCrossings > 0, "audio-signal", "deterministic oscillator has no zero crossings", { observed: audioResult.signal.zeroCrossings });
    assertCondition(assertionFailures, audioResult.silence.rms <= MAX_SILENCE_RMS, "audio-silence", "silence control RMS exceeds threshold", { observed: audioResult.silence.rms, threshold: MAX_SILENCE_RMS });
  }
  assertCondition(assertionFailures, pageErrors.length === 0, "runtime", "page emitted uncaught errors", pageErrors);
  assertCondition(assertionFailures, consoleEntries.filter((entry) => entry.type === "error").length === 0, "runtime", "console emitted error messages", consoleEntries.filter((entry) => entry.type === "error"));

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
    evidenceRoot: EVIDENCE_ROOT
  };
  const result = {
    schemaVersion: "zoia.playwright-audio-provenance-proof-result.v0",
    status: assertionFailures.length === 0 ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    metadata,
    command: COMMAND,
    fixedRenderSettings: {
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION_SECONDS,
      frameCount: FRAME_COUNT,
      channelCount: 1
    },
    thresholds: {
      minSignalRms: MIN_SIGNAL_RMS,
      maxSilenceRms: MAX_SILENCE_RMS
    },
    assertionFailures,
    audioResult,
    claimBoundaries: {
      audioSignalMeasured: true,
      audioBehaviorClaim: false,
      fullPatchAudioCorrectnessClaim: false,
      emulatorCompletenessClaim: false,
      binaryExportFidelityClaim: false
    },
    artifacts: {
      resultPath: resolve(EVIDENCE_ROOT, "run-result.json"),
      consoleLogPath: resolve(EVIDENCE_ROOT, "console.json"),
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
    evidenceRoot: EVIDENCE_ROOT,
    signal: result.audioResult.signal || null,
    silence: result.audioResult.silence || null,
    assertionFailureCount: result.assertionFailures.length
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
