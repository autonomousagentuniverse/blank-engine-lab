#!/usr/bin/env python3
"""Rebuild EXISTING Afro Woman in authentic Blender 4.5.3, no assets downloaded.
Morph new body & clothing in concert; shorten ONLY procedural hair tips,
auto-fit the full-body cameras with measured projected world geometry; render and save.
Do NOT use image generation, do NOT fabricate screenshot or visual approval.
"""
from pathlib import Path
import bpy, math, json, hashlib, os, sys, statistics, traceback
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

SOURCE=Path("source/afro_woman_full_body.blend")
OUT=Path("artifacts/afro_woman_body_rebuild")
OUT.mkdir(parents=True,exist_ok=True)
BASE_NAME="AFRO_WOMAN_28_Medium_Build"
SOURCE_SHA="6d62b24389ffa41ec4dac3ea57518c25941979f45d0799a9b9a089c24f827713"
def sha(p):
 h=hashlib.sha256()
 with open(p,"rb") as f:
  for b in iter(lambda:f.read(1024*1024),b""):h.update(b)
 return h.hexdigest()

def smooth_width(t):
 """Profile in human world height fraction; emphasize real 3-D build over shade."""
 table=[
  (0.00,1.02,1.02),(0.08,1.02,1.02),
  (0.19,1.09,1.06),(0.32,1.17,1.12),
  (0.43,1.23,1.16),(0.49,1.28,1.19),
  (0.56,1.24,1.18),(0.63,1.19,1.14),
  (0.69,1.16,1.13),(0.75,1.17,1.13),
  (0.80,1.12,1.10),(0.85,1.02,1.02),
  (0.89,1.00,1.00),(1.00,1.00,1.00)]
 for i in range(len(table)-1):
  za,xa,ya=table[i];zb,xb,yb=table[i+1]
  if t<=zb:
   k=min(1,max(0,(t-za)/(zb-za)))
   k=k*k*(3-2*k)
   return (xa*(1-k)+xb*k,ya*(1-k)+yb*k)
 return (1,1)

def geometry_points(o):
 dg=bpy.context.evaluated_depsgraph_get()
 ev=o.evaluated_get(dg)
 if o.type!="MESH":return []
 try:
  mesh=ev.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
  return [ev.matrix_world@v.co for v in mesh.vertices]
 finally:ev.to_mesh_clear()

def shape_width_at_height(o,z0,z1,cx,extent=.55):
 world=[o.matrix_world@v.co for v in o.data.vertices]
 zz=[v.x for v in world if z0<=v.z<=z1 and abs(v.x-cx)<extent]
 if len(zz)<20:return {"status":"insufficient","count":len(zz)}
 return {"status":"measured","count":len(zz),"width_m":max(zz)-min(zz)}

def get_bbox_world(o):
 try:
  pts=geometry_points(o)
  if pts:return pts
 except Exception:pass
 return [o.matrix_world@Vector(c) for c in o.bound_box]

def apply_morph(o,center,zmin,zmax):
 # Rebuild actual Blender mesh with an editable, named morph shape key.
 if o.type!="MESH" or len(o.data.vertices)<100:
  return {"status":"skipped"}
 inv=o.matrix_world.inverted_safe()
 if o.data.shape_keys:
  existing=o.data.shape_keys.key_blocks
  basis=existing.get("Basis") or existing[0]
 else:
  basis=o.shape_key_add(name="Basis",from_mix=False)
 name="RebuiltMediumBuild_WaistHipShoulder"
 target=o.shape_key_add(name=name,from_mix=False)
 maxmove=0
 for i in range(len(basis.data)):
  source=Vector(basis.data[i].co)
  w=o.matrix_world@source
  t=min(1,max(0,(w.z-zmin)/(zmax-zmin)))
  sx,sy=smooth_width(t)
  new=Vector((center.x+(w.x-center.x)*sx,center.y+(w.y-center.y)*sy,w.z))
  new_local=inv@new
  target.data[i].co=new_local
  maxmove=max(maxmove,(new-w).length)
 target.value=1.0
 o.data.update()
 return {"status":"edited","vertex_count":len(target.data),"shape_key":name,"max_delta_m":round(maxmove,6)}

def trim_hair(o):
 if o.type!="CURVE":return {"status":"skipped","reason":"not_curve"}
 n=0;max_m=0
 for sp in o.data.splines:
  if sp.type not in ("POLY","NURBS") or len(sp.points)<3:continue
  root=Vector(sp.points[0].co[:3])
  # Preserve scalp binding! Reduce lengths from each original rooted strand.
  for p in sp.points:
   old=Vector(p.co[:3])
   new=root+(old-root)*.70
   max_m=max(max_m,(new-old).length)
   p.co[:3]=(new.x,new.y,new.z)
  n+=1
 o.data.update()
 return {"status":"edited","strand_count":n,"length_multiplier":.70,
         "root_position_unchanged":True,"max_tip_delta_m":round(max_m,6)}

def main():
 assert SOURCE.exists(),"Original editable Blender file is missing"
 assert sha(SOURCE)==SOURCE_SHA,"Original SHA mismatch, refuse to alter unknown asset"
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
 body=bpy.data.objects.get(BASE_NAME)
 assert body and body.type=="MESH",list(bpy.data.objects.keys())[:30]
 pre=[body.matrix_world@v.co for v in body.data.vertices]
 zmin=min(v.z for v in pre);zmax=max(v.z for v in pre)
 cx=statistics.median(v.x for v in pre)
 cy=statistics.median(v.y for v in pre)
 center=Vector((cx,cy,(zmin+zmax)*.5))
 assert 1.1<zmax-zmin<2.5,("Suspicious human height",zmin,zmax)
 # Accurate old-to-new body widths use explicit shape-key source/destination pairs
 # in the same original mesh coordinate system, not screen-space projection.
 snapshot=[Vector(v) for v in pre]
 changed={}
 changed[body.name]=apply_morph(body,center,zmin,zmax)
 clothing=[o for o in bpy.data.objects if o.type=="MESH"
           and "female_casualsuit01" in o.name]
 assert len(clothing)==1,("Need one explicit garment", [o.name for o in clothing])
 changed[clothing[0].name]=apply_morph(clothing[0],center,zmin,zmax)
 afro_objs=[o for o in bpy.data.objects if o.name.startswith("Natural_Afro_Coils_")]
 assert len(afro_objs)==3,("Missing procedural afro",len(afro_objs))
 curls={o.name:trim_hair(o) for o in afro_objs}
 assert sum(v["strand_count"] for v in curls.values())==4450
 # Extract exact world body coordinates from newly evaluated shape key.
 bpy.context.view_layer.update()
 outv=geometry_points(body)
 assert len(outv)>5000
 def region(t):
  world_old=[v for v in snapshot if abs((v.z-zmin)/(zmax-zmin)-t)<.018 and abs(v.x-cx)<.55]
  world_new=[v for v in outv if abs((v.z-zmin)/(zmax-zmin)-t)<.018 and abs(v.x-cx)<.55]
  assert len(world_old)>30 and len(world_new)>30,(t,len(world_old),len(world_new))
  ow=max(v.x for v in world_old)-min(v.x for v in world_old)
  nw=max(v.x for v in world_new)-min(v.x for v in world_new)
  return {"old_width_m":round(ow,5),"new_width_m":round(nw,5),
          "width_change_pct":round((nw/ow-1)*100,2),"samples_old":len(world_old),"samples_new":len(world_new)}
 measures={"hip":region(.49),"waist":region(.61),"upper_torso":region(.75)}
 print("BLENDER_BODY_MORPH_MEASURES",json.dumps(measures),flush=True)
 assert measures["hip"]["width_change_pct"]>16
 assert measures["waist"]["width_change_pct"]>8
 # Find visible body, garment and procedural afro based on actual Blender object geometry.
 # Exclude hidden helper body-part meshes + rig controls from framing as appropriate.
 points=[]
 for o in bpy.data.objects:
  if o.hide_render or o.type not in ("MESH","CURVE"):continue
  if o.type=="MESH":
   try:
    p=get_bbox_world(o)
    if len(p)>3500:p=p[::max(1,len(p)//3500)]
    points.extend(p)
   except Exception as ex:print("BOUNDS_WARNING",o.name,str(ex)[:90],flush=True)
  elif o.name.startswith("Natural_Afro_Coils_"):
   # Use ALL tips and roots after shorten, applying actual object world matrix.
   for s in o.data.splines:
    if not s.points:continue
    points.extend([o.matrix_world@Vector(s.points[0].co[:3]),
                   o.matrix_world@Vector(s.points[-1].co[:3])])
 assert len(points)>3000,("Need visible full character points",len(points))
 bounds={
 "min":[min(p[i] for p in points) for i in range(3)],
 "max":[max(p[i] for p in points) for i in range(3)]}
 box_center=Vector([(a+b)*.5 for a,b in zip(bounds["min"],bounds["max"])])
 span=[b-a for a,b in zip(bounds["min"],bounds["max"])]
 assert span[2]>1.2
 print("BLENDER_VISIBLE_BOUNDS",bounds,"span",span,flush=True)

 # Delete old render cameras only; regenerate user-facing front and 3/4 views.
 oldcams=[o for o in bpy.data.objects if o.type=="CAMERA"]
 for o in oldcams:bpy.data.objects.remove(o,do_unlink=True)
 scene=bpy.context.scene
 scene.render.engine="CYCLES"
 scene.cycles.device="CPU";scene.cycles.samples=48
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=900;scene.render.resolution_y=1200
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 # Transparent is false; unchanged original lights and world are preserved.
 scene.render.film_transparent=False
 def make_cam(label,direction,subset,margin=.06):
  data=bpy.data.cameras.new("CAM_"+label);cam=bpy.data.objects.new("CAM_"+label,data)
  scene.collection.objects.link(cam)
  pts=subset
  bx=Vector([(min(p[i] for p in pts)+max(p[i] for p in pts))*.5 for i in range(3)])
  offset=Vector(direction).normalized()*4.0
  cam.location=bx+offset
  cam.rotation_euler=(bx-cam.location).to_track_quat("-Z","Y").to_euler()
  cam.data.type="ORTHO"
  cam.data.ortho_scale=max(span[2]*1.2,2.0)
  cam.data.clip_start=.05;cam.data.clip_end=100
  for j in range(15):
   bpy.context.view_layer.update()
   uv=[world_to_camera_view(scene,cam,p) for p in pts]
   edges=[min(p.x for p in uv),max(p.x for p in uv),
          min(p.y for p in uv),max(p.y for p in uv)]
   if edges[0]>margin and edges[1]<(1-margin) and edges[2]>margin and edges[3]<(1-margin):
    print("CAMERA_PROJECTION_PASS",label,"bounds",edges,
          "iterations",j,"ortho_scale",cam.data.ortho_scale,flush=True)
    return cam,edges
   cam.data.ortho_scale*=1.18
  raise RuntimeError("Failed camera framing:"+label+" edges "+str(edges))
 # Camera back planes are not included; actual relevant body/hair points are projected.
 head_cut=zmax-.31
 face_pts=[p for p in points if p.z>=head_cut]
 assert len(face_pts)>300
 setups=[
  ("full_body_front",(0,-4,0),points),
  ("full_body_three_quarter",(2,-4,.3),points),
  ("face_closeup",(0,-4,0),face_pts)]
 images=[]
 for name,vector,ps in setups:
  cam,extents=make_cam(name,vector,ps,margin=.07)
  scene.camera=cam
  filepath=OUT/(name+".png")
  scene.render.filepath=str(filepath.resolve())
  print("ACTUAL_BLENDER_CYCLES_RENDER",name,flush=True)
  bpy.ops.render.render(write_still=True)
  assert filepath.stat().st_size>25000,("Render failed",name)
  images.append({"view":name,"filename":filepath.name,
    "sha256":sha(filepath),"bytes":filepath.stat().st_size,
    "projection_uv_bounds":extents,"camera_ortho_scale":cam.data.ortho_scale})
 # Only final file, no source overwrite.
 bpy.ops.file.pack_all()
 dst=OUT/"afro_woman_rebuilt_medium_body.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()),compress=True,check_existing=False)
 assert dst.stat().st_size>300000
 report={"schema":"blank.20261018.afro-body-rebuild.v1",
 "source_blend_sha256":SOURCE_SHA,"output_blend_sha256":sha(dst),
 "output_blend_bytes":dst.stat().st_size,"source_unchanged":True,
 "actual_blender_bpy_version":bpy.app.version_string,
 "rig_bones":sum(len(o.data.bones) for o in bpy.data.objects if o.type=="ARMATURE"),
 "reused_editable_original_rig":True,
 "body_morph":changed,"measured_anatomical_width_change":measures,
 "afro_root_preserving_reduction":curls,"total_coiled_strands":4450,
 "camera_frustum_fit":"measured projection of evaluated meshes and actual afro roots/tips",
 "geometry_bbox_m":bounds,"output_pngs":images,
 "no_image_generator_used":True,"photorealism_approved":False,
 "user_requirement":"Rebuild via Blender: medium-body dark-skin Black woman ~28 with smaller afro, correct full-body framing",
 "limitations":["Existing MPFB synthetic body rig reused; shape-key local garment and body resize may require pose-dependent reweighting for animation",
  "Source artifact is pre-existing Blender geometry (not a newly generated identity)",
  "Photographic realism not assured; inspect actual Cycles PNG"]}
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print("BLENDER_REAL_REBUILD_VERIFIED",json.dumps({
 "body_widths":measures,"afro_strands":4450,
 "images":len(images),"blend_sha":report["output_blend_sha256"]}),flush=True)
 sys.stdout.flush();os._exit(0)
if __name__=="__main__":
 try:main()
 except BaseException:
  traceback.print_exc()
  (OUT/"failure.txt").write_text(traceback.format_exc())
  sys.stdout.flush();os._exit(1)
