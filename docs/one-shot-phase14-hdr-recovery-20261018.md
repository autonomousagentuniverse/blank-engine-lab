# One-shot Cycles portrait recovered from Phase 14 saturation (2026-10-18)

## Actual output

Successful real GitHub Actions Blender 4.5.3 [run 39153621026](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39153621026), artifact **12146386000**, `blank-one-shot-from-failed-neutral-blender`. A **single Blender invocation** ran a 32-bit, scene-linear OpenEXR neutral reference under the original three Blender DISK lights, reloaded the original immutable Blender scene, and generated a new three-quarter Cycles portrait. This is a rendering exercise using **our prior synthetic MPFB-derived character**, NOT a new anatomically constructed adult woman.

- Immutable input .blend SHA256: `a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570`, verified before and after; unchanged character body (10,756 visible masked vertices), 53-bone rig and authored 560/270/400W disk lights.
- Real HDR patch `neutral_reference_scene_linear.exr`: SHA256 `c6f8caa6c1b4ba11773e7ce2f1f36cf91e4d19ceaabde19f96615d016a782f28`, 2,227,279 bytes. Scene-linear 18% reference sample median **2.243257** and max **2.319613** in the independently sampled ROI; no clipping to PNG 255 during calibration.
- Calculated source-exposure setting **−3.3500195 EV** by applying `log2(0.22 / neutral_scene_linear_median)`; this is an aesthetic exposure normalization, NOT a physical lamp-power calibration or a cross-renderer photometric pass. AgX/Medium High Contrast tone transform.
- One actual new 23-degree orbit, 960×1280 PNG `one_shot_last_failed_character_3quarter.png`, SHA256 `c6ea8386a6cec14aebdea2c032953dde0f7580c3205c1a9dafc6718a4dfd91a6`, 1,091,039 bytes, 48 CPU Cycles samples, 0% nearwhite channel clipping, 3.74% all-black image pixels.
- Editable packed derivative `one_shot_camera_exposure_variant.blend`, SHA256 `a22ec6a5623952c66624b22cb68ab7d3e27c24b92ee50f7a7833efc650be9131`, 32,166,416 bytes.
- Report `one-shot-report.json`, measured image and input checksums archived with the artifact.

## Failures and fixes during the real run

First run 39153426177 failed **after successful HDR sampling** due to falsely assuming Blender object traversal order equals scene light list order; fixed using source lamp names. Second run 39153524550 failed **after successful HDR sampling** on incorrect Blender 4.5 AgX look identifier `Medium High Contrast`; fixed to `AgX - Medium High Contrast`. Third run 39153621026 fully **SUCCESS**, verifies actual PNG, EXR, packed .blend and unchanged source SHA. All fixes are in one-shot script `character-pipeline/references/one_shot_from_failed_neutral.py`. After test, temporary workflow `.github/workflows/experimental-one-shot-failed-neutral-once.yml` was restored to **manual-only** in commit `ce5f0b35a0d7ac4663ad3f611cb4a28227d4d5c6`.

## Visual verdict and decision

Image is a believable **new Cycles output file** from the exact existing character, not a repost. Exposure failure is recovered; **human photorealism is NOT achieved**. The subject currently reads visually masculine rather than our specification of a realistic 28-year-old adult Black woman, with synthetic skin, simplified eyes, artificial hairline and poor facial likeness. The generator is not independently reconstructing new anatomical identity; one-shot success is **one-invocation render pipeline only**, not one-shot creation of a new photoreal human. No app merge, WebGL light calibration or production deployment. Next substantial work should target anatomy/sex-consistent facial reference and face geometry via an independently controlled character-generation pipeline rather than repeatedly adjusting lighting/texture of the inherited character.
