# One-shot quality-first: real-light calibration findings

2026-10-17. **Code-gate redesign implemented; not a photorealistic character generator or deployment.**

CI [39060067800](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39060067800): real Blender light-calibration job **success**, Node unit job failed due a test-fixture overwritten `probe.txt` hash. Focused gate rerun [39060355290](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39060355290) **8/8 tests passed** after fixing fixture without rerunning Blender.

Artifact ID **12111216491** (`one-shot-quality-light-calibration`) contains three genuine Blender 500px Cycles images, unchanged MIRA05 model / hair BSDF / camera / world: studio area-light energies 100%, 35%, 10%.

| Area-light strength | Hair display luminance | Face display luminance | Hair/dark emission ratio |
|---|---:|---:|---:|
| 100% | 175.6107 | 206.0023 | 2.8464 |
| 35% | 133.0883 | 168.1748 | 2.1572 |
| 10% | 79.3652 | 108.3805 | 1.2864 |

Magenta-emission mask: 115,973 image pixels; dark emission luminance 61.6961. Measurements are display-sRGB luminance proxy, not calibrated radiometric reflectance. Only 10% illumination hits *the project's provisional* hair ratio <=1.8, but face retention is only **52.6%** (108.38/206.00): unacceptable collateral underexposure. At 35% facial retention **81.6%** is better, but hair ratio still **2.1572**, above the provisional bound.

**Architecture correction:** require both `max_hair_light_ratio` and `min_face_luminance_retention` (example 0.75), plus physical geometry coverage and human review. A hair-only lighting optimization may never satisfy all visual objectives. Numeric thresholds are provisional owner policies, **not an objective definition of beauty or realism**. One-shot must block, not auto-promote, if the coupled constraints fail. The curtain groom remains geometrically wrong at every light strength.

No new character, independent source claim, export, merge to production, or automatic deployment.

**Final coupled stage-gate CI:** [39060711732](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39060711732) SUCCESS — **9/9 Node tests passed**, including source-hash/rights validation, MIRA05 measured hair excess luminance rejection, scalp/guide uniformity and UV/contact blockers, four-camera photo proof, image-bound human signoff, independent-vs-derived identity, explicit deployment guard, and the **real 10%-lighting result correctly rejected** because facial brightness retention was 0.526, below the provisional 0.75 requirement. Original mixed run 39060067800 remains **FAILED** owing to earlier test-fixture mistake even though its separate actual Blender job succeeded; do not relabel history. Both experiment workflows restored manual-only after verification. Branch-only logic; not connected to production generation and no new human was created.
