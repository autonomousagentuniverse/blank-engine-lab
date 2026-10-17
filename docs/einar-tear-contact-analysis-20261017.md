# Einar tear-film, eyelash helper and corneal contact investigation — 2026-10-17

**Status:** Two genuine Blender 4.5.3 CI executions passed. The *investigation* passed; the anatomical tear/lid contact gate remains blocked. On isolated branch `experiment/einar-tear-contact-20261017`. No MIRA patching, new character, Blender binary redistribution or production deployment.

- [Original detailed modifier and evaluated surface test, run 39080029591](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39080029591), artifact `einar-tear-contact-blender-evidence` ID **12118761087**.
- [Viewport/render flag visibility ablation and eyelid-region test, run 39080237336](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39080237336), artifact `einar-tear-visibility-and-contact-ablation` ID **12117789303**.
- Original Blender Studio [Einar v1 CC-BY](https://studio.blender.org/characters/einar/v1/), source .blend SHA256 `1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b`, 63 image files restored directly from the publisher archive in CI only. Credit **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.

## Verified source visibility / modifier semantics

| Object | Original viewport | Original render | Important source modifier structure | Actual controlled blink | Real 12° head-turn |
|---|---|---|---|---:|---:|
| `GEO-einar_head` | visible | visible | ARMATURE on, CORRECTIVE_SMOOTH on, viewport SUBSURF on, 2 GN render-only/off | max 7.43266mm | max 36.83293mm |
| `GEO-einar_eyelashes` CURVES | visible | visible | GN deform ON | max 7.36132mm | max 14.11322mm |
| `GEO-einar_hair` CURVES | visible | visible | GN deform ON | previously stable under blink | previously max ~31.31mm under head-turn |
| `GEO-eye.meniscus.L/R` | **hidden** | **render-enabled** | SURFACE_DEFORM bound/ON to head; two SHRINKWRAP enabled toward respective cornea; ARMATURE OFF viewport and render, DATA_TRANSFER enabled in render only | 0mm | 0mm |
| `GEO-einar_eyelash_surfdef` MESH | **hidden** | **hidden** | SURFACE_DEFORM bound/ON to head; two LATTICE modifiers ON; ARMATURE OFF viewport and render | 0mm | 0mm |

**Critical qualification:** source modifier presence, binding flags or render enablement do not prove effective evaluated behavior. The meniscus has `hide_viewport=True` but `hide_render=False`; the eyelash surfdef helper has `hide_viewport=True` and `hide_render=True`. The ACTUAL eyelash CURVES—not its helper mesh—are animated. The original evaluated meniscus meshes are **not** valid photorealistic tear-contact ground truth without further inspection.

## Actual real evaluated Blender geometry measurements

Same source `RIG-einar` control values as prior verified experiment: `Blink.L`, `Eyelid_Upper.L/R` set to local Y -0.006m, generating all four blink-key values at 1.0; separate exploratory `FK-Head` controlled rotation 12°. Never saved original source.

### Full evaluated cornea polygon BVH (NOT just nearest sampled vertex)

The original meniscus-to-cornea nearest evaluated SURFACE point distances are:

| Condition | Left min / median | Right min / median |
|---|---|---|
| Neutral, original hidden viewport | 42.31421 / 45.37594 mm | 42.20293 / 45.40992 mm |
| Neutral, viewport objects revealed | **unchanged** | **unchanged** |
| Neutral, revealed and viewport modifier flags matched to source render flags | **unchanged** | **unchanged** |

In ALL THREE ablations, inspected meniscus meshes remained stationary during blink (max 0mm), even with render-flag modifier simulation. **Do not conclude the publisher's final render includes detached tear film**: this measured object can be a dormant source construction mesh, and only actual rendered image or render-depsgraph evaluation can establish the published visual state.

### Source eyelid deformation-region to actual eye surface

We extracted 507 per-eye ORIGINAL source head vertices with `DEF-Eyelid*` bone-group weight >0.25 (upper/lower). Evaluated the source head mesh **with subdivision temporarily disabled in memory** so original vertex indices remain stable; did not modify or save the source. These are broad weighted eyelid *skin regions*, NOT source-verified wet lid margin coordinates.

Closest evaluated point on full polygonal cornea, distances:

| Eyelid-region-to-cornea unsigned surface metric | Left neutral | Left blink | Right neutral | Right blink |
|---|---:|---:|---:|---:|
| Minimum mm | 0.00033 | 0.00253 | 0.02396 | 0.00740 |
| Median mm | 2.25439 | 2.21599 | 2.17391 | 1.95037 |

- Unchanged through viewport/render-flag ablations because only hidden secondary helper visibility changed.
- Measured **actual cornea polygon nearest points**, not nearest sparse vertex. But the normal projection has negative values for some samples, and topology/manifold orientation/eye collision correspondence was **not** certified. Near-zero distance is **not automatically successful contact**; it can also indicate crossing/penetration or source render artifact.
- The distributions mix upper/lower and nearby skin; median distance cannot be interpreted as gap at the exact eyelid edge. Control nonuniform sampling and resolved lid-margin loops needed.

## Findings for full one-shot generation

1. **The core source rig couples the visible eye-area face and real eyelashes** as demonstrated by measured actual rig-controlled deformation. This is structurally beyond MIRA05's static add-on contact curves.
2. **It would be erroneous to use Einar's hidden tear/eyelash helper mesh as a positive baseline**, as inspected objects are stationary and widely separated from the physical globe. A source reference is useful only for anatomically active evaluated structures.
3. To promote `lid_globe_contact` from UNVERIFIED, we need true eyelid wet margin edge loops (mesh adjacency / annotated landmark mapping), full evaluated main head + cornea (without losing indices), a validated consistent surface-normal orientation, and signed distance/penetration checks across neutral and blink with dense samples. Need distinguish cornea from sclera and tear meniscus.
4. To promote `meniscus_lid_coupling`, identify the **actual render-visible** tearline representation (if any) by inspecting render-only dependencies, view-layer collection exclusion and actual Blender Cycles output or render depsgraph, not simply force legacy proxy objects visible. As Einar may have inactive helper geometry, lack of these tests should not block the *architecture specification*, but does block claiming this source as a measured tear-film baseline.
5. Keep original CC-BY license and provenance. Do not change a previously rejected character or start another full generation on fake evidence.

## Experimental code and continuity

- `experiments/einar-pose/audit_tear_contact.py`
- `experiments/einar-pose/ablate_visibility.py`
- `.github/workflows/experimental-einar-tear-contact.yml` (manual-only after one authorized execution)
- `docs/CONTINUITY.md` (checkpoint).

**Final: diagnostic implementation PASS; source anatomical signed wet-lid and dynamic tear contact remain UNVERIFIED. No new human, no release.**