#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/generated-patch-emulator-conversion-negative-controls");
const FIXTURE_ROOT = resolve(EVIDENCE_ROOT, "fixtures");
const OUTPUT_ROOT = resolve(EVIDENCE_ROOT, "converted-output");
const BLOCKED_RESULT_PATH = resolve(EVIDENCE_ROOT, "blocked-unsupported-module.json");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;

function nowIso() {
  return new Date().toISOString();
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
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

function hasBlocker(result, blockerId) {
  return Array.isArray(result.blockers) && result.blockers.some((blocker) => blocker.id === blockerId);
}

async function main() {
  const startedAt = nowIso();
  await rm(FIXTURE_ROOT, { recursive: true, force: true });
  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(FIXTURE_ROOT, { recursive: true });

  const invalidGraphPath = resolve(FIXTURE_ROOT, "invalid-unsupported-module.graph.json");
  await writeJson(invalidGraphPath, {
    schemaVersion: "zoia.generated-patch-graph.v1",
    patchId: "negative-unsupported-module",
    name: "Invalid Unsupported Module",
    description: "Negative control: converter must reject unsupported generated module types.",
    expectedModalities: ["audio"],
    modules: [
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
        id: "unsupported-core-1",
        type: "Unsupported Generated Core",
        domain: "audio",
        page: 0,
        grid: 1,
        params: {},
        inputs: ["audio"],
        outputs: ["audio"]
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
    ],
    connections: [
      {
        id: "conn-invalid-in",
        from: { moduleId: "audio-in-1", port: "audio" },
        to: { moduleId: "unsupported-core-1", port: "audio" },
        gain: 1
      },
      {
        id: "conn-invalid-out",
        from: { moduleId: "unsupported-core-1", port: "audio" },
        to: { moduleId: "audio-out-1", port: "audio" },
        gain: 1
      }
    ]
  });

  const command = runNodeScript("tests/workflow/scripts/convert-generated-graph-to-emulator-patch.mjs", [
    "--graph-root",
    "tests/workflow/evidence/generated-patch-emulator-conversion-negative-controls/fixtures",
    "--output-root",
    "tests/workflow/evidence/generated-patch-emulator-conversion-negative-controls/converted-output",
    "--result-path",
    "tests/workflow/evidence/generated-patch-emulator-conversion-negative-controls/blocked-unsupported-module.json"
  ]);

  const blockedResult = await readJson(BLOCKED_RESULT_PATH);
  const problems = [];
  if (command.exitCode !== 1) {
    problems.push({
      id: "negative-control-command-exit-code-unexpected",
      message: "Unsupported generated module negative control must exit with code 1.",
      observedExitCode: command.exitCode
    });
  }
  if (blockedResult.status !== "blocked") {
    problems.push({
      id: "negative-control-status-unexpected",
      message: "Unsupported generated module negative control must produce blocked status.",
      observedStatus: blockedResult.status
    });
  }
  if (!hasBlocker(blockedResult, "unsupported-generated-module")) {
    problems.push({
      id: "expected-unsupported-module-blocker-missing",
      message: "Expected unsupported-generated-module blocker was not found.",
      observedBlockers: blockedResult.blockers || []
    });
  }
  if ((blockedResult.summary?.convertedPatchCount ?? 0) !== 0) {
    problems.push({
      id: "invalid-fixture-converted",
      message: "Invalid generated graph must not emit converted emulator patches.",
      observedConvertedPatchCount: blockedResult.summary?.convertedPatchCount
    });
  }

  const result = {
    schemaVersion: "zoia.generated-patch-emulator-conversion-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    startedAt,
    completedAt: nowIso(),
    summary: {
      caseCount: 1,
      passingCaseCount: problems.length === 0 ? 1 : 0,
      problemCount: problems.length,
      unsupportedModuleBlockerFound: hasBlocker(blockedResult, "unsupported-generated-module"),
      blockedCommandExitCode: command.exitCode,
      blockedStatus: blockedResult.status,
      convertedPatchCount: blockedResult.summary?.convertedPatchCount ?? null
    },
    cases: [
      {
        id: "unsupported-generated-module",
        fixturePath: invalidGraphPath,
        blockedResultPath: BLOCKED_RESULT_PATH,
        expectedCommandExitCode: 1,
        observedCommandExitCode: command.exitCode,
        expectedStatus: "blocked",
        observedStatus: blockedResult.status,
        expectedBlockerId: "unsupported-generated-module",
        expectedBlockerFound: hasBlocker(blockedResult, "unsupported-generated-module")
      }
    ],
    problems,
    command,
    claimBoundaries: {
      provesInvalidGraphRejectedBeforeEmulatorLoad: problems.length === 0,
      runtimeLoadClaim: false,
      runtimeAudioClaim: false,
      hardwareBinaryExportClaim: false
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
  await writeJson(RESULT_PATH, {
    schemaVersion: "zoia.generated-patch-emulator-conversion-negative-controls.v1",
    version: "0.4.0",
    revision: 1,
    status: "fail",
    completedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
