# New one-shot human from real-photo comparison — final measured and visual verdict (2026-10-18 UTC)

## Final decision: TECHNICAL PASS; PHOTOREAL VISUAL FAIL

Two isolated CI executions:
- [Initial attempt 39082146560](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39082146560) FAIL before geometry: MPFB 2.x imported as a legacy addon, but this package requires Blender 4.2+ extension registration. No character from first run.
- [Corrected run 39082527374](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39082527374) SUCCESS, output GitHub artifact **12119855815** `new-independent-cc0-human-one-shot-cycles`, seven-day retention. Fixed using `bpy.ops.extensions.package_install_files(repo="user_default", enable_on_install=True)` on pinned upstream MPFB source.

Source of new synthetic geometry: pinned original [MakeHumanCommunity MPFB2 revision 3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf](https://github.com/makehumancommunity/mpfb2/commit/3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf) (source code GPL-3.0+, *not packaged with generated output*). CC0 MakeHuman core system assets from publisher, but verify individual artwork terms before any public redistribution. Subject identity is purely synthetic and is not copied from source photographs. Original real-photo pilot recorded [run 39081645078](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39081645078) with six attributed authentic photos and three immutable MIRA05 Cycles crop controls.

## Verified technical construction

- One independent MPFB human basemesh generated from macro identity seed `20261017`, 19,158 vertices. Not Vitruvian/MIRA05/Einar.
- Built-in game-engine armature 53 bones.
- Seven distinct source asset attachments generated in a single run: high-poly eyes, eyebrow001, eyelashes01, tongue01, teeth_base, bob01 hairstyle, female_casualsuit01.
- Enhanced SSS skin set from original CC0 core pack; game-engine-compatible assets used for accessories.
- True Blender Cycles 4.5.3 rendered FOUR outputs, 640x640, 28 CPU samples: `face_neg_y.png`, `face_pos_y.png` (reverse/back of head), `three_quarter.png`, `full_body.png`. Front camera = face_neg_y. `face_pos_y` is the back, not a second facial portrait.
- Editable packed `new_human_cc0_pilot.blend` saved and SHA256 verified: `ae45c099821c725024289f73c803f5b02f579f9c7df77f16083c092f13405537`, 25,556,537 bytes. Four render bytes and hashes in the original report `report.json`. The main artifact is 27,230,217 compressed bytes.

## Actual visual inspection and decision

Side-by-side inspect four unchanged Cycles images. **FAIL against user photorealism standard**:
- Hair appears as rigid sculpted shell, pronounced straight polygon-like strands, unnatural single dome/bob silhouette. Very different from photographer macro organized neighboring strands plus local root/guide diversity and scattering.
- Human skin is washed-out pale smooth/waxy, lacking pores/peach fuzz/fine normal/roughness changes and realistic color/specular response. Same low-level defect as MIRA.
- Eyes and lids too simple; weak cornea/tearline/iris depth in captured views, one eye mostly covered by fringe.
- Framing full-body image wastes >80% of width and shows T-pose against empty gray background. No visually credible portrait composition.
- T-shirt + jeans is rigid or game-like. Good evidence of complete garment asset generation, not photographic realism.
- Test's success proves end-to-end automation and source geometry not final image realism. **No pass** on original objective, no deployment, user should evaluate actual contact sheet before further generation.

## Root-cause / next bounded decision

The new parametric MPFB core is an effective **geometry/rig/asset assembly baseline**, but its bundled bob mesh, generic skin preset, basic eye arrangement and lighting **cannot substitute for photoreal reference-conditioned detailed human optics and material grooming**. Real-human photo analysis demonstrates that local coherent yet regionally varied strands are missing. Photo comparisons cannot directly infer 3D follice maps, pores in physical mm or cornea/lid clearance without matching optics, so pixel scalar difference isn't certified anatomical measurement.

The next generation milestone should use a **higher-fidelity photoreal source for both scalp strand grooming and skin/eye optics** (rights verified), while preserving automated one-pass whole character assembly. Do not produce another MPFB default character or serial cosmetic patch as if that advances photorealism. Any next stage needs demonstrable photoreal input resources and the same one-shot output/test contract; one candidate then visual judgment.

Pipeline `experiments/real-human-reference/generate_new_mpfb.py`, GitHub workflow `.github/workflows/experimental-new-human-from-photos.yml` left **manual-only**; neither released nor merged. Preserve original photo attribution and publisher asset-license facts.
