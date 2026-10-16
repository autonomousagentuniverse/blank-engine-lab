# ASTER-01 — ORIGINAL procedural 3D android character, verified

Date: 2026-10-16. **Result: GitHub Actions run 38975653912 SUCCESS.**
This is a brand-new 3D character, built in headless Blender from original procedural geometry and materials and independently rendered in Blank Engine's Three.js/WebGL Chrome canvas. It does **not** reuse Einar, MakeHuman, downloaded geometry, original images, previous Einar screenshots, or stock portraits.

## Provenance and construction

- Original source: \`assets/specs/aster-01.json\` and \`experiments/aster-01/build_aster.py\`, generator \`aster-01\`, seed 10317, material palette \`cobalt-copper\`. No source download, meshes, images or textures of third parties. New mechanical humanoid from parameterized Blender primitives and authored components: head, visor, eyes/eye sockets, articulating jaw/neck, antenna, chest plates and reactor, arms/joints, hands, abdomen, pelvis, legs and boots.
- **107 unique mesh objects, 7 independently authored Blender materials, 1 authored head articulation animation** with five keyframes.
- New GLB: \`aster-01.glb\`, **1,235,180 bytes**, SHA-256 **7b480eb8a7699a5a096f5ad7686429993ca74e8cb4d15e69044f3d030bf710e2**.
- GLB structural proof: 109 source nodes, 107 meshes, 7 material definitions, **1 animation**, **0 third-party embedded images** and **no Einar names**.
- Blank Engine experimental Three.js/WebGL2 Chrome renderer: **47,504 runtime triangles**. Actual \`front\`, \`three_quarter\`, \`profile\`, \`face_macro\`, and \`head_animation\` PNG screenshots. Source GLB has a real head-turn pivot clip; replaying the clip visibly alters **51,251 pixels** by the >10 RGB-channel difference threshold in the matched macro screen.
- Existing engine tests: **171 passed, 2 skipped, 0 failed**.
- Artifacts ZIP: GitHub Actions ID **12078398432**, name \`blank-aster-01-original-generated-3d-asset\` from [run 38975653912](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38975653912), including real generated GLB, four native WebGL images, motion frame, labelled contact sheet, generation JSON, GLB structural report and runtime audit.

## Testing history / lessons

1. Run 38974919032 failed *before generation* due to dependency resolver conflict: bpy 4.5.3 requires NumPy<2, fixed by pinning 1.26.4.
2. Run 38975067672 generated actual 107 new meshes but failed visual and animation gate. Blender parenting used a matrix_world reassignment that lost ellipsoid scale; original screenshots showed oversized unit spheres and were rejected. Fixed matrix_parent_inverse transform preservation.
3. Run 38975425331 passed actual complete 3D geometry/screenshots and engine tests, but animation pixel gate failed because Three.js AnimationMixer was instantiated without activating the clip. Fixed by calling \`mixer.clipAction(...).play()\`.
4. **Final run 38975653912 passed all checks** including independently rendered views and confirmed moving head (51,251 changed screenshot pixels). Images were manually reviewed as recognizably assembled original android, rather than the failed oversized sphere variant. All bad experiment images are retained only as historical failed-run evidence and must NOT be served as accepted output.

## Boundaries

This is a **distinct procedural mechanical android**, **NOT a newly generated photorealistic human head**. Proving new geometry is significant progress over the previous Einar adapter that only reprocessed existing licensed geometry, but it does not close the target photographic skin/eyes/hair problem. No rigged biped locomotion (head animation only), real mobile hardware profiling, or full game-ready Character Builder integration. Human acceptance not automatic.

No Vercel or production deployment; main remains unchanged. Workflow is restored to permanent manual \`workflow_dispatch\` only. Next: expand procedural asset recipes and parameter variation, then build a licensed or generated detailed organic human mesh/material adapter with true source rights and verified photorealistic face closeups—do not repost Einar photographs.
