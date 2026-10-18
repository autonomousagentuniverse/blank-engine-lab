#!/usr/bin/env python3
"""Held-out material/shading comparison AFTER independent neutral-patch fit."""
import json,pathlib,hashlib
import numpy as np
from PIL import Image,ImageDraw
P=pathlib.Path("artifacts/afro-neutral-light-calibration")
def img(name):
 a=np.asarray(Image.open(P/name).convert("RGB"))
 assert a.shape==(960,720,3),(name,a.shape)
 return a
def stats(ref,actual,mask):
 d=np.abs(ref.astype(np.float64)-actual.astype(np.float64))[mask]
 q=actual[mask]
 return {"mae_rgb":[round(float(x),4) for x in d.mean(axis=0)],
 "mean_error":round(float(d.mean()),4),
 "visible_pixels":int(mask.sum()),
 "white_clip_any_fraction":round(float(np.any(q>=254,axis=1).mean()),5),
 "black_clip_all_fraction":round(float(np.all(q<=1,axis=1).mean()),5)}
spec=json.loads((P/"blender-neutral-patch.json").read_text())
chrome=json.loads((P/"chrome-neutral-calibration.json").read_text())
factor=chrome["neutral_only_calibration"]
assert chrome["no_subject_pixel_fitting"]
assert not chrome["calibration_is_physical_radiometry"]
assert len(spec["heldout_character_views"])==2
matches={}
images=[]
for view in spec["heldout_character_views"]:
 name=view["name"]
 bm=img("blender-silhouette-"+name+".png").max(axis=2)>=128
 cm=img("chrome-silhouette-"+name+".png").max(axis=2)>=128
 union=int((bm|cm).sum());intersection=int((bm&cm).sum())
 assert union>10000
 mask=bm&cm
 ref=img(view["file"]);chr=img("chrome-character-"+name+".png")
 matches[name]={"silhouette_iou":round(intersection/union,6),
 "intersection_px":intersection,"union_px":union,
 "pixels_silhouette_mismatch":union-intersection,
 "color":stats(ref,chr,mask),
 "source_sha256":view["sha256"],
 "calibration_was_fit_to_character_pixels":False}
 images.extend([Image.fromarray(ref).resize((480,640)),Image.fromarray(chr).resize((480,640))])
 assert hashlib.sha256((P/view["file"]).read_bytes()).hexdigest()==view["sha256"]
 assert matches[name]["silhouette_iou"]>.90
out=Image.new("RGB",(960,1360),(22,25,30));draw=ImageDraw.Draw(out)
for k,image in enumerate(images):
 x=(k%2)*480;y=(k//2)*675+29
 out.paste(image,(x,y))
 label=["Blender front (held out)","Chrome front (neutral fit)",
        "Blender 40-degree (held out)","Chrome 40-degree (neutral fit)"][k]
 draw.text((x+12,y-23),label,fill="white")
out.save(P/"neutral-calibrated-heldout-comparison.png")
report={
 "schema":"blank.engine.heldout-neutral-light-transfer.v1",
 "blender_source_sha256":spec["source_sha256"],"glb_sha256":chrome["original_glb_sha256"],
 "patch_reference":spec["sampling"],"patch_calibration":factor,
 "heldout_character_results":matches,
 "global_scalar_neutral_only":factor["scalar"],
 "source_lamp_geometry":"three circular DISK emitters approximated as rectangular area lights with fixed source diameters and orientations",
 "units_not_necessarily_radiometric":True,
 "fit_character_pixels":False,"fit_lamp_to_each_camera":False,
 "calibration_method":"One neutral 0.18-linear rough diffuse patch; median central 40x40 pixels; scalar applied unchanged to source portrait and 40-degree holdout",
 "limits":["sRGB inverse of display-referred Blender Standard Medium High Contrast look is not scene-linear radiometry",
  "The physical emitter surface is DISK in Blender but RECTANGLE in Three.js",
  "No spectral color calibration, no HDR framebuffer signal, no facial photorealism validation",
  "The face/eyes/hair are inherited synthetic MPFB, not independently generated photorealistic subject"],
 "photorealism_approved":False,"physically_calibrated_lamps":False,
 "webgl_material_parity_release_approved":False,"production_deployed":False
}
(P/"neutral-light-transfer-report.json").write_text(json.dumps(report,indent=2)+"\n")
print("HELDOUT_LAMP_NEUTRAL_CALIBRATION",json.dumps({"patch":factor,"views":matches}),flush=True)
