# HUMAN-A05 — verified Blender rig and clothing isolation
Date: 2026-10-17

## Verified execution
- GitHub Actions: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39026642127 — **SUCCESS**.
- Artifact: `human-a05-rig-neutral-clothing-isolation` (ID `12097934128`): actual `front.png`, editable `human-a05-rig-neutral-no-strap.blend` (89,147,619 bytes), `report.json`.
- Source: original Blender Studio Einar v1 **CC-BY licensed**; original archive and .blend unmodified, new project is a source **derivative**, source skin texture files externally referenced, not standalone.
- NOT an independently generated new photorealistic human and NOT WebGL tested.

## Evidence-based fix and observed image
A04 actual front-view raycasts identified `GEO-satchel_strap` at pixel [505,615], jacket collar `GEO-einar_jacket_collar2`, and `GEO-einar_jacket_main`. Those sources were rendering despite naive `hide_render` whitelisting. In A05, 43 source clothing/shoulder meshes were explicitly unlinked from their original collections in the **derived scene**, including `GEO-satchel_strap`. **The strap is absent in the actual A05 Cycles front render**.

A04 read exact source driver mapping: four `A_EyebrowRaise_Inner/Outer.L/R` values are driven by `ACT-Eyebrow_Inner/Outer.L/R` bone `LOC_Y / 0.01`. A05 adjusted the physical original rig controls, preserving source shape-key drivers. The evaluated values matched inner 0.58 / outer 0.30 on both sides to within 0.00002.

## Visual verdict
**Improved object isolation**: strap completely removed, shoulder geometry clean, closed lips and eyes/skin preserved. Source heavy brow lines and stern expression remain; softening is modest. Short scalp hair invisible at this resolution (bald), source skin highly weathered. **Visual acceptance for new human remains BLOCKED**.

## What must not regress
- Preserve A02 262-vertex bounded neutral lip-contact corrective.
- Preserve separate source eyes/corneas/meniscus/plica and actual 301-node skin shader.
- No arbitrary whole-eye translations, no source-identity relabeling.
- Never treat source driven-shape value assignment as rig-aware if not validated in evaluated depsgraph.

## Next bounded implementation
Inspect procedural scalp curve local/world position and Cycles material under head deformation; if a new groom is needed, prove it with a small crop. Then create a genuinely **new** rights-cleared human topology, reuse anatomical and shader techniques, and obtain visual acceptance. No deployment here.
