#!/usr/bin/env python3
"""Calibrate scene lighting on UNCHANGED frozen MIRA05 character.
Each scale executed in a fresh bpy process: render 500px Cycles and report
unchanged geometry/shader provenance. Never save a revised .blend.
"""
import bpy,sys,json,hashlib,os,traceback
from pathlib import Path
ROOT=Path("artifacts/one-shot-light-sweep");ROOT.mkdir(parents=True,exist_ok=True)
SOURCE=Path("baseline-mira05/mira05-integrated-structural.blend")
EXPECTED="07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076"
SCALES={"dim":.32,"medium":.65,"original":1.}
def hashfile(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def main(mode):
 if mode not in SCALES:raise ValueError("Select dim|medium|original")
 if not SOURCE.exists() or hashfile(SOURCE)!=EXPECTED:raise RuntimeError("source mismatch")
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
 scene=bpy.context.scene
 lamps=[o for o in bpy.data.objects if o.type=='LIGHT']
 if len(lamps)<3:raise RuntimeError("Expected 3+ studio lights in frozen source")
 originals={o.name:float(o.data.energy) for o in lamps}
 scale=SCALES[mode]
 for o in lamps:o.data.energy=originals[o.name]*scale
 scene.render.engine="CYCLES";scene.cycles.samples=12;scene.cycles.device="CPU"
 scene.render.resolution_x=500;scene.render.resolution_y=500
 scene.render.resolution_percentage=100;scene.render.image_settings.file_format="PNG"
 scene.render.threads_mode="FIXED";scene.render.threads=4
 camera=bpy.data.objects.get("CAM_MIRA_front")
 if camera is None or camera.type!="CAMERA":raise RuntimeError("Missing source front camera")
 scene.camera=camera
 out=ROOT/(mode+'.png');scene.render.filepath=str(out.resolve())
 print("MIRA05_ACTUAL_LIGHT_SWEEP",mode,scale,originals,flush=True)
 bpy.ops.render.render(write_still=True)
 if out.stat().st_size<12000:raise RuntimeError("No authentic Cycles render")
 record={"schema":"blank.one-shot.light-sweep-frame.v1","mode":mode,
 "source_sha256":EXPECTED,"source_not_saved":True,"camera":camera.name,
 "resolution":[500,500],"samples":12,"light_energies_original":originals,
 "light_energies_tested":{name:v*scale for name,v in originals.items()},
 "file":out.name,"sha256":hashfile(out)}
 (ROOT/(mode+'.json')).write_text(json.dumps(record,indent=2)+"\n")
 print("LIGHT_SWEEP_RENDER_COMPLETE",mode,record["sha256"],flush=True)
 sys.stdout.flush();os._exit(0)
if __name__=='__main__':
 try:main(sys.argv[1])
 except BaseException:traceback.print_exc();sys.stdout.flush();os._exit(1)
