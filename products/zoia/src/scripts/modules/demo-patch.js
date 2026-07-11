// === demo-patch.js ===
// Hardcoded demo patch data
// Grid is 8 cols x 5 rows. position = row * 8 + col.
// Each module occupies consecutive buttons (one per block).
window.ZOIA = window.ZOIA || {};

ZOIA.createDemoPatch = function() {
  var DB = ZOIA.MODULE_DB;

  // Row 0 (positions 0-7): Audio chain
  // Audio In (stereo, 2 blocks) at pos 0-1
  // VCA (mono, 3 blocks: audio_in, level, audio_out) at pos 2-4
  // SV Filter (1in/1out, 4 blocks: audio_in, freq, res, output) at pos 5-8 (wraps to row 1 col 0)
  // Actually let's use a simpler filter config:
  // SV Filter variant 1 = 4 blocks: [Audio In, Freq, Res, Output]

  // Row 0: Audio In (2) + VCA (3) + SV Filter 1out (4) = 9 blocks -> wraps at col 8
  // Better layout:
  // Row 0: Audio In(2 blocks, pos 0-1) + gap + VCA(3 blocks, pos 3-5) + gap
  // Row 1: SV Filter 1out(4 blocks, pos 8-11) + Audio Out mono(2 blocks, pos 13-14)
  // Row 2: LFO(2 blocks, pos 16-17) + Multiplier(3 blocks, pos 18-20) + Value(1 block, pos 21)
  // Row 3: ADSR(6 blocks, pos 24-29)
  // Row 4: Stompswitch(1 block, pos 32) + Pixel(1 block, pos 33)

  var m = [
    // idx 0: Audio Input (stereo) - 2 blocks at row 0
    { idx:0, typeIdx:1, page:0, colorId:5, gridPos:0,
      name:"Main Input", typeName:"Audio Input",
      blocks: DB[1].blocks, blockCount: 2,
      category:"Interface", params:[], options:[1,0,0,0,0,0,0,0], paramCount:0 },

    // idx 1: VCA (mono) - 3 blocks: [Audio In, Level, Audio Out]
    { idx:1, typeIdx:7, page:0, colorId:2, gridPos:3,
      name:"Trem VCA", typeName:"VCA",
      blocks: DB[7].blocks, blockCount: 3,
      category:"Audio", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 2: SV Filter (1in/1out variant) - 4 blocks
    { idx:2, typeIdx:0, page:0, colorId:4, gridPos:8,
      name:"Tone Shaper", typeName:"SV Filter",
      blocks: DB[0].variants[1], blockCount: 4,
      category:"Audio", params:[], options:[1,0,0,0,0,0,0,0], paramCount:0 },

    // idx 3: Audio Output (mono) - 2 blocks
    { idx:3, typeIdx:2, page:0, colorId:5, gridPos:13,
      name:"Main Output", typeName:"Audio Output",
      blocks: DB[2].variants[0], blockCount: 2,
      category:"Interface", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 4: LFO - 2 blocks: [Output, Rate]
    { idx:4, typeIdx:5, page:0, colorId:1, gridPos:16,
      name:"Trem LFO", typeName:"LFO",
      blocks: DB[5].blocks, blockCount: 2,
      category:"CV", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 5: Multiplier - 3 blocks: [In1, In2, Output]
    { idx:5, typeIdx:22, page:0, colorId:1, gridPos:18,
      name:"Depth Scaler", typeName:"Multiplier",
      blocks: DB[22].blocks, blockCount: 3,
      category:"CV", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 6: Value (depth control) - 1 block
    { idx:6, typeIdx:45, page:0, colorId:8, gridPos:21,
      name:"Trem Depth", typeName:"Value",
      blocks: DB[45].blocks, blockCount: 1,
      category:"CV", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 7: ADSR - 6 blocks at row 3
    { idx:7, typeIdx:6, page:0, colorId:3, gridPos:24,
      name:"Filter Env", typeName:"ADSR",
      blocks: DB[6].blocks, blockCount: 6,
      category:"CV", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 8: Stompswitch - 1 block at row 4
    { idx:8, typeIdx:44, page:0, colorId:3, gridPos:32,
      name:"Gate Trig", typeName:"Stompswitch",
      blocks: DB[44].blocks, blockCount: 1,
      category:"Interface", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },

    // idx 9: Pixel (LED feedback for stomp) - 1 block
    { idx:9, typeIdx:58, page:0, colorId:3, gridPos:33,
      name:"Stomp LED", typeName:"Pixel",
      blocks: DB[58].blocks, blockCount: 1,
      category:"Interface", params:[], options:[0,0,0,0,0,0,0,0], paramCount:0 },
  ];

  var c = [
    // Audio chain: Audio In L -> VCA Audio In
    { srcMod:0, srcBlock:0, dstMod:1, dstBlock:0, strength:10000 },
    // VCA Audio Out -> SV Filter Audio In
    { srcMod:1, srcBlock:2, dstMod:2, dstBlock:0, strength:10000 },
    // SV Filter Output -> Audio Out Input
    { srcMod:2, srcBlock:3, dstMod:3, dstBlock:0, strength:10000 },

    // Modulation: LFO Output -> Multiplier In1
    { srcMod:4, srcBlock:0, dstMod:5, dstBlock:0, strength:10000 },
    // Value CV Out -> Multiplier In2 (depth control)
    { srcMod:6, srcBlock:0, dstMod:5, dstBlock:1, strength:7000 },
    // Multiplier Output -> VCA Level (tremolo effect)
    { srcMod:5, srcBlock:2, dstMod:1, dstBlock:1, strength:8000 },

    // Envelope: ADSR CV Out -> SV Filter Frequency
    { srcMod:7, srcBlock:0, dstMod:2, dstBlock:1, strength:6000 },
    // Gate: Stompswitch -> ADSR Gate
    { srcMod:8, srcBlock:0, dstMod:7, dstBlock:1, strength:10000 },
    // Feedback: Stompswitch -> Pixel (LED shows stomp state)
    { srcMod:8, srcBlock:0, dstMod:9, dstBlock:0, strength:10000 },
  ];

  return {
    name: "Demo: Tremolo + Filter",
    moduleCount: m.length,
    modules: m,
    connections: c,
    pages: ["Main"]
  };
};

ZOIA.loadDemo = function() {
  ZOIA.loadPatch(ZOIA.createDemoPatch());
};

/**
 * Create a trivial initial patch: Audio Input (stereo) -> Audio Output (stereo).
 * This is the default loaded on startup so the test tone works immediately.
 */
ZOIA.createInitialPatch = function() {
  var DB = ZOIA.MODULE_DB;

  var m = [
    // idx 0: Audio Input (stereo) — 2 blocks at row 0, pos 0-1
    { idx:0, typeIdx:1, page:0, colorId:5, gridPos:0,
      name:"Main Input", typeName:"Audio Input",
      blocks: DB[1].blocks, blockCount: 2,
      category:"Interface", params:[], options:[1,0,0,0,0,0,0,0], paramCount:0 },

    // idx 1: Audio Output (stereo) — 3 blocks at row 0, pos 3-5
    { idx:1, typeIdx:2, page:0, colorId:5, gridPos:3,
      name:"Main Output", typeName:"Audio Output",
      blocks: DB[2].blocks, blockCount: 3,
      category:"Interface", params:[0, 0, 65535], options:[1,0,0,0,0,0,0,0], paramCount:3 }
  ];

  var c = [
    // Audio In Left -> Audio Out Left
    { srcMod:0, srcBlock:0, dstMod:1, dstBlock:0, strength:10000 },
    // Audio In Right -> Audio Out Right
    { srcMod:0, srcBlock:1, dstMod:1, dstBlock:1, strength:10000 }
  ];

  return {
    name: "Audio Passthrough",
    moduleCount: m.length,
    modules: m,
    connections: c,
    pages: ["Main"]
  };
};

ZOIA.loadInitial = function() {
  ZOIA.loadPatch(ZOIA.createInitialPatch());
};


