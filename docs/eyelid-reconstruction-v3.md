# Geometry Artifact v3 — topology-aware, non-destructive eyelid surface candidate

**Status:** technical prototype; visually **BLOCKED**; **not** a watertight head retopology, finished eyelid sculpt, verified 3D intersection/penetration fit, nor photorealistic character.

## Design

Geometry Artifact v2 measures real indexed mesh open-boundary eyelid contours (28 vertices per aperture, ~24.6 × 8.0 mm) and fits the sclera, iris and pupils. v3 keeps those measurements and adds *rounded* upper/lower lid ribbon meshes, each generated from the source contours and bounded offsets. The upper lip covers more of the opening than the lower lip. Each of the four new meshes is parented to the existing animated `head` joint; no source face vertices, UVs, original materials, skin weights or animation clips are rewritten. The new geometry is rigidly parented, **not separately skinned for eyelid blinking**.

The candidate uses an independent opaque skin-tone PBR material, deliberately not resampling the source's pink eyelid texture area. The replacement tone may remain visibly different from the face, and source atlas/retopology is still required for artist-quality results. New upper/lower strips are finite, triangle-validated, but **open surface sheets**. Do not claim watertight eyelids or anatomical realism. UVs on new strips are provisional; no gaze/blink bones or corneal refraction are created.

## Source contract

Pinned corrected CC0 MakeHuman hero input SHA-256: `a968567c4c61f06de8d09601bbaeba721f79d3f06d91a433968cefc7f93efcb0` (eye-corrected v2 source *before* the projected contour fitting). Other GLBs are rejected. Original 53 bone joints and 4 animation clips remain unmodified. The source is from the pinned CC0 reference documented in `docs/character-builder-v1.md`.

Build reproducibly:

```bash
node scripts/hero-eyes-build.mjs .ci-assets/suited.glb .ci-assets/hero-v22.glb
node scripts/build-eyelids.mjs .ci-assets/hero-v22.glb artifacts/hero-lid-v3.glb artifacts/hero-lid-v3.geometry.json
BLANK_EYE_GLTF_FIXTURE=.ci-assets/hero-v22.glb node --test test/eyelid-reconstruction.test.mjs
node scripts/eyelid-v3-browser-smoke.mjs
```

Use **Import character GLB** in `/character-lab/` to examine the candidate, preserving the original GLB; use the shared universal feature inspector for close-up details. Artifacts include the source hash, per-eye boundary measurements, proposed parameters, added surface counts, and explicit visual review blockers.

## Honest before/after result

On a fixed offline 720px VTK face crop using identical illumination (not Chrome or a physical Android GPU), strongly-red pixels in the eye region fell from **6183 to 2593 (~58% fewer)**. This is an image-analysis proxy, **not** an anatomy-quality score. The revised candidate still shows a residual red line, exposed rims and skin-tone mismatch. Status is `requires-visual-approval`.

Must review real Three.js/Chrome neutral face, two profiles, 3/4 and macro plus head motion; test normal direction, near-eye z-depth and UV/skin continuity. The base face is NOT retopologized; a future v4 may require direct source-geometry modification or a better authored facial asset if this overlay cannot pass. Do not quietly tune acceptance thresholds to force a pass.

**Deployment:** GitHub only. Preserve CONTINUITY.md in every implementation commit. Permanent CI manual-only. Never deploy Alpha 0.6 to Vercel without explicit consent.
