# Real Blender Afro follicle surface A/B — 2026-10-18

## Verified execution
Source pinned SHA256 26fbbab775771a197482d7baffb89decbbf4f821dd3cfaa69fac28ee52e1fc2a; Blender 4.5.3. [Run 39129920528](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39129920528) completed SUCCESS; artifact 12137433691 preserves authentic before/after Cycles 900×1200 PNGs, original source camera, report with 4,450 per-root barycentric references and packed editable variant .blend SHA256 79d09a8a44ad0ed27300a37203196551f4ad0267e181ab743f28fa43f4d1a4cc.

## Construction difference
[Generator code](https://github.com/autonomousagentuniverse/blank-engine-lab/blob/research/human-reference-atlas-20261018/character-pipeline/references/build_surface_rooted_afro.py): one source-preserving full-hair reconstruction pass. Existing 376 scalp-mask vertices and 668 triangles, area 0.063599 square meters. Sample 4,450 rooted fibers by deterministic area-stratified triangle barycentrics; reconstruct 20-point NURBS coils. Do not copy old floating ellipse roots or shift entire hair object. Old median gap 21.1666mm and p95 48.4541mm. New median gap numeric zero, p95 0.0001mm, max 0.00025mm (floating arithmetic). These zeroes follow directly from sampling scalp triangles: they are not independent validation of natural follicle locations.

## Visual evaluation
The real after render reveals previously concealed eyes, BUT hair now forms two oversized sharply divided, vertically spiky fans. The single root-normal / slight-up vector field and frequency uniformity are inadequate; the face retains flat bright eye material and waxy pale skin. Objective geometry contact PASS; **photoreal appearance FAIL**. No human approval and no production deployment. Mask is inherited, not independently clinically certified; matching roots at neutral pose is NOT rigged, dynamic scalp-to-hair binding.

## Next stage
Replace individual independent outward vectors with scalp neighborhood conditioning: coherent guides, follicle density, curl clustering and collisions; reject unrealistic silhouettes under original Cycles camera, validate moving head attachment, and later integrate with photo-calibrated eyes/skin for a truly full one-shot character. No more temporary shader, hair object-offset or manual visual patch loops. A/B workflow returned to manual-only after run. Preserve all real failed visual evidence, not just successful root stats.
