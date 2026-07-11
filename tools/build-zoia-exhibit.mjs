import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const MANIFEST_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "data", "exhibit-manifest.json");
const BUILD_MANIFEST_PATH = resolve(REPO_ROOT, "products", "zoia", "dist", "build-manifest.json");
const JSON_SPACES = 2;
const SCRIPT_BLOCK_PLACEHOLDER = "<!-- ZOIA_BUILD_SCRIPTS -->";
const EMBEDDED_TEST_PATCHES_PLACEHOLDER = "<!-- ZOIA_EMBEDDED_TEST_PATCHES -->";

function repoPath(relativePath) {
  return resolve(REPO_ROOT, relativePath);
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sourceDataPath(sourcePath) {
  return sourcePath.replace("products/zoia/", "");
}

function inlineScriptBlock(scriptEntry) {
  return `<script data-zoia-build="${sourceDataPath(scriptEntry.path)}">\n${scriptEntry.content.trimEnd()}\n</script>`;
}

async function hashFile(relativePath) {
  return sha256Text(await readText(relativePath));
}

async function buildEmbeddedTestPatches(config) {
  if (!config?.enabled) {
    return { html: "", manifestHash: null, patchCount: 0, byteCount: 0 };
  }
  const manifestText = await readText(config.manifest);
  const manifest = JSON.parse(manifestText);
  const binFiles = (manifest.files || [])
    .filter((file) => /\.bin$/i.test(file.relativePath || ""))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const patches = [];
  let byteCount = 0;
  for (const file of binFiles) {
    const relativePath = file.relativePath.replace(/\\/g, "/");
    const bytes = await readFile(repoPath(`${config.root}/${relativePath}`));
    byteCount += bytes.byteLength;
    patches.push({
      relativePath,
      size: bytes.byteLength,
      sha256: sha256Bytes(bytes).toUpperCase(),
      base64: bytes.toString("base64"),
    });
  }
  const payload = {
    schemaVersion: "zoia.embedded-test-patches.v1",
    generatedAt: new Date().toISOString(),
    sourceManifest: config.manifest,
    sourceRoot: config.root,
    patchCount: patches.length,
    byteCount,
    patches,
  };
  return {
    html: `<script id="zoia-embedded-test-patches" type="application/json">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>`,
    manifestHash: sha256Text(manifestText),
    patchCount: patches.length,
    byteCount,
  };
}

async function main() {
  const manifestText = await readFile(MANIFEST_PATH, "utf8");
  const sourceManifest = JSON.parse(manifestText);
  const template = await readText(sourceManifest.template);
  const styleEntries = await Promise.all(
    sourceManifest.styles.map(async (stylePath) => ({
      path: stylePath,
      content: await readText(stylePath),
    })),
  );
  const scriptEntries = await Promise.all(
    sourceManifest.scripts.map(async (scriptPath) => ({
      path: scriptPath,
      content: await readText(scriptPath),
    })),
  );
  const embeddedTestPatches = await buildEmbeddedTestPatches(sourceManifest.embeddedTestPatches);

  let html = template;
  for (const style of styleEntries) {
    const placeholder = `<!-- ZOIA_BUILD_STYLE:${sourceDataPath(style.path)} -->`;
    if (!html.includes(placeholder)) {
      throw new Error(`Missing style placeholder: ${placeholder}`);
    }
    html = html.replace(placeholder, style.content.trimEnd());
  }
  if (html.includes(EMBEDDED_TEST_PATCHES_PLACEHOLDER)) {
    html = html.replace(EMBEDDED_TEST_PATCHES_PLACEHOLDER, embeddedTestPatches.html);
  }
  if (html.includes(SCRIPT_BLOCK_PLACEHOLDER)) {
    html = html.replace(SCRIPT_BLOCK_PLACEHOLDER, scriptEntries.map(inlineScriptBlock).join("\n"));
  } else {
    for (const script of scriptEntries) {
      const placeholder = `<!-- ZOIA_BUILD_SCRIPT:${sourceDataPath(script.path)} -->`;
      if (!html.includes(placeholder)) {
        throw new Error(`Missing script placeholder: ${placeholder}`);
      }
      html = html.replace(placeholder, script.content.trimEnd());
    }
  }

  await mkdir(dirname(repoPath(sourceManifest.prebuiltHtml)), { recursive: true });
  await writeFile(repoPath(sourceManifest.prebuiltHtml), html, "utf8");
  await writeFile(repoPath(sourceManifest.compatibilityHtml), html, "utf8");

  const inputs = [
    {
      role: "source-manifest",
      path: "products/zoia/src/data/exhibit-manifest.json",
      sha256: sha256Text(manifestText),
    },
    {
      role: "template",
      path: sourceManifest.template,
      sha256: await hashFile(sourceManifest.template),
    },
    ...(await Promise.all(
      sourceManifest.styles.map(async (stylePath) => ({
        role: "style",
        path: stylePath,
        sha256: await hashFile(stylePath),
      })),
    )),
    ...(await Promise.all(
      sourceManifest.scripts.map(async (scriptPath) => ({
        role: "script",
        path: scriptPath,
        sha256: await hashFile(scriptPath),
      })),
    )),
  ];
  if (sourceManifest.embeddedTestPatches?.enabled) {
    inputs.push({
      role: "embedded-test-patch-manifest",
      path: sourceManifest.embeddedTestPatches.manifest,
      sha256: embeddedTestPatches.manifestHash,
      patchCount: embeddedTestPatches.patchCount,
      byteCount: embeddedTestPatches.byteCount,
    });
  }
  const prebuiltHash = await hashFile(sourceManifest.prebuiltHtml);
  const compatibilityHash = await hashFile(sourceManifest.compatibilityHtml);
  const buildManifest = {
    schemaVersion: "zoia.exhibit-build-manifest.v2",
    generatedAt: new Date().toISOString(),
    sourceManifest: "products/zoia/src/data/exhibit-manifest.json",
    prebuiltHtml: sourceManifest.prebuiltHtml,
    compatibilityHtml: sourceManifest.compatibilityHtml,
    inputs,
    prebuiltSha256: prebuiltHash,
    compatibilitySha256: compatibilityHash,
    status: prebuiltHash === compatibilityHash ? "pass" : "fail",
  };

  await writeFile(BUILD_MANIFEST_PATH, `${JSON.stringify(buildManifest, null, JSON_SPACES)}\n`, "utf8");
  console.log(JSON.stringify(buildManifest, null, JSON_SPACES));

  if (buildManifest.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
