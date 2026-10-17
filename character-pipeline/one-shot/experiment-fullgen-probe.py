#!/usr/bin/env python3
"""Quality-first integration probe: inspect a full one-shot-generated human.
Never claim visual acceptance, independent anatomy, or deployment.
"""
import sys, json, hashlib, math, shutil, subprocess
from pathlib import Path
import bpy
from mathutils import Vector

OUT=Path('artifacts/one-shot-e2e')
SOURCE=Path('artifacts/mira05-batch/mira05-integrated-structural.blend')
OUT.mkdir(parents=True,exist_ok=True)

def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()

def verify_source():
    p=Path('baseline-mira03/mira03-continuous-midline.blend')
    assert sha(p)=='1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d'
    old=json.loads(Path('artifacts/mira05-batch/report.json').read_text())
    assert 'integrated' in old['variants'] and old['baseline_sha256']==sha(p)
    assert old['independently_original'] is False and old['photoreal_approved'] is False
    assert sha(SOURCE)==old['integrated_blend']['sha256']
    return old

def render():
    old=verify_source()
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
    scene=bpy.context.scene
    head=bpy.data.objects.get('cm_vitruvian')
    eye1=bpy.data.objects.get('Eye_L_eyeball')
    eye2=bpy.data.objects.get('Eye_R_eyeball')
    hair=bpy.data.objects.get('MIRA05_ActualScalpFibers')
    brows=bpy.data.objects.get('MIRA05_RootedBrows')
    assert head and eye1 and eye2 and hair, 'Missing anatomically linked components'
    assert hair.type=='CURVE' and len(hair.data.splines)>=10000
    assert head.data.shape_keys and len(head.data.shape_keys.key_blocks)>=27
    eyes=(eye1.matrix_world.translation+eye2.matrix_world.translation)/2
    front=bpy.data.objects.get('CAM_MIRA_front')
    three=bpy.data.objects.get('CAM_MIRA_three_quarter')
    macro=bpy.data.objects.get('CAM_MIRA_eyes_macro')
    assert front and three and macro
    # Authored profile camera at the same radial distance as the source front.
    target=eyes+Vector((0,0,-.025))
    distance=(front.matrix_world.translation-target).length
    profile=bpy.data.objects.new('CAM_ONESHOT_PROFILE',front.data.copy())
    bpy.context.scene.collection.objects.link(profile)
    profile.location=target+Vector((distance,0,0))
    profile.rotation_euler=(target-profile.location).to_track_quat('-Z','Y').to_euler()
    cameras={'front':front,'three_quarter':three,'profile':profile,'eyes_macro':macro}
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32
    scene.render.resolution_x=700;scene.render.resolution_y=700
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.threads_mode='FIXED';scene.render.threads=4
    frames=[]
    for name,cam in cameras.items():
        scene.camera=cam
        p=OUT/(name+'.png')
        scene.render.filepath=str(p.resolve())
        print('ONESHOT_AUTHENTIC_CYCLES_RENDER',name,flush=True)
        bpy.ops.render.render(write_still=True)
        assert p.stat().st_size>12000
        frames.append({'id':name,'file':p.name,'sha256':sha(p),
                       'camera':cam.name,'width':700,'height':700,'samples':32})
    deltas=[]
    for sp in hair.data.splines:
        if len(sp.points)<2:continue
        a,b=sp.points[0].co,sp.points[-1].co
        dx,dy,dz=b.x-a.x,b.y-a.y,b.z-a.z
        if abs(dx)+abs(dy)+abs(dz)<1e-8:continue
        theta=math.atan2(dz,dx)
        deltas.append(int(((theta+math.pi)/(2*math.pi))*12)%12)
    counts=[deltas.count(i) for i in range(12)]
    n=len(deltas)
    entropy=-sum((c/n)*math.log(c/n) for c in counts if c)/math.log(12)
    clean=OUT/'generated-full-human.blend'
    shutil.copyfile(SOURCE,clean)
    brow_objs=[o for o in bpy.data.objects if 'brow' in o.name.lower() and o.type=='CURVE']
    result={'schema':'blank.one-shot.fullgen.integration.v1',
            'status':'FULL_CHARACTER_GENERATED_VISUAL_REVIEW_BLOCKED',
            'source':'MIRA03 CC0 Vitruvian-derived packed Blender source',
            'source_sha256':old['baseline_sha256'],
            'generated_blend_sha256':sha(clean),
            'independently_original':False,
            'automatic_quality_acceptance':False,
            'release_allowed':False,
            'full_generation_one_blender_pass':True,
            'generated_components':['source-derived head and identity','eyes','eyelid contact',
                                    'rooted scalp hair','brows','skin graph','facial blendshapes'],
            'hair_curve_count':len(hair.data.splines),
            'brow_curve_object_names':[o.name for o in brow_objs],
            'direction_entropy_12bins':round(entropy,5),
            'direction_histogram_12bins':counts,
            'frames':frames,
            'known_failure':'Existing MIRA05 source-derived anatomy and curtain-shaped hair previously visually rejected'}
    (OUT/'e2e-report.json').write_text(json.dumps(result,indent=2)+'\n')
    print('FULLGEN_RENDER_PROBE',json.dumps(result),flush=True)
    sys.stdout.flush()
    import os;os._exit(0)
if __name__=='__main__':
    try:render()
    except BaseException:
        import traceback,os
        traceback.print_exc();sys.stdout.flush();os._exit(1)
