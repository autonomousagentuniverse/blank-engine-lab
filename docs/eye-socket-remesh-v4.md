# Geometry Artifact v4 — skinned facial eye-socket modification (experimental)

**Status: NOT VISUALLY APPROVED.** This is a reversible, source-locked candidate for
our MakeHuman/MPFB CC0 suited hero. It is not an automated photorealism fix.

## Why v3 was insufficient

The actual source face contains **two UV-split 28-vertex contours around each eye**.
One follows the visible outer skin seam, another the interior socket surface.
V3 added rigid head-parented surfaces on top, leaving the original material,
geometry and seam visually unresolved. V4 **edits a copy of the original
skin-weighted `base` glTF primitive** instead of adding separate lid meshes.

## Exact changes

- Detect both source loops by index topology, vertex location and UV island.
  Reject any unrelated GLB rather than guessing contours.
- Recess only existing **front-facing inner-socket vertices** within narrow
  measured head bounds, up to 2.7 mm, with a smooth radial falloff.
- Extend the existing body skin mesh by 112 inherited-weight vertices and 224
  connecting triangles (two rings per eye). Uses original skin material and
  locally inherited UVs/normals, rather than a flat colored eyelid decal.
- Recess the eight sclera/iris/pupil/catchlight nodes together by 1.2 mm;
  preserve their head-bone ancestry and the four authored source animations.
- Preserve all input glTF binary bytes as a prefix; new body accessors and
  topology are **append-only to the output candidate**. Never overwrite source.
- Record a SHA-256-pinned `.geometry.json` with measured contour identities,
  parameter bounds, affected vertices and explicit review limitations.

## Run

```sh
node scripts/hero-eyes-build.mjs raw-suited.glb hero-v22.glb
node scripts/fit-hero-eyes.mjs hero-v22.glb hero-eye-fit-v2.glb v2.geometry.json
node scripts/build-eye-sockets.mjs hero-eye-fit-v2.glb hero-eye-sockets-v4.glb v4.geometry.json
BLANK_EYE_V4_FIXTURE=hero-eye-fit-v2.glb node --test test/eye-socket-remesh.test.mjs
```

Run the manual GitHub v4 workflow for real Three.js + Chrome captures. The
output GLB is **a candidate**, and the original remains the undo source.

## Mandatory failures and release gates

- The inner aperture remains open, and original UV islands may still expose
  red/pink texture regions. This does not add blink, eye wetline, refraction
  or anatomical facial topology certification.
- Compare exact frontal eye macro, full face, both profiles and three-quarter
  neutral views under equal lighting. Verify clips, mesh deformation and
  face/eyeball overlap, then inspect on a physical device before approval.
- Face and original skinning continuity **must** be checked visually; the
  unit tests only establish bounded correct data changes.
- No Vercel deploy or new automatic workflow after one-time QA is complete.
