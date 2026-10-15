# Alpha 0.6: real-material art QA

## Curated artwork and legal provenance

Five independent Poly Haven CC0 textures are referenced by verified asset IDs in `materials/catalog.mjs`; source links appear there. Poly Haven source material is CC0; the Poly Haven **live API** additionally requests provider credit and a custom User-Agent. The offline builder supplies that header, and the editor credits Poly Haven. No secret keys are required.

## Offline preparation

Run `npm run materials:prepare -- --out . --resolution 1k` with an internet connection. Optional: `--only asphalt_02` to create a minimal test pack. Each selected asset downloads three 1K maps using the official `/files/{id}` API: Diffuse to sRGB albedo, `nor_gl` for linear OpenGL normals, and `arm` for packed occlusion/roughness/metal channels (red/green/blue). Maps are local files under `/library/{id}/`; the manifest pins downloaded bytes and SHA-256 and verifies source MD5 where given.

## Browser and mobile limits

- Only same-origin files from the manifest may load. File paths cannot be arbitrary URLs.
- Dimension/transfer/GPU limits enforced by the existing compressed-authoring importer.
- `metersPerTile` adjusts existing UV coordinates in place; it does not rebuild geometry or Rapier.
- Textures remain session-only. The manual asset pack is not yet persisted to PostgreSQL or included in Alpha 0.5.
- Do not label the result photorealistic until it passes side-by-side day/night and physical-phone review.

## Validation

`npm test`, then on GitHub runner prepare one real asset with `node scripts/prepare-material-library.mjs --only asphalt_02 --out .`, and run headless Chrome material import. Capture before/after screenshot and reject gameplay resets or WebGL errors. Archive the actual licensed binaries and manifest as CI artifacts; do not auto-deploy.
