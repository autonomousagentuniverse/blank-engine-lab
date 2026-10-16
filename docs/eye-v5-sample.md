# Disposable v5 eye sample (A/B diagnostic only)

This is **NOT** a production eye correction and is not merged to main.
Workflow: \`.github/workflows/blank-eye-v5-sample-manual.yml\` on branch
\`experiment/eye-v5-github-sample\`; manual \`workflow_dispatch\` remains after
the single-use experiment-branch \`push\` trigger is removed.

Rebuild pinned MakeHuman CC0 hero -> v2 -> v4. Then apply the sample repair
to a distinct copy of v4, preserving original face, rig, and animation.
The trial addresses **only** 224 reversed new triangle windings,
112 copied/collapsed new-ring UVs, and 112 new-ring normals.

Before promotion require actual Chrome/Three.js matched macro, profile,
three-quarter and mobile A/B screenshots plus full regression. Fixing
structural tests is **not** approval of anatomy or photorealism.
The inner socket boundary, pink atlas pixels, eye optics, blink and gaze are
still unsolved; no live Vercel deployment is authorized.

All sample results are time-limited Actions artifacts; retrieve them
from the workflow run before they expire. Do not alter v1–v4 production
Geometry Artifact modules in this trial.

## GitHub Actions result — 2026-10-16

- Run: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38893284477 — **SUCCESS** (full suite, pinned real GLB and experimental geometry audit, Chrome screenshot capture).
- Exact experimental source SHA: `23a466b2a5e21fba1b2a53b3124275994820c225a54027d5ce913f1390493618`; candidate SHA: `33c6c18869752b3378e8e372eaefcb156f2157504cda8ed65778bba956601ab3`.
- New triangles with degenerate UV and incorrect facing: `224/224 -> 0/224` for each; median oriented geometric/shading normal disagreement `140.508° -> 17.961°`.
- Pixel-difference diagnostic on matched 630×642 Chrome eye macro: only **1006/404460 pixels** changed by over 3 RGB levels (approx 0.25%); appearance not convincingly more realistic and pink socket/lid boundary remains exposed. This measurement is not an objective image-quality metric.
- **Human visual gate still BLOCKED; do not merge the v5 sample into main.** The sample demonstrates that fixing basic mesh-validity defects is insufficient. Move research to original outer/inner contour pairing, seam texture ownership and eye geometry.
- One-off branch `push` CI trigger was removed after successful capture; only manual `workflow_dispatch` remains. Original workflow artifacts expire after 7 days; regenerate by manual dispatch.
