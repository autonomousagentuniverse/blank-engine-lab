# Phase 11: all-source morph and WebGL body-joint audit — 2026-10-18

**Status:** actual Chrome WebGL2 test PASS for nine active visible morphs and four sampled body/garment bones; two shape keys have *no geometry delta even in the original Blender source*. This is not a photorealism or clinical anatomy approval.

## Immutable candidate
Input is the mask-corrected glTF artifact from Blender Actions run 39143615834: SHA256 `1040b6330559865801b67ac57c293ddc07b94328cc735476ff4da47464c3399d`, 71,397,960 bytes. Reconstructed body has 10,756 visible vertices and 10,690 polygons after both genuine MASKs; one 53-joint armature, five body glTF material primitives, 11 morph slots and 3 skinbound Afro hair layers. Original packed UV-baked source blend is immutable at SHA256 `f903f4412bab7d29bdad85c31d21e576b1a6b3fbcbca8daf13c9e17dc5715fdb`.

## Actual Chrome measurements
[Chrome run 39145392398](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39145392398) succeeded with real Chrome WebGL2, Three.js GLTFLoader and SwiftShader. For *each* of the 11 exported morph channels, the test searched all body primitives for its largest morph displacement, changed the target influence and measured actual world-space skinned vertex movement. Nine channels have nonzero effects, with **no unexplained failure** among those nine. The other two channels, 0-based indices 3 and 6, have strictly zero exported delta. The test then restored all prior weights.

Actual skinned vertex displacement under rig rotations:

| Bone | Mesh where it has real skin weights | Angle (rad) | Measured movement |
|---|---|---:|---:|
| head | Visible body | 0.24 | 24.902 mm |
| spine_03 | Visible body | 0.20 | 5.186 mm |
| spine_01 | Casual-suit clothing | 0.15 | 24.130 mm |
| spine_02 | Casual-suit clothing | 0.17 | 25.281 mm |

Four of four measured bone tests passed. The body-mask reconstruction removes torso skin under the shirt, so the visible body has no spine_01/spine_02 weights; those bones correctly drive the clothing instead. The browser saved genuine neutral, single-morph (RebuiltMediumBuild_WaistHipShoulder) and head-rotation PNGs. The screenshots are diagnostic, not photographic-quality verification. Mechanical movement of one weighted vertex per bone does not prove full animation contact or cloth collision safety.

## Independent original Blender source confirmation
[Blender run 39145536078](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39145536078), Blender 4.5.3, inspected each original shape-key coordinate against its Basis in both the 10,756 visible vertices and 8,402 masked-out vertices. **Indices 3 and 6 have exactly zero delta over all 19,158 source vertices, visible and hidden.** They are inert source channels, not a lost deformation caused by glTF masking, UV baking, or browser decoding. The nine other controls are nonzero in source and responsive in WebGL. Source channel 8 has a maximum source control-point delta of ~720.45 mm at full weight, far beyond a reasonable implicit photorealism approval; constraining source morph domains is future work.

## Quality and next gates
- **PASS:** verified glTF loading, 9/9 nonzero source morphs respond, the two zero-delta source keys classified without false pass, 4/4 sampled head/body/garment bone movements, 53-bone exporter continuity.
- **NOT VERIFIED:** identical Blender and Chrome cameras and lighting, full-pose cloth/skin collision resolution, photo-based morphology and skin calibration, all-animation contact quality, full-body photorealistic identity, true independently generated one-shot character.
- Next prioritize the controls contract: flag or remove two dead shape keys only in future generator output, validate joint multiscale shape morph compatibility with clothing, and compare matched-camera Blender/Chrome visual frames before any production deployment.

Three initial test revisions were iterated rather than waived: first a test-harness array-restoration error, then an incorrect assumption that spine_01/spine_02 weights must exist on clothing-masked skin rather than the suit. Both were corrected. Successful run 39145392398 kept every original source and glTF unchanged. Both new workflows returned to manual-only on research branch. There was no Vercel or production deploy.

Browser evidence artifact ID 12143360847, source Blender morph forensic artifact ID 12143790277. Source scripts: `scripts/audit-afro-morph-body-chrome.mjs` and `character-pipeline/references/audit_visible_morph_deltas.py`.
