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
