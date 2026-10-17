#!/usr/bin/env python3
"""Real Blender Studio Einar evaluated tear/lash modifier and eye contact investigation.
Read-only source. No claims of anatomical lid rim or signed penetration without validated mesh groups.
"""
import bpy, os, sys, math, json, traceback, statistics, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT=Path("artifacts/einar-tear-contact")
ROOT.mkdir(parents=True,exist_ok=True)
BLEND=Path(".ci-einar/source/einar_release_v1.blend")
PIN="1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b"
RIG="RIG-einar"
CONTROLS=["Blink.L","Blink.R","Eyelid_Upper.L","Eyelid_Upper.R"]
WATCH=["GEO-einar_head","GEO-eye.meniscus.L","GEO-eye.meniscus.R",
       "GEO-einar_eyelash_surfdef","GEO-einar_eyelashes",
       "GEO-einar_hair","GEO-einar_hair_surfdef_proxy",
       "GEO-eye.cornea.L","GEO-eye.cornea.R","GEO-eye.L","GEO-eye.R",
       "GEO-einar_eyebrows.proxy"]
MM=1000.

def digest(path):
 h=hashlib.sha256()
 with open(path,"rb") as f:
  for b in iter(lambda:f.read(4*1024*1024),b""):h.update(b)
 return h.hexdigest()

def box_stats(vals):
 if not vals:return {"n":0}
 return {"n":len(vals),"min":round(min(vals),5),"median":round(statistics.median(vals),5),
         "mean":round(statistics.mean(vals),5),"p90":round(sorted(vals)[int(.9*(len(vals)-1))],5),
         "max":round(max(vals),5)}

def overview(o):
 if o is None:return {"present":False}
 meta={"present":True,"name":o.name,"type":o.type,
   "hide_viewport":o.hide_viewport,"hide_render":o.hide_render,
   "hide_get":o.hide_get(),"visible_get":o.visible_get(),
   "parent":o.parent.name if o.parent else None,
   "constraints":[{"name":c.name,"type":c.type,"mute":c.mute,
     "target":getattr(getattr(c,"target",None),"name",None)} for c in o.constraints],
   "modifiers":[]}
 for m in o.modifiers:
  meta["modifiers"].append({
     "name":m.name,"type":m.type,
     "show_viewport":m.show_viewport,"show_render":m.show_render,"show_in_editmode":m.show_in_editmode,
     "target_object":getattr(getattr(m,"object",None),"name",None),
     "target_auxiliary":getattr(getattr(m,"target",None),"name",None),
     "is_bound":getattr(m,"is_bound",None),
     "vertex_group":getattr(m,"vertex_group",""),
     "levels":getattr(m,"levels",None),
     "node_group":getattr(getattr(m,"node_group",None),"name",None)})
 if o.type=="MESH":
  meta["original_mesh_vertices"]=len(o.data.vertices)
  meta["original_mesh_faces"]=len(o.data.polygons)
  meta["vertex_groups"]=[{"name":g.name,"index":g.index} for g in o.vertex_groups
    if any(k in g.name.lower() for k in ("lid","blink","tear","eye","lash","margin","rim"))][:120]
 if o.type=="CURVES":meta["original_curves"]=len(o.data.curves)
 return meta

def snap(o,cap=2000,full=False):
 if o is None:return {"status":"missing"}
 try:
  dg=bpy.context.evaluated_depsgraph_get()
  obj=o.evaluated_get(dg)
  if o.type=="MESH":
   m=obj.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
   try:
    count=len(m.vertices)
    if count==0:return {"status":"empty","count":0}
    if full or count<=cap:ids=list(range(count))
    else:ids=list(range(0,count,max(1,math.ceil(count/cap))))[:cap]
    verts=[tuple(obj.matrix_world @ m.vertices[i].co) for i in ids]
    faces=[tuple(p.vertices) for p in m.polygons] if full else []
    return {"status":"sampled","type":"MESH","count":count,"samples":len(verts),
            "ids":ids,"points":verts,"faces":faces}
   finally:obj.to_mesh_clear()
  if o.type=="CURVES":
   data=obj.data
   count=len(data.curves)
   pos=data.attributes.get("position")
   if not pos:return {"status":"unavailable","why":"Missing evaluated position attribute"}
   if count==0:return {"status":"empty","count":0}
   ids=list(range(0,count,max(1,math.ceil(count/cap))))[:cap]
   points=[tuple(obj.matrix_world @ pos.data[data.curves[i].first_point_index].vector) for i in ids]
   return {"status":"sampled","type":"CURVES","count":count,"samples":len(points),"ids":ids,"points":points}
  return {"status":"unsupported","type":o.type}
 except Exception as exc:
  return {"status":"error","error":type(exc).__name__+": "+str(exc)[:350]}

def motion(n,p):
 if n.get("status")!="sampled" or p.get("status")!="sampled":return {"status":"unverified","why":[n.get("status"),p.get("status")]}
 if n["count"]!=p["count"] or n["ids"]!=p["ids"]:return {"status":"topology_changed","initial":n["count"],"posed":p["count"]}
 dd=[(Vector(b)-Vector(a)).length*MM for a,b in zip(n["points"],p["points"])]
 return {"status":"measured","displacement_mm":box_stats(dd),"moved_0p1mm_fraction":round(sum(x>.1 for x in dd)/len(dd),5)}

def world_bvh(s):
 if s.get("status")!="sampled" or not s.get("faces"):return None
 return BVHTree.FromPolygons([Vector(v) for v in s["points"]],s["faces"],all_triangles=False,epsilon=0.0)

def surface_nearest(query, surf, max_count=2500):
 """True nearest point on evaluated TRIANGULATED/POLYGON surface, not nearest sample vertex.
 Normal projection is a diagnostic sign proxy, NOT validated manifold penetration.
 """
 bvh=world_bvh(surf)
 if not bvh or query.get("status")!="sampled":
  return {"status":"unverified","reason":"No evaluated surface polygon BVH or query points"}
 points=query["points"][:max_count]
 d=[];normals=[];hits=0
 for xyz in points:
  near,normal,face,dist=bvh.find_nearest(Vector(xyz))
  if near is None:continue
  p=Vector(xyz);hits+=1
  d.append(dist*MM)
  normals.append((p-near).dot(normal)*MM)
 if not hits:return {"status":"unverified","reason":"No nearest points"}
 return {"status":"evaluated_surface_unsigned_clearance_plus_normal_projection",
         "sample_count":hits,
         "unsigned_surface_mm":box_stats(d),
         "normal_projection_mm":box_stats(normals),
         "fraction_normal_negative":round(sum(x<-.05 for x in normals)/hits,5),
         "limitation":"Sign is nearest polygon normal projection: not certified inside/outside unless orientable closed manifold verified. Does not by itself prove eyelid rim contact."}

def eyelid_groups(head):
 return [{"name":g.name,"index":g.index} for g in head.vertex_groups
         if any(s in g.name.lower() for s in ("eyelid","lidmargin","lid_margin","eyering","eye_ring","eyelash"))]

def main():
 assert BLEND.exists() and digest(BLEND)==PIN,"Wrong publisher source Blend"
 bpy.ops.wm.open_mainfile(filepath=str(BLEND.resolve()),load_ui=False)
 rig=bpy.data.objects[RIG];head=bpy.data.objects["GEO-einar_head"]
 controls={n:rig.pose.bones.get(n) for n in CONTROLS}
 assert all(controls.values())
 head_control=rig.pose.bones.get("FK-Head")
 assert head_control is not None
 originals={n:p.location.copy() for n,p in controls.items()}
 old_mode=head_control.rotation_mode;head_control.rotation_mode="XYZ"
 old_rot=head_control.rotation_euler.copy()
 head_keys=head.data.shape_keys.key_blocks
 blink_keys=["D_Blink_Upper.L","D_Blink_Upper.R","D_Blink_Lower.L","D_Blink_Lower.R"]
 def neutralize():
  for n,p in controls.items():p.location=originals[n].copy()
  head_control.rotation_euler=old_rot.copy()
  bpy.context.view_layer.update()
 def capture(full_eye=True):
  return {n:snap(bpy.data.objects.get(n),full=(n in ["GEO-eye.cornea.L","GEO-eye.cornea.R",
       "GEO-eye.L","GEO-eye.R","GEO-eye.meniscus.L","GEO-eye.meniscus.R"]) if full_eye else False)
       for n in WATCH}
 try:
  neutralize()
  mods={n:overview(bpy.data.objects.get(n)) for n in WATCH}
  key0={n:head_keys[n].value for n in blink_keys}
  N=capture()
  for n in ("Blink.L","Eyelid_Upper.L","Eyelid_Upper.R"):
   controls[n].location.y=originals[n].y-.006
  bpy.context.view_layer.update()
  keyblink={n:round(head_keys[n].value,6) for n in blink_keys}
  B=capture()
  neutralize()
  head_control.rotation_euler.z+=math.radians(12)
  bpy.context.view_layer.update()
  H=capture()
  neutralize()
  movement={"blink":{n:motion(N[n],B[n]) for n in WATCH},
            "head_turn":{n:motion(N[n],H[n]) for n in WATCH}}
  contacts={}
  for pose,data in [("neutral",N),("blink",B),("head_turn",H)]:
   contacts[pose]={}
   for side in ("L","R"):
    men=data["GEO-eye.meniscus."+side]
    corn=data["GEO-eye.cornea."+side]
    globe=data["GEO-eye."+side]
    headsample=data["GEO-einar_head"]
    contacts[pose][side]={
      "meniscus_to_cornea":surface_nearest(men,corn),
      "meniscus_to_globe":surface_nearest(men,globe),
      "sampled_head_to_cornea":surface_nearest(headsample,corn)}
  report={"schema":"blank.einar.tear-and-ocular-contact-audit.v1",
          "original_blend_sha256":PIN,"source_unchanged":True,
          "license":"CC-BY Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
          "controls":{"blink_rig_bones":["Blink.L","Eyelid_Upper.L","Eyelid_Upper.R"],
                      "head_turn_bone":"FK-Head",
                      "blink_key_values_before":key0,
                      "blink_key_values_during":keyblink,
                      "head_turn_delta_degrees":12,
                      "per_bone_control_offset_m":-.006},
          "object_modifier_chains":mods,
          "eyelid_semantic_vertex_groups":eyelid_groups(head),
          "evaluated_geometry_meta":{pose:{n:{k:v for k,v in s.items() if k not in ("points","ids","faces")}
              for n,s in data.items()} for pose,data in [("neutral",N),("blink",B),("head_turn",H)]},
          "movement":movement,
          "contact_surface_proxy":contacts,
          "signed_lid_globe_clearance_verified":False,
          "tear_rim_follow_verified":False,
          "new_human_generated":False,"release_allowed":False,
          "limits":["Source group labels are necessary to isolate a valid lid margin; sampled whole head near cornea is not lid-margin contact",
                    "Original normal-projection signs only, no proven watertight surface or anatomical rim correspondence",
                    "Original modifier show_viewport and show_render flags recorded; stationary object may be source setup not necessarily flawed renderer",
                    "No source .blend exported or saved; no published animation sequence playback",
                    "No visual acceptance, no regenerated human, no release"]}
  path=ROOT/"tear-contact-diagnostics.json"
  path.write_text(json.dumps(report,indent=2)+"\n")
  abbreviated={state:{n:report["movement"][state][n] for n in
     ("GEO-einar_head","GEO-eye.meniscus.L","GEO-einar_eyelash_surfdef","GEO-einar_eyelashes")} for state in ("blink","head_turn")}
  print("EINAR_EVALUATED_SURFACE_AUDIT",json.dumps({
     "source_sha":PIN,
     "blink_keys":keyblink,
     "motions":abbreviated,
     "meniscus_modifiers":mods["GEO-eye.meniscus.L"]["modifiers"],
     "eyelash_proxy_modifiers":mods["GEO-einar_eyelash_surfdef"]["modifiers"],
     "lid_groups":report["eyelid_semantic_vertex_groups"][:25],
     "neutral_meniscus_to_cornea":contacts["neutral"]["L"]["meniscus_to_cornea"]}),flush=True)
  sys.stdout.flush()
  os._exit(0)
 finally:
  neutralize();head_control.rotation_mode=old_mode
if __name__=="__main__":
 try:main()
 except BaseException:
  (ROOT/"failure.txt").write_text(traceback.format_exc())
  traceback.print_exc();sys.stdout.flush();os._exit(1)
