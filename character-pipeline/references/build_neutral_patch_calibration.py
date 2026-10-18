#!/usr/bin/env python3
"""Neutral-18%-reflectance calibration target, scene light units unchanged.
Read-only, SHA-pinned Blender scene; patch is separate from human and not used
to choose its appearance, exposure, textures or pose.
"""
import bpy,hashlib,json,pathlib
from mathutils import Matrix
from PIL import Image
import numpy as np
SRC=pathlib.Path("source/afro_mask_respected_uv_pbr.blend")
SHA="a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570"
OUT=pathlib.Path("artifacts/afro-neutral-light-calibration")
OUT.mkdir(parents=True,exist_ok=True)
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
assert sha(SRC)==SHA
bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
scene=bpy.context.scene
camera=bpy.data.objects["CAM_face_closeup"]
assert camera.type=="CAMERA" and camera.data.type=="ORTHO"
scene.camera=camera
rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
assert len(rig.data.bones)==53
bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"].hide_render=True
for o in bpy.context.scene.objects:
 if o.type in ("MESH","CURVE","FONT","SURFACE","META"):o.hide_render=True
# Hemisphere not added. Only existing three authored DISK lamps contribute.
lights=[o for o in bpy.context.scene.objects if o.type=="LIGHT" and not o.hide_render]
assert len(lights)==3 and all(x.data.type=="AREA" and x.data.shape=="DISK" for x in lights)
world=bpy.data.worlds.new("EXPERIMENT_CALIBRATION_BLACK_WORLD")
world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=="BACKGROUND")
bg.inputs["Color"].default_value=(0,0,0,1);bg.inputs["Strength"].default_value=0
scene.world=world
# Neutral target is at exact Blender source face height, near center camera ray.
CENTER=(0.0,0.0,1.6390173435211182)
RADIUS=.18
bpy.ops.mesh.primitive_uv_sphere_add(segments=128,ring_count=64,radius=RADIUS,location=CENTER)
patch=bpy.context.object;patch.name="EXPERIMENT_18PCT_NEUTRAL_SPHERE"
for p in patch.data.polygons:p.use_smooth=True
m=bpy.data.materials.new("EXPERIMENT_NEUTRAL_LINEAR_0_18")
m.use_nodes=True
bsdf=next(n for n in m.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
bsdf.inputs["Base Color"].default_value=(.18,.18,.18,1)
bsdf.inputs["Roughness"].default_value=1
bsdf.inputs["Metallic"].default_value=0
patch.data.materials.clear();patch.data.materials.append(m)
scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=96
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=720;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.film_transparent=False;scene.render.image_settings.file_format="PNG"
# Preserve the current production-source authored display intent; inverse sRGB
# of saved PNG is a display-linear empirical value NOT raw Cycles radiant flux.
scene.view_settings.view_transform="Standard"
scene.view_settings.look="Medium High Contrast"
scene.view_settings.exposure=0;scene.view_settings.gamma=1
out=OUT/"blender-neutral-disk-reference.png"
scene.render.filepath=str(out.resolve())
bpy.ops.render.render(write_still=True)
assert out.stat().st_size>5000
a=np.asarray(Image.open(out).convert("RGB"),dtype=np.float64)/255
roi=a[460:500,340:380,:]
assert roi.shape==(40,40,3)
med=np.median(roi.reshape(-1,3),axis=0)
mean=roi.mean((0,1))
def lin(s):return s/12.92 if s<=.04045 else ((s+.055)/1.055)**2.4
target=float(sum(lin(float(x)) for x in med)/3)
assert .002<target<.95,("BLENDER_REF_NOT_USABLE",target,med)
up=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
frame=camera.data.view_frame(scene=scene)
c=up@camera.matrix_world
lamp=[]
for o in lights:
 d=o.data;mat=up@o.matrix_world
 lamp.append({"name":o.name,"watts":float(d.energy),"shape":"DISK",
  "diameter_m":float(d.size),"color":list(d.color[:]),
  "matrix_yup":[float(mat[i][j]) for j in range(4) for i in range(4)]})
spec={
 "schema":"blank.engine.neutral-patch-calibration.v1",
 "blender_version":bpy.app.version_string,"source_sha256":SHA,
 "source_unmodified":sha(SRC)==SHA,
 "patch":{"geometry":"UV sphere 128x64","center_blender":list(CENTER),
  "radius_m":RADIUS,"base_color_linear":[.18,.18,.18],"roughness":1,"metallic":0},
 "sampling":{"rectangle_xyxy_px":[340,460,380,500],
  "median_srgb":med.tolist(),"mean_srgb":mean.tolist(),
  "median_display_linear_mean":target},
 "camera":{"frame":{"left":min(x.x for x in frame),"right":max(x.x for x in frame),
   "top":max(x.y for x in frame),"bottom":min(x.y for x in frame)},
   "world_gltf_yup_matrix":[float(c[i][j]) for j in range(4) for i in range(4)],
   "near":camera.data.clip_start,"far":camera.data.clip_end,
   "resolution":[720,960]},
 "lights":lamp,
 "color_management":{"view":"Standard","look":"Medium High Contrast","exposure":0},
 "reference":{"name":out.name,"sha256":sha(out),"bytes":out.stat().st_size},
 "not_physical_radiometric_equivalence":True,
 "photorealism_approved":False,"production_deployed":False}
(OUT/"blender-neutral-patch.json").write_text(json.dumps(spec,indent=2)+"\n")
print("BLENDER_NEUTRAL_DISK_PATCH",json.dumps({"median_srgb":med.tolist(),"target_display_linear":target,"lights":lamp}),flush=True)

# Held-out character views, NEVER used to derive calibrated light intensity.
bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
scene=bpy.context.scene
cam=bpy.data.objects["CAM_face_closeup"]
scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=24
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=720;scene.render.resolution_y=960
scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
# Facial reference plane is Blender x0,y0,z1.639, not a fitted image focus.
focus=__import__("mathutils").Vector((0.0,0.0,1.6390173435211182))
views=[]
for name,angle in [("front",0),("three_quarter_40",40)]:
 if angle==0:
  viewcam=cam
 else:
  from mathutils import Vector
  offset=cam.location-focus
  rotated=Matrix.Rotation(__import__("math").radians(angle),4,"Z")@offset
  viewcam=bpy.data.objects.new("EXPERIMENT_40DEG_CYCLES_CAMERA",cam.data.copy())
  scene.collection.objects.link(viewcam)
  viewcam.location=focus+rotated
  viewcam.rotation_euler=(focus-viewcam.location).to_track_quat("-Z","Y").to_euler()
 scene.camera=viewcam
 image=OUT/("blender-character-"+name+".png")
 scene.render.filepath=str(image.resolve())
 bpy.ops.render.render(write_still=True)
 assert image.stat().st_size>30000
 # White emission silhouette under the same exact camera, no lighting.
 original_world=scene.world;original_override=bpy.context.view_layer.material_override
 maskworld=bpy.data.worlds.new("EXPERIMENT_CALIBRATION_VIEW_BLACK")
 maskworld.use_nodes=True
 bg=next(n for n in maskworld.node_tree.nodes if n.type=="BACKGROUND")
 bg.inputs["Color"].default_value=(0,0,0,1);bg.inputs["Strength"].default_value=1
 scene.world=maskworld
 white=bpy.data.materials.new("EXPERIMENT_WHITE_SILHOUETTE")
 white.use_nodes=True;nodes=white.node_tree.nodes;nodes.clear()
 oo=nodes.new("ShaderNodeOutputMaterial");em=nodes.new("ShaderNodeEmission")
 em.inputs["Color"].default_value=(1,1,1,1);em.inputs["Strength"].default_value=1
 white.node_tree.links.new(em.outputs["Emission"],oo.inputs["Surface"])
 bpy.context.view_layer.material_override=white
 mask=OUT/("blender-silhouette-"+name+".png")
 scene.render.filepath=str(mask.resolve())
 bpy.ops.render.render(write_still=True)
 assert mask.stat().st_size>15000
 bpy.context.view_layer.material_override=original_override;scene.world=original_world
 mat=up@viewcam.matrix_world
 views.append({"name":name,"angle_degrees":angle,
  "matrix_yup":[float(mat[i][j]) for j in range(4) for i in range(4)],
  "file":image.name,"sha256":sha(image),"bytes":image.stat().st_size,
  "silhouette_file":mask.name,"silhouette_sha256":sha(mask)})
assert sha(SRC)==SHA
spec["heldout_character_views"]=views
(OUT/"blender-neutral-patch.json").write_text(json.dumps(spec,indent=2)+"\n")
print("BLENDER_HELD_OUT_HUMAN_VIEWS",json.dumps(views),flush=True)
