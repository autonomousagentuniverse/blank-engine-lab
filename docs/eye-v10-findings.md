# Eye v10 — source-pinned atlas-only trial: verified outcome

**Date:** 2026-10-16.
**Status:** structural and real-Chrome PASS; **human photorealism BLOCKED**, visual improvement insufficient. No production deployment or main merge.

## Provenance and reproducibility

- Experimental branch: experiment/eye-v10-local-atlas.
- Successful final GitHub Actions run: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38931272873
- Failed initial harness-only run: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38931076939 (moved browser script retained wrong relative static root and returned HTTP 404; fixed before accepted run).
- Exact original v7 source GLB SHA-256: \`2f3b63421defe8077e14727964e05e3c159db448bbfe6b64a7adab7e23a68c05\`.
- Generated trial v10 GLB SHA-256: \`567c9325181bb235ce905afe70de6bb584977a72a3dfeacb77e678b2d0f7b979\`.
- Embedded original \`Human.body\` \`young_lightskinned_male_diffuse\` PNG SHA-256 \`c6e39f920372ccfdaf0a293cdbcc9d621758fc42f298479c0690e3f7c69451cb\`.
- Trial atlas PNG SHA-256 \`d6907dd9d4159b4b30d573653fa1fc9014e50bc9a246c27d10bfc265a6f3d2a2\`.

The candidate is a copy with a new texture appended to the GLB BIN and new image bufferView; all original BIN bytes survive as an unchanged prefix, all original geometry positions/triangle indices/UVs/skin weights survive, and 53 joints/four animation clips remain. The only edited image content is green/blue channels within localized strongly red source atlas texels. Red and alpha channels unchanged.

The mask was derived from 305 quantized v9 screen-space UV bins at confirmed red eye pixels and feathered within a 3-texel radius; the final PNG changes **167 of 1,048,576 texels**, 0.0159% of atlas area. Source hash mismatch aborts.

## Actual GitHub Actions and Chrome results

| Result | Measurement |
|---|---|
| \`npm test\` full engine suite | 171 pass / 2 skip / 0 fail |
| Real pinned GLB tests | 9/9 pass |
| Actual Three.js Character Lab | neutral-pose before/after, matched detail, profile, 3/4, mobile PASS |
| Left eye fixed screen ROI (6800 pixels) | 64 changed by >8 in any RGB channel (0.94%) |
| Right eye fixed screen ROI (7412 pixels) | **0** changed by >8 (some sub-threshold differences occur) |
| Outside both eye ROIs (390248 pixels) | 0 changed by >8 |
| Left broad red-pixel heuristic | 1723 -> 1674 (49 fewer) |
| Right broad red-pixel heuristic | 1369 -> 1366 (3 fewer) |
| Human photorealism | **BLOCKED**; pink rim and artificial eyeball persist |

The image score is on **630×642 matching viewport screenshots**; broad ROI boxes are L (193,294)-(293,362), R (337,294)-(446,362), threshold >8/channel. The red pixel test uses heuristic \`R>95; R>1.4G; R>1.3B\`; it is not anatomical segmentation. The reduced red count does not mean the entire rim was healed. Outside eye ROIs 0 changed above threshold, not zero possible tiny changes. The source and candidate views show no convincing improvement on visual inspection.

**Evidence** is preserved as downloadable GitHub Actions artifact \`blank-eye-v10-local-atlas-comparison\` run 38931272873: source-pinned v10 GLB, atlas-report.json, chrome-comparison.json, v7-v10-matched-comparison.png, before/after neutral, macro, profile, three-quarter, mobile screenshots, atlas and target mask. Artifacts expire under GitHub retention policy; rebuild deterministically when needed.

## Decision

**Reject v10 as a photorealistic eye solution.** Preserve it as a bounded atlas edit demonstration. It improves some red pixels without affecting large parts of the skin, but leaves red eyelid rims and incorrect shape.

The 8-bit screenshot UV pass is too coarse to directly guide fine atlas repairs. Next avoid repeated manual tiny texel adjustments. If continuing on this asset, implement a **high-precision fragment UV and surface-material provenance test**, then construct one **contiguous, anatomically plausible original-face eyelid margin** with separated material/UV seam and properly integrated eyeball/cornea, rather than stacking strips over the original socket. Compare engineering cost with an appropriately licensed professionally modeled face. Require matched front, oblique and side visuals and explicit human approval.

**Governance:** v10 remains an isolated experiment, workflow restored to manual-only, no Vercel action and main unchanged.
