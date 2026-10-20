# Blender build failure for real generated human variants — 2026-10-20

## Failure reproduced

The earlier one-shot Blender rig passed synthetic geometry fixtures but rejected actual morphs exported from the live MakeHuman browser builder. Its hard QA gate `audit_skin_strain(rig,body,limit=4.35)` exposed severe stretching in the Walk clip. The pre-fix rig unintentionally applied thigh weights to distal hand vertices and used an abrupt hip-pelvis weight boundary. With real browser geometry the strict rejection was inevitable for tested variants, regardless of whether the Cycles renderer was functioning.

Using the original rig against the same five real generated browser snapshots:

| Morphology | Pre-fix result |
| --- | --- |
| Default feminine / Afro | Walk mesh stretching 6.12×; rejected |
| Short androgynous | Walk 10.12×; rejected |
| Wide-hip feminine | Walk 6.12×; rejected |
| Masculine | Walk 9.96×; rejected |
| Tall feminine | Walk 6.12×; rejected |

All exceeded 4.35×. An independent assertion reproduced unwanted hand-to-thigh weights in the old rig; e.g. right-hand vertices acquired nonzero Thigh vertex weights.

## Corrective implementation

- Expand and smooth shoulder and elbow skin-weight transitions; exclude physically remote hands from thigh weights even where hands and hips share vertical coordinates.
- Replace the discontinuous pelvis/thigh membership switch with a continuous centerline-aware mask.
- Reduce excessive procedural fight arm excursions.
- Cap face-motion previews at 16 Cycles samples per pixel while keeping the body previews at their requested (12–24) quality, denoising and 640px limit; six stills retain their configured render resolution and sample count.
- Increase the Blender worker process limit from 15 to 26 minutes (within its 30-minute Sandbox lifetime), since dense hair and high render settings could otherwise exhaust the original budget.
- Surface the decisive Blender RuntimeError/Traceback in the job failure reason; show the last worker logs and the failed phase on the page.
- Add real Chromium-generated morphology snapshots and an evaluated Blender rig probe as repeatable regressions. Reject arm/hand-to-thigh contamination; retain numeric mesh-strain safeguards rather than weakening them.

## Genuine verification

Five independent live-browser generated body variants—feminine Afro, wide hips, masculine, short androgynous, tall feminine—now **pass** the same Blender rig-quality check, including all four sampled motion types (Walk/Jog/Run/Fight), with no hand-to-thigh contamination.

For the default Afro-haired figure, worst post-fix sampled stretch:
Walk 2.6191×, Jog 3.1624×, Run 3.6311×, Fight 1.8131× (all below 4.35×).

A separate real one-shot Blender 5.0.1 run using the actual browser default body, **286 actual hair instances**, 960px still renders, 24 Cycles samples, completed all nine H.264 animation videos, animated GLB, editable .blend and report in approximately 11m16s (below the original 15m limit). Confirmed 13,524 body vertices and 22 rig bones. The Node regression suite passed 22/22.

## Confidence and remaining uncertainty

The exact user's hosted failed-job log could not be retrieved: Vercel's observability API returned 403, and the supplied message lacked a job ID or traceback. The previously deployed rig is proven to fail this class of inputs, but this does not establish which particular settings caused that user's job. Remote signed-in Generate remains a separate acceptance test. High manual Cycles samples and maximum 1800px still output may consume a substantial share of the 26-minute limit. Existing locomotion visual quality gate remains BLOCKED.

**Status:** Tested on actual browser morphs; experimental preview release only. Production unchanged.
