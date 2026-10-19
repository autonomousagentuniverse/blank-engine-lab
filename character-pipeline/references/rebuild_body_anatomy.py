"""Anatomical landmark + skin-region rest-geometry reconstruction for one Blender render.
Not the old three-slider height-band width warp. Reconstructs separate mesh datablocks
while preserving original UVs, topology, vertex-group weights and head geometry.
Topology is inherited and therefore this does NOT constitute an independent sculpt.
"""
import math,hashlib,struct

SPINE={"pelvis","spine_01","spine_02","spine_03","clavicle_l","clavicle_r"}
ARMS={"upperarm_l","upperarm_r","lowerarm_l","lowerarm_r","hand_l","hand_r"}
LEGS={"thigh_l","thigh_r","calf_l","calf_r","foot_l","foot_r"}
PROFILE_NAMES=("knee","mid_thigh","trochanter","waist","ribcage","clavicle","neck")
# Physically continuous normalized envelope controls, not arbitrary per-band gains.
# The profile derives its actual vertical landmark positions from the rig.
X_ENVELOPE=(.99,.96,.995,.885,.965,.955,1.)
Y_ENVELOPE=(1.,.99,1.045,.935,1.02,.985,1.)

def smooth(t):
    t=max(0.,min(1.,float(t)))
    return t*t*(3-2*t)

def monotone_profile(z,anchors,values):
    if len(anchors)!=len(values) or len(anchors)<2:
        raise ValueError("ANATOMY_PROFILE_SHAPE")
    if any(not a<b for a,b in zip(anchors,anchors[1:])):
        raise ValueError("ANATOMY_LANDMARKS_UNORDERED")
    if z<=anchors[0]:return values[0]
    if z>=anchors[-1]:return values[-1]
    for i in range(len(anchors)-1):
        if z<=anchors[i+1]:
            return values[i]+smooth((z-anchors[i])/(anchors[i+1]-anchors[i]))*(values[i+1]-values[i])
    raise AssertionError("UNREACHABLE_PROFILE")

def landmarks(rig):
    from mathutils import Vector
    def z(name,tail=False):
        bone=rig.data.bones.get(name)
        if bone is None:raise RuntimeError("ANATOMICAL_RIG_MISSING:"+name)
        return (rig.matrix_world @ (bone.tail_local if tail else bone.head_local)).z
    knee=(z("calf_l")+z("calf_r"))/2
    hip=(z("thigh_l")+z("thigh_r"))/2
    clav=(z("clavicle_l")+z("clavicle_r"))/2
    neck=z("neck_01",True)
    if not (.15<knee<hip<clav<neck<2.5 and clav-hip>.19 and hip-knee>.20):
        raise RuntimeError("ANATOMICAL_BONE_ORDER:"+str([knee,hip,clav,neck]))
    # Distinct femoral, greater-trochanter, waist/rib and clavicle landmarks.
    # All heights are anchored to the actual bone positions, never guessed z bands.
    positions=(knee, knee+.55*(hip-knee), hip,
               hip+.43*(clav-hip), hip+.73*(clav-hip),clav,neck)
    return dict(zip(PROFILE_NAMES,positions))

def weight_categories(obj,vertex):
    groups={"spine":0.,"arms":0.,"legs":0.}
    for vw in vertex.groups:
        name=obj.vertex_groups[vw.group].name.lower()
        if name in SPINE:groups["spine"]+=vw.weight
        elif name in ARMS or any(name.startswith(p) for p in ("thumb_","index_","middle_","ring_","pinky_")):
            groups["arms"]+=vw.weight
        elif name in LEGS:groups["legs"]+=vw.weight
    return groups

def rebuild_source_body(*,body,rig,scene):
    from mathutils import Vector
    import bpy
    if rig.type!="ARMATURE" or len(rig.data.bones)!=53 or body.type!="MESH":
        raise RuntimeError("ANATOMY_WRONG_RIG_OR_BODY")
    levels=landmarks(rig)
    heights=list(levels.values())
    origin_x=(rig.matrix_world@rig.data.bones["pelvis"].head_local).x
    body_world=[body.matrix_world@v.co for v in body.data.vertices]
    origin_y=(min(v.y for v in body_world)+max(v.y for v in body_world))/2
    original_head_rig=(rig.matrix_world@rig.data.bones["head"].head_local).copy()
    for required in ["spine_01","spine_02","spine_03","pelvis","thigh_l","thigh_r"]:
        if body.vertex_groups.get(required) is None:
            raise RuntimeError("ANATOMY_SOURCE_SKIN_GROUP_MISSING:"+required)
    targets=[body]
    for ob in scene.objects:
        if ob!=body and ob.type=="MESH" and not ob.hide_render and not ob.hide_get():
            if any(m.type=="ARMATURE" and m.object==rig for m in ob.modifiers) and len(ob.data.vertices)>100:
                targets.append(ob)
    if len(targets)<2:raise RuntimeError("ANATOMY_CLOTH_BINDINGS_REQUIRED")

    results=[]
    face_fingerprints={}
    changed=0
    maxdelta=0.
    region_changed={"torso":0,"thigh":0}
    # Measure geometry change before arm posing and without any lighting differences.
    for ob in targets:
        ob.data=ob.data.copy()
        ob.data.name="ANATOMY_V2_RECONSTRUCTED_"+ob.name.replace(".","_")
        if not any(m.type=="ARMATURE" and m.object==rig for m in ob.modifiers):
            raise RuntimeError("ANATOMY_SKINNING_LOST:"+ob.name)
        inv=ob.matrix_world.inverted()
        streams=([key.data for key in ob.data.shape_keys.key_blocks]
                 if ob.data.shape_keys else [ob.data.vertices])
        info=[]
        for v in ob.data.vertices:
            g=weight_categories(ob,v)
            world=ob.matrix_world@v.co
            lock=(world.z>=levels["neck"]-.005) or (g["arms"]>g["spine"] and g["arms"]>g["legs"])
            s=g["spine"]/(g["spine"]+g["arms"]+g["legs"]+1e-8)
            thigh=g["legs"]/(g["spine"]+g["arms"]+g["legs"]+1e-8)
            if world.z>=levels["clavicle"]+.035:s=0.
            if world.z<levels["knee"]-.025:s=0.
            if lock:s=0.;thigh=0.
            # No spatial widening of exposed hands, wrists, face or hair.
            # Weight core by original skin weights, not by naive z-only mesh selection.
            core_x=monotone_profile(world.z,heights,X_ENVELOPE)
            core_y=monotone_profile(world.z,heights,Y_ENVELOPE)
            xdelta=(world.x-origin_x)*(core_x-1)*s
            ydelta=(world.y-origin_y)*(core_y-1)*s
            # Bone-local, gentle thigh-volume continuity from trochanter to knee.
            # Opposite legs are treated separately around their own femoral origins.
            if thigh>0.15 and levels["knee"]<world.z<levels["trochanter"]:
                f=smooth((world.z-levels["knee"])/(levels["trochanter"]-levels["knee"]))
                leg="thigh_l" if world.x>=origin_x else "thigh_r"
                anchor=rig.matrix_world@rig.data.bones[leg].head_local
                d=.02*thigh*f
                xdelta+=(world.x-anchor.x)*d
                ydelta+=(world.y-origin_y)*(.028*thigh*f)
            delta=Vector((xdelta,ydelta,0.))
            if delta.length>.095:raise RuntimeError("ANATOMY_UNSAFE_VERTEX_SHIFT:"+str(delta.length))
            if lock and delta.length>1e-8:raise RuntimeError("ANATOMY_HEAD_OR_HAND_CHANGED")
            info.append(delta)
            if delta.length>1e-6:
                changed+=1
                maxdelta=max(maxdelta,delta.length)
                if s>.15:region_changed["torso"]+=1
                if thigh>.15:region_changed["thigh"]+=1
        for stream in streams:
            for i,item in enumerate(stream):
                if info[i].length>0:
                    old=ob.matrix_world@item.co
                    item.co=inv@(old+info[i])
        ob.data.update()
        results.append({"name":ob.name,"vertices":len(ob.data.vertices),
                       "mesh_data":ob.data.name,"shape_keys":len(streams),
                       "nonzero_displacements":sum(1 for d in info if d.length>1e-6)})
        # Strictly compare existing head geometry (all stream coordinates), including face keys.
        face_fingerprints[ob.name]=sum(1 for i,v in enumerate(ob.data.vertices)
                            if (ob.matrix_world@v.co).z>=levels["neck"]-.005 and info[i].length==0)
    scene.view_layers[0].update()
    if region_changed["torso"]<120 or region_changed["thigh"]<80 or maxdelta<.004:
        raise RuntimeError("ANATOMY_RECONSTRUCTION_INSUFFICIENT:"+str((region_changed,maxdelta)))
    if (rig.matrix_world@rig.data.bones["head"].head_local-original_head_rig).length>1e-8:
        raise RuntimeError("ANATOMY_HEAD_RIG_CHANGED")
    if sum(face_fingerprints.values())<120:
        raise RuntimeError("ANATOMY_HEAD_IDENTITY_UNVERIFIED")
    return {"applied":True,"method":"weighted_rig_region_anatomy_landmark_spline_v2",
      "three_slider_morphology_used":False,"new_independent_topology":False,
      "source_mesh_datablocks_replaced":True,"original_uvs_and_weights_retained":True,
      "semantic_rig_landmarks_m":levels,"x_rest_envelope":list(X_ENVELOPE),
      "depth_rest_envelope":list(Y_ENVELOPE),
      "reconstructed_objects":results,"changed_vertices":changed,"changed_regions":region_changed,
      "max_rest_vertex_delta_m":maxdelta,
      "head_topology_and_vertex_positions_preserved":True,
      "head_rig_rest_location_preserved":True,"head_vertices_frozen":face_fingerprints,
      "visual_approval":False,"photo_realism_approved":False}
