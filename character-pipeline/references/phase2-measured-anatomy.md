# Phase 2 — measured human references and current Blender audit (2026-10-18)

**Outcome:** Body data measured from 1,986 ANSUR II female records (732 ages 25–34) using exact public CSV; real 3D West African facial studies added; final Afro woman Blender .blend and 3 genuine Cycles views inspected. Source and license controls remain intact.

## Statistical evidence
- Body medians in 25–34 female military cohort, **mm**, computed from raw original measurements (not the self-reported imperial columns): stature 1628, skeletal shoulder breadth 366, hip breadth 354.5, waist breadth 298.5, waist circumference 858, buttock circumference 1025.5, crotch height 780.5, head breadth 148, cheekbone breadth 133.
- Cohort Pearson r: hip breadth / buttock circumference 0.939, waist breadth / waist circumference 0.955, stature / crotch height 0.856, hip/waist breadth 0.775, cheekbone / head breadth 0.623. **Not independent sliders**; generate jointly from verified conditional multivariate distribution if cohort and rights fit intended application.
- Raw interpupillarybreadth values near 616 would mean ~616 mm if interpreted per published general mm convention, physically implausible; field is **excluded**, not silently divided by ten. Clarify published coding before numerical use.
- Body dataset limited to U.S. Army servicewomen, **not representative of all women or West African populations**; ancestry is not coded into character presets.

## More relevant 3D facial samples
- **Senegal** 2023 Soumboundou et al., Bellus 3D 104 subjects/46 women aged 16–45. Female values: al-al 37.2±3.32 mm, en-en 32.7±2.83 mm, ch-ch 46.91±4.03 mm, ex-ex 87.9±3.24 mm. Exact feature naming and sample-specific limitations in separate JSON.
- **Nigeria** 2022 Adekunle et al., Vectra H1 3D 452 subjects, 198 women: aggregate en-en 35.19±3.20, interpupillary 67.04±3.67, zy-zy 139.43±7.11 **pooled male+female**. Do not mislabel as female-specific.
- Published measurement summaries are NOT licensed full scanned 3D heads; obtaining consent/permission to reuse meshes as production geometry remains unresolved.

## Root-caused Blender measurement failure
Real old rebuild source `afro_woman_rebuilt_medium_body.blend`, action 39089947769, 19,158 original body verts with 53-bone rig. Bounding slices at relative heights t=.49/.61/.75 reported hip 507.70 mm, waist **1099.89 mm**, upper torso 733.65 mm after morph. The original algorithm filtered body vertices by Z and x±.55 m but did not exclude A-pose arms/hands. Therefore these are all-vertex horizontal extrema, NOT segmented anatomical breadths; invalidate all three against reference distribution. The 28.00%/12.43%/16.87% recorded differences describe the selected vertex extents only. Ref: https://github.com/autonomousagentuniverse/blank-engine-lab/blob/experiment/afro-woman-body-rebuild-blender-20261018/experiments/real-human-reference/rebuild_existing_afro_body.py.

The last genuine Cycles closeup shows visibly face-occluding Afro fibers and stylized light skin; A-pose and no shoes in full-body render. Original final editable source SHA256 26fbbab775771a197482d7baffb89decbbf4f821dd3cfaa69fac28ee52e1fc2a from action 39090435514, retained and unchanged.

## Next geometry gate
A **fail-closed** human mesh audit script was generated as downloadable conversation artifact. It demands explicit region vertex groups on rest/evaluated mesh, named 3D anatomical landmark empties, and identified scalp vertices before measuring semantic anatomy. Missing tags become `null`, not guessed from photos or generic Z slices; scalp nearest-vertex proximity is only a proxy. Script passed Python compile + five geometry unit checks locally; **real Blender runtime not executed** (no bpy or Blender executable in this environment). Running in GitHub Actions manually is the next execution check, then tag real skin/bone sites and compare to published *definition-matched* distributions. Do NOT add fictitious tags to pass.

**No new character, no photorealism approval, no GLB parity, no deployment.** This research-only branch records results; data and script are separately downloadable.
