"""Blender-only upper-arm pose pass, with immutable head and 53-bone skeleton.
Rest mesh geometry and head rig identity are not replaced or procedurally faked.
A failed shoulder/head test aborts the render rather than claiming a success.
"""
import math
from mathutils import Vector

def make_relaxed_neutral_stance(rig, scene):
    if rig.type != "ARMATURE" or len(rig.data.bones) != 53:
        raise RuntimeError("STANCE_EXPECTED_SOURCE_ARMATURE_53")
    head = rig.pose.bones.get("head")
    if head is None:
        raise RuntimeError("STANCE_MISSING_PREVIOUS_HEAD_BONE")
    scene.view_layers[0].update()
    head_before = [(rig.matrix_world @ p).copy() for p in (head.head,head.tail)]
    candidates = {}
    for pb in rig.pose.bones:
        name=pb.name.lower().replace("_","").replace("-","")
        is_upper=("upperarm" in name or "armupper" in name or "humerus" in name)
        is_second=any(z in name for z in ("twist","upperarm02","roll","helper"))
        if not is_upper or is_second:
            continue
        side = "L" if name.endswith(".l") or name.startswith("left") or "leftupper" in name else ("R" if name.endswith(".r") or name.startswith("right") or "rightupper" in name else None)
        if side:
            candidates.setdefault(side,pb)
    if set(candidates)!={"L","R"}:
        raise RuntimeError("STANCE_SHOULDER_BONES_NOT_FOUND:"+str([x.name for x in rig.pose.bones]))
    result = {"pose":"relaxed-neutral-standing","source_armature_bones":53,"head_bone":"head","arms":[]}
    for side in ("L","R"):
        pb=candidates[side]
        if pb.parent is None:
            raise RuntimeError("STANCE_ARM_WITHOUT_PARENT:"+pb.name)
        old_head=rig.matrix_world @ pb.head
        old_tail=rig.matrix_world @ pb.tail
        old_direction=(old_tail-old_head).normalized()
        sign=1 if old_head.x >= (rig.matrix_world.translation.x) else -1
        # Light natural arm clearance from torso, not straight-down collision.
        target=Vector((0.255*sign,0.018,-0.967)).normalized()
        q_world=old_direction.rotation_difference(target)
        rest=(rig.matrix_world.to_quaternion() @ pb.bone.matrix_local.to_quaternion())
        pb.rotation_mode="QUATERNION"
        pb.rotation_quaternion=(rest.inverted() @ q_world @ rest).normalized()
        scene.view_layers[0].update()
        after_head=rig.matrix_world @ pb.head
        after_tail=rig.matrix_world @ pb.tail
        actual=(after_tail-after_head).normalized()
        direction_dot=float(actual.dot(target))
        if direction_dot<0.91:
            raise RuntimeError("STANCE_ARM_DIRECTION_FAILED:"+pb.name+":"+str(direction_dot))
        if (after_head-old_head).length>.001:
            raise RuntimeError("STANCE_SHOULDER_DRIFT:"+pb.name)
        result["arms"].append({"bone":pb.name,"side":side,"rest_direction":list(old_direction),
            "new_direction":list(actual),"target_direction":list(target),
            "alignment_dot":direction_dot,
            "shoulder_position_drift_m":float((after_head-old_head).length)})
    head_after=[rig.matrix_world @ p for p in (head.head,head.tail)]
    max_head_delta=max((a-b).length for a,b in zip(head_after,head_before))
    if max_head_delta>1e-5:
        raise RuntimeError("STANCE_PREVIOUS_HEAD_CHANGED:"+str(max_head_delta))
    result["previous_head_pose_max_translation_m"]=float(max_head_delta)
    result["head_pose_preserved"]=True
    result["visual_approval"]=False
    return result
