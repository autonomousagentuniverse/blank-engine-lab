"""Deterministic one-shot humanoid armature for canonical MakeHuman meshes.

This is a first-stage procedural deformation rig, NOT a certified production
human rig. Bone anchors scale with measured stature and mesh extremities.
Skin weights are normalized and preserve source topology in rest pose.
"""
import bpy, math, subprocess, shutil
from mathutils import Vector
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
    return rig

def assign_weights(body,rig,height):
    h=height
    groups={name:body.vertex_groups.new(name=name) for name in BONES}
    stats=Counter()
    # The native anatomy is an A-pose. Assign arms when clearly outside
    # torso silhouette and legs beneath hip center; soften transitions
    # at shoulders, hip and major bending joints.
    for v in body.data.vertices:
        x,y,z=v.co
        xabs=abs(x); side='R' if x>=0 else 'L'
        weights={}
        def add(name,w):
            if w>1e-6:weights[name]=weights.get(name,0)+w
        zn=z/h
        # trunk layers: head/neck strongly localized, preserve face shape.
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

        if .535<zn<.835:
            # Arm A-pose emerges laterally at shoulder, descends to wrist.
            # Allow broad bands at shoulder/upper arm without deforming chest.
            threshold=(.135 if zn>.745 else .158 if zn>.665 else .175)*h
            arm_factor=mix(threshold,threshold+.039*h,xabs)
            arm_factor*=mix(.535,.578,zn)*(1-mix(.800,.843,zn))
            if arm_factor>.001:
                if zn>=.72:
                    p=mix(.765,.795,zn)
                    limb={'UpperArm.'+side:1-p,'Clavicle.'+side:p}
                elif zn>=.675:
                    p=mix(.677,.718,zn)
                    limb={'Forearm.'+side:1-p,'UpperArm.'+side:p}
                else:
                    p=mix(.567,.602,zn)
                    limb={'Hand.'+side:1-p,'Forearm.'+side:p}
                for name in weights:weights[name]*=(1-arm_factor)
                for name,weight in limb.items():add(name,arm_factor*weight)

        if zn<.535:
            leg_factor=mix(.035,.08,xabs/h)*(1-mix(.492,.53,zn))
            # Entire leg below mid-thigh belongs to one side, even at toes.
            if zn<.40:leg_factor=1.0
            if leg_factor>.001:
                if zn>=.32:
                    p=mix(.32,.375,zn)
                    leg={'Shin.'+side:1-p,'Thigh.'+side:p}
                elif zn>=.08:
                    p=mix(.078,.123,zn)
                    leg={'Shin.'+side:p,'Foot.'+side:1-p}
                elif zn>=.029:
                    p=mix(.028,.078,zn)
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
                rig.pose.bones['Root'].location=vec
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

def gait_action(rig,name,stride,arm,frequency,knee_lift,bob):
    poses=[]
    frames=[1,7,13,19,25,31,37,43,49]
    for i in range(len(frames)):
        t=2*math.pi*i/(len(frames)-1)*frequency
        s=math.sin(t)
        poses.append({
         'RootLocation':(0,0,bob*.5*(1-math.cos(2*t))),
         'Pelvis':(0,0,.035*math.sin(t)),
         'Spine':(.025*math.sin(2*t),0,-.02*math.sin(t)),
         'Thigh.L':(stride*s,0,0),'Thigh.R':(-stride*s,0,0),
         'Shin.L':(-knee_lift*max(0,math.sin(t+1.0)),0,0),
         'Shin.R':(-knee_lift*max(0,math.sin(t+math.pi+1.0)),0,0),
         'UpperArm.L':(-arm*s,0,0),'UpperArm.R':(arm*s,0,0),
         'Forearm.L':(-.12,0,0),'Forearm.R':(-.12,0,0)
        })
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
      ('walk',(.23,.18,1,.24,.012)),
      ('jog',(.39,.29,1.5,.36,.023)),
      ('run',(.56,.45,2,.5,.045))]:
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


def render_animation_previews(rig,body,out,controls):
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
        scene.render.resolution_y=min(360,int(controls['render.resolution']))
        scene.render.resolution_x=2*round(scene.render.resolution_y*.72/2)
        scene.cycles.samples=min(2,int(controls['render.samples']))
        scene.frame_start=1;scene.frame_end=49;scene.frame_step=4
        scene.render.fps=8;scene.render.image_settings.file_format='PNG'
        for kind,clip in PREVIEW_CLIPS:
            scene.camera=bpy.data.objects['Camera-Face-Macro' if kind in FACE_KEYS else 'Camera-Front']
            for track in tracks:track.mute=track.name!=clip
            for track in face_tracks:track.mute=track.name!=clip
            scene.frame_set(1)
            folder=out/('frames_'+kind)
            folder.mkdir(exist_ok=True)
            scene.render.filepath=str(folder/'frame_')
            bpy.ops.render.render(animation=True)
            pngs=sorted(folder.glob('frame_*.png'))
            if len(pngs)!=13:raise RuntimeError('Expected 13 rendered '+kind+' frames, got '+str(len(pngs)))
            filename=kind+'_preview.mp4'
            dest=out/filename
            command=[encoder,'-y','-hide_banner','-loglevel','error',
                     '-framerate','8','-pattern_type','glob','-i',
                     str(folder/'frame_*.png'),'-c:v','libx264','-preset','fast',
                     '-pix_fmt','yuv420p','-movflags','+faststart',str(dest)]
            result=subprocess.run(command,capture_output=True,text=True,timeout=90)
            if result.returncode:
                raise RuntimeError('FFmpeg '+kind+': '+result.stderr[-300:])
            size=dest.stat().st_size
            if size<6000:raise RuntimeError('Empty '+kind+' animation MP4')
            preview.append({'kind':kind,'clip':clip,'file':filename,
                            'bytes':size,'frames':len(pngs),'fps':8,
                            'duration_seconds':13/8,
                            'camera':'face' if kind in FACE_KEYS else 'body'})
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
