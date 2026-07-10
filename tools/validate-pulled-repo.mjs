import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const RESULT_PATH = resolve(REPO_ROOT, "repository-validation-result.json");
const JSON_SPACES = 2;
const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.ZOIA_VALIDATION_PORT ?? "5183", 10);
const NPM_COMMAND = "npm";
const PREBUILT_PATH = resolve(REPO_ROOT, "products", "zoia", "dist", "zoia-emulator.html");
const SOURCE_TEMPLATE_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "index.template.html");
const SOURCE_STYLE_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "styles", "app.css");
const SOURCE_SCRIPT_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "scripts", "app.js");
const SOURCE_INIT_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "scripts", "init.js");
const SOURCE_MANIFEST_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "data", "exhibit-manifest.json");
const INDEX_PATH = resolve(REPO_ROOT, "products", "zoia", "index.html");
const ENTRY_URL = `http://${HOST}:${PORT}/products/zoia/dist/zoia-emulator.html`;
const REQUIRED_PATHS = [
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "VERSION",
  "package.json",
  "package-lock.json",
  "products/zoia/src/index.template.html",
  "products/zoia/src/styles/app.css",
  "products/zoia/src/scripts/app.js",
  "products/zoia/src/scripts/init.js",
  "products/zoia/src/data/exhibit-manifest.json",
  "products/zoia/dist/zoia-emulator.html",
  "products/zoia/index.html",
  "tests/workflow/canonical-patches/Test_Modules/A_Reverbs/A01_Spring_Reverb.bin",
  "tests/workflow/canonical-patches/Test_Modules/A_Reverbs/A01_Spring_Reverb.json",
  "tools/build-zoia-exhibit.mjs",
  "tools/serve-zoia.mjs",
  "tools/validate-pulled-repo.mjs",
  "tests/parser-harness/scripts/zoia-no-magic-number-lint.mjs",
  "tests/workflow/scripts/run-zoia-ci-gates.mjs",
  "shared/ssl/zoia-shared-ssl/package.json",
];
const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

function nowIso() {
  return new Date().toISOString();
}

async function sha256(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

function commandInvocation(command, args) {
  if (process.platform !== "win32") {
    return { file: command, args, display: [command, ...args].join(" ") };
  }
  return {
    file: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].join(" ")],
    display: [command, ...args].join(" "),
  };
}

function runCommand(command, args) {
  const startedAt = new Date();
  const invocation = commandInvocation(command, args);
  return new Promise((resolveResult) => {
    const child = spawn(invocation.file, invocation.args, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      const finishedAt = new Date();
      resolveResult({
        command: invocation.display,
        status: "fail",
        exitCode: null,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-4000),
        error: error.message,
      });
    });
    child.on("close", (exitCode) => {
      const finishedAt = new Date();
      resolveResult({
        command: invocation.display,
        status: exitCode === 0 ? "pass" : "fail",
        exitCode,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-4000),
      });
    });
  });
}

function resolveRequestPath(requestUrl) {
  const parsed = new URL(requestUrl, ENTRY_URL);
  const candidate = normalize(join(REPO_ROOT, decodeURIComponent(parsed.pathname)));
  if (candidate !== REPO_ROOT && !candidate.startsWith(`${REPO_ROOT}${sep}`)) {
    return null;
  }
  return candidate;
}

function startServer() {
  const server = createServer((request, response) => {
    const filePath = resolveRequestPath(request.url ?? "/");
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type": MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  });
  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(PORT, HOST, () => resolveServer(server));
  });
}

async function smokePrebuiltHtml() {
  const server = await startServer();
  try {
    const response = await fetch(ENTRY_URL);
    const text = await response.text();
    return {
      status: response.ok && text.includes("ZOIA") ? "pass" : "fail",
      url: ENTRY_URL,
      httpStatus: response.status,
      containsZoiaText: text.includes("ZOIA"),
      contentLength: text.length,
    };
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

async function main() {
  const startedAt = nowIso();
  const requiredPathResults = REQUIRED_PATHS.map((relativePath) => ({
    relativePath,
    fullPath: resolve(REPO_ROOT, relativePath),
    exists: existsSync(resolve(REPO_ROOT, relativePath)),
  }));
  const missingRequiredPaths = requiredPathResults.filter((item) => !item.exists);
  const commandResults = [];

  if (missingRequiredPaths.length === 0) {
    commandResults.push(await runCommand(NPM_COMMAND, ["ci"]));
    commandResults.push(await runCommand(NPM_COMMAND, ["run", "zoia:build"]));
    commandResults.push(await runCommand(NPM_COMMAND, ["test"]));
  }

  const sourceTemplateHash = existsSync(SOURCE_TEMPLATE_PATH) ? await sha256(SOURCE_TEMPLATE_PATH) : null;
  const sourceStyleHash = existsSync(SOURCE_STYLE_PATH) ? await sha256(SOURCE_STYLE_PATH) : null;
  const sourceScriptHash = existsSync(SOURCE_SCRIPT_PATH) ? await sha256(SOURCE_SCRIPT_PATH) : null;
  const sourceInitHash = existsSync(SOURCE_INIT_PATH) ? await sha256(SOURCE_INIT_PATH) : null;
  const sourceManifestHash = existsSync(SOURCE_MANIFEST_PATH) ? await sha256(SOURCE_MANIFEST_PATH) : null;
  const prebuiltHash = existsSync(PREBUILT_PATH) ? await sha256(PREBUILT_PATH) : null;
  const indexHash = existsSync(INDEX_PATH) ? await sha256(INDEX_PATH) : null;
  const smokeResult = missingRequiredPaths.length === 0 ? await smokePrebuiltHtml() : { status: "skipped" };
  const failures = [
    ...missingRequiredPaths.map((item) => ({ type: "missing-required-path", path: item.fullPath })),
    ...commandResults.filter((item) => item.status !== "pass").map((item) => ({ type: "command-failed", command: item.command })),
    ...(prebuiltHash && indexHash && prebuiltHash !== indexHash
      ? [{ type: "index-hash-mismatch", prebuiltPath: PREBUILT_PATH, indexPath: INDEX_PATH }]
      : []),
    ...(smokeResult.status !== "pass" ? [{ type: "server-smoke-failed", smokeResult }] : []),
  ];
  const result = {
    schemaVersion: "zoia.pulled-repo-validation.v1",
    status: failures.length === 0 ? "pass" : "fail",
    startedAt,
    finishedAt: nowIso(),
    repositoryRoot: REPO_ROOT,
    resultPath: RESULT_PATH,
    sourceTemplateHtml: SOURCE_TEMPLATE_PATH,
    sourceStyle: SOURCE_STYLE_PATH,
    sourceScript: SOURCE_SCRIPT_PATH,
    sourceInitScript: SOURCE_INIT_PATH,
    sourceManifest: SOURCE_MANIFEST_PATH,
    prebuiltHtml: PREBUILT_PATH,
    indexHtml: INDEX_PATH,
    sourceTemplateSha256: sourceTemplateHash,
    sourceStyleSha256: sourceStyleHash,
    sourceScriptSha256: sourceScriptHash,
    sourceInitSha256: sourceInitHash,
    sourceManifestSha256: sourceManifestHash,
    prebuiltSha256: prebuiltHash,
    indexSha256: indexHash,
    requiredPaths: requiredPathResults,
    commands: commandResults,
    smokeResult,
    failures,
  };

  await mkdir(dirname(RESULT_PATH), { recursive: true });
  await writeFile(RESULT_PATH, `${JSON.stringify(result, null, JSON_SPACES)}\n`, "utf8");
  console.log(RESULT_PATH);
  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
