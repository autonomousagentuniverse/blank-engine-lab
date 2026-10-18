# Afro hair dynamic binding: actual Blender pose audit (2026-10-18)

Real Blender 4.5.3 run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39131673597 completed successfully as a diagnostic. Artifact 12137598461 contains genuine Cycles renders (neutral front, 42° three-quarter, 88° profile, head-local Y 22° rotation), editable Blender inspection .blend, and machine-measured skin/hair root report. Original character SHA256 327befea50b2961d1ff3341fdf2e7b6bb173f7c74c09212c68061677a974b3f2 unchanged.

All 4,450 curve roots were bound at rest to their barycentric position on actual evaluated scalp triangles (376 scalp vertices; 668 triangles). Body was evaluated with ARMATURE skinning; two MASK modifiers removed only from the measurement probe. Bone-parented hair was measured in three rotated poses. Clinical yaw/pitch interpretation is not certified for rig-local Euler angles.

| Head pose | 95th percentile root-to-skin gap | Maximum gap | threshold pass? |
|---|---:|---:|---|
| Neutral | 0.000127 mm | 0.00036 mm | Yes |
| Local X +15° | 6.028253 mm | 13.45854 mm | NO |
| Local Y +22° | 10.22782 mm | 18.73221 mm | NO |
| Local Z +22° | 4.201779 mm | 12.12928 mm | NO |

Threshold p95 <=2 mm AND max <=5 mm. **Rigged follicle attachment failed all three independent rotations.** A curve parented rigidly to the head bone does not share blended scalp skinning. The neutral geometric construction pass of the previous step must not count as animated attachment readiness. The right correction is a deformation-aware per-follicle triangle/barycentric scalp anchor propagated through head motion; preserve stable NURBS parameters and measure actual deformation, rather than translate the hair object or weaken the thresholds.

Four Cycles views show a reasonably round haircut (better than previous two-prong spikes), but harsh hairline, synthetic regular curls, pale/smooth skin, unnatural bright eyes and incomplete feminine facial proportions remain. No human or photoreal acceptance. Source unchanged. Packed diagnostic inspection SHA256 c188435b6a7a7ccce355ed5d07b1da62f454f9e7e7e1980a0700dbf0051b0397. Manual-only workflow restored after run; no production merge or deployment.
