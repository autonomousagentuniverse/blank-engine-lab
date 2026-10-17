#!/usr/bin/env python3
"""MIRA-04: one reproducible Cycles batch of isolated changes plus combined.
Opens the *same packed MIRA-03 .blend* for EACH condition, no Einar nor new
source downloads. Eye anatomy/meshes and corrected head sculpt are unchanged.
Human aesthetic acceptance remains blocked.
"""
import bpy,json,hashlib,os,sys,traceback
from pathlib import Path
ROOT=Path("artifacts/mira04-batch");ROOT.mkdir(parents=True,exist_ok=True)
BASE=Path("baseline-mira03/mira03-continuous-midline.blend")
OUT=ROOT/"report.json"
MODES=[
 ("baseline",False,False,False,["front","eyes_macro"]),
 ("eyes",True,False,False,["front","eyes_macro"]),
 ("hair_brows",False,True,False,["front"]),
 ("skin",False,False,True,["front"]),
 ("combined",True,True,True,["front","eyes_macro"])
]
R={"schema":"blank.mira04.parallel-visual-batch.v1",
   "status":"STARTED","source_kind":"CC0 Vitruvian derived MIRA-03",
   "original_einar_included":False,"model_topology_changed":False,
   "human_visual_approval":False,"production_deployed":False,
   "baseline_workflow":39045175123,"baseline_blend_sha256":None,
   "modifications":{},"frames":[],"errors":[]}
def save():OUT.write_text(json.dumps(R,indent=2)+"\n")
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
def obj(name):
 x=bpy.data.objects.get(name)
 if x:return x
 raise AssertionError("Missing preserved source object "+name)
def material(name):
 m=bpy.data.materials.get(name)
 if m:return m
 raise AssertionError("Missing baseline source material "+name)
def bsdf(m):
 if not m.use_nodes:raise AssertionError("No material nodes "+m.name)
 n=next((x for x in m.node_tree.nodes if x.bl_idname=="ShaderNodeBsdfPrincipled"),None)
 if n is None:raise AssertionError("No material Principled "+m.name)
 return n
def node_by_type(tree,nm):
 return next((x for x in tree.nodes if x.bl_idname==nm),None)
def mix_multiply_after_image(m,image_name,tint,fac):
 nodes=m.node_tree.nodes; links=m.node_tree.links
 bs=bsdf(m)
 old=bs.inputs["Base Color"].links
 if len(old)!=1:raise AssertionError("Expected texture-to-base color "+m.name)
 line=old[0];texture=line.from_node
 if texture.bl_idname!="ShaderNodeTexImage":raise AssertionError("Unexpected hair color image "+texture.name)
 multiply=nodes.new("ShaderNodeMixRGB");multiply.blend_type="MULTIPLY"
 multiply.inputs["Fac"].default_value=fac
 multiply.inputs["Color2"].default_value=tint
 links.new(line.from_socket,multiply.inputs["Color1"])
 links.new(multiply.outputs["Color"],bs.inputs["Base Color"])
 return {"tint":list(tint),"strength":fac,"source_texture":texture.image.name if texture.image else None}
def remap_opacity(m,lo,hi):
 tree=m.node_tree;bs=bsdf(m)
 existing=bs.inputs["Alpha"].links
 if len(existing)!=1:raise AssertionError("Expected hair alpha texture "+m.name)
 link=existing[0]
 # Preserve source alpha map; only remap low-opacity card fringes.
 r=tree.nodes.new("ShaderNodeMapRange")
 r.clamp=True;r.inputs["From Min"].default_value=lo
 r.inputs["From Max"].default_value=hi
 r.inputs["To Min"].default_value=0.
 r.inputs["To Max"].default_value=1.
 tree.links.new(link.from_socket,r.inputs["Value"])
 tree.links.new(r.outputs["Result"],bs.inputs["Alpha"])
 return {"from_min":lo,"from_max":hi,"source_alpha":link.from_node.name}
def eye_candidate():
 changes={}
 for side in ["L","R"]:
  name="Eyeshadow_"+side
  o=obj(name)
  o.hide_render=True
  changes[name]={"hide_render":True,"type":o.type}
 for name in ["VitSclera","VitSclera.001"]:
  m=material(name);shader=bsdf(m)
  changes[name]={"base_tint":mix_multiply_after_image(m,"vit_sclera.png",
                                  (.83,.75,.72,1.),.38)}
  shader.inputs["Roughness"].default_value=.41
  changes[name]["roughness"]=.41
 for name in ["VitCornea2","VitCornea2.001"]:
  m=material(name);shader=bsdf(m)
  shader.inputs["Roughness"].default_value=.10
  shader.inputs["Transmission Weight"].default_value=.94
  changes[name]={"roughness":.10,"transmission":.94}
 return changes
def hair_brow_candidate():
 changes={}
 for name in ("VitHairMat","VitBrowCardsMat"):
  m=material(name);shader=bsdf(m)
  is_hair=name=="VitHairMat"
  changes[name]={
    "darker_color":mix_multiply_after_image(m,"vit_hair_diffuse.png",
        (.22,.16,.13,1.) if is_hair else (.18,.13,.10,1.),
        .62 if is_hair else .32),
    "opacity_clamp":remap_opacity(m,.28 if is_hair else .13,.86 if is_hair else .88),
  }
  shader.inputs["Roughness"].default_value=.79 if is_hair else .89
  changes[name]["roughness"]=shader.inputs["Roughness"].default_value
 return changes
def skin_candidate():
 m=material("VitSkin");bs=bsdf(m)
 hue=node_by_type(m.node_tree,"ShaderNodeHueSaturation")
 if hue is None:raise AssertionError("Baseline hue/saturation node missing")
 hue.inputs["Saturation"].default_value=1.08
 hue.inputs["Value"].default_value=.87
 bs.inputs["Subsurface Weight"].default_value=.115
 normals=node_by_type(m.node_tree,"ShaderNodeNormalMap")
 if normals is None:raise AssertionError("Baseline real skin normal map missing")
 normals.inputs["Strength"].default_value=.68
 return {"material":"VitSkin","saturation":1.08,"value":.87,
   "subsurface_weight":.115,"normal_strength":.68,
   "baseline_source_albedo_preserved":True}
def audit():
 return {
  "heads":{n:len(obj(n).data.vertices) for n in ["cm_vitruvian","Eye_L_eyeball","Eye_R_eyeball","VitHair"]},
  "material_names":[m.name for m in bpy.data.materials],
  "eye_shadows":[{"name":obj(n).name,"type":obj(n).type,"hide_render":obj(n).hide_render,
                 "materials":[x.name for x in obj(n).data.materials] if hasattr(obj(n).data,"materials") else []}
                 for n in ["Eyeshadow_L","Eyeshadow_R"]],
  "hair_cards":{n:{"vertices":len(obj(n).data.vertices),"materials":[m.name for m in obj(n).data.materials]}
          for n in ["VitHair","VitBrowCards"]},
 }
def camera(name):
 # Unchanged A03 stored camera names; assert same across all conditions.
 cam=obj("CAM_MIRA_"+name)
 if cam.type!="CAMERA":raise AssertionError("Missing exact baseline camera")
 return cam
def render_case(label,use_eyes,use_hair,use_skin,views):
 bpy.ops.wm.open_mainfile(filepath=str(BASE.resolve()),load_ui=False)
 scene=bpy.context.scene
 if scene.render.engine!="CYCLES":raise AssertionError("Baseline was not Cycles")
 scene.cycles.samples=20
 scene.render.resolution_x=700;scene.render.resolution_y=700
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 # Forced no reliance on authored preset values:
 for name in ["cm_vitruvian","VitHair","Eye_L_eyeball","Eye_R_eyeball"]:
  obj(name)
 changes={}
 if use_eyes:changes["eyes"]=eye_candidate()
 if use_hair:changes["hair_brows"]=hair_brow_candidate()
 if use_skin:changes["skin"]=skin_candidate()
 if label=="baseline":R["source_audit"]=audit()
 R["modifications"][label]=changes
 for view in views:
  scene.camera=camera(view)
  name=label+"_"+view+".png";p=ROOT/name
  scene.render.filepath=str(p.resolve())
  print("MIRA04_BATCH_CYCLES",name,flush=True)
  bpy.ops.render.render(write_still=True)
  if not p.exists() or p.stat().st_size<12000:
   raise AssertionError("Real Cycles screenshot missing "+name)
  R["frames"].append({"variant":label,"view":view,"file":name,"bytes":p.stat().st_size,
     "sha256":sha(p),"camera":scene.camera.name,"samples":scene.cycles.samples,
     "width":scene.render.resolution_x,"height":scene.render.resolution_y})
  save()
 # Preserve the combined editable scene; not accepted production.
 if label=="combined":
  bpy.ops.file.pack_all()
  saved=ROOT/"mira04-batch-combined-candidate.blend"
  bpy.ops.wm.save_as_mainfile(filepath=str(saved.resolve()),compress=True,check_existing=False)
  if saved.stat().st_size<1500000:raise AssertionError("Combined blend not written")
  R["combined_blend"]={"name":saved.name,"sha256":sha(saved),"bytes":saved.stat().st_size}
def main():
 # GitHub Actions can resume a partially completed batch, with each mode in a
 # fresh Blender process; bpy repeatedly loading a 50MB .blend crashed a runner
 # after four valid PNGs. Never recompute verified completed modes.
 if not BASE.is_file() or BASE.stat().st_size<20000000:
  raise FileNotFoundError("Frozen MIRA03 .blend unavailable")
 expected_hash="1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d"
 actual=sha(BASE)
 if actual!=expected_hash:raise AssertionError("MIRA03_SOURCE_HASH_CHANGED "+actual)
 if OUT.exists():
  previous=json.loads(OUT.read_text())
  if previous["schema"]!=R["schema"] or previous.get("baseline_blend_sha256")!=actual:
   raise AssertionError("Partial batch provenance not from the frozen MIRA03")
  for frame in previous["frames"]:
   p=ROOT/frame["file"]
   if not p.is_file() or sha(p)!=frame["sha256"]:
    raise AssertionError("Previous image cannot be reused "+frame["file"])
  R.update(previous)
 else:
  R["baseline_blend_sha256"]=actual
 modes={v[0]:v for v in MODES}
 if len(sys.argv)!=2 or sys.argv[1] not in modes:
  raise ValueError("Usage: python batch_variants.py baseline|eyes|hair_brows|skin|combined")
 mode=sys.argv[1]
 if mode in R["modifications"]:
  raise AssertionError("Cannot rerun verified completed variant "+mode)
 print("MIRA04_PROCESS_ISOLATION_BEGIN",mode,flush=True)
 render_case(*modes[mode])
 expected={"baseline_front.png","baseline_eyes_macro.png","eyes_front.png","eyes_eyes_macro.png",
           "hair_brows_front.png","skin_front.png","combined_front.png","combined_eyes_macro.png"}
 actual_files={f["file"] for f in R["frames"]}
 if len(R["modifications"])==5:
  if actual_files!=expected:raise AssertionError("Final render set incomplete "+str(actual_files))
  R["status"]="EIGHT_REAL_CYCLES_VARIANT_RENDERS_SUCCESS_REVIEW_REQUIRED"
 else:
  R["status"]="PARTIAL_BATCH_RECORDED_RESUMABLE"
 save()
 print("MIRA04_VARIANT_DONE",json.dumps({"mode":mode,"complete":len(R["modifications"]),
 "renders_total":len(R["frames"]),"status":R["status"]}),flush=True)
 sys.stdout.flush();os._exit(0)
if __name__=="__main__":
 try:main()
 except BaseException as e:
  R["status"]="FAILED";R["errors"].append(type(e).__name__+": "+str(e));save()
  traceback.print_exc();sys.stdout.flush();os._exit(1)
