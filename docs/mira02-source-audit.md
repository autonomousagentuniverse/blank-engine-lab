# MIRA-02 — original Vitruvian versus MIRA-01, matched real Cycles diagnosis

Date: 2026-10-17. This is a root-cause audit, **not a new identity or artistic approval**.

## Actual controlled evidence

- [GitHub Actions run 39043998893](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39043998893): used pinned source revision bdecdcd537b4031fdd0fb299b7e4f93f084fffa0, restored real CC0 model and textures, completed **all 6 real Cycles 700x700 renders**, saved source-derived packed 50.7MB Blender project and original JSON report, with frame SHA256. Artifact ID **12105465417**, name `mira02-original-vs-mira-cycles-diagnostic`, ZIP ~54MB.
- **Workflow conclusion FAILURE** due *post-render* logging bug at last line `"shader_nodes":m["skin_nodes"]`: Python `m` had been rebound from the original shading audit dict to a Blender Material during slot restore, raising `KeyError: 'bpy_struct[key]: key "skin_nodes" not found'`. All actual output files exist and hashes match their report; the genuine final report says `status:FAILED`. This log reference has been corrected in the experiment script **without rerunning** and does not retroactively turn failed CI green.
- Exactly matched conditions: input `vitruvian_head.glb` original, same untouched eye and `VitHair` objects, same eight texture-backed MIRA Cycles shaders, same fixed cameras/lights for each pair. Then apply exactly MIRA-01 cheek/jaw/chin/nose geometry morph to source mesh only.
- Six views in run artifact: `original_material_front.png`, `original_material_eyes_macro.png`, `original_clay_front.png`, `mira_material_front.png`, `mira_material_eyes_macro.png`, `mira_clay_front.png`. Matched images independently unpacked, checked 700x700 and verified each SHA from `report.json`.
- The **material** on both images is our simplified reconstructed seven-node `VitSkin` Blender Cycles shader, not unmodified upstream Godot's exact skin shader. Thus defects shared by both are *common source geometry and/or shared reconstructed shader*, not proven defects in upstream CC0 texture quality.

## Root cause and evidence

1. **Vertical split/crease from lip to chin is introduced by MIRA-01 facial geometry transformation**: absent from original but obvious from MIRA-01, persists even after replacing skin/mouth material slots with neutral clay. Not a UV/albedo seam, camera illusion or hair problem. Culprit is the discontinuous lateral-sign transform in `sculpt_variant()`:

   `lateral=face*(.0052*cheek-.0067*jaw)*(1 if dx>=0 else -1)`

   This jumps at `dx=0`; for near-centerline vertices at `zrel=-0.089` meters, using the actual Gaussian weights yields ~**3.946 mm** lateral discontinuity from small negative to positive x. Difference across other neighboring z-rel is ~0.86–3.75mm. The crease is visible in clay and is a deterministic defect of our procedural identity sculpt. **First fix** must replace abrupt signed offset with a continuous signed falloff, accompanied by an explicit no-centerline-fold mesh quality test before rerender.
2. **Eyes unchanged by face morph**: matching original and MIRA eyes show the same artificial flat white eyelid wedges, mechanical iris and reflections. Because original and MIRA share conversion materials and object transforms, target the source-to-Blender eye/eyelid/cornea shader/material mapping, independent of the facial sculpt.
3. **Hair untouched and indistinguishable in matched views**: large flat card strands and cap edge already exist in the source under our Cycles material conversion. Fix opacity/alpha, card geometry, scalp shading separately after no-midline fold; don't repeat density-only scalp scatter.
4. **Novelty still insufficient**: a ~5.163mm max local geometry shift touching 13,027 vertices yields only subtle identity change; despite being non-Einar, the variant remains Vitruvian-derived. Do not call it independently original.
5. Approximate full-color original-vs-MIRA mean absolute RGB differences (0–255) in identical image regions: chin 5.2, eye region 0.99, hair region 0.03; neutral-clay chin 1.5, eye region 0.74, hair region 0.03. These pixel values establish **which components changed**, not photographic quality.

## Controlled next action (not undertaken yet)

- Test a mathematically continuous lateral deformation near x=0 **in isolation**, preserving every other setting. Quantitatively reject any centerline fold before spending on Cycles; then one matched front/clay render pair. Do **not** edit eyebrows, hair, skin and eyes simultaneously.
- After geometry fix passes front/lip clay visual comparison, investigate eye shaders/material and hair cards using isolated A/B switches, not arbitrary added polygons.
- Full photorealism, independently original identity, source-to-WebGL parity and human approval **remain blocked**. No Vercel deploy. Workflow manual-only.

Source character CC0 (upstream license notice), no Einar ancestry. Artifact output is a reproducible, verified comparison with a final status logging bug accurately disclosed.
