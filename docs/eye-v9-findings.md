# Eye v9 source-matched contour and atlas attribution — verified findings

**2026-10-16 — experimental evidence, not a photorealism-approved repair.**

- Successful pinned real-GLB and Chrome GitHub Actions run: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38907152402
- Source SHA recorded in v5/v6/v7 generation reports; all original GLB bytes are immutable and the produced diagnostic loads the exact v7 artifact.
- Evidence ZIP: Actions artifact \`blank-eye-v9-contour-texture-diagnostic\` from run 38907152402 (time-limited); contains matched PBR, ID, UV, precise selection removal, texture-off, unlit-map and normal-only PNGs from four cameras and \`attribution.json\`.
- Engine suite: 171 PASS / 2 SKIPPED / 0 FAIL, pinned real-GLB 9/9 PASS. v9 Chrome: all four camera views and eight controlled passes succeeded. No actual Blink clip; source has idle/walk/run/wave only.

## Topology specificity

Parsed the actual indexed original face: four distinct 28-point original eye boundary loops, one inner + outer for each eye. **Exactly 224 source triangles (112/eye)** touch these loops, vs an INVALID 2,556-triangle broad v8 UV mask. The separately identified 1-ring neighborhood of eight original *upper-eyelid visible* triangle seeds contains **68 source triangles**. These two classifications are deliberately kept separate.

In the front-detail camera, two independent eye-specific ROIs centered on the projected actual source contours show:

| Counterfactual, unchanged original GLB | Left eye changed pixels | Right eye changed pixels |
|---|---:|---:|
| Hide exact 224 original contour-adjacent triangles | 27 | 26 |
| Hide 68 original upper-visible seed-neighborhood triangles | 800 | 800 |
| Disable face baseColorTexture, retain lit PBR geometry | 8,535 | 8,535 |
| Render face atlas unlit, retain texture & geometry | 8,322 | 8,352 |

Each eye ROI is 9,300 pixels, selected using actual projected original loop points plus 27-pixel X/25-pixel Y margins; a change means >8 RGB levels on at least one channel. **These are whole-crop changes, not 800 repaired red pixels.** The exact contour selection is deliberately limited and cannot be compared as a visually accepted replacement.

## Direct red-texel evidence — actual Chrome screenshots

Using source \`front_detail-unlit-skin-atlas.png\`, \`front_detail-normal.png\`, \`front_detail-no-skin-texture.png\`, \`front_detail-id.png\` and \`front_detail-uv.png\`, count saturated red-ish pixels within tighter screen boxes left [316,342,446,403], right [515,342,644,403]. A pixel was selected when unlit red channel R>125, R>1.55*G, and R>1.45*B. This classification intentionally does not claim segmentation of every affected eyelid pixel.

- Left eye: **810** highly saturated red pixels under unlit skin atlas. On exactly those positions, the texture-disabled PBR pass has median RGB roughly **(155,162,170)** rather than the original lit red **(105,48,40)**.
- Right eye: **858** highly saturated red pixels under unlit atlas. On those exact positions, texture-disabled PBR has median RGB roughly **(166,175,188)**, versus lit original median **(110,58,53)**.
- Texture atlas provenance (source \`young_lightskinned_male_diffuse\`, 1024×1024, glTF \`flipY=false\`): a visible v4/v5 lid triangle with zero-based ID 15610 has screen UV≈(0.0618,0.3798). Sample directly in the top-origin image is **(215,96,89)**, matching the unlit-render red RGB≈(213,96,90). A separate upper-eye original-face triangle 113 samples near UV≈(0.8346,0.5412), with atlas pixel (182,116,87) and unlit RGB around (186,118,90).
- Right-eye generated lip triangle 15722 shows UV≈(0.1020,0.3798) and direct atlas pixel≈(215,97,90), matching red unlit rendering. The original face in the same visible band samples reddish/dark-brown atlas areas at U≈0.835, V≈0.49.

**Strong conclusion:** The red skin-atlas base-color pixels are a **direct, necessary contributor** to the saturated red rims, not only lighting or geometric backface behavior. This is corroborated by (1) retained red in unlit texture, (2) red disappearing in texture-disabled PBR, and (3) actual ID/UV pixel samples matching source atlas colors. The prior earlier note that skin texels sampled from upper source triangle **centroids** looked ordinary was insufficient: those centroids are not the actual red rim sampling locations.

**Separate failure:** Removing red texture does not deliver realistic eyelid anatomy, believable cornea/sclera/iris, natural tear-line, or blinking. Source original face contours/upper-lid shading remain artificial. Production acceptance is still BLOCKED.

## Critical measurement limitations

- The unqualified group name "original-socket" inherited from v8 broad UV classification is STILL TOO BROAD; do **not** interpret the group's counts as anatomically verified socket pixels. v9's independently computed exact 224 contour-adjacent mask and 68 upper-seed set are the valid narrow geometry evidence.
- RGB color thresholds are a *heuristic*, and the two hand-selected boxes are not precise iris/eyelid segmentation. The experiment measures controlled pixel color disappearance, not a percentage of clinical anatomical defects.
- The texture-off pass changes skin color on the whole head; it is diagnostic only and must not be used as an actual skin-material patch.
- Mean UV of a source triangle is not per-pixel interpolation; reported red atlas samples also independently use color-encoded per-pixel UV passes.
- The glTF atlas sampler's top-origin convention was empirically cross-checked against the unlit output. Profile, 3/4 and front-detail PBR screenshots are preserved for aesthetic review.
- Renderer passes were headless Chrome software WebGL, not real Android hardware performance.

## Next bounded experimental repair — NOT IMPLEMENTED

Create a *copy-only* source-pinned atlas/UV patch restricted to the identified eye rim UV fragments rather than globally removing source skin texture. Keep all original source/GLB files byte-for-byte, 53 joints, four clips and unchanged face texture elsewhere. Quantify changed texels, unaffected skin pixels, target eye ROI counts and matched Chrome front/profile/3/4 images. Do not simply recolor iris or remove all pink facial skin. Then separate a genuine anatomical eyelid margin and cornea/iris geometry revision. Require explicit human photo-realism acceptance; no Vercel deployment.

Workflow permanently restored to manual \`workflow_dispatch\`. Experimental branch only, no production main merge.
