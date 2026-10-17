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

### Native shader fault mitigation
Second run [39047447137](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39047447137) used fresh bpy processes, reused the four verified baseline/eye images, then segfaulted (exit 139) about two seconds into hair material edits, before `hair_brows_front.png`. This proves prior 139 was **not exclusively caused by repeated scene reload**. A simpler hair color/roughness change has now replaced the fragile MixRGB/MapRange alpha rewrite. The updated code keeps source hair alpha maps and geometry intact, removes and reconnects shader color links explicitly, adds guarded checkpoints and a Python faulthandler. Test remains pending; do not infer hair improvement from code alone.

## Completed batch: evidence and human-visible verdict

**Verified outcome:** [GitHub Actions run 39047787293](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39047787293) **SUCCESS**. Artifact `mira04-resumed-full-eight-view-batch` ID **12106925388**, 56,027,946-byte ZIP, contains eight actual Cycles 700×700 PNGs, immutable provenance report and packed source-derived `mira04-batch-combined-candidate.blend` (50,657,888 bytes, SHA256 `4ae11efedb3bc34cf4142809e8bde25fb2a0fb61856a1ab4948968a6b1d139fc`). Input was frozen MIRA03 .blend SHA256 `1809398d604efa567a063697f34d84dc10c6db95914f38a31ac5bd6912e5e96d`, never modified on disk. All 8 render PNG sizes/hashes and expected mode identities verified independently. Permanent workflow restored to **manual-only** after kickoff, no deployment.

First run 39046993034 rendered baseline + eyes, then native bpy segfault exit 139; second run 39047447137 proved native crash in hair shader edits, not merely repeated file loads; third process-isolated run 39047787293 reused four hash-verified images and completed hair+brows, skin and combined variant. Do not overwrite or mislabel the failed historical runs.

**Visual review of actual pixels:**
- **Eyes-only: accept as research improvement.** Removes glaring opaque upper-eyelid triangles from visible source `Eyeshadow_L/R` objects; eye model still artificial (iris/sclera/cornea/reflections). Attribution to the entire shader package is not proven separately since eye variant changes visibility and material simultaneously.
- **Hair+brows: reject visual promotion.** Hair looks somewhat darker but original 485,440-vertex alpha hair-card structure and unnatural angular foil-like strands remain. Brow card materials become too solid/dark; opacity maps preserved and did not fix card geometry. The previously crashing material graph rewrite was replaced by stable Hue/Value and roughness only.
- **Skin-only: marginal/provisional.** Deeper/warmer facial appearance; remains washed, synthetic and light on subsurface microtexture. Not enough evidence for visual approval.
- **Combined: reject promotion.** Eye benefit persists, but hair and eyebrows remain disproportionately solid; do NOT call the combined technical run a photoreal pass. Combined .blend is a *candidate for further analysis only*, not released.
- Best currently isolated verified visual branch: **eyes-only** from same MIRA03 source. No eye-only packaged .blend was produced in this batch, so do not imply one exists.

**Engineering conclusion:** Batch A/B was effective and more efficient than serial manual iterations: one run family tested and recorded five conditions with eight matched rendered images. Next batch should focus on **eye geometry/iris and proper hair-card vs authored-strand rendering**, while retaining the now-proven eye visibility fix and MIRA03 smooth mouth; choose a hypothesis-based source correction rather than another uncontrolled density-only hair scatter. No new independent photoreal human approved; CC0 Vitruvian ancestry remains declared. No Vercel deployment.
