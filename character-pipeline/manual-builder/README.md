# Manual Human Anatomy Builder — experimental browser preview + local Blender worker

This is a fresh procedural Blender-model pipeline, not another shape-key or width-warp pass over the rejected October 18 character. Preview-branch Vercel now serves a live WebGL clay viewport, distinct from the actual Blender executor. Production Vercel remains unchanged.

## Figure seed preset (2026-10-18)

The 91-field starting preset now approximates the previously agreed full-body woman: around 28 years old, Black, medium natural build, dark brown skin and natural Afro. Baseline: 172 cm height; 40 cm shoulder width; 31 cm ribcage; 27.5 cm waist; 34 cm hip width; reduced thigh bulk (16.6 cm diameter) and glute projection (1 cm) to prevent the exaggerated hips of the rejected Blender experiment; head width 15.4 cm, depth 18.4 cm, height 22.8 cm, cheeks 0.61; Afro 11 cm, volume 1.14, curl 0.84; skin #482a20, roughness 0.56. Clay override defaults to false so the complexion is visible immediately. These are an editable reconstruction, **not measured exact dimensions from the accepted prior head or a reused mesh**.

The page now identifies the preset, loads it for new visitors and uses a versioned localStorage key (v2) to prevent earlier experiment settings from overwriting the fresh preset; Restore figure resets it. Prior v1 saved browser values are not deleted.

## Live browser preview (2026-10-18)
- Open /character-pipeline/manual-builder/index.html on the Vercel branch preview, or click the Human Anatomy Builder sidebar entry from the main Blank Engine lab.
- The figure is present on page load. Editing anatomy, color, hair, feet and fingers reconstructs visible Three.js geometry without a server or Submit click; drag to orbit, wheel to zoom. Every control remains in the validated JSON schema. Blender-only render sample count/resolution and subsurface strength are not directly represented in WebGL.
- The standalone browser preview is NOT actual Blender output and is not anatomically approved; the clay approximation will differ from Blender/Cycles.
- Vercel has no Blender executable or queue. Hosted Submit therefore exports a JSON rebuild request rather than pretending to render. On a local Node+Blender runner Submit still launches the real headless Blender job.
- External pinned Three.js module is loaded from jsdelivr, matching Blank Engine's existing use of that CDN.


## Local use

Prerequisites: Node 20+ and installed Blender 4.x with Cycles.

From the repository root, run:

    node character-pipeline/manual-builder/server.mjs

Then open http://127.0.0.1:4388. If Blender is not on PATH, set environment variable BLENDER_BIN to its absolute executable path.

The page exposes 91 named controls covering the whole body: torso/pelvis, limbs, hands/fingers, feet/toes, face/eyes/ears, afro and other hair styles, skin pigment/roughness/variation, and scene rendering. Values are edited by sliders, numeric entry, selectors and color pickers. JSON presets can be imported/exported. Current values persist in browser local storage.

**Submitting rebuild** posts all validated values to the local server, which writes the immutable settings for a unique job, then runs the real Blender executable as a subprocess without a shell. On successful completion the page shows three Blender Cycles camera views (front, 30-degree, profile), an evidence report and an editable .blend download. Job files are stored outside the page directory under artifacts/manual-human-builder/JOB_ID.

## Geometry architecture

1. A completely empty Blender scene is started. No prior .blend, character GLB, shape keys or old anatomy are read.
2. The continuous torso and pelvis surface is reconstructed from shoulder, ribcage, chest, waist, hip, lower pelvis and neck cross-sectional landmarks, including optional soft-tissue features.
3. Independently measured paths rebuild left and right hip/knee/ankle, shoulders/elbows/wrists, hands and each finger, heels/instep/arches and five individually generated toes per foot.
4. Freshly generated face geometry, eyes/irises/eyelids, lips, ears, nasal features, eyebrows and hair guides use the head and appearance controls.
5. Core skin surfaces are voxel-unioned into freshly computed topology; the editable Blender scene retains separately authored eyes, brows, nails and hair.
6. Cycles renders the three outputs; the evidence report includes counts, actual control names, render file SHA256 digests and a source-reuse=false assertion.

## Tests and acceptance

Run unit/integration tests with:

    node --test test/manual-human-builder.test.mjs

An independent real Blender baseline test can be run via the **manual-only** workflow named "Manual Blender anatomical character builder — head-to-toe". It is configured only for workflow_dispatch, with no automatic runs and no Vercel actions.

This is an **anatomical clay/proportion prototype**, not a photorealistic human. There is no licensed high-resolution human scan, sculpted pores, high-fidelity clothing, skinned armature, facial animation or aesthetic approval at this stage. The earlier head is not reused; adjustable new head geometry is created. Rendering images and passing topology tests do not certify anatomical realism.

## Deployment gate

Do not deploy Vercel or promote experimental output into production without an explicit owner instruction. Manually inspect hip/thigh silhouette, stance, hands/fingers, toes, head proportions, hairline, face and skin from matched views first.

## Anatomical basemesh replacement, 2026-10-19

The user rejected the synthetic geometry screenshot for v2 (tubular neck and torso, impossible facial anatomy, joint seams and unrealistic hair). V3 now begins with the genuine CC0 MakeHuman hm08 basemesh. Source: `makehumancommunity/mpfb2`, pinned commit `3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf`, file `src/mpfb/data/3dobjs/base.obj`, SHA `d26635e9326e3cca30778fd7b9c00062b03cce09`. The original OBJ explicitly declares CC0 (2020 Data Collection AB, Joel Palmius, Jonas Hauquier).

A deterministic converter keeps the original `body` group (13,380 body vertices, 26,756 triangles) plus L/R eye helpers while excluding all rigging and clothing helper faces. 710 KB JSON stores native-space indexed coordinates; browser uses the original contiguous body surface and morphs its vertices via smooth local masks. No manually assembled body primitives. Small iris/pupil spheres and instanced afro clusters remain separate. The user-approved head has NOT been imported; facial realism needs independent review.

The 91-field schema persists. Browser deformation implements only a subset (including height, body proportions, some limb and facial adjustments, hair, skin and light); remaining Blender-only controls are saved/exported and are not falsely claimed to affect WebGL. Hosted Submit exports JSON; it does NOT launch Blender. Mocked Three.js lifecycle test checks repeated finite-coordinate updates, not actual pixels. Original source provenance is preserved; production deployment remains unchanged.

## V4 — complete browser control wiring and authentic MakeHuman macro targets (2026-10-19)

Two new controls bring the declared schema to **93** (`blank.manual-human-builder.v2`): `body.gender` (feminine / androgynous / masculine morphology) and `appearance.population` (African / East Asian / European / mixed anatomical *starting references*, not a biological classification or identity). Six real CC0 MPFB2 full-body young-adult macro morph targets are pinned to `3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf` and fetched over jsDelivr CDN when loading the preview. They are interpolated over the original 13,524-index MakeHuman basemesh. The starting African feminine appearance remains the default; skin and hair can be edited independently after a preset selection. A body preset can also seed a compatible bust and silhouette, then users can override each measurement. No fake male/female toggle without anatomy.

`morph-engine.mjs` implements regional deformations for the formerly unconnected controls, including palms, fingers, nails, knees, ankles, feet, five toe-region approximations, ears, brow and chin. These are soft spatial adjustments of the continuous human base, not a fully rigged sculpt; visual validation is mandatory. Skin color, shader roughness, variation, subsurface approximation, hair appearance, eye, studio lights, background and browser resolution also update. **Cycles samples remains a Blender-only setting** and is labelled accordingly; it is not a geometry adjustment. A query `?qa=1` exposes a read-only shape/material signature and test-only values update for automation.

**Important execution boundary:** The Vercel page remains a live browser morph editor. It does not run Blender. The legacy local Blender script now explicitly refuses non-default sex/appearance morph choices because it has not adopted MPFB2 targets; silent false-positive renders are forbidden. A cloud Blender worker still needs implementation. Browser CDN connectivity must be verified per deployment; asset failure produces an explicit error.

**Provenance:** MakeHuman macro assets are independently licensed CC0; they are broad interpolated adult shape references, not exact ethnicities, race identities, gender identities, or the previous approved proprietary head. Genuine appearance variation is individual and user-editable.

**Verified baseline QA:** Headless Chromium/SwiftShader loaded six real pinned morph assets and confirmed all 93 controls can be changed: 92 produce a measurable preview change; Cycles samples is the sole Blender-only option. 11/11 Node tests pass. Mobile Appearance & morphology panel is expanded by default; actual mobile selector/persistence testing still required before release.
