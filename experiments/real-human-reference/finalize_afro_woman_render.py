#!/usr/bin/env python3
"""Final visual correction of an already successfully rebuilt REAL Blender character.
Fix (1) forehead/face-obscuring procedural hair alignment, (2) dark skin assignment,
(3) the extreme full-frame mistake of close-up camera. NO external image generation.
"""
import bpy,os,sys,math,json,hashlib,traceback,statistics
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
IN=Path("source/afro_woman_rebuilt_medium_body.blend")
OUT=Path("artifacts/afro_woman_final_blender")
OUT.mkdir(parents=True,exist_ok=True)
PIN="0c0a6f4de609bfe982d5ea420ce03083e9ba2b2e82bcb97d759b4bb09f84a55f"
NAME="AFRO_WOMAN_28_Medium_Build"
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def pts_mesh(o):
 ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
 if o.type!="MESH":return []
 mesh=ev.to_mesh(preserve_all_data_layers=False,depsgraph=bpy.context.evaluated_depsgraph_get())
 try:return [ev.matrix_world@v.co for v in mesh.vertices]
 finally:ev.to_mesh_clear()
def all_visible_points():
 p=[]
 for o in bpy.data.objects:
  if o.hide_render:continue
  if o.type=="MESH":
   coords=pts_mesh(o)
   if len(coords)>4000:coords=coords[::max(1,len(coords)//4000)]
   p.extend(coords)
  elif o.name.startswith("Natural_Afro_Coils_"):
   for s in o.data.splines:
    if len(s.points):
     p.append(o.matrix_world@Vector(s.points[0].co[:3]))
     p.append(o.matrix_world@Vector(s.points[-1].co[:3]))
 return p
def fit_camera(cam,pts,minimum=.06,maximum=.94):
 scene=bpy.context.scene
 cam.data.type="ORTHO"
 for count in range(14):
  bpy.context.view_layer.update()
  u=[world_to_camera_view(scene,cam,v) for v in pts]
  bb=[min(p.x for p in u),max(p.x for p in u),
      min(p.y for p in u),max(p.y for p in u)]
  if bb[0]>=minimum and bb[1]<=maximum and bb[2]>=minimum and bb[3]<=maximum:
   return bb
  cam.data.ortho_scale*=1.15
 raise RuntimeError("Could not find full viewport framing: "+str(bb))
def main():
 assert sha(IN)==PIN,"Incorrect original edited real Blender source"
 bpy.ops.wm.open_mainfile(filepath=str(IN.resolve()),load_ui=False)
 body=bpy.data.objects.get(NAME);assert body and body.type=="MESH"
 body_mesh=body.data.shape_keys.key_blocks["RebuiltMediumBuild_WaistHipShoulder"]
 assert abs(body_mesh.value-1)<1e-6
 original_head=[body.matrix_world@p.co for p in body_mesh.data]
 top=max(v.z for v in original_head)
 # MEASURE actual source material slots and correct the true face-skin slots.
 slots_before=[{"index":i,"name":s.material.name if s.material else None}
               for i,s in enumerate(body.material_slots)]
 print("ACTUAL_BLENDER_BODY_SLOTS",json.dumps(slots_before),flush=True)
 skin=bpy.data.materials.get("Dark_Brown_Skin_Microstructure")
 assert skin and skin.use_nodes
 for slot in body.material_slots:
  label=(slot.material.name if slot.material else "").lower()
  if any(bad in label for bad in ("eye","nail","tongue","teeth","mouth","lash")):continue
  slot.material=skin
 node=next((n for n in skin.node_tree.nodes if n.type=="VALTORGB"),None)
 if node:
  node.color_ramp.elements[0].color=(.032,.009,.005,1)
  node.color_ramp.elements[1].color=(.082,.028,.016,1)
 bsdf=next((n for n in skin.node_tree.nodes if n.type=="BSDF_PRINCIPLED"),None)
 if bsdf:bsdf.inputs["Roughness"].default_value=.52
 print("BLENDER_DARK_SKIN_MATERIAL_ASSIGNED",len(body.material_slots),flush=True)
 hair=[o for o in bpy.data.objects if o.name.startswith("Natural_Afro_Coils_") and o.type=="CURVE"]
 assert len(hair)==3
 roots=[];allcurves=[]
 for o in hair:
  for s in o.data.splines:
   if not s.points:continue
   roots.append(o.matrix_world@Vector(s.points[0].co[:3]))
   for p in s.points:
    allcurves.append(o.matrix_world@Vector(p.co[:3]))
 assert len(roots)==4450
 head_top=top
 lowest=min(p.z for p in allcurves)
 highest=max(p.z for p in allcurves)
 # The original output's gray ring sat across face while crown was bald:
 # make scalp align vertically and remove frontal curtain by shifting hairstyle
 # upwards and slightly toward rear (real source camera faces from y negative).
 shift_z=max(0.10,min(.30,head_top-.26-lowest))
 offset=Vector((0,.085,shift_z))
 for o in hair:
  mat=o.matrix_world.copy();mat.translation+=offset;o.matrix_world=mat
  for m in o.data.materials:
   if not m:continue
   m.diffuse_color=(.003,.002,.002,1)
   if m.use_nodes:
    for n in m.node_tree.nodes:
     if n.type=="BSDF_PRINCIPLED":
      n.inputs["Base Color"].default_value=(.003,.002,.002,1)
      n.inputs["Roughness"].default_value=.97
      if "Specular IOR Level" in n.inputs:n.inputs["Specular IOR Level"].default_value=.06
 # Recompute using actual worldspace to verify moved Afro crown, not masks alone.
 bpy.context.view_layer.update()
 shifted=[]
 for o in hair:
  for sp in o.data.splines:
   if not sp.points:continue
   shifted.extend([o.matrix_world@Vector(sp.points[0].co[:3]),
                   o.matrix_world@Vector(sp.points[-1].co[:3])])
 assert abs(min(x.z for x in shifted)-(lowest+shift_z))<.04
 print("ACTUAL_BLENDER_AFRO_REALIGNED",json.dumps({
 "head_top_m":round(head_top,5),"before_hair_z":[round(lowest,5),round(highest,5)],
 "world_offset_m":list(offset),"after_hair_bounds_z":[min(p.z for p in shifted),max(p.z for p in shifted)]}),flush=True)
 scene=bpy.context.scene
 scene.render.engine="CYCLES";scene.cycles.samples=52
 scene.cycles.device="CPU";scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=900;scene.render.resolution_y=1200
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 # Keep full-body camera, which already passed exact projection framing.
 front=bpy.data.objects.get("CAM_full_body_front")
 oblique=bpy.data.objects.get("CAM_full_body_three_quarter")
 close=bpy.data.objects.get("CAM_face_closeup")
 assert front and oblique and close,[(x.name,x.type) for x in bpy.data.objects if x.type=="CAMERA"]
 full=all_visible_points();assert len(full)>3000
 bounds={}
 views=[]
 for name,cam in (("full_body_front",front),("full_body_three_quarter",oblique)):
  bounds[name]=fit_camera(cam,full)
  views.append((name,cam))
 # Re-aim original closeup camera and fit ONLY anatomical head and hairstyle.
 headpts=[v for v in original_head if v.z>=head_top-.28]
 assert len(headpts)>100
 facepts=headpts+shifted
 look=Vector([(min(p[i] for p in facepts)+max(p[i] for p in facepts))*.5 for i in range(3)])
 close.location=(look.x,look.y-3.8,look.z)
 close.rotation_euler=(look-close.location).to_track_quat("-Z","Y").to_euler()
 close.data.ortho_scale=.62
 bounds["face_closeup"]=fit_camera(close,facepts,minimum=.06,maximum=.94)
 # Ensure close-up actually zoomed in, and unambiguously is closeup.
 assert close.data.ortho_scale<1.0,("Portrait cannot be 2m-wide again",close.data.ortho_scale)
 views.append(("face_closeup",close))
 rendered=[]
 for name,cam in views:
  scene.camera=cam
  fp=OUT/(name+".png")
  scene.render.filepath=str(fp.resolve())
  print("ACTUAL_BLENDER_FINAL_CYCLES",name,flush=True)
  bpy.ops.render.render(write_still=True)
  assert fp.stat().st_size>100000
  rendered.append({"name":name,"file":fp.name,"sha256":sha(fp),
    "bytes":fp.stat().st_size,"frustum":bounds[name],"ortho_scale":cam.data.ortho_scale})
 bpy.ops.file.pack_all()
 dst=OUT/"afro_woman_darkskin_medium_build_final.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()),compress=True,check_existing=False)
 assert dst.stat().st_size>300000
 report={
  "schema":"blank.blender.afro.woman.full-body-20261018.v2",
  "source_rebuilt_blend_sha256":PIN,
  "final_blend_sha256":sha(dst),"final_blend_bytes":dst.stat().st_size,
  "actual_blender_version":bpy.app.version_string,
  "actual_source_body_shape_key":body_mesh.name,
  "actual_body_morph_preserved":True,
  "source_skin_material_slots":slots_before,
  "skin_override_material":skin.name,
  "afro_curve_count":len(roots),"afro_world_offset_m":list(offset),
  "final_render_views":rendered,"photo_generator_used":False,
  "photoreal_visual_pass":False,
  "no_production_update":True,
  "limits":["Rebuilt medium-build body remains derived from editable MakeHuman core and original mesh/garment key",
   "Afro corrected through whole-head-object transform; individual scalp-to-root anatomical correspondence not certified",
   "Source material look adjusted qualitatively not calibrated photographic optics",
   "Check actual images for any remaining stylistic defects"]}
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print("REAL_BLENDER_FINAL_CORRECTION_VERIFIED",json.dumps({
  "afro_count":len(roots),"skin":skin.name,"images":len(rendered),
  "source":PIN,"final_blend":report["final_blend_sha256"]}),flush=True)
 sys.stdout.flush();os._exit(0)
if __name__=="__main__":
 try:main()
 except BaseException:
  traceback.print_exc()
  (OUT/"failure.txt").write_text(traceback.format_exc())
  sys.stdout.flush();os._exit(1)
