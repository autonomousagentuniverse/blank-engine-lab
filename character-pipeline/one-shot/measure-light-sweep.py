#!/usr/bin/env python3
"""Measure saved Cycles light probes against unchanged magenta hair pixel mask.
Uses display RGB only, not reflectance or photorealism scores.
"""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path("artifacts/one-shot-light-sweep")
BASE=Path("baseline-hair-ab")
source="07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rep=json.loads((BASE/"report.json").read_text())
assert rep["source_sha256"]==source
print("PREVIOUS_MATERIAL_TEST_MODES",[x["mode"] for x in rep["renders"]])
mag=next(x for x in rep["renders"] if x["mode"]=="magenta_binding_probe")
dark=next(x for x in rep["renders"] if x["mode"]=="dark_emission")
assert sha(BASE/mag["file"])==mag["sha256"]
assert sha(BASE/dark["file"])==dark["sha256"]
im=np.asarray(Image.open(BASE/mag["file"]).convert("RGB")).astype("float32")
yy=np.indices(im.shape[:2])[0]
mask=(im[:,:,0]>im[:,:,1]+65)&(im[:,:,2]>im[:,:,1]+18)&(yy<320)
n=int(mask.sum())
if n<4000:raise RuntimeError("Magenta source-backed hair mask too small "+str(n))
def lum(arr):
 v=arr[mask]
 return float(np.mean(.2126*v[:,0]+.7152*v[:,1]+.0722*v[:,2]))
def face_lum(arr):
 # Manual fixed crop from same CAM_MIRA_front (500x500); cheek tissue only.
 # This is a same-camera relative exposure measurement, not skin realism.
 cheek=np.concatenate([arr[260:320,180:215].reshape(-1,3),
                       arr[260:320,285:320].reshape(-1,3)],axis=0)
 return float(np.mean(.2126*cheek[:,0]+.7152*cheek[:,1]+.0722*cheek[:,2]))
e=lum(np.asarray(Image.open(BASE/dark["file"]).convert("RGB")).astype("float32"))
results={}
for mode in ("dim","medium","original"):
 r=json.loads((ROOT/(mode+".json")).read_text())
 assert r["source_sha256"]==source and r["camera"]=="CAM_MIRA_front"
 assert sha(ROOT/r["file"])==r["sha256"]
 arr=np.asarray(Image.open(ROOT/r["file"]).convert("RGB")).astype("float32")
 if arr.shape!=im.shape:raise RuntimeError("Camera/resolution changed")
 measured=lum(arr)
 results[mode]={"light_scale":{"dim":.32,"medium":.65,"original":1.}[mode],
   "lit_hair_brightness_display":round(measured,2),
   "dark_emission_brightness_display":round(e,2),
   "lit_to_emission_ratio":round(measured/e,3),
   "cheek_face_brightness_display":round(face_lum(arr),2),
   "image_sha256":r["sha256"],
   "original_light_energies":r["light_energies_original"],
   "test_light_energies":r["light_energies_tested"]}
face_reference=results["original"]["cheek_face_brightness_display"]
for row in results.values():
 row["face_brightness_retention_vs_original"]=round(row["cheek_face_brightness_display"]/face_reference,3)
audit={"schema":"blank.one-shot.real-light-calibration.v1",
       "face_roi_pixels":"fixed left and right cheek rectangles x180:215, x285:320, y260:320 in 500px CAM_MIRA_front",
       "face_roi_limit":"for this unchanged MIRA05 only; requires relabeling on any different person",
       "source_sha256":source,"magenta_mask_source_sha256":mag["sha256"],
       "hair_mask_pixel_count":n,
       "same_source_geometry_and_camera":True,"three_true_cycles_renders":True,
       "results":results,"calibrated_photorealism":False,
       "interpretation":"Display RGB luminance diagnostic only; light vs BRDF isolated by changing studio lamp energy while preserving material and geometry."}
(ROOT/"calibration-report.json").write_text(json.dumps(audit,indent=2)+"\n")
print("REAL_BLENDER_LIGHT_SWEEP_MEASURED",json.dumps({"mask_pixels":n,"ratios":{k:v["lit_to_emission_ratio"] for k,v in results.items()}}))
