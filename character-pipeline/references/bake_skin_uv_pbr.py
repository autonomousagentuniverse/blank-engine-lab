#!/usr/bin/env python3
"""Blender 4.5.3 research-only UV PBR baking, existing pin-verified human.
Bakes ONLY the existing Dark_Brown_Skin_Microstructure to baseColor and tangent normal.
Retains non-skin materials and skeleton, no new face/identity/body geometry.
Baking a UV map does not validate colorimetry, clinical skin or WebGL parity.
"""
import bpy,hashlib,json,pathlib,struct,math
from mathutils import Vector

SRC=pathlib.Path("source/afro_skinbound_hair_derivative.blend")
EXPECTED="0eca41c5f0175e50df18914bb87cc007184ddcf55f2dd84ea3640645ddac2f52"
OUT=pathlib.Path("artifacts/afro-pbr-bake")
OUT.mkdir(parents=True,exist_ok=True)
RES=1024
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as fd:
  for chunk in iter(lambda:fd.read(1024*1024),b""):h.update(chunk)
 return h.hexdigest()
def png_size(p):
 b=p.read_bytes()[:24]
 assert b[:8]==b'\x89PNG\r\n\x1a\n'
 return struct.unpack(">II",b[16:24])

def main():
 assert sha(SRC)==EXPECTED,("WRONG_CHARACTER_INPUT",sha(SRC))
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
 assert body.type=="MESH" and len(body.data.vertices)==19158
 uv=body.data.uv_layers.active
 assert uv is not None, "SKIN_SOURCE_HAS_NO_UV_MAP"
 material=bpy.data.materials["Dark_Brown_Skin_Microstructure"]
 assert material.use_nodes
 indices=[i for i,x in enumerate(body.data.materials) if x==material]
 assert len(indices)>=1,("NO_SKIN_MATERIAL_SLOT",indices)
 # This MPFB source reuses one procedural skin material across five slots.
 # Bake every polygon referencing precisely that MATERIAL DATABLOCK.
 polys=[p for p in body.data.polygons if p.material_index in set(indices)]
 assert len(polys)>1000,("SKIN_POLYGONS_NOT_IDENTIFIED",len(polys))
 bsdf=next(n for n in material.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
 base=bsdf.inputs["Base Color"]
 normal=bsdf.inputs["Normal"]
 assert base.is_linked and normal.is_linked,"REQUIRED_PROCEDURAL_SKIN_NODES_MISSING"
 orig_nodes={"base_source":base.links[0].from_node.name,"normal_source":normal.links[0].from_node.name}
 # Evaluation probe prevents inherited clothing MASK modifiers from suppressing
 # the naked base anatomical UV atlas. Keep all source vertices to preserve Generated
 # bbox space; only include skin-assigned faces to prevent UV overlap contamination.
 proxy=body.copy();proxy.data=body.data.copy()
 bpy.context.scene.collection.objects.link(proxy)
 for mod in list(proxy.modifiers):proxy.modifiers.remove(mod)
 bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get()
 ep=proxy.evaluated_get(dg);e_mesh=ep.to_mesh()
 try:
  assert len(e_mesh.vertices)==len(body.data.vertices)
  verts=[tuple(v.co) for v in e_mesh.vertices]
 finally:
  ep.to_mesh_clear();bpy.data.objects.remove(proxy,do_unlink=True)
 faces=[tuple(p.vertices) for p in polys]
 skinmesh=bpy.data.meshes.new("AUDIT_SKIN_ONLY_UV_BAKE_MESH")
 skinmesh.from_pydata(verts,[],faces);skinmesh.update()
 assert len(skinmesh.polygons)==len(polys)
 new_uv=skinmesh.uv_layers.new(name=uv.name)
 for oldpoly,newpoly in zip(polys,skinmesh.polygons):
  assert len(oldpoly.loop_indices)==len(newpoly.loop_indices)
  for li,lj in zip(oldpoly.loop_indices,newpoly.loop_indices):
   new_uv.data[lj].uv=uv.data[li].uv
 duplicate=bpy.data.objects.new("AUDIT_SKIN_ONLY_UV_BAKE",skinmesh)
 bpy.context.scene.collection.objects.link(duplicate)
 duplicate.matrix_world=body.matrix_world.copy()
 bake_mat=material.copy()
 bake_mat.name="TEMP_SKIN_BAKE_NOT_FOR_EXPORT"
 skinmesh.materials.append(bake_mat)
 nt=bake_mat.node_tree
 target=nt.nodes.new("ShaderNodeTexImage")
 target.name="TARGET_UV_BAKE_COLOR"
 target.location=(-900,-550)
 for n in nt.nodes:n.select=False
 target.select=True;nt.nodes.active=target
 bpy.ops.object.select_all(action="DESELECT")
 duplicate.hide_render=False;duplicate.select_set(True);bpy.context.view_layer.objects.active=duplicate
 scene=bpy.context.scene
 scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=8
 scene.render.bake.use_clear=True
 scene.render.bake.margin=10
 scene.render.bake.use_pass_color=True
 scene.render.bake.use_pass_direct=False
 scene.render.bake.use_pass_indirect=False
 images={}
 image_color=bpy.data.images.new("BLANK_SKIN_BASECOLOR_UV_BAKED",width=RES,height=RES,alpha=True,float_buffer=False)
 image_color.generated_color=(0,0,0,0)
 image_color.colorspace_settings.name="sRGB"
 target.image=image_color
 print("BLENDER_PBR_BAKE_BASECOLOR_START",len(polys),uv.name,flush=True)
 bpy.ops.object.bake(type="DIFFUSE")
 color_path=OUT/"skin_basecolor_uv_1024.png"
 image_color.filepath_raw=str(color_path.resolve());image_color.file_format="PNG";image_color.save()
 assert color_path.stat().st_size>5000 and png_size(color_path)==(RES,RES)
 images["basecolor"]={"path":color_path.name,"sha256":sha(color_path),"bytes":color_path.stat().st_size}
 # NORMAL bake from original authored Bump shader (not arbitrary PBR normal).
 image_normal=bpy.data.images.new("BLANK_SKIN_NORMAL_UV_BAKED",width=RES,height=RES,alpha=True,float_buffer=False)
 image_normal.generated_color=(.5,.5,1,1)
 image_normal.colorspace_settings.name="Non-Color"
 target.image=image_normal
 scene.render.bake.normal_space="TANGENT"
 print("BLENDER_PBR_BAKE_TANGENT_NORMAL_START",flush=True)
 bpy.ops.object.bake(type="NORMAL")
 normal_path=OUT/"skin_normal_tangent_1024.png"
 image_normal.filepath_raw=str(normal_path.resolve());image_normal.file_format="PNG";image_normal.save()
 assert normal_path.stat().st_size>5000 and png_size(normal_path)==(RES,RES)
 images["normal"]={"path":normal_path.name,"sha256":sha(normal_path),"bytes":normal_path.stat().st_size}
 # Rewire ORIGINAL material only after both bakes succeeded and validated.
 nt0=material.node_tree
 for lk in list(base.links):nt0.links.remove(lk)
 for lk in list(normal.links):nt0.links.remove(lk)
 c=nt0.nodes.new("ShaderNodeTexImage");c.name="EXPORT_SKIN_BASECOLOR_UV";c.image=image_color
 c.location=(-700,120);c.interpolation="Linear"
 nt0.links.new(c.outputs["Color"],base)
 n=nt0.nodes.new("ShaderNodeTexImage");n.name="EXPORT_SKIN_NORMAL_UV";n.image=image_normal
 n.location=(-700,-150)
 # The linked image itself uses Non-Color; ShaderNodeTexImage has no node-level colorspace.
 nm=nt0.nodes.new("ShaderNodeNormalMap");nm.name="EXPORT_SKIN_TANGENT_NORMAL"
 nm.space="TANGENT";nm.uv_map=uv.name;nm.inputs["Strength"].default_value=.85
 nt0.links.new(n.outputs["Color"],nm.inputs["Color"])
 nt0.links.new(nm.outputs["Normal"],normal)
 # Delete the temporary bake-only mesh so it never appears in export.
 bpy.data.objects.remove(duplicate,do_unlink=True)
 # If source is linked via pack, keep baked images in packed duplicate before export.
 bpy.ops.file.pack_all()
 packed=OUT/"afro_skinbound_uv_pbr.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(packed.resolve()),compress=True,check_existing=False)
 assert packed.stat().st_size>10000000
 # Export only visible existing meshes and the exact original armature.
 bpy.ops.object.select_all(action="DESELECT")
 rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
 chosen=[o for o in bpy.context.scene.objects if o.type=="MESH" and not o.hide_render]
 for o in chosen+[rig]:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 glb=OUT/"afro_skinbound_uv_pbr.glb"
 bpy.ops.export_scene.gltf(filepath=str(glb.resolve()),export_format="GLB",use_selection=True,
    export_skins=True,export_animations=False,export_yup=True,export_apply=False)
 assert glb.stat().st_size>1000000
 with glb.open("rb") as f:
  header=f.read(20)
  magic,version,whole,jsize,chunk=struct.unpack("<4sIIII",header)
  assert magic==b"glTF" and version==2 and whole==glb.stat().st_size and chunk==0x4E4F534A
  graph=json.loads(f.read(jsize))
 named={m.get("name",""):m for m in graph.get("materials",[])}
 assert "Dark_Brown_Skin_Microstructure" in named,list(named)
 mat=named["Dark_Brown_Skin_Microstructure"]
 bc=mat.get("pbrMetallicRoughness",{}).get("baseColorTexture")
 no=mat.get("normalTexture")
 assert bc is not None, "SKIN_BAKED_BASECOLOR_TEXTURE_NOT_IN_GLTF"
 assert no is not None, "SKIN_BAKED_NORMAL_TEXTURE_NOT_IN_GLTF"
 assert len(graph.get("skins",[]))==1 and len(graph["skins"][0]["joints"])==53
 assert all(x in [n.get("name") for n in graph.get("nodes",[])] for x in [
    "BLANK_RIGGED_AFRO_LAYER_0","BLANK_RIGGED_AFRO_LAYER_1","BLANK_RIGGED_AFRO_LAYER_2"])
 # Independent render from same original saved closeup camera and lights.
 for n in bpy.context.selected_objects:n.select_set(False)
 bpy.context.scene.camera=bpy.data.objects["CAM_face_closeup"]
 scene.cycles.samples=22
 scene.render.resolution_x=720;scene.render.resolution_y=960
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 preview=OUT/"skinbound_uv_pbr_cycles_face.png"
 scene.render.filepath=str(preview.resolve())
 print("BLENDER_CYCLES_BAKED_SKIN_PREVIEW_START",flush=True)
 bpy.ops.render.render(write_still=True)
 assert preview.stat().st_size>40000
 data={
  "schema":"blank.engine.pbr-bake.uv-material.v1","blender":bpy.app.version_string,
  "input_sha256":EXPECTED,"source_unchanged":sha(SRC)==EXPECTED,
  "skin_polygons":len(polys),"skin_material_slots":indices,"uv_name":uv.name,
  "skin_material":material.name,"old_links":orig_nodes,
  "basecolor_and_normal_bake_pass":True,"images":images,
  "glb":{"path":glb.name,"sha256":sha(glb),"bytes":glb.stat().st_size,
      "skins":len(graph["skins"]),"joints":len(graph["skins"][0]["joints"]),
      "materials":len(graph["materials"]),"skin_basecolor_texture":bc,
      "skin_normal_texture":no,"structure_pass":True},
  "preview":{"path":preview.name,"sha256":sha(preview),"bytes":preview.stat().st_size},
  "blend":{"path":packed.name,"sha256":sha(packed),"bytes":packed.stat().st_size},
  "limits":["Only base color and tangent-space normal baked; original procedural authored input not photometric ground truth",
    "Cycles vs Chrome camera and lighting not yet controlled match",
    "Other unsupported materials or color management can still cause visual mismatch",
    "No photoreal, independent human identity, head pose collisions or production approval"],
  "cycles_chrome_visual_parity_verified":False,"photorealism_approved":False,
  "release_allowed":False,"production_deployed":False}
 (OUT/"uv-bake-report.json").write_text(json.dumps(data,indent=2)+"\n")
 print("BLENDER_UV_SKIN_PBR_BAKE_COMPLETE",json.dumps({
    "skin_polygons":len(polys),"color":images["basecolor"]["bytes"],"normal":images["normal"]["bytes"],
    "glb_sha256":data["glb"]["sha256"],"blend_sha256":data["blend"]["sha256"]}),flush=True)
if __name__=="__main__":main()
