#!/usr/bin/env python3
"""Source-faithful Einar shaded face and eye review, rendered in Blender Cycles CPU.

Loads original, verified Blender Studio rig with image paths restored. Does NOT
claim equivalent realtime/WebGL appearance, nor modify/overwrite original.
Images may vary with production shader/link dependencies; findings are logged.
"""
import bpy,json,math,re,sys,traceback,os
from pathlib import Path
from mathutils import Vector
OUT=Path("artifacts/hero-v4-einar");OUT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(".ci-einar/source/einar_release_v1.blend")
def save(data):
 (OUT/"shaded-preview-audit.json").write_text(json.dumps(data,indent=2)+"\n")
def bbox(o):
 m=o.matrix_world
 v=[m@Vector(c) for c in o.bound_box]
 return Vector([min(p[i] for p in v) for i in range(3)]),Vector([max(p[i] for p in v) for i in range(3)])
def middle(o):
 a,b=bbox(o);return (a+b)/2
def look(o,pos,target):
 o.location=pos;o.rotation_euler=(target-pos).to_track_quat('-Z','Y').to_euler()
def light(name,position,target,energy,size,color):
 data=bpy.data.lights.new(name,type='AREA')
 data.energy=energy;data.shape='DISK';data.size=size
 data.color=color
 ob=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(ob)
 look(ob,position,target)
 return ob
def keep(o):
 n=o.name
 return bool(
  (o.type=='MESH' and (
   n=='GEO-einar_head' or n in ('Eye_Sphere.L','Eye_Sphere.R','GEO-eye.L','GEO-eye.R',
      'GEO-eye.cornea.L','GEO-eye.cornea.R',
      'GEO-eye.meniscus.L','GEO-eye.meniscus.R',
      'GEO-eye.plica_semilunaris.L','GEO-eye.plica_semilunaris.R')
   or re.search(r'eyelash|eyebrows_preview|^GEO-einar_hair',n,re.I)))
  or (o.type in ('CURVE','CURVES') and re.search(r'hair|eyelash|eyebrow',n,re.I)))
def main():
 info={'schema':'blank.hero-v4.einar-shaded-review.v1','license':'CC-BY',
  'credit':'Einar Rig (CC-BY) Blender Foundation | studio.blender.org',
  'source':str(SOURCE),'source_sha256':'3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7',
  'human_visual_approval':'BLOCKED','real_threejs_shading_verified':False,
  'game_performance_verified':False,'images':[],
  'source_files_unchanged':True,'status':'STARTING'}
 save(info)
 try:
  bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()),load_ui=False)
  info['status']='SOURCE_OPENED';save(info)
  head=bpy.data.objects.get('GEO-einar_head')
  eyeL=bpy.data.objects.get('GEO-eye.L')
  eyeR=bpy.data.objects.get('GEO-eye.R')
  if not head or not eyeL or not eyeR:raise ValueError('Critical head/eye source object missing')
  imgs=[]
  for im in bpy.data.images:
   if im.source not in {'FILE','TILED'}:continue
   if im.name in {'Render Result','Viewer Node'}:continue
   # Source-pinned archive paths sit adjacent to the genuine blend file.
   try:im.reload()
   except Exception as e:imgs.append({'name':im.name,'loaded':False,'error':type(e).__name__});continue
   imgs.append({'name':im.name,'path':im.filepath,'size':list(im.size),'loaded':im.size[0]>0 and im.size[1]>0})
  info['images_total']=len(imgs);info['images_loaded']=sum(v['loaded'] for v in imgs)
  info['missing_image_names']=[v['name'] for v in imgs if not v['loaded']]
  info['critical_skin_albedo_loaded']=any(x['loaded'] for x in imgs if 'einar_skin.albedo' in x['name'].lower())
  info['critical_eye_albedo_loaded']=any(x['loaded'] for x in imgs if 'eyes.albedo' in x['name'].lower())
  info['images_checked']=imgs
  if not(info['critical_skin_albedo_loaded'] and info['critical_eye_albedo_loaded']):
   info['status']='BLOCKED_CRITICAL_FACE_TEXTURE_MISSING';save(info)
   raise RuntimeError('Skin and/or eye albedo texture not loaded')
  selected=[o for o in bpy.data.objects if keep(o)]
  if not selected:raise ValueError('No preview meshes selected')
  selected_names=[o.name for o in selected]
  info['selected_mesh_names']=selected_names
  info['selected_mesh_count']=len(selected)
  for o in bpy.data.objects:
   if o.type in {'MESH','CURVE','CURVES','FONT','VOLUME','POINTCLOUD'}:
    o.hide_render=o not in selected
  head.hide_render=False;eyeL.hide_render=False;eyeR.hide_render=False
  scene=bpy.context.scene
  scene.render.engine='CYCLES'
  scene.cycles.device='CPU'
  scene.cycles.samples=12
  scene.render.resolution_x=600;scene.render.resolution_y=600
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format='PNG'
  scene.render.film_transparent=False
  scene.render.use_file_extension=True
  try:scene.view_layers[0].cycles.use_denoising=True
  except AttributeError:pass
  scene.render.threads_mode='FIXED';scene.render.threads=4
  # Avoid original film lighting, framing cameras and colored world.
  for o in bpy.data.objects:
   if o.type=='LIGHT':o.hide_render=True
  world=bpy.data.worlds.new('EinarV4_NeutralStudioWorld')
  world.use_nodes=True
  bg=world.node_tree.nodes.get('Background')
  bg.inputs['Color'].default_value=(0.28,0.30,0.34,1)
  bg.inputs['Strength'].default_value=0.45
  scene.world=world
  try:
   scene.view_settings.view_transform='AgX'
  except Exception:pass
  lo,hi=bbox(head);cent=(lo+hi)*.5
  ec=(middle(eyeL)+middle(eyeR))*.5
  # Derive front direction from eye centers, rather than guessing Blender world -Y.
  v=ec-cent;v.z=0
  if v.length<0.005:raise ValueError('Cannot establish front orientation from Einar eyes')
  front=v.normalized()
  lr=middle(eyeR)-middle(eyeL);lr.z=0
  if lr.length<0.002:raise ValueError('Eye horizontal baseline collapsed')
  lateral=lr.normalized()
  # Remove front component so oblique/profile remain orthogonal in world XY.
  lateral=(lateral-front*lateral.dot(front)).normalized()
  height=max(0.22,hi.z-lo.z)
  distance=max(.5,height*3.2)
  info['head_bbox_world']=[list(lo),list(hi)]
  info['eye_centers_world']=[list(middle(eyeL)),list(middle(eyeR))]
  info['front_vector']=list(front);info['lateral_vector']=list(lateral)
  info['head_height_m']=height
  info['camera_provenance']='Eyes relative to head center; automatic orientation only, aesthetic review mandatory.'
  for o in bpy.data.objects:
   if o.type=='CAMERA':o.hide_render=True
  camera=bpy.data.objects.new('EinarV4_NeutralReviewCamera',bpy.data.cameras.new('EinarV4_NeutralReviewCamera'))
  scene.collection.objects.link(camera);scene.camera=camera
  camera.data.type='ORTHO';camera.data.lens=65
  center=ec+Vector((0,0,-height*.15))
  light('EinarV4_SoftKey',ec+front*distance*.75-lateral*distance*.38+Vector((0,0,height*.70)),
       ec,140*height*height, height*2.7,(1.0,.92,.86))
  light('EinarV4_SoftFill',ec+front*distance*.55+lateral*distance*.65+Vector((0,0,height*.18)),
       ec,75*height*height,height*3.1,(.82,.88,1.0))
  light('EinarV4_Rim',ec-front*distance*.35+lateral*distance*.3+Vector((0,0,height*.65)),
       ec,130*height*height,height*2,(.96,.98,1.0))
  info['status']='TEXTURES_RESTORED_RENDERING';save(info)
  shots=[
   ('front',front,center,height*1.30),
   ('three_quarter',(front*.75+lateral*.65).normalized(),center,height*1.30),
   ('profile',lateral,center,height*1.30),
   ('eyes_macro',front,ec,height*.48),
   ('eyes_three_quarter',(front*.86+lateral*.51).normalized(),ec,height*.48)
  ]
  for label,direction,target,scale in shots:
   look(camera,target+direction*distance,target)
   camera.data.ortho_scale=scale
   scene.render.filepath=str((OUT/(label+'.png')).resolve())
   print('EINAR_V4_RENDER_START',label,'camera',list(camera.location),'target',list(target),flush=True)
   bpy.ops.render.render(write_still=True)
   path=OUT/(label+'.png')
   if not path.is_file() or path.stat().st_size<2000:raise RuntimeError('Image not saved: '+label)
   info['images'].append({'view':label,'path':str(path),'bytes':path.stat().st_size,
                          'render_engine':'CYCLES','samples':12,'resolution':[600,600]})
   info['status']='SHOTS_COMPLETED_'+str(len(info['images']))
   save(info)
   print('EINAR_V4_RENDERED',label,path.stat().st_size,flush=True)
  info['status']='FIVE_SHADED_SHOTS_RENDERED_NEEDS_HUMAN_REVIEW';save(info)
  print('EINAR_V4_SHADED_RENDER_COMPLETE',len(info['images']),flush=True)
 except Exception as e:
  info['status']='BLOCKED_SHADED_PREVIEW'
  info['error']=type(e).__name__+': '+str(e)[:500]
  save(info);traceback.print_exc();raise
if __name__=='__main__':main()
