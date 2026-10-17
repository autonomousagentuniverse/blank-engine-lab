# MIRA-02 — root-cause experiment, not another cosmetic version

## A/B design
Same pinned source `ibrews/VitruvianGodot` revision `bdecdcd537b4031fdd0fb299b7e4f93f084fffa0`, eight CC0 textures, hair cards, eye assemblies, same 700x700 Cycles exposure, exactly same camera objects. **Original** = imported unmodified Vitruvian head before face sculpt; **MIRA** = same source after applying the precisely original MIRA-01 `sculpt_variant` only. Keep eye and hair object transforms identical. Both use the MIRA-01 Blender material conversion, so any defect common to both might be CC0 source *or* that shared material conversion; cannot automatically blame the upstream author. Two identical front/macro shaded pairs plus two material-less clay front views diagnose gross geometric versus material origins.

## Evidence constraints
- Six actual Cycles images and a packed .blend should be archived. Script creates no independent new topology.
- Direct image-pixel review is required; `run success` not aesthetic approval.
- If vertical lip/chin mark appears in both material frames but **not** clay, suspect material albedo/UV rather than sculpt geometry; if it survives clay, examine lip-face boundary or mesh normal discontinuities.
- If white eyelid/iris anomalies appear in both baseline and variant, prioritize the shared eye/cornea source material translation and eye assembly, not the cheek/jaw variation.
- Hair cards deliberately unchanged, to determine whether synthetic wig appearance is inherited from geometry/cards/material conversion.
- No fixes authorized by inference alone until the images and geometry evidence support them.
- No deployment or mainline asset changes.

Actual output/test result: PENDING at code commit.
