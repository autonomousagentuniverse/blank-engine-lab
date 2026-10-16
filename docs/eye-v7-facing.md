# Geometry v7 — visibility/culling experiment

The original Character Lab front camera is at positive Z (character-lab/hero-review.mjs), while all 448 v5 and v6 added triangles are facing negative Z. Because the skin is single-sided in the original GLB, a structural geometry PASS can still create no new front-facing pixels.

V7 flips only the 448 experiment-specific triangles to face the actual front camera and recomputes only new-vertex normals. It preserves all 15,500 original source triangles and 8,456 original normals. This is source hash locked, a separate candidate GLB, no production release.

Testing requires real paired Chrome/Three.js macro and full face front, profile, three-quarter and mobile plus GLB source and animation tests. A visible improvement does not alone certify aesthetic realism, correct side/profile surface normals, eyelid motion or corneal materials. No main merge or Vercel deploy. Remove temporary CI push trigger after evidence archived.
