"""ZOIA Patch Library — modulation category."""
from patch_lib import PB, V, add_test_pages

def gen_modulation(d):
    # C01 Classic Chorus
    p=PB("Classic Chorus"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ch=p.add(29,"Chorus",2,par=[0,V(.12),V(.35),V(.55),0])
    p.labels("modulation", "chorus", "clean", "80s")
    p.desc("Standard chorus effect for shimmering, widened tone. Rate and depth control the modulation intensity. Essential effect for clean guitar and synth.")
    p.c(i,0,ch,0); p.c(ch,4,o,0); p.c(ch,4,o,1); add_test_pages(p); p.save(f"{d}/C01_Classic_Chorus.json")

    # C02 Rotary Speaker
    p=PB("Rotary Speaker"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    t=p.add(71,"Rotor",2,par=[0,V(.20),V(.60),0]); ch=p.add(29,"Horn",2,par=[0,V(.30),V(.40),V(.50),0]); pn=p.add(57,"Spin",2,par=[0,V(.50)]); lf=p.add(5,"Rotate LFO",1,par=[V(.20)])
    p.labels("modulation", "rotary", "leslie", "organ")
    p.desc("Rotary speaker simulation with tremolo and panning. Emulates a spinning Leslie cabinet. Stereo output for authentic left/right rotation effect.")
    p.c(i,0,t,0); p.c(t,3,ch,0); p.c(ch,4,pn,0); p.c(lf,1,pn,1); p.c(pn,2,o,0); p.c(pn,3,o,1); add_test_pages(p); p.save(f"{d}/C02_Rotary_Speaker.json")

    # C03 Uni-Vibe
    p=PB("Uni-Vibe"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ph=p.add(61,"Phaser",2,par=[0,V(.15),V(.50),V(.35),0]); vb=p.add(30,"Vibrato",12,par=[0,V(.12),V(.20),0]); ch=p.add(29,"Throb",2,par=[0,V(.10),V(.30),V(.35),0])
    p.labels("modulation", "univibe", "vintage", "psychedelic")
    p.desc("Uni-Vibe style effect combining phaser, vibrato, and chorus. Classic 60s/70s psychedelic tone. Creates swirling, organic modulation.")
    p.c(i,0,ph,0); p.c(ph,4,vb,0); p.c(vb,3,ch,0); p.c(ch,4,o,0); p.c(ch,4,o,1); add_test_pages(p); p.save(f"{d}/C03_Uni_Vibe.json")

    # C04 Jet Flanger
    p=PB("Jet Flanger"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    fl=p.add(28,"Flanger",2,par=[0,V(.08),V(.70),V(.65),0])
    p.labels("modulation", "flanger", "jet", "metallic")
    p.desc("Deep flanger with high feedback for jet airplane swooshing sound. Rate controls sweep speed, feedback adds metallic resonance. Bold and dramatic effect.")
    p.c(i,0,fl,0); p.c(fl,4,o,0); p.c(fl,4,o,1); add_test_pages(p); p.save(f"{d}/C04_Jet_Flanger.json")

    # C05 Auto-Wah
    p=PB("Auto-Wah"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    en=p.add(40,"Env Follow",1,par=[V(.70)]); fl=p.add(0,"Wah Filter",2,par=[V(.25),V(.65)])
    p.labels("modulation", "wah", "envelope", "funky")
    p.desc("Envelope-controlled filter that responds to playing dynamics. Pick harder for more wah sweep. Great for funky guitar and bass lines.")
    p.c(i,0,fl,0); p.c(i,0,en,0); p.c(en,2,fl,1); p.c(fl,4,o,0); p.c(fl,4,o,1); add_test_pages(p); p.save(f"{d}/C05_Auto_Wah.json")

    # C06 Deep Phaser
    p=PB("Deep Phaser"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ph=p.add(61,"Phaser",2,par=[0,V(.10),V(.75),V(.55),0])
    p.labels("modulation", "phaser", "deep", "swirl")
    p.desc("Rich phaser with pronounced sweep and feedback. Creates deep, swirling phase cancellation. Classic effect for guitar, keyboards, and pads.")
    p.c(i,0,ph,0); p.c(ph,4,o,0); p.c(ph,4,o,1); add_test_pages(p); p.save(f"{d}/C06_Deep_Phaser.json")

    # C07 Vibrato
    p=PB("Vibrato"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    vb=p.add(30,"Vibrato",12,par=[0,V(.18),V(.40),0])
    p.labels("modulation", "vibrato", "pitch", "subtle")
    p.desc("Pure pitch vibrato without mix blending. Rate and depth control the pitch wobble. Use for subtle movement or dramatic warbling at extreme settings.")
    p.c(i,0,vb,0); p.c(vb,3,o,0); p.c(vb,3,o,1); add_test_pages(p); p.save(f"{d}/C07_Vibrato.json")

    # C08 Tremolo
    p=PB("Tremolo"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    t=p.add(71,"Tremolo",2,par=[0,V(.22),V(.55),0])
    p.labels("modulation", "tremolo", "volume", "vintage")
    p.desc("Classic tremolo that modulates volume at a set rate and depth. Vintage amp-style pulsing effect. Simple and effective for surf, country, and ambient styles.")
    p.c(i,0,t,0); p.c(t,3,o,0); p.c(t,3,o,1); add_test_pages(p); p.save(f"{d}/C08_Tremolo.json")

    # C09 Ensemble Chorus
    p=PB("Ensemble Chorus"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    c1=p.add(29,"Voice 1",2,par=[0,V(.08),V(.25),V(.40),0]); c2=p.add(29,"Voice 2",2,par=[0,V(.15),V(.30),V(.40),0]); c3=p.add(29,"Voice 3",2,par=[0,V(.22),V(.20),V(.40),0]); mx=p.add(76,"Mix",15,par=[V(.25),V(.20),V(.15)])
    p.labels("modulation", "chorus", "ensemble", "lush")
    p.desc("Triple chorus voices mixed together for rich ensemble effect. Three independent chorus units create thick, animated textures. Lush and wide sound.")
    p.c(i,0,c1,0); p.c(i,0,c2,0); p.c(i,0,c3,0); p.c(c1,4,mx,0); p.c(c2,4,mx,2); p.c(c3,4,mx,4); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/C09_Ensemble_Chorus.json")

    # C10 Harmonic Tremolo
    p=PB("Harmonic Tremolo"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    fl=p.add(0,"Lo Split",8,par=[V(.30),V(.10)]); fh=p.add(0,"Hi Split",8,par=[V(.30),V(.10)]); lf=p.add(5,"Trem LFO",1,par=[V(.18)]); v1=p.add(7,"Lo VCA",2,par=[65535]); v2=p.add(7,"Hi VCA",2,par=[65535]); iv=p.add(17,"Invert",1); mx=p.add(76,"Mix",15,par=[V(.80),V(.80),V(.00)])
    p.labels("modulation", "tremolo", "harmonic", "vintage")
    p.desc("Harmonic tremolo that splits signal into high and low bands with opposed LFO modulation. Creates a more complex, musical tremolo than standard volume modulation.")
    p.c(i,0,fl,0); p.c(i,0,fh,0); p.c(fl,3,v1,0); p.c(fh,5,v2,0); p.c(lf,1,v1,1); p.c(lf,1,iv,0); p.c(iv,1,v2,1); p.c(v1,2,mx,0); p.c(v2,2,mx,2); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/C10_Harmonic_Tremolo.json")
