#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const EVIDENCE_ROOT = resolve(PROJECT_ROOT, "tests/workflow/evidence/v0.4-readiness");
const RESULT_PATH = resolve(EVIDENCE_ROOT, "run-result.json");
const JSON_SPACES = 2;

const REQUIRED_FILES = Object.freeze({
  featureCoverage: "docs/FEATURE_COVERAGE.md",
  validation: "docs/VALIDATION.md",
  patchSchema: "tests/workflow/schemas/patch-verification-result.schema.json",
  ci: "tests/workflow/evidence/q109-ci-gate-integration/run-result.json",
  stagedAudio: "tests/workflow/evidence/q104-staged-patch-audio-all-baseline/run-result.json",
  testPatchStimulus: "tests/workflow/evidence/v0.4-test-patch-stimulus/run-result.json",
  stagedTrace: "tests/workflow/evidence/v0.3-trace-baseline/run-result.json",
  communityTrace: "tests/workflow/evidence/v0.3-trace-baseline/community-run-result.json",
  communityAudio: "tests/workflow/evidence/q106-community-patch-audio-classification-baseline/run-result.json",
  communityStimulus: "tests/workflow/evidence/q106-community-patch-audio-classification-v0.4-playability-full-r1/run-result.json",
  communityModalityRollup: "tests/workflow/evidence/v0.4-community-modality-rollup/run-result.json"
});

const TEST_PATCH_BLOCKING_CLASSIFICATIONS = Object.freeze([
  "patch-requires-external-input-midi-cv"
]);

const COMMUNITY_BLOCKING_CLASSIFICATIONS = Object.freeze([
  "patch-requires-external-input-midi-cv",
  "stimulus-policy-required"
]);

function nowIso() {
  return new Date().toISOString();
}

async function readJson(relativePath) {
  const fullPath = resolve(PROJECT_ROOT, relativePath);
  return JSON.parse(await readFile(fullPath, "utf8"));
}

function addBlocker(blockers, id, message, evidencePath, observed = null) {
  blockers.push({
    id,
    message,
    evidencePath,
    observed
  });
}

function countBlockedClassifications(byClassification, blockingClassifications) {
  const blocked = {};
  let count = 0;
  for (const classification of blockingClassifications) {
    const value = Number(byClassification?.[classification] || 0);
    if (value > 0) {
      blocked[classification] = value;
      count += value;
    }
  }
  return { count, blocked };
}

async function main() {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const startedAt = nowIso();
  const blockers = [];
  const fileChecks = {};

  for (const [id, relativePath] of Object.entries(REQUIRED_FILES)) {
    const fullPath = resolve(PROJECT_ROOT, relativePath);
    const exists = existsSync(fullPath);
    fileChecks[id] = { path: fullPath, exists };
    if (!exists) addBlocker(blockers, `missing-${id}`, `Required 0.4 artifact is missing: ${relativePath}`, fullPath);
  }

  let ci = null;
  let stagedAudio = null;
  let testPatchStimulus = null;
  let stagedTrace = null;
  let communityTrace = null;
  let communityAudio = null;
  let communityStimulusResult = null;
  let communityModalityRollup = null;

  if (fileChecks.ci.exists) ci = await readJson(REQUIRED_FILES.ci);
  if (fileChecks.stagedAudio.exists) stagedAudio = await readJson(REQUIRED_FILES.stagedAudio);
  if (fileChecks.testPatchStimulus.exists) testPatchStimulus = await readJson(REQUIRED_FILES.testPatchStimulus);
  if (fileChecks.stagedTrace.exists) stagedTrace = await readJson(REQUIRED_FILES.stagedTrace);
  if (fileChecks.communityTrace.exists) communityTrace = await readJson(REQUIRED_FILES.communityTrace);
  if (fileChecks.communityAudio.exists) communityAudio = await readJson(REQUIRED_FILES.communityAudio);
  if (fileChecks.communityStimulus.exists) communityStimulusResult = await readJson(REQUIRED_FILES.communityStimulus);
  if (fileChecks.communityModalityRollup.exists) communityModalityRollup = await readJson(REQUIRED_FILES.communityModalityRollup);

  if (ci && (ci.status !== "pass" || ci.failCount !== 0)) {
    addBlocker(blockers, "ci-gate-failed", "Clone-safe CI gate is not passing.", fileChecks.ci.path, { status: ci.status, failCount: ci.failCount });
  }

  if (stagedAudio) {
    if (stagedAudio.status !== "pass" || stagedAudio.failCount !== 0 || stagedAudio.fixtureCount !== 88) {
      addBlocker(blockers, "staged-audio-hard-failure", "Committed test patch staged audio gate is not clean.", fileChecks.stagedAudio.path, {
        status: stagedAudio.status,
        fixtureCount: stagedAudio.fixtureCount,
        failCount: stagedAudio.failCount
      });
    }
    const stagedStimulus = countBlockedClassifications(stagedAudio.byClassification, TEST_PATCH_BLOCKING_CLASSIFICATIONS);
    if (stagedStimulus.count > 0) {
      if (!testPatchStimulus || testPatchStimulus.status !== "pass" || testPatchStimulus.fixtureCount !== stagedStimulus.count || testPatchStimulus.failCount !== 0) {
        addBlocker(blockers, "test-patch-stimulus-unproven", "Committed test patches still require deterministic MIDI/CV/external stimulus proof.", fileChecks.testPatchStimulus.path, {
          stagedAudioClassification: stagedStimulus,
          stimulusGate: testPatchStimulus ? {
            status: testPatchStimulus.status,
            fixtureCount: testPatchStimulus.fixtureCount,
            passCount: testPatchStimulus.passCount,
            failCount: testPatchStimulus.failCount,
            byClassification: testPatchStimulus.byClassification
          } : null
        });
      }
    }
  }

  if (stagedTrace && (stagedTrace.status !== "pass" || stagedTrace.failCount !== 0 || stagedTrace.patchCount !== 88)) {
    addBlocker(blockers, "staged-trace-failed", "Committed test patch trace gate is not passing.", fileChecks.stagedTrace.path, {
      status: stagedTrace.status,
      patchCount: stagedTrace.patchCount,
      failCount: stagedTrace.failCount
    });
  }

  if (communityTrace) {
    if (communityTrace.status !== "pass" || communityTrace.failCount !== 0 || communityTrace.patchCount !== 1884) {
      addBlocker(blockers, "community-trace-failed", "Community patch trace gate is not clean.", fileChecks.communityTrace.path, {
        status: communityTrace.status,
        patchCount: communityTrace.patchCount,
        failCount: communityTrace.failCount
      });
    }
  }

  if (communityAudio) {
    if (communityAudio.status !== "pass" || communityAudio.failCount !== 0 || communityAudio.fixtureCount !== 1884) {
      addBlocker(blockers, "community-audio-hard-failure", "Community audio classification gate has hard failures.", fileChecks.communityAudio.path, {
        status: communityAudio.status,
        fixtureCount: communityAudio.fixtureCount,
        failCount: communityAudio.failCount
      });
    }
    const communityStimulus = countBlockedClassifications(communityAudio.byClassification, COMMUNITY_BLOCKING_CLASSIFICATIONS);
    if (communityStimulus.count > 0) {
      if (!communityStimulusResult || communityStimulusResult.status !== "pass" || communityStimulusResult.failCount !== 0 || communityStimulusResult.fixtureCount !== 1884) {
        addBlocker(blockers, "community-stimulus-unproven", "Community patches still require deterministic MIDI/CV/control/stimulus proof or source-data remediation.", fileChecks.communityStimulus.path, {
          baselineBlocked: communityStimulus,
          stimulusGate: communityStimulusResult ? {
            status: communityStimulusResult.status,
            fixtureCount: communityStimulusResult.fixtureCount,
            passCount: communityStimulusResult.passCount,
            classifiedCount: communityStimulusResult.classifiedCount,
            failCount: communityStimulusResult.failCount,
            byClassification: communityStimulusResult.byClassification
          } : null
        });
      } else {
        const remainingStimulus = countBlockedClassifications(communityStimulusResult.byClassification, COMMUNITY_BLOCKING_CLASSIFICATIONS);
        if (remainingStimulus.count > 0) {
          addBlocker(blockers, "community-stimulus-classifications-remain", "v0.4 community stimulus gate still contains unproven stimulus classifications.", fileChecks.communityStimulus.path, remainingStimulus);
        }
      }
    }
  }

  if (communityModalityRollup) {
    if (
      communityModalityRollup.status !== "pass" ||
      communityModalityRollup.summary?.sourceBacklogCount !== 514 ||
      communityModalityRollup.summary?.coveredCount !== 514 ||
      communityModalityRollup.summary?.missingPairCount !== 0 ||
      communityModalityRollup.summary?.duplicatePairCount !== 0 ||
      communityModalityRollup.summary?.unexpectedPairCount !== 0 ||
      communityModalityRollup.summary?.problemCount !== 0
    ) {
      addBlocker(blockers, "community-modality-rollup-failed", "Community classified modality rollup does not cover the full v0.4 backlog cleanly.", fileChecks.communityModalityRollup.path, {
        status: communityModalityRollup.status,
        summary: communityModalityRollup.summary,
        validation: communityModalityRollup.validation
      });
    }
  }

  const result = {
    schemaVersion: "zoia.v04-readiness-result.v1",
    version: "0.4.0",
    revision: 2,
    status: blockers.length === 0 ? "pass" : "blocked",
    startedAt,
    completedAt: nowIso(),
    evidenceRoot: EVIDENCE_ROOT,
    fileChecks,
    summary: {
      blockerCount: blockers.length,
      ciStatus: ci?.status || null,
      stagedAudio: stagedAudio ? {
        fixtureCount: stagedAudio.fixtureCount,
        passCount: stagedAudio.passCount,
        classifiedCount: stagedAudio.classifiedCount,
        failCount: stagedAudio.failCount,
        byClassification: stagedAudio.byClassification
      } : null,
      stagedTrace: stagedTrace ? {
        patchCount: stagedTrace.patchCount,
        passCount: stagedTrace.passCount,
        failCount: stagedTrace.failCount
      } : null,
      testPatchStimulus: testPatchStimulus ? {
        fixtureCount: testPatchStimulus.fixtureCount,
        passCount: testPatchStimulus.passCount,
        classifiedCount: testPatchStimulus.classifiedCount,
        failCount: testPatchStimulus.failCount,
        byClassification: testPatchStimulus.byClassification
      } : null,
      communityTrace: communityTrace ? {
        patchCount: communityTrace.patchCount,
        passCount: communityTrace.passCount,
        classifiedCount: communityTrace.classifiedCount,
        failCount: communityTrace.failCount,
        traceableCount: communityTrace.traceableCount
      } : null,
      communityAudio: communityAudio ? {
        fixtureCount: communityAudio.fixtureCount,
        passCount: communityAudio.passCount,
        classifiedCount: communityAudio.classifiedCount,
        failCount: communityAudio.failCount,
        byClassification: communityAudio.byClassification
      } : null,
      communityStimulus: communityStimulusResult ? {
        fixtureCount: communityStimulusResult.fixtureCount,
        passCount: communityStimulusResult.passCount,
        classifiedCount: communityStimulusResult.classifiedCount,
        failCount: communityStimulusResult.failCount,
        byClassification: communityStimulusResult.byClassification
      } : null,
      communityModalityRollup: communityModalityRollup ? {
        sourceBacklogCount: communityModalityRollup.summary?.sourceBacklogCount ?? null,
        coveredCount: communityModalityRollup.summary?.coveredCount ?? null,
        measuredSignalCount: communityModalityRollup.summary?.measuredSignalCount ?? null,
        staticClassifiedCount: communityModalityRollup.summary?.staticClassifiedCount ?? null,
        problemCount: communityModalityRollup.summary?.problemCount ?? null,
        missingPairCount: communityModalityRollup.summary?.missingPairCount ?? null,
        duplicatePairCount: communityModalityRollup.summary?.duplicatePairCount ?? null,
        unexpectedPairCount: communityModalityRollup.summary?.unexpectedPairCount ?? null
      } : null
    },
    blockers,
    claimBoundary: "This readiness gate blocks 0.4 until every committed test patch and every available community patch has deterministic evidence for import, UI/rendering, signal-flow, audio/playability where applicable, or an explicit non-emulator/source/provenance classification."
  };

  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.log(RESULT_PATH);
  if (result.status !== "pass") process.exit(1);
}

main().catch(async (error) => {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  const result = {
    schemaVersion: "zoia.v04-readiness-result.v1",
    version: "0.4.0",
    revision: 2,
    status: "fail",
    completedAt: nowIso(),
    error: { message: error.message, stack: error.stack },
    evidenceRoot: EVIDENCE_ROOT
  };
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
