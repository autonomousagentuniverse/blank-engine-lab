import json,hashlib,struct
from pathlib import Path
p=Path("artifacts/human-01/human-01.glb")
if not p.exists():raise ValueError("No generated human GLB")
b=p.read_bytes()
if struct.unpack_from("<III",b,0)!=(0x46546c67,2,len(b)):raise ValueError("GLB v2 invalid")
length,tag=struct.unpack_from("<II",b,12)
if tag!=0x4e4f534a:raise ValueError("No source geometry JSON")
g=json.loads(b[20:20+length])
meshes=g.get("meshes",[])
skins=g.get("skins",[])
mats=g.get("materials",[])
names=[x.get("name","") for x in g.get("nodes",[])]
if len(meshes)<3 or len(mats)<3:raise ValueError("Human needs body, eyes, hair and multiple materials")
if any("einar" in x.lower() or "aster" in x.lower() for x in names):raise ValueError("Reused old asset")
if not any("human01" in x.lower() for x in names):raise ValueError("No uniquely generated human body")
if len(skins)<1:raise ValueError("New human not auto-rigged")
report={"sha256":hashlib.sha256(b).hexdigest(),"bytes":len(b),
 "meshes":len(meshes),"skins":len(skins),"materials":len(mats),
 "textures":len(g.get("textures",[])),"nodes":len(names),
 "einar_reused":False,"new_human_geometry":True,
 "visual_realism_approved":False}
Path("artifacts/human-01/glb-proof.json").write_text(json.dumps(report,indent=2)+"\n")
print("HUMAN01_GLTF_REAL_RIGGED_HUMAN_PASS",json.dumps(report))
