#!/usr/bin/env python3
"""Deformation-aware Afro hair prototype with a portable Blender armature mesh.

SOURCE: immutable coherent Afro NURBS file (not new synthetic person).
METHOD: each follicle binds barycentrically to the evaluated rest scalp triangle.
The strand receives the same linearly interpolated bone weights as that scalp site;
tube geometry is generated for all strands, and its root ring is compared against
the identical barycentric material point under the actual posed body ARMATURE.
Original NURBS are preserved (hidden from rendering); no frame handlers.
Every failed pose stays in the report; no pass thresholds are relaxed.
"""
import bpy, hashlib, json, math, pathlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree

SRC=pathlib.Path("source/afro_woman_coherent_field_candidate.blend")
EXPECTED="327befea50b2961d1ff3341fdf2e7b6bb173f7c74c09212c68061677a974b3f2"
OUT=pathlib.Path("artifacts/afro-skinbound-hair")
OUT.mkdir(parents=True,exist_ok=True)
HAIRS=("Natural_Afro_Coils_0","Natural_Afro_Coils_1","Natural_Afro_Coils_2")
ROTATIONS=(("neutral",(0,0,0)),("head_local_x_15",(15,0,0)),
           ("head_local_y_22",(0,22,0)),("head_local_z_22",(0,0,22)))
RADIAL=3
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
 return h.hexdigest()
def q(a,p):
 s=sorted(a);x=(len(s)-1)*p;i=int(x);f=x-i
 return round(s[i]*(1-f)+s[min(len(s)-1,i+1)]*f,5)
def coords(body):
 probe=body.copy();probe.data=body.data.copy()
 bpy.context.scene.collection.objects.link(probe)
 assert any(m.type=="ARMATURE" for m in probe.modifiers)
 for m in list(probe.modifiers):
  if m.type!="ARMATURE":probe.modifiers.remove(m)
 bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get()
 ev=probe.evaluated_get(deps)
 me=ev.to_mesh(preserve_all_data_layers=False,depsgraph=deps)
 try:
  assert len(me.vertices)==19158
  return [ev.matrix_world@v.co for v in me.vertices]
 finally:
  ev.to_mesh_clear()
  bpy.data.objects.remove(probe,do_unlink=True)
def bary(p,a,b,c):
 u=b-a;v=c-a;w=p-a;uu=u.dot(u);uv=u.dot(v);vv=v.dot(v);wu=w.dot(u);wv=w.dot(v)
 det=uu*vv-uv*uv
 assert det>1e-15,("FACE_DEGENERATE",det)
 y=(vv*wu-uv*wv)/det;z=(uu*wv-uv*wu)/det
 return (1-y-z,y,z)
def interp_weights(body,indices,ws):
 out={}
 for i,factor in zip(indices,ws):
  for g in body.data.vertices[i].groups:
   name=body.vertex_groups[g.group].name
   out[name]=out.get(name,0)+factor*g.weight
 return {k:v for k,v in out.items() if v>0.0001}
def run():
 assert sha(SRC)==EXPECTED
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
 rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
 head=rig.pose.bones["head"]
 head.rotation_mode="XYZ";head.rotation_euler=(0,0,0)
 bpy.context.view_layer.update()
 rest=coords(body)
 scalp=body.vertex_groups["scalp"];mask=set()
 for vert in body.data.vertices:
  try:
   if scalp.weight(vert.index)>=.5:mask.add(vert.index)
  except RuntimeError:pass
 assert len(mask)==376
 tris=[]
 for poly in body.data.polygons:
  ix=tuple(poly.vertices)
  if len(ix)<3 or not all(v in mask for v in ix):continue
  for k in range(1,len(ix)-1):tris.append((ix[0],ix[k],ix[k+1]))
 assert len(tris)==668
 bvh=BVHTree.FromPolygons(rest,tris,all_triangles=True)
 curls=[bpy.data.objects[x] for x in HAIRS]
 assert [len(o.data.splines) for o in curls]==[1850,1500,1100]
 root_bind=[]
 source_roots=[]
 meshes=[]
 for layer,curve in enumerate(curls):
  vertices=[];faces=[];ring_starts=[];bone_weights=[];root_positions=[]
  for sp in curve.data.splines:
   assert sp.type=="NURBS" and len(sp.points)==20
   path=[curve.matrix_world @ Vector(pt.co[:3]) for pt in sp.points]
   srcroot=path[0]; loc,n,tri,d=bvh.find_nearest(srcroot)
   assert d<0.0001,("ROOT_NOT_SCALP",d)
   indexes=tris[tri]
   ws=bary(loc,*[rest[j] for j in indexes])
   assert min(ws)>-.001
   weights=interp_weights(body,indexes,ws)
   assert sum(weights.values())>.9,("UNWEIGHTED_SCALP_SITE",sum(weights.values()))
   root_bind.append((indexes,ws,layer,len(ring_starts)))
   source_roots.append(srcroot)
   ring_starts.append(len(vertices))
   bone_weights.append(weights)
   radius=(.00050,.00041,.00030)[layer]
   # The first ring is exactly centered on each scalp surface root.
   # Three-sided tube is a portable fully riggable Blender mesh.
   for j,p in enumerate(path):
    if j==0:tangent=(path[1]-p)
    elif j==len(path)-1:tangent=p-path[j-1]
    else:tangent=path[j+1]-path[j-1]
    assert tangent.length>.000001
    tangent.normalize()
    a=tangent.cross(Vector((0,0,1)))
    if a.length<.025:a=tangent.cross(Vector((0,1,0)))
    a.normalize(); b=tangent.cross(a).normalized()
    for k in range(RADIAL):
     theta=2*math.pi*k/RADIAL
     point=p+radius*(math.cos(theta)*a+math.sin(theta)*b)
     vertices.append(tuple(point))
    if j:
     prev=len(vertices)-2*RADIAL;curr=len(vertices)-RADIAL
     for k in range(RADIAL):
      h=(k+1)%RADIAL
      faces.append((prev+k,prev+h,curr+h,curr+k))
  mesh=bpy.data.meshes.new("BLANK_RIGGED_AFRO_LAYER_%d_MESH"%layer)
  mesh.from_pydata(vertices,[],faces);mesh.update()
  obj=bpy.data.objects.new("BLANK_RIGGED_AFRO_LAYER_%d"%layer,mesh)
  bpy.context.scene.collection.objects.link(obj)
  obj.data.materials.append(curve.data.materials[0])
  # Transfer identical weights onto EVERY vertex of each strand. This is
  # a portable linear-blend deformation mechanism rather than a per-frame fix.
  groups={}
  allvertices_by_group={}
  for j,weights in enumerate(bone_weights):
   first=ring_starts[j];end=first+20*RADIAL
   for name,weight in weights.items():
    if name not in groups:groups[name]=obj.vertex_groups.new(name=name)
    allvertices_by_group.setdefault(name,{}).setdefault(round(weight,6),[]).extend(range(first,end))
  for name,by_weight in allvertices_by_group.items():
   for weight,indices in by_weight.items():groups[name].add(indices,float(weight),"REPLACE")
  arm=obj.modifiers.new(name="Scalp-weighted armature",type="ARMATURE")
  arm.object=rig
  arm.use_vertex_groups=True
  arm.use_bone_envelopes=False
  # Keep original source curve in the source .blend, hidden in derivative render.
  curve.hide_render=True
  curve.hide_set(True)
  meshes.append((obj,ring_starts))
  print("LAYER_RIGGED",layer,"vertices",len(vertices),"quads",len(faces),"strands",len(ring_starts),flush=True)
 assert len(root_bind)==4450 and len(meshes)==3
 # Verify each of 4 head rotations, with evaluated SKINNED meshes and body.
 tests=[]; limits={"p95_mm":2.0,"max_mm":5.0}
 for label,angles in ROTATIONS:
  head.rotation_euler=tuple(math.radians(v) for v in angles)
  bpy.context.view_layer.update()
  skin=coords(body)
  deps=bpy.context.evaluated_depsgraph_get()
  errors=[];source_errors=[]
  for layer,(obj,starts) in enumerate(meshes):
   ev=obj.evaluated_get(deps)
   mesh=ev.to_mesh()
   try:
    assert len(mesh.vertices)==len(obj.data.vertices)
    root_ids=[i for i,b in enumerate(root_bind) if b[2]==layer]
    for idx,root_number in enumerate(root_ids):
     first=starts[idx]
     center=sum((ev.matrix_world@mesh.vertices[first+k].co for k in range(RADIAL)),Vector())/RADIAL
     v,ws,_,_=root_bind[root_number]
     scalp_pt=sum((skin[i]*weight for i,weight in zip(v,ws)),Vector())
     errors.append((center-scalp_pt).length*1000)
   finally:ev.to_mesh_clear()
  assert len(errors)==4450
  values={"p05_mm":q(errors,.05),"p50_mm":q(errors,.5),"p95_mm":q(errors,.95),"max_mm":round(max(errors),5)}
  okay=values["p95_mm"]<=limits["p95_mm"] and values["max_mm"]<=limits["max_mm"]
  tests.append({"pose":label,"head_local_euler_degrees":list(angles),"gap":values,"pass":okay})
  print("REAL_SKINBOUND_POSE",json.dumps(tests[-1]),flush=True)
 head.rotation_euler=(0,0,0);bpy.context.view_layer.update()
 # Save reusable skinned mesh candidate; original NURBS remain editable.
 packed=OUT/"afro_skinbound_hair_derivative.blend"
 bpy.ops.file.pack_all()
 bpy.ops.wm.save_as_mainfile(filepath=str(packed.resolve()),compress=True,check_existing=False)
 report={
  "schema":"blank.engine.afro.skinbound.v1",
  "source_sha256":EXPECTED,
  "source_unchanged":sha(SRC)==EXPECTED,
  "blender_version":bpy.app.version_string,
  "source_lineage":"Earlier MPFB-derived synthetic woman, NOT a new person",
  "hair_count":len(root_bind),"meshes":len(meshes),"tube_sides":RADIAL,
  "original_nurbs_retained":True,
  "binding":"Barycentric interpolation of three scalp mesh vertex bone weights; per-strand weights transferred to all tube mesh vertices; ARMATURE mod uses same rig as scalp",
  "pose_tests":tests,"tolerances":limits,
  "skinbound_geometry_pass":all(x["pass"] for x in tests),
  "source_pose_test_failed_baseline_max_mm":18.73221,
  "derivative_sha256":sha(packed),
  "derivative_bytes":packed.stat().st_size,
  "visual_owner_approved":False,"photorealism_approved":False,
  "rigged_export_glb_verified":False,"release_allowed":False,
  "no_existing_body_or_material_changes":True,
  "limitations":["Tube mesh replaces NURBS render geometry; original curves retained editable but hidden",
    "Per-strand interpolated skin weights approximate barycentric skin point; tolerance-tested at three poses only",
    "Does not prove physical hair dynamics or skin/lid facial realism",
    "Mask inherited and not 3D scan validated; no animated collision test"]
 }
 (OUT/"skinbound-report.json").write_text(json.dumps(report,indent=2)+"\n")
 assert report["source_unchanged"]
 print("RIGGED_AFRO_SKINBOUND_AUDIT",json.dumps({"pass":report["skinbound_geometry_pass"],"source":EXPECTED,"output":report["derivative_sha256"]}),flush=True)
if __name__=="__main__":run()
