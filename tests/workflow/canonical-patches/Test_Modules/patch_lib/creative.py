"""ZOIA Patch Library — creative category."""
from patch_lib import PB, V, add_test_pages

def gen_creative(d):
    # I01 Guitar Amp Sim
    p=PB("Guitar Amp Sim"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dr=p.add(11,"Preamp",3,par=[0,V(.55),V(.50),0]); eq=p.add(73,"Tone Stack",8,par=[0,V(.55),V(.50),V(.48),0]); cb=p.add(72,"Cabinet",2); rv=p.add(36,"Room",7,par=[0,V(.25),V(.20),0])
    p.labels("creative", "amp-sim", "guitar", "cabinet")
    p.desc("Guitar amp simulation with drive, EQ, cabinet sim, and reverb. Full signal chain from input to speaker. Adjust drive and EQ to dial in your amp tone.")
    p.c(i,0,dr,0); p.c(dr,3,eq,0); p.c(eq,4,cb,0); p.c(cb,1,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/I01_Guitar_Amp_Sim.json")

    # I02 Ring Modulator
    p=PB("Ring Modulator"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    oc=p.add(14,"Carrier Osc",12,par=[V(.60)]); rg=p.add(42,"Ring Mod",12); mx=p.add(76,"Blend",15,par=[V(.60),V(.55),V(.00)])
    p.labels("creative", "ring-mod", "experimental", "metallic")
    p.desc("Ring modulator mixing input with an internal oscillator. Creates metallic, bell-like, and robotic tones. Dry/wet blend controls the effect intensity.")
    p.c(i,0,rg,0); p.c(oc,1,rg,1); p.c(i,0,mx,0); p.c(rg,2,mx,2); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/I02_Ring_Modulator.json")

    # I03 Granular Pitch Shift
    p=PB("Granular Pitch Shift"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    gr=p.add(78,"Pitch Grain",12,par=[0,V(.65),V(.25),V(.70),V(.50),0])
    p.labels("creative", "granular", "pitch", "texture")
    p.desc("Granular pitch shifter that reshapes audio through grain manipulation. Position, size, and density controls on DSP page. Creates unique textural transformations.")
    p.c(i,0,gr,0); p.c(gr,5,o,0); p.c(gr,5,o,1); add_test_pages(p); p.save(f"{d}/I03_Granular_Pitch_Shift.json")

    # I04 Vocal Doubler
    p=PB("Vocal Doubler"); i=p.add(1,"Input",5); oL=p.add(2,"Left",5); oR=p.add(2,"Right",5)
    d1=p.add(13,"Double L",4,par=[0,V(.02),0]); d2=p.add(13,"Double R",4,par=[0,V(.035),0]); ch=p.add(29,"Thicken",2,par=[0,V(.08),V(.15),V(.30),0])
    p.labels("creative", "doubler", "vocal", "stereo")
    p.desc("Vocal doubling effect using two short delays with chorus. Creates the illusion of multiple voices. Stereo output for wide doubled sound.")
    p.c(i,0,d1,0); p.c(i,0,d2,0); p.c(d1,2,ch,0); p.c(ch,4,oL,0); p.c(d2,2,oR,0); add_test_pages(p); p.save(f"{d}/I04_Vocal_Doubler.json")

    # I05 Pitch Shifter
    p=PB("Pitch Shifter"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ps=p.add(87,"Pitch Shift",12,par=[0,V(.60),V(.50),0]); mx=p.add(76,"Blend",15,par=[V(.70),V(.55),V(.00)])
    p.labels("creative", "pitch", "harmony", "octave")
    p.desc("Pitch shifter with dry/wet mixer for harmonizing. Shift pitch up or down and blend with original. Use for octave effects, harmonies, or detuning.")
    p.c(i,0,ps,0); p.c(i,0,mx,0); p.c(ps,3,mx,2); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/I05_Pitch_Shifter.json")

    # I06 Tape Saturation
    p=PB("Tape Saturation"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dr=p.add(11,"Tape Drive",3,par=[0,V(.30),V(.55),0]); fl=p.add(0,"Tape Roll",8,par=[V(.55),V(.10)]); ch=p.add(29,"Wow",2,par=[0,V(.04),V(.10),V(.35),0])
    p.labels("creative", "tape", "saturation", "warm")
    p.desc("Tape saturation emulation with gentle drive, filtering, and chorus. Adds analog warmth and subtle compression. Makes digital recordings sound more organic.")
    p.c(i,0,dr,0); p.c(dr,3,fl,0); p.c(fl,3,ch,0); p.c(ch,4,o,0); p.c(ch,4,o,1); add_test_pages(p); p.save(f"{d}/I06_Tape_Saturation.json")
