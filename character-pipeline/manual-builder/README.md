# Manual Human Anatomy Builder — experimental browser preview + local Blender worker

This is a fresh procedural Blender-model pipeline, not another shape-key or width-warp pass over the rejected October 18 character. Preview-branch Vercel now serves a live WebGL clay viewport, distinct from the actual Blender executor. Production Vercel remains unchanged.

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
