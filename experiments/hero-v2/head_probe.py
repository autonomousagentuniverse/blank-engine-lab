#!/usr/bin/env python3
"""Inspect original licensed Blender assets, export ONE isolated candidate head.
This is a topology/preview bake only. A base mesh is NOT a photorealistic hero.
Requires bpy 4.5.3 and writes only experiment artifacts (never source assets).
"""
import bpy, json, math, sys, traceback
from pathlib import Path
from mathutils import Vector
ROOT=Path.cwd()
AUDIT=ROOT/"artifacts"/"hero-v2"
AUDIT.mkdir(parents=True,exist_ok=True)

def score(o):
    if o.type!='MESH':return -99999
    s=(o.name+" "+(o.data.name if o.data else "")).lower()
    points=0
    if 'head' in s:points+=120
    if 'realistic' in s:points+=100
    if 'sculpt' in s:points+=45
    if 'face' in s:points+=30
    if 'male' in s or 'female' in s:points+=5
    if any(x in s for x in ('skull','lowpoly','stylized','planar','primitive')):points-=160
    points+=min(18,math.log10(max(len(o.data.polygons),1))*4)
    return points

def safe_props(o):
    if o.type!='MESH':return {}
    x=o.data
    mats=[{"name":m.name,"uses_nodes":m.use_nodes,
          "image_nodes":sum(1 for n in m.node_tree.nodes if n.type=='TEX_IMAGE') if m.use_nodes and m.node_tree else 0}
          for m in x.materials if m]
    return {"object":o.name,"mesh":x.name,"faces":len(x.polygons),"verts":len(x.vertices),
      "uv_layers":len(x.uv_layers),"vertex_groups":len(o.vertex_groups),
      "shape_keys":list(x.shape_keys.key_blocks.keys())[:40] if x.shape_keys else [],
      "materials":mats,"armature_modifier":any(mod.type=='ARMATURE' for mod in o.modifiers)}

def main():
    audit=json.loads((AUDIT/"bundle-audit.json").read_text())
    files=audit["blend_files"]
    all_candidates=[]
    best=None
    for f in files:
        path=Path(f["extracted_path"])
        bpy.ops.wm.open_mainfile(filepath=str(path),load_ui=False)
        meshes=[o for o in bpy.data.objects if o.type=='MESH']
        scored=sorted(meshes,key=score,reverse=True)
        all_candidates.append({"source_blend":f["archive_path"],"mesh_objects":len(meshes),
          "top_candidates":[{"name":o.name,"score":round(score(o),1),**safe_props(o)} for o in scored[:18]]})
        if scored and score(scored[0])>55 and (best is None or score(scored[0])>best[0]):
            best=(score(scored[0]),str(path),scored[0].name)
    out={"schema":"blank.hero-v2.cc0-geometry-evaluation.v1",
        "model":"NOT_APPROVED", "license":audit["license"],
        "source_bundle_sha256":audit["sha256"],"blender_version":bpy.app.version_string,
        "scan_type":"Blender authored CC0 human base geometry, NOT a captured PBR texture scan",
        "source_candidates":all_candidates,"selected":None,
        "human_photorealism_approved":False,"rendered_on_android":False,
        "known_missing":["Photographic skin/SSS verification","Detailed eyelashes and eyebrows",
          "Verified separate tear line and cornea","Independent rig/blink/morph validation",
          "Human approval from matched closeups"]}
    if best is None:
        out["gate"]="REJECT_NO_REALISTIC_HEAD_OBJECT_FOUND"
        (AUDIT/"head-audit.json").write_text(json.dumps(out,indent=2)+"\n")
        raise RuntimeError("No suitable realistic head asset. See head-audit.json")
    _,file,name=best
    bpy.ops.wm.open_mainfile(filepath=file,load_ui=False)
    source=bpy.data.objects[name]
    props=safe_props(source)
    out["selected"]={"source_blend":file,"source_object":name,**props}
    # An authored high-poly source has enough anatomy to audit but not automatic
    # approval. Export a copy with a bounded triangle budget for browser review.
    dup=source.copy();dup.data=source.data.copy()
    bpy.context.scene.collection.objects.link(dup)
    dup.name="Blank_HeroV2_CC0_Geometry_Candidate"
    dup.hide_set(False);dup.hide_render=False
    for other in bpy.data.objects:
        if other!=dup:other.hide_render=True
    for other in bpy.context.selected_objects:other.select_set(False)
    dup.select_set(True);bpy.context.view_layer.objects.active=dup
    counts_before=len(dup.data.polygons)
    if counts_before>95000 and not dup.data.shape_keys:
        dec=dup.modifiers.new("Experimental_non_destructive_100k_triangle_budget","DECIMATE")
        dec.ratio=min(1,95000/counts_before)
        bpy.ops.object.modifier_apply(modifier=dec.name)
    out["selected"]["export_polygons"]=len(dup.data.polygons)
    if dup.data.shape_keys:
        out["selected"]["decimation_skipped_due_to_shape_keys"]=True
    glb=AUDIT/"head-baseline-experimental.glb"
    try:
        bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
              export_apply=True,export_yup=True)
        out["export_glb"]={"path":str(glb),"bytes":glb.stat().st_size}
    except Exception as e:
        out["export_error"]=repr(e)
    # Save actual audit BEFORE optional preview rendering so a graphics crash
    # cannot lose the selected source mesh's genuine technical metadata.
    out['gate']='EVALUATION_ONLY_NOT_PHOTOREALISM'
    out['separate_eye_anatomy_verified']=False
    out['skin_textured_verified']=bool(any(m['image_nodes'] for m in props['materials']))
    (AUDIT/'head-audit.json').write_text(json.dumps(out,indent=2)+'\n')
    # Honest clay geometry views (no simulated skin/photo), four axes.
    scene=bpy.context.scene
    scene.render.engine='BLENDER_WORKBENCH'
    scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
    scene.display.shading.show_cavity=True
    scene.display.shading.cavity_type='BOTH'
    scene.world.color=(0.24,0.26,0.30)
    corners=[dup.matrix_world@Vector(c) for c in dup.bound_box]
    lo=Vector(tuple(min(v[k] for v in corners) for k in range(3)))
    hi=Vector(tuple(max(v[k] for v in corners) for k in range(3)))
    center=(lo+hi)*0.5;span=max((hi-lo).length,0.15)
    camera=bpy.data.objects.new("HeroV2_Evaluation_Camera",bpy.data.cameras.new("HeroV2_Evaluation_Camera"))
    scene.collection.objects.link(camera);scene.camera=camera
    camera.data.type='ORTHO';camera.data.ortho_scale=max(0.24,(hi-lo).length*1.35)
    axes={"axis_minus_y":(0,-1,0),"axis_plus_y":(0,1,0),
          "axis_plus_x":(1,0,0),"axis_three_quarter":(0.65,-0.76,0)}
    renders=[]
    for label,d in axes.items():
        direction=Vector(d).normalized()
        camera.location=center+direction*span*1.8
        camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        target=AUDIT/(label+".png")
        scene.render.filepath=str(target)
        bpy.ops.render.render(write_still=True)
        renders.append(str(target))
    out["render_previews"]=renders
    out["gate"]="EVALUATION_ONLY_NOT_PHOTOREALISM"
    out["separate_eye_anatomy_verified"]=False
    out["skin_textured_verified"]=bool(any(m["image_nodes"] for m in props["materials"]))
    (AUDIT/"head-audit.json").write_text(json.dumps(out,indent=2)+"\n")
    print("HERO_V2_CANDIDATE_EVALUATION_COMPLETE",json.dumps({
      "name":name,"source_faces":props["faces"],"export_faces":out["selected"]["export_polygons"],
      "uv_layers":props["uv_layers"],"skin_tex":out["skin_textured_verified"],
      "glb_bytes":out.get("export_glb",{}).get("bytes"),"acceptance":out["gate"]}))
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("HERO_V2_SOURCE_PROBE_FAILED",repr(e))
        traceback.print_exc()
        raise
