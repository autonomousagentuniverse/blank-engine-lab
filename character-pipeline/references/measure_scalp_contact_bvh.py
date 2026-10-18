#!/usr/bin/env python3
"""Measure actual scalp-triangle proximity for each procedural hair root in Blender."""
import bpy, hashlib, json, pathlib, statistics
from mathutils import Vector
from mathutils.bvhtree import BVHTree
SRC=pathlib.Path("source/afro_woman_darkskin_medium_build_final.blend")
EXPECTED="26fbbab775771a197482d7baffb89decbbf4f821dd3cfaa69fac28ee52e1fc2a"
OUT=pathlib.Path("artifacts/semantic-scalp-bvh")
OUT.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def q(a,x):
    a=sorted(a);at=(len(a)-1)*x;i=int(at);f=at-i
    return round(a[i]*(1-f)+a[min(i+1,len(a)-1)]*f,3)
assert sha(SRC)==EXPECTED
bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
assert len(body.data.vertices)==19158
copy=body.copy();copy.data=body.data.copy()
bpy.context.scene.collection.objects.link(copy)
for mod in list(copy.modifiers): copy.modifiers.remove(mod)
bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get()
ev=copy.evaluated_get(dg)
mesh=ev.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
try:
    assert len(mesh.vertices)==len(body.data.vertices)
    verts=[ev.matrix_world@v.co for v in mesh.vertices]
finally:ev.to_mesh_clear()
bpy.data.objects.remove(copy,do_unlink=True)
scalp=body.vertex_groups["scalp"]
ids=set()
for v in body.data.vertices:
    try:
        if scalp.weight(v.index)>=.5: ids.add(v.index)
    except RuntimeError:pass
assert len(ids)==376
polys=[tuple(p.vertices) for p in body.data.polygons if len(p.vertices)>=3 and all(i in ids for i in p.vertices)]
assert len(polys)>10,("NO_REAL_SCALP_FACES",len(polys))
bvh=BVHTree.FromPolygons(verts,polys,all_triangles=False)
hair=[o for o in bpy.data.objects if o.type=="CURVE" and o.name.startswith("Natural_Afro_Coils_")]
roots=[]
for o in hair:
    for s in o.data.splines:
        if s.points:roots.append(o.matrix_world@Vector(s.points[0].co[:3]))
assert len(roots)==4450
values=[]; signed=[]
for root in roots:
    loc,norm,idx,dist=bvh.find_nearest(root)
    assert loc is not None and norm is not None
    values.append(dist*1000)
    signed.append(dist*1000*(1 if (root-loc).dot(norm)>=0 else -1))
d={"schema":"blank.anatomy.scalp-bvh.v1","source_sha256":EXPECTED,
   "blender_version":bpy.app.version_string,"mesh_vertices":len(verts),
   "scalp_marked_vertices":len(ids),"scalp_triangulated_face_candidates":len(polys),
   "hair_roots":len(roots),
   "root_to_scap_surface_distance_mm":{"p05":q(values,.05),"p50":q(values,.5),
     "p95":q(values,.95),"max":round(max(values),3),"fraction_over_5mm":round(sum(v>5 for v in values)/len(values),4),
     "fraction_over_10mm":round(sum(v>10 for v in values)/len(values),4)},
   "oriented_local_signed_distance_mm":{"p05":q(signed,.05),"p50":q(signed,.5),"p95":q(signed,.95),
     "fraction_inside_surface":round(sum(v<0 for v in signed)/len(signed),4),
     "sign_qualification":"Surface normal orientation may differ locally and is NOT a watertight signed-distance test"},
   "conditions":["Single scalp face mask, original source re-evaluated shape keys, no modifiers or pose","Root must be physically anchored to scalp, not merely within coarse hair volume","Face-mask boundary excludes topological rings not entirely scalp-labeled"],
   "true_follicle_attachment_proven":False,"photorealism_approved":False,"source_modified":False}
(OUT/"scalp-triangle-contact.json").write_text(json.dumps(d,indent=2)+"\n")
assert sha(SRC)==EXPECTED
print("BLENDER_REAL_SCALP_BVH",json.dumps(d),flush=True)
