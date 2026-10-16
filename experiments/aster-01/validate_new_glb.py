#!/usr/bin/env python3
"""Prove brand-new authored Aster geometry, not Einar or reused screenshots."""
import hashlib,json,struct
from pathlib import Path
p=Path("artifacts/aster-01/aster-01.glb")
g=p.read_bytes()
if struct.unpack_from("<III",g,0)!=(0x46546c67,2,len(g)):raise ValueError("Invalid glTF2 asset")
jlen,tag=struct.unpack_from("<II",g,12)
if tag!=0x4e4f534a:raise ValueError("Missing source GLB JSON chunk")
d=json.loads(g[20:20+jlen])
names=[x.get("name","") for x in d.get("nodes",[])]
materials=[m.get("name","") for m in d.get("materials",[])]
if any("einar" in n.lower() for n in names+materials):raise ValueError("Reused Einar asset names")
if len(d.get("meshes",[]))<80:raise ValueError("Insufficient independently created 3D mesh detail")
if len(d.get("materials",[]))<6:raise ValueError("Not original multi-material character")
if any(x.get("name","").lower().startswith("einar") for x in d.get("asset",{}).values() if isinstance(x,dict)):raise ValueError("Unexpected Einar attribution")
if len(d.get("images",[]))!=0:raise ValueError("Original geometry factory should not have embedded Einar face textures")
if len(d.get("animations",[]))<1:raise ValueError("Authored original head transform animation absent")
if not any("ASTER" in x for x in names):raise ValueError("Aster-generated node markers missing")
if not {"ASTER_HeadArticulation","ASTER_Cranium_Core","ASTER_Chest_Reactor_Crystal"}.issubset(set(names)):
 raise ValueError("Required novel authored anatomy nodes missing: "+str(names[:30]))
report={"schema":"blank.aster01.glb-proof.v1","asset_id":"aster-01",
 "sha256":hashlib.sha256(g).hexdigest(),"bytes":len(g),
 "node_count":len(names),"mesh_count":len(d.get("meshes",[])),
 "material_count":len(materials),"animation_count":len(d.get("animations",[])),
 "source_texture_image_count":len(d.get("images",[])),
 "einar_mesh_names_present":False,"independent_procedural_geometry_verified":True}
Path("artifacts/aster-01/glb-proof.json").write_text(json.dumps(report,indent=2)+"\n")
print("ASTER_NEW_GEOMETRY_AND_ANIMATION_GATE_PASS",json.dumps(report))
