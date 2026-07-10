"""ZOIA Patch Library — drive category."""
from patch_lib import PB, V, add_test_pages

def gen_drive(d):
    # D01 Tube Screamer
    p=PB("Tube Screamer"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dr=p.add(11,"Overdrive",3,par=[0,V(.55),V(.60),0]); eq=p.add(73,"Mid Hump",8,par=[0,V(.40),V(.65),V(.42),0])
    p.labels("drive", "overdrive", "tube-screamer", "guitar")
    p.desc("Classic Tube Screamer style overdrive with mid-boosted EQ. Low gain for warm crunch, high gain for singing sustain. The quintessential guitar overdrive.")
    p.c(i,0,dr,0); p.c(dr,3,eq,0); p.c(eq,4,o,0); p.c(eq,4,o,1); add_test_pages(p); p.save(f"{d}/D01_Tube_Screamer.json")

    # D02 Big Muff Fuzz
    p=PB("Big Muff Fuzz"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    fz=p.add(66,"Fuzz",3,par=[0,V(.75),V(.50),0]); tn=p.add(12,"Tone Stack",8,par=[0,V(.55),V(.45),V(.40),0])
    p.labels("drive", "fuzz", "big-muff", "sustain")
    p.desc("Big Muff style fuzz with rich sustain and tone control. Massive wall of fuzz from smooth to scooped. Iconic for lead guitar and bass distortion.")
    p.c(i,0,fz,0); p.c(fz,3,tn,0); p.c(tn,4,o,0); p.c(tn,4,o,1); add_test_pages(p); p.save(f"{d}/D02_Big_Muff_Fuzz.json")

    # D03 Rat Distortion
    p=PB("Rat Distortion"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ds=p.add(11,"Distortion",3,par=[0,V(.70),V(.45),0]); f=p.add(0,"Filter",8,par=[V(.55),V(.15)])
    p.labels("drive", "distortion", "rat", "aggressive")
    p.desc("RAT-style distortion with filter shaping. Ranges from mild grit to aggressive saturation. The filter tames harshness at high gain settings.")
    p.c(i,0,ds,0); p.c(ds,3,f,0); p.c(f,3,o,0); p.c(f,3,o,1); add_test_pages(p); p.save(f"{d}/D03_Rat_Distortion.json")

    # D04 Octave Fuzz
    p=PB("Octave Fuzz"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    rg=p.add(42,"Octave Up",12); fz=p.add(66,"Fuzz",3,par=[0,V(.80),V(.50),0]); mx=p.add(76,"Blend",15,par=[V(.60),V(.50),V(.00)])
    p.labels("drive", "fuzz", "octave", "retro")
    p.desc("Octave fuzz using ring modulator to generate upper octave harmonics. Dry/wet mixer blends clean and fuzz. Retro 60s octave-up fuzz tone.")
    p.c(i,0,rg,0); p.c(i,0,rg,1); p.c(rg,2,fz,0); p.c(i,0,mx,0); p.c(fz,3,mx,2); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/D04_Octave_Fuzz.json")

    # D05 Bitcrusher
    p=PB("Bitcrusher"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    cr=p.add(9,"Crusher",3,par=[0,V(.40),V(.35),0]); al=p.add(3,"Aliaser",12,par=[0,V(.50),0]); f=p.add(0,"Smooth",8,par=[V(.50),V(.10)])
    p.labels("drive", "bitcrusher", "lo-fi", "digital")
    p.desc("Digital destruction with bit reduction and sample rate decimation plus aliaser. Creates lo-fi, retro video game distortion. Filter smooths the harsh edges.")
    p.c(i,0,cr,0); p.c(cr,3,al,0); p.c(al,2,f,0); p.c(f,3,o,0); p.c(f,3,o,1); add_test_pages(p); p.save(f"{d}/D05_Bitcrusher.json")

    # D06 Clean Boost
    p=PB("Clean Boost"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dr=p.add(11,"Boost",3,par=[0,V(.25),V(.50),0]); eq=p.add(73,"Shape",8,par=[0,V(.52),V(.50),V(.53),0])
    p.labels("drive", "boost", "clean", "utility")
    p.desc("Transparent clean boost with subtle drive and EQ shaping. Pushes your signal hotter without coloring the tone. Useful as an always-on gain stage.")
    p.c(i,0,dr,0); p.c(dr,3,eq,0); p.c(eq,4,o,0); p.c(eq,4,o,1); add_test_pages(p); p.save(f"{d}/D06_Clean_Boost.json")

    # D07 Heavy Metal
    p=PB("Heavy Metal"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ds=p.add(11,"Hi Gain",3,par=[0,V(.85),V(.50),0]); fz=p.add(66,"Fuzz Layer",3,par=[0,V(.50),V(.45),0]); eq=p.add(73,"Scoop",8,par=[0,V(.55),V(.30),V(.55),0]); cb=p.add(72,"Cabinet",2)
    p.labels("drive", "metal", "heavy", "high-gain")
    p.desc("High-gain metal distortion stacking OD into fuzz with EQ and cabinet sim. Extreme saturation with tight low end. For heavy riffs and searing leads.")
    p.c(i,0,ds,0); p.c(ds,3,fz,0); p.c(fz,3,eq,0); p.c(eq,4,cb,0); p.c(cb,1,o,0); p.c(cb,1,o,1); add_test_pages(p); p.save(f"{d}/D07_Heavy_Metal.json")
