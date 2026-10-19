"""Deterministic one-shot humanoid armature for canonical MakeHuman meshes.

This is a first-stage procedural deformation rig, NOT a certified production
human rig. Bone anchors scale with measured stature and mesh extremities.
Skin weights are normalized and preserve source topology in rest pose.
"""
import bpy, math, subprocess, shutil
from mathutils import Vector, Matrix
from collections import Counter

BONES=('Root','Pelvis','Spine','Chest','Neck','Head',
       'Clavicle.L','Clavicle.R',
       'UpperArm.L','UpperArm.R','Forearm.L','Forearm.R','Hand.L','Hand.R',
       'Thigh.L','Thigh.R','Shin.L','Shin.R','Foot.L','Foot.R','Toes.L','Toes.R')

def mix(lo,hi,x):
    t=max(0.0,min(1.0,(x-lo)/max(1e-9,hi-lo)))
    return t*t*(3-2*t)

def make_armature(height):
    h=height
    bpy.ops.object.armature_add(enter_editmode=False,location=(0,0,0))
    rig=bpy.context.object
    rig.name='ANATOMICAL_HUMAN_ARMATURE'
    rig.data.name='AnatomyRig-v1'
    bpy.ops.object.mode_set(mode='EDIT')
    for b in list(rig.data.edit_bones):
        rig.data.edit_bones.remove(b)
    def bone(name,head,tail,parent=None):
        b=rig.data.edit_bones.new(name)
        b.head=head
        b.tail=tail
        if parent:b.parent=rig.data.edit_bones[parent]
        b.use_connect=False
        return b
    bone('Root',(0,0,.49*h),(0,0,.54*h))
    bone('Pelvis',(0,0,.49*h),(0,0,.59*h),'Root')
    bone('Spine',(0,0,.59*h),(0,0,.71*h),'Pelvis')
    bone('Chest',(0,0,.71*h),(0,0,.81*h),'Spine')
    bone¶»§q«^