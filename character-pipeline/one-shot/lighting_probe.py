#!/usr/bin/env python3
"""Source-locked MIRA05 lighting A/B. No geometry/material edits or saves.
One Blender process per light setting, same eyes/camera/view/world.
"""
import bpy,sys,json,hashlib,traceback,os
from pathlib import Path
ROOT=Path("artifacts/one-shot-light-sweep");ROOT.mkdir(exist_ok=True,parents=True)
SOURCE=Path("source-mira05/mira05-integrated-structural.blend")
SOURCE_SHA="07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076"
LEVELS={"original":1.0,"lights_35pct":.35,"lights_10pct":.10}
REPORT=ROOT/"render-evidence.json"
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
 return h.hexdigest()
def read():
 if not REPORT.exists():
  return {"schema":"blank.lighting.ab.v1","source_sha256":SOURCE_SHA,
    "compared_shader":"identical unchanged MIRA05 saved hair BSDF",
    "scene_render":"real Cycles, same 500px camera and world, lights scaled",
    "frames":[],"status":"PARTIAL_HAIR_CALIBRATION_EVIDENCE"}
 r=json.loads(REPORT.read_text())
 if r["source_sha256"]!=SOURCE_SHA:raise AssertionError("Source hash mismatch")
 for f in r["frames"]:
  photo=ROOT/f["file"]
  if not photo.exists() or sha(photo)!=f["sha256"]:raise AssertionError("Prior render invalid")
 return r
def save(r):REPORT.write_text(json.dumps(r,indent=2)+"\n")
def main():
 if len(sys.argv)!=2 or sys.argv[1] not in LEVELS:
  raise ValueError("Usage: lighting_probe.py original|lights_35pct|lights_10pct")
 label=sys.argv[1]
 if not SOURCE.is_file() or sha(SOURCE)!=SOURCE_SHA:raise AssertionError("Frozen source missing/changed")
 r=read()
 if any(f["id"]==label for f in r["frames"]):raise AssertionError("Duplicate mode")
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
 scene=bpy.context.scene
 baseline={}
 for name in ["Mira_Key","Mira_Fill","Mira_Rim"]:
  o=bpy.data.objects.get(name)
  if o is None or o.type!="LIGHT" or o.data.type!="AREA":
   raise RuntimeError("Expected original studio light object missing "+name)
  baseline[name]=float(o.data.energy)
  if baseline[name]<=0:raise AssertionError("Inactive studio light "+name)
  o.data.energy=baseline[name]*LEVELS[label]
 # No change to world strength, source image maps, hair shaders, sculpt or pose.
 scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=12
 scene.render.resolution_x=500;scene.render.resolution_y=500
 scene.render.resolution_percentage=100
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.image_settings.file_format="PNG"
 cam=bpy.data.objects.get("CAM_MIRA_front")
 if cam is None or cam.type!="CAMERA":raise AssertionError("Front camera changed")
 scene.camera=cam
 photo=ROOT/(label+".png");scene.render.filepath=str(photo.resolve())
 print("ONE_SHOT_HAIR_LIGHT_SWEEP",label,LEVELS[label],baseline,flush=True)
 bpy.ops.render.render(write_still=True)
 if not photo.is_file() or photo.stat().st_size<12000:raise AssertionError("Cycles photo not saved")
 r["frames"].append({"id":label,"file":photo.name,"light_scale":LEVELS[label],
  "original_light_energy_W":baseline,"sha256":sha(photo),
  "bytes":photo.stat().st_size,"camera":cam.name,"resolution":[500,500],"samples":12})
 if len(r["frames"])==3:r["status"]="THREE_REAL_CYCLES_LIGHT_SWEEPS_COMPLETE_NEEDS_PIXEL_AND_HUMAN_REVIEW"
 save(r)
 print("ONE_SHOT_LIGHTING_AB_COMPLETE",json.dumps({"done":len(r["frames"]),"status":r["status"]}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException:
 traceback.print_exc();sys.stdout.flush();os._exit(1)
