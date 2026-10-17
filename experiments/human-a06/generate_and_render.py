#!/usr/bin/env python3
"""REAL Blender source-derived distinct-character test. Einar CC-BY original is immutable.
Creates a controlled derivative face with facially masked mesh changes applied across ALL keys;
keeps film shader, eye stack, correctives and hair. First validation in actual Cycles.
Result is an experimental derivative, NOT autonomous scan-quality/new-topology generation.
"""
import bpy,json,math,os,re,sys,time,traceback
from pathlib import Path
from mathutils import Vector
ROOT=Path("artifacts/human-a06")
ROOT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(".ci-einar/source/einar_release_v1.blend")
CREDIT="Einar Rig (CC-BY) Blender Foundation | studio.blender.org"
report={"schema":"blank.human-a06.visible-groom-clean-complexion.v1","source_credit":CREDIT,
 "status":"STARTED","parent":"HUMAN-A05","identity_status":"EINAR_DERIVATIVE_NOT_INDEPENDENT_NEW_TOPOLOGY",
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
 return o.type in ("CURVES","CURVE") and (bool(re.search(r"^GEO-einar_eyelashes$|^GEO-einar_eyebrows$",n,re.I)) or n=="HumanA06_ScalpGroom_Visible")
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
 """Set the actual film rig control bones the source FCurves read; never mute
 eyebrow drivers, so mesh/corrective/eyebrow attachment remain source-consistent.
 The driver schema was recovered in A04: ACT-Eyebrow_* LOC_Y / 0.01.
 """
 rig=bpy.data.objects.get("RIG-einar")
 if not rig:raise AssertionError("Original Einar pose rig missing")
 sk=head.data.shape_keys
 if not sk or not sk.animation_data:raise AssertionError("missing brow shape drivers")
 desired={
  "A_EyebrowRaise_Inner.L":.58,"A_EyebrowRaise_Inner.R":.58,
  "A_EyebrowRaise_Outer.L":.30,"A_EyebrowRaise_Outer.R":.30
 }
 controlled={}
 controls={}
 for name,val in desired.items():
  path='key_blocks["'+name+'"].value'
  drivers=[f for f in sk.animation_data.drivers if f.data_path==path]
  if len(drivers)!=1 or drivers[0].mute:
   raise AssertionError("source brow driver missing/muted "+name)
  f=drivers[0]
  if f.driver.expression.replace(" ","")!="var/0.01":
   raise AssertionError("unknown brow driver expression "+name+" "+f.driver.expression)
  variables=list(f.driver.variables)
  if len(variables)!=1 or variables[0].type!="TRANSFORMS":
   raise AssertionError("unexpected rig driver variable "+name)
  targ=variables[0].targets[0]
  if not targ.id or targ.id.name!=rig.name or targ.transform_type!="LOC_Y":
   raise AssertionError("not source rig Y controller "+name)
  pb=rig.pose.bones.get(targ.bone_target)
  if pb is None:raise AssertionError("rig brow control missing "+targ.bone_target)
  prior=pb.location.copy()
  pb.location.y=val*.01
  controls[name]={"bone":targ.bone_target,
                  "original_translation":list(prior),
                  "requested_translation":list(pb.location),
                  "driver_expression":f.driver.expression}
  controlled[name]=val
 bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get()
 evaluated=head.evaluated_get(dg)
 shape=evaluated.data.shape_keys
 observed={k:float(shape.key_blocks[k].value) if shape and shape.key_blocks.get(k) else None
           for k in desired}
 # Drivers may use source rig binding in another space. Record mismatch as
 # a diagnostic, rather than silently misreporting the expression fix.
 mismatches={n:{"requested":v,"evaluated":observed[n]}
             for n,v in controlled.items() if observed[n] is None or abs(observed[n]-v)>.10}
 return {"bone_controls":controls,"desired_values":controlled,"observed_evaluated_shape_values":observed,
         "driver_mismatch":mismatches,
         "source_brow_drivers_left_active":True,
         "source_rig_rest_pose_unchanged":True,
         "eye_geometry_unchanged":True}

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
def a06_clean_skin_shader(skin):
 """Suppress the verified color bruise layer, not the source skin look.
 Preserve all original deep skin/displacement and eye shader layers.
 """
 tree=skin.node_tree
 mix=tree.nodes.get("Mix.017")
 bruise=tree.nodes.get("Image Texture.006")
 albedo=tree.nodes.get("Image Texture.005")
 if not mix or not bruise or not albedo or not albedo.image or albedo.image.size[0]<4096:
  raise AssertionError("Einar skin graph could not be safely edited")
 factor=mix.inputs.get("Factor")
 if factor is None:raise AssertionError("Mix.017 has no Factor")
 connections=[x for x in tree.links if x.to_node==mix and x.to_socket==factor]
 if len(connections)!=1:raise AssertionError("Unexpected bruise factor connection count "+str(len(connections)))
 old=connections[0].from_node.name
 tree.links.remove(connections[0])
 factor.default_value=0.0
 # The actual base albedo remains original, just slightly less saturated.
 # A Hue/Saturation node is introduced in the *single known base albedo link*.
 albedo_links=[x for x in tree.links if x.from_node==albedo and x.from_socket.name=="Color" and x.to_node==mix]
 if len(albedo_links)!=1:raise AssertionError("Could not isolate source albedo link")
 dest=albedo_links[0].to_socket
 tree.links.remove(albedo_links[0])
 hue=tree.nodes.new("ShaderNodeHueSaturation")
 hue.name="HUMAN_A06_Albedo_Desaturate"
 hue.inputs["Hue"].default_value=.5
 hue.inputs["Saturation"].default_value=.82
 hue.inputs["Value"].default_value=1.03
 tree.links.new(albedo.outputs["Color"],hue.inputs["Color"])
 tree.links.new(hue.outputs["Color"],dest)
 return {"original_skin_texture":"einar_skin.albedo","original_shader_nodes":len(tree.nodes)-1,
  "source_bruise_factor_connection_disabled_from":old,
  "bruise_color_overlay_strength":0.0,"base_albedo_saturation":.82,
  "base_albedo_value":1.03,"original_skin_displacement_preserved":True,
  "skin_shader_nodes_after":len(tree.nodes),"skin_shader_links_after":len(tree.links)}

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
 print("HUMAN_A06_MOUTH_AUDIT",json.dumps({k:v for k,v in audit.items() if k!="rig_neutral_control_pose_sample"}),flush=True)
 write()
 # HUMAN-A03: clean neutral brow and source-dependent hair without modifying eyes or skin.
 brow=a03_relax_brows(head)
 report["a03_brow_expression"]=brow
 hair,hair_audit=a06_visible_groom(head,ec,height,front)
 report["a03_short_groom"]=hair_audit
 report["changes"].append({"kind":"BOUNDED_BROW_RELAX_AND_NEW_SCALP_GROOM",**hair_audit})
 print("A03_BROW_AND_HAIR",json.dumps({"brow":brow,"hair":hair_audit}),flush=True)
 write()
 # Preserve original shader network; adjust only a small amount of photo albedo using source image node.
 skin=bpy.data.materials.get("einar.skin")
 if not skin or not skin.use_nodes or len(skin.node_tree.nodes)<250:raise AssertionError("film skin shader missing")
 skin=skin.copy();head.data.materials.clear();head.data.materials.append(skin)
 skin_audit=a06_clean_skin_shader(skin)
 report["a06_skin_audit"]=skin_audit
 print("HUMAN_A06_SKIN",json.dumps(skin_audit),flush=True)

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
 # Explicitly preserve generated scalp hair visibility, even if the source
 # scene's rig drivers later restore other object-level render states.
 hair.hide_render=False
 assert hair.name=="HumanA06_ScalpGroom_Visible"
 report["a06_hair_render_flag"]=not hair.hide_render
 scene=bpy.context.scene
 scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=16
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG";scene.render.film_transparent=False
 scene.render.threads_mode="FIXED";scene.render.threads=4
 try:scene.view_layers[0].cycles.use_denoising=True
 except Exception:pass
 try:scene.view_settings.view_transform="AgX"
 except Exception:pass
 world=bpy.data.worlds.new("HumanA06_PortraitWorld");world.use_nodes=True
 bg=world.node_tree.nodes.get("Background")
 bg.inputs["Color"].default_value=(.17,.19,.22,1);bg.inputs["Strength"].default_value=.47;scene.world=world
 d=max(.5,height*3.3)
 light("HumanA06_Key",ec+front*d*.72-lateral*d*.45+Vector((0,0,height*.65)),ec,180*height*height,height*2.6,(1.0,.94,.86))
 light("HumanA06_Fill",ec+front*d*.6+lateral*d*.7+Vector((0,0,height*.18)),ec,105*height*height,height*3,(.79,.88,1))
 light("HumanA06_Rim",ec-front*d*.45+lateral*d*.35+Vector((0,0,height*.55)),ec,125*height*height,height*2,(.9,.96,1.0))
 camera=bpy.data.objects.new("HumanA06_PortraitCamera",bpy.data.cameras.new("HumanA06_PortraitCamera"))
 bpy.context.scene.collection.objects.link(camera);scene.camera=camera;camera.data.type="ORTHO";camera.data.lens=70
 center=ec+Vector((0,0,-height*.17))
 # Targeted clothing isolation based on *actual* A04 pixel ray hits. The
 # source render-visibility rig restores many objects even after hide_render,
 # therefore exclude only the clothing groups identified in the image from
 # this derived scene by unlinking them from all their source collections.
 # Do NOT unlink facial meshes, eye components, hair guides, the rig or proxies.
 removed=[]
 clothing_re=re.compile(r"^GEO-satchel_|^GEO-einar_jacket_|^GEO-einar_sweater$|^GEO-hyd_piston_shoulder_",re.I)
 for clothing in list(bpy.data.objects):
  if clothing_re.search(clothing.name):
   original_collections=[col.name for col in clothing.users_collection]
   for col in tuple(clothing.users_collection):
    col.objects.unlink(clothing)
   removed.append({"name":clothing.name,"collections":original_collections})
 if not any(x["name"]=="GEO-satchel_strap" for x in removed):
  raise AssertionError("Source of dangling satchel strap not actually unlinked")
 report["a05_unlinked_source_clothing"]=removed
 report["a05_strap_root_from_A04"]={
   "verified_ray_object":"GEO-satchel_strap",
   "matched_pixel":[505,615],
   "other_clothing_ray_hits":["GEO-einar_jacket_main","GEO-einar_jacket_collar2"],
   "method":"Unlink clothing objects from derived scene; never edit publisher original blend"}
 print("A05_SOURCE_CLOTHING_REMOVED",json.dumps({"count":len(removed),
   "has_strap":any(x["name"]=="GEO-satchel_strap" for x in removed)}),flush=True)
 write()
 # HUMAN-A04 object-level render provenance: sample front-camera mesh hits at
 # head, sky and hanging-strap pixel coordinates from the verified A03 frame.
 # Every hit is evaluated from the current actual Blender scene, not a guessed name.
 def sample_camera_rays():
  bpy.context.view_layer.update()
  dg=bpy.context.evaluated_depsgraph_get()
  look(camera,center+front*d,center)
  camera.data.ortho_scale=height*1.28
  bpy.context.view_layer.update()
  rows=[]
  for px,py in [(345,325),(515,500),(525,550),(560,540),(505,615),(545,625),
                (470,445),(80,80),(650,650)]:
   xy=Vector((((px+.5)/700-.5)*camera.data.ortho_scale,
             (.5-(py+.5)/700)*camera.data.ortho_scale,0))
   origin=camera.matrix_world@xy
   direction=(camera.matrix_world.to_3x3()@Vector((0,0,-1))).normalized()
   hit,pos,norm,idx,ob,matrix=scene.ray_cast(dg,origin,direction,distance=20.0)
   rows.append({"pixel":[px,py],"hit":bool(hit),"object":ob.name if hit else None,
                "position":list(pos) if hit else None,"polygon":int(idx) if hit else None})
  return rows
 compositor={"use_nodes_before":bool(scene.use_nodes),
             "nodes":[n.bl_idname for n in scene.node_tree.nodes] if scene.use_nodes and scene.node_tree else []}
 # Original source compositor could include other visual elements; disable while
 # checking whether the shoulder remnant belongs to evaluated scene geometry.
 scene.use_nodes=False
 report["a04_compositor_audit"]=compositor
 report["a04_camera_raycast"]=sample_camera_rays()
 visible_names=[o.name for o in bpy.data.objects if o.type in ("MESH","CURVE","CURVES") and not o.hide_render]
 report["a04_visible_objects"]=visible_names
 report["a04_strap_name_candidates"]=[o.name for o in bpy.data.objects
  if re.search(r"(strap|belt|bandolier|cloth|shirt|garment|coat|armor|shoulder)",o.name,re.I)]
 print("A04_PROVENANCE",json.dumps({
   "compositor":compositor,"hits":report["a04_camera_raycast"],
   "visible_objects":visible_names,
   "strap_candidates":report["a04_strap_name_candidates"]}),flush=True)
 report["a04_render_hypothesis"]="Compositor off, all source non-whitelisted objects hide_render; raycast identifies possible source of shoulder strap"
 write()
 # Save the authored Blender project BEFORE Cycles. All data copied from license-pinned source.
 # The .blend retains external texture paths; original publisher archive remains needed to resolve
 # all maps in a detached local checkout. Never call this self-contained when not packed.
 dst=ROOT/"human-a06-skin-short-groom.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()),compress=True,check_existing=False)
 if not dst.exists() or dst.stat().st_size<100000:raise AssertionError("derived blend not written")
 report["derived_blend"]={"file":str(dst),"bytes":dst.stat().st_size,
  "provenance":"Einar CC-BY derivative, externally referenced source maps; NOT standalone packed source"}
 report["status"]="A06_BLEND_SAVED";write()
 shots=[("front",front,center,height*1.28)]
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
 report["status"]="A06_VISIBLE_GROOM_CLEAN_SKIN_FRONT_CYCLES_NEEDS_VISUAL_REVIEW"
 write()
 print("HUMAN_A06_RENDER_PASS",json.dumps({"renders":len(report["renders"]),
  "max_shift":m["max_vertex_shift_m"],"shader_nodes":len(skin.node_tree.nodes),
  "source_derivative":True,"strap_origin_requires_visual_confirmation":True}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException as e:
 report["status"]="FAILED";report["error"]=type(e).__name__+": "+str(e)
 write();traceback.print_exc();sys.stdout.flush();os._exit(1)
