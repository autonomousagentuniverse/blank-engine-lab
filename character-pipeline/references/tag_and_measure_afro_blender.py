#!/usr/bin/env python3
"""Deterministic provisional body semantic tagging and metrics in Blender 4.5.3.

DOES NOT label proxy widths as certified ANSUR anatomical breadths.
Source .blend is SHA-pinned, never overwritten; creates sidecar and editable copy.
"""
import bpy, hashlib, json, math, pathlib, statistics
from mathutils import Vector
from mathutils.kdtree import KDTree

SRC=pathlib.Path("source/afro_woman_darkskin_medium_build_final.blend")
EXPECTED="26fbbab775771a197482d7baffb89decbbf4f821dd3cfaa69fac28ee52e1fc2a"
OUT=pathlib.Path("artifacts/semantic-tags")
OUT.mkdir(parents=True,exist_ok=True)
BODY="AFRO_WOMAN_28_Medium_Build"

def digest(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for x in iter(lambda:f.read(1024*1024),b""): h.update(x)
    return h.hexdigest()
def pctl(a,q):
    if not a:return None
    a=sorted(a);f=(len(a)-1)*q;i=int(f);return a[i]*(1-(f-i))+a[min(i+1,len(a)-1)]*(f-i)
def three(x):return round(float(x),3)
def weightmap(obj,v):
    return {obj.vertex_groups[item.group].name:item.weight for item in v.groups}
def do():
    assert digest(SRC)==EXPECTED
    bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
    body=bpy.data.objects[BODY]
    rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
    assert len(body.data.vertices)==19158 and len(rig.data.bones)==53
    # A temporary duplicate forces Blender to evaluate all body shape keys
    # without MakeHuman garment masks, armature pose or topology-changing modifiers.
    # This keeps source-vertex indexing and is explicitly a REST pose surface audit.
    probe=body.copy()
    probe.data=body.data.copy()
    bpy.context.scene.collection.objects.link(probe)
    for mod in list(probe.modifiers):
        probe.modifiers.remove(mod)
    bpy.context.view_layer.update()
    e=probe.evaluated_get(bpy.context.evaluated_depsgraph_get())
    em=e.to_mesh(preserve_all_data_layers=False,depsgraph=bpy.context.evaluated_depsgraph_get())
    try:
        assert len(em.vertices)==len(body.data.vertices),"SHAPEKEY_INDEX_MAPPING_UNVERIFIED"
        coords=[e.matrix_world @ v.co for v in em.vertices]
    finally:e.to_mesh_clear()
    bpy.data.objects.remove(probe,do_unlink=True)
    xs=[v.x for v in coords]; zs=[v.z for v in coords]
    base=[body.matrix_world@v.co for v in body.data.vertices]
    deformations=[(a-b).length for a,b in zip(coords,base)]
    bone=rig.data.bones
    z=lambda b,part: (rig.matrix_world @ getattr(bone[b],part)).z
    levels={
      "hip":(z("thigh_l","head_local")+z("thigh_r","head_local"))/2+.03,
      "waist":(z("spine_01","head_local")+z("spine_03","head_local"))/2,
      "chest":z("spine_03","tail_local")-.015
    }
    include={"pelvis","spine_01","spine_02","spine_03"}
    exclude_arm={f"{x}_{side}" for x in ("upperarm","lowerarm","hand","clavicle") for side in "lr"}
    exclude_leg={f"{x}_{side}" for x in ("thigh","calf","foot") for side in "lr"}
    tagged={}
    samples={}
    for name,z0 in levels.items():
        # Weight-dominant torso with inner cutoff on the exact rest-pose mesh,
        # NOT a generic all-vertex Z slice. Still a proxy pending clinical markers.
        band=.018 if name!="chest" else .022
        ids=[]
        for v in body.data.vertices:
            w=weightmap(body,v)
            if w.get("body",0)<.5:continue
            tw=sum(w.get(k,0) for k in include)
            aw=sum(w.get(k,0) for k in exclude_arm)
            lw=sum(w.get(k,0) for k in exclude_leg)
            if tw<.42 or aw>.15 or lw>.25 or tw<1.5*(aw+lw):continue
            if abs(coords[v.index].z-z0)>band:continue
            ids.append(v.index)
        tag=f"BLANK_PROVISIONAL_{name.upper()}_TORSO"
        if body.vertex_groups.get(tag):raise RuntimeError("PREEXISTING_GROUP"+tag)
        if ids:
            body.vertex_groups.new(name=tag).add(ids,1.0,"REPLACE")
        valid=len(ids)>=24 and sum(coords[i].x<0 for i in ids)>=8 and sum(coords[i].x>0 for i in ids)>=8
        widths=sorted([coords[i].x for i in ids])
        samples[name]={"center_z_m":three(z0),"band_m":band,
            "candidate_tag":tag,"vertex_count":len(ids),
            "status":"RIG_GUIDED_TORSO_PROXY_UNCERTIFIED" if valid else "REJECTED_INSUFFICIENT_SEMANTIC_SUPPORT",
            "x_span_mm":three(1000*(widths[-1]-widths[0])) if valid else None,
            "p01_p99_span_mm":three(1000*(pctl(widths,.99)-pctl(widths,.01))) if valid else None,
            "reference_comparison":"BLOCKED_DIFFERENT_MEASUREMENT_PROTOCOL"}
        tagged[tag]=ids
    # Label existing preauthored face/scalp feature groups but DO NOT
    # assign individual eye/lip/canthus landmarks using heuristics.
    for source,target in [("scalp","BLANK_PROVISIONAL_SCALP"),
                          ("lips","BLANK_PROVISIONAL_LIP_REGION"),
                          ("ears","BLANK_PROVISIONAL_EARS")]:
        g=body.vertex_groups.get(source)
        assert g is not None,"MISSING_ORIGINAL_SEMANTIC_GROUP_"+source
        ids=[]
        for v in body.data.vertices:
            try:
                if g.weight(v.index)>=.5: ids.append(v.index)
            except RuntimeError:pass
        assert len(ids)>100,(source,len(ids))
        assert body.vertex_groups.get(target) is None
        body.vertex_groups.new(name=target).add(ids,1.0,"REPLACE")
        tagged[target]=ids
    # Distances between scalp verts and actual procedural ROOTs (unsigned
    # nearest VERTEX, not signed scalp surface clearance or follicle fit).
    scl=[coords[i] for i in tagged["BLANK_PROVISIONAL_SCALP"]]
    kd=KDTree(len(scl))
    for i,v in enumerate(scl): kd.insert(v,i)
    kd.balance()
    hairs=[o for o in bpy.data.objects if o.type=="CURVE" and o.name.startswith("Natural_Afro_Coils_")]
    roots=[]
    for o in hairs:
        for sp in o.data.splines:
            if sp.points: roots.append(o.matrix_world@Vector(sp.points[0].co[:3]))
    assert len(roots)==4450,("ROOT_COUNT_MISMATCH",len(roots))
    d=[1000*(kd.find(v)[0]-v).length for v in roots]
    near={"roots":len(roots),"scalp_vertices":len(scl),
          "p05_mm":three(pctl(d,.05)),"p50_mm":three(pctl(d,.50)),
          "p95_mm":three(pctl(d,.95)),"max_mm":three(max(d)),
          "metric":"UNSIGNED_NEAREST_SCALP_VERTEX_PROXY",
          "true_follicle_attachments_certified":False,
          "scalp_anatomical_region_manually_reviewed":False}
    # anatomical named endpoints from the actual rig: joint proxy only.
    cl=(rig.matrix_world@bone["clavicle_l"].tail_local)
    cr=(rig.matrix_world@bone["clavicle_r"].tail_local)
    spine=(rig.matrix_world@bone["spine_01"].head_local)
    report={
      "schema":"blank.anatomy.provisional-tags.v1",
      "source_sha256":EXPECTED,"source_unmodified":True,
      "blender_version":bpy.app.version_string,
      "rest_pose_vertices":len(coords),"rig_bones":len(bone),
      "shape_key_displacement_mm":{"p50":three(pctl(deformations,.5)*1000),
        "p95":three(pctl(deformations,.95)*1000),"max":three(max(deformations)*1000)},
      "global_body_surface_bbox_height_mm_NOT_STATURE":three(1000*(max(zs)-min(zs))),
      "torso_regions":samples,
      "scalp_hair":near,
      "rig_endpoints":{"clavicle_tail_span_mm_NOT_ACROMIAL_BREADTH":three(1000*(cl-cr).length),
                       "spine01_head_z_m":three(spine.z)},
      "facial_landmarks":{"enL":None,"enR":None,"alL":None,"alR":None,
                           "zyL":None,"zyR":None,"chL":None,"chR":None},
      "unmeasured":{"true_biacromial_breadth":True,"waist_circumference":True,
                    "hip_circumference":True,"palpebral_fissure":True,
                    "tearline_clearance":True,"mouth_seal":True},
      "source_photo_3d_same_identity":False,
      "semantic_tags_are_provisional":True,"manual_anatomical_validation":False,
      "ready_for_one_shot":False,"photorealism_approved":False,"release_allowed":False}
    # Input mesh is immutable, only derivative copy gets vertex group tags.
    dst=OUT/"afro_woman_semantic_provisional.blend"
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(dst.resolve()),compress=True,copy=True,check_existing=False)
    assert dst.is_file() and dst.stat().st_size>1000000
    assert digest(SRC)==EXPECTED,"SOURCE_MODIFIED"
    report["derivative_blend_sha256"]=digest(dst)
    report["derivative_bytes"]=dst.stat().st_size
    dest=OUT/"provisional-tag-measures.json"
    dest.write_text(json.dumps(report,indent=2)+"\n")
    print("PROVISIONAL_TORSO_GEOMETRY",json.dumps(samples),flush=True)
    print("SCALP_VERTEX_PROXY",json.dumps(near),flush=True)
    print("TAGGED_BLEND_SHA",report["derivative_blend_sha256"],flush=True)
    print("PHOTOREAL_AND_STATISTICAL_ANATOMY_APPROVAL_BLOCKED",flush=True)
if __name__=="__main__":
    do()
