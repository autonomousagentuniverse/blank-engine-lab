# Einar source deconstruction — actual publisher Blend

Source ZIP SHA256: 3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7
Blend SHA256: 1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b
License: Einar Rig (CC-BY) Blender Foundation | studio.blender.org

## Genuine anatomical model
Head: 4596 vertices / 4522 polygons
Head UV maps: UVMap, Alignment
Head material slots: einar.skin
Head modifier order: ARMATURE:RIG-Armature, CORRECTIVE_SMOOTH:RIG-CorrectiveSmooth, SUBSURF:RIG-Subdivision, LATTICE:RIG-Tweak Lattice Eye Bulge L, LATTICE:RIG-Tweak Lattice Eye Bulge R, NODES:RIG-Displacement, NODES:SH-Store Attributes, NODES:SH-Stretch Map
Head shape keys: Basis, A_JawOpen, A_JawOpenWide, A_UpperEyelid_Up.L, A_UpperEyelid_Up.R, A_EyebrowRaise_Inner.L, A_EyebrowRaise_Inner.R, B_Nose_Sneer.L, B_Nose_Sneer.R, B_Lips_Upper_Sneer.L, B_Lips_Upper_Sneer.R, B_Lips_Lower_Sneer.L, B_Lips_Lower_Sneer.R, C_LipsSmile.L, C_LipsSmile.R, C_CheekRaise.L, C_CheekRaise.R, D_Blink_Lower.L, D_Blink_Lower.R, D_LipsWide.L, D_LipsWide.R, E_LipsDown.L, E_LipsDown.R, F_EyebrowsDown_Inner.L, F_EyebrowsDown_Inner.R, F_LipsSquash_Lower, F_LipsSquash_Upper, F_EyebrowsDown_Outer.L, F_EyebrowsDown_Outer.R, E_Eyebrows_Frown_Middle, A_EyebrowRaise_Outer.L, A_EyebrowRaise_Outer.R, F_Squint.L, F_Squint.R, LipsPucker.L, LipsPucker.R, JawOpen+LipsWide.L, JawOpen+LipsWide.R, B_Eyebrow_Sneer, F_Sneer+EyebrowsDown.L, F_Sneer+EyebrowsDown.R, D_Blink_Upper.L, D_Blink_Upper.R, Squint+EyesClosed.L, Squint+EyesClosed.R, EyebrowTweakInner.L, EyebrowTweakInner.R, EyebrowTweakOuter.L, EyebrowTweakOuter.R, HeadLookDown, HeadLookUp, HeadLookLeft, HeadLookRight, HeadTiltRight, HeadTiltLeft, NeckForward, NeckBackward, NeckTiltLeft, NeckTiltRight, JawOpen+LipsWide.L.001, JawOpen+LipsWide.R.001, JawOpen+LipsDown.L, JawOpen+LipsDown.R, JawOpen+LipsUp.L, JawOpen+LipsUp.R, E_EyebrowFurrowOnly

## Shader construction graph
Face material einar.skin present: True
Source skin nodes: 301
Source skin links: 379
| Material | Nodes | Links | Image nodes | Groups |
| --- | ---: | ---: | ---: | ---: |
| eianar.gums | 32 | 39 | 2 | 3 |
| einar.hair | 52 | 55 | 3 | 1 |
| einar.hair_mesh | 2 | 1 | 0 | 0 |
| einar.teeth | 70 | 86 | 2 | 4 |
| einar.tongue | 54 | 67 | 1 | 7 |
| eye.plica_semilunaris | 36 | 40 | 1 | 3 |
| eyelashes | 24 | 24 | 0 | 0 |
| eyes.iris | 9 | 10 | 1 | 1 |
| eyes.meniscus | 16 | 16 | 0 | 0 |
| eyes.pupil | 9 | 10 | 1 | 1 |
| eyes.white | 9 | 10 | 1 | 1 |
| eyes_anim.iris | 7 | 5 | 1 | 0 |
| eyes_anim.pupil | 7 | 5 | 1 | 0 |
| eyes_anim.white | 7 | 5 | 1 | 0 |
| eyes_shell | 19 | 19 | 1 | 0 |
| rubber_light_brown | 2 | 1 | 0 | 0 |
| rubber_light_brown.001 | 2 | 1 | 0 | 1 |
| rubber_light_brown.002 | 2 | 1 | 0 | 0 |
| rubber_light_brown.005 | 2 | 1 | 0 | 0 |

## Original eye/lid/hair anatomy
- Eye_Sphere.L (MESH, 20480 polygons; LATTICE)
- Eye_Sphere.R (MESH, 20480 polygons; LATTICE)
- GEO-einar_eyebrows (CURVES, ? polygons; NODES)
- GEO-einar_eyebrows.proxy (MESH, 0 polygons; SURFACE_DEFORM, NODES)
- GEO-einar_eyebrows_preview (MESH, 11382 polygons; SURFACE_DEFORM)
- GEO-einar_eyelash_surfdef (MESH, 72 polygons; ARMATURE, SURFACE_DEFORM, LATTICE, LATTICE)
- GEO-einar_eyelashes (CURVES, ? polygons; NODES)
- GEO-einar_hair (CURVES, ? polygons; NODES)
- GEO-einar_hair.messy (CURVES, ? polygons; NODES)
- GEO-einar_hair.messy.proxy (MESH, 0 polygons; SURFACE_DEFORM, NODES)
- GEO-einar_hair.proxy (MESH, 0 polygons; SURFACE_DEFORM, NODES)
- GEO-einar_hair_ears (CURVES, ? polygons; NODES)
- GEO-einar_hair_nose (CURVES, ? polygons; NODES)
- GEO-einar_hair_peach_fuzz.proxy (MESH, 0 polygons; SURFACE_DEFORM, NODES)
- GEO-einar_hair_preview (MESH, 1178 polygons; ARMATURE)
- GEO-einar_hair_surfdef_proxy (MESH, 640 polygons; ARMATURE, SURFACE_DEFORM)
- GEO-eye.cornea.L (MESH, 704 polygons; SUBSURF, CAST)
- GEO-eye.cornea.R (MESH, 704 polygons; SUBSURF, CAST)
- GEO-eye.L (MESH, 832 polygons; ARMATURE, SUBSURF, CAST)
- GEO-eye.meniscus.L (MESH, 70 polygons; VERTEX_WEIGHT_MIX, SURFACE_DEFORM, ARMATURE, CORRECTIVE_SMOOTH, SHRINKWRAP, SUBSURF, SHRINKWRAP, DATA_TRANSFER, DATA_TRANSFER, NODES)
- GEO-eye.meniscus.R (MESH, 70 polygons; VERTEX_WEIGHT_MIX, SURFACE_DEFORM, ARMATURE, CORRECTIVE_SMOOTH, SHRINKWRAP, SUBSURF, SHRINKWRAP, DATA_TRANSFER, DATA_TRANSFER, NODES)
- GEO-eye.plica_semilunaris.L (MESH, 48 polygons; ARMATURE, SUBSURF, SHRINKWRAP, SHRINKWRAP)
- GEO-eye.plica_semilunaris.R (MESH, 48 polygons; ARMATURE, SUBSURF, SHRINKWRAP, SHRINKWRAP)
- GEO-eye.R (MESH, 832 polygons; ARMATURE, SUBSURF, CAST)
- GEO-eye_anim.L (MESH, 832 polygons; ARMATURE, SUBSURF, CAST)
- GEO-eye_anim.R (MESH, 832 polygons; ARMATURE, SUBSURF, CAST)
- Hook_LTC-Eye_Bulge.L (EMPTY, ? polygons; )
- Hook_LTC-Eye_Bulge.R (EMPTY, ? polygons; )
- LTC-Eye_Bulge.L (LATTICE, ? polygons; HOOK)
- LTC-Eye_Bulge.R (LATTICE, ? polygons; HOOK)
- Root_Hook_LTC-Eye_Bulge.L (EMPTY, ? polygons; )
- Root_Hook_LTC-Eye_Bulge.R (EMPTY, ? polygons; )

## Transfer requirements
1. The face source mesh already uses ONE material slot, einar.skin. Preserve its TWO UV sets, shader graph/attribute dependency and evaluated deformation: collapsing the 301-node skin graph to a basic PBR scalar is a fidelity loss even if material slot count stays one.
2. Trace source shader group dependencies and baking inputs from einar-source-graph.json before simplifying to real-time PBR.
3. Export eyelid shape keys, driven eyelash surfaces, tearline and cornea separately; validate normal/morph/blink parity.
4. Source hair representation cannot be assumed to survive glTF; inspect types, groom roots and create an independently tested game representation.

This is a source structural and node-link audit, NOT proof of a newly authored human or human-approved photorealism.
Original archive/Blend/textures were deliberately excluded from artifacts and remain the property of their respective licensors.
## Archived full source graph

The complete linked Blender scene inspection is preserved at `docs/source-audits/einar-source-graph.json.gz` (GZIP compressed JSON). Decode with `gzip -dc docs/source-audits/einar-source-graph.json.gz > einar-source-graph.json`. This is metadata and shader/topology names, **not** the original licensed Blend, source ZIP or texture bytes. Source SHA256 is pinned above.

**Verification:** [GitHub Actions run 38992142171](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38992142171), download/restore, Blender 4.5.3 source inspection, invariants and report artifact all PASS. The workflow is manual-only after one-time test. Technical forensic inspection ≠ visual fidelity.
