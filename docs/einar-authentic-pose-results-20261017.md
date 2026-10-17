# Authenticated Einar source pose experiment — actual evaluated Blender rig and blink (2026-10-17)

## Provenance and execution

Actual [Blender Studio Einar v1](https://studio.blender.org/characters/einar/v1/) original licensed CC-BY publisher source, from official studio archive URL, authenticated:
- ZIP SHA-256 `3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7` (~580MB), restored with 63 original textures.
- Original source Blend SHA-256 `1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b`.
- Required credit: **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.
- Original source and textures NEVER archived to GitHub or redistributed here. Only JSON measurements archived. All workflow triggers restored to **manual-only**.

Scripts on branch: `experiments/einar-pose/measure_actual_pose.py`, `inspect_blink_drivers.py`, `probe_authored_rig_blink.py`. Independently executed genuine Blender 4.5.3 through CI:

1. [Source head turn and raw driver attempt #39078750761](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39078750761), success, artifact **12118266555** `einar-authentic-blender-pose-measurements`.
2. [Driver introspection + forced isolated source key #39078941398](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39078941398), success, artifact **12118182008** `einar-blink-driver-diagnostic`.
3. [Authentic source-mapped eyelid rig controls #39079133025](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39079133025), success, artifact **12117458677** `einar-authored-blink-controls-diagnostic`.

## Test 1: controlled FK-Head bone rig pose (12° requested Z rotation)

Measured MAX world vertex/strand-root movement (not a proportional displacement test; components at different radial distances vary):
- Evaluated face/head: **36.97714 mm**.
- Cornea L/R: **15.6035 / 15.79623 mm**.
- Eye geometry L/R: **15.56765 / 15.78550 mm**.
- Native evaluated `GEO-einar_hair` curves: **31.30891 mm**.
- Native eyelashes curves: **14.10391 mm**.
- Native eyebrows curves: **19.25506 mm**.
- Hair surface deform proxy: **36.97455 mm**.
- Eyebrow deformation proxy: **19.71064 mm**.
- Tear meniscus L/R: **0 mm** and `GEO-einar_eyelash_surfdef` proxy **0 mm** under this test. Do not treat this as a physics failure yet; underlying source modifier/display/evaluation path or control selection must be resolved.

Control **FK-Head** was identified by its rig bone name (heuristic). Movement is genuinely evaluated Blender output but not a publisher-authored keyframed animation.

## Test 2: why direct blink shape-key setting initially did nothing

Initially direct assignment of `D_Blink_Upper.L/R`, `D_Blink_Lower.L/R` and `HeadLookLeft` produced no evaluated movement because active Blender drivers overrode the assigned values. This initial ZERO result must not be misconstrued as lack of anatomy.

Driver-inspection experiment found **4 active blink FCurves**, with exact targets:
- `D_Blink_Lower.L` ← `RIG-einar` bone `Blink.L`, local Y, expression `var/-0.006`.
- `D_Blink_Lower.R` ← **same `Blink.L`** local Y, expression `var/-0.006` (source mapping asymmetry, not yet proven authoring bug).
- `D_Blink_Upper.L` ← `Eyelid_Upper.L`, local Y, expression `var/-0.006`.
- `D_Blink_Upper.R` ← `Eyelid_Upper.R`, local Y, expression `var/-0.006`.
- HeadLookLeft key is driven by **SKP-Neck ROT_Y**, not direct key assignment.

Muting only those four blink FCurve drivers **in memory** and setting original shape key values to 1 produced an actual face mesh max movement **6.05499mm** (not published rig animation). Source file remained untouched.

## Test 3: direct bone controls, active drivers, real evaluated geometry

Set the exact Blender rig pose bone local Y coordinates by a controlled -0.006m offset. Did **not** mute drivers in this test. Source's evaluated blink keys and output geometry measured for left-only, right-only, upper-only and combined states.

### Combined actual rig blink
- All 4 evaluated source blink-key values are **1.0**.
- Evaluated face/head max vertex movement **7.43266 mm**; mean of sampled head positions **0.27236 mm** (face area large and locally deforming).
- Native evaluated **eyelash curves** move up to **7.32701 mm**.
- Evaluated eyebrow curves move up to **0.09583 mm**.
- Corneas, native hair curves: **0 mm** under blink (not expected to move with eyelid).
- The sampled `GEO-eye.meniscus.L/R` meshes and `GEO-einar_eyelash_surfdef` mesh remain **0 mm**. This blocks any claim of verified meniscus-to-lid or surface proxy blink coupling.

### Independent left/right control finding
- Moving `Blink.L` alone drives both **D_Blink_Lower.L=1.0 and D_Blink_Lower.R=1.0**. It also results in `D_Blink_Upper.L=1.0` due existing original rig wiring, while `D_Blink_Upper.R` remains near 0.
- Moving `Blink.R` alone does **not** drive either lower key (both remain near 0); `D_Blink_Upper.R=1.0` under rig constraints. This confirms an asymmetric source control coupling in this diagnostic. Do not label it an unintended publisher bug without artist documentation and rig state verification.
- Moving the upper-lid controls individually drives the corresponding upper source morph while the lower keys stay near zero.

## What the measurements establish and do NOT establish

**Confirmed:** authentic Einar has a physically connected head, eyes and high-detail main hair/lash/brow geometry under a real head control, and active rig drivers allow substantial facial blink deformation. MIRA05 generated unattached curves failed source head translation and blink following; thus one-shot generator must produce a coherent deformable graph, not only place curves at neutral skin points.

**Still blocked:** tear film dynamic attachment, surface mesh evaluated follow behavior, signed lid-globe/tear meniscus collisions, actual photographed skin/optics and complete published animation pose transitions. Initial sampled nearest-vertex distances to cornea around 45mm were gross proxies; are NOT validated physical clearance and must not be used as a pass/fail claim. No Einar-to-Blank Engine GLB parity. Neither Einar nor MIRA has photographic acceptance.

**Critical next work**: Inspect original tearline/eyelash proxy modifier enable flags / Geometry Nodes evaluation order and actual curated artist animation actions. Use actual lid rim surfaces and globe geometry for signed 3D clearance with full mesh sampling, and verify hair/lash root binding across all rig transforms and expressions. Match scanned or rights-cleared real human optics as needed. Continue **one-shot full generation**, not MIRA patching.

**Release status:** no new human generated; no production merge/deployment; independent anatomical contract remains unapproved.