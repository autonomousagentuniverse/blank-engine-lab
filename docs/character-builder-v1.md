# Blank Engine Character Builder v1 — isolated hero lab

## Scope
Standalone `/character-lab/` inside the current Blank Engine repo. Character Builder owns appearance, rig diagnostics, motion previews, material editing and asset-package validation. It does **not** own Night Market quests, terrain, object placement or scene generation. See `character-lab/character-spec.mjs` for the package contract.

## Realistic reference character, licensing
The reference candidate is **suited.glb** from [vsim's asset library](https://github.com/kunalkushwaha/vsim/tree/3f97faf85e46d2f9a122b0a8b8d3ccc0af598f91/packages/assets/library), generated with MakeHuman/MPFB CC0 components. It contains a separately skinned outfit and skin textures, with authored animation clips. The upstream manifest credits the MakeHuman system assets as CC0. Pinned source Git blob is `95033d30a4b4bab4a4a0ce3eb176a4ce7d73d0b5`, bytes `6675064`. The script checks the complete binary against that Git blob identity. The character is a real asset, **not** generated geometric boxes. Verify licensing for each new third-party GLB before redistribution.

Prepare locally (requires internet, not at game runtime):

```
mkdir -p character-lab/assets
curl -fL 'https://raw.githubusercontent.com/kunalkushwaha/vsim/3f97faf85e46d2f9a122b0a8b8d3ccc0af598f91/packages/assets/library/suited.glb' -o character-lab/assets/hero.glb
node scripts/character-lab-audit.mjs character-lab/assets/hero.glb
```

Open `/character-lab/` on a local static server. The button prefers the local asset and uses pinned raw GitHub fallback when the local copy is unavailable; user-imported files are not transmitted. The asset file is ignored by Git and is not yet included in a Vercel deployment. CI archives licensed asset and screenshots for review. No unlicensed commercial character models, no secrets in the browser.

## Actual quality bar
- A realistic-looking skin and independently modeled clothing must be visible on a rigged character.
- Verify close-up frontal, side and back views and select idle/walk/run authored animations.
- No texture loss, eyes/face inversion, floating footwear, animation mesh collapse, or clipping.
- Record tris, skinned meshes, materials, unique textures and decoded bytes; compare against device goals.
- Photo-realism is **visual acceptance**, not a boolean inferred from file extension, material names, or passing unit tests. The preview uses ACES tone mapping, shadowed studio lighting and imported authored PBR maps; path-traced final stills are a separate optional pipeline.
- A GLB may have a skeleton but lack canonical humanoid role mapping. That condition is reported; integration into the world runtime is blocked until validated.

## CharacterPackage boundary
`blank-character-v1` JSON exports schema, license, source, asset filename, SHA-256, rig and performance diagnostics, clip names and physics intent. It references the original GLB and never embeds arbitrary executable code. This does not yet persist the binary to PostgreSQL, nor is an object/scene builder implemented by this milestone.

## Testing and release policy
Run `npm test`, `node scripts/character-lab-audit.mjs <asset>`, and `node scripts/character-lab-browser.mjs` with pinned Three.js/Playwright. Evidence includes real screenshots from desktop and mobile-sized Chrome. **No Vercel deployment.** After the one-time integration run passes, remove the transient automatic push trigger and retain a manual workflow.

## Optional Cycles photoreal still

The realtime Three.js lab is a WebGL asset viewer, not a ray/path tracer. To assess photoreal materials under ray-traced studio lighting, run `blender -b --python scripts/render-character-cycles.py -- character-lab/assets/hero.glb artifacts/character-cycles.png` locally or in a dedicated offline rendering runner. This Blender render has not been run by the base browser CI workflow; only its syntax is checked without Blender. Visual review of the resulting PNG is required before claiming a photoreal hero.
