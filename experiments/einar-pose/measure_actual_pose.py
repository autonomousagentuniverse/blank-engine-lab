#!/usr/bin/env python3
"""Measure REAL Einar publisher Blend evaluated pose dependencies in Blender.
No saved changes; no source binary re-distribution, no invented realism approval.
Runs in headless bpy 4.5.3, restores published textures before opening.
"""
import bpy,sys,os,json,math,hashlib,statistics,traceback
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

OUT=Path("artifacts/einar-pose-evaluation")
OUT.mkdir(parents=True,exist_ok=True)
ZIP=Path(".ci-einar/einar-official.zip")
BLEND=Path(".ci-einar/source/einar_release_v1.blend")
ZIP_SHA="3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7"
BLEND_SHA="1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b"
NAMES=["GEO-einar_head","GEO-eye.meniscus.L","GEO-eye.meniscus.R",
 "GEO-eye.cornea.L","GEO-eye.cornea.R","GEO-eye.L","GEO-eye.R",
 "GEO-einar_eyelash_surfdef","GEO-einar_hair_preview",
 "GEO-einar_hair_surfdef_proxy","GEO-einar_eyebrows_preview",
 "GEO-einar_eyebrows.proxy","GEO-einar_hair","GEO-einar_eyelashes",
 "GEO-einar_eyebrows"]
def digest(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for c in iter(lambda:f.read(1024*1024*4),b''):h.update(c)
 return h.hexdigest()

def fetch_evaluated(obj, max_points):
 """Capture same indexed world points from each pose; distinguish static from absent."""
 if obj is None:return {"status":"missing"}
 try:
  dg=bpy.context.evaluated_depsgraph_get()
  eva=obj.evaluated_get(dg)
  coords=[];total=0
  if obj.type=="MESH":
   mesh=eva.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
   try:
    total=len(mesh.vertices)
    if total:
     ids=list(range(0,total,max(1,math.ceil(total/max_points))))[:max_points]
     coords=[tuple(eva.matrix_world @ mesh.vertices[i].co) for i in ids]
   finally:eva.to_mesh_clear()
  elif obj.type=="CURVES":
   data=eva.data
   position=data.attributes.get("position")
   total=len(data.curves)
   if not position:raise RuntimeError("Evaluated hair curves missing position attribute")
   offsets=[data.curves[i].first_point_index for i in range(0,total,max(1,math.ceil(total/max_points)))]
   coords=[tuple(eva.matrix_world @ position.data[i].vector) for i in offsets]
  else:
   return {"status":"unsupported_type","type":obj.type}
  if not coords:return {"status":"no_evaluated_vertices","type":obj.type,"total":total}
  return {"status":"sampled","type":obj.type,"count":total,"sample_points":coords,
          "sample_count":len(coords),"modifiers":[m.type for m in obj.modifiers],
          "parent":obj.parent.name if obj.parent else None}
 except Exception as e:
  return {"status":"measurement_error","type":obj.type,"error":type(e).__name__+": "+str(e)[:240]}

def report_motion(a,b):
 if a.get("status")!="sampled" or b.get("status")!="sampled":
  return {"status":"not_measured","why":[a.get("status"),b.get("status")]}
 if a["count"]!=b["count"] or a["sample_count"]!=b["sample_count"]:
  return {"status":"incompatible_mesh_topology","neutral":a["count"],"posed":b["count"]}
 disps=[(Vector(y)-Vector(x)).length*1000 for x,y in zip(a["sample_points"],b["sample_points"])]
 return {"status":"measured","sample_count":len(disps),"mean_mm":round(statistics.mean(disps),5),
   "median_mm":round(statistics.median(disps),5),"max_mm":round(max(disps),5),
   "moved_fraction_over_0p1mm":round(sum(x>.1 for x in disps)/len(disps),5)}
def nearest_surface(a,b):
 if a.get("status")!="sampled" or b.get("status")!="sampled":
  return {"status":"unverified","reason":"missing paired evaluated vertex samples"}
 pos_a=a["sample_points"];pos_b=b["sample_points"]
 tree=KDTree(len(pos_b))
 for i,p in enumerate(pos_b):tree.insert(Vector(p),i)
 tree.balance()
 distances=[tree.find(Vector(p))[2]*1000 for p in pos_a]
 return {"status":"approximate_point_cloud_clearance_only","mean_nearest_mm":round(statistics.mean(distances),5),
  "median_nearest_mm":round(statistics.median(distances),5),
  "max_nearest_mm":round(max(distances),5),
  "qualification":"Unsigned subsampled vertex-to-vertex distance, NOT signed 3D surface clearance, tissue penetration or biomechanical proof"}

def capture(pose,max_count=768):
 collected={}
 for name in NAMES:
  obj=bpy.data.objects.get(name)
  # Hair simulation and Geometry Nodes curves can be expensive; keep bounded sample.
  cap=3000 if name=="GEO-einar_head" else (256 if name in ("GEO-einar_hair","GEO-einar_eyelashes","GEO-einar_eyebrows") else max_count)
  collected[name]=fetch_evaluated(obj,cap)
 return collected

def safe_out(frame):
 return {k:{a:v for a,v in item.items() if a!="sample_points"} for k,item in frame.items()}

def main():
 assert ZIP.exists() and BLEND.exists()
 assert digest(ZIP)==ZIP_SHA and digest(BLEND)==BLEND_SHA,"Publisher source hash mismatch"
 bpy.ops.wm.open_mainfile(filepath=str(BLEND.resolve()),load_ui=False)
 head=bpy.data.objects.get("GEO-einar_head")
 rig=bpy.data.objects.get("RIG-einar")
 assert head and head.type=="MESH" and rig and rig.type=="ARMATURE"
 keys=head.data.shape_keys.key_blocks
 blink_names=("D_Blink_Upper.L","D_Blink_Upper.R","D_Blink_Lower.L","D_Blink_Lower.R")
 for key in blink_names+("HeadLookLeft",):
  if keys.get(key) is None:raise RuntimeError("Publisher Einar missing actual pose shape key "+key)
 originals={k:keys[k].value for k in blink_names+("HeadLookLeft",)}
 # Guarantee independent, authentic controlled perturbations.
 def zero():
  for k in originals:keys[k].value=0.
  bpy.context.view_layer.update()
 try:
  zero()
  print("EINAR_POSE_NEUTRAL_BEGIN",flush=True)
  neutral=capture("neutral")
  # Blendshape-driven expression; this is NOT a claimed keyframed rig animation.
  for k in blink_names:keys[k].value=1.
  bpy.context.view_layer.update()
  print("EINAR_POSE_BLINK_SOURCE_SHAPE_KEYS",flush=True)
  blink=capture("blink")
  zero()
  keys["HeadLookLeft"].value=1.
  bpy.context.view_layer.update()
  print("EINAR_POSE_HEAD_LOOK_SOURCE_SHAPE_KEY",flush=True)
  look=capture("head_look_left")
  zero()
  # Actual rig-controller head turn, only if an identifiable head control exists.
  candidates=[p for p in rig.pose.bones
      if "head" in p.name.lower() and
      ("ctrl" in p.name.lower() or "control" in p.name.lower() or "fk" in p.name.lower()) and
      not any(x in p.name.lower() for x in ("eye","bulge","jaw","deform","tweak","neck"))]
  candidates=sorted(candidates,key=lambda p:(("head"!=p.name.lower().replace("ctrl-","").replace("ctrl_","")),len(p.name)))
  rig_test={"status":"not_tested","candidate_control_names":[p.name for p in candidates[:12]]}
  rig_frames=None
  if candidates:
   p=candidates[0]
   orig_mode=p.rotation_mode
   rot=p.rotation_euler.copy()
   try:
    p.rotation_mode="XYZ"
    p.rotation_euler.z=rot.z+math.radians(12)
    bpy.context.view_layer.update()
    print("EINAR_POSE_RIG_HEAD_CONTROL",p.name,flush=True)
    rig_frames=capture("rig_head_turn")
    rig_test={"status":"heuristic_control_probe","control_name":p.name,
              "angle_requested_deg":12,
              "interpretation":"Control was chosen by name heuristic; verify intended anatomical driver before calling this an authentic authored head turn"}
   finally:
    p.rotation_euler=rot;p.rotation_mode=orig_mode
    bpy.context.view_layer.update()
  def difference(pose):
   return {name:report_motion(neutral[name],pose[name]) for name in NAMES}
  eye_pair=[("GEO-eye.meniscus.L","GEO-eye.cornea.L"),("GEO-eye.meniscus.R","GEO-eye.cornea.R")]
  distances={}
  for mode,frame in [("neutral",neutral),("blink",blink),("head_look",look)]:
   distances[mode]={a:nearest_surface(frame[a],frame[b]) for a,b in eye_pair}
  analysis={
   "schema":"blank.einar.actual-pose-decomposition.v1",
   "source_archive_sha256":ZIP_SHA,"source_blend_sha256":BLEND_SHA,
   "license":"CC-BY Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
   "source_unchanged":True,"new_human_generated":False,"release_allowed":False,
   "pose_driver_types":{
     "blink":"Actual source authored head shape keys upper/lower L/R activated directly",
     "head_look":"Actual source authored HeadLookLeft shape key activated directly",
     "rig_head_turn":rig_test},
   "baseline":safe_out(neutral),
   "neutral_to_blink":difference(blink),
   "neutral_to_source_head_look":difference(look),
   "neutral_to_heuristic_rig_turn":difference(rig_frames) if rig_frames else None,
   "eye_meniscus_to_cornea_clearance_proxies":distances,
   "interpretation_limits":[
    "Head-look shape key is not a substitute for full published rig animation",
    "Rig bone name heuristic (if used) is an exploratory probe, not vetted animation",
    "Approximate unsigned point-to-point distances are NOT signed interpenetration or measured lid-margin clearance",
    "Hair preview or control proxies are NOT automatically the physically evaluated final groom",
    "A mesh showing zero motion could be a disconnected feature OR incorrectly stimulated control; no automatic pass",
    "Presence of original source geometry does not prove photoreal realism or exporter parity",
    "Visual acceptance and physics validation are not performed"]}
  (OUT/"actual-einar-pose-report.json").write_text(json.dumps(analysis,indent=2)+"\n")
  for state,mp in (("blink",analysis["neutral_to_blink"]),
                   ("headlook",analysis["neutral_to_source_head_look"])):
   print("EINAR_POSE_MEASURED",state,
     {x:mp[x] for x in ("GEO-einar_head","GEO-eye.meniscus.L","GEO-einar_eyelash_surfdef","GEO-einar_hair_preview","GEO-einar_hair_surfdef_proxy")},flush=True)
  sys.stdout.flush();os._exit(0)
 finally:
  for k,v in originals.items():keys[k].value=v
  bpy.context.view_layer.update()

if __name__=="__main__":
 try:main()
 except BaseException:
  traceback.print_exc()
  (OUT/"error.txt").write_text(traceback.format_exc())
  sys.stdout.flush();os._exit(1)
