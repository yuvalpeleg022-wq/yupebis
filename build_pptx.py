#!/usr/bin/env python3
"""Avengers: Doomsday — 3D Copper Glow Presentation (15 slides)"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from lxml import etree

# ── DIMENSIONS & COLORS ──────────────────────────────────────────────────────
W = Inches(13.3)
H = Inches(7.5)

BLACK       = RGBColor(0x00,0x00,0x00)
WHITE       = RGBColor(0xFF,0xFF,0xFF)
COPPER      = RGBColor(0xC8,0x79,0x41)
AMBER       = RGBColor(0xE8,0x92,0x3A)
GLOW_ORG    = RGBColor(0xFF,0x78,0x20)
CREAM       = RGBColor(0xF5,0xE6,0xD0)
LT_GRAY     = RGBColor(0xCC,0xCC,0xCC)
DARK_CARD   = RGBColor(0x11,0x11,0x11)
DARK2       = RGBColor(0x0A,0x0A,0x0A)

A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'

def rh(c): return str(c)  # RGBColor.__str__ returns 'RRGGBB'

# ── LOW-LEVEL HELPERS ─────────────────────────────────────────────────────────
def rect(slide, l, t, w, h, fc=None, bc=None, bpt=0, tr=0.0):
    s = slide.shapes.add_shape(1, int(l), int(t), int(w), int(h))
    if fc:
        s.fill.solid(); s.fill.fore_color.rgb = fc
        if tr > 0: s.fill.fore_color.transparency = tr
    else:
        s.fill.background()
    if bc and bpt > 0:
        s.line.color.rgb = bc; s.line.width = Pt(bpt)
    else:
        s.line.fill.background()
    return s

def oval(slide, l, t, w, h, fc, tr=0.0):
    s = slide.shapes.add_shape(9, int(l), int(t), int(w), int(h))
    s.fill.solid(); s.fill.fore_color.rgb = fc
    if tr > 0: s.fill.fore_color.transparency = tr
    s.line.fill.background()
    return s

def grad_rect(slide, l, t, w, h, stops, ang=90):
    """Rectangle with linear gradient fill. stops=[(pos,RGBColor,alpha_pct),...]"""
    s = slide.shapes.add_shape(1, int(l), int(t), int(w), int(h))
    sp = s._element.spPr
    for tag in [f'{{{A_NS}}}solidFill',f'{{{A_NS}}}gradFill',f'{{{A_NS}}}noFill',f'{{{A_NS}}}blipFill']:
        for e in sp.findall(tag): sp.remove(e)
    xml = f'<a:gradFill xmlns:a="{A_NS}"><a:gsLst>'
    for pos, col, al in stops:
        p2 = int(pos*100000); hx = rh(col)
        if al < 100:
            xml += f'<a:gs pos="{p2}"><a:srgbClr val="{hx}"><a:alpha val="{int(al*1000)}"/></a:srgbClr></a:gs>'
        else:
            xml += f'<a:gs pos="{p2}"><a:srgbClr val="{hx}"/></a:gs>'
    xml += f'</a:gsLst><a:lin ang="{int(ang*60000)}" scaled="0"/></a:gradFill>'
    sp.append(etree.fromstring(xml))
    s.line.fill.background()
    return s

def shadow(s, blur=28, dist=5, ang=135, al=75):
    sp = s._element.spPr
    for e in sp.findall(f'{{{A_NS}}}effectLst'): sp.remove(e)
    el = etree.SubElement(sp, f'{{{A_NS}}}effectLst')
    os = etree.SubElement(el, f'{{{A_NS}}}outerShdw')
    os.set('blurRad', str(int(Pt(blur)))); os.set('dist', str(int(Pt(dist))))
    os.set('dir', str(int(ang*60000))); os.set('algn','tl'); os.set('rotWithShape','0')
    sc = etree.SubElement(os, f'{{{A_NS}}}srgbClr'); sc.set('val','000000')
    etree.SubElement(sc, f'{{{A_NS}}}alpha').set('val', str(int(al*1000)))

def txb(slide, txt, l, t, w, h, font='Impact', sz=52, col=WHITE,
        bold=True, italic=False, align=PP_ALIGN.CENTER, wrap=True):
    b = slide.shapes.add_textbox(int(l),int(t),int(w),int(h))
    tf = b.text_frame; tf.word_wrap = wrap
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = txt
    r.font.name = font; r.font.size = Pt(sz)
    r.font.bold = bold; r.font.italic = italic
    r.font.color.rgb = col
    return b

def glow_txb(b, gc=AMBER, rad_pt=8):
    """Add text glow to all runs in a textbox"""
    for para in b.text_frame.paragraphs:
        for run in para.runs:
            rPr = run._r.find(f'{{{A_NS}}}rPr')
            if rPr is None: continue
            for e in rPr.findall(f'{{{A_NS}}}effectLst'): rPr.remove(e)
            ef = etree.SubElement(rPr, f'{{{A_NS}}}effectLst')
            gw = etree.SubElement(ef, f'{{{A_NS}}}glow')
            gw.set('rad', str(int(Pt(rad_pt))))
            sc = etree.SubElement(gw, f'{{{A_NS}}}srgbClr'); sc.set('val', rh(gc))
            etree.SubElement(sc, f'{{{A_NS}}}alpha').set('val','70000')

def hline(slide, l, t, w, col=COPPER):
    r = rect(slide, l, t, w, Emu(19050), fc=col); r.line.fill.background()

def bullets(slide, items, l, t, w, h, sz=14, bc=AMBER):
    b = slide.shapes.add_textbox(int(l),int(t),int(w),int(h))
    tf = b.text_frame; tf.word_wrap = True
    first = True
    for item in items:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False; p.alignment = PP_ALIGN.LEFT; p.space_before = Pt(7)
        r1 = p.add_run(); r1.text = '◆  '
        r1.font.name = 'Calibri'; r1.font.size = Pt(sz); r1.font.color.rgb = bc
        r2 = p.add_run(); r2.text = item
        r2.font.name = 'Calibri'; r2.font.size = Pt(sz); r2.font.color.rgb = LT_GRAY
    return b

# ── SLIDE TEMPLATE ────────────────────────────────────────────────────────────
def base(slide, accent=COPPER):
    slide.background.fill.solid(); slide.background.fill.fore_color.rgb = BLACK
    # Floor glow gradient
    grad_rect(slide, 0, H*0.75, W, H*0.25,
              [(0.0,RGBColor(0x25,0x12,0x00),100),(0.5,RGBColor(0x10,0x07,0x00),80),(1.0,BLACK,100)])
    # Floor line
    fl = rect(slide, 0, H*0.75, W, Emu(38100), fc=accent); fl.line.fill.background()
    # Light beams
    for xf, wf, rot in [(0.54,0.022,30),(0.74,0.014,30)]:
        b = rect(slide, W*xf, -H*0.15, W*wf, H*1.4, fc=accent, tr=0.88)
        b.rotation = rot

def depth_panels(slide, ac=COPPER):
    rect(slide,Inches(0.4),Inches(1.0),Inches(3.5),Inches(5.0),fc=DARK2,bc=ac,bpt=1,tr=0.45)
    rect(slide,Inches(9.4),Inches(1.2),Inches(3.5),Inches(4.8),fc=DARK2,bc=ac,bpt=1,tr=0.45)

def main_card(slide, l=Inches(1.5),t=Inches(0.9),w=Inches(10.3),h=Inches(5.8),bc=AMBER,bpt=2):
    c = rect(slide,l,t,w,h,fc=DARK_CARD,bc=bc,bpt=bpt,tr=0.15); shadow(c); return c

def halo(slide, cx, cy, w, h, col=GLOW_ORG, tr=0.70):
    return oval(slide,cx-w//2,cy-h//2,w,h,col,tr)

def pedestal(slide, col=COPPER):
    rw,rh2 = Inches(5),Inches(0.8)
    oval(slide,(W-rw)//2,int(H*0.70),rw,rh2,col,0.40)
    iw,ih2 = Inches(3),Inches(0.4)
    oval(slide,(W-iw)//2,int(H*0.725),iw,ih2,col,0.25)

def char_card(slide, l, t, w, h, name, actor, bc=AMBER):
    c = rect(slide,l,t,w,h,fc=DARK_CARD,bc=bc,bpt=1.5,tr=0.15); shadow(c)
    ih = int(h*0.62)
    rect(slide,l,t,w,ih,fc=RGBColor(0x1A,0x1A,0x1A))
    halo(slide,int(l+w//2),int(t+ih//2),int(w*0.7),int(ih*0.55),GLOW_ORG,0.75)
    hline(slide,l,t+ih,w,bc)
    txb(slide,name,l,t+ih+int(h*0.04),w,int(h*0.18),'Calibri',12,WHITE,True,False,PP_ALIGN.CENTER)
    txb(slide,actor,l,t+ih+int(h*0.26),w,int(h*0.18),'Calibri',10,bc,False,True,PP_ALIGN.CENTER)

def stat_card(slide, l, t, w, h, num, lbl, bc=AMBER, nsz=48):
    c = rect(slide,l,t,w,h,fc=DARK_CARD,bc=bc,bpt=1.5,tr=0.15); shadow(c)
    nb = txb(slide,num,l,t+int(h*0.08),w,int(h*0.52),'Impact',nsz,AMBER)
    glow_txb(nb,AMBER)
    txb(slide,lbl,l,t+int(h*0.60),w,int(h*0.38),'Calibri',12,WHITE,False,False,PP_ALIGN.CENTER)

# ── SLIDES 1–5 ────────────────────────────────────────────────────────────────
def slide1(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s); pedestal(s)
    halo(s,W//2,int(H*0.30),Inches(4),Inches(3),GLOW_ORG,0.65)
    t1 = txb(s,'⚡ A ⚡',Inches(4.9),Inches(0.4),Inches(3.5),Inches(1.8),'Impact',72,AMBER)
    glow_txb(t1,AMBER,10)
    t2 = txb(s,'AVENGERS: DOOMSDAY',Inches(0.8),Inches(2.3),Inches(11.7),Inches(1.5),'Impact',60,WHITE)
    glow_txb(t2,AMBER,10)
    txb(s,'"The Beginning of the End of the Multiverse Saga"',
        Inches(1.5),Inches(3.8),Inches(10.3),Inches(0.9),'Trebuchet MS',20,CREAM,False,True)
    txb(s,'Marvel Studios  ·  Phase 6  ·  December 18, 2026',
        Inches(2),Inches(6.65),Inches(9.3),Inches(0.6),'Calibri',14,COPPER,False)

def slide2(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s); main_card(s)
    t = txb(s,'WHAT IS THIS FILM?',Inches(1.7),Inches(1.0),Inches(9.9),Inches(0.85),'Impact',42,WHITE)
    glow_txb(t)
    hline(s,Inches(1.7),Inches(1.85),Inches(9.9))
    txb(s,'The 39th Marvel Cinematic Universe Feature Film',
        Inches(1.7),Inches(1.95),Inches(9.9),Inches(0.55),'Trebuchet MS',18,CREAM,False,True)
    bullets(s,[
        'Directed by Joe & Anthony Russo — returning to the MCU after Endgame',
        'Doctor Doom (RDJ) replaces Kang as the Multiverse Saga main villain',
        'Follows Thunderbolts* and Fantastic Four — bridging Phase 5 → Phase 6',
        'Sets the stage for the grand finale: Avengers: Secret Wars (2027)',
        'Largest ensemble cast in MCU history — across 3 parallel universes',
    ],Inches(1.8),Inches(2.55),Inches(9.8),Inches(3.3),sz=15)
    for i,(v,l) in enumerate([('39th','MCU Film'),('Phase 6','Timeline'),('Dec 2026','Release')]):
        bx = Inches(1.7)+i*Inches(3.6)
        rect(s,bx,Inches(6.1),Inches(3.3),Inches(0.55),fc=RGBColor(0x1A,0x0A,0x00),bc=COPPER,bpt=1)
        txb(s,f'{v}  ·  {l}',bx,Inches(6.1),Inches(3.3),Inches(0.55),'Calibri',13,AMBER,align=PP_ALIGN.CENTER)

def slide3(prs):
    RED=RGBColor(0xC0,0x20,0x20); DRED=RGBColor(0x30,0x05,0x05)
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s,RED)
    rect(s,Inches(0.4),Inches(1.0),Inches(3.5),Inches(5.0),fc=DRED,bc=RED,bpt=1,tr=0.45)
    rect(s,Inches(9.4),Inches(1.2),Inches(3.5),Inches(4.8),fc=DRED,bc=RED,bpt=1,tr=0.45)
    main_card(s,Inches(1.5),Inches(0.8),Inches(10.3),Inches(5.9),bc=RED)
    halo(s,W//2,int(H*0.42),Inches(5),Inches(3.5),RED,0.65); pedestal(s,RED)
    ds = txb(s,'⚔',W//2-Inches(1.5),Inches(0.95),Inches(3),Inches(1.5),'Impact',64,RED)
    glow_txb(ds,RED,10)
    t = txb(s,'VICTOR VON DOOM',Inches(1.2),Inches(2.3),Inches(10.9),Inches(1.0),'Impact',52,WHITE)
    glow_txb(t,RED)
    hline(s,Inches(1.5),Inches(3.3),Inches(10.3),RED)
    txb(s,'The Supreme Villain of the Multiverse Saga',
        Inches(1.5),Inches(3.4),Inches(10.3),Inches(0.5),'Trebuchet MS',18,CREAM,False,True,PP_ALIGN.CENTER)
    for i,(ttl,bod) in enumerate([
        ('RDJ Returns','Robert Downey Jr.\nback as villain'),
        ('Reality Threat','Bends all rules\nacross universes'),
        ('Replaced Kang','The true villain\nbehind the Saga'),
    ]):
        cx=Inches(1.8)+i*Inches(3.5)
        c=rect(s,cx,Inches(4.0),Inches(3.2),Inches(2.1),fc=DRED,bc=RED,bpt=1.5,tr=0.20); shadow(c)
        txb(s,ttl,cx,Inches(4.1),Inches(3.2),Inches(0.5),'Impact',16,RED,align=PP_ALIGN.CENTER)
        txb(s,bod,cx,Inches(4.6),Inches(3.2),Inches(1.4),'Calibri',12,LT_GRAY,False,align=PP_ALIGN.CENTER)

def slide4(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s)
    lc=rect(s,Inches(0.6),Inches(0.9),Inches(5.0),Inches(5.5),fc=RGBColor(0x15,0x10,0x08),bc=AMBER,bpt=2,tr=0.10)
    shadow(lc)
    halo(s,Inches(3),int(H*0.42),Inches(3),Inches(4),GLOW_ORG,0.65)
    txb(s,'[ RDJ ]',Inches(0.9),Inches(2.4),Inches(4.4),Inches(1.0),'Impact',44,AMBER,align=PP_ALIGN.CENTER)
    txb(s,'Tony Stark → Doctor Doom',Inches(0.9),Inches(3.4),Inches(4.4),Inches(0.6),
        'Trebuchet MS',16,CREAM,False,True,PP_ALIGN.CENTER)
    rc=rect(s,Inches(6.2),Inches(0.9),Inches(6.5),Inches(5.5),fc=DARK_CARD,bc=AMBER,bpt=2,tr=0.15)
    shadow(rc)
    t=txb(s,'RDJ: IRON MAN → IRON DOOM',Inches(6.4),Inches(1.05),Inches(6.1),Inches(1.1),'Impact',34,WHITE)
    glow_txb(t)
    hline(s,Inches(6.4),Inches(2.15),Inches(6.1))
    bullets(s,[
        'Returns to MCU — but NOT as Tony Stark',
        'Cast as Victor Von Doom, Marvel\'s iconic armored tyrant',
        'Same actor, completely different soul — cold, calculating',
        'Doom seeks to reshape all of reality across the multiverse',
        'Return revealed at San Diego Comic-Con 2024',
    ],Inches(6.4),Inches(2.3),Inches(6.1),Inches(2.6),sz=13)
    qt=txb(s,'"He saved us once.\nNow he threatens everything."',
        Inches(6.4),Inches(5.0),Inches(6.1),Inches(1.0),'Trebuchet MS',18,AMBER,False,True,PP_ALIGN.CENTER)
    # Timeline
    tl_y=Inches(6.88)
    tl=rect(s,Inches(0.6),int(tl_y),Inches(12.1),Emu(19050),fc=COPPER); tl.line.fill.background()
    for i,(lbl,yr) in enumerate([('Iron Man','2008'),('Endgame','2019'),('Doctor Doom','2026')]):
        xp=Inches(0.6)+i*Inches(4.6)
        oval(s,int(xp+Inches(0.8)),int(tl_y-Emu(114300)),Emu(228600),Emu(228600),AMBER)
        txb(s,f'{lbl}  {yr}',xp,int(tl_y-Inches(0.55)),Inches(3.0),Inches(0.5),'Calibri',12,AMBER,align=PP_ALIGN.CENTER)

def slide5(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s)
    t=txb(s,'THE RUSSO BROTHERS',Inches(1),Inches(0.2),Inches(11.3),Inches(0.8),'Impact',44,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t)
    hline(s,Inches(1),Inches(1.0),Inches(11.3))
    lp=rect(s,Inches(0.5),Inches(1.2),Inches(5.8),Inches(5.4),fc=RGBColor(0x15,0x10,0x08),bc=AMBER,bpt=2,tr=0.10)
    shadow(lp)
    halo(s,Inches(3.4),Inches(3.9),Inches(3.5),Inches(3),GLOW_ORG,0.65)
    txb(s,'[ Joe & Anthony\nRusso ]',Inches(0.8),Inches(2.7),Inches(5.2),Inches(1.4),'Impact',36,AMBER,align=PP_ALIGN.CENTER)
    txb(s,'Directors · Producers',Inches(0.8),Inches(4.1),Inches(5.2),Inches(0.5),'Calibri',14,CREAM,False,True,PP_ALIGN.CENTER)
    div=rect(s,Inches(6.55),Inches(1.2),Emu(57150),Inches(5.4),fc=COPPER); div.line.fill.background()
    rp=rect(s,Inches(6.8),Inches(1.2),Inches(6.0),Inches(5.4),fc=DARK_CARD,bc=AMBER,bpt=2,tr=0.15)
    shadow(rp)
    for i,(num,lbl) in enumerate([('4','MCU Films Directed'),('$2.79B','Endgame Box Office'),('#1','Highest-Grossing\nSuperhero Film'),('2027','Directing\nSecret Wars Too')]):
        row,col=i//2,i%2
        cx=Inches(7.0)+col*Inches(3.0); cy=Inches(1.4)+row*Inches(2.5)
        sc=rect(s,cx,cy,Inches(2.7),Inches(2.2),fc=RGBColor(0x18,0x0D,0x02),bc=COPPER,bpt=1.5,tr=0.15)
        shadow(sc)
        nb=txb(s,num,cx,cy+Inches(0.12),Inches(2.7),Inches(0.9),'Impact',34,AMBER,align=PP_ALIGN.CENTER)
        glow_txb(nb,AMBER)
        txb(s,lbl,cx,cy+Inches(1.0),Inches(2.7),Inches(1.1),'Calibri',12,LT_GRAY,False,align=PP_ALIGN.CENTER)

# ── SLIDES 6–10 ───────────────────────────────────────────────────────────────
def slide6(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s)
    t=txb(s,'THE HEROES',Inches(1),Inches(0.1),Inches(11.3),Inches(0.7),'Impact',40,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.5),Inches(0.8),Inches(12.3))
    chars=[('Captain America','Anthony Mackie'),('Thor','Chris Hemsworth'),('Spider-Man','Tom Holland'),
           ('Shuri','Letitia Wright'),('Loki','Tom Hiddleston'),('Ant-Man','Paul Rudd'),
           ('Yelena','Florence Pugh'),('Sentry','Lewis Pullman'),('Namor','Tenoch Huerta')]
    cw,ch=Inches(4.1),Inches(2.1)
    for i,(ch2,act) in enumerate(chars):
        r2,c2=i//3,i%3
        char_card(s,Inches(0.3)+c2*(cw+Inches(0.2)),Inches(0.95)+r2*(ch+Inches(0.2)),cw,ch,ch2,act)

def slide7(prs):
    GOLD=RGBColor(0xD4,0xAF,0x37)
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s,GOLD); depth_panels(s,GOLD)
    mc=rect(s,Inches(1.0),Inches(0.7),Inches(11.3),Inches(4.3),fc=RGBColor(0x12,0x10,0x05),bc=GOLD,bpt=2.5,tr=0.10)
    shadow(mc)
    halo(s,W//2,int(H*0.33),Inches(6),Inches(3),GOLD,0.60); pedestal(s,GOLD)
    t=txb(s,'THE FANTASTIC FOUR',Inches(1.2),Inches(0.85),Inches(10.9),Inches(0.85),'Impact',46,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t,GOLD); hline(s,Inches(1.2),Inches(1.7),Inches(10.9),GOLD)
    txb(s,'"Marvel\'s First Family enters the Multiverse"',
        Inches(1.5),Inches(1.8),Inches(10.3),Inches(0.55),'Trebuchet MS',18,CREAM,False,True,PP_ALIGN.CENTER)
    txb(s,'[ FANTASTIC FOUR — PHASE 6 ]',Inches(3.5),Inches(2.4),Inches(6.3),Inches(2.0),'Impact',28,GOLD,align=PP_ALIGN.CENTER)
    for i,(ch2,act) in enumerate([('Reed Richards','Pedro Pascal'),('Sue Storm','Vanessa Kirby'),
                                   ('Human Torch','Joseph Quinn'),('The Thing','Ebon Moss-Bachrach')]):
        cw2,ch3=Inches(3.0),Inches(1.9)
        cx=Inches(0.35)+i*(cw2+Inches(0.2)); cy=Inches(5.1)
        c=rect(s,cx,cy,cw2,ch3,fc=DARK_CARD,bc=GOLD,bpt=1.5,tr=0.15); shadow(c)
        halo(s,int(cx+cw2//2),int(cy+ch3//2),int(cw2*0.6),int(ch3*0.7),GOLD,0.75)
        txb(s,ch2,cx,cy+Inches(0.4),cw2,Inches(0.5),'Calibri',13,WHITE,True,align=PP_ALIGN.CENTER)
        txb(s,act,cx,cy+Inches(0.9),cw2,Inches(0.5),'Calibri',11,GOLD,False,True,PP_ALIGN.CENTER)

def slide8(prs):
    PUR=RGBColor(0x7B,0x1F,0xA2); PLGT=RGBColor(0xAB,0x47,0xBC); PDARK=RGBColor(0x1A,0x05,0x25)
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s,PUR)
    rect(s,Inches(0.4),Inches(1.0),Inches(3.5),Inches(5.0),fc=PDARK,bc=PUR,bpt=1,tr=0.45)
    rect(s,Inches(9.4),Inches(1.2),Inches(3.5),Inches(4.8),fc=PDARK,bc=PUR,bpt=1,tr=0.45)
    main_card(s,Inches(1.5),Inches(0.8),Inches(10.3),Inches(5.9),bc=PUR)
    halo(s,W//2,int(H*0.42),Inches(5),Inches(3.5),PLGT,0.65); pedestal(s,PUR)
    xl=txb(s,'X',W//2-Inches(1.5),Inches(0.95),Inches(3),Inches(1.5),'Impact',80,PLGT,align=PP_ALIGN.CENTER)
    glow_txb(xl,PLGT,12)
    t=txb(s,'THE X-MEN ARRIVE',Inches(1.2),Inches(2.4),Inches(10.9),Inches(0.9),'Impact',48,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t,PLGT); hline(s,Inches(1.5),Inches(3.3),Inches(10.3),PUR)
    for i,(ch2,act) in enumerate([('Professor X','Patrick Stewart'),('Beast','Kelsey Grammer')]):
        cx=Inches(2.5)+i*Inches(5.5)
        c=rect(s,cx,Inches(3.5),Inches(4.8),Inches(2.2),fc=PDARK,bc=PUR,bpt=1.5,tr=0.20); shadow(c)
        halo(s,int(cx+Inches(2.4)),int(Inches(4.6)),Inches(2),Inches(1.5),PLGT,0.70)
        txb(s,ch2,cx,Inches(3.65),Inches(4.8),Inches(0.6),'Impact',22,WHITE,align=PP_ALIGN.CENTER)
        txb(s,act,cx,Inches(4.25),Inches(4.8),Inches(0.5),'Calibri',16,PLGT,False,True,PP_ALIGN.CENTER)
    txb(s,'"The Multiverse makes everything possible."',
        Inches(1.5),Inches(5.9),Inches(10.3),Inches(0.8),'Trebuchet MS',20,PLGT,False,True,PP_ALIGN.CENTER)

def slide9(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s)
    mc=rect(s,Inches(0.5),Inches(0.7),Inches(12.3),Inches(5.9),fc=DARK_CARD,bc=AMBER,bpt=2,tr=0.15)
    shadow(mc)
    t=txb(s,'THE PLOT',Inches(0.7),Inches(0.85),Inches(11.9),Inches(0.8),'Impact',44,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.7),Inches(1.65),Inches(11.9))
    plot=("When an unprecedented threat fractures the boundaries between parallel universes, "
          "Earth's Mightiest Heroes are forced to unite across dimensions. Victor Von Doom — the "
          "brilliant megalomaniacal ruler of Latveria — has discovered a way to harness the energy "
          "of collapsed timelines, granting him control over the very fabric of reality.\n\n"
          "As Doom's plan to merge all universes under his iron rule accelerates, the Avengers, "
          "the Fantastic Four, and allies from across the multiverse must set aside their "
          "differences. The fate of every universe — past, present, and future — hangs in the "
          "balance, leading to the cataclysmic finale: Avengers: Secret Wars (2027).")
    pb=slide9_plot_box(s,plot)
    for i,(num,lbl) in enumerate([('3','Universes'),('39','MCU Films'),('1','Villain')]):
        cx=Inches(1.2)+i*Inches(3.8)
        rect(s,cx,Inches(5.8),Inches(3.4),Inches(0.6),fc=RGBColor(0x1A,0x0A,0x00),bc=COPPER,bpt=1)
        txb(s,f'{num}  ◆  {lbl}',cx,Inches(5.8),Inches(3.4),Inches(0.6),'Impact',20,AMBER,align=PP_ALIGN.CENTER)

def slide9_plot_box(s, plot):
    b=s.shapes.add_textbox(int(Inches(0.8)),int(Inches(1.8)),int(Inches(11.7)),int(Inches(3.8)))
    tf=b.text_frame; tf.word_wrap=True
    p=tf.paragraphs[0]; p.alignment=PP_ALIGN.LEFT
    r=p.add_run(); r.text=plot
    r.font.name='Calibri'; r.font.size=Pt(14); r.font.color.rgb=LT_GRAY
    return b

def slide10(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s)
    t=txb(s,'THE THUNDERBOLTS',Inches(1),Inches(0.1),Inches(11.3),Inches(0.75),'Impact',42,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.5),Inches(0.85),Inches(12.3))
    txb(s,'"The Government\'s Secret Weapon"',Inches(1.5),Inches(0.9),Inches(10.3),Inches(0.55),
        'Trebuchet MS',18,CREAM,False,True,PP_ALIGN.CENTER)
    chars=[('Yelena Belova','Florence Pugh'),('Red Guardian','David Harbour'),('U.S. Agent','Wyatt Russell'),
           ('Ghost','Hannah John-Kamen'),('Sentry','Lewis Pullman'),('Winter Soldier','Sebastian Stan')]
    cw,ch=Inches(4.1),Inches(2.65)
    for i,(ch2,act) in enumerate(chars):
        r2,c2=i//3,i%3
        char_card(s,Inches(0.3)+c2*(cw+Inches(0.25)),Inches(1.5)+r2*(ch+Inches(0.2)),cw,ch,ch2,act)

# ── SLIDES 11–15 ──────────────────────────────────────────────────────────────
def slide11(prs):
    SIL=RGBColor(0x70,0x70,0x70)
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s)
    t=txb(s,'RELEASE DATE',Inches(1),Inches(0.1),Inches(11.3),Inches(0.7),'Impact',40,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.5),Inches(0.8),Inches(12.3))
    halo(s,W//2,int(H*0.38),Inches(7),Inches(2),GLOW_ORG,0.60)
    dt=txb(s,'DECEMBER 18, 2026',Inches(0.8),Inches(1.1),Inches(11.7),Inches(1.7),'Impact',60,AMBER,align=PP_ALIGN.CENTER)
    glow_txb(dt,AMBER,12)
    # Left card: Avengers
    lc=rect(s,Inches(0.5),Inches(2.9),Inches(5.8),Inches(3.5),fc=DARK_CARD,bc=AMBER,bpt=2,tr=0.15); shadow(lc)
    halo(s,Inches(3.4),Inches(4.65),Inches(3),Inches(2),GLOW_ORG,0.65)
    txb(s,'AVENGERS:\nDOOMSDAY',Inches(0.7),Inches(3.1),Inches(5.4),Inches(1.2),'Impact',28,WHITE,align=PP_ALIGN.CENTER)
    txb(s,'Marvel Studios · Phase 6 · MCU #39',Inches(0.7),Inches(4.4),Inches(5.4),Inches(0.5),'Calibri',13,LT_GRAY,align=PP_ALIGN.CENTER)
    # VS
    txb(s,'VS',Inches(6.1),Inches(3.9),Inches(1.1),Inches(0.8),'Impact',32,AMBER,align=PP_ALIGN.CENTER)
    # Right card: Dune
    rc=rect(s,Inches(7.0),Inches(2.9),Inches(5.8),Inches(3.5),fc=RGBColor(0x0F,0x0F,0x0F),bc=SIL,bpt=1.5,tr=0.20); shadow(rc)
    txb(s,'DUNE:\nPART THREE',Inches(7.2),Inches(3.1),Inches(5.4),Inches(1.2),'Impact',28,SIL,align=PP_ALIGN.CENTER)
    txb(s,'Warner Bros. · Epic Sci-Fi',Inches(7.2),Inches(4.4),Inches(5.4),Inches(0.5),'Calibri',13,SIL,False,align=PP_ALIGN.CENTER)
    # Warning strip
    rect(s,Inches(0.5),Inches(6.5),Inches(12.3),Inches(0.72),fc=RGBColor(0x30,0x18,0x00),bc=AMBER,bpt=1)
    txb(s,'⚠  DOOMSDAY 2026 — BATTLE FOR IMAX SCREENS',
        Inches(0.5),Inches(6.5),Inches(12.3),Inches(0.72),'Impact',22,AMBER,align=PP_ALIGN.CENTER)

def slide12(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s)
    t=txb(s,'PHASE 6 TIMELINE',Inches(1),Inches(0.1),Inches(11.3),Inches(0.75),'Impact',42,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.5),Inches(0.85),Inches(12.3))
    tly=Inches(3.8)
    tl=rect(s,Inches(0.5),int(tly-Emu(28575)),Inches(12.3),Emu(57150),fc=COPPER); tl.line.fill.background()
    films=[('Brave New\nWorld','2025'),('Thunderbolts*','2025'),('Fantastic\nFour','2025'),
           ('Spider-Man:\nBrand New Day','2026'),('AVENGERS:\nDOOMSDAY ★','Dec 2026'),('Secret\nWars','2027')]
    sx,ex=Inches(0.8),Inches(12.5)
    sp2=(ex-sx)/(len(films)-1)
    for i,(ttl,yr) in enumerate(films):
        x=int(sx+i*sp2); star=(i==4)
        dc=AMBER if star else COPPER; ds=Emu(304800) if star else Emu(190500)
        if star: halo(s,x,int(tly),Inches(1.5),Inches(1.5),GLOW_ORG,0.65)
        oval(s,int(x-ds//2),int(tly-ds//2),ds,ds,dc)
        lc=AMBER if star else WHITE; lsz=16 if star else 13
        if i%2==0: ly,yry=int(tly-Inches(2.0)),int(tly-Inches(2.5))
        else: ly,yry=int(tly+Inches(0.6)),int(tly+Inches(1.4))
        lb=txb(s,ttl,int(x-Inches(1.0)),ly,Inches(2.0),Inches(1.0),'Impact',lsz,lc,align=PP_ALIGN.CENTER)
        if star: glow_txb(lb,AMBER)
        txb(s,yr,int(x-Inches(1.0)),yry,Inches(2.0),Inches(0.45),'Calibri',12,COPPER,align=PP_ALIGN.CENTER)

def slide13(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s)
    t=txb(s,'BY THE NUMBERS',Inches(1),Inches(0.1),Inches(11.3),Inches(0.75),'Impact',42,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.5),Inches(0.85),Inches(12.3))
    stats=[('39','MCU Film\nNumber'),('$2.79B','Endgame\nBenchmark'),('4','Russo Bros\nFilms'),
           ('3','Universes\nCollide'),('2026','Release\nYear'),('1','Victor\nVon Doom')]
    cw2,ch2=Inches(4.0),Inches(2.7)
    for i,(num,lbl) in enumerate(stats):
        r2,c2=i//3,i%3
        stat_card(s,Inches(0.3)+c2*(cw2+Inches(0.25)),Inches(1.0)+r2*(ch2+Inches(0.2)),cw2,ch2,num,lbl)

def slide14(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); depth_panels(s)
    mc=rect(s,Inches(0.6),Inches(0.7),Inches(12.1),Inches(5.0),fc=DARK_CARD,bc=AMBER,bpt=2,tr=0.15); shadow(mc)
    t=txb(s,'WHY IT MATTERS',Inches(0.8),Inches(0.85),Inches(11.7),Inches(0.85),'Impact',44,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t); hline(s,Inches(0.8),Inches(1.7),Inches(11.7))
    body=("Avengers: Doomsday is not merely a sequel — it is a culmination. After 15 years and 38 films, "
          "the Marvel Cinematic Universe converges here. Every thread, every sacrifice, every choice "
          "leads to this confrontation.\n\nThe decision to bring Robert Downey Jr. back as Victor Von Doom "
          "is Marvel's boldest creative gamble yet. The Russo Brothers return to deliver what promises to "
          "eclipse even Endgame in scope and emotional weight. This is where the Multiverse Saga ends — "
          "and everything changes.")
    bb=s.shapes.add_textbox(int(Inches(0.9)),int(Inches(1.85)),int(Inches(11.5)),int(Inches(2.9)))
    tf=bb.text_frame; tf.word_wrap=True
    p=tf.paragraphs[0]; r=p.add_run(); r.text=body
    r.font.name='Calibri'; r.font.size=Pt(14); r.font.color.rgb=LT_GRAY
    for i,(ic,lbl) in enumerate([('★','MCU Veterans\n+ New Heroes'),('◈','Multiverse Saga\nEndgame'),('◎',"RDJ's Most\nComplex Role")]):
        cx=Inches(0.7)+i*Inches(4.0)
        ic2=rect(s,cx,Inches(5.85),Inches(3.7),Inches(1.35),fc=RGBColor(0x1A,0x0A,0x00),bc=COPPER,bpt=1.5); shadow(ic2)
        txb(s,ic,cx,Inches(5.9),Inches(0.9),Inches(1.0),'Impact',28,AMBER,align=PP_ALIGN.CENTER)
        txb(s,lbl,cx+Inches(0.85),Inches(5.95),Inches(2.7),Inches(1.1),'Calibri',12,LT_GRAY,False,align=PP_ALIGN.LEFT)

def slide15(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    base(s); pedestal(s)
    halo(s,W//2,int(H*0.43),Inches(8),Inches(5),GLOW_ORG,0.60)
    halo(s,W//2,int(H*0.43),Inches(5),Inches(3),AMBER,0.45)
    t=txb(s,'DOOM IS COMING.',Inches(0.3),Inches(1.7),Inches(12.7),Inches(2.6),'Impact',88,WHITE,align=PP_ALIGN.CENTER)
    glow_txb(t,AMBER,14)
    txb(s,'December 18, 2026  ·  Marvel Studios',
        Inches(2),Inches(4.5),Inches(9.3),Inches(0.65),'Calibri',18,COPPER,False,align=PP_ALIGN.CENTER)

# ── MAIN ─────────────────────────────────────────────────────────────────────
def build():
    prs = Presentation()
    prs.slide_width = W; prs.slide_height = H
    builders = [slide1,slide2,slide3,slide4,slide5,slide6,slide7,slide8,slide9,
                slide10,slide11,slide12,slide13,slide14,slide15]
    for i,fn in enumerate(builders,1):
        print(f'  Slide {i:02d}/15 — {fn.__name__}')
        fn(prs)
    out = '/home/user/yupebis/avengers_doomsday.pptx'
    prs.save(out)
    print(f'\n✅ Saved: {out}')
    return out

if __name__ == '__main__':
    build()
