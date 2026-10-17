#!/usr/bin/env python3
"""Run actual authored Einar rig eyelid controls identified from Blender driver variables.
NOT a forced shape-key test. Einar licensed CC-BY; source untouched, no 3D assets archived.
"""
import bpy,sys,os,math,json,hashlib,traceback
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from measure_actual_pose import fetch_evaluated,report_motion,nearest_surface,digest,BLEND_SHA,BLEND
OUT=Path("artifacts/einar-rig-blink");OUT.mkdir(parents=True,exist_ok=True)
CONTROL_NAMES=["Blink.L","Blink.R","Eyelid_Upper.L","Eyelid_Upper.R"]
KEY_NAMES=["D_Blink_Lower.L","D_Blink_Lower.R","D_Blink_Upper.L","D_Blink_Upper.R"]
NAMES=["GEO-einar_head","GEO-eye.meniscus.L","GEO-eye.meniscus.R",
 "GEO-einar_eyelash_surfdef","GEO-einar_eyelashes","GEO-eye.cornea.L",
 "GEO-eye.cornea.R","GEO-einar_eyebrows","GEO-einar_hair"]
def sample():
 return {n:fetch_evaluated(bpy.data.objects.get(n),max_points=1800 if n=="GEO-einar_head" else 512) for n in NAMES}
def current_values(head):
 eva=head.evaluated_get(bpy.context.evaluated_depsgraph_get())
 keys=eva.data.shape_keys.key_blocks
 return {n:round(keys[n].value,6) for n in KEY_NAMES}
def main():
 assert BLEND.exists() and digest(BLEND)==BLEND_SHA
 bpy.ops.wm.open_mainfile(filepath=str(BLEND.resolve()),load_ui=False)
 rig=bpy.data.objects['RIG-einar']
 head=bpy.data.objects['GEO-einar_head']
 ctl={name:rig.pose.bones.get(name) for name in CONTROL_NAMES}
 if not all(ctl.values()):raise RuntimeError("Expected authored original eyelid controls missing")
 original={n:p.location.copy() for n,p in ctl.items()}
 shape_fcurves={f.data_path:f for f in head.data.shape_keys.animation_data.drivers
     if any(k in f.data_path for k in KEY_NAMES)}
 assert len(shape_fcurves)==4
 def reset():
  for n,p in ctl.items():p.location=original[n]
  bpy.context.view_layer.update()
 def pose(mapping):
  reset()
  for n,y in mapping.items():
   p=ctl[n];p.location.y=original[n].y+y
  bpy.context.view_layer.update()
 try:
  reset()
  neutral=sample()
  nkeys=current_values(head)
  cases={
   "lower_left_control":{"Blink.L":-.006},
   "lower_right_control":{"Blink.R":-.006},
   "upper_left_control":{"Eyelid_Upper.L":-.006},
   "upper_right_control":{"Eyelid_Upper.R":-.006},
   "combined_rig_blink":{"Blink.L":-.006,"Eyelid_Upper.L":-.006,"Eyelid_Upper.R":-.006}}
  results={}
  for case,config in cases.items():
   pose(config)
   actual_keys=current_values(head)
   current=sample()
   changes={name:report_motion(neutral[name],current[name]) for name in NAMES}
   meniscus_nearest={
      side:nearest_surface(current["GEO-eye.meniscus."+side],current["GEO-eye.cornea."+side])
      for side in ("L","R")}
   results[case]={"actual_pose_bones_local_y_offsets_m":config,
                  "evaluated_driver_key_values":actual_keys,
                  "motion":changes,
                  "meniscus_cornea_nearest_vertex_proxy":meniscus_nearest}
   print("EINAR_REAL_RIG_BLINK",case,
     json.dumps({"driver_keys":actual_keys,
        "head":changes["GEO-einar_head"],
        "meniscus_l":changes["GEO-eye.meniscus.L"],
        "eyelash_surf":changes["GEO-einar_eyelash_surfdef"]}),flush=True)
  state={
   "schema":"blank.einar.authored-rig-blink.v1",
   "source_blend_sha256":BLEND_SHA,
   "source_unchanged":True,
   "license":"CC-BY Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
   "rig":"RIG-einar",
   "neutral_evaluated_keys":nkeys,
   "driver_connections":[{"path":p,"expression":fc.driver.expression,
      "targets":[{"bone":t.bone_target,"transform":t.transform_type,"space":t.transform_space}
        for v in fc.driver.variables for t in v.targets]} for p,fc in shape_fcurves.items()],
   "probe_cases":results,
   "selected_author_rig_controls":list(ctl),
   "new_human_generated":False,
   "release_allowed":False,
   "visual_approval":False,
   "limits":["Controls are actual source rig bones mapped by driver variables, but offsets are controlled experiment values, not publisher-authored animation keyframes.",
     "Face morph motion does not prove tight closed eyelids or tear meniscus physically plausible.",
     "Native CURVES motion sampled on evaluated strand roots; some evaluated hair is Geometry Nodes/proxy, not guaranteed final export representation.",
     "Unsigned point-cloud proximity to cornea is not signed surface clearance or validated collision.",
     "No source publisher asset exported or saved"]}
  (OUT/"authored-rig-blink.json").write_text(json.dumps(state,indent=2)+"\n")
  sys.stdout.flush();os._exit(0)
 finally:
  reset()
if __name__=="__main__":
 try:main()
 except BaseException:
  traceback.print_exc()
  (OUT/"error.txt").write_text(traceback.format_exc())
  sys.stdout.flush();os._exit(1)
