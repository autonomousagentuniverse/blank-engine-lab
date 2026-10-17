# A/B/C full-human one-shot experiment — verified results (2026-10-17)

## Execution and integrity

**GitHub Actions:** https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39074108104 — all four jobs SUCCESS: independently constructed and rendered A, B, C in three concurrent Ubuntu/Blender 4.5.3 processes and then performed the combined evidence comparison. A first execution 39074090943 failed a missing MIRA05 module import; fixed before this validated test. Workflow returned to **manual-only** after launch; production unchanged.

**Pinned shared source:** MIRA03 CC0 Vitruvian-derived `.blend`, SHA256 `1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d`, retrieved from run 39045175123. The three candidates share the SAME anatomical source/identity. These are NOT three independently created people.

**Evidence:** each variant generated a packed editable full-character `.blend`, four real 700x700 Cycles images at 24 samples (front, three-quarter, profile, eye macro), an independently hashed report and no GLB promotion. Source and output hashes validated. Artifacts expire after seven days:
- A (baseline) `abc-human-A` 12116277257; packed blend SHA256 `9b57bc2aaa1ba0cfec213eb1035f517dfbcebf5fb43443cc85618f42bb39791e`.
- B (unconditioned jitter) `abc-human-B` 12116820767; blend SHA256 `f3a065d2cfc5785fb8e48903fd7c4435658eeb10a379333571b88f0e8b191814`.
- C (region-dependent fields) `abc-human-C` 12116068975; blend SHA256 `95ccaf48ab18e8b6028a00ff1c367874cada8125cf3816c7c71cc6f2876b3d4a`.
- Blinded comparison `abc-human-comparison` 12115943206, image `blinded_comparison.jpg`, machine-readable `comparison-report.json`. Mapping **P1=C, P2=A, P3=B**; labels were fixed prior to reviewing images.

## Condition design
- **A (control):** unchanged MIRA05 identity/eyes/hair/brows/skin generation from MIRA03 source.
- **B:** source-anchored independent bounded hair/brow curve jitter, small cheek displacement and fine-scale skin roughness noise; same root count, camera and studio lights.
- **C:** conditional, anatomy-masked smooth cheek variation, region-dependent scalp guide flow, locally correlated strand lengths and clumps, tapered strand radii, different medial/temporal brow growth, low-frequency roughness modulation. Source sockets/eye shells and optical material remain MIRA05 baseline: **NOT a fully scan-matched or physically complete eye reconstruction**. Actual hair roots stayed on the same source scalp and identical counts. All three still have 12,500 scalp fibers and 2,600 eyebrow strands.
- Applied each complete candidate in ONE Blender construction process; no per-component human patch loop. All three preserve source CC0 ancestry.

## Measured hair-direction output

| Arm | 12-bin projected x-z tip orientation entropy | Fraction in largest two bins | Mean root-tip span |
|---|---:|---:|---:|
| A | 0.37183 | 0.93856 | 0.180110m |
| B | 0.37539 | 0.93528 | 0.180254m |
| C | 0.27924 | 0.99992 | 0.155031m |

**Critical interpretation:** the 2D whole-hairstyle projected-tip statistic is NOT a photographic-realism score. C increases some local strand shape/length variability, but its global projected direction is even more concentrated because the conditioned guide field remains mostly two-way downward. Its overall silhouette and eye realism are not solved.

## Qualitative visual inspection (model inspection, NOT human acceptance)

- **P2/A:** old large triangular domed hair curtain and artificial square/straight ends; brow and eye contact still synthetic.
- **P3/B:** fine random jitter introduces frayed ends and fuzzy strands, but lacks naturally layered organized clumps and believable rooted growth.
- **P1/C:** new hair lengths/some layering and exposed ear/face outline; still symmetrical center dome, many separated straight curtain locks, sawtooth ends and weak natural follicle/volume hierarchy. Macro eyes retain flat/large sclera/iris and simplistic lid transition; skin still washed out. Despite some silhouette difference, this C implementation did not meaningfully achieve realistic human quality.
- All three preserve the original source orbital model and much of its skin shader, so eye/skin results remain markedly similar: this is a major COMMON MODE FAILURE.

**Research verdict:** Three successful technical one-shot generations do **not** establish a photorealistic human. Neither random jitter nor these simple spatially correlated equations solve the problem. Experiment C here tests only a limited handcrafted conditioning model; this outcome DOES NOT falsify all anatomy-conditioned multiscale generation or high-quality scanned-source approaches.

## Decisive next engineering requirement

The next *full one-shot* generator must move beyond procedural sinusoidal rearrangement of existing strands and inherited eyeballs. Use source-quality, **rights-verified, identity-consistent anatomical reference** with physically plausible scalp/follicle growth, guide + child hair clump hierarchy, collision/gravity, realistic eyelid margin surface wrapped to globe and tearline, calibrated iris/cornea and spatially measured skin maps/materials. Require measured 3D **regional** hair orientation, taper/clumping coverage and collision (not one projected global entropy), eyelid/globe clearance over real loops with blink closure, per-region BRDF/SSS A/B under common studio exposure, and matched Cycles comparisons. Continue requiring actual owner human visual approval before any WebGL parity, independent identity claim or deployment.

**State:** REJECT all A/B/C visually for owner photoreal standard; explicit human approval still pending/unobtained; **release_allowed:false**. No Vercel deployment; no production/main code merge.
