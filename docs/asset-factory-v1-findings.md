# Automated Blender asset factory v1 — actual Einar headless test

**2026-10-16, experimental branch experiment/asset-factory-v1.**
Actual successful [GitHub Actions run 38956247113](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38956247113). The one-shot run used **one declarative JSON asset spec**, with no human using Blender to create or bake assets. Source is authentic Blender Studio Einar v1 CC-BY, official source ZIP SHA-256 \`3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7\`; required credit **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.

## Confirmed output and provenance

- Job spec: \`asset-specs/einar-head-v1.json\`, immutable deterministic build id **4c7f728f4c6121b5**.
- Executor: \`experiments/asset-factory/build.py --spec asset-specs/einar-head-v1.json --execute\`.
- Strict source/licensing/schema/missing maps/unsafe paths/auto-deploy contract tests PASS.
- All **7/7 stages PASS**, no skipped generation stages, no unattended release. Stages individually recorded with durations, error fields and separate log files in \`asset-factory/einar-head-automated-v1/build-manifest.json\`.
- Original 580MB publisher ZIP downloaded and all 63 source images restored, with SHA validation and immutable source assets.
- Genuine source Blender head, both eyes, separate corneas, tear structures and mesh eyelashes copied into glTF PBR.
- **New asset-created material:** source-authored \`einar_skin.roughness\` TIFF (not fabricated roughness scalar) converted to a real 2048px runtime roughness image and linked to glTF metallicRoughnessTexture. Einar original source skin and eye albedo remain separately embedded.
- Actual GLB: **9,592,876 bytes**, SHA-256 **5636bee1e558d903f342b939dd49e44dab5eb7cd6549bcaf834a25bfd3445e0d**, **12 meshes, 5 materials and 3 images**. Eye/body source anatomy not recreated using procedural primitive replacements.
- Blank Engine experimental Three.js GLTFLoader/Chrome WebGL2: **56,572 runtime triangles**, actual textured head and eyes, source physical cornea, **five real 960x760 screen captures**, contact sheet. Source render is not Blender Cycles.
- Unchanged engine: **171 PASS, 2 SKIPPED, 0 FAIL**.
- GitHub artifact \`blank-engine-automatic-asset-factory-v1\` preserves generated GLB, five PNGs, contact sheet, exporter/glTF/WebGL audits, all seven logs and completed asset-factory manifest; GitHub retention seven days.

Stage durations from recorded manifest: official download 19.85s, texture restore 1.67s, Blender source export 13.69s, glTF audit 0.03s, engine regression 0.72s, Chrome five screenshots 11.15s, contact sheet 0.16s. These exclude runner installation/bootstrap and are NOT Android production timings.

## Actual image review — fails photorealism

Real \`blank-webgl-eyes_macro.png\` shows severe visibly overlapping/disconnected face surface triangles/polygon patches and black seams around the eyes, nose, cheek, mouth and brows; reddish scar/distress details, bald scalp, static stern expression and flat skin normals. Added true roughness source maps do not correct bad source asset extraction/deformation/material seams. It would be misleading to mark this visually usable. **Human visual approval BLOCKED**.

Likely next root causes to test instead of random face painting: Blender source Einar high-resolution evaluated mesh material slots were forcibly collapsed in v5/v1 exporter into a single skin albedo PBR material; shape-key/evaluated mesh geometry and original source mesh composition may yield disconnected overlapping surfaces. Need exact **per-material face-slot remap**, source UV-set evaluation, composed skin/face masks, normal/tangent fidelity and source head deformation/pose, comparing the same source mesh in Blender and Three.js under camera-locked render. No claims without tests.

## Important unimplemented automation stages

- **Actual source hair/card generator:** not implemented, cannot call this a complete production character.
- **Head/eye blink rig/morphs:** not generated, 0 skins/0 animation clips in output GLB.
- **Source skin normal/displacement/SSS transfer:** not implemented. Single map for original roughness now verified.
- **Face visual comparator / Android device profiling:** not implemented; screenshots pass only basic real-render integrity and manual image review failed.
- **Other asset classes:** Object Builder, Scene Builder, general text-to-3D requests are not supported by this first template. Unknown sources/templates are rejected.

## Operational

Automation is in Blender's **headless Python API** invoked through a validated job; no manual artist actions or Blender GUI needed. Permanent workflow restored to **manual workflow_dispatch** after one-off experiment run; that only controls job submission, NOT the internal workflow (which is fully automatic). Production main, Alpha 0.5 and Vercel remain unchanged. Asset generation never implies deployment, and human visual approval remains separate.

Next v2: independent original face per-material/UV/normal audit and camera-matched Blender vs WebGL, then automate correcting layer/material export; only after that source hair and blink morph conversion. Preserve exact original licensed source and all provenance for every generated asset.
