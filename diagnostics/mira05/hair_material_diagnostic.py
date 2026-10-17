#!/usr/bin/env python3
"""MIRA05 unchanged-geometry hair material diagnostic: one Blender run per mode."""
import bpy,sys,json,hashlib,os,traceback
from pathlib import Path
P=Path("artifacts/mira05-material-diagnostic");P.mkdir(parents=True,exist_ok=True)
F=Path("baseline-mira05/mira05-integrated-structural.blend")
EXPECTED="07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076"
MODES=("source_hair_bsdf","magenta_binding_probe","dark_emission","dark_principled")
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
def get():
 file=P/"report.json"
 if file.exists():
  d=json.loads(file.read_text())
  if d["source_sha256"]!=EXPECTED:raise RuntimeError("Source mismatch from prior data")
  for x in d["renders"]:
   if sha(P/x["file"])!=x["sha256"]:raise RuntimeError("Corrupted render evidence")
  return d
 return {"schema":"blank.mira05.hair-material-a-b.v1","source_sha256":EXPECTED,
         "modes_expected":list(MODES),"renders":[],"scene_is_original":True,
         "photorealism_approved":False}
def save(d):(P/"report.json").write_text(json.dumps(d,indent=2,default=str)+"\n")
def audit():
 out={}
 for name in ("MIRA05_ActualScalpFibers","MIRA05_IndividualBrowStrands","VitHair","VitBrowCards"):
  o=bpy.data.objects.get(name)
  if not o:raise RuntimeError("Missing geometry "+name)
  out[name]={"type":o.type,"hide_render":o.hide_render,
    "materials":[m.name for m in o.data.materials],
    "curve_count":len(o.data.splines) if o.type=="CURVE" else None,
    "bevel_depth":o.data.bevel_depth if o.type=="CURVE" else None}
 for name in ("MIRA05_PigmentedHair","MIRA05_BrowFibers"):
  m=bpy.data.materials.get(name)
  if not m:raise RuntimeError("Missing material "+name)
  nodes=[]
  for n in m.node_tree.nodes:
   record={"type":n.bl_idname,"name":n.name}
   if n.bl_idname=="ShaderNodeBsdfHairPrincipled":
    record["parametrization"]=n.parametrization
    record["color"]=list(n.inputs["Color"].default_value) if n.inputs.get("Color") else None
    record["roughness"]=n.inputs["Roughness"].default_value if n.inputs.get("Roughness") else None
   nodes.append(record)
  out[name]={"nodes":nodes,"links":[[l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name] for l in m.node_tree.links]}
 return out
def material(mode):
 m=bpy.data.materials.new("DIAG_"+mode);m.use_nodes=True
 tree=m.node_tree;tree.nodes.clear()
 output=tree.nodes.new("ShaderNodeOutputMaterial")
 if mode in ("magenta_binding_probe","dark_emission"):
  n=tree.nodes.new("ShaderNodeEmission")
  n.inputs["Color"].default_value=(1,0,.55,1) if mode=="magenta_binding_probe" else (.09,.045,.025,1)
  n.inputs["Strength"].default_value=1
  tree.links.new(n.outputs["Emission"],output.inputs["Surface"])
 else:
  n=tree.nodes.new("ShaderNodeBsdfPrincipled")
  n.inputs["Base Color"].default_value=(.09,.045,.025,1)
  n.inputs["Roughness"].default_value=.80
  tree.links.new(n.outputs["BSDF"],output.inputs["Surface"])
 return m
def main():
 if len(sys.argv)!=2 or sys.argv[1] not in MODES:raise RuntimeError("Single mode required")
 mode=sys.argv[1]
 if not F.exists() or sha(F)!=EXPECTED:raise RuntimeError("Frozen .blend hash invalid")
 d=get()
 if mode in {x["mode"] for x in d["renders"]}:raise RuntimeError("Mode rendered already "+mode)
 bpy.ops.wm.open_mainfile(filepath=str(F.resolve()),load_ui=False)
 if mode=="source_hair_bsdf":d["original_material_inventory"]=audit()
 else:
  m=material(mode)
  for objname in ("MIRA05_ActualScalpFibers","MIRA05_IndividualBrowStrands"):
   o=bpy.data.objects[objname];o.data.materials.clear();o.data.materials.append(m)
 scene=bpy.context.scene;scene.render.engine="CYCLES"
 scene.cycles.samples=12;scene.cycles.device="CPU"
 scene.render.resolution_x=500;scene.render.resolution_y=500
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.camera=bpy.data.objects["CAM_MIRA_front"]
 file=P/(mode+".png");scene.render.filepath=str(file.resolve())
 print("MIRA05_FORENSIC_CYCLES",mode,flush=True)
 bpy.ops.render.render(write_still=True)
 if file.stat().st_size<12000:raise RuntimeError("Missing genuine Cycles render")
 d["renders"].append({"mode":mode,"file":file.name,"sha256":sha(file),"bytes":file.stat().st_size})
 if len(d["renders"])==4:d["status"]="FOUR_MATERIAL_TESTS_COMPLETE_NEEDS_IMAGE_ANALYSIS"
 else:d["status"]="PARTIAL_MATERIAL_TESTS"
 save(d);print("DIAGNOSTIC_COMPLETED",mode,d["status"],flush=True);sys.stdout.flush();os._exit(0)
try:main()
except BaseException as e:
 traceback.print_exc();sys.stdout.flush();os._exit(1)
