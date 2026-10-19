# Anatomy Builder: joint-space skinning recovery — 2026-10-19

## User evidence

The latest Walk-in-place preview displayed bent/shredded forearms, finger ribbons, a hip crease, and low-detail material. A valid Blender render was NOT evidence of usable anatomy.

## Root cause

The rig bound arm vertices to bones by world Z height. In a MakeHuman A-pose, fingers, wrist, elbow and torso occupy overlapping height bands. This classified 60% or more of distal-arm sample points as forearm and caused adjacent vertices to follow different bones. The torso/leg hard height transition produced secondary groin deformation. These were errors in skin weights rather than a broken Blender render.

## Corrective implementation

- Replace arm skin weights with a shoulder-to-wrist projected limb-axis coordinate.
- Smoothly blend clavicle → upper arm → forearm → hand across adjacent joint bands.
- Use horizontal limb location and soft superior/inferior masks to separate arms from torso.
- Smooth pelvis-to-thigh deformation over a wider .405–.585 normalized stature range.
- Continue using the same canonical browser snapshot geometry, 22-bone armature, nine NLA clips and Blender Cycles one-shot worker.
- Add actual animated evaluated-mesh QA: measure every edge-length ratio against the rest mesh over seven frames of Walk, Jog, Run and Fight, reject any sampled stretch above 4.35×, and attach the results to report.json.
- Show per-action strain QA in Build Evidence after generation, and explain early-video availability while remaining clips and quality checks are running.

## Real verification

Using the existing canonical MakeHuman human snapshot (13,524 vertices), the prior Walk frame 13 reached 9.94× mesh edge distortion and 39 edges above 4×. Corrected Walk: 3.751× and zero above 4× at the same frame.

Full authentic Blender one-shot completed with all nine animation videos, a .blend and an animated GLB. The worker reported 22 bones and vertex topology parity within 0.00000006 m. Its new evaluated skin-strain audit found:

| Clip | Worst edge ratio | Max sampled edges >4× |
| --- | ---: | ---: |
| Walk | 3.7510× | 0 |
| Jog | 3.8745× | 0 |
| Run | 4.1707× | 2 |
| Fight | 3.1633× | 0 |

All 20 Node tests pass, including the new skinning/QA source contract regression.

## Open limitations

This is a reduction of severe geometric tears, not a production rig or approved biomechanics. Run retains two sampled overstretched edges, and all gait/expressions are prototypes. Hands and face remain low-detail source geometry with approximate weights and shape keys. No motion-capture, articulated fingers, physical collisions or rigorous human-motion validation. Current preview motion is in place; quality may remain visually imperfect on a phone. Keep experimental release separate from production until human inspection.
