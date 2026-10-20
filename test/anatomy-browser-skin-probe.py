"""Genuine Blender QA probe for one actual browser MakeHuman snapshot.

Called by scripts/anatomy-browser-build-regression.mjs. Covers the same
armature, skinning, gaits and procedural facial keys used by the one-shot.
"""
import sys,json,bpy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'character-pipeline/manual-builder'))
from build_replica import axis,mesh_obj,material
from animation_rig import make_armature,assign_weights,make_face_shape_keys,create_animations,audit_biomechanics,audit_skin_strain
path=sys.argv[sys.argv.index('--')+1]
spec=json.loads(Path(path).read_text());s=spec['snapshot'];height=s['height_m']
positions=s['position_xyz']
vertices=[axis(positions[i:i+3]) for i in range(0,len(positions),3)]
indices=s['body_indices']
triangles=[indices[i:i+3] for i in range(0,len(indices),3)]
body=mesh_obj('Source Body',vertices,triangles,material('Skin','#885f48'))
rig=make_armature(height)
assign_weights(body,rig,height)
make_face_shape_keys(body,height)
create_animations(rig,body)
# A-pose hands occupy low Z, but should NOT be moved by the thighs.
hand_vertices=[v for v in body.data.vertices if abs(v.co.x)/height>.245 and .47<v.co.z/height<.63]
assert len(hand_vertices)>15,'Expected distal hand samples in MakeHuman mesh'
corrupt=[]
for v in hand_vertices:
 for weight in v.groups:
  if body.vertex_groups[weight.group].name.startswith('Thigh.') and weight.weight>.001:
   corrupt.append((v.index,round(weight.weight,4)))
assert not corrupt,'Remote hand-to-thigh weights: '+str(corrupt[:10])
gait=audit_biomechanics(rig,height)
strain=audit_skin_strain(rig,body,limit=4.35)
assert len(strain)==4
assert all(t['max_edge_length_ratio']<=4.35 for t in strain.values())
print('REAL_BROWSER_MORPH_BLENDER_PASS '+json.dumps({'preset':Path(path).stem,
 'gender':spec['controls']['body.gender'],'height':height,
 'sampled_hand_vertices':len(hand_vertices),'hand_thigh_contamination':len(corrupt),
 'worst_skin_strain':{name:val['max_edge_length_ratio'] for name,val in strain.items()},
 'walk_ankle':gait['Walk_InPlace']}),flush=True)
