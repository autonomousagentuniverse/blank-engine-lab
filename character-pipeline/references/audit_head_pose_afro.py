#!/usr/bin/env python3
"""Read-only measured head-pose/follicle audit on exact pinned Coherent Afro source."""
import bpy, math, json, pathlib, hashlib
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
SRC=pathlib.Path("source/afro_woman_coherent_field_candidate.blend")
EXPECTED="327befea50b2961d1ff3341fdf2e7b6bb173f7c74c09212c68061677a974b3f2"
OUT=pathlib.Path("artifacts/head-pose-afro")
OUT.mkdir(parents=True,exist_ok=True)
HAIR=("Natural_Afro_Coils_0","Natural_Afro_Coils_1","Natural_Afro_Coils_2")
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for part in iter(lambda:f.read(1024*1024),b""):h.update(part)
 return h.hexdigest()
def quant(a,q):
 a=sorted(a);t=(len(a)-1)*q;i=int(t);d=t-i
 return round(a[i]*(1-d)+a[min(i+1,len(a)-1)]*d,6)
def bary(p,a,b,c):
 u=b-a;v=c-a;w=p-a;uu=u.dot(u);uv=u.dot(v);vv=v.dot(v);wu=w.dot(u);wv=w.dot(v)
 det=uu*vv-uv*uv
 assert det>1e-16,("DEGENERATE_FACE",det)
 y=(vv*wu-uv*wv)/det;z=(uu*wv-uv*wu)/det
 return (1-y-z,y,z)
def skin_coords(body):
 probe=body.copy();probe.data=body.data.copy()
 bpy.context.scene.collection.objects.link(probe)
 types=[m.type for m in probe.modifiers]
 assert "ARMATURE" in types,("NO_BODY_SKINNING",types)
 for m in list(probe.modifiers):
  if m.type!="ARMATURE":probe.modifiers.remove(m)
 bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get()
 ev=probe.evaluated_get(dg)
 me=ev.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
 try:
  assert len(me.vertices)==len(body.data.vertices)
  p=[ev.matrix_world@v.co for v in me.vertices]
 finally:
  ev.to_mesh_clear();bpy.data.objects.remove(probe,do_unlink=True)
 return p,types
def run():
 assert sha(SRC)==EXPECTED,"PINNED_SOURCE_SHA_MISMATCH"
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 body=bpy.data.objects.get("AFRO_WOMAN_28_Medium_Build")
 assert body and body.type=="MESH" and len(body.data.vertices)==19158
 rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
 head=rig.pose.bones.get("head")
 assert head is not None and len(rig.data.bones)==53
 objs=[bpy.data.objects[n] for n in HAIR]
 for obj in objs:assert obj.parent==rig and obj.parent_type=="BONE" and obj.parent_bone=="head"
 roots=[(o,sp,Vector(sp.points[0].co[:3])) for o in objs for sp in o.data.splines if sp.points]
 assert len(roots)==4450
 scalp=body.vertex_groups.get("scalp");assert scalp
 ids=set()
 for vertex in body.data.vertices:
  try:
   if scalp.weight(vertex.index)>=.5:ids.add(vertex.index)
  except RuntimeError:pass
 assert len(ids)==376
 tris=[]
 for poly in body.data.polygons:
  v=tuple(poly.vertices)
  if len(v)>=3 and all(i in ids for i in v):
   for j in range(1,len(v)-1):tris.append((v[0],v[j],v[j+1]))
 assert len(tris)==668
 head.rotation_mode="XYZ";head.rotation_euler=(0,0,0)
 bpy.context.view_layer.update()
 neutral,modifiers=skin_coords(body)
 dg=bpy.context.evaluated_depsgraph_get()
 at_rest=[o.evaluated_get(dg).matrix_world@p for o,sp,p in roots]
 bvh=BVHTree.FromPolygons(neutral,tris,all_triangles=True)
 bind=[];near=[]
 for pt in at_rest:
  loc,n,i,d=bvh.find_nearest(pt)
  assert loc is not None and 0<=i<len(tris)
  ix=tris[i];weights=bary(loc,*[neutral[j] for j in ix])
  assert min(weights)>-.001 and max(weights)<1.001
  bind.append((ix,weights));near.append(d*1000)
 assert quant(near,.95)<.1,("BASE_CONTACT_BROKEN",quant(near,.95))
 record={"schema":"blank.engine.afro.head-pose-root-audit.v1","source_sha256":EXPECTED,
 "blender_version":bpy.app.version_string,"source_lineage":"existing MPFB woman",
 "body_modifiers":modifiers,"root_count":len(roots),"scalp_triangles":len(tris),
 "baseline_p95_gap_mm":quant(near,.95),
 "protocol":"Track barycentric material point on deformed scalp triangle and compare against posed evaluated bone-parented NURBS root; no mesh masking or patches",
 "threshold_mm":{"p95":2.0,"max":5.0},"poses":[],"renders":[],
 "source_unchanged":True,"photorealism_approved":False,"webgl_parity":False,"release_allowed":False}
 for label,angles in (("neutral",(0,0,0)),("head_local_x_15",(15,0,0)),
                     ("head_local_y_22",(0,22,0)),("head_local_z_22",(0,0,22))):
  head.rotation_euler=tuple(math.radians(t) for t in angles)
  bpy.context.view_layer.update()
  coords,_=skin_coords(body);dg=bpy.context.evaluated_depsgraph_get()
  posed=[o.evaluated_get(dg).matrix_world@p for o,sp,p in roots]
  errors=[]
  for (ix,weights),root in zip(bind,posed):
   expected=sum((coords[j]*w for j,w in zip(ix,weights)),Vector())
   errors.append(1000*(expected-root).length)
  entry={"name":label,"head_local_euler_degrees":list(angles),
     "root_skin_offset_mm":{"p05":quant(errors,.05),"p50":quant(errors,.5),
        "p95":quant(errors,.95),"max":round(max(errors),5)},
     "pass":quant(errors,.95)<=2 and max(errors)<=5}
  record["poses"].append(entry)
  print("ACTUAL_POSE_FOLLICLE_DISTANCE",json.dumps(entry),flush=True)
 record["pose_attachment_pass"]=all(d["pass"] for d in record["poses"][1:])
 # Orient matched 3-view cameras around original fixed camera target.
 head.rotation_euler=(0,0,0);bpy.context.view_layer.update()
 original=bpy.data.objects.get("CAM_face_closeup")
 assert original and original.type=="CAMERA" and original.data.type=="ORTHO"
 center=sum((neutral[i] for i in ids),Vector())/len(ids)
 target=center+Vector((0,-.025,-.11))
 offset=original.location-target
 assert offset.length>1
 cams=[("front",original)]
 for label,angle in (("three_quarter",42),("profile",88)):
  d=original.data.copy();c=bpy.data.objects.new("ANATOMY_CAM_"+label,d)
  bpy.context.scene.collection.objects.link(c)
  c.location=target+(Matrix.Rotation(math.radians(angle),4,'Z')@offset)
  c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler()
  cams.append((label,c))
 scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.device="CPU"
 scene.cycles.samples=24;scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=720;scene.render.resolution_y=960
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
 for label,cam in cams:
  scene.camera=cam;f=OUT/("neutral_"+label+".png");scene.render.filepath=str(f.resolve())
  bpy.ops.render.render(write_still=True);assert f.stat().st_size>45000
  record["renders"].append({"name":label,"file":f.name,"sha256":sha(f),"bytes":f.stat().st_size})
 head.rotation_euler=(0,math.radians(22),0);bpy.context.view_layer.update()
 scene.camera=original;f=OUT/"head_local_y_22_front.png";scene.render.filepath=str(f.resolve())
 bpy.ops.render.render(write_still=True);assert f.stat().st_size>45000
 record["renders"].append({"name":"head_local_y_22_front","file":f.name,"sha256":sha(f),"bytes":f.stat().st_size})
 head.rotation_euler=(0,0,0);bpy.context.view_layer.update()
 save=OUT/"afro_head_pose_inspection.blend"
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(save.resolve()),compress=True,check_existing=False)
 record["derivative_sha256"]=sha(save)
 record["derivative_bytes"]=save.stat().st_size
 record["dynamic_contact_certified"]=record["pose_attachment_pass"]
 record["pose_angle_interpretation"]="Local Euler test axes not independently certified human yaw/pitch"
 record["visual_owner_approved"]=False
 record["next"]="If root contact fails, implement deformation-aware follicle binding to scalp triangles"
 assert sha(SRC)==EXPECTED
 (OUT/"head-pose-report.json").write_text(json.dumps(record,indent=2)+"\n")
 print("ANIMATED_FOLLICLE_AUDIT_COMPLETE",json.dumps({"pass":record["pose_attachment_pass"],
     "renders":len(record["renders"]),"sha":record["derivative_sha256"]}),flush=True)
if __name__=="__main__":run()
