import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { writeFile } from "node:fs/promises";

const SOURCE_REPO_ROOT = resolve(import.meta.dirname, "..");
const VALIDATION_ROOT = resolve(SOURCE_REPO_ROOT, "RepositoryValidation");
const PUSH_CANDIDATE_ROOT = resolve(VALIDATION_ROOT, "push-candidate");
const PULL_CANDIDATE_ROOT = resolve(VALIDATION_ROOT, "pull-candidate");
const RESULT_PATH = resolve(VALIDATION_ROOT, "repository-staging-result.json");
const JSON_SPACES = 2;
const NPM_COMMAND = "npm";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: SOURCE_REPO_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function listPushCandidateFiles() {
  return runGit(["ls-files", "-co", "--exclude-standard"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((relativePath) => !relativePath.startsWith("RepositoryValidation/"));
}

function copyFiles(relativePaths, targetRoot) {
  rmSync(targetRoot, { recursive: true, force: true });
  mkdirSync(targetRoot, { recursive: true });
  for (const relativePath of relativePaths) {
    const sourcePath = resolve(SOURCE_REPO_ROOT, relativePath);
    const targetPath = resolve(targetRoot, relativePath);
    if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) continue;
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}

function runPulledValidation() {
  const file = process.platform === "win32" ? "cmd.exe" : NPM_COMMAND;
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `${NPM_COMMAND} run zoia:validate:pulled`]
      : ["run", "zoia:validate:pulled"];
  const result = spawnSync(file, args, {
    cwd: PULL_CANDIDATE_ROOT,
    encoding: "utf8",
    timeout: 2400000,
  });
  return {
    command: "npm run zoia:validate:pulled",
    cwd: PULL_CANDIDATE_ROOT,
    status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status,
    stdoutTail: (result.stdout ?? "").slice(-4000),
    stderrTail: (result.stderr ?? "").slice(-4000),
    error: result.error?.message ?? null,
  };
}

const startedAt = new Date();
mkdirSync(VALIDATION_ROOT, { recursive: true });

const files = listPushCandidateFiles();
copyFiles(files, PUSH_CANDIDATE_ROOT);
copyFiles(files, PULL_CANDIDATE_ROOT);

const validation = runPulledValidation();
const result = {
  schemaVersion: "zoia.repository-staging-validation.v1",
  status: validation.status,
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
  sourceRepositoryRoot: SOURCE_REPO_ROOT,
  validationRoot: VALIDATION_ROOT,
  pushCandidateRoot: PUSH_CANDIDATE_ROOT,
  pullCandidateRoot: PULL_CANDIDATE_ROOT,
  stagedFileCount: files.length,
  pushCandidateDescription: "Files that would be pushed to GitHub from the current source working tree, excluding gitignored data.",
  pullCandidateDescription: "Clone simulation of what a user would pull from GitHub, validated by running scripts from this directory.",
  pulledValidation: validation,
  pulledValidationResultPath: join(PULL_CANDIDATE_ROOT, "repository-validation-result.json"),
};

await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
console.log(RESULT_PATH);

if (result.status !== "pass") {
  process.exitCode = 1;
}
