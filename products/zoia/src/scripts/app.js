// === module-db.js ===
/**
 * module-db.js — ZOIA Module Database and parameter formatting.
 *
 * Contains:
 *   - MODULE_DB: Lookup table mapping type index -> module definition
 *     (name, category, default block layout, and option-driven variants).
 *   - resolveBlocks(): Resolves the correct block configuration for a module
 *     given its firmware option bytes.
 *   - COLORS / COLOR_NAMES: Module color palette (matches ZOIA hardware).
 *   - PARAM_FORMATS: Pattern-based parameter formatting rules.
 *   - formatParam(): Converts a raw 0-1 parameter value into a display string.
 *   - CONN_STYLES: Visual styling for connection types in the grid/schematic.
 *
 * Block type conventions:
 *   audio_in / audio_out — audio-rate signals
 *   cv_in    / cv_out    — control voltage (0-1 or bipolar)
 *   gate_in  / gate_out  — binary on/off triggers
 *   unknown              — placeholder for unrecognized modules
 *
 * Everything is attached to the global window.ZOIA namespace (ES5).
 */
window.ZOIA = window.ZOIA || {};


// ===== MODULE DATABASE =====
// Keyed by firmware type index. Each entry has:
//   name     — display name
//   cat      — category (Audio, CV, Effect, Interface, MIDI)
//   blocks   — default block layout (array of {n: name, t: type})
//   variants — (optional) alternative block layouts keyed by option byte value

ZOIA.MODULE_DB = {

  // ----- Audio Processing -----
  0: {
    name: "SV Filter", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Frequency",t:"cv_in"},{n:"Resonance",t:"cv_in"},{n:"LP Out",t:"audio_out"},{n:"BP Out",t:"audio_out"},{n:"HP Out",t:"audio_out"}],
    variants: {
      // option[0]: 0=1in/3out, 1=1in/1out, 2=2in/2out (stereo)
      1: [{n:"Audio In",t:"audio_in"},{n:"Frequency",t:"cv_in"},{n:"Resonance",t:"cv_in"},{n:"Output",t:"audio_out"}],
      2: [{n:"L In",t:"audio_in"},{n:"R In",t:"audio_in"},{n:"Frequency",t:"cv_in"},{n:"Resonance",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
    }
  },
  7: {
    name: "VCA", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Level",t:"cv_in"},{n:"Audio Out",t:"audio_out"}],
    variants: {
      // option[0]: 0=mono(3 blocks), 1=stereo(5 blocks)
      1: [{n:"L In",t:"audio_in"},{n:"R In",t:"audio_in"},{n:"Level",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
    }
  },
  8: {
    name: "Audio Multiply", cat: "Audio",
    blocks: [{n:"In 1",t:"audio_in"},{n:"In 2",t:"audio_in"},{n:"Output",t:"audio_out"}]
  },
  9: {
    name: "Bit Crusher", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Bit Depth",t:"cv_in"},{n:"Rate",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  12: {
    name: "Tone Control", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Bass",t:"cv_in"},{n:"Mid",t:"cv_in"},{n:"Treble",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  13: {
    name: "Delay Line", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Time",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  14: {
    name: "Oscillator", cat: "Audio",
    blocks: [{n:"Frequency",t:"cv_in"},{n:"Output",t:"audio_out"}],
    variants: {
      1: [{n:"Frequency",t:"cv_in"},{n:"Duty Cycle",t:"cv_in"},{n:"Output",t:"audio_out"}]
    }
  },
  24: {
    name: "Multi Filter", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Frequency",t:"cv_in"},{n:"Resonance",t:"cv_in"},{n:"Output",t:"audio_out"},{n:"Gain",t:"cv_in"}]
  },
  38: {
    name: "Noise", cat: "Audio",
    blocks: [{n:"Output",t:"audio_out"}]
  },
  53: {
    name: "Stereo Spread", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Width",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  57: {
    name: "Audio Panner", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Pan",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  62: {
    name: "Looper", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Record",t:"gate_in"},{n:"Play",t:"gate_in"},{n:"Stop",t:"gate_in"},{n:"Audio Out",t:"audio_out"}]
  },
  64: {
    name: "Audio Balance", cat: "Audio",
    blocks: [{n:"In A",t:"audio_in"},{n:"In B",t:"audio_in"},{n:"Balance",t:"cv_in"},{n:"Output",t:"audio_out"}],
    variants: {
      1: [{n:"L In A",t:"audio_in"},{n:"R In A",t:"audio_in"},{n:"L In B",t:"audio_in"},{n:"R In B",t:"audio_in"},{n:"Balance",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
    }
  },
  65: {
    name: "Inverter", cat: "Audio",
    blocks: [{n:"Input",t:"audio_in"},{n:"Output",t:"audio_out"}]
  },
  73: {
    name: "EQ", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Low",t:"cv_in"},{n:"Mid",t:"cv_in"},{n:"High",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  76: {
    name: "Audio Mixer", cat: "Audio",
    blocks: [{n:"In 1",t:"audio_in"},{n:"Lvl 1",t:"cv_in"},{n:"In 2",t:"audio_in"},{n:"Lvl 2",t:"cv_in"},{n:"In 3",t:"audio_in"},{n:"Lvl 3",t:"cv_in"},{n:"Output",t:"audio_out"}]
  },
  78: {
    name: "Granular", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Position",t:"cv_in"},{n:"Grain Size",t:"cv_in"},{n:"Density",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  // Type 79 duplicates type 64 name; kept as-is from firmware
  79: {
    name: "Audio Balance", cat: "Audio",
    blocks: [{n:"In A",t:"audio_in"},{n:"In B",t:"audio_in"},{n:"Balance",t:"cv_in"},{n:"Output",t:"audio_out"}]
  },
  // Type 81: Pixel (hardware layout — has optional audio_in block)
  81: {
    name: "Pixel", cat: "Interface",
    blocks: [{n:"CV In",t:"cv_in"},{n:"Audio In",t:"audio_in"}]
  },
  // Type 83: Granular (hardware layout — full granular engine with stereo I/O)
  83: {
    name: "Granular", cat: "Audio",
    blocks: [{n:"Audio In L",t:"audio_in"},{n:"Audio In R",t:"audio_in"},{n:"Grain Size",t:"cv_in"},{n:"Grain Position",t:"cv_in"},{n:"Density",t:"cv_in"},{n:"Texture",t:"cv_in"},{n:"Speed/Pitch",t:"cv_in"},{n:"Freeze",t:"cv_in"},{n:"Audio Out L",t:"audio_out"},{n:"Audio Out R",t:"audio_out"}]
  },
  87: {
    name: "Pitch Shifter", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Pitch",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  89: {
    name: "All Pass Filter", cat: "Audio",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Frequency",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },

  // ----- Audio Routing (switches) -----
  33: {
    name: "Audio In Switch", cat: "Audio",
    blocks: [{n:"In 1",t:"audio_in"},{n:"In 2",t:"audio_in"},{n:"Output",t:"audio_out"},{n:"Select",t:"cv_in"}]
  },
  34: {
    name: "Audio Out Switch", cat: "Audio",
    blocks: [{n:"Input",t:"audio_in"},{n:"Out 1",t:"audio_out"},{n:"Out 2",t:"audio_out"},{n:"Select",t:"cv_in"}]
  },

  // ----- Effects -----
  3: {
    name: "Aliaser", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Rate",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  11: {
    name: "OD & Distortion", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Drive",t:"cv_in"},{n:"Tone",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  23: {
    name: "Compressor", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Threshold",t:"cv_in"},{n:"Ratio",t:"cv_in"},{n:"Attack",t:"cv_in"},{n:"Release",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  25: {
    name: "Plate Reverb", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  26: {
    name: "Hall Reverb", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  27: {
    name: "Shimmer", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  28: {
    name: "Flanger", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Rate",t:"cv_in"},{n:"Depth",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  29: {
    name: "Chorus", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Rate",t:"cv_in"},{n:"Depth",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  30: {
    name: "Vibrato", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Rate",t:"cv_in"},{n:"Depth",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  36: {
    name: "Reverb", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  42: {
    name: "Ring Mod", cat: "Effect",
    blocks: [{n:"In 1",t:"audio_in"},{n:"In 2",t:"audio_in"},{n:"Output",t:"audio_out"}]
  },
  61: {
    name: "Phaser", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Rate",t:"cv_in"},{n:"Depth",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  66: {
    name: "Fuzz", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Gain",t:"cv_in"},{n:"Tone",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  67: {
    name: "Ghostverb", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  68: {
    name: "Grain Delay", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Time",t:"cv_in"},{n:"Size",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  69: {
    name: "Ping Pong", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Time",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"L Out",t:"audio_out"},{n:"R Out",t:"audio_out"}]
  },
  71: {
    name: "Tremolo", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Rate",t:"cv_in"},{n:"Depth",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  72: {
    name: "Cabinet Sim", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Audio Out",t:"audio_out"}]
  },
  80: {
    name: "Diffuser", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Size",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  82: {
    name: "Reverb Lite", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  85: {
    name: "Delay", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Time",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  86: {
    name: "Delay w/Mod", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Time",t:"cv_in"},{n:"Feedback",t:"cv_in"},{n:"Mod Rate",t:"cv_in"},{n:"Mod Depth",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  91: {
    name: "Env Filter", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Sensitivity",t:"cv_in"},{n:"Q",t:"cv_in"},{n:"Audio Out",t:"audio_out"}]
  },
  94: {
    name: "Reverb Lite Stro", cat: "Effect",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Decay",t:"cv_in"},{n:"Mix",t:"cv_in"},{n:"Left Out",t:"audio_out"},{n:"Right Out",t:"audio_out"}]
  },

  // ----- CV / Modulation -----
  4: {
    name: "Sequencer", cat: "CV",
    blocks: [{n:"CV Out",t:"cv_out"},{n:"Gate Out",t:"gate_out"},{n:"Clock",t:"gate_in"},{n:"Reset",t:"gate_in"}]
    // Sequencer can have 1-8 CV tracks; blocks expand accordingly
  },
  5: {
    name: "LFO", cat: "CV",
    blocks: [{n:"Rate",t:"cv_in"},{n:"Output",t:"cv_out"}],
    variants: { 1: [{n:"Rate",t:"cv_in"},{n:"Depth",t:"cv_in"},{n:"Output",t:"cv_out"}] }
  },
  6: {
    name: "ADSR", cat: "CV",
    blocks: [{n:"Gate",t:"gate_in"},{n:"Attack",t:"cv_in"},{n:"Decay",t:"cv_in"},{n:"Sustain",t:"cv_in"},{n:"Release",t:"cv_in"},{n:"CV Out",t:"cv_out"}],
    variants: {
      // With retrigger and end-of-envelope gate output
      1: [{n:"Gate",t:"gate_in"},{n:"Attack",t:"cv_in"},{n:"Decay",t:"cv_in"},{n:"Sustain",t:"cv_in"},{n:"Release",t:"cv_in"},{n:"CV Out",t:"cv_out"},{n:"Retrigger",t:"gate_in"},{n:"End Gate",t:"gate_out"}]
    }
  },
  10: {
    name: "Sample & Hold", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Trigger",t:"gate_in"},{n:"Output",t:"cv_out"}]
  },
  17: {
    name: "CV Invert", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  18: {
    name: "Steps", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Steps",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  19: {
    name: "Slew Limiter", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Output",t:"cv_out"}],
    variants: {
      1: [{n:"Input",t:"cv_in"},{n:"Rise Rate",t:"cv_in"},{n:"Fall Rate",t:"cv_in"},{n:"Output",t:"cv_out"}]
    }
  },
  22: {
    name: "Multiplier", cat: "CV",
    blocks: [{n:"In 1",t:"cv_in"},{n:"In 2",t:"cv_in"},{n:"Output",t:"cv_out"}],
    variants: {
      // 3-input variant
      1: [{n:"In 1",t:"cv_in"},{n:"In 2",t:"cv_in"},{n:"In 3",t:"cv_in"},{n:"Output",t:"cv_out"}]
    }
  },
  31: {
    name: "In Switch", cat: "CV",
    blocks: [{n:"In 1",t:"cv_in"},{n:"In 2",t:"cv_in"},{n:"Output",t:"cv_out"},{n:"Select",t:"cv_in"}]
    // Can have 2-8 inputs; blocks expand
  },
  32: {
    name: "Out Switch", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Out 1",t:"cv_out"},{n:"Out 2",t:"cv_out"},{n:"Select",t:"cv_in"}]
    // Can have 2-8 outputs; blocks expand
  },
  35: {
    name: "Gate", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Gate",t:"gate_in"},{n:"Output",t:"cv_out"}]
  },
  37: {
    name: "Rhythm", cat: "CV",
    blocks: [{n:"Gate Out",t:"gate_out"},{n:"Clock",t:"gate_in"},{n:"Reset",t:"gate_in"},{n:"Steps",t:"cv_in"},{n:"Density",t:"cv_in"}]
  },
  39: {
    name: "Random", cat: "CV",
    blocks: [{n:"Output",t:"cv_out"}],
    variants: { 1: [{n:"Output",t:"cv_out"},{n:"Trigger",t:"gate_in"}] }
  },
  45: {
    name: "Value", cat: "CV",
    blocks: [{n:"CV Out",t:"cv_out"}]
  },
  46: {
    name: "CV Delay", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Time",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  47: {
    name: "CV Loop", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Record",t:"gate_in"},{n:"Output",t:"cv_out"}]
  },
  48: {
    name: "CV Filter", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Frequency",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  49: {
    name: "Clock Divider", cat: "CV",
    blocks: [{n:"Clock In",t:"gate_in"},{n:"Divisor",t:"cv_in"},{n:"Output",t:"gate_out"},{n:"Remainder",t:"gate_out"}]
  },
  50: {
    name: "Comparator", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Threshold",t:"cv_in"},{n:"Output",t:"gate_out"}]
  },
  51: {
    name: "CV Rectify", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  52: {
    name: "Trigger", cat: "CV",
    blocks: [{n:"Input",t:"gate_in"},{n:"Output",t:"gate_out"}]
  },
  63: {
    name: "CV Abs", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  70: {
    name: "Quantizer", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  74: {
    name: "CV Min/Max", cat: "CV",
    blocks: [{n:"In 1",t:"cv_in"},{n:"In 2",t:"cv_in"},{n:"Min",t:"cv_out"},{n:"Max",t:"cv_out"}]
  },
  75: {
    name: "Gate Inverter", cat: "CV",
    blocks: [{n:"Input",t:"gate_in"},{n:"Output",t:"gate_out"}]
  },
  77: {
    name: "CV Flip Flop", cat: "CV",
    blocks: [{n:"Input",t:"gate_in"},{n:"Q",t:"gate_out"},{n:"Q Inv",t:"gate_out"}]
  },
  100: {
    name: "Tap Tempo", cat: "CV",
    blocks: [{n:"Tap",t:"gate_in"},{n:"CV Out",t:"cv_out"}]
  },
  103: {
    name: "Byte Splitter", cat: "CV",
    blocks: [{n:"Input",t:"cv_in"},{n:"High",t:"cv_out"},{n:"Low",t:"cv_out"}]
  },
  104: {
    name: "CV Mixer", cat: "CV",
    blocks: [{n:"In 1",t:"cv_in"},{n:"In 2",t:"cv_in"},{n:"In 3",t:"cv_in"},{n:"Output",t:"cv_out"}]
  },
  105: {
    name: "Logic Gate", cat: "CV",
    blocks: [{n:"In 1",t:"gate_in"},{n:"In 2",t:"gate_in"},{n:"Output",t:"gate_out"}]
  },

  // ----- Analysis (audio -> CV) -----
  40: {
    name: "Env Follower", cat: "CV",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Sensitivity",t:"cv_in"},{n:"CV Out",t:"cv_out"}]
  },
  41: {
    name: "Pitch Detect", cat: "CV",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"CV Out",t:"cv_out"},{n:"Gate",t:"gate_out"}]
  },
  60: {
    name: "Onset Detect", cat: "CV",
    blocks: [{n:"Audio In",t:"audio_in"},{n:"Sensitivity",t:"cv_in"},{n:"Gate Out",t:"gate_out"}]
  },

  // ----- Interface (hardware I/O, buttons, pixels) -----
  1: {
    name: "Audio Input", cat: "Interface",
    blocks: [{n:"Left",t:"audio_out"},{n:"Right",t:"audio_out"}],
    variants: { 0: [{n:"Output",t:"audio_out"}] } // mono
  },
  2: {
    name: "Audio Output", cat: "Interface",
    blocks: [{n:"Left",t:"audio_in"},{n:"Right",t:"audio_in"},{n:"Gain",t:"cv_in"}],
    variants: { 0: [{n:"Input",t:"audio_in"},{n:"Gain",t:"cv_in"}] } // mono
  },
  15: {
    name: "Pushbutton", cat: "Interface",
    blocks: [{n:"Output",t:"gate_out"}]
  },
  16: {
    name: "Keyboard", cat: "Interface",
    blocks: [{n:"CV Out",t:"cv_out"},{n:"Gate Out",t:"gate_out"}]
  },
  44: {
    name: "Stompswitch", cat: "Interface",
    blocks: [{n:"Output",t:"gate_out"}]
  },
  54: {
    name: "Cport Exp/CV", cat: "Interface",
    blocks: [{n:"Output",t:"cv_out"}]
  },
  56: {
    name: "UI Button", cat: "Interface",
    blocks: [{n:"Output",t:"gate_out"}],
    variants: { 1: [{n:"Output",t:"gate_out"},{n:"LED",t:"cv_in"}] }
  },
  58: {
    name: "Pixel", cat: "Interface",
    blocks: [{n:"CV In",t:"cv_in"}]
  },

  // ----- MIDI -----
  20: {
    name: "MIDI Note In", cat: "MIDI",
    blocks: [{n:"Note",t:"cv_out"},{n:"Gate",t:"gate_out"},{n:"Velocity",t:"cv_out"}]
  },
  21: {
    name: "MIDI CC In", cat: "MIDI",
    blocks: [{n:"CC Value",t:"cv_out"}]
  },
  43: {
    name: "MIDI Note Out", cat: "MIDI",
    blocks: [{n:"Note",t:"cv_in"},{n:"Gate",t:"gate_in"},{n:"Velocity",t:"cv_in"}]
  },
  55: {
    name: "MIDI Pressure", cat: "MIDI",
    blocks: [{n:"Output",t:"cv_out"}]
  },
  59: {
    name: "MIDI CC Out", cat: "MIDI",
    blocks: [{n:"CC Value",t:"cv_in"}]
  },
  101: {
    name: "MIDI PC In", cat: "MIDI",
    blocks: [{n:"PC Value",t:"cv_out"}]
  },
  102: {
    name: "MIDI PC Out", cat: "MIDI",
    blocks: [{n:"PC Value",t:"cv_in"}]
  },
  106: {
    name: "MIDI Clock In", cat: "MIDI",
    blocks: [{n:"Clock",t:"gate_out"},{n:"Start",t:"gate_out"},{n:"Stop",t:"gate_out"}]
  },
  107: {
    name: "MIDI Clock Out", cat: "MIDI",
    blocks: [{n:"Clock",t:"gate_in"},{n:"Start",t:"gate_in"},{n:"Stop",t:"gate_in"}]
  }
};


// ===== BLOCK RESOLUTION =====

/**
 * Resolve the block configuration for a module given its firmware options.
 *
 * Lookup order:
 *   1. If the type index is not in MODULE_DB, generate generic "Port N" blocks
 *      using blockHint as the count (falls back to 1).
 *   2. If the module has no variants or no options bytes, return the default blocks.
 *   3. Otherwise, look up the variant keyed by options[0]; fall back to defaults.
 *
 * @param {number}       modIdx       - Firmware module type index (key into MODULE_DB).
 * @param {number[]|null} optionsBytes - Options bytes from the binary (may be null/empty).
 * @param {number}       [blockHint]  - Actual block count from the binary, used as
 *                                      fallback for unknown module types.
 * @returns {Array<{n:string, t:string}>} Array of block descriptors.
 */
ZOIA.resolveBlocks = function(modIdx, optionsBytes, blockHint) {
  var db = ZOIA.MODULE_DB[modIdx];
  if (!db) {
    // Unknown module type — generate generic blocks based on hint
    var count = (typeof blockHint === 'number' && blockHint > 0) ? blockHint : 1;
    var blocks = [];
    for (var i = 0; i < count; i++) {
      blocks.push({ n: "Port " + (i + 1), t: "unknown" });
    }
    ZOIA.log('Unknown module type ' + modIdx + '; generated ' + count + ' generic block(s)');
    return blocks;
  }

  // No variants defined, or no options to select a variant
  if (!db.variants || !optionsBytes || optionsBytes.length === 0) {
    return db.blocks;
  }

  var variantKey = optionsBytes[0];
  var variant = db.variants[variantKey];

  // If the variant key is not recognized, fall back to default blocks
  if (!variant) {
    return db.blocks;
  }

  return variant;
};


// ===== MODULE COLORS =====

/** @type {Object<number, string>} Color ID -> hex color string. */
ZOIA.COLORS = {
  1:"#0055ff", 2:"#00cc00", 3:"#ff0000", 4:"#ffcc00", 5:"#00cccc",
  6:"#cc00cc", 7:"#cccccc", 8:"#ff6600", 9:"#88cc00", 10:"#00cc88",
  11:"#0088ff", 12:"#8800cc", 13:"#ff0088", 14:"#ff8866", 15:"#ffaa00"
};

/** @type {Object<number, string>} Color ID -> human-readable name. */
ZOIA.COLOR_NAMES = {
  1:"Blue", 2:"Green", 3:"Red", 4:"Yellow", 5:"Aqua",
  6:"Magenta", 7:"White", 8:"Orange", 9:"Lima", 10:"Surf",
  11:"Sky", 12:"Purple", 13:"Pink", 14:"Peach", 15:"Mango"
};


// ===== PARAMETER FORMATTING =====

/**
 * Pattern-based parameter formatting rules.
 * Each entry maps a regex (matched against the block name) to a formatting
 * function that converts a raw 0-1 normalized value to a display string.
 *
 * Patterns are tested in order; the first match wins.
 * If no pattern matches, formatParam() falls back to a plain percentage.
 *
 * @type {Array<{match: RegExp, fmt: function(number): string}>}
 */
ZOIA.PARAM_FORMATS = [
  // Frequency: exponential 20 Hz - 20 kHz
  { match: /^frequency$/i,    fmt: function(v) { var hz = 20 * Math.pow(1000, v); return hz < 1000 ? hz.toFixed(0) + ' Hz' : (hz/1000).toFixed(2) + ' kHz'; } },
  // Rate: linear 0.01 - 20 Hz (LFO-style)
  { match: /^rate$/i,         fmt: function(v) { var hz = 0.01 + v * 19.99; return hz < 10 ? hz.toFixed(2) + ' Hz' : hz.toFixed(1) + ' Hz'; } },
  // Resonance: simple percentage
  { match: /^resonance$/i,    fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // Time: linear 0 - 5000 ms
  { match: /^time$/i,         fmt: function(v) { var ms = v * 5000; return ms < 1000 ? ms.toFixed(0) + ' ms' : (ms/1000).toFixed(2) + ' s'; } },
  // ADSR envelope times: linear 0 - 10000 ms
  { match: /^attack|decay|release$/i, fmt: function(v) { var ms = v * 10000; return ms < 1000 ? ms.toFixed(0) + ' ms' : (ms/1000).toFixed(1) + ' s'; } },
  // Sustain level: percentage
  { match: /^sustain$/i,      fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // Gain/Level/Volume: dB scale
  { match: /^gain|level|volume$/i, fmt: function(v) { if (v <= 0) return '-inf dB'; var db = 20 * Math.log10(v); return db.toFixed(1) + ' dB'; } },
  // Generic percentage controls (mix, balance, pan, width, depth, drive, etc.)
  { match: /^mix|balance|pan|width|depth|drive|tone|sensitivity|threshold|ratio|feedback|duty/i, fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // EQ band controls: +/- 12 dB centered at 0.5
  { match: /^(bass|mid|treble|low|high)$/i, fmt: function(v) { var db = (v - 0.5) * 24; return (db >= 0 ? '+' : '') + db.toFixed(1) + ' dB'; } },
  // Integer step counts (divisor, sequencer steps)
  { match: /^divisor|steps$/i, fmt: function(v) { return Math.round(v * 32).toString(); } },
  // Size: percentage (granular, diffuser, etc.)
  { match: /^size$/i,         fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // Position: percentage (granular playhead)
  { match: /^position$/i,     fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // Bit depth: 1 - 16 bits
  { match: /^bit depth$/i,    fmt: function(v) { return (1 + v * 15).toFixed(1) + ' bit'; } },
  // Density: percentage (rhythm module)
  { match: /^density$/i,      fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // Rise/Fall rate: percentage (slew limiter)
  { match: /^rise rate|fall rate$/i, fmt: function(v) { return (v * 100).toFixed(0) + '%'; } },
  // Duty Cycle: percentage (oscillator pulse width)
  { match: /^duty cycle$/i,   fmt: function(v) { return (v * 100).toFixed(0) + '%'; } }
];

/**
 * Format a parameter value using the block name for context.
 * Searches PARAM_FORMATS for a matching pattern; defaults to percentage.
 *
 * @param {string|null} blockName - The block's display name (e.g., "Frequency").
 * @param {number}      rawValue  - Normalized parameter value (0.0 to 1.0).
 * @returns {string} Human-readable formatted value with units.
 */
ZOIA.formatParam = function(blockName, rawValue) {
  if (!blockName) return (rawValue * 100).toFixed(0) + '%';
  for (var i = 0; i < ZOIA.PARAM_FORMATS.length; i++) {
    if (ZOIA.PARAM_FORMATS[i].match.test(blockName)) {
      return ZOIA.PARAM_FORMATS[i].fmt(rawValue);
    }
  }
  // Default: percentage
  return (rawValue * 100).toFixed(0) + '%';
};


/**
 * Reverse-parse a formatted parameter string back to a 0-1 raw value.
 * Uses the block name to determine which inverse mapping to apply.
 *
 * @param {string|null} blockName - The block's display name.
 * @param {string}      str       - The user-typed string (e.g. "650 Hz", "50%").
 * @returns {number|null} Normalized 0-1 value, or null if unparseable.
 */
ZOIA.parseParam = function(blockName, str) {
  if (!str) return null;
  var val = parseFloat(str);
  if (isNaN(val)) return null;
  var lower = str.toLowerCase().trim();

  if (blockName) {
    var bn = blockName.toLowerCase();

    // Frequency: exponential 20 Hz - 20 kHz
    if (/^frequency$/i.test(blockName)) {
      var hz = val;
      if (lower.indexOf('khz') >= 0) hz = val * 1000;
      hz = Math.max(20, Math.min(20000, hz));
      return Math.log(hz / 20) / Math.log(1000);
    }

    // Rate: linear 0.01 - 20 Hz
    if (/^rate$/i.test(blockName)) {
      var rHz = val;
      if (lower.indexOf('khz') >= 0) rHz = val * 1000;
      return Math.max(0, Math.min(1, (rHz - 0.01) / 19.99));
    }

    // Time: linear 0 - 5000 ms
    if (/^time$/i.test(blockName)) {
      var ms = val;
      if (lower.indexOf('s') >= 0 && lower.indexOf('ms') < 0) ms = val * 1000;
      return Math.max(0, Math.min(1, ms / 5000));
    }

    // ADSR times: linear 0 - 10000 ms
    if (/^attack|decay|release$/i.test(blockName)) {
      var ams = val;
      if (lower.indexOf('s') >= 0 && lower.indexOf('ms') < 0) ams = val * 1000;
      return Math.max(0, Math.min(1, ams / 10000));
    }

    // Gain/Level/Volume: dB scale
    if (/^gain|level|volume$/i.test(blockName)) {
      if (lower.indexOf('inf') >= 0) return 0;
      var db = val;
      return Math.max(0, Math.min(1, Math.pow(10, db / 20)));
    }

    // EQ bands: +/- 12 dB centered at 0.5
    if (/^(bass|mid|treble|low|high)$/i.test(blockName)) {
      var eqDb = val;
      return Math.max(0, Math.min(1, (eqDb / 24) + 0.5));
    }

    // Bit depth: 1 - 16 bits
    if (/^bit depth$/i.test(blockName)) {
      return Math.max(0, Math.min(1, (val - 1) / 15));
    }

    // Divisor/Steps: integer 0 - 32
    if (/^divisor|steps$/i.test(blockName)) {
      return Math.max(0, Math.min(1, val / 32));
    }
  }

  // Percentage (default): accept "50%", "50", or "0.5"
  if (lower.indexOf('%') >= 0) {
    return Math.max(0, Math.min(1, val / 100));
  }
  // If value is between 0 and 1 inclusive, treat as raw
  if (val >= 0 && val <= 1) return val;
  // Otherwise assume percentage
  return Math.max(0, Math.min(1, val / 100));
};


// ===== CONNECTION STYLES =====

/**
 * Visual styling for connection types in grid and schematic views.
 * @type {Object<string, {color: string, width: number, dash: string}>}
 */
ZOIA.CONN_STYLES = {
  audio: { color: "#00C853", width: 3, dash: "" },
  cv:    { color: "#2979FF", width: 2, dash: "8,4" },
  gate:  { color: "#FF1744", width: 2, dash: "3,3" },
  param: { color: "#FF9100", width: 1, dash: "" }
};


// === patch-parser.js ===
// Binary .bin patch file parser
window.ZOIA = window.ZOIA || {};

// Hardware type ID -> Exhibit type ID reverse mapping.
// .bin files from build_all.py use real ZOIA firmware type IDs which differ
// from the exhibit MODULE_DB keys. This map converts them back so that
// resolveBlocks() finds the correct block layout.
// Only contains the 22 non-colliding HW->exhibit mappings. All exhibit types
// in _COLLISION_EXHIBIT_TYPES (17 types) are written directly to .bin by the
// converter, so no reverse mapping is needed for them.
ZOIA._HW_TO_EXHIBIT = {
  8: 84, 19: 20, 22: 21, 27: 105, 28: 90,
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
    if (ZOIA._HW_TO_EXHIBIT[typeIdx] !== undefined && !ZOIA._NO_REMAP_TYPES[typeIdx]) {
      typeIdx = ZOIA._HW_TO_EXHIBIT[typeIdx];
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
      colorId: Math.max(1, Math.min(15, colorId)),
      gridPos: gridPos, paramCount: paramCount, params: params,
      name: displayName,
      typeName: dbEntry ? dbEntry.name : "Type " + typeIdx,
      blocks: resolvedBlocks,
      blockCount: resolvedBlocks.length,
      category: dbEntry ? dbEntry.cat : "Unknown",
      options: optBytes
    });

    if (i < 8) ZOIA.log('  Mod ' + i + ': "' + displayName + '" type=' + typeIdx + (dbEntry ? ' (' + dbEntry.name + ')' : ' (unknown)') + ' pos=' + gridPos + ' page=' + page + ' blocks=' + resolvedBlocks.length + ' params=' + paramCount);
  }
  if (moduleCount > 8) ZOIA.log('  ... (' + (moduleCount - 8) + ' more modules)');

  var connCount = r32();
  ZOIA.log('Connection count: ' + connCount);
  var connections = [];
  for (var j = 0; j < connCount; j++) {
    var srcMod = r32(), srcBlock = r32(), dstMod = r32(), dstBlock = r32(), strength = r32();
    // Reverse-remap hardware block indices to exhibit block indices
    if (srcMod < modules.length) {
      var srcRemap = ZOIA._HW_BLOCK_TO_EXHIBIT[modules[srcMod].typeIdx];
      if (srcRemap && srcRemap[srcBlock] !== undefined) {
        srcBlock = srcRemap[srcBlock];
      }
    }
    if (dstMod < modules.length) {
      var dstRemap = ZOIA._HW_BLOCK_TO_EXHIBIT[modules[dstMod].typeIdx];
      if (dstRemap && dstRemap[dstBlock] !== undefined) {
        dstBlock = dstRemap[dstBlock];
      }
    }
    connections.push({
      srcMod: srcMod, srcBlock: srcBlock,
      dstMod: dstMod, dstBlock: dstBlock,
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
  return { name: name, moduleCount: moduleCount, modules: modules, connections: connections, pages: pages };
};


// === patch-state.js ===
/**
 * patch-state.js — Shared patch data model, selection state, and patch operations.
 *
 * Manages the ZOIA emulator's runtime state including:
 *   - Patch loading, saving, and export
 *   - Module/block selection
 *   - Connection view navigation
 *   - Parameter get/set with formatted display
 *   - Module rename, delete, and disconnect operations
 *   - Console/log infrastructure
 *
 * Everything is attached to the global window.ZOIA namespace (ES5).
 */
window.ZOIA = window.ZOIA || {};

ZOIA.VERSION = { major: 6, minor: 0, revision: 91 };
ZOIA.VERSION_STRING = ZOIA.VERSION.major + '.' + ZOIA.VERSION.minor + '.' + ZOIA.VERSION.revision;


// ===== GRID CONSTANTS =====

ZOIA.GRID_COLS = 8;
ZOIA.GRID_ROWS = 5;
ZOIA.GRID_SIZE = 40;


// ===== CONSOLE / LOGGING =====

/** @type {string[]} Ring buffer of timestamped log messages (max 200). */
ZOIA._logBuffer = [];

/** @type {boolean} Whether the on-screen console panel is visible. */
ZOIA._consoleVisible = false;

/**
 * Log a message to both the browser console and the in-app log panel.
 * Messages are timestamped and stored in a 200-line ring buffer.
 * @param {string} msg - The message to log.
 */
ZOIA.log = function(msg) {
  var ts = new Date().toLocaleTimeString();
  var line = '[' + ts + '] ' + msg;
  ZOIA._logBuffer.push(line);
  if (ZOIA._logBuffer.length > 200) ZOIA._logBuffer.shift();
  if (ZOIA._consoleVisible) {
    var el = document.getElementById('console-output');
    if (el) {
      el.textContent = ZOIA._logBuffer.join('\n');
      el.scrollTop = el.scrollHeight;
    }
  }
  console.log('[ZOIA] ' + msg);
};

/**
 * Toggle the on-screen console panel visibility.
 * When shown, the panel is populated with the full log buffer.
 */
ZOIA.toggleConsole = function() {
  ZOIA._consoleVisible = !ZOIA._consoleVisible;
  var panel = document.getElementById('console-panel');
  if (!panel) {
    ZOIA.log('Console panel element not found!');
    return;
  }
  if (ZOIA._consoleVisible) {
    panel.style.display = 'flex';
    var el = document.getElementById('console-output');
    if (el) {
      el.textContent = ZOIA._logBuffer.join('\n');
      el.scrollTop = el.scrollHeight;
    }
  } else {
    panel.style.display = 'none';
  }
};


// ===== APPLICATION STATE =====

/**
 * Central mutable state object for the emulator.
 * @type {Object}
 */
ZOIA.state = {
  patch: null,
  selectedModule: null,
  selectedBlock: null,
  currentPage: 0,
  secondaryPage: 0,
  zoomLevel: 1.0,
  connFilters: { audio: true, cv: true, gate: true, param: true },
  currentView: "hw",
  shiftMode: false,
  knobAngle: 0,
  bypassed: false,
  dragSrc: null,
  // Connection view state
  connectionView: false,       // true when OLED shows connection detail screen
  connectionList: [],           // cached array of connections for current block
  connectionIndex: 0,           // which connection is currently highlighted
  connectionStrengthMode: '%',  // '%' or 'dB' — toggle with encoder click
  selectedConnection: null,      // null or index into patch.connections[] for grid-dot selection
  hoveredModule: null,           // module index under mouse hover (for conn-dot display)
  hoveredBlock: null,            // block index under mouse hover
  clipboard: null,               // copied module data for paste: { typeIdx, name, typeName, colorId, blockCount, blocks, params, options, category }
  mode: 'edit'                   // 'edit' or 'play' — controls UI behavior (edit=layout, play=sim interaction)
};


// ===== SIGNAL TYPE HELPERS =====

/**
 * Determine the signal type of a block within a module.
 * @param {Object} mod   - The module object (must have a .blocks array).
 * @param {number} blockIdx - Index into mod.blocks.
 * @returns {string} One of "audio", "gate", "cv", or "param".
 */
ZOIA.getSignalType = function(mod, blockIdx) {
  if (!mod.blocks || blockIdx >= mod.blocks.length) return "param";
  var t = mod.blocks[blockIdx].t;
  if (t.indexOf('audio') >= 0) return "audio";
  if (t.indexOf('gate') >= 0) return "gate";
  if (t.indexOf('cv') >= 0) return "cv";
  return "param";
};

/**
 * Determine the dominant signal type of a connection by inspecting both endpoints.
 * Priority: audio > gate > cv > param.
 * @param {Object} conn - Connection object with srcMod, srcBlock, dstMod, dstBlock.
 * @returns {string} One of "audio", "gate", "cv", or "param".
 */
ZOIA.getConnType = function(conn) {
  var s = ZOIA.state;
  if (!s.patch) return "param";
  var sm = s.patch.modules[conn.srcMod];
  var dm = s.patch.modules[conn.dstMod];
  if (!sm || !dm) return "param";
  var st = ZOIA.getSignalType(sm, conn.srcBlock);
  var dt = ZOIA.getSignalType(dm, conn.dstBlock);
  if (st === "audio" || dt === "audio") return "audio";
  if (st === "gate" || dt === "gate") return "gate";
  if (st === "cv" || dt === "cv") return "cv";
  return "param";
};


// ===== CONNECTION VIEW =====

/**
 * Enter the connection detail view for the currently selected block.
 * Populates connectionList with all connections touching the selected block
 * and renders the OLED. Does nothing if there are no connections.
 */
ZOIA.enterConnectionView = function() {
  var s = ZOIA.state;
  if (!s.patch || s.selectedModule === null || s.selectedBlock === null) return;
  var modIdx = s.selectedModule;
  var blkIdx = s.selectedBlock;
  var conns = s.patch.connections.filter(function(c) {
    return (c.srcMod === modIdx && c.srcBlock === blkIdx) ||
           (c.dstMod === modIdx && c.dstBlock === blkIdx);
  });
  if (conns.length === 0) {
    ZOIA.log('No connections on this block');
    return;
  }
  s.connectionView = true;
  s.connectionList = conns;
  s.connectionIndex = 0;
  ZOIA.log('Entered connection view (' + conns.length + ' connection' + (conns.length > 1 ? 's' : '') + ')');
  ZOIA.oled.render();
};

/**
 * Exit the connection detail view and return to normal block view.
 * Resets connectionList and connectionIndex and re-renders the OLED.
 */
ZOIA.exitConnectionView = function() {
  var s = ZOIA.state;
  if (!s.connectionView) return;
  s.connectionView = false;
  s.connectionList = [];
  s.connectionIndex = 0;
  ZOIA.log('Exited connection view');
  ZOIA.oled.render();
};

/**
 * Format a connection strength value for display.
 * @param {Object} conn - Connection object (uses conn.strength, default 10000).
 * @param {string} mode - Display mode: '%' for percentage, 'dB' for decibels.
 * @returns {string} Formatted strength string (e.g., "100.0%" or "-6.0 dB").
 */
ZOIA.formatConnStrength = function(conn, mode) {
  var raw = (conn.strength !== undefined) ? conn.strength : 10000;
  var pct = raw / 10000 * 100;
  if (mode === 'dB') {
    if (pct <= 0) return '-inf dB';
    var db = 20 * Math.log10(pct / 100);
    return db.toFixed(1) + ' dB';
  }
  return pct.toFixed(1) + '%';
};

/**
 * Set the strength of a connection by index within the current connectionList.
 * Value is clamped to 0-10000.
 * @param {number} connIdx - Index into ZOIA.state.connectionList.
 * @param {number} value   - New strength value (0-10000 range).
 */
ZOIA.setConnStrength = function(connIdx, value) {
  var s = ZOIA.state;
  if (!s.connectionView || connIdx >= s.connectionList.length) return;
  var val = Math.max(0, Math.min(10000, Math.round(value)));
  s.connectionList[connIdx].strength = val;
  ZOIA.oled.render();
  // Also update the param input to show the strength value
  var input = document.getElementById('param-input');
  var label = document.querySelector('#param-input-area .param-label');
  if (input) input.value = (val / 100).toFixed(1) + '%';
  if (label) label.textContent = 'CONN STRENGTH';
};


// ===== GRID-DOT CONNECTION SELECTION =====

/**
 * Select a connection by its index in patch.connections[].
 * Both endpoint grid buttons will show the .conn-selected class.
 * Passing the already-selected index deselects it (toggle).
 * @param {number|null} connIdx - Index into patch.connections, or null to deselect.
 */
ZOIA.selectConnection = function(connIdx) {
  var s = ZOIA.state;
  if (connIdx === null || connIdx === undefined || s.selectedConnection === connIdx) {
    // Toggle off
    s.selectedConnection = null;
    ZOIA.log('Deselected connection');
  } else {
    s.selectedConnection = connIdx;
    var conn = s.patch.connections[connIdx];
    if (conn) {
      var pct = ((conn.strength !== undefined ? conn.strength : 10000) / 10000);
      ZOIA.log('Selected connection ' + connIdx + ' (strength ' + pct.toFixed(3) + ')');
    }
  }
  ZOIA.gridButtons.render();
  // Force-update the param input AFTER grid render to ensure it reflects
  // the connection state (grid render calls updateParamInput internally,
  // but we call again to guarantee it sticks after any DOM rebuild).
  if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
};

/**
 * Clear the selectedConnection state without logging.
 * Used internally when the selection context changes (page nav, back, etc.).
 */
ZOIA.clearSelectedConnection = function() {
  ZOIA.state.selectedConnection = null;
};

/**
 * Set the strength of the currently grid-dot-selected connection.
 * Value is clamped to 0-10000. Re-renders the grid and param input.
 * @param {number} value - New strength value (0-10000 range).
 */
ZOIA.setSelectedConnStrength = function(value) {
  var s = ZOIA.state;
  if (s.selectedConnection === null || !s.patch) return;
  var conn = s.patch.connections[s.selectedConnection];
  if (!conn) return;
  conn.strength = Math.max(0, Math.min(10000, Math.round(value)));
  // Directly update the param input display (skip full grid re-render
  // to avoid DOM rebuild which can interfere with the display state).
  var input = document.getElementById('param-input');
  var label = document.querySelector('#param-input-area .param-label');
  if (input) input.value = (conn.strength / 100).toFixed(1) + '%';
  if (label) label.textContent = 'CONN STRENGTH';
};


// ===== PARAMETER ACCESS =====

/**
 * Get the normalized parameter value for a block (0.0 to 1.0).
 * Returns 0.5 (midpoint) if the module or param data is unavailable.
 * @param {number} modIdx   - Module index in the patch.
 * @param {number} blockIdx - Block index within the module.
 * @returns {number} Normalized value between 0.0 and 1.0.
 */
ZOIA.getParamValue = function(modIdx, blockIdx) {
  var s = ZOIA.state;
  if (!s.patch) return 0.5;
  var m = s.patch.modules[modIdx];
  if (!m || !m.params || blockIdx >= m.params.length) return 0.5;
  return m.params[blockIdx] / 65535;
};

/**
 * Set the normalized parameter value for a block (0.0 to 1.0).
 * Automatically extends the params array if needed, clamps the value,
 * and refreshes the OLED and knob displays.
 * @param {number} modIdx   - Module index in the patch.
 * @param {number} blockIdx - Block index within the module.
 * @param {number} val      - Normalized value (0.0 to 1.0, clamped).
 */
ZOIA.setParamValue = function(modIdx, blockIdx, val) {
  var s = ZOIA.state;
  if (!s.patch) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  if (!m.params) m.params = [];
  while (m.params.length <= blockIdx) m.params.push(32768);
  m.params[blockIdx] = Math.round(Math.max(0, Math.min(1, val)) * 65535);
  // Update all displays in tandem
  ZOIA.oled.render();
  if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
};


// ===== PATCH LOADING & SUMMARY =====

/**
 * Load a parsed patch object into the emulator state.
 * Resets selection, page indices, drag state, and connection view,
 * then renders the active view.
 * @param {Object} p - Parsed patch object (from ZOIA.parsePatch).
 */
ZOIA.loadPatch = function(p) {
  // Stop the sim if it's running before loading a new patch
  if (ZOIA.sim && ZOIA.sim.running) ZOIA.sim.stop();
  var s = ZOIA.state;
  s.patch = p;
  s.selectedModule = null;
  s.selectedBlock = null;
  s.currentPage = 0;
  s.secondaryPage = p.pages.length > 1 ? 1 : 0;
  s.shiftMode = false;
  s.dragSrc = null;
  s.connectionView = false;
  s.connectionList = [];
  s.connectionIndex = 0;
  s.selectedConnection = null;
  // Ensure labels array and description exist
  if (!p.labels) p.labels = [];
  if (!p.description) p.description = '';
  ZOIA.log('Loaded patch: "' + p.name + '" (' + p.moduleCount + ' modules, ' + p.connections.length + ' conns, ' + p.pages.length + ' pages)');
  ZOIA.updatePatchSummary();
  ZOIA.updateLabels();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};

/**
 * Update the patch summary text element in the toolbar.
 * Displays module count, connection count, and page count.
 */
ZOIA.updatePatchSummary = function() {
  var el = document.getElementById('patch-summary');
  var p = ZOIA.state.patch;
  if (!p) {
    if (el) el.textContent = 'No patch loaded';
    return;
  }
  if (el) {
    el.textContent = p.name + ' | ' + p.moduleCount + ' modules | ' + p.connections.length + ' connections | ' + p.pages.length + ' page' + (p.pages.length > 1 ? 's' : '');
  }
};


// ===== PATCH LABELS =====

/**
 * Render patch labels as clickable pills in the toolbar.
 * Each label has an 'x' to remove it, plus a '+' button to add new labels.
 */
ZOIA.updateLabels = function() {
  var el = document.getElementById('patch-labels');
  if (!el) return;
  var p = ZOIA.state.patch;
  if (!p) { el.innerHTML = ''; return; }
  if (!p.labels) p.labels = [];

  var html = '';
  for (var i = 0; i < p.labels.length; i++) {
    html += '<span class="patch-label-pill" data-idx="' + i + '">' +
      p.labels[i] +
      '<span class="patch-label-x" data-idx="' + i + '">\u00d7</span>' +
    '</span>';
  }
  html += '<span class="patch-label-add" id="add-label-btn">+ label</span>';
  el.innerHTML = html;

  // Bind remove handlers
  var xBtns = el.querySelectorAll('.patch-label-x');
  for (var j = 0; j < xBtns.length; j++) {
    (function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        ZOIA.removeLabel(idx);
      };
    })(xBtns[j]);
  }

  // Bind add handler
  var addBtn = document.getElementById('add-label-btn');
  if (addBtn) {
    addBtn.onclick = function(e) {
      e.stopPropagation();
      ZOIA.addLabelPrompt();
    };
  }
};

/**
 * Show the OLED inline editor to add a new label to the patch.
 */
ZOIA.addLabelPrompt = function() {
  var s = ZOIA.state;
  if (!s.patch) return;
  var oled = document.getElementById('oled');
  if (!oled) return;

  oled.innerHTML =
    '<div style="color:#00cccc;font-weight:bold">ADD LABEL</div>' +
    '<div style="margin-top:4px"><input id="oled-label-input" type="text" placeholder="e.g. ambient, delay, favorite" ' +
    'style="background:#111;color:#fff;border:1px solid #00cccc;border-radius:3px;padding:3px 6px;font-size:11px;width:90%;font-family:monospace" ' +
    'maxlength="24"></div>' +
    '<div style="margin-top:4px;display:flex;gap:8px;justify-content:center">' +
      '<button id="oled-label-ok" style="background:#00cccc;color:#000;border:none;border-radius:3px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:monospace">ADD</button>' +
      '<button id="oled-label-cancel" style="background:#333;color:#aaa;border:1px solid #555;border-radius:3px;padding:4px 12px;font-size:11px;cursor:pointer;font-family:monospace">CANCEL</button>' +
    '</div>';

  var inp = document.getElementById('oled-label-input');
  var okBtn = document.getElementById('oled-label-ok');
  var cancelBtn = document.getElementById('oled-label-cancel');

  function doAdd() {
    var val = inp ? inp.value.trim() : '';
    if (val.length > 0) {
      if (!s.patch.labels) s.patch.labels = [];
      // Avoid duplicates
      var lower = val.toLowerCase();
      var exists = s.patch.labels.some(function(l) { return l.toLowerCase() === lower; });
      if (!exists) {
        s.patch.labels.push(val.substring(0, 24));
        ZOIA.log('Added label: "' + val + '"');
        ZOIA.updateLabels();
      } else {
        ZOIA.log('Label "' + val + '" already exists');
      }
    }
    ZOIA.oled.render();
  }

  if (inp) {
    inp.focus();
    inp.onkeydown = function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doAdd(); }
      else if (e.key === 'Escape') { ZOIA.oled.render(); }
    };
  }
  if (okBtn) { okBtn.onclick = function() { doAdd(); }; }
  if (cancelBtn) { cancelBtn.onclick = function() { ZOIA.oled.render(); }; }
};

/**
 * Remove a label by index from the patch.
 * @param {number} idx - Index into patch.labels[].
 */
ZOIA.removeLabel = function(idx) {
  var p = ZOIA.state.patch;
  if (!p || !p.labels || idx < 0 || idx >= p.labels.length) return;
  var removed = p.labels.splice(idx, 1)[0];
  ZOIA.log('Removed label: "' + removed + '"');
  ZOIA.updateLabels();
};


// ===== FILE HANDLING =====

/**
 * Handle a File object selected by the user (from file input or drag-drop).
 * Reads the file as an ArrayBuffer, parses it with ZOIA.parsePatch, and loads
 * the result. Displays errors via alert and ZOIA.log on failure.
 * @param {File} file - The File object to load.
 */
ZOIA.handleFile = function(file) {
  if (!file) return;
  var fi = document.getElementById('file-input');
  if (fi) fi.value = '';
  ZOIA.log('Loading file: ' + file.name + ' (' + file.size + ' bytes)');
  var reader = new FileReader();
  reader.onload = function(e) {
    ZOIA.log('FileReader complete, buffer size: ' + e.target.result.byteLength);
    try {
      var patch = ZOIA.parsePatch(e.target.result);
      if (!patch.name || patch.name.length === 0) {
        patch.name = (file.name || 'patch').replace(/\.[^.]+$/, '');
        ZOIA.log('Patch name empty; using file name fallback: "' + patch.name + '"');
      }
      ZOIA.loadPatch(patch);
    } catch (err) {
      ZOIA.log('ERROR: Parse failed: ' + err.message + '\n' + err.stack);
      alert("Parse error: " + err.message);
    }
  };
  reader.onerror = function(e) {
    ZOIA.log('ERROR: FileReader failed: ' + e.target.error);
  };
  reader.readAsArrayBuffer(file);
};


// ===== RENAME OPERATIONS =====

/**
 * Rename a page via prompt() with OLED inline editor fallback.
 * If prompt() is blocked by a sandbox, presents an inline text input
 * inside the OLED display area. Page names are capped at 16 characters.
 * @param {number} pageIdx - Index of the page to rename.
 */
ZOIA.renamePage = function(pageIdx) {
  var s = ZOIA.state;
  if (!s.patch || pageIdx < 0 || pageIdx >= s.patch.pages.length) return;
  var curName = s.patch.pages[pageIdx];

  // Try prompt() first (works outside sandbox)
  var newName;
  try {
    newName = prompt('Rename page ' + pageIdx + ' ("' + curName + '"):', curName);
  } catch (e) {
    ZOIA.log('prompt() blocked for renamePage: ' + e.message);
    newName = null;
  }

  // If prompt was blocked or returned empty, use the OLED as a mini-editor
  if (newName === null || newName === undefined) {
    var oled = document.getElementById('oled');
    if (!oled) return;
    oled.innerHTML =
      '<div style="color:#00cccc;font-weight:bold">RENAME PAGE ' + pageIdx + '</div>' +
      '<div class="dim">Current: ' + curName + '</div>' +
      '<div style="margin-top:4px"><input id="oled-rename-input" type="text" value="' + curName + '" ' +
      'style="background:#111;color:#fff;border:1px solid #00cccc;border-radius:3px;padding:3px 6px;font-size:11px;width:90%;font-family:monospace" ' +
      'maxlength="16"></div>' +
      '<div class="dim" style="font-size:9px;margin-top:2px">Press Enter to confirm, Esc to cancel</div>';
    var inp = document.getElementById('oled-rename-input');
    if (inp) {
      inp.focus();
      inp.select();
      inp.onkeydown = function(e) {
        if (e.key === 'Enter') {
          var val = inp.value.trim();
          if (val.length > 0) {
            s.patch.pages[pageIdx] = val.substring(0, 16);
            ZOIA.log('Renamed page ' + pageIdx + ' to "' + s.patch.pages[pageIdx] + '"');
          }
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        } else if (e.key === 'Escape') {
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        }
      };
    }
    return;
  }

  if (newName.trim().length > 0) {
    s.patch.pages[pageIdx] = newName.trim().substring(0, 16);
    ZOIA.log('Renamed page ' + pageIdx + ' to "' + s.patch.pages[pageIdx] + '"');
    if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
    else ZOIA.schematicView.renderAll();
  }
};

/**
 * Rename a module instance via prompt() with OLED inline editor fallback.
 * If prompt() is blocked by a sandbox, presents an inline text input
 * inside the OLED display area. Module names are capped at 16 characters.
 * @param {number} modIdx - Index of the module to rename.
 */
ZOIA.renameModule = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  var curName = m.name;

  // Try prompt() first (works outside sandbox)
  var newName;
  try {
    newName = prompt('Rename module "' + curName + '":', curName);
  } catch (e) {
    ZOIA.log('prompt() blocked for renameModule: ' + e.message);
    newName = null;
  }

  // If prompt was blocked or returned empty, use the OLED as a mini-editor
  if (newName === null || newName === undefined) {
    var oled = document.getElementById('oled');
    if (!oled) return;
    oled.innerHTML =
      '<div style="color:#00cccc;font-weight:bold">RENAME MODULE ' + modIdx + '</div>' +
      '<div class="dim">Current: ' + curName + '</div>' +
      '<div style="margin-top:4px"><input id="oled-rename-input" type="text" value="' + curName + '" ' +
      'style="background:#111;color:#fff;border:1px solid #00cccc;border-radius:3px;padding:3px 6px;font-size:11px;width:90%;font-family:monospace" ' +
      'maxlength="16"></div>' +
      '<div class="dim" style="font-size:9px;margin-top:2px">Press Enter to confirm, Esc to cancel</div>';
    var inp = document.getElementById('oled-rename-input');
    if (inp) {
      inp.focus();
      inp.select();
      inp.onkeydown = function(e) {
        if (e.key === 'Enter') {
          var val = inp.value.trim();
          if (val.length > 0) {
            m.name = val.substring(0, 16);
            ZOIA.log('Renamed module ' + modIdx + ' to "' + m.name + '"');
          }
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        } else if (e.key === 'Escape') {
          if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
          else ZOIA.schematicView.renderAll();
        }
      };
    }
    return;
  }

  if (newName.trim().length > 0) {
    m.name = newName.trim().substring(0, 16);
    ZOIA.log('Renamed module ' + modIdx + ' to "' + m.name + '"');
    if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
    else ZOIA.schematicView.renderAll();
  }
};


// ===== MODULE DELETE & DISCONNECT =====

/**
 * Delete a module and all its connections from the patch.
 * Re-indexes remaining modules and connections so that indices stay contiguous.
 * Prompts for confirmation before proceeding.
 * @param {number} modIdx - Index of the module to delete.
 */
ZOIA.deleteModule = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null || modIdx === undefined) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  var name = m.name || m.typeName;

  // Skip confirmation in sandbox (confirm() returns false silently)
  // Just proceed with deletion directly

  // Remove all connections involving this module
  s.patch.connections = s.patch.connections.filter(function(c) {
    return c.srcMod !== modIdx && c.dstMod !== modIdx;
  });

  // Re-index connections: any connection referencing a module index > modIdx must decrement
  s.patch.connections.forEach(function(c) {
    if (c.srcMod > modIdx) c.srcMod--;
    if (c.dstMod > modIdx) c.dstMod--;
  });

  // Remove the module
  s.patch.modules.splice(modIdx, 1);

  // Re-index remaining modules
  s.patch.modules.forEach(function(mod, i) {
    mod.idx = i;
  });

  s.patch.moduleCount = s.patch.modules.length;

  // Clear selection if the deleted module was selected
  if (s.selectedModule === modIdx) {
    s.selectedModule = null;
    s.selectedBlock = null;
  } else if (s.selectedModule !== null && s.selectedModule > modIdx) {
    s.selectedModule--;
  }

  // Clear connection selection (indices shifted)
  s.selectedConnection = null;

  ZOIA.log('Deleted module ' + modIdx + ' ("' + name + '")');
  ZOIA.updatePatchSummary();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};

/**
 * Copy a module to the clipboard for later pasting.
 * Stores a deep copy of the module's configuration (not its connections).
 * @param {number} modIdx - Index of the module to copy.
 */
ZOIA.copyModule = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null || modIdx === undefined) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;
  s.clipboard = {
    typeIdx: m.typeIdx,
    name: m.name,
    typeName: m.typeName,
    colorId: m.colorId,
    blockCount: m.blockCount,
    blocks: JSON.parse(JSON.stringify(m.blocks || [])),
    params: m.params ? m.params.slice() : [],
    options: m.options ? m.options.slice() : [],
    category: m.category
  };
  ZOIA.log('Copied module "' + (m.name || m.typeName) + '" to clipboard');
};

/**
 * Paste a module from the clipboard onto a specific grid position.
 * Creates a new module instance with the same configuration as the copied one.
 * @param {number} gridPos - Grid position (0-39) to place the module.
 * @param {number} page    - Page to place the module on.
 */
ZOIA.pasteModule = function(gridPos, page) {
  var s = ZOIA.state;
  if (!s.patch || !s.clipboard) return;
  var cb = s.clipboard;

  // Check if there is enough room (no overlap with existing modules)
  var bc = cb.blockCount || (cb.blocks ? cb.blocks.length : 1);
  for (var b = 0; b < bc; b++) {
    var checkPos = gridPos + b;
    if (checkPos >= ZOIA.GRID_SIZE) {
      ZOIA.log('Not enough room to paste module (extends past grid edge)');
      return;
    }
    // Check for existing occupants
    var occupied = s.patch.modules.some(function(m) {
      if (m.page !== page) return false;
      var mbc = m.blockCount || (m.blocks ? m.blocks.length : 1);
      return checkPos >= m.gridPos && checkPos < m.gridPos + mbc;
    });
    if (occupied) {
      ZOIA.log('Cannot paste: position occupied by another module');
      return;
    }
  }

  var newIdx = s.patch.modules.length;
  var newMod = {
    idx: newIdx,
    typeIdx: cb.typeIdx,
    name: cb.name + ' copy',
    typeName: cb.typeName,
    colorId: cb.colorId,
    page: page,
    gridPos: gridPos,
    blockCount: bc,
    blocks: JSON.parse(JSON.stringify(cb.blocks)),
    params: cb.params ? cb.params.slice() : [],
    options: cb.options ? cb.options.slice() : [],
    category: cb.category
  };
  s.patch.modules.push(newMod);
  s.patch.moduleCount = s.patch.modules.length;

  ZOIA.log('Pasted module "' + newMod.name + '" at position ' + gridPos + ' on page ' + page);
  ZOIA.updatePatchSummary();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};

/**
 * Disconnect all connections for a given module.
 * If the connection view is currently showing connections for this module,
 * exits connection view first. Logs the number of connections removed.
 * @param {number} modIdx - Index of the module to disconnect.
 */
ZOIA.disconnectAllConnections = function(modIdx) {
  var s = ZOIA.state;
  if (!s.patch || modIdx === null || modIdx === undefined) return;
  var m = s.patch.modules[modIdx];
  if (!m) return;

  // Exit connection view if disconnecting affects the viewed module
  if (s.connectionView && (s.selectedModule === modIdx)) {
    s.connectionView = false;
    s.connectionList = [];
    s.connectionIndex = 0;
  }

  var before = s.patch.connections.length;
  s.patch.connections = s.patch.connections.filter(function(c) {
    return c.srcMod !== modIdx && c.dstMod !== modIdx;
  });
  var removed = before - s.patch.connections.length;

  if (removed === 0) {
    ZOIA.log('Module ' + modIdx + ' has no connections to remove');
    return;
  }

  ZOIA.log('Disconnected ' + removed + ' connection(s) from module ' + modIdx + ' ("' + (m.name || m.typeName) + '")');
  ZOIA.updatePatchSummary();
  if (s.currentView === 'hw') ZOIA.hardwareView.renderAll();
  else ZOIA.schematicView.renderAll();
};


// ===== PATCH EXPORT =====

/**
 * Internal helper: download a file using multiple fallback strategies.
 * Tries Blob + object URL, then data URI, then clipboard, then console dump.
 * @param {string} content  - The file content (text).
 * @param {string} filename - The suggested filename.
 * @param {string} mimeType - MIME type for the Blob.
 */
ZOIA._downloadFile = function(content, filename, mimeType) {
  try {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    ZOIA.log('Saved: ' + filename);
  } catch (e1) {
    ZOIA.log('Blob download failed: ' + e1.message + ', trying data URI...');
    try {
      var dataUri = 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content);
      var a2 = document.createElement('a');
      a2.href = dataUri;
      a2.download = filename;
      a2.style.display = 'none';
      document.body.appendChild(a2);
      a2.click();
      document.body.removeChild(a2);
      ZOIA.log('Saved: ' + filename + ' (data URI)');
    } catch (e2) {
      ZOIA.log('Data URI failed: ' + e2.message + ', copying to clipboard...');
      try {
        navigator.clipboard.writeText(content).then(function() {
          ZOIA.log('Content copied to clipboard (' + content.length + ' chars)');
        });
      } catch (e3) {
        ZOIA.log('All save methods failed. Dumping to console...');
        ZOIA.log(content);
      }
    }
  }
};

/**
 * Internal helper: download a binary file (ArrayBuffer or Uint8Array).
 * @param {ArrayBuffer|Uint8Array} data - Binary data.
 * @param {string} filename - Suggested filename.
 */
ZOIA._downloadBinary = function(data, filename) {
  try {
    var blob = new Blob([data], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    ZOIA.log('Saved: ' + filename);
  } catch (e) {
    ZOIA.log('Binary download failed: ' + e.message);
  }
};

/**
 * Build the JSON representation of the current patch.
 * @returns {string} Pretty-printed JSON string.
 */
ZOIA._buildPatchJSON = function() {
  var p = ZOIA.state.patch;
  return JSON.stringify({
    name: p.name,
    moduleCount: p.modules.length,
    modules: p.modules.map(function(m) {
      return {
        typeIdx: m.typeIdx, name: m.name, typeName: m.typeName,
        page: m.page, colorId: m.colorId, gridPos: m.gridPos,
        blockCount: m.blockCount, params: m.params, options: m.options,
        category: m.category
      };
    }),
    connections: p.connections,
    pages: p.pages,
    labels: p.labels || [],
    description: p.description || ''
  }, null, 2);
};

/**
 * Build the ZOIA .bin binary representation of the current patch.
 * Format: 32KB (8192 uint32s), little-endian.
 * @returns {ArrayBuffer} The 32KB binary patch.
 */
ZOIA._buildPatchBIN = function() {
  var p = ZOIA.state.patch;
  var buf = new ArrayBuffer(32768);
  var dv = new DataView(buf);
  var off = 0;

  function w32(v) { dv.setUint32(off, v, true); off += 4; }
  function wStr(s, len) {
    var bytes = [];
    for (var i = 0; i < len; i++) {
      bytes.push(i < s.length ? s.charCodeAt(i) : 0);
    }
    for (var j = 0; j < bytes.length; j++) {
      dv.setUint8(off + j, bytes[j]);
    }
    off += len;
  }

  // Preset size placeholder (will fill in later)
  var presetSizeOff = off;
  w32(0);

  // Patch name (16 bytes)
  wStr(p.name || 'Untitled', 16);

  // Module count
  w32(p.modules.length);

  // Write each module
  for (var i = 0; i < p.modules.length; i++) {
    var m = p.modules[i];
    var modStartOff = off;

    // Module size placeholder (in uint32 words)
    var modSizeOff = off;
    w32(0);

    w32(m.typeIdx);
    w32(0); // version
    w32(m.page);
    w32(m.colorId);
    w32(m.gridPos);

    // Param count and params
    var params = m.params || [];
    w32(params.length);

    // Saved data size (placeholder)
    w32(0);

    // Option words (reconstruct from option bytes)
    var opts = m.options || [];
    var opt1 = (opts[0] || 0) | ((opts[1] || 0) << 8) | ((opts[2] || 0) << 16) | ((opts[3] || 0) << 24);
    var opt2 = (opts[4] || 0) | ((opts[5] || 0) << 8) | ((opts[6] || 0) << 16) | ((opts[7] || 0) << 24);
    w32(opt1);
    w32(opt2);

    // Params
    for (var pi = 0; pi < params.length; pi++) {
      w32(params[pi]);
    }

    // Module name at the end (16 bytes)
    wStr(m.name || m.typeName || '', 16);

    // Backfill module size in uint32 words
    var modSizeWords = (off - modStartOff) / 4;
    dv.setUint32(modSizeOff, modSizeWords, true);
  }

  // Connection count
  w32(p.connections.length);

  // Write connections
  for (var j = 0; j < p.connections.length; j++) {
    var c = p.connections[j];
    w32(c.srcMod);
    w32(c.srcBlock);
    w32(c.dstMod);
    w32(c.dstBlock);
    w32(c.strength !== undefined ? c.strength : 10000);
  }

  // Page count and page names
  w32(p.pages.length);
  for (var k = 0; k < p.pages.length; k++) {
    wStr(p.pages[k] || ('Page ' + (k + 1)), 16);
  }

  // Backfill preset size (total uint32 words from start)
  dv.setUint32(presetSizeOff, off / 4, true);

  return buf;
};

/**
 * Save the current patch. Shows OLED confirmation before overwriting.
 * Exports both JSON and BIN formats.
 */
ZOIA.savePatch = function() {
  var s = ZOIA.state;
  if (!s.patch) {
    ZOIA.log('No patch loaded.');
    return;
  }
  var patchName = s.patch.name || 'Untitled';

  // Show confirmation in the OLED (confirm() is blocked in sandbox)
  var oled = document.getElementById('oled');
  if (!oled) return;

  oled.innerHTML =
    '<div style="color:#e94560;font-weight:bold">SAVE PATCH</div>' +
    '<div class="dim" style="margin-top:2px">Overwrite "' + patchName + '"?</div>' +
    '<div style="margin-top:6px;display:flex;gap:8px;justify-content:center">' +
      '<button id="oled-save-yes" style="background:#e94560;color:#fff;border:none;border-radius:3px;padding:4px 16px;font-size:11px;cursor:pointer;font-family:monospace">YES</button>' +
      '<button id="oled-save-no" style="background:#333;color:#aaa;border:1px solid #555;border-radius:3px;padding:4px 16px;font-size:11px;cursor:pointer;font-family:monospace">NO</button>' +
    '</div>';

  var yesBtn = document.getElementById('oled-save-yes');
  var noBtn = document.getElementById('oled-save-no');
  if (yesBtn) {
    yesBtn.onclick = function() {
      ZOIA._doSaveFiles(patchName);
      ZOIA.oled.render();
    };
  }
  if (noBtn) {
    noBtn.onclick = function() {
      ZOIA.log('Save cancelled.');
      ZOIA.oled.render();
    };
  }
};

/**
 * Save As: use the File System Access API (showSaveFilePicker) to let the
 * user choose where to save. Falls back to Blob download if the API is
 * unavailable (e.g. sandbox restrictions).
 */
ZOIA.savePatchAs = function() {
  var s = ZOIA.state;
  if (!s.patch) {
    ZOIA.log('No patch loaded.');
    return;
  }
  var safeName = (s.patch.name || 'patch').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Try the File System Access API for a real save dialog
  if (window.showSaveFilePicker) {
    // Save JSON via file picker
    window.showSaveFilePicker({
      suggestedName: safeName + '.json',
      types: [
        { description: 'JSON Patch', accept: { 'application/json': ['.json'] } },
        { description: 'ZOIA Binary', accept: { 'application/octet-stream': ['.bin'] } }
      ]
    }).then(function(handle) {
      var fileName = handle.name || '';
      if (fileName.toLowerCase().indexOf('.bin') >= 0) {
        // User chose .bin format
        var bin = ZOIA._buildPatchBIN();
        return handle.createWritable().then(function(w) {
          return w.write(bin).then(function() { return w.close(); });
        }).then(function() {
          ZOIA.log('Saved BIN: ' + fileName);
        });
      } else {
        // Default: JSON format
        var json = ZOIA._buildPatchJSON();
        return handle.createWritable().then(function(w) {
          return w.write(json).then(function() { return w.close(); });
        }).then(function() {
          ZOIA.log('Saved JSON: ' + fileName);
        });
      }
    }).catch(function(err) {
      if (err.name !== 'AbortError') {
        ZOIA.log('Save dialog error: ' + err.message + ', using fallback download');
        ZOIA._doSaveFiles(s.patch.name || 'patch');
      }
    });
  } else {
    // Fallback: Blob download (browser will show its own save dialog)
    ZOIA.log('File picker not available, using download fallback');
    ZOIA._doSaveFiles(s.patch.name || 'patch');
  }
};

/**
 * Internal: actually perform the file save (both JSON and BIN).
 * @param {string} name - Patch name for the filename.
 */
ZOIA._doSaveFiles = function(name) {
  var safeName = (name || 'patch').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Save JSON
  var json = ZOIA._buildPatchJSON();
  ZOIA._downloadFile(json, safeName + '.json', 'application/json');

  // Save BIN
  var bin = ZOIA._buildPatchBIN();
  ZOIA._downloadBinary(bin, safeName + '.bin');

  ZOIA.log('Exported "' + name + '" as JSON + BIN');
};


// === sim-engine.js ===
/**
 * sim-engine.js — ZOIA Patch Simulation Engine
 *
 * Provides real-time audio simulation of the ZOIA patch using the Web Audio API.
 * Each module in the patch is mapped to a corresponding Web Audio node graph.
 * Connections between modules route audio/CV signals through GainNodes whose
 * gain reflects the connection strength (0-10000 → 0.0-1.0).
 *
 * Architecture:
 *   ZOIA.sim.ctx         — AudioContext (created on first play)
 *   ZOIA.sim.nodes[]     — Per-module node containers (one per patch module)
 *   ZOIA.sim.connGains[] — GainNode per connection (for strength attenuation)
 *   ZOIA.sim.running     — Boolean, true while simulation is active
 *
 * Supported modules (Tier 1):
 *   Audio Input (1), Audio Output (2), VCA (7), Oscillator (14),
 *   SV Filter (0), LFO (5), ADSR (6), Noise (38), Value (45),
 *   Delay Line (13), Distortion (11), Tone Control (12),
 *   Audio Mixer (76), Reverb (36), Chorus (29), Flanger (28),
 *   Tremolo (71), Bit Crusher (9), Audio Multiply (8),
 *   Audio Panner (57), Compressor (23)
 *
 * ES5 only — no arrow functions, no const/let, no template literals.
 */
window.ZOIA = window.ZOIA || {};

ZOIA.sim = {
  ctx: null,
  nodes: [],
  connGains: [],
  running: false,
  micStream: null,
  analyser: null,
  inputAnalyser: null,
  masterGain: null,
  testToneActive: false,
  _testToneOsc: null,
  _testToneGain: null
};


// ================================================================
//  AUDIO CONTEXT
// ================================================================

/**
 * Get or create the AudioContext. Resumes if suspended.
 * @returns {AudioContext}
 */
ZOIA.sim._getCtx = function() {
  if (!ZOIA.sim.ctx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      ZOIA.log('Web Audio API not supported');
      return null;
    }
    ZOIA.sim.ctx = new AC({ sampleRate: 44100 });
    ZOIA.log('AudioContext created (sr=' + ZOIA.sim.ctx.sampleRate + ')');
  }
  if (ZOIA.sim.ctx.state === 'suspended') {
    ZOIA.sim.ctx.resume();
  }
  return ZOIA.sim.ctx;
};


// ================================================================
//  MODULE NODE FACTORIES
// ================================================================

/**
 * Create node container for a module. Returns an object with:
 *   inputs[]   — one Web Audio node per audio_in / cv_in block
 *   outputs[]  — one Web Audio node per audio_out / cv_out / gate_out block
 *   dispose()  — cleanup function
 *
 * Block indices in the returned arrays match the module's block layout.
 * Blocks that don't produce/accept signal have null entries.
 */

// ---- Audio Input (Type 1) ----
ZOIA.sim._createAudioInput = function(ctx, mod) {
  // Audio Input brings external audio into the patch.
  // Requests microphone access via getUserMedia; falls back to silence if denied.
  var blocks = mod.blocks || [];
  var outputs = [];
  var _micStream = null;
  var _micSource = null;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'audio_out') {
      var gain = ctx.createGain();
      gain.gain.value = 1.0;
      outputs[i] = gain;
    } else {
      outputs[i] = null;
    }
  }
  // Request microphone and connect to output gains
  var _gains = outputs.filter(function(n) { return n !== null; });
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && _gains.length > 0) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      _micStream = stream;
      _micSource = ctx.createMediaStreamSource(stream);
      for (var g = 0; g < _gains.length; g++) {
        _micSource.connect(_gains[g]);
      }
      if (ZOIA.log) { ZOIA.log('[AudioInput] Microphone connected'); }
    })['catch'](function(err) {
      if (ZOIA.log) { ZOIA.log('[AudioInput] Mic denied or unavailable: ' + err.message); }
    });
  }
  return {
    type: 'audio_input',
    inputs: [],
    outputs: outputs,
    _gains: _gains,
    dispose: function() {
      if (_micSource) {
        try { _micSource.disconnect(); } catch (e) {}
      }
      if (_micStream) {
        var tracks = _micStream.getTracks();
        for (var t = 0; t < tracks.length; t++) {
          tracks[t].stop();
        }
      }
      for (var j = 0; j < this._gains.length; j++) {
        try { this._gains[j].disconnect(); } catch (e) {}
      }
    }
  };
};

// ---- Audio Output (Type 2) ----
ZOIA.sim._createAudioOutput = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var gainBlock = null;
  var merger = null;

  // Determine if stereo or mono
  var audioInCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'audio_in') audioInCount++;
  }

  // Create a gain node for the output level
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  if (audioInCount >= 2) {
    // Stereo: merge L+R
    merger = ctx.createChannelMerger(2);
    merger.connect(outGain);
  }

  var channel = 0;
  for (var j = 0; j < blocks.length; j++) {
    if (blocks[j].t === 'audio_in') {
      var inGain = ctx.createGain();
      inGain.gain.value = 1.0;
      if (merger) {
        inGain.connect(merger, 0, channel);
        channel++;
      } else {
        inGain.connect(outGain);
      }
      inputs[j] = inGain;
    } else if (blocks[j].t === 'cv_in') {
      // Gain control block
      gainBlock = j;
      inputs[j] = outGain.gain; // AudioParam — CV modulates gain
    } else {
      inputs[j] = null;
    }
  }

  // Apply initial gain from params
  if (gainBlock !== null && mod.params && mod.params[gainBlock] !== undefined) {
    outGain.gain.value = mod.params[gainBlock] / 65535;
  }

  return {
    type: 'audio_output',
    inputs: inputs,
    outputs: [],
    _outGain: outGain,
    _merger: merger,
    gainBlockIdx: gainBlock,
    dispose: function() {
      try { this._outGain.disconnect(); } catch (e) {}
      if (this._merger) try { this._merger.disconnect(); } catch (e) {}
      for (var k = 0; k < this.inputs.length; k++) {
        if (this.inputs[k] && this.inputs[k].disconnect) {
          try { this.inputs[k].disconnect(); } catch (e) {}
        }
      }
    },
    getDestinationNode: function() { return this._outGain; }
  };
};

// ---- VCA (Type 7) ----
// Uses direct AudioParam connection: CV source connects to vca.gain.
// Web Audio natively sums connected signals with the param's intrinsic value.
// When CV connected: gain.value=0, effective gain = 0 + CV signal = CV signal.
// When no CV:        gain.value=baseLevel, effective gain = baseLevel.
ZOIA.sim._createVCA = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var vca = ctx.createGain();
  vca.gain.value = 1.0;

  var levelIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      var inGain = ctx.createGain();
      inGain.gain.value = 1.0;
      inGain.connect(vca);
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      levelIdx = i;
      inputs[i] = vca.gain; // CV connects directly to VCA gain AudioParam
    } else if (b.t === 'audio_out') {
      outputs[i] = vca;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Initial level from params
  var baseLevel = 1.0;
  if (levelIdx !== null && mod.params && mod.params[levelIdx] !== undefined) {
    baseLevel = mod.params[levelIdx] / 65535;
  }
  vca.gain.value = baseLevel;

  ZOIA.log('[DIAG] VCA factory: levelIdx=' + levelIdx + ' baseLevel=' + baseLevel.toFixed(3) + ' (direct AudioParam mode)');

  return {
    type: 'vca',
    inputs: inputs,
    outputs: outputs,
    _vca: vca,
    levelIdx: levelIdx,
    dispose: function() {
      try { this._vca.disconnect(); } catch (e) {}
      for (var j = 0; j < this.inputs.length; j++) {
        if (this.inputs[j] && this.inputs[j].disconnect) {
          try { this.inputs[j].disconnect(); } catch (e) {}
        }
      }
    }
  };
};

// ---- Oscillator (Type 14) ----
ZOIA.sim._createOscillator = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 440;

  // Optional: duty cycle variant uses square wave
  var hasDuty = blocks.some(function(b) { return b.n && b.n.toLowerCase().indexOf('duty') >= 0; });
  if (hasDuty) osc.type = 'square';

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  osc.connect(outGain);

  var freqIdx = null;
  var dutyIdx = null;

  // Use a GainNode as the frequency CV input proxy.
  // A polling loop reads this node's value and applies ZOIA's
  // exponential CV-to-Hz mapping to the oscillator frequency.
  var freqProxy = ctx.createGain();
  freqProxy.gain.value = 0;
  var freqProxySrc = ctx.createConstantSource();
  freqProxySrc.offset.value = 1;
  freqProxySrc.connect(freqProxy);
  freqProxySrc.start();
  var freqAnalyser = ctx.createAnalyser();
  freqAnalyser.fftSize = 256;
  freqProxy.connect(freqAnalyser);
  var freqBuf = new Float32Array(1);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('freq') >= 0) {
      freqIdx = i;
      inputs[i] = freqProxy.gain; // CV connects here; polling maps to Hz
    } else if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('duty') >= 0) {
      dutyIdx = i;
      inputs[i] = null; // Duty cycle not directly mappable to AudioParam
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Set initial frequency from params (map 0-65535 to 20-20000 Hz exponential)
  var baseFreq = 440;
  if (freqIdx !== null && mod.params && mod.params[freqIdx] !== undefined) {
    var norm = mod.params[freqIdx] / 65535;
    baseFreq = 20 * Math.pow(1000, norm);
  }
  osc.frequency.value = baseFreq;

  ZOIA.log('[DIAG] Oscillator factory: freqIdx=' + freqIdx + ' dutyIdx=' + dutyIdx + ' baseFreq=' + baseFreq.toFixed(1) + ' blocks=' + blocks.length);

  osc.start();

  // Poll the frequency proxy input and apply exponential CV-to-Hz mapping.
  // ZOIA CV range 0-1 maps to 20-20000 Hz via: 20 * 1000^cv
  // When no CV is connected the proxy gain stays at 0 (default), so the
  // polling loop leaves frequency at the param-derived baseFreq.
  var _disposed = false;
  var _lastCV = -1;
  var _pollCount = 0;
  (function pollFreq() {
    if (_disposed) return;
    freqAnalyser.getFloatTimeDomainData(freqBuf);
    var cv = freqBuf[0];
    _pollCount++;
    if (_pollCount % 120 === 0) {
      ZOIA.log('[DIAG] Osc pollFreq: cv=' + cv.toFixed(4) + ' freq=' + osc.frequency.value.toFixed(1) + 'Hz');
    }
    if (cv !== _lastCV) {
      _lastCV = cv;
      if (cv > 0.001) {
        osc.frequency.value = 20 * Math.pow(1000, cv);
      } else if (cv <= 0.001) {
        osc.frequency.value = baseFreq;
      }
    }
    requestAnimationFrame(pollFreq);
  })();

  return {
    type: 'oscillator',
    inputs: inputs,
    outputs: outputs,
    _osc: osc,
    _outGain: outGain,
    _freqProxy: freqProxy,
    _freqProxySrc: freqProxySrc,
    _freqAnalyser: freqAnalyser,
    freqIdx: freqIdx,
    dutyIdx: dutyIdx,
    dispose: function() {
      _disposed = true;
      try { this._osc.stop(); } catch (e) {}
      try { this._osc.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._freqProxySrc.stop(); } catch (e) {}
      try { this._freqProxySrc.disconnect(); } catch (e) {}
      try { this._freqProxy.disconnect(); } catch (e) {}
      try { this._freqAnalyser.disconnect(); } catch (e) {}
    }
  };
};

// ---- SV Filter (Type 0) ----
ZOIA.sim._createSVFilter = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Create three filters for LP/HP/BP outputs
  var lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.value = 1000;
  lpFilter.Q.value = 1;

  var hpFilter = ctx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.value = 1000;
  hpFilter.Q.value = 1;

  var bpFilter = ctx.createBiquadFilter();
  bpFilter.type = 'bandpass';
  bpFilter.frequency.value = 1000;
  bpFilter.Q.value = 1;

  // Input splitter: route input to all three filters
  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(lpFilter);
  inGain.connect(hpFilter);
  inGain.connect(bpFilter);

  var freqIdx = null;
  var resIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('freq') >= 0) {
      freqIdx = i;
      // We'll update all three filters' frequency together
      inputs[i] = lpFilter.frequency; // Primary param target
    } else if (b.t === 'cv_in' && b.n && b.n.toLowerCase().indexOf('res') >= 0) {
      resIdx = i;
      inputs[i] = lpFilter.Q; // Primary param target
    } else if (b.t === 'audio_out') {
      // Map outputs by name
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('lp') >= 0 || name.indexOf('low') >= 0) {
        outputs[i] = lpFilter;
      } else if (name.indexOf('hp') >= 0 || name.indexOf('high') >= 0) {
        outputs[i] = hpFilter;
      } else if (name.indexOf('bp') >= 0 || name.indexOf('band') >= 0) {
        outputs[i] = bpFilter;
      } else {
        // Single output variant — use LP
        outputs[i] = lpFilter;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Set initial frequency from params
  if (freqIdx !== null && mod.params && mod.params[freqIdx] !== undefined) {
    var norm = mod.params[freqIdx] / 65535;
    var freq = 20 * Math.pow(1000, norm);
    lpFilter.frequency.value = freq;
    hpFilter.frequency.value = freq;
    bpFilter.frequency.value = freq;
  }

  // Set initial resonance from params (map 0-1 to Q 0.5-15)
  if (resIdx !== null && mod.params && mod.params[resIdx] !== undefined) {
    var rNorm = mod.params[resIdx] / 65535;
    var q = 0.5 + rNorm * 14.5;
    lpFilter.Q.value = q;
    hpFilter.Q.value = q;
    bpFilter.Q.value = q;
  }

  return {
    type: 'sv_filter',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _lp: lpFilter,
    _hp: hpFilter,
    _bp: bpFilter,
    freqIdx: freqIdx,
    resIdx: resIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._lp.disconnect(); } catch (e) {}
      try { this._hp.disconnect(); } catch (e) {}
      try { this._bp.disconnect(); } catch (e) {}
    },
    // Sync all filter frequencies
    setFrequency: function(freq) {
      var t = ZOIA.sim.ctx.currentTime;
      this._lp.frequency.setTargetAtTime(freq, t, 0.01);
      this._hp.frequency.setTargetAtTime(freq, t, 0.01);
      this._bp.frequency.setTargetAtTime(freq, t, 0.01);
    },
    setQ: function(q) {
      var t = ZOIA.sim.ctx.currentTime;
      this._lp.Q.setTargetAtTime(q, t, 0.01);
      this._hp.Q.setTargetAtTime(q, t, 0.01);
      this._bp.Q.setTargetAtTime(q, t, 0.01);
    }
  };
};

// ---- LFO (Type 5) ----
ZOIA.sim._createLFO = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 1.0; // 1 Hz default

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  osc.connect(outGain);

  var rateIdx = null;
  var depthIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_out') {
      outputs[i] = outGain;
    } else if (b.t === 'cv_in' && b.n && b.n.indexOf('Rate') >= 0) {
      rateIdx = i;
      inputs[i] = osc.frequency;
    } else if (b.t === 'cv_in' && b.n && b.n.indexOf('Depth') >= 0) {
      depthIdx = i;
      inputs[i] = outGain.gain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Set initial rate from params (map 0-1 to 0.01-20 Hz)
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    var norm = mod.params[rateIdx] / 65535;
    osc.frequency.value = 0.01 + norm * 19.99;
  }

  if (depthIdx !== null && mod.params && mod.params[depthIdx] !== undefined) {
    outGain.gain.value = mod.params[depthIdx] / 65535;
  }

  osc.start();

  return {
    type: 'lfo',
    inputs: inputs,
    outputs: outputs,
    _osc: osc,
    _outGain: outGain,
    rateIdx: rateIdx,
    depthIdx: depthIdx,
    dispose: function() {
      try { this._osc.stop(); } catch (e) {}
      try { this._osc.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- ADSR Envelope (Type 6) ----
ZOIA.sim._createADSR = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // ADSR uses a ConstantSourceNode to output the envelope value
  var src = ctx.createConstantSource();
  src.offset.value = 0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  src.connect(outGain);
  src.start();

  // Gate input: handled via direct JavaScript callbacks (not audio graph).
  // The post-wiring pass registers ADSR._onGateChange on source nodes'
  // _gateListeners arrays. Keyboard/Stompswitch call these on noteOn/noteOff.
  // This bypasses the Web Audio AnalyserNode which fails to read gate signals
  // from ConstantSourceNodes connected through the wiring graph.
  var _disposed = false;

  // CV modulation proxies for Attack, Decay, Sustain, Release
  var attackProxy = ctx.createGain();
  attackProxy.gain.value = 0;
  var attackSrc = ctx.createConstantSource();
  attackSrc.offset.value = 1;
  attackSrc.connect(attackProxy);
  attackSrc.start();
  var attackAnalyser = ctx.createAnalyser();
  attackAnalyser.fftSize = 256;
  attackProxy.connect(attackAnalyser);
  var _attackBuf = new Float32Array(1);

  var decayProxy = ctx.createGain();
  decayProxy.gain.value = 0;
  var decaySrc = ctx.createConstantSource();
  decaySrc.offset.value = 1;
  decaySrc.connect(decayProxy);
  decaySrc.start();
  var decayAnalyser = ctx.createAnalyser();
  decayAnalyser.fftSize = 256;
  decayProxy.connect(decayAnalyser);
  var _decayBuf = new Float32Array(1);

  var sustainProxy = ctx.createGain();
  sustainProxy.gain.value = 0;
  var sustainSrc = ctx.createConstantSource();
  sustainSrc.offset.value = 1;
  sustainSrc.connect(sustainProxy);
  sustainSrc.start();
  var sustainAnalyser = ctx.createAnalyser();
  sustainAnalyser.fftSize = 256;
  sustainProxy.connect(sustainAnalyser);
  var _sustainBuf = new Float32Array(1);

  var releaseProxy = ctx.createGain();
  releaseProxy.gain.value = 0;
  var releaseSrc = ctx.createConstantSource();
  releaseSrc.offset.value = 1;
  releaseSrc.connect(releaseProxy);
  releaseSrc.start();
  var releaseAnalyser = ctx.createAnalyser();
  releaseAnalyser.fftSize = 256;
  releaseProxy.connect(releaseAnalyser);
  var _releaseBuf = new Float32Array(1);

  // End gate output
  var endGateSrc = ctx.createConstantSource();
  endGateSrc.offset.value = 0;
  endGateSrc.start();
  var endGateOut = ctx.createGain();
  endGateOut.gain.value = 1;
  endGateSrc.connect(endGateOut);
  var _endGateTimeout = null;

  // Parse ADSR indices
  var cvOutIdx = null;
  var gateIdx = null;
  var attackIdx = null;
  var decayIdx = null;
  var sustainIdx = null;
  var releaseIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_out') {
      cvOutIdx = i;
      outputs[i] = outGain;
    } else if (b.t === 'gate_in') {
      gateIdx = i;
      inputs[i] = null; // Gate handled via direct JS callbacks, not audio graph
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('gate') >= 0) { gateIdx = i; inputs[i] = null; /* direct JS callbacks */ }
      else if (name.indexOf('attack') >= 0) { attackIdx = i; inputs[i] = attackProxy.gain; }
      else if (name.indexOf('decay') >= 0) { decayIdx = i; inputs[i] = decayProxy.gain; }
      else if (name.indexOf('sustain') >= 0) { sustainIdx = i; inputs[i] = sustainProxy.gain; }
      else if (name.indexOf('release') >= 0) { releaseIdx = i; inputs[i] = releaseProxy.gain; }
      else { inputs[i] = null; }
    } else if (b.t === 'gate_out') {
      outputs[i] = endGateOut;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  ZOIA.log('[DIAG] ADSR factory: gateIdx=' + gateIdx + ' attackIdx=' + attackIdx + ' decayIdx=' + decayIdx + ' sustainIdx=' + sustainIdx + ' releaseIdx=' + releaseIdx + ' cvOutIdx=' + cvOutIdx);

  // Read initial ADSR values from params
  var adsr = { a: 0.01, d: 0.3, s: 0.7, r: 0.5 };
  if (attackIdx !== null && mod.params && mod.params[attackIdx] !== undefined) {
    adsr.a = Math.max(0.001, (mod.params[attackIdx] / 65535) * 10);
  }
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    adsr.d = Math.max(0.001, (mod.params[decayIdx] / 65535) * 10);
  }
  if (sustainIdx !== null && mod.params && mod.params[sustainIdx] !== undefined) {
    adsr.s = mod.params[sustainIdx] / 65535;
  }
  if (releaseIdx !== null && mod.params && mod.params[releaseIdx] !== undefined) {
    adsr.r = Math.max(0.001, (mod.params[releaseIdx] / 65535) * 10);
  }

  // Store base values as fallbacks when no CV is connected
  var _baseA = adsr.a;
  var _baseD = adsr.d;
  var _baseS = adsr.s;
  var _baseR = adsr.r;

  ZOIA.log('[DIAG] ADSR params: a=' + adsr.a.toFixed(3) + ' d=' + adsr.d.toFixed(3) + ' s=' + adsr.s.toFixed(3) + ' r=' + adsr.r.toFixed(3));

  var node = {
    type: 'adsr',
    inputs: inputs,
    outputs: outputs,
    _src: src,
    _outGain: outGain,
    adsr: adsr,
    _gateOpen: false,
    _gateBlockIdx: gateIdx,
    dispose: function() {
      _disposed = true;
      if (_endGateTimeout) { clearTimeout(_endGateTimeout); }
      try { attackSrc.stop(); } catch (e) {}
      try { attackSrc.disconnect(); } catch (e) {}
      try { attackProxy.disconnect(); } catch (e) {}
      try { attackAnalyser.disconnect(); } catch (e) {}
      try { decaySrc.stop(); } catch (e) {}
      try { decaySrc.disconnect(); } catch (e) {}
      try { decayProxy.disconnect(); } catch (e) {}
      try { decayAnalyser.disconnect(); } catch (e) {}
      try { sustainSrc.stop(); } catch (e) {}
      try { sustainSrc.disconnect(); } catch (e) {}
      try { sustainProxy.disconnect(); } catch (e) {}
      try { sustainAnalyser.disconnect(); } catch (e) {}
      try { releaseSrc.stop(); } catch (e) {}
      try { releaseSrc.disconnect(); } catch (e) {}
      try { releaseProxy.disconnect(); } catch (e) {}
      try { releaseAnalyser.disconnect(); } catch (e) {}
      try { endGateSrc.stop(); } catch (e) {}
      try { endGateSrc.disconnect(); } catch (e) {}
      try { endGateOut.disconnect(); } catch (e) {}
      try { this._src.stop(); } catch (e) {}
      try { this._src.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    },
    trigger: function() {
      if (_endGateTimeout) { clearTimeout(_endGateTimeout); _endGateTimeout = null; }
      var t = ZOIA.sim.ctx.currentTime;
      var o = this._src.offset;
      o.cancelScheduledValues(t);
      o.setValueAtTime(0, t);
      o.linearRampToValueAtTime(1.0, t + this.adsr.a);
      o.linearRampToValueAtTime(this.adsr.s, t + this.adsr.a + this.adsr.d);
      this._gateOpen = true;
    },
    release: function() {
      if (!this._gateOpen) return;
      var t = ZOIA.sim.ctx.currentTime;
      var o = this._src.offset;
      o.cancelScheduledValues(t);
      o.setTargetAtTime(0, t, this.adsr.r / 5);
      this._gateOpen = false;
      // Schedule end gate pulse after release time completes
      if (_endGateTimeout) { clearTimeout(_endGateTimeout); }
      _endGateTimeout = setTimeout(function() {
        var t2 = ZOIA.sim.ctx.currentTime;
        endGateSrc.offset.setValueAtTime(1, t2);
        endGateSrc.offset.setValueAtTime(0, t2 + 0.002);
        _endGateTimeout = null;
      }, Math.round(node.adsr.r * 1000));
    }
  };

  // Direct gate change callback — called by source modules (Keyboard, Stompswitch)
  // via the _gateListeners array registered in the post-wiring pass.
  // value: 1 = gate on, 0 = gate off
  node._onGateChange = function(value) {
    ZOIA.log('[DIAG] ADSR _onGateChange: value=' + value + ' gateOpen=' + node._gateOpen);
    if (value > 0.5 && !node._gateOpen) {
      node.trigger();
    } else if (value <= 0.5 && node._gateOpen) {
      node.release();
    }
  };

  // Poll ADSR CV modulation inputs (attack, decay, sustain, release)
  // Gate detection is handled via direct JS callbacks, not polling.
  (function pollADSR() {
    if (_disposed) return;

    // Read CV modulation for Attack
    attackAnalyser.getFloatTimeDomainData(_attackBuf);
    var aCV = _attackBuf[0];
    if (aCV > 0.001) {
      node.adsr.a = Math.max(0.001, aCV * 10);
    } else {
      node.adsr.a = _baseA;
    }

    // Read CV modulation for Decay
    decayAnalyser.getFloatTimeDomainData(_decayBuf);
    var dCV = _decayBuf[0];
    if (dCV > 0.001) {
      node.adsr.d = Math.max(0.001, dCV * 10);
    } else {
      node.adsr.d = _baseD;
    }

    // Read CV modulation for Sustain (direct 0-1 range)
    sustainAnalyser.getFloatTimeDomainData(_sustainBuf);
    var sCV = _sustainBuf[0];
    if (sCV > 0.001) {
      node.adsr.s = sCV;
    } else {
      node.adsr.s = _baseS;
    }

    // Read CV modulation for Release
    releaseAnalyser.getFloatTimeDomainData(_releaseBuf);
    var rCV = _releaseBuf[0];
    if (rCV > 0.001) {
      node.adsr.r = Math.max(0.001, rCV * 10);
    } else {
      node.adsr.r = _baseR;
    }

    requestAnimationFrame(pollADSR);
  })();

  return node;
};

// ---- Noise (Type 38) ----
ZOIA.sim._createNoise = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var outputs = [];

  // Create a noise buffer (2 seconds of white noise)
  var bufLen = ctx.sampleRate * 2;
  var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  var data = noiseBuf.getChannelData(0);
  for (var s = 0; s < bufLen; s++) {
    data[s] = Math.random() * 2 - 1;
  }

  var src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  src.connect(outGain);
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      outputs[i] = null;
    }
  }

  return {
    type: 'noise',
    inputs: [],
    outputs: outputs,
    _src: src,
    _outGain: outGain,
    dispose: function() {
      try { this._src.stop(); } catch (e) {}
      try { this._src.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Value (Type 45) ----
ZOIA.sim._createValue = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0.5; // Default midpoint
  src.start();

  if (mod.params && mod.params[0] !== undefined) {
    src.offset.value = mod.params[0] / 65535;
  }

  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'cv_out') {
      outputs[i] = src;
    } else {
      outputs[i] = null;
    }
  }

  return {
    type: 'value',
    inputs: [],
    outputs: outputs,
    _src: src,
    dispose: function() {
      try { this._src.stop(); } catch (e) {}
      try { this._src.disconnect(); } catch (e) {}
    }
  };
};

// ---- Delay Line (Type 13) ----
ZOIA.sim._createDelay = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var delay = ctx.createDelay(5.0); // max 5s
  delay.delayTime.value = 0.3;

  var feedback = ctx.createGain();
  feedback.gain.value = 0.4;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.5;

  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;

  // Signal flow: input -> delay -> feedback -> delay (loop)
  //              input -> dryGain -> outGain
  //              delay -> wetGain -> outGain
  inGain.connect(delay);
  inGain.connect(dryGain);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  var timeIdx = null, fbIdx = null, mixIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('time') >= 0) {
        timeIdx = i;
        inputs[i] = delay.delayTime;
      } else if (name.indexOf('feed') >= 0) {
        fbIdx = i;
        inputs[i] = feedback.gain;
      } else if (name.indexOf('mix') >= 0) {
        mixIdx = i;
        inputs[i] = null; // Mix handled manually
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Initial params
  if (timeIdx !== null && mod.params && mod.params[timeIdx] !== undefined) {
    delay.delayTime.value = (mod.params[timeIdx] / 65535) * 5.0;
  }
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    feedback.gain.value = mod.params[fbIdx] / 65535;
  }
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    var mix = mod.params[mixIdx] / 65535;
    wetGain.gain.value = mix;
    dryGain.gain.value = 1 - mix;
  }

  return {
    type: 'delay',
    inputs: inputs,
    outputs: outputs,
    _delay: delay,
    _feedback: feedback,
    _inGain: inGain,
    _outGain: outGain,
    _dryGain: dryGain,
    _wetGain: wetGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._feedback.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Distortion / OD (Type 11) ----
ZOIA.sim._createDistortion = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var shaper = ctx.createWaveShaper();
  shaper.oversample = '2x';

  // Generate a soft-clip curve
  var curve = new Float32Array(44100);
  for (var s = 0; s < 44100; s++) {
    var x = (s / 44100) * 2 - 1;
    curve[s] = Math.tanh(x * 2);
  }
  shaper.curve = curve;

  var preGain = ctx.createGain();
  preGain.gain.value = 2.0;

  var toneFilter = ctx.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 6000;

  var outGain = ctx.createGain();
  outGain.gain.value = 0.7;

  preGain.connect(shaper);
  shaper.connect(toneFilter);
  toneFilter.connect(outGain);

  var driveIdx = null, toneIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = preGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('drive') >= 0) {
        driveIdx = i;
        inputs[i] = preGain.gain;
      } else if (name.indexOf('tone') >= 0) {
        toneIdx = i;
        inputs[i] = toneFilter.frequency;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  if (driveIdx !== null && mod.params && mod.params[driveIdx] !== undefined) {
    preGain.gain.value = 1 + (mod.params[driveIdx] / 65535) * 10;
  }
  if (toneIdx !== null && mod.params && mod.params[toneIdx] !== undefined) {
    toneFilter.frequency.value = 200 + (mod.params[toneIdx] / 65535) * 7800;
  }

  return {
    type: 'distortion',
    inputs: inputs,
    outputs: outputs,
    _preGain: preGain,
    _shaper: shaper,
    _toneFilter: toneFilter,
    _outGain: outGain,
    dispose: function() {
      try { this._preGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
      try { this._toneFilter.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Tone Control (Type 12) ----
ZOIA.sim._createToneControl = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 200;
  lowShelf.gain.value = 0;

  var midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 1;
  midPeak.gain.value = 0;

  var highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 4000;
  highShelf.gain.value = 0;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  inGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('bass') >= 0 || name.indexOf('low') >= 0) {
        inputs[i] = lowShelf.gain;
      } else if (name.indexOf('mid') >= 0) {
        inputs[i] = midPeak.gain;
      } else if (name.indexOf('treble') >= 0 || name.indexOf('high') >= 0) {
        inputs[i] = highShelf.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = highShelf;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'tone_control',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _low: lowShelf,
    _mid: midPeak,
    _high: highShelf,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._low.disconnect(); } catch (e) {}
      try { this._mid.disconnect(); } catch (e) {}
      try { this._high.disconnect(); } catch (e) {}
    }
  };
};

// ---- Audio Mixer (Type 76) ----
ZOIA.sim._createAudioMixer = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      var inG = ctx.createGain();
      inG.gain.value = 1.0;
      inG.connect(outGain);
      inputs[i] = inG;
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'audio_mixer',
    inputs: inputs,
    outputs: outputs,
    _outGain: outGain,
    dispose: function() {
      try { this._outGain.disconnect(); } catch (e) {}
      for (var j = 0; j < this.inputs.length; j++) {
        if (this.inputs[j] && this.inputs[j].disconnect) {
          try { this.inputs[j].disconnect(); } catch (e) {}
        }
      }
    }
  };
};

// ---- Reverb (Type 36) ----
ZOIA.sim._createReverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Build a simple convolution reverb with synthetic IR
  var convolver = ctx.createConvolver();
  var irLen = ctx.sampleRate * 2; // 2 second reverb tail
  var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = irBuf.getChannelData(ch);
    for (var s = 0; s < irLen; s++) {
      d[s] = (Math.random() * 2 - 1) * Math.pow(1 - s / irLen, 2);
    }
  }
  convolver.buffer = irBuf;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.5;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  var mixIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('mix') >= 0) {
        mixIdx = i;
        inputs[i] = null;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    var mix = mod.params[mixIdx] / 65535;
    wetGain.gain.value = mix;
    dryGain.gain.value = 1 - mix;
  }

  return {
    type: 'reverb',
    inputs: inputs,
    outputs: outputs,
    _convolver: convolver,
    _inGain: inGain,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Chorus (Type 29) ----
ZOIA.sim._createChorus = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var delay = ctx.createDelay(0.1);
  delay.delayTime.value = 0.02; // 20ms base
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1.5;
  var lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.005; // 5ms modulation depth
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.7;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.5;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(delay);
  inGain.connect(dryGain);
  delay.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) inputs[i] = lfo.frequency;
      else if (name.indexOf('depth') >= 0) inputs[i] = lfoGain.gain;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = outGain; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'chorus',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _delay: delay, _lfo: lfo, _lfoGain: lfoGain,
    _dryGain: dryGain, _wetGain: wetGain, _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Flanger (Type 28) ----
ZOIA.sim._createFlanger = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var delay = ctx.createDelay(0.02);
  delay.delayTime.value = 0.003;
  var feedback = ctx.createGain();
  feedback.gain.value = 0.7;
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.5;
  var lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.002;
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  inGain.connect(outGain);
  delay.connect(outGain);

  // Read initial params
  var fbIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pname = (blocks[p].n || '').toLowerCase();
      if (pname.indexOf('feedback') >= 0) fbIdx = p;
    }
  }
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    feedback.gain.value = mod.params[fbIdx] / 65535;
  }

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) inputs[i] = lfo.frequency;
      else if (name.indexOf('depth') >= 0) inputs[i] = lfoGain.gain;
      else if (name.indexOf('feedback') >= 0) inputs[i] = feedback.gain;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = outGain; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'flanger',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _delay: delay, _feedback: feedback,
    _lfo: lfo, _lfoGain: lfoGain, _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._feedback.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Tremolo (Type 71) ----
ZOIA.sim._createTremolo = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var trem = ctx.createGain();
  trem.gain.value = 0.75;
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  var lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain);
  lfoGain.connect(trem.gain);
  lfo.start();

  inGain.connect(trem);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) inputs[i] = lfo.frequency;
      else if (name.indexOf('depth') >= 0) inputs[i] = lfoGain.gain;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = trem; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'tremolo',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _trem: trem, _lfo: lfo, _lfoGain: lfoGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._trem.disconnect(); } catch (e) {}
    }
  };
};

// ---- Bit Crusher (Type 9) ----
ZOIA.sim._createBitCrusher = function(ctx, mod) {
  // Bit crusher uses a WaveShaperNode with stepped curve for quantization
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var shaper = ctx.createWaveShaper();
  var bits = 8;
  if (mod.params && mod.params[1] !== undefined) {
    bits = Math.max(1, Math.round(1 + (mod.params[1] / 65535) * 15));
  }
  var steps = Math.pow(2, bits);
  var curve = new Float32Array(44100);
  for (var s = 0; s < 44100; s++) {
    var x = (s / 44100) * 2 - 1;
    curve[s] = Math.round(x * steps) / steps;
  }
  shaper.curve = curve;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(shaper);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') { inputs[i] = null; }
    else if (b.t === 'audio_out') { outputs[i] = shaper; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'bitcrusher',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _shaper: shaper,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
    }
  };
};

// ---- Audio Multiply / Ring Mod (Type 8) ----
ZOIA.sim._createAudioMultiply = function(ctx, mod) {
  // Ring modulation approximation: multiply two signals
  // Web Audio doesn't have native multiply, so we use a GainNode
  // where one input modulates the gain of the other
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var carrier = ctx.createGain();
  carrier.gain.value = 0; // Will be modulated
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  carrier.connect(outGain);

  var inputCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inputCount === 0) {
        inputs[i] = carrier; // First input = audio through
        inputCount++;
      } else {
        inputs[i] = carrier.gain; // Second input modulates gain
        inputCount++;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'audio_multiply',
    inputs: inputs, outputs: outputs,
    _carrier: carrier, _outGain: outGain,
    dispose: function() {
      try { this._carrier.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};

// ---- Compressor (Type 23) ----
ZOIA.sim._createCompressor = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(comp);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('thresh') >= 0) inputs[i] = comp.threshold;
      else if (name.indexOf('ratio') >= 0) inputs[i] = comp.ratio;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') { outputs[i] = comp; }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'compressor',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _comp: comp,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._comp.disconnect(); } catch (e) {}
    }
  };
};

// ---- Audio Panner (Type 57) ----
ZOIA.sim._createPanner = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var panner = ctx.createStereoPanner();
  panner.pan.value = 0; // center

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  inGain.connect(panner);

  // Split output to L and R gains
  var splitter = ctx.createChannelSplitter(2);
  panner.connect(splitter);

  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') { inputs[i] = inGain; }
    else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('pan') >= 0) inputs[i] = panner.pan;
      else inputs[i] = null;
    }
    else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lGain; outIdx++; }
      else { outputs[i] = rGain; outIdx++; }
    }
    else { inputs[i] = null; outputs[i] = null; }
  }

  return {
    type: 'panner',
    inputs: inputs, outputs: outputs,
    _inGain: inGain, _panner: panner, _splitter: splitter,
    _lGain: lGain, _rGain: rGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._panner.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
    }
  };
};


// ---- Generic Pass-through (for unsupported modules) ----
ZOIA.sim._createPassthrough = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var through = ctx.createGain();
  through.gain.value = 1.0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = through;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = through;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'passthrough',
    inputs: inputs,
    outputs: outputs,
    _through: through,
    dispose: function() {
      try { this._through.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  MODULE FACTORY DISPATCHER
// ================================================================

ZOIA.sim._createModuleNode = function(ctx, mod) {
  var typeIdx = mod.typeIdx;
  // Look up factory; fall back to passthrough for unimplemented types
  var factory = ZOIA.sim._moduleFactories[typeIdx];
  if (factory) {
    var node = factory(ctx, mod);
    ZOIA.log('SIM:   [' + mod.idx + '] "' + mod.name + '" type=' + typeIdx + ' -> ' + node.type + ' (inputs=' + node.inputs.length + ', outputs=' + node.outputs.length + ')');
    for (var _di = 0; _di < node.inputs.length; _di++) {
      var _inp = node.inputs[_di];
      ZOIA.log('SIM:     input[' + _di + '] = ' + (_inp === null ? 'NULL' : (_inp instanceof AudioParam ? 'AudioParam' : 'AudioNode')));
    }
    for (var _do = 0; _do < node.outputs.length; _do++) {
      var _out = node.outputs[_do];
      ZOIA.log('SIM:     output[' + _do + '] = ' + (_out === null ? 'NULL' : (_out instanceof AudioParam ? 'AudioParam' : 'AudioNode')));
    }
    return node;
  }
  ZOIA.log('SIM:   [' + mod.idx + '] "' + mod.name + '" type=' + typeIdx + ' -> PASSTHROUGH (no factory)');
  return ZOIA.sim._createPassthrough(ctx, mod);
};

/**
 * Module factory registry. Maps typeIdx -> factory function.
 * Core factories are registered here; additional files append to this table.
 */
ZOIA.sim._moduleFactories = {
  // ---- Core (sim-engine.js) ----
  0:  ZOIA.sim._createSVFilter,
  1:  ZOIA.sim._createAudioInput,
  2:  ZOIA.sim._createAudioOutput,
  5:  ZOIA.sim._createLFO,
  6:  ZOIA.sim._createADSR,
  7:  ZOIA.sim._createVCA,
  8:  ZOIA.sim._createAudioMultiply,
  9:  ZOIA.sim._createBitCrusher,
  11: ZOIA.sim._createDistortion,
  12: ZOIA.sim._createToneControl,
  13: ZOIA.sim._createDelay,
  14: ZOIA.sim._createOscillator,
  23: ZOIA.sim._createCompressor,
  25: ZOIA.sim._createReverb,     // Plate Reverb -> reuse Reverb factory
  26: ZOIA.sim._createReverb,     // Hall Reverb -> reuse Reverb factory
  27: ZOIA.sim._createReverb,     // Shimmer Reverb -> reuse Reverb factory
  67: ZOIA.sim._createReverb,     // Ghostverb (HW alias of Shimmer, kept by _NO_REMAP_TYPES)
  28: ZOIA.sim._createFlanger,
  29: ZOIA.sim._createChorus,
  36: ZOIA.sim._createReverb,
  38: ZOIA.sim._createNoise,
  45: ZOIA.sim._createValue,
  57: ZOIA.sim._createPanner,
  71: ZOIA.sim._createTremolo,
  76: ZOIA.sim._createAudioMixer,
  82: ZOIA.sim._createReverb,     // Reverb Lite -> reuse Reverb factory
  85: ZOIA.sim._createDelay,      // Delay -> reuse Delay factory
  86: ZOIA.sim._createDelay,      // Delay w/Mod -> reuse Delay factory (no mod sim)
  94: ZOIA.sim._createReverb       // Reverb Lite Stro -> reuse Reverb factory
};


// ================================================================
//  BUILD & CONNECT GRAPH
// ================================================================

/**
 * Build the full Web Audio graph from the current patch.
 * Creates one node container per module, then wires connections.
 */
ZOIA.sim.build = function() {
  var ctx = ZOIA.sim._getCtx();
  if (!ctx) return;
  var s = ZOIA.state;
  if (!s.patch) return;

  ZOIA.sim.teardown();

  var modules = s.patch.modules;
  var nodes = [];

  // Create analyser and master gain for visualization/monitoring
  ZOIA.sim.analyser = ctx.createAnalyser();
  ZOIA.sim.analyser.fftSize = 2048;
  ZOIA.sim.masterGain = ctx.createGain();
  ZOIA.sim.masterGain.gain.value = 1.0;
  ZOIA.sim.masterGain.connect(ZOIA.sim.analyser);
  ZOIA.sim.analyser.connect(ctx.destination);

  // Create input analyser for oscilloscope INPUT display
  ZOIA.sim.inputAnalyser = ctx.createAnalyser();
  ZOIA.sim.inputAnalyser.fftSize = 2048;

  // Phase 1: Create all module nodes
  ZOIA.log('SIM: Creating ' + modules.length + ' module nodes...');
  for (var i = 0; i < modules.length; i++) {
    ZOIA.log('[DIAG] Creating node for mod ' + i + ' type=' + modules[i].typeIdx);
    var node = ZOIA.sim._createModuleNode(ctx, modules[i]);
    node._modIdx = i;
    node._level = 0;  // Current signal level (0-1) for grid visualization

    // Attach a lightweight AnalyserNode for per-module signal level metering.
    // Prefer tapping the first output; fall back to first input for sink modules.
    node._analyser = null;
    node._analyserBuf = null;
    var mBlocks = modules[i].blocks || [];
    var tapped = false;
    // Try outputs first
    for (var ob = 0; ob < mBlocks.length && !tapped; ob++) {
      var obt = mBlocks[ob].t;
      if ((obt === 'audio_out' || obt === 'cv_out' || obt === 'gate_out') && node.outputs[ob]) {
        var meterOut = ctx.createAnalyser();
        meterOut.fftSize = 256;
        meterOut.smoothingTimeConstant = 0.6;
        try {
          node.outputs[ob].connect(meterOut);
          node._analyser = meterOut;
          node._analyserBuf = new Uint8Array(meterOut.frequencyBinCount);
          tapped = true;
        } catch (e) {}
      }
    }
    // Fall back to inputs (for sink modules like Audio Output, Pixel, MIDI Out)
    for (var ib = 0; ib < mBlocks.length && !tapped; ib++) {
      var ibt = mBlocks[ib].t;
      if ((ibt === 'audio_in' || ibt === 'cv_in' || ibt === 'gate_in') && node.inputs[ib]) {
        // Only tap AudioNode inputs, not AudioParam inputs
        if (node.inputs[ib] instanceof AudioParam) continue;
        var meterIn = ctx.createAnalyser();
        meterIn.fftSize = 256;
        meterIn.smoothingTimeConstant = 0.6;
        try {
          node.inputs[ib].connect(meterIn);
          node._analyser = meterIn;
          node._analyserBuf = new Uint8Array(meterIn.frequencyBinCount);
          tapped = true;
        } catch (e) {}
      }
    }

    nodes.push(node);

    // Connect Audio Output modules to master output
    if (modules[i].typeIdx === 2 && node.getDestinationNode) {
      node.getDestinationNode().connect(ZOIA.sim.masterGain);
    }

    // Tap Audio Input module outputs into the input analyser
    if (modules[i].typeIdx === 1) {
      for (var ai = 0; ai < node.outputs.length; ai++) {
        if (node.outputs[ai]) {
          try { node.outputs[ai].connect(ZOIA.sim.inputAnalyser); } catch (e) {}
        }
      }
    }
  }

  // Phase 2: Wire connections
  var conns = s.patch.connections;
  var connGains = [];
  var wired = 0;
  var skipped = 0;

  ZOIA.log('SIM: Wiring ' + conns.length + ' connections...');
  for (var j = 0; j < conns.length; j++) {
    var c = conns[j];
    var srcNode = nodes[c.srcMod];
    var dstNode = nodes[c.dstMod];

    if (!srcNode || !dstNode) {
      ZOIA.log('SIM:   SKIP conn[' + j + '] mod' + c.srcMod + '[' + c.srcBlock + ']->mod' + c.dstMod + '[' + c.dstBlock + ']: missing node (src=' + !!srcNode + ' dst=' + !!dstNode + ')');
      skipped++; continue;
    }

    var srcOut = srcNode.outputs[c.srcBlock];
    var dstIn = dstNode.inputs[c.dstBlock];

    if (!srcOut && modules[c.srcMod] && modules[c.srcMod].typeIdx === 13) {
      var srcBlocks = modules[c.srcMod].blocks || [];
      for (var ao = 0; ao < srcBlocks.length; ao++) {
        if (srcBlocks[ao].t === 'audio_out' && srcNode.outputs[ao]) {
          srcOut = srcNode.outputs[ao];
          ZOIA.log('SIM:   COMPAT conn[' + j + '] Delay Line source block ' + c.srcBlock + ' resolved to audio_out block ' + ao);
          break;
        }
      }
    }

    if (!srcOut && modules[c.srcMod]) {
      var compatSrcBlocks = modules[c.srcMod].blocks || [];
      for (var co = 0; co < compatSrcBlocks.length; co++) {
        var cot = compatSrcBlocks[co].t;
        if ((cot === 'audio_out' || cot === 'cv_out' || cot === 'gate_out') && srcNode.outputs[co]) {
          srcOut = srcNode.outputs[co];
          ZOIA.log('SIM:   COMPAT conn[' + j + '] source block ' + c.srcBlock + ' on "' + modules[c.srcMod].name + '" resolved to output block ' + co);
          break;
        }
      }
    }

    if (!srcOut || !dstIn) {
      var _sm = modules[c.srcMod]; var _dm = modules[c.dstMod];
      var _sbn = _sm && _sm.blocks && _sm.blocks[c.srcBlock] ? _sm.blocks[c.srcBlock].n : '?';
      var _dbn = _dm && _dm.blocks && _dm.blocks[c.dstBlock] ? _dm.blocks[c.dstBlock].n : '?';
      ZOIA.log('SIM:   SKIP conn[' + j + '] "' + (_sm ? _sm.name : '?') + '"[' + c.srcBlock + ':' + _sbn + ']->"' + (_dm ? _dm.name : '?') + '"[' + c.dstBlock + ':' + _dbn + ']: null endpoint (srcOut=' + !!srcOut + ' dstIn=' + !!dstIn + ')');
      skipped++; continue;
    }

    // Connection strength as a GainNode (0-10000 -> 0.0-1.0)
    var strength = (c.strength !== undefined ? c.strength : 10000) / 10000;
    var connGain = ctx.createGain();
    connGain.gain.value = strength;

    try {
      // If destination is an AudioParam, connect source -> gain -> param
      if (dstIn instanceof AudioParam) {
        srcOut.connect(connGain);
        connGain.connect(dstIn);
      } else {
        // Normal AudioNode -> AudioNode connection
        srcOut.connect(connGain);
        connGain.connect(dstIn);
      }
      connGains.push({ gain: connGain, connIdx: j });
      wired++;
      var _wsm = modules[c.srcMod]; var _wdm = modules[c.dstMod];
      var _wsbn = _wsm && _wsm.blocks && _wsm.blocks[c.srcBlock] ? _wsm.blocks[c.srcBlock].n : '?';
      var _wdbn = _wdm && _wdm.blocks && _wdm.blocks[c.dstBlock] ? _wdm.blocks[c.dstBlock].n : '?';
      ZOIA.log('SIM:   WIRED "' + (_wsm ? _wsm.name : '?') + '"[' + c.srcBlock + ':' + _wsbn + ']->"' + (_wdm ? _wdm.name : '?') + '"[' + c.dstBlock + ':' + _wdbn + '] str=' + strength + (dstIn instanceof AudioParam ? ' (param)' : ''));
    } catch (e) {
      var _esm = modules[c.srcMod]; var _edm = modules[c.dstMod];
      ZOIA.log('SIM:   ERROR conn[' + j + '] "' + (_esm ? _esm.name : '?') + '"[' + c.srcBlock + ']->"' + (_edm ? _edm.name : '?') + '"[' + c.dstBlock + ']: ' + e.message);
      skipped++;
    }
  }

  ZOIA.sim.nodes = nodes;
  ZOIA.log('[DIAG] Sim nodes created: ' + ZOIA.sim.nodes.length + ' nodes');
  ZOIA.sim.connGains = connGains;

  ZOIA.log('SIM: Graph built. ' + wired + ' connections wired, ' + skipped + ' skipped.');

  // Post-wiring pass 1: for VCA nodes with a CV connection to their level input,
  // set gain.value=0 so the connected CV signal controls the gain entirely.
  // Without this, the baseLevel (e.g. 1.0) would be ADDED to the CV signal.
  for (var k = 0; k < conns.length; k++) {
    var ck = conns[k];
    var dkNode = nodes[ck.dstMod];
    if (dkNode && dkNode.type === 'vca' && dkNode.levelIdx !== null && ck.dstBlock === dkNode.levelIdx) {
      dkNode._vca.gain.value = 0;
      ZOIA.log('[DIAG] VCA mod' + ck.dstMod + ': level CV connected, gain.value set to 0 (CV takes over)');
    }
    if (dkNode && dkNode.type === 'ring_mod' && dkNode.inputs && dkNode.inputs[ck.dstBlock] instanceof AudioParam) {
      dkNode._carrier.gain.value = 0;
      ZOIA.log('[DIAG] Ring Mod mod' + ck.dstMod + ': modulator connected, carrier gain.value set to 0');
    }
  }

  // Gate callbacks are now handled at call time by ZOIA.sim._fireGateCallbacks()
  // in sim-mod-interface.js. Keyboard/Stompswitch scan connections directly when
  // noteOn/noteOff/toggle are called, finding connected ADSR gate inputs and
  // invoking their _onGateChange callbacks. No pre-registration needed.
};

/**
 * Tear down the audio graph. Disconnects and disposes all nodes.
 */
ZOIA.sim.teardown = function() {
  // Dispose module nodes (and per-module analysers)
  for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
    var n = ZOIA.sim.nodes[i];
    if (n) {
      if (n._analyser) {
        try { n._analyser.disconnect(); } catch (e) {}
        n._analyser = null;
      }
      if (n.dispose) n.dispose();
    }
  }
  ZOIA.sim.nodes = [];
  // Reset grid button brightness
  ZOIA.sim._resetGridLevels();

  // Dispose connection gains
  for (var j = 0; j < ZOIA.sim.connGains.length; j++) {
    try { ZOIA.sim.connGains[j].gain.disconnect(); } catch (e) {}
  }
  ZOIA.sim.connGains = [];

  // Dispose master chain
  if (ZOIA.sim.masterGain) {
    try { ZOIA.sim.masterGain.disconnect(); } catch (e) {}
    ZOIA.sim.masterGain = null;
  }
  if (ZOIA.sim.analyser) {
    try { ZOIA.sim.analyser.disconnect(); } catch (e) {}
    ZOIA.sim.analyser = null;
  }
  if (ZOIA.sim.inputAnalyser) {
    try { ZOIA.sim.inputAnalyser.disconnect(); } catch (e) {}
    ZOIA.sim.inputAnalyser = null;
  }

  // Stop mic
  if (ZOIA.sim.micStream) {
    ZOIA.sim.micStream.getTracks().forEach(function(t) { t.stop(); });
    ZOIA.sim.micStream = null;
  }

  // Stop test tone
  ZOIA.sim.disconnectTestTone();
};


// ================================================================
//  START / STOP / TOGGLE
// ================================================================

/**
 * Start the simulation. Builds the graph if needed.
 */
ZOIA.sim.start = function() {
  if (ZOIA.sim.running) return;
  if (!ZOIA.state.patch) {
    ZOIA.log('SIM: No patch loaded.');
    return;
  }

  ZOIA.sim.build();
  ZOIA.sim.running = true;
  ZOIA.state.mode = 'play';
  ZOIA.log('SIM: Simulation started.');
  ZOIA.sim._updateUI();
  ZOIA.sim._startViz();
  if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.init();
  if (ZOIA.hardwareView) ZOIA.hardwareView.renderAll();
};

/**
 * Stop the simulation. Tears down the graph.
 */
ZOIA.sim.stop = function() {
  if (!ZOIA.sim.running) return;
  ZOIA.sim.running = false;
  ZOIA.state.mode = 'edit';
  ZOIA.sim.teardown();
  ZOIA.log('SIM: Simulation stopped.');
  ZOIA.sim._updateUI();
  ZOIA.sim._stopViz();
  if (ZOIA.hardwareView) ZOIA.hardwareView.renderAll();
};

/**
 * Toggle the simulation on/off.
 */
ZOIA.sim.toggle = function() {
  if (ZOIA.sim.running) ZOIA.sim.stop();
  else ZOIA.sim.start();
};


// ================================================================
//  MICROPHONE INPUT
// ================================================================

/**
 * Connect microphone to all Audio Input modules.
 */
ZOIA.sim.connectMic = function() {
  if (!ZOIA.sim.running || !ZOIA.sim.ctx) return;
  var ctx = ZOIA.sim.ctx;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    ZOIA.sim.micStream = stream;
    var micSource = ctx.createMediaStreamSource(stream);

    // Find all Audio Input module nodes and connect mic to them
    for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
      var node = ZOIA.sim.nodes[i];
      if (node.type === 'audio_input') {
        for (var j = 0; j < node.outputs.length; j++) {
          if (node.outputs[j]) {
            micSource.connect(node.outputs[j]);
          }
        }
        ZOIA.log('SIM: Mic connected to Audio Input module ' + i);
      }
    }
  }).catch(function(err) {
    ZOIA.log('SIM: Mic access denied: ' + err.message);
  });
};


// ================================================================
//  TEST TONE
// ================================================================

/**
 * Connect a test tone (440 Hz sine wave) to all Audio Input module outputs.
 * Feeds both IN L and IN R at moderate volume.
 */
ZOIA.sim.connectTestTone = function() {
  if (!ZOIA.sim.running || !ZOIA.sim.ctx) return;
  ZOIA.sim.disconnectTestTone(); // clean up any existing

  var ctx = ZOIA.sim.ctx;
  var osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 440;

  var gain = ctx.createGain();
  gain.gain.value = 0.3; // moderate level so effects are audible without clipping

  osc.connect(gain);

  // Route to all Audio Input module outputs (IN L and IN R)
  var connected = 0;
  for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
    var node = ZOIA.sim.nodes[i];
    if (node.type === 'audio_input') {
      for (var j = 0; j < node.outputs.length; j++) {
        if (node.outputs[j]) {
          gain.connect(node.outputs[j]);
          connected++;
        }
      }
    }
  }

  osc.start();
  ZOIA.sim._testToneOsc = osc;
  ZOIA.sim._testToneGain = gain;
  ZOIA.sim.testToneActive = true;

  ZOIA.log('SIM: Test tone (440 Hz) connected to ' + connected + ' Audio Input jack(s).');
  ZOIA.sim._updateUI();
};

/**
 * Disconnect and stop the test tone.
 */
ZOIA.sim.disconnectTestTone = function() {
  if (ZOIA.sim._testToneOsc) {
    try { ZOIA.sim._testToneOsc.stop(); } catch (e) {}
    try { ZOIA.sim._testToneOsc.disconnect(); } catch (e) {}
    ZOIA.sim._testToneOsc = null;
  }
  if (ZOIA.sim._testToneGain) {
    try { ZOIA.sim._testToneGain.disconnect(); } catch (e) {}
    ZOIA.sim._testToneGain = null;
  }
  if (ZOIA.sim.testToneActive) {
    ZOIA.sim.testToneActive = false;
    ZOIA.log('SIM: Test tone disconnected.');
    ZOIA.sim._updateUI();
  }
};

/**
 * Toggle test tone on/off.
 */
ZOIA.sim.toggleTestTone = function() {
  if (ZOIA.sim.testToneActive) ZOIA.sim.disconnectTestTone();
  else ZOIA.sim.connectTestTone();
};


// ================================================================
//  PARAMETER SYNC (UI -> Audio)
// ================================================================

/**
 * Update a module's audio parameter from the UI.
 * Called when the user tweaks a param via knob or param-input.
 */
ZOIA.sim.updateParam = function(modIdx, blockIdx, normValue) {
  if (!ZOIA.sim.running) return;
  var node = ZOIA.sim.nodes[modIdx];
  if (!node) return;
  var mod = ZOIA.state.patch.modules[modIdx];
  if (!mod) return;
  var block = (mod.blocks || [])[blockIdx];
  if (!block) return;
  var ctx = ZOIA.sim.ctx;
  var t = ctx.currentTime;

  // Type-specific param updates
  switch (node.type) {
    case 'oscillator':
      if (blockIdx === node.freqIdx) {
        var freq = 20 * Math.pow(1000, normValue);
        node._osc.frequency.setTargetAtTime(freq, t, 0.01);
      }
      break;

    case 'sv_filter':
      if (blockIdx === node.freqIdx) {
        var fFreq = 20 * Math.pow(1000, normValue);
        node.setFrequency(fFreq);
      } else if (blockIdx === node.resIdx) {
        var q = 0.5 + normValue * 14.5;
        node.setQ(q);
      }
      break;

    case 'vca':
      if (blockIdx === node.levelIdx) {
        node._vca.gain.setTargetAtTime(normValue, t, 0.01);
      }
      break;

    case 'lfo':
      if (blockIdx === node.rateIdx) {
        var rate = 0.01 + normValue * 19.99;
        node._osc.frequency.setTargetAtTime(rate, t, 0.01);
      } else if (blockIdx === node.depthIdx) {
        node._outGain.gain.setTargetAtTime(normValue, t, 0.01);
      }
      break;

    case 'audio_output':
      if (blockIdx === node.gainBlockIdx) {
        node._outGain.gain.setTargetAtTime(normValue, t, 0.01);
      }
      break;
  }
};

/**
 * Update connection strength in the audio graph when user changes it.
 */
ZOIA.sim.updateConnStrength = function(connIdx, strength) {
  if (!ZOIA.sim.running) return;
  var norm = strength / 10000;
  for (var i = 0; i < ZOIA.sim.connGains.length; i++) {
    if (ZOIA.sim.connGains[i].connIdx === connIdx) {
      var t = ZOIA.sim.ctx.currentTime;
      ZOIA.sim.connGains[i].gain.gain.setTargetAtTime(norm, t, 0.01);
      return;
    }
  }
};


// ================================================================
//  VISUALIZATION (Waveform/Level Meter)
// ================================================================

// ================================================================
//  PER-MODULE SIGNAL LEVEL → GRID BUTTON BRIGHTNESS
// ================================================================

/**
 * Read RMS level from each module's AnalyserNode and update
 * the grid button DOM elements with brightness proportional to signal.
 * Called every frame from _vizDraw.
 */
ZOIA.sim._updateGridLevels = function() {
  var nodes = ZOIA.sim.nodes;
  if (!nodes || !nodes.length) return;

  var s = ZOIA.state;
  if (!s.patch) return;
  var modules = s.patch.modules;
  var currentPage = s.currentPage || 0;

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (!node || !node._analyser) {
      node._level = 0;
      continue;
    }

    // Read RMS from analyser
    var analyser = node._analyser;
    var buf = node._analyserBuf;
    analyser.getByteTimeDomainData(buf);

    var rms = 0;
    for (var k = 0; k < buf.length; k++) {
      var sample = (buf[k] - 128) / 128;
      rms += sample * sample;
    }
    rms = Math.sqrt(rms / buf.length);

    // Smooth: blend toward new level (attack fast, release slow)
    var target = Math.min(1.0, rms * 4);  // Scale up for visibility
    if (target > node._level) {
      node._level = node._level * 0.3 + target * 0.7;  // Fast attack
    } else {
      node._level = node._level * 0.85 + target * 0.15; // Slow release
    }
  }

  // Apply levels to grid buttons on the current page
  var btns = document.querySelectorAll('.grid-btn[data-mod-idx]');
  for (var b = 0; b < btns.length; b++) {
    var btn = btns[b];
    var modIdx = parseInt(btn.dataset.modIdx, 10);
    if (isNaN(modIdx) || modIdx < 0 || modIdx >= nodes.length) continue;

    var mod = modules[modIdx];
    if (!mod) continue;

    // Skip interactive buttons in Play mode -- their appearance is managed by CSS classes
    if (btn.classList.contains('btn-toggle') ||
        btn.classList.contains('btn-momentary') ||
        btn.classList.contains('btn-recording') ||
        btn.classList.contains('btn-playing')) {
      continue;
    }

    var level = nodes[modIdx] ? nodes[modIdx]._level : 0;
    var col = ZOIA.COLORS[mod.colorId] || '#666';

    // Base brightness: 0.15 (dim) to 1.0 (full bright) based on signal level
    var brightness = 0.15 + level * 0.85;
    // Background alpha: 30 (hex=0x1E, ~12%) to CC (~80%)
    var bgAlpha = Math.round(0x1E + level * (0xCC - 0x1E));
    var bgHex = bgAlpha < 16 ? '0' + bgAlpha.toString(16) : bgAlpha.toString(16);
    // Shadow: scale glow intensity with signal
    var shadowAlpha = Math.round(0x40 + level * (0xFF - 0x40));
    var shHex = shadowAlpha < 16 ? '0' + shadowAlpha.toString(16) : shadowAlpha.toString(16);
    var shadowSize = 2 + Math.round(level * 10);

    btn.style.background = col + bgHex;
    btn.style.boxShadow = '0 0 ' + shadowSize + 'px ' + Math.round(shadowSize / 2) + 'px ' + col + shHex;
    btn.style.opacity = brightness;
  }
};

/**
 * Reset all grid buttons to their default brightness (no signal).
 */
ZOIA.sim._resetGridLevels = function() {
  var btns = document.querySelectorAll('.grid-btn[data-mod-idx]');
  for (var b = 0; b < btns.length; b++) {
    btns[b].style.opacity = '';
    btns[b].style.boxShadow = '';
    btns[b].style.background = '';
  }
  // Zero out levels on nodes
  for (var i = 0; i < ZOIA.sim.nodes.length; i++) {
    if (ZOIA.sim.nodes[i]) ZOIA.sim.nodes[i]._level = 0;
  }
};


ZOIA.sim._vizRAF = null;
ZOIA.sim._vizCanvasInput = null;
ZOIA.sim._vizCtx2dInput = null;
ZOIA.sim._vizCanvasOutput = null;
ZOIA.sim._vizCtx2dOutput = null;
ZOIA.sim._vizCanvasSelected = null;
ZOIA.sim._vizCtx2dSelected = null;

ZOIA.sim._startViz = function() {
  var cIn = document.getElementById('sim-viz-input');
  var cOut = document.getElementById('sim-viz-output');
  var cSel = document.getElementById('sim-viz-selected');
  if (cIn) {
    ZOIA.sim._vizCanvasInput = cIn;
    ZOIA.sim._vizCtx2dInput = cIn.getContext('2d');
  }
  if (cOut) {
    ZOIA.sim._vizCanvasOutput = cOut;
    ZOIA.sim._vizCtx2dOutput = cOut.getContext('2d');
  }
  if (cSel) {
    ZOIA.sim._vizCanvasSelected = cSel;
    ZOIA.sim._vizCtx2dSelected = cSel.getContext('2d');
  }
  ZOIA.sim._vizDraw();
};

ZOIA.sim._stopViz = function() {
  if (ZOIA.sim._vizRAF) {
    cancelAnimationFrame(ZOIA.sim._vizRAF);
    ZOIA.sim._vizRAF = null;
  }
  // Clear all 3 canvases
  var canvases = [
    { cv: ZOIA.sim._vizCanvasInput, cx: ZOIA.sim._vizCtx2dInput },
    { cv: ZOIA.sim._vizCanvasOutput, cx: ZOIA.sim._vizCtx2dOutput },
    { cv: ZOIA.sim._vizCanvasSelected, cx: ZOIA.sim._vizCtx2dSelected }
  ];
  for (var i = 0; i < canvases.length; i++) {
    if (canvases[i].cx && canvases[i].cv) {
      canvases[i].cx.clearRect(0, 0, canvases[i].cv.width, canvases[i].cv.height);
    }
  }
  ZOIA.sim._vizCanvasInput = null;
  ZOIA.sim._vizCtx2dInput = null;
  ZOIA.sim._vizCanvasOutput = null;
  ZOIA.sim._vizCtx2dOutput = null;
  ZOIA.sim._vizCanvasSelected = null;
  ZOIA.sim._vizCtx2dSelected = null;
  // Reset grid button brightness
  ZOIA.sim._resetGridLevels();
};

/**
 * Draw a single oscilloscope: waveform + RMS bar.
 * Reusable helper to avoid repetition across 3 scope canvases.
 */
ZOIA.sim._drawScope = function(canvas, ctx2d, analyser, color) {
  if (!canvas || !ctx2d || !analyser) {
    // Draw a flat line if no analyser
    if (canvas && ctx2d) {
      var w = canvas.width, h = canvas.height;
      ctx2d.fillStyle = '#0a0a0a';
      ctx2d.fillRect(0, 0, w, h);
      ctx2d.strokeStyle = '#333';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, h / 2);
      ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();
    }
    return;
  }
  var w = canvas.width, h = canvas.height;
  var bufLen = analyser.frequencyBinCount;
  var data = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(data);

  ctx2d.fillStyle = '#0a0a0a';
  ctx2d.fillRect(0, 0, w, h);

  // Waveform
  ctx2d.lineWidth = 1.5;
  ctx2d.strokeStyle = color;
  ctx2d.beginPath();
  var sliceW = w / bufLen;
  var x = 0;
  for (var i = 0; i < bufLen; i++) {
    var v = data[i] / 128.0;
    var y = v * h / 2;
    if (i === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
    x += sliceW;
  }
  ctx2d.lineTo(w, h / 2);
  ctx2d.stroke();

  // RMS bar at bottom
  var rms = 0;
  for (var j = 0; j < bufLen; j++) {
    var sample = (data[j] - 128) / 128;
    rms += sample * sample;
  }
  rms = Math.sqrt(rms / bufLen);
  var dbLevel = Math.max(0, Math.min(1, rms * 3));
  ctx2d.fillStyle = dbLevel > 0.8 ? '#e94560' : color;
  ctx2d.fillRect(0, h - 3, w * dbLevel, 3);
};

ZOIA.sim._vizDraw = function() {
  if (!ZOIA.sim.running) return;

  // INPUT scope (green) — from inputAnalyser
  ZOIA.sim._drawScope(
    ZOIA.sim._vizCanvasInput,
    ZOIA.sim._vizCtx2dInput,
    ZOIA.sim.inputAnalyser,
    '#00cc66'
  );

  // OUTPUT scope (cyan) — from master analyser
  ZOIA.sim._drawScope(
    ZOIA.sim._vizCanvasOutput,
    ZOIA.sim._vizCtx2dOutput,
    ZOIA.sim.analyser,
    '#00cccc'
  );

  // SELECTED MODULE scope (purple) — from selected module's per-node analyser
  var selAnalyser = null;
  var selIdx = ZOIA.state.selectedModule;
  if (selIdx !== null && selIdx !== undefined && ZOIA.sim.nodes[selIdx]) {
    selAnalyser = ZOIA.sim.nodes[selIdx]._analyser || null;
  }
  ZOIA.sim._drawScope(
    ZOIA.sim._vizCanvasSelected,
    ZOIA.sim._vizCtx2dSelected,
    selAnalyser,
    '#cc66ff'
  );

  // Update per-module grid button brightness
  ZOIA.sim._updateGridLevels();

  ZOIA.sim._vizRAF = requestAnimationFrame(ZOIA.sim._vizDraw);
};


// ================================================================
//  UI INTEGRATION
// ================================================================

/**
 * Update the sim play/stop button and status indicator.
 */
ZOIA.sim._updateUI = function() {
  var btn = document.getElementById('sim-toggle');
  if (btn) {
    btn.textContent = ZOIA.sim.running ? 'STOP / EDIT' : 'PLAY';
    btn.style.background = ZOIA.sim.running ? '#e94560' : '#00cccc';
    btn.style.color = ZOIA.sim.running ? '#fff' : '#000';
  }
  var status = document.getElementById('sim-status');
  if (status) {
    status.textContent = ZOIA.sim.running ? 'PLAY MODE' : 'EDIT MODE';
    status.style.color = ZOIA.sim.running ? '#00cccc' : '#666';
  }
  var toneBtn = document.getElementById('sim-testtone');
  if (toneBtn) {
    toneBtn.textContent = ZOIA.sim.testToneActive ? 'TONE OFF' : 'TONE';
    toneBtn.style.background = ZOIA.sim.testToneActive ? '#e94560' : '#333';
    toneBtn.style.color = ZOIA.sim.testToneActive ? '#fff' : '#aaa';
    toneBtn.style.borderColor = ZOIA.sim.testToneActive ? '#e94560' : '#555';
  }
};


// ================================================================
//  HOOK INTO PATCH STATE
// ================================================================

// Override setParamValue to also update simulation params
(function() {
  var origSetParam = ZOIA.setParamValue;
  ZOIA.setParamValue = function(modIdx, blockIdx, val) {
    origSetParam.call(ZOIA, modIdx, blockIdx, val);
    ZOIA.sim.updateParam(modIdx, blockIdx, val);
  };
})();

// Override setConnStrength to also update simulation
(function() {
  var origSetConnStr = ZOIA.setConnStrength;
  ZOIA.setConnStrength = function(connIdx, value) {
    origSetConnStr.call(ZOIA, connIdx, value);
    ZOIA.sim.updateConnStrength(connIdx, value);
  };
})();

// Override setSelectedConnStrength to also update simulation
(function() {
  var origSetSelConnStr = ZOIA.setSelectedConnStrength;
  ZOIA.setSelectedConnStrength = function(value) {
    origSetSelConnStr.call(ZOIA, value);
    var s = ZOIA.state;
    if (s.selectedConnection !== null) {
      ZOIA.sim.updateConnStrength(s.selectedConnection, value);
    }
  };
})();

ZOIA.log('sim-engine.js loaded');


// === sim-mod-effects.js ===
/**
 * sim-mod-effects.js — ZOIA Simulation Module Factories: EFFECT-type modules
 *
 * Implements Web Audio node graphs for effect modules:
 *   Plate Reverb (25), Hall Reverb (26), Shimmer (27), Ghostverb (67),
 *   Vibrato (30), Phaser (61), Fuzz (66), Cabinet Sim (72),
 *   Diffuser (80), Aliaser (3), Ping Pong (69), Grain Delay (68),
 *   Ring Mod (42)
 *
 * Each factory: ZOIA.sim._createXxx(ctx, mod) -> { type, inputs[], outputs[], dispose() }
 *
 * ES5 only — no arrow functions, no const/let, no template literals, no classes.
 */
window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};


// ================================================================
//  HELPER: Synthetic Impulse Response Generator
// ================================================================

/**
 * Build a stereo impulse response buffer for convolution reverbs.
 * @param {AudioContext} ctx
 * @param {number} duration  — IR length in seconds
 * @param {number} decay     — Exponential decay power (higher = faster decay)
 * @param {boolean} diffuse  — If true, apply extra diffusion (randomized envelopes)
 * @returns {AudioBuffer}
 */
ZOIA.sim._buildIR = function(ctx, duration, decay, diffuse) {
  var len = Math.floor(ctx.sampleRate * duration);
  if (len < 1) len = 1;
  var buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = buf.getChannelData(ch);
    for (var i = 0; i < len; i++) {
      var env = Math.pow(1 - i / len, decay);
      if (diffuse) {
        // Add randomized modulation to the envelope for diffusion
        env *= (0.7 + 0.3 * Math.random());
      }
      d[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return buf;
};


// ================================================================
//  Plate Reverb (Type 25)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]

ZOIA.sim._createPlateReverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Read initial param values
  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.5;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  // Plate character: moderate duration, quick decay exponent
  var irDuration = 0.5 + decayNorm * 3.5; // 0.5 - 4.0 seconds
  var convolver = ctx.createConvolver();
  convolver.buffer = ZOIA.sim._buildIR(ctx, irDuration, 2.5, false);

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);

  // Split stereo for L/R outputs
  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;

  // Merge dry (mono->both) and wet (stereo split)
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('decay') >= 0) {
        // Decay not directly an AudioParam; expose wetGain as proxy
        inputs[i] = null;
      } else if (name.indexOf('mix') >= 0) {
        inputs[i] = null; // Mix handled manually
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'plate_reverb',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Hall Reverb (Type 26)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]

ZOIA.sim._createHallReverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.6;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  // Hall character: longer duration, slower decay, more diffuse
  var irDuration = 1.0 + decayNorm * 6.0; // 1.0 - 7.0 seconds
  var convolver = ctx.createConvolver();
  convolver.buffer = ZOIA.sim._buildIR(ctx, irDuration, 1.5, true);

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);

  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null; // Decay and mix handled at init
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'hall_reverb',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Shimmer (Type 27)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]
//
// Reverb + pitch-shifted feedback using detuned delay lines.

ZOIA.sim._createShimmer = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.6;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;

  // Shimmer: reverb tail via convolver
  var irDuration = 1.0 + decayNorm * 5.0;
  var convolver = ctx.createConvolver();
  convolver.buffer = ZOIA.sim._buildIR(ctx, irDuration, 1.8, true);

  // Pitch-shifted feedback: two detuned delay lines feeding back into the convolver
  var delayA = ctx.createDelay(0.5);
  delayA.delayTime.value = 0.037; // prime-ish offset
  var delayB = ctx.createDelay(0.5);
  delayB.delayTime.value = 0.053;

  // LFO to modulate delay times for pitch shimmer effect
  var lfoA = ctx.createOscillator();
  lfoA.type = 'sine';
  lfoA.frequency.value = 0.3;
  var lfoAGain = ctx.createGain();
  lfoAGain.gain.value = 0.004; // subtle pitch shift
  lfoA.connect(lfoAGain);
  lfoAGain.connect(delayA.delayTime);
  lfoA.start();

  var lfoB = ctx.createOscillator();
  lfoB.type = 'sine';
  lfoB.frequency.value = 0.5;
  var lfoBGain = ctx.createGain();
  lfoBGain.gain.value = 0.006;
  lfoB.connect(lfoBGain);
  lfoBGain.connect(delayB.delayTime);
  lfoB.start();

  // Feedback gains (controlled by decay)
  var fbA = ctx.createGain();
  fbA.gain.value = 0.3 + decayNorm * 0.4; // 0.3 - 0.7
  var fbB = ctx.createGain();
  fbB.gain.value = 0.25 + decayNorm * 0.35;

  // Signal flow:
  //   inGain -> convolver -> delayA -> fbA -> convolver (feedback loop)
  //                       -> delayB -> fbB -> convolver (feedback loop)
  //   inGain -> dryGain
  //   convolver + delayA + delayB -> wetGain -> splitter -> L/R
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(delayA);
  convolver.connect(delayB);
  delayA.connect(fbA);
  fbA.connect(convolver);
  delayB.connect(fbB);
  fbB.connect(convolver);
  convolver.connect(wetGain);
  delayA.connect(wetGain);
  delayB.connect(wetGain);

  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'shimmer',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _delayA: delayA,
    _delayB: delayB,
    _lfoA: lfoA,
    _lfoAGain: lfoAGain,
    _lfoB: lfoB,
    _lfoBGain: lfoBGain,
    _fbA: fbA,
    _fbB: fbB,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._lfoA.stop(); } catch (e) {}
      try { this._lfoB.stop(); } catch (e) {}
      try { this._lfoA.disconnect(); } catch (e) {}
      try { this._lfoAGain.disconnect(); } catch (e) {}
      try { this._lfoB.disconnect(); } catch (e) {}
      try { this._lfoBGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._delayA.disconnect(); } catch (e) {}
      try { this._delayB.disconnect(); } catch (e) {}
      try { this._fbA.disconnect(); } catch (e) {}
      try { this._fbB.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Ghostverb (Type 67)
// ================================================================
// Blocks: Audio In [audio_in], Decay [cv_in], Mix [cv_in],
//         L Out [audio_out], R Out [audio_out]
//
// Reverse-style reverb: uses a reversed impulse response (attack swell)
// combined with pre-delay for an eerie reverse-envelope character.

ZOIA.sim._createGhostverb = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var decayIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('decay') >= 0) decayIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var decayNorm = 0.5;
  if (decayIdx !== null && mod.params && mod.params[decayIdx] !== undefined) {
    decayNorm = mod.params[decayIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  // Build a reverse-envelope IR: volume swells UP instead of decaying
  var irDuration = 0.8 + decayNorm * 4.0; // 0.8 - 4.8 seconds
  var irLen = Math.floor(ctx.sampleRate * irDuration);
  if (irLen < 1) irLen = 1;
  var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = irBuf.getChannelData(ch);
    for (var s = 0; s < irLen; s++) {
      // Reverse envelope: grows then cuts off
      var env = Math.pow(s / irLen, 2.0);
      // Add some randomized diffusion
      env *= (0.6 + 0.4 * Math.random());
      d[s] = (Math.random() * 2 - 1) * env;
    }
  }

  var convolver = ctx.createConvolver();
  convolver.buffer = irBuf;

  // Pre-delay for ghostly character
  var preDelay = ctx.createDelay(1.0);
  preDelay.delayTime.value = 0.05 + decayNorm * 0.15; // 50-200ms pre-delay

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var wetGain = ctx.createGain();
  wetGain.gain.value = mixNorm;

  inGain.connect(preDelay);
  preDelay.connect(convolver);
  inGain.connect(dryGain);
  convolver.connect(wetGain);

  var splitter = ctx.createChannelSplitter(2);
  var lGain = ctx.createGain();
  lGain.gain.value = 1.0;
  var rGain = ctx.createGain();
  rGain.gain.value = 1.0;
  var lMerge = ctx.createGain();
  lMerge.gain.value = 1.0;
  var rMerge = ctx.createGain();
  rMerge.gain.value = 1.0;

  dryGain.connect(lMerge);
  dryGain.connect(rMerge);
  wetGain.connect(splitter);
  splitter.connect(lGain, 0);
  splitter.connect(rGain, 1);
  lGain.connect(lMerge);
  rGain.connect(rMerge);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = lMerge; outIdx++; }
      else { outputs[i] = rMerge; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ghostverb',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _preDelay: preDelay,
    _convolver: convolver,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _splitter: splitter,
    _lGain: lGain,
    _rGain: rGain,
    _lMerge: lMerge,
    _rMerge: rMerge,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._preDelay.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._splitter.disconnect(); } catch (e) {}
      try { this._lGain.disconnect(); } catch (e) {}
      try { this._rGain.disconnect(); } catch (e) {}
      try { this._lMerge.disconnect(); } catch (e) {}
      try { this._rMerge.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Vibrato (Type 30)
// ================================================================
// Blocks: Audio In [audio_in], Rate [cv_in], Depth [cv_in],
//         Audio Out [audio_out]
//
// Pure pitch modulation via LFO-modulated delay. No dry signal.

ZOIA.sim._createVibrato = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var rateIdx = null;
  var depthIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('rate') >= 0) rateIdx = p;
      else if (pn.indexOf('depth') >= 0) depthIdx = p;
    }
  }

  var rateNorm = 0.3;
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    rateNorm = mod.params[rateIdx] / 65535;
  }
  var depthNorm = 0.5;
  if (depthIdx !== null && mod.params && mod.params[depthIdx] !== undefined) {
    depthNorm = mod.params[depthIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Modulated delay for vibrato
  var delay = ctx.createDelay(0.1);
  delay.delayTime.value = 0.005; // 5ms center point

  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.01 + rateNorm * 19.99; // 0.01 - 20 Hz

  var lfoGain = ctx.createGain();
  // Depth maps to delay modulation amount: 0 - 4ms
  lfoGain.gain.value = depthNorm * 0.004;

  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  // Pure wet signal only (no dry mix — vibrato is 100% wet)
  inGain.connect(delay);
  delay.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) {
        inputs[i] = lfo.frequency;
      } else if (name.indexOf('depth') >= 0) {
        inputs[i] = lfoGain.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'vibrato',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _delay: delay,
    _lfo: lfo,
    _lfoGain: lfoGain,
    _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      try { this._lfoGain.disconnect(); } catch (e) {}
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delay.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Phaser (Type 61)
// ================================================================
// Blocks: Audio In [audio_in], Rate [cv_in], Depth [cv_in],
//         Audio Out [audio_out]
//
// Chain of allpass BiquadFilterNodes with LFO sweeping frequency,
// mixed with dry signal for the characteristic notch/peak pattern.

ZOIA.sim._createPhaser = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var rateIdx = null;
  var depthIdx = null;
  var fbIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('rate') >= 0) rateIdx = p;
      else if (pn.indexOf('depth') >= 0) depthIdx = p;
      else if (pn.indexOf('feedback') >= 0) fbIdx = p;
    }
  }

  var rateNorm = 0.15;
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    rateNorm = mod.params[rateIdx] / 65535;
  }
  var depthNorm = 0.7;
  if (depthIdx !== null && mod.params && mod.params[depthIdx] !== undefined) {
    depthNorm = mod.params[depthIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Create 6 allpass filter stages
  var numStages = 6;
  var allpassFilters = [];
  var baseFreq = 500; // Center frequency for sweep
  for (var s = 0; s < numStages; s++) {
    var ap = ctx.createBiquadFilter();
    ap.type = 'allpass';
    ap.frequency.value = baseFreq;
    ap.Q.value = 0.5;
    allpassFilters.push(ap);
  }

  // Chain allpass filters together
  inGain.connect(allpassFilters[0]);
  for (var c = 1; c < numStages; c++) {
    allpassFilters[c - 1].connect(allpassFilters[c]);
  }

  // LFO sweeps all allpass filter frequencies together
  var lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.01 + rateNorm * 19.99;

  // LFO gain controls the sweep depth
  // Each allpass filter needs its own gain node for the LFO connection
  var lfoGains = [];
  for (var g = 0; g < numStages; g++) {
    var lg = ctx.createGain();
    lg.gain.value = depthNorm * 2000; // Sweep range in Hz
    lfo.connect(lg);
    lg.connect(allpassFilters[g].frequency);
    lfoGains.push(lg);
  }
  lfo.start();

  // Feedback path: allpass output -> feedback gain -> input
  var fbGain = ctx.createGain();
  var fbNorm = 0.0;
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    fbNorm = mod.params[fbIdx] / 65535;
  }
  fbGain.gain.value = fbNorm * 0.9; // Cap at 0.9 to avoid runaway
  allpassFilters[numStages - 1].connect(fbGain);
  fbGain.connect(allpassFilters[0]);

  // Mix dry and phased (wet) signals
  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.7;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.7;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(dryGain);
  allpassFilters[numStages - 1].connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rate') >= 0) {
        inputs[i] = lfo.frequency;
      } else if (name.indexOf('depth') >= 0) {
        inputs[i] = lfoGains[0].gain;
      } else if (name.indexOf('feedback') >= 0) {
        inputs[i] = fbGain.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'phaser',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _allpassFilters: allpassFilters,
    _lfo: lfo,
    _lfoGains: lfoGains,
    _fbGain: fbGain,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _outGain: outGain,
    dispose: function() {
      try { this._lfo.stop(); } catch (e) {}
      try { this._lfo.disconnect(); } catch (e) {}
      for (var j = 0; j < this._lfoGains.length; j++) {
        try { this._lfoGains[j].disconnect(); } catch (e) {}
      }
      try { this._inGain.disconnect(); } catch (e) {}
      for (var k = 0; k < this._allpassFilters.length; k++) {
        try { this._allpassFilters[k].disconnect(); } catch (e) {}
      }
      try { this._fbGain.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Fuzz (Type 66)
// ================================================================
// Blocks: Audio In [audio_in], Drive [cv_in], Audio Out [audio_out]
//
// Aggressive asymmetric clipping via WaveShaperNode.

ZOIA.sim._createFuzz = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var driveIdx = null;
  var toneIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('drive') >= 0 || pn.indexOf('gain') >= 0) driveIdx = p;
      else if (pn.indexOf('tone') >= 0) toneIdx = p;
    }
  }

  var driveNorm = 0.5;
  if (driveIdx !== null && mod.params && mod.params[driveIdx] !== undefined) {
    driveNorm = mod.params[driveIdx] / 65535;
  }

  // Pre-gain driven by drive param
  var preGain = ctx.createGain();
  preGain.gain.value = 2 + driveNorm * 30; // 2x - 32x gain for extreme fuzz

  // WaveShaper with aggressive asymmetric clipping
  var shaper = ctx.createWaveShaper();
  shaper.oversample = '4x';

  var curveLen = 44100;
  var curve = new Float32Array(curveLen);
  for (var s = 0; s < curveLen; s++) {
    var x = (s / curveLen) * 2 - 1;
    // Asymmetric: positive side clips harder than negative
    if (x >= 0) {
      curve[s] = 1 - Math.exp(-x * 5);
    } else {
      curve[s] = -(1 - Math.exp(x * 3));
    }
  }
  shaper.curve = curve;

  // Post-filter to tame the harshest highs
  var postFilter = ctx.createBiquadFilter();
  postFilter.type = 'lowpass';
  postFilter.frequency.value = 4500;
  postFilter.Q.value = 0.7;

  var outGain = ctx.createGain();
  outGain.gain.value = 0.5; // Tame output level

  preGain.connect(shaper);
  shaper.connect(postFilter);
  postFilter.connect(outGain);

  // Apply initial tone param (controls post-filter cutoff)
  if (toneIdx !== null && mod.params && mod.params[toneIdx] !== undefined) {
    var toneNorm = mod.params[toneIdx] / 65535;
    postFilter.frequency.value = 500 + toneNorm * 9500; // 500 Hz - 10 kHz
  }

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = preGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('drive') >= 0 || name.indexOf('gain') >= 0) {
        inputs[i] = preGain.gain;
      } else if (name.indexOf('tone') >= 0) {
        inputs[i] = postFilter.frequency;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'fuzz',
    inputs: inputs,
    outputs: outputs,
    _preGain: preGain,
    _shaper: shaper,
    _postFilter: postFilter,
    _outGain: outGain,
    dispose: function() {
      try { this._preGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
      try { this._postFilter.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Cabinet Sim (Type 72)
// ================================================================
// Blocks: Audio In [audio_in], Audio Out [audio_out]
//
// Short synthetic speaker cabinet IR with bandpass character (~100Hz-5kHz).

ZOIA.sim._createCabinetSim = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Build a short cabinet impulse response (~50ms)
  // with bandpass character: rolls off below ~100Hz and above ~5kHz
  var irLen = Math.floor(ctx.sampleRate * 0.05); // 50ms
  if (irLen < 1) irLen = 1;
  var irBuf = ctx.createBuffer(1, irLen, ctx.sampleRate);
  var d = irBuf.getChannelData(0);
  for (var s = 0; s < irLen; s++) {
    var env = Math.pow(1 - s / irLen, 3.0);
    d[s] = (Math.random() * 2 - 1) * env;
  }

  var convolver = ctx.createConvolver();
  convolver.buffer = irBuf;

  // Additional bandpass shaping for cabinet character
  var hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = 100;
  hipass.Q.value = 0.7;

  var lopass = ctx.createBiquadFilter();
  lopass.type = 'lowpass';
  lopass.frequency.value = 5000;
  lopass.Q.value = 0.7;

  // Mid-presence peak (speaker resonance around 2-3kHz)
  var presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2500;
  presence.Q.value = 1.5;
  presence.gain.value = 3;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(convolver);
  convolver.connect(hipass);
  hipass.connect(lopass);
  lopass.connect(presence);
  presence.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cabinet_sim',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _convolver: convolver,
    _hipass: hipass,
    _lopass: lopass,
    _presence: presence,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._convolver.disconnect(); } catch (e) {}
      try { this._hipass.disconnect(); } catch (e) {}
      try { this._lopass.disconnect(); } catch (e) {}
      try { this._presence.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Diffuser (Type 80)
// ================================================================
// Blocks: Audio In [audio_in], Size [cv_in], Audio Out [audio_out]
//
// Chain of 4 allpass filters with prime-number delay times.
// Size controls delay lengths.

ZOIA.sim._createDiffuser = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sizeIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('size') >= 0) sizeIdx = p;
    }
  }

  var sizeNorm = 0.5;
  if (sizeIdx !== null && mod.params && mod.params[sizeIdx] !== undefined) {
    sizeNorm = mod.params[sizeIdx] / 65535;
  }

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Prime-number base delay times (in ms), scaled by size
  var primes = [7, 11, 17, 23];
  var stages = [];
  var prevNode = inGain;

  for (var s = 0; s < 4; s++) {
    // Each stage: delay -> allpass filter (to add phase smearing)
    var delayTime = (primes[s] / 1000) * (0.3 + sizeNorm * 2.0); // Scale with size
    var delay = ctx.createDelay(0.2);
    delay.delayTime.value = Math.min(delayTime, 0.19);

    var allpass = ctx.createBiquadFilter();
    allpass.type = 'allpass';
    allpass.frequency.value = 300 + s * 400; // Spread frequencies
    allpass.Q.value = 0.5;

    // Feedback within each stage for denser diffusion
    var fb = ctx.createGain();
    fb.gain.value = 0.5;

    prevNode.connect(delay);
    delay.connect(allpass);
    allpass.connect(fb);
    fb.connect(delay); // feedback loop

    stages.push({ delay: delay, allpass: allpass, fb: fb });
    prevNode = allpass;
  }

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  prevNode.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null; // Size set at init
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'diffuser',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _stages: stages,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      for (var j = 0; j < this._stages.length; j++) {
        try { this._stages[j].delay.disconnect(); } catch (e) {}
        try { this._stages[j].allpass.disconnect(); } catch (e) {}
        try { this._stages[j].fb.disconnect(); } catch (e) {}
      }
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Aliaser (Type 3)
// ================================================================
// Blocks: Audio In [audio_in], Rate [cv_in], Audio Out [audio_out]
//
// Sample rate reduction using a WaveShaperNode with a stepped curve.
// Rate parameter controls the step resolution (fewer steps = more aliasing).

ZOIA.sim._createAliaser = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var rateIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('rate') >= 0) rateIdx = p;
    }
  }

  var rateNorm = 0.5;
  if (rateIdx !== null && mod.params && mod.params[rateIdx] !== undefined) {
    rateNorm = mod.params[rateIdx] / 65535;
  }

  // Build a stepped WaveShaper curve for quantization/aliasing
  // Lower rate = fewer steps = more extreme aliasing
  var steps = Math.max(2, Math.round(4 + rateNorm * 252)); // 4 - 256 steps
  var curveLen = 44100;
  var curve = new Float32Array(curveLen);
  for (var s = 0; s < curveLen; s++) {
    var x = (s / curveLen) * 2 - 1;
    curve[s] = Math.round(x * steps) / steps;
  }

  var shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = 'none'; // Intentionally no oversampling for aliasing character

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(shaper);
  shaper.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      inputs[i] = null; // Rate set at init via curve generation
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'aliaser',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _shaper: shaper,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._shaper.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Ping Pong Delay (Type 69)
// ================================================================
// Blocks: Audio In [audio_in], Time [cv_in], Feedback [cv_in],
//         Mix [cv_in], L Out [audio_out], R Out [audio_out]
//
// Left/right alternating delay with cross-feedback.

ZOIA.sim._createPingPong = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var timeIdx = null;
  var fbIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('time') >= 0) timeIdx = p;
      else if (pn.indexOf('feed') >= 0) fbIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var timeNorm = 0.3;
  if (timeIdx !== null && mod.params && mod.params[timeIdx] !== undefined) {
    timeNorm = mod.params[timeIdx] / 65535;
  }
  var fbNorm = 0.4;
  if (fbIdx !== null && mod.params && mod.params[fbIdx] !== undefined) {
    fbNorm = mod.params[fbIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  var delayTime = timeNorm * 2.0; // 0 - 2 seconds

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Two delay lines: left and right, with cross-feedback
  var delayL = ctx.createDelay(5.0);
  delayL.delayTime.value = delayTime;
  var delayR = ctx.createDelay(5.0);
  delayR.delayTime.value = delayTime;

  var fbL = ctx.createGain();
  fbL.gain.value = fbNorm * 0.9; // Cap feedback below 1.0
  var fbR = ctx.createGain();
  fbR.gain.value = fbNorm * 0.9;

  // Cross-feedback: L delay output -> R delay input, and vice versa
  // Input feeds into L delay first, creating the ping-pong pattern
  inGain.connect(delayL);
  delayL.connect(fbL);
  fbL.connect(delayR);
  delayR.connect(fbR);
  fbR.connect(delayL);

  // Dry/wet mixing per channel
  var dryL = ctx.createGain();
  dryL.gain.value = 1 - mixNorm;
  var dryR = ctx.createGain();
  dryR.gain.value = 1 - mixNorm;
  var wetL = ctx.createGain();
  wetL.gain.value = mixNorm;
  var wetR = ctx.createGain();
  wetR.gain.value = mixNorm;

  var outL = ctx.createGain();
  outL.gain.value = 1.0;
  var outR = ctx.createGain();
  outR.gain.value = 1.0;

  inGain.connect(dryL);
  inGain.connect(dryR);
  delayL.connect(wetL);
  delayR.connect(wetR);
  dryL.connect(outL);
  wetL.connect(outL);
  dryR.connect(outR);
  wetR.connect(outR);

  var outIdx = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('time') >= 0) {
        inputs[i] = delayL.delayTime; // Primary; R follows via cross-feedback
      } else if (name.indexOf('feed') >= 0) {
        inputs[i] = fbL.gain;
      } else if (name.indexOf('mix') >= 0) {
        inputs[i] = null; // Mix set at init
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outIdx === 0) { outputs[i] = outL; outIdx++; }
      else { outputs[i] = outR; outIdx++; }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ping_pong',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _delayL: delayL,
    _delayR: delayR,
    _fbL: fbL,
    _fbR: fbR,
    _dryL: dryL,
    _dryR: dryR,
    _wetL: wetL,
    _wetR: wetR,
    _outL: outL,
    _outR: outR,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._delayL.disconnect(); } catch (e) {}
      try { this._delayR.disconnect(); } catch (e) {}
      try { this._fbL.disconnect(); } catch (e) {}
      try { this._fbR.disconnect(); } catch (e) {}
      try { this._dryL.disconnect(); } catch (e) {}
      try { this._dryR.disconnect(); } catch (e) {}
      try { this._wetL.disconnect(); } catch (e) {}
      try { this._wetR.disconnect(); } catch (e) {}
      try { this._outL.disconnect(); } catch (e) {}
      try { this._outR.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Grain Delay (Type 68)
// ================================================================
// Blocks: Audio In [audio_in], Time [cv_in], Size [cv_in],
//         Mix [cv_in], Audio Out [audio_out]
//
// Granular-style delay using multiple short delays at slightly
// different times for a textured, granular repetition effect.

ZOIA.sim._createGrainDelay = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var timeIdx = null;
  var sizeIdx = null;
  var mixIdx = null;
  for (var p = 0; p < blocks.length; p++) {
    if (blocks[p].t === 'cv_in') {
      var pn = (blocks[p].n || '').toLowerCase();
      if (pn.indexOf('time') >= 0) timeIdx = p;
      else if (pn.indexOf('size') >= 0) sizeIdx = p;
      else if (pn.indexOf('mix') >= 0) mixIdx = p;
    }
  }

  var timeNorm = 0.3;
  if (timeIdx !== null && mod.params && mod.params[timeIdx] !== undefined) {
    timeNorm = mod.params[timeIdx] / 65535;
  }
  var sizeNorm = 0.5;
  if (sizeIdx !== null && mod.params && mod.params[sizeIdx] !== undefined) {
    sizeNorm = mod.params[sizeIdx] / 65535;
  }
  var mixNorm = 0.5;
  if (mixIdx !== null && mod.params && mod.params[mixIdx] !== undefined) {
    mixNorm = mod.params[mixIdx] / 65535;
  }

  var baseTime = timeNorm * 2.0; // 0 - 2 seconds
  var spread = sizeNorm * 0.1;   // Grain spread: 0 - 100ms offset between grains

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Create 4 delay "grains" at slightly offset times
  var numGrains = 4;
  var grainDelays = [];
  var grainGains = [];
  var wetMix = ctx.createGain();
  wetMix.gain.value = mixNorm / numGrains; // Normalize grain levels

  for (var g = 0; g < numGrains; g++) {
    var gDelay = ctx.createDelay(5.0);
    var offset = spread * (g - (numGrains - 1) / 2); // Center the spread
    gDelay.delayTime.value = Math.max(0, baseTime + offset);

    var gGain = ctx.createGain();
    // Slight volume variation per grain for texture
    gGain.gain.value = 0.8 + Math.random() * 0.4;

    inGain.connect(gDelay);
    gDelay.connect(gGain);
    gGain.connect(wetMix);

    grainDelays.push(gDelay);
    grainGains.push(gGain);
  }

  var dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mixNorm;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(dryGain);
  dryGain.connect(outGain);
  wetMix.connect(outGain);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('time') >= 0) {
        inputs[i] = grainDelays[0].delayTime; // Primary grain time
      } else if (name.indexOf('size') >= 0) {
        inputs[i] = null; // Size set at init (controls spread)
      } else if (name.indexOf('mix') >= 0) {
        inputs[i] = null; // Mix set at init
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'grain_delay',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _grainDelays: grainDelays,
    _grainGains: grainGains,
    _wetMix: wetMix,
    _dryGain: dryGain,
    _outGain: outGain,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      for (var j = 0; j < this._grainDelays.length; j++) {
        try { this._grainDelays[j].disconnect(); } catch (e) {}
        try { this._grainGains[j].disconnect(); } catch (e) {}
      }
      try { this._wetMix.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Ring Mod (Type 42)
// ================================================================
// Blocks: In 1 [audio_in], In 2 [audio_in], Output [audio_out]
//
// Multiply two audio signals. Uses a GainNode where one input
// signal modulates the gain of the other.

ZOIA.sim._createRingMod = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Carrier: audio passes through this GainNode
  // Modulator: connects to the gain AudioParam of the carrier
  var carrier = ctx.createGain();
  carrier.gain.value = 1; // Pass through when no modulator input is connected

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;
  carrier.connect(outGain);

  var inputCount = 0;
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inputCount === 0) {
        // First input: audio signal passes through the carrier GainNode
        inputs[i] = carrier;
        inputCount++;
      } else {
        // Second input: modulates the gain (ring modulation)
        inputs[i] = carrier.gain;
        inputCount++;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ring_mod',
    inputs: inputs,
    outputs: outputs,
    _carrier: carrier,
    _outGain: outGain,
    _hasRingModulatorInput: inputCount > 1,
    dispose: function() {
      try { this._carrier.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[3]  = ZOIA.sim._createAliaser;
ZOIA.sim._moduleFactories[25] = ZOIA.sim._createPlateReverb;
ZOIA.sim._moduleFactories[26] = ZOIA.sim._createHallReverb;
ZOIA.sim._moduleFactories[27] = ZOIA.sim._createShimmer;
ZOIA.sim._moduleFactories[30] = ZOIA.sim._createVibrato;
ZOIA.sim._moduleFactories[42] = ZOIA.sim._createRingMod;
ZOIA.sim._moduleFactories[61] = ZOIA.sim._createPhaser;
ZOIA.sim._moduleFactories[66] = ZOIA.sim._createFuzz;
ZOIA.sim._moduleFactories[67] = ZOIA.sim._createGhostverb;
ZOIA.sim._moduleFactories[68] = ZOIA.sim._createGrainDelay;
ZOIA.sim._moduleFactories[69] = ZOIA.sim._createPingPong;
ZOIA.sim._moduleFactories[72] = ZOIA.sim._createCabinetSim;
ZOIA.sim._moduleFactories[80] = ZOIA.sim._createDiffuser;

ZOIA.log('sim-mod-effects.js loaded: 13 effect modules registered');


// === sim-mod-audio.js ===
/**
 * sim-mod-audio.js — ZOIA Simulation: Audio-Processing Module Factories
 *
 * Implements Web Audio node graphs for audio-processing modules:
 *   Multi Filter (24), Stereo Spread (53), Audio Balance (64),
 *   Inverter (65), EQ (73), Granular (78), Audio In Switch (33),
 *   Audio Out Switch (34), Looper (62)
 *
 * Each factory returns: { type, inputs[], outputs[], dispose() }
 *   - inputs[blockIdx]  = AudioNode (audio_in) | AudioParam (cv_in) | null
 *   - outputs[blockIdx] = AudioNode (audio_out/cv_out/gate_out) | null
 *
 * ES5 only — no arrow functions, no const/let, no template literals, no classes.
 */
window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};


// ================================================================
//  Helper: read initial param value (normalized 0-1)
// ================================================================

ZOIA.sim._readParam = function(mod, idx) {
  if (idx !== null && mod.params && mod.params[idx] !== undefined) {
    return mod.params[idx] / 65535;
  }
  return null;
};


// ================================================================
//  Multi Filter (Type 24)
// ================================================================
// Blocks: Audio In [audio_in], Frequency [cv_in], Resonance [cv_in],
//         Output [audio_out], Gain [cv_in]
// BiquadFilterNode with gain control.

ZOIA.sim._createMultiFilter = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  filter.Q.value = 1;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inGain.connect(filter);
  filter.connect(outGain);

  var freqIdx = null;
  var resIdx = null;
  var gainIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('freq') >= 0) {
        freqIdx = i;
        inputs[i] = filter.frequency;
      } else if (name.indexOf('res') >= 0) {
        resIdx = i;
        inputs[i] = filter.Q;
      } else if (name.indexOf('gain') >= 0) {
        gainIdx = i;
        inputs[i] = outGain.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial param values
  var freqVal = ZOIA.sim._readParam(mod, freqIdx);
  if (freqVal !== null) {
    filter.frequency.value = 20 * Math.pow(1000, freqVal);
  }

  var resVal = ZOIA.sim._readParam(mod, resIdx);
  if (resVal !== null) {
    filter.Q.value = 0.5 + resVal * 14.5;
  }

  var gainVal = ZOIA.sim._readParam(mod, gainIdx);
  if (gainVal !== null) {
    outGain.gain.value = gainVal;
  }

  return {
    type: 'multi_filter',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _filter: filter,
    _outGain: outGain,
    freqIdx: freqIdx,
    resIdx: resIdx,
    gainIdx: gainIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._filter.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    },
    setFrequency: function(freq) {
      var t = ZOIA.sim.ctx.currentTime;
      this._filter.frequency.setTargetAtTime(freq, t, 0.01);
    },
    setQ: function(q) {
      var t = ZOIA.sim.ctx.currentTime;
      this._filter.Q.setTargetAtTime(q, t, 0.01);
    }
  };
};


// ================================================================
//  Stereo Spread (Type 53)
// ================================================================
// Blocks: L In [audio_in], R In [audio_in], Width [cv_in],
//         L Out [audio_out], R Out [audio_out]
// Mid/Side processing. Width=0 = mono, Width=1 = full stereo.

ZOIA.sim._createStereoSpread = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Input gains for L and R
  var lIn = ctx.createGain();
  lIn.gain.value = 1.0;
  var rIn = ctx.createGain();
  rIn.gain.value = 1.0;

  // Mid = (L + R) * 0.5, Side = (L - R) * 0.5
  // Output L = Mid + Side * width, Output R = Mid - Side * width
  //
  // We approximate with gain node mixing:
  //   L Out = lIn * (1 - spread) * 0.5 + lIn * (1 + spread) * 0.5
  // Simplified: L Out = lIn * midAmt + rIn * midAmt (for mono)
  //             plus lIn * sideAmt - rIn * sideAmt (for stereo)
  //
  // Implementation: Use four gain nodes for cross-mixing
  //   L Out = lIn * directGain + rIn * crossGain
  //   R Out = rIn * directGain + lIn * crossGain
  // Width=0 (mono): directGain=0.5, crossGain=0.5  (L+R)/2 to both
  // Width=1 (full stereo): directGain=1.0, crossGain=0.0

  var directL = ctx.createGain();  // lIn -> L Out
  var crossL = ctx.createGain();   // rIn -> L Out
  var directR = ctx.createGain();  // rIn -> R Out
  var crossR = ctx.createGain();   // lIn -> R Out

  var lOut = ctx.createGain();
  lOut.gain.value = 1.0;
  var rOut = ctx.createGain();
  rOut.gain.value = 1.0;

  lIn.connect(directL);
  rIn.connect(crossL);
  directL.connect(lOut);
  crossL.connect(lOut);

  rIn.connect(directR);
  lIn.connect(crossR);
  directR.connect(rOut);
  crossR.connect(rOut);

  // Default width = 1.0 (full stereo)
  var width = 1.0;
  directL.gain.value = 0.5 + width * 0.5;
  crossL.gain.value = 0.5 - width * 0.5;
  directR.gain.value = 0.5 + width * 0.5;
  crossR.gain.value = 0.5 - width * 0.5;

  var widthIdx = null;
  var inCount = 0;
  var outCount = 0;

  // Proxy+analyser for Width CV input
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inCount === 0) { inputs[i] = lIn; }
      else { inputs[i] = rIn; }
      inCount++;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('width') >= 0) {
        widthIdx = i;
        inputs[i] = selProxy.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outCount === 0) { outputs[i] = lOut; }
      else { outputs[i] = rOut; }
      outCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial width from params
  var widthVal = ZOIA.sim._readParam(mod, widthIdx);
  if (widthVal !== null) {
    width = widthVal;
    directL.gain.value = 0.5 + width * 0.5;
    crossL.gain.value = 0.5 - width * 0.5;
    directR.gain.value = 0.5 + width * 0.5;
    crossR.gain.value = 0.5 - width * 0.5;
  }

  var node = {
    type: 'stereo_spread',
    inputs: inputs,
    outputs: outputs,
    _lIn: lIn,
    _rIn: rIn,
    _directL: directL,
    _crossL: crossL,
    _directR: directR,
    _crossR: crossR,
    _lOut: lOut,
    _rOut: rOut,
    widthIdx: widthIdx,
    dispose: function() {
      _disposed = true;
      try { this._lIn.disconnect(); } catch (e) {}
      try { this._rIn.disconnect(); } catch (e) {}
      try { this._directL.disconnect(); } catch (e) {}
      try { this._crossL.disconnect(); } catch (e) {}
      try { this._directR.disconnect(); } catch (e) {}
      try { this._crossR.disconnect(); } catch (e) {}
      try { this._lOut.disconnect(); } catch (e) {}
      try { this._rOut.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setWidth: function(w) {
      var t = ZOIA.sim.ctx.currentTime;
      var direct = 0.5 + w * 0.5;
      var cross = 0.5 - w * 0.5;
      this._directL.gain.setTargetAtTime(direct, t, 0.01);
      this._crossL.gain.setTargetAtTime(cross, t, 0.01);
      this._directR.gain.setTargetAtTime(direct, t, 0.01);
      this._crossR.gain.setTargetAtTime(cross, t, 0.01);
    }
  };

  // Poll width CV to drive setWidth
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollWidth() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var w = _selBuf[0];
    if (Math.abs(w - _lastSel) > 0.05) {
      node.setWidth(w);
      _lastSel = w;
    }
    requestAnimationFrame(pollWidth);
  })();

  return node;
};


// ================================================================
//  Audio Balance (Type 64)
// ================================================================
// Mono: In A [audio_in], In B [audio_in], Balance [cv_in], Output [audio_out]
// Stereo (variant 1): L In A, R In A, L In B, R In B, Balance, L Out, R Out
// Crossfade: Balance=0 = all A, Balance=1 = all B.

ZOIA.sim._createAudioBalance = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Count audio ins to detect mono vs stereo
  var audioInCount = 0;
  var audioOutCount = 0;
  for (var k = 0; k < blocks.length; k++) {
    if (blocks[k].t === 'audio_in') audioInCount++;
    if (blocks[k].t === 'audio_out') audioOutCount++;
  }

  var isStereo = (audioInCount >= 4 && audioOutCount >= 2);
  var balanceIdx = null;
  var balance = 0.5;

  // Proxy+analyser for Balance CV input (shared by both stereo and mono)
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  if (isStereo) {
    // Stereo variant: L In A, R In A, L In B, R In B, Balance, L Out, R Out
    var lInA = ctx.createGain();
    lInA.gain.value = 1.0;
    var rInA = ctx.createGain();
    rInA.gain.value = 1.0;
    var lInB = ctx.createGain();
    lInB.gain.value = 1.0;
    var rInB = ctx.createGain();
    rInB.gain.value = 1.0;

    // Gain A = (1 - balance), Gain B = balance
    var gainLA = ctx.createGain();
    gainLA.gain.value = 0.5;
    var gainRA = ctx.createGain();
    gainRA.gain.value = 0.5;
    var gainLB = ctx.createGain();
    gainLB.gain.value = 0.5;
    var gainRB = ctx.createGain();
    gainRB.gain.value = 0.5;

    var lOut = ctx.createGain();
    lOut.gain.value = 1.0;
    var rOut = ctx.createGain();
    rOut.gain.value = 1.0;

    lInA.connect(gainLA);
    gainLA.connect(lOut);
    rInA.connect(gainRA);
    gainRA.connect(rOut);
    lInB.connect(gainLB);
    gainLB.connect(lOut);
    rInB.connect(gainRB);
    gainRB.connect(rOut);

    var stereoInIdx = 0;
    var stereoOutIdx = 0;

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.t === 'audio_in') {
        if (stereoInIdx === 0) { inputs[i] = lInA; }
        else if (stereoInIdx === 1) { inputs[i] = rInA; }
        else if (stereoInIdx === 2) { inputs[i] = lInB; }
        else { inputs[i] = rInB; }
        stereoInIdx++;
      } else if (b.t === 'cv_in') {
        var name = (b.n || '').toLowerCase();
        if (name.indexOf('balance') >= 0 || name.indexOf('bal') >= 0) {
          balanceIdx = i;
          inputs[i] = selProxy.gain;
        } else {
          inputs[i] = null;
        }
      } else if (b.t === 'audio_out') {
        if (stereoOutIdx === 0) { outputs[i] = lOut; }
        else { outputs[i] = rOut; }
        stereoOutIdx++;
      } else {
        inputs[i] = null;
        outputs[i] = null;
      }
    }

    // Apply initial balance
    var balVal = ZOIA.sim._readParam(mod, balanceIdx);
    if (balVal !== null) { balance = balVal; }
    gainLA.gain.value = 1.0 - balance;
    gainRA.gain.value = 1.0 - balance;
    gainLB.gain.value = balance;
    gainRB.gain.value = balance;

    var node = {
      type: 'audio_balance',
      inputs: inputs,
      outputs: outputs,
      _lInA: lInA, _rInA: rInA, _lInB: lInB, _rInB: rInB,
      _gainLA: gainLA, _gainRA: gainRA, _gainLB: gainLB, _gainRB: gainRB,
      _lOut: lOut, _rOut: rOut,
      balanceIdx: balanceIdx,
      dispose: function() {
        _disposed = true;
        try { this._lInA.disconnect(); } catch (e) {}
        try { this._rInA.disconnect(); } catch (e) {}
        try { this._lInB.disconnect(); } catch (e) {}
        try { this._rInB.disconnect(); } catch (e) {}
        try { this._gainLA.disconnect(); } catch (e) {}
        try { this._gainRA.disconnect(); } catch (e) {}
        try { this._gainLB.disconnect(); } catch (e) {}
        try { this._gainRB.disconnect(); } catch (e) {}
        try { this._lOut.disconnect(); } catch (e) {}
        try { this._rOut.disconnect(); } catch (e) {}
        try { selSrc.stop(); } catch (e) {}
        try { selSrc.disconnect(); } catch (e) {}
        try { selProxy.disconnect(); } catch (e) {}
        try { selAnalyser.disconnect(); } catch (e) {}
      },
      setBalance: function(bal) {
        var t = ZOIA.sim.ctx.currentTime;
        this._gainLA.gain.setTargetAtTime(1.0 - bal, t, 0.01);
        this._gainRA.gain.setTargetAtTime(1.0 - bal, t, 0.01);
        this._gainLB.gain.setTargetAtTime(bal, t, 0.01);
        this._gainRB.gain.setTargetAtTime(bal, t, 0.01);
      }
    };

    // Poll balance CV to drive setBalance (stereo)
    var _selBuf = new Float32Array(1);
    var _lastSel = -1;
    var _disposed = false;

    (function pollBalance() {
      if (_disposed) return;
      selAnalyser.getFloatTimeDomainData(_selBuf);
      var b = _selBuf[0];
      if (Math.abs(b - _lastSel) > 0.05) {
        node.setBalance(b);
        _lastSel = b;
      }
      requestAnimationFrame(pollBalance);
    })();

    return node;
  }

  // Mono variant: In A, In B, Balance, Output
  var inA = ctx.createGain();
  inA.gain.value = 1.0;
  var inB = ctx.createGain();
  inB.gain.value = 1.0;

  var gainA = ctx.createGain();
  gainA.gain.value = 0.5;
  var gainB = ctx.createGain();
  gainB.gain.value = 0.5;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  inA.connect(gainA);
  gainA.connect(outGain);
  inB.connect(gainB);
  gainB.connect(outGain);

  var monoInIdx = 0;

  for (var j = 0; j < blocks.length; j++) {
    var bm = blocks[j];
    if (bm.t === 'audio_in') {
      if (monoInIdx === 0) { inputs[j] = inA; }
      else { inputs[j] = inB; }
      monoInIdx++;
    } else if (bm.t === 'cv_in') {
      var mname = (bm.n || '').toLowerCase();
      if (mname.indexOf('balance') >= 0 || mname.indexOf('bal') >= 0) {
        balanceIdx = j;
        inputs[j] = selProxy.gain;
      } else {
        inputs[j] = null;
      }
    } else if (bm.t === 'audio_out') {
      outputs[j] = outGain;
    } else {
      inputs[j] = null;
      outputs[j] = null;
    }
  }

  // Apply initial balance
  var monoBalVal = ZOIA.sim._readParam(mod, balanceIdx);
  if (monoBalVal !== null) { balance = monoBalVal; }
  gainA.gain.value = 1.0 - balance;
  gainB.gain.value = balance;

  var node = {
    type: 'audio_balance',
    inputs: inputs,
    outputs: outputs,
    _inA: inA, _inB: inB,
    _gainA: gainA, _gainB: gainB,
    _outGain: outGain,
    balanceIdx: balanceIdx,
    dispose: function() {
      _disposed = true;
      try { this._inA.disconnect(); } catch (e) {}
      try { this._inB.disconnect(); } catch (e) {}
      try { this._gainA.disconnect(); } catch (e) {}
      try { this._gainB.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setBalance: function(bal) {
      var t = ZOIA.sim.ctx.currentTime;
      this._gainA.gain.setTargetAtTime(1.0 - bal, t, 0.01);
      this._gainB.gain.setTargetAtTime(bal, t, 0.01);
    }
  };

  // Poll balance CV to drive setBalance (mono)
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollBalance() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var b = _selBuf[0];
    if (Math.abs(b - _lastSel) > 0.05) {
      node.setBalance(b);
      _lastSel = b;
    }
    requestAnimationFrame(pollBalance);
  })();

  return node;
};


// ================================================================
//  Inverter (Type 65)
// ================================================================
// Blocks: Input [audio_in], Output [audio_out]
// Phase inversion via GainNode with gain = -1.

ZOIA.sim._createInverter = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inv = ctx.createGain();
  inv.gain.value = -1.0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inv;
    } else if (b.t === 'audio_out') {
      outputs[i] = inv;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'inverter',
    inputs: inputs,
    outputs: outputs,
    _inv: inv,
    dispose: function() {
      try { this._inv.disconnect(); } catch (e) {}
    }
  };
};


// ================================================================
//  EQ (Type 73)
// ================================================================
// Blocks: Audio In [audio_in], Low [cv_in], Mid [cv_in], High [cv_in],
//         Audio Out [audio_out]
// Three-band EQ: lowshelf 200Hz, peaking 1kHz, highshelf 4kHz.
// Band gain: (v - 0.5) * 24 for +/-12 dB range.

ZOIA.sim._createEQ = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var lowShelf = ctx.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 200;
  lowShelf.gain.value = 0;

  var midPeak = ctx.createBiquadFilter();
  midPeak.type = 'peaking';
  midPeak.frequency.value = 1000;
  midPeak.Q.value = 1;
  midPeak.gain.value = 0;

  var highShelf = ctx.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 4000;
  highShelf.gain.value = 0;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  inGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);

  var lowIdx = null;
  var midIdx = null;
  var highIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('low') >= 0) {
        lowIdx = i;
        inputs[i] = lowShelf.gain;
      } else if (name.indexOf('mid') >= 0) {
        midIdx = i;
        inputs[i] = midPeak.gain;
      } else if (name.indexOf('high') >= 0) {
        highIdx = i;
        inputs[i] = highShelf.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = highShelf;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial EQ gains: (v - 0.5) * 24 for +/-12 dB
  var lowVal = ZOIA.sim._readParam(mod, lowIdx);
  if (lowVal !== null) {
    lowShelf.gain.value = (lowVal - 0.5) * 24;
  }

  var midVal = ZOIA.sim._readParam(mod, midIdx);
  if (midVal !== null) {
    midPeak.gain.value = (midVal - 0.5) * 24;
  }

  var highVal = ZOIA.sim._readParam(mod, highIdx);
  if (highVal !== null) {
    highShelf.gain.value = (highVal - 0.5) * 24;
  }

  return {
    type: 'eq',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _low: lowShelf,
    _mid: midPeak,
    _high: highShelf,
    lowIdx: lowIdx,
    midIdx: midIdx,
    highIdx: highIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._low.disconnect(); } catch (e) {}
      try { this._mid.disconnect(); } catch (e) {}
      try { this._high.disconnect(); } catch (e) {}
    },
    setLow: function(db) {
      var t = ZOIA.sim.ctx.currentTime;
      this._low.gain.setTargetAtTime(db, t, 0.01);
    },
    setMid: function(db) {
      var t = ZOIA.sim.ctx.currentTime;
      this._mid.gain.setTargetAtTime(db, t, 0.01);
    },
    setHigh: function(db) {
      var t = ZOIA.sim.ctx.currentTime;
      this._high.gain.setTargetAtTime(db, t, 0.01);
    }
  };
};


// ================================================================
//  Granular (Type 78)
// ================================================================
// Blocks: Audio In [audio_in], Position [cv_in], Size [cv_in],
//         Audio Out [audio_out]
// Uses a circular buffer (DelayNode) with variable read position and
// grain size. Position controls the read offset; Size controls the
// grain window length.

ZOIA.sim._createGranular = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Use a long delay as a circular buffer (max 5 seconds)
  var buffer = ctx.createDelay(5.0);
  buffer.delayTime.value = 0.5;

  // Grain playback: a second delay tapped at a different position
  var grainTap = ctx.createDelay(5.0);
  grainTap.delayTime.value = 0.25;

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  // Feed input into the circular buffer
  inGain.connect(buffer);

  // The grain tap reads from a modulated position in the delay
  // We connect input to the grain tap as well, creating a second read head
  inGain.connect(grainTap);

  // Grain envelope: use a gain node to window the grain output
  var grainEnv = ctx.createGain();
  grainEnv.gain.value = 1.0;
  grainTap.connect(grainEnv);

  // Mix dry buffer output and grain output
  var dryGain = ctx.createGain();
  dryGain.gain.value = 0.3;
  var wetGain = ctx.createGain();
  wetGain.gain.value = 0.7;
  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  buffer.connect(dryGain);
  grainEnv.connect(wetGain);
  dryGain.connect(outGain);
  wetGain.connect(outGain);

  var posIdx = null;
  var sizeIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('pos') >= 0) {
        posIdx = i;
        inputs[i] = grainTap.delayTime; // Position modulates the grain read offset
      } else if (name.indexOf('size') >= 0) {
        sizeIdx = i;
        inputs[i] = null; // Size controls grain window; set via updateParam
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial position (0-1 mapped to 0-5s delay offset)
  var posVal = ZOIA.sim._readParam(mod, posIdx);
  if (posVal !== null) {
    grainTap.delayTime.value = posVal * 5.0;
  }

  // Apply initial size (adjusts the base delay for the buffer)
  var sizeVal = ZOIA.sim._readParam(mod, sizeIdx);
  if (sizeVal !== null) {
    buffer.delayTime.value = Math.max(0.01, sizeVal * 5.0);
  }

  return {
    type: 'granular',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _buffer: buffer,
    _grainTap: grainTap,
    _grainEnv: grainEnv,
    _dryGain: dryGain,
    _wetGain: wetGain,
    _outGain: outGain,
    posIdx: posIdx,
    sizeIdx: sizeIdx,
    dispose: function() {
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._buffer.disconnect(); } catch (e) {}
      try { this._grainTap.disconnect(); } catch (e) {}
      try { this._grainEnv.disconnect(); } catch (e) {}
      try { this._dryGain.disconnect(); } catch (e) {}
      try { this._wetGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
    },
    setPosition: function(pos) {
      var t = ZOIA.sim.ctx.currentTime;
      this._grainTap.delayTime.setTargetAtTime(pos * 5.0, t, 0.01);
    },
    setSize: function(size) {
      var t = ZOIA.sim.ctx.currentTime;
      var val = Math.max(0.01, size * 5.0);
      this._buffer.delayTime.setTargetAtTime(val, t, 0.01);
    }
  };
};


// ================================================================
//  Audio In Switch (Type 33)
// ================================================================
// Blocks: In 1 [audio_in], In 2 [audio_in], Output [audio_out],
//         Select [cv_in]
// Selects between two inputs. Select < 0.5 = In 1, >= 0.5 = In 2.
// Uses two GainNodes for crossfading.

ZOIA.sim._createAudioInSwitch = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var in1 = ctx.createGain();
  in1.gain.value = 1.0;
  var in2 = ctx.createGain();
  in2.gain.value = 1.0;

  var gain1 = ctx.createGain();
  gain1.gain.value = 1.0; // Default: In 1 selected
  var gain2 = ctx.createGain();
  gain2.gain.value = 0.0;

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  in1.connect(gain1);
  in2.connect(gain2);
  gain1.connect(outGain);
  gain2.connect(outGain);

  var selectIdx = null;
  var inCount = 0;

  // Proxy+analyser for Select CV input
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (inCount === 0) { inputs[i] = in1; }
      else { inputs[i] = in2; }
      inCount++;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('select') >= 0 || name.indexOf('sel') >= 0) {
        selectIdx = i;
        inputs[i] = selProxy.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial select
  var selVal = ZOIA.sim._readParam(mod, selectIdx);
  if (selVal !== null) {
    if (selVal >= 0.5) {
      gain1.gain.value = 0.0;
      gain2.gain.value = 1.0;
    } else {
      gain1.gain.value = 1.0;
      gain2.gain.value = 0.0;
    }
  }

  var node = {
    type: 'audio_in_switch',
    inputs: inputs,
    outputs: outputs,
    _in1: in1, _in2: in2,
    _gain1: gain1, _gain2: gain2,
    _outGain: outGain,
    selectIdx: selectIdx,
    dispose: function() {
      _disposed = true;
      try { this._in1.disconnect(); } catch (e) {}
      try { this._in2.disconnect(); } catch (e) {}
      try { this._gain1.disconnect(); } catch (e) {}
      try { this._gain2.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setSelect: function(sel) {
      var t = ZOIA.sim.ctx.currentTime;
      if (sel >= 0.5) {
        this._gain1.gain.setTargetAtTime(0.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(1.0, t, 0.01);
      } else {
        this._gain1.gain.setTargetAtTime(1.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(0.0, t, 0.01);
      }
    }
  };

  // Poll select CV to drive setSelect
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollSelect() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var s = _selBuf[0];
    if (Math.abs(s - _lastSel) > 0.05) {
      node.setSelect(s);
      _lastSel = s;
    }
    requestAnimationFrame(pollSelect);
  })();

  return node;
};


// ================================================================
//  Audio Out Switch (Type 34)
// ================================================================
// Blocks: Input [audio_in], Out 1 [audio_out], Out 2 [audio_out],
//         Select [cv_in]
// Routes input to one of two outputs. Select < 0.5 = Out 1, >= 0.5 = Out 2.

ZOIA.sim._createAudioOutSwitch = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var gain1 = ctx.createGain();
  gain1.gain.value = 1.0; // Default: Out 1 selected
  var gain2 = ctx.createGain();
  gain2.gain.value = 0.0;

  inGain.connect(gain1);
  inGain.connect(gain2);

  var selectIdx = null;
  var outCount = 0;

  // Proxy+analyser for Select CV input
  var selProxy = ctx.createGain();
  selProxy.gain.value = 0;
  var selSrc = ctx.createConstantSource();
  selSrc.offset.value = 1;
  selSrc.connect(selProxy);
  selSrc.start();
  var selAnalyser = ctx.createAnalyser();
  selAnalyser.fftSize = 256;
  selProxy.connect(selAnalyser);

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'cv_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('select') >= 0 || name.indexOf('sel') >= 0) {
        selectIdx = i;
        inputs[i] = selProxy.gain;
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      if (outCount === 0) { outputs[i] = gain1; }
      else { outputs[i] = gain2; }
      outCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // Apply initial select
  var selVal = ZOIA.sim._readParam(mod, selectIdx);
  if (selVal !== null) {
    if (selVal >= 0.5) {
      gain1.gain.value = 0.0;
      gain2.gain.value = 1.0;
    } else {
      gain1.gain.value = 1.0;
      gain2.gain.value = 0.0;
    }
  }

  var node = {
    type: 'audio_out_switch',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _gain1: gain1, _gain2: gain2,
    selectIdx: selectIdx,
    dispose: function() {
      _disposed = true;
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._gain1.disconnect(); } catch (e) {}
      try { this._gain2.disconnect(); } catch (e) {}
      try { selSrc.stop(); } catch (e) {}
      try { selSrc.disconnect(); } catch (e) {}
      try { selProxy.disconnect(); } catch (e) {}
      try { selAnalyser.disconnect(); } catch (e) {}
    },
    setSelect: function(sel) {
      var t = ZOIA.sim.ctx.currentTime;
      if (sel >= 0.5) {
        this._gain1.gain.setTargetAtTime(0.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(1.0, t, 0.01);
      } else {
        this._gain1.gain.setTargetAtTime(1.0, t, 0.01);
        this._gain2.gain.setTargetAtTime(0.0, t, 0.01);
      }
    }
  };

  // Poll select CV to drive setSelect
  var _selBuf = new Float32Array(1);
  var _lastSel = -1;
  var _disposed = false;

  (function pollSelect() {
    if (_disposed) return;
    selAnalyser.getFloatTimeDomainData(_selBuf);
    var s = _selBuf[0];
    if (Math.abs(s - _lastSel) > 0.05) {
      node.setSelect(s);
      _lastSel = s;
    }
    requestAnimationFrame(pollSelect);
  })();

  return node;
};


// ================================================================
//  Looper (Type 62)
// ================================================================
// Blocks: Audio In [audio_in], Record [gate_in], Play [gate_in],
//         Audio Out [audio_out]
// Uses ScriptProcessorNode to capture raw samples during recording,
// then creates an AudioBuffer + AudioBufferSourceNode(loop=true)
// for reliable variable-length looping playback.

ZOIA.sim._createLooper = function(ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1.0;

  var recordGain = ctx.createGain();
  recordGain.gain.value = 0.0; // Off by default; gate enables recording

  var playGain = ctx.createGain();
  playGain.gain.value = 0.0; // Off by default; gate enables playback

  var outGain = ctx.createGain();
  outGain.gain.value = 1.0;

  // Audio capture during recording
  var captureProcessor = ctx.createScriptProcessor(4096, 1, 1);
  var captureChunks = []; // Array of Float32Array chunks
  var captureActive = false;

  // Signal flow:
  //   input -> outGain (dry pass-through, always)
  //   input -> recordGain -> captureProcessor -> silentDrain -> destination (capture path)
  //   input -> energyAnalyser (energy capture for timeline)
  //   AudioBufferSourceNode(loop=true) -> playGain -> outGain (playback path, created on demand)
  inGain.connect(recordGain);
  recordGain.connect(captureProcessor);
  var silentDrain = ctx.createGain();
  silentDrain.gain.value = 0;
  captureProcessor.connect(silentDrain);
  silentDrain.connect(ctx.destination);
  playGain.connect(outGain);
  inGain.connect(outGain); // dry signal always passes through

  // Capture handler
  captureProcessor.onaudioprocess = function(e) {
    if (captureActive) {
      var input = e.inputBuffer.getChannelData(0);
      var chunk = new Float32Array(input.length);
      // Copy samples (must copy, buffer is reused)
      for (var ci = 0; ci < input.length; ci++) {
        chunk[ci] = input[ci];
      }
      captureChunks.push(chunk);
    }
    // Zero the output to prevent any sound from the processor
    var output = e.outputBuffer.getChannelData(0);
    for (var oi = 0; oi < output.length; oi++) {
      output[oi] = 0;
    }
  };

  // CV proxy nodes for record/play/stop gates
  // Uses proxy GainNode + AnalyserNode polling (same pattern as Oscillator CV)
  var recProxy = ctx.createGain();
  recProxy.gain.value = 0;
  var recSrc = ctx.createConstantSource();
  recSrc.offset.value = 1;
  recSrc.connect(recProxy);
  recSrc.start();
  var recAnalyser = ctx.createAnalyser();
  recAnalyser.fftSize = 256;
  recProxy.connect(recAnalyser);

  var playProxy = ctx.createGain();
  playProxy.gain.value = 0;
  var playSrc = ctx.createConstantSource();
  playSrc.offset.value = 1;
  playSrc.connect(playProxy);
  playSrc.start();
  var playAnalyser = ctx.createAnalyser();
  playAnalyser.fftSize = 256;
  playProxy.connect(playAnalyser);

  // Stop gate proxy+analyser
  var stopProxy = ctx.createGain();
  stopProxy.gain.value = 0;
  var stopSrc = ctx.createConstantSource();
  stopSrc.offset.value = 1;
  stopSrc.connect(stopProxy);
  stopSrc.start();
  var stopAnalyser = ctx.createAnalyser();
  stopAnalyser.fftSize = 256;
  stopProxy.connect(stopAnalyser);

  // Energy analyser for waveform timeline (tapped from input)
  var energyAnalyser = ctx.createAnalyser();
  energyAnalyser.fftSize = 256;
  inGain.connect(energyAnalyser);
  var _energyBuf = new Float32Array(energyAnalyser.frequencyBinCount);

  var _disposed = false;
  var _recBuf = new Float32Array(1);
  var _playBuf = new Float32Array(1);
  var _stopBuf = new Float32Array(1);
  var _lastRec = 0;
  var _lastPlay = 0;
  var _lastStop = 0;

  var recordIdx = null;
  var playIdx = null;
  var stopIdx = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      inputs[i] = inGain;
    } else if (b.t === 'gate_in') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('rec') >= 0) {
        recordIdx = i;
        inputs[i] = recProxy.gain; // CV input for record gate
      } else if (name.indexOf('play') >= 0) {
        playIdx = i;
        inputs[i] = playProxy.gain; // CV input for play gate
      } else if (name.indexOf('stop') >= 0) {
        stopIdx = i;
        inputs[i] = stopProxy.gain; // CV input for stop gate
      } else {
        inputs[i] = null;
      }
    } else if (b.t === 'audio_out') {
      outputs[i] = outGain;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  ZOIA.log('[DIAG] Looper factory: mod.idx=' + mod.idx + ' recordIdx=' + recordIdx + ' playIdx=' + playIdx + ' stopIdx=' + stopIdx + ' blocks=' + blocks.length);

  var node = {
    type: 'looper',
    inputs: inputs,
    outputs: outputs,
    _inGain: inGain,
    _recordGain: recordGain,
    _playGain: playGain,
    _outGain: outGain,
    _audioBuffer: null,      // AudioBuffer created from captured samples
    _sourceNode: null,       // Current AudioBufferSourceNode (null when not playing)
    _recording: false,
    _playing: false,
    _recordStartTime: 0,
    _recordDuration: 0,
    _playStartTime: 0,
    _uiUpdateCounter: 0,
    _energyData: [],
    _energySampleRate: 20,
    recordIdx: recordIdx,
    playIdx: playIdx,
    stopIdx: stopIdx,
    dispose: function() {
      _disposed = true;
      try { this._inGain.disconnect(); } catch (e) {}
      try { this._recordGain.disconnect(); } catch (e) {}
      try { this._playGain.disconnect(); } catch (e) {}
      try { this._outGain.disconnect(); } catch (e) {}
      try { captureProcessor.disconnect(); } catch (e) {}
      try { silentDrain.disconnect(); } catch (e) {}
      if (this._sourceNode) {
        try { this._sourceNode.stop(); } catch (e) {}
        try { this._sourceNode.disconnect(); } catch (e) {}
      }
      try { recSrc.stop(); } catch (e) {}
      try { recSrc.disconnect(); } catch (e) {}
      try { recProxy.disconnect(); } catch (e) {}
      try { recAnalyser.disconnect(); } catch (e) {}
      try { playSrc.stop(); } catch (e) {}
      try { playSrc.disconnect(); } catch (e) {}
      try { playProxy.disconnect(); } catch (e) {}
      try { playAnalyser.disconnect(); } catch (e) {}
      try { stopSrc.stop(); } catch (e) {}
      try { stopSrc.disconnect(); } catch (e) {}
      try { stopProxy.disconnect(); } catch (e) {}
      try { stopAnalyser.disconnect(); } catch (e) {}
      try { energyAnalyser.disconnect(); } catch (e) {}
    },
    startRecord: function(source) {
      ZOIA.log('[DIAG] startRecord() called, source=' + (source || 'button') + ' _recording=' + this._recording);
      if (this._recording) return;
      this._energyData = [];
      captureChunks = [];
      captureActive = true;
      var t = ZOIA.sim.ctx.currentTime;
      this._recordGain.gain.setTargetAtTime(1.0, t, 0.01);
      this._recording = true;
      this._recordStartTime = ZOIA.sim.ctx.currentTime;
      ZOIA.gridButtons.render();
      ZOIA.oled.render();
      if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
      var ps = document.getElementById('patch-summary');
      if (ps) {
        ps.textContent = '\u25CF REC 0.0s';
        ps.style.color = '#ff1744';
      }
    },
    stopRecord: function(source) {
      ZOIA.log('[DIAG] stopRecord() called, source=' + (source || 'button') + ' _recording=' + this._recording);
      if (!this._recording) return;
      var t = ZOIA.sim.ctx.currentTime;
      captureActive = false;
      this._recordGain.gain.setTargetAtTime(0.0, t, 0.01);
      this._recordDuration = ZOIA.sim.ctx.currentTime - this._recordStartTime;

      // Build AudioBuffer from captured chunks
      var totalSamples = 0;
      for (var ci = 0; ci < captureChunks.length; ci++) {
        totalSamples += captureChunks[ci].length;
      }
      ZOIA.log('[DIAG] stopRecord: captured ' + captureChunks.length + ' chunks, ' + totalSamples + ' samples, duration=' + this._recordDuration.toFixed(3) + 's');
      if (totalSamples > 0) {
        var sampleRate = ctx.sampleRate;
        var buffer = ctx.createBuffer(1, totalSamples, sampleRate);
        var channelData = buffer.getChannelData(0);
        var offset = 0;
        for (var ci2 = 0; ci2 < captureChunks.length; ci2++) {
          channelData.set(captureChunks[ci2], offset);
          offset += captureChunks[ci2].length;
        }
        this._audioBuffer = buffer;
        ZOIA.log('[DIAG] stopRecord: created AudioBuffer, length=' + buffer.length + ' sampleRate=' + sampleRate);
      }
      captureChunks = []; // Free memory

      this._recording = false;
      ZOIA.gridButtons.render();
      ZOIA.oled.render();
      if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
      var ps = document.getElementById('patch-summary');
      if (ps) {
        ps.style.color = '';
        ZOIA.updatePatchSummary();
      }
    },
    startPlay: function(source) {
      ZOIA.log('[DIAG] startPlay() called, source=' + (source || 'button') + ' _playing=' + this._playing);
      if (this._playing) return;
      if (!this._audioBuffer) {
        ZOIA.log('[DIAG] startPlay: no audioBuffer, cannot play');
      } else {
        var t = ZOIA.sim.ctx.currentTime;
        // Create a new AudioBufferSourceNode each time (they are one-shot)
        var src = ctx.createBufferSource();
        src.buffer = this._audioBuffer;
        src.loop = true;
        src.connect(this._playGain);
        src.start(0);
        this._sourceNode = src;
        this._playGain.gain.setTargetAtTime(1.0, t, 0.01);
        this._playing = true;
        this._playStartTime = ZOIA.sim.ctx.currentTime;
        ZOIA.log('[DIAG] startPlay: started AudioBufferSourceNode, loop=true, bufferLen=' + this._audioBuffer.length);
        ZOIA.gridButtons.render();
        ZOIA.oled.render();
        if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
        var ps = document.getElementById('patch-summary');
        if (ps && !this._recording) {
          var dur = this._recordDuration;
          if (dur > 0) {
            ps.textContent = '\u25B6 0.0s / ' + dur.toFixed(1) + 's';
          } else {
            ps.textContent = '\u25B6 PLAYING';
          }
          ps.style.color = '#00e676';
        }
      }
    },
    stopPlay: function(source) {
      ZOIA.log('[DIAG] stopPlay() called, source=' + (source || 'button') + ' _playing=' + this._playing);
      if (!this._playing) return;
      var t = ZOIA.sim.ctx.currentTime;
      this._playGain.gain.setTargetAtTime(0.0, t, 0.01);
      if (this._sourceNode) {
        try { this._sourceNode.stop(); } catch (e) {}
        try { this._sourceNode.disconnect(); } catch (e) {}
        this._sourceNode = null;
      }
      this._playing = false;
      ZOIA.gridButtons.render();
      ZOIA.oled.render();
      if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
      var ps = document.getElementById('patch-summary');
      if (ps && !this._recording) {
        ps.style.color = '';
        ZOIA.updatePatchSummary();
      }
    },
    pressBlock: function(blockIdx) {
      ZOIA.log('[DIAG] pressBlock(' + blockIdx + ') recIdx=' + this.recordIdx + ' playIdx=' + this.playIdx + ' stopIdx=' + this.stopIdx + ' _rec=' + this._recording + ' _play=' + this._playing);
      if (blockIdx === this.recordIdx) {
        if (this._recording) {
          this.stopRecord();
          this.startPlay();
        } else {
          this.startRecord();
        }
      } else if (blockIdx === this.playIdx) {
        if (this._playing) {
          this.stopPlay();
        } else {
          this.startPlay();
        }
      } else if (blockIdx === this.stopIdx) {
        this.stopRecord();
        this.stopPlay();
      }
    },
    releaseBlock: function(blockIdx) {
      // Only Stop is momentary; Record and Play are toggles (no release action)
    }
  };

  // Poll CV inputs to detect gate changes
  var _pollCounter = 0;
  (function pollGates() {
    if (_disposed) return;
    recAnalyser.getFloatTimeDomainData(_recBuf);
    playAnalyser.getFloatTimeDomainData(_playBuf);
    var rec = _recBuf[0];
    var play = _playBuf[0];
    // Stop gate: read early so we can log all three together
    stopAnalyser.getFloatTimeDomainData(_stopBuf);
    var stop = _stopBuf[0];
    _pollCounter++;
    if (_pollCounter % 60 === 0) {
      ZOIA.log('[DIAG] pollGates: rec=' + rec.toFixed(3) + ' play=' + play.toFixed(3) + ' stop=' + stop.toFixed(3) + ' _rec=' + node._recording + ' _play=' + node._playing);
    }
    // Record gate: high (>0.5) = recording, low = stop
    if (rec > 0.5 && _lastRec <= 0.5) {
      node.startRecord('pollGates');
    } else if (rec <= 0.5 && _lastRec > 0.5) {
      node.stopRecord('pollGates');
      node.startPlay('pollGates-afterRec'); // Auto-play after recording stops
    }
    // Play gate: explicit play control
    if (play > 0.5 && _lastPlay <= 0.5) {
      node.startPlay('pollGates');
    } else if (play <= 0.5 && _lastPlay > 0.5) {
      node.stopPlay('pollGates');
    }
    // Stop gate: rising edge stops both recording and playback
    if (stop > 0.5 && _lastStop <= 0.5) {
      node.stopRecord('pollGates-stop');
      node.stopPlay('pollGates-stop');
    }
    if (node._recording) {
      node._uiUpdateCounter++;
      // Sample energy every 3 frames (~50ms at 60fps) for waveform timeline
      if (node._uiUpdateCounter % 3 === 0) {
        energyAnalyser.getFloatTimeDomainData(_energyBuf);
        var sum = 0;
        for (var ei = 0; ei < _energyBuf.length; ei++) {
          sum += _energyBuf[ei] * _energyBuf[ei];
        }
        var rms = Math.sqrt(sum / _energyBuf.length);
        node._energyData.push(Math.min(1.0, rms * 4));
      }
      if (node._uiUpdateCounter % 15 === 0) {
        ZOIA.oled.render();
        if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
        var ps = document.getElementById('patch-summary');
        if (ps) {
          var elapsed = ZOIA.sim.ctx.currentTime - node._recordStartTime;
          ps.textContent = '\u25CF REC ' + elapsed.toFixed(1) + 's';
        }
      }
    } else if (node._playing) {
      node._uiUpdateCounter++;
      if (node._uiUpdateCounter % 15 === 0) {
        ZOIA.oled.render();
        if (ZOIA.waveformTimeline) ZOIA.waveformTimeline.render();
        var ps2 = document.getElementById('patch-summary');
        if (ps2 && node._recordDuration > 0) {
          var playElapsed = ZOIA.sim.ctx.currentTime - node._playStartTime;
          var playPos = playElapsed % node._recordDuration;
          ps2.textContent = '\u25B6 ' + playPos.toFixed(1) + 's / ' + node._recordDuration.toFixed(1) + 's';
        }
      }
    }
    _lastRec = rec;
    _lastPlay = play;
    _lastStop = stop;
    requestAnimationFrame(pollGates);
  })();

  return node;
};


// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[24] = ZOIA.sim._createMultiFilter;
ZOIA.sim._moduleFactories[33] = ZOIA.sim._createAudioInSwitch;
ZOIA.sim._moduleFactories[34] = ZOIA.sim._createAudioOutSwitch;
ZOIA.sim._moduleFactories[53] = ZOIA.sim._createStereoSpread;
ZOIA.sim._moduleFactories[62] = ZOIA.sim._createLooper;
ZOIA.sim._moduleFactories[64] = ZOIA.sim._createAudioBalance;
ZOIA.sim._moduleFactories[65] = ZOIA.sim._createInverter;
ZOIA.sim._moduleFactories[73] = ZOIA.sim._createEQ;
ZOIA.sim._moduleFactories[78] = ZOIA.sim._createGranular;
ZOIA.sim._moduleFactories[79] = ZOIA.sim._createAudioBalance;

ZOIA.log('sim-mod-audio.js loaded: 9 audio modules registered');


// === sim-mod-cv.js ===
window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};

// ============================================================================
// Helper: build a WaveShaperNode from a mapping function
// ============================================================================
function _buildCurve(ctx, numSamples, mapFn) {
  var curve = new Float32Array(numSamples);
  for (var i = 0; i < numSamples; i++) {
    var x = (i / (numSamples - 1)) * 2 - 1; // -1 to +1
    curve[i] = mapFn(x);
  }
  var ws = ctx.createWaveShaper();
  ws.curve = curve;
  ws.oversample = 'none';
  return ws;
}

// ============================================================================
// 1. CV Mixer (Type 104)
//    blocks: In 1 [cv_in], In 2 [cv_in], In 3 [cv_in], Output [cv_out]
//    Sum three CV inputs into one output.
// ============================================================================
ZOIA.sim._createCVMixer = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var in1 = ctx.createGain();
  in1.gain.value = 1;
  var in2 = ctx.createGain();
  in2.gain.value = 1;
  var in3 = ctx.createGain();
  in3.gain.value = 1;
  var sum = ctx.createGain();
  sum.gain.value = 1;

  in1.connect(sum);
  in2.connect(sum);
  in3.connect(sum);

  var inNodes = [in1, in2, in3];
  var inIdx = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx < inNodes.length ? inNodes[inIdx++] : null;
      outputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = sum;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_mixer',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      in1.disconnect();
      in2.disconnect();
      in3.disconnect();
      sum.disconnect();
    }
  };
};

// ============================================================================
// 2. Multiplier (Type 22)
//    blocks: In 1 [cv_in], In 2 [cv_in], Output [cv_out]
//    Variant 1 has 3 inputs.
//    Multiply signals: In 1 feeds audio path of GainNode, In 2 modulates gain.
// ============================================================================
ZOIA.sim._createMultiplier = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // In 1 goes through a gain whose .gain is modulated by In 2
  var mult = ctx.createGain();
  mult.gain.value = 0; // will be driven by In 2

  // For variant 1 with a third input, chain a second multiplier
  var mult2 = ctx.createGain();
  mult2.gain.value = 1;
  mult.connect(mult2);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = mult; // audio path
      } else if (inIdx === 1) {
        inputs[i] = mult.gain; // modulate gain = multiply
      } else if (inIdx === 2) {
        inputs[i] = mult2.gain; // third input modulates second stage
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : mult2;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'multiplier',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      mult.disconnect();
      mult2.disconnect();
    }
  };
};

// ============================================================================
// 3. Sample & Hold (Type 10)
//    blocks: Input [cv_in], Trigger [gate_in], Output [cv_out]
//    On trigger rising edge, sample the CV input and hold it on the output.
// ============================================================================
ZOIA.sim._createSampleAndHold = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input CV proxy+analyser (continuous value read) ---
  var inputProxy = ctx.createGain();
  inputProxy.gain.value = 0;
  var inputProbeSrc = ctx.createConstantSource();
  inputProbeSrc.offset.value = 1;
  inputProbeSrc.connect(inputProxy);
  inputProbeSrc.start();
  var inputAnalyser = ctx.createAnalyser();
  inputAnalyser.fftSize = 256;
  inputProxy.connect(inputAnalyser);
  var _inputBuf = new Float32Array(1);

  // --- Trigger proxy+analyser (edge-detect) ---
  var trigProxy = ctx.createGain();
  trigProxy.gain.value = 0;
  var trigProbeSrc = ctx.createConstantSource();
  trigProbeSrc.offset.value = 1;
  trigProbeSrc.connect(trigProxy);
  trigProbeSrc.start();
  var trigAnalyser = ctx.createAnalyser();
  trigAnalyser.fftSize = 256;
  trigProxy.connect(trigAnalyser);
  var _trigBuf = new Float32Array(1);
  var _trigLast = 0;

  // --- Held output via ConstantSourceNode ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0;
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    // Read trigger
    trigAnalyser.getFloatTimeDomainData(_trigBuf);
    var g = _trigBuf[0];
    if (g > 0.5 && _trigLast <= 0.5) {
      // Rising edge: sample the input value
      inputAnalyser.getFloatTimeDomainData(_inputBuf);
      constOut.offset.value = _inputBuf[0];
    }
    _trigLast = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inputProxy.gain; // CV input
      } else {
        inputs[i] = trigProxy.gain; // Trigger input
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'sample_and_hold',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { inputProbeSrc.stop(); } catch (e) {}
      try { inputProbeSrc.disconnect(); } catch (e) {}
      try { inputProxy.disconnect(); } catch (e) {}
      try { inputAnalyser.disconnect(); } catch (e) {}
      try { trigProbeSrc.stop(); } catch (e) {}
      try { trigProbeSrc.disconnect(); } catch (e) {}
      try { trigProxy.disconnect(); } catch (e) {}
      try { trigAnalyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 4. Slew Limiter (Type 19)
//    blocks: Input [cv_in], Output [cv_out]
//    Variant 1 adds Rise Rate [cv_in] and Fall Rate [cv_in].
//    Polling-based linear slew with separate rise and fall rates.
//    Converts square waves into trapezoidal shapes.
// ============================================================================
ZOIA.sim._createSlewLimiter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input signal proxy+analyser (continuous value read) ---
  var inputProxy = ctx.createGain();
  inputProxy.gain.value = 0;
  var inputProbeSrc = ctx.createConstantSource();
  inputProbeSrc.offset.value = 1;
  inputProbeSrc.connect(inputProxy);
  inputProbeSrc.start();
  var inputAnalyser = ctx.createAnalyser();
  inputAnalyser.fftSize = 256;
  inputProxy.connect(inputAnalyser);
  var _inputBuf = new Float32Array(1);

  // --- Rise rate CV proxy+analyser (continuous value read) ---
  var riseProxy = ctx.createGain();
  riseProxy.gain.value = 0;
  var riseProbeSrc = ctx.createConstantSource();
  riseProbeSrc.offset.value = 1;
  riseProbeSrc.connect(riseProxy);
  riseProbeSrc.start();
  var riseAnalyser = ctx.createAnalyser();
  riseAnalyser.fftSize = 256;
  riseProxy.connect(riseAnalyser);
  var _riseBuf = new Float32Array(1);

  // --- Fall rate CV proxy+analyser (continuous value read) ---
  var fallProxy = ctx.createGain();
  fallProxy.gain.value = 0;
  var fallProbeSrc = ctx.createConstantSource();
  fallProbeSrc.offset.value = 1;
  fallProbeSrc.connect(fallProxy);
  fallProbeSrc.start();
  var fallAnalyser = ctx.createAnalyser();
  fallAnalyser.fftSize = 256;
  fallProxy.connect(fallAnalyser);
  var _fallBuf = new Float32Array(1);

  // --- Output via ConstantSourceNode ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0;
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  // --- Read initial rise/fall rates from mod.params if available ---
  var _current = 0;
  var _riseRate = 0.005;
  var _fallRate = 0.005;

  // Find inIdx 1 and inIdx 2 block positions for rise/fall params
  var riseBlockIdx = -1;
  var fallBlockIdx = -1;
  var tmpIdx = 0;
  for (var k = 0; k < blocks.length; k++) {
    var bt = blocks[k].t;
    if (bt === 'cv_in' || bt === 'audio_in' || bt === 'gate_in') {
      if (tmpIdx === 1) {
        riseBlockIdx = k;
      } else if (tmpIdx === 2) {
        fallBlockIdx = k;
      }
      tmpIdx++;
    }
  }
  if (riseBlockIdx >= 0 && mod.params && mod.params[riseBlockIdx] !== undefined) {
    _riseRate = (mod.params[riseBlockIdx] / 65535) * 0.1;
    if (_riseRate < 0.0001) { _riseRate = 0.005; }
  }
  if (fallBlockIdx >= 0 && mod.params && mod.params[fallBlockIdx] !== undefined) {
    _fallRate = (mod.params[fallBlockIdx] / 65535) * 0.1;
    if (_fallRate < 0.0001) { _fallRate = 0.005; }
  }

  var _disposed = false;

  (function poll() {
    if (_disposed) return;

    // Read input signal
    inputAnalyser.getFloatTimeDomainData(_inputBuf);
    var target = _inputBuf[0];

    // Read rise/fall CVs if connected
    riseAnalyser.getFloatTimeDomainData(_riseBuf);
    var rCV = _riseBuf[0];
    if (rCV > 0.001) { _riseRate = rCV * 0.1; }

    fallAnalyser.getFloatTimeDomainData(_fallBuf);
    var fCV = _fallBuf[0];
    if (fCV > 0.001) { _fallRate = fCV * 0.1; }

    // Linear slew toward target
    if (target > _current) {
      _current = Math.min(target, _current + _riseRate);
    } else if (target < _current) {
      _current = Math.max(target, _current - _fallRate);
    }
    constOut.offset.value = _current;

    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inputProxy.gain; // Input
      } else if (inIdx === 1) {
        inputs[i] = riseProxy.gain; // Rise Rate
      } else if (inIdx === 2) {
        inputs[i] = fallProxy.gain; // Fall Rate
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'slew_limiter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { inputProbeSrc.stop(); } catch (e) {}
      try { inputProbeSrc.disconnect(); } catch (e) {}
      try { inputProxy.disconnect(); } catch (e) {}
      try { inputAnalyser.disconnect(); } catch (e) {}
      try { riseProbeSrc.stop(); } catch (e) {}
      try { riseProbeSrc.disconnect(); } catch (e) {}
      try { riseProxy.disconnect(); } catch (e) {}
      try { riseAnalyser.disconnect(); } catch (e) {}
      try { fallProbeSrc.stop(); } catch (e) {}
      try { fallProbeSrc.disconnect(); } catch (e) {}
      try { fallProxy.disconnect(); } catch (e) {}
      try { fallAnalyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 5. Sequencer (Type 4)
//    blocks: CV Out [cv_out], Gate Out [gate_out], Clock [gate_in],
//            Reset [gate_in]
//    Approximate with a low-frequency sawtooth for CV and square for gate.
// ============================================================================
ZOIA.sim._createSequencer = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- 1. Parse step data from block layout ---
  var stepCount = 0;
  var cvInCount = 0;
  for (var bi = 0; bi < blocks.length; bi++) {
    if (blocks[bi].t === 'cv_in') { cvInCount++; }
  }
  stepCount = Math.max(2, cvInCount - 2); // minus clock and reset

  // Read step CV values from params (blocks 2..2+stepCount-1)
  var _stepValues = [];
  for (var si = 0; si < stepCount; si++) {
    var paramIdx = si + 2;
    if (mod.params && mod.params[paramIdx] !== undefined) {
      _stepValues.push(mod.params[paramIdx] / 65535);
    } else {
      _stepValues.push(si / Math.max(1, stepCount - 1)); // ascending staircase fallback
    }
  }

  // --- 2. Create output nodes (ConstantSourceNodes) ---
  var cvOut = ctx.createConstantSource();
  cvOut.offset.value = _stepValues[0];
  cvOut.start();
  var cvOutGain = ctx.createGain();
  cvOutGain.gain.value = 1;
  cvOut.connect(cvOutGain);

  var gateOut = ctx.createConstantSource();
  gateOut.offset.value = 0;
  gateOut.start();
  var gateOutGain = ctx.createGain();
  gateOutGain.gain.value = 1;
  gateOut.connect(gateOutGain);

  // --- 3. Clock proxy+analyser (edge detection) ---
  var clockProxy = ctx.createGain();
  clockProxy.gain.value = 0;
  var clockSrc = ctx.createConstantSource();
  clockSrc.offset.value = 1;
  clockSrc.connect(clockProxy);
  clockSrc.start();
  var clockAnalyser = ctx.createAnalyser();
  clockAnalyser.fftSize = 256;
  clockProxy.connect(clockAnalyser);
  var _clockBuf = new Float32Array(1);
  var _lastClock = 0;

  // --- 4. Reset proxy+analyser (edge detection) ---
  var resetProxy = ctx.createGain();
  resetProxy.gain.value = 0;
  var resetSrc = ctx.createConstantSource();
  resetSrc.offset.value = 1;
  resetSrc.connect(resetProxy);
  resetSrc.start();
  var resetAnalyser = ctx.createAnalyser();
  resetAnalyser.fftSize = 256;
  resetProxy.connect(resetAnalyser);
  var _resetBuf = new Float32Array(1);
  var _lastReset = 0;

  // --- 5. Step state and polling loop ---
  var _currentStep = 0;
  var _disposed = false;

  (function pollSeq() {
    if (_disposed) return;

    // Check clock for rising edge
    clockAnalyser.getFloatTimeDomainData(_clockBuf);
    var clk = _clockBuf[0];
    if (clk > 0.5 && _lastClock <= 0.5) {
      // Advance step
      _currentStep = (_currentStep + 1) % stepCount;
      var t = ZOIA.sim.ctx.currentTime;
      cvOut.offset.setValueAtTime(_stepValues[_currentStep], t);
      // Fire gate pulse (2ms)
      gateOut.offset.setValueAtTime(1, t);
      gateOut.offset.setValueAtTime(0, t + 0.002);
    }
    _lastClock = clk;

    // Check reset for rising edge
    resetAnalyser.getFloatTimeDomainData(_resetBuf);
    var rst = _resetBuf[0];
    if (rst > 0.5 && _lastReset <= 0.5) {
      _currentStep = 0;
      var t2 = ZOIA.sim.ctx.currentTime;
      cvOut.offset.setValueAtTime(_stepValues[0], t2);
    }
    _lastReset = rst;

    requestAnimationFrame(pollSeq);
  })();

  // --- 6. Block wiring loop ---
  var inIdx = 0;
  var outDone = false;
  var gateDone = false;
  var _stepSinks = [];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = clockProxy.gain; // Clock
      } else if (inIdx === 1) {
        inputs[i] = resetProxy.gain; // Reset
      } else {
        // Step value inputs (s1-sN) — accept as sinks for now
        var stepSink = ctx.createGain();
        stepSink.gain.value = 1;
        inputs[i] = stepSink;
        _stepSinks.push(stepSink);
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out') {
      if (!outDone) {
        inputs[i] = null;
        outputs[i] = cvOutGain; // CV output
        outDone = true;
      } else if (!gateDone) {
        inputs[i] = null;
        outputs[i] = gateOutGain; // Gate output
        gateDone = true;
      } else {
        inputs[i] = null;
        outputs[i] = null;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  // --- 7. Return module descriptor ---
  return {
    type: 'sequencer',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { cvOut.stop(); } catch (e) {}
      try { cvOut.disconnect(); } catch (e) {}
      try { cvOutGain.disconnect(); } catch (e) {}
      try { gateOut.stop(); } catch (e) {}
      try { gateOut.disconnect(); } catch (e) {}
      try { gateOutGain.disconnect(); } catch (e) {}
      try { clockSrc.stop(); } catch (e) {}
      try { clockSrc.disconnect(); } catch (e) {}
      try { clockProxy.disconnect(); } catch (e) {}
      try { clockAnalyser.disconnect(); } catch (e) {}
      try { resetSrc.stop(); } catch (e) {}
      try { resetSrc.disconnect(); } catch (e) {}
      try { resetProxy.disconnect(); } catch (e) {}
      try { resetAnalyser.disconnect(); } catch (e) {}
      for (var di = 0; di < _stepSinks.length; di++) {
        try { _stepSinks[di].disconnect(); } catch (e) {}
      }
    }
  };
};

// ============================================================================
// 6. CV Invert (Type 17)
//    blocks: Input [cv_in], Output [cv_out]
//    Output = 1 - Input. ConstantSource(1) + Input * -1.
// ============================================================================
ZOIA.sim._createCVInvert = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Negate the input
  var invert = ctx.createGain();
  invert.gain.value = -1;

  // Add constant 1
  var one = ctx.createConstantSource();
  one.offset.value = 1;
  one.start();

  // Sum node
  var sum = ctx.createGain();
  sum.gain.value = 1;

  invert.connect(sum);
  one.connect(sum);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? invert : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : sum;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_invert',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      invert.disconnect();
      one.stop();
      one.disconnect();
      sum.disconnect();
    }
  };
};

// ============================================================================
// 7. Steps (Type 18)
//    blocks: Input [cv_in], Steps [cv_in], Output [cv_out]
//    Quantize CV to discrete steps via WaveShaperNode staircase curve.
// ============================================================================
ZOIA.sim._createSteps = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var numSteps = 8;
  if (mod.params && mod.params.length > 0) {
    var raw = mod.params[0] / 65535;
    numSteps = Math.max(2, Math.round(raw * 32));
  }

  var ws = _buildCurve(ctx, 8192, function (x) {
    // Map -1..1 to 0..1, quantize, map back
    var v = (x + 1) * 0.5;
    var q = Math.floor(v * numSteps) / numSteps;
    return q * 2 - 1;
  });

  var inGain = ctx.createGain();
  inGain.gain.value = 1;
  inGain.connect(ws);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else {
        inputs[i] = null; // Steps cv_in - ignored (baked into curve)
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'steps',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      ws.disconnect();
    }
  };
};

// ============================================================================
// 8. CV Delay (Type 46)
//    blocks: Input [cv_in], Time [cv_in], Output [cv_out]
//    Delay a CV signal with a DelayNode.
// ============================================================================
ZOIA.sim._createCVDelay = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var delay = ctx.createDelay(5.0); // max 5 seconds
  delay.delayTime.value = 0.5;

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = delay; // Input
      } else if (inIdx === 1) {
        inputs[i] = delay.delayTime; // Time modulation
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : delay;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_delay',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      delay.disconnect();
    }
  };
};

// ============================================================================
// 9. CV Loop (Type 47)
//    blocks: Input [cv_in], Record [gate_in], Output [cv_out]
//    Approximate with DelayNode with feedback=1 to recirculate.
// ============================================================================
ZOIA.sim._createCVLoop = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var delay = ctx.createDelay(5.0);
  delay.delayTime.value = 2.0;

  var feedback = ctx.createGain();
  feedback.gain.value = 1.0; // full feedback = loop

  var inGain = ctx.createGain();
  inGain.gain.value = 0; // NOT recording by default

  inGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);

  // --- Record gate proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: start recording
      inGain.gain.setTargetAtTime(1.0, ZOIA.sim.ctx.currentTime, 0.01);
    } else if (g <= 0.5 && _last > 0.5) {
      // Falling edge: stop recording
      inGain.gain.setTargetAtTime(0.0, ZOIA.sim.ctx.currentTime, 0.01);
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else {
        inputs[i] = proxy.gain; // Record gate
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : delay;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_loop',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { inGain.disconnect(); } catch (e) {}
      try { delay.disconnect(); } catch (e) {}
      try { feedback.disconnect(); } catch (e) {}
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 10. CV Filter (Type 48)
//     blocks: Input [cv_in], Frequency [cv_in], Output [cv_out]
//     Lowpass filter for CV at very low frequency.
// ============================================================================
ZOIA.sim._createCVFilter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5; // very low
  lp.Q.value = 0.707;

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = lp; // Input (connect audio into filter)
      } else if (inIdx === 1) {
        inputs[i] = lp.frequency; // Frequency modulation
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : lp;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_filter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      lp.disconnect();
    }
  };
};

// ============================================================================
// 11. Clock Divider (Type 49)
//     blocks: Clock In [gate_in], Divisor [cv_in], Output [gate_out],
//             Remainder [gate_out]
//     Passthrough with gain scaling as approximation.
// ============================================================================
ZOIA.sim._createClockDivider = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Determine divisor block index and read initial divisor from params ---
  var divisorIdx = -1;
  var tmpInIdx = 0;
  for (var k = 0; k < blocks.length; k++) {
    var bt = blocks[k].t;
    if (bt === 'cv_in' || bt === 'audio_in' || bt === 'gate_in') {
      if (tmpInIdx === 1) {
        divisorIdx = k;
        break;
      }
      tmpInIdx++;
    }
  }
  var _divisor = 4; // default
  if (divisorIdx >= 0 && mod.params && mod.params[divisorIdx] !== undefined) {
    _divisor = Math.max(2, Math.round((mod.params[divisorIdx] / 65535) * 30) + 2);
  }

  // --- Clock input proxy+analyser (edge-detect) ---
  var clockProxy = ctx.createGain();
  clockProxy.gain.value = 0;
  var clockProbeSrc = ctx.createConstantSource();
  clockProbeSrc.offset.value = 1;
  clockProbeSrc.connect(clockProxy);
  clockProbeSrc.start();
  var clockAnalyser = ctx.createAnalyser();
  clockAnalyser.fftSize = 256;
  clockProxy.connect(clockAnalyser);
  var _clockBuf = new Float32Array(1);
  var _clockLast = 0;

  // --- Divisor CV proxy+analyser (continuous value) ---
  var divisorProxy = ctx.createGain();
  divisorProxy.gain.value = 0;
  var divisorProbeSrc = ctx.createConstantSource();
  divisorProbeSrc.offset.value = 1;
  divisorProbeSrc.connect(divisorProxy);
  divisorProbeSrc.start();
  var divisorAnalyser = ctx.createAnalyser();
  divisorAnalyser.fftSize = 256;
  divisorProxy.connect(divisorAnalyser);
  var _divBuf = new Float32Array(1);
  var _divLast = -1;

  // --- Divided output via ConstantSourceNode ---
  var mainOut = ctx.createConstantSource();
  mainOut.offset.value = 0;
  mainOut.start();
  var mainOutGain = ctx.createGain();
  mainOutGain.gain.value = 1;
  mainOut.connect(mainOutGain);

  // --- Remainder output via ConstantSourceNode ---
  var remOut = ctx.createConstantSource();
  remOut.offset.value = 0;
  remOut.start();
  var remOutGain = ctx.createGain();
  remOutGain.gain.value = 1;
  remOut.connect(remOutGain);

  var _counter = 0;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;

    // Check divisor CV for changes
    divisorAnalyser.getFloatTimeDomainData(_divBuf);
    var dv = _divBuf[0];
    if (Math.abs(dv - _divLast) > 0.05) {
      _divisor = Math.max(2, Math.round(dv * 30) + 2);
      _divLast = dv;
    }

    // Check clock for rising edge
    clockAnalyser.getFloatTimeDomainData(_clockBuf);
    var g = _clockBuf[0];
    if (g > 0.5 && _clockLast <= 0.5) {
      _counter++;
      var t = ZOIA.sim.ctx.currentTime;
      if (_counter >= _divisor) {
        _counter = 0;
        mainOut.offset.setValueAtTime(1, t);
        mainOut.offset.setValueAtTime(0, t + 0.002);
      } else {
        remOut.offset.setValueAtTime(1, t);
        remOut.offset.setValueAtTime(0, t + 0.002);
      }
    }
    _clockLast = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [mainOutGain, remOutGain];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = clockProxy.gain; // Clock In
      } else if (inIdx === 1) {
        inputs[i] = divisorProxy.gain; // Divisor
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'clock_divider',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { clockProbeSrc.stop(); } catch (e) {}
      try { clockProbeSrc.disconnect(); } catch (e) {}
      try { clockProxy.disconnect(); } catch (e) {}
      try { clockAnalyser.disconnect(); } catch (e) {}
      try { divisorProbeSrc.stop(); } catch (e) {}
      try { divisorProbeSrc.disconnect(); } catch (e) {}
      try { divisorProxy.disconnect(); } catch (e) {}
      try { divisorAnalyser.disconnect(); } catch (e) {}
      try { mainOut.stop(); } catch (e) {}
      try { mainOut.disconnect(); } catch (e) {}
      try { mainOutGain.disconnect(); } catch (e) {}
      try { remOut.stop(); } catch (e) {}
      try { remOut.disconnect(); } catch (e) {}
      try { remOutGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 12. Comparator (Type 50)
//     blocks: Input [cv_in], Threshold [cv_in], Output [gate_out]
//     Use WaveShaperNode with step function: output 1 when input > 0.
//     Subtract threshold from input first.
// ============================================================================
ZOIA.sim._createComparator = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Input - threshold, then step function
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Threshold subtracted via inverted gain
  var threshInvert = ctx.createGain();
  threshInvert.gain.value = -1;

  // Summation node
  var diff = ctx.createGain();
  diff.gain.value = 1;
  inGain.connect(diff);
  threshInvert.connect(diff);

  // Step function: > 0 => 1, <= 0 => 0
  var ws = _buildCurve(ctx, 4096, function (x) {
    return x > 0 ? 1 : 0;
  });
  diff.connect(ws);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else if (inIdx === 1) {
        inputs[i] = threshInvert; // Threshold
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'comparator',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      threshInvert.disconnect();
      diff.disconnect();
      ws.disconnect();
    }
  };
};

// ============================================================================
// 13. CV Rectify (Type 51)
//     blocks: Input [cv_in], Output [cv_out]
//     Full-wave rectification (absolute value) via WaveShaperNode.
// ============================================================================
ZOIA.sim._createCVRectify = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var ws = _buildCurve(ctx, 4096, function (x) {
    return Math.abs(x);
  });

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? ws : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_rectify',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      ws.disconnect();
    }
  };
};

// ============================================================================
// 14. Trigger (Type 52)
//     blocks: Input [gate_in], Output [gate_out]
//     Convert gate to short trigger pulse via edge detection.
// ============================================================================
ZOIA.sim._createTrigger = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;

  // --- Output: ConstantSourceNode for trigger pulse ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0;
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: fire a short 2ms trigger pulse
      var t = ZOIA.sim.ctx.currentTime;
      constOut.offset.setValueAtTime(1, t);
      constOut.offset.setValueAtTime(0, t + 0.002);
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? proxy.gain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'trigger',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 15. CV Abs (Type 63)
//     blocks: Input [cv_in], Output [cv_out]
//     Absolute value via WaveShaperNode (same as rectify).
// ============================================================================
ZOIA.sim._createCVAbs = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var ws = _buildCurve(ctx, 4096, function (x) {
    return Math.abs(x);
  });

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? ws : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_abs',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      ws.disconnect();
    }
  };
};

// ============================================================================
// 16. Quantizer (Type 70)
//     blocks: Input [cv_in], Output [cv_out]
//     Musical scale quantizer: 12 chromatic steps per octave.
// ============================================================================
ZOIA.sim._createQuantizer = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Quantize to 12 steps per unit (chromatic semitones per octave)
  var ws = _buildCurve(ctx, 8192, function (x) {
    // Map from -1..1 to 0..1 range
    var v = (x + 1) * 0.5;
    // Quantize to 1/12th steps
    var q = Math.round(v * 12) / 12;
    // Map back to -1..1
    return q * 2 - 1;
  });

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? ws : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : ws;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'quantizer',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      ws.disconnect();
    }
  };
};

// ============================================================================
// 17. CV Min/Max (Type 74)
//     blocks: In 1 [cv_in], In 2 [cv_in], Min [cv_out], Max [cv_out]
//     Rough approximation: Min output = In 1, Max output = In 2.
//     (True min/max requires non-linear mixing not easily done in Web Audio.)
// ============================================================================
ZOIA.sim._createCVMinMax = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var in1 = ctx.createGain();
  in1.gain.value = 1;
  var in2 = ctx.createGain();
  in2.gain.value = 1;

  // Approximation: average both to each output with slight bias
  // Min output: average with slight downward bias
  var minOut = ctx.createGain();
  minOut.gain.value = 1;
  var minG1 = ctx.createGain();
  minG1.gain.value = 0.5;
  var minG2 = ctx.createGain();
  minG2.gain.value = 0.5;
  in1.connect(minG1);
  in2.connect(minG2);
  minG1.connect(minOut);
  minG2.connect(minOut);

  // Max output: same average (rough approximation)
  var maxOut = ctx.createGain();
  maxOut.gain.value = 1;
  var maxG1 = ctx.createGain();
  maxG1.gain.value = 0.5;
  var maxG2 = ctx.createGain();
  maxG2.gain.value = 0.5;
  in1.connect(maxG1);
  in2.connect(maxG2);
  maxG1.connect(maxOut);
  maxG2.connect(maxOut);

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [minOut, maxOut];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = in1;
      } else if (inIdx === 1) {
        inputs[i] = in2;
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_min_max',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      in1.disconnect();
      in2.disconnect();
      minG1.disconnect();
      minG2.disconnect();
      minOut.disconnect();
      maxG1.disconnect();
      maxG2.disconnect();
      maxOut.disconnect();
    }
  };
};

// ============================================================================
// 18. Gate Inverter (Type 75)
//     blocks: Input [gate_in], Output [gate_out]
//     Invert gate: GainNode(-1) + ConstantSource(1).
// ============================================================================
ZOIA.sim._createGateInverter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var invert = ctx.createGain();
  invert.gain.value = -1;

  var one = ctx.createConstantSource();
  one.offset.value = 1;
  one.start();

  var sum = ctx.createGain();
  sum.gain.value = 1;
  invert.connect(sum);
  one.connect(sum);

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? invert : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : sum;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'gate_inverter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      invert.disconnect();
      one.stop();
      one.disconnect();
      sum.disconnect();
    }
  };
};

// ============================================================================
// 19. CV Flip Flop (Type 77)
//     blocks: Input [gate_in], Q [gate_out], Q Inv [gate_out]
//     Toggle state on each rising edge. Q and Q-Inv are complementary.
// ============================================================================
ZOIA.sim._createCVFlipFlop = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Input proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;

  // --- Q output ---
  var qSrc = ctx.createConstantSource();
  qSrc.offset.value = 0;
  qSrc.start();
  var qOutGain = ctx.createGain();
  qOutGain.gain.value = 1;
  qSrc.connect(qOutGain);

  // --- Q-Inv output ---
  var qInvSrc = ctx.createConstantSource();
  qInvSrc.offset.value = 1;
  qInvSrc.start();
  var qInvOutGain = ctx.createGain();
  qInvOutGain.gain.value = 1;
  qInvSrc.connect(qInvOutGain);

  var _state = false;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: toggle state
      _state = !_state;
      qSrc.offset.value = _state ? 1 : 0;
      qInvSrc.offset.value = _state ? 0 : 1;
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [qOutGain, qInvOutGain];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? proxy.gain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cv_flip_flop',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
      try { qSrc.stop(); } catch (e) {}
      try { qSrc.disconnect(); } catch (e) {}
      try { qOutGain.disconnect(); } catch (e) {}
      try { qInvSrc.stop(); } catch (e) {}
      try { qInvSrc.disconnect(); } catch (e) {}
      try { qInvOutGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 20. Tap Tempo (Type 100)
//     blocks: Tap [gate_in], CV Out [cv_out]
//     Detect tap rising edges and output CV proportional to tap interval.
//     Maps: 0s interval -> 0.0 CV, 2s interval -> 1.0 CV.
// ============================================================================
ZOIA.sim._createTapTempo = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // --- Tap input proxy+analyser (edge-detect) ---
  var proxy = ctx.createGain();
  proxy.gain.value = 0;
  var probeSrc = ctx.createConstantSource();
  probeSrc.offset.value = 1;
  probeSrc.connect(proxy);
  probeSrc.start();
  var analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  proxy.connect(analyser);
  var _buf = new Float32Array(1);
  var _last = 0;

  // --- Output via ConstantSourceNode ---
  var constOut = ctx.createConstantSource();
  constOut.offset.value = 0; // no tempo detected yet
  constOut.start();
  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  constOut.connect(outGain);

  var _lastTapTime = 0;
  var _disposed = false;

  (function poll() {
    if (_disposed) return;
    analyser.getFloatTimeDomainData(_buf);
    var g = _buf[0];
    if (g > 0.5 && _last <= 0.5) {
      // Rising edge: compute interval and update output CV
      var now = ZOIA.sim.ctx.currentTime;
      if (_lastTapTime > 0) {
        var interval = now - _lastTapTime;
        constOut.offset.value = Math.min(1.0, interval / 2.0);
      }
      _lastTapTime = now;
    }
    _last = g;
    requestAnimationFrame(poll);
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? proxy.gain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'tap_tempo',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { probeSrc.stop(); } catch (e) {}
      try { probeSrc.disconnect(); } catch (e) {}
      try { proxy.disconnect(); } catch (e) {}
      try { analyser.disconnect(); } catch (e) {}
      try { constOut.stop(); } catch (e) {}
      try { constOut.disconnect(); } catch (e) {}
      try { outGain.disconnect(); } catch (e) {}
    }
  };
};

// ============================================================================
// 21. Byte Splitter (Type 103)
//     blocks: Input [cv_in], High [cv_out], Low [cv_out]
//     Split CV into high and low portions using different gains.
// ============================================================================
ZOIA.sim._createByteSplitter = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // High: scale down to get upper portion
  var highGain = ctx.createGain();
  highGain.gain.value = 0.5; // upper half approximation
  inGain.connect(highGain);

  // Low: waveshaper to extract fractional part (lower bits)
  var lowWs = _buildCurve(ctx, 4096, function (x) {
    // Extract lower portion: fract(x * 16) / 16 mapped to full range
    var v = (x + 1) * 0.5; // 0..1
    var frac = (v * 16) % 1;
    return frac * 2 - 1;
  });
  inGain.connect(lowWs);

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [highGain, lowWs];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      inputs[i] = inIdx === 0 ? inGain : null;
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'byte_splitter',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      highGain.disconnect();
      lowWs.disconnect();
    }
  };
};

// ============================================================================
// 22. Logic Gate (Type 105)
//     blocks: In 1 [gate_in], In 2 [gate_in], Output [gate_out]
//     AND approximation via audio multiplication (GainNode).
// ============================================================================
ZOIA.sim._createLogicGate = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // AND: multiply two signals. In 1 feeds audio, In 2 modulates gain.
  var mult = ctx.createGain();
  mult.gain.value = 0; // driven by In 2

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = mult; // In 1: audio path
      } else if (inIdx === 1) {
        inputs[i] = mult.gain; // In 2: modulate gain (AND)
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : mult;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'logic_gate',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      mult.disconnect();
    }
  };
};

// ============================================================================
// 23. Random (Type 39)
//     blocks: Output [cv_out]. Variant 1 adds Trigger [gate_in].
//     If gate_in block exists: triggered random (new value on each rising edge).
//     Otherwise: free-running noise buffer at slow rate.
// ============================================================================
ZOIA.sim._createRandom = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Detect whether a gate_in block exists (triggered variant)
  var hasGateIn = false;
  for (var k = 0; k < blocks.length; k++) {
    if (blocks[k].t === 'gate_in') {
      hasGateIn = true;
      break;
    }
  }

  var outGain = ctx.createGain();
  outGain.gain.value = 1;

  // Nodes that only exist in one variant
  var _disposed = false;
  var proxy = null;
  var probeSrc = null;
  var analyser = null;
  var constOut = null;
  var src = null;

  if (hasGateIn) {
    // --- Triggered variant: proxy+analyser edge-detect ---
    proxy = ctx.createGain();
    proxy.gain.value = 0;
    probeSrc = ctx.createConstantSource();
    probeSrc.offset.value = 1;
    probeSrc.connect(proxy);
    probeSrc.start();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    proxy.connect(analyser);
    var _buf = new Float32Array(1);
    var _last = 0;

    constOut = ctx.createConstantSource();
    constOut.offset.value = Math.random();
    constOut.start();
    constOut.connect(outGain);

    (function poll() {
      if (_disposed) return;
      analyser.getFloatTimeDomainData(_buf);
      var g = _buf[0];
      if (g > 0.5 && _last <= 0.5) {
        // Rising edge: new random value
        constOut.offset.value = Math.random();
      }
      _last = g;
      requestAnimationFrame(poll);
    })();
  } else {
    // --- Free-running variant: noise buffer ---
    var bufLen = 256;
    var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var j = 0; j < bufLen; j++) {
      data[j] = Math.random();
    }

    src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 0.01;
    src.connect(outGain);
    src.start();
  }

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (hasGateIn && inIdx === 0) {
        inputs[i] = proxy.gain; // Trigger input
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'random',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _disposed = true;
      try { outGain.disconnect(); } catch (e) {}
      if (hasGateIn) {
        try { probeSrc.stop(); } catch (e) {}
        try { probeSrc.disconnect(); } catch (e) {}
        try { proxy.disconnect(); } catch (e) {}
        try { analyser.disconnect(); } catch (e) {}
        try { constOut.stop(); } catch (e) {}
        try { constOut.disconnect(); } catch (e) {}
      } else {
        try { src.stop(); } catch (e) {}
        try { src.disconnect(); } catch (e) {}
      }
    }
  };
};

// ============================================================================
// 24. Rhythm (Type 37)
//     blocks: Gate Out [gate_out], Clock [gate_in], Reset [gate_in],
//             Steps [cv_in], Density [cv_in]
//     Approximate with a square wave oscillator at clock rate.
// ============================================================================
ZOIA.sim._createRhythm = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sqOsc = ctx.createOscillator();
  sqOsc.type = 'square';
  sqOsc.frequency.value = 2; // ~120 BPM eighth notes

  // Scale to 0..1 range for gate
  var scaleGain = ctx.createGain();
  scaleGain.gain.value = 0.5;
  var offsetNode = ctx.createConstantSource();
  offsetNode.offset.value = 0.5;
  offsetNode.start();

  var outGain = ctx.createGain();
  outGain.gain.value = 1;
  sqOsc.connect(scaleGain);
  scaleGain.connect(outGain);
  offsetNode.connect(outGain);

  sqOsc.start();

  // Clock input: connects to sqOsc frequency for external rate control
  var rhythmClockIn = ctx.createGain();
  rhythmClockIn.gain.value = 1;
  rhythmClockIn.connect(sqOsc.frequency);

  // Reset, Steps, Density: GainNodes so connections are accepted (sink)
  var rhythmResetIn = ctx.createGain();
  rhythmResetIn.gain.value = 1;
  var rhythmStepsIn = ctx.createGain();
  rhythmStepsIn.gain.value = 1;
  var rhythmDensityIn = ctx.createGain();
  rhythmDensityIn.gain.value = 1;

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = rhythmClockIn; // Clock - modulates oscillator frequency
      } else if (inIdx === 1) {
        inputs[i] = rhythmResetIn; // Reset - accepted but sink
      } else if (inIdx === 2) {
        inputs[i] = rhythmStepsIn; // Steps - accepted but sink
      } else if (inIdx === 3) {
        inputs[i] = rhythmDensityIn; // Density - accepted but sink
      } else {
        inputs[i] = rhythmDensityIn; // fallback sink
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outGain;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'rhythm',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sqOsc.stop();
      sqOsc.disconnect();
      scaleGain.disconnect();
      offsetNode.stop();
      offsetNode.disconnect();
      outGain.disconnect();
      rhythmClockIn.disconnect();
      rhythmResetIn.disconnect();
      rhythmStepsIn.disconnect();
      rhythmDensityIn.disconnect();
    }
  };
};

// ============================================================================
// 25. Gate (Type 35)
//     blocks: Input [cv_in], Gate [gate_in], Output [cv_out]
//     Pass CV only when gate is high. GainNode where gate modulates gain.
// ============================================================================
ZOIA.sim._createGate = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Input goes through GainNode whose gain is modulated by Gate
  var gated = ctx.createGain();
  gated.gain.value = 1; // default open; explicit gate input overrides this
  var threshold = ctx.createWaveShaper();
  var thresholdCurve = new Float32Array(256);
  for (var tc = 0; tc < thresholdCurve.length; tc++) {
    thresholdCurve[tc] = tc >= 128 ? 1 : 0;
  }
  threshold.curve = thresholdCurve;
  threshold.oversample = 'none';
  gated.connect(threshold);

  var inIdx = 0;
  var outDone = false;
  var gateInputAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = gated; // Input: audio path
      } else if (inIdx === 1) {
        inputs[i] = gated.gain; // Gate: modulates gain
        gateInputAssigned = true;
      } else {
        inputs[i] = null;
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : threshold;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'gate',
    inputs: inputs,
    outputs: outputs,
    _gateInputAssigned: gateInputAssigned,
    dispose: function () {
      gated.disconnect();
      threshold.disconnect();
    }
  };
};

// ============================================================================
// 26. In Switch (Type 31)
//     blocks: In 1 [cv_in], In 2 [cv_in], Output [cv_out], Select [cv_in]
//     Crossfade between two inputs based on Select CV.
// ============================================================================
ZOIA.sim._createInSwitch = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // In 1 through gain A, In 2 through gain B
  // Select CV: 0 = In 1, 1 = In 2 (crossfade)
  var in1Gain = ctx.createGain();
  in1Gain.gain.value = 1.0; // default: In 1 selected
  var in2Gain = ctx.createGain();
  in2Gain.gain.value = 0.0;

  var outSum = ctx.createGain();
  outSum.gain.value = 1;
  in1Gain.connect(outSum);
  in2Gain.connect(outSum);

  // Select input: proxy + analyser to detect CV value and crossfade
  var inSwSelProxy = ctx.createGain();
  inSwSelProxy.gain.value = 0;
  var inSwSelSrc = ctx.createConstantSource();
  inSwSelSrc.offset.value = 1;
  inSwSelSrc.connect(inSwSelProxy);
  inSwSelSrc.start();
  var inSwSelAnalyser = ctx.createAnalyser();
  inSwSelAnalyser.fftSize = 256;
  inSwSelProxy.connect(inSwSelAnalyser);

  // Poll select value and adjust input gains
  var _inSwSelBuf = new Float32Array(1);
  var _inSwLastSel = -1;
  var _inSwDisposed = false;

  (function pollInSwSelect() {
    if (!_inSwDisposed) {
      inSwSelAnalyser.getFloatTimeDomainData(_inSwSelBuf);
      var s = _inSwSelBuf[0];
      if (Math.abs(s - _inSwLastSel) > 0.05) {
        var t = ZOIA.sim.ctx.currentTime;
        if (s >= 0.5) {
          in1Gain.gain.setTargetAtTime(0.0, t, 0.01);
          in2Gain.gain.setTargetAtTime(1.0, t, 0.01);
        } else {
          in1Gain.gain.setTargetAtTime(1.0, t, 0.01);
          in2Gain.gain.setTargetAtTime(0.0, t, 0.01);
        }
        _inSwLastSel = s;
      }
      requestAnimationFrame(pollInSwSelect);
    }
  })();

  var inIdx = 0;
  var outDone = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = in1Gain; // In 1
      } else if (inIdx === 1) {
        inputs[i] = in2Gain; // In 2
      } else if (inIdx === 2) {
        inputs[i] = inSwSelProxy.gain; // Select - proxy+analyser for crossfade
      } else {
        inputs[i] = inSwSelProxy.gain; // fallback to select
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outDone ? null : outSum;
      outDone = true;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'in_switch',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _inSwDisposed = true;
      in1Gain.disconnect();
      in2Gain.disconnect();
      outSum.disconnect();
      inSwSelProxy.disconnect();
      inSwSelSrc.stop();
      inSwSelSrc.disconnect();
      inSwSelAnalyser.disconnect();
    }
  };
};

// ============================================================================
// 27. Out Switch (Type 32)
//     blocks: Input [cv_in], Out 1 [cv_out], Out 2 [cv_out], Select [cv_in]
//     Route input to one of two outputs. Approximation: split to both.
// ============================================================================
ZOIA.sim._createOutSwitch = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  var out1 = ctx.createGain();
  out1.gain.value = 1.0; // default: Out 1 selected
  var out2 = ctx.createGain();
  out2.gain.value = 0.0;

  inGain.connect(out1);
  inGain.connect(out2);

  // Select input: proxy + analyser to detect CV value and route output
  var outSwSelProxy = ctx.createGain();
  outSwSelProxy.gain.value = 0;
  var outSwSelSrc = ctx.createConstantSource();
  outSwSelSrc.offset.value = 1;
  outSwSelSrc.connect(outSwSelProxy);
  outSwSelSrc.start();
  var outSwSelAnalyser = ctx.createAnalyser();
  outSwSelAnalyser.fftSize = 256;
  outSwSelProxy.connect(outSwSelAnalyser);

  // Poll select value and adjust output gains
  var _outSwSelBuf = new Float32Array(1);
  var _outSwLastSel = -1;
  var _outSwDisposed = false;

  (function pollOutSwSelect() {
    if (!_outSwDisposed) {
      outSwSelAnalyser.getFloatTimeDomainData(_outSwSelBuf);
      var s = _outSwSelBuf[0];
      if (Math.abs(s - _outSwLastSel) > 0.05) {
        var t = ZOIA.sim.ctx.currentTime;
        if (s >= 0.5) {
          out1.gain.setTargetAtTime(0.0, t, 0.01);
          out2.gain.setTargetAtTime(1.0, t, 0.01);
        } else {
          out1.gain.setTargetAtTime(1.0, t, 0.01);
          out2.gain.setTargetAtTime(0.0, t, 0.01);
        }
        _outSwLastSel = s;
      }
      requestAnimationFrame(pollOutSwSelect);
    }
  })();

  var inIdx = 0;
  var outIdx = 0;
  var outNodes = [out1, out2];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in' || b.t === 'gate_in') {
      if (inIdx === 0) {
        inputs[i] = inGain; // Input
      } else {
        inputs[i] = outSwSelProxy.gain; // Select - proxy+analyser for routing
      }
      outputs[i] = null;
      inIdx++;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      inputs[i] = null;
      outputs[i] = outIdx < outNodes.length ? outNodes[outIdx++] : null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'out_switch',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      _outSwDisposed = true;
      inGain.disconnect();
      out1.disconnect();
      out2.disconnect();
      outSwSelProxy.disconnect();
      outSwSelSrc.stop();
      outSwSelSrc.disconnect();
      outSwSelAnalyser.disconnect();
    }
  };
};

// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[4]   = ZOIA.sim._createSequencer;
ZOIA.sim._moduleFactories[10]  = ZOIA.sim._createSampleAndHold;
ZOIA.sim._moduleFactories[17]  = ZOIA.sim._createCVInvert;
ZOIA.sim._moduleFactories[18]  = ZOIA.sim._createSteps;
ZOIA.sim._moduleFactories[19]  = ZOIA.sim._createSlewLimiter;
ZOIA.sim._moduleFactories[22]  = ZOIA.sim._createMultiplier;
ZOIA.sim._moduleFactories[31]  = ZOIA.sim._createInSwitch;
ZOIA.sim._moduleFactories[32]  = ZOIA.sim._createOutSwitch;
ZOIA.sim._moduleFactories[35]  = ZOIA.sim._createGate;
ZOIA.sim._moduleFactories[37]  = ZOIA.sim._createRhythm;
ZOIA.sim._moduleFactories[39]  = ZOIA.sim._createRandom;
ZOIA.sim._moduleFactories[46]  = ZOIA.sim._createCVDelay;
ZOIA.sim._moduleFactories[47]  = ZOIA.sim._createCVLoop;
ZOIA.sim._moduleFactories[48]  = ZOIA.sim._createCVFilter;
ZOIA.sim._moduleFactories[49]  = ZOIA.sim._createClockDivider;
ZOIA.sim._moduleFactories[50]  = ZOIA.sim._createComparator;
ZOIA.sim._moduleFactories[51]  = ZOIA.sim._createCVRectify;
ZOIA.sim._moduleFactories[52]  = ZOIA.sim._createTrigger;
ZOIA.sim._moduleFactories[63]  = ZOIA.sim._createCVAbs;
ZOIA.sim._moduleFactories[70]  = ZOIA.sim._createQuantizer;
ZOIA.sim._moduleFactories[74]  = ZOIA.sim._createCVMinMax;
ZOIA.sim._moduleFactories[75]  = ZOIA.sim._createGateInverter;
ZOIA.sim._moduleFactories[77]  = ZOIA.sim._createCVFlipFlop;
ZOIA.sim._moduleFactories[100] = ZOIA.sim._createTapTempo;
ZOIA.sim._moduleFactories[103] = ZOIA.sim._createByteSplitter;
ZOIA.sim._moduleFactories[104] = ZOIA.sim._createCVMixer;
ZOIA.sim._moduleFactories[105] = ZOIA.sim._createLogicGate;

ZOIA.log('sim-mod-cv.js loaded: 27 CV/utility modules registered');


// === sim-mod-interface.js ===
/**
 * sim-mod-interface.js
 *
 * ZOIA simulation module factories for Interface, Analysis, and MIDI modules.
 * ES5 only -- no const/let, no arrow functions, no template literals, no classes.
 */

window.ZOIA = window.ZOIA || {};
ZOIA.sim = ZOIA.sim || {};

/* ===================================================================
 *  Helper: Fire gate callbacks for all connections from a source module
 *  that target an ADSR gate input. Scans patch connections at call time
 *  and directly invokes ADSR._onGateChange(value).
 * =================================================================== */
ZOIA.sim._fireGateCallbacks = function(modIdx, value) {
  var conns = ZOIA.state && ZOIA.state.patch ? ZOIA.state.patch.connections : null;
  var nodes = ZOIA.sim.nodes;
  if (!conns || !nodes) return;
  for (var ci = 0; ci < conns.length; ci++) {
    var c = conns[ci];
    if (c.srcMod === modIdx) {
      var dn = nodes[c.dstMod];
      if (dn && dn._onGateChange && dn._gateBlockIdx !== null && c.dstBlock === dn._gateBlockIdx) {
        dn._onGateChange(value);
      }
    }
  }
};

/* ===================================================================
 *  Helper: absolute-value WaveShaperNode (full-wave rectifier)
 * =================================================================== */
function _makeAbsCurve() {
  var n = 1024;
  var curve = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    var x = (i / (n - 1)) * 2 - 1; // -1 .. +1
    curve[i] = Math.abs(x);
  }
  return curve;
}

/* ===================================================================
 *  1. Pushbutton  (Type 15)
 *     blocks: Output [gate_out]
 * =================================================================== */
ZOIA.sim._createPushbutton = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'pushbutton',
    inputs: inputs,
    outputs: outputs,
    press: function () {
      src.offset.value = 1;
    },
    release: function () {
      src.offset.value = 0;
    },
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  2. Keyboard  (Type 16)
 *     blocks: CV Out [cv_out], Gate Out [gate_out]
 * =================================================================== */
ZOIA.sim._createKeyboard = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var cvSrc = ctx.createConstantSource();
  cvSrc.offset.value = 0;
  cvSrc.start();

  var gateSrc = ctx.createConstantSource();
  gateSrc.offset.value = 0;
  gateSrc.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      var name = (b.n || '').toLowerCase();
      if (name.indexOf('gate') >= 0) {
        outputs[i] = gateSrc;
      } else {
        outputs[i] = cvSrc;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'keyboard',
    inputs: inputs,
    outputs: outputs,
    noteOn: function (midiNote) {
      var freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      var cv = Math.log(freq / 20) / Math.log(1000);
      ZOIA.log('[DIAG] Keyboard noteOn: midi=' + midiNote + ' freq=' + freq.toFixed(1) + 'Hz cv=' + cv.toFixed(4) + ' modIdx=' + this._modIdx);
      cvSrc.offset.value = cv;
      gateSrc.offset.value = 1;
      // Scan connections at call time to find and trigger connected ADSRs
      ZOIA.sim._fireGateCallbacks(this._modIdx, 1);
    },
    noteOff: function () {
      ZOIA.log('[DIAG] Keyboard noteOff: gate -> 0 modIdx=' + this._modIdx);
      gateSrc.offset.value = 0;
      ZOIA.sim._fireGateCallbacks(this._modIdx, 0);
    },
    dispose: function () {
      cvSrc.disconnect();
      gateSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  3. Stompswitch  (Type 44)
 *     blocks: Output [gate_out]
 * =================================================================== */
ZOIA.sim._createStompswitch = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  var state = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'stompswitch',
    inputs: inputs,
    outputs: outputs,
    _state: 0,
    toggle: function () {
      state = state ? 0 : 1;
      this._state = state;
      src.offset.value = state;
      ZOIA.sim._fireGateCallbacks(this._modIdx, state);
      ZOIA.gridButtons.render();
    },
    press: function () {
      state = 1;
      this._state = 1;
      src.offset.value = 1;
      ZOIA.sim._fireGateCallbacks(this._modIdx, 1);
      ZOIA.gridButtons.render();
    },
    release: function () {
      state = 0;
      this._state = 0;
      src.offset.value = 0;
      ZOIA.sim._fireGateCallbacks(this._modIdx, 0);
      ZOIA.gridButtons.render();
    },
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  4. Cport Exp/CV  (Type 54)
 *     blocks: Output [cv_out]
 * =================================================================== */
ZOIA.sim._createCportExpCv = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'cport_exp_cv',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  5. UI Button  (Type 56)
 *     blocks: Output [gate_out].  Variant 1 adds LED [cv_in].
 * =================================================================== */
ZOIA.sim._createUIButton = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  var ledSink = ctx.createGain();
  ledSink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'gate_in' || b.t === 'audio_in') {
      // LED input or any other input
      inputs[i] = ledSink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'ui_button',
    inputs: inputs,
    outputs: outputs,
    press: function () {
      src.offset.value = 1;
    },
    release: function () {
      src.offset.value = 0;
    },
    dispose: function () {
      src.disconnect();
      ledSink.disconnect();
    }
  };
};

/* ===================================================================
 *  6. Pixel  (Type 58)
 *     blocks: CV In [cv_in]
 * =================================================================== */
ZOIA.sim._createPixel = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sink = ctx.createGain();
  sink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = sink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'pixel',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sink.disconnect();
    }
  };
};

/* ===================================================================
 *  7. Env Follower  (Type 40)
 *     blocks: Audio In [audio_in], Sensitivity [cv_in], CV Out [cv_out]
 * =================================================================== */
ZOIA.sim._createEnvFollower = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];
  var params = mod.params || [];

  // Sensitivity param (first param), normalised 0-1
  var sensNorm = params.length > 0 ? params[0] / 65535 : 0.5;

  // Audio input gain
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Absolute value (full-wave rectifier)
  var rectifier = ctx.createWaveShaper();
  rectifier.curve = _makeAbsCurve();
  rectifier.oversample = 'none';

  // Lowpass filter — frequency maps from sensitivity (10-50 Hz range)
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 10 + sensNorm * 40;
  lpf.Q.value = 0.5;

  // Output gain — scale envelope to a large CV range so it can meaningfully
  // modulate AudioParams like filter frequency (0-1 envelope * 4000 = 0-4000 Hz)
  var outGain = ctx.createGain();
  outGain.gain.value = 4000;

  // Chain: inGain -> rectifier -> lpf -> outGain
  inGain.connect(rectifier);
  rectifier.connect(lpf);
  lpf.connect(outGain);

  // Sensitivity modulation: cv_in controls the filter frequency
  var sensGain = ctx.createGain();
  sensGain.gain.value = 40; // scale 0-1 CV into 0-40 Hz range addition
  sensGain.connect(lpf.frequency);

  var audioAssigned = false;
  var sensAssigned = false;
  var cvOutAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (!audioAssigned) {
        inputs[i] = inGain;
        audioAssigned = true;
      } else {
        inputs[i] = inGain;
      }
    } else if (b.t === 'cv_in' || b.t === 'gate_in') {
      if (!sensAssigned) {
        inputs[i] = sensGain;
        sensAssigned = true;
      } else {
        inputs[i] = sensGain;
      }
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      if (!cvOutAssigned) {
        outputs[i] = outGain;
        cvOutAssigned = true;
      } else {
        outputs[i] = outGain;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'env_follower',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      rectifier.disconnect();
      lpf.disconnect();
      outGain.disconnect();
      sensGain.disconnect();
    }
  };
};

/* ===================================================================
 *  8. Pitch Detect  (Type 41)
 *     blocks: Audio In [audio_in], CV Out [cv_out], Gate [gate_out]
 *     Approximation: bandpass -> envelope for gate, constant CV output.
 * =================================================================== */
ZOIA.sim._createPitchDetect = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  // Audio input
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Bandpass filter (centered around a mid frequency)
  var bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 440;
  bpf.Q.value = 1;

  // Envelope follower for gate detection
  var rectifier = ctx.createWaveShaper();
  rectifier.curve = _makeAbsCurve();
  rectifier.oversample = 'none';

  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 20;
  lpf.Q.value = 0.5;

  var gateGain = ctx.createGain();
  gateGain.gain.value = 1;

  // Chain for gate: inGain -> bpf -> rectifier -> lpf -> gateGain
  inGain.connect(bpf);
  bpf.connect(rectifier);
  rectifier.connect(lpf);
  lpf.connect(gateGain);

  // CV output: constant source (pitch detection is extremely hard in Web Audio)
  var cvSrc = ctx.createConstantSource();
  cvSrc.offset.value = 0;
  cvSrc.start();

  var audioAssigned = false;
  var cvAssigned = false;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (!audioAssigned) {
        inputs[i] = inGain;
        audioAssigned = true;
      } else {
        inputs[i] = inGain;
      }
    } else if (b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out') {
      if (!cvAssigned) {
        outputs[i] = cvSrc;
        cvAssigned = true;
      } else {
        outputs[i] = cvSrc;
      }
    } else if (b.t === 'gate_out') {
      if (!gateAssigned) {
        outputs[i] = gateGain;
        gateAssigned = true;
      } else {
        outputs[i] = gateGain;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'pitch_detect',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      bpf.disconnect();
      rectifier.disconnect();
      lpf.disconnect();
      gateGain.disconnect();
      cvSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  9. Onset Detect  (Type 60)
 *     blocks: Audio In [audio_in], Sensitivity [cv_in], Gate Out [gate_out]
 *     Approximation: highpass -> rectifier -> lowpass -> output as gate.
 * =================================================================== */
ZOIA.sim._createOnsetDetect = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];
  var params = mod.params || [];

  var sensNorm = params.length > 0 ? params[0] / 65535 : 0.5;

  // Audio input
  var inGain = ctx.createGain();
  inGain.gain.value = 1;

  // Highpass filter — detects transient changes
  var hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 200;
  hpf.Q.value = 0.7;

  // Rectifier
  var rectifier = ctx.createWaveShaper();
  rectifier.curve = _makeAbsCurve();
  rectifier.oversample = 'none';

  // Lowpass (smooth envelope)
  var lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 15 + sensNorm * 35;
  lpf.Q.value = 0.5;

  // Output gain (gate signal)
  var outGain = ctx.createGain();
  outGain.gain.value = 2; // boost to push towards gate-like levels

  // Chain: inGain -> hpf -> rectifier -> lpf -> outGain
  inGain.connect(hpf);
  hpf.connect(rectifier);
  rectifier.connect(lpf);
  lpf.connect(outGain);

  // Sensitivity modulation
  var sensGain = ctx.createGain();
  sensGain.gain.value = 35;
  sensGain.connect(lpf.frequency);

  var audioAssigned = false;
  var sensAssigned = false;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in') {
      if (!audioAssigned) {
        inputs[i] = inGain;
        audioAssigned = true;
      } else {
        inputs[i] = inGain;
      }
    } else if (b.t === 'cv_in' || b.t === 'gate_in') {
      if (!sensAssigned) {
        inputs[i] = sensGain;
        sensAssigned = true;
      } else {
        inputs[i] = sensGain;
      }
    } else if (b.t === 'cv_out' || b.t === 'audio_out' || b.t === 'gate_out') {
      if (!gateAssigned) {
        outputs[i] = outGain;
        gateAssigned = true;
      } else {
        outputs[i] = outGain;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'onset_detect',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      inGain.disconnect();
      hpf.disconnect();
      rectifier.disconnect();
      lpf.disconnect();
      outGain.disconnect();
      sensGain.disconnect();
    }
  };
};

/* ===================================================================
 *  10. MIDI Note In  (Type 20)
 *      blocks: Note [cv_out], Gate [gate_out], Velocity [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiNoteIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var noteSrc = ctx.createConstantSource();
  noteSrc.offset.value = 0;
  noteSrc.start();

  var gateSrc = ctx.createConstantSource();
  gateSrc.offset.value = 0;
  gateSrc.start();

  var velSrc = ctx.createConstantSource();
  velSrc.offset.value = 0;
  velSrc.start();

  // Assign outputs in block order: first cv_out -> note, first gate_out -> gate,
  // second cv_out -> velocity
  var cvOutCount = 0;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'cv_out' || b.t === 'audio_out') {
      if (cvOutCount === 0) {
        outputs[i] = noteSrc;
      } else {
        outputs[i] = velSrc;
      }
      cvOutCount++;
    } else if (b.t === 'gate_out') {
      if (!gateAssigned) {
        outputs[i] = gateSrc;
        gateAssigned = true;
      } else {
        outputs[i] = gateSrc;
      }
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_note_in',
    inputs: inputs,
    outputs: outputs,
    noteOn: function (note, velocity) {
      noteSrc.offset.value = note / 127;
      velSrc.offset.value = (velocity !== undefined ? velocity : 127) / 127;
      gateSrc.offset.value = 1;
    },
    noteOff: function () {
      gateSrc.offset.value = 0;
    },
    dispose: function () {
      noteSrc.disconnect();
      gateSrc.disconnect();
      velSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  11. MIDI CC In  (Type 21)
 *      blocks: CC Value [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiCcIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var ccSrc = ctx.createConstantSource();
  ccSrc.offset.value = 0;
  ccSrc.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = ccSrc;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_cc_in',
    inputs: inputs,
    outputs: outputs,
    setValue: function (v) {
      ccSrc.offset.value = v;
    },
    dispose: function () {
      ccSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  12. MIDI Note Out  (Type 43)
 *      blocks: Note [cv_in], Gate [gate_in], Velocity [cv_in]
 * =================================================================== */
ZOIA.sim._createMidiNoteOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var noteSink = ctx.createGain();
  noteSink.gain.value = 1;

  var gateSink = ctx.createGain();
  gateSink.gain.value = 1;

  var velSink = ctx.createGain();
  velSink.gain.value = 1;

  var cvInCount = 0;
  var gateAssigned = false;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'cv_in' || b.t === 'audio_in') {
      if (cvInCount === 0) {
        inputs[i] = noteSink;
      } else {
        inputs[i] = velSink;
      }
      cvInCount++;
    } else if (b.t === 'gate_in') {
      if (!gateAssigned) {
        inputs[i] = gateSink;
        gateAssigned = true;
      } else {
        inputs[i] = gateSink;
      }
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_note_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      noteSink.disconnect();
      gateSink.disconnect();
      velSink.disconnect();
    }
  };
};

/* ===================================================================
 *  13. MIDI Pressure  (Type 55)
 *      blocks: Output [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiPressure = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var src = ctx.createConstantSource();
  src.offset.value = 0;
  src.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = src;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_pressure',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      src.disconnect();
    }
  };
};

/* ===================================================================
 *  14. MIDI CC Out  (Type 59)
 *      blocks: CC Value [cv_in]
 * =================================================================== */
ZOIA.sim._createMidiCcOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sink = ctx.createGain();
  sink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = sink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_cc_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sink.disconnect();
    }
  };
};

/* ===================================================================
 *  15. MIDI PC In  (Type 101)
 *      blocks: PC Value [cv_out]
 * =================================================================== */
ZOIA.sim._createMidiPcIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var pcSrc = ctx.createConstantSource();
  pcSrc.offset.value = 0;
  pcSrc.start();

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = pcSrc;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_pc_in',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      pcSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  16. MIDI PC Out  (Type 102)
 *      blocks: PC Value [cv_in]
 * =================================================================== */
ZOIA.sim._createMidiPcOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var sink = ctx.createGain();
  sink.gain.value = 1;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = sink;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_pc_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      sink.disconnect();
    }
  };
};

/* ===================================================================
 *  17. MIDI Clock In  (Type 106)
 *      blocks: Clock [gate_out], Start [gate_out], Stop [gate_out]
 * =================================================================== */
ZOIA.sim._createMidiClockIn = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var clockSrc = ctx.createConstantSource();
  clockSrc.offset.value = 0;
  clockSrc.start();

  var startSrc = ctx.createConstantSource();
  startSrc.offset.value = 0;
  startSrc.start();

  var stopSrc = ctx.createConstantSource();
  stopSrc.offset.value = 0;
  stopSrc.start();

  var gateOutCount = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      inputs[i] = null;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      if (gateOutCount === 0) {
        outputs[i] = clockSrc;
      } else if (gateOutCount === 1) {
        outputs[i] = startSrc;
      } else {
        outputs[i] = stopSrc;
      }
      gateOutCount++;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_clock_in',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      clockSrc.disconnect();
      startSrc.disconnect();
      stopSrc.disconnect();
    }
  };
};

/* ===================================================================
 *  18. MIDI Clock Out  (Type 107)
 *      blocks: Clock [gate_in], Start [gate_in], Stop [gate_in]
 * =================================================================== */
ZOIA.sim._createMidiClockOut = function (ctx, mod) {
  var blocks = mod.blocks || [];
  var inputs = [];
  var outputs = [];

  var clockSink = ctx.createGain();
  clockSink.gain.value = 1;

  var startSink = ctx.createGain();
  startSink.gain.value = 1;

  var stopSink = ctx.createGain();
  stopSink.gain.value = 1;

  var gateInCount = 0;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (b.t === 'audio_in' || b.t === 'cv_in' || b.t === 'gate_in') {
      if (gateInCount === 0) {
        inputs[i] = clockSink;
      } else if (gateInCount === 1) {
        inputs[i] = startSink;
      } else {
        inputs[i] = stopSink;
      }
      gateInCount++;
    } else if (b.t === 'audio_out' || b.t === 'cv_out' || b.t === 'gate_out') {
      outputs[i] = null;
    } else {
      inputs[i] = null;
      outputs[i] = null;
    }
  }

  return {
    type: 'midi_clock_out',
    inputs: inputs,
    outputs: outputs,
    dispose: function () {
      clockSink.disconnect();
      startSink.disconnect();
      stopSink.disconnect();
    }
  };
};

// ================================================================
//  Register factories in the global dispatcher
// ================================================================
ZOIA.sim._moduleFactories[15]  = ZOIA.sim._createPushbutton;
ZOIA.sim._moduleFactories[16]  = ZOIA.sim._createKeyboard;
ZOIA.sim._moduleFactories[20]  = ZOIA.sim._createMidiNoteIn;
ZOIA.sim._moduleFactories[21]  = ZOIA.sim._createMidiCcIn;
ZOIA.sim._moduleFactories[40]  = ZOIA.sim._createEnvFollower;
ZOIA.sim._moduleFactories[41]  = ZOIA.sim._createPitchDetect;
ZOIA.sim._moduleFactories[43]  = ZOIA.sim._createMidiNoteOut;
ZOIA.sim._moduleFactories[44]  = ZOIA.sim._createStompswitch;
ZOIA.sim._moduleFactories[54]  = ZOIA.sim._createCportExpCv;
ZOIA.sim._moduleFactories[55]  = ZOIA.sim._createMidiPressure;
ZOIA.sim._moduleFactories[56]  = ZOIA.sim._createUIButton;
ZOIA.sim._moduleFactories[58]  = ZOIA.sim._createPixel;
ZOIA.sim._moduleFactories[59]  = ZOIA.sim._createMidiCcOut;
ZOIA.sim._moduleFactories[60]  = ZOIA.sim._createOnsetDetect;
ZOIA.sim._moduleFactories[101] = ZOIA.sim._createMidiPcIn;
ZOIA.sim._moduleFactories[102] = ZOIA.sim._createMidiPcOut;
ZOIA.sim._moduleFactories[106] = ZOIA.sim._createMidiClockIn;
ZOIA.sim._moduleFactories[107] = ZOIA.sim._createMidiClockOut;

ZOIA.log('sim-mod-interface.js loaded: 18 interface/MIDI modules registered');


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


// === oled-display.js ===
/**
 * oled-display.js -- OLED Screen Simulation
 *
 * Renders the 128x64-style OLED display for the ZOIA pedal emulator.
 * The display has three distinct modes:
 *
 *   1. PATCH OVERVIEW  -- Shown when no module is selected. Displays the
 *      patch name, current page name, and a simulated CPU usage bar.
 *
 *   2. BLOCK DETAIL    -- Shown when a module/block is selected. Displays
 *      the module name, block name, parameter slider, current value, and
 *      a summary of connections to/from this block.
 *
 *   3. CONNECTION VIEW  -- Entered via encoder click when a block has
 *      connections. Shows a full-screen connection inspector with source,
 *      destination, signal type, strength bar, and navigation controls.
 *
 * Namespace: window.ZOIA.oled
 */
window.ZOIA = window.ZOIA || {};

ZOIA.oled = {

  // ===== SIGNAL TYPE METADATA =====

  /** Human-readable labels for each signal type (used in connection view) */
  _signalLabels: {
    audio: 'AUDIO',
    cv: 'CV',
    gate: 'GATE',
    param: 'PARAM'
  },

  /** Color codes per signal type (used for badges and strength bars) */
  _signalColors: {
    audio: '#00C853',
    cv: '#2979FF',
    gate: '#FF1744',
    param: '#FF9100'
  },

  // ===== HELPERS =====

  /**
   * Truncate a string to maxLen characters, appending an ellipsis if needed.
   * @param {string} str    - The string to truncate.
   * @param {number} maxLen - Maximum allowed length including the ellipsis.
   * @returns {string}
   */
  _trunc: function(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + '\u2026';
  },

  // ===== MODE 3: CONNECTION VIEW =====

  /**
   * Render the connection detail / inspector view.
   *
   * Layout (5 lines):
   *   Line 1 -- "CONNECTION" header + "N/M" navigation counter
   *   Line 2 -- Source module name  ->  Destination module name
   *   Line 3 -- Block names + direction arrow + signal type badge
   *   Line 4 -- Strength bar (14 chars) + formatted strength value
   *   Line 5 -- Hint text (knob scroll, shift+knob, click to toggle mode)
   *
   * @param {HTMLElement} oled - The OLED container element.
   */
  _renderConnectionView: function(oled) {
    var s = ZOIA.state;
    var p = s.patch;

    // Guard: exit if patch is missing or connection list is empty
    if (!p || s.connectionList.length === 0) {
      ZOIA.exitConnectionView();
      return;
    }

    var conn = s.connectionList[s.connectionIndex];
    if (!conn) { ZOIA.exitConnectionView(); return; }

    var modIdx = s.selectedModule;
    var blkIdx = s.selectedBlock;

    // Determine whether the selected block is the source or destination
    var isSource = (conn.srcMod === modIdx && conn.srcBlock === blkIdx);

    // ----- Resolve module and block names -----
    var srcMod = p.modules[conn.srcMod];
    var dstMod = p.modules[conn.dstMod];
    var srcName = srcMod ? this._trunc(srcMod.name || srcMod.typeName, 12) : '?';
    var dstName = dstMod ? this._trunc(dstMod.name || dstMod.typeName, 12) : '?';

    var srcBlkName = (srcMod && srcMod.blocks && srcMod.blocks[conn.srcBlock])
      ? srcMod.blocks[conn.srcBlock].n : 'Blk' + conn.srcBlock;
    var dstBlkName = (dstMod && dstMod.blocks && dstMod.blocks[conn.dstBlock])
      ? dstMod.blocks[conn.dstBlock].n : 'Blk' + conn.dstBlock;

    // ----- Signal type label and color -----
    var connType = ZOIA.getConnType(conn);
    var typeLabel = this._signalLabels[connType] || 'PARAM';
    var typeColor = this._signalColors[connType] || '#FF9100';

    // ----- Strength value and bar -----
    var strengthStr = ZOIA.formatConnStrength(conn, s.connectionStrengthMode);
    var raw = (conn.strength !== undefined) ? conn.strength : 10000;
    var pct = raw / 10000;

    // 14-char bar: filled blocks + empty blocks
    var barLen = 14;
    var filledLen = Math.round(pct * barLen);
    var strengthBar = '\u2588'.repeat(filledLen) + '\u2591'.repeat(barLen - filledLen);

    // ----- Navigation and direction -----
    var navStr = (s.connectionIndex + 1) + '/' + s.connectionList.length;
    var arrow = isSource ? '\u2192' : '\u2190';

    // ----- Build OLED HTML -----
    var html = '';

    // Line 1: header with navigation counter
    html += '<div style="display:flex;justify-content:space-between">';
    html += '<span style="color:#00cccc;font-weight:bold">CONNECTION</span>';
    html += '<span class="dim">' + navStr + '</span>';
    html += '</div>';

    // Line 2: source -> destination module names
    html += '<div style="display:flex;align-items:center;gap:2px">';
    html += '<span>' + srcName + '</span>';
    html += '<span style="color:#00cccc;margin:0 2px">\u2192</span>';
    html += '<span>' + dstName + '</span>';
    html += '</div>';

    // Line 3: block names, direction arrow, signal type badge
    html += '<div class="dim">';
    html += srcBlkName + ' ' + arrow + ' ' + dstBlkName;
    html += ' <span style="color:' + typeColor + '">[' + typeLabel + ']</span>';
    html += '</div>';

    // Line 4: colored strength bar + numeric strength
    html += '<div style="display:flex;align-items:center;gap:4px">';
    html += '<span style="letter-spacing:1px;color:' + typeColor + '">' + strengthBar + '</span>';
    html += '<span style="font-weight:bold">' + strengthStr + '</span>';
    html += '</div>';

    // Line 5: keyboard / interaction hints
    html += '<div class="dim" style="font-size:9px">';
    html += 'Knob:scroll  Shift+Knob:strength  Click:' + s.connectionStrengthMode;
    html += '</div>';

    oled.innerHTML = html;
  },

  // ===== MAIN RENDER ENTRY POINT =====

  /**
   * Render the OLED display. Delegates to the appropriate mode based on
   * the current application state (connection view, patch overview, or
   * block detail).
   */
  render: function() {
    var oled = document.getElementById('oled');
    if (!oled) return;

    var s = ZOIA.state;
    var p = s.patch;

    // ----- No patch loaded -----
    if (!p) {
      oled.innerHTML = '<div class="dim">No patch loaded</div>' +
        '<div class="dim">Load a .bin or Demo</div>';
      return;
    }

    // ----- Looper status overlay -----
    var looperStatus = '';
    if (ZOIA.state.mode === 'play' && ZOIA.sim) {
      var simNodes = ZOIA.sim.nodes;
      for (var li = 0; li < simNodes.length; li++) {
        if (simNodes[li] && simNodes[li].type === 'looper') {
          var ln = simNodes[li];
          if (ln._recording) {
            var elapsed = ZOIA.sim.ctx.currentTime - ln._recordStartTime;
            var secs = elapsed.toFixed(1);
            looperStatus = '<div style="background:#ff1744;color:#fff;padding:1px 6px;font-size:10px;text-align:center;margin-bottom:2px;border-radius:2px">' +
              '\u25CF REC ' + secs + 's</div>';
          } else if (ln._playing) {
            var playText = '\u25B6 PLAYING';
            if (ln._recordDuration > 0 && ln._playStartTime > 0) {
              var playElapsed = ZOIA.sim.ctx.currentTime - ln._playStartTime;
              var playPos = playElapsed % ln._recordDuration;
              playText = '\u25B6 ' + playPos.toFixed(1) + 's / ' + ln._recordDuration.toFixed(1) + 's';
            }
            looperStatus = '<div style="background:#00c853;color:#000;padding:1px 6px;font-size:10px;text-align:center;margin-bottom:2px;border-radius:2px">' +
              playText + '</div>';
          }
          break;
        }
      }
    }

    // ----- MODE 3: Connection view -----
    if (s.connectionView) {
      this._renderConnectionView(oled);
      if (looperStatus) {
        oled.innerHTML = looperStatus + oled.innerHTML;
      }
      return;
    }

    // ----- MODE 1: Patch overview (no module selected) -----
    if (s.selectedModule === null) {
      // Count audio/effect modules for simulated CPU estimate
      var audioMods = p.modules.filter(function(m) {
        var d = ZOIA.MODULE_DB[m.typeIdx];
        return d && (d.cat === "Audio" || d.cat === "Effect");
      }).length;

      var cpu = Math.min(100, Math.round(p.moduleCount * 1.5 + audioMods * 3));
      var barLen = 18;
      var filled = Math.round(cpu / 100 * barLen);
      var bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);

      var descHTML = '';
      if (p.description) {
        var shortDesc = p.description.length > 80 ? p.description.substring(0, 77) + '...' : p.description;
        descHTML = '<div class="oled-desc" title="' + p.description.replace(/"/g, '&quot;') + '">' + shortDesc + '</div>';
      }

      oled.innerHTML = looperStatus +
        '<div>001 ' + p.name + '</div>' +
        '<div>' + (p.pages[s.currentPage] || 'Page ' + s.currentPage) + '</div>' +
        descHTML +
        '<div>CPU: ' + cpu + '%</div>' +
        '<div style="letter-spacing:1px">' + bar + '</div>';
      return;
    }

    // ----- MODE 2: Block detail (module + block selected) -----
    var m = p.modules[s.selectedModule];
    if (!m) { oled.innerHTML = ''; return; }

    var blkIdx = s.selectedBlock || 0;
    var blk = m.blocks && m.blocks[blkIdx] ? m.blocks[blkIdx] : null;
    var blkName = blk ? blk.n : 'Block ' + blkIdx;

    // Parameter value formatted in correct units
    var paramVal = ZOIA.getParamValue(s.selectedModule, blkIdx);
    var paramStr = ZOIA.formatParam(blkName, paramVal);

    // 18-char slider bar with a bullet marker
    var sliderPos = Math.round(paramVal * 18);
    var sliderBar = '\u2500'.repeat(sliderPos) + '\u25CF' + '\u2500'.repeat(18 - sliderPos);

    // Gather connections to/from this specific block
    var blockConns = p.connections.filter(function(c) {
      return (c.srcMod === m.idx && c.srcBlock === blkIdx) ||
             (c.dstMod === m.idx && c.dstBlock === blkIdx);
    });

    // Build connection summary lines (show up to 2)
    var connLines = '';
    blockConns.slice(0, 2).forEach(function(c) {
      var isSource = c.srcMod === m.idx;
      var otherIdx = isSource ? c.dstMod : c.srcMod;
      var otherBlk = isSource ? c.dstBlock : c.srcBlock;
      var other = p.modules[otherIdx];
      var dir = isSource ? '\u2192' : '\u2190';
      var otherName = other ? (other.name || other.typeName) : '?';
      var otherBlkName = (other && other.blocks && other.blocks[otherBlk])
        ? other.blocks[otherBlk].n : '';
      connLines += '<div class="dim">' + dir + ' ' + otherName + ':' + otherBlkName + '</div>';
    });

    if (blockConns.length === 0) {
      connLines = '<div class="dim">No connections</div>';
    } else {
      // Clickable hint to enter full connection view
      connLines += '<div style="font-size:9px;color:#00cccc;cursor:pointer" onclick="ZOIA.enterConnectionView()">';
      connLines += '[' + blockConns.length + ' conn' + (blockConns.length > 1 ? 's' : '') + ' - click or encoder to view]';
      connLines += '</div>';
    }

    // Position label (row.col page)
    var blockPos = m.gridPos + blkIdx;
    var bRow = Math.floor(blockPos / ZOIA.GRID_COLS);
    var bCol = blockPos % ZOIA.GRID_COLS;
    var posStr = 'R' + bRow + ' C' + bCol + ' P' + m.page;

    oled.innerHTML = looperStatus +
      '<div style="cursor:pointer" ondblclick="ZOIA.renameModule(' + m.idx + ')">' +
        m.name + ' <span class="dim">(' + m.typeName + ')</span></div>' +
      '<div>' + blkName + ' <span class="dim">' + posStr + '</span></div>' +
      '<div style="letter-spacing:1px">' + sliderBar + ' ' + paramStr + '</div>' +
      connLines;
  }
};


// === knob.js ===
/**
 * knob.js -- Rotary Encoder Interaction
 *
 * Simulates the ZOIA's single rotary encoder (knob). Supports mouse wheel
 * and click-drag gestures. The knob operates in two distinct modes:
 *
 *   NORMAL PARAM MODE (connectionView === false)
 *     - Wheel / drag  : adjusts the selected block's parameter value (0..1).
 *     - Click          : enters connection view if the selected block has
 *                        any connections.
 *
 *   CONNECTION VIEW MODE (connectionView === true)
 *     - Wheel          : scrolls through the connection list (prev / next).
 *     - Shift + wheel  : adjusts connection strength (raw 0..10000).
 *     - Drag           : ignored (no-op) unless Shift is held, in which
 *                        case it adjusts connection strength.
 *     - Click          : toggles the strength display format (% <-> dB).
 *
 * Namespace: window.ZOIA.knob
 */
window.ZOIA = window.ZOIA || {};

ZOIA.knob = {

  // ===== CONFIGURATION =====

  /** Sensitivity factor for parameter adjustment (units per pixel of drag) */
  _sensitivity: 0.004,

  /** Sensitivity for connection strength (raw units per pixel, out of 10000) */
  _connStrengthSensitivity: 200,

  // ===== INITIALIZATION =====

  /**
   * Attach all event listeners to the knob element.
   * Called once during application startup.
   */
  init: function() {
    var knobEl = document.getElementById('knob');
    var indicator = document.getElementById('knob-indicator');
    var dragging = false;
    var startY = 0;
    var self = this;

    // ----- Mouse wheel: rotate knob and dispatch action -----
    knobEl.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -15 : 15;
      ZOIA.state.knobAngle += delta;
      indicator.style.transform = 'translateX(-50%) rotate(' + ZOIA.state.knobAngle + 'deg)';

      var s = ZOIA.state;
      if (s.connectionView) {
        if (s.shiftMode) {
          // Shift + scroll: navigate between connections
          self._scrollConnection(delta > 0 ? 1 : -1);
        } else {
          // Scroll: adjust connection strength directly
          self._adjustConnStrength(delta * self._connStrengthSensitivity / 15);
        }
      } else if (s.selectedConnection !== null) {
        // Grid-dot selected connection: adjust its strength
        self._adjustSelectedConnStrength(delta * self._connStrengthSensitivity / 15);
      } else {
        // Normal mode: adjust parameter value
        self._adjustParam(delta * self._sensitivity);
      }
    });

    // ----- Mouse down: begin drag -----
    knobEl.addEventListener('mousedown', function(e) {
      dragging = true;
      startY = e.clientY;
      e.preventDefault();
    });

    // ----- Click: enter connection view or toggle strength display -----
    knobEl.addEventListener('click', function() {
      var s = ZOIA.state;
      if (s.connectionView) {
        // Toggle between % and dB strength display
        s.connectionStrengthMode = (s.connectionStrengthMode === '%') ? 'dB' : '%';
        ZOIA.log('Connection strength mode: ' + s.connectionStrengthMode);
        ZOIA.oled.render();
      } else if (s.selectedModule !== null && s.selectedBlock !== null) {
        // Enter connection view if the block has connections
        ZOIA.enterConnectionView();
      }
    });

    // ----- Mouse move (document-level): drag to adjust -----
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var dy = startY - e.clientY;
      ZOIA.state.knobAngle += dy * 0.8;
      startY = e.clientY;
      indicator.style.transform = 'translateX(-50%) rotate(' + ZOIA.state.knobAngle + 'deg)';

      var s = ZOIA.state;
      if (s.connectionView) {
        // Drag in connection view: adjust strength
        self._adjustConnStrength(dy * self._connStrengthSensitivity / 5);
      } else if (s.selectedConnection !== null) {
        // Grid-dot selected connection: drag adjusts strength
        self._adjustSelectedConnStrength(dy * self._connStrengthSensitivity / 5);
      } else {
        // Normal mode: adjust parameter value
        self._adjustParam(dy * self._sensitivity);
      }
    });

    // ----- Mouse up (document-level): end drag -----
    document.addEventListener('mouseup', function() { dragging = false; });
  },

  // ===== PARAMETER ADJUSTMENT =====

  /**
   * Adjust the selected block's parameter by delta (clamped to 0..1).
   * Delegates to ZOIA.setParamValue which also updates the OLED.
   * @param {number} delta - Amount to add to the current value.
   */
  _adjustParam: function(delta) {
    var s = ZOIA.state;
    if (s.selectedModule === null || s.selectedBlock === null) return;
    var cur = ZOIA.getParamValue(s.selectedModule, s.selectedBlock);
    var next = Math.max(0, Math.min(1, cur + delta));
    ZOIA.setParamValue(s.selectedModule, s.selectedBlock, next);
  },

  // ===== CONNECTION NAVIGATION =====

  /**
   * Navigate to the next or previous connection in the connection list.
   * Wraps around at both ends.
   * @param {number} dir - Direction (+1 for next, -1 for previous).
   */
  _scrollConnection: function(dir) {
    var s = ZOIA.state;
    if (!s.connectionView || s.connectionList.length === 0) return;
    var len = s.connectionList.length;
    // Modular wrap-around (handles negative values correctly)
    s.connectionIndex = ((s.connectionIndex + dir) % len + len) % len;
    ZOIA.log('Connection ' + (s.connectionIndex + 1) + '/' + len);
    ZOIA.oled.render();
  },

  // ===== CONNECTION STRENGTH =====

  /**
   * Adjust the strength of the currently viewed connection.
   * Clamped to 0..10000 raw units.
   * @param {number} delta - Raw units to add to the current strength.
   */
  _adjustConnStrength: function(delta) {
    var s = ZOIA.state;
    if (!s.connectionView || s.connectionList.length === 0) return;
    var conn = s.connectionList[s.connectionIndex];
    if (!conn) return;
    var raw = (conn.strength !== undefined) ? conn.strength : 10000;
    var next = Math.max(0, Math.min(10000, Math.round(raw + delta)));
    ZOIA.setConnStrength(s.connectionIndex, next);
  },

  // ===== GRID-DOT SELECTED CONNECTION STRENGTH =====

  /**
   * Adjust the strength of the grid-dot-selected connection.
   * Clamped to 0..10000 raw units. Delegates to ZOIA.setSelectedConnStrength.
   * @param {number} delta - Raw units to add to the current strength.
   */
  _adjustSelectedConnStrength: function(delta) {
    var s = ZOIA.state;
    if (s.selectedConnection === null || !s.patch) return;
    var conn = s.patch.connections[s.selectedConnection];
    if (!conn) return;
    var raw = (conn.strength !== undefined) ? conn.strength : 10000;
    var next = Math.max(0, Math.min(10000, Math.round(raw + delta)));
    ZOIA.setSelectedConnStrength(next);
  },

  // ===== PARAM INPUT FIELD SYNC =====

  /**
   * Update the numeric param-input field to reflect the current value.
   * In connection view mode this shows the connection strength (0..1).
   * In normal mode it shows the selected parameter value.
   */
  updateParamInput: function() {
    var input = document.getElementById('param-input');
    if (!input) return;
    var s = ZOIA.state;
    var label = document.querySelector('#param-input-area .param-label');

    // Grid-dot selected connection: display strength as percentage
    if (s.selectedConnection !== null && s.patch) {
      var selConn = s.patch.connections[s.selectedConnection];
      if (selConn) {
        var selRaw = (selConn.strength !== undefined) ? selConn.strength : 10000;
        input.value = (selRaw / 100).toFixed(1) + '%';
        if (label) label.textContent = 'CONN STRENGTH';
        return;
      }
    }

    // Connection view: display connection strength as percentage
    if (s.connectionView && s.connectionList.length > 0) {
      var conn = s.connectionList[s.connectionIndex];
      var raw = (conn && conn.strength !== undefined) ? conn.strength : 10000;
      input.value = (raw / 100).toFixed(1) + '%';
      if (label) label.textContent = 'CONN STRENGTH';
      return;
    }

    // Restore label for normal mode
    if (label) label.textContent = 'ENCODER VALUE';

    // No selection: show placeholder
    if (s.selectedModule === null || s.selectedBlock === null) {
      input.value = '--';
      return;
    }

    // Normal mode: show formatted parameter value with proper units
    var val = ZOIA.getParamValue(s.selectedModule, s.selectedBlock);
    var blockName = null;
    if (s.patch && s.patch.modules[s.selectedModule]) {
      var mod = s.patch.modules[s.selectedModule];
      if (mod.blocks && mod.blocks[s.selectedBlock]) {
        blockName = mod.blocks[s.selectedBlock].n;
      }
    }
    input.value = ZOIA.formatParam(blockName, val);
  },

  /**
   * Handle manual entry in the param-input field.
   * Parses the string, clamps to 0..1, and applies the value.
   * In connection view the value maps to raw strength (0..1 -> 0..10000).
   * @param {string} str - The raw text from the input field.
   */
  onParamInput: function(str) {
    var s = ZOIA.state;
    var val = parseFloat(str);
    if (isNaN(val)) return;

    // Grid-dot selected connection: parse percentage input to 0..10000 raw strength
    if (s.selectedConnection !== null && s.patch) {
      val = Math.max(0, Math.min(100, val));
      ZOIA.setSelectedConnStrength(Math.round(val * 100));
      return;
    }

    // Connection view: parse percentage input to 0..10000 raw strength
    if (s.connectionView && s.connectionList.length > 0) {
      val = Math.max(0, Math.min(100, val));
      ZOIA.setConnStrength(s.connectionIndex, Math.round(val * 100));
      return;
    }

    // Normal mode: reverse-parse using block name for unit-aware input
    if (s.selectedModule === null || s.selectedBlock === null) return;
    var blockName = null;
    if (s.patch && s.patch.modules[s.selectedModule]) {
      var mod = s.patch.modules[s.selectedModule];
      if (mod.blocks && mod.blocks[s.selectedBlock]) {
        blockName = mod.blocks[s.selectedBlock].n;
      }
    }
    var parsed = ZOIA.parseParam(blockName, str);
    if (parsed === null) return;
    ZOIA.setParamValue(s.selectedModule, s.selectedBlock, parsed);
  }
};


// === grid-buttons.js ===
/**
 * grid-buttons.js -- 40-Button Grid, LED Effects, Drag-to-Connect, Context Menus
 *
 * Renders the 5-row x 8-column grid of buttons that represents a single
 * ZOIA page. Each button can be empty (available for module placement) or
 * occupied by one block of a module. Occupied buttons show the module
 * instance name, block function name, signal type dot, parameter value,
 * and connection indicators.
 *
 * Supports:
 *   - Single-grid mode (one page at a time)
 *   - Dual-grid mode (left + right pages side-by-side)
 *   - Drag-to-connect between blocks with a floating indicator
 *   - Right-click context menus on occupied and empty buttons
 *   - Connection toast notifications
 *
 * Namespace: window.ZOIA.gridButtons, window.ZOIA.gridContextMenu
 */
window.ZOIA = window.ZOIA || {};

// ===== ACTION LABELS (TOP ROW OVERLAY) =====

/**
 * Shift-mode action labels displayed on the top row of grid buttons.
 * Mirrors the ZOIA hardware's shift-button labels.
 */
ZOIA.ACTION_LABELS = [
  ["MOVE", "COPY", "EDIT", "DEL", "STAR", "VIEW", "SAVE", "RAND"],
];

// ===== CONTEXT MENU =====

/**
 * Right-click context menu for occupied grid buttons.
 * Offers rename, select, disconnect-all, and delete operations.
 */
ZOIA.gridContextMenu = {

  /** Cached menu DOM element (created on first use) */
  _menu: null,

  /**
   * Lazily create the context menu element and append it to the pedal.
   * @returns {HTMLElement} The menu element.
   */
  _ensureMenu: function() {
    if (this._menu) return this._menu;
    var menu = document.createElement('div');
    menu.id = 'grid-context-menu';
    document.getElementById('pedal').appendChild(menu);
    this._menu = menu;
    return menu;
  },

  /**
   * Display the context menu for a given module, positioned near the
   * triggering button element.
   * @param {number}      modIdx - Index of the module in patch.modules.
   * @param {HTMLElement}  btnEl  - The grid button element that was right-clicked.
   */
  show: function(modIdx, btnEl) {
    var s = ZOIA.state;
    if (!s.patch) return;
    var m = s.patch.modules[modIdx];
    if (!m) return;

    // Dismiss the module-add popup if it is open
    ZOIA.moduleAdd.hide();

    var menu = this._ensureMenu();

    // Count connections involving this module (for the "Disconnect All" label)
    var connCount = 0;
    s.patch.connections.forEach(function(c) {
      if (c.srcMod === modIdx || c.dstMod === modIdx) connCount++;
    });

    // ----- Build menu HTML -----
    var html = '';
    html += '<div class="ctx-header">' + (m.name || m.typeName) + '</div>';
    html += '<div class="ctx-item" data-action="rename"><span class="ctx-icon">Aa</span>Rename</div>';
    html += '<div class="ctx-item" data-action="select"><span class="ctx-icon">&#9654;</span>Select</div>';
    html += '<div class="ctx-item" data-action="copy"><span class="ctx-icon">&#9112;</span>Copy Module</div>';
    if (connCount > 0) {
      html += '<div class="ctx-sep"></div>';
      html += '<div class="ctx-item" data-action="disconnect"><span class="ctx-icon">&#10005;</span>Disconnect All (' + connCount + ')</div>';
    }
    html += '<div class="ctx-sep"></div>';
    html += '<div class="ctx-item danger" data-action="delete"><span class="ctx-icon">&#9746;</span>Delete Module</div>';
    menu.innerHTML = html;

    // ----- Position the menu near the button -----
    var rect = btnEl.getBoundingClientRect();
    var pedalRect = document.getElementById('pedal').getBoundingClientRect();
    var left = rect.left - pedalRect.left + rect.width + 2;
    var top = rect.top - pedalRect.top;

    // Clamp to keep menu within the pedal bounds
    if (left + 170 > pedalRect.width) left = rect.left - pedalRect.left - 170;
    if (top + 140 > pedalRect.height) top = pedalRect.height - 150;
    if (top < 0) top = 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    menu.classList.add('visible');

    // ----- Bind click handlers for each menu item -----
    var items = menu.querySelectorAll('.ctx-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        item.onclick = function(e) {
          e.stopPropagation();
          var action = item.getAttribute('data-action');
          ZOIA.gridContextMenu.hide();
          if (action === 'rename') {
            ZOIA.renameModule(modIdx);
          } else if (action === 'select') {
            ZOIA.hardwareView.selectModule(modIdx, 0);
          } else if (action === 'copy') {
            ZOIA.copyModule(modIdx);
          } else if (action === 'disconnect') {
            ZOIA.disconnectAllConnections(modIdx);
          } else if (action === 'delete') {
            ZOIA.deleteModule(modIdx);
          }
        };
      })(items[i]);
    }
  },

  /** Hide the context menu. */
  hide: function() {
    if (this._menu) this._menu.classList.remove('visible');
  }
};

// ===== INTERACTION MODE HELPER =====

/**
 * Determine how a grid button should behave when pressed/clicked.
 * Returns 'toggle', 'momentary', or 'none'.
 *
 * @param {number} modIdx   - Module index.
 * @param {number} blockIdx - Block index within the module.
 * @returns {string} 'toggle', 'momentary', or 'none'.
 */
function _getInteractionMode(modIdx, blockIdx) {
  ZOIA.log('[DIAG] _getInteractionMode: mod=' + modIdx + ' blk=' + blockIdx + ' mode=' + ZOIA.state.mode);
  var patch = ZOIA.state.patch;
  if (!patch || ZOIA.state.mode !== 'play' || !ZOIA.sim) {
    ZOIA.log('[DIAG] _getInteractionMode -> none (no patch/not play/no sim)');
    return 'none';
  }
  var mod = patch.modules[modIdx];
  if (!mod) {
    ZOIA.log('[DIAG] _getInteractionMode -> none (mod not found)');
    return 'none';
  }
  var node = ZOIA.sim.nodes[modIdx];

  // Looper blocks: Record/Play=toggle, Stop=momentary
  if (mod.typeIdx === 62) {
    if (!node) {
      ZOIA.log('[DIAG] _getInteractionMode -> none (looper node null)');
      return 'none';
    }
    if (blockIdx === node.recordIdx || blockIdx === node.playIdx) {
      ZOIA.log('[DIAG] _getInteractionMode -> toggle (looper rec/play, blockIdx=' + blockIdx + ' recIdx=' + node.recordIdx + ' playIdx=' + node.playIdx + ')');
      return 'toggle';
    }
    if (blockIdx === node.stopIdx) {
      ZOIA.log('[DIAG] _getInteractionMode -> momentary (looper stop, blockIdx=' + blockIdx + ' stopIdx=' + node.stopIdx + ')');
      return 'momentary';
    }
    ZOIA.log('[DIAG] _getInteractionMode -> none (looper block not rec/play/stop, blockIdx=' + blockIdx + ')');
    return 'none';
  }

  // Stompswitches: check what they connect to
  if (mod.typeIdx === 44 && node) {
    var conns = patch.connections;
    for (var ci = 0; ci < conns.length; ci++) {
      var conn = conns[ci];
      if (conn.srcMod === modIdx) {
        var dstMod = patch.modules[conn.dstMod];
        if (dstMod && dstMod.typeIdx === 62) {
          var dstNode = ZOIA.sim.nodes[conn.dstMod];
          if (dstNode) {
            if (conn.dstBlock === dstNode.recordIdx) {
              ZOIA.log('[DIAG] _getInteractionMode -> toggle (stomp->looper rec)');
              return 'toggle';
            }
            if (conn.dstBlock === dstNode.playIdx) {
              ZOIA.log('[DIAG] _getInteractionMode -> toggle (stomp->looper play)');
              return 'toggle';
            }
            if (conn.dstBlock === dstNode.stopIdx) {
              ZOIA.log('[DIAG] _getInteractionMode -> momentary (stomp->looper stop)');
              return 'momentary';
            }
          }
        }
      }
    }
    ZOIA.log('[DIAG] _getInteractionMode -> toggle (stomp default)');
    return 'toggle'; // default stompswitch behavior
  }

  // Existing momentary types (Pushbutton=15, UI Button=56, Tap Tempo=100)
  if (mod.typeIdx === 15 || mod.typeIdx === 56 || mod.typeIdx === 100) {
    ZOIA.log('[DIAG] _getInteractionMode -> momentary (type=' + mod.typeIdx + ')');
    return 'momentary';
  }

  ZOIA.log('[DIAG] _getInteractionMode -> none (default, type=' + mod.typeIdx + ')');
  return 'none';
}

// ===== GRID BUTTONS =====

ZOIA.gridButtons = {

  // ===== POSITION MAP BUILDER =====

  /**
   * Build a position map for a given page. Maps grid positions (0..39) to
   * the module/block occupying that slot, or leaves the key absent for
   * empty slots.
   *
   * @param {Object} patch - The current patch data.
   * @param {number} page  - The page index to map.
   * @returns {Object} posMap keyed by grid position.
   */
  buildPosMap: function(patch, page) {
    var posMap = {};
    if (!patch) return posMap;
    patch.modules.forEach(function(m) {
      if (m.page !== page) return;
      var blockCount = m.blockCount || (m.blocks ? m.blocks.length : 1);
      for (var b = 0; b < blockCount; b++) {
        var pos = m.gridPos + b;
        if (pos >= ZOIA.GRID_SIZE) break;
        var blockDef = (m.blocks && m.blocks[b])
          ? m.blocks[b]
          : { n: "Block " + b, t: "unknown" };
        posMap[pos] = {
          module: m,
          blockIndex: b,
          blockDef: blockDef,
          isFirst: b === 0,
          isLast: b === blockCount - 1,
          blockCount: blockCount
        };
      }
    });
    return posMap;
  },

  // ===== CONNECTION POSITION LOOKUP =====

  /**
   * Return a map of grid positions that are connected to a specific block,
   * keyed by position with signal type as the value.
   *
   * @param {Object} patch    - The current patch data.
   * @param {number} modIdx   - Module index.
   * @param {number} blockIdx - Block index within the module.
   * @returns {Object} Map of { gridPos: signalType }.
   */
  getConnectedPositions: function(patch, modIdx, blockIdx) {
    var connected = {};
    if (!patch) return connected;
    patch.connections.forEach(function(c) {
      // Skip connections referencing blocks beyond visible block count
      var sm = patch.modules[c.srcMod];
      var dm = patch.modules[c.dstMod];
      if (!sm || !dm) return;
      var smBc = sm.blockCount || (sm.blocks ? sm.blocks.length : 1);
      var dmBc = dm.blockCount || (dm.blocks ? dm.blocks.length : 1);
      if (c.srcBlock >= smBc || c.dstBlock >= dmBc) return;
      if (c.srcMod === modIdx && c.srcBlock === blockIdx) {
        connected[dm.gridPos + c.dstBlock] = ZOIA.getConnType(c);
      }
      if (c.dstMod === modIdx && c.dstBlock === blockIdx) {
        connected[sm.gridPos + c.srcBlock] = ZOIA.getConnType(c);
      }
    });
    return connected;
  },

  // ===== BLOCK CONNECTION MAP =====

  /**
   * Return a map of grid positions that have ANY connection, keyed by
   * position. Each value is an object { type, connIdx } where connIdx is
   * the index of the first connection found for that block in
   * patch.connections[].
   *
   * @param {Object} patch - The current patch data.
   * @param {number} page  - The page index to inspect.
   * @returns {Object} Map of { gridPos: { type: string, connIdx: number } }.
   */
  getBlockConnectionMap: function(patch, page) {
    var map = {};
    if (!patch) return map;
    patch.connections.forEach(function(c, ci) {
      var sm = patch.modules[c.srcMod];
      var dm = patch.modules[c.dstMod];
      if (!sm || !dm) return;
      // Skip connections referencing blocks beyond visible block count
      var smBc = sm.blockCount || (sm.blocks ? sm.blocks.length : 1);
      var dmBc = dm.blockCount || (dm.blocks ? dm.blocks.length : 1);
      if (c.srcBlock >= smBc || c.dstBlock >= dmBc) return;
      var connType = ZOIA.getConnType(c);
      if (sm.page === page) {
        var sPos = sm.gridPos + c.srcBlock;
        if (!map[sPos]) map[sPos] = { type: connType, connIdx: ci };
      }
      if (dm.page === page) {
        var dPos = dm.gridPos + c.dstBlock;
        if (!map[dPos]) map[dPos] = { type: connType, connIdx: ci };
      }
    });
    return map;
  },

  /**
   * Return a set of grid positions that are endpoints of the currently
   * selected connection (ZOIA.state.selectedConnection). Used to apply
   * the .conn-selected pulse class.
   *
   * @param {Object} patch - The current patch data.
   * @returns {Object} Map of { gridPos: true } for the two endpoints.
   */
  getSelectedConnEndpoints: function(patch) {
    var endpoints = {};
    var s = ZOIA.state;
    if (s.selectedConnection === null || !patch) return endpoints;
    var conn = patch.connections[s.selectedConnection];
    if (!conn) return endpoints;
    var sm = patch.modules[conn.srcMod];
    var dm = patch.modules[conn.dstMod];
    if (sm) endpoints[sm.gridPos + conn.srcBlock] = true;
    if (dm) endpoints[dm.gridPos + conn.dstBlock] = true;
    return endpoints;
  },

  // ===== GRID RENDERING =====

  /**
   * Render a full grid of buttons into the given container for the
   * specified page. This is the core rendering method and handles both
   * occupied and empty button states, drag-to-connect visuals, context
   * menus, and click handlers.
   *
   * @param {HTMLElement} container - The grid container element.
   * @param {number}      page      - The page index to render.
   * @param {boolean}     isPrimary - True if this is the primary (interactive) grid.
   */
  _renderGrid: function(container, page, isPrimary) {
    container.innerHTML = '';
    var s = ZOIA.state;

    // Toggle shift-mode CSS class
    if (s.shiftMode) container.classList.add('shift-mode');
    else container.classList.remove('shift-mode');

    // Build lookup maps for this page
    var posMap = this.buildPosMap(s.patch, page);
    var connPositions = {};
    if (s.selectedModule !== null && s.selectedBlock !== null && s.patch) {
      connPositions = this.getConnectedPositions(s.patch, s.selectedModule, s.selectedBlock);
    }
    // Also build conn positions for the hovered block (if different from selected)
    var hoverConnPositions = {};
    if (s.hoveredModule !== null && s.hoveredBlock !== null && s.patch) {
      if (s.hoveredModule !== s.selectedModule || s.hoveredBlock !== s.selectedBlock) {
        hoverConnPositions = this.getConnectedPositions(s.patch, s.hoveredModule, s.hoveredBlock);
      }
    }
    // Map of all blocks that have any connection (for conn-dot display)
    var blockConnMap = s.patch ? this.getBlockConnectionMap(s.patch, page) : {};
    // Endpoints of the currently selected connection (for .conn-selected pulse)
    var selConnEndpoints = s.patch ? this.getSelectedConnEndpoints(s.patch) : {};
    // Cross-module I/O highlight: when an Audio Input/Output (or MIDI) module block
    // is selected or hovered, highlight all other device I/O module blocks on this page
    var IO_TYPE_IDS = [1, 2]; // Audio Input, Audio Output
    var ioHighlight = {};
    function _buildIOHighlight(activeModIdx) {
      if (activeModIdx === null || !s.patch) return;
      var activeMod = s.patch.modules[activeModIdx];
      if (!activeMod) return;
      // Check by typeIdx OR by typeName/name containing "Audio Input"/"Audio Output"
      var tn = (activeMod.typeName || '').toLowerCase();
      var mn = (activeMod.name || '').toLowerCase();
      var isDeviceIO = IO_TYPE_IDS.indexOf(activeMod.typeIdx) >= 0 ||
                       tn.indexOf('audio input') >= 0 || tn.indexOf('audio output') >= 0 ||
                       mn.indexOf('audio in') >= 0 || mn.indexOf('audio out') >= 0 ||
                       tn.indexOf('midi') >= 0;
      if (!isDeviceIO) return;
      s.patch.modules.forEach(function(m) {
        if (m.page !== page) return;
        if (m.idx === activeModIdx) return;
        var mtn = (m.typeName || '').toLowerCase();
        var mmn = (m.name || '').toLowerCase();
        var mIsIO = IO_TYPE_IDS.indexOf(m.typeIdx) >= 0 ||
                    mtn.indexOf('audio input') >= 0 || mtn.indexOf('audio output') >= 0 ||
                    mmn.indexOf('audio in') >= 0 || mmn.indexOf('audio out') >= 0 ||
                    mtn.indexOf('midi') >= 0;
        if (mIsIO) {
          var bc = m.blockCount || (m.blocks ? m.blocks.length : 1);
          for (var b = 0; b < bc; b++) {
            ioHighlight[m.gridPos + b] = true;
          }
        }
      });
    }
    _buildIOHighlight(s.selectedModule);
    _buildIOHighlight(s.hoveredModule);

    for (var r = 0; r < ZOIA.GRID_ROWS; r++) {
      for (var c = 0; c < ZOIA.GRID_COLS; c++) {
        var pos = r * ZOIA.GRID_COLS + c;
        var btn = document.createElement('div');
        btn.className = 'grid-btn';
        btn.dataset.pos = pos;
        var entry = posMap[pos];

        // ---- Shift-mode action label (top row only) ----
        if (r === 0 && ZOIA.ACTION_LABELS[0] && ZOIA.ACTION_LABELS[0][c]) {
          var al = document.createElement('span');
          al.className = 'action-label';
          al.textContent = ZOIA.ACTION_LABELS[0][c];
          btn.appendChild(al);
        }

        if (entry) {
          // ============================================
          // OCCUPIED BUTTON SETUP
          // ============================================
          var mod = entry.module;
          var col = ZOIA.COLORS[mod.colorId] || '#666';

          btn.classList.add('occupied');
          btn.dataset.modIdx = mod.idx;  // For sim signal level visualization
          btn.style.background = col + '30';
          btn.style.borderColor = col;
          btn.style.boxShadow = '0 0 8px 2px ' + col + '40';

          // Highlight if this module is currently selected
          if (s.selectedModule === mod.idx) btn.classList.add('selected');

          // ---- Connection indicator dot ----
          // Show conn-dot when THIS BUTTON is selected/hovered and has connections,
          // or when connected to the selected/hovered block, or when part of selected connection,
          // or when highlighted as related I/O (device audio in/out pairing)
          var connMapEntry = blockConnMap[pos];
          var connType = connPositions[pos]; // connected to selected block
          var hoverConnType = hoverConnPositions[pos]; // connected to hovered block
          var isThisButtonSelected = s.selectedModule === mod.idx && s.selectedBlock === entry.blockIndex;
          var isThisButtonHovered = s.hoveredModule === mod.idx && s.hoveredBlock === entry.blockIndex;
          var isIOHighlighted = ioHighlight[pos];
          if ((connType || hoverConnType || selConnEndpoints[pos]) || (connMapEntry && (isThisButtonSelected || isThisButtonHovered)) || isIOHighlighted) {
            btn.classList.add('connected');
            var connDot = document.createElement('span');
            connDot.className = 'conn-dot';
            if (isIOHighlighted && !connType && !selConnEndpoints[pos]) {
              connDot.classList.add('io-highlight');
            }
            var dotType = connType || hoverConnType || (connMapEntry ? connMapEntry.type : 'audio');
            var connColor = ZOIA.CONN_STYLES[dotType] ? ZOIA.CONN_STYLES[dotType].color : '#fff';
            connDot.style.background = connColor;
            connDot.style.color = connColor;
            // Brighter pulse if this position is an endpoint of the selected connection
            if (selConnEndpoints[pos]) {
              connDot.classList.add('conn-selected');
            }
            // Click handler: select this block's first connection
            (function(gridPos, mapEntry, dotEl) {
              dotEl.addEventListener('click', function(e) {
                e.stopPropagation();
                ZOIA.moduleAdd.hide();
                ZOIA.gridContextMenu.hide();
                if (mapEntry) {
                  ZOIA.selectConnection(mapEntry.connIdx);
                }
              });
            })(pos, connMapEntry, connDot);
            btn.appendChild(connDot);
          }

          // ---- Drag-to-connect visual states ----
          if (s.dragSrc) {
            if (s.dragSrc.modIdx === mod.idx && s.dragSrc.blockIdx === entry.blockIndex) {
              // This button is the drag source
              btn.classList.add('drag-src');
            } else if (s.dragSrc.modIdx === mod.idx) {
              // Same module -- cannot connect to self; dim it
              btn.classList.add('drag-dim');
            }
          }

          // ---- Instance name label (double-click to rename) ----
          var instLabel = document.createElement('span');
          instLabel.className = 'ginst';
          instLabel.textContent = mod.name || mod.typeName;
          instLabel.title = 'Double-click to rename';
          (function(modIdx) {
            instLabel.addEventListener('dblclick', function(e) {
              e.stopPropagation();
              ZOIA.renameModule(modIdx);
            });
          })(mod.idx);
          btn.appendChild(instLabel);

          // ---- Block function name label ----
          var blkLabel = document.createElement('span');
          blkLabel.className = 'gblock';
          blkLabel.textContent = entry.blockDef.n;
          btn.appendChild(blkLabel);

          // ---- Signal type dot (audio/gate/cv/unknown) ----
          var dot = document.createElement('span');
          dot.className = 'signal-dot';
          var st = entry.blockDef.t || 'unknown';
          if (st.indexOf('audio') >= 0) dot.style.background = ZOIA.CONN_STYLES.audio.color;
          else if (st.indexOf('gate') >= 0) dot.style.background = ZOIA.CONN_STYLES.gate.color;
          else if (st.indexOf('cv') >= 0) dot.style.background = ZOIA.CONN_STYLES.cv.color;
          else dot.style.background = '#666';
          btn.appendChild(dot);

          // ---- Parameter value (only for cv_in blocks which are adjustable params) ----
          // audio_in, audio_out, gate_in, gate_out, cv_out are signal pass-throughs.
          // Only cv_in blocks (Frequency, Resonance, Level, Gain, etc.) have meaningful params.
          var bType = (entry.blockDef.t || '').toLowerCase();
          var isAdjustable = bType === 'cv_in';
          if (isAdjustable) {
            var paramVal = ZOIA.getParamValue(mod.idx, entry.blockIndex);
            var paramNum = document.createElement('span');
            paramNum.className = 'gparam-val';
            paramNum.textContent = ZOIA.formatParam(entry.blockDef.n, paramVal);
            btn.appendChild(paramNum);
          }

          // ---- Position label (row.col) ----
          var posLabel = document.createElement('span');
          posLabel.className = 'gpos';
          posLabel.textContent = r + '.' + c;
          btn.appendChild(posLabel);

          // ---- Looper recording/playing indicator ----
          if (ZOIA.state.mode === 'play' && ZOIA.sim && ZOIA.sim.nodes[mod.idx]) {
            var simNode = ZOIA.sim.nodes[mod.idx];
            if (simNode.type === 'looper') {
              if (simNode._recording && entry.blockIndex === simNode.recordIdx) {
                var recDot = document.createElement('span');
                recDot.className = 'rec-indicator';
                btn.appendChild(recDot);
                btn.classList.add('btn-recording');
              }
              if (simNode._playing && entry.blockIndex === simNode.playIdx) {
                var playDot = document.createElement('span');
                playDot.className = 'play-indicator';
                btn.appendChild(playDot);
                btn.classList.add('btn-playing');
              }
            }
          }

          // ---- Play mode interaction indicators ----
          if (ZOIA.state.mode === 'play') {
            var btnMode = _getInteractionMode(mod.idx, entry.blockIndex);
            if (btnMode === 'toggle') {
              btn.classList.add('btn-interactive', 'btn-toggle');
              // Check if this toggle is currently ON
              var simNode2 = ZOIA.sim ? ZOIA.sim.nodes[mod.idx] : null;
              if (simNode2) {
                var isOn = false;
                if (simNode2.type === 'looper') {
                  if (entry.blockIndex === simNode2.recordIdx && simNode2._recording) {
                    isOn = true;
                  } else if (entry.blockIndex === simNode2.playIdx && simNode2._playing) {
                    isOn = true;
                  }
                } else if (simNode2.type === 'stompswitch' || simNode2.type === 'pushbutton' || simNode2.type === 'ui_button') {
                  // Stompswitches and buttons: check if their output is currently high
                  if (simNode2._state !== undefined) {
                    isOn = !!simNode2._state;
                  }
                }
                if (isOn) {
                  btn.classList.add('btn-toggled-on');
                }
              }
            } else if (btnMode === 'momentary') {
              btn.classList.add('btn-interactive', 'btn-momentary');
            } else {
              btn.classList.add('btn-inactive');
            }
          }

          // ---- Tooltip with full module/block info ----
          var tipVal = isAdjustable ? ZOIA.formatParam(entry.blockDef.n, ZOIA.getParamValue(mod.idx, entry.blockIndex)) : '(n/a)';
          var tipParts = [
            mod.name + ' (' + mod.typeName + ')',
            'Block: ' + entry.blockDef.n + ' [' + (entry.blockDef.t || 'unknown') + ']',
            'Value: ' + tipVal,
            'Position: R' + r + ' C' + c + ' Page ' + page
          ];

          // List connections to/from this block
          var tipConns = [];
          if (ZOIA.state.patch && ZOIA.state.patch.connections) {
            var allConns = ZOIA.state.patch.connections;
            for (var ci = 0; ci < allConns.length; ci++) {
              var cc = allConns[ci];
              if (cc.srcMod === mod.idx && cc.srcBlock === entry.blockIndex) {
                var dMod = ZOIA.state.patch.modules[cc.dstMod];
                var dBlkName = (dMod && dMod.blocks && dMod.blocks[cc.dstBlock]) ? dMod.blocks[cc.dstBlock].n : 'block ' + cc.dstBlock;
                tipConns.push('-> ' + (dMod ? (dMod.name || dMod.typeName) : '?') + ':' + dBlkName);
              } else if (cc.dstMod === mod.idx && cc.dstBlock === entry.blockIndex) {
                var sMod = ZOIA.state.patch.modules[cc.srcMod];
                var sBlkName = (sMod && sMod.blocks && sMod.blocks[cc.srcBlock]) ? sMod.blocks[cc.srcBlock].n : 'block ' + cc.srcBlock;
                tipConns.push('<- ' + (sMod ? (sMod.name || sMod.typeName) : '?') + ':' + sBlkName);
              }
            }
          }
          if (tipConns.length > 0) {
            tipParts.push('--- Connections ---');
            for (var ti = 0; ti < tipConns.length; ti++) {
              tipParts.push(tipConns[ti]);
            }
          } else {
            tipParts.push('No connections');
          }

          if (ZOIA.state.mode === 'play') {
            var tipMode = _getInteractionMode(mod.idx, entry.blockIndex);
            if (tipMode === 'toggle') {
              tipParts.push('Click to toggle');
            } else if (tipMode === 'momentary') {
              tipParts.push('Hold to activate');
            } else {
              tipParts.push('Not interactive in Play mode');
            }
          } else {
            tipParts.push('Click to select, hold to drag-connect');
          }
          btn.title = tipParts.join('\n');

          // ---- Click handler: select this module/block + sim interaction ----
          (function(modIdx, blkIdx, typeIdx) {
            btn.onclick = function(e) {
              e.stopPropagation();
              ZOIA.log('[DIAG] onclick mod=' + modIdx + ' blk=' + blkIdx + ' type=' + typeIdx + ' mode=' + ZOIA.state.mode);
              ZOIA.moduleAdd.hide();
              ZOIA.gridContextMenu.hide();
              ZOIA.clearSelectedConnection();
              // Interactive button handling when sim is running
              if (ZOIA.state.mode === 'play') {
                var iMode = _getInteractionMode(modIdx, blkIdx);
                ZOIA.log('[DIAG] onclick iMode=' + iMode);
                if (iMode === 'toggle') {
                  var simNode = ZOIA.sim.nodes[modIdx];
                  if (simNode) {
                    if (simNode.pressBlock) {
                      ZOIA.log('[DIAG] onclick calling pressBlock(' + blkIdx + ')');
                      simNode.pressBlock(blkIdx);
                    } else if (simNode.toggle) {
                      ZOIA.log('[DIAG] onclick calling toggle()');
                      simNode.toggle();
                    }
                  }
                }
              }
              if (ZOIA.state.mode === 'edit') {
                ZOIA.hardwareView.selectModule(modIdx, blkIdx);
              }
            };
          })(mod.idx, entry.blockIndex, mod.typeIdx);

          // ---- Right-click: show context menu ----
          (function(modIdx, btnEl) {
            btnEl.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              e.stopPropagation();
              if (ZOIA.state.mode === 'play') {
                // no-op: layout editing disabled during playback
              } else {
                ZOIA.gridContextMenu.show(modIdx, btnEl);
              }
            });
          })(mod.idx, btn);

          // ============================================
          // DRAG-TO-CONNECT HANDLERS + SIM PRESS/RELEASE + HOVER
          // ============================================
          // mousedown: momentary sim press OR starts 200ms drag timer.
          // mouseup: momentary sim release OR completes drag connection.
          // mouseenter/mouseleave: hover feedback for drag AND conn-dots.
          (function(modIdx, blkIdx, btnEl, blockName, modName) {

            btnEl.addEventListener('mousedown', function(e) {
              if (e.button !== 0) return;
              if (e.target.classList && e.target.classList.contains('conn-dot')) return;

              // Momentary press when sim is running
              var pressMode = _getInteractionMode(modIdx, blkIdx);
              ZOIA.log('[DIAG] mousedown mod=' + modIdx + ' blk=' + blkIdx + ' pressMode=' + pressMode);
              if (pressMode === 'momentary') {
                var simNode = ZOIA.sim.nodes[modIdx];
                if (simNode) {
                  if (simNode.pressBlock) {
                    simNode.pressBlock(blkIdx);
                    btnEl._isPressing = true;
                    btnEl._pressBlockIdx = blkIdx;
                  } else if (simNode.press) {
                    simNode.press();
                    btnEl._isPressing = true;
                  }
                }
                return; // skip drag timer for momentary buttons
              }

              if (ZOIA.state.mode === 'edit') {
                btnEl._dragTimer = setTimeout(function() {
                  ZOIA.state.dragSrc = { modIdx: modIdx, blockIdx: blkIdx };
                  ZOIA.gridButtons.render();
                  ZOIA.gridButtons._showDragIndicator(modName, blockName, e.clientX, e.clientY);
                }, 200);
              }
            });

            btnEl.addEventListener('mouseup', function() {
              ZOIA.log('[DIAG] mouseup mod=' + modIdx + ' blk=' + blkIdx + ' isPressing=' + !!btnEl._isPressing);
              // Momentary release when sim is running
              if (btnEl._isPressing) {
                var simNode = ZOIA.sim.nodes[modIdx];
                if (simNode) {
                  if (simNode.releaseBlock && btnEl._pressBlockIdx != null) {
                    simNode.releaseBlock(btnEl._pressBlockIdx);
                  } else if (simNode.release) {
                    simNode.release();
                  }
                }
                btnEl._isPressing = false;
                btnEl._pressBlockIdx = null;
                return;
              }

              if (btnEl._dragTimer) { clearTimeout(btnEl._dragTimer); btnEl._dragTimer = null; }
              var ds = ZOIA.state.dragSrc;
              if (ds) {
                if (ds.modIdx !== modIdx || ds.blockIdx !== blkIdx) {
                  ZOIA.gridButtons._makeConnection(ds.modIdx, ds.blockIdx, modIdx, blkIdx);
                }
                ZOIA.state.dragSrc = null;
                ZOIA.gridButtons._hideDragIndicator();
                ZOIA.gridButtons.render();
              }
            });

            // Highlight as potential drop target during drag + show conn-dots on hover
            btnEl.addEventListener('mouseenter', function() {
              var ds = ZOIA.state.dragSrc;
              if (ds && (ds.modIdx !== modIdx || ds.blockIdx !== blkIdx)) {
                btnEl.classList.add('drag-target');
              }
              // Set hover state and re-render to show conn-dots (edit mode only)
              if (ZOIA.state.hoveredModule !== modIdx || ZOIA.state.hoveredBlock !== blkIdx) {
                ZOIA.state.hoveredModule = modIdx;
                ZOIA.state.hoveredBlock = blkIdx;
                if (!ds && ZOIA.state.mode === 'edit') ZOIA.gridButtons.render();
              }
            });

            btnEl.addEventListener('mouseleave', function(e) {
              btnEl.classList.remove('drag-target');
              // Clear hover state (only if not caused by DOM rebuild during render)
              if (ZOIA.state.hoveredModule === modIdx && ZOIA.state.hoveredBlock === blkIdx) {
                // Check if the mouse moved to a real target (not removed DOM)
                if (e.relatedTarget && e.relatedTarget.nodeType === 1) {
                  ZOIA.state.hoveredModule = null;
                  ZOIA.state.hoveredBlock = null;
                  if (!ZOIA.state.dragSrc && ZOIA.state.mode === 'edit') ZOIA.gridButtons.render();
                } else {
                  // DOM was likely rebuilt — just clear state without re-rendering
                  ZOIA.state.hoveredModule = null;
                  ZOIA.state.hoveredBlock = null;
                }
              }
            });
          })(mod.idx, entry.blockIndex, btn, entry.blockDef.n, mod.name || mod.typeName);

        } else {
          // ============================================
          // EMPTY BUTTON SETUP
          // ============================================

          // Dim empty buttons while a drag is in progress
          if (s.dragSrc) btn.classList.add('drag-dim');

          btn.title = 'Empty slot R' + r + ' C' + c + '\nClick or right-click to add module';

          // Position label for empty slots
          var emptyPos = document.createElement('span');
          emptyPos.className = 'gempty-pos';
          emptyPos.textContent = r + '.' + c;
          btn.appendChild(emptyPos);

          // ---- Click / right-click: open module-add popup (primary grid only) ----
          if (isPrimary) {
            (function(gridPos, btnEl) {
              btnEl.onclick = function(e) {
                e.stopPropagation();
                ZOIA.gridContextMenu.hide();
                // Clear grid-dot connection selection when clicking empty space
                ZOIA.clearSelectedConnection();
                ZOIA.moduleAdd.show(gridPos, btnEl);
              };
              btnEl.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                ZOIA.moduleAdd.hide();
                // If clipboard has content, show a context menu with paste option
                if (ZOIA.state.clipboard) {
                  ZOIA.gridButtons._showEmptyContextMenu(gridPos, btnEl);
                } else {
                  ZOIA.gridContextMenu.hide();
                  ZOIA.moduleAdd.show(gridPos, btnEl);
                }
              });
            })(pos, btn);
          }

          // ---- Cancel drag if mouse released on an empty slot ----
          btn.addEventListener('mouseup', function() {
            if (ZOIA.state.dragSrc) {
              ZOIA.state.dragSrc = null;
              ZOIA.gridButtons.render();
            }
          });
        }

        container.appendChild(btn);
      }
    }
  },

  // ===== CONNECTION CREATION =====

  /**
   * Create a new connection between two blocks. Checks for duplicates
   * before adding. Logs the connection and shows a toast notification.
   *
   * @param {number} srcMod   - Source module index.
   * @param {number} srcBlock - Source block index.
   * @param {number} dstMod   - Destination module index.
   * @param {number} dstBlock - Destination block index.
   */
  _makeConnection: function(srcMod, srcBlock, dstMod, dstBlock) {
    var s = ZOIA.state;
    if (!s.patch) return;

    // Check for duplicate connection (in either direction)
    var exists = s.patch.connections.some(function(c) {
      return (c.srcMod === srcMod && c.srcBlock === srcBlock &&
              c.dstMod === dstMod && c.dstBlock === dstBlock) ||
             (c.srcMod === dstMod && c.srcBlock === dstBlock &&
              c.dstMod === srcMod && c.dstBlock === srcBlock);
    });
    if (exists) { ZOIA.log('Connection already exists'); return; }

    // Add the connection with default full strength
    s.patch.connections.push({
      srcMod: srcMod,
      srcBlock: srcBlock,
      dstMod: dstMod,
      dstBlock: dstBlock,
      strength: 10000
    });

    // Build descriptive names for the log / toast
    var sm = s.patch.modules[srcMod];
    var dm = s.patch.modules[dstMod];
    var sName = sm ? (sm.name || sm.typeName) : 'Mod ' + srcMod;
    var dName = dm ? (dm.name || dm.typeName) : 'Mod ' + dstMod;
    var sBlk = (sm && sm.blocks && sm.blocks[srcBlock]) ? sm.blocks[srcBlock].n : 'Block ' + srcBlock;
    var dBlk = (dm && dm.blocks && dm.blocks[dstBlock]) ? dm.blocks[dstBlock].n : 'Block ' + dstBlock;
    var msg = sName + ' : ' + sBlk + '  \u2192  ' + dName + ' : ' + dBlk;

    ZOIA.log('Connected: ' + msg);
    ZOIA.updatePatchSummary();
    this._showConnToast(msg);
  },

  // ===== DRAG INDICATOR =====

  /** Cached drag indicator DOM element (created on first use) */
  _dragIndicator: null,

  /**
   * Show the floating drag indicator near the cursor. Created lazily on
   * first use and repositioned on subsequent calls. A document-level
   * mousemove listener keeps the indicator tracking the cursor.
   *
   * @param {string} modName   - Name of the source module.
   * @param {string} blockName - Name of the source block.
   * @param {number} x         - Initial clientX position.
   * @param {number} y         - Initial clientY position.
   */
  _showDragIndicator: function(modName, blockName, x, y) {
    if (!this._dragIndicator) {
      // Create the indicator element once
      var el = document.createElement('div');
      el.id = 'drag-indicator';
      el.style.cssText = 'position:fixed;z-index:300;pointer-events:none;' +
        'background:rgba(0,204,255,0.15);border:1px solid #00ccff;' +
        'border-radius:4px;padding:4px 8px;font-size:10px;color:#00ccff;' +
        'white-space:nowrap;box-shadow:0 2px 8px rgba(0,204,255,0.3);';
      document.body.appendChild(el);
      this._dragIndicator = el;

      // Attach a persistent mousemove handler to track the cursor
      var self = this;
      this._dragMoveHandler = function(e) {
        if (self._dragIndicator && self._dragIndicator.style.display !== 'none') {
          self._dragIndicator.style.left = (e.clientX + 12) + 'px';
          self._dragIndicator.style.top = (e.clientY + 12) + 'px';
        }
      };
      document.addEventListener('mousemove', this._dragMoveHandler);
    }

    this._dragIndicator.textContent = '\u21C4 ' + modName + ':' + blockName + ' \u2192 drop on target';
    this._dragIndicator.style.left = (x + 12) + 'px';
    this._dragIndicator.style.top = (y + 12) + 'px';
    this._dragIndicator.style.display = 'block';
  },

  /**
   * Hide the floating drag indicator (does not destroy it).
   */
  _hideDragIndicator: function() {
    if (this._dragIndicator) {
      this._dragIndicator.style.display = 'none';
    }
  },

  // ===== CONNECTION TOAST =====

  /**
   * Display a brief toast notification confirming a newly created connection.
   * Auto-hides after 2.5 seconds.
   *
   * @param {string} msg - Descriptive connection text (e.g. "Mod:Blk -> Mod:Blk").
   */
  _showConnToast: function(msg) {
    var toast = document.getElementById('conn-toast');
    if (!toast) return;
    toast.textContent = '\u2713 Connected: ' + msg;
    toast.classList.remove('visible');
    // Force reflow to restart CSS animation
    void toast.offsetWidth;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 2500);
  },

  // ===== EMPTY SLOT CONTEXT MENU (PASTE) =====

  /**
   * Show a context menu on an empty grid button with "Add Module" and "Paste Module" options.
   * Reuses the grid context menu element for consistent styling.
   *
   * @param {number}      gridPos - Grid position of the empty slot.
   * @param {HTMLElement}  btnEl  - The grid button element.
   */
  _showEmptyContextMenu: function(gridPos, btnEl) {
    var menu = ZOIA.gridContextMenu._ensureMenu();
    var s = ZOIA.state;
    var clipName = s.clipboard ? (s.clipboard.name || s.clipboard.typeName) : '';

    var html = '';
    html += '<div class="ctx-header">Empty Slot</div>';
    html += '<div class="ctx-item" data-action="add"><span class="ctx-icon">+</span>Add Module</div>';
    if (s.clipboard) {
      html += '<div class="ctx-item" data-action="paste"><span class="ctx-icon">&#9113;</span>Paste "' + clipName + '"</div>';
    }
    menu.innerHTML = html;

    var rect = btnEl.getBoundingClientRect();
    var pedalRect = document.getElementById('pedal').getBoundingClientRect();
    var left = rect.left - pedalRect.left + rect.width + 2;
    var top = rect.top - pedalRect.top;
    if (left + 170 > pedalRect.width) left = rect.left - pedalRect.left - 170;
    if (top + 80 > pedalRect.height) top = pedalRect.height - 90;
    if (top < 0) top = 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('visible');

    var items = menu.querySelectorAll('.ctx-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        item.onclick = function(e) {
          e.stopPropagation();
          var action = item.getAttribute('data-action');
          ZOIA.gridContextMenu.hide();
          if (action === 'add') {
            ZOIA.moduleAdd.show(gridPos, btnEl);
          } else if (action === 'paste') {
            ZOIA.pasteModule(gridPos, s.currentPage);
          }
        };
      })(items[i]);
    }
  },

  // ===== PUBLIC RENDER ENTRY POINT =====

  /**
   * Render the grid in either single-grid or dual-grid mode depending on
   * whether a secondary page is active. Also refreshes the param input.
   */
  render: function() {
    var s = ZOIA.state;
    var singleGrid = document.getElementById('btn-grid');
    var dualArea = document.getElementById('dual-grid-area');

    if (s.patch && s.secondaryPage >= 0) {
      // ---- DUAL GRID MODE ----
      if (singleGrid) singleGrid.style.display = 'none';

      // Create the dual-grid DOM structure if it does not exist yet
      if (!dualArea) {
        dualArea = document.createElement('div');
        dualArea.id = 'dual-grid-area';
        dualArea.innerHTML =
          '<div class="grid-column">' +
            '<div class="grid-header">' +
              '<span class="grid-label" ondblclick="ZOIA.renamePage(ZOIA.state.currentPage)" title="Double-click to rename page">LEFT</span>' +
              '<select id="page-select-left" onchange="ZOIA.hardwareView.goToPage(this.value)"></select>' +
            '</div>' +
            '<div class="btn-grid-inner" id="grid-left"></div>' +
          '</div>' +
          '<div class="grid-divider"></div>' +
          '<div class="grid-column">' +
            '<div class="grid-header">' +
              '<span class="grid-label" ondblclick="ZOIA.renamePage(ZOIA.state.secondaryPage)" title="Double-click to rename page">RIGHT</span>' +
              '<select id="page-select-right" onchange="ZOIA.hardwareView.goToSecondaryPage(this.value)"></select>' +
            '</div>' +
            '<div class="btn-grid-inner" id="grid-right"></div>' +
          '</div>';
        var pedalRight = document.getElementById('pedal-right');
        if (pedalRight) pedalRight.appendChild(dualArea);
      }
      dualArea.style.display = 'flex';

      // Render both grids
      var gridLeft = document.getElementById('grid-left');
      if (gridLeft) this._renderGrid(gridLeft, s.currentPage, true);

      var gridRight = document.getElementById('grid-right');
      if (gridRight) this._renderGrid(gridRight, s.secondaryPage, false);

      this._updateDualPageSelectors();

    } else {
      // ---- SINGLE GRID MODE ----
      if (dualArea) dualArea.style.display = 'none';
      if (singleGrid) {
        singleGrid.style.display = '';
        this._renderGrid(singleGrid, s.currentPage, true);
      }
    }

    // Sync the numeric param input with the current selection
    if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();

    // Update physical jack highlights based on selected/hovered module
    this._updateJackHighlights();
  },

  /**
   * Highlight physical I/O jack-holes when an Audio Input/Output module
   * block is selected or hovered. Maps module typeIdx + block to the
   * corresponding jack data-io attribute.
   */
  _updateJackHighlights: function() {
    // Clear all jack highlights first
    var allJacks = document.querySelectorAll('.jack-hole[data-io]');
    for (var j = 0; j < allJacks.length; j++) {
      allJacks[j].classList.remove('io-active');
    }

    var s = ZOIA.state;
    if (!s.patch) return;

    // Build list of { modIdx, blockIdx } pairs to check
    var targets = [];
    if (s.selectedModule !== null) {
      targets.push({ modIdx: s.selectedModule, blockIdx: s.selectedBlock });
    }
    if (s.hoveredModule !== null && s.hoveredModule !== s.selectedModule) {
      targets.push({ modIdx: s.hoveredModule, blockIdx: s.hoveredBlock });
    }

    for (var ti = 0; ti < targets.length; ti++) {
      var mod = s.patch.modules[targets[ti].modIdx];
      if (!mod) continue;
      var blkIdx = targets[ti].blockIdx;
      var tn = (mod.typeName || '').toLowerCase();

      // Determine which block is selected/hovered; get its name
      var blockName = '';
      if (mod.blocks && blkIdx !== null && blkIdx !== undefined && mod.blocks[blkIdx]) {
        blockName = (mod.blocks[blkIdx].n || '').toLowerCase();
      }

      if (mod.typeIdx === 1 || tn.indexOf('audio input') >= 0) {
        // Audio Input: map block name to specific jack
        // "left" or "output" (mono) -> IN L; "right" -> IN R
        // If no specific block selected, highlight both
        if (blkIdx === null || blkIdx === undefined) {
          this._highlightJack('in-l');
          this._highlightJack('in-r');
        } else if (blockName.indexOf('right') >= 0) {
          this._highlightJack('in-r');
        } else {
          // "left", "output" (mono variant), or any other block
          this._highlightJack('in-l');
        }
      } else if (mod.typeIdx === 2 || tn.indexOf('audio output') >= 0) {
        // Audio Output: "left" or "input" (mono) -> OUT L; "right" -> OUT R; "gain" -> no jack
        if (blkIdx === null || blkIdx === undefined) {
          this._highlightJack('out-l');
          this._highlightJack('out-r');
        } else if (blockName.indexOf('right') >= 0) {
          this._highlightJack('out-r');
        } else if (blockName.indexOf('gain') >= 0) {
          // Gain block has no physical jack
        } else {
          this._highlightJack('out-l');
        }
      } else if (tn.indexOf('midi') >= 0) {
        if (tn.indexOf('in') >= 0) this._highlightJack('midi-in');
        if (tn.indexOf('out') >= 0) this._highlightJack('midi-out');
      }
    }
  },

  /**
   * Helper: highlight a single physical jack by its data-io value.
   * @param {string} ioName - The data-io attribute value (e.g. 'in-l').
   */
  _highlightJack: function(ioName) {
    var el = document.querySelector('.jack-hole[data-io="' + ioName + '"]');
    if (el) el.classList.add('io-active');
  },

  // ===== DUAL PAGE SELECTORS =====

  /**
   * Populate the left and right page-selector dropdowns in dual-grid mode.
   * Each dropdown lists all pages in the patch plus a "+ Blank Page" option.
   */
  _updateDualPageSelectors: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    var leftSel = document.getElementById('page-select-left');
    var rightSel = document.getElementById('page-select-right');

    [leftSel, rightSel].forEach(function(sel, idx) {
      if (!sel) return;
      var curPage = idx === 0 ? s.currentPage : s.secondaryPage;
      sel.innerHTML = '';
      s.patch.pages.forEach(function(name, i) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i + ': ' + name;
        if (i === curPage) opt.selected = true;
        sel.appendChild(opt);
      });
      var blankOpt = document.createElement('option');
      blankOpt.value = 'blank';
      blankOpt.textContent = '+ Blank Page';
      sel.appendChild(blankOpt);
    });
  }
};


// === module-add.js ===
/**
 * module-add.js -- Module-Add Popup
 *
 * Provides a searchable popup for placing new modules onto the grid.
 * Triggered by clicking or right-clicking an empty grid button. The popup
 * displays a filtered list from ZOIA.MODULE_DB, checks for grid overflow
 * and position collisions, and creates a fully initialized module object
 * when a selection is made.
 *
 * Namespace: window.ZOIA.moduleAdd
 */
window.ZOIA = window.ZOIA || {};

ZOIA.moduleAdd = {

  /** Cached popup DOM element (created on first use) */
  _popup: null,

  /** Grid position where the new module will be placed */
  _targetPos: null,

  // ===== POPUP LIFECYCLE =====

  /**
   * Lazily create the popup element and append it to the pedal container.
   * The popup contains a close button, title with position, search input,
   * and a scrollable list of module entries.
   * @returns {HTMLElement} The popup element.
   */
  _ensurePopup: function() {
    if (this._popup) return this._popup;
    var popup = document.createElement('div');
    popup.id = 'module-add-popup';
    popup.innerHTML =
      '<span class="popup-close" onclick="ZOIA.moduleAdd.hide()">&times;</span>' +
      '<div class="popup-title">Add Module at <span id="popup-pos"></span></div>' +
      '<input class="popup-search" id="popup-search" placeholder="Search modules..." oninput="ZOIA.moduleAdd.filter(this.value)">' +
      '<div class="popup-list" id="popup-list"></div>';
    document.getElementById('pedal').appendChild(popup);
    this._popup = popup;
    return popup;
  },

  /**
   * Show the module-add popup, positioned near the clicked grid button.
   * Resets the search field and populates the full module list.
   *
   * @param {number}      gridPos - The grid position (0..39) to place the module.
   * @param {HTMLElement}  btnEl   - The empty grid button element that was clicked.
   */
  show: function(gridPos, btnEl) {
    var s = ZOIA.state;
    if (!s.patch) return;

    // Dismiss the context menu if it is open
    if (ZOIA.gridContextMenu) ZOIA.gridContextMenu.hide();

    var popup = this._ensurePopup();
    this._targetPos = gridPos;

    // Display the target position label (e.g. "R2 C5")
    var r = Math.floor(gridPos / ZOIA.GRID_COLS);
    var c = gridPos % ZOIA.GRID_COLS;
    document.getElementById('popup-pos').textContent = 'R' + r + ' C' + c;

    // ----- Position the popup near the clicked button -----
    var rect = btnEl.getBoundingClientRect();
    var pedalRect = document.getElementById('pedal').getBoundingClientRect();
    var left = rect.left - pedalRect.left + rect.width + 4;
    var top = rect.top - pedalRect.top;

    // Clamp to keep popup within the pedal bounds
    if (left + 230 > pedalRect.width) left = rect.left - pedalRect.left - 230;
    if (top + 250 > pedalRect.height) top = pedalRect.height - 260;
    if (top < 0) top = 4;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    // Clean up any leftover variant panel from a previous session
    var oldVP = document.getElementById('variant-panel');
    if (oldVP) oldVP.parentNode.removeChild(oldVP);

    // Ensure search and list are visible (may have been hidden by variant panel)
    var searchEl = document.getElementById('popup-search');
    var listEl = document.getElementById('popup-list');
    if (searchEl) searchEl.style.display = '';
    if (listEl) listEl.style.display = '';

    // Populate the unfiltered module list and show the popup
    this.filter('');
    popup.classList.add('visible');

    // Focus the search input after a brief delay (allows CSS transition)
    searchEl.value = '';
    setTimeout(function() { searchEl.focus(); }, 50);
  },

  /** Hide the popup, clean up variant panel, and clear the target position. */
  hide: function() {
    if (this._popup) {
      this._popup.classList.remove('visible');
      // Remove any lingering variant panel so the popup is clean next time
      var vp = document.getElementById('variant-panel');
      if (vp) vp.parentNode.removeChild(vp);
    }
    this._targetPos = null;
  },

  // ===== MODULE LIST FILTERING =====

  /**
   * Filter the module list by a search query. Matches against both the
   * module name and category. Results are sorted alphabetically and
   * capped at 30 visible entries.
   *
   * @param {string} query - The search text (case-insensitive).
   */
  filter: function(query) {
    var list = document.getElementById('popup-list');
    if (!list) return;
    list.innerHTML = '';

    var q = query.toLowerCase();
    var db = ZOIA.MODULE_DB;

    // Sort module type keys alphabetically by name
    var keys = Object.keys(db).sort(function(a, b) {
      return db[a].name.localeCompare(db[b].name);
    });

    var count = 0;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var mod = db[k];

      // Skip entries that don't match the query
      if (q && mod.name.toLowerCase().indexOf(q) < 0 && mod.cat.toLowerCase().indexOf(q) < 0) {
        continue;
      }

      var item = document.createElement('div');
      item.className = 'popup-item';
      item.innerHTML = '<span class="mi-name">' + mod.name + '</span>' +
        '<span class="mi-cat">' + mod.cat + ' (' + mod.blocks.length + ')</span>';

      // Click handler: show variants if available, otherwise add immediately
      (function(typeIdx) {
        item.onclick = function(e) {
          e.stopPropagation();
          var modDef = ZOIA.MODULE_DB[typeIdx];
          if (modDef && modDef.variants) {
            ZOIA.moduleAdd._showVariants(typeIdx);
          } else {
            ZOIA.moduleAdd.addModule(typeIdx);
          }
        };
      })(parseInt(k, 10));

      list.appendChild(item);
      count++;
      if (count >= 30) break; // cap visible results for performance
    }

    // Show a placeholder when no modules match
    if (count === 0) {
      list.innerHTML = '<div style="color:#666;padding:8px;text-align:center;">No matching modules</div>';
    }
  },

  // ===== VARIANT SELECTION =====

  /**
   * Derive a descriptive label for a block layout.
   * Detects stereo (L/R) vs mono based on block names, and reports the
   * block count.
   *
   * @param {Array<{n:string, t:string}>} blocks - Block descriptor array.
   * @returns {string} A label like "Stereo (6 blocks)" or "Mono (3 blocks)".
   */
  _deriveVariantLabel: function(blocks) {
    var hasStereo = false;
    for (var i = 0; i < blocks.length; i++) {
      var name = blocks[i].n.toLowerCase();
      if (name.indexOf('l ') === 0 || name.indexOf('r ') === 0 ||
          name === 'left' || name === 'right' ||
          name.indexOf('l in') === 0 || name.indexOf('r in') === 0 ||
          name.indexOf('l out') === 0 || name.indexOf('r out') === 0) {
        hasStereo = true;
        break;
      }
    }
    var label = hasStereo ? 'Stereo' : 'Mono';
    label += ' (' + blocks.length + ' block' + (blocks.length !== 1 ? 's' : '') + ')';
    return label;
  },

  /**
   * Show the variant selection sub-panel for a module type.
   * Hides the search input and module list, replacing them with a back
   * button and a list of variant options (including the default layout).
   *
   * @param {number} typeIdx - The module type index in ZOIA.MODULE_DB.
   */
  _showVariants: function(typeIdx) {
    var self = this;
    var db = ZOIA.MODULE_DB[typeIdx];
    if (!db || !db.variants) return;

    // Hide the search and module list
    var searchEl = document.getElementById('popup-search');
    var listEl = document.getElementById('popup-list');
    if (searchEl) searchEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';

    // Remove any previous variant panel
    var oldPanel = document.getElementById('variant-panel');
    if (oldPanel) oldPanel.parentNode.removeChild(oldPanel);

    // Build the variant panel
    var panel = document.createElement('div');
    panel.id = 'variant-panel';
    panel.className = 'variant-panel';

    // Header with back button and module name
    var header = document.createElement('div');
    header.className = 'variant-header';

    var backBtn = document.createElement('button');
    backBtn.className = 'variant-back';
    backBtn.textContent = 'Back';
    backBtn.onclick = function(e) {
      e.stopPropagation();
      self._showList();
    };
    header.appendChild(backBtn);

    var title = document.createElement('span');
    title.className = 'variant-title';
    title.textContent = db.name;
    header.appendChild(title);

    panel.appendChild(header);

    // Scrollable variant list
    var vList = document.createElement('div');
    vList.className = 'variant-list';

    // Collect all choices: default blocks + each variant
    // Build an ordered array of {key, blocks} entries
    var choices = [];

    // Check if key 0 is explicitly in variants
    var hasVariant0 = db.variants.hasOwnProperty(0) || db.variants.hasOwnProperty('0');

    if (!hasVariant0) {
      // Default blocks (option byte 0) are the base blocks
      choices.push({ key: 0, blocks: db.blocks });
    }

    // Add all variant keys (sorted numerically)
    var variantKeys = Object.keys(db.variants).sort(function(a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    for (var i = 0; i < variantKeys.length; i++) {
      var vk = parseInt(variantKeys[i], 10);
      choices.push({ key: vk, blocks: db.variants[variantKeys[i]] });
    }

    // If variant 0 exists, also add the base blocks as the "default" but
    // we need to figure out what option byte triggers base blocks.
    // When variant key 0 is present, the base blocks are used when options[0]
    // does NOT match any variant key. We'll present it as "Default" with a
    // sentinel key of -1 to signal "use base blocks, option byte 0".
    if (hasVariant0) {
      // Insert base blocks as first choice with a special marker
      choices.unshift({ key: -1, blocks: db.blocks, isBase: true });
    }

    for (var c = 0; c < choices.length; c++) {
      var choice = choices[c];
      var item = document.createElement('div');
      item.className = 'variant-item';

      var label = self._deriveVariantLabel(choice.blocks);
      if (choice.isBase) {
        label = 'Default - ' + label;
      }

      // Build block names string
      var blockNames = [];
      for (var b = 0; b < choice.blocks.length; b++) {
        blockNames.push(choice.blocks[b].n);
      }

      var labelDiv = document.createElement('div');
      labelDiv.className = 'vi-label';
      labelDiv.textContent = label;
      item.appendChild(labelDiv);

      var blocksDiv = document.createElement('div');
      blocksDiv.className = 'vi-blocks';
      blocksDiv.textContent = blockNames.join(', ');
      item.appendChild(blocksDiv);

      // Click handler to add with this variant
      (function(optionByte, variantBlocks) {
        item.onclick = function(e) {
          e.stopPropagation();
          self.addModule(typeIdx, optionByte, variantBlocks);
        };
      })(choice.key === -1 ? 0 : choice.key, choice.blocks);

      vList.appendChild(item);
    }

    panel.appendChild(vList);
    this._popup.appendChild(panel);
  },

  /**
   * Return from the variant sub-panel to the module list view.
   * Restores the search input and module list, removing the variant panel.
   */
  _showList: function() {
    // Remove variant panel
    var panel = document.getElementById('variant-panel');
    if (panel) panel.parentNode.removeChild(panel);

    // Restore search and list
    var searchEl = document.getElementById('popup-search');
    var listEl = document.getElementById('popup-list');
    if (searchEl) {
      searchEl.style.display = '';
      searchEl.focus();
    }
    if (listEl) listEl.style.display = '';
  },

  // ===== MODULE CREATION =====

  /**
   * Add a new module of the specified type at the target grid position.
   * Validates that all required grid slots are available, creates the
   * module object, appends it to the patch, and refreshes the UI.
   *
   * @param {number}                        typeIdx       - The module type index in ZOIA.MODULE_DB.
   * @param {number}                        [optionByte]  - Option byte value for options[0] (default 0).
   * @param {Array<{n:string, t:string}>}   [blockOverride] - Variant block layout to use instead of defaults.
   */
  addModule: function(typeIdx, optionByte, blockOverride) {
    var s = ZOIA.state;
    if (!s.patch || this._targetPos === null) return;

    var db = ZOIA.MODULE_DB[typeIdx];
    if (!db) return;

    var optByte = (typeof optionByte === 'number') ? optionByte : 0;
    var blocks = blockOverride || db.blocks;
    var blockCount = blocks.length;

    // ----- Validate grid space availability -----
    for (var b = 0; b < blockCount; b++) {
      var checkPos = this._targetPos + b;

      // Check for page overflow
      if (checkPos >= ZOIA.GRID_SIZE) {
        alert('Not enough room: module needs ' + blockCount + ' blocks but would overflow the page.');
        return;
      }

      // Check for overlap with existing modules
      var occupied = false;
      s.patch.modules.forEach(function(m) {
        if (m.page !== s.currentPage) return;
        var mbc = m.blockCount || (m.blocks ? m.blocks.length : 1);
        for (var mb = 0; mb < mbc; mb++) {
          if (m.gridPos + mb === checkPos) occupied = true;
        }
      });
      if (occupied) {
        alert('Position ' + checkPos + ' is already occupied.');
        return;
      }
    }

    // ----- Determine instance name (e.g. "VCA 2" for the second VCA) -----
    var typeCount = 0;
    s.patch.modules.forEach(function(m) {
      if (m.typeIdx === typeIdx) typeCount++;
    });

    // ----- Build the new module object -----
    var newIdx = s.patch.modules.length;
    var newModule = {
      idx: newIdx,
      typeIdx: typeIdx,
      page: s.currentPage,
      colorId: (newIdx % 15) + 1,
      gridPos: this._targetPos,
      name: db.name + ' ' + (typeCount + 1),
      typeName: db.name,
      blocks: blocks.slice(),
      blockCount: blockCount,
      category: db.cat,
      params: [],
      options: [optByte, 0, 0, 0, 0, 0, 0, 0],
      paramCount: 0
    };

    s.patch.modules.push(newModule);
    s.patch.moduleCount = s.patch.modules.length;

    // Select the newly added module
    s.selectedModule = newIdx;
    s.selectedBlock = 0;

    // Close the popup and refresh the UI
    this.hide();
    ZOIA.updatePatchSummary();
    ZOIA.hardwareView.renderAll();
  }
};


// === stompswitches.js ===
/**
 * stompswitches.js -- Stomp Switch Controls
 *
 * Simulates the ZOIA's three physical stomp switches and two combo-press
 * actions. The real hardware has:
 *
 *   Left   = BYPASS   -- Toggles the bypass state (red/green LED).
 *   Center = SELECT   -- Selects the next module on the current page.
 *   Right  = SCROLL   -- Cycles through blocks of the selected module.
 *
 * Combo presses:
 *   SELECT + SCROLL   -- Jump to the next module (alias for select).
 *   SCROLL + BYPASS   -- Page forward (stomp-style page navigation).
 *
 * Namespace: window.ZOIA.stompswitches
 */
window.ZOIA = window.ZOIA || {};

ZOIA.stompswitches = {

  // ===== STOMP DISPATCH =====

  /**
   * Handle a stomp switch press by type.
   * @param {string} type - One of 'bypass', 'select', 'scroll',
   *                        'select_scroll', or 'scroll_bypass'.
   */
  onStomp: function(type) {
    var s = ZOIA.state;

    if (type === 'bypass') {
      // Toggle bypass -- swap the status LED between red and green
      s.bypassed = !s.bypassed;
      var leds = document.querySelectorAll('.status-led');
      leds[0].className = 'status-led ' + (s.bypassed ? 'on-red' : 'on-green');
      ZOIA.log('Bypass ' + (s.bypassed ? 'ON' : 'OFF'));
      // Also trigger stompswitch modules mapped to Left (option[1] == 0)
      this._triggerStompswitchModules(0);

    } else if (type === 'select') {
      // Select the next module on the current page
      this._selectNextModule(1);
      // Also trigger stompswitch modules mapped to Middle (option[1] == 1)
      this._triggerStompswitchModules(1);

    } else if (type === 'scroll') {
      // Cycle to the next block of the selected module
      this._scrollBlock(1);
      // Also trigger stompswitch modules mapped to Right (option[1] == 2)
      this._triggerStompswitchModules(2);

    } else if (type === 'select_scroll') {
      // Combo: Select + Scroll = jump to next module
      this._selectNextModule(1);

    } else if (type === 'scroll_bypass') {
      // Combo: Scroll + Bypass = page forward
      if (!s.patch) return;
      if (s.currentPage < s.patch.pages.length - 1) {
        s.currentPage++;
        s.selectedModule = null;
        s.selectedBlock = null;
        ZOIA.log('Stomp page forward -> ' + s.currentPage);
        ZOIA.hardwareView.renderAll();
      }
    }
  },

  // ===== STOMPSWITCH MODULE TRIGGERING =====

  /**
   * Trigger stompswitch modules (type 44) mapped to a given physical position.
   * On real ZOIA, stompswitch option byte 1 determines mapping:
   *   0 = Left (Bypass), 1 = Middle (Select), 2 = Right (Scroll).
   * @param {number} position - Physical button position (0, 1, or 2).
   */
  _triggerStompswitchModules: function(position) {
    var s = ZOIA.state;
    if (!s.patch || !ZOIA.sim || !ZOIA.sim.running) return;
    var modules = s.patch.modules;
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].typeIdx === 44) {
        var opts = modules[i].options || [];
        var mappedPos = opts[1] || 0;
        if (mappedPos === position) {
          var node = ZOIA.sim.nodes[i];
          if (node && node.toggle) {
            node.toggle();
            ZOIA.log('Stomp triggered stompswitch "' + modules[i].name + '" (mod ' + i + ')');
          }
        }
      }
    }
  },

  // ===== MODULE SELECTION =====

  /**
   * Select the next (or previous) module on the current page.
   * Wraps around the list of modules belonging to this page.
   * @param {number} dir - Direction (+1 forward, -1 backward).
   */
  _selectNextModule: function(dir) {
    var s = ZOIA.state;
    if (!s.patch) return;

    // Collect module indices that belong to the current page
    var pageModules = [];
    s.patch.modules.forEach(function(m, i) {
      if (m.page === s.currentPage) pageModules.push(i);
    });
    if (pageModules.length === 0) return;

    // Find current position in the page-module list and advance
    var curIdx = pageModules.indexOf(s.selectedModule);
    var nextIdx;
    if (curIdx < 0) {
      nextIdx = 0;
    } else {
      nextIdx = (curIdx + dir + pageModules.length) % pageModules.length;
    }

    ZOIA.hardwareView.selectModule(pageModules[nextIdx], 0);
    ZOIA.log('Selected module ' + pageModules[nextIdx] + ': ' + s.patch.modules[pageModules[nextIdx]].name);
  },

  // ===== BLOCK SCROLLING =====

  /**
   * Scroll through the blocks of the currently selected module.
   * Exits connection view if active, since the block is changing.
   * @param {number} dir - Direction (+1 forward, -1 backward).
   */
  _scrollBlock: function(dir) {
    var s = ZOIA.state;
    if (!s.patch || s.selectedModule === null) return;

    // Exit connection view when scrolling to a different block
    if (s.connectionView) ZOIA.exitConnectionView();

    var m = s.patch.modules[s.selectedModule];
    if (!m) return;

    var bc = m.blockCount || 1;
    var cur = s.selectedBlock || 0;
    var next = (cur + dir + bc) % bc;
    s.selectedBlock = next;

    ZOIA.log('Scroll block -> ' + next + '/' + bc);
    ZOIA.oled.render();
    ZOIA.gridButtons.render();
    if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
  }
};


// === midi-keyboard.js ===
/**
 * midi-keyboard.js -- Virtual MIDI Controller for Keyboard Modules
 *
 * Renders a piano keyboard (white + black keys) below the ZOIA pedal
 * grid, representing an external MIDI controller connected to the
 * pedal's MIDI input. Adapted from SuperSynthLab's keyboard.
 *
 * Shows whenever the sim is running and the patch contains at least one
 * Keyboard module (typeIdx 16). Each key triggers noteOn/noteOff on
 * Keyboard sim nodes.
 *
 * ES5 only.
 * Namespace: window.ZOIA.midiKeyboard
 */
window.ZOIA = window.ZOIA || {};

ZOIA.midiKeyboard = {

  /** Note names for 12 chromatic pitch classes */
  _noteNames: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],

  /** Pitch classes that are black keys */
  _blackKeys: [1, 3, 6, 8, 10],

  /** Base octave for the keyboard (lowest octave shown) */
  _baseOctave: 3,

  /** Number of octaves to display */
  _numOctaves: 2,

  /** Currently held MIDI note (null if none) */
  _activeNote: null,

  /**
   * Check if the current patch has any Keyboard modules (typeIdx 16).
   * @returns {boolean}
   */
  hasKeyboardModules: function() {
    var s = ZOIA.state;
    if (!s.patch) return false;
    for (var i = 0; i < s.patch.modules.length; i++) {
      if (s.patch.modules[i].typeIdx === 16) return true;
    }
    return false;
  },

  /**
   * Check if a specific page has any Keyboard modules (typeIdx 16).
   * @param {number} pageNum
   * @returns {boolean}
   */
  hasKeyboardOnPage: function(pageNum) {
    var s = ZOIA.state;
    if (!s.patch) return false;
    for (var i = 0; i < s.patch.modules.length; i++) {
      var m = s.patch.modules[i];
      if (m.typeIdx === 16 && m.page === pageNum) return true;
    }
    return false;
  },

  /**
   * Get all Keyboard module indices in the patch.
   * @returns {number[]}
   */
  getKeyboardModules: function() {
    var s = ZOIA.state;
    if (!s.patch) return [];
    var indices = [];
    for (var i = 0; i < s.patch.modules.length; i++) {
      if (s.patch.modules[i].typeIdx === 16) indices.push(i);
    }
    return indices;
  },

  /**
   * Convert MIDI note to display name (e.g. 60 -> "C4").
   * @param {number} midi
   * @returns {string}
   */
  midiToName: function(midi) {
    var pc = midi % 12;
    var oct = Math.floor(midi / 12) - 1;
    return this._noteNames[pc] + oct;
  },

  /**
   * Trigger noteOn for Keyboard modules.
   * If a Keyboard module is selected, target only that one; otherwise all.
   * @param {number} midiNote
   */
  noteOn: function(midiNote) {
    if (!ZOIA.sim || !ZOIA.sim.running) return;
    var s = ZOIA.state;
    var targets = [];

    // If a specific Keyboard module is selected, target only that one
    if (s.selectedModule !== null && s.patch) {
      var m = s.patch.modules[s.selectedModule];
      if (m && m.typeIdx === 16) targets.push(s.selectedModule);
    }
    // Prefer keyboards on the current page (avoids additive doubling
    // when multiple keyboards are wired to the same destination)
    if (targets.length === 0 && s.patch) {
      for (var i = 0; i < s.patch.modules.length; i++) {
        if (s.patch.modules[i].typeIdx === 16 && s.patch.modules[i].page === s.currentPage) {
          targets.push(i);
        }
      }
    }
    // Fallback: target ALL keyboards (handles patches where no keyboard
    // is on the current page, e.g. I-category creative patches)
    if (targets.length === 0) {
      targets = this.getKeyboardModules();
    }

    for (var i = 0; i < targets.length; i++) {
      var node = ZOIA.sim.nodes[targets[i]];
      if (node && node.noteOn) node.noteOn(midiNote);
    }
    ZOIA.log('MIDI noteOn(' + midiNote + ' / ' + this.midiToName(midiNote) + ') -> ' + targets.length + ' keyboard(s)');
  },

  /**
   * Trigger noteOff for Keyboard modules.
   * Targets all keyboards (matches hardware: MIDI goes to all).
   */
  noteOff: function() {
    if (!ZOIA.sim || !ZOIA.sim.running) return;
    var s = ZOIA.state;
    var targets = [];

    if (s.selectedModule !== null && s.patch) {
      var m = s.patch.modules[s.selectedModule];
      if (m && m.typeIdx === 16) targets.push(s.selectedModule);
    }
    if (targets.length === 0 && s.patch) {
      for (var i = 0; i < s.patch.modules.length; i++) {
        if (s.patch.modules[i].typeIdx === 16 && s.patch.modules[i].page === s.currentPage) {
          targets.push(i);
        }
      }
    }
    if (targets.length === 0) {
      targets = this.getKeyboardModules();
    }

    for (var i = 0; i < targets.length; i++) {
      var node = ZOIA.sim.nodes[targets[i]];
      if (node && node.noteOff) node.noteOff();
    }
  },

  /**
   * Render the virtual MIDI controller keyboard below the grid.
   * Produces a proper piano layout with white and black keys spanning
   * 2 octaves (C3-C5 by default). Adapted from SuperSynthLab.
   */
  render: function() {
    var existing = document.getElementById('midi-keyboard');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var s = ZOIA.state;
    var shouldRender = ZOIA.sim && ZOIA.sim.running &&
                       this.hasKeyboardModules();
    if (!shouldRender) return;

    var container = document.createElement('div');
    container.id = 'midi-keyboard';
    container.className = 'midi-kb';

    // Header with label and octave controls
    var header = document.createElement('div');
    header.className = 'midi-kb-header';

    var label = document.createElement('span');
    label.className = 'midi-kb-title';
    label.textContent = 'MIDI CONTROLLER';
    header.appendChild(label);

    var octDown = document.createElement('button');
    octDown.className = 'midi-kb-oct-btn';
    octDown.textContent = '\u25C0';
    octDown.title = 'Octave down';
    header.appendChild(octDown);

    var octLabel = document.createElement('span');
    octLabel.className = 'midi-kb-oct-label';
    octLabel.id = 'midi-kb-oct-range';
    header.appendChild(octLabel);

    var octUp = document.createElement('button');
    octUp.className = 'midi-kb-oct-btn';
    octUp.textContent = '\u25B6';
    octUp.title = 'Octave up';
    header.appendChild(octUp);

    container.appendChild(header);

    // Keyboard element
    var kbEl = document.createElement('div');
    kbEl.className = 'midi-kb-keys';
    kbEl.id = 'midi-kb-piano';
    container.appendChild(kbEl);

    // Note readout
    var readout = document.createElement('div');
    readout.className = 'midi-kb-readout';
    readout.id = 'midi-kb-readout';
    readout.innerHTML = '&nbsp;';
    container.appendChild(readout);

    // Append to pedal area
    var pedalRight = document.getElementById('pedal-right');
    if (pedalRight) pedalRight.appendChild(container);

    // Build keys
    var self = this;
    this._buildKeys();
    this._updateOctLabel();

    // Octave button handlers
    octDown.addEventListener('click', function() {
      if (self._baseOctave > 1) {
        self._baseOctave--;
        self._buildKeys();
        self._updateOctLabel();
      }
    });
    octUp.addEventListener('click', function() {
      if (self._baseOctave < 6) {
        self._baseOctave++;
        self._buildKeys();
        self._updateOctLabel();
      }
    });
  },

  /**
   * Update the octave range label.
   */
  _updateOctLabel: function() {
    var el = document.getElementById('midi-kb-oct-range');
    if (el) {
      el.textContent = 'C' + this._baseOctave + ' \u2013 C' + (this._baseOctave + this._numOctaves);
    }
  },

  /**
   * Build the piano keys into the keyboard element.
   */
  _buildKeys: function() {
    var kbEl = document.getElementById('midi-kb-piano');
    if (!kbEl) return;
    kbEl.innerHTML = '';

    var startMidi = (this._baseOctave + 1) * 12;
    var endMidi = (this._baseOctave + this._numOctaves + 1) * 12;
    var self = this;

    for (var midi = startMidi; midi <= endMidi; midi++) {
      var pc = midi % 12;
      var isBlack = this._blackKeys.indexOf(pc) >= 0;

      var key = document.createElement('div');
      key.className = 'midi-kb-key ' + (isBlack ? 'black' : 'white');
      key.setAttribute('data-note', midi);

      // Note label
      var lbl = document.createElement('span');
      lbl.className = 'midi-kb-key-lbl';
      lbl.textContent = this.midiToName(midi);
      key.appendChild(lbl);

      // Event handlers
      (function(note, keyEl) {
        keyEl.addEventListener('mousedown', function(e) {
          e.preventDefault();
          // Release previous note if any
          if (self._activeNote !== null) {
            self.noteOff();
            var prev = kbEl.querySelector('.midi-kb-key.playing');
            if (prev) prev.classList.remove('playing');
          }
          self._activeNote = note;
          keyEl.classList.add('playing');
          self.noteOn(note);
          // Update readout
          var rd = document.getElementById('midi-kb-readout');
          if (rd) rd.textContent = self.midiToName(note);
        });

        keyEl.addEventListener('mouseup', function() {
          if (self._activeNote === note) {
            self._activeNote = null;
            keyEl.classList.remove('playing');
            self.noteOff();
          }
        });

        keyEl.addEventListener('mouseleave', function(e) {
          if (self._activeNote === note && e.buttons === 0) {
            self._activeNote = null;
            keyEl.classList.remove('playing');
            self.noteOff();
          }
        });
      })(midi, key);

      kbEl.appendChild(key);
    }
  }
};


// === waveform-timeline.js ===
/**
 * waveform-timeline.js -- Waveform Timeline View for Looper Module
 *
 * Renders a horizontal timeline strip showing recorded audio energy
 * on the Y axis and time on the X axis. During playback, shows a
 * moving playhead indicator. During recording, shows a red marker.
 *
 * ES5 only -- no arrow functions, no const/let, no template literals.
 */
window.ZOIA = window.ZOIA || {};

ZOIA.waveformTimeline = {
  _canvas: null,
  _ctx: null,
  _container: null,
  _initialized: false,

  /**
   * Create the DOM elements if not already present.
   * Inserts after #btn-grid or #dual-grid-area inside #pedal-right.
   */
  init: function() {
    if (this._initialized) {
      // already initialized, nothing to do
    } else {
      var existing = document.getElementById('waveform-timeline');
      if (existing) {
        this._container = existing;
        this._canvas = existing.querySelector('canvas');
        if (this._canvas) {
          this._ctx = this._canvas.getContext('2d');
        }
        this._initialized = true;
      } else {
        var container = document.createElement('div');
        container.id = 'waveform-timeline';

        var canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 48;
        container.appendChild(canvas);

        // Insert into pedal-right after btn-grid or dual-grid-area
        var pedalRight = document.getElementById('pedal-right');
        if (pedalRight) {
          var dualGrid = document.getElementById('dual-grid-area');
          var btnGrid = document.getElementById('btn-grid');
          var insertAfter = dualGrid || btnGrid;
          if (insertAfter && insertAfter.nextSibling) {
            pedalRight.insertBefore(container, insertAfter.nextSibling);
          } else if (insertAfter) {
            pedalRight.appendChild(container);
          } else {
            pedalRight.appendChild(container);
          }
        } else {
          // Fallback: append to body (should not happen in normal flow)
          document.body.appendChild(container);
        }

        this._container = container;
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        this._initialized = true;
      }
    }
  },

  /**
   * Find the first Looper node in the sim nodes list.
   * Returns the node object or null.
   */
  _findLooper: function() {
    var result = null;
    if (ZOIA.sim && ZOIA.sim.nodes) {
      var nodes = ZOIA.sim.nodes;
      var found = false;
      for (var i = 0; i < nodes.length && !found; i++) {
        if (nodes[i] && nodes[i].type === 'looper') {
          result = nodes[i];
          found = true;
        }
      }
    }
    return result;
  },

  /**
   * Render the waveform timeline canvas.
   */
  render: function() {
    if (!this._initialized) {
      this.init();
    }
    if (this._canvas && this._ctx) {
      var canvas = this._canvas;
      var ctx = this._ctx;
      var container = this._container;

      // Sync canvas pixel width to container layout width
      var cw = container.offsetWidth - 4; // subtract padding
      if (cw < 10) {
        cw = 400;
      }
      if (canvas.width !== cw) {
        canvas.width = cw;
      }
      var w = canvas.width;
      var h = canvas.height;

      // Clear
      ctx.clearRect(0, 0, w, h);

      var looper = this._findLooper();

      // No looper or no energy data: show empty message
      if (!looper || !looper._energyData || looper._energyData.length === 0) {
        ctx.fillStyle = '#444';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No recording', w / 2, h / 2);
      } else {
        var data = looper._energyData;
        var dataLen = data.length;
        var duration = looper._recordDuration;

        // If still recording, compute duration from start time
        if (looper._recording && ZOIA.sim && ZOIA.sim.ctx) {
          duration = ZOIA.sim.ctx.currentTime - looper._recordStartTime;
        }
        if (duration <= 0) {
          duration = dataLen / (looper._energySampleRate || 20);
        }

        // Draw waveform as filled area chart
        var xStep = w / dataLen;

        // Fill path
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var i = 0; i < dataLen; i++) {
          var x = i * xStep;
          var val = data[i];
          if (val < 0) { val = 0; }
          if (val > 1) { val = 1; }
          var y = h - (val * (h - 10)); // leave 10px for time labels
          ctx.lineTo(x, y);
        }
        ctx.lineTo((dataLen - 1) * xStep, h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 230, 118, 0.3)';
        ctx.fill();

        // Stroke path
        ctx.beginPath();
        for (var j = 0; j < dataLen; j++) {
          var sx = j * xStep;
          var sval = data[j];
          if (sval < 0) { sval = 0; }
          if (sval > 1) { sval = 1; }
          var sy = h - (sval * (h - 10));
          if (j === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw time labels along the bottom
        ctx.fillStyle = '#555';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (duration > 0) {
          var interval = 1; // 1 second intervals
          if (duration > 20) {
            interval = 5;
          } else if (duration > 10) {
            interval = 2;
          }
          for (var t = interval; t < duration; t += interval) {
            var tx = (t / duration) * w;
            ctx.fillText(t + 's', tx, h);
            // Small tick mark
            ctx.fillRect(tx - 0.5, h - 10, 1, 3);
          }
        }

        // Draw playhead
        if (looper._recording && ZOIA.sim && ZOIA.sim.ctx) {
          // Recording: red playhead at current position
          var recElapsed = ZOIA.sim.ctx.currentTime - looper._recordStartTime;
          var recFrac = 1.0; // at the end during recording
          if (duration > 0) {
            recFrac = recElapsed / duration;
            if (recFrac > 1.0) { recFrac = 1.0; }
          }
          var rx = recFrac * w;
          ctx.strokeStyle = '#ff1744';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx, h);
          ctx.stroke();
        } else if (looper._playing && ZOIA.sim && ZOIA.sim.ctx && looper._recordDuration > 0) {
          // Playing: white playhead at playback position
          var playElapsed = ZOIA.sim.ctx.currentTime - looper._playStartTime;
          var playPos = playElapsed % looper._recordDuration;
          var playFrac = playPos / looper._recordDuration;
          var px = playFrac * w;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        }
      }
    }
  }
};


// === hardware-view.js ===
/**
 * hardware-view.js -- Hardware View (Pedal Replica)
 * ===================================================
 * Renders the physical ZOIA pedal interface: the 8x5 button grid,
 * OLED display, page selector, and stomp switches.  Handles module
 * selection/deselection, page navigation, shift mode, connection-view
 * exit, and the drag-and-drop zone for .bin file imports.
 *
 * Depends on: ZOIA.state, ZOIA.gridButtons, ZOIA.oled, ZOIA.knob,
 *             ZOIA.moduleAdd, ZOIA.gridContextMenu, ZOIA.handleFile,
 *             ZOIA.exitConnectionView, ZOIA.updatePatchSummary
 *
 * @namespace ZOIA.hardwareView
 */
window.ZOIA = window.ZOIA || {};

ZOIA.hardwareView = {

  /* ===== Full Re-render ===== */

  /**
   * Re-render the entire hardware view: grid buttons, OLED, and the
   * page selector dropdown.
   */
  renderAll: function() {
    ZOIA.gridButtons.render();
    ZOIA.oled.render();
    this.renderPageSelector();
    if (ZOIA.midiKeyboard) ZOIA.midiKeyboard.render();
  },

  /* ===== Module Selection ===== */

  /**
   * Select (or toggle-deselect) a module on the grid.
   *
   * If the user clicks the already-selected module+block, it deselects.
   * If connection view is active, it is exited before changing selection
   * so that stale connection highlights do not linger.
   *
   * @param {number} idx       - Module index within the patch
   * @param {number} blockIdx  - Block index within the module (default 0)
   */
  selectModule: function(idx, blockIdx) {
    var s = ZOIA.state;
    var bi = (blockIdx != null) ? blockIdx : 0;
    ZOIA.log('selectModule(' + idx + ', block=' + bi + ') prev=' + s.selectedModule + ':' + s.selectedBlock);

    /* Clear grid-dot connection selection when changing module/block. */
    if (s.selectedConnection !== null) {
      ZOIA.clearSelectedConnection();
    }

    /* Exit connection view when selecting a different module/block
       so the grid does not show stale connection highlights. */
    if (s.connectionView) {
      ZOIA.exitConnectionView();
    }

    /* Toggle: clicking the same module+block deselects it. */
    if (s.selectedModule === idx && s.selectedBlock === bi) {
      s.selectedModule = null;
      s.selectedBlock = null;
    } else {
      s.selectedModule = idx;
      s.selectedBlock = bi;
    }

    ZOIA.gridButtons.render();
    ZOIA.oled.render();
    if (ZOIA.knob && ZOIA.knob.updateParamInput) {
      ZOIA.knob.updateParamInput();
    }
  },

  /* ===== Page Selector Dropdown ===== */

  /**
   * Rebuild the <select> dropdown that lists all patch pages plus a
   * "+ Blank Page" option at the end.
   */
  renderPageSelector: function() {
    var sel = document.getElementById('page-select');
    if (!sel) return;
    var s = ZOIA.state;
    sel.innerHTML = '';

    /* No patch loaded -- show placeholder */
    if (!s.patch) {
      var opt = document.createElement('option');
      opt.textContent = '(no patch)';
      sel.appendChild(opt);
      return;
    }

    /* One <option> per existing page */
    s.patch.pages.forEach(function(name, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i + ': ' + name;
      if (i === s.currentPage) opt.selected = true;
      sel.appendChild(opt);
    });

    /* Append the "add new blank page" sentinel option */
    var blankOpt = document.createElement('option');
    blankOpt.value = 'blank';
    blankOpt.textContent = '+ Blank Page';
    sel.appendChild(blankOpt);
  },

  /* ===== Page Navigation ===== */

  /**
   * Navigate to a page by dropdown value.  If the value is 'blank', a
   * new page is created at the end of the pages array (up to 64 max).
   *
   * @param {string|number} val - Page index or 'blank'
   */
  goToPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      /* Create a new blank page at the next available index */
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return; // ZOIA hardware maximum: 64 pages
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.currentPage = newIdx;
      /* Initialise secondary page if this is the second page overall */
      if (s.secondaryPage < 0 && s.patch.pages.length > 1) {
        s.secondaryPage = Math.min(1, s.patch.pages.length - 1);
      }
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.currentPage = idx;
    }

    /* Deselect any module when changing pages */
    s.selectedModule = null;
    s.selectedBlock = null;
    ZOIA.updatePatchSummary();
    this.renderAll();
  },

  /**
   * Navigate the secondary (dual-grid) page.  Same blank-page logic
   * as goToPage but updates secondaryPage instead of currentPage.
   *
   * @param {string|number} val - Page index or 'blank'
   */
  goToSecondaryPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return;
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.secondaryPage = newIdx;
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.secondaryPage = idx;
    }

    this.renderAll();
  },

  /**
   * Step one page to the left (decrement currentPage).
   */
  pageLeft: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    if (s.currentPage > 0) {
      s.currentPage--;
      s.selectedModule = null;
      s.selectedBlock = null;
      ZOIA.log('Page left -> ' + s.currentPage);
      this.renderAll();
    }
  },

  /**
   * Step one page to the right (increment currentPage).
   */
  pageRight: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    if (s.currentPage < s.patch.pages.length - 1) {
      s.currentPage++;
      s.selectedModule = null;
      s.selectedBlock = null;
      ZOIA.log('Page right -> ' + s.currentPage);
      this.renderAll();
    }
  },

  /* ===== Back / Deselect ===== */

  /**
   * "Back" button handler.  Follows a priority chain:
   *
   *  1. If connection view is active, exit it first and stay on the
   *     currently selected module/block.  This mirrors the physical
   *     ZOIA behaviour where pressing Back in connection mode returns
   *     to the selected block rather than deselecting entirely.
   *
   *  2. Otherwise, deselect the current module, clear shift mode and
   *     any active drag, and hide open popups/context menus.
   */
  back: function() {
    var s = ZOIA.state;

    /* Priority 0: deselect grid-dot connection selection */
    if (s.selectedConnection !== null) {
      ZOIA.clearSelectedConnection();
      ZOIA.gridButtons.render();
      if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
      return;
    }

    /* Priority 1: exit connection view but keep the selected block */
    if (s.connectionView) {
      ZOIA.exitConnectionView();
      ZOIA.gridButtons.render();
      if (ZOIA.knob && ZOIA.knob.updateParamInput) ZOIA.knob.updateParamInput();
      return;
    }

    /* Priority 2: full deselect and UI reset */
    s.selectedModule = null;
    s.selectedBlock = null;
    s.selectedConnection = null;
    s.shiftMode = false;
    s.dragSrc = null;
    ZOIA.moduleAdd.hide();
    ZOIA.gridContextMenu.hide();
    var shiftBtn = document.getElementById('shift-btn');
    if (shiftBtn) shiftBtn.classList.remove('shift-active');
    this.renderAll();
  },

  /* ===== Shift Mode ===== */

  /**
   * Toggle shift mode on the grid.  When active, grid buttons display
   * action labels (Add, Star, etc.) instead of module names.
   */
  toggleShift: function() {
    ZOIA.state.shiftMode = !ZOIA.state.shiftMode;
    var shiftBtn = document.getElementById('shift-btn');
    if (shiftBtn) shiftBtn.classList.toggle('shift-active', ZOIA.state.shiftMode);
    ZOIA.gridButtons.render();
  },

  /* ===== Drop Zone and Global Event Delegation ===== */

  /**
   * Initialise drag-and-drop on the pedal element so users can drop a
   * .bin file directly onto the hardware view to load it.  Also sets
   * up global click / right-click / mouseup listeners for closing
   * popups, context menus, and cancelling grid-button drags.
   *
   * Called once during viewManager.init().
   */
  initDropZone: function() {
    var pedal = document.getElementById('pedal');
    var hwDrop = document.getElementById('hw-drop-overlay');

    /* --- .bin file drag-and-drop on the pedal --- */
    pedal.addEventListener('dragover', function(e) {
      e.preventDefault();
      hwDrop.classList.add('active');
    });
    pedal.addEventListener('dragleave', function(e) {
      /* Only deactivate when the cursor truly leaves the pedal bounds */
      if (!pedal.contains(e.relatedTarget)) hwDrop.classList.remove('active');
    });
    pedal.addEventListener('drop', function(e) {
      e.preventDefault();
      hwDrop.classList.remove('active');
      var f = e.dataTransfer.files[0];
      if (f && f.name.endsWith('.bin')) ZOIA.handleFile(f);
    });

    /* --- Click-outside to close popups and context menus --- */
    document.addEventListener('click', function(e) {
      var popup = document.getElementById('module-add-popup');
      if (popup && popup.classList.contains('visible') && !popup.contains(e.target)) {
        ZOIA.moduleAdd.hide();
      }
      var ctxMenu = document.getElementById('grid-context-menu');
      if (ctxMenu && ctxMenu.classList.contains('visible') && !ctxMenu.contains(e.target)) {
        ZOIA.gridContextMenu.hide();
      }
    });

    /* --- Right-click on pedal: close context menu if open --- */
    document.getElementById('pedal').addEventListener('contextmenu', function(e) {
      var ctxMenu = document.getElementById('grid-context-menu');
      if (ctxMenu && ctxMenu.classList.contains('visible')) {
        if (!ctxMenu.contains(e.target)) {
          ZOIA.gridContextMenu.hide();
        }
      }
    });

    /* --- Global mouseup: cancel any in-progress grid drag --- */
    document.addEventListener('mouseup', function() {
      if (ZOIA.state.dragSrc) {
        ZOIA.state.dragSrc = null;
        ZOIA.gridButtons._hideDragIndicator();
        ZOIA.gridButtons.render();
      }
    });
  }
};


// === schematic-view.js ===
/**
 * schematic-view.js -- Schematic View (Signal-Flow Diagram)
 * ===========================================================
 * Renders the signal-flow / schematic layout of the currently loaded
 * ZOIA patch.  Comprises five visual regions:
 *
 *   - Grid:          8x5 cell matrix showing module placement
 *   - SVG Overlay:   Bezier curves representing audio/CV/gate/param
 *                    connections drawn on top of the grid
 *   - Page Tabs:     Tab bar for switching between patch pages
 *   - Patch Info:    Left-panel statistics (name, counts, CPU est.)
 *   - Module Detail: Right-panel detail for the selected module
 *
 * Depends on: ZOIA.state, ZOIA.COLORS, ZOIA.COLOR_NAMES,
 *             ZOIA.CONN_STYLES, ZOIA.MODULE_DB, ZOIA.getConnType,
 *             ZOIA.handleFile, ZOIA.parsePatch, ZOIA.loadPatch
 *
 * @namespace ZOIA.schematicView
 */
window.ZOIA = window.ZOIA || {};

ZOIA.schematicView = {

  /* ===== Full Re-render ===== */

  /** Render every sub-region of the schematic view. */
  renderAll: function() {
    this.renderGrid();
    this.renderPageTabs();
    this.renderPatchInfo();
    this.renderModuleList();
    this.renderModuleDetail();
  },

  /* ===== Module Selection ===== */

  /**
   * Toggle selection of a module by index.  Clicking the same module
   * again deselects it.
   *
   * @param {number} idx - Module index within the patch
   */
  selectModule: function(idx) {
    var s = ZOIA.state;
    s.selectedModule = s.selectedModule === idx ? null : idx;
    this.renderGrid();
    this.renderModuleList();
    this.renderModuleDetail();
  },

  /* ===== Grid Rendering ===== */

  /**
   * Render the dual-page grid layout.  Creates two side-by-side grids
   * (primary page on the left, secondary page on the right) with page
   * selector dropdowns above each grid and an SVG connection overlay
   * per grid.  Falls back to single-grid mode when no patch is loaded.
   *
   * The DOM structure is built dynamically inside #sch-grid-container
   * the first time and reused on subsequent calls.
   */
  renderGrid: function() {
    var container = document.getElementById('sch-grid-container');
    var s = ZOIA.state;

    if (!s.patch) {
      container.innerHTML = '<div id="sch-grid"></div><svg id="sch-svg-overlay"></svg>';
      return;
    }

    /* Build the dual-grid DOM if it does not yet exist */
    var dualArea = document.getElementById('sch-dual-grid-area');
    if (!dualArea) {
      container.innerHTML = '';
      dualArea = document.createElement('div');
      dualArea.id = 'sch-dual-grid-area';

      /* Left (primary) column */
      var leftCol = document.createElement('div');
      leftCol.className = 'sch-grid-column';

      var leftHeader = document.createElement('div');
      leftHeader.className = 'sch-grid-header';
      var leftLabel = document.createElement('span');
      leftLabel.className = 'sch-grid-label';
      leftLabel.textContent = 'PRIMARY';
      var leftSelect = document.createElement('select');
      leftSelect.id = 'sch-page-select-left';
      leftSelect.onchange = function() { ZOIA.schematicView.goToPage(this.value); };
      leftHeader.appendChild(leftLabel);
      leftHeader.appendChild(leftSelect);

      var leftGridWrap = document.createElement('div');
      leftGridWrap.className = 'sch-grid-wrap';
      var leftGrid = document.createElement('div');
      leftGrid.id = 'sch-grid-left';
      leftGrid.className = 'sch-grid';
      var leftSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      leftSvg.id = 'sch-svg-overlay-left';
      leftSvg.setAttribute('class', 'sch-svg-overlay');
      leftGridWrap.appendChild(leftGrid);
      leftGridWrap.appendChild(leftSvg);

      leftCol.appendChild(leftHeader);
      leftCol.appendChild(leftGridWrap);

      /* Divider */
      var divider = document.createElement('div');
      divider.className = 'sch-grid-divider';

      /* Right (secondary) column */
      var rightCol = document.createElement('div');
      rightCol.className = 'sch-grid-column';

      var rightHeader = document.createElement('div');
      rightHeader.className = 'sch-grid-header';
      var rightLabel = document.createElement('span');
      rightLabel.className = 'sch-grid-label';
      rightLabel.textContent = 'SECONDARY';
      var rightSelect = document.createElement('select');
      rightSelect.id = 'sch-page-select-right';
      rightSelect.onchange = function() { ZOIA.schematicView.goToSecondaryPage(this.value); };
      rightHeader.appendChild(rightLabel);
      rightHeader.appendChild(rightSelect);

      var rightGridWrap = document.createElement('div');
      rightGridWrap.className = 'sch-grid-wrap';
      var rightGrid = document.createElement('div');
      rightGrid.id = 'sch-grid-right';
      rightGrid.className = 'sch-grid';
      var rightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      rightSvg.id = 'sch-svg-overlay-right';
      rightSvg.setAttribute('class', 'sch-svg-overlay');
      rightGridWrap.appendChild(rightGrid);
      rightGridWrap.appendChild(rightSvg);

      rightCol.appendChild(rightHeader);
      rightCol.appendChild(rightGridWrap);

      dualArea.appendChild(leftCol);
      dualArea.appendChild(divider);
      dualArea.appendChild(rightCol);
      container.appendChild(dualArea);
    }

    /* Render cells into both grids */
    this._renderSingleGrid(document.getElementById('sch-grid-left'), s.currentPage);
    this._renderSingleGrid(document.getElementById('sch-grid-right'), s.secondaryPage);

    /* Update page selector dropdowns */
    this._updatePageSelectors();

    /* Draw SVG connections for both pages */
    this._renderConnectionsForSvg(document.getElementById('sch-svg-overlay-left'), s.currentPage);
    this._renderConnectionsForSvg(document.getElementById('sch-svg-overlay-right'), s.secondaryPage);
  },

  /**
   * Render a single 8x5 cell grid into the given container for the
   * specified page.
   *
   * @param {HTMLElement} gridEl - The grid container element.
   * @param {number}      page   - The page index to render.
   */
  _renderSingleGrid: function(gridEl, page) {
    gridEl.innerHTML = '';
    var s = ZOIA.state;
    if (!s.patch) return;

    /* --- Build position map: gridPos -> { module, blockIndex, ... } --- */
    var posMap = {};
    s.patch.modules.filter(function(m) { return m.page === page; })
      .forEach(function(m) {
        var bc = m.blockCount || (m.blocks ? m.blocks.length : 1);
        for (var b = 0; b < bc; b++) {
          var pos = m.gridPos + b;
          if (pos >= ZOIA.GRID_SIZE) break;
          posMap[pos] = { module: m, blockIndex: b, isFirst: b === 0, blockCount: bc };
        }
      });

    /* --- Create one <div class="cell"> per grid position --- */
    for (var r = 0; r < ZOIA.GRID_ROWS; r++) {
      for (var c = 0; c < ZOIA.GRID_COLS; c++) {
        var pos = r * ZOIA.GRID_COLS + c;
        var cell = document.createElement('div');
        cell.className = 'cell';
        var info = posMap[pos];

        if (info) {
          var mod = info.module;
          cell.classList.add('occupied');

          /* Colour: translucent fill + solid border from the module colour */
          var col = ZOIA.COLORS[mod.colorId] || '#666';
          cell.style.background = col + '33';
          cell.style.borderColor = col;
          if (s.selectedModule === mod.idx) cell.classList.add('selected');

          /* Label: module name on first block, block name on every block */
          var blk = mod.blocks && mod.blocks[info.blockIndex] ? mod.blocks[info.blockIndex] : null;
          var label = info.isFirst ? '<span class="mod-name">' + mod.name + '</span>' : '';
          label += blk ? '<span class="mod-type">' + blk.n + '</span>' : '<span class="mod-type">' + mod.typeName + '</span>';
          cell.innerHTML = label;

          /* Click handler (closure to capture modIdx) */
          (function(modIdx) {
            cell.onclick = function() { ZOIA.schematicView.selectModule(modIdx); };
          })(mod.idx);
        }

        gridEl.appendChild(cell);
      }
    }
  },

  /* ===== Page Navigation ===== */

  /**
   * Navigate the primary (left) page in the schematic dual-grid view.
   *
   * @param {string|number} val - Page index or 'blank' for a new page.
   */
  goToPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return;
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.currentPage = newIdx;
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.currentPage = idx;
    }

    s.selectedModule = null;
    this.renderAll();
  },

  /**
   * Navigate the secondary (right) page in the schematic dual-grid view.
   *
   * @param {string|number} val - Page index or 'blank' for a new page.
   */
  goToSecondaryPage: function(val) {
    var s = ZOIA.state;
    if (!s.patch) return;

    if (val === 'blank') {
      var newIdx = s.patch.pages.length;
      if (newIdx >= 64) return;
      s.patch.pages.push('Page ' + (newIdx + 1));
      s.secondaryPage = newIdx;
    } else {
      var idx = parseInt(val, 10);
      if (isNaN(idx) || idx < 0 || idx >= s.patch.pages.length) return;
      s.secondaryPage = idx;
    }

    this.renderAll();
  },

  /**
   * Populate the left and right page-selector dropdowns in dual-grid mode.
   */
  _updatePageSelectors: function() {
    var s = ZOIA.state;
    if (!s.patch) return;
    var leftSel = document.getElementById('sch-page-select-left');
    var rightSel = document.getElementById('sch-page-select-right');

    var selectors = [leftSel, rightSel];
    for (var si = 0; si < selectors.length; si++) {
      var sel = selectors[si];
      if (!sel) continue;
      var curPage = si === 0 ? s.currentPage : s.secondaryPage;
      sel.innerHTML = '';
      for (var i = 0; i < s.patch.pages.length; i++) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i + ': ' + s.patch.pages[i];
        if (i === curPage) opt.selected = true;
        sel.appendChild(opt);
      }
    }
  },

  /* ===== SVG Connection / Edge Rendering ===== */

  /**
   * Public wrapper: re-draw connections on both SVG overlays.
   * Called by toggleConn() when a filter changes.
   */
  renderConnections: function() {
    var s = ZOIA.state;
    var leftSvg = document.getElementById('sch-svg-overlay-left');
    var rightSvg = document.getElementById('sch-svg-overlay-right');
    if (leftSvg) this._renderConnectionsForSvg(leftSvg, s.currentPage);
    if (rightSvg) this._renderConnectionsForSvg(rightSvg, s.secondaryPage);
  },

  /**
   * Draw Bezier-curve connections between module blocks using an SVG
   * overlay that sits directly on top of a grid.
   *
   * For each connection in the patch:
   *  1. Determine the connection type (audio/cv/gate/param) to pick
   *     colour, stroke width, and optional dash pattern.
   *  2. Compute source and destination centre-points from grid position.
   *  3. Build a cubic Bezier path (C command) with horizontal tangent
   *     offsets so curves bow outward naturally.
   *  4. Apply opacity based on connection strength (0-10000 range),
   *     dimming unrelated connections when a module is selected.
   *  5. Attach mouse-hover tooltip showing source/dest names, signal
   *     type, and strength percentage.
   *
   * SVG arrow markers are defined in a <defs> block, one per type.
   *
   * @param {SVGElement} svg  - The SVG element to render into.
   * @param {number}     page - The page index whose connections to draw.
   */
  _renderConnectionsForSvg: function(svg, page) {
    /* Size the SVG to cover the entire grid area */
    var cellW = 56, gap = 3;
    var gw = ZOIA.GRID_COLS * cellW + (ZOIA.GRID_COLS - 1) * gap;
    var gh = ZOIA.GRID_ROWS * cellW + (ZOIA.GRID_ROWS - 1) * gap;
    svg.setAttribute('width', gw);
    svg.setAttribute('height', gh);
    svg.innerHTML = '';

    var s = ZOIA.state;
    if (!s.patch) return;

    /* Use the SVG element's id as a prefix to keep marker ids unique
       across left and right overlays (avoids cross-SVG id collisions). */
    var prefix = svg.id ? svg.id + '-' : '';

    /* --- SVG <defs>: arrowhead markers per connection type --- */
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    ['audio', 'cv', 'gate', 'param'].forEach(function(type) {
      var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', prefix + 'arrow-' + type);
      marker.setAttribute('viewBox', '0 0 10 6');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '3');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('orient', 'auto');
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '0,0 10,3 0,6');
      poly.setAttribute('fill', ZOIA.CONN_STYLES[type].color);
      marker.appendChild(poly);
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    /* --- Helper: compute pixel centre of a module block --- */
    function blockCenter(mod, blockIdx) {
      var pos = mod.gridPos + (blockIdx || 0);
      // Clamp to valid grid range to prevent out-of-bounds positions
      if (pos < 0) pos = 0;
      if (pos >= ZOIA.GRID_SIZE) pos = ZOIA.GRID_SIZE - 1;
      var c = pos % ZOIA.GRID_COLS;
      var r = Math.floor(pos / ZOIA.GRID_COLS);
      return {
        x: c * (cellW + gap) + cellW / 2,
        y: r * (cellW + gap) + cellW / 2
      };
    }

    /* --- Draw one Bezier path per connection --- */
    s.patch.connections.forEach(function(conn) {
      var sm = s.patch.modules[conn.srcMod];
      var dm = s.patch.modules[conn.dstMod];
      if (!sm || !dm) return;

      /* Only draw connections where BOTH endpoints are on this page */
      if (sm.page !== page || dm.page !== page) return;

      /* Skip connections that reference blocks beyond the module's visible block count.
         The binary can contain connections to internal parameter slots that aren't
         represented in our resolved block layout, producing arrows to wrong positions. */
      var smBlockCount = sm.blockCount || (sm.blocks ? sm.blocks.length : 1);
      var dmBlockCount = dm.blockCount || (dm.blocks ? dm.blocks.length : 1);
      if (conn.srcBlock >= smBlockCount || conn.dstBlock >= dmBlockCount) return;

      /* Determine visual style from connection type */
      var type = ZOIA.getConnType(conn);
      if (!s.connFilters[type]) return;
      var style = ZOIA.CONN_STYLES[type];

      /* Opacity: capped at 50% to avoid obscuring buttons, further dimmed
         when a different module is selected. */
      var opacity = Math.min(0.5, Math.max(0.2, conn.strength / 10000 * 0.5));
      var src = blockCenter(sm, conn.srcBlock);
      var dst = blockCenter(dm, conn.dstBlock);
      var dx = dst.x - src.x;

      /* Build cubic Bezier: control points offset 30% of horizontal
         distance to create a gentle horizontal bow. */
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d',
        'M' + src.x + ',' + src.y +
        ' C' + (src.x + dx * 0.3) + ',' + src.y +
        ' ' + (dst.x - dx * 0.3) + ',' + dst.y +
        ' ' + dst.x + ',' + dst.y
      );
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', style.color);
      path.setAttribute('stroke-width', style.width);
      if (style.dash) path.setAttribute('stroke-dasharray', style.dash);

      /* Dim connections unrelated to the selected module */
      path.setAttribute('opacity',
        s.selectedModule !== null && conn.srcMod !== s.selectedModule && conn.dstMod !== s.selectedModule
          ? opacity * 0.2
          : opacity
      );

      path.setAttribute('marker-end', 'url(#' + prefix + 'arrow-' + type + ')');
      path.classList.add('conn-hover');
      path.style.pointerEvents = 'stroke';

      /* --- Hover tooltip --- */
      var srcBlk = sm.blocks[conn.srcBlock] ? sm.blocks[conn.srcBlock].n : 'out ' + conn.srcBlock;
      var dstBlk = dm.blocks[conn.dstBlock] ? dm.blocks[conn.dstBlock].n : 'in ' + conn.dstBlock;

      path.addEventListener('mouseenter', function(e) {
        var tt = document.getElementById('tooltip');
        tt.innerHTML = '<b>' + sm.name + '</b> [' + srcBlk + '] \u2192 <b>' + dm.name + '</b> [' + dstBlk + ']<br>' +
          type.toUpperCase() + ' \u00B7 Strength: ' + (conn.strength / 100).toFixed(0) + '%';
        tt.style.display = 'block';
        tt.style.left = (e.clientX + 10) + 'px';
        tt.style.top = (e.clientY - 30) + 'px';
      });
      path.addEventListener('mouseleave', function() {
        document.getElementById('tooltip').style.display = 'none';
      });
      path.addEventListener('mousemove', function(e) {
        var tt = document.getElementById('tooltip');
        tt.style.left = (e.clientX + 10) + 'px';
        tt.style.top = (e.clientY - 30) + 'px';
      });

      svg.appendChild(path);
    });
  },

  /* ===== Page Tabs ===== */

  /** Render the tab bar at the top of the centre panel. */
  renderPageTabs: function() {
    var tabs = document.getElementById('sch-page-tabs');
    tabs.innerHTML = '';
    var s = ZOIA.state;
    if (!s.patch) return;
    var self = this;
    s.patch.pages.forEach(function(name, i) {
      var tab = document.createElement('div');
      tab.className = 'page-tab' + (i === s.currentPage ? ' active' : '');
      tab.textContent = name;
      tab.onclick = function() { s.currentPage = i; self.renderAll(); };
      tabs.appendChild(tab);
    });
  },

  /* ===== Left Panel: Patch Info ===== */

  /** Render aggregate patch statistics in the left panel. */
  renderPatchInfo: function() {
    var el = document.getElementById('sch-patch-info');
    var p = ZOIA.state.patch;
    if (!p) { el.innerHTML = '<p class="info-text">No patch loaded.</p>'; return; }

    var audioMods = p.modules.filter(function(m) {
      var d = ZOIA.MODULE_DB[m.typeIdx];
      return d && d.cat === "Audio";
    }).length;

    el.innerHTML =
      '<div class="stat-row"><span class="stat-label">Name</span><span class="stat-value">' + p.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Modules</span><span class="stat-value">' + p.moduleCount + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Connections</span><span class="stat-value">' + p.connections.length + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Pages</span><span class="stat-value">' + p.pages.length + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Audio Modules</span><span class="stat-value">' + audioMods + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Est. CPU</span><span class="stat-value">' + Math.min(100, Math.round(p.moduleCount * 2.5 + audioMods * 3)) + '%</span></div>';
  },

  /* ===== Left Panel: Module List ===== */

  /** Render the scrollable list of all modules in the patch. */
  renderModuleList: function() {
    var el = document.getElementById('sch-module-list');
    var s = ZOIA.state;
    if (!s.patch) { el.innerHTML = ''; return; }

    var html = '<div class="panel-title">Modules</div><div class="module-list">';
    s.patch.modules.forEach(function(m) {
      var col = ZOIA.COLORS[m.colorId] || '#666';
      html += '<div class="module-item' + (s.selectedModule === m.idx ? ' active' : '') +
        '" onclick="ZOIA.schematicView.selectModule(' + m.idx + ')">' +
        '<span class="module-dot" style="background:' + col + '"></span>' +
        '<span>' + m.name + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  },

  /* ===== Right Panel: Module Detail ===== */

  /**
   * Render detailed information about the selected module: metadata,
   * block list with colour-coded signal-type badges, and a list of
   * connections touching this module.
   */
  renderModuleDetail: function() {
    var el = document.getElementById('sch-module-detail');
    var s = ZOIA.state;

    if (s.selectedModule === null || !s.patch) {
      el.innerHTML = '<p class="info-text">Click a module to see details.</p>';
      return;
    }

    var m = s.patch.modules[s.selectedModule];
    if (!m) { el.innerHTML = ''; return; }
    var col = ZOIA.COLORS[m.colorId] || '#666';

    /* Module metadata */
    var html =
      '<div class="detail-section"><h3>Module</h3>' +
      '<div class="stat-row"><span class="stat-label">Name</span><span class="stat-value">' + m.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Type</span><span class="stat-value">' + m.typeName + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Category</span><span class="stat-value">' + (m.category || '?') + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Color</span><span class="stat-value" style="color:' + col + '">' + (ZOIA.COLOR_NAMES[m.colorId] || '?') + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Page</span><span class="stat-value">' + (s.patch.pages[m.page] || m.page) + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Grid Pos</span><span class="stat-value">R' + ((m.gridPos / ZOIA.GRID_COLS | 0) + 1) + ' C' + (m.gridPos % ZOIA.GRID_COLS + 1) + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Blocks</span><span class="stat-value">' + (m.blockCount || (m.blocks ? m.blocks.length : 1)) + ' buttons</span></div>' +
      '</div>';

    /* Block list with signal-type badges */
    if (m.blocks && m.blocks.length) {
      html += '<div class="detail-section"><h3>Blocks</h3>';
      m.blocks.forEach(function(b) {
        var st = b.t.startsWith('audio') ? 'audio' : b.t.startsWith('gate') ? 'gate' : b.t.startsWith('cv') ? 'cv' : 'param';
        var sty = ZOIA.CONN_STYLES[st];
        html += '<span class="conn-badge" style="background:' + sty.color + '22;color:' + sty.color + ';border:1px solid ' + sty.color + '44">' +
          b.n + ' (' + b.t.replace('_', ' ') + ')</span>';
      });
      html += '</div>';
    }

    /* Connections touching this module */
    var conns = s.patch.connections.filter(function(c) {
      return c.srcMod === m.idx || c.dstMod === m.idx;
    });
    if (conns.length) {
      html += '<div class="detail-section"><h3>Connections (' + conns.length + ')</h3>';
      conns.forEach(function(c) {
        var type = ZOIA.getConnType(c);
        var sty = ZOIA.CONN_STYLES[type];
        var other = c.srcMod === m.idx ? s.patch.modules[c.dstMod] : s.patch.modules[c.srcMod];
        var dir = c.srcMod === m.idx ? '\u2192' : '\u2190';
        html += '<div class="stat-row"><span class="stat-label" style="color:' + sty.color + '">' + dir + ' ' + (other ? other.name : '?') +
          '</span><span class="stat-value">' + (c.strength / 100).toFixed(0) + '%</span></div>';
      });
      html += '</div>';
    }

    el.innerHTML = html;
  },

  /* ===== Connection Filter Toggles ===== */

  /**
   * Toggle a connection type filter (audio/cv/gate/param) and re-draw
   * the SVG overlay.
   *
   * @param {HTMLElement} el - The toggle button element (data-type attr)
   */
  toggleConn: function(el) {
    var type = el.dataset.type;
    ZOIA.state.connFilters[type] = !ZOIA.state.connFilters[type];
    el.classList.toggle('on');
    this.renderConnections();
  },

  /* ===== Zoom Controls ===== */

  /**
   * Adjust the grid zoom level by a delta.  Clamps to [0.5, 2.0] and
   * applies a CSS transform on the grid container.
   *
   * @param {number} delta - Zoom increment (e.g. +0.1 or -0.1)
   */
  setZoom: function(delta) {
    var s = ZOIA.state;
    s.zoomLevel = Math.max(0.5, Math.min(2, s.zoomLevel + delta));
    document.getElementById('sch-grid-container').style.transform = 'scale(' + s.zoomLevel + ')';
    document.getElementById('sch-grid-container').style.transformOrigin = 'top center';
    document.getElementById('sch-zoom-label').textContent = Math.round(s.zoomLevel * 100) + '%';
  },

  /* ===== Drop Zone ===== */

  /**
   * Initialise drag-and-drop on the schematic centre panel so users
   * can drop a .bin file to load it.  Called once during init.
   */
  initDropZone: function() {
    var schCenter = document.getElementById('sch-center');
    var schDrop = document.getElementById('sch-drop-zone');
    if (!schCenter) return;

    schCenter.addEventListener('dragover', function(e) {
      e.preventDefault();
      schDrop.classList.add('active');
    });
    schCenter.addEventListener('dragleave', function(e) {
      if (!schCenter.contains(e.relatedTarget)) schDrop.classList.remove('active');
    });
    schCenter.addEventListener('drop', function(e) {
      e.preventDefault();
      schDrop.classList.remove('active');
      var f = e.dataTransfer.files[0];
      if (f && f.name.endsWith('.bin')) ZOIA.handleFile(f);
    });
  }
};


// === view-manager.js ===
/**
 * view-manager.js -- View Toggle and Application Init
 * =====================================================
 * Manages switching between the Hardware view ("hw") and the
 * Schematic view ("sch"), and orchestrates top-level initialisation
 * of the ZOIA Web Emulator exhibit.
 *
 * Depends on: ZOIA.VERSION_STRING, ZOIA.knob, ZOIA.hardwareView,
 *             ZOIA.schematicView, ZOIA.loadDemo
 *
 * @namespace ZOIA.viewManager
 */
window.ZOIA = window.ZOIA || {};

ZOIA.viewManager = {

  /* ===== View Switching ===== */

  /**
   * Switch between the hardware view and the schematic view.
   * Highlights the active toolbar button, shows/hides the two view
   * containers, and triggers a full render on the newly visible view.
   *
   * @param {string} v - View key: 'hw' or 'sch'
   */
  switchView: function(v) {
    ZOIA.state.currentView = v;

    /* Update toolbar button active states */
    document.querySelectorAll('.view-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.view === v);
    });

    /* Show/hide view containers */
    document.getElementById('hw-view').style.display = v === 'hw' ? 'flex' : 'none';
    document.getElementById('sch-view').style.display = v === 'sch' ? 'flex' : 'none';

    /* Render the newly visible view */
    if (v === 'sch') ZOIA.schematicView.renderAll();
    if (v === 'hw') ZOIA.hardwareView.renderAll();
  },

  /* ===== Application Init ===== */

  /**
   * One-time initialisation called on page load.  Sets up all
   * subsystems, stamps the version string into the toolbar and pedal
   * badge, then loads the built-in demo patch.
   */
  init: function() {
    ZOIA.log('Initializing ZOIA Patch Simulator v' + ZOIA.VERSION_STRING);

    /* Initialise subsystems */
    ZOIA.knob.init();
    ZOIA.hardwareView.initDropZone();
    ZOIA.schematicView.initDropZone();

    /* Stamp version number in the toolbar and on the pedal badge */
    var revEl = document.getElementById('revision-label');
    if (revEl) revEl.textContent = 'v' + ZOIA.VERSION_STRING;
    var hwRev = document.getElementById('hw-rev-badge');
    if (hwRev) hwRev.textContent = 'v' + ZOIA.VERSION_STRING;

    /* Load the trivial Audio In -> Audio Out initial patch */
    ZOIA.loadInitial();

    ZOIA.log('Init complete');
  }
};


// === patch-browser.js ===
/**
 * patch-browser.js -- Patch Library / Browser Modal
 * ====================================================
 * Provides a self-contained modal UI for importing, storing, searching,
 * sorting, and loading ZOIA .bin patch files.  The library is persisted
 * to localStorage so patches survive page reloads.
 *
 * Architecture:
 *   - Wrapped in an IIFE to keep internal state private.
 *   - Public API is exposed via window.ZOIA.patchBrowser.
 *   - On load, the module reads localStorage, injects a "Library"
 *     toolbar button, and is ready for use.
 *
 * Features:
 *   - Drag-and-drop or file-picker import (single files or folders)
 *   - Lightweight binary metadata extraction (name, module count,
 *     connections, pages, categories) without full module resolution
 *   - Full-text search across patch name, categories, and page names
 *   - Sort by name / date-added / module count
 *   - Catalog export (JSON) and catalog import (JSON) for sharing
 *     entire libraries between browsers
 *   - Duplicate detection by name + file size
 *
 * Depends on: ZOIA.log, ZOIA.MODULE_DB, ZOIA.parsePatch, ZOIA.loadPatch
 *
 * ES5 compatible -- no arrow functions, no template literals, no let/const.
 *
 * @namespace ZOIA.patchBrowser
 */
window.ZOIA = window.ZOIA || {};

(function() {
  "use strict";

  /* ================================================================
   * Storage
   * ================================================================ */

  /** localStorage key for the serialised library array. */
  var STORAGE_KEY = 'zoia_patch_library';

  /* ================================================================
   * Library State
   * ================================================================ */

  /**
   * In-memory library.  Each entry:
   * { id, name, moduleCount, connCount, pageCount, pages,
   *   categories, size, addedAt, binBase64 }
   */
  var library = [];

  /** Current search/filter text (lowercased for comparison). */
  var filterText = '';

  /** Active sort field: 'name', 'date', or 'modules'. */
  var sortField = 'name';

  /** Sort direction: true = ascending. */
  var sortAsc = true;

  /**
   * Active category filters.  Keys are category names, values are booleans.
   * When empty (or all false), no category filtering is applied (show all).
   */
  var activeCategories = {};

  /* ================================================================
   * DOM Element References (populated on first open)
   * ================================================================ */

  var modal = null;
  var overlay = null;
  var searchInput = null;
  var listContainer = null;
  var dropZone = null;
  var importInput = null;
  var countLabel = null;
  var sortBtn = null;
  var categoryBar = null;

  /* ================================================================
   * Utility Functions
   * ================================================================ */

  /** Generate a short, collision-resistant unique ID. */
  function uid() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  /** Format a byte count as a human-readable string (B / KB / MB). */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** Format a timestamp as a compact "M/D HH:MM" string. */
  function formatDate(ts) {
    var d = new Date(ts);
    var mon = d.getMonth() + 1;
    var day = d.getDate();
    var h = d.getHours();
    var m = d.getMinutes();
    return mon + '/' + day + ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /** Convert an ArrayBuffer to a base64 string for JSON storage. */
  function bufToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /** Convert a base64 string back to an ArrayBuffer. */
  function base64ToBuf(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /** Escape a string for safe insertion into innerHTML. */
  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  /* ================================================================
   * Metadata Extraction
   * ================================================================ */

  /**
   * Extract lightweight metadata from a raw .bin ArrayBuffer without
   * performing full module resolution.  Walks the binary structure:
   *
   *   [4] presetSize
   *   [16] name (ASCII, null-padded)
   *   [4] moduleCount
   *   For each module:
   *     [4] modSize (in uint32 units)
   *     [4] typeIdx  -- used for category lookup in MODULE_DB
   *     [...] remaining module data (skipped via modSize)
   *   [4] connCount
   *   [connCount * 5 * 4] connection data (skipped)
   *   [4] pageCount
   *   For each page:
   *     [16] pageName (ASCII, null-padded)
   *
   * @param  {ArrayBuffer} buf - Raw .bin file contents
   * @return {Object}          - { name, moduleCount, connCount,
   *                               pageCount, pages, categories }
   */
  function extractMeta(buf) {
    var dv = new DataView(buf);
    var off = 0;

    /** Read a little-endian uint32 and advance the offset. */
    function r32() { var v = dv.getUint32(off, true); off += 4; return v; }

    /** Read a fixed-length ASCII string, keeping only printable chars. */
    function rStr(len) {
      var s = '';
      for (var i = 0; i < len; i++) {
        var c = dv.getUint8(off + i);
        if (c >= 32 && c <= 126) s += String.fromCharCode(c);
      }
      off += len;
      return s.trim();
    }

    var presetSize = r32();
    var name = rStr(16);
    var moduleCount = r32();

    /* Walk each module to collect category counts (skip body data) */
    var categories = {};
    for (var i = 0; i < moduleCount; i++) {
      var modStart = off;
      var modSize = r32();
      var typeIdx = r32();

      /* Look up category from the module database */
      var dbEntry = ZOIA.MODULE_DB ? ZOIA.MODULE_DB[typeIdx] : null;
      if (dbEntry && dbEntry.cat) {
        categories[dbEntry.cat] = (categories[dbEntry.cat] || 0) + 1;
      }

      /* Jump past the rest of this module (modSize is in uint32 units) */
      var expectedEnd = modStart + modSize * 4;
      off = expectedEnd;
    }

    /* Read connection count and skip all connection data */
    var connCount = 0;
    var pageCount = 1;
    var pages = ['Page 1'];
    try {
      connCount = r32();
      off += connCount * 5 * 4; // each connection: 5 x uint32

      /* Read page count and page name strings */
      pageCount = r32();
      if (pageCount > 0 && pageCount <= 64) {
        pages = [];
        for (var k = 0; k < pageCount; k++) {
          pages.push(rStr(16) || ('Page ' + (k + 1)));
        }
      } else {
        pageCount = 1;
      }
    } catch (e) {
      /* Some patches may not have pages section -- keep defaults */
    }

    var catList = Object.keys(categories).sort();

    return {
      name: name || 'Unnamed',
      moduleCount: moduleCount,
      connCount: connCount,
      pageCount: pageCount,
      pages: pages,
      categories: catList
    };
  }

  /* ================================================================
   * Persistence (localStorage)
   * ================================================================ */

  /** Serialise the library array and write it to localStorage. */
  function saveLibrary() {
    try {
      var data = JSON.stringify(library);
      localStorage.setItem(STORAGE_KEY, data);
      ZOIA.log('Patch library saved (' + library.length + ' patches, ' + (data.length / 1024).toFixed(1) + ' KB)');
    } catch (e) {
      ZOIA.log('WARNING: Could not save library to localStorage: ' + e.message);
    }
  }

  /** Load the library array from localStorage (if present). */
  function loadLibrary() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        library = JSON.parse(raw);
        ZOIA.log('Loaded patch library from storage: ' + library.length + ' patches');
      }
    } catch (e) {
      ZOIA.log('WARNING: Could not load library from localStorage: ' + e.message);
      library = [];
    }
  }

  /* ================================================================
   * Import Logic
   * ================================================================ */

  /**
   * Import a single .bin File object into the library.
   * Reads the file as an ArrayBuffer, extracts metadata, checks for
   * duplicates (by name + byte size), and appends to the library.
   *
   * @param {File}     file     - The .bin file to import
   * @param {Function} callback - Called with the new entry, or null
   */
  function importFile(file, callback) {
    if (!file || !file.name) {
      if (callback) callback(null);
      return;
    }

    /* Reject non-.bin files early */
    var ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'bin') {
      ZOIA.log('Skipping non-.bin file: ' + file.name);
      if (callback) callback(null);
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      var buf = e.target.result;
      try {
        var meta = extractMeta(buf);

        /* Duplicate check: same name AND same byte size */
        var isDup = false;
        for (var i = 0; i < library.length; i++) {
          if (library[i].name === meta.name && library[i].size === buf.byteLength) {
            isDup = true;
            break;
          }
        }
        if (isDup) {
          ZOIA.log('Skipping duplicate patch: "' + meta.name + '"');
          if (callback) callback(null);
          return;
        }

        var entry = {
          id: uid(),
          name: meta.name,
          moduleCount: meta.moduleCount,
          connCount: meta.connCount,
          pageCount: meta.pageCount,
          pages: meta.pages,
          categories: meta.categories,
          size: buf.byteLength,
          addedAt: Date.now(),
          binBase64: bufToBase64(buf)
        };

        library.push(entry);
        ZOIA.log('Imported patch: "' + entry.name + '" (' + entry.moduleCount + ' modules, ' + formatSize(entry.size) + ')');
        if (callback) callback(entry);
      } catch (err) {
        ZOIA.log('ERROR importing "' + file.name + '": ' + err.message);
        if (callback) callback(null);
      }
    };
    reader.onerror = function() {
      ZOIA.log('ERROR reading file: ' + file.name);
      if (callback) callback(null);
    };
    reader.readAsArrayBuffer(file);
  }

  /**
   * Import an array-like FileList sequentially, then save and refresh.
   * If the file list contains .json sidecar files (from PatchStorage /
   * ZOIA Librarian), they are parsed and matched to .bin files by
   * filename stem to enrich library entries with tags, author, excerpt,
   * and PatchStorage categories.
   *
   * @param {FileList|Array} fileList - Files to import
   */
  function importFiles(fileList) {
    var files = [];
    var jsonFiles = [];
    for (var i = 0; i < fileList.length; i++) {
      var fname = fileList[i].name.toLowerCase();
      if (fname.endsWith('.bin')) {
        files.push(fileList[i]);
      } else if (fname.endsWith('.json')) {
        jsonFiles.push(fileList[i]);
      }
    }
    if (files.length === 0) return;

    var imported = 0;
    var idx = 0;
    var total = files.length;

    /* --- Show progress indicator in the drop zone --- */
    var progressEl = null;
    if (dropZone) {
      progressEl = document.createElement('div');
      progressEl.className = 'pb-import-progress';
      progressEl.innerHTML =
        '<div class="pb-progress-text" id="pb-progress-text">Importing 0 of ' + total + '...</div>' +
        '<div class="pb-progress-bar-track">' +
          '<div class="pb-progress-bar-fill" id="pb-progress-fill" style="width:0%"></div>' +
        '</div>';
      dropZone.appendChild(progressEl);
    }

    function updateProgress() {
      if (!progressEl) return;
      var pct = total > 0 ? Math.round((idx / total) * 100) : 0;
      var textEl = document.getElementById('pb-progress-text');
      var fillEl = document.getElementById('pb-progress-fill');
      if (textEl) textEl.textContent = 'Importing ' + idx + ' of ' + total + '...';
      if (fillEl) fillEl.style.width = pct + '%';
    }

    function removeProgress() {
      if (progressEl && progressEl.parentNode) {
        progressEl.parentNode.removeChild(progressEl);
      }
      progressEl = null;
    }

    /**
     * Build a lookup map from JSON sidecar filename stems to parsed
     * PatchStorage metadata, then begin the .bin import loop.
     */
    var sidecarMap = {};

    function parseSidecars(jIdx) {
      if (jIdx >= jsonFiles.length) {
        /* All sidecars parsed, begin .bin import */
        if (Object.keys(sidecarMap).length > 0) {
          ZOIA.log('Loaded ' + Object.keys(sidecarMap).length + ' JSON sidecar(s) for metadata enrichment');
        }
        next();
        return;
      }
      var jf = jsonFiles[jIdx];
      var jr = new FileReader();
      jr.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          /* Build keys to match against .bin files:
             - By JSON filename stem (e.g. "105188.json" -> "105188")
             - By the .bin filename inside the JSON (e.g. "000_zoia_Duck_Friends.bin" -> "000_zoia_duck_friends")
             - By directory name (the JSON's webkitRelativePath parent) */
          var stem = jf.name.replace(/\.json$/i, '').toLowerCase();
          sidecarMap[stem] = data;
          if (data.files && data.files[0] && data.files[0].filename) {
            var binStem = data.files[0].filename.replace(/\.bin$/i, '').toLowerCase();
            sidecarMap[binStem] = data;
          }
          if (data.title) {
            sidecarMap[data.title.toLowerCase()] = data;
          }
          /* Also match by directory parent path */
          if (jf.webkitRelativePath) {
            var parts = jf.webkitRelativePath.split('/');
            if (parts.length >= 2) {
              sidecarMap[parts[parts.length - 2].toLowerCase()] = data;
            }
          }
        } catch (e) { /* ignore non-PatchStorage JSON */ }
        parseSidecars(jIdx + 1);
      };
      jr.onerror = function() { parseSidecars(jIdx + 1); };
      jr.readAsText(jf);
    }

    /**
     * Look up sidecar metadata for a given .bin File object.
     * Tries matching by filename stem, parent directory, and patch name.
     */
    function findSidecar(binFile, patchName) {
      var stem = binFile.name.replace(/\.bin$/i, '').toLowerCase();
      if (sidecarMap[stem]) return sidecarMap[stem];
      /* Try parent directory (e.g. "105188/105188.bin" -> dir "105188") */
      if (binFile.webkitRelativePath) {
        var parts = binFile.webkitRelativePath.split('/');
        if (parts.length >= 2) {
          var dir = parts[parts.length - 2].toLowerCase();
          if (sidecarMap[dir]) return sidecarMap[dir];
        }
      }
      /* Try patch name from binary header */
      if (patchName && sidecarMap[patchName.toLowerCase()]) {
        return sidecarMap[patchName.toLowerCase()];
      }
      return null;
    }

    function next() {
      if (idx >= files.length) {
        if (imported > 0) {
          saveLibrary();
        }
        /* Final progress update before removal */
        if (progressEl) {
          var textEl = document.getElementById('pb-progress-text');
          var fillEl = document.getElementById('pb-progress-fill');
          if (textEl) textEl.textContent = 'Done! ' + imported + ' of ' + total + ' patches added.';
          if (fillEl) fillEl.style.width = '100%';
          setTimeout(removeProgress, 1200);
        }
        ZOIA.log('Import complete: ' + imported + ' of ' + files.length + ' patches added');
        renderList();
        return;
      }
      var f = files[idx];
      idx++;
      updateProgress();
      importFile(f, function(entry) {
        if (entry) {
          /* Enrich with sidecar metadata if available */
          var sc = findSidecar(f, entry.name);
          if (sc) {
            if (sc.tags && sc.tags.length) {
              entry.tags = sc.tags.map(function(t) { return t.name || t; });
            }
            if (sc.author && sc.author.name) {
              entry.author = sc.author.name;
            }
            if (sc.excerpt) {
              entry.excerpt = sc.excerpt;
            }
            if (sc.categories && sc.categories.length) {
              /* Merge PatchStorage categories with module-derived categories */
              var psCats = sc.categories.map(function(c) { return c.name || c; });
              for (var ci = 0; ci < psCats.length; ci++) {
                if (entry.categories.indexOf(psCats[ci]) < 0) {
                  entry.categories.push(psCats[ci]);
                }
              }
            }
            if (sc.like_count) entry.likes = sc.like_count;
            if (sc.download_count) entry.downloads = sc.download_count;
          }
          imported++;
        }
        next();
      });
    }

    /* Start by parsing JSON sidecars, then import .bin files */
    parseSidecars(0);
  }

  /* ================================================================
   * Loading / Deleting Entries
   * ================================================================ */

  /**
   * Load a library entry into the simulator.  Decodes the base64 bin
   * back to an ArrayBuffer, parses it, and passes the result to
   * ZOIA.loadPatch.
   *
   * @param {Object} entry - A library entry with .binBase64
   */
  function loadEntry(entry) {
    try {
      var buf = base64ToBuf(entry.binBase64);
      var patch = ZOIA.parsePatch(buf);
      if (!patch.name || patch.name.length === 0) {
        patch.name = entry.name || entry.filename || 'patch';
        ZOIA.log('Patch name empty; using library entry fallback: "' + patch.name + '"');
      }
      ZOIA.loadPatch(patch);
      closeModal();
      ZOIA.log('Loaded patch from library: "' + entry.name + '"');
    } catch (err) {
      ZOIA.log('ERROR loading patch "' + entry.name + '": ' + err.message);
      alert('Error loading patch: ' + err.message);
    }
  }

  /**
   * Remove a single entry from the library by ID.
   *
   * @param {string} id - Unique entry ID
   */
  function deleteEntry(id) {
    for (var i = 0; i < library.length; i++) {
      if (library[i].id === id) {
        ZOIA.log('Removed patch from library: "' + library[i].name + '"');
        library.splice(i, 1);
        break;
      }
    }
    saveLibrary();
    renderList();
  }

  /**
   * Clear the entire library after user confirmation.
   * Uses inline confirmation UI because confirm() is blocked in sandbox.
   */
  function clearLibrary() {
    if (library.length === 0) return;
    if (!listContainer) return;

    /* Show inline confirmation inside the list area */
    listContainer.innerHTML =
      '<div class="pb-empty">' +
        '<div class="pb-empty-icon">&#9888;</div>' +
        '<div class="pb-empty-title">Remove all ' + library.length + ' patch' + (library.length !== 1 ? 'es' : '') + ' from the library?</div>' +
        '<div style="margin-top:12px;display:flex;gap:10px;justify-content:center">' +
          '<button id="pb-clear-yes" style="background:#e94560;color:#fff;border:none;border-radius:4px;padding:6px 20px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600">Yes, Clear All</button>' +
          '<button id="pb-clear-no" style="background:#333;color:#aaa;border:1px solid #555;border-radius:4px;padding:6px 20px;font-size:12px;cursor:pointer;font-family:inherit">Cancel</button>' +
        '</div>' +
      '</div>';

    var yesBtn = document.getElementById('pb-clear-yes');
    var noBtn = document.getElementById('pb-clear-no');
    if (yesBtn) {
      yesBtn.onclick = function() {
        library.length = 0;
        saveLibrary();
        renderList();
        ZOIA.log('Patch library cleared');
      };
    }
    if (noBtn) {
      noBtn.onclick = function() {
        renderList();
      };
    }
  }

  /* ================================================================
   * Filtering and Sorting
   * ================================================================ */

  /**
   * Return the library array filtered by the current search text and
   * sorted by the current sort field/direction.
   *
   * Search matches against: patch name, category names, page names.
   *
   * @return {Array} Filtered and sorted entries
   */
  function getFilteredList() {
    var filtered = [];
    var q = filterText.toLowerCase();

    /* Determine if any category filters are active */
    var catFilterActive = false;
    var catFilterKeys = Object.keys(activeCategories);
    for (var ci = 0; ci < catFilterKeys.length; ci++) {
      if (activeCategories[catFilterKeys[ci]]) {
        catFilterActive = true;
        break;
      }
    }

    for (var i = 0; i < library.length; i++) {
      var entry = library[i];

      /* --- Category filter gate --- */
      if (catFilterActive) {
        var hasCat = false;
        for (var cc = 0; cc < entry.categories.length; cc++) {
          if (activeCategories[entry.categories[cc]]) {
            hasCat = true;
            break;
          }
        }
        if (!hasCat) continue;
      }

      /* --- Text search filter --- */
      if (q.length === 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against patch name */
      if (entry.name.toLowerCase().indexOf(q) >= 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against category names */
      var catMatch = false;
      for (var c = 0; c < entry.categories.length; c++) {
        if (entry.categories[c].toLowerCase().indexOf(q) >= 0) {
          catMatch = true;
          break;
        }
      }
      if (catMatch) {
        filtered.push(entry);
        continue;
      }

      /* Match against tags */
      if (entry.tags) {
        var tagMatch = false;
        for (var tg = 0; tg < entry.tags.length; tg++) {
          if (entry.tags[tg].toLowerCase().indexOf(q) >= 0) {
            tagMatch = true;
            break;
          }
        }
        if (tagMatch) { filtered.push(entry); continue; }
      }

      /* Match against author */
      if (entry.author && entry.author.toLowerCase().indexOf(q) >= 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against excerpt */
      if (entry.excerpt && entry.excerpt.toLowerCase().indexOf(q) >= 0) {
        filtered.push(entry);
        continue;
      }

      /* Match against page names */
      if (entry.pages) {
        var pageMatch = false;
        for (var p = 0; p < entry.pages.length; p++) {
          if (entry.pages[p].toLowerCase().indexOf(q) >= 0) {
            pageMatch = true;
            break;
          }
        }
        if (pageMatch) filtered.push(entry);
      }
    }

    /* Apply sort */
    filtered.sort(function(a, b) {
      var va, vb;
      if (sortField === 'name') {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
        return sortAsc ? (va < vb ? -1 : va > vb ? 1 : 0) : (vb < va ? -1 : vb > va ? 1 : 0);
      } else if (sortField === 'date') {
        va = a.addedAt;
        vb = b.addedAt;
      } else if (sortField === 'modules') {
        va = a.moduleCount;
        vb = b.moduleCount;
      } else {
        va = 0; vb = 0;
      }
      return sortAsc ? va - vb : vb - va;
    });

    return filtered;
  }

  /* ================================================================
   * UI Rendering
   * ================================================================ */

  /**
   * Collect all unique category names from the library and rebuild the
   * category filter checkbox bar.  Called from renderList() so it stays
   * in sync whenever the library changes.
   */
  function buildCategoryFilters() {
    if (!categoryBar) return;

    /* Collect unique categories across the whole library */
    var catSet = {};
    for (var i = 0; i < library.length; i++) {
      var cats = library[i].categories;
      for (var c = 0; c < cats.length; c++) {
        catSet[cats[c]] = true;
      }
    }
    var catNames = Object.keys(catSet).sort();

    /* If no categories exist, hide the bar */
    if (catNames.length === 0) {
      categoryBar.style.display = 'none';
      return;
    }
    categoryBar.style.display = '';

    /* Determine if any filter is active */
    var anyActive = false;
    for (var k in activeCategories) {
      if (activeCategories[k]) { anyActive = true; break; }
    }

    /* Build checkbox HTML */
    var html = '<span class="pb-catbar-label">Filter:</span>';
    html +=
      '<label class="pb-catbar-item' + (!anyActive ? ' pb-catbar-active' : '') + '">' +
        '<input type="checkbox" class="pb-catbar-cb" data-cat="__all__"' + (!anyActive ? ' checked' : '') + '> All' +
      '</label>';
    for (var j = 0; j < catNames.length; j++) {
      var name = catNames[j];
      var checked = activeCategories[name] ? true : false;
      html +=
        '<label class="pb-catbar-item' + (checked ? ' pb-catbar-active' : '') + '">' +
          '<input type="checkbox" class="pb-catbar-cb" data-cat="' + esc(name) + '"' + (checked ? ' checked' : '') + '> ' + esc(name) +
        '</label>';
    }
    categoryBar.innerHTML = html;
  }

  /** Re-render the patch list inside the modal. */
  function renderList() {
    if (!listContainer) return;

    /* Update the count label */
    if (countLabel) {
      countLabel.textContent = library.length + ' patch' + (library.length !== 1 ? 'es' : '') + ' in library';
    }

    /* Rebuild category filter bar from current library data */
    buildCategoryFilters();

    var items = getFilteredList();

    /* Empty state: no patches at all */
    if (library.length === 0) {
      listContainer.innerHTML =
        '<div class="pb-empty">' +
          '<div class="pb-empty-icon">&#127925;</div>' +
          '<div class="pb-empty-title">No patches in library</div>' +
          '<div class="pb-empty-text">Drop .bin files above or click "Import Files" to add patches.</div>' +
        '</div>';
      return;
    }

    /* Empty state: no search/filter matches */
    if (items.length === 0) {
      var noMatchMsg = 'No patches match the current filters';
      if (filterText) {
        noMatchMsg = 'No patches match "' + esc(filterText) + '"';
      }
      listContainer.innerHTML =
        '<div class="pb-empty">' +
          '<div class="pb-empty-text">' + noMatchMsg + '</div>' +
        '</div>';
      return;
    }

    /* Build the list HTML */
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      var catBadges = '';
      for (var c = 0; c < e.categories.length; c++) {
        catBadges += '<span class="pb-cat-badge">' + esc(e.categories[c]) + '</span>';
      }

      /* Build tag badges */
      var tagBadges = '';
      if (e.tags && e.tags.length) {
        for (var t = 0; t < e.tags.length; t++) {
          tagBadges += '<span class="pb-tag-badge">' + esc(e.tags[t]) + '</span>';
        }
      }

      /* Author line */
      var authorHtml = '';
      if (e.author) {
        authorHtml = '<span class="pb-meta-author">by ' + esc(e.author) + '</span>';
      }

      /* Excerpt / description line */
      var excerptHtml = '';
      if (e.excerpt) {
        var short = e.excerpt.length > 80 ? e.excerpt.substring(0, 80) + '...' : e.excerpt;
        excerptHtml = '<div class="pb-item-excerpt">' + esc(short) + '</div>';
      }

      html +=
        '<div class="pb-item" data-id="' + e.id + '">' +
          '<div class="pb-item-main">' +
            '<div class="pb-item-name">' + esc(e.name) + authorHtml + '</div>' +
            '<div class="pb-item-meta">' +
              '<span class="pb-meta-stat">' + e.moduleCount + ' modules</span>' +
              '<span class="pb-meta-sep">|</span>' +
              '<span class="pb-meta-stat">' + e.connCount + ' connections</span>' +
              '<span class="pb-meta-sep">|</span>' +
              '<span class="pb-meta-stat">' + e.pageCount + ' pg</span>' +
              '<span class="pb-meta-sep">|</span>' +
              '<span class="pb-meta-stat">' + formatSize(e.size) + '</span>' +
              (e.downloads ? '<span class="pb-meta-sep">|</span><span class="pb-meta-stat">' + e.downloads + ' DL</span>' : '') +
              (e.likes ? '<span class="pb-meta-sep">|</span><span class="pb-meta-stat">' + e.likes + ' &hearts;</span>' : '') +
            '</div>' +
            excerptHtml +
            '<div class="pb-item-cats">' + catBadges + tagBadges + '</div>' +
          '</div>' +
          '<div class="pb-item-actions">' +
            '<button class="pb-btn-load" data-id="' + e.id + '" title="Load this patch">Load</button>' +
            '<button class="pb-btn-del" data-id="' + e.id + '" title="Remove from library">&times;</button>' +
          '</div>' +
        '</div>';
    }

    listContainer.innerHTML = html;
    /* Click handlers are managed via event delegation on listContainer
       (set up once in buildModal). */
  }

  /* ================================================================
   * Modal Construction
   * ================================================================ */

  /** Build the modal DOM, attach all event listeners, inject styles. */
  function buildModal() {

    /* --- Overlay --- */
    overlay = document.createElement('div');
    overlay.id = 'pb-overlay';
    overlay.className = 'pb-overlay';
    overlay.onclick = function() { closeModal(); };
    document.body.appendChild(overlay);

    /* --- Modal container --- */
    modal = document.createElement('div');
    modal.id = 'pb-modal';
    modal.className = 'pb-modal';

    modal.innerHTML =
      '<div class="pb-header">' +
        '<div class="pb-title">Patch Library</div>' +
        '<span class="pb-close" id="pb-close-btn" title="Close">&times;</span>' +
      '</div>' +
      '<div class="pb-drop-zone" id="pb-drop-zone">' +
        '<div class="pb-drop-icon">&#128229;</div>' +
        '<div class="pb-drop-text">Drop .bin files here to import</div>' +
        '<div class="pb-drop-sub">or</div>' +
        '<div style="display:flex;gap:8px;justify-content:center">' +
          '<button class="pb-import-btn" id="pb-import-btn">Import Files</button>' +
          '<button class="pb-import-btn" id="pb-import-dir-btn">Import Folder</button>' +
        '</div>' +
        '<input type="file" id="pb-import-input" accept=".bin,.json" multiple style="display:none">' +
        '<input type="file" id="pb-import-dir-input" webkitdirectory directory multiple style="display:none">' +
      '</div>' +
      '<div class="pb-toolbar">' +
        '<input type="text" class="pb-search" id="pb-search" placeholder="Search patches...">' +
        '<div class="pb-sort-group">' +
          '<button class="pb-sort-btn" id="pb-sort-btn" title="Change sort">Name &#9650;</button>' +
        '</div>' +
        '<span class="pb-count" id="pb-count"></span>' +
        '<button class="pb-export-btn" id="pb-export-cat-btn" title="Export catalog as JSON file" style="background:none;border:1px solid #446;color:#88a;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;white-space:nowrap">Export</button>' +
        '<button class="pb-import-cat-btn" id="pb-import-cat-btn" title="Import catalog from JSON file" style="background:none;border:1px solid #446;color:#88a;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;white-space:nowrap">Import Cat</button>' +
        '<input type="file" id="pb-import-cat-input" accept=".json" style="display:none">' +
        '<button class="pb-clear-btn" id="pb-clear-btn" title="Clear library">Clear All</button>' +
      '</div>' +
      '<div class="pb-category-bar" id="pb-category-bar"></div>' +
      '<div class="pb-list" id="pb-list"></div>';

    document.body.appendChild(modal);

    /* --- Cache DOM element references --- */
    searchInput = document.getElementById('pb-search');
    listContainer = document.getElementById('pb-list');
    dropZone = document.getElementById('pb-drop-zone');
    importInput = document.getElementById('pb-import-input');
    countLabel = document.getElementById('pb-count');
    sortBtn = document.getElementById('pb-sort-btn');
    categoryBar = document.getElementById('pb-category-bar');

    /* --- Category bar: event delegation for checkbox changes --- */
    categoryBar.onchange = function(ev) {
      var target = ev.target;
      if (!target || !target.classList.contains('pb-catbar-cb')) return;
      var cat = target.getAttribute('data-cat');

      if (cat === '__all__') {
        /* "All" was clicked -- clear all category filters */
        activeCategories = {};
      } else {
        /* Toggle this category */
        activeCategories[cat] = target.checked;

        /* If nothing is checked after this toggle, reset to show all */
        var anyOn = false;
        for (var k in activeCategories) {
          if (activeCategories[k]) { anyOn = true; break; }
        }
        if (!anyOn) activeCategories = {};
      }
      renderList();
    };

    /* --- Header: close button --- */
    document.getElementById('pb-close-btn').onclick = function() { closeModal(); };

    /* --- Import: file picker --- */
    document.getElementById('pb-import-btn').onclick = function(ev) {
      ev.stopPropagation();
      importInput.click();
    };

    /* --- Import: folder picker --- */
    var importDirBtn = document.getElementById('pb-import-dir-btn');
    var importDirInput = document.getElementById('pb-import-dir-input');
    if (importDirBtn && importDirInput) {
      importDirBtn.onclick = function(ev) {
        ev.stopPropagation();
        importDirInput.click();
      };
      importDirInput.onchange = function() {
        if (this.files && this.files.length > 0) {
          /* Filter the directory listing to .bin and .json files */
          var relevantFiles = [];
          var binCount = 0;
          var jsonCount = 0;
          for (var i = 0; i < this.files.length; i++) {
            var fn = this.files[i].name.toLowerCase();
            if (fn.endsWith('.bin')) {
              relevantFiles.push(this.files[i]);
              binCount++;
            } else if (fn.endsWith('.json')) {
              relevantFiles.push(this.files[i]);
              jsonCount++;
            }
          }
          ZOIA.log('Directory import: found ' + binCount + ' .bin + ' + jsonCount + ' .json files out of ' + this.files.length + ' total');
          if (binCount > 0) {
            importFiles(relevantFiles);
          } else {
            ZOIA.log('No .bin files found in selected folder');
          }
          this.value = '';
        }
      };
    }

    /* --- Import: file input change --- */
    importInput.onchange = function() {
      if (this.files && this.files.length > 0) {
        importFiles(this.files);
        this.value = '';
      }
    };

    /* --- Search input --- */
    searchInput.oninput = function() {
      filterText = this.value;
      renderList();
    };

    /* --- Sort button: cycles Name/Date/Modules, asc/desc --- */
    sortBtn.onclick = function() {
      if (sortField === 'name' && sortAsc) { sortAsc = false; }
      else if (sortField === 'name' && !sortAsc) { sortField = 'date'; sortAsc = false; }
      else if (sortField === 'date' && !sortAsc) { sortAsc = true; }
      else if (sortField === 'date' && sortAsc) { sortField = 'modules'; sortAsc = false; }
      else if (sortField === 'modules' && !sortAsc) { sortAsc = true; }
      else { sortField = 'name'; sortAsc = true; }

      var labels = { name: 'Name', date: 'Date', modules: 'Modules' };
      sortBtn.innerHTML = labels[sortField] + ' ' + (sortAsc ? '&#9650;' : '&#9660;');
      renderList();
    };

    /* --- Catalog Export: download library as JSON --- */
    document.getElementById('pb-export-cat-btn').onclick = function() {
      if (library.length === 0) { ZOIA.log('Nothing to export'); return; }
      var json = JSON.stringify(library, null, 2);
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'zoia_patch_catalog.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        ZOIA.log('Exported catalog (' + library.length + ' patches)');
      } catch(e) {
        ZOIA.log('Export failed: ' + e.message);
      }
    };

    /* --- Catalog Import: read JSON file and merge entries --- */
    var importCatInput = document.getElementById('pb-import-cat-input');
    document.getElementById('pb-import-cat-btn').onclick = function() { importCatInput.click(); };
    importCatInput.onchange = function() {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error('Invalid catalog format');
          var added = 0;
          for (var i = 0; i < imported.length; i++) {
            var entry = imported[i];
            if (!entry.id || !entry.name || !entry.binBase64) continue;
            /* Duplicate check: same name + same byte size */
            var isDup = false;
            for (var j = 0; j < library.length; j++) {
              if (library[j].name === entry.name && library[j].size === entry.size) { isDup = true; break; }
            }
            if (!isDup) { library.push(entry); added++; }
          }
          if (added > 0) saveLibrary();
          ZOIA.log('Imported catalog: ' + added + ' new patches from ' + imported.length + ' total');
          renderList();
        } catch(err) {
          ZOIA.log('Catalog import error: ' + err.message);
        }
      };
      reader.readAsText(file);
      this.value = '';
    };

    /* --- Clear All button --- */
    document.getElementById('pb-clear-btn').onclick = function() { clearLibrary(); };

    /* --- Drop zone drag events --- */
    dropZone.ondragover = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dropZone.classList.add('pb-drop-active');
    };
    dropZone.ondragleave = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dropZone.classList.remove('pb-drop-active');
    };
    dropZone.ondrop = function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dropZone.classList.remove('pb-drop-active');
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
        importFiles(ev.dataTransfer.files);
      }
    };

    /* --- Event delegation for list items (Load / Delete / Row click) --- */
    listContainer.onclick = function(ev) {
      var target = ev.target;

      /* Load button */
      if (target.classList.contains('pb-btn-load')) {
        var loadId = target.getAttribute('data-id');
        for (var i = 0; i < library.length; i++) {
          if (library[i].id === loadId) {
            loadEntry(library[i]);
            return;
          }
        }
        return;
      }

      /* Delete button */
      if (target.classList.contains('pb-btn-del')) {
        var delId = target.getAttribute('data-id');
        deleteEntry(delId);
        return;
      }

      /* Click on row body -> load the patch */
      var row = target.closest ? target.closest('.pb-item') : null;
      /* Fallback for browsers without .closest */
      if (!row) {
        var el = target;
        while (el && el !== listContainer) {
          if (el.classList && el.classList.contains('pb-item')) { row = el; break; }
          el = el.parentNode;
        }
      }
      if (row) {
        var rowId = row.getAttribute('data-id');
        for (var j = 0; j < library.length; j++) {
          if (library[j].id === rowId) {
            loadEntry(library[j]);
            return;
          }
        }
      }
    };

    /* Inject the modal stylesheet */
    injectStyles();
  }

  /* ================================================================
   * Injected Styles
   * ================================================================ */

  /** Inject a <style> element with all patch-browser CSS rules. */
  function injectStyles() {
    var css =
      /* Overlay */
      '.pb-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:900; }' +
      '.pb-overlay.visible { display:block; }' +

      /* Modal */
      '.pb-modal { display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:620px; max-width:90vw; max-height:85vh; background:#1a1a2e; border:1px solid #444; border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.7); z-index:950; flex-direction:column; overflow:hidden; font-family:"Segoe UI",system-ui,sans-serif; }' +
      '.pb-modal.visible { display:flex; }' +

      /* Header */
      '.pb-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #333; flex-shrink:0; }' +
      '.pb-title { font-size:16px; font-weight:700; color:#e94560; letter-spacing:1px; text-transform:uppercase; }' +
      '.pb-close { font-size:20px; color:#666; cursor:pointer; padding:0 4px; line-height:1; }' +
      '.pb-close:hover { color:#eee; }' +

      /* Drop zone */
      '.pb-drop-zone { margin:12px 16px 8px; padding:20px; border:2px dashed #444; border-radius:6px; text-align:center; transition:all 0.2s; flex-shrink:0; }' +
      '.pb-drop-zone.pb-drop-active { border-color:#2979FF; background:rgba(41,121,255,0.1); }' +
      '.pb-drop-icon { font-size:28px; margin-bottom:4px; }' +
      '.pb-drop-text { font-size:13px; color:#aaa; }' +
      '.pb-drop-sub { font-size:11px; color:#555; margin:6px 0; }' +
      '.pb-import-btn { background:#2a2a2a; border:1px solid #555; color:#ccc; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12px; }' +
      '.pb-import-btn:hover { background:#3a3a3a; border-color:#777; }' +

      /* Toolbar */
      '.pb-toolbar { display:flex; align-items:center; gap:8px; padding:8px 16px; border-bottom:1px solid #2a2a2a; flex-shrink:0; }' +
      '.pb-search { flex:1; background:#111; border:1px solid #444; border-radius:4px; color:#eee; padding:6px 10px; font-size:12px; font-family:inherit; }' +
      '.pb-search:focus { border-color:#e94560; outline:none; }' +
      '.pb-search::placeholder { color:#555; }' +
      '.pb-sort-group { flex-shrink:0; }' +
      '.pb-sort-btn { background:#222; border:1px solid #444; color:#aaa; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px; white-space:nowrap; }' +
      '.pb-sort-btn:hover { background:#333; color:#ccc; }' +
      '.pb-count { font-size:11px; color:#555; white-space:nowrap; flex-shrink:0; }' +
      '.pb-clear-btn { background:none; border:1px solid #533; color:#a55; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px; white-space:nowrap; }' +
      '.pb-clear-btn:hover { background:rgba(255,0,0,0.1); color:#f66; border-color:#a55; }' +

      /* List container */
      '.pb-list { flex:1; overflow-y:auto; padding:8px 16px 12px; min-height:0; }' +

      /* Empty state */
      '.pb-empty { text-align:center; padding:30px 20px; }' +
      '.pb-empty-icon { font-size:32px; margin-bottom:8px; }' +
      '.pb-empty-title { font-size:14px; color:#aaa; margin-bottom:4px; }' +
      '.pb-empty-text { font-size:12px; color:#666; }' +

      /* Patch item row */
      '.pb-item { display:flex; align-items:center; padding:8px 10px; border:1px solid #2a2a2a; border-radius:5px; margin-bottom:4px; cursor:pointer; transition:all 0.12s; }' +
      '.pb-item:hover { background:rgba(233,69,96,0.08); border-color:#444; }' +
      '.pb-item-main { flex:1; min-width:0; }' +
      '.pb-item-name { font-size:13px; font-weight:600; color:#e0e0e0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.pb-item-meta { display:flex; flex-wrap:wrap; gap:0; margin-top:2px; }' +
      '.pb-meta-stat { font-size:10px; color:#777; }' +
      '.pb-meta-sep { font-size:10px; color:#333; margin:0 5px; }' +
      '.pb-item-cats { display:flex; flex-wrap:wrap; gap:3px; margin-top:3px; }' +
      '.pb-cat-badge { font-size:9px; color:#8888aa; background:rgba(136,136,170,0.12); border:1px solid rgba(136,136,170,0.2); border-radius:3px; padding:1px 5px; }' +
      '.pb-tag-badge { font-size:9px; color:#cc8844; background:rgba(204,136,68,0.12); border:1px solid rgba(204,136,68,0.25); border-radius:3px; padding:1px 5px; }' +
      '.pb-meta-author { font-size:11px; color:#888; font-weight:400; margin-left:8px; }' +
      '.pb-item-excerpt { font-size:10px; color:#666; margin-top:2px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +

      /* Item action buttons */
      '.pb-item-actions { display:flex; gap:4px; flex-shrink:0; margin-left:8px; }' +
      '.pb-btn-load { background:#0f3460; border:1px solid #2979FF; color:#7ab8ff; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; }' +
      '.pb-btn-load:hover { background:#1a4a8a; color:#aaccff; }' +
      '.pb-btn-del { background:none; border:1px solid #533; color:#a55; padding:3px 7px; border-radius:4px; cursor:pointer; font-size:14px; line-height:1; }' +
      '.pb-btn-del:hover { background:rgba(255,0,0,0.15); color:#f66; border-color:#a55; }' +

      /* Import progress indicator */
      '.pb-import-progress { margin-top:10px; }' +
      '.pb-progress-text { font-size:12px; color:#7ab8ff; margin-bottom:6px; }' +
      '.pb-progress-bar-track { width:100%; height:6px; background:#222; border-radius:3px; overflow:hidden; }' +
      '.pb-progress-bar-fill { height:100%; background:#2979FF; border-radius:3px; transition:width 0.15s ease; }' +

      /* Category filter bar */
      '.pb-category-bar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:6px 16px; border-bottom:1px solid #2a2a2a; flex-shrink:0; }' +
      '.pb-catbar-label { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:0.5px; flex-shrink:0; margin-right:2px; }' +
      '.pb-catbar-item { display:inline-flex; align-items:center; gap:3px; font-size:11px; color:#888; background:#1e1e30; border:1px solid #333; border-radius:3px; padding:2px 7px; cursor:pointer; transition:all 0.12s; user-select:none; -webkit-user-select:none; }' +
      '.pb-catbar-item:hover { border-color:#555; color:#bbb; background:#252540; }' +
      '.pb-catbar-item.pb-catbar-active { border-color:#e94560; color:#e0e0e0; background:rgba(233,69,96,0.12); }' +
      '.pb-catbar-cb { width:11px; height:11px; margin:0; cursor:pointer; accent-color:#e94560; }' +

      /* Scrollbar */
      '.pb-list::-webkit-scrollbar { width:6px; }' +
      '.pb-list::-webkit-scrollbar-track { background:#111; }' +
      '.pb-list::-webkit-scrollbar-thumb { background:#444; border-radius:3px; }' +
      '.pb-list::-webkit-scrollbar-thumb:hover { background:#666; }';

    var style = document.createElement('style');
    style.setAttribute('data-module', 'patch-browser');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ================================================================
   * Modal Open / Close
   * ================================================================ */

  /** Open the patch browser modal (builds it lazily on first open). */
  function openModal() {
    if (!modal) buildModal();
    overlay.classList.add('visible');
    modal.classList.add('visible');
    renderList();
    if (searchInput) {
      searchInput.value = filterText;
      searchInput.focus();
    }
  }

  /** Close the modal and overlay. */
  function closeModal() {
    if (overlay) overlay.classList.remove('visible');
    if (modal) modal.classList.remove('visible');
  }

  /* ================================================================
   * Global Keyboard Handler
   * ================================================================ */

  /** Escape key closes the modal when open. */
  document.addEventListener('keydown', function(ev) {
    if (ev.key === 'Escape' || ev.keyCode === 27) {
      if (modal && modal.classList.contains('visible')) {
        closeModal();
        ev.preventDefault();
      }
    }
  });

  /* ================================================================
   * Toolbar Button Injection
   * ================================================================ */

  /**
   * Inject a "Library" button into the main toolbar.  Placed after the
   * "Demo Patch" button when present, otherwise before the "Save"
   * button as a fallback.
   */
  function addToolbarButton() {
    var toolbar = document.getElementById('toolbar');
    if (!toolbar) {
      ZOIA.log('WARNING: Toolbar not found, cannot add Library button');
      return;
    }

    /* Find the Demo button to insert after */
    var btns = toolbar.querySelectorAll('.tbtn');
    var insertAfter = null;
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent.indexOf('Demo') >= 0) {
        insertAfter = btns[i];
        break;
      }
    }

    var libBtn = document.createElement('button');
    libBtn.className = 'tbtn';
    libBtn.textContent = 'Library';
    libBtn.onclick = function() { openModal(); };
    libBtn.title = 'Open patch library';

    if (insertAfter && insertAfter.nextSibling) {
      toolbar.insertBefore(libBtn, insertAfter.nextSibling);
    } else {
      /* Fallback: insert before the Save button */
      var saveBtn = null;
      for (var j = 0; j < btns.length; j++) {
        if (btns[j].textContent.indexOf('Save') >= 0) {
          saveBtn = btns[j];
          break;
        }
      }
      if (saveBtn) {
        toolbar.insertBefore(libBtn, saveBtn);
      } else {
        toolbar.appendChild(libBtn);
      }
    }
  }

  /* ================================================================
   * Public API
   * ================================================================ */

  ZOIA.patchBrowser = {
    open: openModal,
    close: closeModal,
    getLibrary: function() { return library; },
    importFiles: importFiles,
    clear: clearLibrary
  };

  /* ================================================================
   * Initialisation
   * ================================================================ */

  loadLibrary();
  addToolbarButton();
  ZOIA.log('Patch browser initialized (' + library.length + ' patches in library)');

})();

