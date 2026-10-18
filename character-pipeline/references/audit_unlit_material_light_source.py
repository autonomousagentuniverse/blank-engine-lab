#!/usr/bin/env python3
"""Phase 13: compare actual material color without illumination and record authored
AREA light sizes/directions. This is a read-only Blender 4.5.3 experiment, not
an invented person or a calibrated light transport match.
"""
import bpy,json,pathlib,hashlib,math
from mathutils import Matrix
SOURCE=pathlib.Path("source/afro_mask_respected_uv_pbr.blend")
PIN="a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570"
ROOT=pathlib.Path("artifacts/afro-light-isolation");ROOT.mkdir(parents=True,exist_ok=True)
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for q in iter(lambda:f.read(1048576),b""):h.update(q)
 return h.hexdigest()
assert sha(SOURCE)==PIN,("SOURCE_SHA",sha(SOURCE))
bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
scene=bpy.context.scene
camera=bpy.data.objects["CAM_face_closeup"];scene.camera=camera
assert camera.data.type=="ORTHO"
assert bpy.data.objects["AFRO_WOMAN_28_Medium_Build"].hide_render
body=bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"]
assert len(body.data.vertices)==10756
rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
assert len(rig.data.bones)==53
# Unmodified scene camera: same reference camera as Phase 12.
up=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
frame=camera.data.view_frame(scene=scene)
proj={"left":min(v.x for v in frame),"right":max(v.x for v in frame),
 "bottom":min(v.y for v in frame),"top":max(v.y for v in frame)}
model_matrix=up@camera.matrix_world
cam_json={"orthographic_frame":proj,"near":camera.data.clip_start,
 "far":camera.data.clip_end,"matrix_yup_colmajor":[model_matrix[i][j] for j in range(4) for i in range(4)]}
area=[]
for obj in bpy.data.objects:
 if obj.type!="LIGHT" or obj.hide_render:continue
 d=obj.data;world=up@obj.matrix_world
 if d.type=="AREA":
  # RECTANGLE sizes are size and size_y; SQUARE has size x size.
  # DISK and ELLIPSE emit from nonrectangular area, cannot be exact
  # RectAreaLight; record an honest shape flag.
  shape=d.shape
  w=d.size
  h=d.size_y if shape in ("RECTANGLE","ELLIPSE") else d.size
  norm={"w":w,"h":h,"area_m2":w*h if shape in ("SQUARE","RECTANGLE") else math.pi*w*h/4}
 else:
  shape=None;norm=None
 area.append({"name":obj.name,"type":d.type,"shape":shape,
  "energy_watts_blender":float(d.energy),"color_linear":list(d.color[:]),
  "area":norm,"matrix_yup_colmajor":[world[i][j] for j in range(4) for i in range(4)]})
scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=10
scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=720;scene.render.resolution_y=960
scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
# For this isolation, background is black and emission is direct texture/color,
# so authored AREA lamps make no contribution. Standard view + Medium High
# Contrast look are documented explicitly, *not* asserted as colorimetrically
# identical to Chrome's sRGB output.
scene.view_settings.view_transform="Standard"
scene.view_settings.look="Medium High Contrast"
scene.view_settings.exposure=0
scene.view_settings.gamma=1
world=bpy.data.worlds.new("EXPERIMENT_ONLY_BLACK_WORLD");world.use_nodes=True
background=next(n for n in world.node_tree.nodes if n.type=="BACKGROUND")
background.inputs["Color"].default_value=(0,0,0,1);background.inputs["Strength"].default_value=1
scene.world=world
mutated={};material_notes=[]
for obj in bpy.context.scene.objects:
 if obj.type!="MESH" or obj.hide_render:continue
 for slot in obj.material_slots:
  mat=slot.material
  if mat is None:continue
  key=mat.as_pointer()
  if key not in mutated:
   cp=mat.copy();cp.name="EXPERIMENT_UNLIT_"+mat.name
   cp.use_nodes=True;nodes=cp.node_tree.nodes;links=cp.node_tree.links
   bsdf=next((n for n in nodes if n.type=="BSDF_PRINCIPLED"),None)
   output=next((n for n in nodes if n.type=="OUTPUT_MATERIAL"),None)
   # Non-principled sources reported but retain their original shading.
   if bsdf and output:
    base=bsdf.inputs["Base Color"]
    e=nodes.new("ShaderNodeEmission");e.name="EXPERIMENT_AUTHORED_BASE_ONLY"
    e.inputs["Strength"].default_value=1
    if base.is_linked:
     source=base.links[0].from_socket
     links.new(source,e.inputs["Color"])
     basekind="linked"
    else:
     e.inputs["Color"].default_value=base.default_value
     basekind="constant"
    links.new(e.outputs["Emission"],output.inputs["Surface"])
   else:basekind="non_principled_unmodified"
   mutated[key]=cp
   material_notes.append({"name":mat.name,"case":basekind,
     "alpha_method":str(getattr(mat,"surface_render_method","unknown"))})
  slot.material=mutated[key]
p=ROOT/"blender-emission-unlit.png"
scene.render.filepath=str(p.resolve())
bpy.ops.render.render(write_still=True)
assert p.stat().st_size>30000
assert sha(SOURCE)==PIN
report={"schema":"blank.engine.material-light-isolation.blender.v1",
 "source_blend_sha256":PIN,"source_unchanged":True,
 "camera":cam_json,"authored_lights":area,
 "render":{"file":p.name,"sha256":sha(p),"bytes":p.stat().st_size},
 "color_management":{"view_transform":scene.view_settings.view_transform,
  "look":scene.view_settings.look,"exposure":scene.view_settings.exposure,
  "gamma":scene.view_settings.gamma},
 "materials":material_notes,"material_count":len(material_notes),
 "unlit_bypass":"Direct emission of author's Principled Base Color input; no diffuse, specular, ambient, shadow or bump response",
 "known_limitations":["Standard High Contrast display look is not linear neutral",
  "Non-Principled materials are explicitly listed and may not be light independent",
  "Transparent/alpha source nodes not reinterpreted, potential silhouette/color disagreement",
  "Blender area light Watts and Three.js RectAreaLight nit units cannot be equated without spectral/radiometric calibration"],
 "photorealism_approved":False,"production_deployed":False,"radiometric_parity_certified":False}
(ROOT/"blender-unlit-reference.json").write_text(json.dumps(report,indent=2)+"\n")
print("BLENDER_UNLIT_AUTHORED_BASECOLOR",json.dumps({"materials":material_notes,"lights":area,"render":report["render"]}),flush=True)
