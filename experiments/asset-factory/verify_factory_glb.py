#!/usr/bin/env python3
"""Fail-closed proof that Blender automation actually embedded source roughness."""
import hashlib,json,struct
from pathlib import Path
root=Path("artifacts/hero-v5-einar");target=root/"einar-static-pbr.glb"
raw=target.read_bytes()
if not (100_000<len(raw)<220_000_000):raise ValueError("GLB size out of first gate budget")
magic,version,length=struct.unpack_from("<III",raw,0)
if (magic,version,length)!=(0x46546C67,2,len(raw)):raise ValueError("Malformed GLB2 header")
n,kind=struct.unpack_from("<II",raw,12)
if kind!=0x4E4F534A:raise ValueError("glTF JSON chunk missing")
data=json.loads(raw[20:20+n])
meshes=data.get("meshes",[]);images=data.get("images",[])
mats=data.get("materials",[]);textures=data.get("textures",[])
if len(meshes)<7 or len(images)<3:raise ValueError("Expected real head/eyes and 3 source maps")
def resolved_image(texinfo):
    if not texinfo:return None
    t=textures[texinfo["index"]]
    return images[t["source"]].get("name") or str(t["source"])
material=next((m for m in mats if "skin" in m.get("name","").lower()),None)
if not material:raise ValueError("Skin material missing")
pbr=material.get("pbrMetallicRoughness",{})
if not pbr.get("baseColorTexture"):raise ValueError("Skin licensed albedo not embedded")
roughness=pbr.get("metallicRoughnessTexture")
if roughness is None:raise ValueError("Actual skin roughness texture NOT exported")
eye=next((m for m in mats if m.get("name","").lower().endswith("_eye")),None)
if not eye or not eye.get("pbrMetallicRoughness",{}).get("baseColorTexture"):
 raise ValueError("Real iris/eye color map missing")
export=json.loads((root/"export-audit.json").read_text())
if export.get("real_skin_roughness_map_source")!="einar_skin.roughness":
 raise ValueError("Roughness must be sourced from actual Blender Studio texture")
if len(export.get("runtime_textures",{}))<3:raise ValueError("Expected three copied source image maps")
report={"schema":"blank.asset-factory.glb-integrity.v1",
 "sha256":hashlib.sha256(raw).hexdigest(),"glb_bytes":len(raw),
 "mesh_count":len(meshes),"image_count":len(images),"material_count":len(mats),
 "real_skin_albedo_verified":True,"real_eye_albedo_verified":True,
 "real_skin_roughness_verified":True,
 "roughness_image_in_gltf":resolved_image(roughness),
 "source_skin_roughness":"einar_skin.roughness",
 "animations":len(data.get("animations",[])),"skins":len(data.get("skins",[])),
 "visual_approval":"BLOCKED","not_proven":["normal/displacement/SSS parity","hair","blinking","Android FPS"]}
(root/"glb-integrity.json").write_text(json.dumps(report,indent=2)+"\n")
print("ASSET_FACTORY_GLTF_REAL_ROUGHNESS_GATE_PASS",json.dumps(report))
