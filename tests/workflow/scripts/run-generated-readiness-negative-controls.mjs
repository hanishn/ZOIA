#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-readiness-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const SOURCE_PROVENANCE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-draft-provenance/run-result.json");
const SOURCE_PROMPT_SMOKE_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json");
const SOURCE_DESCRIPTION_WORKFLOW_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-from-description/run-result.json");
const SOURCE_RUNTIME_AUDIO_NEGATIVE_CONTROLS_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json");
const JSON_SPACES = 2;

const CASES = Object.freeze([
  {
    id: "degraded-provenance",
    overrideEnv: "ZOIA_GENERATED_PATCH_PROVENANCE_PATH",
    sourcePath: SOURCE_PROVENANCE_PATH,
    degradedPath: resolve(EVIDENCE_ROOT, "degraded-provenance.json"),
    blockedReadinessPath: resolve(EVIDENCE_ROOT, "blocked-readiness-provenance.json"),
    expectedBlocker: "generated-draft-provenance-not-ready",
    degrade(value) {
      return {
        ...value,
        status: "fail",
        generatedAt: nowIso(),
        summary: {
          ...(value.summary || {}),
          problemCount: 1,
          passingDraftCount: 0,
          failingDraftCount: value.summary?.draftCount || 1
        },
        problems: [
          {
            id: "negative-control-provenance-degraded",
            message: "Negative control degraded generated draft provenance evidence.",
            evidencePath: this.degradedPath
          }
        ],
        negativeControl: true
      };
    }
  },
  {
    id: "degraded-prompt-smoke",
    overrideEnv: "ZOIA_GENERATED_PATCH_PROMPT_SMOKE_PATH",
    sourcePath: SOURCE_PROMPT_SMOKE_PATH,
    degradedPath: resolve(EVIDENCE_ROOT, "degraded-prompt-smoke.json"),
    blockedReadinessPath: resolve(EVIDENCE_ROOT, "blocked-readiness-prompt-smoke.json"),
    expectedBlocker: "generated-prompt-smoke-not-ready",
    degrade(value) {
      return {
        ...value,
        status: "fail",
        generatedAt: nowIso(),
        summary: {
          ...(value.summary || {}),
          problemCount: 1,
          passingPromptCount: 0,
          failingPromptCount: value.summary?.promptCount || 1
        },
        problems: [
          {
            id: "negative-control-prompt-smoke-degraded",
            message: "Negative control degraded generated patch prompt-smoke evidence.",
            evidencePath: this.degradedPath
          }
        ],
        negativeControl: true
      };
    }
  },
  {
    id: "missing-prompt-smoke-concrete-core-evidence",
    overrideEnv: "ZOIA_GENERATED_PATCH_PROMPT_SMOKE_PATH",
    sourcePath: SOURCE_PROMPT_SMOKE_PATH,
    degradedPath: resolve(EVIDENCE_ROOT, "missing-prompt-smoke-concrete-core-evidence.json"),
    blockedReadinessPath: resolve(EVIDENCE_ROOT, "blocked-readiness-prompt-smoke-concrete-core.json"),
    expectedBlocker: "generated-prompt-smoke-not-ready",
    degrade(value) {
      const summary = { ...(value.summary || {}) };
      delete summary.requiredCorePromptCount;
      delete summary.concreteCoreTypeCount;
      delete summary.unresolvedAbstractionCount;
      return {
        ...value,
        status: "pass",
        generatedAt: nowIso(),
        summary,
        problems: [],
        negativeControl: true,
        negativeControlReason: "Concrete-core prompt-smoke summary fields removed while preserving pass status."
      };
    }
  },
  {
    id: "degraded-description-workflow",
    overrideEnv: "ZOIA_GENERATED_PATCH_FROM_DESCRIPTION_PATH",
    sourcePath: SOURCE_DESCRIPTION_WORKFLOW_PATH,
    degradedPath: resolve(EVIDENCE_ROOT, "degraded-description-workflow.json"),
    blockedReadinessPath: resolve(EVIDENCE_ROOT, "blocked-readiness-description-workflow.json"),
    expectedBlocker: "generated-description-workflow-not-ready",
    degrade(value) {
      return {
        ...value,
        status: "blocked",
        completedAt: nowIso(),
        summary: {
          ...(value.summary || {}),
          blockerCount: 1,
          validatedDraftCount: 0
        },
        blockers: [
          {
            id: "negative-control-description-workflow-degraded",
            message: "Negative control degraded generated patch description workflow evidence.",
            evidencePath: this.degradedPath
          }
        ],
        negativeControl: true
      };
    }
  },
  {
    id: "degraded-runtime-audio-negative-controls",
    overrideEnv: "ZOIA_GENERATED_PATCH_RUNTIME_NEGATIVE_CONTROLS_PATH",
    sourcePath: SOURCE_RUNTIME_AUDIO_NEGATIVE_CONTROLS_PATH,
    degradedPath: resolve(EVIDENCE_ROOT, "degraded-runtime-audio-negative-controls.json"),
    blockedReadinessPath: resolve(EVIDENCE_ROOT, "blocked-readiness-runtime-audio-negative-controls.json"),
    expectedBlocker: "generated-runtime-audio-negative-controls-not-ready",
    degrade(value) {
      return {
        ...value,
        status: "fail",
        completedAt: nowIso(),
        summary: {
          ...(value.summary || {}),
          blockerCount: 1,
          passingControlCount: 4,
          expectedFailureFoundCount: 4
        },
        assertionFailures: [
          {
            surface: "negative-control",
            message: "Negative control degraded runtime-audio negative-control evidence.",
            evidencePath: this.degradedPath
          }
        ],
        negativeControl: true
      };
    }
  }
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function relativeToProject(path) {
  return resolve(path).slice(PROJECT_ROOT.length + 1);
}

function runReadiness(testCase) {
  return spawnSync(process.execPath, ["tests/workflow/scripts/generate-patch-generation-readiness-rollup.mjs"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      [testCase.overrideEnv]: relativeToProject(testCase.degradedPath),
      ZOIA_GENERATED_PATCH_READINESS_RESULT_PATH: relativeToProject(testCase.blockedReadinessPath)
    }
  });
}

async function runCase(testCase) {
  if (!existsSync(testCase.sourcePath)) {
    return {
      id: testCase.id,
      status: "fail",
      problems: [{
        id: "source-evidence-missing",
        message: "Source evidence for negative control is missing.",
        evidencePath: testCase.sourcePath
      }]
    };
  }
  const source = await readJson(testCase.sourcePath);
  await writeJson(testCase.degradedPath, testCase.degrade(source));
  const command = runReadiness(testCase);
  const blockedReadiness = existsSync(testCase.blockedReadinessPath) ? await readJson(testCase.blockedReadinessPath) : null;
  const expectedBlockerFound = Boolean((blockedReadiness?.blockers || []).find((blocker) => blocker.id === testCase.expectedBlocker));
  const problems = [];
  if (command.status === 0) {
    problems.push({
      id: "negative-control-command-passed",
      message: "Generated-patch readiness passed with degraded evidence."
    });
  }
  if (!blockedReadiness) {
    problems.push({
      id: "blocked-readiness-result-missing",
      message: "Blocked generated-patch readiness evidence was not written.",
      evidencePath: testCase.blockedReadinessPath
    });
  } else {
    if (blockedReadiness.status !== "blocked") {
      problems.push({
        id: "blocked-readiness-status-invalid",
        message: "Generated-patch readiness did not block with degraded evidence.",
        evidencePath: testCase.blockedReadinessPath,
        observed: { status: blockedReadiness.status }
      });
    }
    if (!expectedBlockerFound) {
      problems.push({
        id: "expected-blocker-missing",
        message: "Generated-patch readiness did not report the expected blocker.",
        evidencePath: testCase.blockedReadinessPath,
        observed: {
          expectedBlocker: testCase.expectedBlocker,
          blockers: blockedReadiness.blockers || []
        }
      });
    }
  }
  return {
    id: testCase.id,
    status: problems.length === 0 ? "pass" : "fail",
    expectedBlocker: testCase.expectedBlocker,
    commandExitCode: command.status,
    blockedReadinessStatus: blockedReadiness?.status || null,
    expectedBlockerFound,
    degradedPath: testCase.degradedPath,
    blockedReadinessPath: testCase.blockedReadinessPath,
    problems
  };
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const cases = [];
  for (const testCase of CASES) {
    cases.push(await runCase(testCase));
  }
  const problems = cases.flatMap((testCase) => testCase.problems.map((problem) => ({
    ...problem,
    caseId: testCase.id
  })));
  const result = {
    schemaVersion: "zoia.generated-patch-readiness-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    generatedAt: nowIso(),
    summary: {
      caseCount: cases.length,
      passingCaseCount: cases.filter((testCase) => testCase.status === "pass").length,
      failingCaseCount: cases.filter((testCase) => testCase.status !== "pass").length,
      problemCount: problems.length
    },
    cases,
    problems,
    claimBoundary: "This negative-control gate verifies generated-patch readiness blocks when provenance, prompt-smoke, or description-workflow evidence is degraded. It does not modify canonical generated-patch readiness evidence.",
    artifacts: {
      resultPath: RESULT_PATH
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
  const result = {
    schemaVersion: "zoia.generated-patch-readiness-negative-controls-result.v1",
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
  await writeJson(RESULT_PATH, result);
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
