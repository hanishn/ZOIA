"""ZOIA Patch Library — looping category."""
from patch_lib import PB, V, add_test_pages

def gen_looping(d):
    # G01 Basic Looper (Stompswitches on page 0)
    p=PB("Basic Looper"); i=p.add(1,"Input",5); rc=p.add(44,"Record",13); pl=p.add(44,"Play",13,opt=[1,0,0,0,0,0,0,0]); st=p.add(44,"Stop",13); o=p.add(2,"Output",5)
    lp=p.add(62,"Looper",2)
    p.labels("looper", "basic", "interactive", "live")
    p.desc("Basic looper with record, play, and stop stompswitches on the main page. Press Record to capture audio, Play to loop it, Stop to silence. Simple live looping.")
    p.c(i,0,lp,0); p.c(rc,0,lp,1); p.c(pl,0,lp,2); p.c(st,0,lp,3); p.c(lp,4,o,0); p.c(lp,4,o,1); add_test_pages(p); p.save(f"{d}/G01_Basic_Looper.json")

    # G02 Granular Freeze
    p=PB("Granular Freeze"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    gr=p.add(78,"Granular",2,par=[0,V(.50),V(.40),V(.60),V(.55),0]); lf=p.add(5,"Scan LFO",1,par=[V(.05)]); rv=p.add(26,"Hall",7,par=[0,V(.70),V(.45),0])
    p.labels("looper", "granular", "freeze", "ambient")
    p.desc("Granular processor that freezes and reshapes audio into evolving textures. LFO modulates grain position. Reverb smooths the output into ambient soundscapes.")
    p.c(i,0,gr,0); p.c(lf,1,gr,1); p.c(gr,5,rv,0); p.c(rv,3,o,0); p.c(rv,3,o,1); add_test_pages(p); p.save(f"{d}/G02_Granular_Freeze.json")

    # G03 Stutter Effect
    p=PB("Stutter Effect"); i=p.add(1,"Input",5); o=p.add(2,"Output",5)
    lf=p.add(5,"Chop LFO",1,par=[V(.30)]); gt=p.add(35,"Chop Gate",1,par=[V(.50)]); vc=p.add(7,"Stutter VCA",2,par=[65535])
    p.labels("looper", "stutter", "glitch", "rhythmic")
    p.desc("Rhythmic stutter gate using LFO to chop the audio into rapid repeats. LFO rate controls stutter speed. Creates glitchy, rhythmic tremolo-like effects.")
    p.c(lf,1,gt,0); p.c(gt,2,vc,1); p.c(i,0,vc,0); p.c(vc,2,o,0); p.c(vc,2,o,1); add_test_pages(p); p.save(f"{d}/G03_Stutter_Effect.json")

    # G04 Ambient Looper (Stompswitch on page 0)
    p=PB("Ambient Looper"); i=p.add(1,"Input",5); rc=p.add(44,"Record",13); o=p.add(2,"Output",5)
    lp=p.add(62,"Looper",2); rv=p.add(27,"Shimmer",7,par=[0,V(.80),V(.55),V(.50),0])
    p.labels("looper", "ambient", "reverb", "interactive")
    p.desc("Looper feeding into lush reverb for ambient loop layering. Press the Record stompswitch to capture. Loops are bathed in reverb for dreamy textures.")
    p.c(i,0,lp,0); p.c(rc,0,lp,1); p.c(lp,4,rv,0); p.c(rv,4,o,0); p.c(rv,4,o,1); add_test_pages(p); p.save(f"{d}/G04_Ambient_Looper.json")
