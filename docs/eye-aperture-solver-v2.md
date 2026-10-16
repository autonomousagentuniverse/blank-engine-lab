# Geometry Artifact v2 — measured eyelid-fit system

The geometry artifact is **a source-traceable, reversible, topology-constrained proposal**, not a photorealism certification or automatic mesh sculptor. It uses the actual 28-vertex open boundary around each eye in the existing `base` skinned mesh, rather than sampling a texture or guessing from a screenshot. The original MakeHuman hero has two duplicate UV seam loops per eye, so the detector merges identical-space loops. The 53 bone joints, original face triangles, UVs, skin weights, clothing, and authored animations remain unchanged.

### Measurement and coupled solve

`geometry/eyelid-fit.mjs` reads validated glTF binary accessors, constructs ordered face boundary contours, verifies left/right symmetry, and computes the largest centered elliptical sclera projection within the contour with a **0.35 mm specified clearance**. It maps the contour center through the source head-bone rest hierarchy into each of eight eye nodes. Sclera, iris, pupil, and catchlight are placed and scaled together. This corrects the prior independent, oversized/low-positioned eyeballs and prevents their layers from drifting apart.

The solver is intentionally pinned to the actual existing MakeHuman topology: unrelated avatars produce explicit errors. An improved general solver would discover face regions semantically and account for dynamic eyelid deformation and blinking. A front-view contour fit cannot guarantee side-view eyelid sealing, realistic corneal refraction, or physical 3D clearance. The source eyelid rim **is not retopologized**. The measured artifact has a `requires-visual-review` status.

### How to use

1. Open Character Lab and load the corrected suited hero, or import the existing eye-corrected GLB.
2. Freeze the neutral pose and choose the face close-up.
3. Click **Measure and preview eye assembly**. The lab derives the actual eyelid boundaries and reloads a *temporary fitted copy*.
4. Compare front, profile, and three-quarter close-ups; export the JSON artifact or undo.
5. To create a portable corrected GLB offline: `node scripts/fit-hero-eyes.mjs source.glb fitted.glb fit.geometry.json` (requires the eye-corrected hero, not the original unrepaired MakeHuman asset).

All edits are reversible. Browser preview does not alter the original GLB source, the source is cryptographically identified by SHA-256, and the preexisting portable Geometry Artifact v1 remains compatible with other builder assets. Additional eyelid geometry repairs should be separate, visually reviewed artifacts; this solve only changes the four eye-component transforms per side.

### Acceptance gates

- Functional: validated 28-vertex boundary loops on each eye, paired symmetry, minimum 0.35 mm projected clearance, preservation of the original binary geometry, rig and clips, and browser undo/export.
- Visual: review neutral front, side and three-quarter views, inspect pink eyelid exposure and occlusion, check gaze under animation, and inspect on a physical phone. **Do not label photorealistic** until visual tests pass.

Never automatically deploy to Vercel; GitHub is the source of truth until manual release authorization.
