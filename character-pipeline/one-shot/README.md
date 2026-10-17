# Quality-first one-shot human generator: staged validation

Status: new fail-closed quality controller implemented, CI and real light-sweep pending. NOT an autonomous finished original photoreal human generator.

## Why rebuild
One-shot MIRA05 completed 10 real Cycles images and passed counts and hashes, but remained visually rejected: hair-curtain geometry, artificial eyelids, weak brows and waxy skin. The subsequent true Cycles material forensic run 39058571227 confirmed correct hair Color assignment, yet display luminance 177 under original Hair BSDF, 148 under dark standard Principled, vs 60 under dark emission. Generic scene lighting or BSDF response and silhouette must be diagnosed before approving anything.

## Five sequential states
1. CALIBRATION: source-pinned light-sweep evidence, real image mask and lit-to-emission ratio below a predeclared experimental limit. Numbers are not photographic realism scores.
2. CONSTRUCTION: source-pinned physical tests for follicle scalp coverage, strand-direction diversity, collisions, separate brow growth field, 100-plus eyelid contacts, UV texture map integrity, smooth lip midline and intact expression controls.
3. PREVIEW: four exact Blender Cycles camera views front, three-quarter, profile and eye macro, with hashed 700-pixel PNG evidence; no structural stage is accepted from strand/object counts alone.
4. HUMAN REVIEW: human inspects all four evidence-bound renders and explicitly approves eyes, hair, eyebrows, skin, identity and overall result. Human identity is an attestation; the tool cannot cryptographically establish who provided the review.
5. WEBGL PARITY: separate Three.js/GLB rendering compared at identical lighting and cameras; legal ancestry acknowledged and explicit deployment authorization still required. Every stage returns release_allowed false.

## API/CLI
Files: quality-gates.mjs (pure validations), quality-cli.mjs (init, check-plan, advance), quality-gates.test.mjs (negative regressions), blender-light-sweep.py (real bpy 4.5.3 from frozen source), measure-light-sweep.py (actual image pixel controls), example-plan.json (intentionally invalid until source populated).
Commands: node --test character-pipeline/one-shot/quality-gates.test.mjs; node character-pipeline/one-shot/quality-cli.mjs check-plan <plan>; node character-pipeline/one-shot/quality-cli.mjs init <plan> <new-job-folder>; node character-pipeline/one-shot/quality-cli.mjs advance <plan> <job-folder> <evidence-file>.
The CLI never claims to generate new head geometry; it is an evidence controller for any upstream producer. It cannot substantiate model likeness from raw data. Visual acceptance remains human-controlled.

## Real calibration
The isolated workflow uses original successful MIRA05 .blend SHA256 07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076 and actual hair AB proof 39058571227. Three authentic same-camera 500px Cycles portraits with identical geometry/materials and only area light energies set to 32%, 65%, 100%. A magenta-emission mask from the prior proof anchors which pixel region is hair, and recorded dark-emission controls normalize the measured brightness. The values are DISPLAY RGB, not calibrated scientific reflectance; the experiment isolates light energy but does not itself approve a hairstyle or physical skin.

Engineering thresholds such as target ratio 1.8, minimum scalp coverage .90, hair-direction diversity .65 and lip jump <0.1mm are preliminary veto controls, not independently validated universal anatomical criteria. They must be calibrated against a rights-cleared visually approved exemplar. The MIRA05 current ratio ~2.93 would fail the default example plan, as desired.

No production deployment, no new independent anatomical source, no GLB export or human visual approval in this phase. New pipeline remains an isolated branch until reviewed and explicitly authorized.

## First real calibration evidence and regression fixture correction

Initial [CI run 39066589038](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39066589038): the *actual Blender lighting job succeeded* and archived 3 authentic source-locked 500px Cycles frames plus measured hair mask report (artifact **12114115005**, **1,176,144 bytes**). The **unit-test job failed** because the new test fixture omitted the pre-existing mandatory face luminance retention threshold and cheek reference measurements; this failure was a test contract mismatch, not a failed source render. Corrected test fixtures now preserve the face guard, and a separate negative test demonstrates why a hair-darkening method that underexposes the face must be rejected. Do not relabel the first workflow run as green.

The real light-sweep measured **78,105 magenta-mask hair pixels** from the prior independently verified material A/B. Same frozen MIRA05 SHA256 and same original Hair BSDF/camera throughout. Recorded display-RGB ratios of lit hair versus source-matched dark emission:
- 100% lamps: hair display brightness **181.39**, ratio **2.887×**;
- 65% lamps: brightness **166.36**, ratio **2.647×**;
- 32% lamps: brightness **134.76**, ratio **2.145×**.

Original lamps Mira_Key 46, Mira_Fill 23, Mira_Rim 38 (arbitrary Blender area-light energy units). Reducing energy by 68% did **not** meet the experimental target ratio 1.8 and cannot repair the unchanged hair-curtain geometry. Skin also darkens: independent same-camera cheek regions (two fixed 35×60 pixel ROIs) have display-RGB mean **214.02 at 100%**, **201.37 at 65%** (**94.1% retention**) and **175.66 at 32%** (**82.1% retention**). ROIs are fixed for this particular portrait, not a general human skin detector. This establishes the trade-off: *light reduction alone is inadequate*, and individual physical shader response plus guide/coverage geometry needs source-aware reconstruction.

The Python light-measurement script now writes cheek face luminance and retention alongside hair ratios to avoid approving a character by darkening its entire face. The user-facing one-shot controller itself still requires a new human source and manual image review; no new human was generated or deployed.

Corrected unit tests: pending second isolated GitHub run at this commit; the earlier lighting job is not unnecessarily rerun.
