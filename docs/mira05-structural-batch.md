# MIRA-05 — structural reconstruction batch, not cosmetic parameter edits

This experiment responds to the owner's direction to stop small edits and correct poor Blender instructions. The corrected MIRA-03 mouth/centerline remains immutable. No Einar assets or source downloads. CC0 Vitruvian ancestry is preserved. All candidate art is **unapproved** pending visual review.

## Structural work

- **Eyes:** retain original eye shells, sclera/cornea/iris atlas, remove opaque Eyeshadow_L/R planes, create narrow fitted tearline/eyelid contact curves by raycasting the *actual source face* around original 33.47-mm orbital centers. Roughness/opacity follow source-specific eye materials; report count of fitted contact curves or fail. If sourced geometry lacks a usable eyelid contact, reject rather than inventing unrelated overlays.
- **Hair:** hide old 485k-vertex polygon/foil-like scalp cards. Sample actual head polygons above measured eye line, BVH-project 12,500 root positions and fit long, downward-flowing, middle-parted fibers (14.5–20.5 cm). Use real Blender curve/hair geometry with a distinct hair shader, not a darker copy of the original flat texture. Report mask polygon count and per-region root counts; fail when frontal roots are missing.
- **Eyebrows:** hide existing ~71k-vertex eyebrow cards. Sample 2 × ~1300 3–8-mm strands projected onto the actual facial skin surface, with temporal flow. Dedicated brow material, **no scalp-hair atlas reused**. Fail if scalp projection lacks sufficient roots.
- **Skin:** preserve base albedo, UV normal and roughness textures. Add explicitly scaled millimeter-level subsurface and independent low-strength micropore bump layer. No repainting over actual source atlas.
- **Identity:** additional 7–16-mm anatomically masked cheek/chin/jaw/nose morph on frozen MIRA03, maintaining 27 shape keys, eye-shell geometry, smooth lateral symmetry and protected lip/orbit regions. Independently original topology is NOT claimed.
- **Integrated:** all successful operations applied to the unchanged packed MIRA03 face in a fresh Blender process and saved as editable packed .blend. Rejection remains possible even if technical checks pass.

## Experimental design

Baseline front; reconstructed eyes front+macro; new scalp curves and brow curves front+three-quarter; dermal shader front; identity geometry front; integrated front+macro+three-quarter = **10 genuinely rendered Cycles 700x700 comparisons**. Each variant runs in an independent Blender/bpy process (MIRA04 native segmentation faults). Every render has immutable source hash, camera ref and image SHA256 and is packed in the final GitHub Actions archive. No automatic acceptance based on strand counts or shader-node counts. Actual images determine whether the result beats MIRA03 and MIRA04 eye-only.

**Source:** successful real MIRA03 run [39045175123](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39045175123), input .blend SHA256 `1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d`. Original ancestry remains Vitruvian by Sean Buckley / Olaf Delgado-Friedrichs via upstream [ibrews/VitruvianGodot](https://github.com/ibrews/VitruvianGodot) CC0 character files. No new anatomical human independent of base has been created.

**Acceptance:** hard gate on genuine visible improvement to eyes, hair, brows, and skin. Failure in hair mechanics triggers a focused procedural source diagnosis rather than arbitrary density adjustments. The high-resolution 1400-pixel 64–128-sample beauty pass and WebGL/Blank Engine parity are separate subsequent gates **only if** this preview batch substantially improves the character. No mainline code merge and no deployment.

At authored commit: TEST PENDING. Do not imply Blender job has run until Actions result verified.

## First real execution and geometry gate

[GitHub Actions 39050817482](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39050817482) completed **three real Cycles 700-pixel images**: frozen baseline front, reconstructed-eyes front and reconstructed-eyes macro, and correctly rejected hair at the scalp-front geometry validation before rendering it. Failure: `Scalp geometry distribution invalid {'curves': 12500, 'regions': {'front': 0, 'crown': 1774, 'rear': 10726}, 'mask': 676}`. This repeated A07's known classification flaw: reference `eye_center.y` is anatomically forward of scalp and is NOT a valid measure of the scalp's own frontmost extent. The project stopped on the guard rather than falsely claiming successful hair.

**Recovery:** two-pass source-dependent scalp mask now measures the head's scalp candidate polygons at 5th and 95th percentile world Y (fixed camera face direction is -Y). Hairline uses normalized measured scalp longitude and frontal masks; report `scalp_candidate_regions`, frontal root counts, true surface polygons and percentile Y bounds. Fail if fewer than 100 usable scalp polygons or 10 front polygons, or fewer than 7% of 12,500 root curves in front region. Reuse all three actual PNG files from artifact `mira05-structural-reconstruction-batch` ID 12107488327; verify recorded source and SHA per frame and rerun only hair+brows, skin, identity, integrated in separate bpy processes. No new baseline/eye renders, no Einar, no deploy.

**Result of resumed execution:** pending until real artifact and image review.

## Second real run — root geometry valid, rendering exposes shader/default and identity amplitude faults

Actions [39051269558](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39051269558) saved six *real Blender Cycles* images: baseline front, eyes front+macro, replacement scalp-fiber and brows front+three-quarter, skin-only front. Geometry proved 12,500 actual curve strands, 2,600 face-raycast brow strands (1300/side), 555 eligible scalp polygons, **3681 front, 4083 crown, 4736 rear roots**, 231 source front polygons. Replacing eye-relative depth with actual source scalp Y percentile repaired the A07-style mask failure. It then **failed intentionally** at identity strength validation: 11,143 changed vertices but max movement only 4.6569mm, below the established 7mm identity change threshold. No unverified variant promoted.

Visual inspection of the actual hair PNG found a **new material authoring error**: `ShaderNodeBsdfHairPrincipled` was in its default **MELANIN** parametrization, so our assigned RGB dark-brown `Color` was ignored, resulting in an artificial pale-blond hair curtain and weak brow color. We should not call this an acceptable groom. In response, the shader is explicitly set to `parametrization="COLOR"`, pigmented dark-brown roots are applied, front hair root guides are swept laterally away from the orbit (7.5–10cm at tips), and the same 12.5k+2.6k actual strand structure is retained. The second run's two pale-hair images are **archived as rejected**, not overwritten or silently relabeled.

The identity layer increases its existing smooth, orbit/lip-protected anatomical offsets by 2.2× based on the recorded 4.6569mm proof; expected ~10.25mm peak, still under 16mm hard safety cap; head/facial expression keys untouched. We resume from the four hash-verified baseline/eye/skin PNGs, rerender only *hair_brows, identity, integrated* in fresh Blender subprocesses and archive all ten matched PNGs plus packed .blend if all pass.

Final human photoreal acceptance still **PENDING**. No production deploy. MIRA-03 CC0 source remains immutable.
