#!/usr/bin/env python3
"""Create a genuinely NON-EINAR human character from a CC0 Vitruvian scaffold.
Novelty status: authored CC0-derivative facial variant, NOT ground-up new topology.
Blender Cycles only. Source commit immutable; all used CC0 source maps are packed.
"""
import bpy, math, json, os, sys, hashlib, traceback
from pathlib import Path
from mathutils import Vector
ROOT=Path("artifacts/mira02-source-audit")
SOURCE=Path("assets/vitruvian-cc0")
ROOT.mkdir(parents=True,exist_ok=True)
UPSTREAM_COMMIT="bdecdcd537b4031fdd0fb299b7e4f93f084fffa0"
DATA={"schema":"blank.mira02.source-vs-variant.diagnostic.v1","status":"STARTED",
 "character_name":"Vitruvian original matched against MIRA-01 authored variant","identity_claim":"NEW_CC0_DERIVED_VARIANT_NOT_INDEPENDENT_SCULPT",
 "upstream_repo":"ibrews/VitruvianGodot","upstream_commit":UPSTREAM_COMMIT,
 "upstream_license":"Vitruvian character assets CC0 / MIT code; see upstream NOTICE.md",
 "einar_ancestry":False,"photorealism_approved":False,"webgl_approved":False,
 "source_images_packed":False,"frames":[]}
def log(): (ROOT/"report.json").write_text(json.dumps(DATA,indent=2,default=str)+"\n")
def hashfile(path):
 h=hashlib.sha256()
 with open(path,"rb") as f:
  for part in iter(lambda:f.read(1048576),b""):h.update(part)
 return h.hexdigest()
def find(name):
 o=bpy.data.objects.get(name)
 if o:return o
 return next((x for x in bpy.data.objects if x.name.startswith(name)),None)
def img(name,non_color=False):
 p=SOURCE/name
 if not p.is_file():raise FileNotFoundError(str(p))
 im=bpy.data.images.load(str(p.resolve()),check_existing=True)
 if non_color:im.colorspace_settings.name="Non-Color"
 return im
def mat_principled(name):
 mat=bpy.data.materials.get(name)
 if mat is None:raise ValueError("GLB source material absent: "+name)
 mat.use_nodes=True
 tree=mat.node_tree
 tree.nodes.clear()
 output=tree.nodes.new("ShaderNodeOutputMaterial")
 shader=tree.nodes.new("ShaderNodeBsdfPrincipled")
 tree.links.new(shader.outputs["BSDF"],output.inputs["Surface"])
 return mat,tree,shader
def tex(tree,name,non_color=False):
 node=tree.nodes.new("ShaderNodeTexImage")
 node.image=img(name,non_color)
 return node
def assign_mats():
 skin,sk,bs=mat_principled("VitSkin")
 base=tex(sk,"vit_face_bc.png")
 shade=sk.nodes.new("ShaderNodeHueSaturation")
 shade.inputs["Hue"].default_value=.5
 shade.inputs["Saturation"].default_value=.93
 shade.inputs["Value"].default_value=.94
 sk.links.new(base.outputs["Color"],shade.inputs["Color"])
 sk.links.new(shade.outputs["Color"],bs.inputs["Base Color"])
 bs.inputs["Roughness"].default_value=.54
 bs.inputs["Subsurface Weight"].default_value=.16
 if bs.inputs.get("Subsurface Radius"):bs.inputs["Subsurface Radius"].default_value=(1.0,.4,.3)
 rn=tex(sk,"vit_face_rough.png",True)
 sk.links.new(rn.outputs["Color"],bs.inputs["Roughness"])
 normals=tex(sk,"vit_face_n.png",True)
 n=sk.nodes.new("ShaderNodeNormalMap")
 n.inputs["Strength"].default_value=.55
 sk.links.new(normals.outputs["Color"],n.inputs["Color"])
 sk.links.new(n.outputs["Normal"],bs.inputs["Normal"])
 mouth,mt,mb=mat_principled("VitMouth")
 mtex=tex(mt,"vit_mouth.png")
 mt.links.new(mtex.outputs["Color"],mb.inputs["Base Color"])
 mb.inputs["Roughness"].default_value=.43
 for name in ("VitSclera","VitSclera.001"):
  if name not in bpy.data.materials:continue
  mat,nt,sh=mat_principled(name)
  t=tex(nt,"vit_sclera.png")
  nt.links.new(t.outputs["Color"],sh.inputs["Base Color"])
  sh.inputs["Roughness"].default_value=.34
 for name in ("VitIris","VitIris.001"):
  if name not in bpy.data.materials:continue
  mat,nt,sh=mat_principled(name)
  t=tex(nt,"vit_iris.png")
  nt.links.new(t.outputs["Color"],sh.inputs["Base Color"])
  sh.inputs["Roughness"].default_value=.32
 for name in ("VitCornea2","VitCornea2.001"):
  if name not in bpy.data.materials:continue
  _,_,sh=mat_principled(name)
  sh.inputs["Base Color"].default_value=(.98,.99,1.0,1)
  sh.inputs["Roughness"].default_value=.04
  sh.inputs["Transmission Weight"].default_value=.91
  sh.inputs["IOR"].default_value=1.376
 for name in ("VitTearline","VitCaruncle"):
  if name not in bpy.data.materials:continue
  _,_,sh=mat_principled(name)
  sh.inputs["Base Color"].default_value=(.54,.21,.19,1)
  sh.inputs["Roughness"].default_value=.21
  sh.inputs["Subsurface Weight"].default_value=.09
 for name in ("VitHairMat","VitBrowCardsMat"):
  if name not in bpy.data.materials:continue
  _,tree,sh=mat_principled(name)
  col=tex(tree,"vit_hair_diffuse.png")
  alpha=tex(tree,"vit_hair_opacity.png",True)
  sh.inputs["Roughness"].default_value=.67
  sh.inputs["Base Color"].default_value=(.10,.055,.037,1)
  tree.links.new(col.outputs["Color"],sh.inputs["Base Color"])
  # Card mask drives actual Cycles transparency, not solid polygon planes.
  tree.links.new(alpha.outputs["Color"],sh.inputs["Alpha"])
  try:bpy.data.materials[name].surface_render_method="DITHERED"
  except Exception:pass
  try:bpy.data.materials[name].use_transparent_shadow=True
  except Exception:pass
 return {"skin_nodes":len(sk.nodes),"skin_subsurface":.16,
         "source_textures":["vit_face_bc.png","vit_face_n.png","vit_face_rough.png",
          "vit_iris.png","vit_sclera.png","vit_mouth.png",
          "vit_hair_diffuse.png","vit_hair_opacity.png"]}
def sculpt_variant(head,center_eye,front):
 """Localized tissue changes. Preserve the original eye structures and FACS
 deltas; apply identical deltas to all morph targets. This is an authored CC0
 base variant, not independent topology. Actual novelty requires human review.
 """
 sk=head.data.shape_keys
 basis=sk.key_blocks.get("Basis") if sk else None
 if not basis:raise AssertionError("CC0 head lacks editable shape keys")
 back=Vector((0,0,1))
 xs=[abs((head.matrix_world@v.co).x) for v in head.data.vertices]
 if max(xs)<.03:raise AssertionError("Source head scale unexpected")
 inv=head.matrix_world.inverted().to_3x3()
 offsets=[]
 world_eye=center_eye
 for v in head.data.vertices:
  p=head.matrix_world @ basis.data[v.index].co
  dx=p.x
  zrel=p.z-world_eye.z
  depth=(p-world_eye).dot(front)
  # Tissue in the forward face only. Protect orbital / eyelid zones.
  protected=min(((dx-.033)**2+(zrel)**2)**.5,
                ((dx+.033)**2+(zrel)**2)**.5)
  orbit=1.0-math.exp(-.5*(protected/.026)**2)
  anterior=max(0,min(1,(depth+.025)/.048))
  face=orbit*anterior
  cheek=math.exp(-.5*((abs(dx)-.050)/.028)**2-.5*((zrel+.037)/.029)**2)
  jaw=math.exp(-.5*((abs(dx)-.045)/.030)**2-.5*((zrel+.089)/.033)**2)
  chin=math.exp(-.5*(dx/.035)**2-.5*((zrel+.125)/.035)**2)
  nose=math.exp(-.5*(dx/.014)**2-.5*((zrel+.053)/.026)**2)
  # More defined cheekbones, tapered jaw, softly projected chin/nasal bridge.
  lateral=face*(.0052*cheek-.0067*jaw)*(1 if dx>=0 else -1)
  forward=face*(.0020*cheek+.0040*chin-.0015*nose)
  dz=face*(-.0034*chin+.0012*cheek)
  world_delta=Vector((lateral,-forward,dz))
  offsets.append(inv@world_delta)
 moved=sum(d.length>.00008 for d in offsets)
 maxmove=max(d.length for d in offsets)
 if moved<300 or maxmove<.003 or maxmove>.020:
  raise AssertionError("New CC0 identity sculpt too small/large "+str((moved,maxmove)))
 # Crucial: all expression targets shifted identically, leaving FACS deltas valid.
 for key in sk.key_blocks:
  for i,d in enumerate(offsets):
   key.data[i].co+=d
  if key.name!="Basis":key.value=0.0
 head.data.update()
 return {"mesh_vertices":len(head.data.vertices),"changed_vertices":moved,
   "max_shift_mm":round(maxmove*1000,3),"shape_keys":len(sk.key_blocks),
   "identity_features":["reshaped_cheekbones","tapered_jaw","chin_and_nose_refinement"],
   "eyes_repositioned":False,
   "source_basis":"CC0 Vitruvian, not Einar"}
def aim(o,where,target):
 o.location=where;o.rotation_euler=(target-where).to_track_quat("-Z","Y").to_euler()
def light(label,place,target,energy,size,color):
 l=bpy.data.lights.new(label,"AREA")
 l.energy=energy;l.shape="DISK";l.size=size;l.color=color
 obj=bpy.data.objects.new(label,l)
 bpy.context.scene.collection.objects.link(obj);aim(obj,place,target)
def main():
 log()
 required=["vitruvian_head.glb","vitruvian_hair.glb","vit_face_bc.png",
 "vit_face_n.png","vit_face_rough.png","vit_iris.png","vit_sclera.png",
 "vit_mouth.png","vit_hair_diffuse.png","vit_hair_opacity.png"]
 for f in required:
  if not (SOURCE/f).is_file():raise FileNotFoundError("Missing source asset "+f)
 DATA["source_files"]={f:{"sha256":hashfile(SOURCE/f),"bytes":(SOURCE/f).stat().st_size} for f in required}
 bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str((SOURCE/"vitruvian_head.glb").resolve()))
 bpy.ops.import_scene.gltf(filepath=str((SOURCE/"vitruvian_hair.glb").resolve()))
 head=find("cm_vitruvian")
 l=find("Eye_L_eyeball");r=find("Eye_R_eyeball")
 hair=find("VitHair")
 if not head or not l or not r or not hair:raise AssertionError("Missing CC0 head, eyes or hair")
 DATA["objects"]=[{"name":o.name,"type":o.type,"vertices":len(o.data.vertices) if o.type=="MESH" else None}
   for o in bpy.data.objects if o.type=="MESH"]
 m=assign_mats()
 DATA["shading"]=m
 # Imported GLB maps head to Blender Z-up.
 center_eye=(l.matrix_world.translation+r.matrix_world.translation)*.5
 front=Vector((0.,-1.,0.))
 bpy.context.view_layer.update()
 # The control is *intact* CC0 Vitruvian head. Delay MIRA sculpt until after
 # recording unmodified front, eye macro and clay control render.
 DATA["condition_order"]=["original_material","original_clay","mira_material","mira_clay"]
 DATA["source_sculpt_mutated_before_baseline"]=False
 scene=bpy.context.scene
 scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=20
 scene.render.resolution_x=700;scene.render.resolution_y=700
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 scene.render.film_transparent=False
 scene.render.threads_mode="FIXED";scene.render.threads=4
 try:scene.view_layers[0].cycles.use_denoising=True
 except Exception:pass
 try:scene.view_settings.view_transform="AgX"
 except Exception:pass
 world=bpy.data.worlds.new("Mira01_Studio")
 world.use_nodes=True
 bg=world.node_tree.nodes.get("Background")
 bg.inputs["Color"].default_value=(.14,.17,.2,1)
 bg.inputs["Strength"].default_value=.45;scene.world=world
 mid=center_eye+Vector((0,0,-.022))
 light("Mira_Key",mid+front*.56+Vector((-.24,0,.18)),mid,46,.42,(1.0,.92,.84))
 light("Mira_Fill",mid+front*.49+Vector((.32,0,-.02)),mid,23,.51,(.8,.88,1.0))
 light("Mira_Rim",mid-front*.26+Vector((.26,0,.2)),mid,38,.39,(1.0,.98,.92))
 cams=[
  ("front",front,mid,.255),
  ("three_quarter",(front*.76+Vector((.65,0,0))).normalized(),mid,.27),
  ("profile",Vector((1,0,0)),mid,.275),
  ("eyes_macro",front,center_eye+Vector((0,0,.003)),.145)
 ]
 camReport=[]
 for label,normal,target,scale in cams:
  cam=bpy.data.objects.new("CAM_MIRA_"+label,bpy.data.cameras.new("CAM_MIRA_"+label))
  scene.collection.objects.link(cam);cam.data.type="ORTHO";cam.data.ortho_scale=scale
  aim(cam,target+normal*.52,target)
  camReport.append({"id":label,"camera":cam.name,"scale":scale})
 DATA["cameras"]=camReport
 # Pack all CC0 texture bytes into the generated .blend, making it portable.
 bpy.ops.file.pack_all()
 packed=[x.name for x in bpy.data.images if x.packed_file]
 if len(packed)<7:raise AssertionError("Expected all source textures to be packed: "+str(packed))
 DATA["source_images_packed"]=True
 # Before/after uses the same imported source, lights, exact camera objects
 # and named material graph. No color correction nor hair edits in either pass.
 source_mats=list(head.data.materials)
 if not source_mats:raise AssertionError("Source head material slots missing")
 clay=bpy.data.materials.new("MIRA02_DIAGNOSTIC_CLAY")
 clay.use_nodes=True
 cbs=clay.node_tree.nodes.get("Principled BSDF")
 cbs.inputs["Base Color"].default_value=(.52,.48,.45,1)
 cbs.inputs["Roughness"].default_value=.86
 camera_names={"front":"CAM_MIRA_front","eyes_macro":"CAM_MIRA_eyes_macro"}
 def capture(condition,kind):
  if kind=="clay":
   for i in range(len(source_mats)):head.data.materials[i]=clay
  else:
   for i,m in enumerate(source_mats):head.data.materials[i]=m
  bpy.context.view_layer.update()
  for view in (["front","eyes_macro"] if kind=="material" else ["front"]):
   camera=find(camera_names[view])
   if not camera or camera.type!="CAMERA":raise AssertionError("Fixed camera missing "+view)
   scene.camera=camera
   name=condition+"_"+kind+"_"+view+".png"
   file=ROOT/name
   scene.render.filepath=str(file.resolve())
   print("MIRA02_CYCLES_SAME_SCENE",name,flush=True)
   bpy.ops.render.render(write_still=True)
   if not file.exists() or file.stat().st_size<12000:
    raise AssertionError("Real Cycles file missing "+name)
   DATA["frames"].append({"view":view,"condition":condition,"shader":kind,
    "camera":camera.name,"file":name,"bytes":file.stat().st_size,
    "sha256":hashfile(file)})
   log()
 capture("original","material")
 capture("original","clay")
 # Exact MIRA-01 sculpt after the identical source camera/skin test.
 sculpt=sculpt_variant(head,center_eye,front)
 DATA["authored_variant"]=sculpt
 DATA["eye_geometry_unchanged"]=True
 capture("mira","material")
 capture("mira","clay")
 # Return original skin / mouth material slots in packed, readable output.
 for i,m in enumerate(source_mats):head.data.materials[i]=m
 bpy.context.view_layer.update()
 dest=ROOT/"mira02-comparison-scene.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(dest.resolve()),compress=True,check_existing=False)
 if not dest.is_file() or dest.stat().st_size<1500000:
  raise AssertionError("Actual packed Blender project missing")
 DATA["diagnostic_blend"]={"file":str(dest),"bytes":dest.stat().st_size,"sha256":hashfile(dest)}
 DATA["status"]="MATCHED_ORIGINAL_VS_MIRA_SIX_REAL_CYCLES_VIEWS_SAVED_NEEDS_VISUAL_AUDIT"
 log()
 print("MIRA02_MATCHED_SIX_RENDER_PASS",json.dumps({
  "frames":len(DATA["frames"]),"variant_vertices":sculpt["changed_vertices"],
  "source_mesh_vertices":len(head.data.vertices),
  "shader_nodes":m["skin_nodes"]}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException as exc:
 DATA["status"]="FAILED";DATA["error"]=type(exc).__name__+": "+str(exc)
 log();traceback.print_exc();sys.stdout.flush();os._exit(1)
