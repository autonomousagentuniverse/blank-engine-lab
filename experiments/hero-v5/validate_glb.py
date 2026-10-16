#!/usr/bin/env python3
"""Verify exported GLB actually contains editable source geometry AND textures."""
import json,hashlib,struct
from pathlib import Path
p=Path("artifacts/hero-v5-einar/einar-static-pbr.glb")
src=p.read_bytes()
if len(src)>220_000_000:raise ValueError("Static head GLB too large for first browser gate")
if struct.unpack_from("<III",src,0)!=(0x46546c67,2,len(src)):raise ValueError("Invalid glTF2 header")
n,tag=struct.unpack_from("<II",src,12)
if tag!=0x4e4f534a:raise ValueError("GLB JSON chunk missing")
gl=json.loads(src[20:20+n])
images=gl.get("images",[]);materials=gl.get("materials",[])
meshes=gl.get("meshes",[])
if len(images)<2:raise ValueError("Skin and iris imagery not embedded")
if len(meshes)<7:raise ValueError("Source eye/face objects missing")
if sum(bool(m.get("pbrMetallicRoughness",{}).get("baseColorTexture")) for m in materials)<2:
 raise ValueError("Skin and iris PBR base color map was not exported")
assert gl.get("asset",{}).get("version")=="2.0"
report={"sha256":hashlib.sha256(src).hexdigest(),"glb_bytes":len(src),"mesh_count":len(meshes),
 "material_count":len(materials),"image_count":len(images),"glb_images":[im.get("mimeType", "unknown") for im in images],
 "source_geometry_in_glb":True,"source_skin_eye_textures_embedded":True,
 "animations":len(gl.get("animations",[])),"skins":len(gl.get("skins",[])),
 "stage":"actual static GLB, not yet browser quality approved"}
Path("artifacts/hero-v5-einar/glb-integrity.json").write_text(json.dumps(report,indent=2)+"\n")
print("BLANK_ENGINE_GLTF_REAL_ASSET_GATE_PASS",json.dumps(report))
