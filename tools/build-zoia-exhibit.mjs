import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const MANIFEST_PATH = resolve(REPO_ROOT, "products", "zoia", "src", "data", "exhibit-manifest.json");
const BUILD_MANIFEST_PATH = resolve(REPO_ROOT, "products", "zoia", "dist", "build-manifest.json");
const JSON_SPACES = 2;

function repoPath(relativePath) {
  return resolve(REPO_ROOT, relativePath);
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function hashFile(relativePath) {
  return sha256Text(await readText(relativePath));
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

  let html = template;
  for (const style of styleEntries) {
    html = html.replace(`<!-- ZOIA_BUILD_STYLE:${style.path.replace("products/zoia/", "")} -->`, style.content.trimEnd());
  }
  for (const script of scriptEntries) {
    html = html.replace(`<!-- ZOIA_BUILD_SCRIPT:${script.path.replace("products/zoia/", "")} -->`, script.content.trimEnd());
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
