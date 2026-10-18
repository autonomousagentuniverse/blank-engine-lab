# Phase 13 — source-albedo isolation and Blender-area-light orientation (2026-10-18)

## Verified source and experiments

Unchanged candidate is the original **MASK-respected, UV-baked**, synthetic MPFB-derived woman: packed Blender SHA256 `a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570`, matching rigged GLB SHA256 `1040b6330559865801b67ac57c293ddc07b94328cc735476ff4da47464c3399d`. Real saved Blender orthographic camera `CAM_face_closeup` was reused, no image registration, same 720×960 pixels, and the earlier 99.03% silhouette IoU remained the anatomical projection baseline. This does **not** imply photoreal human status or full-body parity.

**Blender + Chrome run [39149671952](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39149671952) passed**, artifact **12144722555** containing real Cycles and Google Chrome WebGL2 images, authored Blender light metadata, and pixel report. Blender 4.5.3 copied visible shader materials in memory and connected the authored Principled *Base Color* input directly to Emission, removing illumination/shadow/bump/specular response without modifying source file. Chrome kept the same mesh, camera, UV maps, color textures and skinning and applied MeshBasicMaterial. Material color scoring includes a documented nonneutral Blender `Standard` / `Medium High Contrast` look and non-Principled nail exceptions, so it is **not a spectrally calibrated color comparison**.

| Controlled comparison | Foreground average absolute RGB error (0–255) |
|---|---:|
| **Blender vs Chrome unlit base color** | **6.374** |
| Previous Chrome point+hemisphere approximation vs Blender Cycles | 135.285 |
| Initial rectangular AREA proxy with mistaken 180° rotation | 170.492 |
| RectArea source quaternion only (fixed orientation; same power) | **36.611** |

The low **6.374** unlit error across 290,782 identical-camera joint-foreground pixels is strong direct evidence that **texture/base-color translation is not the dominant remaining pixel mismatch**. Technical material transfer passes this test, with color-transform qualifications. The next changes belong to illumination and tone mapping, *not* further edits to the original body's skin-texture hue.

## Actual Blender light geometry and units

Blender's authored lights are not rectangles: they are three **circular DISK emitters**, Edge_rim (400 W, 1.4 m diameter), Soft_fill (270 W, 1.7 m), and Soft_key (560 W, 2.2 m). Their full transforms and orientations were extracted from the immutable Blender scene and converted once from Blender Z-up to glTF Y-up. The Three.js experiment used `RectAreaLight` with the disks' nominal width/height and heuristic `intensity = Blender_W / (pi * disk_area_m2)`. **Blender radiometric watts are not equivalent to Three.js luminous intensity units** under unknown spectrum, renderer transport and color management. This is an explicitly **uncalibrated, geometrically source-sized AREA proxy**, not a physically validated conversion or production renderer implementation.

The original RectArea render was 100% black because the source quaternion was multiplied by an unnecessary extra local X rotation of 180°. In the *orientation-only* experiment [run 39150007657](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39150007657) the same camera, GLB, materials and area-light intensities were used without that extra rotation. The real WebGL result illuminated the model and lowered mean RGB error to **36.611**. The conclusion that the extra rotation made emitters face away is supported by this controlled A/B.

**But the corrected area render is severely overexposed:** 73.82% of visible pixels hit ≥254 in at least one RGB channel; torso **91.46%**, head **26.60%**, hair **20.85%**. This still **fails** material+lighting parity. A lower average error than the previous point-light preview does not mean accurate physical illumination, because substantial highlight data is clipped.

That second Actions run **failed its reporting step** due to `ModuleNotFoundError: numpy` on the Node-only runner. The actual Chrome renders were completed successfully and archived in artifact **12144936366**. Numerical data above was independently recomputed in a separate Python environment from the downloaded genuine PNG bytes, with no image modifications. The workflow was repaired to install `numpy` and `pillow` in future manual runs but was *not* misrepresented as a successful CI run.

## Release gates

- Existing mechanical hair root movement / 53-bone skinned GLB: pass in prior audited tests.
- Same-camera neutral portrait silhouette IoU: pass at 99.03% from Phase 12.
- Authored skin and clothing base color transfer under unlit rendering: **near-match / diagnostic pass**, 6.374/255.
- Identical geometric source lamp transforms and emitter facing: **orientation error isolated**.
- Physically calibrated light source flux, circular disk sampling, color management and held-out scene/light parity: **not verified**.
- Photo-referenced believable young adult Black woman, eyes/skin/hair/anatomy, independent one-shot reproduction: **not approved**.
- Production engine integration or deployment: **none**.

## Next engineering step

Use a color-managed neutral diffuse reference target and the original Cycles scene to calibrate transfer of radiant intensity / irradiance (and confirm correct area light front face) without tuning against the character's image; account for the original lamps being DISKs, and hold out profile/full-body views for cross-validation. Compare HDR linear-light outputs before SDR tone mapping, and explicitly reject excessive clipping. Keep the source subject and body/skin materials untouched.

Evidence: `character-pipeline/references/afro-light-isolation-verified-20261018.json`; actual Blender/Chrome workflow scripts `audit_unlit_material_light_source.py`, `audit-afro-unlit-area-chrome.mjs` and `audit-afro-rectarea-orientation-chrome.mjs`. Both experimental workflows restored to **manual-only**, no deploy.
