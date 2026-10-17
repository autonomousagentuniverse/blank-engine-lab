#!/usr/bin/env python3
"""Make contact sheet only from authentic Blender-rendered PNGs, never synthesized imagery."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
base=Path("artifacts/human-a03")
d=json.loads((base/"report.json").read_text())
views=["front","three_quarter","profile","eyes_macro"]
images=[]
for v in views:
 f=base/(v+".png")
 if not f.exists():continue
 im=Image.open(f).convert("RGB")
 images.append((v,im))
if not images:raise RuntimeError("No Cycles evidence")
w=images[0][1].width;h=images[0][1].height
bg=Image.new("RGB",(2*w,2*(h+50)),(24,27,31));dr=ImageDraw.Draw(bg)
for i,(label,im) in enumerate(images):
 x=(i%2)*w;y=(i//2)*(h+50)
 bg.paste(im,(x,y+50));dr.text((x+16,y+17),label+" — real Blender Cycles",(236,239,240))
bg.save(base/"human-a03-cycles-contact-sheet.jpg",quality=90)
print("SHEET_SAVED",len(images))
