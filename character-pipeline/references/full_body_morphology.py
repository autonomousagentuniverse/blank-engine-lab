"""Deterministic, body-first Blender mesh deformation (research only).

Actual skinned mesh/shape-key coordinates are changed in 3D. Clothing gets
the same rest-space deformation. This does not generate a new identity and
does not prove rig animation, intersections, or anatomical photorealism.
"""
import math

CONTROL_DEFAULTS = {
    "morphology.shoulder_width": 0.42,
    "morphology.waist_width": 0.36,
    "morphology.hip_width": 0.52,
}
BANDS = {
    "morphology.shoulder_width": (0.825, 0.068),
    "morphology.waist_width": (0.605, 0.055),
    "morphology.hip_width": (0.510, 0.067),
}
GAIN = 0.45


def validate_values(values):
    if not isinstance(values, dict) or set(values) != set(CONTROL_DEFAULTS):
        raise ValueError("BODY_MORPH_MISSING_OR_UNKNOWN_CONTROLS")
    for name, value in values.items():
        if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError("BODY_MORPH_INVALID_VALUE:" + name)
    return values


def warp_xyz(xyz, *, bounds, values):
    """Anatomical-band-localized x-axis mesh-space field; z and depth retained."""
    validate_values(values)
    if len(bounds) != 6 or len(xyz) != 3 or any(not math.isfinite(v) for v in (*bounds, *xyz)):
        raise ValueError("BODY_MORPH_INVALID_GEOMETRY")
    min_x, _, min_z, max_x, _, max_z = bounds
    height = max_z - min_z
    if not (1.0 < height < 3.5 and max_x > min_x):
        raise ValueError("BODY_MORPH_INVALID_BODY_BOUNDS")
    x, y, z = xyz
    t = (z - min_z) / height

    def smoothstep(u):
        u = min(1.0, max(0.0, u))
        return u * u * (3.0 - 2.0 * u)

    # Zero deformation on feet/lower shins and high head/face.
    window = smoothstep((t - 0.16) / 0.12) * smoothstep((0.95 - t) / 0.09)
    factor = 1.0
    for name, (level, sigma) in BANDS.items():
        delta = values[name] - CONTROL_DEFAULTS[name]
        factor += window * GAIN * delta * math.exp(-0.5 * ((t - level) / sigma) ** 2)
    if not (0.70 < factor < 1.35):
        raise ValueError("BODY_MORPH_EXCESSIVE_SCALE")
    midline = (min_x + max_x) / 2
    return (midline + (x - midline) * factor, y, z)


def original_bounds(body):
    """Authoring mesh rest bounds, not a photo, camera or rendered silhouette."""
    coords = [body.matrix_world @ vert.co for vert in body.data.vertices]
    if not coords:
        raise ValueError("BODY_MORPH_EMPTY_SOURCE_MESH")
    return tuple(min(p[i] for p in coords) for i in range(3)) + tuple(max(p[i] for p in coords) for i in range(3))


def apply_blender_body_widths(*, body, rig, scene, values):
    from mathutils import Vector
    validate_values(values)
    if body.type != "MESH" or rig.type != "ARMATURE":
        raise ValueError("BODY_MORPH_WRONG_OBJECT_TYPES")
    bounds = original_bounds(body)
    height = bounds[5] - bounds[2]
    torso_bottom = bounds[2] + 0.35 * height
    torso_top = bounds[2] + 0.91 * height
    neutral = all(values[k] == baseline for k, baseline in CONTROL_DEFAULTS.items())
    if neutral:
        return {"applied": False, "body_original_bounds_m": list(bounds),
                "objects_modified": [], "modified_vertex_coordinates": 0,
                "maximum_displacement_m": 0., "neutral_baseline": True}
    targets = []
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render or obj.hide_get() or not obj.data.vertices:
            continue
        skinbound = any(mod.type == "ARMATURE" and mod.object == rig for mod in obj.modifiers)
        if obj != body and not skinbound:
            continue
        if obj != body:
            zs = [(obj.matrix_world @ Vector(c)).z for c in obj.bound_box]
            if max(zs) < torso_bottom or min(zs) > torso_top:
                continue
        targets.append(obj)
    if body not in targets or len(targets) < 2:
        raise ValueError("BODY_MORPH_GARMENT_NOT_SELECTED_FAIL_CLOSED")

    # Preflight all target meshes before mutating any of them.
    for obj in targets:
        if abs(obj.matrix_world.determinant()) < 1e-10:
            raise ValueError("BODY_MORPH_NONINVERTIBLE_TRANSFORM:" + obj.name)
        if len(obj.data.vertices) < 8:
            raise ValueError("BODY_MORPH_SUSPECT_MESH:" + obj.name)
        keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else []
        if keys and any(len(k.data) != len(obj.data.vertices) for k in keys):
            raise ValueError("BODY_MORPH_KEY_MISMATCH:" + obj.name)
    def band_widths():
        # Real Basis shape-key vertex positions from the authored 3D body.
        # This is a 3D source-space width check, not an image-space proxy.
        measurements = {}
        # A deliberately masked body can lack skin vertices underneath clothes.
        # Measure the assembled, skinned character (body + garment source meshes)
        # rather than asserting that an exposed-only body mesh is watertight.
        sample_cloud = []
        for mesh in targets:
            keys = mesh.data.shape_keys.key_blocks if mesh.data.shape_keys else None
            stream = keys["Basis"].data if keys and "Basis" in keys else mesh.data.vertices
            matrix = mesh.matrix_world
            for item in stream:
                point = matrix @ item.co
                sample_cloud.append((point.x, (point.z - bounds[2]) / height, mesh.name))
        for name, (level, _) in BANDS.items():
            chosen = [(x, obj_name) for x, t, obj_name in sample_cloud if abs(t - level) < .040]
            xs = [x for x, _ in chosen]
            if len(xs) < 10:
                raise ValueError("BODY_MORPH_MISSING_ASSEMBLED_SLICE:" + name)
            measurements[name] = {"source_sample_vertices": len(xs),
                                   "sources": sorted({obj for _, obj in chosen}),
                                   "span_m": max(xs) - min(xs)}
        return measurements

    before_widths = band_widths()
    max_delta = 0.
    changed_count = 0
    modified = []
    for obj in targets:
        world = obj.matrix_world.copy()
        inverse = world.inverted()
        keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else None
        streams = [key.data for key in keys] if keys else [obj.data.vertices]
        for stream in streams:
            for item in stream:
                source = world @ item.co
                warped = warp_xyz(source, bounds=bounds, values=values)
                displacement = abs(warped[0] - source.x)
                if displacement > 1e-9:
                    item.co = inverse @ Vector(warped)
                    changed_count += 1
                max_delta = max(max_delta, displacement)
        obj.data.update()
        modified.append({"name": obj.name, "vertices": len(obj.data.vertices),
                         "shape_keys": len(keys) if keys else 0})
    if changed_count < 100 or max_delta < .004:
        raise ValueError("BODY_MORPH_INSUFFICIENT_REAL_GEOMETRY_CHANGE")
    after_widths = band_widths()
    widths = {}
    for name, old in before_widths.items():
        new = after_widths[name]
        delta = new["span_m"] - old["span_m"]
        if abs(values[name] - CONTROL_DEFAULTS[name]) >= .1:
            if delta * (values[name] - CONTROL_DEFAULTS[name]) <= .001:
                raise ValueError("BODY_MORPH_BAND_DID_NOT_CHANGE_AS_REQUESTED:" + name)
        widths[name] = {"before_m": old["span_m"], "after_m": new["span_m"],
                        "delta_m": delta, "measured_source_vertices": old["source_sample_vertices"]}
    scene.view_layers[0].update()
    return {"applied": True, "actual_measured_body_slice_widths": widths,
            "body_original_bounds_m": list(bounds),
            "objects_modified": modified, "modified_vertex_coordinates": changed_count,
            "maximum_displacement_m": max_delta, "neutral_baseline": False,
            "rig_bones_unchanged": len(rig.data.bones),
            "clothing_and_animation_visual_review_required": True}
