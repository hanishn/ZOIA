"""ZOIA Patch Library — pedalboards category."""
from patch_lib import PB, V, add_test_pages

def gen_pedalboards(d):
    # J01 Clean Pedalboard
    p=PB("Clean Pedalboard"); i=p.add(1,"Guitar In",5); o=p.add(2,"Output",5)
    co=p.add(23,"Compressor",6,par=[0,V(.50),V(.45),V(.10),V(.30),0]); ch=p.add(29,"Chorus",2,par=[0,V(.12),V(.30),V(.45),0]); dl=p.add(13,"Delay",4,par=[0,V(.40),V(.30),V(.35),0]); rv=p.add(25,"Plate Verb",7,par=[0,V(.55),V(.40),0])
    p.labels("pedalboard", "clean", "multi-effect", "guitar")
    p.desc("Clean guitar pedalboard: compressor, chorus, delay, and reverb. Full signal chain for sparkling clean tones. Each effect adjustable on DSP page.")
    p.c(i,0,co,0); p.c(co,5,ch,0); p.c(ch,4,dl,0); p.c(dl,4,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/J01_Clean_Pedalboard.json")

    # J02 Rock Pedalboard
    p=PB("Rock Pedalboard"); i=p.add(1,"Guitar In",5); o=p.add(2,"Output",5)
    ds=p.add(11,"Overdrive",3,par=[0,V(.60),V(.55),0]); eq=p.add(73,"EQ",8,par=[0,V(.55),V(.60),V(.50),0]); cb=p.add(72,"Cabinet",2); dl=p.add(13,"Delay",4,par=[0,V(.35),V(.25),V(.30),0]); rv=p.add(26,"Hall",7,par=[0,V(.50),V(.35),0])
    p.labels("pedalboard", "rock", "multi-effect", "guitar")
    p.desc("Rock guitar pedalboard: distortion, EQ, cabinet sim, delay, and reverb. Complete gain stage with time effects. Ready for rock rhythm and lead tones.")
    p.c(i,0,ds,0); p.c(ds,3,eq,0); p.c(eq,4,cb,0); p.c(cb,1,dl,0); p.c(dl,4,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/J02_Rock_Pedalboard.json")

    # J03 Ambient Pedalboard
    p=PB("Ambient Pedalboard"); i=p.add(1,"Input",5); oL=p.add(2,"Left",5); oR=p.add(2,"Right",5)
    sh=p.add(27,"Shimmer",7,par=[0,V(.70),V(.60),V(.55),0]); gr=p.add(78,"Granular",12,par=[0,V(.45),V(.35),V(.50),V(.50),0]); pp=p.add(69,"Ping Pong",4,par=[0,V(.50),V(.40),V(.45)]); hl=p.add(26,"Hall",7,par=[0,V(.85),V(.60),0])
    p.labels("pedalboard", "ambient", "multi-effect", "guitar")
    p.desc("Ambient pedalboard: shimmer, granular delay, ping-pong delay, and hall reverb. Creates vast, evolving soundscapes. Stereo output for immersive width.")
    p.c(i,0,sh,0); p.c(sh,4,gr,0); p.c(gr,5,pp,0); p.c(pp,4,hl,0); p.c(hl,3,oL,0); p.c(hl,3,oR,0); add_test_pages(p); p.save(f"{d}/J03_Ambient_Pedalboard.json")

    # J04 Blues Pedalboard
    p=PB("Blues Pedalboard"); i=p.add(1,"Guitar In",5); o=p.add(2,"Output",5)
    co=p.add(23,"Comp",6,par=[0,V(.45),V(.40),V(.08),V(.25),0]); od=p.add(11,"Light OD",3,par=[0,V(.35),V(.55),0]); tr=p.add(71,"Tremolo",2,par=[0,V(.18),V(.45),0]); rv=p.add(36,"Spring",7,par=[0,V(.40),V(.35),0])
    p.labels("pedalboard", "blues", "multi-effect", "guitar")
    p.desc("Blues guitar pedalboard: compressor, overdrive, tremolo, and reverb. Smooth dynamics into warm crunch with vintage tremolo. Classic blues rig in a patch.")
    p.c(i,0,co,0); p.c(co,5,od,0); p.c(od,3,tr,0); p.c(tr,3,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/J04_Blues_Pedalboard.json")

    # J05 Shoegaze Pedalboard
    p=PB("Shoegaze Pedalboard"); i=p.add(1,"Guitar In",5); o=p.add(2,"Output",5)
    fz=p.add(66,"Fuzz Wall",3,par=[0,V(.80),V(.45),0]); ch=p.add(29,"Chorus",2,par=[0,V(.15),V(.50),V(.60),0]); dl=p.add(13,"Long Delay",4,par=[0,V(.55),V(.50),V(.45),0]); sh=p.add(27,"Shimmer",7,par=[0,V(.80),V(.60),V(.55),0])
    p.labels("pedalboard", "shoegaze", "multi-effect", "guitar")
    p.desc("Shoegaze pedalboard: fuzz, chorus, delay, and shimmer reverb. Wall of textured noise and shimmer. For layered, dreamy guitar sounds.")
    p.c(i,0,fz,0); p.c(fz,3,ch,0); p.c(ch,4,dl,0); p.c(dl,4,sh,0); p.c(sh,4,o,0); p.c(sh,4,o,1); add_test_pages(p); p.save(f"{d}/J05_Shoegaze_Pedalboard.json")

    # J06 Country Pedalboard
    p=PB("Country Pedalboard"); i=p.add(1,"Guitar In",5); o=p.add(2,"Output",5)
    co=p.add(23,"Comp",6,par=[0,V(.55),V(.50),V(.08),V(.30),0]); dl=p.add(13,"Slapback",4,par=[0,V(.08),V(.05),V(.40),0]); tr=p.add(71,"Tremolo",2,par=[0,V(.15),V(.35),0]); rv=p.add(82,"Room",7,par=[0,V(.20),V(.25),0])
    p.labels("pedalboard", "country", "multi-effect", "guitar")
    p.desc("Country guitar pedalboard: compressor, slapback delay, tremolo, and reverb. Tight dynamics with chicken-pickin delay. Nashville-ready tone.")
    p.c(i,0,co,0); p.c(co,5,dl,0); p.c(dl,4,tr,0); p.c(tr,3,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/J06_Country_Pedalboard.json")
