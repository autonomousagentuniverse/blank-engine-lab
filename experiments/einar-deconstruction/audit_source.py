#!/usr/bin/env python3
"""Inspect the authenticated publisher Einar .blend in place, without editing source."""
import bpy,json,hashlib,os,sys,traceback,collections,re
from pathlib import Path
S=Path('.ci-einar/source/einar_release_v1.blend')
Z=Path('.ci-einar/einar-official.zip')
O=Path('artifacts/einar-deconstruction-v1')
SHA='3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7'
PAT=re.compile(r'face|head|eye|cornea|meniscus|plica|hair|lash|brow|lip|teeth|tongue|mouth|beard|gum',re.I)
def sha(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for block in iter(lambda:f.read(4*1024*1024),b''):h.update(block)
 return h.hexdigest()
def convert(value):
 try:
  if isinstance(value,(float,int,bool,str)):return round(value,7) if isinstance(value,float) else value
  if value is None:return None
  if hasattr(value,'to_list'):return [convert(x) for x in value.to_list()][:16]
  if hasattr(value,'__iter__'):return [convert(x) for x in list(value)[:16]]
 except Exception:return str(value)[:120]
 return str(value)[:120]
def main():
 O.mkdir(parents=True,exist_ok=True)
 if sha(Z)!=SHA:raise ValueError('source archive hash mismatch')
 original_blend_hash=sha(S)
 bpy.ops.wm.open_mainfile(filepath=str(S.resolve()),load_ui=False)
 objs=[]
 for o in bpy.data.objects:
  if not PAT.search(o.name):continue
  x={'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,
     'scale':convert(o.scale),'modifiers':[],'constraints':[]}
  for m in o.modifiers:
   x['modifiers'].append({'name':m.name,'type':m.type,'show_render':m.show_render,
       'target':getattr(getattr(m,'object',None),'name',None),
       'levels':getattr(m,'levels',None),'render_levels':getattr(m,'render_levels',None)})
  for c in o.constraints:
   x['constraints'].append({'name':c.name,'type':c.type,'target':getattr(getattr(c,'target',None),'name',None)})
  if o.type=='MESH':
   data=o.data
   x.update(vertices=len(data.vertices),faces=len(data.polygons),
      uv_layers=[u.name for u in data.uv_layers],
      material_slots=[s.material.name if s.material else None for s in o.material_slots],
      material_faces=dict(collections.Counter(p.material_index for p in data.polygons)),
      vertex_group_count=len(o.vertex_groups),
      shape_keys=[k.name for k in data.shape_keys.key_blocks] if data.shape_keys else [])
  objs.append(x)
 head=next((o for o in objs if o['name']=='GEO-einar_head'),None)
 if not head or not any('cornea' in x['name'].lower() for x in objs):raise ValueError('anatomical source mismatch')
 matnames={s.material.name for o in bpy.data.objects if PAT.search(o.name) and o.type=='MESH'
           for s in o.material_slots if s.material}
 matnames.update(m.name for m in bpy.data.materials if PAT.search(m.name))
 mats=[]
 for name in sorted(matnames):
  mat=bpy.data.materials.get(name)
  if not mat:continue
  x={'name':mat.name,'nodes':[],'links':[],'use_nodes':bool(mat.use_nodes)}
  if mat.use_nodes and mat.node_tree:
   for n in mat.node_tree.nodes:
    item={'name':n.name,'type':n.bl_idname,'mute':n.mute}
    if n.type=='TEX_IMAGE' and n.image:
     im=n.image
     item['image']={'name':im.name,'filepath':im.filepath,'colorspace':im.colorspace_settings.name,'size':list(im.size)}
    if n.type=='GROUP' and n.node_tree:
     item['group']={'name':n.node_tree.name,'nodes':len(n.node_tree.nodes),'links':len(n.node_tree.links)}
    if n.type in ('BSDF_PRINCIPLED','BUMP','NORMAL_MAP','DISPLACEMENT','MIX_SHADER','TEX_IMAGE'):
     item['inputs']=[{'name':i.name,'linked':i.is_linked,
        'value':convert(i.default_value) if hasattr(i,'default_value') and not i.is_linked else None} for i in n.inputs]
    x['nodes'].append(item)
   x['links']=[{'from':l.from_node.name+':'+l.from_socket.name,
                'to':l.to_node.name+':'+l.to_socket.name} for l in mat.node_tree.links]
  mats.append(x)
 rig=[{'name':o.name,'bones':len(o.data.bones),
       'facial_bones':[b.name for b in o.data.bones if PAT.search(b.name)]}
      for o in bpy.data.objects if o.type=='ARMATURE']
 images=[{'name':im.name,'path':im.filepath,'packed':bool(im.packed_file),
          'size':list(im.size),'color_space':im.colorspace_settings.name}
         for im in bpy.data.images if im.source in ('FILE','TILED')]
 report={'schema':'blank.einar.source-reconstruction.v1','archive_sha256':SHA,
         'blend_sha256':original_blend_hash,'source_unchanged':True,
         'not_exported_or_redistributed':True,
         'license':'CC-BY, Einar Rig (CC-BY) Blender Foundation | studio.blender.org',
         'project_totals':{'objects':len(bpy.data.objects),'meshes':len(bpy.data.meshes),
           'materials':len(bpy.data.materials),'images':len(bpy.data.images),
           'actions':len(bpy.data.actions)},
         'objects':objs,'facial_material_shader_graphs':mats,
         'rigs':rig,'external_images':images,
         'actions':[a.name for a in bpy.data.actions],
         'visual_acceptance':'NOT_TESTED','new_human':'NOT_GENERATED'}
 (O/'einar-source-graph.json').write_text(json.dumps(report,indent=2,default=str)+'\n')
 skin=next((x for x in mats if x['name']=='einar.skin'),None)
 lines=['# Einar source deconstruction — actual publisher Blend',
  '', 'Source ZIP SHA256: '+SHA,'Blend SHA256: '+original_blend_hash,
  'License: Einar Rig (CC-BY) Blender Foundation | studio.blender.org',
  '', '## Genuine anatomical model',
  'Head: '+str(head['vertices'])+' vertices / '+str(head['faces'])+' polygons',
  'Head UV maps: '+', '.join(head['uv_layers']),
  'Head material slots: '+', '.join(str(s) for s in head['material_slots']),
  'Head modifier order: '+', '.join(x['type']+':'+x['name'] for x in head['modifiers']),
  'Head shape keys: '+', '.join(head['shape_keys']),
  '', '## Shader construction graph',
  'Face material eianr.skin present: '+str(bool(skin)),
  'Source skin nodes: '+str(len(skin['nodes']) if skin else 0),
  'Source skin links: '+str(len(skin['links']) if skin else 0),
  '| Material | Nodes | Links | Image nodes | Groups |',
  '| --- | ---: | ---: | ---: | ---: |']
 for m in mats:
  if PAT.search(m['name']):
   lines.append('| '+m['name']+' | '+str(len(m['nodes']))+' | '+str(len(m['links']))+' | '+str(sum('image' in n for n in m['nodes']))+' | '+str(sum('group' in n for n in m['nodes']))+' |')
 lines+=['','## Original eye/lid/hair anatomy',
  *['- '+x['name']+' ('+x['type']+', '+str(x.get('faces','?'))+' polygons; '+', '.join(y['type'] for y in x['modifiers'])+')'
    for x in objs if any(t in x['name'].lower() for t in ('cornea','meniscus','plica','eye','hair','lash'))][:100],
  '', '## Transfer requirements',
  '1. Preserve the facial mesh material-slot index and both source UV sets; do not collapse all face polygons to one skin material.',
  '2. Trace source shader group dependencies and baking inputs from einar-source-graph.json before simplifying to real-time PBR.',
  '3. Export eyelid shape keys, driven eyelash surfaces, tearline and cornea separately; validate normal/morph/blink parity.',
  '4. Source hair representation cannot be assumed to survive glTF; inspect types, groom roots and create an independently tested game representation.',
  '', 'This is a source structural and node-link audit, NOT proof of a newly authored human or human-approved photorealism.',
  'Original archive/Blend/textures were deliberately excluded from artifacts and remain the property of their respective licensors.']
 (O/'einar-source-graph.md').write_text('\n'.join(lines)+'\n')
 print('EINAR_SOURCE_GRAPH_PASS',json.dumps({'source_hash':original_blend_hash,
   'head_faces':head['faces'],'face_shader_nodes':len(skin['nodes']) if skin else None,
   'facial_objects':len(objs),'materials':len(mats)}),flush=True)
 sys.stdout.flush();sys.stderr.flush();os._exit(0)
try:main()
except BaseException as e:
 O.mkdir(parents=True,exist_ok=True)
 (O/'failure.json').write_text(json.dumps({'status':'BLOCKED','error':type(e).__name__+': '+str(e)[:200]}))
 traceback.print_exc();sys.stdout.flush();sys.stderr.flush();os._exit(1)
