#!/usr/bin/env python3
"""Read-only Blender inventory of official Einar rig, textures and components.

Metadata only: does not alter or export Blender source, and does not certify
photorealism. Packed image presence is measured separately from node references.
"""
import bpy,json,traceback,re
from pathlib import Path
OUT=Path("artifacts/hero-v3-einar")
audit=json.loads((OUT/"archive-audit.json").read_text())
result={"schema":"blank.hero-v3.einar-model-audit.v1","publisher_source_sha256":audit["archive_sha256"],
        "source_files":[],"human_visual_approval":"BLOCKED","threejs_render_verified":False,
        "real_android_perf_verified":False,"glb_converted":False}
paths=[Path(x["path"]) for x in audit.get("extracted_for_inspection",[])]
if not paths:
 result["status"]="BLOCKED_NO_SOURCE_BLEND"
 (OUT/"model-audit.json").write_text(json.dumps(result,indent=2)+"\n")
 print("EINAR_NO_BLEND_CANNOT_AUDIT_RIG")
 raise SystemExit(0)
for path in paths:
 row={"source":str(path),"status":"not_loaded"}
 try:
  bpy.ops.wm.open_mainfile(filepath=str(path.resolve()),load_ui=False)
  meshes=[o for o in bpy.data.objects if o.type=="MESH"]
  rigs=[o for o in bpy.data.objects if o.type=="ARMATURE"]
  imag=list(bpy.data.images)
  mats=list(bpy.data.materials)
  keys=[(o, list(o.data.shape_keys.key_blocks)) for o in meshes if o.data.shape_keys]
  eyeobjs=[o for o in meshes if re.search(r"eye|iris|cornea|sclera|lid|lash|brow|tear",o.name,re.I)]
  row.update({"status":"loaded","blender_version":bpy.app.version_string,
    "object_count":len(bpy.data.objects),"mesh_count":len(meshes),"armature_count":len(rigs),
    "armatures":[{"name":o.name,"bones":len(o.data.bones),
       "eye_or_face_bones":[b.name for b in o.data.bones if re.search(r"eye|lid|brow|face|jaw|tongue",b.name,re.I)][:55]} for o in rigs[:12]],
    "mesh_faces_total":sum(len(o.data.polygons) for o in meshes),
    "mesh_vertices_total":sum(len(o.data.vertices) for o in meshes),
    "large_meshes":[{"name":o.name,"polygons":len(o.data.polygons),"vertices":len(o.data.vertices),
       "uv_layers":len(o.data.uv_layers),
       "armature_deformer":any(mod.type=="ARMATURE" for mod in o.modifiers),
       "shape_keys":list(o.data.shape_keys.key_blocks.keys())[:60] if o.data.shape_keys else []}
       for o in sorted(meshes,key=lambda o:len(o.data.polygons),reverse=True)[:28]],
    "eye_related_meshes":[{"name":o.name,"faces":len(o.data.polygons),"uv_layers":len(o.data.uv_layers)}
        for o in eyeobjs[:85]],
    "shape_keyed_mesh_count":len(keys),
    "face_or_blink_shape_keys":[{"mesh":o.name,"keys":[k.name for k in ks if re.search(r"eye|blink|lid|squint|brow|gaze",k.name,re.I)][:50]}
        for o,ks in keys if any(re.search(r"eye|blink|lid|squint|brow|gaze",k.name,re.I) for k in ks)][:30],
    "images_count":len(imag),
    "images_packed_count":sum(bool(i.packed_file) for i in imag),
    "image_examples":[{"name":i.name,"path":i.filepath[:300],"size":list(i.size),"packed":bool(i.packed_file)}
        for i in imag[:65]],
    "materials_count":len(mats),
    "materials_with_images":[{"name":m.name,"image_node_count":sum(n.type=="TEX_IMAGE" for n in m.node_tree.nodes)}
        for m in mats if m.use_nodes and m.node_tree and any(n.type=="TEX_IMAGE" for n in m.node_tree.nodes)][:75],
    "action_count":len(bpy.data.actions),
    "action_names":[a.name for a in list(bpy.data.actions)[:50]],
    "library_links":[{"name":x.name,"filepath":x.filepath} for x in bpy.data.libraries][:30]})
 except Exception as e:
  row["status"]="load_failed";row["error"]=type(e).__name__+" "+str(e)[:500]
 result["source_files"].append(row)
 (OUT/"model-audit.json").write_text(json.dumps(result,indent=2)+"\n")
 print("EINAR_MODEL_AUDIT",json.dumps({k:row.get(k) for k in ("source","status","mesh_count","armature_count","images_count","images_packed_count","shape_keyed_mesh_count","action_count","error")}))
result["status"]="BLENDER_CONTENT_INVENTORY_COMPLETE" if any(x["status"]=="loaded" for x in result["source_files"]) else "BLOCKED_MODEL_LOAD"
(OUT/"model-audit.json").write_text(json.dumps(result,indent=2)+"\n")
print("EINAR_MODEL_SOURCE_GATE "+result["status"])
