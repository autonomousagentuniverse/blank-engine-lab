#!/usr/bin/env python3
"""Source-pinned Blender Cycles camera/light parity reference; no asset edits.
Creates same-camera photometric reference + material-independent white silhouette.
Coordinates are changed ONLY by the official glTF Y-up basis (x,y,z)->(x,z,-y).
"""
import bpy,hashlib,json,math,pathlib
from mathutils import Matrix
SRC=pathlib.Path("source/afro_mask_respected_uv_pbr.blend")
EXPECTED="a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570"
OUT=pathlib.Path("artifacts/afro-matched-camera");OUT.mkdir(parents=True,exist_ok=True)
def sha(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for c in iter(lambda:f.read(1048576),b""):h.update(c)
 return h.hexdigest()
assert sha(SRC)==EXPECTED,("PINNED_BLEND_SHA_MISMATCH",sha(SRC))
bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
scene=bpy.context.scene
cam=bpy.data.objects["CAM_face_closeup"]
assert cam.data.type=="ORTHO"
scene.camera=cam
w,h=720,960
scene.render.engine="CYCLES"
scene.cycles.samples=16
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=w;scene.render.resolution_y=h
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.film_transparent=False
body=bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"]
assert body.type=="MESH" and not body.hide_render
assert bpy.data.objects["AFRO_WOMAN_28_Medium_Build"].hide_render
rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
assert len(rig.data.bones)==53
assert len(body.data.vertices)==10756
# Orthographic view-frame camera-space extents include aspect ratio and shift.
frame=cam.data.view_frame(scene=scene)
xlo=min(p.x for p in frame);xhi=max(p.x for p in frame)
ylo=min(p.y for p in frame);yhi=max(p.y for p in frame)
assert xlo<xhi and ylo<yhi and .01<cam.data.clip_start<cam.data.clip_end
# Blender-to-glTF coordinate change on WORLD positions: (x,y,z) -> (x,z,-y)
# R rotates Blender +Z up to glTF +Y up without camera-local basis changes.
up=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
camera_glb=up@cam.matrix_world
flat=[float(camera_glb[r][c]) for c in range(4) for r in range(4)]
lights=[]
for o in bpy.data.objects:
 if o.type!="LIGHT" or o.hide_render:continue
 pos=up@o.matrix_world
 lights.append({"name":o.name,"type":o.data.type,"energy":o.data.energy,
 "color":list(o.data.color[:]),"location_yup":list(pos.translation[:]),
 "matrix_glb_colmajor":[float(pos[r][c]) for c in range(4) for r in range(4)]})
camera={
 "schema":"blank.engine.cam-cycles-chrome.reference.v1",
 "input_sha256":EXPECTED,"camera_name":cam.name,
 "canvas":{"width":w,"height":h},
 "orthographic_frame":{"left":xlo,"right":xhi,"bottom":ylo,"top":yhi},
 "clip":{"near":cam.data.clip_start,"far":cam.data.clip_end},
 "matrix_world_gltf_colmajor":flat,
 "scene_world":{"surface_color":"unknown_uses_saved_pbr_world","lights":lights},
 "color_comparison_is_qualitative":True,
 "silhouette_comparison_is_binary_anti_alias_tolerant":True,
 "no_source_or_geometric_changes":True,
 "photorealism_approved":False,"release_allowed":False
}
(OUT/"camera-and-light-reference.json").write_text(json.dumps(camera,indent=2)+"\n")
# Preserve original scene PBR shading as qualitative reference.
color=OUT/"blender-cycles-color.png"
scene.render.filepath=str(color.resolve())
bpy.ops.render.render(write_still=True)
assert color.stat().st_size>40000
view=bpy.context.view_layer
original_override=view.material_override
world=scene.world
previous_world=world
maskworld=bpy.data.worlds.new("AUDIT_ONLY_BLACK_WORLD")
maskworld.use_nodes=True
bg=next(n for n in maskworld.node_tree.nodes if n.type=="BACKGROUND")
bg.inputs["Color"].default_value=(0,0,0,1)
bg.inputs["Strength"].default_value=1
scene.world=maskworld
mat=bpy.data.materials.new("AUDIT_ONLY_EMISSION_WHITE")
mat.use_nodes=True
nt=mat.node_tree;nt.nodes.clear()
out=nt.nodes.new("ShaderNodeOutputMaterial")
em=nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value=(1,1,1,1)
em.inputs["Strength"].default_value=1
nt.links.new(em.outputs["Emission"],out.inputs["Surface"])
view.material_override=mat
scene.cycles.samples=4
scene.view_settings.view_transform="Standard"
scene.view_settings.look="Medium High Contrast"
mask=OUT/"blender-white-silhouette.png"
scene.render.filepath=str(mask.resolve())
bpy.ops.render.render(write_still=True)
assert mask.stat().st_size>15000
view.material_override=original_override;scene.world=previous_world
assert sha(SRC)==EXPECTED
camera["renders"]=[
 {"file":color.name,"sha256":sha(color),"bytes":color.stat().st_size,"kind":"existing-pbr"},
 {"file":mask.name,"sha256":sha(mask),"bytes":mask.stat().st_size,"kind":"white_emission"}]
(OUT/"camera-and-light-reference.json").write_text(json.dumps(camera,indent=2)+"\n")
print("BLENDER_CAMERA_REFERENCE",json.dumps(camera),flush=True)
