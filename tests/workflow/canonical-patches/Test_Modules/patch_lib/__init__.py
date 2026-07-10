"""ZOIA Patch Library — shared module database, PB class, and helpers.

Exports: MODULE_DB, IO_TYPES, V(), PB, add_test_pages

Page layout rule:
  Page 0 (Main): Audio Input, Audio Output, user controls (Stompswitch, Pushbutton, Keyboard)
  Page 1+: All DSP modules (filters, delays, reverbs, VCAs, LFOs, etc.)

Color: Aqua=5 I/O, Green=2 Audio, Blue=1 CV, Red=3 Drive, Yellow=4 Delay,
White=7 Reverb, Orange=8 EQ, Purple=12 Pitch, Magenta=6 Dynamics, Pink=13 UI
"""
import json, os

MODULE_DB = {
    0:  {"name":"SV Filter","blocks":[("audio_in","audio_in"),("frequency","cv_in"),("resonance","cv_in"),("lp_out","audio_out"),("bp_out","audio_out"),("hp_out","audio_out")],"params":[32768,0],"options":[0]*8},
    1:  {"name":"Audio Input","blocks":[("left_in","audio_out"),("right_in","audio_out")],"params":[],"options":[1,0,0,0,0,0,0,0]},
    2:  {"name":"Audio Output","blocks":[("left_out","audio_in"),("right_out","audio_in"),("gain","cv_in")],"params":[0,0,65535],"options":[1,0,0,0,0,0,0,0]},
    3:  {"name":"Aliaser","blocks":[("audio_in","audio_in"),("rate","cv_in"),("audio_out","audio_out")],"params":[0,32768,0],"options":[0]*8},
    4:  {"name":"Sequencer","blocks":[("clock","cv_in"),("reset","cv_in"),("s1","cv_in"),("s2","cv_in"),("s3","cv_in"),("s4","cv_in"),("s5","cv_in"),("s6","cv_in"),("s7","cv_in"),("s8","cv_in"),("output","cv_out"),("gate","cv_out")],"params":[32768]*8,"options":[8,0,0,0,0,0,0,0]},
    5:  {"name":"LFO","blocks":[("rate","cv_in"),("output","cv_out")],"params":[16384],"options":[0]*8},
    6:  {"name":"ADSR","blocks":[("gate","cv_in"),("attack","cv_in"),("decay","cv_in"),("sustain","cv_in"),("release","cv_in"),("output","cv_out")],"params":[6553,16384,45875,19660],"options":[0]*8},
    7:  {"name":"VCA","blocks":[("audio_in","audio_in"),("level","cv_in"),("audio_out","audio_out")],"params":[65535],"options":[0]*8},
    9:  {"name":"Bit Crusher","blocks":[("audio_in","audio_in"),("bits","cv_in"),("rate","cv_in"),("audio_out","audio_out")],"params":[0,65535,65535,0],"options":[0]*8},
    13: {"name":"Delay Line","blocks":[("audio_in","audio_in"),("time","cv_in"),("feedback","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,26214,32768,0],"options":[0]*8},
    11: {"name":"OD & Distortion","blocks":[("audio_in","audio_in"),("drive","cv_in"),("tone","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
    12: {"name":"Tone Control","blocks":[("audio_in","audio_in"),("bass","cv_in"),("mid","cv_in"),("treble","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,32768,0],"options":[0]*8},
    85: {"name":"Delay","blocks":[("audio_in","audio_in"),("time","cv_in"),("feedback","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,26214,32768,0],"options":[0]*8},
    14: {"name":"Oscillator","blocks":[("frequency","cv_in"),("audio_out","audio_out")],"params":[32768],"options":[0]*8},
    15: {"name":"Pushbutton","blocks":[("output","cv_out")],"params":[],"options":[0]*8},
    16: {"name":"Keyboard","blocks":[("note_cv","cv_out"),("gate","cv_out")],"params":[],"options":[0,2,0,0,0,0,0,0]},
    17: {"name":"CV Invert","blocks":[("input","cv_in"),("output","cv_out")],"params":[],"options":[0]*8},
    18: {"name":"Steps","blocks":[("clock","cv_in"),("reset","cv_in"),("output","cv_out"),("gate","cv_out")],"params":[32768]*8,"options":[8,0,0,0,0,0,0,0]},
    19: {"name":"Slew Limiter","blocks":[("input","cv_in"),("output","cv_out")],"params":[16384],"options":[0]*8},
    22: {"name":"Multiplier","blocks":[("input_a","cv_in"),("input_b","cv_in"),("output","cv_out")],"params":[],"options":[0]*8},
    50: {"name":"Comparator","blocks":[("input","cv_in"),("threshold","cv_in"),("output","cv_out")],"params":[32768],"options":[0]*8},
    23: {"name":"Compressor","blocks":[("audio_in","audio_in"),("threshold","cv_in"),("ratio","cv_in"),("attack","cv_in"),("release","cv_in"),("audio_out","audio_out")],"params":[0,39321,32768,6553,26214,0],"options":[0]*8},
    25: {"name":"Plate Reverb","blocks":[("audio_in","audio_in"),("decay","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
    26: {"name":"Hall Reverb","blocks":[("audio_in","audio_in"),("decay","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,45875,32768,0],"options":[0]*8},
    27: {"name":"Shimmer","blocks":[("audio_in","audio_in"),("decay","cv_in"),("pitch","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,45875,32768,32768,0],"options":[0]*8},
    28: {"name":"Flanger","blocks":[("audio_in","audio_in"),("rate","cv_in"),("depth","cv_in"),("feedback","cv_in"),("audio_out","audio_out")],"params":[0,16384,32768,26214,0],"options":[0]*8},
    29: {"name":"Chorus","blocks":[("audio_in","audio_in"),("rate","cv_in"),("depth","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,9830,19660,32768,0],"options":[0]*8},
    30: {"name":"Vibrato","blocks":[("audio_in","audio_in"),("rate","cv_in"),("depth","cv_in"),("audio_out","audio_out")],"params":[0,16384,19660,0],"options":[0]*8},
    35: {"name":"Gate","blocks":[("input","cv_in"),("threshold","cv_in"),("output","cv_out")],"params":[32768],"options":[0]*8},
    36: {"name":"Reverb","blocks":[("audio_in","audio_in"),("decay","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
    38: {"name":"Noise","blocks":[("audio_out","audio_out")],"params":[],"options":[0]*8},
    40: {"name":"Env Follower","blocks":[("audio_in","audio_in"),("sensitivity","cv_in"),("output","cv_out")],"params":[32768],"options":[0]*8},
    42: {"name":"Ring Mod","blocks":[("input_a","audio_in"),("input_b","audio_in"),("output","audio_out")],"params":[],"options":[0]*8},
    44: {"name":"Stompswitch","blocks":[("output","cv_out")],"params":[],"options":[0]*8},
    104: {"name":"CV Mixer","blocks":[("in_1","cv_in"),("in_2","cv_in"),("in_3","cv_in"),("output","cv_out")],"params":[32768,32768,32768],"options":[3,0,0,0,0,0,0,0]},
    58: {"name":"Pixel","blocks":[("cv_in","cv_in")],"params":[],"options":[0]*8},
    49: {"name":"Clock Divider","blocks":[("clock_in","cv_in"),("division","cv_in"),("output","cv_out")],"params":[16384],"options":[0]*8},
    87: {"name":"Pitch Shifter","blocks":[("audio_in","audio_in"),("pitch","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
    53: {"name":"Stereo Spread","blocks":[("audio_in","audio_in"),("width","cv_in"),("left_out","audio_out"),("right_out","audio_out")],"params":[0,32768],"options":[0]*8},
    37: {"name":"Rhythm","blocks":[("clock","cv_in"),("density","cv_in"),("output","cv_out"),("inv_output","cv_out"),("eor","cv_out")],"params":[32768],"options":[0]*8},
    57: {"name":"Audio Panner","blocks":[("audio_in","audio_in"),("pan","cv_in"),("left_out","audio_out"),("right_out","audio_out")],"params":[0,32768],"options":[0]*8},
    61: {"name":"Phaser","blocks":[("audio_in","audio_in"),("rate","cv_in"),("depth","cv_in"),("feedback","cv_in"),("audio_out","audio_out")],"params":[0,13107,32768,19660,0],"options":[0]*8},
    62: {"name":"Looper","blocks":[("audio_in","audio_in"),("record","cv_in"),("play","cv_in"),("stop","cv_in"),("audio_out","audio_out")],"params":[],"options":[0]*8},
    64: {"name":"Audio Balance","blocks":[("input_a","audio_in"),("input_b","audio_in"),("balance","cv_in"),("output","audio_out")],"params":[32768],"options":[0]*8},
    66: {"name":"Fuzz","blocks":[("audio_in","audio_in"),("gain","cv_in"),("tone","cv_in"),("audio_out","audio_out")],"params":[0,45875,32768,0],"options":[0]*8},
    67: {"name":"Ghostverb","blocks":[("audio_in","audio_in"),("decay","cv_in"),("speed","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,39321,32768,32768,0],"options":[0]*8},
    68: {"name":"Grain Delay","blocks":[("audio_in","audio_in"),("time","cv_in"),("size","cv_in"),("feedback","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,16384,19660,32768,0],"options":[0]*8},
    69: {"name":"Ping Pong","blocks":[("audio_in","audio_in"),("time","cv_in"),("feedback","cv_in"),("mix","cv_in"),("left_out","audio_out"),("right_out","audio_out")],"params":[0,32768,26214,32768],"options":[0]*8},
    71: {"name":"Tremolo","blocks":[("audio_in","audio_in"),("rate","cv_in"),("depth","cv_in"),("audio_out","audio_out")],"params":[0,16384,32768,0],"options":[0]*8},
    72: {"name":"Cabinet Sim","blocks":[("audio_in","audio_in"),("audio_out","audio_out")],"params":[],"options":[0]*8},
    73: {"name":"EQ","blocks":[("audio_in","audio_in"),("low","cv_in"),("mid","cv_in"),("high","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,32768,0],"options":[0]*8},
    76: {"name":"Audio Mixer","blocks":[("in_1","audio_in"),("lvl_1","cv_in"),("in_2","audio_in"),("lvl_2","cv_in"),("in_3","audio_in"),("lvl_3","cv_in"),("output","audio_out")],"params":[52428,52428,52428],"options":[3,0,0,0,0,0,0,0]},
    78: {"name":"Granular","blocks":[("audio_in","audio_in"),("position","cv_in"),("grain_size","cv_in"),("density","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,32768,32768,0],"options":[0]*8},
    80: {"name":"Diffuser","blocks":[("audio_in","audio_in"),("size","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
    82: {"name":"Reverb Lite","blocks":[("audio_in","audio_in"),("decay","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
     8: {"name":"Audio Multiply","blocks":[("input_a","audio_in"),("input_b","audio_in"),("output","audio_out")],"params":[],"options":[0]*8},
    86: {"name":"Delay w/Mod","blocks":[("audio_in","audio_in"),("time","cv_in"),("feedback","cv_in"),("mod_rate","cv_in"),("mod_depth","cv_in"),("mix","cv_in"),("audio_out","audio_out")],"params":[0,32768,26214,9830,13107,32768,0],"options":[0]*8},
    10: {"name":"Sample and Hold","blocks":[("trigger","cv_in"),("input","cv_in"),("output","cv_out")],"params":[],"options":[0]*8},
    70: {"name":"Quantizer","blocks":[("input","cv_in"),("output","cv_out")],"params":[],"options":[0]*8},
    39: {"name":"Random","blocks":[("trigger","cv_in"),("output","cv_out")],"params":[],"options":[0]*8},
    94: {"name":"Reverb Lite Stro","blocks":[("audio_in","audio_in"),("decay","cv_in"),("mix","cv_in"),("left_out","audio_out"),("right_out","audio_out")],"params":[0,32768,32768],"options":[0]*8},
    45: {"name":"Value","blocks":[("output","cv_out")],"params":[32768],"options":[0]*8},
    56: {"name":"UI Button","blocks":[("output","cv_out")],"params":[],"options":[0]*8},
    89: {"name":"All Pass Filter","blocks":[("audio_in","audio_in"),("frequency","cv_in"),("audio_out","audio_out")],"params":[0,32768,0],"options":[0]*8},
    91: {"name":"Env Filter","blocks":[("audio_in","audio_in"),("sensitivity","cv_in"),("Q","cv_in"),("audio_out","audio_out")],"params":[0,32768,32768,0],"options":[0]*8},
}

# I/O and user-control module types (allowed on page 0)
IO_TYPES = {1, 2, 15, 16, 44, 58, 56}

def V(f):
    return max(0, min(65535, int(f * 65535)))


class PB:
    """Patch Builder with enforced page layout.
    Page 0 = I/O + user controls only. DSP goes on page 1+.
    Grid: 8 cols x 5 rows = 40 positions per page.
    """
    def __init__(self, name, pages=None):
        self.name = name; self.modules = []; self.connections = []
        self.pages = pages or ["Main", "DSP"]
        self._ni = 0
        self._page_gc = {}  # per-page grid counter
    def sp(self, p):
        self.pages = p; return self
    def add(self, ti, name=None, col=15, pg=None, gp=None, par=None, opt=None):
        """Add a module. pg/gp are auto-assigned if not given.
        I/O types go to page 0, DSP types go to page 1 (or pg if specified)."""
        db = MODULE_DB.get(ti, {}); idx = self._ni; self._ni += 1
        # Auto-assign page: I/O types to 0, everything else to 1+
        if pg is None:
            pg = 0 if ti in IO_TYPES else 1
        # Auto-assign grid position within the page
        if gp is None:
            gc = self._page_gc.get(pg, 0)
            gp = gc
            self._page_gc[pg] = gc + 1
        else:
            # gp is page-relative (0-39), use as-is
            pass
        blks = [{"n": b[0], "t": b[1]} for b in db.get("blocks", [])]
        p2 = par if par is not None else list(db.get("params", []))
        # Expand params to match block count for correct block-indexed access
        if len(p2) < len(blks):
            expanded = []
            pi = 0
            for b in blks:
                bt = b["t"]
                if bt in ("cv_in", "gate_in"):
                    expanded.append(p2[pi] if pi < len(p2) else 0)
                    pi += 1
                else:
                    expanded.append(0)
            p2 = expanded
        o2 = opt if opt is not None else list(db.get("options", [0]*8))
        self.modules.append({"idx": idx, "typeIdx": ti, "page": pg, "colorId": col, "gridPos": gp,
            "name": name or db.get("name", "Mod%d" % idx), "typeName": db.get("name", "Unknown"),
            "blocks": blks, "blockCount": len(blks), "category": db.get("category", "Unknown"),
            "params": p2, "options": o2, "paramCount": len(p2)})
        return idx
    def c(self, sm, sb, dm, db, s=10000):
        self.connections.append({"srcMod": sm, "srcBlock": sb, "dstMod": dm, "dstBlock": db, "strength": s}); return self
    def labels(self, *args):
        self._labels = [str(l)[:24] for l in args]; return self
    def desc(self, text):
        self._description = str(text); return self
    def save(self, fp):
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        data = {"name": self.name, "moduleCount": len(self.modules), "modules": self.modules, "connections": self.connections, "pages": self.pages, "labels": getattr(self, '_labels', []), "description": getattr(self, '_description', '')}
        with open(fp, "w") as f:
            json.dump(data, f, indent=2)
        print("  " + os.path.basename(fp))


# Re-export add_test_pages so existing `from patch_lib import add_test_pages` works
from patch_lib.test_pages import add_test_pages
