# HUMAN-01 — original new human generated, but unacceptable facial realism

Date: 2026-10-16. Automated headless MPFB2/Blender + Blank Engine Three.js/WebGL human test **TECHNICALLY PASSED**: [GitHub run 38980288978](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38980288978).

## Verified source-generated asset

- Official GPLv3 MPFB2 source pinned to 3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf. Original MakeHuman bundled basemesh and system graphical assets CC0. No Einar/ASTER mesh or screen capture reused.
- New individual phenotype specified in assets/specs/human-01.json, 19,158 newly parameterized source vertices and 18,486 polygons before runtime helper-mask removal.
- Official MPFB extension setup succeeded. Built 53-bone game skeleton, source skin, high-poly eyes, eyebrows, eyelashes, polygon bob hairstyle, teeth, casual suit.
- Official MPFB ExportService create_character_copy and bake_modifiers_remove_helpers removed helper geometry. New derived `human-01.glb` SHA256 **501d8aa88d84cd17bd072dec38ae6f231a59b56000d3f20e439054310fb050d7**, **25,696,536 bytes**, 7 meshes, 1 glTF skin, 7 PBR materials, 8 textures.
- Blank Engine Chrome/Three.js WebGL2 proof: 7 skinned meshes, 53 bones, 43,810 runtime triangles, five genuine browser canvas screenshots (front/back/three-quarter and two face macros). Engine regression **171 pass, 2 skip, 0 fail**.
- Artifact [12080937077](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38980288978/artifacts/12080937077) contains `human-01.glb`, five PNG screenshots, contact sheet and JSON/provenance reports.

## Visual verdict: REJECT — not photorealistic or acceptable as a character

Actual screenshots personally inspected after exporting the final GH artifact. The assembled human silhouette exists and is neither a robot nor rehashed Einar, but face and material assembly are glaringly defective:
- Eyeballs visibly protrude beyond lids with large unnatural eye-white exposure.
- Teeth/inner mouth geometry appears on outside of lips and red mouth artifacts are obvious.
- Polygon bob hair has bad cap/part geometry, intersects/occludes forehead, and appears like a separate wig.
- Source texture/color cannot hide nonmatching or misfitted anatomy. Clothing is simple and barefoot. The face is uncanny and substantially below user photographic reference standard.
- No real animated blink or expression, no Android profiling, no owner approval. Screenshot generation PASS is NOT a subjective human-quality PASS.

## Next steps

Before creating more screenshots or new presets, investigate MPFB asset fitting semantics, parent/scale, eyelid/eye mesh placement, teeth and hair binding, and whether renderer static rig pose deforms the face incorrectly. Isolate just head, eyes, lids and mouth in the Blender original and browser with matched neutral pose. Fix alignment at source and validate eye socket occlusion / mouth geometry bounds BEFORE rendering the next presentation. If this source asset family cannot support the target, evaluate a different licensed high-quality generator rather than cosmetic texture patch loops.

The experimental workflow was returned to manual workflow_dispatch-only. Production main, live hero, Vercel unchanged; no promotion.
