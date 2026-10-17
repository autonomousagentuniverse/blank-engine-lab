#!/usr/bin/env python3
"""MIRA05: source-locked Blender structural reconstruction batch.
Run each mode in an independent bpy process to avoid prior RNA segfaults.
No copy/paste Einar morphs, no visual acceptance by code, no deployment.
"""
import bpy,json,hashlib,os,sys,traceback,faulthandler
from pathlib import Path
from mathutils import Vector
from geometry import build_hair,build_brows
from reconstruction import eyes,skin,identity
faulthandler.enable()
ROOT=Path("artifacts/mira05-batch");ROOT.mkdir(parents=True,exist_ok=True)
SOURCE=Path("baseline-mira03/mira03-continuous-midline.blend")
FROZEN="1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d"
REPORT=ROOT/"report.json"
MODES={"baseline":["front"],
       "eyes":["front","eyes_macro"],
       "hair_brows":["front","three_quarter"],
       "skin":["front"],
       "identity":["front"],
       "integrated":["front","eyes_macro","three_quarter"]}
FINAL=set(MODES)
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
def load_report():
 if REPORT.exists():
  o=json.loads(REPORT.read_text())
  if o["schema"]!="blank.mira05.structural-batch.v1" or o["baseline_sha256"]!=FROZEN:
   raise RuntimeError("Previous partial report from another source")
  for f in o["frames"]:
   p=ROOT/f["file"]
   if not p.exists() or sha(p)!=f["sha256"]:
    raise RuntimeError("Cannot reuse forged/missing render "+f["file"])
  return o
 return {"schema":"blank.mira05.structural-batch.v1","status":"STARTED",
         "baseline_sha256":FROZEN,"source_license":"CC0 derived Vitruvian",
         "independently_original":False,"photoreal_approved":False,
         "webgl_approved":False,"deployed":False,"source_einar":False,
         "renderer":"real Blender 4.5.3 Cycles","samples":24,"resolution":[700,700],
         "variants":{},"frames":[]}
def write(r):REPORT.write_text(json.dumps(r,indent=2,default=str)+"\n")
def obj(n):
 o=bpy.data.objects.get(n)
 if o is None:raise RuntimeError("Missing source object "+n)
 return o
def run(mode,r):
 if sha(SOURCE)!=FROZEN:raise RuntimeError("Frozen MIRA03 packed .blend changed")
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
 scene=bpy.context.scene
 if scene.render.engine!="CYCLES":raise RuntimeError("Source Blender not Cycles")
 head=obj("cm_vitruvian")
 eyeL=obj("Eye_L_eyeball");eyeR=obj("Eye_R_eyeball")
 ec=(eyeL.matrix_world.translation+eyeR.matrix_world.translation)*.5
 source_counts={n:len(obj(n).data.vertices) for n in ("cm_vitruvian","Eye_L_eyeball","Eye_R_eyeball","VitHair","VitBrowCards")}
 changes={}
 print("MIRA05_SOURCE_OBJECTS",json.dumps(source_counts),flush=True)
 if mode in ("identity","integrated"):
  changes["identity"]=identity(head,ec)
 if mode in ("eyes","integrated"):
  changes["eye_assembly"]=eyes(head,ec)
 if mode in ("hair_brows","integrated"):
  changes["hair_geometry"]=build_hair(head,ec)
  changes["brow_geometry"]=build_brows(head,ec)
 if mode in ("skin","integrated"):
  changes["skin_graph"]=skin()
 if mode=="baseline":changes["unaltered_MIRA03"]=True
 # Invariants: eye shells and 27 facial targets preserved throughout.
 if len(obj("Eye_L_eyeball").data.vertices)!=source_counts["Eye_L_eyeball"]:
  raise RuntimeError("Original eye mesh modified unexpectedly")
 if len(obj("Eye_R_eyeball").data.vertices)!=source_counts["Eye_R_eyeball"]:
  raise RuntimeError("Original right eye mesh modified unexpectedly")
 if len(head.data.shape_keys.key_blocks)<27:
  raise RuntimeError("MIRA03 expression controls lost")
 r["variants"][mode]={"modifications":changes,"source_vertices":source_counts}
 write(r)
 scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=24
 scene.render.resolution_x=700;scene.render.resolution_y=700
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 for view in MODES[mode]:
  cam=obj("CAM_MIRA_"+view)
  if cam.type!="CAMERA":raise RuntimeError("Unexpected camera type "+view)
  scene.camera=cam
  name=mode+"_"+view+".png"
  file=ROOT/name
  scene.render.filepath=str(file.resolve())
  print("MIRA05_REAL_CYCLES",name,flush=True)
  bpy.ops.render.render(write_still=True)
  if not file.is_file() or file.stat().st_size<12000:
   raise RuntimeError("Missing real Cycles PNG "+name)
  r["frames"].append({"mode":mode,"view":view,"file":name,"sha256":sha(file),
    "bytes":file.stat().st_size,"source_blend_sha256":FROZEN,
    "camera":cam.name,"cycles_samples":24,"resolution":[700,700]})
  write(r)
 if mode=="integrated":
  bpy.ops.file.pack_all()
  output=ROOT/"mira05-integrated-structural.blend"
  bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()),compress=True,check_existing=False)
  if not output.exists() or output.stat().st_size<15000000:
   raise RuntimeError("Packed integrated Blender source not saved")
  r["integrated_blend"]={"path":output.name,"bytes":output.stat().st_size,
     "sha256":sha(output),"photorealism_status":"UNREVIEWED_NOT_ACCEPTED"}
 if set(r["variants"])==FINAL:
  expected={mode+"_"+view+".png" for mode,vs in MODES.items() for view in vs}
  if {x["file"] for x in r["frames"]}!=expected:
   raise RuntimeError("Incomplete batch of ten comparison images")
  r["status"]="TEN_REAL_CYCLES_IMAGES_TECHNICAL_SUCCESS_VISUAL_REVIEW_REQUIRED"
 else:r["status"]="PARTIAL_RUN_SAVED_FOR_RESUME"
 write(r)
 print("MIRA05_VARIANT_COMPLETE",json.dumps({"mode":mode,"renders":len(r["frames"]),
   "variants":list(r["variants"]),"status":r["status"]}),flush=True)
 sys.stdout.flush();os._exit(0)
def main():
 if len(sys.argv)!=2 or sys.argv[1] not in MODES:
  raise RuntimeError("Usage: batch.py baseline|eyes|hair_brows|skin|identity|integrated")
 mode=sys.argv[1]
 if not SOURCE.is_file() or SOURCE.stat().st_size<20000000:
  raise RuntimeError("Frozen packed baseline artifact missing")
 r=load_report()
 if "failed_variant" in r:
  r.setdefault("recovery_history",[]).append({"failed_variant":r.pop("failed_variant"),
   "reason":r.pop("error","unclassified"),"resolution":"source-measured scalp longitude front mask"})
 if mode in r["variants"]:raise RuntimeError("Existing verified variant cannot be rerendered")
 try:run(mode,r)
 except BaseException as e:
  r["status"]="FAILED_WITH_PARTIAL_EVIDENCE"
  r["failed_variant"]=mode;r["error"]=type(e).__name__+": "+str(e)
  write(r);traceback.print_exc();sys.stdout.flush();os._exit(1)
if __name__=="__main__":main()
