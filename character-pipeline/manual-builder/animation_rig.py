"""Deterministic one-shot humanoid armature for canonical MakeHuman meshes.

This is a first-stage procedural deformation rig, NOT a certified production
human rig. Bone anchors scale with measured stature and mesh extremities.
Skin weights are normalized and preserve source topology in rest pose.
"""
import bpy, math, subprocess, shutil
from mathutils import Vector, Matrix
from collections import Counter

BONES=('Root','Pelvis','Spine','Chest','Neck','Head',
       'Clavicle.L','Clavicle.R',
       'UpperArm.L','UpperArm.R','Forearm.L','Forearm.R','Hand.L','Hand.R',
       'Thigh.L','Thigh.R','Shin.L','Shin.R','Foot.L','Foot.R','Toes.L','Toes.R')

def mix(lo,hi,x):
    t=max(0.0,min(1.0,(x-lo)/max(1e-9,hi-lo)))
    return t*t*(3-2*t)

def make_armature(height):
    h=height
    bpy.ops.object.armature_add(enter_editmode=False,location=(0,0,0))
    rig=bpy.context.object
    rig.name='ANATOMICAL_HUMAN_ARMATURE'
    rig.data.name='AnatomyRig-v1'
    bpy.ops.object.mode_set(mode='EDIT')
    for b in list(rig.data.edit_bones):
        rig.data.edit_bones.remove(b)
    def bone(name,head,tail,parent=None):
        b=rig.data.edit_bones.new(name)
        b.head=head
        b.tail=tail
        if parent:b.parent=rig.data.edit_bones[parent]
        b.use_connect=False
        return b
    bone('Root',(0,0,.49*h),(0,0,.54*h))
    bone('Pelvis',(0,0,.49*h),(0,0,.59*h),'Root')
    bone('Spine',(0,0,.59*h),(0,0,.71*h),'Pelvis')
    bone('Chest',(0,0,.71*h),(0,0,.81*h),'Spine')
    bone('Neck',(0,0,.81*h),(0,0,.86*h),'Chest')
    bone('Head',(0,0,.86*h),(0,0,.99*h),'Neck')
    for side in ('L','R'):
        sign=1 if side=='R' else -1
        shoulder=(sign*.175*h,0,.79*h)
        elbow=(sign*.238*h,0,.69*h)
        wrist=(sign*.293*h,0,.584*h)
        palm=(sign*.309*h,0,.550*h)
        hip=(sign*.108*h,0,.495*h)
        knee=(sign*.116*h,0,.288*h)
        ankle=(sign*.120*h,0,.072*h)
        ball=(sign*.130*h,-.06*h,.036*h)
        toe=(sign*.131*h,-.128*h,.026*h)
        bone('Clavicle.'+side,(sign*.095*h,0,.78*h),shoulder,'Chest')
        bone('UpperArm.'+side,shoulder,elbow,'Clavicle.'+side)
        bone('Forearm.'+side,elbow,wrist,'UpperArm.'+side)
        bone('Hand.'+side,wrist,palm,'Forearm.'+side)
        bone('Thigh.'+side,hip,knee,'Pelvis')
        bone('Shin.'+side,knee,ankle,'Thigh.'+side)
        bone('Foot.'+side,ankle,ball,'Shin.'+side)
        bone('Toes.'+side,ball,toe,'Foot.'+side)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in rig.pose.bones:p.rotation_mode='XYZ'
    rig.show_in_front=True
    rig['rig_stature_m']=height
    return rig

def assign_weights(body,rig,height):
    """Joint-space limb weights for the MakeHuman A-pose.

    A human's hand is not a horizontal Z slice. Earlier height-gated weights
    often assigned fingers to Forearm or body, and abrupt shoulder/hip weights
    tore the skin when walking. Use projected *arm-axis distance* instead,
    with overlapping, smooth transitions to trunk and pelvis.
    """
    h=height
    groups={name:body.vertex_groups.new(name=name) for name in BONES}
    stats=Counter()
    shoulder=(.175,.79)
    wrist=(.293,.584)
    arm_dx=wrist[0]-shoulder[0]
    arm_dz=wrist[1]-shoulder[1]
    arm_sq=arm_dx*arm_dx+arm_dz*arm_dz
    for v in body.data.vertices:
        x,y,z=v.co
        xn=abs(x)/h
        zn=z/h
        side='R' if x>=0 else 'L'
        weights={}
        def add(name,w):
            if w>1e-7:weights[name]=weights.get(name,0.0)+w

        # Core layers are blended continuously at neck/chest/pelvis joints.
        if zn>.855:
            t=mix(.845,.885,zn)
            add('Neck',1-t);add('Head',t)
        elif zn>.77:
            t=mix(.775,.84,zn)
            add('Chest',1-t);add('Neck',t)
        elif zn>.64:
            t=mix(.65,.74,zn)
            add('Spine',1-t);add('Chest',t)
        elif zn>.52:
            t=mix(.55,.62,zn)
            add('Pelvis',1-t);add('Spine',t)
        else:
            add('Pelvis',1)

        # Arm membership is spatially gated, not cut off at the hand's Z.
        arm_factor=mix(.115,.193,xn)*mix(.47,.53,zn)*(1-mix(.790,.854,zn))
        if arm_factor>1e-6:
            t=((xn-shoulder[0])*arm_dx+(zn-shoulder[1])*arm_dz)/arm_sq
            collar=1-mix(-.06,.16,t)
            elbow=mix(.41,.59,t)
            fingers=mix(.855,1.075,t)
            limb={
                'Clavicle.'+side:(1-fingers)*(1-elbow)*collar,
                'UpperArm.'+side:(1-fingers)*(1-elbow)*(1-collar),
                'Forearm.'+side:(1-fingers)*elbow,
                'Hand.'+side:fingers
            }
            for name in weights:weights[name]*=(1-arm_factor)
            for name,weight in limb.items():add(name,arm_factor*weight)

        # Broad, soft pelvis/thigh blending prevents a crease at the groin.
        # At low Z the two legs are physically separated, including toes.
        leg_factor=(1-mix(.405,.585,zn))
        if zn>.40:leg_factor*=mix(.005,.070,xn)
        if leg_factor>1e-6:
            if zn>=.275:
                p=mix(.275,.345,zn)
                leg={'Shin.'+side:1-p,'Thigh.'+side:p}
            elif zn>=.075:
                p=mix(.065,.125,zn)
                leg={'Shin.'+side:p,'Foot.'+side:1-p}
            elif zn>=.027:
                p=mix(.025,.069,zn)
                leg={'Toes.'+side:1-p,'Foot.'+side:p}
            else:
                leg={'Toes.'+side:1}
            for name in weights:weights[name]*=(1-leg_factor)
            for name,weight in leg.items():add(name,leg_factor*weight)

        total=sum(weights.values())
        if total<1e-9:raise RuntimeError('Rig missing weights for vertex '+str(v.index))
        for name,weight in weights.items():
            value=weight/total
            if value>1e-5:
                groups[name].add([v.index],value,'REPLACE')
                stats[name]+=1
    modifier=body.modifiers.new('Armature-Deform','ARMATURE')
    modifier.object=rig
    modifier.use_deform_preserve_volume=True
    body.parent=rig
    return dict(stats)

def attach_to_head(obj,rig):
    original=obj.matrix_world.copy()
    obj.parent=rig
    obj.parent_type='BONE'
    obj.parent_bone='Head'
    obj.matrix_world=original

def key_pose(rig,action_name,poses,frames):
    action=bpy.data.actions.new(action_name)
    if not rig.animation_data:rig.animation_data_create()
    rig.animation_data.action=action
    for frame,values in zip(frames,poses):
        for name in BONES:
            b=rig.pose.bones[name]
            b.rotation_euler=(0,0,0)
            b.location=(0,0,0)
        for name,vec in values.items():
            if name=='RootLocation':
                rig.pose.bones['Root'].location=rig.data.bones['Root'].matrix_local.to_3x3().inverted() @ Vector(vec)
            else:
                rig.pose.bones[name].rotation_euler=vec
        for bone in rig.pose.bones:
            bone.keyframe_insert(data_path='rotation_euler',frame=frame,group=bone.name)
        rig.pose.bones['Root'].keyframe_insert(data_path='location',frame=frame,group='Root')
    rig.animation_data.action=None
    track=rig.animation_data.nla_tracks.new()
    track.name=action_name
    strip=track.strips.new(action_name,int(frames[0]),action)
    strip.action_frame_start=min(frames);strip.action_frame_end=max(frames)
    strip.extrapolation='NOTHING'
    return action

CLIPS={
 'idle':'Idle_Breath','walk':'Walk_InPlace','jog':'Jog_InPlace',
 'run':'Run_InPlace','happy':'Happy_Face','sad':'Sad_Face',
 'angry':'Angry_Face','laugh':'Laugh','fight':'Fight_Combo'
}
FACE_KEYS={'happy':'Happy','sad':'Sad','angry':'Angry','laugh':'Laugh'}
PREVIEW_CLIPS=list(CLIPS.items())

def make_face_shape_keys(body,height):
    """Author actual expressive mesh morphs in the current MakeHuman head.
    No face texture swapping or head rotations posing as facial expression.
    This initial region-based rig is approximate, not facial FACS certification.
    """
    h=height
    body.shape_key_add(name='Basis')
    shapes={}
    for kind in FACE_KEYS.values():
        shapes[kind]=body.shape_key_add(name=kind)
    modified={name:0 for name in shapes}
    for v in body.data.vertices:
        x,y,z=v.co
        # Front-side face only. Blender face points toward negative Y.
        visible=mix(.025*h,.075*h,-y)
        mouth=math.exp(-((z-.886*h)/(.022*h))**2)
        brow=math.exp(-((z-.932*h)/(.018*h))**2)
        cheek=math.exp(-((z-.906*h)/(.018*h))**2)
        corner=math.exp(-((abs(x)-.037*h)/(.023*h))**2)
        center=math.exp(-(x/(.042*h))**2)
        brow_inner=math.exp(-((abs(x)-.026*h)/(.025*h))**2)
        if visible<.02:continue
        for key,shape in shapes.items():
            # Pull corners upward for a smile, lower for sadness. Laughter
            # also opens the lower lip and raises cheeks; anger tightens brow.
            dx=dy=dz=0.0
            if key=='Happy':
                dz=.0052*h*mouth*corner
                dx=math.copysign(.0025*h*mouth*corner,x)
                dy=-.0016*h*cheek*corner
            elif key=='Sad':
                dz=-.0042*h*mouth*corner+.0018*h*brow*brow_inner
                dx=-math.copysign(.0012*h*mouth*corner,x)
            elif key=='Angry':
                dz=-.0045*h*brow*brow_inner
                dx=-math.copysign(.002*h*brow*brow_inner,x)
                dy=-.002*h*brow*brow_inner
            elif key=='Laugh':
                dz=.006*h*mouth*corner-.008*h*mouth*center*(1-mix(.886,.896,z/h))
                dx=math.copysign(.0045*h*mouth*corner,x)
                dy=-.003*h*cheek*corner
            power=visible
            if abs(dx)+abs(dy)+abs(dz)>1e-7:
                pt=shape.data[v.index].co
                pt.x+=dx*power;pt.y+=dy*power;pt.z+=dz*power
                modified[key]+=1
    if any(count<25 for count in modified.values()):
        raise RuntimeError('Facial region selection insufficient: '+str(modified))
    return modified

def face_key_track(body,clip,kind):
    shape_keys=body.data.shape_keys
    if not shape_keys.animation_data:shape_keys.animation_data_create()
    act=bpy.data.actions.new('Face_'+clip)
    shape_keys.animation_data.action=act
    for frame,weight in [(1,0),(13,.85),(25,1),(37,.85),(49,0)]:
        for name in FACE_KEYS.values():
            key=shape_keys.key_blocks[name]
            key.value=weight if name==FACE_KEYS[kind] else 0
            key.keyframe_insert(data_path='value',frame=frame)
    shape_keys.animation_data.action=None
    track=shape_keys.animation_data.nla_tracks.new()
    track.name=clip
    strip=track.strips.new('Face_'+clip,1,act)
    strip.action_frame_start=1;strip.action_frame_end=49
    strip.extrapolation='NOTHING'
    for name in FACE_KEYS.values():shape_keys.key_blocks[name].value=0


def sagittal_rotation(rig,bone_name,world_x_radians,world_y_radians=0):
    """Pose bone from desired world sagittal X and adduction Y rotations."""
    mat=rig.data.bones[bone_name].matrix_local.to_3x3()
    local=mat.inverted() @ (Matrix.Rotation(world_x_radians,3,'X') @ Matrix.Rotation(world_y_radians,3,'Y')) @ mat
    return tuple(local.to_euler('XYZ'))

def solve_leg_2d(h,dy,foot_height,hip_height,forward_bias=1):
    """Two-bone analytic sagittal IK from ankle target to thigh/knee angles."""
    upper=.207*h;lower=.216*h
    dz=foot_height-hip_height
    d=math.hypot(dy,dz)
    if d<.02*h:raise RuntimeError('Degenerate leg IK target')
    max_reach=upper+lower-.0002*h
    if d>max_reach:
        f=max_reach/d;dy*=f;dz*=f;d=max_reach
    lower_reach=abs(upper-lower)+.0002*h
    if d<lower_reach:
        f=lower_reach/d;dy*=f;dz*=f;d=lower_reach
    a=(upper*upper-lower*lower+d*d)/(2*d)
    bend=math.sqrt(max(0,upper*upper-a*a))
    v_y,v_z=dy/d,dz/d
    ky=a*v_y+bend*v_z*forward_bias
    kz=a*v_z-bend*v_y*forward_bias
    sh_y=dy-ky;sh_z=dz-kz
    hip_angle=math.atan2(ky,-kz)
    shin_absolute=math.atan2(sh_y,-sh_z)
    knee_relative=shin_absolute-hip_angle
    return hip_angle,knee_relative

def gait_action(rig,name,stride,arm,frequency,knee_lift,bob):
    """Alternating stance and lifted swing with ankle-target knee IK."""
    h=rig['rig_stature_m']
    frames=list(range(1,50,3))
    poses=[]
    flight='Run' in name or 'Jog' in name
    for i,frame in enumerate(frames):
        phase=2*math.pi*i/(len(frames)-1)*frequency
        root_bob=bob*h*(.30+.70*(.5-.5*math.cos(2*phase)))
        hip_drop=(.024 if 'Walk' in name else .038 if 'Jog' in name else .050)*h
        root_z=-hip_drop+root_bob
        pose={'RootLocation':(0,0,root_z),
              'Pelvis':(.015*math.sin(2*phase),0,.032*math.sin(phase)),
              'Spine':(.026*math.sin(2*phase),0,-.028*math.sin(phase)),
              'Chest':(.025 if flight else .015,0,0),
              'Head':(-.018 if flight else -.01,0,0)}
        for side,offset in [('L',0),('R',math.pi)]:
            t=phase+offset
            backward=math.cos(t)<0
            dy=-stride*h*math.sin(t)
            clearance=max(0,math.cos(t))**2*knee_lift*h*.27
            ground_ankle=.072*h+clearance
            hip=.495*h+root_z
            hip_angle,knee_angle=solve_leg_2d(h,dy,ground_ankle,hip)
            pose['Thigh.'+side]=sagittal_rotation(rig,'Thigh.'+side,hip_angle)
            pose['Shin.'+side]=sagittal_rotation(rig,'Shin.'+side,knee_angle)
            ankle_pitch=(-.12 if backward else .08)*math.sin(t)
            pose['Foot.'+side]=sagittal_rotation(rig,'Foot.'+side,ankle_pitch-hip_angle-knee_angle)
            pose['Toes.'+side]=sagittal_rotation(rig,'Toes.'+side,.17*max(0,-math.cos(t)))
            arms=-arm*math.sin(t)
            sign=1 if side=='R' else -1
            pose['UpperArm.'+side]=sagittal_rotation(rig,'UpperArm.'+side,arms,sign*.53)
            pose['Forearm.'+side]=sagittal_rotation(rig,'Forearm.'+side,-.45 if flight else -.30,sign*.14)
        poses.append(pose)
    return key_pose(rig,name,poses,frames)

def create_animations(rig,body):
    actions=[]
    idle=[]
    for i in range(5):
        t=i*math.pi/2
        idle.append({
            'Spine':(.015*math.sin(t),0,.012*math.sin(t)),
            'Chest':(-.019*math.sin(t),0,.014*math.sin(t)),
            'Head':(.018*math.sin(t+.6),0,0),
            'UpperArm.L':(.028*math.sin(t+.2),0,0),
            'UpperArm.R':(-.028*math.sin(t+.2),0,0),
            'RootLocation':(0,0,.004*math.sin(t))
        })
    actions.append(key_pose(rig,CLIPS['idle'],idle,[1,13,25,37,49]))
    for kind,params in [
      ('walk',(.095,.24,1,.13,.006)),
      ('jog',(.13,.36,2,.25,.013)),
      ('run',(.16,.53,2,.37,.021))]:
        actions.append(gait_action(rig,CLIPS[kind],*params))
    for kind in FACE_KEYS:
        clip=CLIPS[kind]
        face_key_track(body,clip,kind)
        poses=[]
        for i in range(5):
            t=i*math.pi/2
            poses.append({
             'Head':(.035*math.sin(t+(.7 if kind=='laugh' else 0)),0,
                     .02*math.sin(t)),
             'Chest':(.018*math.sin(t),0,0),
             'UpperArm.L':(.06*math.sin(t),0,0),
             'UpperArm.R':(-.06*math.sin(t),0,0)
            })
        actions.append(key_pose(rig,clip,poses,[1,13,25,37,49]))
    # No weapon geometry. This is a stylised guard, alternating punches,
    # torso recoil and returning neutral; no impacts/collision are implied.
    fight=[]
    for i in range(9):
        t=i*math.pi/4
        punch_l=max(0,math.sin(t))
        punch_r=max(0,-math.sin(t))
        fight.append({
          'Chest':(.04*math.sin(t*2),0,.13*math.sin(t)),
          'Pelvis':(0,0,-.05*math.sin(t)),
          'UpperArm.L':(-.45-.55*punch_l,0,.22),
          'UpperArm.R':(-.45-.55*punch_r,0,-.22),
          'Forearm.L':(-.75+.5*punch_l,0,0),
          'Forearm.R':(-.75+.5*punch_r,0,0),
          'Thigh.L':(.08*math.sin(t),0,0),
          'Thigh.R':(-.08*math.sin(t),0,0),
          'RootLocation':(0,0,.01*math.sin(t*2))
        })
    actions.append(key_pose(rig,CLIPS['fight'],fight,list(range(1,50,6))))
    return actions

def export_glb(rig,body,attachments,out):
    scene=bpy.context.scene
    bpy.ops.object.select_all(action='DESELECT')
    objs=[rig,body]+list(attachments)
    for obj in objs:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    scene.frame_set(1)
    filepath=str(out/'animated_character.glb')
    # Actions are registered through NLA: both Idle_Breath & Walk_InPlace.
    kwargs=dict(filepath=filepath,export_format='GLB',use_selection=True,
                export_animations=True,export_skins=True,
                export_animation_mode='NLA_TRACKS',export_apply=False)
    bpy.ops.export_scene.gltf(**kwargs)
    for obj in objs:obj.select_set(False)
    return filepath

def audit_deformation(rig,body,clip_names):
    deps=bpy.context.evaluated_depsgraph_get()
    # Evaluate animated skinned vertices; this never mutates original mesh.
    rest=[]
    bpy.context.scene.frame_set(1)
    for v in body.data.vertices:rest.append(v.co.copy())
    tests={}
    tracks=list(rig.animation_data.nla_tracks)
    face_tracks=list(body.data.shape_keys.animation_data.nla_tracks)
    for clip in clip_names:
        for track in tracks:track.mute=track.name!=clip
        for track in face_tracks:track.mute=track.name!=clip
        per_clip={}
        for frame in (7,13,19,25):
            bpy.context.scene.frame_set(frame)
            evaluated=body.evaluated_get(deps)
            mesh=evaluated.to_mesh()
            try:
                if len(mesh.vertices)!=len(rest):raise RuntimeError('Animation changed mesh topology')
                disp=[(mesh.vertices[i].co-rest[i]).length for i in range(len(rest))]
                max_d=max(disp);moved=sum(d>.001 for d in disp)
                if max_d>1.0:raise RuntimeError('Unstable skeletal deformation in '+clip)
                per_clip[str(frame)]={'moving_vertices':moved,'max_displacement_m':round(max_d,5)}
            finally:evaluated.to_mesh_clear()
        if not any(v['moving_vertices']>500 for v in per_clip.values()):
            raise RuntimeError(clip+' animation has no substantive vertex motion')
        tests[clip]=per_clip
    for track in tracks+face_tracks:track.mute=True
    bpy.context.scene.frame_set(1)
    return tests



def audit_skin_strain(rig,body,limit=4.35):
    """Reject spiking/skinning tears using evaluated edge-length preservation.

    Motion audits only counting moving vertices previously let grotesquely
    extended elbows, wrists and hip seams pass. Evaluate the real skinned
    surface over locomotion and fight, not the unposed basemesh.
    """
    rest=[v.co.copy() for v in body.data.vertices]
    edges=[(edge.vertices[0],edge.vertices[1]) for edge in body.data.edges]
    eligible=[(a,b,(rest[a]-rest[b]).length) for a,b in edges
              if (rest[a]-rest[b]).length>=.0001]
    tracks=list(rig.animation_data.nla_tracks)
    face_tracks=list(body.data.shape_keys.animation_data.nla_tracks)
    deps=bpy.context.evaluated_depsgraph_get()
    results={}
    try:
        for clip in ('Walk_InPlace','Jog_InPlace','Run_InPlace','Fight_Combo'):
            for tr in tracks:tr.mute=tr.name!=clip
            for tr in face_tracks:tr.mute=True
            worst=0.0;worst_frame=0;over_four=0
            for frame in (7,13,19,25,31,37,43):
                bpy.context.scene.frame_set(frame)
                evaluated=body.evaluated_get(deps)
                mesh=evaluated.to_mesh()
                try:
                    if len(mesh.vertices)!=len(rest):
                        raise RuntimeError('Skinned mesh changed topology')
                    moved=[v.co.copy() for v in mesh.vertices]
                    count=0
                    for a,b,original in eligible:
                        current=(moved[a]-moved[b]).length
                        stretch=max(current/original, original/max(current,.000001))
                        if stretch>worst:worst=stretch;worst_frame=frame
                        if stretch>4:count+=1
                    over_four=max(over_four,count)
                finally:
                    evaluated.to_mesh_clear()
            results[clip]={'max_edge_length_ratio':round(worst,4),
                           'worst_frame':worst_frame,
                           'max_edges_over_4x':over_four,
                           'sampled_frames':7}
            if worst>limit:
                raise RuntimeError(f'{clip} skin strain {worst:.2f}x exceeds {limit}x; reject torn anatomy')
    finally:
        for tr in tracks+face_tracks:tr.mute=True
        bpy.context.scene.frame_set(1)
    return results

def audit_biomechanics(rig,height):
    """Measure actual posed ankle geometry, reject floating stance / root drift."""
    out={}
    tracks=list(rig.animation_data.nla_tracks)
    ground=.072*height
    for kind in ('Walk_InPlace','Jog_InPlace','Run_InPlace'):
        for track in tracks:track.mute=track.name!=kind
        sides={}
        for side in ('L','R'):
            heights=[];hips=[];forward=[]
            for frame in range(1,50,3):
                bpy.context.scene.frame_set(frame)
                bpy.context.view_layer.update()
                ankle=rig.pose.bones['Shin.'+side].tail
                hip=rig.pose.bones['Thigh.'+side].head
                heights.append(ankle.z)
                forward.append(ankle.y)
                hips.append(hip.y)
            low=min(heights);high=max(heights)
            stance_count=sum(abs(z-ground)<.025 for z in heights)
            if stance_count<3 or abs(low-ground)>.025:
                raise RuntimeError(f'{kind}/{side} floating stance: {low:.3f} target {ground:.3f}')
            if high-low<.04:raise RuntimeError(f'{kind}/{side} insufficient swing clearance')
            if max(abs(y) for y in hips)>.04:raise RuntimeError(f'{kind}/{side} has root-axis drift')
            sides[side]={'stance_frames':stance_count,
                         'ground_ankle_m':round(low,4),'max_ankle_m':round(high,4),
                         'clearance_m':round(high-low,4),
                         'sagittal_range_m':round(max(forward)-min(forward),4)}
        out[kind]=sides
    for track in tracks:track.mute=True
    bpy.context.scene.frame_set(1)
    return out

def render_animation_previews(rig,body,out,controls,selected=None):
    encoder=shutil.which('ffmpeg')
    if not encoder:raise RuntimeError('FFmpeg executable required for animation previews')
    scene=bpy.context.scene
    original=(scene.render.image_settings.file_format,scene.render.resolution_x,
              scene.render.resolution_y,scene.render.filepath,
              scene.cycles.samples,scene.frame_start,scene.frame_end,
              scene.frame_step,scene.render.fps)
    preview=[]
    tracks=list(rig.animation_data.nla_tracks)
    face_tracks=list(body.data.shape_keys.animation_data.nla_tracks)
    try:
        # Short preview clips; full editable animation stays in GLB and .blend.
        scene.render.resolution_y=min(640,int(controls['render.resolution']))
        scene.render.resolution_x=2*round(scene.render.resolution_y*.72/2)
        scene.cycles.samples=max(12,min(24,int(controls['render.samples'])))
        scene.cycles.use_denoising=True
        for layer in scene.view_layers:layer.cycles.use_denoising=True
        scene.frame_start=1;scene.frame_end=49;scene.frame_step=3
        scene.render.fps=12;scene.render.image_settings.file_format='PNG'
        clip_order=sorted(PREVIEW_CLIPS,key=lambda pair:0 if pair[0]==selected else 1)
        for kind,clip in clip_order:
            scene.camera=bpy.data.objects['Camera-Face-Macro' if kind in FACE_KEYS else 'Camera-Front']
            for track in tracks:track.mute=track.name!=clip
            for track in face_tracks:track.mute=track.name!=clip
            scene.frame_set(1)
            folder=out/('frames_'+kind)
            folder.mkdir(exist_ok=True)
            scene.render.filepath=str(folder/'frame_')
            bpy.ops.render.render(animation=True)
            pngs=sorted(folder.glob('frame_*.png'))
            if len(pngs)!=17:raise RuntimeError('Expected 17 rendered '+kind+' frames, got '+str(len(pngs)))
            filename=kind+'_preview.mp4'
            dest=out/filename
            encoding=out/(kind+'_encoding.mp4')
            command=[encoder,'-y','-hide_banner','-loglevel','error',
                     '-framerate','12','-pattern_type','glob','-i',
                     str(folder/'frame_*.png'),'-c:v','libx264','-preset','fast',
                     '-pix_fmt','yuv420p','-movflags','+faststart',str(encoding)]
            result=subprocess.run(command,capture_output=True,text=True,timeout=90)
            if result.returncode:
                raise RuntimeError('FFmpeg '+kind+': '+result.stderr[-300:])
            encoding.replace(dest)
            size=dest.stat().st_size
            if size<6000:raise RuntimeError('Empty '+kind+' animation MP4')
            preview.append({'kind':kind,'clip':clip,'file':filename,
                            'bytes':size,'frames':len(pngs),'fps':12,
                            'duration_seconds':17/12,
                            'camera':'face' if kind in FACE_KEYS else 'body',
                            'height_px':scene.render.resolution_y,
                            'cycles_samples':scene.cycles.samples,
                            'denoised':all(layer.cycles.use_denoising for layer in scene.view_layers)})
            shutil.rmtree(folder)
        return preview
    finally:
        fmt,width,height,path,samples,start,end,step,fps=original
        scene.render.image_settings.file_format=fmt
        scene.render.resolution_x=width;scene.render.resolution_y=height
        scene.render.filepath=path;scene.cycles.samples=samples
        scene.frame_start=start;scene.frame_end=end;scene.frame_step=step
        scene.render.fps=fps
        for track in tracks+face_tracks:track.mute=True
        scene.frame_set(1)
