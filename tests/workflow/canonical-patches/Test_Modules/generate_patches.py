#!/usr/bin/env python3
"""ZOIA Patch Library Generator v3 — runs all category generators.

Uses the patch_lib package for MODULE_DB, PB class, and category functions.
"""
import os

from patch_lib.reverbs import gen_reverbs
from patch_lib.delays import gen_delays
from patch_lib.modulation import gen_modulation
from patch_lib.drive import gen_drive
from patch_lib.dynamics import gen_dynamics
from patch_lib.spatial import gen_spatial
from patch_lib.looping import gen_looping
from patch_lib.synths import gen_synths
from patch_lib.creative import gen_creative
from patch_lib.pedalboards import gen_pedalboards
from patch_lib.drums import gen_drums
from patch_lib.touch import gen_touch


def main():
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    cats = [
    ("A_Reverbs", gen_reverbs),
    ("B_Delays", gen_delays),
    ("C_Modulation", gen_modulation),
    ("D_Drive", gen_drive),
    ("E_Dynamics", gen_dynamics),
    ("F_Spatial", gen_spatial),
    ("G_Looping", gen_looping),
    ("H_Synths", gen_synths),
    ("I_Creative", gen_creative),
    ("J_Pedalboards", gen_pedalboards),
    ("K_Drums", gen_drums),
    ("L_Touch_Synths", gen_touch),
    ]
    print("=== ZOIA Patch Library Generator v3 ===\n")
    for label, fn in cats:
        print(f"[{label[0]}] {label}...")
        fn(os.path.join(base, label))
    total = sum(1 for r, _, fs in os.walk(base) for f in fs if f.endswith(".json") and not f.startswith("0"))
    print(f"\n=== Generated {total} patches across {len(cats)} categories ===")

if __name__ == "__main__":
    main()
