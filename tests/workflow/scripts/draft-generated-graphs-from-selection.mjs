#!/usr/bin/env node
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const SELECTION_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-selection/run-result.json");
const DEFAULT_DRAFT_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/from-selection");
const DEFAULT_EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-drafts");
const DEFAULT_RESULT_PATH = resolve(DEFAULT_EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const FAMILY_KEYWORDS = Object.freeze([
  { family: "delay", sourceNeedles: ["delay", "looper", "loop"] },
  { family: "reverb", sourceNeedles: ["reverb"] },
  { family: "synth", sourceNeedles: ["synth", "oscillator", "midi note"] },
  { family: "sequencer", sourceNeedles: ["sequencer"] }
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function parseArgs(argv) {
  let limit = 3;
  let selectionPath = SELECTION_RESULT_PATH;
  let draftRoot = DEFAULT_DRAFT_ROOT;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") {
      limit = Number.parseInt(argv[index + 1] || "", 10);
      index += 1;
    } else if (arg === "--selection-result") {
      selectionPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--draft-root") {
      draftRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 3,
    selectionPath,
    draftRoot,
    resultPath
  };
}

function slugify(value) {
  return String(value || "candidate")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "candidate";
}

function bounded(value, fallback) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function requestedFamilies(intent) {
  const haystack = [
    intent.description,
    ...(intent.tokens || []),
    ...(intent.requestedModalities || [])
  ].join(" ").toLowerCase();
  return FAMILY_KEYWORDS
    .filter((item) => haystack.includes(item.family))
    .map((item) => item.family);
}

function sourceFamilies(sourceEvidence) {
  const modules = sourceEvidence?.staticAnalysis?.modules || [];
  const haystack = modules
    .map((module) => [module.typeName, module.name].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();
  return FAMILY_KEYWORDS
    .filter((item) => item.sourceNeedles.some((needle) => haystack.includes(needle)))
    .map((item) => item.family);
}

async function selectFamilySupportedCandidates(candidates, intent, limit) {
  const requiredFamilies = requestedFamilies(intent);
  if (requiredFamilies.length === 0) return candidates.slice(0, limit);
  const selected = [];
  for (const candidate of candidates) {
    const evidencePath = candidate.evidence?.q106EvidencePath || candidate.evidence?.rollupEvidencePath;
    const source = sourceFamilies(await readJson(evidencePath));
    if (!requiredFamilies.some((family) => source.includes(family))) continue;
    selected.push({
      ...candidate,
      requestedFamilies: requiredFamilies,
      sourceFamilies: source
    });
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) {
    throw new Error(`Invalid selection metadata: only ${selected.length} candidates support requested source families ${requiredFamilies.join(", ")}.`);
  }
  return selected;
}

function coreModuleForCandidate(candidate, intent) {
  const intentHaystack = [
    intent.description,
    ...(intent.tokens || [])
  ].join(" ").toLowerCase();
  const candidateHaystack = [
    candidate.title,
    candidate.filename,
    ...(candidate.tags || []),
    ...(candidate.categories || [])
  ].join(" ").toLowerCase();
  const haystack = `${intentHaystack} ${candidateHaystack}`;
  if (intentHaystack.includes("filter")) {
    return {
      id: "filter-1",
      type: "State Variable Filter",
      domain: "audio",
      params: {
        cutoff: intent.tokens?.includes("slow") ? 0.32 : 0.58,
        resonance: 0.45,
        mix: 0.5
      },
      inputs: ["audio", "cutoff_cv", "resonance_cv"],
      outputs: ["audio"],
      modulationPort: "cutoff_cv",
      controlPort: "resonance_cv",
      traceLabel: "filter"
    };
  }
  if (intentHaystack.includes("modulation only") || intentHaystack.includes("lfo only")) {
    return {
      id: "modulation-utility-1",
      type: "CV Output",
      domain: "cv",
      params: {
        depth: 0.5,
        offset: 0.5
      },
      inputs: ["cv"],
      outputs: ["cv"],
      modulationPort: "cv",
      controlPort: "cv",
      traceLabel: "modulation utility"
    };
  }
  if (intentHaystack.includes("delay") || (!intentHaystack.includes("reverb") && !intentHaystack.includes("synth") && !intentHaystack.includes("sequencer") && haystack.includes("delay"))) {
    return {
      id: "delay-1",
      type: "Delay Line",
      domain: "audio",
      params: {
        time: intent.tokens?.includes("slow") ? 0.48 : 0.32,
        feedback: intent.tokens?.includes("feedback") ? 0.56 : 0.42,
        mix: 0.48
      },
      inputs: ["audio", "feedback_cv", "time_cv"],
      outputs: ["audio"],
      modulationPort: "time_cv",
      controlPort: "feedback_cv",
      traceLabel: "delay line"
    };
  }
  if (intentHaystack.includes("reverb") || haystack.includes("reverb")) {
    return {
      id: "reverb-1",
      type: "Reverb Lite",
      domain: "audio",
      params: {
        decay: intent.tokens?.includes("ambient") ? 0.72 : 0.54,
        tone: 0.5,
        mix: 0.42
      },
      inputs: ["audio", "mix_cv", "decay_cv"],
      outputs: ["audio"],
      modulationPort: "decay_cv",
      controlPort: "mix_cv",
      traceLabel: "reverb"
    };
  }
  if (intentHaystack.includes("synth") || intentHaystack.includes("sequencer") || haystack.includes("synth") || haystack.includes("sequencer")) {
    return {
      id: "synth-voice-1",
      type: "Synth Voice",
      domain: "audio",
      params: {
        waveform: 0.42,
        envelope: 0.58,
        mix: 0.7
      },
      inputs: ["audio", "pitch_cv", "gate_cv"],
      outputs: ["audio"],
      sequencerPort: "pitch_cv",
      controlPort: "gate_cv",
      modulationPort: "pitch_cv",
      traceLabel: "synth voice"
    };
  }
  return {
    id: "template-core-1",
    type: "Verified Template Core",
    domain: "audio",
    params: {
      score_weight: bounded(candidate.score / 40, 0.5),
      measured_peak_weight: bounded(candidate.bestMasterPeak / 4, 0.25)
    },
    inputs: ["audio", "control_cv", "mod_cv"],
    outputs: ["audio"],
    modulationPort: "mod_cv",
    controlPort: "control_cv",
    traceLabel: "template core"
  };
}

function graphForCandidate(candidate, intent, index) {
  const patchId = `draft-from-selection-${slugify(candidate.pairId)}-${index + 1}`;
  const hasControl = candidate.matchedModalities?.includes("control") || intent.requestedModalities?.includes("control");
  const hasCv = candidate.matchedModalities?.includes("cv") || intent.requestedModalities?.includes("cv");
  const hasSequencer = candidate.matchedModalities?.includes("sequencer") || intent.requestedModalities?.includes("sequencer");
  const coreModule = coreModuleForCandidate(candidate, intent);
  let nextGrid = 2;
  const modules = [
    {
      id: "audio-in-1",
      type: "Audio Input",
      domain: "audio",
      page: 0,
      grid: 0,
      params: {},
      inputs: [],
      outputs: ["audio"]
    },
    {
      id: coreModule.id,
      type: coreModule.type,
      domain: coreModule.domain,
      page: 0,
      grid: 1,
      params: coreModule.params,
      inputs: coreModule.inputs,
      outputs: coreModule.outputs
    },
    {
      id: "audio-out-1",
      type: "Audio Output",
      domain: "audio",
      page: 0,
      grid: 7,
      params: {},
      inputs: ["audio"],
      outputs: []
    }
  ];
  const connections = [
    {
      id: "conn-audio-in-template",
      from: { moduleId: "audio-in-1", port: "audio" },
      to: { moduleId: coreModule.id, port: "audio" },
      gain: 1
    },
    {
      id: "conn-template-out",
      from: { moduleId: coreModule.id, port: "audio" },
      to: { moduleId: "audio-out-1", port: "audio" },
      gain: 1
    }
  ];
  if (hasSequencer && coreModule.sequencerPort) {
    modules.push({
      id: "sequencer-1",
      type: "CV Sequencer",
      domain: "cv",
      page: 0,
      grid: nextGrid,
      params: {
        steps: 0.8,
        movement: intent.tokens?.includes("movement") ? 0.68 : 0.45
      },
      inputs: [],
      outputs: ["cv"]
    });
    nextGrid += 1;
    connections.push({
      id: "conn-sequencer-template",
      from: { moduleId: "sequencer-1", port: "cv" },
      to: { moduleId: coreModule.id, port: coreModule.sequencerPort },
      gain: 0.62
    });
  }
  if (hasCv) {
    modules.push({
      id: "mod-source-1",
      type: "LFO",
      domain: "cv",
      page: 0,
      grid: nextGrid,
      params: {
        rate: intent.tokens?.includes("slow") ? 0.16 : 0.35,
        depth: 0.35
      },
      inputs: [],
      outputs: ["cv"]
    });
    nextGrid += 1;
    connections.push({
      id: "conn-mod-template",
      from: { moduleId: "mod-source-1", port: "cv" },
      to: { moduleId: coreModule.id, port: coreModule.modulationPort },
      gain: 0.35
    });
  }
  if (hasControl) {
    modules.push({
      id: "control-source-1",
      type: "Expression Pedal",
      domain: "control",
      page: 0,
      grid: nextGrid,
      params: {},
      inputs: [],
      outputs: ["cv"]
    });
    connections.push({
      id: "conn-control-template",
      from: { moduleId: "control-source-1", port: "cv" },
      to: { moduleId: coreModule.id, port: coreModule.controlPort },
      gain: 0.45
    });
  }
  const expectedModalities = new Set(["audio", ...(candidate.matchedModalities || []), ...(intent.requestedModalities || [])]);
  if (hasCv || hasSequencer || hasControl) expectedModalities.add("cv");
  if (hasControl) expectedModalities.add("control");

  return {
    schemaVersion: "zoia.generated-patch-graph.v1",
    patchId,
    name: `Draft ${candidate.pairId}`,
    description: `Pre-export graph draft from verified template ${candidate.pairId}: ${candidate.title || candidate.filename || "untitled"}.`,
    expectedModalities: [...expectedModalities],
    modules,
    connections
  };
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid selection metadata: ${label} must be a non-empty string.`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid selection metadata: ${label} must be an array.`);
  }
}

function validateSelection(selection, limit) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    throw new Error("Invalid selection metadata: selection result must be an object.");
  }
  if (selection.schemaVersion !== "zoia.patch-template-selection-result.v1") {
    throw new Error("Invalid selection metadata: schemaVersion must be zoia.patch-template-selection-result.v1.");
  }
  if (selection.status !== "pass") {
    throw new Error("Invalid selection metadata: selection status must be pass.");
  }
  if (!selection.intent || typeof selection.intent !== "object") {
    throw new Error("Invalid selection metadata: intent is required.");
  }
  assertString(selection.intent.description, "intent.description");
  assertArray(selection.intent.tokens, "intent.tokens");
  assertArray(selection.intent.requestedModalities, "intent.requestedModalities");
  assertArray(selection.candidates, "candidates");
  const measuredCandidates = selection.candidates.filter((candidate) => candidate.verificationKind === "measured-signal");
  if (measuredCandidates.length === 0) {
    throw new Error("Invalid selection metadata: at least one measured-signal candidate is required.");
  }
  for (const candidate of measuredCandidates.slice(0, limit)) {
    assertString(candidate.pairId, "candidate.pairId");
    assertString(candidate.coverageState, `candidate ${candidate.pairId} coverageState`);
    assertString(candidate.verificationKind, `candidate ${candidate.pairId} verificationKind`);
    if (!String(candidate.coverageState).startsWith("verified-")) {
      throw new Error(`Invalid selection metadata: candidate ${candidate.pairId} must be verified.`);
    }
    if (!candidate.evidence || typeof candidate.evidence !== "object") {
      throw new Error(`Invalid selection metadata: candidate ${candidate.pairId} evidence is required.`);
    }
    const evidencePath = candidate.evidence.q106EvidencePath || candidate.evidence.rollupEvidencePath;
    assertString(evidencePath, `candidate ${candidate.pairId} evidence path`);
  }
  return measuredCandidates;
}

function traceForCandidate(candidate, graph, intent) {
  const coreLabels = new Map([
    ["Delay Line", "delay line"],
    ["State Variable Filter", "filter"],
    ["Reverb Lite", "reverb"],
    ["Synth Voice", "synth voice"],
    ["Verified Template Core", "template core"]
  ]);
  const core = (graph.modules || []).find((module) => module.id === "delay-1") ||
    (graph.modules || []).find((module) => module.id === "filter-1") ||
    (graph.modules || []).find((module) => module.id === "reverb-1") ||
    (graph.modules || []).find((module) => module.id === "synth-voice-1") ||
    (graph.modules || []).find((module) => module.id === "template-core-1");
  const coreModule = core?.id || "template-core-1";
  const coreLabel = coreLabels.get(core?.type) || "template core";
  const requirements = [
    {
      id: "req-template-provenance",
      sourceText: `verified template ${candidate.pairId}`,
      status: "satisfied",
      moduleIds: [coreModule],
      connectionIds: ["conn-audio-in-template", "conn-template-out"],
      verification: {
        method: "static-graph",
        expectedEvidence: `candidate references measured template evidence at ${candidate.evidence?.q106EvidencePath || candidate.evidence?.rollupEvidencePath}`
      }
    },
    {
      id: "req-audio-route",
      sourceText: "audio candidate must have input to output route",
      status: "satisfied",
      moduleIds: ["audio-in-1", coreModule, "audio-out-1"],
      connectionIds: ["conn-audio-in-template", "conn-template-out"],
      verification: {
        method: "static-graph",
        expectedEvidence: `audio route from Audio Input through ${coreLabel} to Audio Output`
      }
    }
  ];
  if (graph.modules.some((mod) => mod.id === "mod-source-1")) {
    requirements.push({
      id: "req-modulation",
      sourceText: intent.tokens?.includes("slow") ? "slow modulation" : "modulation",
      status: "satisfied",
      moduleIds: ["mod-source-1", coreModule],
      connectionIds: ["conn-mod-template"],
      verification: {
        method: "static-graph",
        expectedEvidence: `CV modulation source routes to ${coreLabel}`
      }
    });
  }
  if (graph.modules.some((mod) => mod.id === "sequencer-1")) {
    requirements.push({
      id: "req-sequencer",
      sourceText: "sequencer movement",
      status: "satisfied",
      moduleIds: ["sequencer-1", coreModule],
      connectionIds: ["conn-sequencer-template"],
      verification: {
        method: "static-graph",
        expectedEvidence: `CV sequencer routes to ${coreLabel}`
      }
    });
  }
  if (graph.modules.some((mod) => mod.id === "control-source-1")) {
    requirements.push({
      id: "req-control",
      sourceText: "expression pedal feedback control",
      status: "satisfied",
      moduleIds: ["control-source-1", coreModule],
      connectionIds: ["conn-control-template"],
      verification: {
        method: "static-graph",
        expectedEvidence: `control CV source routes to ${coreLabel}`
      }
    });
  }
  return {
    schemaVersion: "zoia.generated-patch-requirement-trace.v1",
    patchId: graph.patchId,
    requirements
  };
}

async function main() {
  const { limit, selectionPath, draftRoot, resultPath } = parseArgs(process.argv.slice(2));
  if (!existsSync(selectionPath)) {
    throw new Error(`Missing selection result: ${selectionPath}`);
  }
  const selection = await readJson(selectionPath);
  const candidates = await selectFamilySupportedCandidates(validateSelection(selection, limit), selection.intent || {}, limit);

  await rm(draftRoot, { recursive: true, force: true });
  await mkdir(draftRoot, { recursive: true });

  const drafts = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const graph = graphForCandidate(candidate, selection.intent || {}, index);
    const trace = traceForCandidate(candidate, graph, selection.intent || {});
    const fileStem = `${String(index + 1).padStart(2, "0")}-${slugify(candidate.pairId)}`;
    const graphPath = resolve(draftRoot, `${fileStem}.graph.json`);
    const tracePath = resolve(draftRoot, `${fileStem}.trace.json`);
    await writeJson(graphPath, graph);
    await writeJson(tracePath, trace);
    drafts.push({
      pairId: candidate.pairId,
      title: candidate.title,
      sourceEvidencePath: candidate.evidence?.q106EvidencePath || candidate.evidence?.rollupEvidencePath || null,
      requestedFamilies: candidate.requestedFamilies || [],
      sourceFamilies: candidate.sourceFamilies || [],
      graphPath,
      tracePath,
      patchId: graph.patchId
    });
  }

  const result = {
    schemaVersion: "zoia.generated-patch-drafts.v1",
    status: "pass",
    generatedAt: nowIso(),
    inputs: {
      selectionResultPath: selectionPath
    },
    summary: {
      sourceCandidateCount: selection.candidates?.length || 0,
      measuredCandidateCount: (selection.candidates || []).filter((candidate) => candidate.verificationKind === "measured-signal").length,
      familySupportedCandidateCount: candidates.length,
      draftCount: drafts.length
    },
    drafts,
    claimBoundaries: {
      generatedIntermediateGraphClaim: true,
      exportedPatchClaim: false,
      novelPatchClaim: false,
      runtimeAudioClaim: false
    },
    artifacts: {
      resultPath,
      draftRoot
    }
  };
  await writeJson(resultPath, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    draftRoot,
    resultPath
  }, null, JSON_SPACES));
}

main().catch(async (error) => {
  const { draftRoot, resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-drafts.v1",
    status: "fail",
    generatedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    claimBoundaries: {
      generatedIntermediateGraphClaim: false,
      exportedPatchClaim: false,
      novelPatchClaim: false,
      runtimeAudioClaim: false
    },
    artifacts: {
      resultPath,
      draftRoot
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
