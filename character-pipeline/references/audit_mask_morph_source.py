#!/usr/bin/env python3
"""Read-only face/skin MASK vs morph evaluation audit for pinned baked Afro scene."""
import bpy, pathlib, hashlib, json, struct
SRC=pathlib.Path("source/afro_skinbound_uv_pbr.blend")
SHA="6fb5fb2b6f353933bbfd90f4b265c8f2023f7191c81cca6f6198f58a596197e3"
GLB=pathlib.Path("source/afro_skinbound_uv_pbr.glb")
GLB_SHA="0ee083dafd22793112cdbe6c7f30db558e23f198e3afa4d90422f23985c19e93"
OUT=pathlib.Path("artifacts/afro-mask-anatomy-audit");OUT.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stats(o,kind):
 dep=bpy.context.evaluated_depsgraph_get()
 ev=o.evaluated_get(dep)
 me=ev.to_mesh(preserve_all_data_layers=True,depsgraph=dep)
 try:
  return dict(label=kind,vertices=len(me.vertices),polygons=len(me.polygons),
    triangles=sum(max(0,len(p.vertices)-2) for p in me.polygons),
    material_face_counts={str(i):sum(p.material_index==i for p in me.polygons) for i in range(len(o.data.materials))},
    bounds_min=[round(min(v.co[i] for v in me.vertices),4) for i in range(3)],
    bounds_max=[round(max(v.co[i] for v in me.vertices),4) for i in range(3)])
 finally:ev.to_mesh_clear()
assert sha(SRC)==SHA and sha(GLB)==GLB_SHA
bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
rig=next(x for x in bpy.data.objects if x.type=="ARMATURE")
assert len(body.data.vertices)==19158 and len(rig.data.bones)==53
mods=[]
for m in body.modifiers:
 d={"name":m.name,"type":m.type,"show_viewport":m.show_viewport,"show_render":m.show_render}
 if m.type=="MASK":
  g=body.vertex_groups.get(m.vertex_group)
  assert g is not None,(m.name,m.vertex_group)
  weighted=[v for v in body.data.vertices if any(w.group==g.index and w.weight>=m.threshold for w in v.groups)]
  d.update(group=m.vertex_group,threshold=m.threshold,
    invert_vertex_group=m.invert_vertex_group,mode=m.mode,
    vertices_in_group=len(weighted))
 mods.append(d)
shape=[{"name":k.name,"value":round(k.value,5)} for k in body.data.shape_keys.key_blocks] if body.data.shape_keys else []
def tested(name,selector):
 c=body.copy();c.data=body.data.copy();bpy.context.scene.collection.objects.link(c)
 for m in list(c.modifiers):
  if not selector(m):c.modifiers.remove(m)
  else:m.show_viewport=True
 bpy.context.view_layer.update()
 try:return stats(c,name)
 finally:bpy.data.objects.remove(c,do_unlink=True)
base=tested("SHAPE_KEYS_NO_MODIFIERS",lambda x:False)
raw=tested("MASK_ONLY_ALL_ENABLED",lambda x:x.type=="MASK")
only_mask1=tested("FIRST_MASK_ONLY",lambda x:x.type=="MASK" and x.name==next((m.name for m in body.modifiers if m.type=="MASK"),""))
renderlike=tested("RENDER_FLAGS_ONLY_MASK",lambda x:x.type=="MASK" and x.show_render)
viewportlike=tested("VIEWPORT_FLAGS_ONLY_MASK",lambda x:x.type=="MASK" and x.show_viewport)
original=stats(body,"ORIGINAL_ACTIVE_VIEWPORT_MODIFIERS")
with GLB.open("rb") as f:
 hdr=f.read(20);magic,vers,length,jsonlen,chunk=struct.unpack("<4sIIII",hdr)
 assert magic==b"glTF" and length==GLB.stat().st_size and chunk==0x4E4F534A
 glb=json.loads(f.read(jsonlen))
meshes={m.get("name"):{"index":i,"primitives":len(m.get("primitives",[])),
  "targets":max((len(p.get("targets",[])) for p in m.get("primitives",[])),default=0)}
  for i,m in enumerate(glb.get("meshes",[]))}
nodes={n.get("name"):dict(mesh=n.get("mesh"),skin=n.get("skin")) for n in glb.get("nodes",[])}
r={
 "schema":"blank.engine.real-mask-morph-observation.v1",
 "source_sha256":SHA,"glb_sha256":GLB_SHA,
 "body_original_mesh":{"verts":len(body.data.vertices),"polygons":len(body.data.polygons),"uv_layers":[x.name for x in body.data.uv_layers],"shape_keys":shape},
 "modifiers":mods,"geometry_cases":[base,only_mask1,raw,viewportlike,renderlike,original],
 "gltf_meshes":meshes,"body_glb_node":nodes.get(body.name),
 "source_unmodified":True,"bake_or_export_changed":False,
 "parity_gate":"FAIL_PENDING_MASK_AND_MORPH_EXPORT_COMPARISON"
}
(OUT/"mask-morph-observation.json").write_text(json.dumps(r,indent=2)+"\n")
print("SOURCE_MASK_MORPH_DIAGNOSTIC",json.dumps(r),flush=True)
assert sha(SRC)==SHA
