#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-draft-provenance");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const DRAFT_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-drafts/run-result.json");
const SELECTION_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-selection/run-result.json");
const JSON_SPACES = 2;

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function addProblem(problems, id, message, evidencePath, observed = null) {
  problems.push({ id, message, evidencePath, observed });
}

function normalize(path) {
  return path ? resolve(path).toLowerCase() : "";
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const problems = [];
  if (!existsSync(DRAFT_RESULT_PATH)) {
    addProblem(problems, "missing-draft-result", "Generated draft result is missing.", DRAFT_RESULT_PATH);
  }
  if (!existsSync(SELECTION_RESULT_PATH)) {
    addProblem(problems, "missing-selection-result", "Generated selection result is missing.", SELECTION_RESULT_PATH);
  }

  const draftResult = existsSync(DRAFT_RESULT_PATH) ? await readJson(DRAFT_RESULT_PATH) : null;
  const selectionResult = existsSync(SELECTION_RESULT_PATH) ? await readJson(SELECTION_RESULT_PATH) : null;
  const selectionByPairId = new Map((selectionResult?.candidates || []).map((candidate) => [candidate.pairId, candidate]));
  const draftChecks = [];

  if (draftResult) {
    if (draftResult.status !== "pass") {
      addProblem(problems, "draft-result-not-pass", "Generated draft result must be pass.", DRAFT_RESULT_PATH, { status: draftResult.status });
    }
    if (draftResult.inputs?.selectionResultPath && normalize(draftResult.inputs.selectionResultPath) !== normalize(SELECTION_RESULT_PATH)) {
      addProblem(problems, "draft-selection-path-mismatch", "Draft result points to a different selection result.", DRAFT_RESULT_PATH, {
        expected: SELECTION_RESULT_PATH,
        observed: draftResult.inputs.selectionResultPath
      });
    }
  }

  for (const draft of draftResult?.drafts || []) {
    const check = {
      pairId: draft.pairId,
      patchId: draft.patchId,
      graphPath: draft.graphPath,
      tracePath: draft.tracePath,
      status: "pass",
      problems: []
    };
    const candidate = selectionByPairId.get(draft.pairId);
    if (!candidate) {
      check.status = "fail";
      check.problems.push("selection-candidate-missing");
      addProblem(problems, "selection-candidate-missing", "Draft pairId is not present in selection candidates.", DRAFT_RESULT_PATH, { pairId: draft.pairId });
    } else {
      const expectedEvidence = candidate.evidence?.q106EvidencePath || candidate.evidence?.rollupEvidencePath || null;
      if (normalize(expectedEvidence) !== normalize(draft.sourceEvidencePath)) {
        check.status = "fail";
        check.problems.push("source-evidence-mismatch");
        addProblem(problems, "source-evidence-mismatch", "Draft source evidence path does not match selected candidate evidence.", DRAFT_RESULT_PATH, {
          pairId: draft.pairId,
          expected: expectedEvidence,
          observed: draft.sourceEvidencePath
        });
      }
      if (candidate.verificationKind !== "measured-signal") {
        check.status = "fail";
        check.problems.push("source-candidate-not-measured");
        addProblem(problems, "source-candidate-not-measured", "Draft source candidate is not measured-signal.", SELECTION_RESULT_PATH, {
          pairId: draft.pairId,
          verificationKind: candidate.verificationKind
        });
      }
    }

    if (!existsSync(draft.graphPath)) {
      check.status = "fail";
      check.problems.push("graph-missing");
      addProblem(problems, "draft-graph-missing", "Draft graph file is missing.", draft.graphPath, { pairId: draft.pairId });
    }
    if (!existsSync(draft.tracePath)) {
      check.status = "fail";
      check.problems.push("trace-missing");
      addProblem(problems, "draft-trace-missing", "Draft trace file is missing.", draft.tracePath, { pairId: draft.pairId });
    }

    const graph = existsSync(draft.graphPath) ? await readJson(draft.graphPath) : null;
    const trace = existsSync(draft.tracePath) ? await readJson(draft.tracePath) : null;
    if (graph) {
      if (graph.patchId !== draft.patchId) {
        check.status = "fail";
        check.problems.push("graph-patch-id-mismatch");
        addProblem(problems, "graph-patch-id-mismatch", "Graph patchId does not match draft record.", draft.graphPath, {
          pairId: draft.pairId,
          expected: draft.patchId,
          observed: graph.patchId
        });
      }
      if (!String(graph.description || "").includes(draft.pairId)) {
        check.status = "fail";
        check.problems.push("graph-description-missing-pair-id");
        addProblem(problems, "graph-description-missing-pair-id", "Graph description does not include source pairId.", draft.graphPath, {
          pairId: draft.pairId,
          description: graph.description || null
        });
      }
    }
    if (trace) {
      if (trace.patchId !== draft.patchId) {
        check.status = "fail";
        check.problems.push("trace-patch-id-mismatch");
        addProblem(problems, "trace-patch-id-mismatch", "Trace patchId does not match draft record.", draft.tracePath, {
          pairId: draft.pairId,
          expected: draft.patchId,
          observed: trace.patchId
        });
      }
      const provenanceRequirement = (trace.requirements || []).find((requirement) => requirement.id === "req-template-provenance");
      if (!provenanceRequirement) {
        check.status = "fail";
        check.problems.push("trace-provenance-requirement-missing");
        addProblem(problems, "trace-provenance-requirement-missing", "Trace is missing req-template-provenance.", draft.tracePath, { pairId: draft.pairId });
      } else {
        const evidenceText = provenanceRequirement.verification?.expectedEvidence || "";
        if (!evidenceText.includes(draft.sourceEvidencePath)) {
          check.status = "fail";
          check.problems.push("trace-evidence-path-mismatch");
          addProblem(problems, "trace-evidence-path-mismatch", "Trace provenance requirement does not include source evidence path.", draft.tracePath, {
            pairId: draft.pairId,
            expected: draft.sourceEvidencePath,
            observed: evidenceText
          });
        }
        if (!String(provenanceRequirement.sourceText || "").includes(draft.pairId)) {
          check.status = "fail";
          check.problems.push("trace-source-text-missing-pair-id");
          addProblem(problems, "trace-source-text-missing-pair-id", "Trace provenance sourceText does not include pairId.", draft.tracePath, {
            pairId: draft.pairId,
            sourceText: provenanceRequirement.sourceText || null
          });
        }
      }
    }
    draftChecks.push(check);
  }

  const result = {
    schemaVersion: "zoia.generated-patch-draft-provenance-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    inputs: {
      draftResultPath: DRAFT_RESULT_PATH,
      selectionResultPath: SELECTION_RESULT_PATH
    },
    summary: {
      problemCount: problems.length,
      draftCount: draftChecks.length,
      passingDraftCount: draftChecks.filter((item) => item.status === "pass").length,
      failingDraftCount: draftChecks.filter((item) => item.status !== "pass").length
    },
    draftChecks,
    problems,
    claimBoundary: "This gate only verifies provenance consistency from measured selected candidates into generated graph and trace drafts. It does not claim export or runtime generated-patch behavior.",
    artifacts: {
      resultPath: RESULT_PATH
    }
  };
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.generated-patch-draft-provenance-result.v1",
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
  };
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
