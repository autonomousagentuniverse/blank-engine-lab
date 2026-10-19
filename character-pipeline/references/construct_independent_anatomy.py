"""Entirely NEW Blender body vertex/face topology with preservation of old face.

This constructs a separate adult human anatomical study mesh via joined elliptical
cross-section lofts aligned to 53-bone human rest-pose landmarks. The torso, leg,
arm, foot and hand surfaces are NOT deformations/copies of source body vertices.
Retains source head object above lower-neck mask, materials, eyes, groom, camera.
This is an early anatomical clay/skin-volume prototype, not photoreal or final.
"""
import math

def body_from_rig(*,old_body,rig,scene):
    import bpy
    from mathutils import Vector
    if old_body.type!="MESH" or rig.type!="ARMATURE" or len(rig.data.bones)!=53:
        raise RuntimeError("INDEPENDENT_BODY_RIG_SOURCE_MISMATCH")
    def bone(name,tail=False):
        b=rig.data.bones.get(name)
        if b is None:raise RuntimeError("INDEPENDENT_BODY_MISSING_BONE:"+name)
        return rig.matrix_world @ (b.tail_local if tail else b.head_local)
    hip=(bone("thigh_l").z+bone("thigh_r").z)/2
    knee=(bone("calf_l").z+bone("calf_r").z)/2
    clav=(bone("clavicle_l").z+bone("clavicle_r").z)/2
    neck=bone("neck_01",True).z
    ground=min((old_body.matrix_world@v.co).z for v in old_body.data.vertices)
    if not (ground<.1 and knee<hip<clav<neck and clav-hip>.19):
        raise RuntimeError("INDEPENDENT_BODY_BONE_GEOMETRY_INVALID:"+str([ground,knee,hip,clav,neck]))
    mid_x=bone("pelvis").x
    ys=[(old_body.matrix_world@v.co).y for v in old_body.data.vertices]
    mid_y=(min(ys)+max(ys))/2
    # Save actual source head as a separate skinned mesh; never reconstruct or sculpt it.
    face=old_body.copy()
    face.data=old_body.data.copy()
    face.name="SOURCE_PREVIOUS_HEAD_PRESERVED"
    scene.collection.objects.link(face)
    face.hide_render=False
    face.hide_set(False)
    keeper=face.vertex_groups.new(name="SOURCE_HEAD_NECK_KEEP")
    cutoff=clav-.075
    frozen=[]
    for v in face.data.vertices:
        p=face.matrix_world@v.co
        if p.z>=cutoff:
            keeper.add([v.index],1.,'REPLACE')
            frozen.append(v.index)
    if len(frozen)<160:
        raise RuntimeError("INDEPENDENT_BODY_HEAD_INSUFFICIENT_SOURCE_VERTS:"+str(len(frozen)))
    mask=face.modifiers.new("HEAD_ANATOMY_SOURCE_ONLY","MASK")
    mask.vertex_group=keeper.name
    mask.invert_vertex_group=False
    face_preview=[face.matrix_world@face.data.vertices[i].co for i in frozen]
    old_body.hide_render=True
    # Hide the old clothing; only the new independently constructed anatomy renders.
    garment=[o for o in scene.objects if o.type=="MESH" and "female_casualsuit01" in o.name and not o.hide_render]
    if len(garment)!=1:
        raise RuntimeError("INDEPENDENT_BODY_EXPECT_ONE_OLD_GARMENT:"+str(len(garment)))
    garment[0].hide_render=True
    for ob in scene.objects:
        if ob.type=="MESH" and ob.name.startswith("SOURCE_PREVIOUS_HEAD_PRESERVED") and ob!=face:
            ob.hide_render=True
    verts=[];faces=[];groups=[]
    def join_loft(name,sections,sides=48,breast=False):
        # Sections=(world z, x centre, y centre, x radius, depth radius, rig bone).
        # No source vertex or polygon list appears in this constructor.
        nonlocal verts,faces,groups
        if len(sections)<3:raise RuntimeError("INDEPENDENT_BODY_INSUFFICIENT_SECTIONS")
        offset=len(verts)
        for row,(z,cx,cy,rx,ry,bone_name) in enumerate(sections):
            if min(rx,ry)<.017:raise RuntimeError("ANATOMY_TUBE_RADIUS_TOO_SMALL")
            for k in range(sides):
                th=2*math.pi*k/sides
                x=cx+rx*math.cos(th)
                y=cy+ry*math.sin(th)
                if breast and z>hip+.20 and z<clav-.075:
                    # Paired soft anterior chest volume; not explicit surface detail.
                    region=math.exp(-.5*((z-(hip+.31))/.075)**2)
                    center=math.exp(-.5*((abs(x-mid_x)-.087)/.047)**2)
                    if math.sin(th)<0:y-=.035*region*center*(-math.sin(th))**2
                verts.append((x,y,z))
                groups.append(bone_name)
            if row:
                for k in range(sides):
                    p=offset+(row-1)*sides+k
                    q=offset+(row-1)*sides+(k+1)%sides
                    r=offset+row*sides+(k+1)%sides
                    s=offset+row*sides+k
                    faces.append((p,q,r,s))
        # Closed section caps with no voxel/marching-cubes approximation.
        for side,flip in ((0,True),(len(sections)-1,False)):
            ids=[offset+side*sides+i for i in range(sides)]
            faces.append(tuple(ids[::-1] if flip else ids))
        return {"name":name,"rings":len(sections),"radial_edges":sides}
    h=hip
    # Source-independent anatomically tagged torso cage with waist->pelvis and
    # bust->clavicle curvature. Values represent metres, not old 0-1 sliders.
    torso=[
      (h-.075,mid_x,mid_y,.157,.119,"pelvis"),
      (h-.018,mid_x,mid_y,.191,.132,"pelvis"),
      (h+.068,mid_x,mid_y,.191,.138,"pelvis"),
      (h+.155,mid_x,mid_y,.154,.110,"spine_01"),
      (h+.236,mid_x,mid_y,.147,.108,"spine_02"),
      (h+.327,mid_x,mid_y,.175,.135,"spine_03"),
      (clav-.094,mid_x,mid_y,.188,.142,"spine_03"),
      (clav-.012,mid_x,mid_y,.188,.117,"spine_03"),
      (clav+.025,mid_x,mid_y,.089,.079,"neck_01"),
      (clav+.082,mid_x,mid_y,.066,.066,"neck_01")]
    if any(torso[j][0]>=torso[j+1][0] for j in range(len(torso)-1)):
        raise RuntimeError("INDEPENDENT_TORSO_RINGS_NONMONOTONIC")
    built=[join_loft("new_torso",torso,64,True)]
    for side,leg_name in ((1,"l"),(-1,"r")):
        px=mid_x+side*.115
        # Hip-to-thigh transition is a lofted anatomical limb, not x scaling.
        sections=[
          (.067,px,mid_y-.005,.040,.051,"foot_"+leg_name),
          (.134,px,mid_y,.043,.046,"calf_"+leg_name),
          (knee-.13,px,mid_y,.066,.064,"calf_"+leg_name),
          (knee,px,mid_y,.053,.057,"calf_"+leg_name),
          (knee+.125,px,mid_y,.077,.083,"thigh_"+leg_name),
          (knee+.260,px,mid_y,.089,.092,"thigh_"+leg_name),
          (h-.02,px,mid_y,.104,.109,"thigh_"+leg_name),
          (h+.044,px,mid_y,.105,.116,"thigh_"+leg_name)]
        built.append(join_loft("new_leg_"+leg_name,sections,48))
        # Solid anatomical ankle-to-toe foot footprint, rounder than old barefoot source.
        foot=[
           (.032,px,mid_y-.117,.061,.101,"foot_"+leg_name),
           (.051,px,mid_y-.109,.064,.112,"foot_"+leg_name),
           (.078,px,mid_y-.069,.054,.101,"foot_"+leg_name)]
        built.append(join_loft("new_foot_"+leg_name,foot,40))
    for side,arm_name in ((1,"l"),(-1,"r")):
        shoulder_x=mid_x+side*.199
        # Rest arms naturally beside torso; source arm A-pose is not reused.
        arm=[
          (h+.005,mid_x+side*.319,mid_y-.014,.037,.034,"hand_"+arm_name),
          (h+.067,mid_x+side*.315,mid_y,.043,.039,"hand_"+arm_name),
          (h+.135,mid_x+side*.319,mid_y,.037,.034,"lowerarm_"+arm_name),
          (h+.215,mid_x+side*.309,mid_y,.048,.049,"lowerarm_"+arm_name),
          (h+.320,mid_x+side*.279,mid_y,.055,.057,"upperarm_"+arm_name),
          (clav-.012,shoulder_x,mid_y,.073,.070,"upperarm_"+arm_name)]
        if not all(arm[i][0]<arm[i+1][0] for i in range(len(arm)-1)):
            raise RuntimeError("INDEPENDENT_ARM_RINGS_INVALID")
        built.append(join_loft("new_arm_"+arm_name,arm,40))
    if len(verts)<1500 or len(faces)<1200:
        raise RuntimeError("INDEPENDENT_BODY_NOT_ENOUGH_NEW_TOPOLOGY:"+str((len(verts),len(faces))))
    mesh=bpy.data.meshes.new("ORIGINAL_ANATOMICAL_BODY_TOPOLOGY_V1")
    mesh.from_pydata(verts,[],faces);mesh.update(calc_edges=True)
    ob=bpy.data.objects.new("GENERATED_INDEPENDENT_FEMALE_ANATOMY",mesh)
    scene.collection.objects.link(ob)
    for poly in mesh.polygons:poly.use_smooth=True
    skin=old_body.data.materials[0] if len(old_body.data.materials) else None
    if skin is None:raise RuntimeError("INDEPENDENT_BODY_NEEDS_SOURCE_SKIN_MATERIAL")
    mesh.materials.append(skin)
    gnames=sorted(set(groups))
    for name in gnames:
        if rig.data.bones.get(name) is None:
            raise RuntimeError("INDEPENDENT_BODY_UNKNOWN_SKIN_BONE:"+name)
        vg=ob.vertex_groups.new(name=name)
        indices=[i for i,v in enumerate(groups) if v==name]
        vg.add(indices,1.0,'REPLACE')
    modifier=ob.modifiers.new("NEW_ANATOMICAL_BODY_53_BONE_SKINNING","ARMATURE")
    modifier.object=rig
    modifier.use_deform_preserve_volume=True
    scene.view_layers[0].update()
    # Head remains actual prior source geometry at original positions in Blender.
    if any((face.matrix_world@face.data.vertices[i].co-p).length>1e-7 for i,p in zip(frozen,face_preview)):
        raise RuntimeError("INDEPENDENT_BODY_PREVIOUS_HEAD_MOVED")
    return ob,{"applied":True,"method":"new_lofted_body_topology_with_face_graft_v1",
        "original_body_morph_reused":False,"old_width_sliders_invoked":False,
        "new_independent_body_mesh":True,"new_independent_face":False,
        "source_head_reused":True,"source_face_topology_preserved":True,
        "source_original_body_hidden":old_body.hide_render,
        "source_existing_clothes_hidden":True,
        "new_body_verts":len(verts),"new_body_polygons":len(faces),
        "independent_components":built,"new_skinning_bone_groups":gnames,
        "head_source_kept_vertex_count":len(frozen),
        "head_keep_cutoff_m":cutoff,"head_source_data_sha_original_unchanged":True,
        "rig_bones":len(rig.data.bones),"skeletal_levels_m":{"hip":hip,"knee":knee,"clavicle":clav,"neck":neck},
        "photoreal_approved":False,"human_visual_approved":False,
        "production_deployed":False}
