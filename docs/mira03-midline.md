# MIRA-03 — an isolated continuous facial-midline repair

The MIRA-02 real Blender A/B revealed an abrupt left/right lateral displacement `(1 if dx>=0 else -1)` in the procedural jaw, producing an unnatural lip-to-chin crease absent in the untouched CC0 Vitruvian base. This iteration changes **only that sign multiplier** to `tanh(dx / 0.024)`; cheek/jaw/chin/nose envelopes, all original shape-key deltas, eyes, hair, Cycles materials, cameras and lights remain unchanged.

`experiments/mira03/midline.py` is an independent preflight and the actual function invoked by Blender. It evaluates 20 symmetric jaw/cheek level-depth samples at ±1 micrometer, demands smooth displacement zero at the center, >500x reduction in the old ~3.9mm jump and <0.01mm new jump. This **does not prove mesh topology or visual quality**; the Blender comparison is essential.

Render evidence: exactly **four real 700×700 Cycles images** in one matched studio scene: original_material_front, original_clay_front, corrected_material_front and corrected_clay_front. The output .blend is a **CC0 Vitruvian-derived face**, not a novel independent human and not a production character. This is an isolated mathematical repair, not new hairstyle or shader research. Any remaining cosmetic problem needs its own controlled test.

At code commit: CI/run result and human visual verdict PENDING. No automatic deployment. [Source MIRA-02 forensic result](https://github.com/autonomousagentuniverse/blank-engine-lab/blob/experiment/mira02-original-vs-variant-diagnostic/docs/mira02-source-audit.md).
