#!/usr/bin/env python3
"""One fresh, independently parameterized CC0-core MPFB human, not MIRA lineage.
Blender bpy 4.5.3 + pinned MPFB GPL source (not packaged in outputs).
All requested core bodyparts are REQUIRED, with no silent skipping.
Never claim photorealism; real photos determine evaluation questions, not identity.
"""
import bpy,os,sys,json,math,random,hashlib,traceback,importlib
from pathlib import Path
from mathutils import Vector
OUT=Path("artifacts/new-human-from-photos")
OUT.mkdir(parents=True,exist_ok=True)
ASSETS=Path("mpfb-assets")
UPSTREAM=Path("upstream-mpfb")
SEED=20261017
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
 return h.hexdigest()
def find(name):
 matches=list(ASSETS.rglob(name))
 if len(matches)!=1:raise RuntimeError("Source asset not unique or absent: "+name+", "+str(matches[:4]))
 return str(matches[0].resolve())
def setup_mpfb():
 import addon_utils
 path=(UPSTREAM/"src").resolve()
 sys.path.insert(0,str(path))
 # bpy stand-alone extension loading via local source repo.
 # addon_utils.enable makes the actual bpy context AddonPreferences available.
 try:
  import mpfb
  addon_utils.enable("mpfb",default_set=False,persistent=False)
  if "mpfb" not in bpy.context.preferences.addons:
   raise RuntimeError("Addon registration did not expose MPFB preferences")
 except Exception:
  # No hidden geometry fallback; exactly one source method must pass.
  print("MPFB_ADDON_FAILED",traceback.format_exc(),flush=True)
  raise
 from mpfb.services.humanservice import HumanService
 from mpfb.services.targetservice import TargetService
 from mpfb.entities.objectproperties import HumanObjectProperties
 return HumanService,TargetService,HumanObjectProperties

def camera_at(target,position,name,lens=62):
 cam_data=bpy.data.cameras.new(name)
 cam=bpy.data.objects.new(name,cam_data)
 bpy.context.scene.collection.objects.link(cam)
 cam.location=position
 cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
 cam_data.lens=lens
 cam_data.clip_start=.01;cam_data.clip_end=100
 return cam
def area(name,loc,power,size,color=(1,1,1)):
 data=bpy.data.lights.new(name,"AREA")
 obj=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(obj)
 obj.location=loc
 data.energy=power;data.shape="DISK";data.size=size;data.color=color
 obj.rotation_euler=(Vector((0,0,1.5))-obj.location).to_track_quat("-Z","Y").to_euler()
 return obj
def main():
 random.seed(SEED)
 ref=json.loads(Path("reference/photo-versus-mira-metrics.json").read_text())
 assert len(ref["reference_photographs"])==6
 assert ref["generator_photoreal_pass"] is False
 Human,Target,Props=setup_mpfb()
 bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
 macro=Target.get_default_macro_info_dict()
 # Deliberately synthetic fixed identity seed, not copied from any photo subject.
 macro.update({"gender":.87,"age":.48,"weight":.49,"muscle":.37,
               "height":.56,"proportions":.52})
 # Preserve the format of the upstream macro (race dictionary) without inferring
 # real-photo subject ethnicity; make no claim about an individual's ancestry.
 print("MPFB_MACROS",json.dumps(macro),flush=True)
 base=Human.create_human(macro_detail_dict=macro)
 assert base and base.type=="MESH" and len(base.data.vertices)>5000
 base.name="NEW_HUMAN_01_CC0_MakeHuman_Core"
 bpy.context.view_layer.objects.active=base
 base.select_set(True)
 print("MPFB_FRESH_BASE_GENERATED",len(base.data.vertices),flush=True)
 skin=find("young_caucasian_female.mhmat")
 Human.set_character_skin(skin,base,skin_type="ENHANCED_SSS")
 rig=Human.add_builtin_rig(base,"game_engine")
 assert rig and rig.type=="ARMATURE" and len(rig.data.bones)>20
 requested=[
    ("eyes","high-poly.mhclo","Eyes"),
    ("eyebrows","eyebrow001.mhclo","Eyebrows"),
    ("eyelashes","eyelashes01.mhclo","Eyelashes"),
    ("tongue","tongue01.mhclo","Tongue"),
    ("teeth","teeth_base.mhclo","Teeth"),
    ("hair","bob01.mhclo","Hair"),
    ("clothes","female_casualsuit01.mhclo","Clothes")]
 built={}
 for subdir,filename,atype in requested:
  path=find(filename)
  assert subdir in Path(path).parts,(subdir,path)
  before=set(bpy.data.objects.keys())
  piece=Human.add_mhclo_asset(path,base,asset_type=atype,material_type="GAMEENGINE")
  new=list(set(bpy.data.objects.keys())-before)
  if not piece and not new:raise RuntimeError("Failed to add bodypart "+atype)
  built[atype]={"source_file":filename,"source_sha256":sha(Path(path)),
                "created_objects":new}
  print("MPFB_BODY_PART",atype,new,flush=True)
 # Fail if any core face element missing. No silent substitution to MIRA or Einar.
 assert all(key in built for key in ["Eyes","Eyebrows","Eyelashes","Hair","Teeth","Tongue","Clothes"])
 assert len(bpy.data.objects)>8
 zs=[(base.matrix_world@v.co).z for v in base.data.vertices]
 top=max(zs)
 target=Vector((0,0,top-.19))
 # Four viewpoints include both front orientations; only one is anatomically frontal
 # and will be selected later by visual evidence, not by invented inference.
 cams=[
   ("face_neg_y",camera_at(target,(0,-1.18,top-.15),"CAM_FaceNegativeY",76)),
   ("face_pos_y",camera_at(target,(0,1.18,top-.15),"CAM_FacePositiveY",76)),
   ("three_quarter",camera_at(target,(.63,-1.12,top-.14),"CAM_ThreeQuarter",75)),
   ("full_body",camera_at((0,0,top*.51),(0,-4.1,top*.52),"CAM_FullBody",40))]
 area("Soft_key",(-1.1,-2,2.6),560,2.2)
 area("Soft_fill",(1.2,-1.5,1.8),270,1.7)
 area("Edge_rim",(.9,1.1,2.8),400,1.4)
 scene=bpy.context.scene
 scene.render.engine="CYCLES"
 scene.cycles.samples=28
 scene.cycles.device="CPU"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=640;scene.render.resolution_y=640
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 scene.world.color=(.2,.2,.2)
 scene.render.film_transparent=False
 images=[]
 for name,cam in cams:
  scene.camera=cam
  fp=OUT/(name+".png")
  scene.render.filepath=str(fp.resolve())
  print("NEW_HUMAN_CYCLES",name,flush=True)
  bpy.ops.render.render(write_still=True)
  assert fp.stat().st_size>10000,"No true image: "+name
  images.append({"view":name,"file":fp.name,"sha256":sha(fp),"bytes":fp.stat().st_size})
 # Ensure all external textures to be editable in one saved Blender file.
 bpy.ops.file.pack_all()
 blend=OUT/"new_human_cc0_pilot.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()),compress=True,check_existing=False)
 assert blend.stat().st_size>300000
 result={"schema":"blank.real-photos.new-human-pilot.v1","seed":SEED,
  "generator":"MakeHumanCommunity MPFB, CC0 core assets; GPL code used but never redistributed",
  "lineage":"Original independent MPFB basemesh, NOT MIRA05, Einar or another named person",
  "core_asset_rights":"CC0 system asset pack, MakeHuman Community; verify originals for production",
  "photo_measurement_input_sha256":sha(Path("reference/photo-versus-mira-metrics.json")),
  "new_human_source":True,"macro_parameters":macro,
  "body_mesh_vertices":len(base.data.vertices),"rig_bones":len(rig.data.bones),
  "bodyparts":built,"original_source_face_reconstruction":False,
  "cycles_images":images,
  "blend_sha256":sha(blend),"blend_bytes":blend.stat().st_size,
  "mira_fallback_used":False,
  "photorealism_approved":False,"release_allowed":False,
  "status":"ONE_PASS_TECHNICAL_CANDIDATE_VISUAL_REVIEW_REQUIRED",
  "limitations":["MPFB baseline hair is mesh asset, not real photo-derived fiber clump/groom system",
       "Skin and eyes are asset-derived, not measured same-identity 3D scans",
       "Camera orientation must be established visually",
       "Generated skin shader, eyelashes and iris may not pass photo-level realism",
       "This is a complete synthetic person with new parameters, not face copied from real photo"]}
 (OUT/"report.json").write_text(json.dumps(result,indent=2,default=str)+"\n")
 print("NEW_COMPLETE_HUMAN_DONE",json.dumps({"blend":result["blend_sha256"],"bones":result["rig_bones"],"images":len(images)}),flush=True)
 sys.stdout.flush();os._exit(0)

if __name__=="__main__":
 try:main()
 except BaseException:
  (OUT/"failure.txt").write_text(traceback.format_exc())
  traceback.print_exc();sys.stdout.flush();os._exit(1)
