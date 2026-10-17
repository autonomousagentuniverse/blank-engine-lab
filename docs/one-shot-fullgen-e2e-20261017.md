# One-shot full-character integration: real Blender test — 2026-10-17

**Execution:** [GitHub Actions 39070111223](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39070111223), **SUCCESS** (technical workflow).

**Artifact:** `one-shot-complete-human-generated-quality-gated`, GitHub artifact id `12115146750`, size 54,342,015 bytes, expires 2026-10-24 UTC. Archive includes an editable packed Blender .blend, four genuine Cycles 700x700 32-sample PNGs, two reports, plan and gate state.

**Code branch:** `experiment/one-shot-full-gen-e2e-20261017`. Workflow was returned to `workflow_dispatch`-only immediately after the test was launched, cleanup commit `59f4c253cb1ccb9685b96ea9120c121e23cbc9f1`. No Vercel deploy or release action.

## Actual hypothesis and method

Test whether the last implemented `refactor/one-shot-quality-first` controller could be connected to an upstream full-character Blender construction operation **without partial character patch jobs**. The selected already-existing source-derived upstream was the `MIRA05` `integrated` mode from pinned experiment commit `43ceb2869df0419ed3989c3d3ccc849084ff6902`, invoked **once**, starting from the verified packed MIRA03 CC0 Vitruvian-derived head (SHA256 `1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d`). In one Blender process, it produced the head identity morph, eye/eyelid contact, scalp hair, brows, skin shading graph, and preserved facial blendshapes. It is **not** an independently originated human anatomical generator. It deliberately reuses the known failing old generator as an integration *test fixture*, not a newly designed realistic human solution.

The legacy six-mode report marks integrated-only as `PARTIAL_RUN_SAVED_FOR_RESUME` because the other five diagnostic variant modes were intentionally not executed. The independent integration workflow requires exactly the single `integrated` variant and confirms an editable packed output. Do not conflate legacy variant batching with the one-pass constructor invocation.

Generated packed Blender file SHA256: `e7a659789e174494eb3311070b1e476c4e3a38f08c7466c5d0612c72c1cb1fac`. Full Blender source ancestry retained. Character contains 12,500 scalp hair curve splines, a separate `MIRA05_IndividualBrowStrands` curve object, native eyes, skin and expression controls.

A subsequent non-editing render process produced four genuine Cycles PNGs, each 700x700 at 32 samples:
- front `0e65a9ce76cfedfe5e8c1fa48c1941280cfa5f3dadd63ab626bb7751f411c665`
- three_quarter `930166e8bb7ed97b6d81a746ea2fe43dddb8d490a5603c06c70a84e84b798718`
- profile `5b084f9509685c589ed8dcd74a183ce4a8910c83d57b69f85444cd914fcf54af`
- eyes_macro `5680df1c0e21e10292dcb408b783e468f985ac475e418ecc41bdcd06c0c9a88d`

All four image SHA-256 hashes were checked from actual PNG bytes. No GLB/WebGL parity test in this job.

## Real outcome

- **Full-character one-pass generation: PASS (technical, CC0-derived old constructor).**
- **Four real Cycles views: PASS (technical).**
- **Controller regression: 14/14 PASS.**
- **Generated asset source + plan linked, quality controller initialized: PASS.**
- **Controller status: `BLOCKED_PENDING_CALIBRATION`; phase index 0; `release_allowed=false`.** There was no submitted real fresh light/emission calibration evidence for this newly produced blend, no human approval, no WebGL parity, no release.
- **Hair directional entropy test:** 12 angular buckets measured from the 12,500 actual root-to-tip curves: `0.37183` normalized (counts `[0,398,5802,5930,370,0,0,0,0,0,0,0]`). This is below the **provisional**, not scientifically universal, quality construction threshold `0.65`. Construction gate was **not** separately advanced; predict a reject if that same measurement were submitted under its contract.
- **Photographic visual assessment: FAIL.** Real front, profile and eye macro screenshots still show the prior MIRA05 pale curtain hair, nearly uniform strand drape and straight ends, flat/pink eyelid interfaces, simplified reflections/iris and sparse flat-looking brows. The output is effectively a regeneration of the previously rejected source-derived character, **not a new convincing human**.

## Required follow-on (no patch loop)

The original owner instruction remains: **one request -> one full character generation -> stage validation -> human photographic acceptance -> WebGL parity -> separate release approval.** Future implementation must build/replace the *upstream complete-construction generator* with source-aware follicles and hairstyles, correct native eye contact, rooted brows, physically calibrated skin and rights-verified anatomical foundation **within one coherent asset generation pass**. No separate hair-only MIRA05 patches; do not announce this as solved by passing the controller or by regenerating rejected source art.

**Status:** Complete technical integration test, visual acceptance blocked, no major release, no Vercel deployment. Source and evidence in the above branch and workflow artifact until expiration.
