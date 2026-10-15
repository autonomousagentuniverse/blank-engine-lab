# Alpha 0.6 motion polish (development only)

## Scope
- World-space left/right stance contacts persist across moving animation bones.
- Stride phase derives from physical horizontal distance and is shared with procedural skin animation.
- Contacts release on swing, jump, invalid ground or anatomical overextension without relocating the locked point.
- Upper/lower IK overlays the post-animation pose; Rapier body remains authoritative.
- A right-hand contact calibration targets robot/lantern/gate geometry with a bounded arm reach, distinguishing a reach gesture from physical contact.
- Imported GLB clips crossfade with motion-specific times; walk/run phases align without changing clip playback speed.
- The character faces its movement vector **before** applying post-animation IK.

## Explicit limitations
- Procedural gait contact is approximate, not authored foot contact curves; it needs device-level tuning.
- Surface radii are approximate object geometry; no per-triangle hand grip constraints or fingers.
- Imported humanoid skeletons with incomplete arm/leg chains safely skip unavailable IK.
- Browser screenshot/CI cannot certify device-specific touch latency, animation aesthetics, or realistic cloth/hair.

## Verification
- `npm test` for pure reducers and regressions.
- `node scripts/motion-real-smoke.mjs` with actual `three@0.186.1` and `@dimforge/rapier3d-compat@0.18.0`.
- Existing `node scripts/avatar-real-smoke.mjs`, `node scripts/ik-real-smoke.mjs`, `node scripts/browser-integration.mjs` after installing real libraries + playwright on CI.
- One manual Vercel release only after the user approves Alpha 0.6.
