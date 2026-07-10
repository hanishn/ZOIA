"""ZOIA Patch Library — test page generators.

Adds standardized test/input pages to patches for in-simulator testing.
Each page provides a different signal source (MIDI notes, test tones,
sequences, chords) that routes into the patch's existing signal chain.

Active pages:
  T1 — MIDI Notes: Keyboard module for synth patches (MIDI input)
  T2 — Note Tones: Keyboard → Oscillator → VCA for effect patches (audio input)
T3-T8 will be re-enabled once T1/T2 are validated in the exhibit.
"""
from patch_lib import V


# ---------------------------------------------------------------------------
# Music constants
# ---------------------------------------------------------------------------

def _note_cv(midi_note):
    """Convert MIDI note number to ZOIA CV value (0-65535)."""
    return V(midi_note / 127.0)

# C major scale: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72
CMAJ_SCALE = [60, 62, 64, 65, 67, 69, 71, 72]

# Common 3-note chords (root, third, fifth) as MIDI note numbers
CHORDS = {
    "C Maj":  (60, 64, 67),   # C-E-G
    "D Min":  (62, 65, 69),   # D-F-A
    "E Min":  (64, 67, 71),   # E-G-B
    "F Maj":  (65, 69, 72),   # F-A-C5
    "G Maj":  (67, 71, 74),   # G-B-D5
    "A Min":  (69, 72, 76),   # A-C5-E5
}

# Chord progression: I-IV-V-vi-IV-V-I-I (C major)
CHORD_PROG = [
    (60, 64, 67),  # I  = C Maj
    (65, 69, 72),  # IV = F Maj
    (67, 71, 74),  # V  = G Maj
    (69, 72, 76),  # vi = A Min
    (65, 69, 72),  # IV = F Maj
    (67, 71, 74),  # V  = G Maj
    (60, 64, 67),  # I  = C Maj
    (60, 64, 67),  # I  = C Maj (repeat for 8 steps)
]


# ---------------------------------------------------------------------------
# Auto-detection helpers
# ---------------------------------------------------------------------------

def _detect_audio_dests(pb):
    """Find where Audio Input modules (type 1) connect to."""
    dests = []
    audio_in_idxs = [m["idx"] for m in pb.modules if m["typeIdx"] == 1]
    for conn in pb.connections:
        if conn["srcMod"] in audio_in_idxs:
            dests.append((conn["dstMod"], conn["dstBlock"]))
    return dests


def _detect_midi_dests(pb):
    """Find where Keyboard (type 16) and Pushbutton (type 15) modules connect to."""
    dests = []

    # Keyboard modules → note CV + gate
    kb_idxs = [m["idx"] for m in pb.modules if m["typeIdx"] == 16]
    for kb_idx in kb_idxs:
        note_conns = []
        gate_conns = []
        for conn in pb.connections:
            if conn["srcMod"] == kb_idx:
                if conn["srcBlock"] == 0:   # note_cv output
                    note_conns.append((conn["dstMod"], conn["dstBlock"]))
                elif conn["srcBlock"] == 1:  # gate output
                    gate_conns.append((conn["dstMod"], conn["dstBlock"]))
        for nc in note_conns:
            for gc in gate_conns:
                dests.append({"note": nc, "gate": gc})
        if note_conns and not gate_conns:
            for nc in note_conns:
                dests.append({"note": nc, "gate": None})

    # Pushbutton modules → gate only
    pb_idxs = [m["idx"] for m in pb.modules if m["typeIdx"] == 15]
    for pb_idx in pb_idxs:
        for conn in pb.connections:
            if conn["srcMod"] == pb_idx:
                dests.append({"note": None, "gate": (conn["dstMod"], conn["dstBlock"])})

    return dests


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def add_test_pages(pb, audio_dests=None, midi_dests=None):
    """Add standardized test/input pages to a patch.

    Args:
        pb: PB instance (patch already built with core DSP)
        audio_dests: list of (mod_idx, block_idx) for audio routing,
                     or None to auto-detect from Audio Input connections
        midi_dests: list of dicts with 'note' and 'gate' keys for MIDI routing,
                    or None to auto-detect from Keyboard/Pushbutton connections
    """
    if audio_dests is None:
        audio_dests = _detect_audio_dests(pb)
    if midi_dests is None:
        midi_dests = _detect_midi_dests(pb)

    has_audio = len(audio_dests) > 0
    has_midi = len(midi_dests) > 0

    base_pg = len(pb.pages)

    # Color IDs: 13=Pink (UI), 5=Aqua (I/O), 1=Blue (CV), 2=Green (Audio)
    UI_COL = 13
    AUD_COL = 2
    CV_COL = 1

    # --- Add page names (only active pages) ---
    page_names = ["MIDI Notes"]           # base_pg + 0
    if has_audio:
        page_names.append("Note Tones")   # base_pg + 1
    pb.pages.extend(page_names)

    # =========================================================
    # T1: MIDI Notes — Keyboard module (renders clickable piano keys)
    # =========================================================
    pg1 = base_pg + 0
    t1_kb = pb.add(16, "MIDI Notes", UI_COL, pg=pg1)
    if has_midi:
        for md in midi_dests:
            if md.get("note"):
                pb.c(t1_kb, 0, md["note"][0], md["note"][1])
            if md.get("gate"):
                pb.c(t1_kb, 1, md["gate"][0], md["gate"][1])

    # =========================================================
    # T2: Note Tones — Keyboard → Sin Oscillator → audio_dests
    # For effect patches that accept audio input, not MIDI.
    # Keyboard renders clickable piano keys; oscillator converts
    # note CV to a sine tone, VCA gates audio on key press.
    # =========================================================
    if has_audio:
        pg2 = base_pg + 1
        t2_kb = pb.add(16, "Note Tones", UI_COL, pg=pg2)
        t2_osc = pb.add(14, "Tone Osc", AUD_COL, pg=pg2)
        t2_vca = pb.add(7, "Tone Gate", AUD_COL, pg=pg2, par=[0])

        # Keyboard note CV → Oscillator frequency
        pb.c(t2_kb, 0, t2_osc, 0)
        # Oscillator audio → VCA audio in
        pb.c(t2_osc, 1, t2_vca, 0)
        # Keyboard gate → VCA level (sound only while key held)
        pb.c(t2_kb, 1, t2_vca, 1)
        # VCA output → wherever Audio Input was routed
        for ad in audio_dests:
            pb.c(t2_vca, 2, ad[0], ad[1])

    # =====================================================================
    # T3-T8: DISABLED — will be re-enabled once T1/T2 are validated
    # =====================================================================
    # When re-enabling, each page should be its own function in this file:
    #   _add_test_tones(pb, base_pg, audio_dests, AUD_COL, UI_COL)
    #   _add_midi_note_seq(pb, base_pg, midi_dests, CV_COL, UI_COL)
    #   etc.
