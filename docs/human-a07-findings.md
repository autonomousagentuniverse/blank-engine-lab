# HUMAN-A07 — actual guided scalp Cycles render, engineering results

**Date:** 2026-10-17

## What was built
Implemented an evaluated-head surface sampling algorithm in `experiments/human-a07/guided_scalp.py` using Blender's real `bpy` + BVHTree, a soft hairline/density mask, surface-projected shaft control points, and a coherent backward/side scalp guide field. Uses the real A05 Einar CC-BY source-derived .blend from GitHub Actions artifact, without dependence on the temporarily failing Blender Studio 580MB publisher download. Skin is **CLAY diagnostic** (film skin TIFFs unavailable), not photorealism; A05 source shader was not replaced in production.

## Evidence
- [First GitHub run 39036649311](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39036649311): failed **before render** because scripted validation assumed more than 5000 evaluated head vertices. Actual evaluated source head 4596 vertices, consistent with the source audit.
- [Corrected run 39036792357](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39036792357): **SUCCESS**: original A05 .blend loaded; 16500 scalp splines created; real Cycles 700×700 `front_clay.png` and `hair_macro.png` rendered and project `human-a07-guided-scalp.blend` saved. Artifact `human-a07-surface-guided-groom` (ID 12102751438) includes both actual PNGs, Blender project and report.
- Evaluated topology measured: **4596 vertices / 4522 faces** (same count as base; original modifiers' output did not increase vertex count in this Blender setup). **395 eligible scalp polygons**.
- Surface attachment checked using BVH projection: largest initial nearest-surface offset 0.000620 m (<0.7 mm).
- 16,500 surface-projected hairs 17–32 mm length, 0.105 mm bevel radius.
- Density-region counts: back_center=180 polygons, back_side=215; only **1 hair** categorized as front (16,499 categorized rear). This is a concrete remaining **front hairline mask problem** and means a smooth frontal hairline was not actually achieved.
- User-visible comparison with HUMAN-A06: A07 produces a more continuous, combed-looking hairstyle and visibly eliminates most of the wild A06 bristle/halo, but **still resembles a uniform wig/cap** at the scalp edge, has excessive symmetry, and lacks proper natural frontal follicle distribution. Real geometry advance; **final hair visual gate still FAIL**.

## Next bounded improvement
Use **scalp-relative depth distribution** instead of eye-center-relative threshold for identifying frontal scalp polygons; report separately eligible/front/root counts and enforce a meaningful frontal sample. Add real frontal hairline irregularity and temple recession tied to scalp coordinates. Compare unchanged matched front/macro Cycles views, not more random strand-count increases. Re-use original A05 derivative and keep all source skin/eye/rig/mouth fixes untouched. Full-material skin render still blocked by absent original texture archive, so refrain from claiming new face realism or final reusable runtime hairstyle.

**Production deployment: NONE.** Workflow restored to `workflow_dispatch` only; no production main code merge. Einar derivative CC-BY attribution remains required.
