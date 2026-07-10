#!/usr/bin/env python3
"""Prototype test: build H01 Mono Synth with all 8 test pages.
Tests MIDI routing (Keyboard-based patch).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from patch_lib import PB, V, add_test_pages

def build_prototype():
    # Reproduce H01 Mono Synth
    p = PB("Mono Synth (PROTOTYPE)")
    kb = p.add(16, "Keyboard", 13)
    o = p.add(2, "Output", 5)
    oc = p.add(14, "Oscillator", 2, par=[V(.50)])
    fl = p.add(0, "Filter", 8, par=[V(.45), V(.50)])
    ad = p.add(6, "Envelope", 1, par=[V(.05), V(.25), V(.60), V(.30)])
    vc = p.add(7, "VCA", 2, par=[65535])
    p.labels("synth", "mono", "keyboard", "midi")
    p.desc("PROTOTYPE: Mono synth with all 8 test pages.")
    p.c(kb, 0, oc, 0)      # note_cv -> oscillator freq
    p.c(kb, 1, ad, 0)      # gate -> ADSR gate
    p.c(oc, 1, fl, 0)
    p.c(ad, 5, vc, 1)
    p.c(ad, 5, fl, 1, 5000)
    p.c(fl, 3, vc, 0)
    p.c(vc, 2, o, 0)
    p.c(vc, 2, o, 1)

    print(f"Core patch: {len(p.modules)} modules, {len(p.connections)} connections")

    add_test_pages(p)

    print(f"After test pages: {len(p.modules)} modules, {len(p.connections)} connections")
    print(f"Pages ({len(p.pages)}): {p.pages}")

    # Save
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_prototype")
    os.makedirs(out_dir, exist_ok=True)
    p.save(os.path.join(out_dir, "PROTOTYPE_H01_Mono_Synth.json"))

    # Print connections to verify MIDI routing
    mod_names = {m['idx']: m['name'] for m in p.modules}
    print("\n=== Connections ===")
    for c in p.connections:
        src = mod_names.get(c['srcMod'], '?')
        dst = mod_names.get(c['dstMod'], '?')
        print(f"  {src}[{c['srcBlock']}] -> {dst}[{c['dstBlock']}] str={c['strength']}")

    print(f"\n[OK] {len(p.modules)} modules ({64 - len(p.modules)} headroom)")

if __name__ == "__main__":
    build_prototype()
