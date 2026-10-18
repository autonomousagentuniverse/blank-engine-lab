# Skin-bound Afro Cycles vs real Chrome WebGL test — 2026-10-18

## Scope and provenance
Verified original source `afro_skinbound_hair_derivative.blend`, SHA256 `0eca41c5f0175e50df18914bb87cc007184ddcf55f2dd84ea3640645ddac2f52`, 4,450 scalp-bound strands now represented in three actual rigged hair meshes, and 53-bone skeleton. **Not a new independently generated person**; inherits MPFB-derived anatomy and unchanged eye/skin/materials. No original asset overwritten.

**Cycles run [39140457420](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39140457420), SUCCESS**, artifact 12141716432: real Blender 4.5.3 CPU Cycles captures of face front, 42° three-quarter, 88° profile, local-Y 22° head pose; same saved lighting/materials. The GLB generated from the tested scene had SHA256 `3f6d5df1e5c576226f06fdb2b02be74e379b1b2a66a2ad1c97b9cb340d565788` (72,856,732 bytes). GLB has 10 mesh definitions, 1 skin with 53 joints, three named skin-weighted hair nodes, JOINTS_0/WEIGHTS_0 and packed textures. This is an **export STRUCTURE pass**.

**Scalp collision warning**, from 13,350 evaluated sampled fiber points in each pose at intermediate/outer rings, compared to nearest scalp triangles and local normals:
- Neutral: 3.873% of sample positions on negative side of oriented *local normal*; proxy distance p05 +0.866mm, median 17.521mm, p95 47.231mm.
- Head local Y +22°: 4.285% negative; proxy distance p05 +0.625mm, median 17.466mm, p95 47.231mm.
**Not a watertight signed distance or human-validated scalp mask.** Do not call this a proven penetration rate or collision PASS. Head motion root contact passed Phase 7 already under the separate true-barycentric test.

## Real browser GLB test and parity result
Initial Chrome workflow run [39140859924](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39140859924) failed a test-harness assertion because the sample localhost served a missing favicon as HTTP 404, triggering a broad console-error detector. **GLTFLoader itself successfully loaded the GLB** in that run. Fixed the sample web-server to return 204 for favicon without masking missing model/resource URLs.

Re-tested via real Google Chrome, Playwright/Three.js GLTFLoader and SwiftShader WebGL2: **[run 39140979697](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39140979697) SUCCESS**, artifact 12140629957 with independent WebGL screenshots and JSON evidence. 15 skinned rendered mesh objects, one 53-bone hierarchy, all three large hair mesh nodes retained skin attributes. Moving the actual `head` bone changed sampled hair-vertex world coordinates by **11.125mm**, **29.367mm**, and **28.120mm** respectively. Browser GLTF load and pose propagation **PASS**.

**VISUAL PARITY FAIL (explicit):** real WebGL screenshot displays face and body almost entirely white with missing skin tones and washed-out/incorrect clothing, unlike source Cycles frames. The source `Dark_Brown_Skin_Microstructure` uses a procedural Blender Noise → ColorRamp → Principled Base Color path, but glTF material has **no baked baseColorTexture**. Other color-management/lighting/material pipelines may also contribute; do not attribute all visual difference to that single texture finding. Hair silhouette/rasterization differs too. Blender/Cycles and Chrome preview cameras are not matched pixel-for-pixel; no quantified visual parity has yet been established. **Technical WebGL PASS is not visual parity PASS.**

## Decision
Current subsystem now has source-pinned head-motion geometry and GLB skinning interoperability. Photorealism, correct PBR/material parity, watertight hair/scalp collision checks, 3D anatomy validity and full one-shot independent character remain NOT VERIFIED; no release or production merge/deploy.

Next engineering action is a *single integrated material-conversion pass* for procedural skin and unsupported shaders to licensed, packed UV PBR maps, plus color-space and matched-camera lighting parity checks; review real Blender/Chrome screenshots, then proceed to eye/lid and morphological architecture. Both experimental workflows reverted to **manual-only** after success. Only research branch changed.
