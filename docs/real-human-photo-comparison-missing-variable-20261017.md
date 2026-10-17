# Missing variable from real-human portrait comparison — 2026-10-17

## Hypothesis (strongly supported, not yet experimentally established)

**Missing generator variable: anatomy-conditioned, multi-scale spatial covariance in geometry AND appearance.** In simpler terms, biological detail must vary coherently by anatomical region, identity, its physical neighbors, direction of growth, light and forces. It must not be either uniformly procedural or globally randomized. This is not one tunable scalar. It is a coupled conditional field of constraints, or more formally an approximate subject-specific joint distribution P(geometry, reflectance, hairs, eyes | identity, region, pose, gravity, illumination).

## Real human photo comparisons (not pasted into repository; links and credit only)
- Unsplash / Dmitry Reshetnikov, blonde headshot, published 2025-12-04, https://unsplash.com/photos/young-woman-with-blonde-hair-and-blue-eyes-GkrZdibvTh8 . Inspect local hairline, brow stroke direction, eye-lid structure, skin highlight changes. Licensed under Unsplash License; source portrait may be professionally processed.
- Unsplash / pure julia, close-up fair-haired woman, published 2020-10-21, https://unsplash.com/photos/womans-face-in-close-up-KdYpzgsP4Ns . Inspect differentiated brow/skin reflectance and naturally varied fine detail. Camera and light unlike MIRA05.
- Wikimedia Commons / Grauvision, `Female eye close up.jpg`, 2009-04-19, https://commons.wikimedia.org/wiki/File:Female_eye_close_up.jpg (CC BY 4.0): iris fibers, limbus, eyelash direction, nonuniform wet lower lid and tearline, sclera veins, high-frequency eyelid skin.
- Comparison on original MIRA05 front and macro (artifact 12108680073), 2026-10-17 one-shot four-angle contact sheet (artifact 12115146750). MIRA05 look: hair volume shaped like symmetrical triangular curtain, aligned downward tips, flat eyebrow blocks/fibers, shallow iris/lid junction, waxy generalized skin response, nearly mirrored left/right features.

These photos provide *qualitative structure observations*, NOT controlled pixel metrics or a claim the different subjects should look alike. Different illumination, camera, retouching and styles confound raw brightness or freckle counts.

## Literature cross-check
- Tang et al., `Single-View 3D Hair Modeling With Clumping Optimization`, IEEE TVCG 2025, https://gapszju.github.io/ClumpingHair/ : high quality strands require coherent guides and clumping, not root counts.
- Epic Games, `Digital Humans`, https://dev.epicgames.com/documentation/ar-ar/unreal-engine/digital-humans?application_version=4.27 : subject-scanned spatially varying albedo/specularity/scattering/roughness/normal maps; eyes have complex interdependent cornea, iris, eyelid/meniscus occlusion and shaders.
- Weyrich et al., 2006, measurement-based reflectance of 149 faces, https://cseweb.ucsd.edu/~henrik/papers/skin-analysis/ : spatially varying BRDF, diffuse albedo and subsurface response.
- USC Institute for Creative Technologies, facial microgeometry https://vgl.ict.usc.edu/Research/Microgeometry/ : skin specular reflection depends on measured and synthesized region-appropriate microtexture.
- François et al., `Image-based modeling of the human eye`, IEEE TVCG 2009, https://pubmed.ncbi.nlm.nih.gov/19590107/ : iris layer morphology and scattering, corneal refraction/caustics.
- Quantitative facial asymmetry, 100 subjects (2013), https://pubmed.ncbi.nlm.nih.gov/24406564/ : real symmetric-looking faces retain small 3D deviations (population RMSD ~0.80 ± 0.24mm), not a demand to inject arbitrary asymmetry.

## Code-specific findings
- MIRA05 `build_hair` source-aware ROOT placement; nearly all tips still share x+=side*dside*t^.72; z-=length*t^1.30. New limited diagnostic: 12-bin xz projected tip-direction entropy 0.37183; 93.856% in only two bins. Hair orientation distribution requires *local* comparisons at multiple scales, not the global entropy target as a universal standard: some actual straight styles genuinely have low angular spread.
- MIRA05 `build_brows`: analytic arch and 3-point near-parallel filaments, not mapped follicle field.
- MIRA05 `eyes`: four 31-point projected curves + shader edits, retained original eye shells, not true multilayer lid/eye anatomy. No physically verified wet rim, blink closure or canthi.
- MIRA05 `skin`: source UV maps plus uniform 560-scale procedural noise and globally set subsurface weight, not measured region-specific coupled material fields.
- MIRA05 `identity`: mirrored |x| cheek/jaw masks and tanh horizontal term, smooth source-derived symmetric variation. Small real asymmetry needed when justified by an individual model, not independent random offsets.
- Shader forensics confirmed active color assignment; lighting reduction degraded skin while failing hair luminance proxy; supports joint optical calibration not global knob tuning.

## Full one-shot falsification experiment
Use rights-verified multi-view photo/scan reference for ONE coherent subject OR independent anatomically credible source. Generate a COMPLETE character in one call under existing fail-closed controller. Test three strictly isolated upstream strategies with same source, pose, camera and lighting:
A. current uniform source-derived generator;
B. same geometry plus random jitter/pores/colors (negative hypothesis control);
C. *anatomy-conditioned spatial fields* for 3D scalp hair guide/clump hierarchy, brows, eyelid/tearline/iris, facial asymmetry and region-specific skin material map.

Record before beauty passes: per-region hair orientation/curvature, tip/strand clump topology, collision and scalp coverage, eye-lid clearance/contact and blink, brow direction/density gradients, UV/material spatial correlation, facial symmetry landmarks, and independent evidence-bound source SHA. Render matched front/3q/profile/eyes and use blinded paired human realism assessment vs A/B and reference. Also run hair vs face light material ablations. Do NOT define success based on any one entropy threshold or make photographs a substitute for riggable 3D evidence. Do NOT use random noise as an end in itself, and do NOT accept a source identity copied from an unrelated commercial photo without rights.

**Current status:** Hypothesis + source/photo comparison only. No new generator algorithm implemented, no experiment C performed, no new person approved, no release/deploy. Next milestone is implementing C and testing against A/B with actual Cycles evidence.
