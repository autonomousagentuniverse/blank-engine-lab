"""MIRA05 geometry modules — source-head-sampled follicles, no flat card atlas.
Blender 4.5.3. Derived from the CC0 Vitruvian head; not ground-up original.
"""
import bpy,math,random,bisect
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def mesh_bvh(head):
 mesh=head.data
 verts=[v.co.copy() for v in mesh.vertices]
 faces=[tuple(p.vertices) for p in mesh.polygons]
 bvh=BVHTree.FromPolygons(verts,faces,all_triangles=False,epsilon=.00003)
 return bvh,head.matrix_world.copy(),head.matrix_world.inverted().copy()

def trace_front(head,bvh,x,z,eye_y):
 # Shoot from in front of face toward back and use actual skin surface root.
 mx=head.matrix_world;inv=mx.inverted()
 origin=inv@Vector((x,eye_y-.16,z))
 d=(inv.to_3x3()@Vector((0,1,0))).normalized()
 hit,n,face,dist=bvh.ray_cast(origin,d,.38)
 if hit is None:return None
 world=mx@hit
 n_world=(mx.to_3x3()@n).normalized()
 return world+n_world*.00055,n_world

def make_fiber_material(name,color,roughness=.49):
 m=bpy.data.materials.new(name);m.use_nodes=True
 nodes=m.node_tree.nodes;nodes.clear()
 output=nodes.new("ShaderNodeOutputMaterial")
 try:
  hair=nodes.new("ShaderNodeBsdfHairPrincipled")
  if hair.inputs.get("Color"):hair.inputs["Color"].default_value=color
  if hair.inputs.get("Roughness"):hair.inputs["Roughness"].default_value=roughness
  m.node_tree.links.new(hair.outputs[0],output.inputs["Surface"])
 except Exception:
  nodes.clear();output=nodes.new("ShaderNodeOutputMaterial")
  shader=nodes.new("ShaderNodeBsdfPrincipled")
  shader.inputs["Base Color"].default_value=color
  shader.inputs["Roughness"].default_value=roughness
  shader.inputs["Anisotropic IOR Level"].default_value=.55 if shader.inputs.get("Anisotropic IOR Level") else 0
  m.node_tree.links.new(shader.outputs["BSDF"],output.inputs["Surface"])
 return m

def make_curves(name,paths,material,radius,detail=1):
 cu=bpy.data.curves.new(name,"CURVE");cu.dimensions="3D"
 cu.resolution_u=detail;cu.bevel_depth=radius;cu.resolution_u=1
 cu.bevel_resolution=1;cu.use_fill_caps=False
 for path in paths:
  s=cu.splines.new("POLY");s.points.add(len(path)-1)
  for pt,v in zip(s.points,path):pt.co=(v.x,v.y,v.z,1)
 obj=bpy.data.objects.new(name,cu);bpy.context.scene.collection.objects.link(obj)
 obj.data.materials.append(material)
 return obj

def build_hair(head,eye_center,seed=51729,count=12500):
 """Roots selected by actual source mesh polygons, not a guessed scalp cap.
 Guides turn laterally away from part and descend with gravity: long hair."""
 rng=random.Random(seed);bvh,mx,imx=mesh_bvh(head)
 up=Vector((0,0,1));top=max((mx@v.co).z for v in head.data.vertices)
 ez=eye_center.z; ey=eye_center.y
 halfwidth=max(abs((mx@v.co).x) for v in head.data.vertices if (mx@v.co).z>ez)
 # First measure the *scalp* longitude. Eye center is forward of the
 # scalp shell and cannot be used as a classification baseline (A07/MIRA05).
 pre=[]
 for poly in head.data.polygons:
  mid=mx@poly.center
  nor=(mx.to_3x3()@poly.normal).normalized()
  if mid.z<ez+.025 or nor.z<-.50 or abs(mid.x)>max(.115,halfwidth*.92):continue
  pre.append((poly,mid,nor))
 if len(pre)<120:raise RuntimeError("Scalp shell undersampled "+str(len(pre)))
 ys=sorted(mid.y for _,mid,_ in pre)
 # Use robust interior percentiles to avoid an isolated protruding polygon
 # consuming the entire range. Normalized orientation is -Y front.
 front_y=ys[int(.05*(len(ys)-1))]
 back_y=ys[int(.95*(len(ys)-1))]
 span=back_y-front_y
 if span<.025:raise RuntimeError("Scalp front-to-back span implausible "+str(span))
 candidates=[];weights=[];total=0;regions={"front":0,"crown":0,"rear":0}
 for poly,mid,nor in pre:
  frontness=max(0.,min(1.,(back_y-mid.y)/span))
  temples=max(0.,min(1.,(abs(mid.x)-.045)/.065))
  hairline=ez+.041+.020*frontness+.010*temples*frontness
  hairline+=.0035*math.sin(mid.x*87+1.4)*frontness
  if mid.z<hairline:continue
  cls="front" if frontness>.60 else ("rear" if frontness<.30 else "crown")
  regions[cls]+=1
  weight=poly.area*max(.1,.5+nor.z)
  total+=weight
  candidates.append(poly);weights.append(total)
 if len(candidates)<100 or regions["front"]<10:
  raise RuntimeError("Scalp frontal polygon region missing "+str({"eligible":len(candidates),"regions":regions,"y_range":[front_y,back_y]}))
 paths=[];region={"front":0,"crown":0,"rear":0}
 for i in range(count):
  poly=candidates[bisect.bisect_left(weights,rng.random()*total)]
  ids=list(poly.vertices)
  if len(ids)<3:continue
  j=rng.randrange(1,len(ids)-1)
  v0=mx@head.data.vertices[ids[0]].co
  v1=mx@head.data.vertices[ids[j]].co
  v2=mx@head.data.vertices[ids[j+1]].co
  a=math.sqrt(rng.random());b=rng.random()
  root=v0*(1-a)+v1*(a*(1-b))+v2*(a*b)
  normal=((v1-v0).cross(v2-v0)).normalized()
  # Do not trust polygon vertex winding as a signed normal: use BVH.
  local=imx@root
  nearest, n, idx, gap=bvh.find_nearest(local,.03)
  if nearest is None:continue
  root=mx@nearest
  n=(mx.to_3x3()@n).normalized()
  scalp_f=max(0.,min(1.,(back_y-root.y)/span))
  if scalp_f>.60:region["front"]+=1
  elif scalp_f<.30:region["rear"]+=1
  else:region["crown"]+=1
  # Hair center part: sweep away from part, then drape below ears.
  side=1 if root.x+(rng.random()-.5)*.016>0 else -1
  frac=min(1.,max(0.,abs(root.x)/max(halfwidth,.06)))
  length=rng.uniform(.145,.205)*(1-.11*frac)
  dside=rng.uniform(.045,.068)*(1-.20*frac)
  dback=rng.uniform(.006,.024)
  path=[]
  for k in range(7):
   t=k/6
   x=root.x+side*dside*(t**.72)
   y=root.y+dback*t + .002*math.sin(i*.317+t*7)*t
   z=root.z-length*(t**1.30)
   lift=n*(.0014*(1-t)+.004*math.sin(math.pi*t))
   path.append(Vector((x,y,z))+lift)
  paths.append(path)
 if len(paths)<count*.90 or region["front"]<count*.07:
  raise RuntimeError("Scalp geometry distribution invalid "+str({"curves":len(paths),"regions":region,"mask":len(candidates)}))
 mat=make_fiber_material("MIRA05_PigmentedHair",(.105,.057,.031,1),.48)
 obj=make_curves("MIRA05_ActualScalpFibers",paths,mat,.00011)
 source=bpy.data.objects.get("VitHair")
 if source is None:raise RuntimeError("Expected source flat hair-card object")
 source.hide_render=True
 return {"hair_curves":len(paths),"root_source":"BVH of actual source scalp mesh",
  "region_counts":region,"scalp_candidate_regions":regions,
  "measured_scalp_y_range_m":[front_y,back_y],
  "root_frontness":"scalp-relative normalized longitude, not eye-relative",
  "eligible_source_polygons":len(candidates),
  "original_hair_cards_hidden":source.hide_render,"fibers_object":obj.name,
  "fiber_radius_m":.00011,"length_m":[.145,.205],"head_top_m":top}

def build_brows(head,eye_center,seed=533,count_per_brow=1300):
 rng=random.Random(seed)
 bvh,mx,_=mesh_bvh(head)
 allpaths=[];hitcounts={}
 for side in (-1,1):
  n=0
  for i in range(count_per_brow*3):
   if n>=count_per_brow:break
   u=rng.random()
   x=side*(.013+.042*u)
   # Brow arches 15-26 mm above eye center in the actual head's eye-scale.
   z=eye_center.z+.021+.006*math.sin(math.pi*u)+rng.gauss(0,.0019)
   root=trace_front(head,bvh,x,z,eye_center.y)
   if root is None:continue
   p,normal=root
   if p.y>eye_center.y+.014:continue
   # Individual tapering strokes follow brow medial-to-temporal growth.
   length=.0037+.0045*rng.random()
   direction=Vector((side*.85,0.,.40+(.5-u)*.24)).normalized()
   allpaths.append([p,p+direction*length*.51+normal*.00015,
                     p+direction*length+normal*.00012])
   n+=1
  hitcounts["L" if side<0 else "R"]=n
 if min(hitcounts.values())<250:raise RuntimeError("Brow projection failed "+str(hitcounts))
 mat=make_fiber_material("MIRA05_BrowFibers",(.09,.052,.032,1),.58)
 obj=make_curves("MIRA05_IndividualBrowStrands",allpaths,mat,.000085)
 if bpy.data.objects.get("VitBrowCards") is None:raise RuntimeError("Source brow cards missing")
 bpy.data.objects["VitBrowCards"].hide_render=True
 return {"eyebrow_strands":len(allpaths),"left_right":hitcounts,
  "root_source":"raycast to MIRA03 source skin surface",
  "original_brow_cards_hidden":True,"fiber_radius_m":.000085}
