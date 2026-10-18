#!/usr/bin/env python3
"""Inspect actual source head coordinates and region weights before authoring deforms."""
import bpy,json,pathlib,hashlib,collections
import numpy as np
from mathutils import Vector
src=pathlib.Path("source/afro_mask_respected_uv_pbr.blend")
sha="a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570"
assert hashlib.sha256(src.read_bytes()).hexdigest()==sha
bpy.ops.wm.open_mainfile(filepath=str(src.resolve()),load_ui=False)
body=bpy.data.objects["AFRO_WOMAN_MASK_RESPECTED"]
assert len(body.data.vertices)==10756
coords=np.array([tuple(body.matrix_world@v.co) for v in body.data.vertices])
# Anatomical head fractions by z plus rigid 'head' skeleton group influences
names=[g.name for g in body.vertex_groups]
print("VERTEX_GROUP_NAMES",json.dumps([x for x in names if any(k in x.lower() for k in ("head","neck","jaw","face","chin","eye","spine","shoulder"))]),flush=True)
def summary(idx):
 if not len(idx):return {"n":0}
 c=coords[idx]
 return {"n":len(idx),"xyz_min":c.min(0).round(5).tolist(),"xyz_max":c.max(0).round(5).tolist(),
         "xyz_median":np.median(c,axis=0).round(5).tolist()}
print("WHOLE_BODY_RANGE",json.dumps(summary(np.arange(len(coords)))),flush=True)
for name in ["head","neck","spine_03"]:
 g=body.vertex_groups.get(name)
 if not g:continue
 ids=np.array([v.index for v in body.data.vertices if any(a.group==g.index and a.weight>.1 for a in v.groups)],dtype=int)
 print("GROUP_REGION",json.dumps({"name":name,"range":summary(ids)}),flush=True)
for cut in [1.35,1.45,1.52,1.56,1.60,1.64,1.68,1.72,1.76,1.80]:
 sel=np.where((coords[:,2]>cut-.01)&(coords[:,2]<=cut+.01))[0]
 print("HEIGHT_CROSS_SECTION",json.dumps({"z_center":cut,"range":summary(sel)}),flush=True)
# One scalar reveals which side of face points in camera forward direction.
camera=bpy.data.objects["CAM_face_closeup"];forward=camera.matrix_world.to_quaternion()@Vector((0,0,-1))
print("FACE_CAMERA_DIRECTION",json.dumps({"cam_xyz":list(camera.location),"forward_xyz":list(forward)}),flush=True)
keys=body.data.shape_keys.key_blocks
print("EXISTING_SHAPE_KEYS",json.dumps([{"name":x.name,"value":x.value} for x in keys]),flush=True)
assert hashlib.sha256(src.read_bytes()).hexdigest()==sha
