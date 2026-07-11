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


