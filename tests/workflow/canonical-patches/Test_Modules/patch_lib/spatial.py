"""ZOIA Patch Library — spatial category."""
from patch_lib import PB, V, add_test_pages

def gen_spatial(d):
    # F01 Stereo Widener
    p=PB("Stereo Widener"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    sp=p.add(53,"Widen",2,par=[0,V(.80)])
    p.labels("spatial", "stereo", "widener", "utility")
    p.desc("Stereo width enhancement using spread module. Width control goes from mono to extra-wide. Simple and effective for adding stereo dimension.")
    p.c(i,0,sp,0); p.c(sp,2,o,0); p.c(sp,3,o,1); add_test_pages(p); p.save(f"{d}/F01_Stereo_Widener.json")

    # F02 Auto-Panner
    p=PB("Auto-Panner"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    lf=p.add(5,"Pan LFO",1,par=[V(.15)]); pn=p.add(57,"Panner",2,par=[0,V(.50)])
    p.labels("spatial", "panner", "auto", "stereo")
    p.desc("LFO-driven auto-panner that sweeps the signal between left and right. Rate controls pan speed. Creates dynamic stereo movement and spatial interest.")
    p.c(i,0,pn,0); p.c(lf,1,pn,1); p.c(pn,2,o,0); p.c(pn,3,o,1); add_test_pages(p); p.save(f"{d}/F02_Auto_Panner.json")

    # F03 Haas Stereo
    p=PB("Haas Stereo"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(13,"Haas Delay",4,par=[0,V(.02),0])
    p.labels("spatial", "haas", "stereo", "widening")
    p.desc("Haas effect stereo widening using a short delay on one channel. Creates perception of width from a mono source. Subtle and natural stereo enhancement.")
    p.c(i,0,o,0); p.c(i,0,dl,0); p.c(dl,4,o,1); add_test_pages(p); p.save(f"{d}/F03_Haas_Stereo.json")

    # F04 Mid-Side Processor
    p=PB("Mid-Side Processor"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    bl=p.add(64,"M/S Balance",2,par=[V(.50)]); sp=p.add(53,"Width",2,par=[0,V(.65)])
    p.labels("spatial", "mid-side", "stereo", "mastering")
    p.desc("Mid-side processor using audio balance and stereo spread. Adjusts the balance between center and side content. Useful for mastering and stereo sculpting.")
    p.c(i,0,bl,0); p.c(i,1,bl,1); p.c(bl,3,sp,0); p.c(sp,2,o,0); p.c(sp,3,o,1); add_test_pages(p); p.save(f"{d}/F04_Mid_Side_Processor.json")

    # F05 Micro Pitch Widen
    p=PB("Micro Pitch Widen"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    ps=p.add(87,"Detune",12,par=[0,V(.48),V(.50),0]); sp=p.add(53,"Spread",2,par=[0,V(.75)])
    p.labels("spatial", "pitch", "widening", "subtle")
    p.desc("Micro pitch shifting into stereo spread for subtle widening. Tiny pitch offset creates natural width without obvious pitch artifacts. Studio trick for thickening guitars.")
    p.c(i,0,ps,0); p.c(ps,3,sp,0); p.c(sp,2,o,0); p.c(sp,3,o,1); add_test_pages(p); p.save(f"{d}/F05_Micro_Pitch_Widen.json")
