# Hero v3 — authenticated-publisher Einar rig source audit, verified

**Date:** 2026-10-16. **Result:** Einar source archive/hash/integrity PASS, Blender source mesh/rig inventory **LOADED**, production PBR and Three.js render **NOT YET TESTED**, human photorealism **BLOCKED**.

## Authentic source and license

The actual archive was publicly retrieved from Blender Studio's official Einar v1 download URL:

https://studio.blender.org/download-source/files/41/419e83fb75f30b989adf7920dec7a21c/419e83fb75f30b989adf7920dec7a21c.zip

- Downloaded ZIP size: **579,834,421 bytes**, SHA-256 **3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7**.
- ZIP CRC integrity: **PASS**. Contents: **1 source .blend** file, **63 image files**.
- Source file: \`einar_release_v1.blend\` (91,323,760 bytes), extracted for runner-only source inspection; no binary committed.
- Official character listing: https://studio.blender.org/characters/einar/v1/; free and CC-BY, stated required credit:
  **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.
- ZIP audit discovered **no standalone license/readme file**; preserve the publisher page's credit and check the relevant material/textures' provenance before shipping a derivative.
- Source ZIP and .blend were not reuploaded to GitHub or changed in place.

## Real Einar rig and face inventory

Proven from Blender 4.5.3 opening the **real** source .blend, workflow https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38945620587:

| Verified property | Source result |
|---|---|
| Blender mesh objects | 262 |
| Armatures | 5 |
| Main animator rig | \`RIG-einar\` with **799 bones** |
| Main metarig | \`META-einar\` with **273 bones** |
| Source images referenced | **64**, **0 packed into .blend** |
| Image files separately shipped in ZIP | **63** |
| Blender materials | **95** |
| Shape-keyed mesh objects | **28** |
| Actions | **34** |
| Separate corneas | \`GEO-eye.cornea.L/.R\`, 704 polygons each |
| Separate eyeball parts | \`Eye_Sphere.L/.R\`, \`GEO-eye.L/.R\`, eye animation parts |
| Tear film/anatomy | \`GEO-eye.meniscus.L/.R\`, 70 polygons each; plica semilunaris L/R |
| Eyelashes | \`GEO-einar_eyelash_surfdef\` with source eyelid shape keys |
| Head facial deformations | \`GEO-einar_head\` includes \`D_Blink_Upper.L/.R\`, \`D_Blink_Lower.L/.R\`, squint and brow controls |
| Dedicated eyelid bones | Upper/lower eyelid, helpers and eye rings on metarig, and eyelid controls/deform bones on \`RIG-einar\` |

These entries prove that the publisher's model **includes real facial/eye construction**, unlike the MakeHuman eye shells and CC0 clay sculpt; they do **not** prove appearance at photographic quality, glTF export compatibility or usable game/runtime animation.

## Workflow detail and truthful interpretation

First source resolution run 38944466501 located the official public ZIP (HEAD 200). Full archive and rig-audit run 38944922465 reached a slow full Blender scene load. Bounded repeat run **38945620587** downloaded and SHA/CRC-checked the original ZIP and saved the Blender inventory to \`model-audit.json\` **before the Blender process exceeded its exit/shutdown time bound**. Its final fallback erroneously labeled the overall status "BLOCKED_FULL_MODEL_LOAD_TIMEOUT_OR_ERROR" despite an embedded \`source_files[0].status='loaded'\` and the full rig/image/shape-key counts having been recorded successfully. This was a **harness status misclassification**, not evidence the source did not load. The workflow was corrected to preserve \`BLENDER_INVENTORY_CAPTURED_SHUTDOWN_TIMEOUT\` when inventory data exists; it is NOT claimed that a clean Blender process exit was verified.

The workflow's unchanged engine tests passed **171, 2 skipped, 0 failed**, and only small audit JSON files were archived as \`blank-hero-v3-einar-official-source-gate\`. No new real-time rendering or Android tests were run.

## Blockers before claiming a photorealistic character

1. **Restore external source textures:** unpack 63 image files to their original relative paths beside the authentic .blend. The source references 64 images, **0 packed**, so a naive GLB export without them would be deceptive. Verify images exist and load in Blender.
2. **Render the true Blender-shaded head and eyes:** fixed camera, neutral environment, front, macro, profile and three-quarter. Include eyelashes, cornea and full skin material, not a Workbench clay render.
3. **Assess the material conversion problem:** Blender Studio's procedural film shaders/hair may not be reproducible via automatic glTF export. Bake or map licensed PBR basecolor/normal/roughness/SSS/iris/cornea properly; preserve source in a separate immutable original.
4. **Create an isolated game-ready export:** rig/skin/joints/morph/animation auditing; reduce 799-bone control rig to an appropriate runtime deformation skeleton; prove blinking works and test Three.js head/eye macros in Chrome.
5. **Visual gate and performance:** compare directly against the owner's portrait references under neutral camera and lighting; only promote after human acceptance and actual Android device profiling.

Next GitHub experiment: **\`hero-v4-einar-shaded-preview\`** or equivalent. This v3 branch should remain an immutable source-audit baseline, manual \`workflow_dispatch\` only, no production main merge and no Vercel deployment.
