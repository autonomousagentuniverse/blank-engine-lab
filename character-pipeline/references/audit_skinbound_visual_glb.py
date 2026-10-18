#!/usr/bin/env python3
"""Real Cycles visual and rigged GLB parity gate from SHA-pinned skinbound source.

No character regeneration or body/eye/skin modification; preserve exact source.
Portable GLB validation is structural only until executed in a WebGL browser.
"""
import bpy, hashlib, json, pathlib, math, struct
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

SRC=pathlib.Path("source/afro_skinbound_hair_derivative.blend")
SHA="0eca41c5f0175e50df18914bb87cc007184ddcf55f2dd84ea3640645ddac2f52"
OUT=pathlib.Path("artifacts/afro-visual-glb")
OUT.mkdir(parents=True,exist_ok=True)
NAMES=["BLANK_RIGGED_AFRO_LAYER_%d"%i for i in range(3)]

def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for x in iter(lambda:f.read(1048576),b""):h.update(x)
 return h.hexdigest()

def evaluated_skin(body):
 dup=body.copy();dup.data=body.data.copy();bpy.context.scene.collection.objects.link(dup)
 for m in list(dup.modifiers):
  if m.type!="ARMATURE":dup.modifiers.remove(m)
 bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get()
 o=dup.evaluated_get(deps);me=o.to_mesh()
 try:
  assert len(me.vertices)==19158
  return [o.matrix_world@v.co for v in me.vertices]
 finally:
  o.to_mesh_clear()
  bpy.data.objects.remove(dup,do_unlink=True)

def q(a,p):
 a.sort();f=(len(a)-1)*p;i=int(f);b=f-i
 return round(a[i]*(1-b)+a[min(i+1,len(a)-1)]*b,3)

def main():
 assert sha(SRC)==SHA,("SHA_MISMATCH",sha(SRC))
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
 rig=next(x for x in bpy.data.objects if x.type=="ARMATURE")
 bones=rig.pose.bones;head=bones["head"];head.rotation_mode="XYZ"
 hairs=[bpy.data.objects[n] for n in NAMES]
 assert all(h.type=="MESH" and any(m.type=="ARMATURE" for m in h.modifiers) for h in hairs)
 assert len(rig.data.bones)==53
 assert all(bpy.data.objects["Natural_Afro_Coils_%d"%i].hide_render for i in range(3))
 camera=bpy.data.objects["CAM_face_closeup"]
 assert camera.type=="CAMERA"
 # Defined from registered scalp mask; no photo-inferred 3D geometry.
 scalpg=body.vertex_groups["scalp"];mask={v.index for v in body.data.vertices
     if any(w.group==scalpg.index and w.weight>=.5 for w in v.groups)}
 assert len(mask)==376
 tris=[]
 for poly in body.data.polygons:
  v=tuple(poly.vertices)
  if len(v)>=3 and all(t in mask for t in v):
   for i in range(1,len(v)-1):tris.append((v[0],v[i],v[i+1]))
 assert len(tris)==668
 head.rotation_euler=(0,0,0);bpy.context.view_layer.update()
 neutral=evaluated_skin(body)
 centroid=sum((neutral[i] for i in mask),Vector())/len(mask)
 focus=centroid+Vector((0,-.025,-.11))
 assert camera.data.type=="ORTHO"
 displacement=camera.location-focus
 assert displacement.length>.5
 cams=[("front",camera)]
 for title,angle in [("three_quarter",42),("profile",88)]:
  copy=camera.data.copy();obj=bpy.data.objects.new("AFRO_AUDIT_"+title,copy)
  bpy.context.scene.collection.objects.link(obj)
  obj.location=focus+(Matrix.Rotation(math.radians(angle),4,"Z")@displacement)
  obj.rotation_euler=(focus-obj.location).to_track_quat("-Z","Y").to_euler()
  cams.append((title,obj))
 scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.device="CPU"
 scene.cycles.samples=20
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=720;scene.render.resolution_y=960
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 images=[]
 for title,cam in cams:
  scene.camera=cam;path=OUT/("skinbound_"+title+".png")
  scene.render.filepath=str(path.resolve())
  print("CYCLES_REAL_RENDER",title,flush=True)
  bpy.ops.render.render(write_still=True)
  assert path.stat().st_size>35000,("RENDER_FAILED",title)
  images.append({"view":title,"filename":path.name,"sha256":sha(path),"bytes":path.stat().st_size})
 head.rotation_euler=(0,math.radians(22),0);bpy.context.view_layer.update()
 scene.camera=camera
 path=OUT/"skinbound_head_y_22.png";scene.render.filepath=str(path.resolve())
 print("CYCLES_REAL_RENDER","head_y_22",flush=True)
 bpy.ops.render.render(write_still=True)
 assert path.stat().st_size>35000
 images.append({"view":"head_local_y_22","filename":path.name,"sha256":sha(path),"bytes":path.stat().st_size})

 # Near-scalp contact is ALREADY mechanically verified. This separate sample
 # examines hair-vertex proximity to scalp in neutral and Y22; sample one
 # midpoint per curve as a collision-warning proxy, not physical collision proof.
 samples=[]
 for pose,angle in [("neutral",0),("head_y_22",22)]:
  head.rotation_euler=(0,math.radians(angle),0);bpy.context.view_layer.update()
  surface=evaluated_skin(body); bvh=BVHTree.FromPolygons(surface,tris,all_triangles=True)
  signed=[]
  deps=bpy.context.evaluated_depsgraph_get()
  for o in hairs:
   e=o.evaluated_get(deps);mesh=e.to_mesh()
   try:
    # root: each strand 20 rings x 3 points; test ring 6, 12 and 19,
    # skip 0-5 root rings where scalp overlap is structurally expected.
    for start in range(0,len(mesh.vertices),60):
     for ring in [6,12,19]:
      p=sum((e.matrix_world@mesh.vertices[start+ring*3+j].co for j in range(3)),Vector())/3
      near,normal,face,dist=bvh.find_nearest(p)
      assert near is not None
      signed.append(1000*dist * (1 if (p-near).dot(normal)>=0 else -1))
   finally:e.to_mesh_clear()
  samples.append({"pose":pose,"sample_count":len(signed),
   "signed_proxy_mm":{"p05":q(signed,.05),"p50":q(signed,.5),"p95":q(signed,.95)},
   "negative_signed_fraction":round(sum(x<0 for x in signed)/len(signed),5),
   "qualification":"Unsigned nearest scalp triangle with local normal sign; not closed-surface SDF. Cannot certify collisions."})
  print("COLLISION_WARNING_SAMPLE",json.dumps(samples[-1]),flush=True)

 # Return rig to neutral for portable GLB export and keep original face unchanged.
 head.rotation_euler=(0,0,0);bpy.context.view_layer.update()
 bpy.ops.object.select_all(action="DESELECT")
 visible=[o for o in bpy.context.scene.objects if
    o.type=="MESH" and not o.hide_render and not o.name.startswith("AFRO_AUDIT")]
 for o in visible+[rig]:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 path=OUT/"afro_skinbound_rigged.glb"
 bpy.ops.export_scene.gltf(filepath=str(path.resolve()),export_format="GLB",
     use_selection=True,export_skins=True,export_animations=False,
     export_yup=True,export_apply=False)
 assert path.stat().st_size>1000000
 with path.open("rb") as f:
  header=f.read(20)
  magic,version,total_length,jsonlength,chunk_type=struct.unpack("<4sIIII",header)
  assert magic==b"glTF" and version==2 and total_length==path.stat().st_size
  assert chunk_type==0x4e4f534a
  obj=json.loads(f.read(jsonlength))
 nodes=obj.get("nodes",[])
 skin_nodes={n.get("name"):n for n in nodes if n.get("name","").startswith("BLANK_RIGGED_AFRO_LAYER_")}
 assert all(name in skin_nodes for name in NAMES),("MISSING_HAIR_NODES",list(skin_nodes))
 skinned={name:n.get("skin") is not None for name,n in skin_nodes.items()}
 assert all(skinned.values()),("HAIR_NOT_SKINNED_IN_GLB",skinned)
 skins=obj.get("skins",[])
 assert skins and max(len(s.get("joints",[])) for s in skins)>=10,("INVALID_GLTF_SKIN",skins)
 assert all(any("JOINTS_0" in pr.get("attributes",{}) and "WEIGHTS_0" in pr.get("attributes",{})
    for pr in obj["meshes"][skin_nodes[name]["mesh"]]["primitives"]) for name in NAMES)
 assert sha(SRC)==SHA
 report={
  "schema":"blank.engine.hair.visual-export-gates.v1",
  "source_sha256":SHA,"source_unchanged":True,"blender_version":bpy.app.version_string,
  "body_vertices":19158,"rig_bones":53,"hair_meshes":3,"hair_strands":4450,
  "visual_renders":images,"collision_proxies":samples,
  "glb":{"filename":path.name,"sha256":sha(path),"bytes":path.stat().st_size,
    "mesh_count":len(obj.get("meshes",[])),"skin_count":len(skins),
    "max_skin_joint_count":max(len(s.get("joints",[])) for s in skins),
    "hair_skin_nodes":skinned,"structural_export_pass":True,
    "note":"GLB structure only. Browser WebGL image equivalence not checked until Chrome integration."},
  "limitations":["Inherited scalp mask not independently clinically verified",
    "Collision proximity is local normal sign, not signed watertight distance",
    "Visual realism must be rejected or approved by viewing actual Cycles frames",
    "GLB render/evaluation WebGL parity requires an actual browser test"],
  "photorealism_approved":False,"visual_approved":False,"physical_collision_pass":False,
  "webgl_parity":False,"production_deployed":False,"release_allowed":False}
 (OUT/"visual-export-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print("BLENDER_HAIR_VISUAL_GLB_AUDIT",json.dumps({
   "images":len(images),"sha":report["glb"]["sha256"],
   "skin_nodes":skinned,"collisions":samples}),flush=True)
if __name__=="__main__":main()
