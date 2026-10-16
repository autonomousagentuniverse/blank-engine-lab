# Einar hero v5 — actual Blank Engine experimental WebGL proof

**Date:** 2026-10-16. **Technical verdict: PASS** in GitHub Actions run [38953227006](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38953227006). **Photographic-realism verdict: FAIL; human approval still BLOCKED.** This is a real Three.js GLTFLoader/WebGL2 render running in Blank Engine's experimental Character Lab, NOT a pre-existing Blender Cycles image. Production Character Builder has NOT been changed or deployed.

## Real source-to-browser chain

Official Blender Studio Einar v1 CC-BY publisher ZIP SHA-256:
3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7.
Required attribution: **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.

Original ZIP and external Einar images restored temporarily in GitHub Actions and left byte-for-byte unchanged. A **static copy-only** character source export was made from Einar's genuine head, separate left/right eyes, eye spheres, corneas, menisci, tear/plica geometry and polygon eyelash surfaces.

- GLB output SHA-256: **658d56f0b9112963e2369154725de41a87aa7460135cf1e6db1291897825a1ac**
- File: \`artifacts/hero-v5-einar/einar-static-pbr.glb\`, 9,483,924 bytes, 12 source anatomical mesh objects.
- Source exporter audited 48,862 mesh polygons; real Three.js runtime reported **56,572 rendered triangles** from triangulation.
- Embedded original licensed Einar skin albedo (4096 to 2048 for first WebGL trial), eye albedo (2048), both real PNGs.
- 5 glTF materials: simplified standard head and eye PBR color/roughness, MeshPhysical cornea transmission 0.93, tear-film approximation, eyelashes.
- Original 799-bone full film animator rig and source hair curves/filmic shader nodes **not converted**. Source GLB copy is intentionally STATIC: **0 skins, 0 animation clips, no tested blink or facial motion**.
- Chrome WebGL2 with Three.js r0.186.1 actual GLTFLoader. Neutral render, output sRGB, ACESFilmic tone mapping, direct lights. This is a new screenshot from a real WebGL canvas, not a Blender image reused as output.

## Five actual Chrome/WebGL screenshots

Chrome saved: \`blank-webgl-front.png\`, \`blank-webgl-three_quarter.png\`, \`blank-webgl-profile.png\`, \`blank-webgl-eyes_macro.png\`, \`blank-webgl-eyes_three_quarter.png\`; labelled actual \`blank-webgl-contact-sheet.jpg\`. 960 × 760 per view. The browser audit \`webgl-runtime-audit.json\` verifies head/eyes each have source color texture maps, separate cornea meshes, WebGL2, five camera views. Artifact: \`blank-hero-v5-real-webgl-proof\`, short GitHub retention.

Engine unchanged: **171 PASS, 2 SKIPPED, 0 FAIL**. glTF SHA/integrity/PBR material gate PASS, **Chrome strict page+console error gate PASS** on final run, screenshot save gate PASS.

Intermediate runs 38950876909 and 38952231978 failed renderer-node matching/audit because Three.js sanitized Blender eye suffixes; these were corrected with normalized source names without skipping face/eye texture requirements. Run 38952683980 actually saved all five Chrome PNGs but failed final strict no-console-errors assertion due to a single unrelated optional browser favicon 404; data favicon was added to eliminate it, then clean run 38953227006 PASS. Blender exporter initially wrote GLB correctly after ~23 seconds but hung for ~7 minutes on interpreter shutdown; post-export flush + explicit successful exit removed the stall in subsequent runs.

## Visual comparison — why this is not finished

Compared with previous true Blender Cycles Einar screenshots (source v4), the real-time version shows:
- **Bald head**: procedural film hair and brows do not transfer as geometry/hair cards automatically; not a faithful complete human.
- **Cruder skin:** original base-color texture is present but original detailed normal/roughness/subsurface/displacement components and film SSS are absent; flat or overly smooth material response.
- **Harsh eyelid/mouth/cheek transitions** at eye macro, unnatural flattening and hard material/mesh boundaries.
- **Static frown and unnatural eye shading** despite genuine original head, iris and cornea meshes.
- The user's photographic portrait quality examples are NOT reached. Technical acceptance is not a subjective realism score.

## Next required engineering milestones

1. Restore actual licensed Einar normal/roughness/specular/displacement channels, author bounded runtime SSS approximation, validate material textures and geometry at both screen and mesh UV level; compare matched real Three.js versus Blender source views.
2. Export/render appropriate eyebrows, eyelashes and **actual hair geometry/hair cards**, preserving source rights; do not substitute stock portrait.
3. Bring in rigged deformation skeleton and **real upper/lower blink** with eyelid/cornea tests (no unsupported assumption a static GLB blinks).
4. Optimize LOD, real Android device FPS/thermals, browser memory, and ask human to visually approve front/profile/3-4 extreme macros before replacing existing hero.

**Operational:** This work is isolated on experiment/hero-v5-blank-webgl. One-shot temporary push trigger removed; workflow remains manual \`workflow_dispatch\` only. No production main merge, no Vercel deployment. \`docs/CONTINUITY.md\`, structured state and agent handoff updated with this actual PASS/visual FAIL.
