#!/usr/bin/env python3
"""Real, reproducible three-angle full-body one-shot Cycles render from the
EXACT SHA-pinned masked Blender character used in Phase 15.

No 2D generation or image edits. The same Blender meshes, materials, clothing,
53-bone armature, skin weights, pose and source 3 disk lamps remain unchanged.
Automatically frame whole model at front, 25-degree and 90-degree views.
"""
import bpy, hashlib, json, pathlib, math, statistics, os
from mathutils import Vector, Matrix
from PIL import Image
from full_body_morphology import CONTROL_DEFAULTS, apply_blender_body_widths
import numpy as np

SOURCE=pathlib.Path("source/afro_mask_respected_uv_pbr.blend")
PIN="a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570"
OUT=pathlib.Path("artifacts/blank-genuine-full-body")
OUT.mkdir(parents=True,exist_ok=True)
W,H=840,1260
MARGIN=.075
EV=-3.3500195136193742  # Verified scene-linear EXR experiment, Actions run 39153621026
SAMPLES=28
THREE_QUARTER_DEGREES=25
BODY_VALUES=CONTROL_DEFAULTS.copy()
RENDER_CONFIG_FILE=os.environ.get("BLANK_HUMAN_RENDER_CONFIG")
if RENDER_CONFIG_FILE:
 cfg=json.loads(pathlib.Path(RENDER_CONFIG_FILE).read_text())
 assert cfg.get("schema")=="blank.human.blender-render-config.v1", "INVALID_VISUAL_VARIABLE_CONFIG"
 assert cfg.get("source_sha256")==PIN, "WRONG_CONFIG_CHARACTER_SHA"
 assert cfg.get("release_allowed") is False and cfg.get("image_generation_used") is False, "NO_RELEASE_OR_IMAGEGEN_MISLABELING"
 assert cfg.get("actual_geometry_changed") is False, "CONFIG_CANNOT_PREAPPROVE_GEOMETRY_CHANGES"
 values=cfg.get("controls")
 basic_keys={"camera.margin","camera.three_quarter_orbit_degrees","render.cycles_samples","render.exposure_ev",
   "morphology.jaw_width","morphology.cheek_fullness","morphology.brow_ridge_strength"}
 assert isinstance(values,dict) and set(values) in (basic_keys,basic_keys|set(CONTROL_DEFAULTS)), "UNKNOWN_OR_MISSING_VARIABLE_BINDINGS"
 def bounded(name,low,high,integer=False):
  value=values[name]
  assert type(value) in (int,float) and math.isfinite(value) and low<=value<=high, "INVALID_CONTROL_"+name
  if integer:assert type(value) is int, "SAMPLES_MUST_BE_INTEGER"
  return value
 MARGIN=bounded("camera.margin",.04,.18)
 THREE_QUARTER_DEGREES=bounded("camera.three_quarter_orbit_degrees",10,60)
 SAMPLES=bounded("render.cycles_samples",16,128,True)
 EV=bounded("render.exposure_ev",-8,3)
 JAW_WIDTH=bounded("morphology.jaw_width",0,1)
 CHEEK_FULLNESS=bounded("morphology.cheek_fullness",0,1)
 BROW_RIDGE=bounded("morphology.brow_ridge_strength",0,1)
 for name in BODY_VALUES:
  if name in values:BODY_VALUES[name]=bounded(name,0,1)
 print("BLANK_EXECUTABLE_HUMAN_VARIABLES",json.dumps(values,sort_keys=True),flush=True)

def digest(p):
 h=hashlib.sha256()
 with p.open("rb") as stream:
  for c in iter(lambda:stream.read(1024*1024),b""):h.update(c)
 return h.hexdigest()

assert digest(SOURCE)==PIN, "WRONG_ORIGINAL_BLENDER_CHARACTER"
bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
scene=bpy.context.scene
body=bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"]
assert body.type=="MESH" and not body.hide_render
assert len(body.data.vertices)==10756
old=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
assert old.hide_render, "SOURCE_BODY_IS_NOT_CORRECT_MASKED_VERSION"
rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
assert len(rig.data.bones)==53
assert len(body.data.shape_keys.key_blocks)==12
lights={o.name:round(float(o.data.energy),6) for o in scene.objects if o.type=="LIGHT" and not o.hide_render}
assert len(lights)==3
assert all(o.data.type=="AREA" and o.data.shape=="DISK" for o in scene.objects if o.type=="LIGHT" and not o.hide_render)
face_data={}
face_keys={}
if RENDER_CONFIG_FILE:
 from human_face_morph_bindings import DEFAULTS as FACE_DEFAULTS, apply_face_controls
 if any(abs(values[k]-d)>1e-10 for k,d in FACE_DEFAULTS.items()):
  face_data,face_keys=apply_face_controls(body,values)
  print("BLANK_REAL_FACE_SHAPE_KEYS_CREATED",json.dumps(face_data),flush=True)
# Body and skinned garments get same controlled rest-geometry warp.
# Apply after any face shape-key creation so expression keys are preserved.
BODY_RESULT=apply_blender_body_widths(body=body,rig=rig,scene=scene,values=BODY_VALUES)
print("BLANK_REAL_BODY_GEOMETRY",json.dumps(BODY_RESULT,sort_keys=True),flush=True)

# Bound all actually visible human meshes and visible curves; never use source
# portrait camera crop or rough guessed character height.
objects=[o for o in scene.objects if o.type in {"MESH","CURVE","SURFACE"} and not o.hide_render and not o.hide_get()]
assert body in objects
world_bounds=[]
object_log=[]
for obj in objects:
 coords=[obj.matrix_world@Vector(c) for c in obj.bound_box]
 mins=[min(v[i] for v in coords) for i in range(3)]
 maxs=[max(v[i] for v in coords) for i in range(3)]
 widths=[maxs[i]-mins[i] for i in range(3)]
 # Decorative render planes/large floor are not model extents. They are left
 # UNMODIFIED in actual Cycles scene; exclude only from camera bbox fit.
 if max(widths)>5.0 or widths[2]>3.5:
  object_log.append({"name":obj.name,"included_in_framing":False,"dimensions":widths})
  continue
 world_bounds.extend(coords)
 object_log.append({"name":obj.name,"included_in_framing":True,"dimensions":widths})
assert len(world_bounds)>50,("NOT_ENOUGH_RENDERABLE_HUMAN_OBJECT_BOUNDS",len(world_bounds))
minv=Vector(tuple(min(v[i] for v in world_bounds) for i in range(3)))
maxv=Vector(tuple(max(v[i] for v in world_bounds) for i in range(3)))
center=(minv+maxv)/2
height=maxv.z-minv.z
assert 1.0<height<3.5,("SUSPECT_MODEL_HEIGHT",height,list(minv),list(maxv))
assert maxv.z>1.5 and minv.z<.6,("HEAD_AND_FEET_NOT_BOTH_IN_FRAME_SOURCE",list(minv),list(maxv))
assert (maxv.x-minv.x)<2 and (maxv.y-minv.y)<2.5

scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=SAMPLES
scene.cycles.use_denoising=True
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=W;scene.render.resolution_y=H;scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.render.image_settings.color_depth="8"
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=EV
scene.view_settings.gamma=1

original=bpy.data.objects["CAM_face_closeup"]
face_comparison={}
if face_keys:
 scene.camera=original
 old_dims=(scene.render.resolution_x,scene.render.resolution_y)
 scene.render.resolution_x=720;scene.render.resolution_y=960
 scene.cycles.samples=24
 names=list(face_keys.values())
 for name in names:body.data.shape_keys.key_blocks[name].value=0.0
 baseline_face=OUT/"baseline_actual_face.png";scene.render.filepath=str(baseline_face.resolve())
 bpy.ops.render.render(write_still=True)
 for name in names:body.data.shape_keys.key_blocks[name].value=1.0
 modified_face=OUT/"geometry_modified_actual_face.png";scene.render.filepath=str(modified_face.resolve())
 bpy.ops.render.render(write_still=True)
 A=np.asarray(Image.open(baseline_face).convert("RGB"),dtype=np.float32)
 B=np.asarray(Image.open(modified_face).convert("RGB"),dtype=np.float32)
 absdiff=np.abs(A-B)
 mean=float(absdiff.mean());pixels=int(np.sum(np.max(absdiff,axis=2)>2))
 assert pixels>100,("MORPH_NO_RENDER_CHANGE",pixels,mean)
 face_comparison={"baseline_file":baseline_face.name,"modified_file":modified_face.name,
 "baseline_sha256":digest(baseline_face),"modified_sha256":digest(modified_face),
 "mean_absolute_rgb_difference":mean,"pixels_changed_over_2":pixels,
 "camera_unchanged":True,"lights_unchanged":True,"source_unchanged":True}
 print("ACTUAL_GEOMETRY_CHANGED_FACE_CYCLES_AB",json.dumps(face_comparison),flush=True)
 scene.render.resolution_x,scene.render.resolution_y=old_dims
 scene.cycles.samples=SAMPLES
assert original.data.type=="ORTHO"
# Take the EXISTING Blender face-camera horizontal azimuth as zero: only orbit
# around WORLD z for subsequent views, without changing the mesh pose.
face_target=Vector((0,0,1.6390173435211182))
front_dir=(original.location-face_target)
front_dir.z=0.0
assert front_dir.length>.01
front_dir.normalize()
world_extent={"min":list(minv),"max":list(maxv),"center":list(center)}
shots=[]
for name,degrees in [("front",0),(f"three_quarter_{THREE_QUARTER_DEGREES:g}",THREE_QUARTER_DEGREES),("profile_90",90)]:
 angle=math.radians(degrees)
 direction=Matrix.Rotation(angle,4,"Z")@front_dir
 direction.normalize()
 cam=bpy.data.objects.new("ONE_SHOT_FULL_BODY_CAMERA_"+name,original.data.copy())
 scene.collection.objects.link(cam)
 cam.location=center+direction*5.0
 cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
 scene.view_layers[0].update()
 # Project authored geometry BBOX, then compute necessary orthographic extent.
 inverse=cam.matrix_world.inverted()
 loc=[inverse@p for p in world_bounds]
 lo=[min(v[j] for v in loc) for j in (0,1)]
 hi=[max(v[j] for v in loc) for j in (0,1)]
 span=[hi[j]-lo[j] for j in (0,1)]
 aspect=W/H
 # Because the output canvas is portrait, y is longer; Blender ortho_scale
 # is the vertical visible span in portrait. Fit both dimensions, allow 7.5%
 # margin per side.
 needed=max(span[1],span[0]/aspect)
 ortho=needed/(1-2*MARGIN)
 assert ortho>=height*(1-2*MARGIN),("IMPROPER_FRAME_CALCULATION",ortho,height)
 # Center projected subject bbox in camera x/y coordinates.
 shift_x=(lo[0]+hi[0])/2
 shift_y=(lo[1]+hi[1])/2
 right=cam.matrix_world.to_quaternion()@Vector((1,0,0))
 up=cam.matrix_world.to_quaternion()@Vector((0,1,0))
 cam.location+=right*shift_x+up*shift_y
 cam.data.ortho_scale=ortho
 cam.data.clip_start=.01;cam.data.clip_end=150
 scene.view_layers[0].update()
 coord=[cam.matrix_world.inverted()@p for p in world_bounds]
 left=min(v.x for v in coord)
 rightmost=max(v.x for v in coord)
 bottom=min(v.y for v in coord)
 top=max(v.y for v in coord)
 rect={
  "left":.5+left/(aspect*ortho),
  "right":.5+rightmost/(aspect*ortho),
  "top":.5-top/ortho,
  "bottom":.5-bottom/ortho
 }
 assert all(0.025<rect[k]<.975 for k in rect),("CROPPED_FULL_BODY",name,rect)
 assert rect["top"]<rect["bottom"] and rect["left"]<rect["right"]
 scene.camera=cam
 image=OUT/("actual_blender_full_body_"+name+".png")
 scene.render.filepath=str(image.resolve())
 print("REAL_BLENDER_FULL_BODY_SHOT_START",json.dumps({"name":name,"projection":rect,"ortho":ortho,"height":height}),flush=True)
 bpy.ops.render.render(write_still=True)
 assert image.stat().st_size>40000
 rgb=np.asarray(Image.open(image).convert("RGB"),dtype=np.uint8)
 assert rgb.shape==(H,W,3)
 assert float(rgb.std())>9,("INVALID_UNIFORM_RENDER",name,float(rgb.std()))
 clipped=float(np.any(rgb>=254,axis=2).mean())
 shots.append({
  "name":name,"orbit_degrees":degrees,"camera_orthoscale":ortho,
  "camera_position_world":list(cam.location),
  "human_projected_bounds_normalized":rect,
  "path":image.name,"sha256":digest(image),"bytes":image.stat().st_size,
  "nearwhite_fraction":clipped,"image_rgb_std":float(rgb.std()),
  "head_to_foot_framing_pass":True})
 print("REAL_BLENDER_FULL_BODY_SHOT_DONE",name,shots[-1]["sha256"],flush=True)

# Default editable scene camera = 25-degree full-body and all three are
# preserved as independently selectable camera objects in one derivative .blend.
scene.camera=bpy.data.objects[f"ONE_SHOT_FULL_BODY_CAMERA_three_quarter_{THREE_QUARTER_DEGREES:g}"]
editable=OUT/"actual_full_body_camera_variants.blend"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(editable.resolve()),compress=True,check_existing=False)
assert editable.stat().st_size>10000000
assert digest(SOURCE)==PIN
report={
 "schema":"blank.engine.genuine-full-body-camera-shot.20261018.v1",
 "source_blend_sha256":PIN,"source_unchanged":True,
 "source_is_existing_3d_character":True,
 "source_character_reconstructed_from_2d_generated_images":False,
 "image_generation_tool_used":False,
 "human":"Existing Blender 3D synthetic MPFB-derived dark-skinned woman; optionally adjusted torso/garment morphology from original 3D source; not independent identity generation",
 "single_blender_process_multiple_views":True,
 "mesh_geometry_changed":bool(face_keys) or BODY_RESULT["applied"],
 "morphs_changed":bool(face_keys) or BODY_RESULT["applied"],"light_powers_changed":False,
 "bone_count":53,"source_light_names_watts":lights,
 "source_world_model_bounds_m":world_extent,
 "model_height_m":height,
 "actual_face_geometry_morphs":face_data,
 "body_morphology":{"values":BODY_VALUES,**BODY_RESULT},
 "controlled_face_render_AB":face_comparison,
 "control_provenance":{"contract":"blank.human.visual-variables.v1",
  "compiled_config_applied":bool(RENDER_CONFIG_FILE),
  "margin_fraction":MARGIN,
  "three_quarter_degrees":THREE_QUARTER_DEGREES,
  "cycles_samples":SAMPLES,
  "exposure_ev":EV,
  "body_controls_applied":BODY_VALUES if BODY_RESULT["applied"] else {},
  "unimplemented_controls_applied":[],
  "bound_face_shape_key_names":face_keys},
 "blender_version":bpy.app.version_string,
 "render":{"engine":"CYCLES","width":W,"height":H,"samples":SAMPLES,
  "display_transform":"AgX","look":"AgX - Medium High Contrast",
  "exposure_EV":EV,"automatic_framing":"visible human geometry projected onto each actual camera, no cropped hands/hair/feet"},
 "shots":shots,
 "editable_blend":{"path":editable.name,"sha256":digest(editable),"bytes":editable.stat().st_size},
 "photoreal_human_approved":False,
 "new_identity_generation_claimed":False,
 "production_deployed":False,
 "release_allowed":False
}
(OUT/"actual-full-body-report.json").write_text(json.dumps(report,indent=2)+"\n")
print("ACTUAL_FULL_BODY_BLENDER_THREE_VIEWS_COMPLETE",json.dumps({x["name"]:x["sha256"] for x in shots}),flush=True)
