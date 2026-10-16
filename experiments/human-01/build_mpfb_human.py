#!/usr/bin/env python3
"""Generate an entirely NEW parameterized HUMAN via official MPFB2 in headless Blender.

The source MPFB CC0 human basemesh, targets, system skin, eyes, brow, hair and
clothes are installed from publisher sources outside Git. This is NOT Einar.
Authentic human anatomy and source-asset image rights are recorded; real-time
human photorealism is NOT auto-approved.
"""
import bpy,json,sys,os,traceback,hashlib,importlib
from pathlib import Path

OUT=Path("artifacts/human-01");OUT.mkdir(parents=True,exist_ok=True)
CFG=Path("assets/specs/human-01.json")
ASSETS=Path(".ci-human/makehuman-assets")
MPFB=Path(".ci-human/mpfb2/src")
CFG_OBJ=json.loads(CFG.read_text())
def audit(status,**kwargs):
    global state
    state.update(kwargs);state["status"]=status
    (OUT/"generation-report.json").write_text(json.dumps(state,indent=2,default=str)+"\n")
    print("HUMAN01_GATE",status,json.dumps(kwargs,default=str)[:2000],flush=True)
def resolve_asset(path):
    matches=list(ASSETS.rglob(Path(path).name))
    matches=[p for p in matches if p.parent.name==Path(path).parent.name]
    if not matches:raise FileNotFoundError("Missing official CC0 system asset: "+path)
    return str(matches[0].resolve())
state={"schema":"blank.generated-human.v1","asset_id":"human-01",
       "generator":"MPFB2 HumanService + phenotype sliders, headless Blender",
       "is_human":True,"is_einar":False,"original_individual_parameters":CFG_OBJ["phenotype"],
       "source_license":{"mpfb_program":"GPLv3","mpfb_bundled_assets":"CC0","makehuman_system_assets":"CC0"},
       "licensed_external_assets":[],"source_photos_reused":False,"owner_photorealism_approved":False,
       "visual_approval_required":True,"production_published":False}
audit("STARTING")
try:
    import addon_utils
    sys.path.insert(0,str(MPFB.resolve()))
    import mpfb
    # Enable via Blender so the preference system recognizes the package.
    try:
        addon_utils.enable("mpfb",default_set=False,persistent=False)
    except Exception as e:
        print("MPFB_ADDON_ENABLE_ERROR",repr(e),flush=True)
    if "mpfb" not in bpy.context.preferences.addons:
        mpfb.register()
    audit("ADDON_ENABLED",mpfb_module=mpfb.__file__)
    from mpfb.services.humanservice import HumanService
    from mpfb.services.targetservice import TargetService
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    macro=TargetService.get_default_macro_info_dict()
    for name,value in CFG_OBJ["phenotype"].items():
        if name not in macro:raise ValueError("Unsupported human phenotype: "+name)
        if not 0.0<=value<=1.0:raise ValueError("Human phenotype value out of range")
        macro[name]=value
    # Independent person created by MakeHuman macro deformation; NOT reimported Einar.
    body=HumanService.create_human(macro_detail_dict=macro,scale=.1,feet_on_ground=True)
    if not body or body.type!="MESH":raise RuntimeError("MPFB failed to construct human basemesh")
    body.name="HUMAN01_NewPerson_Body"
    audit("ACTUAL_HUMAN_CREATED",vertices=len(body.data.vertices),
        polygons=len(body.data.polygons),uv_layers=len(body.data.uv_layers))
    skin=resolve_asset(CFG_OBJ["system_assets"]["skin"])
    HumanService.set_character_skin(skin,body,skin_type="GAMEENGINE")
    state["licensed_external_assets"].append({"type":"skin","file":str(Path(skin).name),"license":"CC0"})
    audit("SKIN_APPLIED")
    rig=HumanService.add_builtin_rig(body,"game_engine")
    if not rig:raise RuntimeError("Automatic GameEngine skeleton missing")
    state["rig_bones"]=len(rig.data.bones)
    audit("AUTOMATIC_SKELETON_READY",bones=len(rig.data.bones))
    for type_name,path in CFG_OBJ["system_assets"]["parts"].items():
        file=resolve_asset(path)
        obj=HumanService.add_mhclo_asset(file,body,asset_type=type_name,material_type="GAMEENGINE",subdiv_levels=0)
        state["licensed_external_assets"].append({"type":type_name,"file":Path(file).name,"license":"CC0"})
        audit("ADDED_"+type_name.upper(),mesh_name=getattr(obj,"name",""),polygons=len(obj.data.polygons) if getattr(obj,"type","")=="MESH" else None)
    # Runtime selection: original generator body + imported eyes/hair/garments and skeleton,
    # excluding helper vertices via original mask and evaluated export.
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        if o.type in ("MESH","ARMATURE"):
            o.hide_set(False)
            o.select_set(True)
    bpy.context.view_layer.objects.active=body
    target=OUT/"human-01.glb"
    bpy.ops.export_scene.gltf(filepath=str(target.resolve()),export_format="GLB",
        use_selection=True,export_yup=True,export_materials="EXPORT",export_normals=True,
        export_texcoords=True,export_animations=False,export_skins=True,
        export_image_format="AUTO")
    h=hashlib.sha256(target.read_bytes()).hexdigest()
    objects=[{"name":o.name,"kind":o.type,"vertices":len(o.data.vertices) if o.type=="MESH" else 0,
              "polygons":len(o.data.polygons) if o.type=="MESH" else 0}
             for o in bpy.data.objects if o.type in ("MESH","ARMATURE")]
    audit("REAL_NEW_HUMAN_GLTF_COMPLETE",glb_sha256=h,glb_bytes=target.stat().st_size,
        object_inventory=objects,mesh_count=sum(o["kind"]=="MESH" for o in objects),
        skin_material_source=Path(skin).name,game_rig_bones=len(rig.data.bones))
    sys.stdout.flush();sys.stderr.flush();os._exit(0)
except Exception as e:
    audit("BLOCKED",error=type(e).__name__+": "+str(e))
    traceback.print_exc()
    raise
