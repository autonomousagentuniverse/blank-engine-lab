#!/usr/bin/env python3
from PIL import Image,ImageDraw,ImageStat
from pathlib import Path
import json
p=Path("artifacts/aster-01")
views=["front","three_quarter","profile","face_macro"]
names=[("ASTER-01 | "+v.replace("_"," ").title(),p/("aster-real-webgl-"+v+".png")) for v in views]
frames=[]
for label,path in names:
 with Image.open(path) as x:
  rgb=x.convert("RGB")
  if rgb.size!=(1024,840):raise ValueError("Rendered canvas dimensions mismatch")
  im=Image.new("RGB",(1024,890),"#0f1722")
  im.paste(rgb,(0,50));ImageDraw.Draw(im).text((18,19),label+" · Generated in Blender, rendered in Blank Engine",fill="#e2edf8")
  frames.append(im)
sheet=Image.new("RGB",(2048,1780),"#0f1722")
for i,x in enumerate(frames):sheet.paste(x,((i%2)*1024,(i//2)*890))
sheet.save(p/"aster-original-asset-contact-sheet.jpg",quality=87,optimize=True)
a=Image.open(p/"aster-real-webgl-face_macro.png").convert("RGB")
b=Image.open(p/"aster-real-webgl-head-animation.png").convert("RGB")
import numpy as np
x=np.asarray(a).astype("int16");y=np.asarray(b).astype("int16")
changed=int(np.any(np.abs(x-y)>10,axis=2).sum())
report=json.loads((p/"runtime-report.json").read_text())
report["authored_head_animation_pixels_changed_gt10"]=changed
report["head_motion_confirmed"]=changed>70
(p/"runtime-report.json").write_text(json.dumps(report,indent=2)+"\n")
if changed<70:raise RuntimeError("Head animation did not visibly alter independently rendered frames")
print("ASTER_NEW_MOTION_AND_IMAGES_PASS",json.dumps({"frame_diff":changed,"images":len(views)+1}))
