#!/usr/bin/env python3
"""Scalp-surface-rooted Afro prototype: one Blender construction pass, fail closed.

Builds a variant from a pinned *existing* MPFB-generated human, not a new identity.
Full head hair is reconstructed from anatomy; no global object offset/old ellipsoid roots.
No release without comparative visual review and rigged-motion tests.
"""
import bpy, bisect, hashlib, json, math, pathlib, random, statistics
from mathutils import Vector
from mathutils.bvhtree import BVHTree

SRC=pathlib.Path("source/afro_woman_darkskin_medium_build_final.blend")
SHA="26fbbab775771a197482d7baffb89decbbf4f821dd3cfaa69fac28ee52e1fc2a"
OUT=pathlib.Path("artifacts/follicle-surface-prototype")
OUT.mkdir(parents=True,exist_ok=True)
SEED=20261018
HAIR_NAMES=("Natural_Afro_Coils_0","Natural_Afro_Coils_1","Natural_Afro_Coils_2")

def sha(path):
    h=hashlib.sha256()
    with open(path,"rb") as fp:
        for b in iter(lambda:fp.read(1024*1024),b""):h.update(b)
    return h.hexdigest()
def quant(a,q):
    a=sorted(a);pos=(len(a)-1)*q;i=int(pos);t=pos-i
    return round(a[i]*(1-t)+a[min(i+1,len(a)-1)]*t,4)
def get_shape_coords(body):
    # Evaluate the real active shape key without garment masks or armature pose.
    probe=body.copy();probe.data=body.data.copy()
    bpy.context.scene.collection.objects.link(probe)
    for m in list(probe.modifiers):probe.modifiers.remove(m)
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    e=probe.evaluated_get(dg);mesh=e.to_mesh(preserve_all_data_layers=False,depsgraph=dg)
    try:
        assert len(mesh.vertices)==len(body.data.vertices)
        result=[e.matrix_world @ v.co for v in mesh.vertices]
    finally:e.to_mesh_clear()
    bpy.data.objects.remove(probe,do_unlink=True)
    return result
def scalp_surface(body, coords):
    g=body.vertex_groups.get("scalp")
    assert g is not None
    ids=set()
    for v in body.data.vertices:
        try:
            if g.weight(v.index)>=.5:ids.add(v.index)
        except RuntimeError:pass
    assert len(ids)==376,("SCALP_MASK_CHANGED",len(ids))
    tris=[]
    for poly in body.data.polygons:
        ix=tuple(poly.vertices)
        if len(ix)<3 or not all(i in ids for i in ix):continue
        for j in range(1,len(ix)-1):
            indices=(ix[0],ix[j],ix[j+1])
            a,b,c=(coords[k] for k in indices)
            face=(b-a).cross(c-a)
            area=face.length*.5
            if area<1e-12:continue
            tris.append((a,b,c,face.normalized(),area,indices))
    assert len(tris)>300,("MISSING_SCALP_TRIANGLES",len(tris))
    area=sum(t[4] for t in tris)
    assert .005<area<.15,("UNREALISTIC_SCALP_SURFACE_AREA",area)
    return ids,tris,area

def construct():
    assert sha(SRC)==SHA,"SOURCE_CHANGED"
    bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
    body=bpy.data.objects.get("AFRO_WOMAN_28_Medium_Build")
    assert body and body.type=="MESH" and len(body.data.vertices)==19158
    old_hair=[bpy.data.objects.get(n) for n in HAIR_NAMES]
    assert all(o and o.type=="CURVE" for o in old_hair)
    assert [len(o.data.splines) for o in old_hair]==[1850,1500,1100],[(o.name,len(o.data.splines)) for o in old_hair]
    coords=get_shape_coords(body)
    scalp_ids,tris,area=scalp_surface(body,coords)
    # Baseline root-to-triangle gap, exactly the same measured source scalp.
    polys=[(t[0],t[1],t[2]) for t in tris]
    bvh=BVHTree.FromPolygons([v for v in coords],
        [tuple(t[5]) for t in tris],all_triangles=True)
    roots_old=[]
    for o in old_hair:
        for sp in o.data.splines:
            roots_old.append(o.matrix_world @ Vector(sp.points[0].co[:3]))
    old_gap=[bvh.find_nearest(p)[3]*1000 for p in roots_old]
    assert len(old_gap)==4450

    # Low-discrepancy area-stratified sample over exact existing scalp mesh.
    # The face index is not a head heuristic; identity and scalp topology remain pinned.
    areas=[];acc=0
    for t in tris:
        acc+=t[4];areas.append(acc)
    rng=random.Random(SEED)
    schedule=list(range(4450));rng.shuffle(schedule)
    placements=[]
    center=sum((coords[i] for i in scalp_ids),Vector())/len(scalp_ids)
    for k in schedule:
        rank=(k+.5)/4450*area
        face_index=min(bisect.bisect_left(areas,rank),len(tris)-1)
        a,b,c,n,ar,ix=tris[face_index]
        u=rng.random();v=rng.random()
        # Uniform barycentric triangle distribution, root EXACTLY on scalp surface.
        su=math.sqrt(u)
        bary=(1-su,su*(1-v),su*v)
        root=a*bary[0]+b*bary[1]+c*bary[2]
        # Verify no inward scalp mesh normal flips.
        if n.dot(root-center)<0:n=-n
        assert n.length>.9
        placements.append((root,n,face_index,bary))
    # Build 4450 new fibers, replacing all points in a single coherent pass.
    # Hair object parenting and source material/curve settings remain preserved.
    record=[];root_pts=[]
    strand_index=0
    for layer,o in enumerate(old_hair):
        inv=o.matrix_world.inverted_safe()
        for sp in o.data.splines:
            assert sp.type=="NURBS" and len(sp.points)==20
            root,n,fidx,bary=placements[strand_index]
            strand_index+=1
            # Outward field: local head normal plus gentle upward crown bias
            # and small coherent clump variation. Never drop strands from ellipsoid.
            n=(n+Vector((0,.07,.14))).normalized()
            side=n.cross(Vector((0,0,1)))
            if side.length<.07:side=n.cross(Vector((0,1,0)))
            side.normalize();other=n.cross(side).normalized()
            phase=rng.uniform(0,math.tau)
            growth=(.05,.060,.070)[layer]+rng.uniform(0,.038)
            radius=(.0035,.004,.0045)[layer]*rng.uniform(.8,1.2)
            twists=(4.0,5.0,6.0)[layer]*math.tau
            for j,p in enumerate(sp.points):
                t=j/(len(sp.points)-1)
                # Root starts on the *actual* scalp triangle; curl offsets
                # taper to zero at t=0 to maintain exact follicle contact.
                curl=(radius*(t**.65))
                wave=(side*math.sin(phase+twists*t)+other*math.cos(phase+twists*t))*curl
                drift=Vector((math.sin(fidx*.031)*.006,math.cos(fidx*.023)*.005,0))*t*t
                world=root+n*(growth*t)+wave+drift
                local=inv@world
                p.co=(local.x,local.y,local.z,1.0)
            placed=o.matrix_world@Vector(sp.points[0].co[:3])
            gap=(placed-root).length
            assert gap<1e-5,("ROOT_TRANSFORM_MISMATCH",gap)
            root_pts.append(placed)
            record.append({"triangle_id":fidx,"barycentric":[round(x,6) for x in bary]})
    assert strand_index==4450
    # Audit same neutral/rest pose, not photo realism or animation binding.
    new_gap=[bvh.find_nearest(p)[3]*1000 for p in root_pts]
    assert max(new_gap)<.1,("SCALP_CONTACT_FAILURE",max(new_gap))
    # Distinct follicles and coverage; block accidental collapse to one polygon.
    distinct=len(set(r["triangle_id"] for r in record))
    assert distinct>=100,("SCALP_COVERAGE_COLLAPSE",distinct)
    groups=[o.name for o in old_hair]
    # Save report before render, durable if Blender aborts during Cycles.
    report={
      "schema":"blank.engine.afro.follicle-surface.v1",
      "base_sha256":SHA,"source_unmodified":True,
      "blender_version":bpy.app.version_string,
      "source_lineage":"Existing MakeHuman MPFB synthesized woman, NOT new person",
      "scalp_mask_vertices":len(scalp_ids),"scalp_triangles":len(tris),
      "scalp_area_m2":round(area,6),"distinct_occupied_triangles":distinct,
      "root_count":strand_index,"root_to_scalp_triangle_mm":{
        "before_p50":quant(old_gap,.5),"before_p95":quant(old_gap,.95),
        "after_p50":quant(new_gap,.5),"after_p95":quant(new_gap,.95),
        "after_max":round(max(new_gap),5)},
      "hair_objects":groups,
      "follicle_barycentric_report":record,
      "claim_limits":[
         "Scalp vertex mask was inherited, not independently clinically validated",
         "Neutral-frame root contact only; no animated head/rig follicle binding certified",
         "No measured photographic hair density or real follicle orientation prior",
         "Source human skin and eyes unchanged; cannot assert human realism",
         "Single procedural prototype is NOT full photoreal one-shot generator"
      ],
      "follicle_attachment_geometry_pass":True,
      "photorealism_approved":False,"visual_approved":False,
      "webgl_parity":False,"release_allowed":False}
    p=OUT/"follicle-report.json"
    p.write_text(json.dumps(report,indent=2)+"\n")
    scene=bpy.context.scene
    camera=bpy.data.objects.get("CAM_face_closeup")
    assert camera and camera.type=="CAMERA"
    scene.camera=camera
    scene.render.engine="CYCLES";scene.cycles.device="CPU"
    scene.cycles.samples=30
    scene.render.resolution_x=900;scene.render.resolution_y=1200
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    render=OUT/"face_surface_rooted.png"
    scene.render.filepath=str(render.resolve())
    print("SCALP_CONTACT_PREVIEW_START",flush=True)
    bpy.ops.render.render(write_still=True)
    assert render.stat().st_size>80000
    report["preview_png_sha256"]=sha(render)
    packed=OUT/"afro_woman_surface_rooted_prototype.blend"
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(packed.resolve()),compress=True,check_existing=False)
    assert packed.stat().st_size>10000000
    report["derivative_blend_sha256"]=sha(packed)
    report["preview_camera"]="same saved face_closeup camera as before; no camera modifications"
    report["preview_png_bytes"]=render.stat().st_size
    report["derivative_blend_bytes"]=packed.stat().st_size
    assert sha(SRC)==SHA
    p.write_text(json.dumps(report,indent=2)+"\n")
    print("FOLLICLE_AUDIT_VERIFIED",json.dumps({k:report[k] for k in
       ("root_count","scalp_triangles","distinct_occupied_triangles",
        "root_to_scalp_triangle_mm","preview_png_sha256",
        "derivative_blend_sha256")}),flush=True)
if __name__=="__main__":
    construct()
