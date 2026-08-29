import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const JSON_SPACES = 2;
const PROJECT_ROOT = resolve(new URL("../../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DEFAULT_RESULT_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/repository-hygiene/run-result.json");

const PROHIBITED_TRACKED_PATHS = [
  {
    id: "workflow-evidence-root",
    pattern: /^tests\/workflow\/evidence\//,
    reason: "workflow evidence is generated locally",
  },
  {
    id: "playwright-evidence-root",
    pattern: /^tests\/workflow\/playwright\/evidence\//,
    reason: "Playwright evidence is generated locally",
  },
  {
    id: "workflow-logs-root",
    pattern: /^tests\/workflow\/logs\//,
    reason: "workflow logs are generated locally",
  },
  {
    id: "generated-patch-from-selection-output",
    pattern: /^tests\/workflow\/generated-patches\/from-selection\//,
    reason: "from-selection generated-patch drafts regenerate under workflow evidence",
  },
  {
    id: "generated-patch-from-description-output",
    pattern: /^tests\/workflow\/generated-patches\/from-description\//,
    reason: "from-description generated-patch drafts regenerate under workflow evidence",
  },
  {
    id: "generated-patch-manual-test-output",
    pattern: /^tests\/workflow\/generated-patches\/manual-test\//,
    reason: "manual generated-patch graph outputs regenerate under workflow evidence",
  },
  {
    id: "generated-patch-prompt-smoke-output",
    pattern: /^tests\/workflow\/generated-patches\/prompt-smoke\//,
    reason: "prompt-smoke generated-patch drafts regenerate under workflow evidence",
  },
  {
    id: "generated-patch-negative-description-output",
    pattern: /^tests\/workflow\/generated-patches\/negative-description\//,
    reason: "negative-description generated-patch drafts regenerate under workflow evidence",
  },
  {
    id: "demo-copied-artifacts",
    pattern: /^July24_2026_Demo\/artifacts\//,
    reason: "demo artifacts are copied/generated local outputs",
  },
  {
    id: "demo-manifest-output",
    pattern: /^July24_2026_Demo\/DEMO_MANIFEST\.json$/,
    reason: "demo manifest is written by the demo verifier",
  },
  {
    id: "demo-verification-output",
    pattern: /^July24_2026_Demo\/verification-result\.json$/,
    reason: "demo verification result is written by the demo verifier",
  },
  {
    id: "demo-run-result-json",
    pattern: /^July24_2026_Demo\/.*\/run-result\.json$/,
    reason: "demo run results are machine-specific evidence outputs",
  },
  {
    id: "demo-classification-log-json",
    pattern: /^July24_2026_Demo\/.*\/classification-log\.json$/,
    reason: "classification logs are generated evidence outputs",
  },
  {
    id: "demo-stimulus-manifest-json",
    pattern: /^July24_2026_Demo\/.*\/stimulus-manifest\.json$/,
    reason: "stimulus manifests are generated evidence outputs",
  },
  {
    id: "demo-generated-audio",
    pattern: /^July24_2026_Demo\/.*\.wav$/,
    reason: "demo WAV captures and traces are generated evidence outputs",
  },
];

function parseArgs(argv) {
  let resultPath = DEFAULT_RESULT_PATH;
  let seedProhibitedPath = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--result-path") {
      resultPath = resolve(PROJECT_ROOT, argv[index + 1] || "");
      index += 1;
    } else if (arg === "--seed-prohibited-path") {
      seedProhibitedPath = argv[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { resultPath, seedProhibitedPath };
}

function runGitLsFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.split("\0").filter(Boolean).map((entry) => entry.replaceAll("\\", "/"));
}

function classifyPath(path) {
  return PROHIBITED_TRACKED_PATHS.find((rule) => rule.pattern.test(path)) || null;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function main() {
  const { resultPath, seedProhibitedPath } = parseArgs(process.argv.slice(2));
  const trackedPaths = runGitLsFiles();
  const pathsToCheck = seedProhibitedPath ? [...trackedPaths, seedProhibitedPath.replaceAll("\\", "/")] : trackedPaths;
  const prohibitedTrackedPaths = pathsToCheck
    .map((path) => ({ path, rule: classifyPath(path) }))
    .filter((entry) => entry.rule)
    .map((entry) => ({
      path: entry.path,
      ruleId: entry.rule.id,
      reason: entry.rule.reason,
    }));
  const payload = {
    status: prohibitedTrackedPaths.length === 0 ? "pass" : "fail",
    checkedTrackedPathCount: trackedPaths.length,
    prohibitedTrackedPathCount: prohibitedTrackedPaths.length,
    seedProhibitedPath,
    prohibitedTrackedPaths,
  };
  await writeJson(resultPath, payload);
  console.log(resultPath);
  if (payload.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const resultPathArgIndex = process.argv.indexOf("--result-path");
  const resultPath =
    resultPathArgIndex >= 0 ? resolve(PROJECT_ROOT, process.argv[resultPathArgIndex + 1] || "") : DEFAULT_RESULT_PATH;
  await writeJson(resultPath, {
    status: "fail",
    error: error?.message || String(error),
  });
  console.error(error);
  process.exitCode = 1;
});
