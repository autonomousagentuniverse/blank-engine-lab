#!/usr/bin/env python3
"""Experimental one-shot *hair subsystem* constructor, not photoreal full human.

Load the SHA-locked, already scalp-attached MPFB character.
Regenerate all 4450 NURBS guides jointly from a multi-scale spatial field.
Preserve scalp roots, ancestor identity, rig, skin, camera, and lighting.
Record strong geometry tests and real Blender Cycles A/B; visual gate stays closed.
"""
import bpy, hashlib, json, math, pathlib, random, statistics
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

SRC=pathlib.Path("source/afro_woman_surface_rooted_prototype.blend")
SRC_SHA="79d09a8a44ad0ed27300a37203196551f4ad0267e181ab743f28fa43f4d1a4cc"
OUT=pathlib.Path("artifacts/afro-coherent-field")
OUT.mkdir(parents=True,exist_ok=True)
HAIR=("Natural_Afro_Coils_0","Natural_Afro_Coils_1","Natural_Afro_Coils_2")
SEED=180018

def sha(p):
    h=hashlib.sha256()
    with open(p,"rb") as fp:
        for b in iter(lambda:fp.read(1048576),b""):h.update(b)
    return h.hexdigest()
def percentile(v,q):
    s=sorted(v);p=(len(s)-1)*q;j=int(p);a=p-j
    return round(s[j]*(1-a)+s[min(j+1,len(s)-1)]*a,5)
def shape_surface(body):
    copy=body.copy();copy.data=body.data.copy()
    bpy.context.scene.collection.objects.link(copy)
    for m in list(copy.modifiers):copy.modifiers.remove(m)
    bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    ev=copy.evaluated_get(deps)
    me=ev.to_mesh(preserve_all_data_layers=False,depsgraph=deps)
    try:
        assert len(me.vertices)==len(body.data.vertices)
        return [ev.matrix_world @ v.co for v in me.vertices]
    finally:
        ev.to_mesh_clear()
        bpy.data.objects.remove(copy,do_unlink=True)

def main():
    assert sha(SRC)==SRC_SHA, "PINNED_INPUT_CHANGED"
    bpy.ops.wm.open_mainfile(filepath=str(SRC.resolve()),load_ui=False)
    body=bpy.data.objects.get("AFRO_WOMAN_28_Medium_Build")
    assert body is not None and len(body.data.vertices)==19158
    rig=next(o for o in bpy.data.objects if o.type=="ARMATURE")
    assert len(rig.data.bones)==53
    hairs=[bpy.data.objects[n] for n in HAIR]
    assert [len(h.data.splines) for h in hairs]==[1850,1500,1100]
    strands=[]
    for layer,h in enumerate(hairs):
        for spl in h.data.splines:
            assert spl.type=="NURBS" and len(spl.points)==20
            root=h.matrix_world @ Vector(spl.points[0].co[:3])
            strands.append((layer,h,spl,root))
    assert len(strands)==4450
    coords=shape_surface(body)
    scalp=body.vertex_groups["scalp"]
    masked=set()
    for v in body.data.vertices:
        try:
            if scalp.weight(v.index)>=.5: masked.add(v.index)
        except RuntimeError:pass
    assert len(masked)==376
    triangles=[]
    for poly in body.data.polygons:
        indexes=list(poly.vertices)
        if len(indexes)<3 or not all(i in masked for i in indexes):continue
        for j in range(1,len(indexes)-1):
            triangles.append((indexes[0],indexes[j],indexes[j+1]))
    assert len(triangles)==668
    bvh=BVHTree.FromPolygons(coords,triangles,all_triangles=True)
    roots=[s[3] for s in strands]
    oldgap=[bvh.find_nearest(x)[3]*1000 for x in roots]
    assert max(oldgap)<.1
    center=sum(roots,Vector())/len(roots)
    min_z=min(p.z for p in roots);max_z=max(p.z for p in roots)
    extx=max(abs(p.x-center.x) for p in roots)
    exty=max(abs(p.y-center.y) for p in roots)
    extz=max_z-min_z
    assert .05<extx<.3 and .05<exty<.3 and .07<extz<.45, (extx,exty,extz)

    # ~100 spatially distributed guide seeds. Root positions on source scalp are fixed.
    rng=random.Random(SEED)
    positions=list(range(len(strands)))
    guide_indices=[positions[rng.randrange(len(positions))]]
    # Far-point selection from 1400 reproducibly stratified candidates to ensure
    # guide coverage rather than random isolated tuft placement.
    candidates=positions[::3]
    while len(guide_indices)<88:
        near=lambda p: min((p-roots[g]).length_squared for g in guide_indices)
        choice=max(candidates,key=lambda i:near(roots[i]))
        if choice in guide_indices:break
        guide_indices.append(choice)
    assert len(guide_indices)>=80
    gtree=KDTree(len(guide_indices))
    for j,i in enumerate(guide_indices):gtree.insert(roots[i],j)
    gtree.balance()
    # Shared guide parameters are smooth spatial fields, not independent
    # per-strand global outward normals. A small per-strand phase is secondary.
    grng=random.Random(SEED+17)
    guide_vectors=[]
    guide_length=[]
    guide_phases=[]
    guide_twists=[]
    for i in guide_indices:
        p=roots[i];dx=(p.x-center.x)/max(extx,.001)
        dy=(p.y-center.y)/max(exty,.001)
        rz=(p.z-min_z)/extz
        # Broadly rounded cap, with side falloff and no opposing central horns.
        # Never introduce a hard sign(x) partition along the midline.
        broad=Vector((.37*dx,.37*dy,.36+.64*rz))
        n=broad.normalized()
        guide_vectors.append(n)
        guide_length.append(.033+.015*rz+.006*grng.random())
        guide_phases.append(grng.random()*math.tau)
        guide_twists.append(4.2+1.5*grng.random())

    # Check orientation coherence of neighboring roots from guide positions.
    # Numeric values are construction diagnostics, NOT a natural-hair realism score.
    root_directions=[]
    sameguide=0
    envelope_hits=0
    before_tip=[]
    after_tip=[]
    root_error=[]
    max_tip_z=-1000
    new_points=[]
    for k,(layer,obj,sp,root) in enumerate(strands):
        oldworld=obj.matrix_world @ Vector(sp.points[-1].co[:3])
        before_tip.append(oldworld)
        nearest=list(gtree.find_n(root,4))
        ws=[]
        for _,gid,d in nearest:
            ws.append(1/(d*d+.00011))
        den=sum(ws);ws=[w/den for w in ws]
        direction=sum((guide_vectors[g]*w for w,(_,g,_) in zip(ws,nearest)),Vector()).normalized()
        target_len=sum(guide_length[g]*w for w,(_,g,_) in zip(ws,nearest))
        shared_phase=sum(guide_phases[g]*w for w,(_,g,_) in zip(ws,nearest))
        shared_twist=sum(guide_twists[g]*w for w,(_,g,_) in zip(ws,nearest))
        # Fine uncorrelated variation is deliberately small relative to shared field.
        fiber_random=random.Random(SEED*10+k)
        target_len*=fiber_random.uniform(.91,1.09)
        direction=(direction+Vector((fiber_random.uniform(-.06,.06),
                                    fiber_random.uniform(-.06,.06),
                                    fiber_random.uniform(-.04,.04)))).normalized()
        root_directions.append(direction)
        lateral=direction.cross(Vector((0,0,1)))
        if lateral.length<.04:lateral=direction.cross(Vector((0,1,0)))
        lateral.normalize()
        binormal=direction.cross(lateral).normalized()
        # 3D coiling: local grouped phases and pitches, dense short physical
        # displacements with sufficient actual curl arc length.
        radius=(.0037,.0042,.0047)[layer]*fiber_random.uniform(.85,1.17)
        phi=shared_phase+fiber_random.uniform(-.45,.45)
        twist=math.tau*shared_twist
        localcoords=[]
        inv=obj.matrix_world.inverted_safe()
        for j,pt in enumerate(sp.points):
            t=j/19
            effective_t=t**.88
            phase=phi+twist*t
            # Maintain EXACT root barycentric location (at t=0) while
            # filling a contiguous rounded envelope with dense curl paths.
            amount=(math.sin(math.pi*t/2)**1.4)
            curl=(lateral*math.sin(phase)+binormal*math.cos(phase))*radius*amount
            world=root+direction*target_len*effective_t+curl
            # Smooth ellipsoidal global envelope. Unlike prior spiky normal
            # extrusion, close outside contours; preserve original source root.
            hmid=(min_z+max_z)/2 + .015
            dx=(world.x-center.x)/(extx+.044)
            dy=(world.y-center.y)/(exty+.044)
            zrad=extz*.5+.056 if world.z>=hmid else extz*.5+.033
            dz=(world.z-hmid)/zrad
            envelope=math.sqrt(dx*dx+dy*dy+dz*dz)
            if envelope>1.0 and t>.01:
                q=min(1,.88+(1-envelope)*.75)
                world=root+(world-root)*q
                envelope_hits+=1
            l=inv@world
            pt.co=(l.x,l.y,l.z,1)
            localcoords.append(world)
        actual=obj.matrix_world @ Vector(sp.points[0].co[:3])
        root_error.append((actual-root).length*1000)
        tip=obj.matrix_world @ Vector(sp.points[-1].co[:3])
        max_tip_z=max(max_tip_z,tip.z)
        after_tip.append(tip)
        new_points.append(localcoords)
    assert max(root_error)<.001
    newgap=[bvh.find_nearest(p)[3]*1000 for p in
            [o.matrix_world@Vector(s.points[0].co[:3]) for o in hairs for s in o.data.splines]]
    assert max(newgap)<.1
    # Pairwise local orientation variation: comparison vs long-radial fans.
    d_tree=KDTree(len(roots))
    for i,pt in enumerate(roots):d_tree.insert(pt,i)
    d_tree.balance()
    similarities=[]
    for k in range(0,len(roots),7):
        neighbors=d_tree.find_n(roots[k],5)
        for _,n,_ in neighbors:
            if n!=k:similarities.append(root_directions[k].dot(root_directions[n]))
    assert percentile(similarities,.5)>.80, "COHERENCE_FIELD_FRACTURED"

    scene=bpy.context.scene
    cam=bpy.data.objects.get("CAM_face_closeup")
    assert cam and cam.type=="CAMERA"
    scene.camera=cam;scene.render.engine="CYCLES"
    scene.cycles.device="CPU";scene.cycles.samples=32
    scene.render.resolution_x=900;scene.render.resolution_y=1200
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    preview=OUT/"face_coherent_afro.png"
    scene.render.filepath=str(preview.resolve())
    report={
       "schema":"blank.engine.afro.coherent-guide.v1",
       "blender":bpy.app.version_string,"input_sha256":SRC_SHA,
       "lineage":"Existing MPFB woman; hair subsystem only; no new identity",
       "one_pass_hair_field":True,"strands":len(strands),
       "guide_count":len(guide_indices),
       "source_scalp_vertices":len(masked),"source_scalp_triangles":len(triangles),
       "source_root_gap_p95_mm":percentile(oldgap,.95),
       "candidate_root_gap_max_mm":round(max(newgap),6),
       "root_displacement_max_mm":round(max(root_error),7),
       "nearest_neighbor_guide_cos_median":percentile(similarities,.5),
       "global_envelope_constraint_adjustments":envelope_hits,
       "tip_extent_above_source_roots_mm":round((max_tip_z-max_z)*1000,2),
       "before_tip_z_p95_m":percentile([p.z for p in before_tip],.95),
       "after_tip_z_p95_m":percentile([p.z for p in after_tip],.95),
       "source_unchanged":True,"scalp_mask_independently_validated":False,
       "dynamic_root_binding_approved":False,"eye_skin_quality_approved":False,
       "human_visual_review":"PENDING_OWNER_VISUAL_REVIEW",
       "photorealism_approved":False,"release_allowed":False,
       "webgl_parity":False}
    (OUT/"coherent-report.json").write_text(json.dumps(report,indent=2)+"\n")
    print("GUIDE_FIELD_CONSTRUCTION",json.dumps(report),flush=True)
    bpy.ops.render.render(write_still=True)
    assert preview.stat().st_size>60000
    report["render_sha256"]=sha(preview)
    output=OUT/"afro_woman_coherent_field_candidate.blend"
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(output.resolve()),compress=True,check_existing=False)
    assert output.stat().st_size>10000000
    report["blend_sha256"]=sha(output)
    assert sha(SRC)==SRC_SHA
    (OUT/"coherent-report.json").write_text(json.dumps(report,indent=2)+"\n")
    print("COHERENT_AFRO_REAL_CYCLES_SAVED",json.dumps({
      "render":report["render_sha256"],"blend":report["blend_sha256"],
      "guide_count":report["guide_count"],"root_error_max":report["root_displacement_max_mm"]}),flush=True)
if __name__=="__main__":main()
