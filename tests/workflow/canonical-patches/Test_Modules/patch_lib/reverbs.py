"""ZOIA Patch Library — reverbs category."""
from patch_lib import PB, V, add_test_pages

def gen_reverbs(d):
    # A01 Spring Reverb: Input->Drive->ReverbLite->ToneControl->Output
    p=PB("Spring Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dr=p.add(11,"Dwell Drive",3,par=[0,V(.35),V(.55),0]); rv=p.add(82,"Spring Tank",7,par=[0,V(.40),V(.55),0]); tn=p.add(12,"Tone",8,par=[0,V(.40),V(.55),V(.45),0])
    p.labels("reverb", "spring", "vintage", "guitar")
    p.desc("Classic spring reverb emulation with drive for saturation. Tone control shapes the reverb character. Great for surf rock and vintage guitar tones.")
    p.c(i,0,dr,0); p.c(dr,3,rv,0); p.c(rv,3,tn,0); p.c(tn,4,o,0); p.c(tn,4,o,1); add_test_pages(p); p.save(f"{d}/A01_Spring_Reverb.json")

    # A02 Plate Reverb
    p=PB("Plate Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    rv=p.add(25,"Plate",7,par=[0,V(.55),V(.50),0]); eq=p.add(73,"Bright EQ",8,par=[0,V(.48),V(.50),V(.55),0])
    p.labels("reverb", "plate", "studio", "vocal")
    p.desc("Smooth plate reverb with bright EQ shaping. Ideal for vocals, snare drums, and studio mixing. Adjust decay for short ambience to long sustain.")
    p.c(i,0,rv,0); p.c(rv,3,eq,0); p.c(eq,4,o,0); p.c(eq,4,o,1); add_test_pages(p); p.save(f"{d}/A02_Plate_Reverb.json")

    # A03 Hall Reverb
    p=PB("Hall Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    dl=p.add(13,"Pre-Delay",4,par=[0,V(.05),0,V(1.0),0]); rv=p.add(26,"Hall",7,par=[0,V(.75),V(.55),0]); fl=p.add(0,"Lo Cut",8,par=[V(.08),V(.05)])
    p.labels("reverb", "hall", "spatial", "ambient")
    p.desc("Large hall reverb with pre-delay and low-cut filter. Creates spacious depth for any instrument. Pre-delay separates the dry signal from the reverb tail.")
    p.c(i,0,dl,0); p.c(dl,4,rv,0); p.c(rv,3,fl,0); p.c(fl,4,o,0); p.c(fl,4,o,1); add_test_pages(p); p.save(f"{d}/A03_Hall_Reverb.json")

    # A04 Shimmer Reverb
    p=PB("Shimmer Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    sh=p.add(27,"Shimmer",7,par=[0,V(.80),V(.60),V(.55),0])
    p.labels("reverb", "shimmer", "ambient", "ethereal")
    p.desc("Pitch-shifted reverb that adds octave harmonics to the tail. Creates lush, ethereal textures. Pitch control sets the shimmer interval, decay controls sustain.")
    p.c(i,0,sh,0); p.c(sh,4,o,0); p.c(sh,4,o,1); add_test_pages(p); p.save(f"{d}/A04_Shimmer_Reverb.json")

    # A05 Ghostverb
    p=PB("Ghostverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    gv=p.add(67,"Ghost",7,par=[0,V(.65),V(.40),V(.55),0])
    p.labels("reverb", "ghostverb", "experimental", "ambient")
    p.desc("Spectral reverb with ghostly pitch-shifting artifacts. Speed control warps the reverb character. Perfect for horror soundscapes and experimental textures.")
    p.c(i,0,gv,0); p.c(gv,4,o,0); p.c(gv,4,o,1); add_test_pages(p); p.save(f"{d}/A05_Ghostverb.json")

    # A06 Ambient Wash
    p=PB("Ambient Wash"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    df=p.add(80,"Diffuser",7,par=[0,V(.70),V(.60),0]); rv=p.add(26,"Hall",7,par=[0,V(.90),V(.65),0])
    p.labels("reverb", "ambient", "diffuser", "wash")
    p.desc("Diffuser into hall reverb for smeared, washy ambience. Blurs transients into smooth pads. Best for guitar swells and ambient soundscapes.")
    p.c(i,0,df,0); p.c(df,3,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/A06_Ambient_Wash.json")

    # A07 Gated Reverb
    p=PB("Gated Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    rv=p.add(25,"Big Plate",7,par=[0,V(.80),V(.70),0]); en=p.add(40,"Detect",6,par=[V(.55)]); gt=p.add(35,"Gate",6,par=[V(.30)]); vc=p.add(7,"Gate VCA",6,par=[65535])
    p.labels("reverb", "gated", "drums", "80s")
    p.desc("80s-style gated reverb using envelope follower to control VCA. Reverb cuts off abruptly when input stops. Classic drum sound from the 1980s.")
    p.c(i,0,rv,0); p.c(rv,3,vc,0); p.c(i,0,en,0); p.c(en,2,gt,0); p.c(gt,2,vc,1); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/A07_Gated_Reverb.json")

    # A08 Reverse Reverb
    p=PB("Reverse Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    gv=p.add(67,"Reverse",7,par=[0,V(.70),V(.15),V(.60),0])
    p.labels("reverb", "reverse", "experimental", "ambient")
    p.desc("Ghostverb configured for reverse-style swelling reverb effect. Creates reversed envelope textures. Use for ambient guitar and cinematic builds.")
    p.c(i,0,gv,0); p.c(gv,4,o,0); p.c(gv,4,o,1); add_test_pages(p); p.save(f"{d}/A08_Reverse_Reverb.json")

    # A09 Cathedral
    p=PB("Cathedral"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    rv=p.add(26,"Cathedral",7,par=[0,V(.95),V(.60),0]); fl=p.add(0,"Mud Cut",8,par=[V(.10),V(.08)])
    p.labels("reverb", "cathedral", "large", "ambient")
    p.desc("Massive cathedral reverb with very long decay and low-cut filtering. Simulates vast stone spaces. Use sparingly for dramatic, expansive depth.")
    p.c(i,0,rv,0); p.c(rv,3,fl,0); p.c(fl,4,o,0); p.c(fl,4,o,1); add_test_pages(p); p.save(f"{d}/A09_Cathedral.json")

    # A10 Room Reverb
    p=PB("Room Reverb"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    rv=p.add(82,"Room",7,par=[0,V(.25),V(.40),0])
    p.labels("reverb", "room", "natural", "subtle")
    p.desc("Simple room reverb with moderate decay. Adds natural space without overwhelming the dry signal. Good all-purpose reverb for any instrument.")
    p.c(i,0,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/A10_Room_Reverb.json")
