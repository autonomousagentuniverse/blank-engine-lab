# Geometry Artifact v1 — constrained, reversible shape adjustments

**Purpose.** A Geometry Artifact stores a **reproducible, local-space geometry
adjustment proposal**. It is universal across Character Builder, Object Builder,
and Scene Builder; the first measured example targets the CC0 hero's left eye
sclera and mirrors the local edit onto the right eye.

## Contract

- `schema = blank.geometry.v1`; units are **meters**; coordinate frame is
  `target-parent-local` (mesh local transform relative to its parent).
- `asset.sha256` pins the exact source asset; a different GLB cannot reuse an
  artifact accidentally. Target nodes must have unique stable names.
- `baseline` records original node position/scale and the geometry's true local
  vertex bounds. This is **measured geometry**, not inferred from screenshots.
- `request` supplies translation offset and scale multipliers.
- `limits` bounds displacement and scaling. An **optional measured envelope**
  (parent-local AABB) allows the solver to fit features within an actual opening.
  Without such an envelope, **the solver cannot certify fit or clearance**.
- `mirror` optionally applies the same correction to a symmetrical counterpart,
  reversing translation only along the chosen symmetry axis.
- `solveGeometryArtifact()` projects an edit onto feasible bounds and returns
  the solved transform, clamped axes, and visual-review requirements. An
  impossible envelope raises an error rather than inventing valid geometry.

## Character Lab workflow

1. Load the CC0 hero, pause/freeze the idle pose.
2. **Pick any detail** and tap the target mesh (for the example, the sclera).
3. Select **Create geometry artifact**; adjust translation and dimension factors.
4. Use **Preview solved geometry**; orbit/inspect the surface close-up.
5. **Undo preview** restores original transforms exactly. Export saves the
   measured artifact + proposed solution as a `.geometry.json` sidecar.
6. Import the sidecar on a matching GLB to reproduce its proposal. Changes
   to the live mesh are **not baked into the GLB**.

## Known limitations and safety gates

- Version 1 solves bounded local translation/scale, not arbitrary remeshing,
  UV unwrapping, eyelid topology, collision-aware deformation, or skinned
  vertex weight edits. These require a future topology-aware solver.
- Bounding-box fit is a *necessary but insufficient* geometric check. It is
  not evidence of realistic anatomy, silhouette, or lack of mesh intersection.
- The first sclera sample is a **proposal**, not a fixed eye. Its eyelid opening
  envelope is explicitly unmeasured. Iris/pupil/catchlight have separate nodes;
  they must be aligned together in a later grouped-shape artifact.
- Exported data is not automatically uploaded or persisted to PostgreSQL.
  User-owned GLB bytes never leave the browser during geometry inspection.
- Review at front, profile, and three-quarter close-ups before approving or
  baking any topology or geometry corrections.

## Tests

Run `node --test test/geometry-artifact.test.mjs` then `npm test`.
The automatic CI workflows remain disabled; only manual test workflows are
permitted. No Vercel deployment should occur until the major Alpha 0.6 release.
