# Kimi independent geometry review — recorded outcome

**Github Actions:** https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38902163444
**Model:** kimi-k2.6, non-thinking mode.
**Input:** shortened source excerpts and verified test history, **no screenshot attachments** on successful retry.
**Full original response:** GitHub Actions `kimi-eye-review` artifact (run 38902163444); the output is not a validation of claims or an accepted fix.

## Kimi's principal recommendation

Before more eye topology changes, do a **renderer-visible diagnostic**: identify contributing per-pixel triangle/material IDs, depth occlusion, actual skin atlas UV ownership and possible backface culling using matched full-face, front-macro and profile captures. Then fix only the actual cause. If source socket structure and eye construction fundamentally block realism, consider a professionally authored fully licensed replacement instead of further procedural rings.

## Model claims requiring correction before acting

- Kimi claims missing explicit `depthTest` and `depthWrite` on the eye meshes are a critical defect. **That is not established**: Three.js Material defaults both to `true`. Debug actual pixel depth rather than changing renderOrder to mask surface defects. Official reference: https://threejs.org/docs/pages/Material.html
- Kimi says v6 may not duplicate UV seam vertices. **The full v6 code explicitly constructs 112 new vertices and assigns new bridge UVs.** Kimi received truncated source excerpts and correctly identified incomplete evidence but should not be treated as proof of absent seam-splitting.
- Kimi recommends checking "blink closure" from the four authored animation clips. **The source has idle/walk/run/wave only, no blink clip or rig**; this test cannot be executed as described.
- Kimi's critique of global +Z-only facing is valid as a general caution; +Z is a specific front camera in Character Lab, **not** universal correct winding for lids in multiple poses and profile angles.
- Kimi suggests directly reading DepthTexture using `readPixels`; this is not a drop-in Three.js depth-capture implementation. Use a suitable depth visualization shader/encoded color render or supported render-target mechanism.
- Kimi's cost estimates for replacement source art are unverified and should not determine procurement.

## Engineering next test (no implementation authorized here)

1. Render mask/ID pass for source pink socket triangles vs new v4–v7 triangles vs sclera/iris (keep normal depth test and actual PBR scene).
2. Render UV-coordinate and material/atlas-source pass at exactly the same camera/pose, then compare actual texture texels of pink pixels.
3. Render depth-labeled mask and scene variants with selected geometry hidden to disambiguate source-socket occlusion from backface culling.
4. Verify front, profile, three-quarter and selected animation frames (no fabricated blink).
5. Only after attributing visible pixels, revise UV/topology/anatomical contour/eye optics and rerun real Chrome; human visual acceptance remains BLOCKED.

**Governance:** No code changes to production, no deployment, no accepted photorealism milestone.