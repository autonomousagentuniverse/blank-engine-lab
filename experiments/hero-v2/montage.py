#!/usr/bin/env python3
"""Aggregate truthful Blender Workbench source previews, never label them photo renders."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
p=Path('artifacts/hero-v2')
names=['axis_minus_y','axis_plus_y','axis_plus_x','axis_three_quarter']
images=[]
for n in names:
 im=Image.open(p/(n+'.png')).convert('RGB')
 canvas=Image.new('RGB',(768,818),'#1e2026')
 canvas.paste(im,(0,50))
 ImageDraw.Draw(canvas).text((15,17),n+' — clay geometry diagnostic',fill='white')
 images.append(canvas)
sheet=Image.new('RGB',(1536,1636))
for i,im in enumerate(images):sheet.paste(im,((i%2)*768,(i//2)*818))
sheet.save(p/'face-source-probe-contact-sheet.png',optimize=True)
print('HERO_V2_CLAY_PREVIEW_CONTACT_SHEET',str(p/'face-source-probe-contact-sheet.png'))
