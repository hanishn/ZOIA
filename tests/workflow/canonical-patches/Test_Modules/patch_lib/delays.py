"""ZOIA Patch Library — delays category."""
from patch_lib import PB, V, add_test_pages

def gen_delays(d):
    # B01 Analog Delay
    p=PB("Analog Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(86,"Analog Dly",4,par=[0,V(.40),V(.45),V(.06),V(.12),V(.50),0]); f=p.add(0,"Tone Roll",8,par=[V(.65),V(.10)])
    p.labels("delay", "analog", "warm", "guitar")
    p.desc("Warm analog-style delay with modulation and low-pass filtering. Repeats darken naturally like a tape echo. Feedback and time control the rhythm of echoes.")
    p.c(i,0,dl,0); p.c(dl,6,f,0); p.c(f,3,o,0); p.c(f,3,o,1); add_test_pages(p); p.save(f"{d}/B01_Analog_Delay.json")

    # B02 Tape Echo
    p=PB("Tape Echo"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(86,"Tape Head",4,par=[0,V(.50),V(.55),V(.04),V(.15),V(.50),0]); f=p.add(0,"Tape Tone",8,par=[V(.60),V(.15)])
    p.labels("delay", "tape", "echo", "vintage")
    p.desc("Tape echo simulation with modulated delay and filtering. Repeats have subtle pitch wobble and tone rolloff. Classic vintage delay character.")
    p.c(i,0,dl,0); p.c(dl,6,f,0); p.c(f,3,o,0); p.c(f,3,o,1); add_test_pages(p); p.save(f"{d}/B02_Tape_Echo.json")

    # B03 Degrading Loop (has Stompswitch for record)
    p=PB("Degrading Loop"); i=p.add(1,"Input",5); st=p.add(44,"Record",13); o=p.add(2,"Output",5)
    lp=p.add(62,"Loop Tape",1); f=p.add(0,"Degrade",2,par=[V(.30),V(.10)]); cr=p.add(9,"Deteriorate",1,par=[0,V(.55),V(.45),0]); rv=p.add(36,"Room",7,par=[0,V(.40),V(.30),0])
    p.labels("delay", "looper", "degrading", "experimental")
    p.desc("Looper that degrades audio through bitcrusher and reverb on each pass. Press the Stompswitch to record. Each loop iteration becomes more distorted and washed out.")
    p.c(i,0,lp,0); p.c(st,0,lp,1); p.c(lp,4,f,0); p.c(f,3,cr,0); p.c(cr,3,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/B03_Degrading_Loop.json")

    # B04 Multi-Tap Delay
    p=PB("Multi-Tap Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    d1=p.add(13,"Tap 1",4,par=[0,V(.25),V(.20),V(.40),0]); d2=p.add(13,"Tap 2",4,par=[0,V(.125),V(.15),V(.35),0]); d3=p.add(13,"Tap 3",4,par=[0,V(.375),V(.25),V(.30),0]); mx=p.add(76,"Mix",15,par=[V(.75),V(.65),V(.55)])
    p.labels("delay", "multi-tap", "rhythmic", "stereo")
    p.desc("Three delay taps at different times mixed together. Creates complex rhythmic echo patterns. Each tap has independent time and feedback settings on DSP page.")
    p.c(i,0,d1,0); p.c(i,0,d2,0); p.c(i,0,d3,0); p.c(d1,4,mx,0); p.c(d2,4,mx,2); p.c(d3,4,mx,4); p.c(mx,6,o,0); p.c(mx,6,o,1); add_test_pages(p); p.save(f"{d}/B04_Multi_Tap_Delay.json")

    # B05 Ping Pong Delay
    p=PB("Ping Pong Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    pp=p.add(69,"Ping Pong",4,par=[0,V(.45),V(.40),V(.55)])
    p.labels("delay", "ping-pong", "stereo", "rhythmic")
    p.desc("Stereo ping-pong delay that bounces echoes between left and right outputs. Creates wide stereo motion. Adjust time and feedback on the DSP page.")
    p.c(i,0,pp,0); p.c(pp,4,o,0); p.c(pp,5,o,1); add_test_pages(p); p.save(f"{d}/B05_Ping_Pong_Delay.json")

    # B06 Grain Delay
    p=PB("Grain Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    gr=p.add(68,"Grain Dly",12,par=[0,V(.35),V(.25),V(.30),V(.50),0]); rv=p.add(36,"Verb Tail",7,par=[0,V(.50),V(.35),0])
    p.labels("delay", "grain", "granular", "texture")
    p.desc("Granular delay that chops echoes into grains with pitch and size control. Reverb tail smooths the texture. Creates unique stuttered and smeared echoes.")
    p.c(i,0,gr,0); p.c(gr,5,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/B06_Grain_Delay.json")

    # B07 Slapback Delay
    p=PB("Slapback Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(13,"Slapback",4,par=[0,V(.10),V(.05),V(.45),0]); co=p.add(23,"Punch",6,par=[0,V(.50),V(.40),V(.08),V(.30),0])
    p.labels("delay", "slapback", "short", "rockabilly")
    p.desc("Short slapback delay with compression for consistent level. Quick single repeat adds depth and presence. Classic rockabilly and country tone.")
    p.c(i,0,dl,0); p.c(dl,4,co,0); p.c(co,5,o,0); p.c(co,5,o,1); add_test_pages(p); p.save(f"{d}/B07_Slapback_Delay.json")

    # B08 Reverse Delay
    p=PB("Reverse Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    gr=p.add(68,"Rev Grain",12,par=[0,V(.40),V(.60),V(.35),V(.55),0]); rv=p.add(26,"Wash",7,par=[0,V(.60),V(.40),0])
    p.labels("delay", "reverse", "experimental", "ambient")
    p.desc("Granular delay configured for reversed grain playback with reverb. Creates backward-sounding echoes. Atmospheric and otherworldly delay textures.")
    p.c(i,0,gr,0); p.c(gr,5,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/B08_Reverse_Delay.json")

    # B09 Ducking Delay
    p=PB("Ducking Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(13,"Delay",4,par=[0,V(.40),V(.35),V(1.0),0]); en=p.add(40,"Detect",6,par=[V(.60)]); iv=p.add(17,"Invert",1); vc=p.add(7,"Duck VCA",6,par=[65535])
    p.labels("delay", "ducking", "guitar", "clean")
    p.desc("Delay that ducks in volume while you play and swells up during pauses. Envelope follower controls delay level. Keeps the dry signal clear during playing.")
    p.c(i,0,dl,0); p.c(dl,4,vc,0); p.c(i,0,en,0); p.c(en,2,iv,0); p.c(iv,1,vc,1); p.c(i,0,o,0,5000); p.c(vc,2,o,0,5000); p.c(i,0,o,1,5000); p.c(vc,2,o,1,5000); add_test_pages(p); p.save(f"{d}/B09_Ducking_Delay.json")

    # B10 Modulated Delay
    p=PB("Modulated Delay"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(86,"Mod Delay",4,par=[0,V(.45),V(.40),V(.15),V(.25),V(.50),0])
    p.labels("delay", "modulated", "chorus", "lush")
    p.desc("Delay with built-in modulation for chorused, lush repeats. Mod rate and depth add movement to echoes. Combines delay and chorus in one effect.")
    p.c(i,0,dl,0); p.c(dl,6,o,0); p.c(dl,6,o,1); add_test_pages(p); p.save(f"{d}/B10_Modulated_Delay.json")
