import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  SSL_SHARED_CANDIDATES,
  SSL_SHARED_PACKAGE_VERSION,
  SSL_SHARED_REBASELINE_POLICY,
} from '@zoia/shared-ssl';

const PROJECT_ROOT = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SSL_SHARED_ROOT = path.resolve('G:/Projects/MusicAndMidi/SuperSynthLab/RecoveredSource/SSLS-from-exhibit-2026-06-07/monorepo-skeleton/shared/assets');
const SSLI_ASSET_ROOT = path.resolve('G:/Projects/MusicAndMidi/SuperSynthLab/RecoveredSource/SSL-process-rebuild-2026-06-07/products/ssli/assets');
const EVIDENCE_ROOT = path.join(PROJECT_ROOT, 'TestWorkflow/evidence/q107-ssl-shared-library-rebaseline-proof');
const RESULT_PATH = path.join(EVIDENCE_ROOT, 'run-result.json');
const ACTIVE_EXHIBIT = path.join(PROJECT_ROOT, 'ZOIA emulator/ZOIA_Patch_Simulator_v5_2_21_2026.html');
const ACTIVE_SCAN_ROOTS = [
  path.join(PROJECT_ROOT, 'ZOIA emulator'),
  path.join(PROJECT_ROOT, 'ParserHarness'),
  path.join(PROJECT_ROOT, 'TestWorkflow/playwright'),
  path.join(PROJECT_ROOT, 'package.json'),
];

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.json', '.md', '.ps1']);
const EXCLUDED_SEGMENTS = new Set(['node_modules', 'Reports', 'evidence']);
const ACTIVE_REFERENCE_PATTERNS = [
  'SuperSynthLab',
  'SSLS-from-exhibit',
  'SSL-process-rebuild',
  'shared/assets',
  'audio-engine.js',
  'delay.js',
  'reverb.js',
  'filter.js',
  'filters.js',
  'midi.js',
  'keyboard.js',
  'ringmod-engine.js',
];
const CANDIDATE_FILES = [
  'audio-engine.js',
  'constants.js',
  'delay.js',
  'reverb.js',
  'filter.js',
  'filters.js',
  'gate.js',
  'gated-reverb.js',
  'chorus.js',
  'stutterstep.js',
  'midi.js',
  'keyboard.js',
  'ringmod-engine.js',
];

function normalizeForReport(filePath) {
  return path.resolve(filePath);
}

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { path: normalizeForReport(filePath), exists: false };
  }
  const bytes = fs.readFileSync(filePath);
  const stat = fs.statSync(filePath);
  return {
    path: normalizeForReport(filePath),
    exists: true,
    sizeBytes: stat.size,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    modifiedTime: stat.mtime.toISOString(),
  };
}

function shouldSkipDirectory(dirPath) {
  return dirPath.split(path.sep).some((segment) => EXCLUDED_SEGMENTS.has(segment));
}

function listTextFiles(rootPath) {
  if (fs.statSync(rootPath).isFile()) {
    return TEXT_EXTENSIONS.has(path.extname(rootPath)) ? [rootPath] : [];
  }
  const pending = [rootPath];
  const files = [];
  while (pending.length) {
    const current = pending.pop();
    if (shouldSkipDirectory(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(entryPath);
      }
    }
  }
  return files.sort();
}

function collectReferences() {
  const references = [];
  const activeFiles = ACTIVE_SCAN_ROOTS.flatMap((scanRoot) => listTextFiles(scanRoot));
  for (const filePath of activeFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const pattern of ACTIVE_REFERENCE_PATTERNS) {
      lines.forEach((line, index) => {
        if (line.includes(pattern)) {
          references.push({
            file: normalizeForReport(filePath),
            line: index + 1,
            pattern,
            text: line.trim(),
          });
        }
      });
    }
  }
  return references;
}

function collectCandidateHashes(rootPath) {
  return CANDIDATE_FILES.map((fileName) => hashFile(path.join(rootPath, fileName)));
}

function main() {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const activeReferences = collectReferences();
  const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const runtimeDependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const sharedDependency = runtimeDependencies['@zoia/shared-ssl'] ?? null;
  const sharedCandidates = collectCandidateHashes(SSL_SHARED_ROOT);
  const ssliCandidates = collectCandidateHashes(SSLI_ASSET_ROOT);
  const packageCandidateHashes = SSL_SHARED_CANDIDATES.map((candidate) => ({
    ...candidate,
    packageAsset: hashFile(path.join(PROJECT_ROOT, 'SharedSSL/zoia-shared-ssl/browser-assets', candidate.name)),
    sourceAsset: hashFile(candidate.sourcePath),
  }));
  const packageCandidatesPass = packageCandidateHashes.every(
    (candidate) =>
      candidate.packageAsset.exists &&
      candidate.packageAsset.sha256 === candidate.sourceSha256 &&
      (!candidate.sourceAsset.exists || candidate.sourceAsset.sha256 === candidate.sourceSha256),
  );
  const hasSharedDependency = sharedDependency !== null;
  const status = hasSharedDependency && packageCandidatesPass ? 'pass' : 'blocked';
  const result = {
    status,
    blocker:
      status === 'pass'
        ? null
        : 'No active ZOIA import or package dependency on shared SSL source is present, or migrated package asset hashes do not match source provenance.',
    generatedAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    activeExhibit: hashFile(ACTIVE_EXHIBIT),
    packageJson: hashFile(path.join(PROJECT_ROOT, 'package.json')),
    runtimeDependencies,
    devDependencies,
    sharedDependency,
    sharedPackageVersion: SSL_SHARED_PACKAGE_VERSION,
    sharedPackagePolicy: SSL_SHARED_REBASELINE_POLICY,
    packageCandidateHashes,
    activeReferenceCount: activeReferences.length,
    activeScanRoots: ACTIVE_SCAN_ROOTS.map((scanRoot) => normalizeForReport(scanRoot)),
    activeReferences,
    sharedCandidateRoot: SSL_SHARED_ROOT,
    sharedCandidates,
    ssliCandidateRoot: SSLI_ASSET_ROOT,
    ssliCandidates,
    proofConclusion: {
      currentState: status === 'pass' ? 'first-shared-ssl-package-rebaseline-slice-present' : 'not-rebaselined-on-shared-ssl-library',
      evidence: [
        hasSharedDependency
          ? 'package.json declares @zoia/shared-ssl as a local file dependency.'
          : 'package.json has no runtime dependency on a shared SSL package or local file dependency.',
        packageCandidatesPass
          ? 'migrated package assets match source hashes recorded in @zoia/shared-ssl provenance.'
          : 'one or more migrated package assets does not match source provenance.',
        'active source search found SuperSynthLab comments in the exhibit but no direct HTML runtime import of shared SSL browser assets.',
        'candidate shared SSL and SSLI source files remain hashed for review.',
      ],
      nextRequiredDecision:
        'Approve the next rebaseline slice: convert one browser-global shared candidate into an exhibit-loadable module/build artifact and prove Q104-Q106 gates remain green.',
    },
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(RESULT_PATH);
}

main();
