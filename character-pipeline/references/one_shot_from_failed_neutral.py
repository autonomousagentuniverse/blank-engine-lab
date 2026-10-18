#!/usr/bin/env python3
"""ONE invocation -> measured 32bit neutral light -> ONE final Cycles portrait.

Based on the *failed* Phase14 8bit-overexposed patch, not copied imagery.
No persistent Blender model changes; using exact SHA-pinned masked female scene.
Scene-linear OpenEXR avoids the previous 255/255/255 saturation.
"""
import bpy,hashlib,json,math,pathlib,statistics
from mathutils import Vector,Matrix
from PIL import Image
import numpy as np
SOURCE=pathlib.Path("source/afro_mask_respected_uv_pbr.blend")
SHA="a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570"
OUT=pathlib.Path("artifacts/blank-one-shot-last-failure")
OUT.mkdir(parents=True,exist_ok=True)
def digest(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
 return h.hexdigest()
def configure_scene(s,w=720,h=960,samples=24):
 s.render.engine="CYCLES"
 s.cycles.device="CPU";s.cycles.samples=samples
 s.cycles.use_denoising=True
 s.render.threads_mode="FIXED";s.render.threads=4
 s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100
 s.render.film_transparent=False
assert digest(SOURCE)==SHA
bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
scene=bpy.context.scene
assert len(next(o for o in bpy.data.objects if o.type=="ARMATURE").data.bones)==53
assert len(bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"].data.vertices)==10756
camera=bpy.data.objects["CAM_face_closeup"]
assert camera.type=="CAMERA" and camera.data.type=="ORTHO"
scene.camera=camera
configure_scene(scene,samples=24)
# Turn off existing visible meshes only for an independent neutral light probe;
# the model is reloaded from untouched source before final image generation.
for obj in scene.objects:
 if obj.type in {"MESH","CURVE","SURFACE","FONT","META"}:obj.hide_render=True
lights=[o for o in scene.objects if o.type=="LIGHT" and not o.hide_render]
assert len(lights)==3 and all(o.data.type=="AREA" and o.data.shape=="DISK" for o in lights)
authored_lights=[{"name":o.name,"watts":float(o.data.energy),"diameter_m":float(o.data.size)} for o in lights]
w=bpy.data.worlds.new("ONE_SHOT_NEUTRAL_TEST_WORLD")
w.use_nodes=True
bg=next(n for n in w.node_tree.nodes if n.type=="BACKGROUND")
bg.inputs["Color"].default_value=(0,0,0,1);bg.inputs["Strength"].default_value=0
scene.world=w
center=Vector((0,0,1.6390173435211182))
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=.18,location=center)
sphere=bpy.context.object;sphere.name="ONE_SHOT_TEMP_18PCT_LINEAR_PATCH"
for face in sphere.data.polygons:face.use_smooth=True
mat=bpy.data.materials.new("ONE_SHOT_TEMP_NEUTRAL_ROUGH")
mat.use_nodes=True
principled=next(n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
principled.inputs["Base Color"].default_value=(.18,.18,.18,1)
principled.inputs["Roughness"].default_value=1
principled.inputs["Metallic"].default_value=0
sphere.data.materials.clear();sphere.data.materials.append(mat)
# Unlike Phase 14: 32-BIT scene-linear EXR, never RGB8 calibration.
hdr=OUT/"neutral_reference_scene_linear.exr"
scene.render.image_settings.file_format="OPEN_EXR"
scene.render.image_settings.color_depth="32"
scene.render.filepath=str(hdr.resolve())
print("ONE_SHOT_START_SCENE_LINEAR_HDR_NEUTRAL",flush=True)
bpy.ops.render.render(write_still=True)
assert hdr.exists() and hdr.stat().st_size>10000
probe=bpy.data.images.load(str(hdr.resolve()),check_existing=False)
assert tuple(probe.size)==(720,960),probe.size
# Blender loaded EXR pixels are float scene-linear RGBA; center of camera.
pixels=np.asarray(probe.pixels[:],dtype=np.float32).reshape(960,720,4)
roi=pixels[460:500,340:380,:3]
lum=roi@np.array([.2126,.7152,.0722],dtype=np.float32)
positive=lum[np.isfinite(lum)&(lum>0)]
assert positive.size>1300,("NEUTRAL_REFERENCE_NOT_VISIBLE",positive.size)
mid=float(np.median(positive))
assert math.isfinite(mid) and mid>1e-5
# This is a documented perceptual exposure choice for one shot, not a
# watts-to-nits measurement or an exact Chrome light calibration.
exposure_raw=math.log2(.22/mid)
ev=max(-12.0,min(3.0,exposure_raw))
print("ONE_SHOT_HDR_MEASURED",json.dumps({"scene_linear_roi_median":mid,
  "requested_exposure_EV":exposure_raw,"bounded_EV":ev,
  "roi_max_scene_linear":float(positive.max())}),flush=True)
bpy.data.images.remove(probe)
# Reload the original scene; no inherited patch, hidden body, changed light
# data, camera and world modifications are carried into character output.
assert digest(SOURCE)==SHA
bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
scene=bpy.context.scene
body=bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"]
assert body.type=="MESH" and not body.hide_render
assert bpy.data.objects["AFRO_WOMAN_28_Medium_Build"].hide_render
assert len(body.data.vertices)==10756
assert len(next(x for x in bpy.data.objects if x.type=="ARMATURE").data.bones)==53
assert [round(o.data.energy) for o in bpy.data.objects if o.type=="LIGHT" and not o.hide_render]==[
 int(x["watts"]) for x in authored_lights]
configure_scene(scene,w=960,h=1280,samples=48)
cam=bpy.data.objects["CAM_face_closeup"]
# Portrait shot: fixed authored scene, camera orbit only, no facial/body edits.
angle=23
focus=center.copy()
offset=cam.location-focus
cam.location=focus+(Matrix.Rotation(math.radians(angle),4,"Z")@offset)
cam.rotation_euler=(focus-cam.location).to_track_quat("-Z","Y").to_euler()
scene.camera=cam
scene.view_settings.view_transform="AgX"
scene.view_settings.look="Medium High Contrast"
scene.view_settings.exposure=ev
scene.view_settings.gamma=1
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGBA"
scene.render.image_settings.color_depth="8"
png=OUT/"one_shot_last_failed_character_3quarter.png"
scene.render.filepath=str(png.resolve())
print("ONE_SHOT_BEGIN_ACTUAL_CHARACTER_CYCLES",flush=True)
bpy.ops.render.render(write_still=True)
assert png.exists() and png.stat().st_size>45000
im=np.asarray(Image.open(png).convert("RGB"),dtype=np.uint8)
assert im.shape==(1280,960,3)
# Report clipping, not a fake photorealism pass. Empty-background fraction is
# also evaluated, but only raw image data is reported.
clipped=float(np.any(im>=254,axis=2).mean())
dark=float(np.all(im<=1,axis=2).mean())
assert np.std(im.astype(np.float32))>12,("RENDER_FLAT",float(np.std(im)))
assert digest(SOURCE)==SHA
# Save a reusable editable Blender derivative with the changed CAMERA/EXPOSURE
# only; original source is unchanged.
editable=OUT/"one_shot_camera_exposure_variant.blend"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(editable.resolve()),compress=True,check_existing=False)
assert editable.exists() and editable.stat().st_size>10000000
report={
 "schema":"blank.engine.one-shot-after-neutral-failure.v1",
 "source_blend_sha256":SHA,"source_unchanged":True,
 "source_description":"Existing synthetic MPFB-derived woman, black skin, Afro and 53-bone rig; not a newly generated human",
 "run_type":"one Blender invocation: float HDR neutral probe then new Cycles subject portrait",
 "failed_previous_test":"Phase 14 neutral 8-bit calibration saturated at RGB255; recovered via scene-linear 32bit EXR, not via sample power fitting",
 "hdr_reference":{"file":hdr.name,"sha256":digest(hdr),"bytes":hdr.stat().st_size,
  "source_lamp_watts_unchanged":True,"median_scene_linear_luminance":mid,
  "max_scene_linear_roi_luminance":float(positive.max())},
 "camera":{"source_camera":"CAM_face_closeup","orbit_degrees":angle},
 "lights":authored_lights,
 "display":{"transform":"AgX","look":"Medium High Contrast","exposure_ev":ev,"bounded":ev!=exposure_raw},
 "image":{"file":png.name,"sha256":digest(png),"bytes":png.stat().st_size,
  "width":960,"height":1280,"fraction_any_rgb_channel_nearwhite":clipped,
  "fraction_all_rgb_channels_nearblack":dark},
 "blend":{"file":editable.name,"sha256":digest(editable),"bytes":editable.stat().st_size},
 "geometry_changed":False,"shape_targets_changed":False,"authored_lamp_energy_changed":False,
 "natural_human_photorealism_approved":False,
 "true_one_shot_character_from_blank_scratch":False,
 "chrome_radiometry_calibrated":False,"production_deployed":False,"release_allowed":False,
 "next":"Eye/cornea, hair silhouette and actual human morphology still need new anatomically grounded generator; separate from this recovered one-shot render."
}
(OUT/"one-shot-report.json").write_text(json.dumps(report,indent=2)+"\n")
print("ONE_SHOT_LAST_FAILED_CHARACTER_IMAGE_RENDERED",json.dumps({
 "source_SHA":SHA,"result_SHA":report["image"]["sha256"],
 "hdr_luminance":mid,"exposure_ev":ev,"nearwhite_fraction":clipped,
 "image_bytes":png.stat().st_size,"blend_bytes":editable.stat().st_size}),flush=True)
