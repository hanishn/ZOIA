#!/usr/bin/env node
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "products", "zoia", "index.html");
const CANONICAL_MANIFEST_PATH = resolve(PROJECT_ROOT, "tests/workflow", "canonical-patches", "Test_Modules.manifest.json");
const TARGET_MANIFEST_PATH = resolve(PROJECT_ROOT, "tests/workflow", "audio-fixtures", "q104-staged-patch-audio-all-targets.json");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow", "evidence", "q104-staged-patch-audio-all-baseline");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:staged-patch-audio";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";
const CLASSIFIED_STATUS = "classified";
const JSON_SPACES = 2;
const GRID_BUTTON_COUNT = 80;
const PATCH_TIMEOUT_MS = 15000;

function nowIso() {
  return new Date().toISOString();
}

function sanitizePathPart(value) {
  return String(value).replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
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

async function loadManifests() {
  const canonical = JSON.parse(await readFile(CANONICAL_MANIFEST_PATH, "utf8"));
  const targets = JSON.parse(await readFile(TARGET_MANIFEST_PATH, "utf8"));
  const files = Array.isArray(canonical.files) ? canonical.files : [];
  const canonicalRootPath = resolve(PROJECT_ROOT, canonical.canonicalRoot);
  const byKey = new Map();
  for (const file of files) {
    if (!file.relativePath || !file.relativePath.toLowerCase().endsWith(".bin")) continue;
    const parts = file.relativePath.split(/[\\/]/);
    const category = parts.length > 1 ? parts.slice(0, -1).join("/") : "_root";
    const pairId = parts[parts.length - 1].replace(/\.bin$/i, "");
    const jsonRelativePath = parts.length > 1 ? `${parts.slice(0, -1).join("\\")}\\${pairId}.json` : `${pairId}.json`;
    const jsonFile = files.find((candidate) => candidate.relativePath.toLowerCase() === jsonRelativePath.toLowerCase());
    byKey.set(`${category}/${pairId}`, {
      pairId,
      category,
      binPath: resolve(canonicalRootPath, file.relativePath),
      jsonPath: jsonFile ? resolve(canonicalRootPath, jsonFile.relativePath) : null,
      binSha256: String(file.sha256).toLowerCase(),
      jsonSha256: jsonFile ? String(jsonFile.sha256).toLowerCase() : null,
      binSize: file.size,
      jsonSize: jsonFile ? jsonFile.size : null,
      pairStatus: jsonFile ? "paired" : "missing-json",
      readOnlySource: true,
      canonicalRoot: canonicalRootPath,
      sourceArchive: canonical.sourceArchive,
      canonicalManifestPath: CANONICAL_MANIFEST_PATH
    });
  }
  return {
    canonical,
    targets,
    fixtures: targets.targets.map((target) => {
      const fixture = byKey.get(`${target.category}/${target.pairId}`);
      if (!fixture) throw new Error(`Target not found in canonical manifest: ${target.category}/${target.pairId}`);
      return { ...fixture, target };
    })
  };
}

async function loadSimulator(page) {
  await page.goto(pathToFileURL(SIMULATOR_HTML).href, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.ZOIA && window.ZOIA.MODULE_DB && window.ZOIA.state), null, { timeout: PATCH_TIMEOUT_MS });
  await page.waitForFunction(
    (expectedCount) => document.querySelectorAll("#dual-grid-area .grid-btn").length === expectedCount,
    GRID_BUTTON_COUNT,
    { timeout: PATCH_TIMEOUT_MS }
  );
}

async function capturePageArtifacts(page, patchDir, prefix) {
  const screenshotPath = resolve(patchDir, `${prefix}.png`);
  const domPath = resolve(patchDir, `${prefix}.html`);
  const statePath = resolve(patchDir, `${prefix}-state.json`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await writeText(domPath, await page.evaluate(() => document.documentElement.outerHTML));
  await writeJson(statePath, await page.evaluate(() => ({
    mode: window.ZOIA?.state?.mode || null,
    patch: window.ZOIA?.state?.patch ? {
      name: window.ZOIA.state.patch.name,
      moduleCount: window.ZOIA.state.patch.moduleCount,
      actualModuleCount: window.ZOIA.state.patch.modules.length,
      connectionCount: window.ZOIA.state.patch.connections.length,
      modules: window.ZOIA.state.patch.modules.map((module) => ({
        idx: module.idx,
        typeIdx: module.typeIdx,
        typeName: module.typeName,
        name: module.name,
        blockCount: module.blockCount,
        blocks: module.blocks
      })),
      connections: window.ZOIA.state.patch.connections
    } : null,
    sim: window.ZOIA?.sim ? {
      running: Boolean(window.ZOIA.sim.running),
      nodeCount: Array.isArray(window.ZOIA.sim.nodes) ? window.ZOIA.sim.nodes.length : 0,
      ctxState: window.ZOIA.sim.ctx ? window.ZOIA.sim.ctx.state : null,
      testToneActive: Boolean(window.ZOIA.sim.testToneActive)
    } : null
  })));
  return { screenshotPath, domPath, statePath };
}

async function runPatch(browser, metadata, fixture) {
  const patchDir = resolve(EVIDENCE_ROOT, sanitizePathPart(fixture.category), sanitizePathPart(fixture.pairId));
  await mkdir(patchDir, { recursive: true });

  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleEntries = [];
  const pageErrors = [];
  page.on("console", (message) => consoleEntries.push({ timestamp: nowIso(), type: message.type(), text: message.text(), location: message.location() }));
  page.on("pageerror", (error) => pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack || null }));

  const startedAt = nowIso();
  const steps = [];
  const assertionFailures = [];
  let status = FAIL_STATUS;
  let classification = null;
  let fixtureReference = null;
  let importArtifacts = null;
  let playArtifacts = null;

  async function recordStep(name, fn) {
    const stepStartedAt = nowIso();
    try {
      const value = await fn();
      steps.push({ name, status: PASS_STATUS, startedAt: stepStartedAt, completedAt: nowIso() });
      return value;
    } catch (error) {
      steps.push({ name, status: FAIL_STATUS, startedAt: stepStartedAt, completedAt: nowIso(), error: error.message, stack: error.stack || null });
      throw error;
    }
  }

  try {
    const fixtureBytes = await readFile(fixture.binPath);
    const observedSha256 = sha256Buffer(fixtureBytes);
    fixtureReference = {
      pairId: fixture.pairId,
      category: fixture.category,
      binPath: fixture.binPath,
      jsonPath: fixture.jsonPath,
      manifestSha256: fixture.binSha256,
      observedSha256,
      observedBytes: fixtureBytes.length,
      canonicalRoot: fixture.canonicalRoot,
      sourceArchive: fixture.sourceArchive,
      canonicalManifestPath: fixture.canonicalManifestPath,
      target: fixture.target
    };
    await writeJson(resolve(patchDir, "fixture-reference.json"), fixtureReference);

    await recordStep("Load active ZOIA HTML exhibit", async () => { await loadSimulator(page); });
    await recordStep("Import staged .bin through browser file input", async () => {
      await page.locator("#file-input").setInputFiles(fixture.binPath);
      await page.waitForFunction(
        (expectedCount) => Boolean(window.ZOIA?.state?.patch && document.querySelectorAll("#dual-grid-area .grid-btn").length === expectedCount),
        GRID_BUTTON_COUNT,
        { timeout: PATCH_TIMEOUT_MS }
      );
    });
    importArtifacts = await capturePageArtifacts(page, patchDir, "after-import");

    const staticAnalysis = await page.evaluate(() => {
      const patch = window.ZOIA.state.patch;
      const modules = patch.modules.map((module) => ({
        idx: module.idx,
        typeIdx: module.typeIdx,
        typeName: module.typeName,
        name: module.name,
        audioInBlocks: module.blocks.filter((block) => block.t === "audio_in").length,
        audioOutBlocks: module.blocks.filter((block) => block.t === "audio_out").length,
        cvInBlocks: module.blocks.filter((block) => block.t === "cv_in").length,
        gateInBlocks: module.blocks.filter((block) => block.t === "gate_in").length
      }));
      const audioInputModuleCount = modules.filter((module) => module.typeIdx === 1 || module.typeName === "Audio Input").length;
      const audioOutputModuleCount = modules.filter((module) => module.typeIdx === 2 || module.typeName === "Audio Output").length;
      const oscillatorModuleCount = modules.filter((module) => module.typeIdx === 14 || module.typeName === "Oscillator").length;
      const keyboardModuleCount = modules.filter((module) => module.typeName === "Keyboard" || module.typeIdx === 16).length;
      const outputConnections = patch.connections.filter((connection) => {
        const destination = patch.modules[connection.dstMod];
        return destination && (destination.typeIdx === 2 || destination.typeName === "Audio Output");
      }).length;
      const inputConnections = patch.connections.filter((connection) => {
        const source = patch.modules[connection.srcMod];
        return source && (source.typeIdx === 1 || source.typeName === "Audio Input");
      }).length;
      return {
        patchName: patch.name,
        moduleCount: patch.modules.length,
        connectionCount: patch.connections.length,
        modules,
        audioInputModuleCount,
        audioOutputModuleCount,
        oscillatorModuleCount,
        keyboardModuleCount,
        inputConnections,
        outputConnections
      };
    });

    await recordStep("Click PLAY to create browser audio graph", async () => {
      await page.click("#sim-toggle");
      await page.waitForFunction(() => Boolean(window.ZOIA?.sim?.running && window.ZOIA?.sim?.ctx), null, { timeout: PATCH_TIMEOUT_MS });
    });
    await recordStep("Connect simulator test tone when target expects it", async () => {
      if (fixture.target.expectedStimulus === "test-tone") {
        await page.click("#sim-testtone");
        await page.waitForFunction(() => Boolean(window.ZOIA?.sim?.testToneActive), null, { timeout: PATCH_TIMEOUT_MS });
      }
    });

    const audioEvidence = await page.evaluate(async ({ criteria, target }) => {
      function quantizedHash(samples) {
        var hash = 2166136261 >>> 0;
        for (var i = 0; i < samples.length; i++) {
          var q = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
          hash ^= q & 255;
          hash = Math.imul(hash, 16777619) >>> 0;
          hash ^= (q >> 8) & 255;
          hash = Math.imul(hash, 16777619) >>> 0;
        }
        return ("00000000" + hash.toString(16)).slice(-8);
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
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak,
          zeroCrossings,
          quantizedHash: quantizedHash(samples),
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }
      function readAnalyser(analyser) {
        if (!analyser) return null;
        var samples = new Float32Array(analyser.fftSize || 2048);
        analyser.getFloatTimeDomainData(samples);
        return features(samples);
      }
      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      var patch = window.ZOIA.state.patch;
      var sim = window.ZOIA.sim;
      var snapshots = [];
      var iterations = Math.max(1, Math.ceil(criteria.sampleDurationMs / criteria.sampleIntervalMs));
      for (var i = 0; i < iterations; i++) {
        await sleep(criteria.sampleIntervalMs);
        snapshots.push({
          timestampIndex: i,
          master: readAnalyser(sim.analyser),
          input: readAnalyser(sim.inputAnalyser)
        });
      }
      var bestMaster = snapshots.reduce((best, item) => {
        if (!item.master) return best;
        if (!best || item.master.rms > best.rms) return item.master;
        return best;
      }, null);
      var bestInput = snapshots.reduce((best, item) => {
        if (!item.input) return best;
        if (!best || item.input.rms > best.rms) return item.input;
        return best;
      }, null);
      var nodeSummaries = (sim.nodes || []).map((node, index) => {
        var module = patch.modules[index];
        return {
          index,
          type: node ? node.type : null,
          moduleTypeIdx: module ? module.typeIdx : null,
          moduleTypeName: module ? module.typeName : null,
          inputCount: node && node.inputs ? node.inputs.filter(Boolean).length : 0,
          outputCount: node && node.outputs ? node.outputs.filter(Boolean).length : 0
        };
      });
      var audioInputNodes = (sim.nodes || []).filter((node) => node && node.type === "audio_input");
      var testToneConnectionSlots = audioInputNodes.reduce((count, node) => count + (node.outputs || []).filter(Boolean).length, 0);
      return {
        expectedStimulus: target.expectedStimulus,
        audioContextState: sim.ctx ? sim.ctx.state : null,
        sampleRate: sim.ctx ? sim.ctx.sampleRate : null,
        simRunning: Boolean(sim.running),
        testToneActive: Boolean(sim.testToneActive),
        testToneConnectionSlots,
        connGainCount: Array.isArray(sim.connGains) ? sim.connGains.length : 0,
        nodeCount: Array.isArray(sim.nodes) ? sim.nodes.length : 0,
        nodeSummaries,
        bestMaster,
        bestInput,
        snapshots
      };
    }, { criteria: metadata.targets.criteria, target: fixture.target });

    playArtifacts = await capturePageArtifacts(page, patchDir, "after-play-audio-sampling");

    const hasMasterSignal = Boolean(audioEvidence.bestMaster && audioEvidence.bestMaster.rms >= metadata.targets.criteria.minMasterRmsForSignal && audioEvidence.bestMaster.peak >= metadata.targets.criteria.minMasterPeakForSignal);
    const hasInputSignal = Boolean(audioEvidence.bestInput && audioEvidence.bestInput.rms >= metadata.targets.criteria.minMasterRmsForSignal);
    const expectedSignal = fixture.target.expectedOutput === "signal";
    const hasAudioInput = staticAnalysis.audioInputModuleCount > 0;
    const hasAudioOutput = staticAnalysis.audioOutputModuleCount > 0;
    const hasOutputRouting = staticAnalysis.outputConnections > 0;
    const hasInputRouting = staticAnalysis.inputConnections > 0;
    const hasStimulus = fixture.target.expectedStimulus !== "test-tone" || audioEvidence.testToneConnectionSlots >= metadata.targets.criteria.minTestToneConnections;

    if (staticAnalysis.moduleCount === 0 && fixture.target.expectedClassification === "empty-audit-fixture") {
      status = CLASSIFIED_STATUS;
      classification = "empty-audit-fixture";
    } else if (fixture.target.expectedStimulus !== "test-tone" && fixture.target.expectedOutput === "classified") {
      status = CLASSIFIED_STATUS;
      classification = fixture.target.expectedClassification || "stimulus-policy-required";
    } else if (expectedSignal && hasMasterSignal) {
      status = PASS_STATUS;
      classification = "signal-present";
    } else if (!expectedSignal && hasMasterSignal) {
      status = CLASSIFIED_STATUS;
      classification = "unexpected-signal-present";
    } else if (!expectedSignal && staticAnalysis.oscillatorModuleCount > 0 && staticAnalysis.keyboardModuleCount > 0 && fixture.target.expectedStimulus !== "test-tone") {
      status = CLASSIFIED_STATUS;
      classification = "patch-requires-external-input-midi-cv";
    } else if (!hasAudioInput && fixture.target.expectedStimulus === "test-tone") {
      status = FAIL_STATUS;
      classification = "no-source";
    } else if (fixture.target.expectedStimulus === "test-tone" && !hasStimulus) {
      status = FAIL_STATUS;
      classification = "no-source";
    } else if (!hasAudioOutput) {
      status = FAIL_STATUS;
      classification = "output-module-unsupported";
    } else if (!hasOutputRouting || !hasInputRouting) {
      status = FAIL_STATUS;
      classification = "routing-missing";
    } else if (audioEvidence.audioContextState !== "running") {
      status = FAIL_STATUS;
      classification = "browser-gesture-audio-policy-issue";
    } else if (hasInputSignal && !hasMasterSignal) {
      status = FAIL_STATUS;
      classification = "simulator-module-bug";
    } else {
      status = FAIL_STATUS;
      classification = "simulator-module-bug";
    }

    assertCondition(assertionFailures, observedSha256 === fixture.binSha256, "fixture", "fixture hash did not match manifest hash", { observedSha256, manifestSha256: fixture.binSha256 });
    assertCondition(
      assertionFailures,
      staticAnalysis.moduleCount > 0 || classification === "empty-audit-fixture",
      "import-model",
      "imported patch has no modules",
      staticAnalysis
    );
    assertCondition(assertionFailures, Boolean(audioEvidence.simRunning), "audio-graph", "simulator did not enter running state", audioEvidence);
    if (expectedSignal) {
      assertCondition(assertionFailures, hasStimulus, "audio-source", "test tone did not connect to Audio Input module outputs", audioEvidence);
      assertCondition(assertionFailures, hasMasterSignal, "audio-output", "no measurable master analyser signal", { staticAnalysis, audioEvidence });
    }

    await writeJson(resolve(patchDir, "audio-evidence.json"), audioEvidence);
    await writeJson(resolve(patchDir, "static-analysis.json"), staticAnalysis);
    await writeJson(resolve(patchDir, "console.json"), consoleEntries);
    await writeJson(resolve(patchDir, "page-errors.json"), pageErrors);

    const record = {
      schemaVersion: "zoia.staged-patch-audio-result.v0",
      pairId: fixture.pairId,
      category: fixture.category,
      status: assertionFailures.length === 0 && status === PASS_STATUS ? PASS_STATUS : status,
      classification,
      startedAt,
      completedAt: nowIso(),
      command: COMMAND,
      target: fixture.target,
      fixtureReference,
      staticAnalysis,
      audioSummary: {
        audioContextState: audioEvidence.audioContextState,
        simRunning: audioEvidence.simRunning,
        testToneActive: audioEvidence.testToneActive,
        testToneConnectionSlots: audioEvidence.testToneConnectionSlots,
        connGainCount: audioEvidence.connGainCount,
        bestMaster: audioEvidence.bestMaster,
        bestInput: audioEvidence.bestInput
      },
      assertionFailures,
      steps,
      artifacts: {
        fixtureReferencePath: resolve(patchDir, "fixture-reference.json"),
        staticAnalysisPath: resolve(patchDir, "static-analysis.json"),
        audioEvidencePath: resolve(patchDir, "audio-evidence.json"),
        importScreenshotPath: importArtifacts.screenshotPath,
        importDomSnapshotPath: importArtifacts.domPath,
        importStateSnapshotPath: importArtifacts.statePath,
        playScreenshotPath: playArtifacts.screenshotPath,
        playDomSnapshotPath: playArtifacts.domPath,
        playStateSnapshotPath: playArtifacts.statePath,
        consoleLogPath: resolve(patchDir, "console.json"),
        pageErrorsPath: resolve(patchDir, "page-errors.json"),
        resultPath: resolve(patchDir, "result.json")
      },
      claimBoundaries: {
        audioContextStateAloneIsProof: false,
        masterAnalyserSignalMeasured: hasMasterSignal,
        humanSpeakerAudibilityClaim: false,
        fullPatchAudioCorrectnessClaim: false,
        binaryExportFidelityClaim: false
      }
    };
    await writeJson(resolve(patchDir, "result.json"), record);
    return record;
  } catch (error) {
    const record = {
      schemaVersion: "zoia.staged-patch-audio-result.v0",
      pairId: fixture.pairId,
      category: fixture.category,
      status: FAIL_STATUS,
      classification: classification || "import-model-mismatch",
      startedAt,
      completedAt: nowIso(),
      command: COMMAND,
      target: fixture.target,
      fixtureReference,
      assertionFailures: [...assertionFailures, { surface: "runtime", message: error.message, evidence: { stack: error.stack || null } }],
      steps,
      artifacts: {
        resultPath: resolve(patchDir, "result.json")
      }
    };
    await writeJson(resolve(patchDir, "console.json"), consoleEntries);
    await writeJson(resolve(patchDir, "page-errors.json"), pageErrors);
    await writeJson(resolve(patchDir, "result.json"), record);
    return record;
  } finally {
    await page.close();
  }
}

async function main() {
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(CANONICAL_MANIFEST_PATH)) throw new Error(`Canonical manifest not found: ${CANONICAL_MANIFEST_PATH}`);
  if (!existsSync(TARGET_MANIFEST_PATH)) throw new Error(`Target manifest not found: ${TARGET_MANIFEST_PATH}`);
  await rm(EVIDENCE_ROOT, { recursive: true, force: true });
  await mkdir(EVIDENCE_ROOT, { recursive: true });

  const manifests = await loadManifests();
  const browser = await chromium.launch({ channel: EDGE_CHANNEL, headless: true });
  const startedAt = nowIso();
  const results = [];
  for (const fixture of manifests.fixtures) {
    results.push(await runPatch(browser, manifests, fixture));
  }
  await browser.close();

  const failed = results.filter((result) => result.status === FAIL_STATUS);
  const metadata = {
    command: COMMAND,
    cwd: PROJECT_ROOT,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    playwrightVersion: playwrightPackage.version,
    browserName: "chromium",
    browserChannel: EDGE_CHANNEL,
    viewport: VIEWPORT,
    simulatorHtmlPath: SIMULATOR_HTML,
    canonicalManifestPath: CANONICAL_MANIFEST_PATH,
    targetManifestPath: TARGET_MANIFEST_PATH,
    evidenceRoot: EVIDENCE_ROOT
  };
  const result = {
    schemaVersion: "zoia.q101-staged-patch-audio-run-result.v0",
    status: failed.length === 0 ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    metadata,
    targetManifest: manifests.targets,
    fixtureCount: results.length,
    passCount: results.filter((item) => item.status === PASS_STATUS).length,
    failCount: failed.length,
    classifiedCount: results.filter((item) => item.status === CLASSIFIED_STATUS).length,
    byClassification: results.reduce((acc, item) => {
      acc[item.classification || "unclassified"] = (acc[item.classification || "unclassified"] || 0) + 1;
      return acc;
    }, {}),
    results,
    claimBoundaries: {
      audioContextStateAloneIsProof: false,
      humanSpeakerAudibilityClaim: false,
      fullPatchAudioCorrectnessClaim: false,
      fullCommunityCorpusAudioClaim: false,
      emulatorCompletenessClaim: false,
      binaryExportFidelityClaim: false
    },
    artifacts: {
      resultPath: resolve(EVIDENCE_ROOT, "run-result.json")
    }
  };
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), result);
  console.log(JSON.stringify({
    status: result.status,
    fixtureCount: result.fixtureCount,
    passCount: result.passCount,
    failCount: result.failCount,
    classifiedCount: result.classifiedCount,
    byClassification: result.byClassification,
    evidenceRoot: EVIDENCE_ROOT
  }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
