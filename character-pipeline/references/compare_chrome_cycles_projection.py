#!/usr/bin/env python3
"""Objective paired-view comparison; no image alignment, cropping or best-fit tuning."""
import pathlib,json,hashlib,numpy as np
from PIL import Image,ImageOps,ImageDraw
ROOT=pathlib.Path("artifacts/afro-matched-camera")
f=lambda n:np.asarray(Image.open(ROOT/n).convert("RGB"),dtype=np.uint8)
a=f("blender-white-silhouette.png");b=f("chrome-white-silhouette.png")
ca=f("blender-cycles-color.png");cb=f("chrome-matched-camera-pbr.png")
assert a.shape==b.shape==ca.shape==cb.shape==(960,720,3)
def m(x):return np.max(x,axis=2)>=128
aa=m(a);bb=m(b)
intersection=int((aa&bb).sum());union=int((aa|bb).sum())
assert union>10000,("NO_MODEL_IN_CAMERA_VIEW",union)
def bbox(mask):
 rows,cols=np.nonzero(mask)
 if not len(rows):return None
 return [int(cols.min()),int(rows.min()),int(cols.max()),int(rows.max())]
iou=intersection/union
recall=intersection/max(1,int(aa.sum()))
precision=intersection/max(1,int(bb.sum()))
diff=(aa^bb).astype(np.uint8)*255
both=aa&bb
mean_abs=np.mean(abs(ca.astype(float)-cb.astype(float))[both],axis=0).tolist() if both.any() else None
report={
 "schema":"blank.engine.cycles-webgl.matched-camera.20261018.v1",
 "projection":"Source Blender CAM_face_closeup local view_frame and world matrix converted by Blender Z-up -> glTF Y-up once; no post-registration",
 "silhouette":{"iou":round(iou,6),"recall":round(recall,6),"precision":round(precision,6),
  "blender_count":int(aa.sum()),"webgl_count":int(bb.sum()),
  "intersection_count":intersection,"union_count":union,
  "blender_bbox_px":bbox(aa),"webgl_bbox_px":bbox(bb),
  "binary_difference_px":int(diff.sum()/255),
  "engineering_reference_iou_ge_0_90":iou>=.9},
 "color":{"raw_foreground_mae_rgb":mean_abs,"caveat":"Cycles pathtracing and Three Point/Hemisphere lights not physically matched. NOT a photometric pass metric."},
 "quality":{"silhouette_geometry_gate_pass":iou>=.9,"cycles_webgl_photometric_parity_approved":False,
  "photorealism_approved":False,"deployment_allowed":False},
 "images":{}}
names=["blender-cycles-color.png","chrome-matched-camera-pbr.png","blender-white-silhouette.png","chrome-white-silhouette.png"]
for name in names:
 p=ROOT/name
 report["images"][name]={"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"bytes":p.stat().st_size}
imgs=[Image.fromarray(ca),Image.fromarray(cb),Image.fromarray(a),Image.fromarray(b)]
thumbs=[im.resize((540,720)) for im in imgs]
canvas=Image.new("RGB",(1080,1500),(30,32,37));d=ImageDraw.Draw(canvas)
labels=["Blender Cycles PBR","Chrome WebGL PBR (same camera)","Blender silhouette","Chrome silhouette"]
for i,img in enumerate(thumbs):
 x=(i%2)*540;y=(i//2)*750+30
 canvas.paste(img,(x,y));d.text((x+8,y-22),labels[i],fill=(230,230,230))
canvas.save(ROOT/"matched-camera-pairs.png")
Image.fromarray(diff,"L").save(ROOT/"silhouette-difference.png")
(ROOT/"matched-camera-report.json").write_text(json.dumps(report,indent=2)+"\n")
print("ACTUAL_BLENDER_CHROME_MATCHED_CAMERA_METRIC",json.dumps(report["silhouette"]),flush=True)
print("PHOTO_COLOR_NOT_PARITY_PROVEN",json.dumps(report["color"]),flush=True)
