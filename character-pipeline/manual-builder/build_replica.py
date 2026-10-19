#!/usr/bin/env python3
"""One-shot Blender replica of the canonical, live WebGL MakeHuman mesh.

No legacy procedural torso/hip primitives, imported saved .blend or re-sculpt.
The browser exports the already-deformed connected CC0 topology; Blender
reconstructs the *same vertices and triangle indices* (precision 1 micron),
builds the same eye surfaces and instanced scalp curls, and renders 3 views.
Scientific geometry parity is measurable; visual human realism is not claimed.
Usage: blender -b --factory-startup --python build_replica.py -- spec.json out/
"""
import bpy, bmesh, json, math, os, sys, hashlib
from pathlib import Path
from mathutils import Matrix, Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from animation_rig import make_armature, assign_weights, attach_to_head, create_animations, export_glb, audit_deformation, render_animation_previews, make_face_shape_keys, CLIPS, audit_biomechanics

SOURCE='makehumancommunity/mpfb2:3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf'
def fail(message):
    raise RuntimeError("ANATOMY_REPLICA_FAILED: "+message)
def color(code):
    if len(code)!=7 or not code.startswith('#'): fail('invalid hex color')
    rgb=[int(code[k:k+2],16)/255 for k in (1,3,5)]
    def srgb(x): return x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4
    return tuple(srgb(x) for x in rgb)+(1.0,)
def material(name,hex_color,roughness=.7,sss=0):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=color(hex_color)
    mat.use_nodes=True
    bs¶»§q«^