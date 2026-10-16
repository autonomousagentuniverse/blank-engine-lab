# Hero v2: official Blender CC0 head source acceptance report

**Date:** 2026-10-16. **Result:** Technical source test PASS; **photorealistic production hero REJECTED**.

## Provenance

Source is the official Blender Foundation/Blender Studio Human Base Meshes asset bundle v1.4.1 (CC0), from official download mirror at https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip. Original ZIP length 50,643,039 bytes, SHA-256:
\`811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515\`.
Embedded \`human_base_meshes_bundle.blend\` original SHA-256:
\`3c121505651140ceb4d69fd1d8923f7788ffadd81672f5be14845a5f2c75c137\`.
Original Blender source bytes were **not modified**, no source bundle or unlicensed portraits embedded in Git.

Successful reproducible [GitHub Actions run 38940642635](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38940642635) used Blender bpy 4.5.3 and Mesa/Xvfb for neutral geometry inspection; first attempt run 38940245492 failed only in Workbench preview due missing libEGL.so.1, after successfully exporting the source. The environment was corrected and rerun passed all workflow steps.

## Actual selected object

- Source Blender object \`GEO-head_sculpting_realistic\`, 3,307 authored control vertices and 3,300 authored polygons, UV layer count **1**.
- The evaluated subdivision/export yielded isolated \`head-baseline-experimental.glb\` (1,850,284 bytes), with **52,829** GLB vertices and **26,420 indexed triangles**.
- No embedded glTF materials or image textures; zero skins, zero animation clips, no associated eyeball geometry. Blender object's material list and vertex group/shape key lists empty.
- Four actual Blender Workbench clay views: negative Y (front), positive Y (rear), positive X (profile), negative-Y angled three-quarter. A contact sheet was saved.
- Engine regression \`npm test\`: **171 PASS, 2 SKIPPED, 0 FAIL**. No engine code changes.
- Production hero and Alpha 0.5 live were not changed. Visual realism was **not** approved.

## Independent appearance review

The geometry shows a sculpted nose, brow, lips, ears, and a head/neck bust but does not approach the owner's photorealistic portrait references. Eye openings remain clay/sculpting-only and no iris, detailed eyelid anatomy, transparent cornea, eyelashes, skin microstructure, brows/hair system, or facial deformation/animation is present. Workbench shading is **not** a physically-based skin render and should not be advertised as one.

**Decision:** RETAIN this asset and exporter as a provenance-clean sculpting/retopology reference. Do **not** replace Blank Engine's playable hero with it, and do not start another long chain of patching its blank eye openings.

## More suitable next candidate: Blender Studio CHARGE / Einar

Blender Studio released the realistic, human \`Einar\` character rig for its open film Charge under CC-BY, with a public free character page: https://studio.blender.org/characters/einar/v1/. Publisher states Einar is its first attempt at a realistic character, and its workflow reports layered facial sculpting, corrective shapes, bone-driven eye/head movement, real character rigging, detailed hair and skin work: https://studio.blender.org/blog/layered-sculpting-for-einar/. **This is a materially stronger candidate** than a bare base mesh.

Einar requires credit per its CC-BY terms (Blender Foundation/Studio), and downloadable file accessibility and complete embedded texture/eye/rig contents are **not yet verified** by this project. Do not assume all film shaders/hair transfer to browser Three.js or meet real-time Android performance. First obtain the authentic licensed rig asset from the publisher; record hash and license; inspect parts; create close-up GLB/Three.js candidate and compare photographic skin quality; then profile Android.

Avoid Digital Reality Lab samples until their redistribution-of-derivatives restriction is resolved. Sketchfab CC-BY busts may need authenticated download and are not automatically rigged. Do not import unrelated images as texture maps.

## Next project milestone

1. Acquire a truly complete textured/rigged realistic human with proof of commercial redistribution terms (Blender Studio Einar is first candidate).
2. Inspect real eye surfaces, eyelid contact, skin texture/SSS, hair/eyelashes, facial control and authored runtime skeleton; no fictional audit PASS.
3. Convert a licensed copy to GLB with approximate game LOD, preserve source license and detail maps, render neutral front/profile/three-quarter real Three.js macro.
4. If close-up reference realism remains inadequate, REJECT the candidate and evaluate another production scan. Only after human visual approval integrate into Character Builder.
5. Keep universal inspector and versioned Geometry Artifact as refinement tools, not source of missing anatomy.

The experiment's one-shot Actions push trigger was removed in the same continuity update; only manual \`workflow_dispatch\` remains. Nothing was deployed.
