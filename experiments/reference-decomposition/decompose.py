#!/usr/bin/env python3
"""Reference decomposition: authentic Einar Blender Studio audited metadata vs MIRA A packed Blender.
Genuine bpy inspection of MIRA A, pose-relative curve attachment probe. Never alter/release inputs.
"""
import bpy, json, gzip, hashlib, math, statistics, sys, os, traceback
from pathlib import Path
from mathutils import Vector

SOURCE=Path("reference/einar-source-graph.json.gz")
CANDIDATE=Path("reference/mira-a/complete_A.blend")
OUTPUT=Path("artifacts/human-reference-decomposition")
OUTPUT.mkdir(parents=True,exist_ok=True)
EINAR_SHA="1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b"
MIRA_SHA="9b57bc2aaa1ba0cfec213eb1035f517dfbcebf5fb43443cc85618f42bb39791e"

def sha(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
    return h.hexdigest()
def pick_objs(x,keywords):
    return [o for o in x if any(k in o["name"].lower() for k in keywords)]
def obj_report(o):
    return {"name":o.name,"type":o.type,"parent":o.parent.name if o.parent else None,
            "modifiers":[{"type":m.type,"name":m.name,"target":getattr(getattr(m,"object",None),"name",None)} for m in o.modifiers],
            "constraints":[{"type":c.type,"name":c.name} for c in o.constraints],
            "drivers":len(o.animation_data.drivers) if o.animation_data else 0,
            "vertex_groups":len(o.vertex_groups),
            "curve_count":len(o.data.splines) if o.type=="CURVE" else None,
            "mesh_vertices":len(o.data.vertices) if o.type=="MESH" else None,
            "shape_keys":len(o.data.shape_keys.key_blocks) if o.type=="MESH" and o.data.shape_keys else 0}
def world_root(o,sp):
    return o.matrix_world@Vector(sp.points[0].co[:3])
def probe_follow(obj,head):
    assert obj.type=="CURVE"
    indexes=list(range(0,len(obj.data.splines),max(1,len(obj.data.splines)//80)))[:80]
    initial=[world_root(obj,obj.data.splines[i]) for i in indexes]
    inverse=head.matrix_world.inverted_safe()
    local=[inverse@x for x in initial]
    start=head.location.copy()
    try:
        head.location.x+=.020
        bpy.context.view_layer.update()
        moved=[world_root(obj,obj.data.splines[i]) for i in indexes]
        expected=[head.matrix_world@v for v in local]
        actual=[(b-a).length for a,b in zip(initial,moved)]
        predicted=[(b-a).length for a,b in zip(initial,expected)]
        ratios=[act/pred if pred>1e-5 else None for act,pred in zip(actual,predicted)]
        ratios=[x for x in ratios if x is not None]
        return {"head_translation_m":.02,"sample_count":len(indexes),
                "actual_root_movement_median_mm":round(statistics.median(actual)*1000,5),
                "expected_if_bound_median_mm":round(statistics.median(predicted)*1000,5),
                "attachment_follow_ratio_median":round(statistics.median(ratios),6) if ratios else None,
                "measurement":"synthetic HEAD OBJECT translation, not a full articulated animation/blink test"}
    finally:
        head.location=start
        bpy.context.view_layer.update()
def inspect():
    assert SOURCE.is_file()
    src=json.loads(gzip.decompress(SOURCE.read_bytes()))
    assert src["blend_sha256"]==EINAR_SHA and src["source_unchanged"] is True
    assert sha(CANDIDATE)==MIRA_SHA,"candidate SHA mismatch"
    en_objs=src["objects"]
    head_ref=next(o for o in en_objs if o["name"]=="GEO-einar_head")
    src_eye=pick_objs(en_objs,["cornea","meniscus","plica","eye_sphere"])
    src_face_hair=pick_objs(en_objs,["eyelash","eyebrows","hair.proxy","hair.messy","hair_peach"])
    src_mats=src["facial_material_shader_graphs"]
    skin_ref=next(m for m in src_mats if m["name"]=="einar.skin")
    ref_rig=[r for r in src["rigs"] if r["name"]=="RIG-einar"]
    assert ref_rig and ref_rig[0]["bones"]>=700
    assert any("D_Blink_Upper" in x for x in head_ref["shape_keys"])
    assert any("meniscus" in x["name"].lower() for x in src_eye)
    assert any("SURFACE_DEFORM" in [m["type"] for m in x["modifiers"]] for x in src_face_hair)
    bpy.ops.wm.open_mainfile(filepath=str(CANDIDATE.resolve()),load_ui=False)
    head=bpy.data.objects.get("cm_vitruvian")
    assert head and head.type=="MESH"
    components={name:bpy.data.objects.get(name) for name in
                ("MIRA05_ActualScalpFibers","MIRA05_IndividualBrowStrands","MIRA05_SourceFittedLidContact")}
    assert all(components.values()),"Missing MIRA generator output"
    for o in components.values():
        assert o.type=="CURVE"
    mira={name:obj_report(o) for name,o in components.items()}
    probes={name:probe_follow(o,head) for name,o in components.items()}
    skin=bpy.data.materials.get("VitSkin")
    assert skin and skin.node_tree
    ks=head.data.shape_keys.key_blocks if head.data.shape_keys else []
    eyelid_keys=[k.name for k in ks if any(s in k.name.lower() for s in ("blink","closed","squint","lid"))]
    # Einar semantic dependencies are names/modifier edges taken from authenticated actual-source graph.
    ref={
        "source":"Official Blender Studio Einar v1, CC-BY, as a REALISM-ORIENTED reference (not validated photographic ground truth)",
        "blend_sha256":src["blend_sha256"],"license":"CC-BY Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
        "head_vertices":head_ref["vertices"],"head_faces":head_ref["faces"],
        "head_uv_layers":head_ref["uv_layers"],"head_shape_keys":len(head_ref["shape_keys"]),
        "blink_shape_keys":[k for k in head_ref["shape_keys"] if "Blink" in k],
        "skin_nodes":len(skin_ref["nodes"]),"skin_links":len(skin_ref["links"]),
        "skin_texture_nodes":sum(1 for n in skin_ref["nodes"] if "image" in n),
        "animation_rig_bones":ref_rig[0]["bones"],
        "eye_parts":[{"name":x["name"],"type":x["type"],"faces":x.get("faces"),
                      "modifiers":[m["type"] for m in x["modifiers"]]} for x in src_eye],
        "eyelash_hair_brow_bindings":[{"name":x["name"],"type":x["type"],
                      "modifiers":[m["type"] for m in x["modifiers"]],
                      "parent":x["parent"]} for x in src_face_hair],
        "graph_provenance":"Prior actual Blender 4.5.3 authenticated publisher source audit run 38992142171, NOT newly reopened source."
    }
    candidate={
        "source":"One-shot A/MIRA05 Vitruvian-derived CC0",
        "blend_sha256":sha(CANDIDATE),
        "head_vertices":len(head.data.vertices),"head_shape_keys":len(ks),
        "skin_nodes":len(skin.node_tree.nodes),"skin_links":len(skin.node_tree.links),
        "skin_texture_nodes":sum(1 for n in skin.node_tree.nodes if n.type=="TEX_IMAGE"),
        "eyelid_or_blink_shape_keys":eyelid_keys,
        "components":mira,"movement_follow_probes":probes,
        "skin_material_name":"VitSkin"
    }
    # Do not confuse lack of MIRA attachment-to-head-object with proof of ALL animation failure.
    gap={
        "eye_tearfilm_mesh":bool([x for x in src_eye if "meniscus" in x["name"].lower()]),
        "reference_has_separate_cornea":any("cornea" in x["name"].lower() for x in src_eye),
        "reference_face_eyelash_surface_deformation":any("SURFACE_DEFORM" in [m["type"] for m in x["modifiers"]]
                                                        for x in src_face_hair if "eyelash" in x["name"].lower()),
        "mira_curve_bindings_missing":all(not mira[n]["parent"] and not mira[n]["modifiers"]
                                         for n in mira),
        "mira_curve_head_translation_follow_zero":all(
           probes[n]["attachment_follow_ratio_median"]<.01 for n in probes),
        "not_proven":"Photorealism of Einar, causal sufficiency of these structures, complete rig animation failures, or anatomy accuracy of every mesh"
    }
    report={"schema":"blank.human.reference-decomposition.v1","reference":ref,"candidate":candidate,
            "structural_gaps":gap,"release_allowed":False,"new_human_generated":False,
            "comparability":"Different art style, gender, source rig and shading; compare construction patterns, not geometric quantities as quality scores."}
    (OUTPUT/"reference-vs-mira.json").write_text(json.dumps(report,indent=2)+"\n")
    lines=[
      "# Authenticated Blender reference vs MIRA05 — second-order human decomposition",
      "",
      "## Provenance and limits",
      "Real Blender Studio Einar CC-BY actual-source graph from run 38992142171; prior audited source, not newly reopened. "
      "Blender Studio describes Einar as its first attempt at a realistic character, not verified photographic ground truth. "
      "Comparison candidate is 2026-10-17 A single-shot CC0 Vitruvian-derived .blend re-opened and probed with Blender. "
      "No distributed publisher source/texture bytes; do not claim Einar is usable without license credit.",
      "",
      "## Reference structures observed",
      f"- Einar head: {head_ref['vertices']} verts, {len(head_ref['shape_keys'])} shape keys, {ref_rig[0]['bones']} animation bones, skin graph {len(skin_ref['nodes'])} nodes and {len(skin_ref['links'])} links.",
      f"- Einar eye layer meshes: {', '.join(x['name'] for x in src_eye)}.",
      "- Einar lashes and tear meniscus use SURFACE_DEFORM and/or SHRINKWRAP/ARMATURE modifiers; hair has Geometry Nodes/proxy/deform structures.",
      "",
      "## Measured MIRA-A limitations",
      f"- Candidate MIRA head: {len(head.data.vertices)} vertices, {len(ks)} shape keys; skin graph {len(skin.node_tree.nodes)} nodes and {len(skin.node_tree.links)} links.",
      *[f"- {name}: {mira[name]['curve_count']} splines, parent={mira[name]['parent']}, modifiers={len(mira[name]['modifiers'])}; "
        f"moving the head object 20mm gives observed root motion {probes[name]['actual_root_movement_median_mm']}mm "
        f"(bound expectation {probes[name]['expected_if_bound_median_mm']}mm); follow ratio {probes[name]['attachment_follow_ratio_median']}."
        for name in mira],
      "",
      "## Why this matters",
      "The MIRA generation method places roots on a snapshot of the source mesh, then creates independent free curves in world coordinates. "
      "Without skinning/deformation binding, static attachment does not guarantee that new features follow head transforms, facial expressions, blinking or deformation. "
      "Einar's inspected source contains separate physically modeled eye, tearline and eyebrow/lash hair interfaces with modifiers/rig dependencies absent from MIRA's three generated curve objects. "
      "Static image realism STILL primarily fails from geometry and shading defects; missing deformation coupling is an ADDITIONAL structural limitation, not proven sole cause of the uncanny still portrait.",
      "",
      "## Required one-shot generator contract",
      "One source rig produces dependent facial systems that remain aligned through pose/blink tests; preserve physically modeled ocular boundaries, regional hair geometry and multilayer calibrated materials. "
      "Before photoreal acceptance: inspect actual evaluated geometry at neutral, blink and head-turn; physically validate contact interfaces and export parity in 4 views. "
      "A count of curves or shader nodes is never a realism score.",
      "",
      "## Source and review status",
      "Authentic comparison and synthetic head-transform probe only; full Einar pose-to-render behavior and MIRA blink interface displacement not yet measured. "
      "No new human, no deployment, human visual acceptance remains blocked."
    ]
    (OUTPUT/"reference-vs-mira.md").write_text("\n".join(lines)+"\n")
    print("REFERENCE_DECOMPOSITION_SUCCESS",json.dumps({
        "einar_eye_layer_parts":len(src_eye),"einar_ref_rig_bones":ref_rig[0]["bones"],
        "mira_curve_objects_unbound":gap["mira_curve_bindings_missing"],
        "mira_20mm_probe_follow_ratios":{n:p["attachment_follow_ratio_median"] for n,p in probes.items()},
        "mira_skin_nodes":candidate["skin_nodes"]}),flush=True)
    sys.stdout.flush();os._exit(0)

try:inspect()
except BaseException as e:
    (OUTPUT/"error.json").write_text(json.dumps({"error":type(e).__name__+": "+str(e)})+"\n")
    traceback.print_exc()
    sys.stdout.flush();os._exit(1)
