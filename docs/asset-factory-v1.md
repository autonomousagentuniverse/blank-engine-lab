# Blank Engine automated Blender Asset Factory v1

**Goal:** assets created and validated by code, not a human opening Blender. **Deployment is always separate and human-authorized.** Owner request 2026-10-16.

## Current automated template

\`asset-specs/einar-head-v1.json\` is a schema-checked, immutable, license-checked job using the official Blender Studio CC-BY Einar v1 source. Source archive SHA256 is \`3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7\`; attribution is **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.

One command runs the complete sequence on a prepared GitHub runner:

\`\`\`bash
python3 experiments/asset-factory/build.py --spec asset-specs/einar-head-v1.json --execute
\`\`\`

For contract validation without expensive Blender/Internet:

\`\`\`bash
python3 -m unittest discover -s test_asset_factory -v
python3 experiments/asset-factory/build.py --spec asset-specs/einar-head-v1.json --plan
\`\`\`

Stages are fully headless, deterministic from job specification and pinned source: download publisher ZIP, verify original hash and extract the 63 original images, invoke Blender python API to copy evaluated head/eye/cornea/tearline/eyelash meshes, derive GLB-compatible PBR skin/eye **albedo** and now original **einar_skin.roughness** source map, embed all three PNG maps, generate GLB, fail-closed GLB texture/geometry integrity check, unchanged engine regressions, actual Chrome Three.js WebGL2 five-view screenshot capture and contact sheet. Full command logs and per-stage status/error/build hash written as a JSON build manifest. Every step is observable and stops the pipeline on failure.

This is **automatic asset preparation** from a high-quality licensed source, not automatic photorealistic imagination or manual sculpting. It is the first asset-factory adapter for Einar; arbitrary asset sources, other character identities, Object Builder and Scene Builder templates are not yet implemented. All unsupported spec types, unknown source, missing source roughness, missing eye/skin albedo, unsafe asset IDs, unsigned licenses or auto-publication are rejected.

### Explicit visual and engineering boundaries

The sample output is a **static** real-time Einar head. It does **not** create scalp hair curves/cards, preserve animation or blink morphs, reproduce Cycles film-level SSS/displacement/normal shader parity, or establish real-device Android FPS. None may be asserted as PASS based on a successful factory run. This v1 improves PBR realism by transferring a genuine publisher-authored roughness map instead of a fixed roughness scalar. It does not claim that alone achieves the user's photo references.

The output state is **READY_FOR_HUMAN_VISUAL_REVIEW**, never "approved". All real WebGL views and complete asset manifest are archived, not deployed. Human approval and later automated hair/normal/blink modules are independent gates.

### Operations and future scaling

The workflow \`.github/workflows/blank-asset-factory-v1-manual.yml\` initially includes a temporary scoped experimental push trigger for a one-time actual Actions test because connector workflow dispatch is unavailable. It MUST be removed immediately afterward; permanent mode is workflow_dispatch only. **No automatic Vercel deploy** or change to production main. Only assets and logs are produced by the job; future service API/queue endpoints should enqueue the same schema-validated deterministic job, not authorize production release.

The long-term planned chain is:

- Spec/intent → authoring agent → validated source identity/license/budget
- Headless Blender model/retopology/material baker/hair cards/blink rig → versioned GLB assets
- Deterministic topology/UV/skin/morph/license validation → Three.js close-up QA and browser/device benchmarks
- Independent human visual approval → optional explicitly authorized major release

Do not pretend stages 2-4 are complete for every asset or that CLI orchestration alone creates missing anatomy.

## First real CI run and acceptance (2026-10-16)

https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38956247113 completed SUCCESS. Seven automatic build/check steps, all three genuine texture maps (skin albedo, iris albedo, authored skin roughness), source-derived 12-mesh GLB, full regression and five real WebGL screenshots archived. Deterministic manifest ID `4c7f728f4c6121b5`. This is an automated **conversion and validation** template, not general character generation. Visual reference **REJECT**: patchy overlapping face surfaces and no hair/blink or source SSS. Full files and next investigations: docs/asset-factory-v1-findings.md. CI now manual workflow_dispatch for job scheduling only; internal asset creation remains automatic. No production deployment.
