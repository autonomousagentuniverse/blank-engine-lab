#!/usr/bin/env python3
"""HUMAN-A07: real Blender geometry-only A05-derived scalp fit / guide test.
A05 Einar-CC-BY derivative is reference; no original publisher download.
Not a photorealistic / independent-new-human deliverable.
"""
import bpy, math, random, json, traceback, sys, os, collections
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path("artifacts/human-a07")
ROOT.mkdir(parents=True,exist_ok=True)
REPORT={"version":"human-a07-evaluated-guided-scalp.v1","status":"STARTED",
 "source":"HUMAN-A05 Blender .blend (Einar CC-BY derivative)",
 "full_source_textures_available":False,"photorealism_accepted":False,
 "production_deployed":False,"renders":[]}
def save_report():
 (ROOT/"report.json").write_text(json.dumps(REPORT,indent=2,default=str)+"\n")
def clamp(v): return max(0.,min(1.,v))
def smooth(x):
 t=clamp(x)
 return t*t*(3.-2.*t)
def normalize_or(v,f):
 return v.normalized() if v.length>1e-9 else f.copy()
def make_groom(head,eye_center,front,height):
 rng=random.Random(20261017)
 depsgraph=bpy.context.evaluated_depsgraph_get()
 evaluated=head.evaluated_get(depsgraph)
 em=evaluated.to_mesh(preserve_all_data_layers=False,depsgraph=depsgraph)
 if em is None or len(em.vertices)<3000:
  raise AssertionError("Actual evaluated source mesh unavailable, vertices="+str(len(em.vertices) if em else 0))
 print("A07_EVALUATED_MESH",len(em.vertices),len(em.polygons),flush=True)
 try:
  # Exact evaluated surface; base-mesh center+normal caused HUMAN-A06's halo.
  coords=[v.co.copy() for v in em.vertices]
  polygons=[list(p.vertices) for p in em.polygons]
  bvh=BVHTree.FromPolygons(coords,polygons,all_triangles=False,epsilon=0.00003)
  obmat=evaluated.matrix_world.copy()
  world_inv=obmat.inverted()
  up=Vector((0.,0.,1.))
  side=normalize_or(up.cross(front),Vector((1.,0.,0.)))
  top=max((obmat@v).z for v in coords)
  eye_z=eye_center.z
  half=max(.035,top-eye_z)
  width=max(.04,max(abs((obmat@v-eye_center).dot(side)) for v in coords))
  # Region-based organic hairline. Front and temples start higher; crown and
  # rear scalp remain densely covered. Avoid eyebrow/forehead follices.
  sampled=[]
  bins=collections.Counter()
  stride=max(1,len(em.polygons)//120000)
  for poly in list(em.polygons)[::stride]:
   if len(poly.vertices)<3 or poly.area<=1e-10:continue
   mid=obmat@poly.center
   norm=normalize_or(obmat.to_3x3()@poly.normal,up)
   x=(mid-eye_center).dot(side)/width
   depth=(mid-eye_center).dot(front)/width
   level=(mid.z-eye_z)/half
   toward_front=smooth((depth+.05)/.95)
   temple=smooth((abs(x)-.32)/.45)
   hairline=.23+.25*toward_front+.09*toward_front*temple
   density=smooth((level-hairline)/.17)
   # Keep non-scalp/underside and mask outer skin near cheek/brows.
   radial=smooth((norm.z+.32)/.46)
   density*=radial
   if density<.012:continue
   weight=poly.area*density
   if weight<=1e-11:continue
   sampled.append((poly,weight,x,depth,level,norm))
   region=("front" if toward_front>.55 else "back")+"_"+("center" if abs(x)<.36 else "side")
   bins[region]+=1
  if len(sampled)<180:raise AssertionError("Hairline mask produced too few evaluated polygons: "+str(len(sampled)))
  n=16500
  chosen=rng.choices(sampled,weights=[v[1] for v in sampled],k=n)
  crv=bpy.data.curves.new("HUMAN_A07_GuidedScalpCurves","CURVE")
  crv.dimensions="3D";crv.resolution_u=1
  crv.bevel_depth=.000105;crv.bevel_resolution=1
  crv.use_fill_caps=False
  stats=collections.Counter()
  lengths=[];root_offsets=[];examples=[]
  back=-front
  for poly,weight,x,depth,level,normal in chosen:
   indices=list(poly.vertices)
   # Fan triangulation to cover evaluated quads; choose random triangle.
   tri=rng.randrange(len(indices)-2)
   v0=coords[indices[0]];v1=coords[indices[tri+1]];v2=coords[indices[tri+2]]
   r1,r2=rng.random(),rng.random()
   if r1+r2>1:r1,r2=1-r1,1-r2
   root=v0*(1-r1-r2)+v1*r1+v2*r2
   near,local_n,fi,dist=bvh.find_nearest(root,0.02)
   if near is None:continue
   root=near.copy()
   local_n=normalize_or(local_n,Vector((0,0,1)))
   root_world=obmat@root
   nworld=normalize_or(obmat.to_3x3()@local_n,up)
   lateral=(root_world-eye_center).dot(side)/width
   forward=(root_world-eye_center).dot(front)/width
   # Coherent scalp flow: crown sweeps backwards, temple hair flows
   # diagonally backward and down; small variation within each guide.
   guide=back*(1.0+0.15*rng.random())
   if abs(lateral)>.28:
    guide+=side*math.copysign(.42, lateral)
    guide+=up*(-.25)
   elif forward<-.22:
    guide+=side*.11
    guide+=up*(-.18)
   else:
    guide+=side*(-.06+.12*rng.random())
   tangent=guide-nworld*guide.dot(nworld)
   tangent=normalize_or(tangent,normalize_or(back-nworld*back.dot(nworld),side))
   length=rng.uniform(.017,.032)
   points=[]
   # Five surface-traced guide points. Projecting each curve section to
   # the evaluated head avoids the unsupported A06 free-space bristle halo.
   for k in range(5):
    t=k/4.
    predicted=root+(world_inv.to_3x3()@tangent)*length*t
    surface,sn,face_index,sd=bvh.find_nearest(predicted,0.055)
    if surface is None:surface=root;sn=local_n
    sn=normalize_or(sn,local_n)
    lift=.00042 + .0011*t
    pt=surface+sn*lift
    points.append(pt)
   spline=crv.splines.new("POLY");spline.points.add(4)
   for k,p in enumerate(points):
    spline.points[k].co=(p.x,p.y,p.z,1.)
    spline.points[k].radius=(1.0,.88,.65,.40,.04)[k]
   lengths.append(length);root_offsets.append(float(dist))
   stats["front" if forward>.22 else "rear"]+=1
   stats["center" if abs(lateral)<.3 else "temple"]+=1
   if len(examples)<5: examples.append({"root_world":list(root_world),
       "forward_unit":round(forward,4),"lateral_unit":round(lateral,4),
       "length_m":round(length,5)})
  if len(crv.splines)<5000:raise AssertionError("Unable to create adequate scalp-guide strands")
  material=bpy.data.materials.new("HUMAN_A07_NaturalDarkHair")
  material.use_nodes=True
  bs=material.node_tree.nodes.get("Principled BSDF")
  bs.inputs["Base Color"].default_value=(.085,.051,.037,1)
  bs.inputs["Roughness"].default_value=.62
  crv.materials.append(material)
  hair=bpy.data.objects.new("HUMAN_A07_SurfaceConformingScalpGroom",crv)
  bpy.context.scene.collection.objects.link(hair)
  hair.parent=head
  hair.matrix_parent_inverse.identity()
  hair.hide_render=False
  return hair, {
   "evaluated_vertices":len(coords),"evaluated_faces":len(em.polygons),
   "eligible_scalp_polygons":len(sampled),"sample_stride":stride,
   "mask_region_polygon_counts":dict(bins),"evaluated_head_top_world_z":top,
   "head_height_m":height,"eye_line_world_z":eye_z,
   "groom_method":"bvh-nearest evaluated head + soft front/temple density mask + 3 flow guides",
   "strand_count":len(crv.splines),"length_m":[min(lengths),max(lengths)],
   "radius_m":crv.bevel_depth,"surface_sample_distance_m_max":max(root_offsets),
   "distribution":dict(stats),"samples":examples,
   "source_film_skin_material_left_unmodified":True,
   "new_independent_human":False
  }
 finally:evaluated.to_mesh_clear()
def main():
 save_report()
 src=Path("baseline-a05/human-a05-rig-neutral-no-strap.blend")
 if not src.exists():raise FileNotFoundError(src)
 bpy.ops.wm.open_mainfile(filepath=str(src.resolve()),load_ui=False)
 head=bpy.data.objects.get("GEO-einar_head")
 left=bpy.data.objects.get("GEO-eye.L");right=bpy.data.objects.get("GEO-eye.R")
 if not all((head,left,right)):raise AssertionError("Verified A05 head/eyes not present")
 base=json.loads(Path("baseline-a05/report.json").read_text())
 sculpt=next(x for x in base["changes"] if x.get("kind")=="SOURCE_DERIVATIVE_FACIAL_SCULPT")
 front=Vector(sculpt["face_front"]).normalized()
 h=float(sculpt["head_height_m"])
 ec=(left.matrix_world.translation+right.matrix_world.translation)*.5
 groom,metrics=make_groom(head,ec,front,h)
 REPORT["groom"]=metrics;save_report()
 # CLAY skin deliberately used while original license-pinned texture bytes are
 # unavailable. DO NOT portray this as photorealism or source shader transfer.
 head.data=head.data.copy()
 clay=bpy.data.materials.new("HUMAN_A07_Clay_DiagnosticOnly")
 clay.use_nodes=True
 shader=clay.node_tree.nodes.get("Principled BSDF")
 shader.inputs["Base Color"].default_value=(.55,.36,.29,1)
 shader.inputs["Roughness"].default_value=.82
 head.data.materials.clear();head.data.materials.append(clay)
 for o in bpy.data.objects:
  if o.type in ("MESH","CURVE","CURVES","VOLUME"):
   o.hide_render=o.name not in (head.name,groom.name)
  if o.type=="LIGHT":o.hide_render=True
 groom.hide_render=False
 scene=bpy.context.scene;scene.use_nodes=False
 scene.render.engine="CYCLES";scene.cycles.samples=14;scene.cycles.device="CPU"
 scene.render.resolution_x=700;scene.render.resolution_y=700
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 try:scene.view_layers[0].cycles.use_denoising=True
 except Exception:pass
 world=bpy.data.worlds.new("A07_StudioWorld");world.use_nodes=True
 world.node_tree.nodes["Background"].inputs["Color"].default_value=(.18,.19,.22,1)
 world.node_tree.nodes["Background"].inputs["Strength"].default_value=.45
 scene.world=world
 def aim(o,p,t):o.location=p;o.rotation_euler=(t-p).to_track_quat("-Z","Y").to_euler()
 def area(name,power,pos,target,size):
  light=bpy.data.lights.new(name,"AREA");light.energy=power;light.shape="DISK";light.size=size
  ob=bpy.data.objects.new(name,light);scene.collection.objects.link(ob);aim(ob,pos,target)
 mid=ec+Vector((0,0,-h*.10))
 area("A07_Key",125,mid+front*1.1+Vector((.42,0,.38)),mid,1.6)
 area("A07_Fill",65,mid+front*.8+Vector((-.55,0,.1)),mid,1.9)
 camera=bpy.data.objects.get("HumanA05_PortraitCamera")
 if not camera:
  camera=bpy.data.objects.new("A07_Camera",bpy.data.cameras.new("A07_Camera"))
  scene.collection.objects.link(camera)
 scene.camera=camera;camera.data.type="ORTHO"
 for label,target,scale in [("front_clay",mid,h*1.3),
                            ("hair_macro",ec+Vector((0,0,h*.42)),h*.69)]:
  aim(camera,target+front*1.4,target);camera.data.ortho_scale=scale
  output=ROOT/(label+".png");scene.render.filepath=str(output.resolve())
  print("A07_REAL_BLENDER_RENDER",label,flush=True)
  bpy.ops.render.render(write_still=True)
  if not output.is_file() or output.stat().st_size<5000:raise AssertionError("Cycles render missing "+label)
  REPORT["renders"].append({"view":label,"file":str(output),"bytes":output.stat().st_size})
  save_report()
 bpy.ops.wm.save_as_mainfile(filepath=str((ROOT/"human-a07-guided-scalp.blend").resolve()),
                             compress=True,check_existing=False)
 REPORT["status"]="TWO_REAL_CYCLES_CLAY_RENDERS_SAVED_VISUAL_REVIEW_PENDING"
 save_report()
 print("HUMAN_A07_REAL_CYCLES_PASS",json.dumps({"renders":len(REPORT["renders"]),
        "strand_count":metrics["strand_count"],"regions":metrics["distribution"]}),flush=True)
 sys.stdout.flush();os._exit(0)
try:main()
except BaseException as e:
 REPORT["status"]="FAILED";REPORT["error"]=type(e).__name__+": "+str(e)
 save_report();traceback.print_exc();sys.stdout.flush();os._exit(1)
