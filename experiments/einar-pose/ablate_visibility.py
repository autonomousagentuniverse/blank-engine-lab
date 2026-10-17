#!/usr/bin/env python3
"""Blender Einar render-visible tear and eyelid-region contact ablation.
Treat source hidden-viewport objects as unmeasured, not proof of broken anatomy.
Never write original .blend; restore every changed visibility and modifier flag.
"""
import bpy,sys,os,json,math,traceback,hashlib,statistics
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from audit_tear_contact import snap,surface_nearest,motion,digest,box_stats,BLEND,PIN
OUT=Path("artifacts/einar-visibility-ablation");OUT.mkdir(parents=True,exist_ok=True)
EYES=["GEO-eye.meniscus.L","GEO-eye.meniscus.R",
      "GEO-eye.cornea.L","GEO-eye.cornea.R","GEO-eye.L","GEO-eye.R"]
BLINK=["Blink.L","Eyelid_Upper.L","Eyelid_Upper.R"]

def choose_region_vertices(head):
 """Use ORIGINAL semantic deform bone weights, never claim inferred actual lid margin."""
 groups={g.index:(g.name) for g in head.vertex_groups
   if "eyelid" in g.name.lower() and any(w in g.name.lower() for w in ("upper","lower"))}
 points={"L":[],"R":[]}
 for v in head.data.vertices:
  for weight in v.groups:
   name=groups.get(weight.group)
   if not name or weight.weight<.25:continue
   side="L" if name.endswith(".L") else "R" if name.endswith(".R") else None
   if side is not None:
    points[side].append(v.index)
  # May contain duplicates when skin vert belongs to more than one group
 return {side:sorted(set(p)) for side,p in points.items()},groups

def sample_original_region(head,indices):
 """Evaluated head, subsurf disabled to try preserve original indexed deform vertices."""
 m=subdivision=[x for x in head.modifiers if x.type=="SUBSURF"]
 old=[(m,m.show_viewport) for m in subdivision]
 try:
  for m in subdivision:m.show_viewport=False
  bpy.context.view_layer.update()
  dg=bpy.context.evaluated_depsgraph_get()
  obj=head.evaluated_get(dg)
  mesh=obj.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
  try:
   if len(mesh.vertices)!=len(head.data.vertices):
    return {"status":"unverified_topology_mapping","source_count":len(head.data.vertices),"eval_count":len(mesh.vertices)}
   samples={side:[tuple(obj.matrix_world@mesh.vertices[i].co) for i in ids] for side,ids in indices.items()}
   return {"status":"evaluated_source_lid_deform_regions","source_vertex_count":len(mesh.vertices),
            "per_eye_counts":{s:len(p) for s,p in samples.items()},"samples":samples,
            "qualification":"Skin vertices selected by source DEF-Eyelid bone weights >0.25, NOT an artist annotated actual lid margin"}
  finally:obj.to_mesh_clear()
 finally:
  for m,oldval in old:m.show_viewport=oldval
  bpy.context.view_layer.update()

def region_to_cornea(region,eye):
 if region.get("status")!="evaluated_source_lid_deform_regions":return {"status":"unverified","reason":"No stable original-index evaluation"}
 q=region["samples"][eye]
 if not q:return {"status":"unverified","reason":"No eyelid deformation vertices"}
 return q

def capture_eye_objects():
 return {name:snap(bpy.data.objects.get(name),full=True) for name in EYES}

def contact_case(objects,reg):
 out={}
 for side in ("L","R"):
  men=objects["GEO-eye.meniscus."+side]
  cor=objects["GEO-eye.cornea."+side]
  outer=objects["GEO-eye."+side]
  rr=region_to_cornea(reg,side)
  out[side]={
   "meniscus_to_cornea_evaluated_polygon":surface_nearest(men,cor),
   "meniscus_to_outer_eye_evaluated_polygon":surface_nearest(men,outer),
   "skin_eyelid_deformation_region_to_cornea":surface_nearest(
       {"status":"sampled","points":rr} if isinstance(rr,list) else rr,cor),
   "skin_eyelid_deformation_region_to_outer_eye":surface_nearest(
       {"status":"sampled","points":rr} if isinstance(rr,list) else rr,outer)}
 return out

def main():
 assert digest(BLEND)==PIN
 bpy.ops.wm.open_mainfile(filepath=str(BLEND.resolve()),load_ui=False)
 head=bpy.data.objects["GEO-einar_head"]
 rig=bpy.data.objects["RIG-einar"]
 controls={name:rig.pose.bones[name] for name in BLINK}
 initial_controls={n:p.location.copy() for n,p in controls.items()}
 watched=["GEO-eye.meniscus.L","GEO-eye.meniscus.R","GEO-einar_eyelash_surfdef"]
 orig_vis={n:bpy.data.objects[n].hide_viewport for n in watched}
 mods={}
 for n in watched:
  o=bpy.data.objects[n]
  mods[n]=[(m,m.show_viewport) for m in o.modifiers]
 eye_info={n:{"viewport_hidden_initially":bpy.data.objects[n].hide_viewport,
              "render_hidden_initially":bpy.data.objects[n].hide_render,
              "modifiers":[{"name":m.name,"type":m.type,
                "viewport":m.show_viewport,"render":m.show_render,
                "bound":getattr(m,"is_bound",None)} for m in bpy.data.objects[n].modifiers]}
             for n in watched}
 regions,group_names=choose_region_vertices(head)
 def reset():
  for n,p in controls.items():p.location=initial_controls[n].copy()
  bpy.context.view_layer.update()
 def pose_blink():
  reset()
  for n in BLINK:controls[n].location.y=initial_controls[n].y-.006
  bpy.context.view_layer.update()
 def measure_condition(tag):
  reset()
  normal_obj=capture_eye_objects()
  normal_lid=sample_original_region(head,regions)
  neutral_men={n:snap(bpy.data.objects[n],full=True) for n in watched}
  pose_blink()
  blink_obj=capture_eye_objects()
  blink_lid=sample_original_region(head,regions)
  blink_men={n:snap(bpy.data.objects[n],full=True) for n in watched}
  change={n:motion(neutral_men[n],blink_men[n]) for n in watched}
  out={"neutral":contact_case(normal_obj,normal_lid),
       "blink":contact_case(blink_obj,blink_lid),
       "component_blink_movement":change,
       "eyelid_region_neutral":{k:v for k,v in normal_lid.items() if k!="samples"},
       "eyelid_region_blink":{k:v for k,v in blink_lid.items() if k!="samples"}}
  print("EINAR_VISIBILITY_ABLATION",tag,json.dumps({
    "meniscus_L_blink":change["GEO-eye.meniscus.L"],
    "meniscus_L_cornea_neutral":out["neutral"]["L"]["meniscus_to_cornea_evaluated_polygon"],
    "lid_region_L_neutral":out["neutral"]["L"]["skin_eyelid_deformation_region_to_cornea"]}),flush=True)
  return out
 try:
  original=measure_condition("ORIGINAL_HIDDEN_VIEWPORT")
  for n in watched:bpy.data.objects[n].hide_viewport=False
  bpy.context.view_layer.update()
  activated=measure_condition("VISIBLE_VIEWPORT")
  for n in watched:
   for m,old in mods[n]:
    m.show_viewport=m.show_render
  bpy.context.view_layer.update()
  match_render=measure_condition("VISIBLE_RENDER_MODIFIER_FLAGS")
  result={"schema":"blank.einar.tear-visibility-ablation.v1","blend_sha256":PIN,
          "source_unchanged":True,"license":"CC-BY Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
          "source_object_visibility_and_modifier_flags":eye_info,
          "source_eyelid_bone_weight_regions":{s:len(ids) for s,ids in regions.items()},
          "conditions":{"original_hidden_viewport":original,"viewport_enabled":activated,
            "viewport_enabled_render_flags":match_render},
          "actual_lid_margin_identified":False,
          "certified_signed_eye_collision":False,
          "photorealism_approved":False,"release_allowed":False,"new_human_generated":False,
          "cautions":["Visibility and render modifier parity ablations are in-memory and are NOT proof of published final render path",
            "Original eye skin deformation groups locate eyelid regions, not the exact wet lid margin",
            "BVH nearest distance uses full evaluated polygons for cornea and globe; normal sign is not certified penetration",
            "Converting hidden construction helpers into visible preview mode may produce unintended evaluation state",
            "Do not claim meniscus follows anatomy until its evaluated motion and geometric proximity are both demonstrated"]}
  (OUT/"visibility-ablation.json").write_text(json.dumps(result,indent=2)+"\n")
  print("EINAR_VISIBILITY_RESULT",json.dumps({
    "hidden":original["component_blink_movement"]["GEO-eye.meniscus.L"],
    "shown":activated["component_blink_movement"]["GEO-eye.meniscus.L"],
    "renderflag":match_render["component_blink_movement"]["GEO-eye.meniscus.L"],
    "region_counts":result["source_eyelid_bone_weight_regions"],
    "shown_contact_L":activated["neutral"]["L"]["meniscus_to_cornea_evaluated_polygon"]}),flush=True)
  sys.stdout.flush();os._exit(0)
 finally:
  for n,val in orig_vis.items():bpy.data.objects[n].hide_viewport=val
  for n,entries in mods.items():
   for m,show in entries:m.show_viewport=show
  reset()
if __name__=="__main__":
 try:main()
 except BaseException:
  (OUT/"error.txt").write_text(traceback.format_exc())
  traceback.print_exc();sys.stdout.flush();os._exit(1)
