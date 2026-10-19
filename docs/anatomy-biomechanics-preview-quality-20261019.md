# Blender animation: gait biomechanics and preview clarity (2026-10-19)

The user’s mobile screenshot showed a stiff, floating jog and noisy render.

## Corrected in real Blender

The previous root-height channel was applied in armature-local Z, accidentally moving the pelvis along world Y. The root displacement now uses the inverse bone rest matrix to move vertically in world space.

Walk, Jog and Run use two-segment sagittal knee inverse kinematics, separate grounded stance and lifted swing targets, pelvis lowering/bobbing, opposite arm swing and shoulder adduction, plus ankle and toe rotation. These remain *in-place procedural motions*, not true measured motion capture or physical collision simulation.

The evaluated Blender ankle joints are tested independently for both legs at 17 phase frames. The test rejects stances floating more than 2.5cm above the ankle floor target, swing clearance below 4cm and unintended horizontal hip drift.

At 172cm stature the measured clearances were 6.66cm Walk, 12.24cm Jog, and 17.42cm Run. All three pass the numeric gait gate. **This does not certify foot-sole collision, realistic dynamics, or muscle behaviour.**

## Clarity

The former preview used 360px image height, 2 Cycles samples/pixel and 13 video frames at 8 fps. The revised preview uses up to 640px, 12–24 Cycles samples/pixel, scene and render-layer denoising, and 17 frames at 12fps, with H.264 output. Video height and sample settings are disclosed next to the selected animation. The default 24-sample build can take several minutes for nine clips.

## Verification

- Blender 5.0.1 completed nine 460×640, 12-sample animation clips and an editable character, with max source-vertex coordinate deviation about 6e-8m.
- Separate Blender rig-pose test confirms correct stance, clearance and hip stability for each side.
- Node 18/18 regression tests.
- Real local HTTP POST completed all nine clips, exposed gait metrics and denoise metadata, and downloaded H.264 video, GLB and Blender files.

Remaining: planted-foot IK, balance/force simulation, anatomy-aware corrective deformation, realistic toes/feet and externally sourced mocap validation.
