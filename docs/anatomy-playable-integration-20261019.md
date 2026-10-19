# Blank Engine: Blender-generated human → playable Rapier scene

Date: 2026-10-19
Branch: experiment/anatomy-blender-cloud-worker-20261019
Status: **Integrated technically; locomotion and browser-visual acceptance BLOCKED**
Deployment scope: experimental Vercel preview only; production unchanged.

## Existing engine reused rather than replaced

- `physics/locomotion.mjs`: fixed 60 Hz actor step, movement acceleration, jump/fall and motion state.
- `physics/rapier.mjs`: kinematic capsule world movement, collision, ground probes and obstacles.
- `character/gltf.mjs`: validated GLB/SkinnedMesh import, skeletal AnimationMixer and fallback motion.
- `character/retarget.mjs`: existing humanoid role mapping, rotation-only retargeting.
- `character/ik.mjs` + `character/motion.mjs`: ground-contact IK, stance-phase ankle anchoring and reach constraints.
- `editor.mjs`: existing playable Night Market with third-person view, WASD/touch controls, player replacement.

## Actual code changes

1. Exact exported MakeHuman/Blender NLA names `Idle_Breath`, `Walk_InPlace` and `Run_InPlace` now map to game's authored idle/walk/run states; jump/fall remain fallback.
2. Humanoid binding now prefers `Pelvis` over `Root` when identifying the hips; 15 roles map from the complete Blender 22-bone rig.
3. After finishing one genuine Blender one-shot build, the Anatomy Builder displays **Play-test this character in Blank Engine**. The link opens `/index.html?anatomyJob=UUID.UUID`, using a **temporary job**, not a mocked export or separately authored human.
4. Server-side `GET /api/anatomy?job=...&asset=animated_character.glb` retrieves the one job's completed GLB through Vercel Sandbox authorization; token stays server-side. Fixed allowlist (only animated_character.glb), complete-job requirement, 8 MiB size budget and glTF magic verification.
5. The existing game imports the GLB with GLTFLoader, swaps the live scene's player while preserving Rapier physics and other scene entities, enables the existing contact IK, and shows authored/fallback animation status. Failed transfers are explicit; the rest of the scene stays available. URLs are cleared after successful import. Output remains ephemeral (approximately 30-minute job window).
6. The Anatomy Builder proof-of-concept player uses reduced physical speed relative to the old non-human avatar: walk 0.37× and run 0.50× engine speeds. Authored `_InPlace` clips adapt mixer timescale to physical movement to reduce skating. This is an initial approximation, not validated motion capture or a reliable gait solution. Default avatar locomotion speeds stay unchanged.
7. Added permanent real-GLB node smoke, optional Playwright/Xvfb browser smoke, and pure API/alias/physics regression tests.

## Evidence from a REAL Blender character

- Blender 5.0.1 generated an authentic 13,524-vertex, 1.5 MB `animated_character.glb`, nine NLA animation clips, 22 bones, and complete Blender build artifacts. No externally fabricated sample GLB was substituted.
- True `THREE.GLTFLoader` import: 1 skinned mesh, 15 recognized humanoid roles, four IK chains, with authored Idle/Walk/Run clips recognized. Only Jump/Fall are procedural fallbacks.
- Actual Rapier + Three IK smoke: **360 fixed physics steps, Walk → Run → Walk → Idle**, sideways turn/change-of-heading, **194 steps with a stance lock**, finite actor/visual coordinates; no API simulation.
- `npm test`: **195 passed, 2 skipped, 0 failed** (includes four new integration contracts).
- Headless Chromium visual check was attempted with Playwright on Sandbox Ubuntu 26.04, both headless and Xvfb + full Chromium + Mesa/SwiftShader. **WebGL initialization failed** before the browser scene could load. Therefore no claim of browser end-to-end or device-level visual success; browser handoff needs live Vercel and real device verification.

## Known gaps / blockers

- This did **not** repair underlying Blender animation quality. Generated Walk/Run remain rudimentary procedural cycles, and skin, hand, hip/ankle contacts may still look abnormal.
- Physics controller and foot IK *exist*, but planted foot contact frequency alone is not evidence of anatomically correct stance, heel-to-toe gait, muscle deformation, balance, or polished transitions. Animated stride is only approximately synchronized to physical speed.
- Generality has not been visually validated on two anatomically distinct real human models. No licensed motion capture was introduced.
- Browser GLB fetch through the **actual protected Vercel deployment** has not been tested with a live job because the available automated Chrome renderer failed to initialize WebGL; production remains unchanged.
- Release gate from Phase 41 remains **BLOCKED / NOT ACCEPTED**.

## Repeat locally / CI

1. Generate real Blender one-shot from your anatomy controls, then run:
   `node scripts/anatomy-playable-smoke.mjs /absolute/path/to/animated_character.glb`
   (Requires pinned Three 0.186.1 and Rapier 0.18.0 installed.)
2. `npm test`.
3. Optional browser smoke with a working WebGL browser and Playwright:
   `node scripts/anatomy-game-browser-smoke.mjs /absolute/path/to/animated_character.glb`.
4. On experimental preview: complete Blender build → **Play-test in Blank Engine** → verify actual movement on mobile/desktop, animation clip source indicators, collision and foot contact. Retain screenshots/video and compare to a real human walk reference. Do not approve realism from the smoke results alone.

