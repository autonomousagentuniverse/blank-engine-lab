# Blender Anatomy Builder â€” Motion biomechanics and clarity corrective pass

Reported by actual phone screenshot: Jog in place lacked weight transfer,
limbs appeared disconnected from realistic locomotion, and video was grainy.

## Root causes

- Root pelvis translation was authored in local bone coordinates; intended
  vertical Z bob became scene-Y drift. Verified by a Blender sampled-pose
  probe showing root motion translated the hips horizontally.
- Gait prior generated uncoordinated sinusoidal thigh and shin rotations.
  It did not solve knee angle to reach a meaningful ankle trajectory.
- Previous Cycles preview used 2 samples per pixel, maximum 360px height,
  and 13 8fps frames. Upscaling magnified heavy Monte Carlo noise.

## Tested fixes

- Convert intended world vertical root translation to root rest-local
  coordinates before inserting Blender keyframes.
- Analytical two-segment sagittal knee IK based on height-scaled bone
  lengths, forward swing/ground-facing stance, ankle clearance, pelvis
  vertical loading, counter-swing and arm adduction.
- Evaluate actual posed Blender ankle positions at 17 frames for left and
  right feet separately. Require grounded ankle stance within 2.5cm
  of target, swing movement exceeding 4cm, and reject horizontal hip
  drift from incorrect root coordinate systems.
- Render at up to 640px tall with at least 12 Cycles samples (up to 24)
  per pixel. Enable per-view-layer and scene Cycles denoising.
  Encode 17 video frames at 12f¶»§q«^