import bpy, math, random, json, os, hashlib
from mathutils import Vector
from pathlib import Path
random.seed(281017)
out=Path("artifacts/afro-woman");out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path("input/new_human_cc0_pilot.blend").resolve()),load_ui=False)
body=next(o for o in bpy.data.objects if o.name.startswith("NEW_HUMAN_01") and o.type=="MESH")
rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
# Remove old bob hairstyle, retain the new base body and armature.
removed=[]
for o in list(bpy.data.objects):
 if o==body or o==rig:continue
 n=o.name.lower()
 if "bob" in n or ("hair" in n and "eyebrow" not in n and "eyelash" not in n):
  removed.append(o.name);bpy.data.objects.remove(o,do_unlink=True)
# Deep melanin-rich skin shader on body; no photo textures copied.
for slot in body.material_slots:
 mat=slot.material
 if not mat:continue
 n=mat.name.lower()
 if any(s in n for s in ("skin","young","body")):
  mat=mat.copy();slot.material=mat
  mat.use_nodes=True
  for node in mat.node_tree.nodes:
   if node.type=="BSDF_PRINCIPLED":
    node.inputs["Base Color"].default_value=(.095,.035,.017,1)
    node.inputs["Roughness"].default_value=.47
    if "Subsurface Weight" in node.inputs:node.inputs["Subsurface Weight"].default_value=.13
# Adjust body complexion even if material naming doesn't match.
for slot in body.material_slots:
 m=slot.material
 if not m:continue
 if "skin" in m.name.lower() or "young" in m.name.lower():
  for n in m.node_tree.nodes:
   if n.type=="BSDF_PRINCIPLED":n.inputs["Base Color"].default_value=(.10,.041,.021,1)
# Approximate scalp position from top of body world bounds; preserve proportions.
worldpts=[body.matrix_world@v.co for v in body.data.vertices]
zmax=max(p.z for p in worldpts)
# Find head horizontal center using top 17cm, excluding hair and clothing.
headpts=[p for p in worldpts if p.z>zmax-.17]
cx=sum(p.x for p in headpts)/len(headpts);cy=sum(p.y for p in headpts)/len(headpts)
center=Vector((cx,cy,zmax-.105))
# Curly afro: many short independent coiled strands distributed in ellipsoidal volume.
mat=bpy.data.materials.new("Afro_Natural_Black_Brown");mat.diffuse_color=(.014,.009,.007,1)
mat.use_nodes=True
bs=next(n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
bs.inputs["Base Color"].default_value=(.017,.011,.008,1);bs.inputs["Roughness"].default_value=.85
curve=bpy.data.curves.new("Afro_Individual_Coil_Fibers","CURVE");curve.dimensions="3D"
curve.resolution_u=2;curve.bevel_depth=.00065;curve.bevel_resolution=1
# Single curve object holding many editable coil splines; afro silhouette is not a solid helmet.
for k in range(2400):
 theta=random.uniform(0,2*math.pi);phi=math.acos(random.uniform(-.18,.99))
 rad=random.random()**.38
 rx=.215;ry=.19;rz=.19
 p=Vector((center.x+rx*rad*math.sin(phi)*math.cos(theta),
           center.y+ry*rad*math.sin(phi)*math.sin(theta),
           center.z+.055+rz*rad*math.cos(phi)))
 # No hair growth below ear line; frontal hairline stays above face.
 if p.z<center.z-.05:continue
 spline=curve.splines.new("POLY");spline.points.add(8)
 axis=Vector((math.cos(theta),math.sin(theta),random.uniform(.1,.8))).normalized()
 u=axis.cross(Vector((0,0,1))).normalized()
 if u.length<.1:u=Vector((1,0,0))
 v=axis.cross(u).normalized()
 pitch=random.uniform(.002,.0048);r=random.uniform(.002,.006)
 for j,pt in enumerate(spline.points):
  t=j/8
  q=p+axis*(t*pitch*2)+u*(r*math.cos(t*math.pi*4))+v*(r*math.sin(t*math.pi*4))
  pt.co=(*q,1)
hair=bpy.data.objects.new("AFRO_2400_Editable_Coil_Strands",curve);bpy.context.collection.objects.link(hair)
hair.data.materials.append(mat)
# Parent to rig head bone if available, preserving world placement.
headbone=next((b.name for b in rig.data.bones if "head" in b.name.lower()),None)
if headbone:
 matrix=hair.matrix_world.copy();hair.parent=rig;hair.parent_type="BONE";hair.parent_bone=headbone;hair.matrix_world=matrix
# Neutral studio, full body camera fits actual extents.
for o in list(bpy.data.objects):
 if o.type in ("CAMERA","LIGHT"):bpy.data.objects.remove(o,do_unlink=True)
pts=[body.matrix_world@v.co for v in body.data.vertices]
lo=min(p.z for p in pts);hi=max(p.z for p in pts)+.19
mid=(hi+lo)/2;span=hi-lo
def cam(name,loc,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
 o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat("-Z","Y").to_euler();d.lens=lens;return o
def light(name,loc,power,size):
 d=bpy.data.lights.new(name,"AREA");o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
 o.location=loc;d.energy=power;d.shape="DISK";d.size=size
 o.rotation_euler=(Vector((cx,cy,mid))-o.location).to_track_quat("-Z","Y").to_euler()
light("Key",(-2.3,-3,mid+1),850,3);light("Fill",(2.5,-2,mid),520,3);light("Rim",(1.5,2,mid+.7),650,2)
scene=bpy.context.scene;scene.render.engine="CYCLES";scene.cycles.samples=32
scene.cycles.device="CPU";scene.render.threads_mode="FIXED";scene.render.threads=4
scene.render.resolution_x=768;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
cams=[("full_body",cam("FullBody",(cx,cy-5.2,mid),(cx,cy,mid),44)),
      ("three_quarter",cam("ThreeQuarter",(cx+2.6,cy-4.8,mid),(cx,cy,mid),48))]
images=[]
for name,c in cams:
 scene.camera=c;fp=out/(name+".png");scene.render.filepath=str(fp.resolve())
 bpy.ops.render.render(write_still=True)
 assert fp.stat().st_size>30000
 images.append(name)
bpy.ops.file.pack_all()
fp=out/"afro_woman_full_body.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(fp.resolve()),compress=True)
assert fp.stat().st_size>1000000
(out/"report.json").write_text(json.dumps({"subject":"Black woman about 28, medium build, dark skin, natural afro","actual_blender":True,"full_body_rendered":images,"rig_bones":len(rig.data.bones),"afro_strand_count":len(curve.splines),"removed_prior_hair":removed,"photorealism_approved":False,"blend_sha256":hashlib.sha256(fp.read_bytes()).hexdigest()},indent=2))
print("AFRO_WOMAN_BLENDER_COMPLETE",fp.stat().st_size,flush=True)
