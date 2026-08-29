#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-publication-protection-negative-controls");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const COMMAND_AUDIT_PATH = resolve(EVIDENCE_ROOT, "command-audit.json");
const SEED_MANIFEST_PATH = resolve(EVIDENCE_ROOT, "seeded-command-manifest.json");
const SEED_ROOT = resolve(EVIDENCE_ROOT, "seeded-commands");
const RELEASE_REVIEW_SUMMARY_PATH = resolve(PROJECT_ROOT, "tests/workflow/evidence/release-review-summary/run-result.json");
const PACKAGE_JSON_PATH = resolve(PROJECT_ROOT, "package.json");
const SCRIPT_ROOT = resolve(PROJECT_ROOT, "tests/workflow/scripts");
const JSON_SPACES = 2;

const PROTECTED_PATTERNS = Object.freeze([
  { surface: "git-push", pattern: /\bgit\s+push\b/iu },
  { surface: "git-tag", pattern: /\bgit\s+tag\b/iu },
  { surface: "git-remote-mutation", pattern: /\bgit\s+remote\s+(?:add|set-url|remove|rename)\b/iu },
  { surface: "github-release", pattern: /\bgh\s+release\b|\bgithub\s+release\b/iu },
  { surface: "github-publication", pattern: /\bgh\s+(?:repo|api|workflow|run)\b[\s\S]{0,120}\b(?:create|delete|edit|enable|disable|dispatch|rerun)\b/iu },
  { surface: "npm-publish", pattern: /\bnpm\s+publish\b/iu },
  { surface: "npm-version", pattern: /\bnpm\s+version\b/iu },
  { surface: "npm-dist-tag", pattern: /\bnpm\s+dist-tag\b/iu }
]);

const REQUIRED_RELEASE_REVIEW_SCRIPTS = Object.freeze([
  "zoia:release:review-summary",
  "zoia:release:review-summary:negative-controls",
  "zoia:release:review-summary:clean-consumer-smoke-negative-controls",
  "zoia:release:review-summary:doc-evidence-negative-controls",
  "zoia:release:review-summary:quality-negative-controls",
  "zoia:release:review-summary:overclaim-negative-controls",
  "zoia:release:review-summary:package-boundary-overclaim-negative-controls",
  "zoia:verify:v04",
  "zoia:verify:v04:negative-controls",
  "zoia:verify:v04:clean-consumer-smoke",
  "zoia:generate:patch:readiness",
  "zoia:generate:patch:claim-boundary"
]);

const SEEDS = Object.freeze([
  {
    id: "git-push-command",
    command: "git push origin main",
    expectedSurface: "git-push"
  },
  {
    id: "git-tag-command",
    command: "git tag v0.4.0",
    expectedSurface: "git-tag"
  },
  {
    id: "github-release-command",
    command: "gh release create v0.4.0 dist/zoia-emulator.tgz",
    expectedSurface: "github-release"
  },
  {
    id: "npm-publish-command",
    command: "npm publish --access public",
    expectedSurface: "npm-publish"
  },
  {
    id: "npm-version-command",
    command: "npm version 0.4.0",
    expectedSurface: "npm-version"
  },
  {
    id: "npm-dist-tag-command",
    command: "npm dist-tag add zoia-emulator@0.4.0 latest",
    expectedSurface: "npm-dist-tag"
  }
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function readText(path) {
  return readFile(path, "utf8");
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

function classifyCommand(command) {
  return PROTECTED_PATTERNS
    .filter((entry) => entry.pattern.test(command))
    .map((entry) => entry.surface);
}

function auditCommand(id, command, source) {
  const protectedSurfaces = classifyCommand(command);
  return {
    id,
    source,
    command,
    status: protectedSurfaces.length === 0 ? "pass" : "blocked",
    protectedSurfaces
  };
}

async function listWorkflowScripts() {
  const names = await readdir(SCRIPT_ROOT);
  return names
    .filter((name) => name.endsWith(".mjs"))
    .filter((name) => name !== "run-release-review-publication-protection-negative-controls.mjs")
    .map((name) => `tests/workflow/scripts/${name}`)
    .sort();
}

async function main() {
  await mkdir(SEED_ROOT, { recursive: true });
  const startedAt = nowIso();
  const problems = [];

  for (const requiredPath of [RELEASE_REVIEW_SUMMARY_PATH, PACKAGE_JSON_PATH]) {
    if (!existsSync(requiredPath)) {
      problems.push({
        id: "required-source-missing",
        path: requiredPath
      });
    }
  }

  const packageJson = existsSync(PACKAGE_JSON_PATH) ? await readJson(PACKAGE_JSON_PATH) : { scripts: {} };
  const releaseReview = existsSync(RELEASE_REVIEW_SUMMARY_PATH) ? await readJson(RELEASE_REVIEW_SUMMARY_PATH) : {};
  const workflowScriptPaths = existsSync(SCRIPT_ROOT) ? await listWorkflowScripts() : [];
  const packageScripts = packageJson.scripts || {};
  const missingScriptNames = REQUIRED_RELEASE_REVIEW_SCRIPTS.filter((name) => !packageScripts[name]);

  if (missingScriptNames.length > 0) {
    problems.push({
      id: "required-release-review-script-missing",
      missingScriptNames
    });
  }

  const actualCommandAudit = [];
  for (const scriptName of REQUIRED_RELEASE_REVIEW_SCRIPTS) {
    if (packageScripts[scriptName]) {
      actualCommandAudit.push(auditCommand(scriptName, packageScripts[scriptName], "package.json scripts"));
    }
  }
  for (const command of releaseReview.validationCommands || []) {
    actualCommandAudit.push(auditCommand(command, command, "release-review validationCommands"));
  }

  const protectedActualCommands = actualCommandAudit.filter((entry) => entry.status === "blocked");
  if (protectedActualCommands.length > 0) {
    problems.push({
      id: "protected-command-in-release-review-workflow",
      protectedActualCommands
    });
  }

  const scriptTextFindings = [];
  for (const relativePath of workflowScriptPaths) {
    const fullPath = resolve(PROJECT_ROOT, relativePath);
    const text = await readText(fullPath);
    const protectedSurfaces = classifyCommand(text);
    if (protectedSurfaces.length > 0) {
      scriptTextFindings.push({
        path: relativePath,
        protectedSurfaces
      });
    }
  }
  if (scriptTextFindings.length > 0) {
    problems.push({
      id: "protected-command-text-in-workflow-script",
      scriptTextFindings
    });
  }

  const protectedBoundaryPresent = (releaseReview.protectedActionBlockers || [])
    .some((blocker) => blocker.status === "blocked-unless-exact-human-passcode-is-provided");
  const sourceControlSideEffectsFalse = releaseReview.git?.sourceControlSideEffectsPerformed === false;
  if (!protectedBoundaryPresent || !sourceControlSideEffectsFalse) {
    problems.push({
      id: "release-review-protected-boundary-missing",
      observed: {
        protectedBoundaryPresent,
        sourceControlSideEffectsPerformed: releaseReview.git?.sourceControlSideEffectsPerformed ?? null
      }
    });
  }

  const seedClassifications = [];
  for (const seed of SEEDS) {
    const seedPath = resolve(SEED_ROOT, `${seed.id}.json`);
    const protectedSurfaces = classifyCommand(seed.command);
    const expectedFailureFound = protectedSurfaces.includes(seed.expectedSurface);
    const status = expectedFailureFound ? "pass" : "fail";
    await writeJson(seedPath, {
      id: seed.id,
      command: seed.command,
      expectedSurface: seed.expectedSurface,
      negativeControl: true
    });
    if (status !== "pass") {
      problems.push({
        id: "seeded-protected-command-not-detected",
        seedId: seed.id,
        expectedSurface: seed.expectedSurface,
        observedSurfaces: protectedSurfaces
      });
    }
    seedClassifications.push({
      id: seed.id,
      status,
      command: seed.command,
      expectedSurface: seed.expectedSurface,
      observedSurfaces: protectedSurfaces,
      expectedFailureFound,
      seedPath
    });
  }

  await writeJson(COMMAND_AUDIT_PATH, {
    schemaVersion: "zoia.release-review-publication-protection-command-audit.v1",
    generatedAt: nowIso(),
    actualCommandCount: actualCommandAudit.length,
    protectedActualCommandCount: protectedActualCommands.length,
    scriptTextFindingCount: scriptTextFindings.length,
    actualCommandAudit,
    scriptTextFindings
  });
  await writeJson(SEED_MANIFEST_PATH, {
    schemaVersion: "zoia.release-review-publication-protection-seed-manifest.v1",
    generatedAt: nowIso(),
    seedCount: SEEDS.length,
    seeds: seedClassifications.map((item) => ({
      id: item.id,
      command: item.command,
      expectedSurface: item.expectedSurface,
      seedPath: item.seedPath
    }))
  });

  const result = {
    schemaVersion: "zoia.release-review-publication-protection-negative-controls-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "fail",
    startedAt,
    completedAt: nowIso(),
    summary: {
      problemCount: problems.length,
      actualCommandCount: actualCommandAudit.length,
      protectedActualCommandCount: protectedActualCommands.length,
      scriptTextFindingCount: scriptTextFindings.length,
      requiredScriptCount: REQUIRED_RELEASE_REVIEW_SCRIPTS.length,
      missingRequiredScriptCount: missingScriptNames.length,
      seededControlCount: SEEDS.length,
      passingSeededControlCount: seedClassifications.filter((item) => item.status === "pass").length,
      expectedFailureFoundCount: seedClassifications.filter((item) => item.expectedFailureFound).length,
      protectedBoundaryPresent,
      sourceControlSideEffectsPerformed: releaseReview.git?.sourceControlSideEffectsPerformed ?? null
    },
    actualCommandAudit,
    seedClassifications,
    problems,
    claimBoundary: "This gate scans release-review and v0.4 local workflows for protected Git, GitHub, tag, release, and npm publication commands. It proves seeded protected commands are detected and that current local validation commands do not invoke those actions.",
    artifacts: {
      resultPath: RESULT_PATH,
      commandAuditPath: COMMAND_AUDIT_PATH,
      seedManifestPath: SEED_MANIFEST_PATH,
      seedRoot: SEED_ROOT
    }
  };
  await writeJson(RESULT_PATH, result);
  console.log(JSON.stringify({
    status: result.status,
    problemCount: result.summary.problemCount,
    actualCommandCount: result.summary.actualCommandCount,
    protectedActualCommandCount: result.summary.protectedActualCommandCount,
    seededControlCount: result.summary.seededControlCount,
    passingSeededControlCount: result.summary.passingSeededControlCount,
    resultPath: RESULT_PATH
  }, null, JSON_SPACES));
  if (result.status !== "pass") process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
