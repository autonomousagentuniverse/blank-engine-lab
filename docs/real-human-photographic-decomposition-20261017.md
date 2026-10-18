# Actual human-photograph decomposition and new generator decision — 2026-10-17

## Experiments and provenance

[Real-photo measurement workflow #39081645078](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39081645078), GitHub Actions SUCCESS. Artifact `real-human-photographic-decomposition-v1` ID **12119116413**, comprising `photo-versus-mira-metrics.json`, `real-human-vs-cgi-review.jpg`, and `ATTRIBUTION.txt`. Tests executed real photographs, not Einar or simulated people. No source photograph used to imitate a specific person's identity.

Code: `experiments/real-human-reference/analyze_photos.py`, manifest `experiments/real-human-reference/verified_photos.json`, workflow `.github/workflows/experimental-real-human-reference.yml` (manual-only after authorized run).

Original full-resolution reference sources, only downsampled/cropped/attributed derivatives in artifacts:

| Category | Wikimedia Commons file | Credited author | File license |
|---|---|---|---|
| Eye macro | [Female eye close up](https://commons.wikimedia.org/wiki/File:Female_eye_close_up.jpg) | Grauvision | CC BY 4.0 |
| Hair macro | [Light brown hair](https://commons.wikimedia.org/wiki/File:Light_brown_hair.jpg) | Dominique Lyon | CC0 |
| Skin macro | [Human skin close-up](https://commons.wikimedia.org/wiki/File:Human_skin_close-up.jpg) | Montavius Howard (TongCreator) | CC0 |
| Oblique face/eye/hair | [Close-Up Face](https://commons.wikimedia.org/wiki/File:Close-Up_Face.jpg) | Mortification7 | Public domain |
| Low-light portrait | [Portrait with natural light](https://commons.wikimedia.org/wiki/File:Portrait_with_natural_light_(Creative_Commons).jpg) | Wendelin Jacober | CC BY 2.0 |
| Overexposed high-key face | [Face-1511873](https://commons.wikimedia.org/wiki/File:Face-1511873.jpg) | Engin_Akyurt | CC0 |

The file license permits reuse according to its terms but is not automatically a model's publicity/privacy release. No synthetic output should imitate any of these people.

## Direct photo/CG measurements (pilot statistics, no photographic realism score)

Measured on independent normalized 512×512 crops using LAB lightness and a 16×16 block spatial orientation tensor. All figures explicitly represent **2D pixels at unmatched physical scale and lighting**, not anatomy or geometry. Original A/MIRA05 full Cycles reference was re-downloaded and SHA-checked from [run 39074108104](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39074108104), not recreated or manipulated.

| Statistic (specific manually chosen ROI) | Real hair macro | MIRA A hair |
|---|---:|---:|
| Gradient axial-orientation entropy, 12 bins normalized | 0.54655 | 0.30491 |
| Neighboring orientation agreement in 32px structure-tensor cells | 0.90965 | 0.98809 |
| Relative fine-scale Gaussian bandpass RMS | 0.34391 | 0.29253 |

**Interpretation:** Real hair contains strong *local* parallelism coupled with a wider variety of directions/strand crossings; MIRA's selected hair patch is overwhelmingly parallel. The real macro also contains greater relative detail in the high-frequency band. This does **not** establish a universal hair-entropy acceptance target, as straight hair, curls, lens distance and grooming alter statistics. It does disfavor only using globally downward procedural strands.

| Metric | Real eye macro | MIRA eye crop | Real skin macro | MIRA cheek crop |
|---|---:|---:|---:|---:|
| Fine band relative energy | 0.24767 | 0.15785 | 0.23217 | 0.11115 |
| Neighbor direction agreement | 0.38224 | 0.72038 | 0.39649 | 0.52599 |

Eye macro photographs show actual nonuniform iris fiber/color, tearline, corneal highlights, moist lid margins, sclera vessels and strand-like lashes. MIRA's visible CGI sample has simplistic iris depth, glossy polygon eye surface, empty lid transition and near-uniform lashes. Skin photo shows regional creases and pores; MIRA cheek patch remains visibly smooth/waxy. **Numbers are confounded by focus/field-of-view/camera and CGI sample settings; do not use as numeric pass/fail.**

The high-key photo's sampled pixel-clipping fraction is **53.04%**; its apparent lack of pores cannot calibrate skin BRDF/roughness. Low-key portrait shadows likewise reduce visible detail. Do not collapse photographs taken under different conditions into a single material texture histogram.

Unmeasured: real calibrated facial landmarks, 3D follicle root normals, eyelid-globe clearance, material reflectance/SSS, human identity consistency, matched-light photographic similarity.

## Concrete generation decision

Avoid further Einar decomposition and no MIRA05 serial fixes. Adopt freshly parameterized **MakeHumanCommunity MPFB 2.0.18**, independently generated base mesh + built-in rig + separately attached CC0 core eyes, eyebrows, eyelashes, hair, teeth, tongue, clothes and procedural/material skin. MPFB source code is GPL v3 and must not be redistributed with user character files; publisher bundled core graphical assets CC0 (source verification [publisher license](https://static.makehumancommunity.org/about/license.html)). Third-party community assets require separate license verification; first pilot uses only CC0 publisher system pack. The independent generated character must not mimic photos' subjects.

A dedicated [one-shot Blender run](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/workflows/experimental-new-human-from-photos.yml) tests this architecture on experimental branch `experiment/real-photo-to-new-human-mpfb-20261017`. No previous head source fallback, fail-closed on absent assets/rig/eye/hair/skin, save editable full .blend and real Cycles front/reverse/3-quarter/body images. It is NOT entitled to claim photoreal success without visual owner approval, strong source-modeled eye/hair improvements or matched-light reference trials.

The fixed successor gate is one complete generated person plus four genuine Cycles views; if visually rejected, record one decisive failure mode across reference hair/eyes/skin and redesign the whole generator foundation rather than endless component patches.

**State:** Photo pilot measured and verified, no photo-ground-truth 3D anatomy scan. No production deployment, unchanged continuity of source licensing.
