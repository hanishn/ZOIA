#!/usr/bin/env python3
"""Prototype test: build A01 Spring Reverb with all 8 test pages.
This is a standalone test — does NOT modify any generator files.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from patch_lib import PB, V, add_test_pages

def build_prototype():
    # Reproduce A01 Spring Reverb exactly
    p = PB("Spring Reverb (PROTOTYPE)")
    i = p.add(1, "Input", 5)
    o = p.add(2, "Output", 5)
    dr = p.add(11, "Dwell Drive", 3, par=[0, V(.35), V(.55), 0])
    rv = p.add(82, "Spring Tank", 7, par=[0, V(.40), V(.55), 0])
    tn = p.add(12, "Tone", 8, par=[0, V(.40), V(.55), V(.45), 0])
    p.labels("reverb", "spring", "vintage", "guitar")
    p.desc("PROTOTYPE: Spring reverb with all 8 test pages.")
    p.c(i, 0, dr, 0)
    p.c(dr, 3, rv, 0)
    p.c(rv, 3, tn, 0)
    p.c(tn, 4, o, 0)
    p.c(tn, 4, o, 1)

    print(f"Core patch: {len(p.modules)} modules, {len(p.connections)} connections")
    print(f"Pages: {p.pages}")

    # Add test pages
    add_test_pages(p)

    print(f"\nAfter test pages: {len(p.modules)} modules, {len(p.connections)} connections")
    print(f"Pages ({len(p.pages)}): {p.pages}")

    # Save for inspection
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_prototype")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "PROTOTYPE_A01_Spring_Reverb.json")
    p.save(out_path)

    # Print module summary
    print("\n=== Module Summary ===")
    for m in p.modules:
        print(f"  [{m['idx']:2d}] pg={m['page']} type={m['typeIdx']:3d} {m['name']:<20s} blocks={m['blockCount']} params={len(m['params'])}")

    # Print connection summary
    print(f"\n=== Connections ({len(p.connections)}) ===")
    mod_names = {m['idx']: m['name'] for m in p.modules}
    for c in p.connections:
        src = mod_names.get(c['srcMod'], '?')
        dst = mod_names.get(c['dstMod'], '?')
        print(f"  {src}[{c['srcBlock']}] -> {dst}[{c['dstBlock']}] str={c['strength']}")

    # Verify module count under 64
    if len(p.modules) > 64:
        print(f"\n*** WARNING: {len(p.modules)} modules exceeds 64-module limit! ***")
    else:
        print(f"\n[OK] {len(p.modules)} modules (under 64 limit, {64 - len(p.modules)} headroom)")

    return p

if __name__ == "__main__":
    build_prototype()
