#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const DEFAULT_TARGETS = ["zoia-fixture-runner.mjs"];
const NUMERIC_LITERAL_PATTERN = /(?<![A-Za-z0-9_$])(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)(?![A-Za-z0-9_$])/g;
const NAMED_CONSTANT_PATTERN = /^\s*const\s+[A-Z][A-Z0-9_]*\s*=/;
const CONSTANT_OBJECT_START_PATTERN = /^\s*const\s+[A-Z][A-Z0-9_]*\s*=\s*Object\.freeze\(\{/;
const CONSTANT_OBJECT_END_PATTERN = /^\s*\}\);/;

function stripLineNoise(line) {
  return line
    .replace(/"([^"\\]|\\.)*"/g, "\"\"")
    .replace(/'([^'\\]|\\.)*'/g, "''")
    .replace(/`([^`\\]|\\.)*`/g, "``")
    .replace(/\/\/.*$/, "");
}

function findMagicNumbers(source, filePath) {
  const findings = [];
  let inConstantObject = false;
  source.split(/\r?\n/).forEach((line, index) => {
    const stripped = stripLineNoise(line);
    const isNamedConstant = NAMED_CONSTANT_PATTERN.test(stripped);
    if (CONSTANT_OBJECT_START_PATTERN.test(stripped)) inConstantObject = true;

    if (!isNamedConstant && !inConstantObject && NUMERIC_LITERAL_PATTERN.test(stripped)) {
      findings.push({
        filePath,
        line: index + 1,
        source: line.trim()
      });
    }

    NUMERIC_LITERAL_PATTERN.lastIndex = 0;
    if (inConstantObject && CONSTANT_OBJECT_END_PATTERN.test(stripped)) inConstantObject = false;
  });
  return findings;
}

async function main() {
  const targets = process.argv.slice(2);
  const filePaths = targets.length > 0 ? targets : DEFAULT_TARGETS;
  const findings = [];
  for (const filePath of filePaths) {
    findings.push(...findMagicNumbers(await readFile(filePath, "utf8"), filePath));
  }
  if (findings.length > 0) {
    console.error(JSON.stringify({ status: "failed", findings }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ status: "passed", checkedFiles: filePaths }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 2;
});
