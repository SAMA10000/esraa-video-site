#!/usr/bin/env python3
"""Animated Arabic infographic story video. Driven by measured NAMAA MP3 and segment manifest.
No audio generation or third-party services. Never auto-publishes. All visuals are original vector drawings.
"""
import argparse, bisect, hashlib, json, math, os, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, features
import numpy as np

W,H=720,1280
NAVY='#0C172A'; NAVY2='#12293B'; GOLD='#FDC56A'; GOLD2='#EBA84C'; INK='#142334'; CREAM='#FFF4DB'; TEAL='#75DCD1'; ROSE='#FF927C'; WHITE='#FFFFFF'; MUTED='#AAC4D0'
TITLE=['أغنى ملك في التاريخ؟','مانسا موسى','من زمان قوي','الدهب والتجارة','رحلة الحج','القافلة الكبيرة','الطريق للقاهرة','دهب وهدايا','هل الرقم صحيح؟','زمان غير دلوقتي','ثروة قديمة','التاريخ والاقتصاد','العلم والتجارة','حكاية أكبر من الدهب','الأثر اللي باقي','سؤال يستاهل نفكر','ثروة ولا تأثير؟']
MODES=['gold','crown','clock','trade','compass','caravan','cairo','goldrain','question','scroll','balance','trade','book','books','legacy','question','legacy']
FALLBACK_TEXT=[
 'تخيّلي إن فيه ملك، الناس لحد دلوقتي بتتكلم عن غناه.',
 'اسمه مانسا موسى، وكان حاكم مالي في غرب أفريقيا.',
 'ده كان من حوالي سبعمية سنة.',
 'أيامها كانت مالي دولة غنية ومهمة في التجارة.',
 'وكانت مشهورة بالدهب والملح.',
 'بس اللي خلّى ناس كتير تسمع عنه، كانت رحلة الحج.',
 'خرج من بلده بقافلة كبيرة، ومعاه هدايا من الدهب.',
 'ولما وصل القاهرة، الناس اتكلمت عن كرمه.',
 'وعن الدهب اللي وزّعه في رحلته.',
 'بس خدي بالك، مش كل رقم عن ثروته نقدر نصدّقه.',
 'زمان ماكانش فيه بنوك وتقارير مالية زي دلوقتي.',
 'وعشان كده، صعب نعرف ثروته كانت كام بالظبط.',
 'والقصة مش عن الفلوس وبس.',
 'لأن مالي كمان كانت مكان مهم للعلم والتجارة.',
 'واسم مانسا موسى فضل موجود في كتب التاريخ.',
 'والسؤال المهم، إيه اللي بيخلّي ثروة ملك تفضل حكاية؟',
 'الدهب اللي كان معاه، ولا الأثر اللي سابه بعده؟'
]

FONT_PATHS=[os.getenv('PHILOSOPHY_ARABIC_FONT',''),'/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf','/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
FONT=next((p for p in FONT_PATHS if p and Path(p).is_file()),None)
if not FONT: raise SystemExit('Arabic font not found (PHILOSOPHY_ARABIC_FONT)')
F={}
def ft(n):
    if n not in F: F[n]=ImageFont.truetype(FONT,n,layout_engine=ImageFont.Layout.RAQM)
    return F[n]
def eased(x):
    x=max(0,min(1,x));return 1-(1-x)**3

def rr(d,xy,rad=15,fill=CREAM,outline=None,width=1):
    d.rounded_rectangle(tuple(int(v) for v in xy),radius=rad,fill=fill,outline=outline,width=width)
def el(d,xy,fill,outline=None,width=1):
    d.ellipse(tuple(int(v) for v in xy),fill=fill,outline=outline,width=width)
def ln(d,pts,fill,width=8):
    d.line([(int(x),int(y)) for x,y in pts],fill=fill,width=width,joint='curve')
def tx(d,s,x,y,size=40,color=CREAM,anchor='mm',stroke=0):
    d.text((int(x),int(y)),str(s),fill=color,font=ft(size),anchor=anchor,language='ar',direction='rtl',stroke_width=stroke,stroke_fill=INK)
def text_width(d,s,size): return d.textlength(s,font=ft(size),direction='rtl',language='ar')

def lines_wrap(d,s,maxw,size,maxlines=3):
    words=s.replace('\n',' ').split(); arr=[];curr=''
    for word in words:
        nxt=(curr+' '+word).strip()
        if curr and text_width(d,nxt,size)>maxw:
            arr.append(curr);curr=word
        else: curr=nxt
    if curr:arr.append(curr)
    if len(arr)>maxlines:
        return lines_wrap(d,s,maxw,size-2,maxlines)
    return arr,size

# Render background once and copy each frame.
y,x=np.mgrid[0:H,0:W]
f=(x/W*.12 + y/H*.82).clip(0,1)
base=np.empty((H,W,3),dtype=np.uint8)
for i,(a,b) in enumerate([(11,22),(25,50),(43,68)]):base[:,:,i]=a+(b-a)*f
BG=Image.fromarray(base,'RGB')
d=ImageDraw.Draw(BG)
for i in range(12):
    cx=(i*173+83)%840-80;cy=(i*317+201)%1510-70
    el(d,(cx-84,cy-84,cx+84,cy+84),None,outline='#284053',width=2)
for i in range(30):
    cx=(i*53+17)%W;cy=(i*101+101)%H
    el(d,(cx,cy,cx+2,cy+2),'#26485A')

def coin(d,cx,cy,r=35,shine=0):
    el(d,(cx-r+3,cy-r+8,cx+r+3,cy+r+8),'#7E4E2C')
    el(d,(cx-r,cy-r,cx+r,cy+r),GOLD2,INK,4)
    el(d,(cx-r+8,cy-r+8,cx+r-8,cy+r-8),GOLD,INK,2)
    tx(d,'✦',cx,cy-1,int(r*.95),INK)
    if shine: ln(d,[(cx-r*.4,cy-r*.5),(cx-r*.15,cy-r*.7)],WHITE,4)

def camel(d,cx,cy,k=1):
    # simplified side silhouette of pack camel, not a historic reconstruction
    pts=[(-72,-5),(-40,-15),(-22,-55),(2,-30),(24,-63),(48,-40),(76,-22),(77,5),(48,18),(-48,20)]
    d.polygon([(int(cx+u*k),int(cy+v*k)) for u,v in pts],fill='#DF9A66')
    for lx in (-52,-19,30,58):
        ln(d,[(cx+lx*k,cy+15*k),(cx+(lx+7)*k,cy+69*k)],'#D28A56',max(4,int(11*k)))
    el(d,(cx+62*k,cy-16*k,cx+67*k,cy-10*k),INK)
    rr(d,(cx-33*k,cy-48*k,cx+31*k,cy-18*k),8,'#5BC0AD')

def book(d,x,y,w=135,h=160,open_=False):
    rr(d,(x-w/2,y-h/2,x+w/2,y+h/2),13,'#D88D59',INK,5)
    rr(d,(x-w/2+12,y-h/2+13,x+w/2-9,y+h/2-13),9,CREAM,INK,3)
    if open_:
        ln(d,[(x,y-h/2+15),(x,y+h/2-17)],INK,3)
        for k in range(4):
            ln(d,[(x-46,y-49+k*23),(x-12,y-49+k*23)],'#B9ADA2',3)
            ln(d,[(x+10,y-49+k*23),(x+46,y-49+k*23)],'#B9ADA2',3)
    else:
        tx(d,'✦',x,y,58,GOLD2)

def skyline(d,y,drift=0):
    ln(d,[(110,y),(626,y)],'#DFC89A',6)
    blocks=[(110,160,109),(164,214,181),(220,273,125),(276,333,170),(335,405,134),(420,477,175),(480,555,148),(567,621,112)]
    for idx,(x1,x2,h) in enumerate(blocks):
        rr(d,(x1,y-h,x2,y),4,'#E2A969')
        if idx in (1,3,5):
            rr(d,((x1+x2)/2-12,y-h-63,(x1+x2)/2+12,y-h),3,'#E2A969')
            d.polygon([((x1+x2)/2-14,y-h-63),((x1+x2)/2+14,y-h-63),((x1+x2)/2,y-h-91)],fill=GOLD)
        for j in range(2):rr(d,(x1+12+j*23,y-45,x1+23+j*23,y-20),5,'#B97B54')

def prop_card(d,t,mode,variant=0):
    y0=416 + math.sin(t*1.5)*8
    # 'glass' content stage with intentional white-space for iconic animation
    rr(d,(55,351,665,849),38,'#162C3C','#426174',3)
    rr(d,(74,369,646,832),30,'#1E3847')
    if mode in ('gold','goldrain'):
        for i in range(15):
            x=115+(i*89)%500; y=y0+((i*91+int(t*30))%330)-125
            coin(d,x,y,23+(i%3)*5,i%3==0)
        rr(d,(198,654,521,738),18,'#FFE2AB',INK,5)
        tx(d,'الدهب',360,694,49,INK)
    elif mode=='crown':
        d.polygon([(210,620),(205,492),(263,540),(320,448),(363,524),(437,439),(493,532),(525,478),(519,621)],fill=GOLD,outline=INK)
        rr(d,(207,614,524,672),13,GOLD2,INK,5)
        for px in (250,354,460):el(d,(px-13,606,px+13,630),TEAL,INK,3)
        tx(d,'مالي',364,739,49,CREAM)
    elif mode=='clock':
        ln(d,[(270,465),(475,465)],GOLD,13)
        ln(d,[(270,754),(475,754)],GOLD,13)
        d.polygon([(284,487),(461,487),(386,597),(386,626),(460,738),(284,738),(357,626),(357,597)],fill=CREAM,outline=GOLD)
        el(d,(345,622,397,676),GOLD2)
        tx(d,'٧٠٠ سنة',360,811,36,CREAM)
    elif mode in ('trade','caravan'):
        for i in range(3):
            camel(d,202+i*164+(t*10 if mode=='caravan' else math.sin(t)*8),625+(i%2)*25,.66+.08*(i%2))
        for i in range(9):coin(d,144+i*53,761+math.sin(t+i)*5,16)
    elif mode=='compass':
        el(d,(198,435,523,762),'#EBD9B6',GOLD,12)
        el(d,(224,460,496,735),None,INK,7)
        d.polygon([(360,469),(410,631),(360,608),(310,632)],fill=ROSE)
        d.polygon([(360,721),(311,556),(360,579),(407,555)],fill=TEAL)
        tx(d,'رحلة طويلة',361,788,36,CREAM)
    elif mode=='cairo':
        skyline(d,743)
        el(d,(474,416,573,515),GOLD)
        tx(d,'القاهرة',364,803,36,CREAM)
    elif mode=='question':
        el(d,(245,442,477,673),'#F6E9C7',GOLD,10)
        tx(d,'؟',362,549,142,INK)
        rr(d,(190,724,530,792),18,'#FFAC83')
        tx(d,'مش أي رقم',359,759,33,INK)
    elif mode=='scroll':
        rr(d,(181,441,535,762),24,'#EBD9B6',INK,7)
        for j in range(6): ln(d,[(233,501+j*37),(472-13*(j%3),501+j*37)],'#C59F78',5)
        coin(d,536,474,32)
        tx(d,'زمان',353,791,32,CREAM)
    elif mode=='balance':
        ln(d,[(363,459),(363,758)],GOLD,16)
        ln(d,[(192,525),(533,525)],GOLD,12)
        for x in (226,492):
            ln(d,[(x,527),(x-56,647)],MUTED,4);ln(d,[(x,527),(x+55,647)],MUTED,4)
            d.arc((x-76,603,x+76,696),start=0,end=180,fill=GOLD,width=12)
        coin(d,227,642,32);book(d,489,646,75,86,False)
    elif mode in ('book','books'):
        book(d,259+math.sin(t)*7,618,172,226,True)
        book(d,453-math.sin(t)*7,627,132,185,mode=='books')
        for i in range(4):el(d,(260+i*60,423+math.sin(t*2+i)*20,271+i*60,434+math.sin(t*2+i)*20),GOLD)
    elif mode=='legacy':
        coin(d,276,587,87,1)
        book(d,468,594,122,164,True)
        ln(d,[(182,751),(538,751)],TEAL,12)
        tx(d,'الأثر الباقي',357,805,34,CREAM)
    # variation B reveals new info motif without duplicating frames
    if variant:
        for i in range(3):
            z=math.sin(t*2+i*2)*6
            rr(d,(112+i*18,395+z,120+i*18,410+z),4,TEAL)
        rr(d,(531,392,626,430),14,'#F5BD74')
        tx(d,'✦',578,411,27,INK)

def cat(d,t,volume):
    # consistent friendly cat presenter, subtle audio-reactive mouth, ears, and tail
    x=565+math.sin(t*1.45)*3; y=1058+math.sin(t*2)*5
    # tail waves behind torso
    wave=math.sin(t*2.5)*24
    ln(d,[(x+70,y+126),(x+123+wave,y+97),(x+123+wave,y+27)],'#A86648',31)
    ln(d,[(x+70,y+126),(x+123+wave,y+97),(x+123+wave,y+27)],'#D48F61',22)
    el(d,(x-112,y+160,x+117,y+194),'#091725')
    rr(d,(x-93,y+46,x+99,y+195),60,'#277C83',INK,5)
    rr(d,(x-65,y+63,x+66,y+152),42,'#3F9EA4')
    ln(d,[(x-69,y+80),(x-115,y+54)],'#277C83',25)
    ln(d,[(x+73,y+80),(x+109,y+36+math.sin(t*3)*14)],'#277C83',25)
    el(d,(x-133,y+37,x-109,y+60),'#E9B48A',INK,3)
    el(d,(x+98,y+17+math.sin(t*3)*14,x+124,y+43+math.sin(t*3)*14),'#E9B48A',INK,3)
    # ears
    d.polygon([(x-91,y-70),(x-88,y-186),(x-14,y-113)],fill='#C98358')
    d.polygon([(x+90,y-70),(x+84,y-186),(x+12,y-113)],fill='#C98358')
    d.polygon([(x-79,y-92),(x-77,y-159),(x-29,y-109)],fill='#F1B0A4')
    d.polygon([(x+79,y-92),(x+74,y-159),(x+29,y-109)],fill='#F1B0A4')
    el(d,(x-115,y-147,x+115,y+82),'#D79A6C',INK,5)
    el(d,(x-107,y-5,x+5,y+79),'#F4D5A7')
    el(d,(x-5,y-5,x+106,y+79),'#F4D5A7')
    # no googly eyes, deliberate blinks
    blink=math.sin(t*3.3+1.1)>.993
    if blink:
        ln(d,[(x-77,y-54),(x-30,y-54)],INK,5);ln(d,[(x+31,y-54),(x+77,y-54)],INK,5)
    else:
        el(d,(x-78,y-73,x-29,y-26),CREAM,INK,4);el(d,(x+29,y-73,x+78,y-26),CREAM,INK,4)
        el(d,(x-54,y-64,x-37,y-33),INK);el(d,(x+38,y-64,x+55,y-33),INK)
        el(d,(x-50,y-59,x-44,y-52),WHITE);el(d,(x+42,y-59,x+48,y-52),WHITE)
    d.polygon([(x-13,y-7),(x+13,y-7),(x,y+7)],fill='#AF6570')
    mouth_open=max(6,min(31,int(7+38*volume)))
    el(d,(x-18,y+13,x+18,y+13+mouth_open),'#794349',INK,3)
    ln(d,[(x-36,y+22),(x-91,y+7)],'#8A5F4C',2);ln(d,[(x+35,y+22),(x+92,y+7)],'#8A5F4C',2)
    # necklace / mascot mark
    el(d,(x-12,y+89,x+12,y+113),GOLD,INK,2)

def frame(index,ts,duration,starts,segs,volumes):
    i=max(0,min(len(segs)-1,bisect.bisect_right(starts,ts)-1))
    seg=segs[i]; nxt=starts[i+1] if i+1<len(starts) else duration
    segment_t=max(0,ts-starts[i]); fraction=max(0,min(1,segment_t/max(0.01,nxt-starts[i])))
    variant=int(fraction>=.51)
    img=BG.copy();d=ImageDraw.Draw(img)
    # chapter timer at top; no fictitious progress metrics
    rr(d,(37,38,684,51),7,'#345064')
    rr(d,(37,38,37+647*ts/max(.1,duration),51),7,GOLD)
    tx(d,'حكايات فيها اقتصاد',361,107,25,TEAL)
    tx(d,('%02d' % (i+1))+' / '+('%02d'%len(segs)),365,151,21,MUTED)
    headline=TITLE[min(i,len(TITLE)-1)]
    if variant and i in (3,5,7,9,13,16):
        headline=['الدهب والملح','الرحلة اتشهرت','حكايات القاهرة','الحقيقة غير الأرقام','العلم كمان','السؤال ليكي'][[3,5,7,9,13,16].index(i)]
    enter=eased(segment_t/.36)
    yshift=int(44*(1-enter))
    tx(d,headline,360,252+yshift,47,GOLD)
    ln(d,[(230,311),(491,311)],'#315568',3)
    prop_card(d,ts,MODES[min(i,len(MODES)-1)],variant)
    # brief kinetic wipe at internal shot boundary
    flash=abs(fraction-.51)
    if flash<.035:
        opacity=1-flash/.035
        rr(d,(57,360,63+590*opacity,371),5,GOLD)
    # text card with subtle icon and cat nearby
    rr(d,(38,874,681,1185),32,'#0D2538','#3F6272',3)
    rr(d,(60,907,86,941),9,GOLD)
    tx(d,'✦',73,923,22,INK)
    text=seg['text']
    text_lines,sz=lines_wrap(d,text,440,31,3)
    ly=966 if len(text_lines)==3 else 1000
    for lntext in text_lines:tx(d,lntext,285,ly,sz,CREAM);ly+=61
    # responsive waveform line connected to actual audio envelope
    v=volumes[min(len(volumes)-1,int(ts*20))] if len(volumes) else .25
    for j in range(13):
        xx=90+j*25; amp=6+int(26*v*(.7+.3*math.sin(ts*9+j*.8)))
        ln(d,[(xx,1142-amp),(xx,1142+amp)],TEAL,5)
    cat(d,ts,v)
    return img

def ffprobe_duration(p):
    r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(p)],capture_output=True,text=True,check=True)
    return float(r.stdout.strip())

def load_timeline(data,duration):
    raw=data.get('chunks', data.get('segments', []))
    if not raw or len(raw)<5:raise RuntimeError('Narration manifest must contain at least five voice segments')
    segs=[]
    for k,chunk in enumerate(raw):
        txt=chunk.get('text') or FALLBACK_TEXT[min(k,len(FALLBACK_TEXT)-1)]
        # v12 manifest duration in 'sec'; other generator's 'seconds'
        secs=float(chunk.get('sec',chunk.get('seconds',0)))
        if secs<1.5:raise RuntimeError('Unacceptably short segment '+str(k+1))
        segs.append({'text':txt,'sec':secs})
    raw_total=sum(i['sec'] for i in segs)+max(0,len(segs)-1)*.68
    # normalize boundaries to actual MP3 length; no fixed clock assumption
    scale=duration/raw_total
    bounds=[0.0]; cursor=0.0
    for i,s in enumerate(segs):
        cursor+=(s['sec'] + (.68 if i<len(segs)-1 else 0))*scale
        bounds.append(cursor)
    bounds[-1]=duration
    return segs,bounds

def audio_envelope(mp3):
    r=subprocess.run(['ffmpeg','-v','error','-i',str(mp3),'-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True)
    a=np.frombuffer(r.stdout,dtype='<f4')
    if not len(a):return np.ones(1,dtype=np.float32)*.2
    N=800
    a=a[:len(a)//N*N].reshape(-1,N)
    rms=np.sqrt(np.mean(a*a,axis=1)+1e-9)
    pct=max(1e-4,float(np.quantile(rms,.90)))
    return np.clip(rms/(pct*1.8),0,1)

def make_video(audio,manifest,output,fps=24,smoke=0):
    audio=Path(audio);output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    if not audio.exists():raise RuntimeError('Audio not found')
    raw=json.loads(Path(manifest).read_text(encoding='utf8'))
    dur=ffprobe_duration(audio)
    if not (10<dur<300):raise RuntimeError('Unexpected audio duration: '+str(dur))
    segs,bounds=load_timeline(raw,dur)
    vols=audio_envelope(audio)
    frames=math.ceil((min(float(smoke),dur) if smoke else dur)*fps)
    if smoke:
        points=[0,min(4.0,dur*.25),min(dur*.5,9.0)]
        for i,t in enumerate(points):frame(0,t,dur,bounds,segs,vols).save(output.parent/('preview_%02d.png'%i))
        print('PREVIEW_ONLY',frames,len(segs),str(output.parent),flush=True)
        return
    cmd=['ffmpeg','-y','-nostdin','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(fps),'-i','pipe:0','-i',str(audio),'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',str(output)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    try:
        for n in range(frames):
            proc.stdin.write(frame(n,n/fps,dur,bounds,segs,vols).tobytes())
            if n and n%(fps*10)==0:print('RENDERED_SECONDS',n/fps,'TOTAL',dur,flush=True)
        proc.stdin.close();err=proc.stderr.read().decode('utf-8','replace');code=proc.wait()
        if code:raise RuntimeError('FFmpeg error '+str(code)+' '+err[-3000:])
    except BaseException:
        proc.kill();proc.wait();output.unlink(missing_ok=True);raise
    got=ffprobe_duration(output)
    if abs(got-dur)>1.0:output.unlink(missing_ok=True);raise RuntimeError(f'Video audio sync mismatch: video={got}, audio={dur}')
    if output.stat().st_size<400000:raise RuntimeError('Video file unexpectedly small')
    report={'status':'video_generated_needs_human_review','audio_seconds':round(dur,2),'video_seconds':round(got,2),'scenes':len(segs),'shots':len(segs)*2,'format':'720x1280','fps':fps,'source_audio_sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),'video_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'no_autopublish':True}
    (output.parent/'VIDEO_QA_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print('VIDEO_RENDER_SUCCESS',json.dumps(report,ensure_ascii=False),flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--audio',required=True);p.add_argument('--manifest',required=True);p.add_argument('--output',default='output/PHILOSOPHY_CAT_MANSA_MUSA.mp4');p.add_argument('--fps',type=int,default=24);p.add_argument('--preview',action='store_true')
    a=p.parse_args();make_video(a.audio,a.manifest,a.output,a.fps,smoke=1 if a.preview else 0)
if __name__=='__main__':main()