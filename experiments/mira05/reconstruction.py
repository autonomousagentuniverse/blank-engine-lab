"""MIRA05 audited eye, dermal and independent identity-variation components.
All operations are source-specific with explicit geometrical/material invariants.
"""
import bpy,math,random
from mathutils import Vector
from geometry import mesh_bvh,trace_front,make_curves

def get_bsdf(name):
 m=bpy.data.materials.get(name)
 if m is None or not m.use_nodes:raise RuntimeError("Source material missing "+name)
 bs=next((n for n in m.node_tree.nodes if n.bl_idname=="ShaderNodeBsdfPrincipled"),None)
 if bs is None:raise RuntimeError("Expected source Principled BSDF "+name)
 return m,bs

def eyes(head,eye_center):
 """Remove incorrect flat overlay and fit subtle tearline/lid contact geometry
 to source skin via raycast. Preserve distinct eye shells and UV iris maps."""
 changes={}
 for side in ("L","R"):
  name="Eyeshadow_"+side
  obj=bpy.data.objects.get(name)
  if not obj:raise RuntimeError("Eye overlay missing "+name)
  obj.hide_render=True
  changes[name]="flat opaque over-eye plane hidden; replaced by fitted contact rim"
 for name in ("VitSclera","VitSclera.001"):
  m,bs=get_bsdf(name)
  bs.inputs["Roughness"].default_value=.41
  # Tint texture while keeping its full source color variation.
  old=bs.inputs["Base Color"].links
  if len(old)!=1:raise RuntimeError("Missing sclera color map "+name)
  src=old[0].from_socket
  m.node_tree.links.remove(old[0])
  tint=m.node_tree.nodes.new("ShaderNodeHueSaturation")
  tint.inputs["Saturation"].default_value=.80
  tint.inputs["Value"].default_value=.86
  m.node_tree.links.new(src,tint.inputs["Color"])
  m.node_tree.links.new(tint.outputs["Color"],bs.inputs["Base Color"])
 for name in ("VitCornea2","VitCornea2.001"):
  m,bs=get_bsdf(name)
  bs.inputs["IOR"].default_value=1.376
  bs.inputs["Roughness"].default_value=.075
  bs.inputs["Transmission Weight"].default_value=.96
 for name in ("VitIris","VitIris.001"):
  m,bs=get_bsdf(name)
  bs.inputs["Roughness"].default_value=.37
 # Geometry; use skin hit at actual anatomical boundary (not unattached planes).
 bvh,mx,imx=mesh_bvh(head)
 lines=[];hitcount=0
 for xcenter in (-.03347,.03347):
  for upper in (True,False):
   pts=[]
   for i in range(31):
    u=-.98+1.96*i/30
    x=xcenter+.021*u
    arch=math.sqrt(max(0.,1-u*u))
    z=eye_center.z + ((.0094*arch) if upper else (-.0080*arch))
    hit=trace_front(head,bvh,x,z,eye_center.y)
    if hit:
     root,n=hit
     # The actual head surface is authoritative, not arbitrary eye plane.
     pts.append(root+n*.00014);hitcount+=1
   if len(pts)>=22:lines.append(pts)
 # Missing contacts are reported rather than fabricated.
 if len(lines)<3:raise RuntimeError("Source eyelid projection incomplete; lines="+str(len(lines)))
 mat=bpy.data.materials.new("MIRA05_SoftLidRim")
 mat.use_nodes=True
 bs=mat.node_tree.nodes.get("Principled BSDF")
 bs.inputs["Base Color"].default_value=(.31,.105,.09,1)
 bs.inputs["Roughness"].default_value=.58
 make_curves("MIRA05_SourceFittedLidContact",lines,mat,.000105)
 changes["eyelid_contact"]={"raycast_skin_points":hitcount,
    "anatomical_curves":len(lines),"diameter_m":.00021}
 changes["preserved_eye_meshes"]=["Eye_L_eyeball","Eye_R_eyeball"]
 return changes

def skin():
 """Retain imported pigmentation, roughness & tangent normal maps. Add true
 physically scaled SSS and a separate low-strength pore bump layer."""
 m,bs=get_bsdf("VitSkin")
 tree=m.node_tree
 if not any(n.bl_idname=="ShaderNodeTexImage" for n in tree.nodes):
  raise RuntimeError("Source epidermis textures absent")
 if not bs.inputs["Normal"].is_linked or not bs.inputs["Roughness"].is_linked:
  raise RuntimeError("Baseline detailed normal or roughness atlas missing")
 original=bs.inputs["Normal"].links[0].from_socket
 tree.links.remove(bs.inputs["Normal"].links[0])
 if bs.inputs.get("Subsurface Weight"):
  bs.inputs["Subsurface Weight"].default_value=.13
 if bs.inputs.get("Subsurface Radius"):
  bs.inputs["Subsurface Radius"].default_value=(.0032,.0014,.0008)
 if bs.inputs.get("Subsurface Scale"):
  bs.inputs["Subsurface Scale"].default_value=.65
 noise=tree.nodes.new("ShaderNodeTexNoise")
 noise.inputs["Scale"].default_value=560
 noise.inputs["Detail"].default_value=2.2
 noise.inputs["Roughness"].default_value=.56
 bump=tree.nodes.new("ShaderNodeBump")
 bump.inputs["Strength"].default_value=.125
 bump.inputs["Distance"].default_value=.000055
 tree.links.new(noise.outputs["Fac"],bump.inputs["Height"])
 tree.links.new(original,bump.inputs["Normal"])
 tree.links.new(bump.outputs["Normal"],bs.inputs["Normal"])
 # Preserve skin color and UV texture, only restore modest warm chroma.
 h=next((n for n in tree.nodes if n.bl_idname=="ShaderNodeHueSaturation"),None)
 if h is None:raise RuntimeError("Baseline color transformation missing")
 h.inputs["Value"].default_value=.93
 h.inputs["Saturation"].default_value=1.025
 return {"uv_color_roughness_normal_maps_preserved":True,
  "micropore_bump":{"noise_scale":560,"strength":.125,"distance_m":.000055},
  "physical_sss_radius_m":[.0032,.0014,.0008],
  "subsurface_weight":.13,"base_value":.93}

def identity(head,eye_center):
 """8-13mm anatomically masked secondary variation on corrected MIRA03 basis.
 Prevent nose/cheek reshaping from moving eye sockets or the lip seam.
 All FACS shape-key targets are displaced by exactly the same offsets."""
 keys=head.data.shape_keys
 if keys is None or len(keys.key_blocks)<20:raise RuntimeError("Facial shape keys lost")
 basis=keys.key_blocks.get("Basis")
 if basis is None:raise RuntimeError("Neutral basis absent")
 mx=head.matrix_world.copy();invr=mx.inverted().to_3x3()
 changes=[]
 changed=0;maximum=0.
 for v in head.data.vertices:
  p=mx@basis.data[v.index].co
  x=p.x;z=p.z-eye_center.z
  # Forward surface only, fade near eye and lip contact surfaces.
  anterior=max(0.,min(1.,(eye_center.y-p.y+.016)/.060))
  eye_rad=min(math.hypot(x-.03347,z),math.hypot(x+.03347,z))
  eye_protect=1-math.exp(-.5*(eye_rad/.028)**2)
  mouth_protect=1-.92*math.exp(-.5*(x/.034)**2-.5*((z+.085)/.017)**2)
  mask=anterior*eye_protect*mouth_protect
  cheek=math.exp(-.5*((abs(x)-.050)/.028)**2-.5*((z+.046)/.025)**2)
  jaw=math.exp(-.5*((abs(x)-.058)/.027)**2-.5*((z+.102)/.025)**2)
  chin=math.exp(-.5*(x/.027)**2-.5*((z+.137)/.025)**2)
  bridge=math.exp(-.5*(x/.014)**2-.5*((z+.050)/.036)**2)
  dx=mask*(-.0060*cheek+.0113*jaw)*math.tanh(x/.026)
  dy=mask*(-.0042*cheek-.0104*chin-.003*bridge)
  dz=mask*(.0030*jaw-.0045*chin)
  d=invr@Vector((dx,dy,dz))
  mag=d.length
  if mag>.00012:changed+=1
  maximum=max(maximum,mag)
  changes.append(d)
 if changed<600 or not .007<maximum<.016:
  raise RuntimeError("Identity shape not anatomically bounded "+str({"vertices":changed,"max":maximum}))
 for key in keys.key_blocks:
  for i,d in enumerate(changes):key.data[i].co+=d
  if key.name!="Basis":key.value=0.
 head.data.update()
 return {"changed_vertices":changed,"max_displacement_mm":round(maximum*1000,3),
  "shape_keys_preserved":len(keys.key_blocks),
  "lateral_symmetry":"smooth tanh, zero at x=0",
  "eye_socket_protected":True,"mouth_lip_area_protected":True,
  "identity_source":"CC0 Vitruvian-derived, no independent topology claim"}
