# Full human one-shot anatomical dependency contract — executed 2026-10-17

**GitHub Actions:** [39078246302](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39078246302) SUCCESS, seven regression tests passed. Evidence artifact `anatomy-contract-einar-mira-v1`, id **12118460037**, seven-day retention. Branch `experiment/anatomical-dependency-contract-20261017` is manual-only, no production deployment.

## What was built

- Machine-readable 11-edge contract: `character-pipeline/contracts/human-anatomy.v1.json`.
- Independent evaluator: `experiments/anatomical-contract/evaluate.py`; fail-closed evaluation refuses unmeasured relationships, validates source hashes and never claims photorealism.
- Seven regression tests: `experiments/anatomical-contract/test_contract.py`.
- GitHub CI workflow: `.github/workflows/experimental-anatomical-contract.yml`; reads exact pinned provenance. It does not export, patch or produce a new character.

The 11 relationships are: facial rig → face; face → eyelid margin; margin → globe; cornea → eye; meniscus → eyelid; eyelashes → eyelid; brow follicles → face; scalp hair roots → scalp; hair guides → roots; regional skin material → face; exported rigged character → rig. For each, the contract requires a dynamic or optical measurement rather than mere object existence.

## Authenticated evidence sources

**Einar:** Historic authenticated Blender Studio original-source graph from real Blender audit run 38992142171, original source hash `1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b`; provenance CC-BY, credit `Einar Rig (CC-BY) Blender Foundation | studio.blender.org`. This job used archived graph metadata, **not a new Einar source execution or high-fidelity 3D pose simulation**. It is a realism-oriented artistic reference, **not measured photographic ground truth**.

**MIRA:** Frozen CC0-derived one-shot A complete .blend, SHA256 `9b57bc2aaa1ba0cfec213eb1035f517dfbcebf5fb43443cc85618f42bb39791e`; authentic previous Blender 20mm head-translation and `Eyes_Closed_Max` blink observations archived in run 39077561840. The current evaluator consumed those verified prior results rather than rerendering anything.

## Real CI result

| Evidence state | Einar | MIRA A |
|---|---:|---:|
| dynamic_pass | 0 | 1 |
| dynamic_fail | 0 | 3 |
| structural_evidence | 8 | 0 |
| unverified | 3 | 7 |
| ready_for_visual_review | false | false |

The single MIRA positive is *actual facial mesh orbital deformation*, not proof that lid closure is anatomically correct. Three negatives are source-rooted scalp fiber follow failure under 20mm head translation, brow fiber root motion failure during actual head blink and eyelid-contact curve root motion failure under same blink.

**Einar’s eight structurally evidenced relations are NOT motion passes**: dedicated eyeball and cornea surfaces, meniscus and deformation-related proxy graph, eyelid controls and eye rig, textured material graph and correlated hair/brow proxies. Three additional relationships cannot be validated at all from source graph alone (lid-globe clearance, regional groom physics, export parity). The eleven edges are architectural requirements, not numerical photorealism scores. No shader-node minimum required.

## Design decision

Do not generate another complete human yet. Establish **actual evaluated reference pose behavior** on publisher Einar source, measuring neutral → head turn → blink:
1. World and skin-local follicle/root movement, curves and attachment constraints.
2. Upper and lower evaluated lid margin to globe/cornea distance, tear meniscus clearance and movement. If anatomical correspondence can't be established from actual geometry, mark unverified.
3. Multi-view hair guide distribution and 3D clump/collision behavior.
4. Regional material layer dependencies and physically controlled Cycles lighting response. Photographic fidelity needs suitable rights-cleared measured photos or scans beyond Einar.
5. Only after source evidence and a full one-shot prototype exist should the new generator pass the same tests and separate human photo review.

**No generated human, no release, no model-license redistribution.** This evaluator is a branch-only experiment and is **not yet wired into the production one-shot quality controller**.
