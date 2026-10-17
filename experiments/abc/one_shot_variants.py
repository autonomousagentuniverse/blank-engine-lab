#!/usr/bin/env python3
"""Controlled A/B/C one-pass complete CC0-derived human candidates.
Each independent Blender process starts from exactly the same MIRA03 source.
A: unchanged MIRA05 generation.
B: bounded independent random perturbations of hairs/brows/face/skin.
C: source-conditioned coherent scalp/hair/brow/face/skin fields.
These are experimental candidates, NOT photographed or approved humans.
"""
import bpy, sys, os, math, json, hashlib, random, statistics, traceback
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from geometry import build_hair,build_brows
from reconstruction import eyes,skin,identity

SRC=Path("baseline-mira03/mira03-continuous-midline.blend")
SOURCE_HASH="1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d"
SEED=20261017

def hashfile(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()

def getpoints(sp):
    return [Vector(tuple(p.co)[:3]) for p in sp.points]

def setpoints(sp,pts, taper=False):
    assert len(sp.points)==len(pts)
    for i,(p,v) in enumerate(zip(sp.points,pts)):
        p.co=(v.x,v.y,v.z,1.)
        if taper:
            t=i/max(1,len(pts)-1)
            p.radius=max(.11,1.-.89*(t**1.4))

def head_field(head,eye_center,arm):
    """Tiny alternative face variation; apply same displacements to all blend shapes."""
    rng=random.Random(SEED+51)
    keys=head.data.shape_keys.key_blocks
    base=keys.get("Basis")
    assert base and len(keys)>=27
    mx=head.matrix_world.copy()
    inv=mx.inverted().to_3x3()
    displacement=[]
    for v in base.data:
        pt=mx@v.co
        z=pt.z-eye_center.z
        x=pt.x
        # Preserve eyelid rims, nose bridge and mouth: cheek/jaw only.
        cheek=math.exp(-.5*((abs(x)-.056)/.032)**2-.5*((z+.060)/.045)**2)
        eye_clear=1.-math.exp(-.5*((abs(x)-.03347)/.030)**2-.5*(z/.026)**2)
        lip_clear=1.-math.exp(-.5*(x/.037)**2-.5*((z+.085)/.018)**2)
        mask=cheek*eye_clear*lip_clear
        if arm=="B":
            shift=Vector((rng.gauss(0,.00027),rng.gauss(0,.00027),rng.gauss(0,.00027)))
        elif arm=="C":
            # Spatial field follows cheek/jaw, with coherent left/right asymmetry.
            field=math.sin(11.8*x+7.3*z+.6)*.00055+math.sin(28.4*x-6*z)*.00022
            shift=Vector((math.tanh(x/.032)*field*.24,field,field*.20))
        else:
            shift=Vector((0,0,0))
        displacement.append(inv@(shift*mask))
    for key in keys:
        for i,d in enumerate(displacement):key.data[i].co+=d
    head.data.update()
    return {"max_local_adjustment_mm":round(max(d.length for d in displacement)*1000,4),
            "field":"random_independent" if arm=="B" else "smooth_anatomy_mask"}

def scalp_frame(head):
    mx=head.matrix_world.copy()
    verts=[v.co.copy() for v in head.data.vertices]
    faces=[tuple(p.vertices) for p in head.data.polygons]
    bvh=BVHTree.FromPolygons(verts,faces,all_triangles=False,epsilon=.00003)
    points=[mx@v.co for v in head.data.vertices]
    ys=sorted(p.y for p in points if p.z>statistics.median(p.z for p in points[::17]))
    front=ys[int(len(ys)*.1)];back=ys[int(len(ys)*.9)]
    return bvh,mx,front,back

def altered_hair(head,arm):
    obj=bpy.data.objects["MIRA05_ActualScalpFibers"]
    rng=random.Random(SEED+101)
    bvh,mx,front,back=scalp_frame(head)
    inv=mx.inverted()
    changes=0
    original_roots=[]
    for sp in obj.data.splines:
        pts=getpoints(sp)
        if len(pts)!=7:raise RuntimeError("Unexpected source hair geometry")
        root=pts[0]
        original_roots.append(root)
        if arm=="B":
            # Independent, uncorrelated point-level random perturbation.
            # Do not change root to keep follicle distribution controlled.
            amp=rng.uniform(.001,.007)
            novel=[root]
            for i,p in enumerate(pts[1:],start=1):
                t=i/6
                offset=Vector([rng.gauss(0,amp)*t for _ in range(3)])
                novel.append(p+offset)
        else:
            # Subject-local follicle field. Roots unchanged; growth/guide changes
            # by location, regions, clump assignment and outward normal.
            local=inv@root
            near, normal, poly, gap=bvh.find_nearest(local,.025)
            if near is None:raise RuntimeError("No scalp contact at root")
            normal=(mx.to_3x3()@normal).normalized()
            frontness=max(0.,min(1.,(back-root.y)/max(.001,back-front)))
            temple=min(1.,abs(root.x)/.082)
            side=1 if root.x>=0 else -1
            # Shared clump structure plus smooth, regional orientation fields.
            cx=round(root.x/.014);cy=round(root.y/.018)
            clump=math.sin(cx*1.7+cy*2.3)
            curl=math.sin(root.x*31+root.y*19+2.1)
            shift=math.sin(root.x*12.0-root.y*16.0)+.40*math.sin(root.x*27+root.y*7)
            length=(.10+.070*(1-frontness)+.023*clump+.009*curl)*(1.-.12*temple)
            lateral=(.016+.042*frontness+.024*temple+.007*clump)
            back_sweep=.004+.033*(1-frontness)+.007*shift
            # Initial root tangent follows scalp normal. Crown/temple/rear are distinct.
            novel=[]
            for i in range(7):
                t=i/6.
                growth=normal*.009*(t*(1-t)) + Vector((
                    side*lateral*(t**.70),
                    back_sweep*(t**.74),
                    -length*(t**1.18)))
                natural_wave=Vector((
                    .0027*shift*math.sin(math.pi*t*1.6),
                    .0037*clump*math.sin(math.pi*t),
                    .0031*curl*math.sin(math.pi*t*.8)))
                p=root+growth+natural_wave
                if i>0:
                    # Correct strand/head crossings only where model surface is very near.
                    np, nn, _, clearance=bvh.find_nearest(inv@p,.025)
                    if np is not None and clearance<.0013 and t<.55:
                        outward=(mx.to_3x3()@nn).normalized()
                        p=p+outward*(.0013-clearance)
                novel.append(p)
        setpoints(sp,novel,taper=(arm=="C"))
        changes+=1
    return {"curves_modified":changes,"root_vertices_unchanged":True,
            "source_anchor_count":len(original_roots),
            "guide_field":"independent_noise" if arm=="B" else "regional_clumped_source_conditioned",
            "strand_taper":arm=="C"}

def altered_brows(arm):
    obj=bpy.data.objects["MIRA05_IndividualBrowStrands"]
    rng=random.Random(SEED+203)
    updated=0
    for sp in obj.data.splines:
        pts=getpoints(sp)
        assert len(pts)==3
        root=pts[0]
        if arm=="B":
            out=[root]
            for i,p in enumerate(pts[1:],start=1):
                out.append(p+Vector((rng.gauss(0,.0006),rng.gauss(0,.0006),rng.gauss(0,.0006))))
        else:
            # Distinct medial/inferior/lateral flow and spatial clump density
            # encoded from the existing source-projected root locations.
            u=min(1.,max(0.,(abs(root.x)-.013)/.042))
            side=1 if root.x>=0 else -1
            angle=.5*(1-u)-.20*u+.11*math.sin(root.x*140+root.z*48)
            base_len=(.0035+.0023*(1-u)+.0012*math.cos(root.z*70))*(.9+.08*math.sin(root.x*110))
            vec=Vector((side*math.cos(angle),.10*math.sin(u*math.pi),math.sin(angle))).normalized()*base_len
            out=[root,root+vec*.54,root+vec]
        setpoints(sp,out,taper=(arm=="C"))
        updated+=1
    return {"brow_strands_modified":updated,
            "brow_field":"independent_noise" if arm=="B" else "medial_to_temporal_growth"}

def skin_variation(arm):
    # Same existing photo-derived UV/albedo/normal/roughness maps for A,B,C.
    # B adds fine independent noise; C adds broad correlated material regions.
    material=bpy.data.materials["VitSkin"]
    bsdf=next(n for n in material.node_tree.nodes if n.bl_idname=="ShaderNodeBsdfPrincipled")
    tree=material.node_tree
    inp=bsdf.inputs["Roughness"]
    old=list(inp.links)
    source=old[0].from_socket if old else None
    if old:tree.links.remove(old[0])
    noise=tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value=410. if arm=="B" else 14.
    noise.inputs["Detail"].default_value=2.5
    ramp=tree.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value=0.
    ramp.inputs["From Max"].default_value=1.
    ramp.inputs["To Min"].default_value=.93
    ramp.inputs["To Max"].default_value=1.07
    tree.links.new(noise.outputs["Fac"],ramp.inputs["Value"])
    mix=tree.nodes.new("ShaderNodeMixRGB")
    mix.blend_type="MULTIPLY";mix.inputs[0].default_value=1.
    if source:tree.links.new(source,mix.inputs[1])
    else:mix.inputs[1].default_value=inp.default_value
    tree.links.new(ramp.outputs["Result"],mix.inputs[2])
    tree.links.new(mix.outputs["Color"],inp)
    return {"roughness_field":"uncorrelated_micro_noise" if arm=="B" else "correlated_low_frequency",
            "original_albedo_normal_roughness_maps_preserved":True}

def angular_measure(obj):
    hist=[0]*12
    lengths=[]
    for sp in obj.data.splines:
        pts=getpoints(sp)
        vec=pts[-1]-pts[0]
        theta=math.atan2(vec.z,vec.x)
        binno=int((theta+math.pi)/(math.pi*2)*12)%12
        hist[binno]+=1
        lengths.append(vec.length)
    n=sum(hist)
    p=[x/n for x in hist if x]
    ent=-sum(q*math.log(q) for q in p)/math.log(12)
    return {"tip_direction_bins_12":hist,"tip_direction_entropy_2d":round(ent,5),
            "mean_root_tip_distance_m":round(statistics.mean(lengths),6),
            "two_largest_bins_fraction":round(sum(sorted(hist)[-2:])/n,5),
            "metric_limit":"2D projected global statistic; not a validated human realism score"}

def main(arm):
    assert arm in ("A","B","C")
    assert SRC.exists() and hashfile(SRC)==SOURCE_HASH,"Frozen source hash mismatch"
    out=Path("artifacts/abc")/arm
    out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
    scene=bpy.context.scene
    head=bpy.data.objects["cm_vitruvian"]
    eye1=bpy.data.objects["Eye_L_eyeball"]
    eye2=bpy.data.objects["Eye_R_eyeball"]
    ec=(eye1.matrix_world.translation+eye2.matrix_world.translation)*.5
    result={"variant":arm,"schema":"blank.abc.human.v1","source_hash":SOURCE_HASH,
            "source":"CC0 Vitruvian-derived MIRA03","no_independent_identity_claim":True,
            "no_visual_approval":True,"release_allowed":False,
            "identity":identity(head,ec)}
    if arm in ("B","C"):result["face_field"]=head_field(head,ec,arm)
    result["eyes"]=eyes(head,ec)
    result["hair"]=build_hair(head,ec)
    result["brows"]=build_brows(head,ec)
    result["skin"]=skin()
    if arm in ("B","C"):
        result["hair_delta"]=altered_hair(head,arm)
        result["brows_delta"]=altered_brows(arm)
        result["skin_delta"]=skin_variation(arm)
    result["hair_direction"]=angular_measure(bpy.data.objects["MIRA05_ActualScalpFibers"])
    scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=24
    scene.render.resolution_x=700;scene.render.resolution_y=700
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.threads_mode="FIXED";scene.render.threads=4
    front=bpy.data.objects["CAM_MIRA_front"]
    three=bpy.data.objects["CAM_MIRA_three_quarter"]
    macro=bpy.data.objects["CAM_MIRA_eyes_macro"]
    target=ec+Vector((0,0,-.025))
    dist=(front.matrix_world.translation-target).length
    profile=bpy.data.objects.new("CAM_ABC_PROFILE",front.data.copy())
    bpy.context.scene.collection.objects.link(profile)
    profile.location=target+Vector((dist,0,0))
    profile.rotation_euler=(target-profile.location).to_track_quat("-Z","Y").to_euler()
    result["frames"]=[]
    for view,cam in [("front",front),("three_quarter",three),("profile",profile),("eyes_macro",macro)]:
        scene.camera=cam
        fname=out/(view+".png")
        scene.render.filepath=str(fname.resolve())
        print("ABC_TRUE_CYCLES",arm,view,flush=True)
        bpy.ops.render.render(write_still=True)
        assert fname.stat().st_size>12000
        result["frames"].append({"view":view,"camera":cam.name,
                  "sha256":hashfile(fname),"size":fname.stat().st_size,"samples":24})
    bpy.ops.file.pack_all()
    file=out/("complete_"+arm+".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(file.resolve()),compress=True,check_existing=False)
    assert file.stat().st_size>15000000
    result["full_blend_sha256"]=hashfile(file)
    result["full_blend_bytes"]=file.stat().st_size
    result["status"]="GENERATED_UNAPPROVED_AWAITING_COMPARISON"
    (out/"report.json").write_text(json.dumps(result,indent=2)+"\n")
    print("ABC_COMPLETE",json.dumps({"arm":arm,"hair_direction":result["hair_direction"],"blend_sha":result["full_blend_sha256"],"images":4}),flush=True)
    sys.stdout.flush();os._exit(0)
if __name__=="__main__":
    try:
        main(sys.argv[1])
    except BaseException:
        traceback.print_exc()
        sys.stdout.flush();os._exit(1)
