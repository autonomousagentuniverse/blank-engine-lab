"""Optional high-quality still of the isolated GLB via Blender Cycles.
Run: blender -b --python scripts/render-character-cycles.py -- character-lab/assets/hero.glb artifacts/hero-cycles.png
Requires Blender 4.x; uses real GLB textures and studio illumination. Does not modify the source GLB.
"""
import sys
from pathlib import Path

def main():
    try:
        import bpy
        from mathutils import Vector
    except ImportError as e:
        raise SystemExit('Blender bpy required for Cycles rendering') from e
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(argv) < 2:
        raise SystemExit('Usage: blender -b --python render-character-cycles.py -- hero.glb output.png')
    source = Path(argv[0]).expanduser().resolve()
    target = Path(argv[1]).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != '.glb':
        raise SystemExit('A valid local GLB is required')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 80
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 1400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    try:
        scene.view_settings.view_transform = 'AgX'
    except Exception:
        pass
    # Imported GLB materials and textures are left intact. Subsurface changes are
    # intentionally conservative to avoid destroying authored skin shading.
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type != 'BSDF_PRINCIPLED':
                continue
            name = mat.name.lower()
            if any(part in name for part in ('skin', 'face', 'body', 'head')):
                sss = node.inputs.get('Subsurface Weight') or node.inputs.get('Subsurface')
                if sss:
                    sss.default_value = 0.12
                roughness = node.inputs.get('Roughness')
                if roughness:
                    roughness.default_value = max(0.38,roughness.default_value)
    # World and studio lighting
    world = bpy.data.worlds.new('Studio dark')
    world.use_nodes = True
    world.node_tree.nodes.get('Background').inputs['Color'].default_value = (0.13,0.16,0.22,1)
    world.node_tree.nodes.get('Background').inputs['Strength'].default_value = 0.7
    scene.world = world
    def area(name, loc, power, size, color):
        lamp=bpy.data.lights.new(name,'AREA')
        lamp.energy=power;lamp.shape='DISK';lamp.size=size;lamp.color=color
        obj=bpy.data.objects.new(name,lamp);scene.collection.objects.link(obj)
        obj.location=loc;direction=Vector((0,1.0,0))-obj.location
        obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    area('Key softbox',(-3,4,4.5),850,4.0,(1.0,.93,.85))
    area('Fill softbox',(3,1,4),500,3.0,(.82,.89,1.0))
    area('Rim softbox',(1,-3,3.6),1100,2.1,(.77,.86,1.0))
    mat=bpy.data.materials.new('Matte studio floor');mat.diffuse_color=(.15,.18,.23,1)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0,0,-.015))
    plane=bpy.context.object;plane.name='Studio shadow floor';plane.data.materials.append(mat)
    # glTF coordinates are Y-up in the runtime; Blender importer converts to Z-up.
    mesh_objects=[o for o in bpy.data.objects if o.type=='MESH' and o != plane]
    if not mesh_objects:
        raise RuntimeError('GLB contains no renderable meshes')
    coords=[o.matrix_world @ Vector(corner) for o in mesh_objects for corner in o.bound_box]
    left=min(c.x for c in coords);right=max(c.x for c in coords)
    bottom=min(c.z for c in coords);top=max(c.z for c in coords)
    center=Vector(((left+right)/2,0,(bottom+top)/2))
    cam_data=bpy.data.cameras.new('Portrait 70mm');cam=bpy.data.objects.new('Portrait camera',cam_data);scene.collection.objects.link(cam)
    cam.location=(center.x+3.5,-7.4,center.z+1.15)
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam_data.type='ORTHO';cam_data.ortho_scale=max(2.0,(top-bottom)*1.38)
    scene.camera=cam
    target.parent.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(target)
    bpy.ops.render.render(write_still=True)
    print('CHARACTER_CYCLES_RENDER:',target)

if __name__=='__main__':
    main()
