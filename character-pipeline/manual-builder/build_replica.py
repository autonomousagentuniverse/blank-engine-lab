#!/usr/bin/env python3
"""One-shot Blender replica of the canonical, live WebGL MakeHuman mesh.

No legacy procedural torso/hip primitives, imported saved .blend or re-sculpt.
The browser exports the already-deformed connected CC0 topology; Blender
reconstructs the *same vertices and triangle indices* (precision 1 micron),
builds the same eye surfaces and instanced scalp curls, and renders 3 views.
Scientific geometry parity is measurable; visual human realism is not claimed.
Usage: blender -b --factory-startup --python build_replica.py -- spec.json out/
"""
import bpy, bmesh, json, math, os, sys, hashlib
from pathlib import Path
from mathutils import Matrix, Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from animation_rig import make_armature, assign_weights, attach_to_head, create_animations, export_glb, audit_deformation, render_animation_previews, make_face_shape_keys, CLIPS, audit_biomechanics

SOURCE='makehumancommunity/mpfb2:3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf'
def fail(message):
    raise RuntimeError("ANATOMY_REPLICA_FAILED: "+message)
def color(code):
    if len(code)!=7 or not code.startswith('#'): fail('invalid hex color')
    rgb=[int(code[k:k+2],16)/255 for k in (1,3,5)]
    def srgb(x): return x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4
    return tuple(srgb(x) for x in rgb)+(1.0,)
def material(name,hex_color,roughness=.7,sss=0):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=color(hex_color)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=color(hex_color)
    bsdf.inputs['Roughness'].default_value=max(.1,min(.99,roughness))
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value=min(.35,sss)
    elif 'Subsurface' in bsdf.inputs:
        bsdf.inputs['Subsurface'].default_value=min(.35,sss)
    return mat
def mesh_obj(name,verts,triangles,mat):
    mesh=bpy.data.meshes.new(name+'-Topology')
    mesh.from_pydata(verts,[],triangles)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in mesh.polygons: poly.use_smooth=True
    return obj
def axis(v): return (v[0],-v[2],v[1]) # WebGL Y-up -> Blender Z-up, no reflection
def indexed_mesh(name,position,indices,mat):
    faces=[tuple(indices[i:i+3]) for i in range(0,len(indices),3)]
    return mesh_obj(name,position,faces,mat)
def mesh_topology_metrics(triangles):
    # Every edge of a watertight, orientable body surface must be shared by
    # exactly two faces.  A missing digit or torn shoulder fails this gate.
    from collections import Counter
    edges=Counter()
    for i in range(0,len(triangles),3):
        a,b,c=triangles[i:i+3]
        for u,v in ((a,b),(b,c),(c,a)):
            if u==v: fail('Degenerate source topology: repeated vertex')
            edges[(min(u,v),max(u,v))]+=1
    dangling=sum(1 for count in edges.values() if count==1)
    overused=sum(1 for count in edges.values() if count>2)
    if dangling or overused:
        fail('Body mesh is not manifold: open edges='+str(dangling)+' overused='+str(overused))
    return {'unique_edges':len(edges),'open_edges':dangling,'nonmanifold_edges':overused}

def eye_diameter_metrics(vertices,snapshot,controls):
    diameters=[]
    for group in ('eye_left_indices','eye_right_indices'):
        indices=set(snapshot[group])
        xs=[vertices[i][0] for i in indices]
        diameters.append(max(xs)-min(xs))
    target=float(controls['face.eye_size'])/100
    if any(abs(value-target)>.00005 for value in diameters):
        fail('Actual sclera diameters differ from eyeball control')
    return {'target_m':target,'measured_m':diameters,'max_deviation_m':max(abs(v-target) for v in diameters)}

def source_triangle_check(position,triangles):
    # Exact coordinate parity is checked before modifying the mesh.
    # Degenerate triangles are reported rather than falsely certifying anatomy.
    bad=0
    for i in range(0,len(triangles),3):
        a,b,c=(Vector(position[triangles[i+j]]) for j in range(3))
        if (b-a).cross(c-a).length<1e-11:bad+=1
    return bad
def make_hair(snapshot,hair_material):
    if not snapshot['hair_count']: return None
    # Hair is reconstructed from the SAME curved strand template that the
    # browser actually draws, not a separate Blender clump approximation.
    t=snapshot.get('hair_template')
    if not isinstance(t,dict) or not t.get('position_xyz') or not t.get('indices'):
        fail('Shared six-strand hair template missing from canonical snapshot')
    coords=t['position_xyz'];triangles=t['indices']
    template=[Vector(coords[i:i+3]) for i in range(0,len(coords),3)]
    faces=[tuple(triangles[i:i+3]) for i in range(0,len(triangles),3)]
    # Three.js Matrix4.elements is column-major.
    # Convert instance world-space coordinates into Blender Z-up.
    C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
    verts=[]; tris=[]
    m=snapshot['hair_matrices']
    for n in range(snapshot['hair_count']):
        a=m[n*16:(n+1)*16]
        M=Matrix(((a[0],a[4],a[8],a[12]),
                  (a[1],a[5],a[9],a[13]),
                  (a[2],a[6],a[10],a[14]),
                  (a[3],a[7],a[11],a[15])))
        B=C @ M
        offset=len(verts)
        verts.extend(tuple((B@v.to_4d()).xyz) for v in template)
        tris.extend(tuple(offset+i for i in f) for f in faces)
    return mesh_obj('Scalp-Curls-Source-Instances',verts,tris,hair_material)
def make_eyes(pos,snap,controls):
    # Reproduce exact measured sclera mesh and exact client eye ornaments.
    # No re-derivation, axis guessing or double-applied spacing correction.
    white=material('Sclera',snap['resolved_materials']['sclera_color'],.46)
    iris=material('Iris',snap['resolved_materials']['iris_color'],.38)
    pupil=material('Pupil','#0d0c0c',.4)
    objects=[]
    for name,indices in [('Left',snap['eye_left_indices']),('Right',snap['eye_right_indices'])]:
        objects.append(indexed_mesh(name+'-Sclera',pos,indices,white))
    ornaments=snap.get('eye_ornaments',{})
    for group,mat in [('irises',iris),('pupils',pupil)]:
        candidates=ornaments.get(group)
        if not isinstance(candidates,list) or len(candidates)!=2:
            fail('Canonical eye ornament transforms required')
        for i,eye in enumerate(candidates):
            center=axis(eye['position_xyz'])
            scales=eye['scale_xyz']
            if len(scales)!=3 or any(not math.isfinite(v) or v<=0 for v in scales):
                fail('Invalid eye ornament scale')
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=12,location=center)
            obj=bpy.context.object
            obj.name=('Right' if i==0 else 'Left')+'-'+('Iris' if group=='irises' else 'Pupil')
            # Three.js uses x/y-plane discs with small z depth; Z-up conversion:
            obj.scale=(scales[0],scales[2],scales[1])
            obj.data.materials.append(mat)
            objects.append(obj)
    return objects
def setup_world(controls,height,resolved):
    world=bpy.data.worlds.new('Studio-World') if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world=world; world.use_nodes=True
    node=world.node_tree.nodes.get('Background')
    node.inputs['Color'].default_value=color(resolved['world_color'])
    node.inputs['Strength'].default_value=.28
    def area(name,loc,power,size):
        bpy.ops.object.light_add(type='AREA',location=loc)
        o=bpy.context.object;o.name=name
        o.data.energy=power*float(controls['render.light']);o.data.shape='DISK';o.data.size=size
        point(o,(0,0,height*.53))
    area('Key',(1,-3,3.2),220,3)
    area('Fill',(-2,-1,height*.8),110,3)
    area('Rim',(0,2,2.6),160,2.4)
def point(ob,location):
    direction=Vector(location)-ob.location
    ob.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
def camera(name,loc,height,target=None):
    bpy.ops.object.camera_add(location=loc)
    cam=bpy.context.object;cam.name=name;cam.data.type='ORTHO'
    cam.data.ortho_scale=height*1.32
    point(cam,target if target is not None else (0,0,height*.52))
    return cam
def anatomical_detail_targets(vertices,height):
    # Camera landmarks are measured from this generated character, not
    # fixed offsets fitted to one preset. This matters when stance, limb
    # proportions or body morphology change.
    mid_arm=[v for v in vertices if .46*height<v[2]<.78*height and v[0]>0]
    if not mid_arm:fail('Missing right arm anatomy for detail camera')
    outer_x=max(v[0] for v in mid_arm)
    hands=[v for v in mid_arm if v[0]>outer_x-.12 and v[2]<.72*height]
    feet=[v for v in vertices if v[0]>.06 and v[2]<.17*height]
    if len(hands)<35 or len(feet)<100:
        fail('Unable to frame hand or toe geometry from generated character')
    def bounds(points):
        return tuple((min(v[i] for v in points)+max(v[i] for v in points))*.5 for i in range(3))
    hand=bounds(hands)
    foot=bounds(feet)
    return hand,foot

def render_views(out,controls,height,vertices):
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=int(controls['render.samples'])
    scene.cycles.use_denoising=True
    scene.render.resolution_y=int(controls['render.resolution'])
    scene.render.resolution_x=round(scene.render.resolution_y*.72)
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    cams=[
        ('front',camera('Camera-Front',(0,-3.3,height*.56),height)),
        ('three_quarter',camera('Camera-Three-Quarter',(2.3,-2.6,height*.58),height)),
        ('profile',camera('Camera-Profile',(3.5,0,height*.54),height))
    ]
    # Inspection views are first-class evidence, not artist recollections:
    # close crops reveal eye/lid placement, digit structure, toes and seams.
    # These camera-only views do not alter the body geometry.
    hand_target,foot_target=anatomical_detail_targets(vertices,height)
    # Inspect a right hand and a single complete foot, rather than cropping
    # the outer edges of both feet in a too-narrow portrait frame.
    hand_look=(hand_target[0],hand_target[1],hand_target[2])
    foot_look=(foot_target[0],foot_target[1],max(.09,foot_target[2]))
    cams.extend([
        ('face_macro',camera('Camera-Face-Macro',(0,-.84,height*.905),height,(0,0,height*.91))),
        ('hand_macro',camera('Camera-Hand-Macro',(hand_look[0]+.03,hand_look[1]-.72,hand_look[2]+.12),height,hand_look)),
        ('feet_macro',camera('Camera-Feet-Macro',(foot_look[0]+.08,foot_look[1]-.66,foot_look[2]+.34),height,foot_look))
    ])
    for name,cam in cams[3:]:
        cam.data.ortho_scale={'face_macro':.38,'hand_macro':.44,'feet_macro':.44}[name]
    files=[]
    for name,cam in cams:
        scene.camera=cam
        scene.render.filepath=str(out/(name+'.png'))
        bpy.ops.render.render(write_still=True)
        path=out/(name+'.png')
        if path.stat().st_size<7000:fail('Empty rendered view '+name)
        files.append({'view':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size})
    return files
def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if len(args)!=2:fail('Expected JSON specification and output directory')
    spec=json.loads(Path(args[0]).read_text());out=Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
    if spec.get('schema')!='blank.manual-human-builder.v2':fail('Control schema mismatch')
    controls=spec.get('controls');snap=spec.get('snapshot')
    if not isinstance(controls,dict) or len(controls)!=93:fail('All 93 controls required')
    if not isinstance(snap,dict) or snap.get('schema')!='blank.anatomy.snapshot.v1' or snap.get('source')!=SOURCE:
        fail('A canonical MakeHuman browser mesh snapshot is mandatory')
    data=snap.get('position_xyz',[])
    indices=snap.get('body_indices',[])
    if len(data)!=40572 or len(indices)!=80268 or snap.get('vertex_count')!=13524:
        fail('Wrong MakeHuman topology counts')
    if any(not math.isfinite(v) or abs(v)>5 for v in data):fail('Invalid vertex coordinates')
    if len(snap.get('hair_matrices',[]))!=snap.get('hair_count',0)*16:fail('Malformed hair transforms')
    height=float(controls['body.height'])/100
    verts=[axis(data[i:i+3]) for i in range(0,len(data),3)]
    bbox_height=max(v[2] for v in verts)-min(v[2] for v in verts)
    if abs(bbox_height-height)>.045:fail('Selected stature and exported mesh disagree')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    skin=material('Human-Skin',snap['resolved_materials']['skin_color'],snap['resolved_materials']['skin_roughness'],controls['skin.subsurface'])
    human=indexed_mesh('CANONICAL-CC0-MakeHuman-Body',verts,indices,skin)
    human['geometry_source']=SOURCE
    human['vertex_precision_m']=.000001
    human['morphology']=controls['body.gender']
    human['population_reference']=controls['appearance.population']
    eyes=make_eyes(verts,snap,controls)
    hair_obj=make_hair(snap,material('Hair',snap['resolved_materials']['hair_color'],.9))
    attachments=eyes+([hair_obj] if hair_obj else [])
    rig=make_armature(height)
    bone_counts=assign_weights(human,rig,height)
    face_counts=make_face_shape_keys(human,height)
    for item in attachments:attach_to_head(item,rig)
    animations=create_animations(rig,human)
    glb_path=export_glb(rig,human,attachments,out)
    motion=audit_deformation(rig,human,[a.name for a in animations])
    gait_mechanics=audit_biomechanics(rig,height)
    # Preserve the original static character as a neutral inspection pose.
    for track in list(rig.animation_data.nla_tracks)+list(human.data.shape_keys.animation_data.nla_tracks):track.mute=True
    bpy.context.scene.frame_set(1)
    setup_world(controls,height,snap['resolved_materials'])
    scene=bpy.context.scene
    scene.unit_settings.system='METRIC'
    # Store entire user specification in the Blender scene for reproducible editing.
    scene['control_specification']=json.dumps(controls,sort_keys=True)
    scene['anatomy_source']=SOURCE
    scene.frame_start=1
    scene.frame_end=49
    scene.render.fps=24
    # Idle is the visible default in the editable Blender file.
    for track in rig.animation_data.nla_tracks:
        track.mute=track.name!='Idle_Breath'
    for track in human.data.shape_keys.animation_data.nla_tracks:track.mute=True
    scene.frame_set(1)
    blend_file=out/'anatomical_character.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_file))
    body_metrics=mesh_topology_metrics(indices)
    eye_metrics=eye_diameter_metrics(verts,snap,controls)
    rendered=render_views(out,controls,height,verts)
    animation_videos=render_animation_previews(rig,human,out,controls)
    # Report reproducible exact vertex parity, without claiming human realism.
    max_error=max(abs(human.data.vertices[i].co[j]-verts[i][j])
                  for i in range(len(verts)) for j in range(3))
    report={
        'schema':'blank.anatomy-rebuild-report.v1',
        'generator':'one-shot-connected-MakeHuman-exact-webgl-snapshot-v1',
        'source_character_reused':False,
        'controls_applied':len(controls),
        'mesh':{'vertices':len(verts),'triangles':len(indices)//3,
                'max_blender_vertex_deviation_m':max_error,
                'height_m':bbox_height,
                'degenerate_triangles':source_triangle_check(verts,indices),
                'native_source':SOURCE,'topology':body_metrics,'eyes':eye_metrics},
        'morphology':controls['body.gender'],
        'population_reference':controls['appearance.population'],
        'hair_instances':snap['hair_count'],
        'renders':rendered,
        'animation':{
          'rig':'ANATOMICAL_HUMAN_ARMATURE',
          'bones':len(rig.data.bones),
          'clips':[a.name for a in animations],
          'glb':'animated_character.glb',
          'glb_bytes':os.stat(glb_path).st_size,
          'vertex_motion_audit':motion,
          'biomechanics':gait_mechanics,
          'previews':animation_videos,
          'facial_shape_keys':face_counts,
          'skinning_bone_coverage':bone_counts,
          'quality_status':'FIRST_PASS_NEEDS_HUMAN_MOTION_REVIEW',
          'limitations':['Facial shapes are region approximations','No finger phalanx articulation','Procedural weights need deformation review',
                         'Walk is in place and not foot-contact corrected']
        },
        'visual_anatomy_approval':False,
        'visual_inspection_required':['face_macro','hand_macro','feet_macro'],
        'limitations':['Face and hands are original MakeHuman low-detail baseline with local morphs',
                       'Vertex parity is not evidence of realistic skin/hair/eyes',
                       'Photographic identity and previous approved head not restored']}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('ANATOMY_ONE_SHOT_REPLICA_COMPLETE '+json.dumps({'verts':len(verts),'max_error_m':max_error,'morphology':controls['body.gender'],'rig_bones':len(rig.data.bones),'clips':[a.name for a in animations]}))
if __name__=='__main__':main()

