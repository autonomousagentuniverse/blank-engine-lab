#!/usr/bin/env python3
"""Real Blender neutral->blink test of original one-shot A candidate.
Do not alter saved source or confuse face morph amplitude with visual photorealism.
"""
import bpy,json,hashlib,math,statistics,sys,os,traceback
from pathlib import Path
from mathutils import Vector
SRC=Path('reference/mira-a/complete_A.blend')
HASH='9b57bc2aaa1ba0cfec213eb1035f517dfbcebf5fb43443cc85618f42bb39791e'
OUT=Path('artifacts/human-reference-decomposition')
OUT.mkdir(parents=True,exist_ok=True)
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def evaluated_positions(head):
 dg=bpy.context.evaluated_depsgraph_get()
 obj=head.evaluated_get(dg)
 mesh=obj.to_mesh()
 try:return [obj.matrix_world @ v.co for v in mesh.vertices]
 finally:obj.to_mesh_clear()
def curvepoints(obj):
 return [obj.matrix_world@Vector(tuple(sp.points[0].co)[:3]) for sp in obj.data.splines]
def main():
 assert sha(SRC)==HASH
 bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
 head=bpy.data.objects['cm_vitruvian']
 key=head.data.shape_keys.key_blocks.get('Eyes_Closed_Max')
 if key is None:raise RuntimeError('Eyes_Closed_Max source morph absent')
 curves={n:bpy.data.objects[n] for n in ('MIRA05_SourceFittedLidContact','MIRA05_IndividualBrowStrands')}
 left=bpy.data.objects['Eye_L_eyeball'].matrix_world.translation
 right=bpy.data.objects['Eye_R_eyeball'].matrix_world.translation
 original=key.value
 try:
  key.value=0.;bpy.context.view_layer.update()
  start=evaluated_positions(head)
  curve_before={n:curvepoints(o) for n,o in curves.items()}
  key.value=1.;bpy.context.view_layer.update()
  end=evaluated_positions(head)
  curve_after={n:curvepoints(o) for n,o in curves.items()}
  assert len(start)==len(end)
  changed=[(b-a).length for a,b in zip(start,end)]
  within=[(b-a).length for a,b in zip(start,end)
     if min((a-left).length,(a-right).length)<.052]
  if not within:raise RuntimeError('No orbital mesh vertices for displacement probe')
  curve_delta={n:[(b-a).length for a,b in zip(curve_before[n],curve_after[n])] for n in curves}
  results={
   'schema':'blank.blink.deformation-probe.v1','candidate_sha256':HASH,'shape_key':'Eyes_Closed_Max',
   'state_neutral':0,'state_closed':1,'evaluated_mesh_vertex_count':len(start),
   'evaluated_mesh_max_displacement_mm':round(1000*max(changed),5),
   'orbital_vertices_sampled':len(within),
   'orbital_max_displacement_mm':round(1000*max(within),5),
   'orbital_median_displacement_mm':round(1000*statistics.median(within),5),
   'static_generated_curves':{n:{
       'spline_count':len(curves[n].data.splines),
       'max_root_movement_mm':round(1000*max(v),7) if v else 0,
       'mean_root_movement_mm':round(1000*statistics.mean(v),7) if v else 0,
       'parent':curves[n].parent.name if curves[n].parent else None,
       'modifier_count':len(curves[n].modifiers)} for n,v in curve_delta.items()},
   'no_visual_approval':True,'release_allowed':False,
   'limit':'Neutral to source blendshape eval only. Eye shells and tear meniscus contact geometry not measured; this does not establish true blink closure or photorealism.'
  }
  (OUT/'mira-blink-probe.json').write_text(json.dumps(results,indent=2)+'\n')
  print('MIRA_BLINK_GEOMETRY_MEASURED',json.dumps(results),flush=True)
 finally:
  key.value=original;bpy.context.view_layer.update()
 sys.stdout.flush();os._exit(0)
if __name__=='__main__':
 try:main()
 except BaseException:
  traceback.print_exc();sys.stdout.flush();os._exit(1)
