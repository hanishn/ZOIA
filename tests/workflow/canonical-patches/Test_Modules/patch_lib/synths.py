"""ZOIA Patch Library — synths category."""
from patch_lib import PB, V, add_test_pages

def gen_synths(d):
    # H01 Mono Synth (Keyboard on page 0)
    p=PB("Mono Synth"); kb=p.add(16,"Keyboard",13); o=p.add(2,"Output",5)
    oc=p.add(14,"Oscillator",2,par=[V(.50)]); fl=p.add(0,"Filter",8,par=[V(.45),V(.50)]); ad=p.add(6,"Envelope",1,par=[V(.05),V(.25),V(.60),V(.30)]); vc=p.add(7,"VCA",2,par=[65535])
    p.labels("synth", "mono", "keyboard", "midi")
    p.desc("Classic monophonic synthesizer with oscillator, filter, ADSR, and VCA. Play notes using the on-screen keyboard. Filter and envelope shape the timbre.")
    p.c(kb,0,oc,0); p.c(kb,1,ad,0); p.c(oc,1,fl,0); p.c(ad,5,vc,1); p.c(ad,5,fl,1,5000); p.c(fl,3,vc,0); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/H01_Mono_Synth.json")

    # H02 Drone Generator (no user controls needed — just Output)
    p=PB("Drone Generator"); o=p.add(2,"Output",5)
    o1=p.add(14,"Osc Root",2,par=[V(.30)]); o2=p.add(14,"Osc Fifth",2,par=[V(.35)]); o3=p.add(14,"Osc Octave",2,par=[V(.40)]); l1=p.add(5,"Slow Drift 1",1,par=[V(.02)]); l2=p.add(5,"Slow Drift 2",1,par=[V(.03)]); mx=p.add(76,"Mix",15,par=[V(.70),V(.55),V(.50)]); rv=p.add(26,"Space",7,par=[0,V(.85),V(.60),0])
    p.labels("synth", "drone", "ambient", "generative")
    p.desc("Self-playing drone generator with three detuned oscillators into reverb. No user input needed. LFOs create slow, evolving harmonic movement.")
    p.c(l1,1,o1,0,1000); p.c(l2,1,o2,0,800); p.c(o1,1,mx,0); p.c(o2,1,mx,2); p.c(o3,1,mx,4); p.c(mx,6,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/H02_Drone_Generator.json")

    # H03 Acid Bass 303 (Keyboard on page 0)
    p=PB("Acid Bass 303"); kb=p.add(16,"Keyboard",13); o=p.add(2,"Output",5)
    oc=p.add(14,"Saw Osc",2,par=[V(.35)],opt=[2,0,0,0,0,0,0,0]); fl=p.add(0,"Reso Filter",8,par=[V(.30),V(.80)]); ad=p.add(6,"Accent Env",1,par=[V(.01),V(.15),V(.10),V(.10)]); vc=p.add(7,"VCA",2,par=[65535]); ds=p.add(11,"Grit",3,par=[0,V(.40),V(.50),0])
    p.labels("synth", "acid", "bass", "303", "midi")
    p.desc("TB-303 style acid bass synth with resonant filter and distortion. Play using the on-screen keyboard. Crank the filter resonance for classic squelchy acid lines.")
    p.c(kb,0,oc,0); p.c(kb,1,ad,0); p.c(oc,1,fl,0); p.c(ad,5,fl,1,7000); p.c(ad,5,vc,1); p.c(fl,3,vc,0); p.c(vc,2,ds,0); p.c(ds,3,o,0); p.c(ds,3,o,1); add_test_pages(p); p.save(f"{d}/H03_Acid_Bass_303.json")

    # H04 Pad Synth (Keyboard on page 0)
    p=PB("Pad Synth"); kb=p.add(16,"Keyboard",13); o=p.add(2,"Output",5)
    o1=p.add(14,"Osc 1",2,par=[V(.50)]); o2=p.add(14,"Osc 2",2,par=[V(.501)]); bl=p.add(64,"Osc Mix",2,par=[V(.50)]); ad=p.add(6,"Pad Env",1,par=[V(.40),V(.20),V(.80),V(.50)]); ch=p.add(29,"Ensemble",2,par=[0,V(.10),V(.35),V(.50),0]); vc=p.add(7,"VCA",2,par=[65535]); sh=p.add(27,"Shimmer",7,par=[0,V(.70),V(.55),V(.40),0])
    p.labels("synth", "pad", "ambient", "keyboard", "midi")
    p.desc("Lush pad synthesizer with two detuned oscillators, chorus, and shimmer reverb. Play chords on the keyboard. ADSR envelope creates slow attack swells.")
    p.c(kb,0,o1,0); p.c(kb,0,o2,0); p.c(kb,1,ad,0); p.c(o1,1,bl,0); p.c(o2,1,bl,1); p.c(bl,3,ch,0); p.c(ad,5,vc,1); p.c(ch,4,vc,0); p.c(vc,2,sh,0); p.c(sh,4,o,0); p.c(sh,4,o,1); add_test_pages(p); p.save(f"{d}/H04_Pad_Synth.json")

    # H05 Noise Synth (Stompswitch trigger on page 0)
    p=PB("Noise Synth"); st=p.add(44,"Trigger",13); o=p.add(2,"Output",5)
    ns=p.add(38,"Noise",2); fl=p.add(0,"Shape",8,par=[V(.50),V(.60)]); lf=p.add(5,"Sweep LFO",1,par=[V(.08)]); ad=p.add(6,"Env",1,par=[V(.15),V(.30),V(.55),V(.40)]); vc=p.add(7,"VCA",2,par=[65535])
    p.labels("synth", "noise", "percussion", "interactive")
    p.desc("Noise-based synthesizer triggered by stompswitch. Filtered noise with LFO modulation and ADSR envelope. Creates percussive hits and textural sweeps.")
    p.c(ns,0,fl,0); p.c(lf,1,fl,1); p.c(st,0,ad,0); p.c(ad,5,vc,1); p.c(fl,4,vc,0); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/H05_Noise_Synth.json")

    # H06 FM Synth (Keyboard on page 0)
    p=PB("FM Synth"); kb=p.add(16,"Keyboard",13); o=p.add(2,"Output",5)
    car=p.add(14,"Carrier",2,par=[V(.50)]); mod=p.add(14,"Modulator",2,par=[V(.75)]); ml=p.add(8,"FM Mod",2); ad=p.add(6,"Env",1,par=[V(.02),V(.25),V(.45),V(.20)]); vc=p.add(7,"VCA",2,par=[65535]); ch=p.add(29,"Width",2,par=[0,V(.10),V(.20),V(.35),0])
    p.labels("synth", "fm", "keyboard", "midi", "metallic")
    p.desc("Two-operator FM synthesizer with carrier and modulator. Play using the on-screen keyboard. FM creates bell-like, metallic, and complex harmonic tones.")
    p.c(kb,0,car,0); p.c(kb,0,mod,0); p.c(kb,1,ad,0); p.c(mod,1,ml,0); p.c(car,1,ml,1); p.c(ml,2,vc,0); p.c(ad,5,vc,1); p.c(vc,2,ch,0); p.c(ch,4,o,0); p.c(ch,4,o,1); add_test_pages(p); p.save(f"{d}/H06_FM_Synth.json")

    # H07 Lead Synth (Keyboard on page 0)
    p=PB("Lead Synth"); kb=p.add(16,"Keyboard",13); o=p.add(2,"Output",5)
    o1=p.add(14,"Osc Saw",2,par=[V(.50)],opt=[2,0,0,0,0,0,0,0]); o2=p.add(14,"Osc Square",2,par=[V(.505)],opt=[1,0,0,0,0,0,0,0]); mx=p.add(76,"Osc Mix",2,par=[V(.70),V(.55),V(.00)]); fl=p.add(0,"Filter",8,par=[V(.50),V(.40)]); a1=p.add(6,"Filt Env",1,par=[V(.02),V(.20),V(.45),V(.15)]); a2=p.add(6,"Amp Env",1,par=[V(.01),V(.10),V(.70),V(.20)]); vc=p.add(7,"VCA",2,par=[65535]); ds=p.add(11,"Crunch",3,par=[0,V(.30),V(.55),0])
    p.labels("synth", "lead", "keyboard", "midi")
    p.desc("Dual-oscillator lead synth with filter, dual envelopes, and light distortion. Play using the on-screen keyboard. Designed for cutting lead melodies.")
    p.c(kb,0,o1,0); p.c(kb,0,o2,0); p.c(kb,1,a1,0); p.c(kb,1,a2,0); p.c(o1,1,mx,0); p.c(o2,1,mx,2); p.c(mx,6,fl,0); p.c(a1,5,fl,1,5000); p.c(fl,3,vc,0); p.c(a2,5,vc,1); p.c(vc,2,ds,0); p.c(ds,3,o,0); p.c(ds,3,o,1); add_test_pages(p); p.save(f"{d}/H07_Lead_Synth.json")

    # H08 Sub Bass (Keyboard on page 0)
    p=PB("Sub Bass"); kb=p.add(16,"Keyboard",13); o=p.add(2,"Output",5)
    oc=p.add(14,"Sub Osc",2,par=[V(.25)]); fl=p.add(0,"LP Filter",8,par=[V(.20),V(.15)]); ad=p.add(6,"Env",1,par=[V(.005),V(.15),V(.80),V(.15)]); vc=p.add(7,"VCA",2,par=[65535])
    p.labels("synth", "bass", "sub", "keyboard", "midi")
    p.desc("Deep sub bass synthesizer with low-pass filtered oscillator. Play using the on-screen keyboard. Simple sine-like bass for low-end foundation.")
    p.c(kb,0,oc,0); p.c(kb,1,ad,0); p.c(oc,1,fl,0); p.c(fl,3,vc,0); p.c(ad,5,vc,1); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/H08_Sub_Bass.json")
