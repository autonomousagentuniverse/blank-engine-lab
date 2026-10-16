#!/usr/bin/env python3
"""Create review sheet; never substitute screenshots for human photorealism QA."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path('artifacts/hero-v4-einar')
labels=['front','three_quarter','profile','eyes_macro','eyes_three_quarter']
images=[]
for name in labels:
 p=root/(name+'.png')
 if not p.is_file():continue
 with Image.open(p) as image:
  rgb=image.convert('RGB')
  rgb.thumbnail((600,600))
  frame=Image.new('RGB',(620,665),'#20232b')
  x=(620-rgb.width)//2
  frame.paste(rgb,(x,50))
  ImageDraw.Draw(frame).text((12,15),name+' | genuine source Einar - Blender Cycles',fill='white')
  images.append((name,frame))
if images:
 page=Image.new('RGB',(620*min(3,len(images)),665*((len(images)+2)//3)),'#20232b')
 for i,(name,im) in enumerate(images):page.paste(im,((i%3)*620,(i//3)*665))
 page.save(root/'source-shaded-contact-sheet.jpg',quality=85,optimize=True)
print('EINAR_V4_CONTACT_SHEET_VIEWS',','.join(x[0] for x in images))
report_file=root/'shaded-preview-audit.json'
if report_file.exists():
 d=json.loads(report_file.read_text())
 d['contact_sheet_views']=[x[0] for x in images]
 d['no_automatic_photorealism_approval']=True
 report_file.write_text(json.dumps(d,indent=2)+'\n')
