# Quality-first one-shot orchestrator (architecture revision)

**This is a fail-closed replacement for the MIRA-05 build-green / human-look-bad pattern, not a new approved human generator.** Actual anatomy, materials and geometry are still produced by Blender modules; the orchestrator coordinates and stops those modules when their evidence is inadequate. Nothing automatically approves photorealism or deploys.

## What changes in the one-shot design

Prior: source -> run 6 separate arbitrary parameter/geometry functions -> successful Cycles renders -> save packed blend. Checks counted 12,500 hair curves, 2,600 eyebrow fibers and 10 files but ignored the obviously pale helmet/curtain, visible scalp, weak brows, washed eyes and copied identity.

Now: **source rights/provenance and semantic target -> calibrated studio material response -> source-measured geometry and physical constraints -> real same-camera four-view Cycles preview -> human-reviewed image evidence -> separate Three.js parity -> explicit external deployment authorization**. On failure, keep stage evidence and block later integration, not another unbounded self-repair loop.

The file `quality-gates.mjs` is a functional deterministic stage machine. It fingerprints the plan/source and checks evidence files against SHA-256 on each promotion. It insists on **all six anatomical subsystems** in construction evidence (hair, brows, eyes, skin, identity plus source), rather than counting hair splines alone. It tests scalp coverage, guide direction distribution, head collisions, measured contact/intersection, source UVs, facial lip continuity and FACS preservation. Front/three-quarter/profile/macro Cycles comparisons are tied to camera names and actual file hashes. A separately authored human review must approve eyes, hair, brows, skin, facial identity and overall impression for **those exact four images**. Real WebGL parity is a later gate; `release_allowed` remains **false regardless of outcome**, and no code changes production.

**Important measurement caveats:** The software cannot guarantee that numbers describing "scalp coverage", "direction entropy" or human-review signatures are truthful; trusted Blender probe implementation must produce and be audited with images. The example thresholds are **provisional operator-defined screening parameters, NOT scientifically validated photorealism cutoffs**. The stage machine never asserts realistic hair just because it passes metrics. External human reviewer attestation is presently a recorded declaration, not a cryptographic identity signature. Source-derived CC0 characters cannot be automatically reclassified as independently sculpted original humans.

## Running it

```bash
node --test character-pipeline/one-shot/quality-gates.test.mjs
node character-pipeline/one-shot/cli.mjs validate my-character-plan.json
node character-pipeline/one-shot/cli.mjs init my-character-plan.json /tmp/new-human-run
node character-pipeline/one-shot/cli.mjs submit /tmp/new-human-run /trusted/calibration/evidence.json
node character-pipeline/one-shot/cli.mjs status /tmp/new-human-run
```

The `init` command checks the **actual source .blend hash**; the provided example deliberately fails until replaced with an actual rights-cleared file. A stage `submit` with missing files, wrong source, uncalibrated brightness, missing scalp coverage, unreviewed preview, or an attempt to skip directly to integration exits nonzero without advancing state.

Calibration requires an authenticated `light_sweep` from the same source/camera and actual lit-vs-emission hair luminance, then checks against the **plan's provisional ratio limit**. MIRA05 measured 177.0 vs 60.4, ratio ~2.93, so a plan with provisional max 1.8 will **correctly block** the real historical failure. The user/artist can select their own tolerances and should review comparative images; the ratio alone does not establish physically realistic hair.

## Real stage-0 lighting test (no new face)

The separate Blender script `lighting_probe.py` opens the exact frozen, SHA256 verified integrated MIRA05 .blend from [run 39051879470](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39051879470). It compares original studio key/fill/rim illumination against 35% and 10% studio light energies, with the same original hair BSDF, source meshes and camera. The world remains unchanged. Three fresh Blender processes avoid earlier bpy segfaults. The four material A/B images from [run 39058571227](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39058571227) provide magenta pixel segmentation and a dark-emission reference. `measure_lighting.py` reports actual hair brightness and central face brightness for each setting. This determines whether lowering lights solves the hair color **without destroying the skin**; it does not change the saved character or authorize promotion.

## Bounded future construction

The next generator implementation must produce authored growth fields, multiple shape families, collision/coverage probes and actual scalp mask imagery. Hairline silhouette and brow patterns require qualitative review as well as numeric checks. Don't retry MIRA's same 7-point downward drape with different strand counts. If the face/asset foundation fails after two properly controlled structural batches, choose a higher-quality, rights-cleared source rather than indefinite repairs.

No linked GitHub action in this branch deploys, merges, or changes production.
