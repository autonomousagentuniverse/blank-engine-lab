# Alpha 0.6 slope + IK release QA

The calibrated low-angle ramp uses one shared physical transform for Rapier and Three.js. Contact raycasts measure slope normals for humanoid ankle rotation. Rapier remains the authority for player motion.

Acceptance tests: all regression tests; real Three/Rapier slope raycast and IK smoke; Chrome canvas, Rapier state, movement, skin switching, and day/night command verification. Visual foot sliding, steep inclines, realistic models, and hand contact require an interactive human playthrough.

**No Vercel automatic deployment; major Alpha 0.6 release requires explicit manual approval.**
