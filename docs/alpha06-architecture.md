# Alpha 0.6 architecture visual and performance milestone

The Night Market tower footprints and collision shapes remain unchanged. The renderer adds deterministic storefront entrances, roof silhouettes, instanced windows, side-facing windows, and shared physically based facade materials. Generated windows are capped per building to limit draw calls, and building silhouettes vary by seed and index without introducing new gameplay geometry.

## Acceptance checks

1. `npm test` tests deterministic bounded facade generation, footprints, and entrance clearance.
2. `node scripts/architecture-browser-smoke.mjs` checks real Chrome/Three/Rapier, night/day screenshots, mobile-sized HUD, and draw call ceiling (250 for the 10-building Night Market demo).
3. Photos from software-rendered Chrome allow visual assessment but **do not** establish mobile FPS or photorealism. This is a geometry/detail foundation, not a substitute for independently authored buildings and full character assets.
4. Materials continue to use the licensed CC0 pack when available, with procedural presets as the fallback. No Vercel deployment is performed.

A future phase must benchmark sustained frame pacing, device temperature, texture residency, and scene fidelity using physical Android hardware.
