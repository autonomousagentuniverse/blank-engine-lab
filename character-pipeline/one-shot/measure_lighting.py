#!/usr/bin/env python3
"""Pixel audit with hair mask anchored to a genuine magenta fiber material render.
Metrics are diagnostics, not photorealism or physically calibrated reflectance.
"""
import json,hashlib,sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path("artifacts/one-shot-light-sweep")
REF=Path("reference-hair-forensics")
def img(p):
 a=np.asarray(Image.open(p).convert("RGB"),dtype=np.float32)
 if a.shape!=(500,500,3):raise AssertionError("Wrong measured image geometry "+str(p))
 return a
def lum(a):
 return a[:,:,0]*.2126+a[:,:,1]*.7152+a[:,:,2]*.0722
def sha(p):
 return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 report=json.loads((ROOT/"render-evidence.json").read_text())
 old=json.loads((REF/"report.json").read_text())
 if report["status"]!="THREE_REAL_CYCLES_LIGHT_SWEEPS_COMPLETE_NEEDS_PIXEL_AND_HUMAN_REVIEW":
  raise AssertionError("The three real light-sweep images did not complete")
 if old["status"]!="FOUR_MATERIAL_TESTS_COMPLETE_NEEDS_IMAGE_ANALYSIS":raise AssertionError("Missing original hair reference")
 for record in old["renders"]:
  p=REF/record["file"]
  if not p.exists() or sha(p)!=record["sha256"]:raise AssertionError("Changed reference hair render")
 mag=img(REF/"magenta_binding_probe.png")
 mask=(mag[:,:,0]>145)&(mag[:,:,2]>105)&(mag[:,:,0]>mag[:,:,1]*1.45)&(mag[:,:,2]>mag[:,:,1]*1.25)
 count=int(mask.sum())
 if count<10000:raise AssertionError("Hair segmentation mask invalid "+str(count))
 emission=img(REF/"dark_emission.png")
 m0=float(lum(emission)[mask].mean())
 data={"schema":"blank.one-shot.real-light-calibration.v1",
 "source_sha256":report["source_sha256"],"mask_source":"original unchanged MIRA05 magenta emission A/B",
 "hair_mask_pixels":count,"emission_luma":round(m0,4),
 "metric_note":"display-sRGB pixel-weighted luma proxy, not linear reflectance",
 "lights":[],"stage_pass":False,"photorealism_approved":False}
 for r in report["frames"]:
  photo=ROOT/r["file"]
  if sha(photo)!=r["sha256"]:raise AssertionError("Changed Cycles image "+r["file"])
  image=img(photo)
  y=lum(image)
  hair=float(y[mask].mean())
  # Center cheek area indicates how dramatically skin is darkened as collateral.
  cheek=float(y[185:335,202:300].mean())
  data["lights"].append({"setting":r["id"],"scale":r["light_scale"],
   "hair_luma":round(hair,4),"hair_vs_dark_emission":round(hair/m0,4),
   "central_face_luma":round(cheek,4)})
 data["lights"].sort(key=lambda v:-v["scale"])
 (ROOT/"pixel-audit.json").write_text(json.dumps(data,indent=2)+"\n")
 print("MIRA05_SOURCE_LIGHTING_RESPONSE",json.dumps(data),flush=True)
if __name__=="__main__":main()
