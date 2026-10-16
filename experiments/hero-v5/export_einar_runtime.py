#!/usr/bin/env python3
"""Einar v5: REAL copied 3D head+eyes in Three.js-ready PBR glTF.
Source is verified official Blender Studio Einar. This is a STATIC materials
transfer benchmark. Original Blender rig, poses, meshes and textures untouched.
Blink, hair curves and Blender film shaders NOT claimed as converted.
"""
import bpy,hashlib,json,math,os,sys,traceback
from pathlib import Path
from PIL import Image
OUT=Path("artifacts/hero-v5-einar");OUT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(".ci-einar/source/einar_release_v1.blend")
ZIP_SHA="3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7"
CREDIT="Einar Rig (CC-BY) Blender Foundation | studio.blender.org"
TEXDIR=Path(".ci-einar/webgl-textures");TEXDIR.mkdir(parents=True,exist_ok=True)
MESH_NAMES=["GEO-einar_head","GEO-eye.L","GEO-eye.R","Eye_Sphere.L","Eye_Sphere.R",
 "GEO-eye.cornea.L","GEO-eye.cornea.R","GEO-eye.meniscus.L","GEO-eye.meniscus.R",
 "GEO-eye.plica_semilunaris.L","GEO-eye.plica_semilunaris.R","GEO-einar_eyelash_surfdef"]
def save(state): (OUT/"export-audit.json").write_text(json.dumps(state,indent=2)+"\n")
def locate(name):
 matches=[x for x in bpy.data.images if name.lower() in x.name.lower() and x.size[0]>0 and x.size[1]>0]
 return matches[0] if matches else None
def texture_copy(source,short,out):
 if source is None:raise ValueError("Original source image unavailable: "+short)
 from bpy import path
 raw=Path(path.abspath(source.filepath,library=source.library))
 if not raw.is_file():raise ValueError("Source texture path is not a file: "+short)
 dest=TEXDIR/(short+".png")
 with Image.open(raw) as image:
  rgb=image.convert("RGBA")
  dimensions=list(rgb.size)
  rgb.thumbnail((2048,2048),Image.Resampling.LANCZOS)
  rgb.save(dest,"PNG",optimize=True)
 new=bpy.data.images.load(str(dest.resolve()),check_existing=False)
 new.name="EinarLicensedPBR_"+short
 return new,{"source":source.name,"source_path":str(raw),"original_size":dimensions,
             "runtime_size":list(rgb.size),"runtime_png_bytes":dest.stat().st_size,
             "sha256":hashlib.sha256(dest.read_bytes()).hexdigest()}
def principled(name,tex=None,rough=.48,metal=0.0,transmission=0.0,ior=1.45,alpha=1.0):
 m=bpy.data.materials.new("BlankV5_"+name);m.use_nodes=True
 nodes=m.node_tree.nodes;nodes.clear()
 output=nodes.new("ShaderNodeOutputMaterial")
 shader=nodes.new("ShaderNodeBsdfPrincipled")
 shader.inputs["Roughness"].default_value=rough
 shader.inputs["Metallic"].default_value=metal
 shader.inputs["Transmission Weight"].default_value=transmission
 shader.inputs["IOR"].default_value=ior
 shader.inputs["Alpha"].default_value=alpha
 shader.inputs["Base Color"].default_value=(.63,.47,.38,1) if name=="skin" else (.72,.74,.76,1)
 if name=="cornea":shader.inputs["Base Color"].default_value=(1,1,1,1)
 if tex:
  t=nodes.new("ShaderNodeTexImage");t.image=tex;t.interpolation="Linear"
  m.node_tree.links.new(t.outputs["Color"],shader.inputs["Base Color"])
 m.node_tree.links.new(shader.outputs["BSDF"],output.inputs["Surface"])
 return m
def main():
 report={"schema":"blank.hero-v5.einar-threejs-static-pbr.v1","source_zip_sha256":ZIP_SHA,
  "credit":CREDIT,"status":"starting","source_immutable":True,"glb_created":False,
  "static_only":True,"blink_exported":False,"hair_curves_exported":False,"film_shaders_transferred":False,
  "human_photorealism_approved":False,"real_android_performance_verified":False,
  "objects":[],"runtime_textures":{}}
 save(report)
 try:
  bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
  report["status"]="source_loaded";save(report)
  skin=locate("einar_skin.albedo");eye=locate("eyes.albedo")
  for key,im in [("skin",skin),("eye",eye)]:
   if not im:raise RuntimeError("Einar original "+key+" albedo missing")
   loaded,details=texture_copy(im,key,TEXDIR)
   report["runtime_textures"][key]=details
   if key=="skin":skinimg=loaded
   else:eyeimg=loaded
  mats={"head":principled("skin",skinimg,rough=.57),
    "eye":principled("eye",eyeimg,rough=.23),
    "cornea":principled("cornea",rough=.07,transmission=.93,ior=1.38),
    "tear":principled("tearline",rough=.15,transmission=.60,ior=1.33),
    "eyelash":principled("eyelashes",rough=.67)}
  deps=bpy.context.evaluated_depsgraph_get()
  clones=[]
  for name in MESH_NAMES:
   o=bpy.data.objects.get(name)
   if o is None:
    report.setdefault("missing_optional_meshes",[]).append(name)
    if name in {"GEO-einar_head","GEO-eye.L","GEO-eye.R"}:raise ValueError("Essential mesh absent "+name)
    continue
   if o.type!="MESH":
    report.setdefault("unsupported_source_types",[]).append({name:o.type});continue
   evaluated=o.evaluated_get(deps)
   try:mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
   except Exception as e:
    report.setdefault("fallback_unevaluated_meshes",[]).append({name:type(e).__name__})
    mesh=o.data.copy()
   obj=bpy.data.objects.new("BlankV5_"+name,mesh)
   bpy.context.scene.collection.objects.link(obj)
   obj.matrix_world=o.matrix_world.copy()
   if "cornea" in name.lower():mat=mats["cornea"]
   elif "meniscus" in name.lower() or "plica" in name.lower():mat=mats["tear"]
   elif "eyelash" in name.lower():mat=mats["eyelash"]
   elif name=="GEO-einar_head":mat=mats["head"]
   else:mat=mats["eye"]
   mesh.materials.clear();mesh.materials.append(mat)
   for poly in mesh.polygons:poly.material_index=0
   clone={"source":name,"runtime":obj.name,"polygons":len(mesh.polygons),
          "vertices":len(mesh.vertices),"uv_layers":len(mesh.uv_layers),
          "source_shape_keys":[k.name for k in o.data.shape_keys.key_blocks if "blink" in k.name.lower()][:16] if o.data.shape_keys else []}
   if clone["uv_layers"]<1 and mat in (mats["head"],mats["eye"]):
    raise ValueError("Critical head/eye mesh has no UV layer: "+name)
   clones.append(obj);report["objects"].append(clone)
   report["status"]="copied_"+str(len(clones));save(report)
  if len(clones)<7:raise ValueError("Insufficient selected human eye parts")
  for old in list(bpy.context.selected_objects):old.select_set(False)
  for obj in clones:obj.hide_set(False);obj.hide_render=False;obj.select_set(True)
  bpy.context.view_layer.objects.active=clones[0]
  target=OUT/"einar-static-pbr.glb"
  report["status"]="exporting_gltf";save(report)
  bpy.ops.export_scene.gltf(filepath=str(target.resolve()),export_format="GLB",use_selection=True,
   export_yup=True,export_materials="EXPORT",export_image_format="AUTO",
   export_texcoords=True,export_normals=True,export_skins=False,export_animations=False,
   export_morph=False,export_apply=False,export_cameras=False,export_lights=False)
  report["status"]="glb_generated";report["glb_created"]=True
  report["glb_bytes"]=target.stat().st_size
  report["glb_sha256"]=hashlib.sha256(target.read_bytes()).hexdigest()
  report["triangle_count"]=sum(o["polygons"] for o in report["objects"])
  report["limitations"]=["STATIC evaluated source character copy: animation and blinking NOT exported",
   "Film Cycles shader graph simplified to source-licensed albedo plus standard PBR roughness/transmission",
   "Skin/eye albedo downsampled to 2048 max dimension for first Chrome proof",
   "No hair curves simulation; eyelashes retained only if polygon mesh",
   "No runtime skin SSS guarantee, Android performance or human visual acceptance"]
  save(report)
  print("EINAR_V5_STATIC_REAL_GLTF_EXPORT",json.dumps({"bytes":report["glb_bytes"],
    "sha256":report["glb_sha256"],"meshes":len(clones),"triangles":report["triangle_count"],
    "textures":report["runtime_textures"]}),flush=True)
  # GLB and audit are fully written; Blender's production rig scene previously
  # hung >6 min solely during bpy interpreter shutdown AFTER export. Avoid this
  # bounded-CI stall; no original source data or render state needs saving.
  sys.stdout.flush();sys.stderr.flush();os._exit(0)
 except Exception as ex:
  report["status"]="BLOCKED_EXPORT";report["error"]=type(ex).__name__+": "+str(ex)[:600]
  save(report);traceback.print_exc();raise
if __name__=="__main__":main()
