#!/usr/bin/env python3
"""Fast genuine Blender character adaptation from our *editable* prior full-body MPFB model.
No AI image stand-in. Replaces bob hair with 4450 editable afro curves and procedural dark skin.
The body/head are derived from the prior synthetic MPFB rig, NOT a newly generated base mesh.
"""
import bpy,sys,os,json,traceback,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from generate_afro_woman import make_deep_skin_material,build_natural_afro,camera_at,area,sha
BASE=Path("previous-mpfb/new_human_cc0_pilot.blend")
OUT=Path("artifacts/dark-afro-woman-fast")
OUT.mkdir(parents=True,exist_ok=True)
BASE_SHA="ae45c099821c725024289f73c803f5b02f579f9c7df77f16083c092f13405537"
def main():
 assert BASE.exists() and sha(BASE)==BASE_SHA,"Pinned editable MPFB source missing"
 bpy.ops.wm.open_mainfile(filepath=str(BASE.resolve()),load_ui=False)
 base=bpy.data.objects.get("NEW_HUMAN_01_CC0_MakeHuman_Core")
 if not base or base.type!="MESH":raise RuntimeError("Unexpected prior parametric human source")
 rig=next((o for o in bpy.data.objects if o.type=="ARMATURE" and len(o.data.bones)>30),None)
 if not rig:raise RuntimeError("Rigged original MPFB human absent")
 oldhair=[o for o in bpy.data.objects if o.type=="MESH" and o.name.endswith(".bob01")]
 assert len(oldhair)==1
 for obj in oldhair:bpy.data.objects.remove(obj,do_unlink=True)
 base.name="AFRO_WOMAN_28_DARKSKIN_Editable"
 mat=make_deep_skin_material(base)
 afros,strands=build_natural_afro(base,rig)
 assert strands==4450
 # Remove original lights/cameras; use standardized front and portrait lighting.
 for o in list(bpy.data.objects):
  if o.type in ("LIGHT","CAMERA"):bpy.data.objects.remove(o,do_unlink=True)
 zs=[(base.matrix_world@v.co).z for v in base.data.vertices]
 top=max(zs)
 tgt=(0,0,top-.19)
 cams=[
  ("full_body_front",camera_at((0,0,top*.52),(0,-2.75,top*.53),"Afro_Full_Body_Front",69)),
  ("full_body_three_quarter",camera_at((0,0,top*.52),(.86,-2.85,top*.57),"Afro_Full_Body_ThreeQuarter",68)),
  ("face_front",camera_at(tgt,(0,-1.16,top-.15),"Afro_Face_Front",70)),
  ("face_three_quarter",camera_at(tgt,(.47,-1.15,top-.12),"Afro_Face_ThreeQuarter",70))]
 area("Afro_Key",(-1.1,-2,2.6),560,2.2)
 area("Afro_Fill",(1.2,-1.5,1.8),270,1.7)
 area("Afro_Edge",(.9,1.1,2.8),400,1.4)
 scene=bpy.context.scene
 scene.render.engine="CYCLES"
 scene.cycles.device="CPU";scene.cycles.samples=42
 scene.render.threads_mode="FIXED";scene.render.threads=4
 scene.render.resolution_x=768;scene.render.resolution_y=1024
 scene.render.resolution_percentage=100
 scene.render.image_settings.file_format="PNG"
 scene.render.film_transparent=False
 scene.world.color=(.17,.17,.17)
 frames=[]
 for name,cam in cams:
  scene.camera=cam
  p=OUT/(name+".png")
  scene.render.filepath=str(p.resolve())
  print("BLENDER_AFRO_WOMAN_RENDER",name,flush=True)
  bpy.ops.render.render(write_still=True)
  assert p.stat().st_size>10000
  frames.append({"view":name,"file":p.name,"sha256":sha(p),"bytes":p.stat().st_size})
 bpy.ops.file.pack_all()
 blend=OUT/"afro_woman_28_dark_skin.blend"
 bpy.ops.wm.save_as_mainfile(filepath=str(blend.resolve()),compress=True,check_existing=False)
 assert blend.stat().st_size>200000
 res={
  "schema":"blank.generated-described-human.v1",
  "description":"Full-body Black woman age about 28 medium build with dark skin and natural afro hair",
  "editable_blend":"afro_woman_28_dark_skin.blend","blend_sha256":sha(blend),
  "source_basemesh":"Previously generated synthetic full MPFB character, reworked here in Blender",
  "source_sha256":BASE_SHA,"has_real_3d_geometry":True,"source_is_ai_image":False,
  "skin_material":mat.name,"afro_editable_curve_objects":[o.name for o in afros],
  "afro_strands":strands,"original_bob_removed":True,"rig_bones":len(rig.data.bones),
  "renders":frames,"photoreal_pass":False,
  "status":"READY_FOR_VISUAL_REVIEW",
  "limits":["Body and face keep prior parametric MPFB base identity; not a novel basemesh",
    "Kinky afro is deliberately simplified editable curl strands, not photography-grade grooming",
    "Procedural skin is not a calibrated measured human BRDF"]}
 (OUT/"report.json").write_text(json.dumps(res,indent=2)+"\n")
 print("BLENDER_AFRO_WOMAN_DELIVERED",json.dumps({"blend_sha256":res["blend_sha256"],"renders":len(frames),"afro_strands":strands}),flush=True)
 sys.stdout.flush();os._exit(0)
if __name__=="__main__":
 try:main()
 except BaseException:
  (OUT/"error.txt").write_text(traceback.format_exc())
  traceback.print_exc();sys.stdout.flush();os._exit(1)
