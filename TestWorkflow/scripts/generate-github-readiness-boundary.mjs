import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const EVIDENCE_ROOT = path.join(PROJECT_ROOT, "TestWorkflow/evidence/q110-github-readiness-boundary");
const RESULT_PATH = path.join(EVIDENCE_ROOT, "repository-boundary.json");

const committedByDefault = [
  ".github/workflows/zoia-ci.yml",
  "package.json",
  "package-lock.json",
  "ParserHarness",
  "SharedSSL",
  "TestWorkflow/audio-fixtures",
  "TestWorkflow/playwright",
  "TestWorkflow/scripts",
  "TestWorkflow/canonical-patches/Test_Modules.manifest.json",
  "ZOIA emulator/ZOIA_Patch_Simulator_v5_2_21_2026.html",
];

const excludedByDefault = [
  "node_modules",
  "TestWorkflow/evidence",
  "TestWorkflow/logs",
  "TestWorkflow/patch-library-cache",
  "TestWorkflow/canonical-patches/Test_Modules",
  "Reports/**/*.pdf",
  "Reports/**/*.html",
  "*.zip",
];

function exists(relativePath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

function main() {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const payload = {
    status: "pass",
    generatedAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    isGitRepository: fs.existsSync(path.join(PROJECT_ROOT, ".git")),
    committedByDefault: committedByDefault.map((relativePath) => ({
      relativePath,
      exists: exists(relativePath),
    })),
    excludedByDefault,
    requiredLocalGates: ["npm ci", "npm run zoia:test:ci"],
    publicationGate: "npm run zoia:test:publication",
    claimBoundaries: [
      "no binary export fidelity claim",
      "no audio correctness claim beyond deterministic analyser evidence",
      "no public distribution of community patch binaries, extracted patch cache, or generated evidence without approval",
      "no HTML exhibit runtime shared SSL asset execution claim until implemented and gated",
    ],
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(RESULT_PATH);
}

main();
