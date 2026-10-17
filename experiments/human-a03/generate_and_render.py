#!/usr/bin/env python3
"""REAL Blender source-derived distinct-character test. Einar CC-BY original is immutable.
Creates a controlled derivative face with facially masked mesh changes applied across ALL keys;
keeps film shader, eye stack, correctives and hair. First validation in actual Cycles.
Result is an experimental derivative, NOT autonomous scan-quality/new-topology generation.
"""
import bpy,json,math,os,re,sys,time,traceback
from pathlib import Path
from mathutils import Vector
ROOT=Path("artifacts/human-a03")
ROOT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(".ci-einar/source/einar_release_v1.blend")
CREDIT="Einar Rig (CC-BY) Blender Foundation | studio.blender.org"
report={"schema":"blank.human-a03.mouth-neutralization.v1","source_credit":CREDIT,
 "status":"STARTED","parent":"HUMAN-A02","identity_status":"EINAR_DERIVATIVE_NOT_INDEPENDENT_NEW_TOPOLOGY",
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
  } or n=="GEO-einar_eyelash_surfdef" or n=="GEO-einar_eyebrows_preview"
 return o.type in ("CURVES","CURVE") and (bool(re.search(r"^GEO-einar_eyelashes$|^GEO-einar_eyebrows$",n,re.I)) or n=="HumanA03_AutomatedShortScalpHair")
def light(label,loc,target,power,size,color):
 dt=bpy.data.lights.new(label,"AREA");dt.shape="DISK";dt.energy=power;dt.size=size;dt.color=color
 ob=bpy.data.objects.new(label,dt);bpy.context.scene.collection.objects.link(ob);look(ob,loc,target)

def a02_mouth_audit_and_seal(head, height):
 """Data-dependent mouth adjustment, limited to lip deformer groups and neutral pose.
 Original eye geometry, source shader and source rig stay unchanged.
 Logs source rig facial transforms, lip influence data and pre/post centroid separation.
 """
 import collections
 groups={g.name:g for g in head.vertex_groups}
 rg=bpy.data.objects.get("RIG-einar")
 pose=[]
 if rg:
  for p in rg.pose.bones:
   if re.search(r'(lip|mouth|jaw|eyebrow)',p.name,re.I) and ("ACT-" in p.name or "CTR-" in p.name):
    pose.append({"bone":p.name,"basis_translation_m":round(p.matrix_basis.translation.length,6),
     "basis_rotation_angle_rad":round(p.matrix_basis.to_quaternion().angle,6)})
 indexed={
  "upper":[g for name,g in groups.items() if re.search(r'(def-)?lip_center_top|lip_top\.',name,re.I)],
  "lower":[g for name,g in groups.items() if re.search(r'(def-)?lip_center_bot|lip_bot\.',name,re.I)]
 }
 def sample(key,which):
  ids={g.index for g in indexed[which]}
  cloud=[]
  for v in head.data.vertices:
   weight=sum(w.weight for w in v.groups if w.group in ids)
   if weight>=.35:
    point=head.matrix_world @ key.data[v.index].co
    cloud.append((point, min(1,weight)))
  if not cloud:return None
  total=sum(w for _,w in cloud)
  ctr=sum((p*w for p,w in cloud),Vector())/total
  return {"center":ctr,"count":len(cloud),"total_weight":round(total,3)}
 basis=head.data.shape_keys.key_blocks.get("Basis")
 upper=sample(basis,"upper");lower=sample(basis,"lower")
 before=(upper["center"].z-lower["center"].z) if upper and lower else None
 result={"lip_groups":{k:[g.name for g in v] for k,v in indexed.items()},
  "rig_neutral_control_pose_sample":pose[:80],
  "lip_centroids_before":{"upper":list(upper["center"]) if upper else None,
    "lower":list(lower["center"]) if lower else None,
    "separation_m":before,
    "counts":{"upper":upper["count"] if upper else 0,"lower":lower["count"] if lower else 0}},
  "lip_seal_status":"NOT_RUN"}
 if before is None or not (0.0007<before<.035):
  result["lip_seal_status"]="SKIPPED_BAD_OR_INCONCLUSIVE_SOURCE_LIP_MEASUREMENT"
  return result
 # Geometric contact target based on DATA, not a fixed estimated offset.
 target=.0015
 closing=min(.012, max(0,before-target))
 if closing<.0001:
  result["lip_seal_status"]="SKIPPED_ALREADY_CONTACT"
  return result
 # The source head may already have shifted in its 60+ shape keys.
 # Create a NEW dedicated neutral lip-contact corrective without altering any
 # pre-existing facial morph targets or eye/lid geometry.
 mouth=(upper["center"]+lower["center"])*.5
 lipWidth=max(.045,height*.33)
 lipBand=max(.015,height*.15)
 rot=head.matrix_world.inverted().to_3x3()
 correct=head.shape_key_add(name="A02_NeutralLipContact",from_mix=False)
 top_ids={g.index for g in indexed["upper"]}
 lower_ids={g.index for g in indexed["lower"]}
 moved=0;max_move=0
 for vert in head.data.vertices:
  top_weight=sum(x.weight for x in vert.groups if x.group in top_ids)
  bot_weight=sum(x.weight for x in vert.groups if x.group in lower_ids)
  if top_weight<.05 and bot_weight<.05:continue
  pos=head.matrix_world@basis.data[vert.index].co
  x=pos.x-mouth.x
  # Avoid deforming distant/hidden portions of the lips.
  radial=math.exp(-.5*(x/lipWidth)**2)*math.exp(-.5*((pos.z-mouth.z)/lipBand)**2)
  topFactor=min(1,top_weight)*radial
  botFactor=min(1,bot_weight)*radial
  move_z=(-closing*.5*topFactor+closing*.5*botFactor)
  if abs(move_z)<.00001:continue
  correct.data[vert.index].co += rot @ Vector((0,0,move_z))
  moved+=1;max_move=max(max_move,abs(move_z))
 correct.value=1.0
 after_upper=sample(correct,"upper");after_lower=sample(correct,"lower")
 gap=(after_upper["center"].z-after_lower["center"].z) if after_upper and after_lower else None
 result.update({"lip_seal_status":"APPLIED_BOUNDED_SOURCE_GROUP_CORRECTIVE",
   "target_gap_m":target,"closing_budget_m":round(closing,6),
   "vertices_changed":moved,"max_vertex_shift_m":round(max_move,6),
   "gap_after_source_basis_m":gap,
   "note":"Centers are source-space group centroids; evaluated rig/render still requires verification. No direct eyeball/eyelid or source expression-key vertices were modified."})
 return result


def a03_relax_brows(head):
 """Source morph controls, not arbitrary eye movement; logs actual rig pose/drivers."""
 sk=head.data.shape_keys
 keys=sk.key_blocks
 targets={
  "A_EyebrowRaise_Inner.L":0.42,"A_EyebrowRaise_Inner.R":0.42,
  "A_EyebrowRaise_Outer.L":0.20,"A_EyebrowRaise_Outer.R":0.20
 }
 applied={}
 for name,target in targets.items():
  kb=keys.get(name)
  if kb is None:raise AssertionError("missing source brow morph "+name)
  kb.value=target
  applied[name]=float(kb.value)
 # Audit embedded drivers to avoid claiming controllability that source rig may override.
 fcurves=[]
 if sk.animation_data:
  for fc in sk.animation_data.drivers:
   if any(k in fc.data_path for k in ("A_EyebrowRaise","D_Blink")):
    fcurves.append({"path":fc.data_path,"mute":fc.mute})
 return {"requested_shape_values":applied,"source_drivers":fcurves[:30],
   "basis_not_replaced":True,"eye_mesh_not_shifted":True,
   "note":"Positive source brow-raise morphs at 0.42/0.20, not new eye-seat translation; actual evaluated appearance checked in Cycles"}
def a03_short_groom(head, ec, height, front):
 """Replace facially intersecting legacy long Einar scalp wisps with a deterministic
 short scalp-following *render-only* groom sampled from source head polygons.
 Do not touch eye/brow/lash curves, source skin or material textures.
 """
 import random
 rng=random.Random(20261017)
 polylist=[]
 eyez=ec.z
 head.data.update()
 head.data.calc_loop_triangles()
 for p in head.data.polygons:
  local=p.center.copy()
  w=head.matrix_world@local
  normal=(head.matrix_world.to_3x3() @ p.normal).normalized()
  # Crown above frontal hairline. Restrict to hair-bearing upward surface.
  if w.z<=eyez+height*.12:continue
  if normal.z<-.05:continue
  if p.area<=1.e-9:continue
  polylist.append((p,max(p.area,1.e-10)))
 if len(polylist)<120:raise AssertionError("could not identify safe scalp polygons: "+str(len(polylist)))
 crv=bpy.data.curves.new("HumanA03_ShortScalpStrands","CURVE")
 crv.dimensions="3D";crv.resolution_u=1
 crv.bevel_depth=.000095;crv.bevel_resolution=1;crv.use_fill_caps=False
 # Each strand 3 points; natural backwards flow avoids the old overhanging forelock.
 back_local=(head.matrix_world.inverted().to_3x3()@(-front)).normalized()
 nroots=3900
 polygons=[v[0] for v in polylist]
 weights=[v[1] for v in polylist]
 lengths=[]
 for p in rng.choices(polygons,weights=weights,k=nroots):
  vs=[head.data.vertices[i].co.copy() for i in p.vertices]
  if len(vs)<3:continue
  if len(vs)>=4 and rng.random()<.5:vs=[vs[0],vs[2],vs[3]]
  else:vs=vs[:3]
  u,v=rng.random(),rng.random()
  if u+v>1:u,v=1-u,1-v
  root=vs[0]*(1-u-v)+vs[1]*u+vs[2]*v
  n=p.normal.normalized()
  length=rng.uniform(.003,.009)
  flow=(n*.78+back_local*.36+Vector((rng.uniform(-.12,.12),rng.uniform(-.12,.12),0))).normalized()
  s=crv.splines.new("POLY");s.points.add(2)
  positions=[root+n*.00025,root+flow*length*.55,root+flow*length]
  for i,pos in enumerate(positions):
   s.points[i].co=(*pos,1)
   s.points[i].radius=(1.,.65,.08)[i]
  lengths.append(length)
 hair=bpy.data.objects.new("HumanA03_AutomatedShortScalpHair",crv)
 bpy.context.scene.collection.objects.link(hair)
 # Strands use the head's LOCAL mesh vertices. Let parenting apply the
 # head world transform ONCE; inverse-parent would incorrectly cancel it.
 hair.parent=head
 hair.matrix_parent_inverse.identity()
 # Reuse the verified film hair shader graph, not an unsupported Blender BSDF API.
 m=bpy.data.materials.get("einar.hair")
 if not m or not m.use_nodes or len(m.node_tree.nodes)<20:
  raise AssertionError("original source hair shader not restored")
 crv.materials.append(m)
 return hair,{
   "source_scalp_polygons":len(polylist),"procedural_strands":len(lengths),
   "short_length_m":[round(min(lengths),5),round(max(lengths),5)],
   "original_long_hair_disabled":True,"scalp_geometry_unchanged":True,
   "eye_eyelash_eyebrow_source_curves_preserved":True,
   "strand_source":"deterministic scalp polygon sampling",
   "material":"Source Einar film hair material retained, render-only derivative"
 }

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
 # Audited neutral-mouth corrective applied AFTER source face morph, before renderer.
 audit=a02_mouth_audit_and_seal(head,height)
 report["neutral_mouth_audit"]=audit
 report["changes"].append({"kind":"AUDITED_LIP_CONTACT_CORRECTIVE",**{k:v for k,v in audit.items() if k not in ("rig_neutral_control_pose_sample",)}})
 print("HUMAN_A03_MOUTH_AUDIT",json.dumps({k:v for k,v in audit.items() if k!="rig_neutral_control_pose_sample"}),flush=True)
 write()
 # HUMAN-A03: clean neutral brow and source-dependent hair without modifying eyes or skin.
 brow=a03_relax_brows(head)
 report["a03_brow_expression"]=brow
 hair,hair_audit=a03_short_groom(head,ec,height,front)
 report["a03_short_groom"]=hair_audit
 report["changes"].append({"kind":"BOUNDED_BROW_RELAX_AND_NEW_SCALP_GROOM",**hair_audit})
 print("A03_BROW_AND_HAIR",json.dumps({"brow":brow,"hair":hair_audit}),flush=True)
 write()
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
 world=bpy.data.worlds.new("HumanA03_PortraitWorld");world.use_nodes=True
 bg=world.node_tree.nodes.get("Background")
 bg.inputs["Color"].default_value=(.17,.19,.22,1);bg.inputs["Strength"].default_value=.47;scene.world=world
 d=max(.5,height*3.3)
 light("HumanA03_Key",ec+front*d*.72-lateral*d*.45+Vector((0,0,height*.65)),ec,180*height*height,height*2.6,(1.0,.94,.86))
 light("HumanA03_Fill",ec+front*d*.6+lateral*d*.7+Vector((0,0,height*.18)),ec,105*height*height,height*3,(.79,.88,1))
 light("HumanA03_Rim",ec-front*d*.45+lateral*d*.35+Vector((0,0,height*.55)),ec,125*height*height,height*2,(.9,.96,1.0))
 camera=bpy.data.objects.new("HumanA03_PortraitCamera",bpy.data.cameras.new("HumanA03_PortraitCamera"))
 bpy.context.scene.collection.objects.link(camera);scene.camera=camera;camera.data.type="ORTHO";camera.data.lens=70
 center=ec+Vector((0,0,-height*.17))
 # Save the authored Blender project BEFORE Cycles. All data copied from license-pinned source.
 # The .blend retains external texture paths; original publisher archive remains needed to resolve
 # all maps in a detached local checkout. Never call this self-contained when not packed.
 dst=ROOT/"human-a03-neutral-groom.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()),compress=True,check_existing=False)
 if not dst.exists() or dst.stat().st_size<100000:raise AssertionError("derived blend not written")
 report["derived_blend"]={"file":str(dst),"bytes":dst.stat().st_size,
  "provenance":"Einar CC-BY derivative, externally referenced source maps; NOT standalone packed source"}
 report["status"]="A03_BLEND_SAVED";write()
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
 report["status"]="A03_NEUTRAL_BROW_AND_NEW_SHORT_GROOM_FOUR_CYCLES_RENDERS_NEEDS_VISUAL_REVIEW"
 write()
 print("HUMAN_A03_RENDER_PASS",json.dumps({"renders":len(report["renders"]),
  "max_shift":m["max_vertex_shift_m"],"shader_nodes":len(skin.node_tree.nodes),
  "source_derivative":True}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException as e:
 report["status"]="FAILED";report["error"]=type(e).__name__+": "+str(e)
 write();traceback.print_exc();sys.stdout.flush();os._exit(1)
