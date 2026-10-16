#!/usr/bin/env python3
"""Aster-01: ORIGINAL parametric humanoid android built in headless Blender.

No downloaded base mesh, source GLB, Einar textures, re-posted photographs or
image generation. Every part is authored as Blender 3D geometry by this script.
A seed/palette profile controls the build; outputs GLB plus provenance/QA JSON.
"""
import bpy,sys,json,math,random,hashlib,os,traceback
from mathutils import Vector
from pathlib import Path
from math import radians,pi

def spec():
    a=sys.argv
    if "--" not in a:raise ValueError("Expected: blender -b -P build_aster.py -- manifest.json")
    p=Path(a[a.index("--")+1]).resolve()
    cfg=json.loads(p.read_text())
    if cfg.get("schema")!="blank.asset-factory.procedural-character.v1" or cfg.get("generator")!="aster-01":
        raise ValueError("Unsupported generation profile")
    seed=cfg.get("seed");palette=cfg.get("palette")
    if not isinstance(seed,int) or seed<0 or seed>1000000:raise ValueError("Bad seed")
    if palette not in ("cobalt-copper","arctic-gold","midnight-cyan"):raise ValueError("Palette not allowed")
    if cfg.get("publish",None) is not False or cfg.get("human_approval_required") is not True:
        raise ValueError("Must not automatically release")
    return cfg,p

def material(name,rgb,metal=.0,rough=.5,emit=0):
    mat=bpy.data.materials.new("ASTER_"+name);mat.diffuse_color=(*rgb,1)
    mat.use_nodes=True
    node=mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value=(*rgb,1)
    node.inputs["Metallic"].default_value=metal
    node.inputs["Roughness"].default_value=rough
    if emit:
        node.inputs["Emission Color"].default_value=(*rgb,1)
        node.inputs["Emission Strength"].default_value=emit
    return mat

def finish(obj,name,mat,parent=None,bevel=0):
    obj.name="ASTER_"+name;obj.data.name="ASTER_MESH_"+name
    obj.data.materials.clear();obj.data.materials.append(mat)
    if bevel:
        m=obj.modifiers.new("ControlledSoftEdges","BEVEL");m.width=bevel;m.segments=3
        n=obj.modifiers.new("WeightedHardFaceNormals","WEIGHTED_NORMAL")
    if parent:
        world=obj.matrix_world.copy()
        obj.parent=parent
        obj.matrix_world=world
    return obj

def ellipsoid(name,xyz,scale,mat,parent=None,segments=32,rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=xyz)
    ob=bpy.context.object;ob.scale=scale
    for f in ob.data.polygons:f.use_smooth=True
    return finish(ob,name,mat,parent)
def box(name,xyz,dims,mat,bevel=.03,parent=None,rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz)
    ob=bpy.context.object;ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rotation:ob.rotation_euler=rotation
    return finish(ob,name,mat,parent,bevel)
def cylinder(name,a,b,r,mat,verts=24,parent=None,r2=None):
    v=Vector(b)-Vector(a);mid=(Vector(a)+Vector(b))*.5
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r,radius2=r if r2 is None else r2,depth=v.length,location=mid)
    ob=bpy.context.object;ob.rotation_euler=Vector((0,0,1)).rotation_difference(v).to_euler()
    return finish(ob,name,mat,parent)
def torus(name,xyz,rad,tube,mat,parent=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=12,location=xyz,major_radius=rad,minor_radius=tube,rotation=(pi/2,0,0))
    ob=bpy.context.object
    for f in ob.data.polygons:f.use_smooth=True
    return finish(ob,name,mat,parent)
def point(name,xyz):
    ob=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(ob)
    ob.location=xyz;return ob

def main():
    cfg,source=spec();random.seed(cfg["seed"])
    output=Path(cfg["output"]).resolve()
    if Path.cwd() not in output.parents:raise ValueError("Asset output outside repository")
    output.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for m in list(bpy.data.materials):bpy.data.materials.remove(m)
    palette={
      "cobalt-copper":{"armor":(.074,.19,.37),"frame":(.062,.085,.115),"trim":(.61,.36,.17),"light":(.18,.87,.98)},
      "arctic-gold":{"armor":(.69,.78,.83),"frame":(.12,.15,.19),"trim":(.66,.42,.14),"light":(.08,.7,.92)},
      "midnight-cyan":{"armor":(.047,.065,.10),"frame":(.11,.17,.19),"trim":(.27,.38,.40),"light":(.12,1,.69)}
    }[cfg["palette"]]
    armor=material("CeramicArmor",palette["armor"],.53,.26)
    frame=material("GraphiteSkeleton",palette["frame"],.78,.29)
    copper=material("BrushedTrim",palette["trim"],.86,.21)
    glass=material("BlackGlass",(.016,.040,.064),.27,.12)
    cyan=material("LuminousIris",palette["light"],.12,.25,2.0)
    white=material("WhiteTitanium",(.59,.68,.75),.79,.22)
    dark=material("ArticulatedRubber",(.024,.028,.037),.0,.67)
    root=point("ASTER_ROOT",(0,0,0))
    headPivot=point("ASTER_HeadArticulation",(0,0,2.62));headPivot.parent=root
    # Original anatomy: upper body + independently composed robot helmet
    ellipsoid("Spine_Core",(0,.095,1.79),(.44,.25,.65),frame,root)
    ellipsoid("Breastplate_Inner",(0,-.035,1.87),(.66,.29,.54),armor,root,48,32)
    box("Chest_Left",(-.33,-.303,1.93),(.57,.14,.55),armor,.10,root,rotation=(0,0,radians(-7)))
    box("Chest_Right",(.33,-.303,1.93),(.57,.14,.55),armor,.10,root,rotation=(0,0,radians(7)))
    box("Chest_CenterGroove",(0,-.398,1.96),(.057,.055,.50),frame,.02,root)
    ellipsoid("Sternum_GlowHousing",(0,-.421,1.82),(.26,.062,.16),frame,root)
    torus("Chest_Reactor_Bezel",(0,-.485,1.82),.139,.026,copper,root)
    ellipsoid("Chest_Reactor_Crystal",(0,-.483,1.82),(.106,.023,.106),cyan,root)
    for side in (-1,1):
        tag="L" if side<0 else "R"
        for k in range(4):
            z=1.59-k*.075
            box("AbdomenVent_"+tag+"_"+str(k),(side*.27,-.261,z),(.33,.064,.026),white,.006,root)
    box("Waist_Plate",(0,-.045,1.23),(.8,.42,.20),frame,.07,root)
    box("Belt_Armored_Guard",(0,-.278,1.20),(.58,.14,.20),armor,.05,root)
    torus("Belt_Buckle",(0,-.365,1.20),.068,.016,copper,root)
    # Skull: distinct faceted ceramic cranial proportions
    ellipsoid("Cranium_Core",(0,0,2.69),(.40,.33,.47),frame,headPivot,48,32)
    ellipsoid("Helmet_Cap",(0,.012,2.79),(.427,.36,.406),armor,headPivot,48,32)
    box("Visor_Glass",(0,-.331,2.72),(.72,.115,.31),glass,.11,headPivot)
    box("Visor_Rim_Top",(0,-.402,2.878),(.70,.085,.065),copper,.018,headPivot)
    box("Visor_Rim_Bottom",(0,-.408,2.548),(.61,.07,.046),copper,.016,headPivot)
    box("Lower_Face_Jaw",(0,-.275,2.436),(.57,.23,.25),white,.09,headPivot)
    box("Mouth_Vent",(0,-.407,2.427),(.33,.048,.075),frame,.014,headPivot)
    for i in range(6):
        x=(i-2.5)*.047
        box("Mouth_Grille_"+str(i),(x,-.44,2.432),(.019,.018,.059),copper,.004,headPivot)
    for side in (-1,1):
        sideTag="L" if side<0 else "R";sx=side*.193
        ellipsoid("LuminousEye_"+sideTag,(sx,-.410,2.724),(.102,.014,.053),cyan,headPivot)
        torus("Optical_LensRing_"+sideTag,(sx,-.43,2.724),.077,.011,white,headPivot)
        box("Brow_"+sideTag,(side*.202,-.398,2.841),(.235,.05,.040),white,.012,headPivot,
            rotation=(0,0,radians(side*-13)))
        ellipsoid("Cheek_Armor_"+sideTag,(side*.314,-.26,2.526),(.115,.134,.117),armor,headPivot)
        cylinder("EarPivot_"+sideTag,(side*.42,.01,2.714),(side*.50,.01,2.714),.138,frame,24,headPivot)
        cylinder("EarDish_"+sideTag,(side*.51,.01,2.714),(side*.528,.01,2.714),.090,copper,24,headPivot)
        cylinder("Temple_LED_"+sideTag,(side*.533,-.013,2.72),(side*.548,-.013,2.72),.036,cyan,18,headPivot)
        for k in range(3):
            box("CrownFin_"+sideTag+"_"+str(k),(side*(.235+k*.052),.047,3.096-k*.064),
                (.083,.30,.13),armor,.018,headPivot,rotation=(0,radians(side*8),0))
    box("Forehead_Centerline",(0,-.336,3.052),(.073,.078,.18),copper,.019,headPivot)
    cylinder("SignalAntenna_Base",(-.24,.09,3.12),(-.25,.09,3.3),.034,copper,18,headPivot)
    ellipsoid("SignalAntenna_Tip",(-.25,.09,3.335),(.064,.064,.065),cyan,headPivot)
    for i in range(3):
        torus("Neck_Damper_"+str(i),(0,.065,2.303+i*.069),.175,.027,white,root)
    cylinder("Neck_Link",(0,.07,2.17),(0,.07,2.47),.122,dark,24,root)
    # Arms mechanically jointed; generated sleeves, joints, fingers
    for side in (-1,1):
        tag="L" if side<0 else "R";sg=side
        shoulder=(sg*.76,0,2.035)
        ellipsoid("Deltoid_"+tag,shoulder,(.285,.30,.265),armor,root)
        torus("Deltoid_GlowHub_"+tag,(sg*.92,-.19,2.04),.106,.021,copper,root)
        upper=(sg*1.04,.02,1.66)
        cylinder("UpperArm_Piston_"+tag,(sg*.83,.015,1.99),upper,.149,frame,24,root,r2=.167)
        cylinder("UpperArm_Armor_"+tag,(sg*.90,-.02,1.90),(sg*1.025,-.018,1.72),.172,armor,24,root,r2=.16)
        ellipsoid("Elbow_Bearing_"+tag,(sg*1.085,.025,1.594),(.152,.155,.142),copper,root)
        cylinder("LowerArm_Piston_"+tag,(sg*1.11,.04,1.57),(sg*1.22,-.08,1.174),.122,dark,24,root)
        cylinder("LowerArm_Armor_"+tag,(sg*1.14,-.038,1.502),(sg*1.195,-.087,1.27),.17,white,24,root,r2=.133)
        box("Wrist_Ferrule_"+tag,(sg*1.23,-.08,1.133),(.235,.238,.095),copper,.03,root)
        ellipsoid("Palm_"+tag,(sg*1.24,-.064,1.013),(.145,.117,.128),frame,root)
        for k in range(3):
            x=sg*(1.143+.091*k)
            cylinder("Finger_"+tag+"_"+str(k),(x,-.137,.954),(x,-.137,.823),.031,white,12,root)
        # Badge asymmetry: physical side panels are not mirrored identically
        if side<0:
            box("Left_SquadPlate",(-.81,-.292,2.038),(.23,.07,.16),copper,.026,root)
        else:
            ellipsoid("Right_SensorHousing",(.81,-.304,2.038),(.10,.022,.10),glass,root)
            torus("Right_SensorLED",(.81,-.334,2.038),.073,.013,cyan,root)
    # Legs and protective boots
    ellipsoid("Hip_Core",(0,.084,1.100),(.437,.275,.233),frame,root)
    for side in (-1,1):
        tag="L" if side<0 else "R"
        cylinder("Thigh_"+tag,(side*.264,.085,1.04),(side*.306,.045,.612),.214,armor,32,root,r2=.18)
        ellipsoid("Knee_"+tag,(side*.304,-.01,.608),(.201,.21,.18),copper,root)
        cylinder("Shin_"+tag,(side*.312,.075,.566),(side*.33,.064,.206),.160,white,32,root,r2=.135)
        box("Shin_Casing_"+tag,(side*.324,-.127,.408),(.25,.095,.28),armor,.05,root)
        ellipsoid("Ankle_"+tag,(side*.335,.032,.163),(.145,.15,.12),frame,root)
        box("Foot_"+tag,(side*.335,-.144,.083),(.38,.57,.17),frame,.077,root)
        box("Foot_ToeArmor_"+tag,(side*.335,-.359,.086),(.33,.17,.12),armor,.028,root)
        for k in range(3):
            box("ToeRidge_"+tag+"_"+str(k),(side*.335+(k-1)*.092,-.457,.137),
                (.018,.04,.05),copper,.007,root)
    # Original authored animation of head control. Rigging for full humanoid motion NOT claimed.
    scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=61;scene.render.fps=30
    for frame,angle in ((1,0),(16,.13),(31,0),(46,-.13),(61,0)):
        headPivot.rotation_euler=(0,0,angle)
        headPivot.keyframe_insert(data_path="rotation_euler",frame=frame)
    action=bpy.data.actions.get("ASTER_HeadArticulationAction")
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in bpy.data.objects:
        if ob.type in ('MESH','EMPTY'):
            ob.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,
      export_materials="EXPORT",export_normals=True,export_animations=True,export_cameras=False,
      export_lights=False,export_apply=False,export_yup=True)
    h=hashlib.sha256(output.read_bytes()).hexdigest()
    count=sum(o.type=="MESH" for o in bpy.data.objects)
    report={"schema":"blank.generated-asset.v1","asset_id":cfg["asset"]["id"],
      "generator":"blender-bpy-original-aster-01","asset_class":"original_humanoid_android",
      "original_mesh_authoring":True,"einar_source_used":False,"source_external_assets":0,
      "source_photographs_used":0,"original_geometry_mesh_objects":count,
      "materials":len(bpy.data.materials),"original_head_animation_keyframes":5,
      "seed":cfg["seed"],"palette":cfg["palette"],"glb_sha256":h,
      "glb_bytes":output.stat().st_size,"license":"original procedural design",
      "rendered_in_Blank_Engine":False,"human_photorealism_approved":False,
      "note":"New original sci-fi android CHARACTER, not photorealistic human."}
    audit=output.parent/"generation-report.json"
    audit.write_text(json.dumps(report,indent=2)+"\n")
    print("ASTER_ORIGINAL_PROCEDURAL_ASSET_PASS",json.dumps(report),flush=True)
    sys.stdout.flush();os._exit(0)
if __name__=="__main__":
    try:main()
    except Exception:traceback.print_exc();raise
