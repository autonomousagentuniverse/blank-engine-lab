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

def create_animations(rig):
    # Blender pose axes belong to each bone's local frame. Low-amplitude
    # motion is intentionally conservative until deformation QA approves
    # more expressive locomotion.
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
    idle_act=key_pose(rig,'Idle_Breath',idle,[1,13,25,37,49])
    walk=[]
    for i in range(9):
        t=i*math.pi/4
        swing=.23*math.sin(t)
        knee=.24*max(0,math.sin(t+math.pi/4))
        walk.append({
            'RootLocation':(0,0,.012*math.cos(2*t)),
            'Pelvis':(0,0,.027*math.sin(t)),
            'Spine':(.012*math.sin(2*t),0,-.014*math.sin(t)),
            'Thigh.L':(swing,0,0),
            'Thigh.R':(-swing,0,0),
            'Shin.L':(-knee,0,0),
            'Shin.R':(-.24*max(0,math.sin(t+math.pi+math.pi/4)),0,0),
            'UpperArm.L':(-.18*math.sin(t),0,0),
            'UpperArm.R':(.18*math.sin(t),0,0),
            'Forearm.L':(-.045,0,0),
            'Forearm.R':(-.045,0,0)
        })
    walk_act=key_pose(rig,'Walk_InPlace',walk,list(range(1,50,6)))
    # The rig has two separate named NLA tracks that glTF can export as clips.
    return [idle_act,walk_act]

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
    for clip in clip_names:
        for track in tracks:track.mute=track.name!=clip
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
    for track in tracks:track.mute=True
    bpy.context.scene.frame_set(1)
    return tests


def render_animation_previews(rig,out,controls):
    # Actual keyframed Cycles frames, encoded by OS ffmpeg.
    # This Blender distribution does not support scene.image_format='FFMPEG'.
    encoder=shutil.which('ffmpeg')
    if not encoder:raise RuntimeError('FFmpeg executable required for Blender animation preview')
    scene=bpy.context.scene
    original=(scene.render.image_settings.file_format,scene.render.resolution_x,
              scene.render.resolution_y,scene.render.filepath,
              scene.cycles.samples,scene.frame_start,scene.frame_end,
              scene.frame_step,scene.render.fps)
    previews=[]
    try:
        scene.camera=bpy.data.objects['Camera-Front']
        scene.render.resolution_y=min(480,int(controls['render.resolution']))
        scene.render.resolution_x=2*round(scene.render.resolution_y*.72/2)
        scene.cycles.samples=min(5,int(controls['render.samples']))
        scene.frame_start=1;scene.frame_end=49;scene.frame_step=2
        scene.render.fps=12
        scene.render.image_settings.file_format='PNG'
        for clip,name in [('Idle_Breath','idle_preview.mp4'),
                          ('Walk_InPlace','walk_preview.mp4')]:
            for track in rig.animation_data.nla_tracks:track.mute=track.name!=clip
            scene.frame_set(1)
            frames=out/('frames_'+clip)
            frames.mkdir(exist_ok=True)
            scene.render.filepath=str(frames/'frame_')
            bpy.ops.render.render(animation=True)
            pngs=sorted(frames.glob('frame_*.png'))
            if len(pngs)!=25:
                raise RuntimeError('Blender produced '+str(len(pngs))+' frames, expected 25 for '+clip)
            dest=out/name
            command=[encoder,'-y','-hide_banner','-loglevel','error',
                    '-framerate','12','-pattern_type','glob','-i',
                    str(frames/'frame_*.png'),'-c:v','libx264','-preset','fast',
                    '-pix_fmt','yuv420p','-movflags','+faststart',str(dest)]
            result=subprocess.run(command,capture_output=True,text=True,timeout=90)
            if result.returncode!=0:
                raise RuntimeError('FFmpeg '+clip+': '+result.stderr[-250:])
            size=dest.stat().st_size
            if size<10000:raise RuntimeError('Empty encoded animation '+clip)
            previews.append({'clip':clip,'file':name,'bytes':size,
                            'fps':12,'frames':len(pngs),'duration_seconds':25/12})
            shutil.rmtree(frames)
        return previews
    finally:
        fmt,width,height,path,samples,start,end,step,fps=original
        scene.render.image_settings.file_format=fmt
        scene.render.resolution_x=width;scene.render.resolution_y=height
        scene.render.filepath=path;scene.cycles.samples=samples
        scene.frame_start=start;scene.frame_end=end
        scene.frame_step=step;scene.render.fps=fps
        for track in rig.animation_data.nla_tracks:track.mute=True
        scene.frame_set(1)
