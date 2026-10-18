# Human Visual Variable System — implemented V1

Status: **research branch; source SHA-pinned, four executable controls, 32 proposed/unimplemented controls**. No production deployment, no claim of automated independent photoreal human creation.

## Files

| Contract | Purpose |
|---|---|
| `../contracts/human_visual_variable_system.v1.json` | Versioned controls, numeric bounds, default parameters, source manifest and precise real Blender binding status |
| `../contracts/human_defect_taxonomy.v1.json` | Canonical defect labels and evidence requirements; no invented realism verdicts |
| `../contracts/teacher_delta_proposal.v1.json` | External/reference-guided deltas with source and rights provenance, manual-review gate, no automatic application |
| `../contracts/render_evaluation_report.v1.json` | Null-by-default technical and perceptual measurements, evidence/reviewer requirements, release disabled |

`human-visual-variables.mjs` validates and compiles controls; `human-variables-cli.mjs` exposes commands. `one_shot_actual_full_body.py` loads a compiled config via `BLANK_HUMAN_RENDER_CONFIG` and enforces the same source SHA and numeric bounds inside Blender.

### Executable bindings

`camera.margin` (fraction from each edge), `camera.three_quarter_orbit_degrees` (angle), `render.cycles_samples` (integer), `render.exposure_ev` (EV). All others (face/eye/skin/hair/pose) are **unimplemented** until real geometry/material/rig bindings exist. They cannot silently alter source meshes, and the compiler refuses them.

### Usage

```bash
node character-pipeline/one-shot/human-variables-cli.mjs validate-contracts
node --test character-pipeline/one-shot/human-visual-variables.test.mjs

node character-pipeline/one-shot/human-variables-cli.mjs compile \
  character-pipeline/one-shot/human-visual-example.request.json \
  /tmp/human-render-config.json

# Only in a valid Blender environment with source/afro_mask_respected_uv_pbr.blend
BLANK_HUMAN_RENDER_CONFIG=/tmp/human-render-config.json \
  python3 character-pipeline/references/one_shot_actual_full_body.py

node character-pipeline/one-shot/human-variables-cli.mjs assess-proposal \
  character-pipeline/contracts/teacher_delta_proposal.v1.json

node character-pipeline/one-shot/human-variables-cli.mjs validate-report \
  character-pipeline/contracts/render_evaluation_report.v1.json
```

The example compiler uses a new output file and refuses overwrite, and only source-pinned original Blender evidence can establish a Blender-render claim. Image-generator references are optional **visual teaching input**, never actual Blender render evidence, and proprietary generator internals are not available.

### Acceptance verified 2026-10-18

Isolated GitHub Actions [run 39165616875](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39165616875) **SUCCESS**: twelve Node negative/contract regression tests passed, all four JSON files parsed, then a real Blender 4.5.3 Cycles run used an independently compiled config. It generated actual front/27-degree/profile full-body PNGs with margin **8.5%**, samples **32**, exposure **−3.3500195 EV**, preserved 53-joint rig, and left original geometry/lighting unchanged. Artifact **12150786184** includes exact config, output PNGs, editable Blender `.blend` and file-hash evidence JSON. Automated full-body camera framing is mechanically verified; the woman's actual anatomy, eye, skin and hair quality remain visually below photorealistic acceptance.

**No production deployment; manual test workflow only after run.** The earlier image-generator lookalike images do not count toward Blender output metrics.

## Phase 19 body-first geometry research (2026-10-18)

This section supersedes the *current-control-count* in the V1 history above, not its historical verified 2026-10-18 run. On isolated branch `research/full-body-anatomy-controls-20261018`, there are 10 code-declared executable bindings (four camera/render, three independently researched face morphs, three newly added full-body geometry controls), with 26 unavailable controls.

**Actual full-body controls under test:** `morphology.shoulder_width` (default 0.42), `morphology.waist_width` (0.36), `morphology.hip_width` (0.52). Real adapter `character-pipeline/references/full_body_morphology.py` warps geometry in bounded vertically localized bands in world space, affecting the original body shape-key streams and armature-bound garment meshes; it records measured torso band widths before/after and fails if changes are absent or in the wrong direction. Face and hair are inherited; no newly authored human identity exists. This is a prototype deformation field and has **not** passed human anatomy, garment intersection, skeletal animation, or real-render acceptance.

Reproduction/verification protocol:
```bash
python3 -m unittest discover -s character-pipeline/references -p test_full_body_morphology.py -v
node --test character-pipeline/one-shot/human-visual-variables.test.mjs
node character-pipeline/one-shot/human-variables-cli.mjs compile character-pipeline/one-shot/full-body-neutral.request.json /tmp/body-neutral.json
node character-pipeline/one-shot/human-variables-cli.mjs compile character-pipeline/one-shot/full-body-variation.request.json /tmp/body-varied.json
```
Actual paired Blender/PNG verification is specified in the **manual-only** workflow `.github/workflows/experimental-real-full-body-anatomy-once.yml`, to render neutral and changed from the same SHA-pinned scene and compare front, 27-degree and profile full-body views, widths and immutable provenance. **It has not been run as part of the new body work**. A prior Phase 17 Blender run never changed body geometry and must not be counted as Phase 19 evidence. No production deployment or photo-realism approval.
