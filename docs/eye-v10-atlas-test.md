# Eye v10: source-pinned targeted skin atlas A/B sample

**Experimental, NOT an approved photorealistic eye repair.**

## Why v10 and why atlas first

Real GitHub v9 Chrome pixel attribution (run 38907152402) found saturated red upper/lower eye-rim pixels persisted when original skin atlas was shown unlit, disappeared when the skin base-color map was removed, and matched actual reddish source skin texels at the face UVs. This is a *direct texture contributor*, separate from bad eyelid silhouette and opaque procedural cornea/iris.

This v10 candidate is deliberately **texture-only**:
- Rebuild exact pinned CC0 hero -> corrected v2 -> skinned socket v4 -> UV v5 -> transition v6 -> front-facing v7.
- Input must hash exactly 2f3b63421defe8077e14727964e05e3c159db448bbfe6b64a7adab7e23a68c05 (verified v7 GLB), otherwise abort.
- Target UV bins are extracted from **real v9 Three.js/Chrome pixels** in fixed eye boxes using ID pass, UV pass, and unlit skin atlas pass, threshold red R>125/R>1.55*G/R>1.45*B. They are stored in compressed deterministic constant in experiments/eye-v10/patch_atlas.py (305 bins).
- Because v9 UV pass uses 8-bit coordinates, every sampled atlas pixel location has uncertainty of approx ±2 texels. A feathered THREE pixel-radius mask corrects strongly saturated red in those bounded areas; the algorithm preserves R/alpha and improves G/B toward surrounding neutral skin tones.
- Only re-encode a **new** atlas PNG appended to a **copy** of the GLB. Original image bytes and all original buffer data remain preserved in its BIN prefix; face positions, UVs, weights, 53 joints, clips and materials other than image 0 pointer are unchanged.
- Local source prototype edited exactly **167 of 1,048,576 texels (0.0159%)**. This must be confirmed again in GitHub Actions, rather than assumed to improve visual appearance.

## Actual test and interpretation

GitHub one-shot experiment-branch workflow rebuilds v7; verifies source hash and untouched structural contents; creates v10 GLB and atlas heatmap; runs full engine suite and pinned real GLB tests; captures matching real Character Lab neutral face, universal-inspector macro, profile, three-quarter and mobile Chrome screenshots. A postcheck compares pixel changes >8 RGB in fixed broad left/right eye boxes and **outside those boxes**.

**Possible outcomes:**
- If no eye screenshot pixels change, the 8-bit UV-target mask is too narrow, the changed skin texels are off-screen or a different texture sampling route is in use; do NOT call it a fix.
- If a few targeted eye pixels change but pink stays, texture correction is insufficient; identify exact fragments and consider geometry/material remap.
- If all eye redness clears but other facial skin is altered, the patch fails locality regardless of visual appearance.
- Any change still requires human realism acceptance; no anatomy, cornea optics or blink solved by color balancing.

Initial auto-trigger exists **only for a single test on experiment/eye-v10-local-atlas** because the GitHub connector does not dispatch workflows. Remove trigger after inspecting run and record precise PASS/FAIL in docs/CONTINUITY.md. Permanent workflow is manual-only. No merge to main, no Vercel deployment.
