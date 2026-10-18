#!/usr/bin/env python3
"""Audit source MPFB shape-key deltas inside vs outside clothing MASK set.

Read only the SHA-pinned full source .blend. Confirm whether WebGL's zero-delta
visible morph channels are legitimately zero in the original Blender data.
"""
import bpy,hashlib,math,json,pathlib
SRC=pathlib.Path("source/afro_skinbound_uv_pbr.blend")
SHA="f903f4412bab7d29bdad85c31d21e576b1a6b3fbcbca8daf13c9e17dc5715fdb"
OUT=pathlib.Path("artifacts/afro-visible-morph-forensic");OUT.mkdir(parents=True,exist_ok=True)
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
assert sha(SRC)==SHA
bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
body=bpy.data.objects["AFRO_WOMAN_28_Medium_Build"]
keys=body.data.shape_keys.key_blocks
assert len(keys)==12
keep=set(range(len(body.data.vertices)))
for mod in body.modifiers:
 if mod.type!="MASK":continue
 group=body.vertex_groups[mod.vertex_group]
 ids={v.index for v in body.data.vertices if any(w.group==group.index and w.weight>0 for w in v.groups)}
 keep=(keep-ids if mod.invert_vertex_group else keep&ids)
assert len(keep)==10756
outside=set(range(len(body.data.vertices)))-keep
base=keys[0]
measure=[]
for index,key in enumerate(keys):
 if index==0:continue
 def norm(a,b):
  d=a-b
  return d.length
 differences_visible=[norm(key.data[i].co,base.data[i].co) for i in keep]
 differences_hidden=[norm(key.data[i].co,base.data[i].co) for i in outside]
 relative_visible=[norm(key.data[i].co,key.relative_key.data[i].co) for i in keep]
 entry={
  "target_index":index-1,"shape_key":key.name,"source_default_weight":key.value,
  "visible_max_delta_mm":round(max(differences_visible)*1000,6),
  "hidden_max_delta_mm":round(max(differences_hidden)*1000,6),
  "visible_max_delta_from_relative_key_mm":round(max(relative_visible)*1000,6),
  "visible_vertices_with_basis_delta_over_0.001mm":sum(d>.000001 for d in differences_visible),
  "key_relative_to":key.relative_key.name,
  "zero_visible_basis_delta":max(differences_visible)<.000001
 }
 measure.append(entry)
 print("SOURCE_MORPH_MASK_EFFECT",json.dumps(entry),flush=True)
r={
 "schema":"blank.engine.original-morph-masked-region.v1",
 "blender":bpy.app.version_string,"source_sha256":SHA,"source_unmodified":True,
 "original_vertices":len(body.data.vertices),"visible_vertices":len(keep),
 "removed_vertices":len(outside),"target_count":len(measure),
 "morph_source_comparison":measure,
 "inert_visible_target_indices":[e["target_index"] for e in measure if e["zero_visible_basis_delta"]],
 "no_source_changes":True,
 "photorealism_approved":False,
 "note":"Compares source shape-key control point positions, not morphed human photorealism or WebGL render fidelity"}
(OUT/"source-masked-morph-deltas.json").write_text(json.dumps(r,indent=2)+"\n")
assert sha(SRC)==SHA
print("SOURCE_MASK_MORPH_CLASSIFICATION",json.dumps(r["inert_visible_target_indices"]),flush=True)
