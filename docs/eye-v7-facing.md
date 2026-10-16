# Geometry v7 — visibility/culling experiment

The original Character Lab front camera is at positive Z (character-lab/hero-review.mjs), while all 448 v5 and v6 added triangles are facing negative Z. Because the skin is single-sided in the original GLB, a structural geometry PASS can still create no new front-facing pixels.

V7 flips only the 448 experiment-specific triangles to face the actual front camera and recomputes only new-vertex normals. It preserves all 15,500 original source triangles and 8,456 original normals. This is source hash locked, a separate candidate GLB, no production release.

Testing requires real paired Chrome/Three.js macro and full face front, profile, three-quarter and mobile plus GLB source and animation tests. A visible improvement does not alone certify aesthetic realism, correct side/profile surface normals, eyelid motion or corneal materials. No main merge or Vercel deploy. Remove temporary CI push trigger after evidence archived.
## Verified GitHub result — 2026-10-16

GitHub Actions run [38896437213](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38896437213) **SUCCESS**: source-locked v6 input, +Z-facing 448 experimentally generated triangles, original base face data preserved, full engine regression and real GLB fixture PASS, and real Three.js headless Chrome A/B screenshots.

In the matched eye-region screenshot crop x=185..445, y=280..365, **3.946% of pixels changed** by more than 8 values in any RGB channel. The v5-to-v6 experiment had 0% change in the equivalent crop. This supports the backface culling diagnosis; however, the eyes remain visibly artificial and pink at the rims. Human approval **BLOCKED**.

The v7 candidate is an isolated diagnostic GLB, not a visually accepted repair. Further experiments should classify persistent red/pink texel ownership, eye material/iris optics and lid surface silhouette before permanent design changes. A front-facing winding change is not proof that new profile or animated poses are anatomically correct. Temporary one-shot push trigger removed; only manual workflow_dispatch remains.
