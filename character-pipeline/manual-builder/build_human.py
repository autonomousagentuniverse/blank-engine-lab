#!/usr/bin/env python3
"""Fresh, parameter-driven clay anatomical prototype. Blender 4.x only.
No old character / body deformation source is read. All body vertices originate
from landmark lofts, swept limbs, digit paths and a union remesh on every run.
Usage: blender -b --python build_human.py -- spec.json output_directory
"""
import bpy
import json
import math
import random
import sys
import hashlib
from pathlib import Path
from mathutils import Vector

SCHEMA = "blank.manual-human-builder.v2"
V = {}
USED = set()
SKIN_PARTS = []
def p(key):
    if key not in V: raise ValueError("Missing geometry control: " + key)
    USED.add(key)
    return V[key]
def cm(v): return v / 100.0
def clamp(x,a,b): return max(a,min(b,x))
def smooth(x): return x*x*(3-2*x)
def gauss(v,center,width): return math.exp(-((v-center)/width)**2)
def rgb(hexstr):
    return tuple(pow(int(hexstr[i:i+2],16)/255,2.2) for i in (1,3,5)) + (1,)
def mat(name,color,roughness=.58,sss=.0,metallic=0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=color
    m.use_nodes=True
    shader=m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=color
    shader.inputs["Roughness"].default_value=roughness
    shader.inputs["Metallic"].default_value=metallic
    node=shader.inputs.get("Subsurface Weight")
    if node: node.default_value=sss
    return m
def mesh(name,verts,faces,material,skin=True):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    if material: obj.data.materials.append(material)
    for f in obj.data.polygons:f.use_smooth=True
    if skin: SKIN_PARTS.append(obj)
    return obj
def loft(name,sections,material,sides=40,detail=None):
    # Each section = (center XYZ, horizontal half width, horizontal half depth).
    # The torso/pelvis surface is one loft, rather than isolated hip primitives.
    verts=[]; faces=[]
    for j,(center,rx,ry) in enumerate(sections):
        for k in range(sides):
            t=math.tau*k/sides
            x=center[0]+rx*math.cos(t)
            y=center[1]-ry*math.sin(t)
            z=center[2]
            if detail: y+=detail(x,y,z,t)
            verts.append((x,y,z))
        if j:
            a=(j-1)*sides;b=j*sides
            for k in range(sides):
                q=(k+1)%sides
                faces.append((a+k,a+q,b+q,b+k))
    faces.append(tuple(reversed(range(sides))))
    end=(len(sections)-1)*sides
    faces.append(tuple(end+i for i in range(sides)))
    return mesh(name,verts,faces,material)
def tube(name,knots,material,sides=12):
    """A free 3D swept elliptical limb/digit, using an orthogonal moving frame."""
    vertices=[]; faces=[]
    for j,(pos,r1,r2) in enumerate(knots):
        c=Vector(pos)
        tangent=Vector(knots[min(j+1,len(knots)-1)][0])-Vector(knots[max(j-1,0)][0])
        if tangent.length<1e-6:tangent=Vector((0,0,1))
        tangent.normalize()
        basis=Vector((0,1,0)) if abs(tangent.dot(Vector((0,1,0))))<.90 else Vector((1,0,0))
        u=tangent.cross(basis).normalized(); v=tangent.cross(u).normalized()
        for k in range(sides):
            t=math.tau*k/sides
            vertices.append(tuple(c+u*(r1*math.cos(t))+v*(r2*math.sin(t))))
        if j:
            a=(j-1)*sides;b=j*sides
            for k in range(sides): faces.append((a+k,a+(k+1)%sides,b+(k+1)%sides,b+k))
    faces.extend([tuple(reversed(range(sides))),tuple((len(knots)-1)*sides+k for k in range(sides))])
    return mesh(name,vertices,faces,material)
def ellipsoid(name,location,scale,material,skin=True,segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=location)
    obj=bpy.context.object; obj.name=name
    obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    for f in obj.data.polygons: f.use_smooth=True
    if skin:SKIN_PARTS.append(obj)
    return obj
def line(name,coords,width,material,bevel_res=2):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.resolution_u=12;curve.bevel_depth=width;curve.bevel_resolution=bevel_res
    spline=curve.splines.new('POLY');spline.points.add(len(coords)-1)
    for q,c in zip(spline.points,coords):q.co=(*c,1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj
def hash_file(path):
    digest=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):digest.update(block)
    return digest.hexdigest()
def build():
    global SKIN_PARTS
    # This legacy procedural Blender generator has not yet adopted the CC0 macro-target
    # topology used by the browser. Reject unsupported presets rather than silently
    # rebuilding a different character and claiming the new sex/appearance controls worked.
    gender=p("body.gender");population=p("appearance.population")
    if gender != "feminine" or population != "african":
        raise RuntimeError("Blender worker is not yet compatible with alternate MakeHuman morphology or ancestry references. Browser 3D preview supports these. No Blender render was generated.")
    H=cm(p("body.height"))
    sh=cm(p("body.shoulders")); rib=cm(p("body.chest")); chestd=cm(p("body.chest_depth"))
    bust=cm(p("body.bust")); bustsep=cm(p("body.bust_spacing"))
    waist=cm(p("body.waist")); waistd=cm(p("body.waist_depth"))
    hips=cm(p("body.hips")); hipd=cm(p("body.hip_depth"))
    glute=cm(p("body.glutes")); belly=cm(p("body.abdomen"))
    torsor=p("body.torso_ratio");nw=cm(p("body.neck_width")); nl=cm(p("body.neck_length"))
    slope=cm(p("body.shoulder_slope"));pitch=math.radians(p("body.posture"))
    fat=p("body.fat"); muscle=p("body.muscle")
    armlen=cm(p("arms.length")); ufr=p("arms.upper_ratio")
    upper=cm(p("arms.upper_width")); fore=cm(p("arms.forearm_width"))
    elbow=cm(p("arms.elbow_width")); wrist=cm(p("arms.wrist_width"))
    armrelax=math.radians(p("arms.relax")); armforward=cm(p("arms.forward"))
    palm=cm(p("hands.length")); palmw=cm(p("hands.width")); palmd=cm(p("hands.depth"))
    fingers=cm(p("hands.fingers")); fwidth=cm(p("hands.finger_width"))
    spread=math.radians(p("hands.spread"));thumb=cm(p("hands.thumb"))
    nails=cm(p("hands.nails"))
    stance=cm(p("legs.stance"));cr=p("legs.length_ratio")
    thigh=cm(p("legs.thigh"));knee=cm(p("legs.knee")); calf=cm(p("legs.calf"));ankle=cm(p("legs.ankle"))
    kneein=cm(p("legs.knee_in"));calfcurve=cm(p("legs.calf_curve"));legmus=p("legs.muscle")
    footlen=cm(p("feet.length"));footw=cm(p("feet.width"));heel=cm(p("feet.heel"))
    instep=cm(p("feet.instep"));arch=cm(p("feet.arch"))
    toelen=cm(p("feet.toe_length"));toesplay=cm(p("feet.toe_splay"));bigbias=cm(p("feet.big_toe"))
    headw=cm(p("face.head_width"));headd=cm(p("face.head_depth"));headlen=cm(p("face.head_length"))
    jaw=cm(p("face.jaw"));chin=cm(p("face.chin"));cheek=p("face.cheeks")
    eyesep=cm(p("face.eye_spacing"));eyedia=cm(p("face.eye_size"));iris=cm(p("face.iris"))
    eyetilt=math.radians(p("face.eye_tilt"));nosew=cm(p("face.nose_width"));noselen=cm(p("face.nose_length"))
    nosedepth=cm(p("face.nose_depth"));lip=cm(p("face.lips"));mouth=cm(p("face.mouth"))
    ear=cm(p("face.ears"));earproj=cm(p("face.ear_projection"))
    browarch=cm(p("face.brows"));browthick=cm(p("face.brow_width"))
    hair_style=p("hair.style"); hairlen=cm(p("hair.length"));hairvol=p("hair.volume")
    hairdens=int(p("hair.density"));curl=p("hair.curl");hairline=cm(p("hair.hairline"))
    asym=p("hair.asymmetry");hair_color=rgb(p("hair.color"))
    skin_color=rgb(p("skin.color"));rough=p("skin.roughness");sss=p("skin.subsurface")
    variation=p("skin.variation");sheen=p("skin.specular")
    iris_color=rgb(p("eye.iris_color"));sclera_color=rgb(p("eye.sclera_tint"))
    skin=mat("Adjustable skin",skin_color,rough,sss)
    skin.node_tree.nodes.get("Principled BSDF").inputs["Coat Weight"].default_value=sheen*.15
    # Texture variation is world/object-space procedural, not a fake uniform skin swatch.
    if variation>0:
        tex=skin.node_tree.nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=65
        tex.inputs["Detail"].default_value=2
        mix=skin.node_tree.nodes.new("ShaderNodeMixRGB");mix.blend_type='MULTIPLY'
        mix.inputs[0].default_value=variation;mix.inputs[1].default_value=skin_color
        skin.node_tree.links.new(tex.outputs["Fac"],mix.inputs[2])
        skin.node_tree.links.new(mix.outputs[0],skin.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    dark=mat("Hair & brows",hair_color,.8)
    whites=mat("Sclera",sclera_color,.32)
    irises=mat("Iris",iris_color,.39)
    black=mat("Pupil",(.006,.005,.005,1),.22)
    lipsmat=mat("Lips",tuple(clamp(v*.74+.022,0,1) for v in skin_color[:3])+(1,),.58,.08)
    nailmat=mat("Nails",tuple(clamp(v*.9+.045,0,1) for v in skin_color[:3])+(1,),.38)
    headchin=H-headlen
    shoulderZ=H*(.80+(torsor-.31)*.4);crotch=H*cr
    hipZ=crotch+H*.064
    waistZ=hipZ+H*(.107+(torsor-.31)*.3)
    chestZ=waistZ+H*.125
    neckZ=shoulderZ+nl*.18
    def torso_detail(x,y,z,t):
        front=max(0,math.sin(t))
        rear=max(0,-math.sin(t))
        breasts=sum(gauss(x,s*bustsep*.5,max(.05,rib*.24)) for s in (-1,1))
        return -(front*bust*gauss(z,chestZ-.005,.057)*breasts
               +front*belly*gauss(z,waistZ-.01,.085)) + rear*glute*gauss(z,hipZ,.068)
    torso=[
       ((0,0,crotch-.025), hips*.30,hipd*.30),
       ((0,0,crotch+.01),hips*.42,hipd*.42),
       ((0,0,hipZ-.035),hips*.49,hipd*.48),
       ((0,0,hipZ),hips*.50,hipd*.5),
       ((0,0,(hipZ+waistZ)*.5), (hips+waist)*.25,(hipd+waistd)*.25),
       ((0,0,waistZ),waist*.5,waistd*.5),
       ((0,0,(waistZ+chestZ)*.5),(waist+rib)*.25,(waistd+chestd)*.25),
       ((0,0,chestZ),rib*.5,chestd*.5),
       ((0,0,shoulderZ-.025),sh*.46,chestd*.46),
       ((0,0,shoulderZ),sh*.47,chestd*.39),
       ((0,0,shoulderZ+.025),nw*.75,nw*.55),
       ((0,0,neckZ),nw*.52,nw*.48),
       ((0,0,headchin+.017),nw*.49,nw*.46)
    ]
    torso=[((x, y+math.tan(pitch)*(z-waistZ)*.19, z),rx*(.9+.2*fat),ry*(.9+.2*fat)) for ((x,y,z),rx,ry) in torso]
    loft("Continuous trunk / pelvis landmarks",torso,skin,detail=torso_detail)
    # Head: original geometry is NOT loaded; head/jaw/chin are rebuilt with this lathe.
    hd=headchin;top=H
    head_sections=[
      ((0,-.004,hd+.004),chin*.35,headd*.24),
      ((0,-.008,hd+.021),chin*.5,headd*.33),
      ((0,-.006,hd+headlen*.25),jaw*.5,headd*.40),
      ((0,0,hd+headlen*.42),headw*(.44+.08*cheek),headd*.47),
      ((0,0,hd+headlen*.60),headw*.50,headd*.51),
      ((0,.004,hd+headlen*.77),headw*.49,headd*.52),
      ((0,.009,hd+headlen*.9),headw*.39,headd*.43),
      ((0,.012,top-.004),headw*.12,headd*.16)]
    loft("Head jaw cheek brow crown",head_sections,skin,48)
    # Ears have geometry of their own and genuinely use size and projection.
    for s in (-1,1):
        ex=s*(headw*.51+earproj*.18);ez=hd+headlen*.45
        ellipsoid("Ear "+str(s),(ex,earproj*.2,ez),(ear*.27,earproj*.57+.006,ear*.5),skin)
        ellipsoid("Concha "+str(s),(ex+s*.005,-.007,ez),(ear*.13,.006,ear*.28),lipsmat,False)
    # Nose bridge/tip/nasal wings.
    bridgeZ=hd+headlen*.59
    tipZ=bridgeZ-noselen*.58
    ellipsoid("Nasal bridge",(0,-headd*.50-nosedepth*.18,bridgeZ-noselen*.25),
              (nosew*.34,nosedepth*.57,noselen*.48),skin)
    ellipsoid("Nose tip",(0,-headd*.51-nosedepth*.55,tipZ),(nosew*.41,nosedepth*.43,nosew*.32),skin)
    for s in (-1,1):ellipsoid("Nasal ala "+str(s),(s*nosew*.35,-headd*.48-nosedepth*.27,tipZ-.005),
                                   (nosew*.24,nosedepth*.30,nosew*.20),skin)
    lipZ=tipZ-.035;lipY=-headd*.49-.003
    for q,z,thick in [("upper",lipZ+.005,lip*.48),("lower",lipZ-.009,lip*.62)]:
        ellipsoid("Lip "+q,(0,lipY-.006,z),(mouth*.5,lip*.44,thick),lipsmat,False,28,14)
    # Eyes: iris and pupil travel with eyeball; asymmetric angles adjust vertical centers.
    eyeZ=hd+headlen*.635
    browY=-headd*.51-.003
    for s in (-1,1):
        cx=s*eyesep*.5; cy=-headd*.48; cz=eyeZ+s*math.tan(eyetilt)*eyesep*.25
        ellipsoid("Eyeball "+str(s),(cx,cy,cz),(eyedia*.5,eyedia*.5,eyedia*.5),whites,False)
        ellipsoid("Iris "+str(s),(cx,cy-eyedia*.49,cz),(iris*.5,.0019,iris*.5),irises,False)
        ellipsoid("Pupil "+str(s),(cx,cy-eyedia*.5-.002,cz),(iris*.23,.001,iris*.23),black,False)
        upperlid=[];lowerlid=[];eyebrow=[]
        for i in range(13):
            t=i/12; x=cx+eyedia*.57*(2*t-1)
            y=cy-eyedia*.41-.003 +eyedia*.07*abs(2*t-1)
            upperlid.append((x,y,cz+.003+math.sin(math.pi*t)*eyedia*.23))
            lowerlid.append((x,y,cz-.004-math.sin(math.pi*t)*eyedia*.12))
            eyebrow.append((x, browY,cz+eyedia*.78 +browarch*math.sin(math.pi*t)))
        line("Upper eyelid "+str(s),upperlid,.0018,skin)
        line("Lower eyelid "+str(s),lowerlid,.0013,skin)
        line("Eyebrow "+str(s),eyebrow,max(.001,browthick*.44),dark)
    # Legs: independently solved hip/knee/ankle landmarks. Upper leg intersects
    # continuous pelvis so the union remesh smooths the join, not outward hip blobs.
    leg_report={}
    for s in (-1,1):
        xhip=s*hips*.27
        xknee=s*(stance*.50-kneein)
        xankle=s*stance*.50
        ankleZ=H*.068;kneeZ=(crotch+ankleZ)*.49
        legsections=[
            ((xankle,0,ankleZ-.017),ankle*.42,ankle*.48),
            ((xankle,0,ankleZ),ankle*.5,ankle*.51),
            (((xknee+xankle)*.5,calfcurve*.65,(kneeZ+ankleZ)*.5),calf*.5*(1+.08*legmus),calf*.49),
            ((xknee,0,kneeZ),knee*.5,knee*.47),
            (((xhip+xknee)*.5,0,(kneeZ+crotch)*.56),thigh*.49*(.92+.2*fat),thigh*.47),
            ((xhip,0,crotch),thigh*.51,thigh*.5),
            ((xhip,0,crotch+H*.064),thigh*.54,thigh*.52)]
        loft("Anatomical leg "+str(s),legsections,skin,32)
        leg_report[str(s)]={"hip_x":xhip,"knee_x":xknee,"ankle_x":xankle,"knee_z":kneeZ}
        # Foot dorsum and heel, swept along negative Y.
        footbase=ankleZ-.03
        foottip=-(footlen-toelen)*.75
        tube("Foot instep / heel "+str(s),[
            ((xankle,.045,footbase),heel*.37,.030),
            ((xankle,.00,footbase),heel*.5,instep*.48),
            ((xankle,-footlen*.45,footbase-.014),footw*.45,instep*.39),
            ((xankle,foottip,footbase-.022),footw*.5,.022),
            ((xankle,foottip-.014,footbase-.024),footw*.46,.018)
        ],skin,20)
        # Arch is a distinct anatomical recess rather than an overall scale.
        if arch>0:
            ellipsoid("Medial arch "+str(s),(xankle-s*heel*.29,-footlen*.33,footbase+.006),
                      (heel*.27,.035,arch*.5+.003),skin)
        toe_positions=[-.36,-.17,.02,.20,.36]
        for j,q in enumerate(toe_positions):
            x=xankle+q*footw
            length=toelen*(1-.12*j)+ (bigbias if j==0 else 0)
            dy=-length
            dx=q*toesplay
            base=(x,foottip-.012,footbase-.024)
            tube("Toe "+str(s)+" "+str(j+1),[
                (base,footw*(.105 if j==0 else .077),.012),
                ((x+dx*.5,base[1]+dy*.55,base[2]-.002),footw*(.090 if j==0 else .063),.010),
                ((x+dx,base[1]+dy,base[2]-.004),footw*(.042 if j==0 else .031),.006)
            ],skin,10)
    # Arms / palms / five fingers and thumbs: generated meshes, not skinned
    # artifacts borrowed from previous visually failed character.
    for s in (-1,1):
        shoulderX=s*(sh*.5-.012);shoulderY=0
        origin=Vector((shoulderX,shoulderY,shoulderZ-slope))
        elbowP=origin+Vector((s*math.sin(armrelax)*armlen*ufr,
                              -armforward*.5,-math.cos(armrelax)*armlen*ufr))
        wristP=elbowP+Vector((s*math.sin(armrelax)*armlen*(1-ufr)*.85,
                              -armforward*.5,-math.cos(armrelax)*armlen*(1-ufr)))
        upperKnots=[
            (origin,upper*.48,upper*.48),
            (tuple(origin.lerp(elbowP,.4)),upper*.52*(.9+.15*muscle),upper*.48),
            (tuple(elbowP),elbow*.5,elbow*.48),
            (tuple(elbowP.lerp(wristP,.5)),fore*.5,fore*.48),
            (tuple(wristP),wrist*.5,wrist*.49)]
        tube("Arm shoulder elbow wrist "+str(s),upperKnots,skin,16)
        palmbot=wristP-Vector((0,0,palm))
        tube("Palm "+str(s),[
            (tuple(wristP),wrist*.50,palmd*.6),
            (tuple(wristP-Vector((0,0,palm*.35))),palmw*.53,palmd*.54),
            (tuple(palmbot),palmw*.47,palmd*.5)
        ],skin,14)
        ratios=[.78,.92,1,.89,.73]
        for j in range(5):
            offs=(j-2)*palmw*.21
            x=palmbot.x+offs
            fingerlen=fingers*ratios[j]
            bend=s*math.sin(spread)*(j-2)*fingerlen*.45
            tube("Finger "+str(s)+" "+str(j+1),[
                ((x,palmbot.y,palmbot.z),fwidth*.51,fwidth*.49),
                ((x+bend*.5,palmbot.y-.002,palmbot.z-fingerlen*.55),fwidth*.42,fwidth*.42),
                ((x+bend,palmbot.y-.003,palmbot.z-fingerlen),fwidth*.27,fwidth*.28)
            ],skin,10)
            ellipsoid("Fingernail "+str(s)+" "+str(j+1),
                (x+bend*.86,palmbot.y-palmd*.32,palmbot.z-fingerlen*.88),
                (nails*.36,.0011,nails*.42),nailmat,False,12,8)
        thumbx=wristP.x+s*palmw*.48
        tube("Thumb "+str(s),[
           ((thumbx,wristP.y,wristP.z-palm*.28),fwidth*.7,fwidth*.62),
           ((thumbx+s*thumb*.38,wristP.y-.006,wristP.z-palm*.35-thumb*.35),fwidth*.5,fwidth*.5),
           ((thumbx+s*thumb*.7,wristP.y-.008,wristP.z-palm*.35-thumb*.82),fwidth*.33,fwidth*.33)
        ],skin,12)
    # Merge substantive skin sections with voxel union (new shared topology).
    bpy.ops.object.select_all(action='DESELECT')
    for obj in SKIN_PARTS:obj.select_set(True)
    bpy.context.view_layer.objects.active=SKIN_PARTS[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    body=bpy.context.object;body.name="Fresh anatomical full-body union"
    # Voxel size trades speed for toe/finger preservation; no rescale of old base.
    body.data.remesh_voxel_size=.0055
    bpy.ops.object.voxel_remesh()
    for poly in body.data.polygons:poly.use_smooth=True
    modifier=body.modifiers.new("Union surface smoothing","SMOOTH")
    modifier.factor=1.0;modifier.iterations=2
    # Hair guides are separate geometry and respect selected style/density/curl.
    if hair_style!="bald" and hairlen>.001:
        rng=random.Random(18026); guides=[]
        for i in range(hairdens):
            a=math.tau*((i*.61803398875)%1)
            u=(i+.5)/hairdens
            phi=math.acos(1-u*.85)
            x=math.sin(phi)*math.cos(a);y=math.sin(phi)*math.sin(a)
            root=(x*headw*.47,y*headd*.44,top-headlen*.19*(1-math.cos(phi)))
            # Recessed front hairline: reject frontal follicles below chosen cutoff.
            if y<-.35 and root[2] < top-headlen*.28-hairline:continue
            if hair_style=="afro":extent=hairlen*hairvol*(.48+.45*rng.random())
            elif hair_style=="short-curls":extent=hairlen*.38*hairvol
            elif hair_style=="locs":extent=hairlen
            else:extent=hairlen*.75
            points=[]
            for k in range(11):
                t=k/10
                if hair_style in ("afro","short-curls"):
                    radial=(x*extent*t*(.55+asym*s if (s:=1 if x>0 else -1) else 1),
                            y*extent*t*.7)
                    zz=root[2]+extent*t*(.85-.25*phi)
                elif hair_style=="locs":
                    radial=(x*.016*t,y*.016*t)
                    zz=root[2]-extent*t
                else:
                    radial=(x*.05*t,y*.02*t)
                    zz=root[2]-extent*t*.78
                wave=.0038*curl*math.sin(18*t+7*a+i)*t
                points.append((root[0]+radial[0]+wave,root[1]+radial[1]+wave,
                               zz+.002*curl*math.cos(15*t+i)))
            guides.append(points)
        # One curve object containing all poly splines keeps the file practical.
        curve=bpy.data.curves.new("Procedural follicle strands",'CURVE')
        curve.dimensions='3D';curve.bevel_depth=.0019 if hair_style!="locs" else .0033
        curve.bevel_resolution=2
        for pts in guides:
            spline=curve.splines.new('POLY');spline.points.add(len(pts)-1)
            for item,point in zip(spline.points,pts):item.co=(*point,1)
        groom=bpy.data.objects.new("Rebuilt hair strands",curve)
        bpy.context.collection.objects.link(groom);groom.data.materials.append(dark)
    else:guides=[]
    return {
      "height_m":H,"total_hip_width_target_m":hips,"shoulder_width_target_m":sh,
      "waist_width_target_m":waist,"head_height_m":headlen,
      "crotch_z_m":crotch,"pelvis_z_m":hipZ,"neck_z_m":neckZ,
      "skin_union_vertices":len(body.data.vertices),"skin_union_faces":len(body.data.polygons),
      "digits_per_hand":5,"digits_per_foot":5,"hands":2,"feet":2,
      "hair_strand_groups":len(guides),"hair_style":hair_style,
      "leg_landmarks":leg_report, "generator":"independent landmark-loft swept-digits voxel-union v1"
    }
def camera_view(scene,name,angle,H,output,resolution):
    radians=math.radians(angle)
    cam_data=bpy.data.cameras.new("Camera "+name)
    cam=bpy.data.objects.new("Camera "+name,cam_data);scene.collection.objects.link(cam)
    target=Vector((0,0,H*.50))
    cam.location=(4*math.sin(radians),-4*math.cos(radians),H*.54)
    cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler()
    cam_data.type='ORTHO';cam_data.ortho_scale=H*1.19
    scene.camera=cam
    scene.render.resolution_x=round(resolution*.72);scene.render.resolution_y=resolution
    scene.render.filepath=str(output.resolve())
    bpy.ops.render.render(write_still=True)
    if not output.is_file() or output.stat().st_size<8000:raise RuntimeError("Render did not create "+name)
    return {"view":name,"file":output.name,"bytes":output.stat().st_size,"sha256":hash_file(output)}
def main():
    if '--' not in sys.argv or len(sys.argv[sys.argv.index('--')+1:])!=2:
        raise SystemExit('Usage: blender -b --python build_human.py -- settings.json output_dir')
    args=sys.argv[sys.argv.index('--')+1:]
    source=Path(args[0]).resolve();out=Path(args[1]).resolve()
    cfg=json.loads(source.read_text())
    if cfg.get("schema")!=SCHEMA or not isinstance(cfg.get("controls"),dict):
        raise ValueError("Invalid spec schema")
    global V
    V=cfg['controls']
    if not all(isinstance(k,str) and (isinstance(v,(str,int,float)) and not isinstance(v,bool)) for k,v in V.items()):
        raise ValueError("Invalid control types")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    landmarks=build()
    samples=int(p("render.samples"));res=int(p("render.resolution"))
    background=rgb(p("render.background"));key=p("render.light")
    clay=p("render.clay")=="true"
    if len(USED)!=len(V) or set(USED)!=set(V):
        raise ValueError("Unbound variable(s): "+str(sorted(set(V)-USED)))
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=samples
    scene.cycles.use_denoising=True
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;scene.world=world
    world.node_tree.nodes['Background'].inputs['Color'].default_value=background
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
    # Clay mode preserves anatomical geometry and neutralises variable skin pigment
    # in render only. Original skin color is retained in editable Blender material.
    if clay:
        for material in bpy.data.materials:
            if material.name in ('Adjustable skin','Lips','Nails'):
                bs=material.node_tree.nodes.get('Principled BSDF')
                if bs:
                    for link in list(bs.inputs['Base Color'].links):material.node_tree.links.remove(link)
                    bs.inputs['Base Color'].default_value=(.59,.55,.51,1)
    for name,where,energy,size in [
       ('Key',(-3,-4,5),850*key,4.0),
       ('Fill',(4,-2,3.2),500,3.2),
       ('Rim',(0,3,4),700,2.8)]:
        light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=size
        obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj)
        obj.location=where;obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
    out.mkdir(parents=True,exist_ok=True)
    H=landmarks['height_m']
    results=[]
    for name,angle in [('front',0),('three_quarter',30),('profile',90)]:
        results.append(camera_view(scene,name,angle,H,out/(name+'.png'),res))
    scene.camera=bpy.data.objects['Camera three_quarter']
    bpy.ops.wm.save_as_mainfile(filepath=str((out/'anatomical_character.blend').resolve()),compress=True)
    report={"schema":"blank.anatomy-rebuild-report.v1","generator":"fresh mesh; old Blender source never opened",
       "source_character_reused":False,"photoreal_approved":False,"deployed":False,
       "controls_applied":len(USED),"control_ids":sorted(USED),
       "geometry":landmarks,"renders":results,
       "editable_blend":{"filename":"anatomical_character.blend",
          "sha256":hash_file(out/'anatomical_character.blend')},
       "blender":bpy.app.version_string}
    (out/'report.json').write_text(json.dumps(report,indent=2))
    print("BLANK_FRESH_ANATOMICAL_REBUILD_COMPLETE",json.dumps({"geometry":landmarks,"renders":results}),flush=True)
if __name__=="__main__": main()
