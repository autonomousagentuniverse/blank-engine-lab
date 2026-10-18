#!/usr/bin/env python3
"""Phase 13: fixed-camera pixel measurements; no postfit or image registration."""
import pathlib,json,hashlib,numpy as np
from PIL import Image,ImageDraw
P=pathlib.Path("artifacts/afro-light-isolation")
def rgb(n):
 a=np.asarray(Image.open(P/n).convert("RGB"),dtype=np.uint8)
 assert a.shape==(960,720,3),(n,a.shape)
 return a
sil1=rgb("blender-white-silhouette.png")
sil2=rgb("chrome-white-silhouette.png")
foreground=np.logical_and(np.max(sil1,axis=2)>=128,np.max(sil2,axis=2)>=128)
assert foreground.sum()>150000
blender_unlit=rgb("blender-emission-unlit.png")
chrome_unlit=rgb("chrome-unlit-basecolor.png")
blender_pbr=rgb("blender-cycles-color.png")
chrome_pbr_point=rgb("chrome-matched-camera-pbr.png")
chrome_pbr_area=rgb("chrome-source-area-proxy.png")
def measure(a,b,selection):
 x=np.abs(a.astype(np.float64)-b.astype(np.float64))[selection]
 assert len(x)>2000
 mean=np.mean(x,axis=0)
 return {"mae_rgb":[round(float(v),3) for v in mean],
  "mean_rgb_error":round(float(np.mean(mean)),3),
  "median_pixel_rgb_l1":round(float(np.median(np.mean(x,axis=1))),3),
  "pixel_count":int(selection.sum()),
  "chrome_clipped_255_any_channel_fraction":round(float(np.mean(np.any(b[selection]>=254,axis=1))),4),
  "chrome_clipped_black_any_channel_fraction":round(float(np.mean(np.any(b[selection]<=1,axis=1))),4)}
regions={
 "whole":foreground,
 "hair":foreground & (np.indices(foreground.shape)[0]>=195) & (np.indices(foreground.shape)[0]<420) &
   (np.indices(foreground.shape)[1]>=155) & (np.indices(foreground.shape)[1]<565),
 "head":foreground & (np.indices(foreground.shape)[0]>=200) & (np.indices(foreground.shape)[0]<590) &
   (np.indices(foreground.shape)[1]>=170) & (np.indices(foreground.shape)[1]<550),
 "torso":foreground & (np.indices(foreground.shape)[0]>=590)}
cases={
 "author_basecolor_unlit":{"a":blender_unlit,"b":chrome_unlit},
 "previous_approx_point_illumination":{"a":blender_pbr,"b":chrome_pbr_point},
 "fixed_source_size_rectarea_proxy":{"a":blender_pbr,"b":chrome_pbr_area}}
scores={name:{reg:measure(v["a"],v["b"],mask) for reg,mask in regions.items()} for name,v in cases.items()}
names=["blender-emission-unlit.png","chrome-unlit-basecolor.png","blender-cycles-color.png",
 "chrome-matched-camera-pbr.png","chrome-source-area-proxy.png"]
report={
 "schema":"blank.engine.human.albedo-vs-illumination.v1",
 "source_blend_sha256":"a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570",
 "source_glb_sha256":"1040b6330559865801b67ac57c293ddc07b94328cc735476ff4da47464c3399d",
 "source_camera":"CAM_face_closeup","no_alignment_or_exposure_optimization":True,
 "previous_silhouette_iou":.990318,
 "scores":scores,
 "interpretation_limits":[
  "Unlit Blender used Standard view with Medium High Contrast look, not linear sRGB and not colorimetrically calibrated",
  "Blender unlit material override copied Principled base colors; unsupported/alpha materials reported by source reference",
  "Three.js RectAreaLight W/(pi area) is an experimental dimensional normalization; not a physically validated conversion of Blender radiant watts to nits",
  "Area geometry and intensity orientation derived from scene transform without image-score fitting",
  "CPU Cycles and GPU raster approximate different transports; screenshots are diagnostic only",
  "No photoreal human quality, full-body multiview or production approval"],
 "visual_parity_certified":False,"photorealism_approved":False,"production_deployed":False,
 "files":{}}
for name in names:
 q=P/name
 report["files"][name]={"sha256":hashlib.sha256(q.read_bytes()).hexdigest(),"bytes":q.stat().st_size}
thumbs=[Image.fromarray(a).resize((450,600)) for a in [blender_unlit,chrome_unlit,blender_pbr,chrome_pbr_point,chrome_pbr_area]]
can=Image.new("RGB",(1350,1280),(25,27,32));draw=ImageDraw.Draw(can)
descs=["Unlit Blender base color","Unlit Chrome material","Original Blender Cycles PBR",
       "Chrome previous point lamps","Chrome source-sized area lamps"]
for i,im in enumerate(thumbs):
 x=(i%3)*450;y=(i//3)*640+35
 can.paste(im,(x,y));draw.text((x+12,y-23),descs[i],fill="white")
can.save(P/"phase13-albedo-light-comparison.png")
(P/"albedo-light-metrics.json").write_text(json.dumps(report,indent=2)+"\n")
for key,v in scores.items():
 print("COLOR_LIGHT_ISOLATION_MEASURED",key,json.dumps(v["whole"]),flush=True)
