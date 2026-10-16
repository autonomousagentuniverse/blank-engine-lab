# Eye v8 pixel attribution: findings (2026-10-16)

**Evidence:** Successful GitHub Actions workflow https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38904733444, artifact blank-eye-v8-surface-attribution. 171 full-regression PASS, 2 SKIPPED, 0 FAIL; 9/9 pinned real-GLB tests PASS; actual Three.js/Chrome front, profile and three-quarter image and pixel-ID passes saved. Human visual acceptance BLOCKED.

## Narrow eye-box results

From the original full-frame front_macro-id.png (each original face triangle has a separate RGB ID) and front_macro-normal.png. Source triangle codes are 1..15500; experimental v4/v5 face triangles 15501..15724; v6 bridge 15725..15948; procedural eye objects use codes at/above 100000.

| Eye screen box [x1,y1,x2,y2] | Original face | v4/v5 lip | v6 bridge | Procedural eye |
|---|---:|---:|---:|---:|
| Left [382,347,465,401] | 4056 | 156 | 1 | 269 |
| Right [497,347,579,401] | 4002 | 156 | 0 | 270 |
| **Both eyes (8910 screen pixels)** | **8058 (90.44%)** | **312 (3.50%)** | **1 (0.01%)** | **539 (6.05%)** |

These rectangles cover both the natural eyelid and parts of the face. The counts are screen-space ownership, NOT the fraction of pixels that are necessarily defective or pink. Nonetheless they show that v6 added bridging geometry contributes virtually nothing to the front-facing rendered eye area, even with source skinning and normal depth tests.

## Actual original face triangle IDs and atlas ownership

Original GLB primitive base uses Human.body PBR material, whose baseColorTexture 0 is named young_lightskinned_male_diffuse (PNG, 1024x1024). Top visible triangles near the left upper eye include 248, 242, 249, 264 (zero-based GLB triangle indices); top right upper eye triangles include 7999, 7993, 7998, 8015. Their positions are centered near x±0.034m, y=1.827..1.830m, z=0.15..0.167m. Mean skin UVs around U=.822..825 and V=.53..56 (left) and V=.47..50 (right). New v4-v7 geometry does not own these pixels.

The source skin atlas at example coordinates (U=.823,V=.54) contains RGB (223,168,136) under direct image orientation. That establishes real original skin texture ownership but does NOT prove a particular texel causes the reddish-looking rim under lighting; normal/tangent shading, depth, surface overlap and filtering remain competing causes.

## Initial broad filter error: invalid as eyelid-specific test

The automatically labeled original-socket candidate mask in the first v8 diagnostics selected **2,556** original face triangles using broad source UV/position bounds. The diagnostic screenshot with those triangles removed also deletes much of the forehead, cheeks/nose and mouth; it is NOT a surgical eyelid-only mask. Therefore its reported ~40,196 changed screen pixels are **not valid proof** of how many pixels the eyelid socket itself creates. The wide 450×250 front ROI also includes more than just the eyelids. We explicitly reject any claim based on that number.

More modest comparisons in the wide ROI, using the actual render variants: hide generated lid triangles changed 297 pixels; hide procedural eyes changed 539; double-sided change affected 259. These are camera/crop-specific facts, not global anatomical guarantees.

## Outcome and next experiment

**Proven:** original skinned face triangles dominate both eye boxes; source PBR material and atlas still drive the visible region; new v6 geometry is essentially not visible. The geometry and render infrastructure works. Human realism still fails.

**Not proven:** redness is exclusively the atlas image rather than normals/material physics, which exact eyelid surface topology will fix realism, per-pixel bilinear texture sampling under all glTF transformations, or quality of eyelid occlusion from other cameras.

**Next:** isolate the exact source triangle IDs around a narrowly defined anatomical lid contour and verify their screen-space depth, UV sampling, face normals and texture texels using a non-destructive indexed debug pass (not broad face masking). Then test one reversible contour/material change against the original and require human acceptance. The low-detail opaque procedural eyeballs remain a separate optical/material problem.

No changes to the original GLB, the engine on main, or live Alpha 0.5 Vercel. This is isolated experimental evidence; any workflow auto-push test trigger is to be removed after QA.
