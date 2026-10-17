# MIRA-04 — batch-quality experiment (one CI run, independent A/B variants)

## Why
The user observed a real MIRA-03 facial geometry improvement and requested **batch improvement** rather than another slow single-fix version. Previous A01–A07 loops mistakenly mixed unverified effects. The new method is *batch execution with causal isolation*, not blindly combining changes.

## Frozen reference and methodology
- Input is **exact packed MIRA-03** from successful run 39045175123, `mira03-continuous-midline.blend` SHA256 `1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d`. Retrieved as GitHub Actions artifact; all source maps packed. No new Vitruvian ZIP downloads or Einar ancestry.
- Run **all variants in one GitHub job**. Blender reloads the original unchanged `.blend` before each variant so material changes cannot leak between experiments; eyes/hair geometry and repaired face topology remain untouched.
- Same portrait studio lights, camera identifiers, 700×700 Cycles 20 samples. Render `baseline_front, baseline_eyes_macro`; `eyes_front, eyes_eyes_macro`; `hair_brows_front`; `skin_front`; `combined_front, combined_eyes_macro`. **Eight real PNG files** with hashes and full report; editable packed combined .blend archived.
- **Eyes-only:** hide the two separate `Eyeshadow_L/R` geometry objects *only in this variant*, reduce bright sclera response using color multiply, slightly increase cornea roughness while retaining transmission. These are hypotheses, not claimed correct fixes.
- **Hair+brows-only:** modulate source hair color texture toward natural dark brown and remap alpha at card edges; tone down card eyebrow opacity/roughness. **Source head/scalp geometry unchanged.** There may be no improvement; inspect.
- **Skin-only:** modestly warm/deepen pale face tones through existing saturation/value node, reduce excessive SSS weight, preserve albedo/normal textures, increase normal strength.
- **Combined:** same three modifications together, visually assessed separately from individual changes. No grading based only on stage completion.

## Acceptance rules
Count a variant as an improvement only when its real render is visibly less artificial than baseline in the targeted facial region and no new geometry/material artifact appears. Human reviewer has veto. No fixed numeric 'realism' score invented; render PNG/bytes/hash/test success is **technical proof**, not photorealism.

If a single candidate helps, promote that component only; if combined degrades a part, reject the combination. The baseline version and source reference remain immutable. A new production GLB is **not** created until human approval and Cycles→WebGL parity are demonstrated.

The CC0 character remains a *Vitruvian-derived* person, not an independently sculpted or photorealism-approved human. No change to Blank Engine production. Test outcome at proposal/first code commit: pending.

## First execution and deterministic recovery

Actions run [39046993034](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39046993034) **FAILED** with exit 139 (native Blender/bpy segmentation fault) after completing all four images for `baseline` and `eyes`. Artifact `mira04-eight-way-visual-batch` id 12106451755 contains `baseline_front.png`, `baseline_eyes_macro.png`, `eyes_front.png`, `eyes_eyes_macro.png` plus source audit and report. Images are actual 700px Cycles and hashes checked. The crash occurred during the one-process Blender reload cycle; root cause of native segfault is not proven, but repeated full-scene reload is a plausible trigger.

Initial visual A/B: disabling the two separate white `Eyeshadow_L/R` render objects (and adjusting sclera/cornea shader) removes conspicuous solid white shapes above eyelids. The improved eye transition is *real in the matched image*, but entire eyeballs still appear somewhat synthetic and material/gaze realism remains unapproved. Hair and skin batch variants had not run at first failure.

**Recovery:** Change batch script to `python batch_variants.py <mode>` one mode per Python/Blender process. Restore the four hash-checked PNGs and report from first run; do **not re-render accepted evidence**. In a second isolated CI run, render only `hair_brows`, `skin`, and `combined`, then check all eight images/flags again. This saves render compute and protects against the prior native reload crash. Do not treat a partially recovered report as a full visual pass. No production deployment.
