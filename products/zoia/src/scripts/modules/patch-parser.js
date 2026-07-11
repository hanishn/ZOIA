// === patch-parser.js ===
// Binary .bin patch file parser
window.ZOIA = window.ZOIA || {};

var ZOIA_TYPE_QUANTIZER = 70;
var ZOIA_QUANTIZER_BLOCK_COUNT = 2;
var ZOIA_TYPE_DELAY_LINE = 13;
var ZOIA_DELAY_LINE_HW_AUDIO_OUT_BLOCK = 2;
var ZOIA_DELAY_LINE_EXHIBIT_AUDIO_OUT_BLOCK = 4;
var ZOIA_CONNECTION_ROLE_SOURCE = "source";
var ZOIA_CONNECTION_ROLE_DESTINATION = "destination";

// Hardware type ID -> Exhibit type ID reverse mapping.
// .bin files from build_all.py use real ZOIA firmware type IDs which differ
// from the exhibit MODULE_DB keys. This map converts them back so that
// resolveBlocks() finds the correct block layout.
// Only contains the 22 non-colliding HW->exhibit mappings. All exhibit types
// in _COLLISION_EXHIBIT_TYPES (17 types) are written directly to .bin by the
// converter, so no reverse mapping is needed for them.
ZOIA._HW_TO_EXHIBIT = {
  8: 84, 19: 20, 21: 121, 22: 21, 27: 105, 28: 90,
  29: 61, 30: 62, 37: 55, 39: 92, 41: 71,
  45: 96, 50: 22, 56: 100, 59: 51, 67: 27, 69: 28, 70: 29,
  71: 30, 74: 69, 75: 26, 81: 48,
  104: 46
};

// Exhibit type IDs that are written DIRECTLY to .bin files (not remapped by
// the converter) but whose value collides with a key in _HW_TO_EXHIBIT.
// The parser must NOT remap these types -- they are already exhibit types.
ZOIA._NO_REMAP_TYPES = {
  8:1, 19:1, 37:1, 39:1, 45:1, 50:1, 67:1, 81:1, 104:1
};

ZOIA.shouldSkipTypeRemap = function(typeIdx, paramCount, parsedName) {
  // Type 70 is Quantizer in canonical Test_Modules sidecars, but it can also
  // be a hardware Chorus ID that must remap to exhibit type 29.
  return typeIdx === ZOIA_TYPE_QUANTIZER &&
    paramCount === ZOIA_QUANTIZER_BLOCK_COUNT &&
    /^quantizer$/i.test(parsedName || "");
};

// Reverse block remap: for each exhibit type, maps hardware block index back
// to exhibit block index. Built by inverting convert_exhibit_to_bin.py BLOCK_REMAP.
// Only contains entries for non-collision exhibit types that still get
// type+block remapped by the converter.
ZOIA._HW_BLOCK_TO_EXHIBIT = {
  20: {0:0, 4:1},
  21: {0:0, 1:1, 8:2},
  26: {0:0, 2:1, 3:2, 8:3},
  27: {0:0, 2:1, 3:2, 4:3, 6:4},
  28: {0:0, 2:1, 3:2, 4:3, 9:4},
  29: {0:0, 2:1, 3:2, 4:3, 8:4},
  30: {0:0, 2:1, 3:2, 6:3},
  46: {0:0, 1:1, 2:2, 16:3},
  51: {0:0, 1:1, 2:2},
  55: {0:0, 1:1, 3:2, 4:3},
  61: {0:0, 2:1, 3:2, 4:3, 5:4},
  62: {0:0, 1:1, 2:2, 3:3, 6:4},
  69: {0:0, 2:1, 3:2, 6:3, 4:4, 5:5},
  71: {0:0, 2:1, 3:2, 6:3},
  96: {1:0},
  100: {1:0},
  // Type 67 (Ghostverb) uses same HW block layout as type 27 (Shimmer).
  // Needed because exhibit type 27 -> HW 67 in converter, and _NO_REMAP_TYPES
  // blocks the reverse remap, so the parser keeps type 67.
  67: {0:0, 2:1, 3:2, 4:3, 6:4}
};

ZOIA._HW_SRC_BLOCK_TO_EXHIBIT = {};
ZOIA._HW_SRC_BLOCK_TO_EXHIBIT[ZOIA_TYPE_DELAY_LINE] = {};
ZOIA._HW_SRC_BLOCK_TO_EXHIBIT[ZOIA_TYPE_DELAY_LINE][ZOIA_DELAY_LINE_HW_AUDIO_OUT_BLOCK] = ZOIA_DELAY_LINE_EXHIBIT_AUDIO_OUT_BLOCK;

ZOIA.findOnlyCompatibleBlock = function(mod, role) {
  if (!mod || !mod.blocks) return null;
  var match = null;
  for (var i = 0; i < mod.blocks.length; i++) {
    var type = mod.blocks[i] && mod.blocks[i].t ? mod.blocks[i].t : "";
    var compatible = role === ZOIA_CONNECTION_ROLE_SOURCE ? /_out$/.test(type) : /_in$/.test(type);
    if (!compatible) continue;
    if (match !== null) return null;
    match = i;
  }
  return match;
};

ZOIA.normalizeMissingConnectionBlock = function(mod, blockIdx, role) {
  if (!mod || !mod.blocks || mod.blocks[blockIdx]) return blockIdx;
  var onlyCompatibleBlock = ZOIA.findOnlyCompatibleBlock(mod, role);
  return onlyCompatibleBlock === null ? blockIdx : onlyCompatibleBlock;
};

ZOIA.parsePatch = function(buf) {
  ZOIA.log('Parsing patch: ' + buf.byteLength + ' bytes');
  var dv = new DataView(buf);
  var off = 0;
  function r32() { var v = dv.getUint32(off, true); off += 4; return v; }
  function rStr(len) {
    var s = "";
    for (var i = 0; i < len; i++) {
      var c = dv.getUint8(off + i);
      if (c === 0) break; // null-terminated
      // Only accept printable ASCII (32-126)
      if (c >= 32 && c <= 126) s += String.fromCharCode(c);
    }
    off += len;
    return s.trim();
  }

  var presetSize = r32();
  ZOIA.log('Preset size: ' + presetSize);
  var name = rStr(16);
  ZOIA.log('Name: "' + name + '"');
  var moduleCount = r32();
  ZOIA.log('Module count: ' + moduleCount);

  var modules = [];
  var moduleTrace = [];
  for (var i = 0; i < moduleCount; i++) {
    var modStart = off;
    var modSize = r32();
    var typeIdx = r32();
    var version = r32();
    var page = r32();
    var colorId = r32();
    var gridPos = r32();
    var paramCount = r32();
    var savedDataSize = r32();
    var opt1 = r32();
    var opt2 = r32();
    var params = [];
    for (var p = 0; p < paramCount; p++) params.push(r32());

    // modSize tells us total module size in uint32 words. Use that to find the end.
    var expectedEnd = modStart + modSize * 4;
    // Module name is the last 16 bytes before expectedEnd
    var nameStart = expectedEnd - 16;
    if (nameStart > off) {
      off = nameStart;
    }
    var modName = rStr(16);
    // Correct offset if needed
    if (off !== expectedEnd) {
      off = expectedEnd;
    }

    // Remap hardware type IDs to exhibit type IDs (for .bin files from build_all.py).
    // Skip remapping for types in _NO_REMAP_TYPES — these are exhibit type IDs
    // that the converter writes directly to .bin (not remapped to HW types) but
    // whose value collides with a key in _HW_TO_EXHIBIT.
    var hwTypeIdx = typeIdx;
    var remappedTypeIdx = typeIdx;
    var remapped = false;
    var skipEvidenceRemap = ZOIA.shouldSkipTypeRemap(typeIdx, paramCount, modName);
    if (ZOIA._HW_TO_EXHIBIT[typeIdx] !== undefined && !ZOIA._NO_REMAP_TYPES[typeIdx] && !skipEvidenceRemap) {
      typeIdx = ZOIA._HW_TO_EXHIBIT[typeIdx];
      remappedTypeIdx = typeIdx;
      remapped = true;
      ZOIA.log('  Remapped HW type ' + hwTypeIdx + ' -> exhibit type ' + typeIdx);
    }
    var dbEntry = ZOIA.MODULE_DB[typeIdx];
    var optBytes = [opt1 & 0xff, (opt1 >> 8) & 0xff, (opt1 >> 16) & 0xff, (opt1 >> 24) & 0xff,
                    opt2 & 0xff, (opt2 >> 8) & 0xff, (opt2 >> 16) & 0xff, (opt2 >> 24) & 0xff];
    // For unknown modules, use paramCount as a block count hint (each param ~ 1 block)
    var blockHint = paramCount > 0 ? paramCount : 1;
    var resolvedBlocks = ZOIA.resolveBlocks(typeIdx, optBytes, blockHint);

    // Build display name: use parsed name if valid, else generate from DB
    var displayName = modName;
    if (!displayName || displayName.length === 0) {
      displayName = dbEntry ? dbEntry.name + ' ' + (i + 1) : "Module #" + typeIdx;
    }

    modules.push({
      idx: i, typeIdx: typeIdx, version: version, page: page,
      rawTypeIdx: hwTypeIdx,
      remappedTypeIdx: remappedTypeIdx,
      typeRemapped: remapped,
      colorId: Math.max(1, Math.min(15, colorId)),
      gridPos: gridPos, paramCount: paramCount, params: params,
      name: displayName,
      typeName: dbEntry ? dbEntry.name : "Type " + typeIdx,
      blocks: resolvedBlocks,
      blockCount: resolvedBlocks.length,
      category: dbEntry ? dbEntry.cat : "Unknown",
      options: optBytes
    });
    moduleTrace.push({
      idx: i,
      offset: modStart,
      sizeWords: modSize,
      expectedEnd: expectedEnd,
      rawTypeIdx: hwTypeIdx,
      remappedTypeIdx: remappedTypeIdx,
      typeRemapped: remapped,
      page: page,
      gridPos: gridPos,
      paramCount: paramCount,
      savedDataSize: savedDataSize,
      optionWords: [opt1, opt2],
      blockCount: resolvedBlocks.length,
      dbKnown: !!dbEntry,
      parsedName: modName,
      displayName: displayName
    });

    if (i < 8) ZOIA.log('  Mod ' + i + ': "' + displayName + '" type=' + typeIdx + (dbEntry ? ' (' + dbEntry.name + ')' : ' (unknown)') + ' pos=' + gridPos + ' page=' + page + ' blocks=' + resolvedBlocks.length + ' params=' + paramCount);
  }
  if (moduleCount > 8) ZOIA.log('  ... (' + (moduleCount - 8) + ' more modules)');

  var connCount = r32();
  ZOIA.log('Connection count: ' + connCount);
  var connections = [];
  var connectionTrace = [];
  for (var j = 0; j < connCount; j++) {
    var srcMod = r32(), srcBlock = r32(), dstMod = r32(), dstBlock = r32(), strength = r32();
    var rawSrcBlock = srcBlock;
    var rawDstBlock = dstBlock;
    // Reverse-remap hardware block indices to exhibit block indices
    if (srcMod < modules.length) {
      var srcTypeIdx = modules[srcMod].typeIdx;
      var sourceOnlyRemap = ZOIA._HW_SRC_BLOCK_TO_EXHIBIT[srcTypeIdx];
      if (sourceOnlyRemap && sourceOnlyRemap[srcBlock] !== undefined) {
        srcBlock = sourceOnlyRemap[srcBlock];
      }
      var srcRemap = ZOIA._HW_BLOCK_TO_EXHIBIT[srcTypeIdx];
      if (srcRemap && srcRemap[srcBlock] !== undefined) {
        srcBlock = srcRemap[srcBlock];
      }
      srcBlock = ZOIA.normalizeMissingConnectionBlock(modules[srcMod], srcBlock, ZOIA_CONNECTION_ROLE_SOURCE);
    }
    if (dstMod < modules.length) {
      var dstRemap = ZOIA._HW_BLOCK_TO_EXHIBIT[modules[dstMod].typeIdx];
      if (dstRemap && dstRemap[dstBlock] !== undefined) {
        dstBlock = dstRemap[dstBlock];
      }
      dstBlock = ZOIA.normalizeMissingConnectionBlock(modules[dstMod], dstBlock, ZOIA_CONNECTION_ROLE_DESTINATION);
    }
    connections.push({
      srcMod: srcMod, srcBlock: srcBlock,
      dstMod: dstMod, dstBlock: dstBlock,
      strength: strength
    });
    connectionTrace.push({
      idx: j,
      srcMod: srcMod,
      rawSrcBlock: rawSrcBlock,
      srcBlock: srcBlock,
      dstMod: dstMod,
      rawDstBlock: rawDstBlock,
      dstBlock: dstBlock,
      strength: strength
    });
  }

  var pages = ["Page 1"];
  try {
    var pageCount = r32();
    ZOIA.log('Page count: ' + pageCount);
    if (pageCount > 0 && pageCount <= 64) {
      pages = [];
      for (var k = 0; k < pageCount; k++) pages.push(rStr(16) || ("Page " + (k + 1)));
    }
  } catch (e) {
    ZOIA.log('Page read note (ok for some patches): ' + e.message);
  }

  ZOIA.log('Parse complete: ' + modules.length + ' modules, ' + connections.length + ' connections, ' + pages.length + ' pages');
  return {
    name: name,
    moduleCount: moduleCount,
    modules: modules,
    connections: connections,
    pages: pages,
    trace: {
      schemaVersion: "zoia.import-trace.v1",
      byteLength: buf.byteLength,
      presetSize: presetSize,
      patchName: name,
      moduleCount: moduleCount,
      connectionCount: connCount,
      pageCount: pages.length,
      modules: moduleTrace,
      connections: connectionTrace,
      finalOffset: off
    }
  };
};


