#!/usr/bin/env python3
"""HUMAN-A06 isolated real Blender geometry proof from saved A05 derivative:
not a photorealistic skin or finished character render. Never reuse as the deliverable.
"""
import bpy,json,math,os,sys,traceback
from pathlib import Path
from mathutils import Vector
BASE=Path("baseline-a05")
OUT=Path("artifacts/human-a06-debug")
OUT.mkdir(parents=True,exist_ok=True)
status={"schema":"blank.a06.scalp-geometry-debug.v1","genuine_blender":True,
 "source":"A05 real Einar CC-BY source-derived .blend; textures missing in isolated run",
 "photorealism_accepted":False,"status":"STARTED","renders":[]}
def write(): (OUT/"report.json").write_text(json.dumps(status,indent=2)+"\n")
def a06_visible_groom(head, ec, height, front):
 """Rebuild A05's visually invisible fuzz as a render-visible short scalp
 hairstyle using a known stable Cycles material and geometric offsets.
 No source eye, lash, eyebrow, skin mesh or animation is altered.
 """
 import random
 rng=random.Random(20261017)
 head.data.update()
 crown=[]
 eZ=ec.z
 for p in head.data.polygons:
  world=head.matrix_world@p.center
  nW=(head.matrix_world.to_3x3()@p.normal).normalized()
  if world.z < eZ+height*.14 or nW.z<0.12 or p.area<=1e-9:continue
  crown.append((p,max(1e-10,p.area)))
 if len(crown)<120:raise AssertionError("No scalp polys for a proper groom")
 polygons=[z[0] for z in crown];weights=[z[1] for z in crown]
 c=bpy.data.curves.new("HumanA06_ScalpHairCurve","CURVE")
 c.dimensions="3D";c.resolution_u=1;c.bevel_depth=.00022;c.bevel_resolution=1
 c.use_fill_caps=False
 backwards=(head.matrix_world.inverted().to_3x3()@(-front)).normalized()
 nstrands=11500
 bounds=[]
 for poly in rng.choices(polygons,weights=weights,k=nstrands):
  coords=[head.data.vertices[i].co.copy() for i in poly.vertices]
  if len(coords)<3:continue
  if len(coords)>3 and rng.random()<.5:coords=[coords[0],coords[2],coords[3]]
  else:coords=coords[:3]
  u,v=rng.random(),rng.random()
  if u+v>1:u,v=1-u,1-v
  root=coords[0]*(1-u-v)+coords[1]*u+coords[2]*v
  n=poly.normal.normalized()
  f=(n*.5+backwards*.8+Vector((rng.uniform(-.12,.12),rng.uniform(-.12,.12),0))).normalized()
  length=rng.uniform(.015,.036)
  # Evaluated head includes subdivision/displacement, so offset 2.5mm
  # above un-evaluated root before extending the visible shaft.
  points=[root+n*.0025,root+n*.003+f*length*.56,root+n*.003+f*length]
  sp=c.splines.new("POLY");sp.points.add(2)
  for i,pt in enumerate(points):
   sp.points[i].co=(pt.x,pt.y,pt.z,1)
   sp.points[i].radius=(1.0,.68,.09)[i]
  bounds.append((root.z,length))
 groom=bpy.data.objects.new("HumanA06_ScalpGroom_Visible",c)
 bpy.context.scene.collection.objects.link(groom)
 groom.parent=head
 groom.matrix_parent_inverse.identity()
 # Stable node-based dark brown/charcoal material; previous film shader
 # could depend on attributes only the original Einar curves had.
 material=bpy.data.materials.new("HumanA06_VisibleDarkScalpHair")
 material.diffuse_color=(.09,.060,.045,1)
 material.use_nodes=True
 bs=material.node_tree.nodes.get("Principled BSDF")
 if bs is None:raise AssertionError("Blender Principled BSDF missing")
 bs.inputs["Base Color"].default_value=(.095,.062,.045,1)
 bs.inputs["Roughness"].default_value=.74
 c.materials.append(material)
 bpy.context.view_layer.update()
 world_points=[groom.matrix_world@c.splines[i].points[0].co.xyz for i in (0,len(c.splines)//2,len(c.splines)-1)]
 return groom,{
  "strands_requested":nstrands,"strands_created":len(c.splines),
  "root_source":"source head scalp polygons (un-evaluated), lifted 2.5mm",
  "scalp_polygon_count":len(crown),
  "length_m":[.015,.036],"strand_radius_m":.00022,
  "material_type":"Cycles node-based Principled BSDF no source curve attributes",
  "world_root_samples":[list(p) for p in world_points],
  "crown_bounds_z":[min(x[0] for x in bounds),max(x[0] for x in bounds)],
  "original_long_scalp_hair_disabled":True,
  "eyebrow_and_lash_curve_geometry_preserved":True
 }

def main():
 write()
 source=BASE/"human-a05-rig-neutral-no-strap.blend"
 if not source.exists():raise FileNotFoundError(source)
 bpy.ops.wm.open_mainfile(filepath=str(source.resolve()),load_ui=False)
 head=bpy.data.objects.get("GEO-einar_head")
 eyeL=bpy.data.objects.get("GEO-eye.L")
 eyeR=bpy.data.objects.get("GEO-eye.R")
 if not head or not eyeL or not eyeR:raise AssertionError("not authentic A05 Blender geometry")
 baseline=json.loads((BASE/"report.json").read_text())
 morph=next(x for x in baseline["changes"] if x["kind"]=="SOURCE_DERIVATIVE_FACIAL_SCULPT")
 height=float(morph["head_height_m"])
 front=Vector(morph["face_front"]).normalized()
 # Match the prior A05 front angle and eye line exactly.
 ec=(eyeL.matrix_world.translation+eyeR.matrix_world.translation)*.5
 groom,audit=a06_visible_groom(head,ec,height,front)
 status["groom"]=audit
 status["head_obj_name"]=head.name
 # Source film texture maps are not packed in saved Blender; override with a
 # clear clay shader so a missing map cannot masquerade as failed geometry.
 head.data=head.data.copy()
 clay=bpy.data.materials.new("HumanA06_DebugClaySkin");clay.diffuse_color=(.70,.44,.34,1)
 clay.use_nodes=True
 shader=clay.node_tree.nodes.get("Principled BSDF")
 shader.inputs["Base Color"].default_value=(.70,.44,.34,1)
 shader.inputs["Roughness"].default_value=.7
 head.data.materials.clear();head.data.materials.append(clay)
 for o in bpy.data.objects:
  if o.type in ("MESH","CURVE","CURVES","VOLUME"):
   if o.name==head.name or o.name==groom.name:o.hide_render=False
   else:o.hide_render=True
 groom.hide_render=False
 scene=bpy.context.scene
 scene.use_nodes=False
 scene.render.engine="CYCLES";scene.cycles.samples=10;scene.cycles.device="CPU"
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 try:scene.view_layers[0].cycles.use_denoising=True
 except Exception:pass
 world=bpy.data.worlds.new("HumanA06_DebugWorld");world.use_nodes=True
 world.node_tree.nodes["Background"].inputs["Color"].default_value=(.14,.16,.20,1)
 world.node_tree.nodes["Background"].inputs["Strength"].default_value=.9
 scene.world=world
 def point(o,location,target):
  o.location=location;o.rotation_euler=(target-location).to_track_quat("-Z","Y").to_euler()
 def light(name,location,target,energy,size):
  m=bpy.data.lights.new(name,"AREA");m.energy=energy;m.shape="DISK";m.size=size
  obj=bpy.data.objects.new(name,m);scene.collection.objects.link(obj);point(obj,location,target)
 mid=ec+Vector((0,0,-height*.12))
 light("A06_Debug_Key",mid+front*1.1+Vector((.4,.2,.5)),mid,550,1.5)
 light("A06_Debug_Fill",mid+front*.65+Vector((-.6,.1,.1)),mid,350,1.8)
 camera=bpy.data.objects.get("HumanA05_PortraitCamera")
 if not camera:
  camera=bpy.data.objects.new("A06_DebugCamera",bpy.data.cameras.new("A06_DebugCamera"))
  scene.collection.objects.link(camera)
 scene.camera=camera
 camera.data.type="ORTHO"
 for label,target,scale in [
  ("front_clay",mid,height*1.30),
  ("hair_macro",ec+Vector((0,0,height*.43)),height*.68)]:
  point(camera,target+front*1.4,target)
  camera.data.ortho_scale=scale
  scene.render.filepath=str((OUT/(label+".png")).resolve())
  print("BLENDER_A06_DEBUG_RENDER",label,flush=True)
  bpy.ops.render.render(write_still=True)
  fn=OUT/(label+".png")
  if not fn.exists() or fn.stat().st_size<5000:raise AssertionError("No Cycles render "+label)
  status["renders"].append({"name":label,"file":str(fn),"bytes":fn.stat().st_size})
  write()
 status["status"]="DEBUG_TWO_REAL_CYCLES_RENDERS_DONE_NOT_PHOTOREAL"
 bpy.ops.wm.save_as_mainfile(filepath=str((OUT/"a06-scalp-geometry-debug.blend").resolve()),compress=True,check_existing=False)
 write()
 print("A06_GEOMETRY_DEBUG_PASS",json.dumps({"strands":audit["strands_created"],"views":len(status["renders"])}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException as e:
 status["status"]="FAILED";status["error"]=type(e).__name__+": "+str(e);write()
 traceback.print_exc();sys.stdout.flush();os._exit(1)
