#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-candidate-review");
const RESULT_PATH = process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_RESULT_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_RESULT_PATH)
  : resolve(EVIDENCE_ROOT, "run-result.json");
const DESCRIPTION_WORKFLOW_PATH = process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_DESCRIPTION_WORKFLOW_PATH
  ? resolve(PROJECT_ROOT, process.env.ZOIA_GENERATED_PATCH_CANDIDATE_REVIEW_DESCRIPTION_WORKFLOW_PATH)
  : resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-from-description/run-result.json");
const JSON_SPACES = 2;
const DISALLOWED_EXPORT_FIELDS = new Set(["binary", "binaryExport", "binData", "encodedPatch", "exportPayload", "firmwareBytes", "serializedBytes"]);
const UNRESOLVED_ABSTRACTION_TYPES = new Set(["Verified Template Core"]);
const FAMILY_KEYWORDS = Object.freeze([
  {
    family: "delay",
    graphTypes: ["Delay Line"],
    sourceNeedles: ["delay", "looper", "loop"]
  },
  {
    family: "reverb",
    graphTypes: ["Reverb Lite"],
    sourceNeedles: ["reverb"]
  },
  {
    family: "synth",
    graphTypes: ["Synth Voice"],
    sourceNeedles: ["synth", "oscillator", "midi note"]
  },
  {
    family: "sequencer",
    graphTypes: ["CV Sequencer"],
    sourceNeedles: ["sequencer"]
  }
]);
const ROLE_RULES = Object.freeze([
  {
    role: "audio-route",
    graphRequires: ["Audio Input", "Audio Output"],
    sourceAny: [["Audio Input", "Audio Output"], ["Audio Out", "Audio Output"], ["Looper", "Audio Output"], ["Delay Line", "Audio Output"]]
  },
  {
    role: "modulation-source",
    graphAny: ["LFO", "CV Sequencer", "Random", "Sample & Hold"],
    sourceAny: [["LFO"], ["CV Sequencer"], ["Sequencer"], ["Random"], ["Sample & Hold"], ["CV Delay"]]
  },
  {
    role: "control-source",
    graphAny: ["Expression Pedal", "Pushbutton", "Stompswitch", "MIDI CC In", "MIDI Note In", "Tap Tempo"],
    sourceAny: [["Cport Exp/CV"], ["Expression Pedal"], ["Pushbutton"], ["Stompswitch"], ["MIDI CC In"], ["MIDI Note In"], ["Tap Tempo"], ["Value"]]
  }
]);
const BASE_SUPPORTED_MODALITIES = new Set(["audio"]);
const DERIVED_MODALITY_SUPPORT = Object.freeze({
  control: ["cv"],
  sequencer: ["cv"]
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

function collectExportFields(value, path = "$") {
  if (!value || typeof value !== "object") return [];
  const found = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => found.push(...collectExportFields(item, `${path}[${index}]`)));
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (DISALLOWED_EXPORT_FIELDS.has(key)) found.push({ path: childPath, field: key });
    found.push(...collectExportFields(child, childPath));
  }
  return found;
}

function collectUnresolvedAbstractions(graph) {
  return (graph?.modules || [])
    .filter((module) => UNRESOLVED_ABSTRACTION_TYPES.has(module.type))
    .map((module) => ({
      moduleId: module.id,
      type: module.type,
      page: module.page,
      grid: module.grid
    }));
}

function graphFamilies(graph) {
  const moduleTypes = new Set((graph?.modules || []).map((module) => module.type));
  return FAMILY_KEYWORDS
    .filter((item) => item.graphTypes.some((type) => moduleTypes.has(type)))
    .map((item) => item.family)
    .sort();
}

function sourceFamilies(sourceEvidence) {
  const modules = sourceEvidence?.staticAnalysis?.modules || [];
  const moduleText = modules
    .map((module) => [module.typeName, module.name].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();
  const titleText = [
    sourceEvidence?.staticAnalysis?.patchName,
    sourceEvidence?.fixtureReference?.jsonPath,
    sourceEvidence?.fixtureReference?.binPath
  ].filter(Boolean).join(" ").toLowerCase();
  const haystack = `${moduleText} ${titleText}`;
  return FAMILY_KEYWORDS
    .filter((item) => item.sourceNeedles.some((needle) => haystack.includes(needle)))
    .map((item) => item.family)
    .sort();
}

function moduleTypeSet(modules) {
  return new Set((modules || [])
    .map((module) => module.type || module.typeName || module.name)
    .filter(Boolean));
}

function setHasAll(set, required) {
  return required.every((item) => set.has(item));
}

function setHasAny(set, required) {
  return required.some((item) => set.has(item));
}

function graphRoles(graph) {
  const moduleTypes = moduleTypeSet(graph?.modules || []);
  return ROLE_RULES
    .filter((rule) => {
      if (rule.graphRequires) return setHasAll(moduleTypes, rule.graphRequires);
      return setHasAny(moduleTypes, rule.graphAny || []);
    })
    .map((rule) => rule.role)
    .sort();
}

function sourceRoles(sourceEvidence) {
  const moduleTypes = moduleTypeSet(sourceEvidence?.staticAnalysis?.modules || []);
  return ROLE_RULES
    .filter((rule) => rule.sourceAny.some((requiredSet) => setHasAll(moduleTypes, requiredSet)))
    .map((rule) => rule.role)
    .sort();
}

function compareSourceToGraph(sourceEvidence, graph) {
  const source = sourceFamilies(sourceEvidence);
  const graphCore = graphFamilies(graph);
  const matched = graphCore.filter((family) => source.includes(family)).sort();
  const missing = graphCore.filter((family) => !source.includes(family)).sort();
  const sourceModuleRoles = sourceRoles(sourceEvidence);
  const graphModuleRoles = graphRoles(graph);
  const matchedRoles = graphModuleRoles.filter((role) => sourceModuleRoles.includes(role)).sort();
  const missingRoles = graphModuleRoles.filter((role) => !sourceModuleRoles.includes(role)).sort();
  return {
    sourceFamilies: source,
    graphFamilies: graphCore,
    matchedFamilies: matched,
    missingSourceSupportFamilies: missing,
    sourceSupportsGraphCore: graphCore.length > 0 && missing.length === 0,
    sourceRoles: sourceModuleRoles,
    graphRoles: graphModuleRoles,
    matchedRoles,
    missingSourceSupportRoles: missingRoles,
    sourceSupportsGraphRoles: graphModuleRoles.length > 0 && missingRoles.length === 0
  };
}

function compareTraceToGraph(trace, graph) {
  const graphModuleIds = [...new Set((graph?.modules || []).map((module) => module.id).filter(Boolean))].sort();
  const graphConnectionIds = [...new Set((graph?.connections || []).map((connection) => connection.id).filter(Boolean))].sort();
  const tracedModuleIds = [...new Set((trace?.requirements || []).flatMap((requirement) => requirement.moduleIds || []).filter(Boolean))].sort();
  const tracedConnectionIds = [...new Set((trace?.requirements || []).flatMap((requirement) => requirement.connectionIds || []).filter(Boolean))].sort();
  const missingModuleIds = graphModuleIds.filter((moduleId) => !tracedModuleIds.includes(moduleId));
  const missingConnectionIds = graphConnectionIds.filter((connectionId) => !tracedConnectionIds.includes(connectionId));
  return {
    graphModuleIds,
    graphConnectionIds,
    tracedModuleIds,
    tracedConnectionIds,
    missingModuleIds,
    missingConnectionIds,
    traceCoversGraph: graphModuleIds.length > 0 &&
      graphConnectionIds.length > 0 &&
      missingModuleIds.length === 0 &&
      missingConnectionIds.length === 0
  };
}

function normalizeList(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim()))].sort();
}

function compareIntentToGraphModalities(intent, selectionCandidate, graph) {
  const intentModalities = normalizeList(intent?.requestedModalities);
  const matchedModalities = normalizeList(selectionCandidate?.matchedModalities);
  const graphModalities = normalizeList(graph?.expectedModalities);
  const supported = new Set([...BASE_SUPPORTED_MODALITIES, ...intentModalities, ...matchedModalities]);
  for (const modality of [...supported]) {
    for (const derived of DERIVED_MODALITY_SUPPORT[modality] || []) supported.add(derived);
  }
  const unsupportedGraphModalities = graphModalities.filter((modality) => !supported.has(modality));
  return {
    intentModalities,
    matchedModalities,
    graphModalities,
    supportedModalities: [...supported].sort(),
    unsupportedGraphModalities,
    intentSupportsGraphModalities: graphModalities.length > 0 && unsupportedGraphModalities.length === 0
  };
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const problems = [];
  if (!existsSync(DESCRIPTION_WORKFLOW_PATH)) {
    problems.push({
      id: "description-workflow-evidence-missing",
      message: "Generated-patch description workflow evidence is missing.",
      evidencePath: DESCRIPTION_WORKFLOW_PATH
    });
  }
  const workflow = problems.length === 0 ? await readJson(DESCRIPTION_WORKFLOW_PATH) : null;
  const validationPath = workflow?.artifacts?.validationResultPath || null;
  const validation = validationPath && existsSync(validationPath) ? await readJson(validationPath) : null;
  const selectionPath = workflow?.artifacts?.selectionResultPath || null;
  const selection = selectionPath && existsSync(selectionPath) ? await readJson(selectionPath) : null;
  const selectedCandidatesByPairId = new Map((selection?.candidates || [])
    .map((candidate) => [candidate.pairId, candidate]));
  if (workflow && workflow.status !== "pass") {
    problems.push({
      id: "description-workflow-not-passing",
      message: "Generated-patch description workflow is not passing.",
      evidencePath: DESCRIPTION_WORKFLOW_PATH,
      observed: { status: workflow.status, summary: workflow.summary }
    });
  }
  if (!validation) {
    problems.push({
      id: "description-validation-evidence-missing",
      message: "Generated-patch description validation evidence is missing.",
      evidencePath: validationPath
    });
  }
  if (!selection) {
    problems.push({
      id: "description-selection-evidence-missing",
      message: "Generated-patch description selection evidence is missing.",
      evidencePath: selectionPath
    });
  }

  const drafts = [];
  for (const draft of workflow?.artifacts ? (await readJson(workflow.artifacts.draftResultPath)).drafts || [] : []) {
    const graph = existsSync(draft.graphPath) ? await readJson(draft.graphPath) : null;
    const trace = existsSync(draft.tracePath) ? await readJson(draft.tracePath) : null;
    const sourceEvidence = draft.sourceEvidencePath && existsSync(draft.sourceEvidencePath) ? await readJson(draft.sourceEvidencePath) : null;
    const validationResult = (validation?.results || []).find((item) => resolve(item.graphPath) === resolve(draft.graphPath));
    const exportFields = collectExportFields(graph);
    const unresolvedAbstractions = collectUnresolvedAbstractions(graph);
    const sourceGraphComparison = compareSourceToGraph(sourceEvidence, graph);
    const traceGraphCoverage = compareTraceToGraph(trace, graph);
    const selectionCandidate = selectedCandidatesByPairId.get(draft.pairId);
    const intentGraphModalityComparison = compareIntentToGraphModalities(selection?.intent, selectionCandidate, graph);
    if (!graph) {
      problems.push({ id: "review-graph-missing", message: "Review candidate graph is missing.", evidencePath: draft.graphPath });
    }
    if (!trace) {
      problems.push({ id: "review-trace-missing", message: "Review candidate trace is missing.", evidencePath: draft.tracePath });
    }
    if (!draft.sourceEvidencePath || !existsSync(draft.sourceEvidencePath)) {
      problems.push({
        id: "review-source-evidence-missing",
        message: "Review candidate source evidence is missing.",
        evidencePath: draft.sourceEvidencePath || null,
        observed: { patchId: draft.patchId, pairId: draft.pairId }
      });
    }
    if (validationResult?.status !== "pass") {
      problems.push({
        id: "review-validation-not-passing",
        message: "Review candidate validation is not passing.",
        evidencePath: validationPath,
        observed: { patchId: draft.patchId, validationStatus: validationResult?.status || null }
      });
    }
    if (exportFields.length > 0) {
      problems.push({
        id: "review-export-field-present",
        message: "Review candidate contains export-looking fields.",
        evidencePath: draft.graphPath,
        observed: { patchId: draft.patchId, exportFields }
      });
    }
    if (!sourceGraphComparison.sourceSupportsGraphCore) {
      problems.push({
        id: "review-source-graph-family-mismatch",
        message: "Review candidate generated graph core is not supported by selected source modality evidence.",
        evidencePath: draft.sourceEvidencePath || null,
        observed: {
          patchId: draft.patchId,
          pairId: draft.pairId,
          sourceFamilies: sourceGraphComparison.sourceFamilies,
          graphFamilies: sourceGraphComparison.graphFamilies,
          missingSourceSupportFamilies: sourceGraphComparison.missingSourceSupportFamilies
        }
      });
    }
    if (!sourceGraphComparison.sourceSupportsGraphRoles) {
      problems.push({
        id: "review-source-graph-role-mismatch",
        message: "Review candidate generated graph roles are not supported by selected source module evidence.",
        evidencePath: draft.sourceEvidencePath || null,
        observed: {
          patchId: draft.patchId,
          pairId: draft.pairId,
          sourceRoles: sourceGraphComparison.sourceRoles,
          graphRoles: sourceGraphComparison.graphRoles,
          missingSourceSupportRoles: sourceGraphComparison.missingSourceSupportRoles
        }
      });
    }
    if (!traceGraphCoverage.traceCoversGraph) {
      problems.push({
        id: "review-trace-graph-coverage-incomplete",
        message: "Review candidate trace does not cover every generated graph module and connection.",
        evidencePath: draft.tracePath || null,
        observed: {
          patchId: draft.patchId,
          pairId: draft.pairId,
          missingModuleIds: traceGraphCoverage.missingModuleIds,
          missingConnectionIds: traceGraphCoverage.missingConnectionIds
        }
      });
    }
    if (!intentGraphModalityComparison.intentSupportsGraphModalities) {
      problems.push({
        id: "review-graph-modality-intent-mismatch",
        message: "Review candidate generated graph modalities are not supported by the human intent or matched selection evidence.",
        evidencePath: draft.graphPath || null,
        observed: {
          patchId: draft.patchId,
          pairId: draft.pairId,
          intentModalities: intentGraphModalityComparison.intentModalities,
          matchedModalities: intentGraphModalityComparison.matchedModalities,
          graphModalities: intentGraphModalityComparison.graphModalities,
          unsupportedGraphModalities: intentGraphModalityComparison.unsupportedGraphModalities
        }
      });
    }
    drafts.push({
      patchId: draft.patchId,
      pairId: draft.pairId,
      title: draft.title,
      sourceEvidencePath: draft.sourceEvidencePath,
      sourceEvidenceExists: Boolean(draft.sourceEvidencePath && existsSync(draft.sourceEvidencePath)),
      graphPath: draft.graphPath,
      tracePath: draft.tracePath,
      validationStatus: validationResult?.status || null,
      expectedModalities: graph?.expectedModalities || [],
      moduleCount: graph?.modules?.length ?? null,
      connectionCount: graph?.connections?.length ?? null,
      requirementCount: trace?.requirements?.length ?? null,
      exportFieldCount: exportFields.length,
      unresolvedAbstractionCount: unresolvedAbstractions.length,
      unresolvedAbstractions,
      traceGraphCoverage,
      sourceGraphComparison,
      intentGraphModalityComparison
    });
  }

  if (drafts.length < 1) {
    problems.push({
      id: "review-drafts-empty",
      message: "Generated-patch candidate review has no drafts to summarize.",
      evidencePath: workflow?.artifacts?.draftResultPath || null
    });
  }

  const result = {
    schemaVersion: "zoia.generated-patch-candidate-review-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      draftCount: drafts.length,
      passingDraftCount: drafts.filter((draft) => draft.validationStatus === "pass").length,
      exportFieldCount: drafts.reduce((sum, draft) => sum + draft.exportFieldCount, 0),
      unresolvedAbstractionCount: drafts.reduce((sum, draft) => sum + draft.unresolvedAbstractionCount, 0),
      sourceGraphFamilyMismatchCount: drafts
        .filter((draft) => !draft.sourceGraphComparison.sourceSupportsGraphCore)
        .length,
      sourceGraphRoleMismatchCount: drafts
        .filter((draft) => !draft.sourceGraphComparison.sourceSupportsGraphRoles)
        .length,
      traceGraphCoverageIncompleteCount: drafts
        .filter((draft) => !draft.traceGraphCoverage.traceCoversGraph)
        .length,
      intentGraphModalityMismatchCount: drafts
        .filter((draft) => !draft.intentGraphModalityComparison.intentSupportsGraphModalities)
        .length,
      problemCount: problems.length
    },
    drafts,
    problems,
    claimBoundary: "This review summary covers generated intermediate graph and requirement-trace drafts only. It records source-to-graph family and module-role comparison, intent-to-graph modality comparison, trace-to-graph coverage, and unresolved template-core abstractions. It does not claim binary export, full novel synthesis, hardware-realizable module graphs, or runtime audio behavior.",
    artifacts: {
      resultPath: RESULT_PATH,
      descriptionWorkflowPath: DESCRIPTION_WORKFLOW_PATH,
      validationPath,
      selectionPath
    }
  };

  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-candidate-review-result.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    generatedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    artifacts: {
      resultPath: RESULT_PATH
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
