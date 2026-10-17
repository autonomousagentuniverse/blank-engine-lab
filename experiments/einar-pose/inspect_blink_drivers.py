#!/usr/bin/env python3
"""Inspect original Einar key-driver paths and isolate upper/lower blink shapes.
Separate from authored rig-controller animation: forced input is a diagnostic only.
"""
import bpy,json,sys,os,hashlib,math,traceback,statistics
from pathlib import Path
from mathutils import Vector
SRC=Path(".ci-einar/source/einar_release_v1.blend")
OUT=Path("artifacts/einar-driver-inspection");OUT.mkdir(parents=True,exist_ok=True)
SHA="1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b"
def hashfile(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
 return h.hexdigest()
def capture(o,limit=1200):
 if not o:return {"status":"missing"}
 dg=bpy.context.evaluated_depsgraph_get()
 eva=o.evaluated_get(dg)
 if o.type!="MESH":return {"status":"type","type":o.type}
 try:
  mesh=eva.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
  try:
   n=len(mesh.vertices);ids=list(range(0,n,max(1,math.ceil(n/limit))))
   return {"status":"measured","vertex_count":n,"sample":[tuple(eva.matrix_world@mesh.vertices[i].co) for i in ids]}
  finally:eva.to_mesh_clear()
 except Exception as e:return {"status":"error","message":type(e).__name__+":"+str(e)[:180]}
def motion(x,y):
 if x["status"]!="measured" or y["status"]!="measured" or len(x["sample"])!=len(y["sample"]):
  return {"status":"unverified","why":[x["status"],y["status"]]}
 dd=[(Vector(b)-Vector(a)).length*1000 for a,b in zip(x["sample"],y["sample"])]
 return {"status":"measured","mean_mm":round(statistics.mean(dd),5),"max_mm":round(max(dd),5),
 "median_mm":round(statistics.median(dd),5),"samples":len(dd)}
def main():
 assert hashfile(SRC)==SHA
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 head=bpy.data.objects["GEO-einar_head"]
 rig=bpy.data.objects["RIG-einar"]
 sk=head.data.shape_keys
 keys=sk.key_blocks
 name_ids=["D_Blink_Upper.L","D_Blink_Upper.R","D_Blink_Lower.L","D_Blink_Lower.R"]
 tracked=[bpy.data.objects.get(n) for n in ("GEO-einar_head","GEO-eye.meniscus.L","GEO-eye.meniscus.R",
  "GEO-einar_eyelash_surfdef","GEO-eye.cornea.L","GEO-eye.cornea.R")]
 drivers=[]
 for fc in (sk.animation_data.drivers if sk.animation_data else []):
  if not any(x in fc.data_path for x in ("Blink","HeadLook","Eyelid","eye")):continue
  variables=[]
  for v in fc.driver.variables:
   variables.append({"name":v.name,"type":v.type,"targets":[{
     "id":t.id.name if t.id else None,
     "data_path":t.data_path,"bone_target":t.bone_target,"transform_type":t.transform_type,
     "transform_space":t.transform_space} for t in v.targets]})
  drivers.append({"data_path":fc.data_path,"mute":fc.mute,"expression":fc.driver.expression,
                  "variables":variables})
 candidates=[p.name for p in rig.pose.bones if any(x in p.name.lower()
      for x in ("blink","eyelid","eye_upper","eye_lower","lid","eyeclose"))]
 objects=[o.name for o in tracked if o]
 vals={n:keys[n].value for n in name_ids}
 corresponding=[fc for fc in (sk.animation_data.drivers if sk.animation_data else [])
      if any(n in fc.data_path for n in name_ids)]
 start={o.name:capture(o) for o in tracked if o}
 try:
  for fc in corresponding:fc.mute=True
  for n in name_ids:keys[n].value=1.
  bpy.context.view_layer.update()
  forced={o.name:capture(o) for o in tracked if o}
  outcome={n:motion(start[n],forced[n]) for n in objects}
  key_values={n:{"stored":keys[n].value,
     "evaluated":head.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.shape_keys.key_blocks[n].value
     if head.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.shape_keys else None} for n in name_ids}
 finally:
  for n,v in vals.items():keys[n].value=v
  for fc in corresponding:fc.mute=False
  bpy.context.view_layer.update()
 result={"schema":"blank.einar.blink-driver-diagnostic.v1","source_blend_sha256":SHA,
  "license":"CC-BY Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
  "source_unchanged":True,"drivers":drivers,"blink_driver_count":len(corresponding),
  "blink_related_rig_bones":candidates,"forced_blendshape_test":{
    "method":"In-memory mute only blink shape-key FCurve drivers then set those exact source key values to one",
    "is_author_published_rig_animation":False,
    "motion":outcome,
    "key_values_during_test":key_values},
  "new_human_generated":False,"release_allowed":False,
  "limitations":["A forced shape-key morph is not the full rig animation",
    "No actual artist-authored blink control selected yet",
    "Zero movement in a secondary object may be due to control choice or source dynamics rather than a visual defect"]}
 (OUT/"blink-driver-diagnostic.json").write_text(json.dumps(result,indent=2)+"\n")
 print("EINAR_BLINK_CONTROL_DISCOVERY",json.dumps({"drivers":len(drivers),"blink_drivers_muted":len(corresponding),
 "rig_bone_candidates":candidates[:50],"forced_motion":outcome,"key_values":key_values}),flush=True)
 sys.stdout.flush();os._exit(0)
if __name__=="__main__":
 try:main()
 except BaseException:
  traceback.print_exc();(OUT/"error.txt").write_text(traceback.format_exc());sys.stdout.flush();os._exit(1)
