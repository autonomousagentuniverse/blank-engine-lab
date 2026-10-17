# Reference human structural decomposition — Einar vs MIRA-05 (2026-10-17)

**Execution:** [GitHub Actions run 39077222790](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39077222790) SUCCESS, artifact `human-reference-source-decomposition-einar-vs-mira` (ID 12117064185). Ran `experiments/reference-decomposition/decompose.py` using genuine Blender 4.5.3 on the packed A/MIRA05 one-shot Blender artifact. Its SHA256 `9b57bc2aaa1ba0cfec213eb1035f517dfbcebf5fb43443cc85618f42bb39791e` was verified.

**Reference:** [Blender Studio Einar](https://studio.blender.org/characters/einar/v1/), CC-BY (required credit `Einar Rig (CC-BY) Blender Foundation | studio.blender.org`). Prior authentic-publisher Blender source graph from successfully audited [run 38992142171](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38992142171), original .blend SHA256 `1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b`. Current experiment **reused the original authenticated metadata**, did not re-open Einar publisher Blend. Its structural design is realism-oriented, not calibrated photographic ground truth. Source ZIP/Blend/textures not copied to Git.

## Verified side-by-side source decomposition

| Structure | Reference Einar audited source | MIRA05 A new bpy inspection |
|---|---|---|
| Head shape keys | 66 | 27 |
| Source head | 4,596 verts | count in machine-readable report |
| Facial material graph | `einar.skin` 301 nodes / 379 links, 8 image nodes | `VitSkin` 9 nodes / 8 links, 3 image nodes |
| Ocular geometry | distinct Eye_Sphere L/R, cornea L/R, 70-polygon meniscus L/R, plica semilunaris L/R; separate eye-material graphs | original eye shells preserved with added skin-projected thin `MIRA05_SourceFittedLidContact` four curves; no equivalent source-generated attached meniscus structure |
| Tearline/eyelid deformation | meniscus uses Surface Deform, Armature, Shrinkwrap, Data Transfer, corrective smooth; plica uses Armature/Shrinkwrap | generated lid-contact curves have no modifiers/parent/driver |
| Eyebrows/eyelashes | hair and lash surface-deformation proxies; independent hair CURVES with Geometry Nodes | generated brow curves (2,600) have no modifiers/parent/driver |
| Hair | Geometry Nodes curves/proxies/Surface Deform attachment structures | generated 12,500 independent 7-point world-space curves, no modifiers/parent/driver |
| Rig | 799 animation bones plus FACS-style blink and expression shape keys | source-derived facial keys retained, but newly made hair/brow/contact curves are not bound to source rig |

Node counts or bone counts are **not numerical photorealism scores**. Their main value is tracing *relationships and capabilities* that the source-derived MIRA pipeline lacks.

## New experimental variable: deformation-coherent attachment

The actual MIRA05 candidate .blend was opened in Blender; each of the three generated fiber/eye-contact objects was inspected. All have `parent=None`, `modifiers=[]`, zero animation drivers and zero vertex-group bindings. A *controlled synthetic head OBJECT translation* was applied +20 mm on X, without saving candidate changes, and root positions were checked in world coordinates:

| MIRA05 generated object | Root samples | Expected translation if head-bound | Actual median root displacement | Follow ratio |
|---|---:|---:|---:|---:|
| MIRA05_ActualScalpFibers | 80 | 20 mm | 0 mm | 0.0 |
| MIRA05_IndividualBrowStrands | 80 | 20 mm | 0 mm | 0.0 |
| MIRA05_SourceFittedLidContact | 4 | 20 mm | 0 mm | 0.0 |

This directly proves **no attachment to the head object's transform** in these new generated elements. It does *not* yet measure a full character-rig rotation, evaluated blink, or deformation under exported GLB. The live neutral-pose hair curtain and shallow eye realism also arise from insufficient geometry and optics, not simply missing transform attachments; do not claim that parenting these objects alone fixes still-image realism.

## Why A/B/C procedures failed

1. MIRA05 constructed recognizable **objects** but not a unified *deformable anatomical graph*: hair roots, brow roots, eye-contact curves and existing face/eye shell are independently positioned.
2. Earlier B random and C correlated hair variants changed procedural spline positions and surface roughness but inherited the same anatomy, eye interface and lack of attachment to the animated head. They did not address this underlying structural dependency.
3. Source Einar eye meniscus and eyelash surfaces are connected through Geometry Nodes, Surface Deform, Shrinkwrap, armature/corrective systems; MIRA contact curves are merely projected onto a neutral-pose skin snapshot.
4. MIRA skin system reuses a compact inherited UV graph and uniform perturbations, while reference has multi-layer spatial material logic. This supports a **missing measured optical/material layering hypothesis**, not an automatic claim that 301 nodes are necessary.

## Next genuine source-decomposition / pre-generation gates

- Study Einar's actual eye and hair node-group dependency paths and evaluate head/eye blink pose response in source Blender; preserve source license and do not redistribute protected binary data. Metadata alone cannot quantify every follicle field or physical optics.
- In any new complete one-shot generator, bind hair scalp follicles, brows and eyelid surfaces to deforming anatomy, **at generation time**; prove neutral->head rotation->blink/root continuity, no body/eye/cornea penetration. A post hoc curve-parent patch to MIRA is **not** sufficient.
- Measure eye-shell/cornea/meniscus/anatomical rim clearance at multiple expressions, lip/teeth closure, locally varying skin roughness/SSS, hair clump-guide root tangents, material-reflection A/B from consistent reference images. Use actual Cycles captures; reject photorealism until real owner visual approval.
- Preserve full one-shot generation intent: one coherent reference-conditioned anatomical mesh/rig/material/hair system per job, rather than component-by-component cosmetic fixes.

**State:** Source-based comparison and head-transform probe verified. No source-hair physics benchmarking, Einar pose test or measured real-photo skin comparison completed by this run. No new human; no GLB parity; release and deployment blocked.
