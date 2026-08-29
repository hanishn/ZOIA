#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const DEFAULT_FIXTURE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/generated-patches/selection-bridge");
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-validation");
const DEFAULT_RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;
const MAX_GENERATED_MODULES = 12;
const MAX_GENERATED_CONNECTIONS = 24;
const VALID_DOMAINS = new Set(["audio", "cv", "midi", "control", "interface", "utility"]);
const VALID_MODALITIES = new Set(["audio", "cv", "midi", "control", "sample", "sequencer", "synth", "effect"]);
const VALID_TRACE_VERIFICATION_METHODS = new Set(["static-graph"]);
const DISALLOWED_EXPORT_FIELDS = new Set([
  "binary",
  "binaryExport",
  "binData",
  "encodedPatch",
  "exportPayload",
  "firmwareBytes",
  "serializedBytes"
]);
const SUPPORTED_MODULES = Object.freeze({
  "Audio Input": { domain: "audio", inputs: [], outputs: ["audio"], params: [] },
  "Audio Output": { domain: "audio", inputs: ["audio"], outputs: [], params: [] },
  "Delay Line": { domain: "audio", inputs: ["audio", "feedback_cv", "time_cv"], outputs: ["audio"], params: ["time", "feedback", "mix"] },
  "State Variable Filter": { domain: "audio", inputs: ["audio", "cutoff_cv", "resonance_cv"], outputs: ["audio"], params: ["cutoff", "resonance", "mix"] },
  "LFO": { domain: "cv", inputs: [], outputs: ["cv"], params: ["rate", "depth"] },
  "Expression Pedal": { domain: "control", inputs: [], outputs: ["cv"], params: [] },
  "Reverb Lite": { domain: "audio", inputs: ["audio", "mix_cv", "decay_cv"], outputs: ["audio"], params: ["decay", "tone", "mix"] },
  "Synth Voice": { domain: "audio", inputs: ["audio", "pitch_cv", "gate_cv"], outputs: ["audio"], params: ["waveform", "envelope", "mix"] },
  "CV Sequencer": { domain: "cv", inputs: [], outputs: ["cv"], params: ["steps", "movement"] },
  "Verified Template Core": { domain: "audio", inputs: ["audio", "feedback_cv", "time_cv"], outputs: ["audio"], params: ["character", "variation"] }
});
const TRACE_MODALITY_KEYWORDS = Object.freeze({
  audio: [/\baudio\b/u],
  cv: [/\bcv\b/u, /\bmodulation\b/u, /\blfo\b/u],
  control: [/\bcontrol\b/u, /\bexpression\b/u, /\bpedal\b/u, /\bswitch\b/u]
});

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
  let fixtureRoot = DEFAULT_FIXTURE_ROOT;
  let expectNegative = true;
  let resultPath = DEFAULT_RESULT_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixture-root") {
      fixtureRoot = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--no-negative-fixtures") {
      expectNegative = false;
    } else if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    }
  }
  return { fixtureRoot, expectNegative, resultPath };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addError(errors, code, message, detail = {}) {
  errors.push({ code, message, ...detail });
}

function uniqueIds(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      addError(errors, `duplicate-${label}-id`, `Duplicate ${label} id: ${item.id}`, { id: item.id });
    }
    seen.add(item.id);
  }
}

function uniqueStrings(values, code, message, detail, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      addError(errors, code, message, { ...detail, value });
    }
    seen.add(value);
  }
}

function validateGraphShape(graph, errors) {
  if (!isObject(graph)) {
    addError(errors, "graph-not-object", "Graph must be an object.");
    return;
  }
  if (graph.schemaVersion !== "zoia.generated-patch-graph.v1") {
    addError(errors, "graph-schema-version", "Graph schemaVersion is invalid.");
  }
  for (const field of Object.keys(graph)) {
    if (DISALLOWED_EXPORT_FIELDS.has(field)) {
      addError(errors, "export-boundary-field", `Graph field ${field} is not allowed in pre-export generated candidates.`, { field });
    }
  }
  for (const field of ["patchId", "name"]) {
    if (typeof graph[field] !== "string" || graph[field].trim() === "") {
      addError(errors, "graph-required-field", `Graph field ${field} must be a non-empty string.`, { field });
    }
  }
  if (!Array.isArray(graph.expectedModalities) || graph.expectedModalities.length === 0) {
    addError(errors, "expected-modalities-empty", "Graph expectedModalities must be a non-empty array.");
  } else {
    for (const modality of graph.expectedModalities) {
      if (!VALID_MODALITIES.has(modality)) {
        addError(errors, "expected-modality-invalid", `Invalid expected modality: ${modality}`, { modality });
      }
    }
  }
  if (!Array.isArray(graph.modules) || graph.modules.length === 0) {
    addError(errors, "modules-empty", "Graph modules must be a non-empty array.");
  } else if (graph.modules.length > MAX_GENERATED_MODULES) {
    addError(errors, "module-count-exceeds-limit", "Generated graph exceeds the pre-export module count limit.", {
      moduleCount: graph.modules.length,
      maxModuleCount: MAX_GENERATED_MODULES
    });
  }
  if (!Array.isArray(graph.connections)) {
    addError(errors, "connections-not-array", "Graph connections must be an array.");
  } else if (graph.connections.length > MAX_GENERATED_CONNECTIONS) {
    addError(errors, "connection-count-exceeds-limit", "Generated graph exceeds the pre-export connection count limit.", {
      connectionCount: graph.connections.length,
      maxConnectionCount: MAX_GENERATED_CONNECTIONS
    });
  }
}

function validateModules(graph, errors) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  uniqueIds(modules, "module", errors);
  const occupiedGridPositions = new Map();
  for (const mod of modules) {
    if (!isObject(mod)) {
      addError(errors, "module-not-object", "Module must be an object.");
      continue;
    }
    for (const field of ["id", "type", "domain"]) {
      if (typeof mod[field] !== "string" || mod[field].trim() === "") {
        addError(errors, "module-required-field", `Module field ${field} must be a non-empty string.`, { moduleId: mod.id || null, field });
      }
    }
    for (const field of Object.keys(mod)) {
      if (DISALLOWED_EXPORT_FIELDS.has(field)) {
        addError(errors, "module-export-boundary-field", `Module field ${field} is not allowed in pre-export generated candidates.`, { moduleId: mod.id || null, field });
      }
    }
    if (!VALID_DOMAINS.has(mod.domain)) {
      addError(errors, "module-domain-invalid", `Invalid module domain: ${mod.domain}`, { moduleId: mod.id || null, domain: mod.domain });
    }
    const contract = SUPPORTED_MODULES[mod.type];
    if (!contract) {
      addError(errors, "module-type-unsupported", `Unsupported generated module type: ${mod.type}`, { moduleId: mod.id || null, type: mod.type || null });
    } else {
      if (mod.domain !== contract.domain) {
        addError(errors, "module-domain-contract-mismatch", "Module domain does not match the supported module contract.", {
          moduleId: mod.id || null,
          type: mod.type,
          expectedDomain: contract.domain,
          observedDomain: mod.domain
        });
      }
      for (const port of contract.inputs) {
        if (!Array.isArray(mod.inputs) || !mod.inputs.includes(port)) {
          addError(errors, "module-input-contract-missing", "Module is missing a required input port for its supported type.", { moduleId: mod.id || null, type: mod.type, port });
        }
      }
      if (Array.isArray(mod.inputs)) {
        const supportedInputs = new Set(contract.inputs);
        for (const port of mod.inputs) {
          if (!supportedInputs.has(port)) {
            addError(errors, "module-input-contract-unsupported", "Module contains an unsupported input port for its supported type.", { moduleId: mod.id || null, type: mod.type, port });
          }
        }
      }
      for (const port of contract.outputs) {
        if (!Array.isArray(mod.outputs) || !mod.outputs.includes(port)) {
          addError(errors, "module-output-contract-missing", "Module is missing a required output port for its supported type.", { moduleId: mod.id || null, type: mod.type, port });
        }
      }
      if (Array.isArray(mod.outputs)) {
        const supportedOutputs = new Set(contract.outputs);
        for (const port of mod.outputs) {
          if (!supportedOutputs.has(port)) {
            addError(errors, "module-output-contract-unsupported", "Module contains an unsupported output port for its supported type.", { moduleId: mod.id || null, type: mod.type, port });
          }
        }
      }
      for (const param of contract.params) {
        if (!isObject(mod.params) || !(param in mod.params)) {
          addError(errors, "module-param-contract-missing", "Module is missing a required parameter for its supported type.", { moduleId: mod.id || null, type: mod.type, param });
        }
      }
      if (isObject(mod.params)) {
        const supportedParams = new Set(contract.params);
        for (const param of Object.keys(mod.params)) {
          if (!supportedParams.has(param)) {
            addError(errors, "module-param-contract-unsupported", "Module contains an unsupported parameter for its supported type.", { moduleId: mod.id || null, type: mod.type, param });
          }
        }
      }
    }
    if (!Number.isInteger(mod.page) || mod.page < 0) {
      addError(errors, "module-page-invalid", "Module page must be a non-negative integer.", { moduleId: mod.id || null, page: mod.page });
    }
    if (!Number.isInteger(mod.grid) || mod.grid < 0 || mod.grid > 39) {
      addError(errors, "module-grid-invalid", "Module grid must be an integer from 0 to 39.", { moduleId: mod.id || null, grid: mod.grid });
    } else if (Number.isInteger(mod.page) && mod.page >= 0) {
      const positionKey = `${mod.page}:${mod.grid}`;
      const existingModuleId = occupiedGridPositions.get(positionKey);
      if (existingModuleId) {
        addError(errors, "module-grid-position-duplicate", "Modules must not occupy the same page/grid position.", {
          moduleId: mod.id || null,
          existingModuleId,
          page: mod.page,
          grid: mod.grid
        });
      } else {
        occupiedGridPositions.set(positionKey, mod.id || null);
      }
    }
    if (!isObject(mod.params)) {
      addError(errors, "module-params-invalid", "Module params must be an object.", { moduleId: mod.id || null });
    } else {
      for (const [key, value] of Object.entries(mod.params)) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          addError(errors, "module-param-not-normalized-number", "Module parameter must be a finite normalized number.", { moduleId: mod.id || null, param: key, value });
        } else if (value < 0 || value > 1) {
          addError(errors, "module-param-out-of-range", "Module parameter must be a number from 0 to 1.", { moduleId: mod.id || null, param: key, value });
        }
      }
    }
    for (const field of ["inputs", "outputs"]) {
      if (!Array.isArray(mod[field]) || mod[field].some((port) => typeof port !== "string" || port.trim() === "")) {
        addError(errors, "module-ports-invalid", `Module ${field} must be an array of non-empty strings.`, { moduleId: mod.id || null, field });
      } else {
        uniqueStrings(
          mod[field],
          "module-port-duplicate",
          `Module ${field} must not contain duplicate generated port names.`,
          { moduleId: mod.id || null, field },
          errors
        );
      }
    }
  }
}

function validateConnections(graph, errors) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  uniqueIds(connections, "connection", errors);
  const connectedModuleIds = new Set();
  const connectionEndpointPairs = new Map();
  for (const conn of connections) {
    if (!isObject(conn)) {
      addError(errors, "connection-not-object", "Connection must be an object.");
      continue;
    }
    if (typeof conn.id !== "string" || conn.id.trim() === "") {
      addError(errors, "connection-id-invalid", "Connection id must be a non-empty string.");
    }
    if (typeof conn.gain !== "number" || !Number.isFinite(conn.gain)) {
      addError(errors, "connection-gain-not-normalized-number", "Connection gain must be a finite normalized number.", { connectionId: conn.id || null, gain: conn.gain });
    } else if (conn.gain < -1 || conn.gain > 1) {
      addError(errors, "connection-gain-out-of-range", "Connection gain must be from -1 to 1.", { connectionId: conn.id || null, gain: conn.gain });
    }
    validateEndpoint(conn.from, "from", moduleById, conn.id, errors);
    validateEndpoint(conn.to, "to", moduleById, conn.id, errors);
    validateConnectionSignalKind(conn, moduleById, errors);
    if (isObject(conn.from) && isObject(conn.to)) {
      if (conn.from.moduleId) connectedModuleIds.add(conn.from.moduleId);
      if (conn.to.moduleId) connectedModuleIds.add(conn.to.moduleId);
      if (conn.from.moduleId && conn.from.moduleId === conn.to.moduleId) {
        addError(errors, "connection-self-route-unsupported", "Generated connections must not route a module back into itself.", {
          connectionId: conn.id || null,
          moduleId: conn.from.moduleId
        });
      }
      const endpointPair = `${conn.from.moduleId || ""}:${conn.from.port || ""}->${conn.to.moduleId || ""}:${conn.to.port || ""}`;
      const existingConnectionId = connectionEndpointPairs.get(endpointPair);
      if (existingConnectionId) {
        addError(errors, "connection-endpoint-pair-duplicate", "Connections must not duplicate the same generated endpoint pair.", {
          connectionId: conn.id || null,
          existingConnectionId,
          endpointPair
        });
      } else {
        connectionEndpointPairs.set(endpointPair, conn.id || null);
      }
    }
  }
  for (const mod of modules) {
    if (!connectedModuleIds.has(mod.id)) {
      addError(errors, "module-orphan", "Generated modules must participate in at least one connection before export.", {
        moduleId: mod.id || null
      });
    }
  }
}

function validateEndpoint(endpoint, role, moduleById, connectionId, errors) {
  if (!isObject(endpoint)) {
    addError(errors, "connection-endpoint-invalid", "Connection endpoint must be an object.", { connectionId, role });
    return;
  }
  const mod = moduleById.get(endpoint.moduleId);
  if (!mod) {
    addError(errors, "connection-module-missing", "Connection references a missing module.", { connectionId, role, moduleId: endpoint.moduleId || null });
    return;
  }
  const ports = role === "from" ? mod.outputs : mod.inputs;
  if (!Array.isArray(ports) || !ports.includes(endpoint.port)) {
    addError(errors, "connection-port-missing", "Connection references a missing module port.", { connectionId, role, moduleId: endpoint.moduleId, port: endpoint.port || null });
  }
}

function portSignalKind(port) {
  if (port === "audio" || /_audio$/u.test(port)) return "audio";
  if (port === "cv" || /_cv$/u.test(port) || /^(gate|pitch)$/u.test(port)) return "cv";
  return "unknown";
}

function validateConnectionSignalKind(conn, moduleById, errors) {
  const fromModule = moduleById.get(conn.from?.moduleId);
  const toModule = moduleById.get(conn.to?.moduleId);
  if (!fromModule || !toModule) return;
  if (!Array.isArray(fromModule.outputs) || !fromModule.outputs.includes(conn.from?.port)) return;
  if (!Array.isArray(toModule.inputs) || !toModule.inputs.includes(conn.to?.port)) return;

  const fromKind = portSignalKind(conn.from.port);
  const toKind = portSignalKind(conn.to.port);
  if (fromKind !== "unknown" && toKind !== "unknown" && fromKind !== toKind) {
    addError(errors, "connection-port-kind-mismatch", "Connection links incompatible generated port signal kinds.", {
      connectionId: conn.id || null,
      from: { moduleId: conn.from.moduleId, port: conn.from.port, kind: fromKind },
      to: { moduleId: conn.to.moduleId, port: conn.to.port, kind: toKind }
    });
  }
}

function isAudioIoModule(mod) {
  return mod.domain === "audio" && /audio (input|output)/i.test(mod.type);
}

function audioRouteShape(graph) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const starts = modules.filter((mod) => mod.domain === "audio" && /audio input/i.test(mod.type));
  const outputs = new Set(modules.filter((mod) => mod.domain === "audio" && /audio output/i.test(mod.type)).map((mod) => mod.id));
  const adjacency = new Map();
  for (const conn of connections) {
    if (!moduleById.has(conn.from?.moduleId) || !moduleById.has(conn.to?.moduleId)) continue;
    if (conn.from?.port !== "audio" || conn.to?.port !== "audio") continue;
    if (!adjacency.has(conn.from.moduleId)) adjacency.set(conn.from.moduleId, []);
    adjacency.get(conn.from.moduleId).push(conn.to.moduleId);
  }
  const queue = starts.map((mod) => ({ moduleId: mod.id, hasProcessor: false }));
  const seen = new Set(queue.map((item) => `${item.moduleId}:${item.hasProcessor}`));
  let hasRoute = false;
  while (queue.length > 0) {
    const current = queue.shift();
    if (outputs.has(current.moduleId)) {
      hasRoute = true;
      if (current.hasProcessor) return { hasRoute: true, hasProcessorRoute: true };
    }
    for (const next of adjacency.get(current.moduleId) || []) {
      const nextModule = moduleById.get(next);
      const nextHasProcessor = current.hasProcessor || (nextModule?.domain === "audio" && !isAudioIoModule(nextModule));
      const key = `${next}:${nextHasProcessor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ moduleId: next, hasProcessor: nextHasProcessor });
    }
  }
  return { hasRoute, hasProcessorRoute: false };
}

function hasAudioConnectionCycle(graph) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const adjacency = new Map();
  for (const conn of connections) {
    if (!moduleById.has(conn.from?.moduleId) || !moduleById.has(conn.to?.moduleId)) continue;
    if (conn.from?.port !== "audio" || conn.to?.port !== "audio") continue;
    if (!adjacency.has(conn.from.moduleId)) adjacency.set(conn.from.moduleId, []);
    adjacency.get(conn.from.moduleId).push(conn.to.moduleId);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(moduleId) {
    if (visiting.has(moduleId)) return true;
    if (visited.has(moduleId)) return false;
    visiting.add(moduleId);
    for (const next of adjacency.get(moduleId) || []) {
      if (visit(next)) return true;
    }
    visiting.delete(moduleId);
    visited.add(moduleId);
    return false;
  }
  return [...adjacency.keys()].some((moduleId) => visit(moduleId));
}

function hasDirectAudioTerminalBypass(graph) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  return connections.some((conn) => {
    const fromModule = moduleById.get(conn.from?.moduleId);
    const toModule = moduleById.get(conn.to?.moduleId);
    return fromModule?.domain === "audio" &&
      toModule?.domain === "audio" &&
      /audio input/i.test(fromModule.type || "") &&
      /audio output/i.test(toModule.type || "") &&
      conn.from?.port === "audio" &&
      conn.to?.port === "audio";
  });
}

function orphanAudioProcessors(graph) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const starts = modules.filter((mod) => mod.domain === "audio" && /audio input/i.test(mod.type)).map((mod) => mod.id);
  const outputs = modules.filter((mod) => mod.domain === "audio" && /audio output/i.test(mod.type)).map((mod) => mod.id);
  const forward = new Map();
  const reverse = new Map();
  for (const conn of connections) {
    if (!moduleById.has(conn.from?.moduleId) || !moduleById.has(conn.to?.moduleId)) continue;
    if (conn.from?.port !== "audio" || conn.to?.port !== "audio") continue;
    if (!forward.has(conn.from.moduleId)) forward.set(conn.from.moduleId, []);
    if (!reverse.has(conn.to.moduleId)) reverse.set(conn.to.moduleId, []);
    forward.get(conn.from.moduleId).push(conn.to.moduleId);
    reverse.get(conn.to.moduleId).push(conn.from.moduleId);
  }
  function reachable(seedIds, adjacency) {
    const seen = new Set(seedIds);
    const queue = [...seedIds];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of adjacency.get(current) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen;
  }
  const fromInput = reachable(starts, forward);
  const toOutput = reachable(outputs, reverse);
  return modules
    .filter((mod) => mod.domain === "audio" && !isAudioIoModule(mod))
    .filter((mod) => !fromInput.has(mod.id) || !toOutput.has(mod.id))
    .map((mod) => mod.id);
}

function hasCvRoute(graph) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  return connections.some((conn) => {
    const fromModule = moduleById.get(conn.from?.moduleId);
    const toModule = moduleById.get(conn.to?.moduleId);
    if (!fromModule || !toModule) return false;
    return portSignalKind(conn.from?.port) === "cv" &&
      portSignalKind(conn.to?.port) === "cv" &&
      fromModule.id !== toModule.id;
  });
}

function hasControlRoute(graph) {
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const moduleById = new Map(modules.map((mod) => [mod.id, mod]));
  const connections = Array.isArray(graph.connections) ? graph.connections : [];
  return connections.some((conn) => {
    const fromModule = moduleById.get(conn.from?.moduleId);
    const toModule = moduleById.get(conn.to?.moduleId);
    if (!fromModule || !toModule || fromModule.domain !== "control") return false;
    return portSignalKind(conn.from?.port) === "cv" &&
      portSignalKind(conn.to?.port) === "cv" &&
      fromModule.id !== toModule.id;
  });
}

function validateDomainInvariants(graph, errors) {
  const modalities = new Set(graph.expectedModalities || []);
  const modules = Array.isArray(graph.modules) ? graph.modules : [];
  const audioRoute = audioRouteShape(graph);
  const cvRoutePresent = hasCvRoute(graph);
  const controlRoutePresent = hasControlRoute(graph);
  if (audioRoute.hasRoute && !modalities.has("audio")) {
    addError(errors, "expected-modality-missing", "Generated graph contains a connected audio route but does not declare the audio modality.", { modality: "audio" });
  }
  if (cvRoutePresent && !modalities.has("cv")) {
    addError(errors, "expected-modality-missing", "Generated graph contains a connected CV route but does not declare the CV modality.", { modality: "cv" });
  }
  if (controlRoutePresent && !modalities.has("control")) {
    addError(errors, "expected-modality-missing", "Generated graph contains a connected control route but does not declare the control modality.", { modality: "control" });
  }
  if ((modalities.has("effect") || modalities.has("synth")) && !modalities.has("audio")) {
    addError(errors, "audio-modality-required", "Effect or synth modality requires the audio modality.");
  }
  if (modalities.has("midi")) {
    addError(errors, "midi-modality-unsupported", "MIDI modality is not supported by the current generated pre-export module contract.");
  }
  if (modalities.has("synth") && !modules.some((mod) => mod.type === "Synth Voice")) {
    addError(errors, "synth-core-required", "Synth modality requires a concrete Synth Voice module before export.");
  }
  if (modalities.has("effect") && !modules.some((mod) => ["Delay Line", "State Variable Filter", "Reverb Lite", "Verified Template Core"].includes(mod.type))) {
    addError(errors, "effect-core-required", "Effect modality requires a concrete supported effect core before export.");
  }
  if (modalities.has("audio")) {
    if (!modules.some((mod) => mod.domain === "audio" && /audio input/i.test(mod.type))) {
      addError(errors, "audio-input-required", "Audio modality requires an Audio Input module.");
    }
    if (!modules.some((mod) => mod.domain === "audio" && /audio output/i.test(mod.type))) {
      addError(errors, "audio-output-required", "Audio modality requires an Audio Output module.");
    }
    if (!audioRoute.hasRoute) {
      addError(errors, "audio-route-required", "Audio modality requires a connected route from Audio Input to Audio Output.");
    }
    if ((modalities.has("effect") || modalities.has("synth")) && !audioRoute.hasProcessorRoute) {
      addError(errors, "audio-processor-route-required", "Effect or synth modality requires the audio route to include a non-IO audio processor.");
    }
    if ((modalities.has("effect") || modalities.has("synth")) && hasDirectAudioTerminalBypass(graph)) {
      addError(errors, "audio-route-direct-bypass-unsupported", "Effect or synth modality must not include a direct Audio Input to Audio Output bypass route before export.");
    }
    if (hasAudioConnectionCycle(graph)) {
      addError(errors, "audio-cycle-unsupported", "Generated audio connection cycles are not supported before export.");
    }
    const orphanProcessorIds = orphanAudioProcessors(graph);
    if (orphanProcessorIds.length > 0) {
      addError(errors, "audio-processor-orphan", "Generated audio processors must be connected on a route from Audio Input to Audio Output.", {
        moduleIds: orphanProcessorIds
      });
    }
  }
  if (modalities.has("cv") && !modules.some((mod) => mod.domain === "cv" || mod.outputs?.includes("cv"))) {
    addError(errors, "cv-source-required", "CV modality requires a CV source module or CV output port.");
  }
  if (modalities.has("cv") && !cvRoutePresent) {
    addError(errors, "cv-route-required", "CV modality requires a connected CV modulation route.");
  }
  if (modalities.has("control") && !modules.some((mod) => mod.domain === "control" || /button|switch|pedal|interface/i.test(mod.type))) {
    addError(errors, "control-source-required", "Control modality requires a control module.");
  }
  if (modalities.has("control") && !controlRoutePresent) {
    addError(errors, "control-route-required", "Control modality requires a connected control route.");
  }
}

function evidencePathsFromText(text) {
  const matches = text.matchAll(/(?:[A-Za-z]:[\\/][^\s")]+|tests[\\/]+workflow[\\/]+evidence[^\s")]+)/gu);
  return [...matches].map((match) => match[0].replace(/[),.;:]+$/u, ""));
}

function resolveEvidencePath(path) {
  return /^[A-Za-z]:[\\/]/u.test(path) ? resolve(path) : resolve(PROJECT_ROOT, path);
}

function validateTrace(trace, graph, errors) {
  if (!isObject(trace)) {
    addError(errors, "trace-not-object", "Trace must be an object.");
    return;
  }
  if (trace.schemaVersion !== "zoia.generated-patch-requirement-trace.v1") {
    addError(errors, "trace-schema-version", "Trace schemaVersion is invalid.");
  }
  if (trace.patchId !== graph.patchId) {
    addError(errors, "trace-patch-id-mismatch", "Trace patchId must match graph patchId.", { graphPatchId: graph.patchId || null, tracePatchId: trace.patchId || null });
  }
  if (!Array.isArray(trace.requirements) || trace.requirements.length === 0) {
    addError(errors, "trace-requirements-empty", "Trace requirements must be non-empty.");
    return;
  }
  uniqueIds(trace.requirements, "requirement", errors);
  const moduleIds = new Set((graph.modules || []).map((mod) => mod.id));
  const connectionIds = new Set((graph.connections || []).map((conn) => conn.id));
  const tracedModuleIds = new Set();
  const tracedConnectionIds = new Set();
  const satisfiedTraceText = [];
  for (const requirement of trace.requirements) {
    for (const field of ["id", "sourceText", "status"]) {
      if (typeof requirement[field] !== "string" || requirement[field].trim() === "") {
        addError(errors, "trace-requirement-field-invalid", `Requirement field ${field} must be a non-empty string.`, { requirementId: requirement.id || null, field });
      }
    }
    if (!["satisfied", "blocked"].includes(requirement.status)) {
      addError(errors, "trace-requirement-status-invalid", "Requirement status must be satisfied or blocked.", { requirementId: requirement.id || null, status: requirement.status || null });
    }
    if (requirement.status === "blocked") {
      addError(errors, "trace-blocked-requirement", "Generated candidate traces must not contain blocked requirements before export.", { requirementId: requirement.id || null });
    }
    if (requirement.status === "satisfied" && (!Array.isArray(requirement.moduleIds) || requirement.moduleIds.length === 0)) {
      addError(errors, "trace-satisfied-requirement-unmapped", "Satisfied requirement must reference at least one module.", { requirementId: requirement.id || null });
    }
    if (requirement.status === "satisfied") {
      satisfiedTraceText.push(`${requirement.sourceText || ""} ${requirement.verification?.expectedEvidence || ""}`.toLowerCase());
    }
    for (const moduleId of requirement.moduleIds || []) {
      tracedModuleIds.add(moduleId);
      if (!moduleIds.has(moduleId)) {
        addError(errors, "trace-module-missing", "Trace references a missing module.", { requirementId: requirement.id || null, moduleId });
      }
    }
    for (const connectionId of requirement.connectionIds || []) {
      tracedConnectionIds.add(connectionId);
      if (!connectionIds.has(connectionId)) {
        addError(errors, "trace-connection-missing", "Trace references a missing connection.", { requirementId: requirement.id || null, connectionId });
      }
    }
    if (!isObject(requirement.verification) || typeof requirement.verification.expectedEvidence !== "string" || requirement.verification.expectedEvidence.trim() === "") {
      addError(errors, "trace-verification-invalid", "Requirement verification must include expected evidence.", { requirementId: requirement.id || null });
    } else {
      if (typeof requirement.verification.method !== "string" || !VALID_TRACE_VERIFICATION_METHODS.has(requirement.verification.method)) {
        addError(errors, "trace-verification-method-unsupported", "Requirement verification method is not supported for pre-export generated candidates.", {
          requirementId: requirement.id || null,
          method: requirement.verification.method || null
        });
      }
      for (const evidencePath of evidencePathsFromText(requirement.verification.expectedEvidence)) {
        if (!existsSync(resolveEvidencePath(evidencePath))) {
          addError(errors, "trace-expected-evidence-missing", "Requirement verification references missing expected evidence.", {
            requirementId: requirement.id || null,
            evidencePath
          });
        }
      }
    }
  }
  for (const moduleId of moduleIds) {
    if (!tracedModuleIds.has(moduleId)) {
      addError(errors, "trace-module-uncovered", "Trace must cover every generated graph module.", { moduleId });
    }
  }
  for (const connectionId of connectionIds) {
    if (!tracedConnectionIds.has(connectionId)) {
      addError(errors, "trace-connection-uncovered", "Trace must cover every generated graph connection.", { connectionId });
    }
  }
  const joinedTraceText = satisfiedTraceText.join("\n");
  for (const modality of graph.expectedModalities || []) {
    const patterns = TRACE_MODALITY_KEYWORDS[modality];
    if (!patterns) continue;
    if (!patterns.some((pattern) => pattern.test(joinedTraceText))) {
      addError(errors, "trace-modality-uncovered", "Trace must identify each declared generated modality it satisfies.", { modality });
    }
  }
}

async function findCandidates(root) {
  const entries = await readdir(root);
  return entries
    .filter((entry) => entry.endsWith(".graph.json"))
    .map((graphName) => ({
      graphPath: resolve(root, graphName),
      tracePath: resolve(root, graphName.replace(/\.graph\.json$/, ".trace.json")),
      fixtureName: graphName.replace(/\.graph\.json$/, "")
    }))
    .sort((a, b) => a.fixtureName.localeCompare(b.fixtureName));
}

async function validateCandidate(candidate) {
  const errors = [];
  const graph = await readJson(candidate.graphPath);
  const trace = existsSync(candidate.tracePath) ? await readJson(candidate.tracePath) : null;
  if (!trace) addError(errors, "trace-file-missing", "Trace file is missing.", { tracePath: candidate.tracePath });
  validateGraphShape(graph, errors);
  validateModules(graph, errors);
  validateConnections(graph, errors);
  validateDomainInvariants(graph, errors);
  if (trace) validateTrace(trace, graph, errors);
  return {
    fixtureName: candidate.fixtureName,
    patchId: graph.patchId || candidate.fixtureName,
    status: errors.length === 0 ? "pass" : "fail",
    graphPath: candidate.graphPath,
    tracePath: candidate.tracePath,
    expectedNegative: /^malformed-|^invalid-/.test(basename(candidate.graphPath)),
    errorCount: errors.length,
    errors
  };
}

async function main() {
  const { fixtureRoot, expectNegative, resultPath } = parseArgs(process.argv.slice(2));
  if (!existsSync(fixtureRoot)) throw new Error(`Missing fixture root: ${fixtureRoot}`);
  const candidates = await findCandidates(fixtureRoot);
  const results = [];
  for (const candidate of candidates) {
    results.push(await validateCandidate(candidate));
  }
  const positiveResults = results.filter((item) => !item.expectedNegative);
  const negativeResults = results.filter((item) => item.expectedNegative);
  const unexpectedPositiveFailures = positiveResults.filter((item) => item.status !== "pass");
  const unexpectedNegativePasses = expectNegative ? negativeResults.filter((item) => item.status !== "fail") : [];
  const status = unexpectedPositiveFailures.length === 0 && unexpectedNegativePasses.length === 0 ? "pass" : "fail";
  const output = {
    schemaVersion: "zoia.generated-patch-validation-result.v1",
    status,
    generatedAt: nowIso(),
    inputs: {
      fixtureRoot
    },
    summary: {
      candidateCount: results.length,
      passingCandidateCount: results.filter((item) => item.status === "pass").length,
      rejectedCandidateCount: results.filter((item) => item.status === "fail").length,
      positiveCandidateCount: positiveResults.length,
      negativeFixtureCount: negativeResults.length,
      unexpectedPositiveFailureCount: unexpectedPositiveFailures.length,
      unexpectedNegativePassCount: unexpectedNegativePasses.length
    },
    results,
    claimBoundaries: {
      preExportGraphValidationOnly: true,
      exportedPatchClaim: false,
      novelPatchClaim: false,
      audioRuntimeClaim: false
    },
    artifacts: {
      resultPath
    }
  };
  await writeJson(resultPath, output);
  console.log(JSON.stringify({
    status: output.status,
    ...output.summary,
    resultPath
  }, null, JSON_SPACES));
  if (output.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  const { resultPath } = parseArgs(process.argv.slice(2));
  await writeJson(resultPath, {
    schemaVersion: "zoia.generated-patch-validation-result.v1",
    status: "fail",
    generatedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    claimBoundaries: {
      preExportGraphValidationOnly: true,
      exportedPatchClaim: false,
      novelPatchClaim: false,
      audioRuntimeClaim: false
    },
    artifacts: {
      resultPath
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
