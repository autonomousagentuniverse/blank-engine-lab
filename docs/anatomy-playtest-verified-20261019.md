# Blender-generated human in Blank Engine — verified playable integration
Date: 2026-10-19
Branch: experiment/anatomy-blender-cloud-worker-20261019
Status: **ENGINE INTEGRATION PASSED / HUMAN LOCOMOTION VISUAL QUALITY BLOCKED**

## Source-level failure fixed
The editor declared `loadBlenderHumanFromJob()` but never invoked it.
Consequently the play-test URL continued showing a procedural fallback avatar
despite a working WebGL scene. The startup now waits for the asynchronous
default Night Market scene rebuild, then fetches the authenticated generated
`animated_character.glb` through the same-origin anatomy job endpoint.
The game exposes the real Rapier actor state, position, horizontal speed,
ground contact and foot-lock state when running a Blender play-test.
Anatomy play-test camera distance is reduced to 8.5 world units.

## Genuine verification
- The actual Blender-generated GLB imported into Three.js with 15 mapped
  bones, 1 skinned mesh, 4 IK chains and authored Idle, Walk and Run clips.
- 360 fixed simulation steps exercised walking, running and returning to idle,
  without a physics exception; Rapier and grounded IK operated.
- Desktop Chromium: generated human imported via the job handoff, real
  keyboard movement and run state, turn, release back to idle. Actual actor
  displacement was measured; no browser page errors.
- Mobile Chromium (393×852): same generated GLB imported, Rapier active,
  on-screen forward control entered Walk and physically moved the character,
  then returned to Idle. Example observed x≈-0.55, z≈-1.13,
  horizontal velocity≈2.51 world units/s.
- The real browser test uses locally pinned Three/Rapier modules to prevent
  CDN stalls in test infrastructure; deployed site still uses its normal
  pinned imports.
- Focused Node regression suite: 39 tests passed.

## Remaining blocking issues
- A screenshot of the Night Market scene still shows a small dark human
  silhouette. Lighting, hand geometry and skinning are not photo-realistic.
- User-reported unnatural gait is **NOT fixed** by wiring up Rapier/IK.
  Foot contact, actual gait timing, root travel and transfer of weight
  require human-reference validation and further changes.
- The 22-bone Blender armature yields 15 mapped humanoid role bones
  in the imported character. This is not lossless full-body retargeting.
- No external mocap license/provenance has been secured. Do not represent
  procedurally generated gait as measured human walking.
- No production promotion; verify the protected preview live from user
  device before acceptance.

## Next acceptance milestone
Perform visual gait comparison against authentic walking footage, add
planted foot/root stride calibration, inspect animated knee/hip/arms from
multiple camera angles, and demonstrate the same movement on a second
differently proportioned humanoid.
