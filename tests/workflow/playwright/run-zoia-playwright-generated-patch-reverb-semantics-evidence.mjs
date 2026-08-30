#!/usr/bin/env node
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwrightPackage = require("playwright/package.json");
const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const SIMULATOR_HTML = resolve(PROJECT_ROOT, "products", "zoia", "index.html");
const DEFAULT_GRAPH_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/reverb-test");
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-reverb-semantics");
const DEFAULT_CONVERTED_ROOT = resolve(DEFAULT_EVIDENCE_ROOT, "converted");
const DEFAULT_CONVERT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "convert-result.json");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const EDGE_CHANNEL = "msedge";
const COMMAND = "npm run zoia:test:playwright:generated-patch-reverb-semantics";
const VIEWPORT = Object.freeze({ width: 1440, height: 1000 });
const JSON_SPACES = 2;
const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 0.75;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const IMPULSE_AMPLITUDE = 0.7;
const TAIL_START_SECONDS = 0.08;
const TAIL_END_SECONDS = 0.45;
const MIN_REVERB_TAIL_RMS = 0.001;
const MAX_BYPASS_TAIL_RMS = 0.000001;
const PASS_STATUS = "pass";
const FAIL_STATUS = "fail";

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  let graphRoot = DEFAULT_GRAPH_ROOT;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--graph-root") {
      graphRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return {
    graphRoot,
    resultPath,
    evidenceRoot: dirname(resultPath),
    convertedRoot: resolve(dirname(resultPath), "converted"),
    convertResultPath: resolve(dirname(resultPath), "convert-result.json")
  };
}

async function readJson(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function runNodeScript(scriptPath, args) {
  const command = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    scriptPath,
    args,
    exitCode: command.status,
    stdout: command.stdout,
    stderr: command.stderr
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBypassControl(patch) {
  const derived = clone(patch);
  derived.name = `${patch.name || "Generated Reverb"} Bypass Reverb Control`;
  derived.sourcePatchId = `${patch.sourcePatchId || "generated-reverb"}-bypass-reverb-control`;
  derived.labels = Array.from(new Set([...(derived.labels || []), "reverb-semantics-negative-control"]));
  derived.description = "Negative control: generated lineage retained, but audio input routes directly to output and Reverb Lite is bypassed.";
  const audioIn = derived.modules.find((module) => module.typeName === "Audio Input");
  const audioOut = derived.modules.find((module) => module.typeName === "Audio Output");
  if (!audioIn || !audioOut) return { patch: derived, problem: "audio-io-missing" };
  const inputOutBlock = audioIn.blocks.findIndex((block) => block.t === "audio_out");
  const outputInBlock = audioOut.blocks.findIndex((block) => block.t === "audio_in");
  derived.connections = [{
    srcMod: audioIn.idx,
    srcBlock: inputOutBlock,
    dstMod: audioOut.idx,
    dstBlock: outputInBlock,
    strength: 10000
  }];
  return { patch: derived, problem: null };
}

function assertCondition(problems, condition, surface, message, evidence = null) {
  if (condition) return;
  problems.push({ surface, message, evidence });
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
  const { graphRoot, resultPath, evidenceRoot, convertedRoot, convertResultPath } = parseArgs(process.argv.slice(2));
  if (!existsSync(SIMULATOR_HTML)) throw new Error(`Simulator HTML not found: ${SIMULATOR_HTML}`);
  if (!existsSync(graphRoot)) throw new Error(`Generated graph root not found: ${graphRoot}`);

  await rm(evidenceRoot, { recursive: true, force: true });
  await mkdir(resolve(evidenceRoot, "captures"), { recursive: true });
  await mkdir(resolve(evidenceRoot, "fixtures"), { recursive: true });

  const convertCommand = runNodeScript("tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs", [
    "--graph-root",
    graphRoot,
    "--output-root",
    convertedRoot,
    "--result-path",
    convertResultPath
  ]);
  const convertResult = await readJson(convertResultPath);

  const patchFiles = existsSync(convertedRoot)
    ? (await readdir(convertedRoot)).filter((name) => name.endsWith(".patch.json")).sort()
    : [];
  const fixtures = [];
  for (const fileName of patchFiles) {
    const patchPath = join(convertedRoot, fileName);
    const patch = await readJson(patchPath);
    fixtures.push({
      id: fileName.replace(/\.patch\.json$/, ""),
      kind: "reverb-lite-tail",
      patchPath,
      patch,
      expectedTail: true,
      derivationProblem: null
    });
  }
  if (fixtures.length > 0) {
    const bypass = makeBypassControl(fixtures[0].patch);
    const bypassPath = resolve(evidenceRoot, "fixtures", "bypass-reverb-negative.patch.json");
    await writeJson(bypassPath, bypass.patch);
    fixtures.push({
      id: "bypass-reverb-negative",
      kind: "bypass-reverb-negative-control",
      patchPath: bypassPath,
      patch: bypass.patch,
      expectedTail: false,
      derivationProblem: bypass.problem
    });
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

      function features(samples) {
        var sumSquares = 0;
        var peak = 0;
        var firstNonZeroIndex = null;
        var lastNonZeroIndex = null;
        var tailStart = Math.floor(settings.tailStartSeconds * settings.sampleRate);
        var tailEnd = Math.min(samples.length - 1, Math.floor(settings.tailEndSeconds * settings.sampleRate));
        var tailSquares = 0;
        var tailFrames = 0;
        var tailPeak = 0;
        for (var i = 0; i < samples.length; i++) {
          var sample = samples[i];
          var abs = Math.abs(sample);
          sumSquares += sample * sample;
          peak = Math.max(peak, abs);
          if (abs > 0.0000001) {
            if (firstNonZeroIndex === null) firstNonZeroIndex = i;
            lastNonZeroIndex = i;
          }
          if (i >= tailStart && i <= tailEnd) {
            tailSquares += sample * sample;
            tailFrames += 1;
            tailPeak = Math.max(tailPeak, abs);
          }
        }
        return {
          rms: Math.sqrt(sumSquares / Math.max(samples.length, 1)),
          peak,
          firstNonZeroIndex,
          lastNonZeroIndex,
          tailStart,
          tailEnd,
          tailRms: Math.sqrt(tailSquares / Math.max(tailFrames, 1)),
          tailPeak,
          firstSamples: Array.from(samples.slice(0, 32))
        };
      }

      var OAC = OfflineAudioContext || webkitOfflineAudioContext;
      var ctx = new OAC(1, settings.frameCount, settings.sampleRate);
      var nodes = [];
      var unsupportedModules = [];
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

      for (var c = 0; c < patch.connections.length; c++) {
        var connection = patch.connections[c];
        var srcNode = nodes[connection.srcMod];
        var dstNode = nodes[connection.dstMod];
        var srcOut = srcNode && srcNode.outputs ? srcNode.outputs[connection.srcBlock] : null;
        var dstIn = dstNode && dstNode.inputs ? dstNode.inputs[connection.dstBlock] : null;
        if (!srcOut || !dstIn) {
          wiringEvents.push({ index: c, status: "missing-endpoint", connection });
          continue;
        }
        var gain = ctx.createGain();
        gain.gain.value = (connection.strength || 10000) / 10000;
        var connected = connectIfPossible(srcOut, gain) && connectIfPossible(gain, dstIn);
        wiringEvents.push({ index: c, status: connected ? "connected" : "connect-failed", connection });
      }

      for (var out = 0; out < patch.modules.length; out++) {
        var outModule = patch.modules[out];
        var outNode = nodes[out];
        if ((outModule.typeIdx === 2 || outModule.typeIdx === 95) && outNode && outNode.getDestinationNode) {
          if (connectIfPossible(outNode.getDestinationNode(), ctx.destination)) destinationConnections += 1;
        }
      }

      var impulse = ctx.createBufferSource();
      var buffer = ctx.createBuffer(1, 1, settings.sampleRate);
      buffer.getChannelData(0)[0] = settings.impulseAmplitude;
      impulse.buffer = buffer;
      impulse.start(0);
      for (var input = 0; input < patch.modules.length; input++) {
        var inputModule = patch.modules[input];
        var inputNode = nodes[input];
        if ((inputModule.typeIdx === 1 || inputModule.typeIdx === 93) && inputNode && inputNode.outputs) {
          for (var blockIndex = 0; blockIndex < inputNode.outputs.length; blockIndex++) {
            if (inputNode.outputs[blockIndex]) connectIfPossible(impulse, inputNode.outputs[blockIndex]);
          }
        }
      }

      var rendered = await ctx.startRendering();
      var samples = Array.from(rendered.getChannelData(0));
      for (var disposeIndex = 0; disposeIndex < nodes.length; disposeIndex++) {
        if (nodes[disposeIndex] && nodes[disposeIndex].dispose) nodes[disposeIndex].dispose();
      }
      return {
        unsupportedModules,
        wiringEvents,
        destinationConnections,
        features: features(samples),
        samples
      };
    }, {
      patch: fixture.patch,
      settings: {
        sampleRate: SAMPLE_RATE,
        frameCount: FRAME_COUNT,
        impulseAmplitude: IMPULSE_AMPLITUDE,
        tailStartSeconds: TAIL_START_SECONDS,
        tailEndSeconds: TAIL_END_SECONDS
      }
    });

    const capturePath = resolve(evidenceRoot, "captures", `${fixture.id}.wav`);
    await writeFile(capturePath, wavBufferFromSamples(renderResult.samples, SAMPLE_RATE));
    delete renderResult.samples;
    records.push({
      ...fixture,
      capturePath,
      renderResult,
      classification: renderResult.features.tailRms >= MIN_REVERB_TAIL_RMS ? "reverb-tail-present" : "reverb-tail-absent"
    });
  }

  await browser.close();

  const problems = [];
  assertCondition(problems, convertCommand.exitCode === 0, "conversion", "Reverb graph conversion must exit successfully.", convertCommand);
  assertCondition(problems, convertResult.status === PASS_STATUS, "conversion", "Reverb graph conversion result must pass.", convertResult);
  assertCondition(problems, patchFiles.length > 0, "fixtures", "Converted reverb patch fixture must be produced.", { convertedRoot, patchFiles });
  for (const record of records) {
    assertCondition(problems, !record.derivationProblem, record.id, "Fixture derivation must not report a problem.", record.derivationProblem);
    assertCondition(problems, record.renderResult.unsupportedModules.length === 0, record.id, "All modules must have simulator factories.", record.renderResult.unsupportedModules);
    assertCondition(problems, record.renderResult.destinationConnections > 0, record.id, "Rendered patch must connect to audio destination.", record.renderResult.destinationConnections);
    if (record.expectedTail) {
      assertCondition(problems, record.renderResult.features.tailRms >= MIN_REVERB_TAIL_RMS, record.id, "Generated Reverb Lite route must produce measurable tail RMS.", record.renderResult.features);
      assertCondition(problems, record.classification === "reverb-tail-present", record.id, "Generated Reverb Lite route must classify as tail present.", record.classification);
    } else {
      assertCondition(problems, record.renderResult.features.tailRms <= MAX_BYPASS_TAIL_RMS, record.id, "Bypass negative control must not produce reverb tail RMS.", record.renderResult.features);
      assertCondition(problems, record.classification === "reverb-tail-absent", record.id, "Bypass negative control must classify as tail absent.", record.classification);
    }
  }

  const result = {
    schemaVersion: "zoia.generated-patch-reverb-semantics-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? PASS_STATUS : FAIL_STATUS,
    startedAt,
    completedAt: nowIso(),
    command: COMMAND,
    graphRoot,
    convertedRoot,
    convertResultPath,
    simulatorHtml: SIMULATOR_HTML,
    environment: {
      node: process.version,
      playwright: playwrightPackage.version,
      browserChannel: EDGE_CHANNEL,
      viewport: VIEWPORT
    },
    summary: {
      fixtureCount: records.length,
      positiveTailCount: records.filter((record) => record.expectedTail && record.classification === "reverb-tail-present").length,
      negativeTailAbsentCount: records.filter((record) => !record.expectedTail && record.classification === "reverb-tail-absent").length,
      problemCount: problems.length
    },
    records: records.map(({ patch, ...record }) => record),
    consoleEntries,
    pageErrors,
    problems,
    claimBoundaries: {
      provesGeneratedReverbLiteConversion: problems.length === 0,
      provesGeneratedReverbLiteRuntimeTail: problems.length === 0,
      broadReverbSemanticsClaim: false,
      decayCvClaim: false,
      toneSemanticsClaim: false,
      hardwareBinaryExportClaim: false
    }
  };

  await writeJson(resultPath, result);
  console.log(JSON.stringify({ status: result.status, ...result.summary, resultPath }, null, JSON_SPACES));
  if (result.status !== PASS_STATUS) process.exitCode = 1;
}

main().catch(async (error) => {
  await writeJson(DEFAULT_RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-reverb-semantics-evidence.v1",
    version: "0.4.0",
    revision: 1,
    status: FAIL_STATUS,
    completedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
