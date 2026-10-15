# Blank Engine Alpha 0.6-dev — physical character foundation

## Risk-first engineering

This slice integrates a **GPU-skinned procedural character** with a **kinematic Rapier capsule**, fixed-step movement and two dynamic crates. The game/quest editor stays a static, client-side experience; no server credentials are delivered to the browser.

- Real deformable skin weights: four independent two-bone limbs (`THREE.SkinnedMesh`, skeleton bind, weighted vertex attributes). Idle/walk/run/jump/fall animation state is driven by physics state, not a free-running video or keypress-only animation.
- Physics: `@dimforge/rapier3d-compat` pinned to 0.18.0 and loaded asynchronously as a browser module with embedded WASM; static building colliders, ground plane, removable locked gate, kinematic player capsule with character controller and two dynamic pushable crates.
- Frame-rate-independent locomotion: a 60 Hz fixed tick, capped accumulator, gravity, jump rising/falling and land detection. Physics collision is authoritative once Rapier loads. Simplified deterministic collision is used only while WASM is unavailable. The HUD clearly reports `PHYSICS: RAPIER`, `PHYSICS: LOADING` or `PHYSICS: FALLBACK`.
- Character appearances: `explorer`, `amber`, `obsidian` selected from a safe allowlist; local browser persistence; **prototype color/material skins only**. Photoreal character assets, artist-authored PBR maps and glTF retargeting are future tasks, not claimed capabilities.
- Touch controls: JUMP button; desktop Space jump, Shift run and WASD movement; E quest interaction. No change to validated GameSpec schema version 1.

## Test and QA plan

Run `npm test`. CI-only real integration: `npm install --no-save --ignore-scripts three@0.186.1 @dimforge/rapier3d-compat@0.18.0` followed by `node scripts/physics-real-smoke.mjs`. This tests the physical pipeline using the real libraries in Node, not a mocked adapter. Browser GPU verification and a human mobile playthrough remain necessary before any **major Alpha 0.6** deployment.

No auto deploy is configured. **Vercel deployment remains manual and requires explicit approval for the major release.**
