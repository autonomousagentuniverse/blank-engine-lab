#!/usr/bin/env python3
"""Read-only forensics of a pinned Afro woman .blend in the real Blender runtime."""
import bpy, json, hashlib, pathlib, sys
from mathutils import Vector
OUT=pathlib.Path("artifacts/semantic-anatomy")
OUT.mkdir(parents=True,exist_ok=True)
SRC=pathlib.Path("source/afro_woman_darkskin_medium_build_final.blend")
EXPECTED="26fbbab775771a197482d7baffb89decbbf4f821dd3cfaa69fac28ee52e1fc2a"
def digits(x):return round(float(x),5)
def xyz(v):return [digits(t) for t in v]
def calc():
    assert SRC.is_file()
    h=hashlib.sha256(SRC.read_bytes()).hexdigest()
    assert h==EXPECTED,("SOURCE_HASH_MISMATCH",h)
    bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
    body=bpy.data.objects.get("AFRO_WOMAN_28_Medium_Build")
    assert body and body.type=="MESH"
    armatures=[x for x in bpy.data.objects if x.type=="ARMATURE"]
    assert len(armatures)==1
    rig=armatures[0]
    vs=[body.matrix_world@v.co for v in body.data.vertices]
    n=len(vs)
    sk=body.data.shape_keys
    key_records=[{"name":k.name,"value":digits(k.value),"vertex_count":len(k.data)} for k in sk.key_blocks] if sk else []
    bounds={"min":xyz([min(v[j] for v in vs) for j in range(3)]),"max":xyz([max(v[j] for v in vs) for j in range(3)])}
    bones=[]
    for b in rig.data.bones:
        mat=rig.matrix_world
        head=mat@b.head_local;tail=mat@b.tail_local
        bones.append({"name":b.name,"parent":b.parent.name if b.parent else None,
           "head":xyz(head),"tail":xyz(tail),"length_mm":digits((tail-head).length*1000)})
    group_count={}
    for g in body.vertex_groups:
        vals=[]
        for v in body.data.vertices:
            for wg in v.groups:
                if wg.group==g.index:
                    vals.append(wg.weight)
                    break
        group_count[g.name]={"total_vertices_any_weight":len(vals),
             "vertices_at_least_half_weight":sum(t>=.5 for t in vals),
             "median_weight":digits(sorted(vals)[len(vals)//2]) if vals else None}
    zlo=min(v.z for v in vs);zhi=max(v.z for v in vs)
    slices={}
    for fraction in [.43,.49,.61,.75,.8,.9]:
        s=[v for v in vs if abs((v.z-zlo)/(zhi-zlo)-fraction)<.018]
        slices[str(fraction)]={"sample_count":len(s),
             "horizontal_extent_mm_NOT_BREADTH":digits((max(v.x for v in s)-min(v.x for v in s))*1000) if s else None}
    other=[{"name":o.name,"type":o.type,"parent":o.parent.name if o.parent else None,
            "hide_render":bool(o.hide_render),
            "vertex_count":len(o.data.vertices) if o.type=="MESH" else None}
           for o in bpy.data.objects]
    report={"schema":"blank.engine.semantic-forensic.v1","source_hash":h,
      "blender":bpy.app.version_string,"world_units":str(bpy.context.scene.unit_settings.system),
      "body":{"name":body.name,"mesh_verts":n,"matrix_world":[list(r) for r in body.matrix_world],
             "bounds":bounds,"vertex_groups":group_count,"shape_keys":key_records,
             "material_slots":[s.material.name if s.material else None for s in body.material_slots]},
      "rig":{"name":rig.name,"bone_count":len(bones),"bones":bones},
      "objects":other,"invalid_z_slice_extents":slices,
      "note":"No semantic landmark automatically certified; no original .blend mutated"}
    dest=OUT/"source-structure.json";dest.write_text(json.dumps(report,indent=2)+"\n")
    print("ANATOMY_STRUCTURE_SOURCE_VERIFIED",h,"body",n,"bones",len(bones),flush=True)
    print("RIG_BONES", json.dumps([{"name":x["name"],"head":x["head"],"tail":x["tail"]} for x in bones]),flush=True)
    print("VERTEX_GROUPS",json.dumps(group_count),flush=True)
    print("Z_SLICES_NOT_ANATOMY",json.dumps(slices),flush=True)
    print("SHAPE_KEYS",json.dumps(key_records),flush=True)
if __name__=="__main__":
    calc()
