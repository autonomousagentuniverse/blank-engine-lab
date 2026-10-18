# New independent whole-human one-shot generator — photographic comparison verdict (2026-10-17)

## Run, artifacts and integrity

**Succeeded technically:** [GitHub Actions run 39082527374](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39082527374), artifact `new-independent-cc0-human-one-shot-cycles` **ID 12119855815**, ZIP approximately 26MB, with a genuine packed/editable `.blend` and four independently rendered Blender Cycles views (PNG) plus a SHA-verified report. No main/production merge or deployment. Manual-only experimental workflow.

Source: exact `makehumancommunity/mpfb2` SHA `3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf`, MakeHuman Community MPFB 2.0.18 used as a proper Blender 4.5.3 Extension `bl_ext.user_default.mpfb`, core CC0 MakeHuman graphical assets from official `makehuman_system_assets_cc0.zip`. MPFB GPL code was used in runner but **not included in character artifact**. The script failed before geometry on initial [run 39082146560](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39082146560) due incorrect old-style Python module loading. Corrected only extension packaging/registration and re-ran identically. It passed.

**Evidence checks:**
- **New original basemesh** MPFB 19,158 vertices, seeded identity macro set, **not** MIRA05 or Einar lineage.
- Game Engine rig **53 bones**.
- Required separate source-provided mesh parts: high-poly eyes, `eyebrow001`, `eyelashes01`, teeth, tongue, `bob01` hair, `female_casualsuit01` clothing; no silent omissions or fallback.
- `ENHANCED_SSS` skin, Blender Cycles **28 samples / 640×640**.
- Four true views `face_neg_y.png`, `face_pos_y.png`, `three_quarter.png`, `full_body.png`. All SHA checked against `report.json`.
- Packed editable Blender file `new_human_cc0_pilot.blend` **25,556,537 bytes**, SHA256 **`ae45c099821c725024289f73c803f5b02f579f9c7df77f16083c092f13405537`**.
- No human owner review approval, no interactive Blank Engine parity.

## Actual 4-view independent visual inspection

On unaltered genuine Cycles images in the downloaded evidence, **PHOTOREALISM FAILED**. The new character is a stylized/digital-looking pale-skinned human wearing a blue t-shirt, with an oversized gray bob covering one eye, very smooth/featureless overexposed face and crude eye shading.

**Largest weaknesses**, compared to genuine photos measured in [real photographic pilot](https://github.com/autonomousagentuniverse/blank-engine-lab/blob/experiment/real-photo-to-new-human-mpfb-20261017/docs/real-human-photographic-decomposition-20261017.md):

1. **Hair** is textured **mesh card/strip** geometry, a thick helmet/swept sheet, not rooted independent physically grounded clumps/fibers. Real human hair macro has spatially variable (locally coherent) individual strands, with axial entropy .547 and nearest-cell directional agreement .910 vs *previous* MIRA05 selected ROI .305 and .988. **No new MPFB ROI metric computed** (camera/scale unmatched). Do not attribute those MIRA metrics to MPFB.
2. **Eye** visible in a single slit under large bangs; iris looks flat/simplified, eyelid contact and corneal highlight are not photoreal. Can't infer tissue or lens detail from this resolution.
3. **Skin/lighting** face substantially blown/pale, lacks high-frequency photo real creasing/pores and regional tonal response; presentation is not adequate for separating actual shader insufficiency from 3-light exposure and color management.
4. **Geometry/texture** stylized head and game-style garment. Even a technically correct 53-bone body doesn't provide real-photo appearance.

The render is not "close" to professional photoreal in this iteration. The pipeline is **one-shot and repeatable** and the distinct human file exists, but actual output fails the user standard. Do not iterate with random noise or superficial brightness-only fixes and declare success.

## What the real-human pilot proves (and doesn't)

Authentic six-photo metrics captured in real-photo [GitHub Actions 39081645078](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39081645078), artifact ID 12119116413, are 2D spatial summaries at unmatched physical scales. They suggest structural differences in hair, eyes and skin, but do not measure 3D follicle normals, BRDF, tear-film mesh, anatomical geometry, same-identity face, camera lens or calibrated skin scattering. High-key real-photo negative control clips 53% of pixel samples and is unsuitable for skin reflectance fitting. No biometrically identified/imitated human.

## Decision and next generation contract

Stop inspecting constructed digital models as photographic ground truth. Do not patch or optimize MIRA05 or this new MPFB default bob/skin as though model count equals realism. Retain independent MPFB *automation harness* and rig as a foundation, but replace its default game-style eye/skin/hair/shading pipeline with **reference-conditioned multi-view hair fiber/clump grooming, anatomically/optically realistic eye and facial shading, and controlled real-photo camera/exposure matching**. Make one **complete new candidate** with measured photographic comparison and a hard manual visual acceptance, or fail with evidence and no deployment. Requires actual rights-verified scalp/face optical reference or physically measured data; until then, no assumption of physical reconstruction.

**Verdict:** new whole-human character generated SUCCESS; photorealism FAILED; production unchanged.
