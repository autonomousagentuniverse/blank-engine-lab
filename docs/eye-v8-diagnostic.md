# Eye v8 — render provenance before anatomy edits

**STATUS: experimental, human realism BLOCKED, no Vercel deployment.**

Built from Kimi K2.6's reviewed diagnosis (run 38902163444, response and independent corrections in docs/kimi-eye-review-results.md). The question is which SOURCE skinned triangles, texture UV islands and procedural eye components are actually visible where a pink rim persists.

The script loads the **exact generated v7 hero** with the actual Three.js GLTFLoader/skinning and normal depth-test/depth-write behavior, never mutating source GLB bytes. Original base mesh has 15,500 source triangles, then 224 v4/v5 and 224 v6 generated experimental triangles. Nonindexed copies of the geometry assign a unique RGB ID to each base triangle and object IDs to the other meshes.

For each camera (front macro, profile, three-quarter) capture:
1. Normal PBR render.
2. Per-pixel original triangle/object ID pass.
3. Vertex-color UV coordinate pass.
4. Render excluding generated eyelid triangles (source-face-only).
5. Render excluding source inner-socket triangles selected by source UV and eye-space bounds.
6. Render excluding the procedural eye components.
7. Double-sided source materials as a **reversible** culling diagnostic.

Output includes actual **depth-tested winner** ID distributions at an eye-centered crop, color-coded pinkish pixels by group (RGB heuristic explicitly labeled), their triangle IDs and mean UVs, and matched same-camera changed-pixel counts when geometry is hidden.

**Interpretation controls:** A skinned GLTF ID render with Basic materials matches geometry and depth, but is not identical to PBR alpha/material effects; the UV debug pass records interpolated coordinates, not automatically the exact atlas texel under bilinear filtering. Reclassification of red pixels alone does not prove source. Do not assert pixel origin if the ID-render validation fails or the camera/crop is wrong.

**Why:** Previous v6 added 224 faces but changed zero measured Chrome pixels. v7 flipped camera-facing winding and changed ~3.95%, without eliminating pink rims. A render attribution test should identify whether source socket triangles or the new bridges win depth at defective pixels before editing UVs or modifying anatomy.

All QA is experiment branch only. A temporary branch-only push trigger starts one real test, then is removed. Human photorealism remains BLOCKED even when structural Chrome tests pass. Original CC0 provenance, 53 joints and 4 clips are preserved. No production merge or automatic Vercel deployment.
