"""ZOIA Patch Library — dynamics category."""
from patch_lib import PB, V, add_test_pages

def gen_dynamics(d):
    # E01 Studio Compressor
    p=PB("Studio Compressor"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    co=p.add(23,"Compressor",6,par=[0,V(.50),V(.55),V(.10),V(.35),0]); eq=p.add(73,"Makeup EQ",8,par=[0,V(.52),V(.50),V(.53),0])
    p.labels("dynamics", "compressor", "studio", "utility")
    p.desc("Studio compressor with threshold, ratio, attack, and release controls plus EQ. Smooths dynamics and adds presence. Essential mixing and tracking tool.")
    p.c(i,0,co,0); p.c(co,5,eq,0); p.c(eq,4,o,0); p.c(eq,4,o,1); add_test_pages(p); p.save(f"{d}/E01_Studio_Compressor.json")

    # E02 Sidechain Ducker
    p=PB("Sidechain Ducker"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    lf=p.add(5,"Pump LFO",1,par=[V(.20)]); vc=p.add(7,"Ducker VCA",6,par=[65535]); iv=p.add(17,"Invert",1)
    p.labels("dynamics", "sidechain", "ducker", "utility")
    p.desc("LFO-driven volume ducker that creates rhythmic pumping. Inverted LFO controls VCA level. Classic sidechain compression effect for electronic music.")
    p.c(i,0,vc,0); p.c(lf,1,iv,0); p.c(iv,1,vc,1); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/E02_Sidechain_Ducker.json")

    # E03 Noise Gate
    p=PB("Noise Gate"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    en=p.add(40,"Detect",1,par=[V(.65)]); gt=p.add(35,"Gate",6,par=[V(.25)]); vc=p.add(7,"Gate VCA",6,par=[65535])
    p.labels("dynamics", "gate", "noise", "utility")
    p.desc("Noise gate using envelope follower and threshold gate to silence signal below a set level. Cleans up noise between phrases. Adjust sensitivity and threshold on DSP page.")
    p.c(i,0,en,0); p.c(en,2,gt,0); p.c(gt,2,vc,1); p.c(i,0,vc,0); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/E03_Noise_Gate.json")

    # E04 Parallel Compressor
    p=PB("Parallel Compressor"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    co=p.add(23,"Squash",6,par=[0,V(.60),V(.70),V(.05),V(.25),0]); mx=p.add(76,"Blend",15,par=[V(.65),V(.55),V(.00)])
    p.labels("dynamics", "compressor", "parallel", "punch")
    p.desc("Parallel (New York style) compression blending compressed and dry signals. Adds punch and sustain while preserving transients. Mix control sets the blend ratio.")
    p.c(i,0,co,0); p.c(i,0,mx,0); p.c(co,5,mx,2); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/E04_Parallel_Compressor.json")
