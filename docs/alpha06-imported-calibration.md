# Alpha 0.6 — real imported-avatar proportion calibration

The importer normalizes character height, but an ankle joint is **not** the contact sole. Previously IK targeted ground Y+0.035 for the ankle, making footwear sink into the floor.

The loader now measures each ankle in the normalized Three.js skin pose against the rendered geometry floor, clamps the offset to 0–0.4 m, and passes that offset through the world-space planted-foot lock. Imported characters therefore preserve distinct ankle-to-sole distances; the Rapier body and collision step remain untouched.

Verification: `npm test` includes distinct .12 m/.27 m ankle corrections, stance invariance, invalid offsets, and safe clamping. `scripts/avatar-calibration-smoke.mjs` exports two synthetic self-contained rigged GLBs (Mixamo-like tall, Blender-like compact), imports each through the real GLTFLoader, calibrates legs, verifies world-space planted locks, jump release, and arm reach bounds. `scripts/browser-integration.mjs` imports both GLBs through the same browser file input, verifies UI feedback and 3D physics under movement and jumping, then restores the procedural character.

Limitations: Bounding-box sole calibration may be distorted by hanging props, long capes, or non-standard bind poses. Clamp prevents catastrophic offsets; feet still need visual review with production assets and mobile testing. Headless Chrome is not a human aesthetic or device-level acceptance test. Do not deploy this milestone separately; the release is manual Alpha 0.6 only.
