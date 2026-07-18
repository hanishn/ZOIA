#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const STAGED_FIXTURE_ROOT =
  "G:\\Projects\\MigrationProcess\\ArchiveExtractionStaging\\2026-07-06\\zoia_emulator_v4.0\\backup_2026-02-20_v4.0.54\\Test_Modules";

const DEFAULT_CATEGORIES = ["_prototype", "A_Reverbs"];

const BYTE_MASK = 0xff;
const BITS_PER_BYTE = 8;
const BYTES_PER_UINT32 = 4;
const OPTION_WORD_BYTE_WIDTH = 4;
const OPTION_BYTE_COUNT = 8;
const PATCH_NAME_BYTE_LENGTH = 16;
const MODULE_NAME_BYTE_LENGTH = 16;
const MIN_PRINTABLE_ASCII = 32;
const MAX_PRINTABLE_ASCII = 126;
const MIN_COLOR_ID = 1;
const MAX_COLOR_ID = 15;
const MIN_VALID_PAGE_COUNT = 1;
const MAX_VALID_PAGE_COUNT = 64;
const ZOIA_GRID_SIZE = 40;
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_MISMATCH_LIMIT = 50;
const SUCCESS_EXIT_CODE = 0;
const BLOCKED_EXIT_CODE = 1;
const ERROR_EXIT_CODE = 2;
const PROCESS_USER_ARG_OFFSET = 2;
const JSON_INDENT_SPACES = 2;

const HW_TYPE = Object.freeze({
  AUDIO_MULTIPLY: 8,
  CV_INVERT: 19,
  CV_DELAY: 22,
  SHIMMER: 67,
  HALL_REVERB_ALT: 75,
  VALUE_HW_COLLISION: 45,
  VALUE_EXHIBIT: 96,
  OD_DISTORTION_ALT: 50,
  PLATE_REVERB_ALT: 56,
  PHASER_ALT: 29,
  LOOPER_ALT: 30,
  PIXEL_ALT: 81,
  QUANTIZER_ALT: 104,
  MULTI_FILTER_ALT: 74,
  AUDIO_PANNER_ALT: 28,
  CHORUS_ALT: 70,
  VIBRATO_ALT: 71,
  SV_FILTER_ALT: 27,
  STEREO_SPREAD_ALT: 37,
  RING_MOD_ALT: 59,
  CV_FLIP_FLOP_ALT: 39,
  CV_RECTIFY_ALT: 41,
  CV_LOOPER_ALT: 69
});

const EXHIBIT_TYPE = Object.freeze({
  AUDIO_MULTIPLY: 84,
  CV_INVERT: 20,
  CV_DELAY: 21,
  SHIMMER: 27,
  HALL_REVERB: 26,
  VALUE: 96,
  OD_DISTORTION: 22,
  PLATE_REVERB: 100,
  PHASER: 61,
  LOOPER: 62,
  PIXEL: 48,
  QUANTIZER: 46,
  MULTI_FILTER: 69,
  AUDIO_PANNER: 90,
  CHORUS: 29,
  VIBRATO: 30,
  SV_FILTER: 105,
  STEREO_SPREAD: 55,
  RING_MOD: 51,
  CV_FLIP_FLOP: 92,
  CV_RECTIFY: 71,
  CV_LOOPER: 28
});

const BLOCK_INDEX = Object.freeze({
  ZERO: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  EIGHT: 8,
  NINE: 9,
  SIXTEEN: 16
});

const HW_TO_EXHIBIT = Object.freeze({
  [HW_TYPE.AUDIO_MULTIPLY]: EXHIBIT_TYPE.AUDIO_MULTIPLY,
  [HW_TYPE.CV_INVERT]: EXHIBIT_TYPE.CV_INVERT,
  [HW_TYPE.CV_DELAY]: EXHIBIT_TYPE.CV_DELAY,
  [HW_TYPE.SV_FILTER_ALT]: EXHIBIT_TYPE.SV_FILTER,
  [HW_TYPE.AUDIO_PANNER_ALT]: EXHIBIT_TYPE.AUDIO_PANNER,
  [HW_TYPE.PHASER_ALT]: EXHIBIT_TYPE.PHASER,
  [HW_TYPE.LOOPER_ALT]: EXHIBIT_TYPE.LOOPER,
  [HW_TYPE.STEREO_SPREAD_ALT]: EXHIBIT_TYPE.STEREO_SPREAD,
  [HW_TYPE.CV_FLIP_FLOP_ALT]: EXHIBIT_TYPE.CV_FLIP_FLOP,
  [HW_TYPE.CV_RECTIFY_ALT]: EXHIBIT_TYPE.CV_RECTIFY,
  [HW_TYPE.VALUE_HW_COLLISION]: EXHIBIT_TYPE.VALUE,
  [HW_TYPE.OD_DISTORTION_ALT]: EXHIBIT_TYPE.OD_DISTORTION,
  [HW_TYPE.PLATE_REVERB_ALT]: EXHIBIT_TYPE.PLATE_REVERB,
  [HW_TYPE.RING_MOD_ALT]: EXHIBIT_TYPE.RING_MOD,
  [HW_TYPE.SHIMMER]: EXHIBIT_TYPE.SHIMMER,
  [HW_TYPE.CV_LOOPER_ALT]: EXHIBIT_TYPE.CV_LOOPER,
  [HW_TYPE.CHORUS_ALT]: EXHIBIT_TYPE.CHORUS,
  [HW_TYPE.VIBRATO_ALT]: EXHIBIT_TYPE.VIBRATO,
  [HW_TYPE.MULTI_FILTER_ALT]: EXHIBIT_TYPE.MULTI_FILTER,
  [HW_TYPE.HALL_REVERB_ALT]: EXHIBIT_TYPE.HALL_REVERB,
  [HW_TYPE.PIXEL_ALT]: EXHIBIT_TYPE.PIXEL,
  [HW_TYPE.QUANTIZER_ALT]: EXHIBIT_TYPE.QUANTIZER
});

const HW_BLOCK_TO_EXHIBIT = Object.freeze({
  [EXHIBIT_TYPE.CV_INVERT]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.ONE },
  [EXHIBIT_TYPE.CV_DELAY]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.ONE]: BLOCK_INDEX.ONE, [BLOCK_INDEX.EIGHT]: BLOCK_INDEX.TWO },
  [EXHIBIT_TYPE.HALL_REVERB]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.EIGHT]: BLOCK_INDEX.THREE },
  [EXHIBIT_TYPE.SHIMMER]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.THREE, [BLOCK_INDEX.SIX]: BLOCK_INDEX.FOUR },
  [EXHIBIT_TYPE.CV_LOOPER]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.THREE, [BLOCK_INDEX.NINE]: BLOCK_INDEX.FOUR },
  [EXHIBIT_TYPE.CHORUS]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.THREE, [BLOCK_INDEX.EIGHT]: BLOCK_INDEX.FOUR },
  [EXHIBIT_TYPE.VIBRATO]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.SIX]: BLOCK_INDEX.THREE },
  [EXHIBIT_TYPE.QUANTIZER]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.ONE]: BLOCK_INDEX.ONE, [BLOCK_INDEX.TWO]: BLOCK_INDEX.TWO, [BLOCK_INDEX.SIXTEEN]: BLOCK_INDEX.THREE },
  [EXHIBIT_TYPE.RING_MOD]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.ONE]: BLOCK_INDEX.ONE, [BLOCK_INDEX.TWO]: BLOCK_INDEX.TWO },
  [EXHIBIT_TYPE.STEREO_SPREAD]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.ONE]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.THREE },
  [EXHIBIT_TYPE.PHASER]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.THREE, [BLOCK_INDEX.FIVE]: BLOCK_INDEX.FOUR },
  [EXHIBIT_TYPE.LOOPER]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.ONE]: BLOCK_INDEX.ONE, [BLOCK_INDEX.TWO]: BLOCK_INDEX.TWO, [BLOCK_INDEX.THREE]: BLOCK_INDEX.THREE, [BLOCK_INDEX.SIX]: BLOCK_INDEX.FOUR },
  [EXHIBIT_TYPE.MULTI_FILTER]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.SIX]: BLOCK_INDEX.THREE, [BLOCK_INDEX.FOUR]: BLOCK_INDEX.FOUR, [BLOCK_INDEX.FIVE]: BLOCK_INDEX.FIVE },
  [EXHIBIT_TYPE.CV_RECTIFY]: { [BLOCK_INDEX.ZERO]: BLOCK_INDEX.ZERO, [BLOCK_INDEX.TWO]: BLOCK_INDEX.ONE, [BLOCK_INDEX.THREE]: BLOCK_INDEX.TWO, [BLOCK_INDEX.SIX]: BLOCK_INDEX.THREE },
  [EXHIBIT_TYPE.VALUE]: { [BLOCK_INDEX.ONE]: BLOCK_INDEX.ZERO },
  [EXHIBIT_TYPE.PLATE_REVERB]: { [BLOCK_INDEX.ONE]: BLOCK_INDEX.ZERO }
});

function parseArgs(argv) {
  const args = { categories: DEFAULT_CATEGORIES, output: null, manifest: null, quarantine: null };
  for (let i = BLOCK_INDEX.ZERO; i < argv.length; i += MIN_COLOR_ID) {
    const arg = argv[i];
    if (arg === "--categories") args.categories = argv[(i += MIN_COLOR_ID)].split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg === "--output") args.output = argv[++i];
    else if (arg === "--manifest") args.manifest = argv[++i];
    else if (arg === "--quarantine") args.quarantine = argv[++i];
  }
  return args;
}

function fixtureKey(fixture) {
  return `${fixture.category}/${fixture.pairId}`;
}

function quarantineKey(entry) {
  return `${entry.category}/${entry.pairId}`;
}

function findQuarantineEntry(quarantineEntries, fixture) {
  const key = fixtureKey(fixture);
  return quarantineEntries.find((entry) => quarantineKey(entry) === key);
}

function quarantineMatches(entry, mismatches) {
  if (!entry) return false;
  if (!Array.isArray(entry.expectedMismatchPaths)) return false;
  const actualPaths = mismatches.map((mismatch) => mismatch.path).sort();
  const expectedPaths = entry.expectedMismatchPaths.slice().sort();
  if (actualPaths.length !== expectedPaths.length) return false;
  return actualPaths.every((pathName, index) => pathName === expectedPaths[index]);
}

function readU32(view, state) {
  const value = view.getUint32(state.offset, true);
  state.offset += BYTES_PER_UINT32;
  return value;
}

function readString(view, state, length) {
  let value = "";
  for (let i = BLOCK_INDEX.ZERO; i < length; i += MIN_COLOR_ID) {
    const c = view.getUint8(state.offset + i);
    if (c === BLOCK_INDEX.ZERO) break;
    if (c >= MIN_PRINTABLE_ASCII && c <= MAX_PRINTABLE_ASCII) value += String.fromCharCode(c);
  }
  state.offset += length;
  return value.trim();
}

function truncateForBinaryName(value) {
  return String(value ?? "").slice(BLOCK_INDEX.ZERO, PATCH_NAME_BYTE_LENGTH).trim();
}

function remapTypeId(typeIdx) {
  return Object.hasOwn(HW_TO_EXHIBIT, typeIdx) ? HW_TO_EXHIBIT[typeIdx] : typeIdx;
}

function remapBlockIndex(typeIdx, blockIdx) {
  const remap = HW_BLOCK_TO_EXHIBIT[typeIdx];
  return remap && Object.hasOwn(remap, blockIdx) ? remap[blockIdx] : blockIdx;
}

function optionWordsToBytes(opt1, opt2) {
  return [
    opt1 & BYTE_MASK,
    (opt1 >> BITS_PER_BYTE) & BYTE_MASK,
    (opt1 >> (BITS_PER_BYTE * BLOCK_INDEX.TWO)) & BYTE_MASK,
    (opt1 >> (BITS_PER_BYTE * BLOCK_INDEX.THREE)) & BYTE_MASK,
    opt2 & BYTE_MASK,
    (opt2 >> BITS_PER_BYTE) & BYTE_MASK,
    (opt2 >> (BITS_PER_BYTE * BLOCK_INDEX.TWO)) & BYTE_MASK,
    (opt2 >> (BITS_PER_BYTE * BLOCK_INDEX.THREE)) & BYTE_MASK
  ];
}

function normalizeLegacyInvalidModulePages(modules, pages) {
  if (!Array.isArray(modules) || modules.length === BLOCK_INDEX.ZERO || !Array.isArray(pages) || pages.length === BLOCK_INDEX.ZERO) return null;
  let invalidPage = null;
  for (const module of modules) {
    if (module.page < pages.length) return null;
    if (module.gridPos < ZOIA_GRID_SIZE || module.gridPos >= ZOIA_GRID_SIZE * BLOCK_INDEX.TWO) return null;
    if (invalidPage === null) invalidPage = module.page;
    if (module.page !== invalidPage) return null;
  }
  for (const module of modules) {
    module.rawPage = module.page;
    module.rawGridPos = module.gridPos;
    module.page = BLOCK_INDEX.ZERO;
    module.gridPos -= ZOIA_GRID_SIZE;
  }
  return invalidPage;
}

function parsePatch(buffer) {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const view = new DataView(arrayBuffer);
  const state = { offset: BLOCK_INDEX.ZERO };
  const diagnostics = [];
  const presetSizeWords = readU32(view, state);
  const name = readString(view, state, PATCH_NAME_BYTE_LENGTH);
  const moduleCount = readU32(view, state);
  const modules = [];

  for (let idx = BLOCK_INDEX.ZERO; idx < moduleCount; idx += MIN_COLOR_ID) {
    const moduleOffset = state.offset;
    const moduleSizeWords = readU32(view, state);
    const originalTypeIdx = readU32(view, state);
    const typeIdx = remapTypeId(originalTypeIdx);
    const version = readU32(view, state);
    const page = readU32(view, state);
    const colorId = Math.max(MIN_COLOR_ID, Math.min(MAX_COLOR_ID, readU32(view, state)));
    const gridPos = readU32(view, state);
    const paramCount = readU32(view, state);
    const savedDataSize = readU32(view, state);
    const opt1 = readU32(view, state);
    const opt2 = readU32(view, state);
    const params = [];
    for (let p = BLOCK_INDEX.ZERO; p < paramCount; p += MIN_COLOR_ID) params.push(readU32(view, state));

    const expectedEnd = moduleOffset + moduleSizeWords * BYTES_PER_UINT32;
    state.offset = Math.max(state.offset, expectedEnd - MODULE_NAME_BYTE_LENGTH);
    const parsedName = readString(view, state, MODULE_NAME_BYTE_LENGTH);
    state.offset = expectedEnd;
    const options = optionWordsToBytes(opt1, opt2);

    if (typeIdx !== originalTypeIdx) {
      diagnostics.push({
        severity: "info",
        code: "type-remap",
        moduleIndex: idx,
        originalTypeIdx,
        typeIdx,
        policy: "binary-import-canonical-type"
      });
    }

    modules.push({
      idx,
      typeIdx,
      originalTypeIdx,
      version,
      page,
      colorId,
      gridPos,
      name: parsedName,
      paramCount,
      params,
      options,
      savedDataSize,
      moduleSizeWords
    });
  }

  const connectionCount = readU32(view, state);
  const connections = [];
  for (let i = BLOCK_INDEX.ZERO; i < connectionCount; i += MIN_COLOR_ID) {
    const srcMod = readU32(view, state);
    let srcBlock = readU32(view, state);
    const dstMod = readU32(view, state);
    let dstBlock = readU32(view, state);
    const strength = readU32(view, state);
    srcBlock = modules[srcMod] ? remapBlockIndex(modules[srcMod].typeIdx, srcBlock) : srcBlock;
    dstBlock = modules[dstMod] ? remapBlockIndex(modules[dstMod].typeIdx, dstBlock) : dstBlock;
    connections.push({ srcMod, srcBlock, dstMod, dstBlock, strength });
  }

  let pages = [`Page ${DEFAULT_PAGE_NUMBER}`];
  if (state.offset + BYTES_PER_UINT32 <= view.byteLength) {
    const pageCount = readU32(view, state);
    if (pageCount >= MIN_VALID_PAGE_COUNT && pageCount <= MAX_VALID_PAGE_COUNT) {
      pages = [];
      for (let i = BLOCK_INDEX.ZERO; i < pageCount; i += MIN_COLOR_ID) pages.push(readString(view, state, PATCH_NAME_BYTE_LENGTH) || `Page ${i + DEFAULT_PAGE_NUMBER}`);
    } else {
      diagnostics.push({ severity: "warning", code: "invalid-page-count", pageCount });
    }
  }
  const invalidPage = normalizeLegacyInvalidModulePages(modules, pages);
  if (invalidPage !== null) {
    diagnostics.push({
      severity: "info",
      code: "legacy-invalid-module-page-normalized",
      rawPage: invalidPage,
      normalizedPage: BLOCK_INDEX.ZERO,
      gridPosOffset: ZOIA_GRID_SIZE,
      moduleCount: modules.length,
      pageCount: pages.length
    });
  }

  return {
    schemaVersion: "zoia.normalized.patch.v0",
    name,
    presetSizeWords,
    moduleCount,
    modules,
    connections,
    pages,
    diagnostics
  };
}

function structuralProjection(patch, options = {}) {
  const parsedReference = options.parsedReference;
  const moduleRemapFlags = [];
  const modules = patch.modules.map((m) => {
    const referenceModule = parsedReference?.modules?.[m.idx];
    const remappedTypeIdx = remapTypeId(m.typeIdx);
    const shouldNormalizeType = referenceModule && m.typeIdx !== referenceModule.typeIdx && remappedTypeIdx === referenceModule.typeIdx;
    moduleRemapFlags[m.idx] = shouldNormalizeType;
    const typeIdx = shouldNormalizeType ? remappedTypeIdx : m.typeIdx;
    return {
      idx: m.idx,
      typeIdx,
      page: m.page,
      colorId: m.colorId,
      gridPos: m.gridPos,
      name: m.name,
      paramCount: m.paramCount ?? m.params?.length ?? BLOCK_INDEX.ZERO,
      params: m.params,
      options: m.options
    };
  });
  const connections = patch.connections.map((connection) => ({
    srcMod: connection.srcMod,
    srcBlock: moduleRemapFlags[connection.srcMod] && modules[connection.srcMod] ? remapBlockIndex(modules[connection.srcMod].typeIdx, connection.srcBlock) : connection.srcBlock,
    dstMod: connection.dstMod,
    dstBlock: moduleRemapFlags[connection.dstMod] && modules[connection.dstMod] ? remapBlockIndex(modules[connection.dstMod].typeIdx, connection.dstBlock) : connection.dstBlock,
    strength: connection.strength
  }));
  return {
    name: parsedReference ? truncateForBinaryName(patch.name) : patch.name,
    moduleCount: patch.moduleCount,
    modules,
    connections,
    pages: patch.pages
  };
}

function compareValues(actual, expected, pathName, mismatches, limit = DEFAULT_MISMATCH_LIMIT) {
  if (mismatches.length >= limit) return;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      mismatches.push({ path: pathName, actual, expected, kind: "type" });
      return;
    }
    if (actual.length !== expected.length) mismatches.push({ path: `${pathName}.length`, actual: actual.length, expected: expected.length, kind: "length" });
    const count = Math.min(actual.length, expected.length);
    for (let i = BLOCK_INDEX.ZERO; i < count; i += MIN_COLOR_ID) compareValues(actual[i], expected[i], `${pathName}[${i}]`, mismatches, limit);
    return;
  }
  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    for (const key of keys) compareValues(actual[key], expected[key], `${pathName}.${key}`, mismatches, limit);
    return;
  }
  if (actual !== expected) mismatches.push({ path: pathName, actual, expected, kind: "value" });
}

function validateSchema(patch) {
  const errors = [];
  if (typeof patch.name !== "string") errors.push("patch.name must be a string");
  if (!Number.isInteger(patch.moduleCount)) errors.push("patch.moduleCount must be an integer");
  if (!Array.isArray(patch.modules)) errors.push("patch.modules must be an array");
  if (!Array.isArray(patch.connections)) errors.push("patch.connections must be an array");
  if (!Array.isArray(patch.pages)) errors.push("patch.pages must be an array");
  patch.modules.forEach((module, index) => {
    ["idx", "typeIdx", "page", "colorId", "gridPos", "paramCount"].forEach((field) => {
      if (!Number.isInteger(module[field])) errors.push(`modules[${index}].${field} must be an integer`);
    });
    if (!Array.isArray(module.params)) errors.push(`modules[${index}].params must be an array`);
    if (!Array.isArray(module.options) || module.options.length !== OPTION_BYTE_COUNT) errors.push(`modules[${index}].options must be ${OPTION_BYTE_COUNT} bytes`);
  });
  patch.connections.forEach((connection, index) => {
    ["srcMod", "srcBlock", "dstMod", "dstBlock", "strength"].forEach((field) => {
      if (!Number.isInteger(connection[field])) errors.push(`connections[${index}].${field} must be an integer`);
    });
  });
  return errors;
}

async function main() {
  const args = parseArgs(process.argv.slice(PROCESS_USER_ARG_OFFSET));
  if (!args.manifest) throw new Error("--manifest is required");
  const manifest = JSON.parse(await readFile(args.manifest, "utf8"));
  const quarantineEntries = args.quarantine
    ? JSON.parse(await readFile(args.quarantine, "utf8")).fixtures
    : [];
  const fixtures = manifest.fixtures.filter((fixture) => args.categories.includes(fixture.category));
  const results = [];
  for (const fixture of fixtures) {
    const bin = await readFile(fixture.binPath);
    const expected = JSON.parse(await readFile(fixture.jsonPath, "utf8"));
    const parsed = parsePatch(bin);
    const schemaErrors = validateSchema(parsed);
    const mismatches = [];
    compareValues(
      structuralProjection(parsed),
      structuralProjection(expected, { parsedReference: parsed }),
      "$",
      mismatches
    );
    const quarantineEntry = findQuarantineEntry(quarantineEntries, fixture);
    const isQuarantined = schemaErrors.length === BLOCK_INDEX.ZERO && mismatches.length > BLOCK_INDEX.ZERO && quarantineMatches(quarantineEntry, mismatches);
    const status = schemaErrors.length === BLOCK_INDEX.ZERO && mismatches.length === BLOCK_INDEX.ZERO
      ? "pass"
      : isQuarantined
        ? "quarantined"
        : "blocked";
    results.push({
      pairId: fixture.pairId,
      category: fixture.category,
      binPath: fixture.binPath,
      jsonPath: fixture.jsonPath,
      status,
      schemaErrors,
      mismatches,
      quarantine: isQuarantined ? quarantineEntry : null,
      diagnostics: parsed.diagnostics,
      parsedSummary: {
        name: parsed.name,
        moduleCount: parsed.moduleCount,
        connectionCount: parsed.connections.length,
        pageCount: parsed.pages.length
      }
    });
  }

  const summary = {
    schemaVersion: "zoia.fixture-runner.result.v0",
    generatedAt: new Date().toISOString(),
    fixtureRoot: STAGED_FIXTURE_ROOT,
    categories: args.categories,
    fixtureCount: results.length,
    passCount: results.filter((result) => result.status === "pass").length,
    quarantinedCount: results.filter((result) => result.status === "quarantined").length,
    blockedCount: results.filter((result) => result.status === "blocked").length,
    results
  };
  if (args.output) await writeFile(args.output, `${JSON.stringify(summary, null, JSON_INDENT_SPACES)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, JSON_INDENT_SPACES)}\n`);
  if (summary.blockedCount > BLOCK_INDEX.ZERO) process.exitCode = BLOCKED_EXIT_CODE;
  else process.exitCode = SUCCESS_EXIT_CODE;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = ERROR_EXIT_CODE;
});
