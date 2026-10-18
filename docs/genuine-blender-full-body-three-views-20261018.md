# Phase 16 — Actual Blender full-body three-view one-shot correction (2026-10-18)

**Corrective action following mistaken image generation.** Earlier assistant used 2D image generation to display a hypothetical full-body person wearing an invented blue/orange sports uniform and sneakers. **Those renders did not come from Blank Engine/Blender and must not be used as geometry or progress evidence.** User explicitly required actual existing one-shot Blender generation.

## Verified real execution
- Repository: `autonomousagentuniverse/blank-engine-lab`, experimental branch `research/human-reference-atlas-20261018`.
- Exact unchanged input **Blender** source `afro_mask_respected_uv_pbr.blend` SHA256 `a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570` (previous verified mask-respected 53-bone avatar).
- Script: `character-pipeline/references/one_shot_actual_full_body.py`.
- Genuine GitHub Actions **SUCCESS**: [run 39163959764](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39163959764), artifact **12149773225** named `genuine-3d-blender-full-body-three-views`.
- One Blender 4.5.3 CPU Cycles execution computed human object-space bounds from the actual visible 3D meshes/curves, projected each into 3 separately instantiated orthographic cameras, set `ortho_scale` to fit head/hands/feet with at least 7.5% margin on the limiting dimension, and actually rendered **front 0° / three-quarter 25° / strict profile 90°** PNGs.
- Resolution **840×1260** per view, **28 Cycles samples**; saved editable `actual_full_body_camera_variants.blend` with three named cameras. Previous verified HDR neutral recovery's `-3.3500195 EV` used unchanged; 3 original Blender disk light watts unchanged; source geometry/morphs/rig unchanged.
- Measured model world height **1.8412823 m**. Automatic projected visible human bbox (left,right,top,bottom): front `[0.0750,0.9250,0.1285,0.8715]`, 25° `[0.0750,0.9250,0.1476,0.8524]`, 90° `[0.3000,0.7000,0.0750,0.9250]`. All inside canvas by margin gate.
- PNG hashes: front `668bebc0ad62be33f179464a927a1e19488ae64c59a6fc675c19800d65b94a71` (747,360 bytes), 25° `dec7a141cc503bfa2050f32a1b2fde25b08ecbc62f16538dea0a5ade79454155` (730,436 bytes), 90° `ce7356aea7395fe4de63b619af0388f1058668e5118e6777fff9ed2d0e381c03` (705,370 bytes).
- Original model visibly uses **blue T-shirt, faded blue jeans, no footwear, and A-pose**. It is noticeably synthetic, with especially hard facial structure/eyes/hairline and a black studio background. It does not meet user's realistic 28-year-old woman goal. No new human was synthesized, just new *real Blender camera renders* of existing 3D subject.
- Both rendered PNG and original Blender saved artifact verified from downloaded GitHub Actions ZIP, and exact per-view hashes/source pin verified by CI.

## Operational controls
The scoped push-trigger workflow was returned to `workflow_dispatch` **only** in commit `2fd76e310e7e2fe9e189683df277b5df63b5f98b` after success. No Render/Vercel production deployment. Quality gate should not be marked `photoreal`; mechanical camera/full-body frame gate PASS. Next tasks: anatomically credible face, actual neutral relaxed pose via existing 53-bone rig, natural Afro fiber detail and calibrated lighting—implemented as real Blender 3D outputs, **not image_gen**.
