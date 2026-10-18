# Phase 12 — exact-source-camera Blender vs Chrome comparison (2026-10-18)

## Evidence and immutable sources
Real GitHub Actions [run 39147475141](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39147475141) **SUCCESS**: first actual Blender 4.5.3 renders, then Google Chrome with Three.js GLTFLoader and WebGL2, then Python/Pillow pixel analysis. Original MASK-corrected synthetic MPFB-derived character Blender packed source SHA256 `a1c38165ae2d8d100e04919e4e57b35623ac9fabc1b0d2cb44bdfb7829fef570`, exact GLB SHA256 `1040b6330559865801b67ac57c293ddc07b94328cc735476ff4da47464c3399d`. Both checked before rendering and neither source nor geometry altered. Artifact 12144290123 includes Blender and Chrome original-color PNGs, independent white-silhouette renders, pixel differences, paired comparison and camera/light transform JSON. All files 720x960. The GLB remains fully skinned with 53-joint rig and nine nonzero source morphs.

## Method — source-pinned camera, no post-registration
Read actual saved Blender orthographic camera `CAM_face_closeup` and its `view_frame(scene)`. Orthographic local frame left/right = ±0.267375, bottom/top = ±0.3565, clipping 0.05–100, width/height 720×960. Convert the camera's full `matrix_world` to glTF Y-up using the known basis rotation `(x,y,z)→(x,z,-y)`. Inject camera matrix and identical view-frame extent into real Chrome `THREE.OrthographicCamera`, **without** best-fit alignment, pixel translation, automatic crops or rescaling. Render all visible meshes as white emission (Cycles) or white MeshBasicMaterial (Three) on black backgrounds. This isolates raster geometry from lighting and shader differences.

## Actual results
| Test | Measured |
|---|---:|
| Whole visible silhouette IoU | **0.990318 (99.03%)** |
| Blender mask pixels | 291,426 |
| Chrome mask pixels | 292,981 |
| Intersection | 290,782 |
| Union | 293,625 |
| Pixel disagreement | 2,843 |
| Blender binary silhouette bbox | [0,208,719,959] |
| Chrome binary silhouette bbox | [0,208,719,959] |
| Hair-region IoU (x155–565,y195–420) | **0.987774** |
| Head-region IoU (x170–550,y200–590) | **0.991601** |
| Torso-region IoU (x0–720,y590–959) | **0.989824** |

The pre-established silhouette acceptance criterion ≥0.90 is **PASS**. Note the closeup portrait crops shoulders and lower body at the image boundary, so this is NOT a whole-body, multi-angle or animation-wide silhouette validation. Root hair skinning, five mask-respected body primitives, GLTF structure and browser body bone deformation were separately tested in previous phases.

## Color and lighting: NOT matched
The new Chrome camera is identical to Blender's source camera, **but the light transport and color-management models are not**. Saved Blender scene uses three **AREA** lights Edge_rim 400 W, Soft_fill 270 W, Soft_key 560 W and Cycles pathtracing; the Chrome diagnostic approximated them as three low-intensity PointLights plus HemisphereLight. That is deliberately **not** radiometrically matched, and the Chrome PBR preview appears dramatically darker. Raw foreground RGB mean absolute differences were **[138.48, 134.49, 132.88]** of 255 across visible silhouette intersection. Regional raw MAE: hair [65.5,58.65,57.28], head [95.99,83.38,80.39], shoulders/torso [154.37,153.6,152.48]. Treat these as **diagnostic differences only**, not calibrated material-color error or a passed/failing physically matched light model; the lights themselves differ. Source photo-real human likeness remains visually poor: synthetic hairline, eyes, skin and identity.

## Next decision
The geometry export and exact-view camera mapping are now independently proven at the neutral portrait pose. The next separable engineering task is **light/shader isolation**, preferably compare flat unlit material base-color in both engines before any physically grounded conversion of Blender area light sizes, directions and radiant power into Three.js emissive RectAreaLights / color-management controls. Do not tweak lights just until a score passes; document units, conversions and neutral-material calibration. Also test additional head/profile/full-body cameras and source morph/cloth contact before approval. No production deployment, no user visual quality approval. Workflow returned to manual-only after diagnostic run. Machine evidence stored in GitHub workflow artifact.

Code: `character-pipeline/references/audit_matched_camera_reference.py`, `scripts/audit-afro-matched-camera-chrome.mjs`, `character-pipeline/references/compare_chrome_cycles_projection.py`.
