#!/usr/bin/env python3
"""One fresh, independently parameterized CC0-core MPFB human, not MIRA lineage.
Blender bpy 4.5.3 + pinned MPFB GPL source (not packaged in outputs).
All requested core bodyparts are REQUIRED, with no silent skipping.
Never claim photorealism; real photos determine evaluation questions, not identity.
"""
import bpy,os,sys,json,math,random,hashlib,traceback,importlib
from pathlib import Path
from mathutils import Vector
OUT=Path("artifacts/dark-afro-woman")
OUT.mkdir(parents=True,exist_ok=True)
ASSETS=Path("mpfb-assets")
UPSTREAM=Path("upstream-mpfb")
SEED=20261018
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
 import importlib,zipfile
 # MPFB 2.x is a Blender 4.2+ EXTENSION, not a legacy Python addon. Build an
 # ephemeral extension package from the pinned exact upstream source tree.
 # Never write the GPL zip to the archived artifact directory.
 source=(UPSTREAM/"src"/"mpfb").resolve()
 assert (source/"blender_manifest.toml").exists()
 temp=Path(".ci-mpfb");temp.mkdir(parents=True,exist_ok=True)
 archive=(temp/"mpfb-pinned-extension.zip").resolve()
 with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for p in source.rglob('*'):
   if p.is_file() and "__pycache__" not in p.parts:
    z.write(p,str(p.relative_to(source)))
 print("MPFB_EXTENSION_ARCHIVE_READY",archive.stat().st_size,flush=True)
 result=bpy.ops.extensions.package_install_files(
    filepath=str(archive),repo="user_default",enable_on_install=True)
 print("MPFB_EXTENSION_INSTALL",result,flush=True)
 assert 'FINISHED' in result,result
 package="bl_ext.user_default.mpfb"
 assert package in bpy.context.preferences.addons,(
  "Pinned MPFB extension not enabled: "+str(list(bpy.context.preferences.addons)))
 # Source assets are a separately CC0 pack; tell extension where extracted files are.
 roots=list(ASSETS.rglob("young_caucasian_female.mhmat"))
 assert len(roots)==1,roots
 skin_path=roots[0].resolve()
 # Find the nearest user data root that contains data/skins or skins.
 # MPFB AssetService may use this preference to resolve relative assets.
 pref=bpy.context.preferences.addons[package].preferences
 if hasattr(pref,"mpfb_user_data"):
  candidate=skin_path.parent.parent
  if candidate.name=="data":candidate=candidate.parent
  pref.mpfb_user_data=str(candidate)
  print("MPFB_ASSET_ROOT_PREFERENCE",pref.mpfb_user_data,flush=True)
 HumanService=importlib.import_module(package+".services.humanservice").HumanService
 TargetService=importlib.import_module(package+".services.targetservice").TargetService
 ObjectProperties=importlib.import_module(package+".entities.objectproperties").HumanObjectProperties
 print("MPFB_VERSIONED_EXTENSION_REGISTERED",package,flush=True)
 return HumanService,TargetService,ObjectProperties

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

def make_deep_skin_material(base):
 """Original dark-brown melanin appearance, with spatial roughness & subtle skin normal.
 This is a procedural prototype, not physically calibrated from a 2D photograph.
 """
 mat=bpy.data.materials.new("Dark_Brown_Skin_Microstructure")
 mat.use_nodes=True
 nt=mat.node_tree;nt.nodes.clear()
 out=nt.nodes.new("ShaderNodeOutputMaterial");out.location=(550,80)
 bsdf=nt.nodes.new("ShaderNodeBsdfPrincipled");bsdf.location=(290,80)
 bsdf.inputs["Roughness"].default_value=.46
 bsdf.inputs["Subsurface Weight"].default_value=.11
 bsdf.inputs["Metallic"].default_value=0
 noise=nt.nodes.new("ShaderNodeTexNoise");noise.location=(-550,130)
 noise.inputs["Scale"].default_value=41
 noise.inputs["Detail"].default_value=3.1
 noise.inputs["Roughness"].default_value=.67
 ramp=nt.nodes.new("ShaderNodeValToRGB");ramp.location=(-250,250)
 ramp.color_ramp.elements[0].position=.23
 ramp.color_ramp.elements[0].color=(.095,.027,.017,1)
 ramp.color_ramp.elements[1].position=.79
 ramp.color_ramp.elements[1].color=(.165,.066,.044,1)
 nt.links.new(noise.outputs["Fac"],ramp.inputs["Fac"])
 nt.links.new(ramp.outputs["Color"],bsdf.inputs["Base Color"])
 micro=nt.nodes.new("ShaderNodeTexNoise");micro.location=(-520,-200)
 micro.inputs["Scale"].default_value=285
 micro.inputs["Detail"].default_value=2.8
 bump=nt.nodes.new("ShaderNodeBump");bump.location=(0,-110)
 bump.inputs["Strength"].default_value=.17
 bump.inputs["Distance"].default_value=.00017
 nt.links.new(micro.outputs["Fac"],bump.inputs["Height"])
 nt.links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
 nt.links.new(bsdf.outputs["BSDF"],out.inputs["Surface"])
 assert len(base.data.materials)>0
 # On original basemesh, skin/material is the first material assignment.
 base.data.materials[0]=mat
 return mat

def build_natural_afro(base,rig,seed=88281):
 """Generate a genuine three-dimensional dense, kinky hairstyle as Blender curves.
 Hair geometry is rooted in the generated character's cranial volume, not a reference person's scalp.
 """
 rng=random.Random(seed)
 coords=[base.matrix_world@v.co for v in base.data.vertices]
 top=max(v.z for v in coords)
 head=[v for v in coords if v.z>top-.20]
 cx=sum(v.x for v in head)/len(head)
 cy=sum(v.y for v in head)/len(head)
 center=Vector((cx,cy,top-.125))
 xmax=max(abs(v.x-cx) for v in head)
 ymax=max(abs(v.y-cy) for v in head)
 rx=min(.108,max(.08,xmax*.92))
 ry=min(.107,max(.08,ymax*.90))
 rz=.123
 # Three overlapping eumelanin shades for less regular silhouette.
 palettes=[(.008,.007,.008,1),(.017,.015,.016,1),(.027,.024,.025,1)]
 objs=[]
 total=0
 for layer,color in enumerate(palettes):
  hair=bpy.data.curves.new("Individual_Afro_Coils_%d"%layer,type="CURVE")
  hair.dimensions="3D"
  hair.resolution_u=3
  hair.bevel_depth=[.00050,.00041,.00030][layer]
  hair.bevel_resolution=1
  hair.use_fill_caps=False
  material=bpy.data.materials.new("Afro_Natural_Shade_%d"%layer)
  material.diffuse_color=color
  material.use_nodes=True
  b=material.node_tree.nodes.get("Principled BSDF")
  b.inputs["Base Color"].default_value=color
  b.inputs["Roughness"].default_value=.8
  hair.materials.append(material)
  count=[1850,1500,1100][layer]
  for k in range(count):
   phi=rng.uniform(0,2*math.pi)
   # Shell starts near crown and extends over all sides to create a rounded afro.
   # Excludes roots low on face so eyes and eyebrows remain visible.
   cosTheta=rng.uniform(-.09,.999)
   sint=math.sqrt(max(0,1-cosTheta*cosTheta))
   radial=Vector((sint*math.cos(phi),sint*math.sin(phi),cosTheta))
   root=center+Vector((rx*radial.x,ry*radial.y,rz*radial.z))
   radial.normalize()
   # Longer fibers above/side crown, shorter at fringe near forehead.
   growth=rng.uniform(.078,.175)
   growth*=.91+.09*max(0,cosTheta)
   if radial.y<-.4 and root.z<top-.10:growth*=.71
   tangent=radial.cross(Vector((0,0,1)))
   if tangent.length<.10:tangent=radial.cross(Vector((0,1,0)))
   tangent.normalize()
   bitangent=radial.cross(tangent).normalized()
   phase=rng.uniform(-math.pi,math.pi)
   twist=rng.uniform(6.8,12.2)*math.pi
   amp=rng.uniform(.004,.009)
   sp=hair.splines.new("NURBS")
   n=20
   sp.points.add(n-1)
   sp.order_u=4;sp.use_endpoint_u=True
   for j in range(n):
    t=j/(n-1)
    # A dense, kinked, coherent curl follows its own local outward growth.
    p=root+radial*(t*growth)
    p+=tangent*(amp*math.sin(phase+t*twist)*min(1,3*t))
    p+=bitangent*(amp*math.cos(phase+t*twist)*min(1,3*t))
    # Organic variation in tip direction instead of uniformly descending hair.
    p+=Vector((math.sin(phi*5+phase)*.005,math.cos(phi*4-phase)*.005,0))*t*t
    sp.points[j].co=(p.x,p.y,p.z,1)
   total+=1
  obj=bpy.data.objects.new("Natural_Afro_Coils_%d"%layer,hair)
  bpy.context.scene.collection.objects.link(obj)
  # All strands are kept as editable geometry and attached to the character's rig.
  head_bone=next((b for b in rig.data.bones if b.name.lower()=="head"),None)
  if head_bone:
   before=obj.matrix_world.copy()
   obj.parent=rig;obj.parent_type="BONE";obj.parent_bone=head_bone.name
   obj.matrix_world=before
  objs.append(obj)
 print("PROCEDURAL_AFRO_BUILT",total,"curves",round(rx,4),round(ry,4),flush=True)
 assert total==4450
 return objs,total

def main():
 random.seed(SEED)
 ref=json.loads(Path("reference/photo-versus-mira-metrics.json").read_text())
 assert len(ref["reference_photographs"])==6
 assert ref["generator_photoreal_pass"] is False
 Human,Target,Props=setup_mpfb()
 bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
 macro=Target.get_default_macro_info_dict()
 # Deliberately synthetic fixed identity seed, not copied from any photo subject.
 macro.update({"gender":1.0,"age":.47,"weight":.54,"muscle":.42,
               "height":.52,"proportions":.51,
               "race":{"african":1.0,"asian":0.0,"caucasian":0.0}})
 # Preserve the format of the upstream macro (race dictionary) without inferring
 # real-photo subject ethnicity; make no claim about an individual's ancestry.
 print("MPFB_MACROS",json.dumps(macro),flush=True)
 base=Human.create_human(macro_detail_dict=macro)
 assert base and base.type=="MESH" and len(base.data.vertices)>5000
 base.name="AFRO_WOMAN_28_Medium_Build"
 bpy.context.view_layer.objects.active=base
 base.select_set(True)
 print("MPFB_FRESH_BASE_GENERATED",len(base.data.vertices),flush=True)
 skin=find("young_caucasian_female.mhmat")
 Human.set_character_skin(skin,base,skin_type="ENHANCED_SSS")
 darkskin=make_deep_skin_material(base)
 rig=Human.add_builtin_rig(base,"game_engine")
 assert rig and rig.type=="ARMATURE" and len(rig.data.bones)>20
 requested=[
    ("eyes","high-poly.mhclo","Eyes"),
    ("eyebrows","eyebrow001.mhclo","Eyebrows"),
    ("eyelashes","eyelashes01.mhclo","Eyelashes"),
    ("tongue","tongue01.mhclo","Tongue"),
    ("teeth","teeth_base.mhclo","Teeth"),
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
 afro_objs,hair_count=build_natural_afro(base,rig)
 built["Hair"]={"source_file":"PROCEDURAL_SCALP_CURL_CURVES","created_objects":[o.name for o in afro_objs],"strand_count":hair_count}
 # Fail if any core face element missing. No silent substitution to MIRA or Einar.
 assert all(key in built for key in ["Eyes","Eyebrows","Eyelashes","Hair","Teeth","Tongue","Clothes"])
 assert len(bpy.data.objects)>8
 zs=[(base.matrix_world@v.co).z for v in base.data.vertices]
 top=max(zs)
 target=Vector((0,0,top-.19))
 # Four viewpoints include both front orientations; only one is anatomically frontal
 # and will be selected later by visual evidence, not by invented inference.
 cams=[
   ("full_body_front",camera_at((0,0,top*.52),(0,-2.75,top*.53),"CAM_FullBodyFront",69)),
   ("full_body_three_quarter",camera_at((0,0,top*.52),(.88,-2.80,top*.56),"CAM_FullBodyThreeQuarter",69)),
   ("face_front",camera_at(target,(0,-1.16,top-.15),"CAM_FaceFront",70)),
   ("face_three_quarter",camera_at(target,(.43,-1.17,top-.12),"CAM_FaceThreeQuarter",70))]
 area("Soft_key",(-1.1,-2,2.6),560,2.2)
 area("Soft_fill",(1.2,-1.5,1.8),270,1.7)
 area("Edge_rim",(.9,1.1,2.8),400,1.4)
 scene=bpy.context.scene
 scene.render.engine="CYCLES"
 scene.cycles.samples=42
 scene.cycles.device="CPU"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=768;scene.render.resolution_y=1024
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
 blend=OUT/"afro_woman_full_body.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()),compress=True,check_existing=False)
 assert blend.stat().st_size>300000
 result={"schema":"blank.real-photos.new-human-pilot.v1","seed":SEED,
  "generator":"MakeHumanCommunity MPFB, CC0 core assets; GPL code used but never redistributed",
  "lineage":"New synthetic MPFB geometry with user-defined afro & dark-skin material; no old character reuse",
  "core_asset_rights":"MakeHuman Community CC0 core asset pack; custom procedural hair and dark skin in Blender",
  "photo_measurement_input_sha256":sha(Path("reference/photo-versus-mira-metrics.json")),
  "new_human_source":True,"macro_parameters":macro,
  "body_mesh_vertices":len(base.data.vertices),"rig_bones":len(rig.data.bones),"afro_strand_count":hair_count,"user_description":"full body Black woman around 28 medium build deep brown skin natural afro hair",
  "bodyparts":built,"original_source_face_reconstruction":False,
  "cycles_images":images,
  "blend_sha256":sha(blend),"blend_bytes":blend.stat().st_size,
  "mira_fallback_used":False,
  "photorealism_approved":False,"release_allowed":False,
  "status":"CUSTOM_DESCRIPTION_BLENDER_RENDER_REQUIRES_VISUAL_REVIEW",
  "limitations":["Original procedural afro consists of editable curled NURBS strands rooted to a fitted ellipsoid, not photogrammetry",
       "Skin and eyes are asset-derived, not measured same-identity 3D scans",
       "Camera orientation must be established visually",
       "Generated skin shader, eyelashes and iris may not pass photo-level realism",
       "This is a complete synthetic person with new parameters, not face copied from real photo"]}
 (OUT/"report.json").write_text(json.dumps(result,indent=2,default=str)+"\n")
 print("CUSTOM_AFRO_WOMAN_BLENDER_DONE",json.dumps({"blend":result["blend_sha256"],"bones":result["rig_bones"],"images":len(images)}),flush=True)
 sys.stdout.flush();os._exit(0)

if __name__=="__main__":
 try:main()
 except BaseException:
  (OUT/"failure.txt").write_text(traceback.format_exc())
  traceback.print_exc();sys.stdout.flush();os._exit(1)
