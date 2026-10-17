# MIRA-05 vs MIRA-04: visual and code root-cause audit (2026-10-17)

**Scope:** Source-derived Blender Cycles imagery and code. No generator edit, new character approval, production merge or deployment. This is a forensic comparison, not a new photorealism claim.

## Evidence
- Original MIRA-04 successful A/B: [39047787293](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39047787293), original render archive artifact 12106925388, `docs/mira04-batch-quality.md`.
- MIRA-05 successful 10-view structural batch [39051879470](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39051879470), artifact 12108680073; source `MIRA03` original SHA256 `1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d`.
- Independent shader/color causality [39058571227](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39058571227), diagnostic branch `diagnostic/mira05-hair-material-causality`; source frozen packed .blend SHA256 `07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076`.
- Later measured lighting sweep [39066589038](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39066589038), its *Blender* job succeeded though combined job failed on synthetic unit fixture; subsequent 14/14 unit pass [39067029559](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39067029559).
- New full-integrated-generation / four authentic Cycles-views [39070111223](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39070111223), artifact 12115146750, branch `experiment/one-shot-full-gen-e2e-20261017`. Four 700x700 Cycles frames at 32 spp and `e2e-report.json`; no aesthetic approval.

## Why MIRA-05 **looks better** (confirmed visually and by actual source code)
1. **MIRA-03 inheritance**: its corrected continuous mouth/central facial seam was retained; MIRA-04 already had this partial face improvement. Do not credit all MIRA-05 progress to new face generation.
2. **Hair geometry replaced:** the original 485,440-vertex foil/card hairstyle was hidden. MIRA-05 generated 12,500 individually rooted BVH-projected scalp curve fibers. This removes large angular card artifacts and makes the head silhouette smoother, but introduces a new uniform curtain defect.
3. **Brow geometry replaced:** ~72k-vertex source brow cards hidden; 2,600 short face-projected curve strands added. These look less block-like, but also too faint and geometrically uniform.
4. **Eye overlays hidden and contact rim added:** `Eyeshadow_L/R` opaque geometry hidden; sclera tint and corneal shader changed; 124 skin-raycast points used for four fine lid-contact curves. This removes some white wedges and improves eye-region continuity, not actual eyelid anatomy.
5. **Identity+skin tweaks:** 11,748 head vertices displaced up to 10.245mm with 27 facial shape keys preserved, limited cheek/chin/jaw/nose morph; source albedo/roughness/normal UV textures retained; noise bump and SSS adjusted. Face looks more coherent without a new independent anatomical head.

## Why it **failed photorealism** (mechanistic diagnoses)
### A. Hair: root geometry is source-aware; hair *flow* is not (directly measured)
`experiments/mira05/geometry.py:build_hair` samples root positions from actual head polygons, but then derives nearly every seven-point POLY hair fiber from essentially the same lateral sweep and vertical falloff:
`x = root.x + side * dside * t**0.72`, `z = root.z - length * t**1.30`.
Uniform constant bevel radius 0.00011m, no actual strand taper, no layered clumps, gravity/contact solving, scalp collision audit, independent regional growth-field or strand-to-strand directional guide anatomy. The eye-based hairline heuristic plus a small sinusoid is not a scalp/follicle growth model.
**New direct numerical evidence:** 12-bin tip-vector distribution is `[0,398,5802,5930,370,0,0,0,0,0,0,0]`. 11,732/12,500 = **93.856%** of tip vectors fall into just two adjacent bins. Normalized 12-bin angular entropy **0.37183**, below provisional 0.65 construction target. This is a limited 2D x-z tip-vector statistic, not a complete trichology score, but is strong supporting evidence for homogenized curtain flow observed in all cameras.
**Root cause:** the generator validates strand existence/root location but not believable growth, interaction or groom topology. More strands or random color alone will not solve this.

### B. Hair color: not a missing COLOR setting (measured)
Forensic A/B verified `ShaderNodeBsdfHairPrincipled` switched to COLOR, material output connected correctly; magenta emission colors every fiber. Despite dark input (RGB approx .105,.057,.031), high visible brightness persists: previously ~177 Hair BSDF, ~148 dark ordinary Principled and ~60 dark emission in matched masked pixels. Separate light sweep at 100%/65%/32% studio levels gave hair-vs-emission ratios **2.887/2.647/2.145**. At 32%, skin cheek mean luminance retained just **82.1%** of full studio baseline, yet the experimental hair ratio still exceeds 1.8. Hence generic whole-scene dimming is inadequate; combined hair BSDF, exposure/color management, face exposure and hair-geometry response must be calibrated together. Relative contributions of actual BSDF scattering, studio lights and display transform are not yet independently isolated.

### C. Eyes: contact strokes, not eyelid/ocular anatomy reconstruction (direct code audit + image)
`experiments/mira05/reconstruction.py:eyes` explicitly **preserves original eyeball meshes** and original iris atlas. Eye changes are mainly hiding eyeshadow planes, sclera tint/roughness, cornea IOR/transmission/roughness and 4 skin-projected contact curves constructed from assumed elliptical trajectories around eye centers (124 hits). It does not solve actual upper/lower lid edge surfaces against eyeball curvature, medial/lateral canthi and blink closure, tear meniscus 3D geometry, cornea/iris optical detail or globe/recess clearance. Rectangular reflections and broad sclera visibility in the actual macro are consistent with inadequate eye/lid/light interplay; camera/light contribution not proven separately.

### D. Brows: rooted but prescribed near-parallel strokes (code + image)
`build_brows` uses 1,300 random roots per side in a narrow analytically defined arch and 3-point strokes with largely fixed outward/upward direction (constant ratio of horizontal and vertical components). Uniform fiber radius .000085m, minimal density/taper variation, no learned/annotated regional follicle growth field. Old solid brow cards are gone, but new brow strokes appear pale/sparse and graphic.

### E. Skin: inherited source shading, not physically verified photographic skin (code + image)
`skin()` reuses the same source albedo/roughness/normal maps; adds a procedural noise/bump layer at 0.000055m distance with strength .125, SSS weight .13 and source saturation/value changes. There is no verified high-frequency measured displacement/roughness hierarchy, region-specific reflectance or source-photo-matched calibration. The homogeneous pale/waxy highlights are visible; precise attribution between source maps, lighting and shader still requires controlled A/B.

### F. Identity: small bounded morph not new anatomical generation
The source is still CC0 Vitruvian-derived with all original eye shells and facial key structures. Smooth mask deformations across nose/cheek/chin/jaw can improve silhouette but cannot supply independent facial microanatomy or photoreal eyes, brows, pores, scalp. The controlled 10.245mm maximum displacement is a mechanical measure, not likeness or realism validation.

### G. Validation architecture conflated technical success with image success
Original MIRA05 success meant geometry counts, SHA, source ancestry and rendering jobs passed. It had no effective automatic photographic acceptance metric and human visual review rejected it. The later five-stage quality controller has 14/14 logic tests but the 2026-10-17 full-generation experiment only initialized state **BLOCKED_PENDING_CALIBRATION**; it has not passed calibration, construction, human acceptance or WebGL parity. Do not promote an image merely because a `.blend` was produced.

## Correct next experiment (full one-shot generation, never cosmetic patches)
- Keep the five-stage source+construction+render+human+WebGL contract.
- Replace the upstream full-character producer with an **anatomy-aware, rights-verified source or generator** that **jointly** constructs coherent face, eyelid margins/ocular surfaces, regional follicle growth/hair guide fields and clumps/taper/volume, eyebrows, calibrated layered skin and lights.
- Run one deterministic whole-person construction call. Do **not** treat MIRA05 as a required production face; use it only as a falsification test and old comparison.
- Before costly beauty rendering, validate real geometry constraints: scalp follicle regions/coverage, 3D strand guide-direction distribution across regions and strand tip/shape spread, hair/head contact/collisions; lid-margin vs cornea/sclera distances over many sampled landmarks, blink closure and tearline; brow density/flow/taper map; UV/normal/roughness integrity and source/facial rig continuity.
- Render four matched head views in Cycles with independently calibrated hair/face exposure and authentic optical material response. Reject a complete candidate if any region remains visually artificial. If accepted by a real reviewer only then attempt WebGL parity; release must remain separately authorized.
- Numerical thresholds in the controller remain provisional experimental vetoes, **not validated universal human-realism scores**.

**Conclusion:** MIRA05 improved 2D appearance largely by replacing ugly legacy hair/brow-card geometry and preserving MIRA03 face corrections. It failed because the replacements were heuristic look-alikes, not anatomically and optically faithful systems. The largest measurable deficiency is the near-parallel hair guide field; eyes, brows and skin are insufficiently modeled and not fully calibrated. The next advance is to replace the *generator architecture*, not MIRA05 image patches.
