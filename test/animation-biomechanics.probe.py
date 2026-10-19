# Run with: blender -b --factory-startup --python test/animation-biomechanics.probe.py
import bpy,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'character-pipeline/manual-builder'))
from animation_rig import make_armature,gait_action,audit_biomechanics
h=1.72
rig=make_armature(h)
for name,params in [
 ('Walk_InPlace',(.095,.24,1,.13,.006)),
 ('Jog_InPlace',(.13,.36,2,.25,.013)),
 ('Run_InPlace',(.16,.53,2,.37,.021))]:
 gait_action(rig,name,*params)
result=audit_biomechanics(rig,h)
assert len(result)==3
for kind,sides in result.items():
 for side,metric in sides.items():
  assert metric['stance_frames']>=3, (kind,side,metric)
  assert metric['clearance_m']>=.04, (kind,side,metric)
  assert metric['sagittal_range_m']>=.2, (kind,side,metric)
print('BIOMECHANICS_ANIMATION_STANCE_SWING_PASS',result)
