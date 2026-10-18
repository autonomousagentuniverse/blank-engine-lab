"""Source-measured, bounded research morphs on actual MASK-corrected Blender mesh.

Only adds THREE explicit relative-to-Basis shape keys. Never edit source
basis, inherited MPFB keys, their default weights, 53-bone groups, materials,
hair, eyes, clothing or UV topology. Not a normative face/sex scoring model.
"""
import math
from mathutils import Vector

DEFAULTS={
 "morphology.jaw_width":.34,
 "morphology.cheek_fullness":.61,
 "morphology.brow_ridge_strength":.20}
NAMES={
 "morphology.jaw_width":"BLANK_V2_JAW_WIDTH",
 "morphology.cheek_fullness":"BLANK_V2_CHEEK_FULLNESS",
 "morphology.brow_ridge_strength":"BLANK_V2_BROW_PROJECTION"}
def smoother(low,high,x):
 q=max(0.,min(1.,(x-low)/(high-low)))
 return q*q*(3.-2.*q)
def clampnum(x,a,b):return max(a,min(b,x))
def apply_face_controls(body,values):
 assert body.type=="MESH" and body.name=="AFRO_WOMAN_MASK_RESPECTED"
 assert len(body.data.vertices)==10756
 ks=body.data.shape_keys.key_blocks
 assert len(ks)==12,"SOURCE_MORPH_TARGET_SET_MUST_BE_PRESERVED"
 assert list(DEFAULTS)==[x for x in DEFAULTS]
 for path,d in DEFAULTS.items():
  v=values.get(path)
  assert type(v) in (int,float) and math.isfinite(v) and 0<=v<=1,("INVALID_FACE_CONTROL",path,v)
  assert abs(v-d)<=.25,("REQUIRES_ANATOMICAL_REVIEW_ABOVE_DELTA_025",path,v)
 head=body.vertex_groups.get("head")
 assert head,"RIGGED_HEAD_GROUP_MISSING"
 basis=ks["Basis"]
 original_keys=[(x.name,x.value) for x in ks]
 world=body.matrix_world
 local_delta=world.inverted().to_3x3()
 actual={}
 for path,default in DEFAULTS.items():
  name=NAMES[path]
  assert ks.get(name) is None,("MORPH_KEY_ALREADY_EXISTS",name)
  new=body.shape_key_add(name=name,from_mix=False)
  new.relative_key=basis
  new.slider_min=0.;new.slider_max=1.
  changed=0;max_mm=0;total_abs_mm=0
  for v in body.data.vertices:
   i=v.index
   p=world@basis.data[i].co
   x,y,z=p
   w=sum(g.weight for g in v.groups if g.group==head.index)
   hw=smoother(.05,.55,w)
   # Real front-facing axis from source camera is -Y.
   anterior=1.0-smoother(-.115,-.055,y)
   left_right=smoother(.012,.046,abs(x))
   if path=="morphology.jaw_width":
    regional=smoother(1.432,1.470,z)*(1-smoother(1.523,1.548,z))
    influence=hw*anterior*left_right*regional
    amount=((values[path]-default)/.15)*.0055
    delta_world=Vector((math.copysign(amount*influence,x),0,0))
   elif path=="morphology.cheek_fullness":
    regional=smoother(1.497,1.524,z)*(1-smoother(1.565,1.598,z))
    influence=hw*anterior*left_right*regional
    amount=((values[path]-default)/.15)*.0042
    # Fuller cheek changes anterior and lateral region, not eye/eyelid border.
    delta_world=Vector((math.copysign(.42*amount*influence,x),-amount*influence,0))
   else:
    regional=smoother(1.562,1.580,z)*(1-smoother(1.595,1.617,z))
    brow_side=smoother(.022,.042,abs(x))*(1-smoother(.073,.091,abs(x)))
    influence=hw*anterior*brow_side*regional
    amount=((values[path]-default)/.15)*.0035
    delta_world=Vector((0,-amount*influence,0))
   new.data[i].co=basis.data[i].co+local_delta@delta_world
   magnitude_mm=1000*delta_world.length
   if magnitude_mm>0.0001:changed+=1
   max_mm=max(max_mm,magnitude_mm);total_abs_mm+=magnitude_mm
  new.value=1.0
  actual[path]={"shape_key":name,"old_control":default,"new_control":values[path],
     "changed_source_vertices":changed,"max_offset_mm":round(max_mm,6),
     "summed_offset_mm":round(total_abs_mm,6),"applies_to":"head_influence_and_bounded_surface_coordinates",
     "key_relative_to":"Basis"}
  print("REAL_BLENDER_SOURCE_FACE_MORPH",path,actual[path],flush=True)
 if len(body.data.shape_keys.key_blocks)!=15:raise AssertionError("MORPH_ARCHIVE_COUNT_NOT_15")
 for name,val in original_keys:
  assert abs(body.data.shape_keys.key_blocks[name].value-val)<1e-8,"SOURCE_MORPH_DEFAULT_CHANGED"
 assert all(actual[k]["max_offset_mm"]<=9.2 for k in DEFAULTS),"FACE_MORPH_DISPLACEMENT_TOO_LARGE"
 assert all(actual[k]["changed_source_vertices"]>30 for k in DEFAULTS),"FACE_REGION_MORPH_EMPTY"
 body.data.update()
 return actual,NAMES
