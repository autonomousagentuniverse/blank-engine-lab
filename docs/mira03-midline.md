# MIRA-03 — an isolated continuous facial-midline repair

The MIRA-02 real Blender A/B revealed an abrupt left/right lateral displacement `(1 if dx>=0 else -1)` in the procedural jaw, producing an unnatural lip-to-chin crease absent in the untouched CC0 Vitruvian base. This iteration changes **only that sign multiplier** to `tanh(dx / 0.024)`; cheek/jaw/chin/nose envelopes, all original shape-key deltas, eyes, hair, Cycles materials, cameras and lights remain unchanged.

`experiments/mira03/midline.py` is an independent preflight and the actual function invoked by Blender. It evaluates 20 symmetric jaw/cheek level-depth samples at ±1 micrometer, demands smooth displacement zero at the center, >500x reduction in the old ~3.9mm jump and <0.01mm new jump. This **does not prove mesh topology or visual quality**; the Blender comparison is essential.

Render evidence: exactly **four real 700×700 Cycles images** in one matched studio scene: original_material_front, original_clay_front, corrected_material_front and corrected_clay_front. The output .blend is a **CC0 Vitruvian-derived face**, not a novel independent human and not a production character. This is an isolated mathematical repair, not new hairstyle or shader research. Any remaining cosmetic problem needs its own controlled test.

At code commit: CI/run result and human visual verdict PENDING. No automatic deployment. [Source MIRA-02 forensic result](https://github.com/autonomousagentuniverse/blank-engine-lab/blob/experiment/mira02-original-vs-variant-diagnostic/docs/mira02-source-audit.md).

## Verified execution and visual result (2026-10-17)

- **GitHub Actions run:** https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39045175123 — overall **SUCCESS**, including pure Python 20-sample preflight, Blender import, matched 4× 700px Cycles frames, .blend save, report assertions and archive upload.
- **Artifact:** `mira03-matched-midline-isolate`, ID `12105755880`, approximately 52.8 MB. Exact four images: `original_material_front.png`, `original_clay_front.png`, `corrected_material_front.png`, `corrected_clay_front.png`. The verified report lists 4 SHA-256 digests, independently matched to extracted bytes.
- **Actual math:** maximum old signed-lateral displacement discontinuity at a 2 μm span: **3.922441938 mm**; new corresponding near-midline difference **0.000163435 mm**; ratio **~24,000×**; tested 20 combinations of face-height and depth. This is an analytic measurement of the same formula, *not* a direct mesh edge-distance or geometry collision proof.
- **Character**: 17,161 CC0 Vitruvian face vertices with 12,844 vertex deltas after smooth transform (previous hard-sign version: 13,027 moved). Maximum morph shift **4.726 mm** (prior 5.163 mm). **27** original facial shape keys preserved, eye objects and hair card meshes remain untouched. All source image textures packed into the derived project.
- **Human/vision comparison** of pixel-identical camera and shader conditions: previous MIRA-01 discontinuity manifested as an unnatural *vertical line continuing from lower lip through chin* both skin and neutral clay; corrected MIRA-03 removes that visual line in both. The unchanged original Vitruvian also lacks that line. This is a clear bounded geometric improvement.
- **Still NOT accepted**: flat white eye/eyelid artifacts, coarse card hair/wig silhouette and limited independent identity remain exactly as before; no photorealism signoff or WebGL transfer test. No source topology independently authored; still CC0-derived. No production deployment.

**Next isolated test**, only if requested: head eye-material A/B using existing source eye assembly and fixed camera, not more jaw/hair random tweaks. First verify which eye shader/transparency cause the white triangular eyelid effect; do not proceed to an automated aesthetic change without root cause.
