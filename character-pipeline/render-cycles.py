#!/usr/bin/env python3
"""Run inside real Blender 4.5.3 bpy. Independently supplied head only.
Missing source textures, cameras or identity source MUST fail, never substitute clay.
"""
import bpy,json,hashlib,sys,traceback
from pathlib import Path
def digest(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
 return h.hexdigest()
def run(job,source):
 job=Path(job).resolve();source=Path(source).resolve()
 p=json.loads((job/"plan.json").read_text())
 lock=json.loads((job/"source.lock.json").read_text())
 if p["source"]["origin"] not in ("independent_original_human","licensed_cc0_variant"):
  raise ValueError("Unsupported character source class")
 if p["source"]["origin"]=="licensed_cc0_variant" and not p["source"].get("ancestors"):
  raise ValueError("CC0 ancestry required to render derived human")
 if digest(source)!=lock["source_sha256"] or lock["source_sha256"]!=p["source"]["sha256"]:
  raise ValueError("Source file SHA-256 changed after lock")
 bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
 missing=[]
 for image in bpy.data.images:
  if image.source=="FILE" and image.filepath and not image.packed_file:
   if not Path(bpy.path.abspath(image.filepath,library=image.library)).exists():
    missing.append(image.name)
 if missing:raise ValueError("External texture maps missing: "+",".join(missing[:10]))
 scene=bpy.context.scene
 if p["render"]["engine"]!="CYCLES" or p["render"]["profile"]!="blank-head-v1":
  raise ValueError("Wrong renderer/camera profile")
 scene.render.engine="CYCLES";scene.cycles.samples=p["render"]["samples"]
 scene.render.resolution_x=700;scene.render.resolution_y=700
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 frames=[]
 for v in p["views"]:
  camera=bpy.data.objects.get(v["camera"])
  if camera is None or camera.type!="CAMERA":raise ValueError("Missing camera "+v["camera"])
  scene.camera=camera
  file=v["id"]+".png";dest=job/file
  scene.render.filepath=str(dest)
  bpy.ops.render.render(write_still=True)
  if not dest.exists() or dest.stat().st_size<12000:
   raise ValueError("Missing original Cycles render "+file)
  frames.append({"id":v["id"],"camera":camera.name,"file":file,"sha256":digest(dest)})
  print("REAL_CYCLES_RENDER",file,flush=True)
 evidence={"schema":"blank.character.cycles.v1","plan_hash":lock["plan_hash"],
  "source_sha256":lock["source_sha256"],"engine":"CYCLES",
  "profile":"blank-head-v1","frames":frames,"human_visual_approval":"BLOCKED",
  "webgl_comparison":"NOT_DONE"}
 (job/"render-report.json").write_text(json.dumps(evidence,indent=2)+"\n")
 print("FOUR_CYCLES_IMAGES_NOT_VISUALLY_APPROVED",flush=True)
if __name__=="__main__":
 try:
  if len(sys.argv)!=3:raise ValueError("Usage: render-cycles.py <prepared-dir> <actual-source.blend>")
  run(sys.argv[1],sys.argv[2])
 except Exception:traceback.print_exc();sys.exit(1)
