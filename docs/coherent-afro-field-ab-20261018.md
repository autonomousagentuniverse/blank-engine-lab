# Coherent Afro hair-field: live Blender geometry and A/B visual review (2026-10-18)

## What changed
Rebuilt all **4,450** previously scalp-attached NURBS strands from an **88-guide** neighborhood-conditioned growth field instead of individual scalp normals and random upward vectors. Root coordinates inherited from exact scalp triangle barycentric sampling are unchanged. Each guide produces a spatially smooth direction, compact length and clump-level curl phase; individual strands have only small secondary deviations. Global soft ellipsoid cap prevents long upward spikes. Input is prior packed experimental .blend SHA256 `79d09a8a44ad0ed27300a37203196551f4ad0267e181ab743f28fa43f4d1a4cc`. No facial/body identity or topology modification.

## Real verified execution and provenance
[GitHub Actions 39130834258](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39130834258) success on Blender 4.5.3. Artifact **12137039400** contains immutable prior spiky render `face_previous_spiky.png`, candidate real Cycles `face_coherent_afro.png`, editable packed `afro_woman_coherent_field_candidate.blend` and measured `coherent-report.json`. Render SHA256 `e42d02eee714bc15dfd567aa5be0a9d3ddd2c7535ceb11856fd7f5ffe215eaa6`; new .blend SHA256 `327befea50b2961d1ff3341fdf2e7b6bb173f7c74c09212c68061677a974b3f2`.

| Construction check | Result |
|---|---:|
| NURBS strands rebuilt | 4,450 |
| Shared guide sites | 88 |
| Scalp vertices / triangle faces | 376 / 668 |
| Max source root-to-scalp triangle gap | 0.000247 mm |
| Max root position movement | 0.0000149 mm |
| Median nearest-neighbor shared guide cosine | 0.99824 |
| 95th tip Z before / after | 1.85741 m / 1.83063 m |
| Candidate highest fiber-tip above max source root | 56.71 mm |

Geometry numbers alone do not establish human-like curl distributions. Very high neighboring direction coherence could indicate overregularity rather than biologically realistic variation.

## Visual outcome: concrete improvement, NOT photoreal approval
**Visible improvement:** Previous split, twin-spiked Afro is replaced by a rounded, dense, short hairstyle and clears much of the face. Both images use the identical saved Blender camera, light setup, materials, body mesh and clothing, so difference is hair construction only.

**Remaining defects:** Curls are too uniform and compressed into a helmet-like dome. The actual skin remains smooth and pale, iris and cornea/eyelid transitions look bright and artificial, and original face and body still lack photographic realism. A single neutral camera is insufficient for release; no scalp deform/animation binding proof or side/back profile review. We must not promote this as owner-approved photorealism or a newly generated independent person.

## Next meaningful system experiment
Test head rotation/scalp-following follicle contacts and matched 3/4/profile renders; then add a controlled multi-scale neighborhood clump field with measured curls, scalp hairline growth directions and optics sourced from real textured hair references. Continue eye/surface BRDF and geometry in ONE full-person pipeline before claiming photoreal output. No separate cosmetic shader-only patches. Manual-only CI workflow following this test, no Vercel changes.
