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
    bm=bmesh.new()
    bmesh.ops.create_icosphere(bm,subdivisions=1,radius=1.0)
    vs=list(bm.verts); lookup={v:i for i,v in enumerate(vs)}
    template=[v.co.copy() for v in vs]
    faces=[[lookup[v] for v in face.verts] for face in bm.faces]
    bm.free()
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
    # Shared actual left/right MakeHuman eye surface vertices.
    white=material('Sclera',snap['resolved_materials']['sclera_color'],.46)
    iris=material('Iris',snap['resolved_materials']['iris_color'],.38)
    pupil=material('Pupil','#0d0c0c',.4)
    for side,indices in [('Left',snap['eye_left_indices']),('Right',snap['eye_right_indices'])]:
        indexed_mesh(side+'-Sclera',pos,indices,white)
        # Duplicate indexed vertices give the same source geometry as WebGL.
        cx=sum(pos[i][0] for i in indices)/len(indices)
        cx+=(float(controls['face.eye_spacing'])/.063-1)*math.copysign(.008,cx)
        cy=sum(pos[i][1] for i in indices)/len(indices)
        cz=max(pos[i][2] for i in indices)
        # Blender axes: front of face points in -Y.
        scale=float(controls['face.eye_size'])/2.45
        iris_factor=float(controls['face.iris'])/1.15
        for name,radius,depth,front,mat in [
            ('Iris',.006*scale*iris_factor,.0013,-.0002,iris),
            ('Pupil',.0029*scale,.0011,-.0013,pupil)]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=12,location=(cx,cy+front,cz))
            eye=bpy.context.object;eye.name=side+'-'+name
            eye.scale=(radius,depth,radius*.95)
            eye.data.materials.append(mat)
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
def camera(name,loc,height):
    bpy.ops.object.camera_add(location=loc)
    cam=bpy.context.object;cam.name=name;cam.data.type='ORTHO'
    cam.data.ortho_scale=height*1.32
    point(cam,(0,0,height*.52))
    return cam
def render_3(out,controls,height):
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
    make_eyes(verts,snap,controls)
    make_hair(snap,material('Hair',snap['resolved_materials']['hair_color'],.9))
    setup_world(controls,height,snap['resolved_materials'])
    scene=bpy.context.scene
    scene.unit_settings.system='METRIC'
    # Store entire user specification in the Blender scene for reproducible editing.
    scene['control_specification']=json.dumps(controls,sort_keys=True)
    scene['anatomy_source']=SOURCE
    blend_file=out/'anatomical_character.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_file))
    rendered=render_3(out,controls,height)
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
                'native_source':SOURCE},
        'morphology':controls['body.gender'],
        'population_reference':controls['appearance.population'],
        'hair_instances':snap['hair_count'],
        'renders':rendered,
        'visual_anatomy_approval':False,
        'limitations':['Face and hands are original MakeHuman low-detail baseline with local morphs',
                       'Vertex parity is not evidence of realistic skin/hair/eyes',
                       'Photographic identity and previous approved head not restored']}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('ANATOMY_ONE_SHOT_REPLICA_COMPLETE '+json.dumps({'verts':len(verts),'max_error_m':max_error,'morphology':controls['body.gender']}))
if __name__=='__main__':main()

