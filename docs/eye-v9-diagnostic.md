# Eye v9 — exact-source contour and texture-vs-shading diagnosis

**Status:** isolated experiment; NOT a photorealistic character patch and NOT production.

## Motivation

GitHub v8 real Three.js scene and GLB demonstrated original face triangles own 90.44% of two front-eye screen boxes. v6 bridge owned 1 pixel; pink rims remain. However, v8's first broad "socket" mask accidentally removed forehead and mouth, so it cannot be used as anatomical causal evidence.

## Experiment

v9 uses the *indexed original source face primitive*, restricted to its first 15,500 original triangles. Each boundary edge occurs exactly once; the experiment finds four 28-vertex loops (one outer, one inner per eye), then selects only source triangles touching those loop vertices. Preflight on the exact archived v7 GLB: **224 source triangles total, 112 per eye**, compared with v8's invalid 2,556-triangle broad mask.

It separately selects a **one-hop neighbor set** around eight prominent visually observed original upper-lid triangle seeds: 248, 242, 249, 264, 7,999, 7,993, 7,998, 8,015 (zero-based source triangle indices). Contour-adjacent and upper-lid sets are kept distinct; seed selection is not a claim that every selected triangle is pink.

Under identical real Three.js skinned GLTFLoader poses, depth and lighting, render for front full, closer front detail, profile, and three-quarter:
- Normal textured PBR.
- Original indexed triangle/object ID and UV passes.
- Drop **only** exact 224 source contour-adjacent triangles (copied index buffer, never original file).
- Drop **only** original upper-seed 1-ring neighborhood triangles.
- Original face PBR **with skin base-color texture disabled** (lighting and normal geometry unchanged).
- Unlit skin texture **without PBR light response** (geometry and texture retained).
- Face normal-material visualization.

Project source eye contour coordinates to the actual camera and measure per-eye pixel ownership/changed-pixel counts at each view using bounded contour-aware screen ROI. Report all selected source triangle IDs, original source positions, mean UV, geometric/shading normal alignment, sample texture texels at both V interpretations with sampler-orientation caveat, and explicit visual limitations.

## Passing gates

Structural: exactly four 28-point contour loops, exactly 224 source contour-adjacent triangles, reasonable bounded upper-seed count, no engine or source GLB mutation.
Render: source-pinned v2→v7 rebuild, 171 test regression, nine real GLB fixtures, 4 camera views × 8 passes, triangle-ID coverage within each precisely projected eye region.
Scientific: shading and texture counterfactuals interpreted as *tests*, not proof without matching actual rim pixels; no broad whole-face socket erase, invented blink, or false performance claim.

GitHub Actions uses a one-shot push trigger on the disposable experimental branch only, then must revert to manual-only workflow dispatch in a dated continuity commit. Vercel and production main remain untouched.
## Verified outcome — 2026-10-16

Successful source-pinned run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38907152402, with complete archived PNG and JSON. The highest-confidence finding is direct skin atlas redness at the visible rim. Disabling the face texture turns the saturated red area neutral; rendering the atlas without lighting leaves it red. Source texture sample pixels match their depth-tested visual counterparts. Geometry removal alone is much less effective and also exposes holes. See docs/eye-v9-findings.md for measured per-eye counts, exact UV coordinates and source-ID examples. Human photorealism NOT approved. Manual workflow_dispatch only.
