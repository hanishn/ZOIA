"""Verify all ZOIA patch JSON files against JS MODULE_DB type indices."""
import json
import os

MODULE_DB = {
    0: "SV Filter", 1: "Audio Input", 2: "Audio Output", 3: "Aliaser",
    4: "Sequencer", 5: "LFO", 6: "ADSR", 7: "VCA", 8: "Audio Multiply",
    9: "Bit Crusher", 10: "Sample & Hold", 11: "OD & Distortion",
    12: "Tone Control", 13: "Delay Line", 14: "Oscillator",
    15: "Pushbutton", 16: "Keyboard", 17: "CV Invert", 18: "Steps",
    19: "Slew Limiter", 20: "MIDI Note In", 21: "MIDI CC In",
    22: "Multiplier", 23: "Compressor", 24: "Multi Filter",
    25: "Plate Reverb", 26: "Hall Reverb", 27: "Shimmer",
    28: "Flanger", 29: "Chorus", 30: "Vibrato", 31: "In Switch",
    32: "Out Switch", 33: "Audio In Switch", 34: "Audio Out Switch",
    35: "Gate", 36: "Reverb", 37: "Rhythm", 38: "Noise", 39: "Random",
    40: "Env Follower", 41: "Pitch Detect", 42: "Ring Mod",
    43: "MIDI Note Out", 44: "Stompswitch", 45: "Value",
    46: "CV Delay", 47: "CV Loop", 48: "CV Filter",
    49: "Clock Divider", 50: "Comparator", 51: "CV Rectify",
    52: "Trigger", 53: "Stereo Spread", 54: "Cport Exp/CV",
    55: "MIDI Pressure", 56: "UI Button", 57: "Audio Panner",
    58: "Pixel", 59: "MIDI CC Out", 60: "Onset Detect",
    61: "Phaser", 62: "Looper", 63: "CV Abs", 64: "Audio Balance",
    65: "Inverter", 66: "Fuzz", 67: "Ghostverb", 68: "Grain Delay",
    69: "Ping Pong", 70: "Quantizer", 71: "Tremolo",
    72: "Cabinet Sim", 73: "EQ", 74: "CV Min/Max",
    75: "Gate Inverter", 76: "Audio Mixer", 77: "CV Flip Flop",
    78: "Granular", 79: "Audio Balance", 80: "Diffuser",
    81: "Pixel", 82: "Reverb Lite", 83: "Granular",
    85: "Delay", 86: "Delay w/Mod", 87: "Pitch Shifter",
    89: "All Pass Filter", 91: "Env Filter", 94: "Reverb Lite Stro",
    100: "Tap Tempo", 101: "MIDI PC In", 102: "MIDI PC Out",
    103: "Byte Splitter", 104: "CV Mixer", 105: "Logic Gate",
    106: "MIDI Clock In", 107: "MIDI Clock Out"
}

base_dir = r"D:\NathanAtStardock\ZOIA\ClairvoyanceProject\Test_Modules"

patch_files = []
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith(".json") and f != "audit_batch.json" and not f.startswith("_"):
            patch_files.append(os.path.join(root, f))
patch_files.sort()

total_patches = 0
total_modules = 0
invalid_type_ids = []
invalid_connections = []
type_usage = {}

for pf in patch_files:
    with open(pf, "r", encoding="utf-8") as fh:
        try:
            data = json.load(fh)
        except json.JSONDecodeError as e:
            invalid_type_ids.append((os.path.basename(pf), "PARSE ERROR", str(e), -1))
            continue

    patch_name = os.path.basename(pf).replace(".json", "")
    folder_name = os.path.basename(os.path.dirname(pf))
    total_patches += 1

    modules = data.get("modules", [])
    connections = data.get("connections", [])
    num_modules = len(modules)

    for i, mod in enumerate(modules):
        total_modules += 1
        tid = mod.get("typeIdx")
        mod_name = mod.get("name", "?")

        if tid is None:
            invalid_type_ids.append((patch_name, "MISSING", mod_name, i))
            continue

        if tid not in MODULE_DB:
            invalid_type_ids.append((patch_name, tid, mod_name, i))
        else:
            db_name = MODULE_DB[tid]
            if tid not in type_usage:
                type_usage[tid] = {"db_name": db_name, "patches": set()}
            type_usage[tid]["patches"].add(patch_name)

    for ci, conn in enumerate(connections):
        src = conn.get("source", {})
        dst = conn.get("dest", {})
        src_mod = src.get("module")
        dst_mod = dst.get("module")
        src_block = src.get("block")
        dst_block = dst.get("block")

        issues = []
        if src_mod is not None and (src_mod < 0 or src_mod >= num_modules):
            issues.append("src module %d out of range (0-%d)" % (src_mod, num_modules - 1))
        if dst_mod is not None and (dst_mod < 0 or dst_mod >= num_modules):
            issues.append("dst module %d out of range (0-%d)" % (dst_mod, num_modules - 1))
        if src_block is not None and src_block < 0:
            issues.append("src block %d negative" % src_block)
        if dst_block is not None and dst_block < 0:
            issues.append("dst block %d negative" % dst_block)
        if issues:
            invalid_connections.append((patch_name, ci, "; ".join(issues)))

lines = []
lines.append("# Session 8 - Final Verification Report")
lines.append("")
lines.append("**Verifier:** FinalVerifier")
lines.append("**Date:** 2026-02-15")
lines.append("")
lines.append("## Summary")
lines.append("")
lines.append("| Metric | Count |")
lines.append("|--------|-------|")
lines.append("| Patches checked | %d |" % total_patches)
lines.append("| Total modules checked | %d |" % total_modules)
lines.append("| Invalid typeIdx values | %d |" % len(invalid_type_ids))
lines.append("| Invalid connections | %d |" % len(invalid_connections))
lines.append("")

if len(invalid_type_ids) == 0 and len(invalid_connections) == 0:
    lines.append("## Verdict: PASS")
    lines.append("")
    lines.append("All module typeIdx values are valid keys in JS MODULE_DB.")
    lines.append("All connections reference valid module indices and non-negative block indices.")
else:
    lines.append("## Verdict: FAIL")
    lines.append("")

if invalid_type_ids:
    lines.append("### Invalid typeIdx Values")
    lines.append("")
    lines.append("| Patch | typeIdx | Module Name | Module Index |")
    lines.append("|-------|---------|-------------|--------------|")
    for entry in invalid_type_ids:
        lines.append("| %s | %s | %s | %d |" % (entry[0], entry[1], entry[2], entry[3]))
    lines.append("")

if invalid_connections:
    lines.append("### Invalid Connections")
    lines.append("")
    lines.append("| Patch | Connection # | Issue |")
    lines.append("|-------|-------------|-------|")
    for pn, ci, issue in invalid_connections:
        lines.append("| %s | %d | %s |" % (pn, ci, issue))
    lines.append("")

lines.append("## typeIdx Usage Map")
lines.append("")
lines.append("| typeIdx | JS MODULE_DB Name | # Patches Using |")
lines.append("|---------|-------------------|-----------------|")
for tid in sorted(type_usage.keys()):
    info = type_usage[tid]
    lines.append("| %d | %s | %d |" % (tid, info["db_name"], len(info["patches"])))
lines.append("")

report = "\n".join(lines)

report_path = r"C:\Users\NathanHanish\AppData\Roaming\clairvoyance\notes\Nathan Personal Projects\Music and Midi\ZOIA\DetailedSessionNotes\Agent notes\Session8-FinalVerification.md"
os.makedirs(os.path.dirname(report_path), exist_ok=True)
with open(report_path, "w", encoding="utf-8") as fh:
    fh.write(report)

print("=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
print("Patches checked: %d" % total_patches)
print("Modules checked: %d" % total_modules)
print("Invalid typeIdx: %d" % len(invalid_type_ids))
print("Invalid connections: %d" % len(invalid_connections))
print("")
if len(invalid_type_ids) == 0 and len(invalid_connections) == 0:
    print("VERDICT: PASS")
else:
    print("VERDICT: FAIL")
    if invalid_type_ids:
        print("\nInvalid typeIdx entries:")
        for e in invalid_type_ids:
            print("  ", e)
    if invalid_connections:
        print("\nInvalid connections:")
        for e in invalid_connections:
            print("  ", e)
print("")
print("Unique typeIdx values used: %d" % len(type_usage))
print("Report written to: %s" % report_path)
