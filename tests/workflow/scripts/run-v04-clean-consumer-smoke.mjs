#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-clean-consumer-smoke");
const JSON_SPACES = 2;
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const NPM_EXEC_PATH = process.env.npm_execpath || null;
const REQUIRED_SOURCE_EVIDENCE = Object.freeze([
  "tests/workflow/evidence/generated-patch-readiness/run-result.json",
  "tests/workflow/evidence/release-review-summary/run-result.json",
  "tests/workflow/evidence/v0.4-readiness/run-result.json",
  "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json"
]);
const EVIDENCE_BUNDLE_PATHS = Object.freeze([
  "tests/workflow/evidence/q109-ci-gate-integration/run-result.json",
  "tests/workflow/evidence/q104-staged-patch-audio-all-baseline/run-result.json",
  "tests/workflow/evidence/v0.4-test-patch-stimulus/run-result.json",
  "tests/workflow/evidence/v0.3-trace-baseline/run-result.json",
  "tests/workflow/evidence/v0.3-trace-baseline/community-run-result.json",
  "tests/workflow/evidence/q106-community-patch-audio-classification-baseline/run-result.json",
  "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-playability-full-r1/run-result.json",
  "tests/workflow/evidence/v0.4-community-modality-rollup/run-result.json",
  "tests/workflow/evidence/generated-patch-readiness/run-result.json",
  "tests/workflow/evidence/generated-patch-selection/run-result.json",
  "tests/workflow/evidence/generated-patch-selector-scoring-regression/run-result.json",
  "tests/workflow/evidence/generated-patch-drafts/run-result.json",
  "tests/workflow/evidence/generated-patch-validation/run-result.json",
  "tests/workflow/evidence/generated-patch-trace-evidence-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-draft-provenance/run-result.json",
  "tests/workflow/evidence/generated-patch-prompt-smoke/run-result.json",
  "tests/workflow/evidence/generated-patch-from-description/run-result.json",
  "tests/workflow/evidence/generated-patch-from-description-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-export-boundary-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-candidate-review/run-result.json",
  "tests/workflow/evidence/generated-patch-candidate-review-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-runtime-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-readiness-negative-controls/run-result.json",
  "tests/workflow/evidence/generated-patch-draft-guard-negative/run-result.json",
  "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json",
  "tests/workflow/evidence/v0.4-readiness-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-freshness-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-clean-consumer-smoke-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-documented-evidence-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-summary-quality-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-overclaim-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json",
  "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json",
  "tests/workflow/evidence/v0.4-clean-consumer-smoke/run-result.json",
  "tests/workflow/evidence/release-review-summary/run-result.json",
  "tests/workflow/evidence/v0.4-readiness/run-result.json"
]);
const REQUIRED_INSTALLED_PATHS = Object.freeze([
  "package.json",
  "docs/PATCH_GENERATION.md",
  "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
  "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md",
  "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
  "tests/workflow/scripts/verify-patch-generation-claim-boundary.mjs",
  "tests/workflow/evidence/generated-patch-readiness/run-result.json",
  "tests/workflow/evidence/release-review-summary/run-result.json"
]);
const REQUIRED_PACKAGE_MANIFEST_PATHS = Object.freeze([
  "package.json",
  "docs/PATCH_GENERATION.md",
  "docs/TEXT_PROMPT_GENERATED_PATCH_CAPABILITY.md",
  "docs/TEXT_PROMPT_GENERATED_PATCH_TEST_MATRIX.md",
  "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
  "tests/workflow/scripts/verify-patch-generation-claim-boundary.mjs"
]);
const REQUIRED_PACKAGE_SCRIPTS = Object.freeze({
  "zoia:verify:v04": "tests/workflow/scripts/run-zoia-v04-readiness.mjs",
  "zoia:generate:patch:claim-boundary": "tests/workflow/scripts/verify-patch-generation-claim-boundary.mjs",
  "zoia:release:review-summary": "tests/workflow/scripts/generate-release-review-summary.mjs",
  "zoia:verify:v04:clean-consumer-smoke": "tests/workflow/scripts/run-v04-clean-consumer-smoke.mjs"
});

function nowIso() {
  return new Date().toISOString();
}

function timestampSlug(value = new Date()) {
  return value.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function readJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, JSON_SPACES)}\n`, "utf8");
}

async function sha256(path) {
  const text = await readFile(path);
  return createHash("sha256").update(text).digest("hex");
}

function relativeToInstalled(path, installedRoot) {
  return relative(installedRoot, path).replaceAll("\\", "/");
}

function packageManifestChecks(packResult) {
  const packedFiles = new Set((packResult?.files || [])
    .map((file) => file.path)
    .filter(Boolean));
  return REQUIRED_PACKAGE_MANIFEST_PATHS.map((path) => ({
    path,
    included: packedFiles.has(path)
  }));
}

function missingPackageManifestPaths(packResult) {
  return packageManifestChecks(packResult)
    .filter((check) => !check.included)
    .map((check) => check.path);
}

function packageScriptReferenceChecks(packageJson) {
  return Object.entries(REQUIRED_PACKAGE_SCRIPTS).map(([scriptName, requiredReference]) => {
    const scriptValue = packageJson?.scripts?.[scriptName] || "";
    return {
      scriptName,
      requiredReference,
      present: typeof scriptValue === "string" && scriptValue.includes(requiredReference),
      scriptValue
    };
  });
}

function copiedEvidenceOmissionControls(copiedEvidence) {
  return [
    {
      id: "copied-evidence-missing-generated-readiness",
      omittedPath: "tests/workflow/evidence/generated-patch-readiness/run-result.json"
    },
    {
      id: "copied-evidence-missing-release-review-summary",
      omittedPath: "tests/workflow/evidence/release-review-summary/run-result.json"
    },
    {
      id: "copied-evidence-missing-package-boundary-overclaim-controls",
      omittedPath: "tests/workflow/evidence/release-review-package-boundary-overclaim-negative-controls/run-result.json"
    },
    {
      id: "copied-evidence-missing-publication-protection-controls",
      omittedPath: "tests/workflow/evidence/release-review-publication-protection-negative-controls/run-result.json"
    }
  ].map((control) => {
    const missing = !copiedEvidence.some((item) => item.path === control.omittedPath && item.exists);
    const degradedMissing = !copiedEvidence
      .filter((item) => item.path !== control.omittedPath)
      .some((item) => item.path === control.omittedPath && item.exists);
    return {
      ...control,
      expectedSurface: "copied evidence bundle required path check reports omitted JSON evidence",
      status: !missing && degradedMissing ? "blocked" : "unexpected-pass"
    };
  });
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      ...env
    },
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    command: [command, ...args].join(" "),
    cwd,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    signal: result.signal,
    error: result.error ? {
      message: result.error.message,
      code: result.error.code
    } : null
  };
}

function runNpm(args, cwd, env = {}) {
  if (NPM_EXEC_PATH) return run(process.execPath, [NPM_EXEC_PATH, ...args], cwd, env);
  return run(NPM_COMMAND, args, cwd, env);
}

function normalizedPathText(path) {
  return resolve(path).toLowerCase().replaceAll("\\", "/");
}

function commandUsesSourceTree(commandResult, sourceRoot, installedRoot) {
  if (!commandResult) return {
    sourceTreeUsed: false,
    cwdUnderInstalledRoot: false,
    sourceRootInOutput: false,
    sourceRootInCommand: false
  };
  const normalizedSourceRoot = normalizedPathText(sourceRoot);
  const normalizedInstalledRoot = installedRoot ? normalizedPathText(installedRoot) : null;
  const normalizedCwd = commandResult.cwd ? normalizedPathText(commandResult.cwd) : "";
  const commandText = String(commandResult.command || "").toLowerCase().replaceAll("\\", "/");
  const stdoutText = String(commandResult.stdout || "").toLowerCase().replaceAll("\\", "/");
  const stderrText = String(commandResult.stderr || "").toLowerCase().replaceAll("\\", "/");
  const sourceRootInCommand = commandText.includes(normalizedSourceRoot);
  const sourceRootInOutput = stdoutText.includes(normalizedSourceRoot) || stderrText.includes(normalizedSourceRoot);
  const cwdUnderInstalledRoot = normalizedInstalledRoot ? normalizedCwd.startsWith(normalizedInstalledRoot) : false;
  return {
    sourceTreeUsed: sourceRootInCommand || sourceRootInOutput || !cwdUnderInstalledRoot,
    cwdUnderInstalledRoot,
    sourceRootInOutput,
    sourceRootInCommand
  };
}

async function copyEvidenceBundle(targetRoot) {
  const copied = [];
  for (const relativePath of EVIDENCE_BUNDLE_PATHS) {
    const sourcePath = resolve(PROJECT_ROOT, relativePath);
    const targetPath = resolve(targetRoot, relativePath);
    if (!existsSync(sourcePath)) {
      copied.push({
        path: relativePath,
        exists: false,
        sha256: null
      });
      continue;
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath);
    copied.push({
      path: relativePath,
      exists: true,
      sha256: await sha256(sourcePath)
    });
  }
  return copied;
}

async function prepareConsumer(runRoot) {
  const tempRoot = await mkdtemp(join(tmpdir(), "zoia-clean-consumer-smoke-"));
  const packageDir = join(tempRoot, "package-artifact");
  const consumerDir = join(tempRoot, "consumer");
  await mkdir(packageDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });
  await writeJson(join(consumerDir, "package.json"), {
    private: true,
    type: "module"
  });

  const packCommand = runNpm(["pack", "--json", "--pack-destination", packageDir], PROJECT_ROOT);
  let packResult = null;
  try {
    packResult = JSON.parse(packCommand.stdout)[0] || null;
  } catch {
    packResult = null;
  }
  const packagePath = packResult?.filename ? join(packageDir, packResult.filename) : null;
  if (!packagePath || !existsSync(packagePath)) {
    return {
      tempRoot,
      packageDir,
      consumerDir,
      packCommand,
      installCommand: null,
      installedRoot: null,
      packResult,
      packagePath
    };
  }

  const installCommand = runNpm(["install", packagePath, "--ignore-scripts", "--no-audit", "--no-fund"], consumerDir);
  const installedRoot = join(consumerDir, "node_modules", "zoia-emulator");
  const packageEvidencePath = join(runRoot, "package-artifact", packResult.filename);
  await mkdir(dirname(packageEvidencePath), { recursive: true });
  await cp(packagePath, packageEvidencePath);

  return {
    tempRoot,
    packageDir,
    consumerDir,
    packCommand,
    installCommand,
    installedRoot,
    packResult,
    packagePath: packageEvidencePath
  };
}

function assertPass(commandResult, label, problems) {
  if (commandResult.exitCode !== 0) {
    problems.push({
      id: `${label}-command-failed`,
      message: `${label} did not exit cleanly from the installed package.`,
      observed: {
        exitCode: commandResult.exitCode,
        stderr: commandResult.stderr,
        stdout: commandResult.stdout
      }
    });
  }
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const startedAt = nowIso();
  const runRoot = resolve(EVIDENCE_ROOT, `run-${timestampSlug()}`);
  await mkdir(runRoot, { recursive: true });

  const problems = [];
  const sourceEvidence = [];
  for (const relativePath of REQUIRED_SOURCE_EVIDENCE) {
    const absolutePath = resolve(PROJECT_ROOT, relativePath);
    const exists = existsSync(absolutePath);
    sourceEvidence.push({
      path: relativePath,
      exists,
      sha256: exists ? await sha256(absolutePath) : null
    });
    if (!exists) {
      problems.push({
        id: "required-source-evidence-missing",
        message: "Required source evidence is missing before package-boundary smoke can run.",
        evidencePath: absolutePath
      });
    }
  }

  const consumer = await prepareConsumer(runRoot);
  const commands = {
    pack: consumer.packCommand,
    install: consumer.installCommand,
    v04Readiness: null,
    claimBoundary: null,
    missingGeneratedPatchEvidence: null,
    staleReleaseReviewEvidence: null,
    missingInstalledReadinessScript: null,
    missingInstalledCapabilityDoc: null,
    releaseReviewSummaryRegenerationProbe: null
  };

  if (consumer.packCommand.exitCode !== 0 || !consumer.packResult) {
    problems.push({
      id: "local-package-pack-failed",
      message: "Local package artifact could not be created.",
      observed: consumer.packCommand
    });
  }
  const packageManifestPathChecks = packageManifestChecks(consumer.packResult);
  for (const check of packageManifestPathChecks) {
    if (!check.included) {
      problems.push({
        id: "package-manifest-required-path-missing",
        message: "The local package artifact manifest is missing a required clean-consumer path.",
        evidencePath: check.path,
        observed: check
      });
    }
  }
  const packageManifestNegativeControls = [
    {
      id: "manifest-missing-patch-generation-doc",
      omittedPath: "docs/PATCH_GENERATION.md"
    },
    {
      id: "manifest-missing-readiness-script",
      omittedPath: "tests/workflow/scripts/run-zoia-v04-readiness.mjs"
    }
  ].map((control) => {
    const degradedPackResult = {
      ...(consumer.packResult || {}),
      files: (consumer.packResult?.files || []).filter((file) => file.path !== control.omittedPath)
    };
    const missingPaths = missingPackageManifestPaths(degradedPackResult);
    return {
      ...control,
      expectedSurface: "package manifest required path check reports omitted file",
      status: missingPaths.includes(control.omittedPath) ? "blocked" : "unexpected-pass",
      missingPaths
    };
  });
  for (const control of packageManifestNegativeControls) {
    if (control.status !== "blocked") {
      problems.push({
        id: "package-manifest-negative-control-failed",
        message: "Package manifest negative control did not report the omitted required file.",
        observed: control
      });
    }
  }
  if (!consumer.installCommand || consumer.installCommand.exitCode !== 0 || !existsSync(consumer.installedRoot || "")) {
    problems.push({
      id: "local-package-install-failed",
      message: "Local package artifact could not be installed into the clean consumer directory.",
      observed: consumer.installCommand
    });
  }

  let copiedEvidence = [];
  let installedChecks = [];
  let installedPackageJson = null;
  let packageScriptChecks = [];
  let copiedEvidenceNegativeControls = [];
  let positiveV04 = null;
  let positiveClaimBoundary = null;
  let missingEvidenceNegative = null;
  let staleReleaseReviewNegative = null;
  let missingInstalledDocNegative = null;
  let releaseReviewProbe = null;

  if (consumer.installedRoot && existsSync(consumer.installedRoot)) {
    const installedPackageJsonPath = resolve(consumer.installedRoot, "package.json");
    installedPackageJson = existsSync(installedPackageJsonPath)
      ? await readJson(installedPackageJsonPath)
      : null;
    if (installedPackageJson?.name !== "zoia-emulator" || installedPackageJson?.version !== "0.4.0") {
      problems.push({
        id: "installed-package-metadata-invalid",
        message: "Installed package metadata does not identify the expected local ZOIA package.",
        observed: {
          name: installedPackageJson?.name ?? null,
          version: installedPackageJson?.version ?? null
        }
      });
    }
    packageScriptChecks = packageScriptReferenceChecks(installedPackageJson);
    for (const check of packageScriptChecks) {
      if (!check.present) {
        problems.push({
          id: "installed-package-script-reference-missing",
          message: "Installed package script does not reference the required clean-smoke workflow script.",
          observed: check
        });
      }
    }
    copiedEvidence = await copyEvidenceBundle(consumer.installedRoot);
    copiedEvidenceNegativeControls = copiedEvidenceOmissionControls(copiedEvidence);
    for (const control of copiedEvidenceNegativeControls) {
      if (control.status !== "blocked") {
        problems.push({
          id: "copied-evidence-negative-control-failed",
          message: "Copied evidence bundle negative control did not report the omitted required evidence JSON.",
          observed: control
        });
      }
    }
    for (const evidenceFile of copiedEvidence) {
      if (!evidenceFile.exists) {
        problems.push({
          id: "evidence-bundle-source-file-missing",
          message: "A required evidence bundle file is missing from the source tree.",
          evidencePath: resolve(PROJECT_ROOT, evidenceFile.path),
          observed: evidenceFile
        });
      }
    }
    for (const relativePath of REQUIRED_INSTALLED_PATHS) {
      const path = resolve(consumer.installedRoot, relativePath);
      installedChecks.push({
        path: relativePath,
        exists: existsSync(path)
      });
    }
    for (const check of installedChecks) {
      if (!check.exists) {
        problems.push({
          id: "installed-package-required-path-missing",
          message: "The installed local package is missing a required consumer-smoke path.",
          evidencePath: resolve(consumer.installedRoot, check.path),
          observed: check
        });
      }
    }

    const installedV04ResultPath = resolve(consumer.installedRoot, "tests/workflow/evidence/v0.4-readiness/run-result.json");
    const installedClaimBoundaryResultPath = resolve(consumer.installedRoot, "tests/workflow/evidence/generated-patch-claim-boundary/run-result.json");
    commands.v04Readiness = runNpm(["run", "zoia:verify:v04"], consumer.installedRoot, {
      ZOIA_V04_CLEAN_CONSUMER_BOOTSTRAP: "1"
    });
    positiveV04 = existsSync(installedV04ResultPath) ? await readJson(installedV04ResultPath) : null;
    commands.claimBoundary = runNpm(["run", "zoia:generate:patch:claim-boundary"], consumer.installedRoot, {
      ZOIA_CLAIM_BOUNDARY_CLEAN_CONSUMER_BOOTSTRAP: "1"
    });
    positiveClaimBoundary = existsSync(installedClaimBoundaryResultPath) ? await readJson(installedClaimBoundaryResultPath) : null;
    assertPass(commands.v04Readiness, "installed-v04-readiness", problems);
    assertPass(commands.claimBoundary, "installed-claim-boundary", problems);
    if (positiveV04?.status !== "pass" || positiveV04?.summary?.blockerCount !== 0) {
      problems.push({
        id: "installed-v04-readiness-not-passing",
        message: "Installed package v0.4 readiness did not pass against the copied evidence bundle.",
        observed: {
          status: positiveV04?.status ?? null,
          blockerCount: positiveV04?.summary?.blockerCount ?? null,
          blockers: positiveV04?.blockers ?? null
        }
      });
    }
    if (
      positiveV04?.summary?.cleanConsumerBootstrap !== true ||
      positiveV04?.summary?.releaseReviewSummarySkippedForCleanConsumerBootstrap !== true ||
      positiveV04?.summary?.cleanConsumerSmokeSkippedForCleanConsumerBootstrap !== true
    ) {
      problems.push({
        id: "installed-v04-readiness-bootstrap-boundary-missing",
        message: "Installed package v0.4 readiness did not record the clean consumer bootstrap boundary.",
        observed: {
          cleanConsumerBootstrap: positiveV04?.summary?.cleanConsumerBootstrap ?? null,
          releaseReviewSummarySkippedForCleanConsumerBootstrap: positiveV04?.summary?.releaseReviewSummarySkippedForCleanConsumerBootstrap ?? null,
          cleanConsumerSmokeSkippedForCleanConsumerBootstrap: positiveV04?.summary?.cleanConsumerSmokeSkippedForCleanConsumerBootstrap ?? null
        }
      });
    }
    if (positiveClaimBoundary?.status !== "pass" || positiveClaimBoundary?.summary?.problemCount !== 0) {
      problems.push({
        id: "installed-claim-boundary-not-passing",
        message: "Installed package claim-boundary verifier did not pass against the copied evidence bundle.",
        observed: {
          status: positiveClaimBoundary?.status ?? null,
          problemCount: positiveClaimBoundary?.summary?.problemCount ?? null,
          problems: positiveClaimBoundary?.problems ?? null
        }
      });
    }
    if (
      positiveClaimBoundary?.summary?.cleanConsumerBootstrap !== true ||
      positiveClaimBoundary?.summary?.cleanConsumerSmokeSkippedForCleanConsumerBootstrap !== true
    ) {
      problems.push({
        id: "installed-claim-boundary-bootstrap-boundary-missing",
        message: "Installed package claim-boundary verifier did not record the clean consumer bootstrap boundary.",
        observed: {
          cleanConsumerBootstrap: positiveClaimBoundary?.summary?.cleanConsumerBootstrap ?? null,
          cleanConsumerSmokeSkippedForCleanConsumerBootstrap: positiveClaimBoundary?.summary?.cleanConsumerSmokeSkippedForCleanConsumerBootstrap ?? null
        }
      });
    }

    const negativeRoot = resolve(consumer.installedRoot, "tests/workflow/evidence/v0.4-clean-consumer-smoke-negative-controls");
    const missingGeneratedResultPath = resolve(negativeRoot, "blocked-v04-missing-generated-patch-evidence.json");
    await mkdir(dirname(missingGeneratedResultPath), { recursive: true });
    commands.missingGeneratedPatchEvidence = runNpm(["run", "zoia:verify:v04"], consumer.installedRoot, {
      ZOIA_GENERATED_PATCH_READINESS_PATH: "tests/workflow/evidence/v0.4-clean-consumer-smoke-negative-controls/missing-generated-patch-readiness.json",
      ZOIA_V04_READINESS_RESULT_PATH: relativeToInstalled(missingGeneratedResultPath, consumer.installedRoot)
    });
    missingEvidenceNegative = existsSync(missingGeneratedResultPath) ? await readJson(missingGeneratedResultPath) : null;
    const missingGeneratedBlocker = (missingEvidenceNegative?.blockers || [])
      .some((blocker) => blocker.id === "missing-generatedPatchReadiness");
    if (commands.missingGeneratedPatchEvidence.exitCode === 0 || missingEvidenceNegative?.status !== "blocked" || missingGeneratedBlocker !== true) {
      problems.push({
        id: "missing-generated-patch-evidence-negative-control-failed",
        message: "Installed package v0.4 readiness did not block on missing generated-patch readiness evidence.",
        observed: {
          exitCode: commands.missingGeneratedPatchEvidence.exitCode,
          status: missingEvidenceNegative?.status ?? null,
          blockerFound: missingGeneratedBlocker,
          blockers: missingEvidenceNegative?.blockers ?? null
        }
      });
    }

    const sourceReleaseReview = await readJson(resolve(consumer.installedRoot, "tests/workflow/evidence/release-review-summary/run-result.json"));
    const staleReleaseReviewPath = resolve(negativeRoot, "stale-release-review-summary.json");
    await writeJson(staleReleaseReviewPath, {
      ...sourceReleaseReview,
      status: "blocked",
      completedAt: "2000-01-01T00:00:00.000Z",
      blockers: [
        {
          id: "release-review-evidence-stale",
          evidenceId: "generatedPatchReadiness",
          evidencePath: "tests/workflow/evidence/generated-patch-readiness/run-result.json"
        }
      ],
      negativeControl: true
    });
    const staleReleaseReviewResultPath = resolve(negativeRoot, "blocked-v04-stale-release-review.json");
    await mkdir(dirname(staleReleaseReviewResultPath), { recursive: true });
    commands.staleReleaseReviewEvidence = runNpm(["run", "zoia:verify:v04"], consumer.installedRoot, {
      ZOIA_RELEASE_REVIEW_SUMMARY_PATH: relativeToInstalled(staleReleaseReviewPath, consumer.installedRoot),
      ZOIA_V04_READINESS_RESULT_PATH: relativeToInstalled(staleReleaseReviewResultPath, consumer.installedRoot)
    });
    staleReleaseReviewNegative = existsSync(staleReleaseReviewResultPath) ? await readJson(staleReleaseReviewResultPath) : null;
    const staleReleaseReviewBlocker = (staleReleaseReviewNegative?.blockers || [])
      .some((blocker) => blocker.id === "release-review-summary-failed");
    if (commands.staleReleaseReviewEvidence.exitCode === 0 || staleReleaseReviewNegative?.status !== "blocked" || staleReleaseReviewBlocker !== true) {
      problems.push({
        id: "stale-release-review-evidence-negative-control-failed",
        message: "Installed package v0.4 readiness did not block on stale/degraded release-review summary evidence.",
        observed: {
          exitCode: commands.staleReleaseReviewEvidence.exitCode,
          status: staleReleaseReviewNegative?.status ?? null,
          blockerFound: staleReleaseReviewBlocker,
          blockers: staleReleaseReviewNegative?.blockers ?? null
        }
      });
    }

    const missingInstalledScriptResultPath = resolve(negativeRoot, "blocked-missing-installed-readiness-script.json");
    const installedReadinessScriptPath = resolve(consumer.installedRoot, "tests/workflow/scripts/run-zoia-v04-readiness.mjs");
    const installedReadinessScriptBackupPath = resolve(negativeRoot, "run-zoia-v04-readiness.mjs.backup");
    await mkdir(dirname(missingInstalledScriptResultPath), { recursive: true });
    await rename(installedReadinessScriptPath, installedReadinessScriptBackupPath);
    commands.missingInstalledReadinessScript = runNpm(["run", "zoia:verify:v04"], consumer.installedRoot, {
      ZOIA_V04_READINESS_RESULT_PATH: relativeToInstalled(missingInstalledScriptResultPath, consumer.installedRoot)
    });
    await rename(installedReadinessScriptBackupPath, installedReadinessScriptPath);
    const missingInstalledScriptBlocked = commands.missingInstalledReadinessScript.exitCode !== 0 &&
      /Cannot find module|MODULE_NOT_FOUND|ENOENT|not found/u.test(`${commands.missingInstalledReadinessScript.stderr}\n${commands.missingInstalledReadinessScript.stdout}`);
    if (!missingInstalledScriptBlocked) {
      problems.push({
        id: "missing-installed-readiness-script-negative-control-failed",
        message: "Installed package v0.4 readiness did not fail when the installed readiness script was removed from the package boundary.",
        observed: commands.missingInstalledReadinessScript
      });
    }

    const missingInstalledDocResultPath = resolve(negativeRoot, "blocked-missing-installed-patch-generation-doc.json");
    const installedClaimBoundaryResultBackupPath = resolve(negativeRoot, "generated-patch-claim-boundary-run-result.json.backup");
    const installedCapabilityDocPath = resolve(consumer.installedRoot, "docs/PATCH_GENERATION.md");
    const installedCapabilityDocBackupPath = resolve(negativeRoot, "PATCH_GENERATION.md.backup");
    await cp(installedClaimBoundaryResultPath, installedClaimBoundaryResultBackupPath);
    await rename(installedCapabilityDocPath, installedCapabilityDocBackupPath);
    commands.missingInstalledCapabilityDoc = runNpm(["run", "zoia:generate:patch:claim-boundary"], consumer.installedRoot, {
      ZOIA_CLAIM_BOUNDARY_CLEAN_CONSUMER_BOOTSTRAP: "1"
    });
    await rename(installedCapabilityDocBackupPath, installedCapabilityDocPath);
    const installedClaimBoundaryResultAfterMissingDoc = existsSync(installedClaimBoundaryResultPath)
      ? await readJson(installedClaimBoundaryResultPath)
      : null;
    await cp(installedClaimBoundaryResultPath, missingInstalledDocResultPath);
    await cp(installedClaimBoundaryResultBackupPath, installedClaimBoundaryResultPath);
    missingInstalledDocNegative = installedClaimBoundaryResultAfterMissingDoc;
    const missingInstalledDocBlocked = commands.missingInstalledCapabilityDoc.exitCode !== 0 &&
      missingInstalledDocNegative?.status === "fail" &&
      (missingInstalledDocNegative?.problems || []).some((problem) => problem.id === "missing-patchGenerationDoc");
    if (!missingInstalledDocBlocked) {
      problems.push({
        id: "missing-installed-capability-doc-negative-control-failed",
        message: "Installed package claim-boundary verifier did not fail when the installed patch-generation doc was removed from the package boundary.",
        observed: {
          command: commands.missingInstalledCapabilityDoc,
          result: missingInstalledDocNegative
        }
      });
    }

    const releaseReviewProbeResultPath = resolve(negativeRoot, "release-review-regeneration-probe.json");
    const releaseReviewProbeBlockerPath = resolve(negativeRoot, "release-review-regeneration-blocker.json");
    commands.releaseReviewSummaryRegenerationProbe = runNpm(["run", "zoia:release:review-summary"], consumer.installedRoot, {
      ZOIA_RELEASE_REVIEW_SUMMARY_RESULT_PATH: relativeToInstalled(releaseReviewProbeResultPath, consumer.installedRoot)
    });
    releaseReviewProbe = existsSync(releaseReviewProbeResultPath) ? await readJson(releaseReviewProbeResultPath) : null;
    const gitWorktreeBlockerFound = commands.releaseReviewSummaryRegenerationProbe.exitCode !== 0 &&
      /git status --short --untracked-files=all failed|Not a git repository/u.test(commands.releaseReviewSummaryRegenerationProbe.stderr || "");
    await writeJson(releaseReviewProbeBlockerPath, {
      schemaVersion: "zoia.v04-clean-consumer-smoke-release-review-regeneration-blocker.v1",
      version: "0.4.0",
      revision: 1,
      status: gitWorktreeBlockerFound ? "blocked" : "pass",
      generatedAt: nowIso(),
      blocker: gitWorktreeBlockerFound ? {
        id: "release-review-regeneration-git-worktree-required",
        expectedSurface: "installed package release-review regeneration blocks outside a git worktree",
        command: commands.releaseReviewSummaryRegenerationProbe.command,
        cwd: commands.releaseReviewSummaryRegenerationProbe.cwd,
        exitCode: commands.releaseReviewSummaryRegenerationProbe.exitCode,
        stderr: commands.releaseReviewSummaryRegenerationProbe.stderr
      } : null,
      observed: {
        commandExitCode: commands.releaseReviewSummaryRegenerationProbe.exitCode,
        resultWritten: Boolean(releaseReviewProbe)
      }
    });
    if (commands.releaseReviewSummaryRegenerationProbe.exitCode === 0 || !gitWorktreeBlockerFound) {
      problems.push({
        id: "release-review-regeneration-boundary-not-classified",
        message: "Installed package release-review regeneration did not block with the expected git-worktree boundary.",
        evidencePath: releaseReviewProbeBlockerPath,
        observed: {
          exitCode: commands.releaseReviewSummaryRegenerationProbe.exitCode,
          stderr: commands.releaseReviewSummaryRegenerationProbe.stderr,
          resultStatus: releaseReviewProbe?.status ?? null
        }
      });
    }
  }

  const sourceTreeDependencyFindings = [];
  if (commands.releaseReviewSummaryRegenerationProbe) {
    sourceTreeDependencyFindings.push({
      id: "release-review-summary-regeneration-git-worktree-boundary",
      command: commands.releaseReviewSummaryRegenerationProbe.command,
      exitCode: commands.releaseReviewSummaryRegenerationProbe.exitCode,
      expectedBlockerFound: commands.releaseReviewSummaryRegenerationProbe.exitCode !== 0 &&
        /git status --short --untracked-files=all failed|Not a git repository/u.test(commands.releaseReviewSummaryRegenerationProbe.stderr || ""),
      finding: commands.releaseReviewSummaryRegenerationProbe.exitCode === 0
        ? "Installed package regenerated release-review summary in the clean consumer boundary."
        : "Installed package can consume packaged release-review summary evidence through v0.4 readiness, but release-review summary regeneration still depends on a git worktree context."
    });
  }
  const installedCommandAudit = Object.entries({
    v04Readiness: commands.v04Readiness,
    claimBoundary: commands.claimBoundary,
    missingGeneratedPatchEvidence: commands.missingGeneratedPatchEvidence,
    staleReleaseReviewEvidence: commands.staleReleaseReviewEvidence,
    releaseReviewSummaryRegenerationProbe: commands.releaseReviewSummaryRegenerationProbe
  }).map(([id, commandResult]) => ({
    id,
    command: commandResult?.command ?? null,
    cwd: commandResult?.cwd ?? null,
    ...commandUsesSourceTree(commandResult, PROJECT_ROOT, consumer.installedRoot)
  }));
  const installedCommandSourceTreeFindingCount = installedCommandAudit
    .filter((item) => item.sourceTreeUsed)
    .length;
  if (installedCommandSourceTreeFindingCount > 0) {
    problems.push({
      id: "installed-command-source-tree-dependency-found",
      message: "Installed package commands used the source-tree path instead of the installed package boundary.",
      observed: installedCommandAudit.filter((item) => item.sourceTreeUsed)
    });
  }

  const copiedResultsRoot = resolve(runRoot, "installed-results");
  if (consumer.installedRoot && existsSync(consumer.installedRoot)) {
    const installedEvidenceRoot = resolve(consumer.installedRoot, "tests/workflow/evidence");
    for (const relativePath of [
      "generated-patch-claim-boundary/run-result.json",
      "v0.4-clean-consumer-smoke-negative-controls/blocked-v04-missing-generated-patch-evidence.json",
      "v0.4-clean-consumer-smoke-negative-controls/blocked-v04-stale-release-review.json",
      "v0.4-clean-consumer-smoke-negative-controls/blocked-missing-installed-patch-generation-doc.json",
      "v0.4-clean-consumer-smoke-negative-controls/stale-release-review-summary.json",
      "v0.4-clean-consumer-smoke-negative-controls/release-review-regeneration-blocker.json"
    ]) {
      const sourcePath = resolve(installedEvidenceRoot, relativePath);
      if (!existsSync(sourcePath)) continue;
      const targetPath = resolve(copiedResultsRoot, relativePath);
      await mkdir(dirname(targetPath), { recursive: true });
      await cp(sourcePath, targetPath);
    }
  }

  const result = {
    schemaVersion: "zoia.v04-clean-consumer-smoke-result.v1",
    version: "0.4.0",
    revision: 1,
    status: problems.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    evidenceRoot: runRoot,
    packageBoundary: {
      packagePath: consumer.packagePath,
      packageName: consumer.packResult?.name ?? null,
      packageVersion: consumer.packResult?.version ?? null,
      installedPackageName: installedPackageJson?.name ?? null,
      installedPackageVersion: installedPackageJson?.version ?? null,
      packedFileCount: consumer.packResult?.entryCount ?? null,
      packedSize: consumer.packResult?.size ?? null,
      unpackedSize: consumer.packResult?.unpackedSize ?? null,
      consumerDir: consumer.consumerDir,
      installedRoot: consumer.installedRoot,
      evidenceBundleMode: "selected-json-evidence-copy-into-installed-package",
      sourceTreeImportsUsedByInstalledCommands: installedCommandSourceTreeFindingCount > 0
    },
    packageManifestChecks: packageManifestPathChecks,
    packageScriptChecks,
    sourceEvidence,
    copiedEvidence: {
      jsonFileCount: copiedEvidence.filter((item) => item.exists).length,
      files: copiedEvidence
    },
    installedChecks,
    summary: {
      problemCount: problems.length,
      sourceEvidenceCount: sourceEvidence.length,
      packageManifestRequiredPathCount: packageManifestPathChecks.length,
      packageManifestMissingPathCount: packageManifestPathChecks.filter((item) => !item.included).length,
      packageManifestNegativeControlCount: packageManifestNegativeControls.length,
      packageManifestPassingNegativeControlCount: packageManifestNegativeControls.filter((item) => item.status === "blocked").length,
      packageMetadataName: installedPackageJson?.name ?? null,
      packageMetadataVersion: installedPackageJson?.version ?? null,
      packageMetadataValid: installedPackageJson?.name === "zoia-emulator" && installedPackageJson?.version === "0.4.0",
      packageScriptReferenceCount: packageScriptChecks.length,
      packageScriptMissingReferenceCount: packageScriptChecks.filter((item) => !item.present).length,
      installedRequiredPathCount: installedChecks.length,
      installedMissingPathCount: installedChecks.filter((item) => !item.exists).length,
      copiedJsonEvidenceCount: copiedEvidence.filter((item) => item.exists).length,
      copiedEvidenceNegativeControlCount: copiedEvidenceNegativeControls.length,
      copiedEvidencePassingNegativeControlCount: copiedEvidenceNegativeControls.filter((item) => item.status === "blocked").length,
      sourceTreeImportsUsedByInstalledCommands: installedCommandSourceTreeFindingCount > 0,
      installedCommandAuditCount: installedCommandAudit.length,
      installedCommandSourceTreeFindingCount,
      v04ReadinessStatus: positiveV04?.status ?? null,
      v04ReadinessBlockerCount: positiveV04?.summary?.blockerCount ?? null,
      v04ReadinessCleanConsumerBootstrap: positiveV04?.summary?.cleanConsumerBootstrap ?? null,
      v04ReadinessReleaseReviewSummarySkippedForBootstrap: positiveV04?.summary?.releaseReviewSummarySkippedForCleanConsumerBootstrap ?? null,
      v04ReadinessCleanConsumerSmokeSkippedForBootstrap: positiveV04?.summary?.cleanConsumerSmokeSkippedForCleanConsumerBootstrap ?? null,
      claimBoundaryStatus: positiveClaimBoundary?.status ?? null,
      claimBoundaryProblemCount: positiveClaimBoundary?.summary?.problemCount ?? null,
      claimBoundaryCleanConsumerBootstrap: positiveClaimBoundary?.summary?.cleanConsumerBootstrap ?? null,
      claimBoundaryCleanConsumerSmokeSkippedForBootstrap: positiveClaimBoundary?.summary?.cleanConsumerSmokeSkippedForCleanConsumerBootstrap ?? null,
      missingGeneratedEvidenceExitCode: commands.missingGeneratedPatchEvidence?.exitCode ?? null,
      missingGeneratedEvidenceBlockedStatus: missingEvidenceNegative?.status ?? null,
      staleReleaseReviewExitCode: commands.staleReleaseReviewEvidence?.exitCode ?? null,
      staleReleaseReviewBlockedStatus: staleReleaseReviewNegative?.status ?? null,
      missingInstalledReadinessScriptExitCode: commands.missingInstalledReadinessScript?.exitCode ?? null,
      missingInstalledReadinessScriptBlocked: commands.missingInstalledReadinessScript
        ? /Cannot find module|MODULE_NOT_FOUND|ENOENT|not found/u.test(`${commands.missingInstalledReadinessScript.stderr}\n${commands.missingInstalledReadinessScript.stdout}`)
        : null,
      missingInstalledCapabilityDocExitCode: commands.missingInstalledCapabilityDoc?.exitCode ?? null,
      missingInstalledCapabilityDocBlockedStatus: missingInstalledDocNegative?.status ?? null,
      releaseReviewRegenerationProbeExitCode: commands.releaseReviewSummaryRegenerationProbe?.exitCode ?? null,
      releaseReviewRegenerationGitWorktreeBlockerFound: commands.releaseReviewSummaryRegenerationProbe
        ? /git status --short --untracked-files=all failed|Not a git repository/u.test(commands.releaseReviewSummaryRegenerationProbe.stderr || "")
        : null
    },
    commands,
    sourceTreeDependencyFindings,
    installedCommandAudit,
    negativeControls: [
      ...packageManifestNegativeControls,
      ...copiedEvidenceNegativeControls,
      {
        id: "missing-generated-patch-evidence",
        expectedSurface: "v0.4 readiness blocks with missing-generatedPatchReadiness",
        status: missingEvidenceNegative?.status ?? null
      },
      {
        id: "stale-release-review-evidence",
        expectedSurface: "v0.4 readiness blocks with release-review-summary-failed",
        status: staleReleaseReviewNegative?.status ?? null
      },
      {
        id: "missing-installed-readiness-script",
        expectedSurface: "installed v0.4 readiness command fails from installed package boundary",
        status: commands.missingInstalledReadinessScript?.exitCode === 0 ? "unexpected-pass" : "blocked"
      },
      {
        id: "missing-installed-patch-generation-doc",
        expectedSurface: "installed claim-boundary verification fails with missing-patchGenerationDoc",
        status: commands.missingInstalledCapabilityDoc?.exitCode === 0 ? "unexpected-pass" : "blocked"
      },
      {
        id: "release-review-regeneration-without-git-worktree",
        expectedSurface: "installed release-review regeneration blocks with release-review-regeneration-git-worktree-required",
        status: commands.releaseReviewSummaryRegenerationProbe?.exitCode === 0 ? "pass" : "blocked"
      }
    ],
    problems,
    claimBoundary: "This smoke proves the local package artifact can be installed into a clean consumer directory and can run installed v0.4/generated-patch readiness gates against an evidence bundle copied into the installed package. It does not prove npm publication readiness, GitHub readiness, broad prompt support, hardware export, hardware parity, full DSP accuracy, or release readiness."
  };

  await writeJson(resolve(runRoot, "run-result.json"), result);
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), result);
  console.log(JSON.stringify({
    status: result.status,
    ...result.summary,
    evidenceRoot: runRoot,
    resultPath: resolve(EVIDENCE_ROOT, "run-result.json")
  }, null, JSON_SPACES));

  if (process.env.ZOIA_CLEAN_CONSUMER_SMOKE_KEEP_TEMP !== "1" && consumer.tempRoot && existsSync(consumer.tempRoot)) {
    await rm(consumer.tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
  if (result.status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.v04-clean-consumer-smoke-result.v1",
    version: "0.4.0",
    revision: 1,
    status: "blocked",
    completedAt: nowIso(),
    error: {
      message: error.message,
      stack: error.stack
    },
    artifacts: {
      resultPath: resolve(EVIDENCE_ROOT, "run-result.json")
    }
  };
  await writeJson(resolve(EVIDENCE_ROOT, "run-result.json"), result);
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
