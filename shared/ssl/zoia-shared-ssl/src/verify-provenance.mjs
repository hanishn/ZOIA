import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SSL_SHARED_CANDIDATES } from "./provenance.mjs";

const PACKAGE_ROOT = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const results = SSL_SHARED_CANDIDATES.map((candidate) => {
  const packagePath = path.join(PACKAGE_ROOT, "browser-assets", candidate.name);
  const sourceExists = fs.existsSync(candidate.sourcePath);
  const packageExists = fs.existsSync(packagePath);
  const sourceHash = sourceExists ? sha256(candidate.sourcePath) : null;
  const packageHash = packageExists ? sha256(packagePath) : null;
  return {
    name: candidate.name,
    sourcePath: candidate.sourcePath,
    packagePath,
    sourceExists,
    packageExists,
    sourceHash,
    packageHash,
    expectedHash: candidate.sourceSha256,
    sourceHashMatches: sourceHash === null || sourceHash === candidate.sourceSha256,
    packageHashMatchesExpected: packageHash === candidate.sourceSha256,
  };
});

const failures = results.filter(
  (result) => !result.packageExists || !result.sourceHashMatches || !result.packageHashMatchesExpected,
);

const payload = {
  status: failures.length === 0 ? "pass" : "fail",
  checkedCount: results.length,
  failCount: failures.length,
  results,
};

console.log(JSON.stringify(payload, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
