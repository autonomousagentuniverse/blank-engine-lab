#!/usr/bin/env python3
"""REAL Blender source-derived distinct-character test. Einar CC-BY original is immutable.
Creates a controlled derivative face with facially masked mesh changes applied across ALL keys;
keeps film shader, eye stack, correctives and hair. First validation in actual Cycles.
Result is an experimental derivative, NOT autonomous scan-quality/new-topology generation.
"""
import bpy,json,math,os,re,sys,time,traceback
from pathlib import Path
from mathutils import Vector
ROOT=Path("artifacts/human-a01")
ROOT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(".ci-einar/source/einar_release_v1.blend")
CREDIT="Einar Rig (CC-BY) Blender Foundation | studio.blender.org"
report={"schema":"blank.human-a01.source-derivative.v1","source_credit":CREDIT,
 "status":"STARTED","identity_status":"EINAR_DERIVATIVE_NOT_INDEPENDENT_NEW_TOPOLOGY",
 "source_original_unchanged":True,"human_visual_approval":"BLOCKED",
 "webgl_verified":False,"renders":[],"changes":[]}
def write():
 (ROOT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
def bbox(o):
 q=[o.matrix_world@Vector(c) for c in o.bound_box]
 return Vector([min(p[i] for p in q) for i in range(3)]),Vector([max(p[i] for p in q) for i in range(3)])
def center(o):a,b=bbox(o);return (a+b)/2
def look(o,pos,aim):
 o.location=pos;o.rotation_euler=(aim-pos).to_track_quat('-Z','Y').to_euler()
def gauss(v,s):return math.exp(-0.5*(v/s)**2)
def base_morph(head,left,right):
 lo,hi=bbox(head);height=hi.z-lo.z
 if not .15<height<1.8:raise AssertionError("unexpected head height "+str(height))
 ec=(center(left)+center(right))*.5
 front=ec-(lo+hi)*.5;front.z=0
 if front.length<.005:raise AssertionError("ambiguous facial orientation")
 front.normalize()
 lateral=center(right)-center(left);lateral.z=0
 lateral=(lateral-front*lateral.dot(front)).normalized()
 front_inv=head.matrix_world.inverted().to_3x3()
 key=head.data.shape_keys
 if not key or len(key.key_blocks)<40:raise AssertionError("source facial shape keys unavailable")
 neutral=key.key_blocks.get("Basis")
 if not neutral or len(neutral.data)!=len(head.data.vertices):raise AssertionError("invalid shape key basis")
 original=[(head.matrix_world@v.co).copy() for v in neutral.data]
 eL=center(left);eR=center(right)
 shift=[]
 # Morph strength near the soft tissue of central and lower face; preserve orbit/lids.
 for w in original:
  rel=w-ec;x=rel.dot(lateral);z=rel.z/height;f=rel.dot(front)
  frontmask=max(0,min(1,(f+height*.27)/(height*.32)))
  orbital=min(math.sqrt(((w-eL).dot(lateral)/height)**2+((w.z-eL.z)/height)**2),
              math.sqrt(((w-eR).dot(lateral)/height)**2+((w.z-eR.z)/height)**2))
  protect=1-gauss(orbital,.11)
  tissue=frontmask*protect
  # deliberate identity change: broad midface, narrower lower jaw, longer tapered chin.
  cheek=.050*height*gauss(z+.23,.18)*gauss(abs(x)/height-.23,.18)
  jaw=-.085*height*gauss(z+.61,.18)*gauss(abs(x)/height-.22,.16)
  nose_front=-.039*height*gauss(z+.24,.16)*gauss(x/height,.075)
  chin_drop=-.055*height*gauss(z+.77,.15)*gauss(x/height,.23)
  chin_front=.021*height*gauss(z+.67,.17)*gauss(x/height,.14)
  # More prominent cheekbones / altered brow-to-nose line, but do not translate eyes.
  cheek_front=.021*height*gauss(z+.28,.15)*gauss(abs(x)/height-.19,.10)
  dx=tissue*(cheek+jaw)*(1 if x>=0 else -1)
  dz=tissue*chin_drop
  df=tissue*(nose_front+chin_front+cheek_front)
  dw=lateral*dx+front*df+Vector((0,0,dz))
  shift.append(front_inv@dw)
 # Transform every morph basis identically so original facial animation deltas survive.
 before={}
 for label in ("D_Blink_Upper.L","D_Blink_Lower.L","A_JawOpen"):
  b=key.key_blocks.get(label)
  if b:before[label]=[(b.data[i].co-neutral.data[i].co).length for i in (0,min(40,len(shift)-1))]
 for kb in key.key_blocks:
  for i,d in enumerate(shift):kb.data[i].co+=d
 head.data.update()
 for label,arr in before.items():
  b=key.key_blocks[label]
  after=[(b.data[i].co-neutral.data[i].co).length for i in (0,min(40,len(shift)-1))]
  if any(abs(a-v)>1e-4 for a,v in zip(arr,after)):raise AssertionError("expression delta lost "+label)
 displacements=sorted(v.length for v in shift)
 maxshift=displacements[-1]
 if not .008<maxshift<.1:raise AssertionError("morph displacement implausible "+str(maxshift))
 return {"head_height_m":round(height,5),"vertex_count":len(shift),
   "shape_keys_preserved":len(key.key_blocks),"max_vertex_shift_m":round(maxshift,5),
   "median_vertex_shift_m":round(displacements[len(displacements)//2],6),
   "face_front":[round(v,4) for v in front],
   "lateral":[round(v,4) for v in lateral],
   "eye_centers":[list(eL),list(eR)]},front,lateral,ec,height
def keep(o):
 n=o.name
 if o.type=="MESH":
  return n=="GEO-einar_head" or n in {
   "Eye_Sphere.L","Eye_Sphere.R","GEO-eye.L","GEO-eye.R",
   "GEO-eye.cornea.L","GEO-eye.cornea.R",
   "GEO-eye.meniscus.L","GEO-eye.meniscus.R",
   "GEO-eye.plica_semilunaris.L","GEO-eye.plica_semilunaris.R"
  } or bool(re.search(r"eyelash|eyebrows_preview|^GEO-einar_hair",n,re.I))
 return o.type in ("CURVES","CURVE") and bool(re.search(r"hair|eyelash|eyebrow",n,re.I))
def light(label,loc,target,power,size,color):
 dt=bpy.data.lights.new(label,"AREA");dt.shape="DISK";dt.energy=power;dt.size=size;dt.color=color
 ob=bpy.data.objects.new(label,dt);bpy.context.scene.collection.objects.link(ob);look(ob,loc,target)
def main():
 write()
 if not SOURCE.is_file():raise FileNotFoundError(SOURCE)
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
 head=bpy.data.objects.get("GEO-einar_head")
 le=bpy.data.objects.get("GEO-eye.L");reye=bpy.data.objects.get("GEO-eye.R")
 if not head or not le or not reye:raise AssertionError("No source face/eyes")
 for im in bpy.data.images:
  if im.source in ("FILE","TILED"):
   try:im.reload()
   except Exception:pass
 for name in ("einar_skin.albedo","eyes.albedo"):
  imgs=[im for im in bpy.data.images if name in im.name.lower()]
  if not imgs or not any(im.size[0]>0 for im in imgs):raise AssertionError("missing source texture "+name)
 head.data=head.data.copy()
 # Shape-key mesh isolation: no mutation of original on-disk .blend.
 m,front,lateral,ec,height=base_morph(head,le,reye)
 report["changes"].append({"kind":"SOURCE_DERIVATIVE_FACIAL_SCULPT",
  "description":"Broad cheekbones, narrowed lower jaw, longer tapered chin, remodeled nose profile; fixed source lid orbit; 60 source shape keys retained",
  **m})
 # Convert tired frowning source face to a neutral expression where possible.
 if head.data.shape_keys:
  for key in head.data.shape_keys.key_blocks:
   if key.name!="Basis":key.value=0.0
 # Preserve original shader network; adjust only a small amount of photo albedo using source image node.
 skin=bpy.data.materials.get("einar.skin")
 if not skin or not skin.use_nodes or len(skin.node_tree.nodes)<250:raise AssertionError("film skin shader missing")
 skin=skin.copy();head.data.materials.clear();head.data.materials.append(skin)
 report["changes"].append({"kind":"SHADER_PRESERVATION",
  "nodes":len(skin.node_tree.nodes),"links":len(skin.node_tree.links),
  "summary":"Kept actual film skin shader graph intact and retained original skin maps"})
 # Film source contains several blood/prosthetic props; they are not part of new neutral human.
 visible=[o for o in bpy.data.objects if keep(o)]
 for o in bpy.data.objects:
  if o.type in ("MESH","CURVE","CURVES","VOLUME","FONT","POINTCLOUD"):
   o.hide_render=o not in visible
 for o in bpy.data.objects:
  if o.type=="LIGHT":o.hide_render=True
 scene=bpy.context.scene
 scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=18
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG";scene.render.film_transparent=False
 scene.render.threads_mode="FIXED";scene.render.threads=4
 try:scene.view_layers[0].cycles.use_denoising=True
 except Exception:pass
 try:scene.view_settings.view_transform="AgX"
 except Exception:pass
 world=bpy.data.worlds.new("HumanA01_PortraitWorld");world.use_nodes=True
 bg=world.node_tree.nodes.get("Background")
 bg.inputs["Color"].default_value=(.17,.19,.22,1);bg.inputs["Strength"].default_value=.47;scene.world=world
 d=max(.5,height*3.3)
 light("HumanA01_Key",ec+front*d*.72-lateral*d*.45+Vector((0,0,height*.65)),ec,180*height*height,height*2.6,(1.0,.94,.86))
 light("HumanA01_Fill",ec+front*d*.6+lateral*d*.7+Vector((0,0,height*.18)),ec,105*height*height,height*3,(.79,.88,1))
 light("HumanA01_Rim",ec-front*d*.45+lateral*d*.35+Vector((0,0,height*.55)),ec,125*height*height,height*2,(.9,.96,1.0))
 camera=bpy.data.objects.new("HumanA01_PortraitCamera",bpy.data.cameras.new("HumanA01_PortraitCamera"))
 bpy.context.scene.collection.objects.link(camera);scene.camera=camera;camera.data.type="ORTHO";camera.data.lens=70
 center=ec+Vector((0,0,-height*.17))
 # Save the authored Blender project BEFORE Cycles. All data copied from license-pinned source.
 # The .blend retains external texture paths; original publisher archive remains needed to resolve
 # all maps in a detached local checkout. Never call this self-contained when not packed.
 dst=ROOT/"human-a01-derived.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()),compress=True,check_existing=False)
 if not dst.exists() or dst.stat().st_size<100000:raise AssertionError("derived blend not written")
 report["derived_blend"]={"file":str(dst),"bytes":dst.stat().st_size,
  "provenance":"Einar CC-BY derivative, externally referenced source maps; NOT standalone packed source"}
 report["status"]="DERIVED_BLEND_SAVED";write()
 shots=[
 ("front",front,center,height*1.28),
 ("three_quarter",(front*.77+lateral*.64).normalized(),center,height*1.28),
 ("profile",lateral,center,height*1.28),
 ("eyes_macro",front,ec,height*.51)
 ]
 for label,direction,target,scale in shots:
  look(camera,target+direction*d,target)
  camera.data.ortho_scale=scale
  path=ROOT/(label+".png");scene.render.filepath=str(path.resolve())
  print("RENDER_HUMAN_A01",label,flush=True)
  bpy.ops.render.render(write_still=True)
  if not path.exists() or path.stat().st_size<7000:raise AssertionError("render file absent "+label)
  report["renders"].append({"view":label,"file":str(path),"size_bytes":path.stat().st_size,
     "source":"Blender Cycles real render","samples":18,"resolution":[700,700]})
  write()
 report["status"]="DERIVED_FACE_AND_FOUR_REAL_CYCLES_RENDERS_COMPLETED_AWAIT_VISUAL_REVIEW"
 write()
 print("HUMAN_A01_RENDER_PASS",json.dumps({"renders":len(report["renders"]),
  "max_shift":m["max_vertex_shift_m"],"shader_nodes":len(skin.node_tree.nodes),
  "source_derivative":True}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException as e:
 report["status"]="FAILED";report["error"]=type(e).__name__+": "+str(e)
 write();traceback.print_exc();sys.stdout.flush();os._exit(1)
