#!/usr/bin/env python3
"""Mask-respecting rigged body exporter on exact original UV-baked Afro human.

Rebuilds the BODY mesh subset from two actual Blender MASK vertex groups before
export, with original 11 morph deltas, UVs, materials and 53-bone skin weights.
The original body is retained and hidden only in a derivative .blend.
No production changes; visual parity not asserted without Chrome A/B.
"""
import bpy, json, pathlib, hashlib, struct, math, collections
SRC=pathlib.Path("source/afro_skinbound_uv_pbr.blend")
SHA="f903f4412bab7d29bdad85c31d21e576b1a6b3fbcbca8daf13c9e17dc5715fdb"
OUT=pathlib.Path("artifacts/afro-mask-respected")
OUT.mkdir(parents=True,exist_ok=True)

def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()

def eval_shape_only(body,keep_mask=False):
 o=body.copy();o.data=body.data.copy();bpy.context.scene.collection.objects.link(o)
 for m in list(o.modifiers):
  if m.type!="MASK" or not keep_mask:o.modifiers.remove(m)
 bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(dg)
 mesh=ev.to_mesh(preserve_all_data_layers=True,depsgraph=dg)
 try:return {
  "vertices":len(mesh.vertices),"faces":len(mesh.polygons),
  "positions":[tuple(v.co) for v in mesh.vertices],
  "materials":collections.Counter(p.material_index for p in mesh.polygons)
 }
 finally:ev.to_mesh_clear();bpy.data.objects.remove(o,do_unlink=True)

def main():
 assert sha(SRC)==SHA
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
 assert len(body.data.vertices)==19158
 rig=next(x for x in bpy.data.objects if x.type=="ARMATURE")
 assert len(rig.data.bones)==53
 masks=[m for m in body.modifiers if m.type=="MASK"]
 assert len(masks)==2,[(m.name,m.type) for m in body.modifiers]
 assert masks[0].vertex_group=="body" and not masks[0].invert_vertex_group
 assert masks[1].vertex_group=="Delete.female_casualsuit01" and masks[1].invert_vertex_group
 assert all(m.mode=="VERTEX_GROUP" and m.threshold==0 for m in masks)
 selected=set(range(len(body.data.vertices)))
 stages=[]
 for m in masks:
  g=body.vertex_groups[m.vertex_group]
  containing={v.index for v in body.data.vertices
        if any(w.group==g.index and w.weight>0 for w in v.groups)}
  selected=selected - containing if m.invert_vertex_group else selected & containing
  stages.append({"modifier":m.name,"vertices_remaining":len(selected),"group_size":len(containing)})
 assert len(selected)==10756,("MASK_SELECTED_COUNT_UNEXPECTED",len(selected),stages)
 keep=sorted(selected);remap={idx:j for j,idx in enumerate(keep)}
 faces_orig=[p for p in body.data.polygons if all(j in selected for j in p.vertices)]
 assert len(faces_orig)==10690,("MASK_FACE_COUNT_UNEXPECTED",len(faces_orig))
 before=eval_shape_only(body,keep_mask=True)
 assert before["vertices"]==len(keep) and before["faces"]==len(faces_orig)
 orig_keys=body.data.shape_keys.key_blocks
 assert len(orig_keys)==12,("SHAPE_KEYS_CHANGED",len(orig_keys))
 verts=[tuple(orig_keys[0].data[i].co) for i in keep]
 polygons=[tuple(remap[i] for i in p.vertices) for p in faces_orig]
 mesh=bpy.data.meshes.new("BLANK_BODY_MASK_RESPECTED_MESH")
 mesh.from_pydata(verts,[],polygons);mesh.update()
 for material in body.data.materials:mesh.materials.append(material)
 assert len(mesh.polygons)==len(faces_orig)
 orig_uv=body.data.uv_layers.active;assert orig_uv
 uv=mesh.uv_layers.new(name=orig_uv.name)
 for oldp,newp in zip(faces_orig,mesh.polygons):
  newp.material_index=oldp.material_index
  newp.use_smooth=oldp.use_smooth
  assert len(oldp.loop_indices)==len(newp.loop_indices)
  for oldl,newl in zip(oldp.loop_indices,newp.loop_indices):
   uv.data[newl].uv=orig_uv.data[oldl].uv
 # Duplicate original object metadata and its ARMATURE modifier only; keep
 # original group names so rig weights remain functional. Do not apply armature.
 candidate=body.copy();candidate.data=mesh
 candidate.name="AFRO_WOMAN_MASK_RESPECTED"
 bpy.context.scene.collection.objects.link(candidate)
 for m in list(candidate.modifiers):
  if m.type!="ARMATURE":candidate.modifiers.remove(m)
 assert len([m for m in candidate.modifiers if m.type=="ARMATURE"])==1
 for g in list(candidate.vertex_groups):candidate.vertex_groups.remove(g)
 group_map={}
 for group in body.vertex_groups:
  group_map[group.index]=candidate.vertex_groups.new(name=group.name)
 by_group=collections.defaultdict(lambda:collections.defaultdict(list))
 for idx in keep:
  for g in body.data.vertices[idx].groups:
   by_group[g.group][round(g.weight,7)].append(remap[idx])
 for group_index,weights in by_group.items():
  dest=group_map[group_index]
  for weight,indices in weights.items():
   if weight>0:dest.add(indices,weight,"REPLACE")
 # Recreate 11 morph targets, each with original Basis-relative coordinates.
 for k,old in enumerate(orig_keys):
  sk=candidate.shape_key_add(name=old.name,from_mix=False)
  assert len(sk.data)==len(keep)
  if k==0:continue
  for index,source_index in enumerate(keep):
   sk.data[index].co=old.data[source_index].co
  sk.value=old.value;sk.mute=old.mute
  sk.slider_min=old.slider_min;sk.slider_max=old.slider_max
  sk.interpolation=old.interpolation
 for k,old in enumerate(orig_keys):
  if k:
   candidate.data.shape_keys.key_blocks[k].relative_key=candidate.data.shape_keys.key_blocks[
      next((j for j,x in enumerate(orig_keys) if x.name==old.relative_key.name),0)]
 candidate.data.update()
 assert len(candidate.data.shape_keys.key_blocks)==len(orig_keys)
 # Verify exact source-active morph positions and topology in independent Blender
 # depsgraph; no masking modifiers needed on reconstructed candidate.
 after=eval_shape_only(candidate,keep_mask=False)
 assert (after["vertices"],after["faces"])==(before["vertices"],before["faces"])
 assert after["materials"]==before["materials"],("MATERIAL_FACE_COUNT_MISMATCH",after["materials"],before["materials"])
 # Blender MASK preserves ascending vertex order. Direct coordinates compare.
 errors=[max(abs(x-y) for x,y in zip(a,b)) for a,b in zip(after["positions"],before["positions"])]
 max_err=max(errors);mean_err=sum(errors)/len(errors)
 print("MASK_RESPECTED_SOURCE_TOPOLOGY",json.dumps({"before":(before["vertices"],before["faces"]),
  "after":(after["vertices"],after["faces"]),"max_vertex_error_m":max_err,
  "mean_vertex_error_m":mean_err,"stages":stages}),flush=True)
 assert max_err<0.000001,("MORPH_POSITION_DIFFERENCE_M",max_err)
 # Render identical original and reconstructed in same Cycles camera/lighting.
 scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.device="CPU"
 scene.cycles.samples=14;scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.camera=bpy.data.objects["CAM_face_closeup"]
 scene.render.resolution_x=720;scene.render.resolution_y=960
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 candidate.hide_render=True;body.hide_render=False
 baseline=OUT/"original_blender_mask.png";scene.render.filepath=str(baseline.resolve())
 bpy.ops.render.render(write_still=True)
 assert baseline.stat().st_size>40000
 body.hide_render=True;candidate.hide_render=False
 corrected=OUT/"rebuilt_mask_blender.png";scene.render.filepath=str(corrected.resolve())
 bpy.ops.render.render(write_still=True)
 assert corrected.stat().st_size>40000
 # Ensure original hidden and derivative candidate selected as sole body.
 bpy.ops.object.select_all(action="DESELECT")
 visible=[o for o in scene.objects if o.type=="MESH" and not o.hide_render]
 assert candidate in visible and body not in visible
 for o in visible+[rig]:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 glb=OUT/"afro_mask_respected_rigged.glb"
 bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format="GLB",
  use_selection=True,export_skins=True,export_animations=False,
  export_yup=True,export_apply=False)
 assert glb.stat().st_size>1000000
 with glb.open("rb") as f:
  h=f.read(20);magic,vers,length,jsize,ctype=struct.unpack("<4sIIII",h)
  assert magic==b"glTF" and vers==2 and length==glb.stat().st_size and ctype==0x4E4F534A
  doc=json.loads(f.read(jsize))
 nodes=doc.get("nodes",[])
 n=next(x for x in nodes if x.get("name")==candidate.name)
 assert n.get("skin") is not None,"MASK_REBUILT_BODY_NOT_SKINNED"
 mesh_glb=doc["meshes"][n["mesh"]]
 assert len(mesh_glb["primitives"])>=1
 morph_counts=[len(p.get("targets",[])) for p in mesh_glb["primitives"]]
 assert all(x==11 for x in morph_counts),("MORPH_TARGETS_NOT_PRESERVED",morph_counts)
 assert all("JOINTS_0" in p["attributes"] and "WEIGHTS_0" in p["attributes"] for p in mesh_glb["primitives"])
 assert len(doc.get("skins",[]))==1 and len(doc["skins"][0]["joints"])==53
 # Check actual glTF unique POSITION accessor counts per skin primitive, noting
 # UV seam/split vertices mean accessor counts not equivalent to Blender vertices.
 verts_by_prim=[doc["accessors"][p["attributes"]["POSITION"]]["count"] for p in mesh_glb["primitives"]]
 assert sha(SRC)==SHA
 packed=OUT/"afro_mask_respected_uv_pbr.blend"
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(packed.resolve()),compress=True,check_existing=False)
 report={
  "schema":"blank.engine.mask-morph-exact-reconstruction.v1",
  "input_blend_sha256":SHA,"source_unchanged":True,"blender_version":bpy.app.version_string,
  "initial_body_vertices":len(body.data.vertices),"masked_body_vertices":len(keep),
  "initial_body_faces":len(body.data.polygons),"masked_body_faces":len(faces_orig),
  "two_original_masks":stages,"active_shape_keys_preserved":len(orig_keys),
  "source_mask_vs_rebuild_max_vertex_difference_mm":round(max_err*1000,7),
  "source_mask_vs_rebuild_mean_vertex_difference_mm":round(mean_err*1000,7),
  "source_mask_vs_rebuild_material_face_counts_equal":True,
  "uv_layer":uv.name,"rig_bones":len(rig.data.bones),
  "skin_group_names_transferred":len(group_map),
  "gltf":{"filename":glb.name,"sha256":sha(glb),"bytes":glb.stat().st_size,
   "morph_targets_each_primitive":morph_counts,"body_mesh_primitives":len(mesh_glb["primitives"]),
   "position_accessor_vertices_per_primitive":verts_by_prim,
   "skin_joint_count":len(doc["skins"][0]["joints"]),"valid_skin":True},
  "blender_images":[{"filename":p.name,"sha256":sha(p),"bytes":p.stat().st_size} for p in [baseline,corrected]],
  "blend":{"filename":packed.name,"sha256":sha(packed),"bytes":packed.stat().st_size},
  "glb_webgl_visual_parity_verified":False,"photorealism_approved":False,
  "production_deployed":False,"release_allowed":False}
 (OUT/"mask-respected-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print("BLENDER_MASK_RESPECTED_RIGGED_EXPORT",json.dumps(report),flush=True)
if __name__=="__main__":main()
