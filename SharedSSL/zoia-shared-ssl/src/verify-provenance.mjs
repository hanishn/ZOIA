import crypto from "node:crypto";
import fs from "node:fs";
import { SSL_SHARED_CANDIDATES } from "./provenance.mjs";

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const results = SSL_SHARED_CANDIDATES.map((candidate) => {
  const sourceExists = fs.existsSync(candidate.sourcePath);
  const packageExists = fs.existsSync(candidate.packagePath);
  const sourceHash = sourceExists ? sha256(candidate.sourcePath) : null;
  const packageHash = packageExists ? sha256(candidate.packagePath) : null;
  return {
    name: candidate.name,
    sourcePath: candidate.sourcePath,
    packagePath: candidate.packagePath,
    sourceExists,
    packageExists,
    sourceHash,
    packageHash,
    expectedHash: candidate.sourceSha256,
    sourceHashMatches: sourceHash === candidate.sourceSha256,
    packageHashMatchesSource: sourceHash !== null && sourceHash === packageHash,
  };
});

const failures = results.filter(
  (result) => !result.sourceExists || !result.packageExists || !result.sourceHashMatches || !result.packageHashMatchesSource,
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
