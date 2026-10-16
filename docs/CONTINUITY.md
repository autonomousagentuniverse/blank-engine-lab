# Blank Engine — Project Continuity, Architecture and Next Execution Plan

**Snapshot:** 2026-10-16 UTC (2026-10-15 US evening)
**Repository:** https://github.com/autonomousagentuniverse/blank-engine-lab
**Historical v2 baseline commit:** 92c4588a99c4b22661a05197b8585da8334b806f
**Latest engineering HEAD verified for this reconciliation:** f6acba64ab7ea5c12d85129bcebe7c44154bb660 (2026-10-16)
**Latest successful real-asset QA:** https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38879560781 (v4, Chrome/Three.js; 171 passed, 2 skipped, 0 failed; 9/9 pinned-GLB tests)
**Visual gate:** BLOCKED; no human photorealism approval
**Release:** Alpha 0.6 development on GitHub; Vercel remains on manually deployed Alpha 0.5
**Purpose:** Authoritative handoff for a new engineer or AI agent. Read this before making changes.

> **State of the project (current):** Geometry v3 overlay and v4 source-pinned skinned socket remesh have been implemented and technically exercised, but the isolated hero has **not** passed human photorealism review. Current P0 is to diagnose and correct residual pink eyelid texture/UV islands and eye-to-face surface/shading continuity on the v4 candidate, with exact before/after macro review. Do not repeat the completed v3 work as though it were the next job.

## 1. Concept and product vision

**Blank Box** is the eventual AI-native gaming/console vision; **Blank Engine** is its creation and runtime technology. The goal is an engine in which people describe or direct games, specialized agents collaborate on validated game designs, and builders produce reusable characters, objects, scenes and complete worlds. Agents do not bypass schema validation or human visual acceptance.

Key ideas established with the owner:
- **Hard problems first.** Prioritize the interface between graphics, geometry, skinning, animation, physics and AI rather than superficial editor decoration.
- **Build one excellent artifact first.** Perfect one photorealistic, game-ready humanoid in isolation; do not compensate with a bigger world or mass-produce mediocre NPCs.
- **Independent builders with interoperable outputs:** Character Builder, Object Builder, Scene Builder, and eventually World Composer. Object and Scene Builder are architectural goals, not yet full independent authoring products.
- **Universal Feature Inspector:** A close-up is for *any* local 3D feature (eye, hand, clothing seam, hinge, window, surface, object), not a face-only camera preset.
- **Geometry Artifact:** Changes to a distinct geometric feature must be measurable, constrained, reproducible, reversible and reviewable; preserve the original asset and source provenance.
- **One major manual deployment.** Collect fixes and major features on GitHub. Do not deploy individual minor fixes. Never automatically deploy to Vercel. Obtain explicit approval for the eventual Alpha 0.6 major release.

## 2. Architecture and boundaries

| Area | Current design | State |
|---|---|---|
| Browser game editor | Three.js/WebGL, deterministic v1 GameSpec, Night Market prototype, mobile movement and quest UI | Alpha 0.5 manually deployed; substantially newer code on GitHub |
| Game generation | Six NVIDIA-hosted roles: director, world, gameplay, character, mission and QA; strict GameSpec validation | Live test passed; manual server-side workflow |
| Persistence | PostgreSQL migrations, project/revision history, agent runs/tasks/events; pooler for GitHub runner IPv4 connectivity | Live GameSpec creation and DB commit tested |
| Physical runtime | Rapier capsule, gravity, jumps, collisions, dynamic crates, fixed-step logic, IK and imported GLB motion | Alpha 0.6-dev; real-library/Chrome tests passed for defined cases |
| Character Builder | Isolated Character Lab, real CC0 MakeHuman suited hero, rig/material/animation audit, static-review camera presets, repair tools | Active focused development; hero visual approval BLOCKED |
| Feature inspection | Shared inspection/focus.mjs; click/tap any surface, focus, orbit, bookmark, capture | Used in Character Lab and World editor; future builders reuse |
| Geometry Artifact | General v1 and measured eye-fit v2; experimental head-parented eyelid overlays v3; skinned facial socket remesh candidate v4 | v4 structural/Chrome PASS, human visual approval BLOCKED. The v1 generic artifact is **not** a general-purpose retopology engine |
| Materials | Procedural PBR; authored PNG/JPEG/WebP/KTX2 import; CC0 Poly Haven offline library; texture limits | Five material sets individually tested; combined budget and phone QA pending |
| Object Builder / Scene Builder | Intended specialized interfaces using shared 3D/geometry/material contracts | Not separately completed |
| Native graphics engine | Future C++/Vulkan/runtime ambition | NOT implemented; present runtime is Three.js/WebGL |
| Live interactive AI edits | Current world commands are mostly deterministic; generated GameSpec imported through file/artifact | Browser-to-agent authenticated service NOT implemented |

**Code locations:**
- Browser/runtime: index.html, editor.mjs, core.mjs, quest.mjs
- Agents/backend: ai/, db/, .github/workflows/blank-create-game-manual.yml
- Physics/characters: physics/, character/
- Standalone hero work: character-lab/, character-lab/index.html
- General inspection: inspection/focus.mjs
- General geometry: geometry/artifact.mjs, geometry/three-adapter.mjs
- Eye geometry pipeline: geometry/eyelid-fit.mjs (v2), geometry/eyelid-reconstruction.mjs (v3), geometry/eye-socket-remesh.mjs (v4); scripts/fit-hero-eyes.mjs, scripts/build-eye-sockets.mjs, scripts/eye-socket-v4-browser-smoke.mjs
- Texture system: materials/, scripts/prepare-material-library.mjs
- Tests: test/, test.mjs
- Current supporting documentation: docs/ (especially eye-socket-remesh-v4.md, eye-aperture-solver-v2.md, geometry-artifact.md, universal-inspection.md, character-builder-v1.md and character-v21-static-review.md)

## 3. Milestones — verified versus unfinished

### Alpha 0.1–0.5: functional game baseline

- Prototype procedural 3D Night Market with WASD/touch controls, deterministic scene generator, quest/barter-with-four-robots → lantern → gate.
- Six-agent NVIDIA workflow generated and validated actual GameSpec; PostgreSQL-backed project revision and six agent records committed. Verified workflow: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38743314124
- Alpha 0.5 manual Vercel preview exists. **Do not imply the live Vercel page includes subsequent GitHub-only Alpha 0.6 features.**
- A command parser bug with “daytime” / combined requests was corrected in GitHub; no one-off fix deployment authorized.

### Alpha 0.6: physical characters and asset handling

Implemented and verified across separate tests:
- Rapier physics, fixed-step movement, jump/land, collision world, crates, slope probe and procedural IK.
- Skinned character rigs, imported glTF GLBs, named locomotion clips, retargeting, skinning/sole calibration and stance locking foundations.
- Procedural and authored PBR texture maps, texture memory budgets, KTX2 loading/transcode and fallbacks.
- Independently authored CC0 material packs (concrete, asphalt, wood, rusted metal, leather), each independently validated in software-rendered Chrome.
- Instanced architectural facade details; tests proved bounded draw calls but screenshots still looked like early prototypes.

**Limitations:** physical Android GPU frame rate, thermal/load testing, visual foot sliding, nuanced facial movement and professional photorealistic graphics are NOT accepted. Reported ~20 FPS in headless software-rendered screenshots is not a physical-phone benchmark.

### Isolated Character Builder and hero

- Isolated Character Lab loads a pinned third-party MakeHuman/MPFB suited reference GLB: upstream https://github.com/kunalkushwaha/vsim/blob/3f97faf85e46d2f9a122b0a8b8d3ccc0af598f91/packages/assets/library/suited.glb. Upstream manifest describes CC0 skin and clothing sources. Verify provenance again before any redistribution.
- Original asset about 6.675 MB, 53-joint skeleton, three source skinned meshes, five texture maps, four authored idle/walk/run/wave clips. Do not equate generated eye nodes with additional joints.
- Fixed falsely transparent materials causing torn shirt/chest and facial artifacts. Preserved rig, original texture payload, animations.
- Added static hero review (neutral pose, 5 camera angles, lighting), material finishing; still bald, visually synthetic.
- Found the original skin face had a pink socket area and lacked separate eye geometry. Added head-bone-linked sclera, iris, pupil and catchlight meshes. The **immutable source** facial geometry is preserved; the **v4 output candidate** modifies a copy of the skinned face primitive.
- Built Universal Inspector for any 3D detail, with inspect/bookmark/close-up controls in Character Lab and game editor.
- Built general Geometry Artifact v1 for reversible measured local transforms with optional mirrored correction.
- Built **Geometry Artifact v2 eye aperture solver** using real source facial mesh boundary loops, not inferred image pixels. Tested in Chrome, but **still NOT visually approved**.

### Historical eye-fit v2 milestone (baseline commit 92c4588)

- **152/152 regression tests passed**, including **6/6 real-GLB fitting tests**, plus Chrome interaction test.
- Successful workflow: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38842660754
- **Measured eyelid openings (native GLB meters):** left and right each 28 boundary vertices; 24.61 mm opening width and ~8.01 mm height; horizontal centers ~−34.36 mm and +34.36 mm in the source bind-pose frame.
- Coupled fit solver positions/scales both sclera, iris, pupil and catchlights against measured contours, with **0.35 mm projected 2D contour clearance**. This is NOT verified three-dimensional clearance or complete eyelid sealing.
- Current artifact: geometry/artifacts/hero-eye-assembly.geometry.json; source GLB pinned by SHA-256, contour coordinates included. General sample: geometry/artifacts/hero-eye-sclera-calibration.geometry.json.
- Documentation: docs/eye-aperture-solver-v2.md.
- Known failure: pink exposed eyelid rims and artificial eye appearance remain in actual Chrome close-ups; three-quarter/profile/gaze/blink approval is blocked.
- Chrome files from runs are time-limited Actions artifacts: regenerate using scripts and manual workflow, rather than assuming an old ZIP still exists.

### Eyelid reconstruction v3 — historical technical milestone

- Commit lineage culminated in passing run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38847010619: 162 engine tests passed, 2 fixture-gated skips; 4/4 real GLB tests passed; Chrome/Three.js universal-inspector face macros, profile, three-quarter and mobile captures passed.
- Added four **rigid head-parented** upper/lower lid surface meshes (224 triangles), keeping source face untouched. This was an experimental overlay, not skinned/watertight facial retopology.
- Correct reproducible fitted hero SHA-256: `a968567c4c61f06de8d09601bbaeba721f79d3f06d91a433968cefc7f93efcb0`. An older archived `207ba426...` source hash was superseded and must not be used as the current build input.
- Visual review **BLOCKED**: residual pink seams, protruding/artifical eyes, separate lid-to-face material transition, no blinking/gaze. v3 is superseded as the primary P0 experiment by v4.

### Eye-socket remesh v4 — latest verified technical milestone (2026-10-16)

- Engineering commit https://github.com/autonomousagentuniverse/blank-engine-lab/commit/98fd300a29879ee03fb26afb16aabded0584d2c4; verification https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38879560781 **SUCCESS**; subsequent QA archiving/manual-workflow cleanup commit https://github.com/autonomousagentuniverse/blank-engine-lab/commit/f6acba64ab7ea5c12d85129bcebe7c44154bb660.
- Full regression **171 PASS / 2 SKIPPED / 0 FAIL**; actual fitted-GLB tests **9/9 PASS**; real Three.js headless-Chrome neutral macros, profile, three-quarter and mobile captures completed. This is **software WebGL** evidence, not an Android hardware FPS measurement.
- Experimental `geometry/eye-socket-remesh.mjs` edits a **copy** of the original skin-weighted `base` GLB primitive: 112 extra inherited-weight vertices, 224 new bridging triangles, 348 front-facing inner-socket vertices recessed **per eye** by up to 2.7 mm, and eight paired eye components recessed 1.2 mm. Original input bytes, 53 joints and four authored animation clips remain preserved.
- `scripts/build-eye-sockets.mjs` produces a **source-SHA-pinned generated v4 geometry artifact and GLB**, rather than a checked-in v4 JSON under `geometry/artifacts/`. v2 and v3 sidecars remain in that folder. No claim of generic automatic remeshing or complete eyelid anatomy.
- **Human photorealism review BLOCKED:** sclera seating improves modestly, but pink eyelid rims, UV/material mismatch, unnatural eye/surface transitions and absent blink/gaze remain. Vercel is still on Alpha 0.5. QA is manual `workflow_dispatch` only.


## 4. Geometry Artifact design — evergreen contract

Geometry artifacts are **data**, not merely screenshots or untracked instructions.

**General v1:** schema blank.geometry.v1; asset SHA-256; named target mesh; local geometric bounds; parent-local baseline transform; requested translation/scale; permitted limits; optional measured envelope; optional mirrored target; computed solution; visual-review status. Reversible editor preview/undo. Import/export sidecar does not modify original GLB automatically. A box-envelope pass does not certify mesh fit.

**Measured eye-fit v2:** schema blank.geometry.eye-fit.v2; pinned corrected source GLB; raw contour coordinates and duplicate-UV-loop accounting from actual mesh boundary topology; symmetry checks; face/head coordinate transforms; grouped left/right eye component transforms and projected fit constraints; review still required. It deliberately rejects unrelated GLBs rather than applying the pinned hero's anthropometric measurements to arbitrary characters.

**Historical eyelid v3:** `blank.geometry.eyelid-reconstruction.v3`; four rigid head-attached candidate surfaces, with a checked-in reproducible sidecar. This reduces some visible socket exposure but does not repair the original face topology or material transitions.

**Experimental socket v4:** `blank.geometry.eye-socket.v4`; modifies a copy of the original skinned `base` mesh with inherited weights and additional connecting triangles. The builder emits a source-hashed GLB and artifact at user-specified output paths. It does **not** guarantee texture continuity, anatomical completeness, watertightness or human-approved photorealism; tests and review stay distinct.

**Long-term generalized pipeline:** inspect selected feature → measure real geometry/topology → define constraints and target → compute candidate(s) → non-destructive preview → compare repeatable close-ups and silhouette → physics/rig/UV validation → approve/reject → export asset and machine-readable artifact. Any automated authoring agent should log measurement source, assumptions, failures and changes.

## 5. Next job (P0): fix v4 eye-to-skin UV/material continuity and facial transitions

**Verified starting point:** v4 has already passed source-pinned real-GLB, full regression and Chrome technical QA (run 38879560781), but the human visual gate is BLOCKED. The v3 overlay and v4 skinned socket reconstruction are **completed experiments**; do not start over with another unmeasured eyeball-size adjustment or treat structural test success as realism.

**Remaining technical problem:** The source head has two UV-split 28-vertex eye boundaries per side. The v4 bridges inherit source UV/material data, leaving red/pink texels around the seam, mismatched normals/color at the eyelid-to-face transition, and an artificial eye/socket silhouette. Blinking and gaze remain unimplemented. Inspect whether continuity can be repaired with safe UV remapping, normal/tangent continuity and physically plausible local topology; do not cosmetically hide the problem with a flat overlay.

**Next execution plan:**

1. **Refresh evidence:** Verify live main HEAD, the pinned upstream CC0 source and all corrected-source SHA-256 values; read `docs/eye-socket-remesh-v4.md` and `geometry/eye-socket-remesh.mjs`. Run the manual v4 pipeline and preserve source-v4 before/after images with identical camera, pose, lighting, exposure and material setup.
2. **Measure UV/material failure:** Trace outer/inner 28-point contours to actual material slots, UV islands, sampled atlas texels, normal directions, skinning attributes and adjacent triangle edges. Document which red/pink exposure is geometry, which is UV sampling, and which is shading/depth. Use front, left/right profile, three-quarter and true macro via the Universal Inspector.
3. **Implement a bounded, reversible candidate:** Change only a copy of the original skinned face/eye interface; preserve source bytes, provenance, weight normalization, 53 joints, 4 clips, and v1–v4 artifact interoperability. Record exact source hash, modified faces/UVs/normals, tolerances, generation parameters and limitations in the output geometry artifact. Use actual materials; no screenshot-only correction or flat fake-skin patch.
4. **Validate both data and pixels:** Reject source mismatches, invalid UVs, inverted/degenerate faces, broken joints/weights, self-intersections, visual gaps and undo failures. Run `npm test`, pinned-fixture GLB tests and manual real Three.js/Chrome captures at matched cameras; inspect remaining pink patches, socket rim, side silhouette and moving head. No claim that a headless software render benchmarks a physical Android device.
5. **Review or escalate:** Submit comparable full-face, macro, profile and three-quarter evidence for **human** acceptance/rejection. If still synthetic, report **BLOCKED** and consider a better verified-licensed head/eyelid asset or artist-authored retopology instead of repeatedly shifting the eye assembly.

**Definition of done:** A source-pinned, reproducible, reversible material/topology correction with passing structural and browser checks, a documented human visual verdict, and a preserved unfixed baseline for comparison. Do not declare P0 complete, start mass NPC generation, or deploy Alpha 0.6 while photorealism review is blocked.

## 6. Subsequent roadmap / release gates

**P1 — Hero realism after eyelids:** geometry-quality face/eyes, eyelid animation/gaze if supported, credible brows/lashes/hair or deliberate shaved scalp, skin material shading under studio + daylight, clothing seam/fit, hand/foot detail. Preserve authorship/license. Do static image review before motion polish.

**P2 — Character motion:** authored idle/walk/run/jump/interact, cross-skeleton calibration, stance foot locking, surface-dependent IK, hand contacts, clip/foot slide visual review. Physics stays authoritative. The current suited hero has four source clips; do not assert jump/contact animations are already authored.

**P3 — Standalone builder packaging:** export GLB + CharacterSpec + provenance + geometry artifact; compatibility contract into runtime; source asset kept independent. Later create Object Builder and Scene Builder using Universal Inspector and Geometry Artifact; do not duplicate the inspection code.

**P4 — Production scene/material realism:** professional licensed assets, correct UV/physical scale, lighting, believable structures and props; LOD/compression, simultaneous material budgets, build a convincing isolated architectural section before full Night Market scale.

**P5 — Alpha 0.6 major release acceptance:** pass static hero visual gate, actual integrated physics/animation/geometry/texture browser QA, real Android tests (FPS, thermal, load, memory), save/reload story, regression, manual human sign-off. Then and only then request approval for **one manual Vercel deployment**. No auto GitHub↔Vercel linking.

## 7. Operating rules for future agents

1. **Read this file, AGENTS.md and the domain docs before editing.** Refresh GitHub main, test statuses, and source files; don't rely on this snapshot if main moved.
2. **GitHub source of truth** is autonomousagentuniverse/blank-engine-lab; account autonomousagentuniverse. Repo is public; never commit secrets, connection URLs, unreleased user data, or unauthorized proprietary assets.
3. **No Vercel deploy** without explicit user approval for a major release. Do not add automatic deploy triggers. Test workflows should be workflow_dispatch-only; if a specifically authorized one-shot test must temporarily use a push trigger, remove it after verification.
4. Server-only GitHub Actions secrets are named NVIDIA_API_KEY and BLANK_PG_URL; never send them to WebGL/JS or log their values.
5. Preserve game editor, quest, physics, imported motion and existing geometry when changing Character Lab. Make patches minimal and test compatibility.
6. **Real tests versus visual approval:** distinguish unit, live-library, Chrome/SwiftShader and actual Android measurements. Never call an asset photorealistic simply because it loads.
7. Every geometry/material correction must have comments explaining **what was measured, what changed, what was preserved, assumptions, and remaining limitations**, plus repeatable tests and screenshots.
8. Apply fixes to the real GLB or explicit versioned patch/artifact, not a misleading rendered still alone. Every preview must be reversible; report whether source bytes are changed or not.
9. Record exact commit SHA and workflow URL in milestones. If tests fail, disclose failures and fix; don't invent passing results, metrics, or screenshots.
10. Prefer no deployment over exposing unfinished work; preserve source provenance/license; downloadable CI artifacts expire, so keep reproducible scripts.
11. Keep the user updated while doing long multi-step work; finish with verified outcome and clear next action.

## 8. Resume checklist for the next session

- [ ] Read `AGENTS.md`, `docs/CONTINUITY.md`, `docs/continuity-state.json` and check the **current GitHub main HEAD**; the pre-reconciliation engineering HEAD was `f6acba64ab7ea5c12d85129bcebe7c44154bb660`.
- [ ] Start with `docs/eye-socket-remesh-v4.md`, `geometry/eye-socket-remesh.mjs`, `scripts/build-eye-sockets.mjs` and `test/eye-socket-remesh.test.mjs`; use v2/v3 only as source/history.
- [ ] Confirm run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38879560781: v4 171 PASS, 2 SKIPPED, 0 FAIL; pinned GLB 9/9 PASS; Chrome success, **human review BLOCKED**.
- [ ] Rebuild the licensed source, source-pinned eye-fit v2 and socket candidate v4; verify source hash before editing. A generated v4 sidecar is **not** checked into `geometry/artifacts/`.
- [ ] Inspect actual skin atlas UV seams/texels, normals, eyelid depth and face-socket continuity using identical inspector macros, profile and three-quarter views.
- [ ] Create only a reversible, measurable material/topology patch; validate structural/browser tests and actual comparative captures; preserve clips/rig.
- [ ] Obtain explicit human visual acceptance or record **BLOCKED** with exact remaining defects; complete real physical Android measurements separately before major release acceptance.
- [ ] **Before changing any project file**, add dated `[PROPOSED]` continuity entry; each commit must include updated `docs/CONTINUITY.md` and tests/status with `[COMMITTED]` entry. Update `docs/continuity-state.json` at milestones.
- [ ] Retain only manual `workflow_dispatch` workflows; **no Vercel deployment** until explicit approval for a major release.

## 9. Key links and evidence

- Project repo: https://github.com/autonomousagentuniverse/blank-engine-lab
- Historical v2 baseline: https://github.com/autonomousagentuniverse/blank-engine-lab/commit/92c4588a99c4b22661a05197b8585da8334b806f
- Latest reviewed v4 engineering HEAD (before docs reconciliation): https://github.com/autonomousagentuniverse/blank-engine-lab/commit/f6acba64ab7ea5c12d85129bcebe7c44154bb660
- v4 source-pinned Chrome/real-GLB verification: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38879560781
- v3 historical Chrome/real-GLB verification: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38847010619
- Successful eye-fit QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38842660754
- Geometry v1 QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38840053847
- Universal inspector QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38837769431
- Character eye mesh QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38834968357
- CC0 material catalogue QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38801721687
- AI GameSpec + DB run: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38743314124

**Current verified handoff (2026-10-16):** Geometry v4 technically verified; **human photorealism review remains BLOCKED**. Historical v2/v3 results are retained for provenance, not described as the latest work. Update this document with each proposal and commit; refresh docs/continuity-state.json at substantial milestones.

## 10. Mandatory continuity updates for proposals and commits

**Owner decision (2026-10-15):** `docs/CONTINUITY.md` MUST change with **every commit that changes any other project file**, and with **every proposed change**, not just major milestones. This document is the canonical filename (the owner's “Continuity.mf” refers to `CONTINUITY.md`).

### How to record changes

1. **When proposing** work: append a dated entry in the ledger below using `- YYYY-MM-DD [PROPOSED] ...`. Document motivation, intended files/scope, uncertainties, planned tests, and next action **before starting code modifications**. For a PR, include it in the proposed diff.
2. **At each commit:** update this same document in the same commit with `- YYYY-MM-DD [COMMITTED] ...`, recording actual changes, PASS / FAIL / NOT RUN evidence, any unresolved issue, and what's next. A proposal entry may remain for auditability; don't silently rewrite past failures.
3. **For an unmerged PR:** run `node scripts/check-continuity.mjs --base origin/main` and complete the PR template. If multiple source commits are made, keep this document updated with each commit, not just one change somewhere in the overall PR.
4. **When using connected GitHub API tools or web UI:** atomically include the continuity file in the same commit. Local Git hooks **do not run** during API-based writes.
5. **At meaningful technical milestones:** also update `docs/continuity-state.json` with status, verified evidence, priority and remaining blockers. Update `AGENTS.md` if operating rules change.
6. **Honesty:** a proposed fix is not a verified fix; don't claim successful tests or photorealism acceptance without evidence. Nothing here authorizes a Vercel deployment or exposes server-side secrets.

### Validation and limitations

- Enable the local pre-commit hook in a developer checkout: `git config core.hooksPath .githooks` (or `npm run continuity:enable-hook`). This runs the staged-diff guard in `scripts/check-continuity.mjs`.
- For proposed branch changes, run `node scripts/check-continuity.mjs --base origin/main`. Any source/documentation diff lacking an accompanying dated `[PROPOSED]` or `[COMMITTED]` entry fails the local validator. A change consisting solely of `docs/CONTINUITY.md` is allowed for administrative maintenance.
- `.github/pull_request_template.md` specifies the same rule for code review.
- **Enforcement boundary:** These are programmatic **local** guards and agent operating rules, not an always-on GitHub branch rule. GitHub's web editor and connector API can bypass local hooks; mandatory remote prevention would require a required GitHub status check / branch ruleset. That is not enabled here because the prior instruction keeps permanent GitHub Actions workflows manual-only. Do not claim it is impossible to push a noncompliant commit remotely.

### Change ledger

- 2026-10-15 [PROPOSED] Require explicit continuity updates for all proposed work and every project commit. Add a dated engineering ledger, agent requirements, staged-Git guard, PR checklist and tests without enabling automatic deployment or workflows. Remote API bypass remains a known risk.
- 2026-10-15 [COMMITTED] Implemented continuity-update policy, local pre-commit validator, PR template, npm helper commands and validator tests. Eight focused unit tests and a real Git-staging rejection/acceptance test passed locally; full game-engine suite NOT RUN for this policy-only change. GitHub-hosted remote enforcement remains unconfigured and must not be implied.
- 2026-10-15 [PROPOSED] Geometry Artifact v3 / Character Builder: reconstruct anatomically plausible upper and lower eyelid lip/transition surfaces from measured 28-vertex eye apertures, local depth/normals, existing face topology and skin weights. Preserve the original CC0 hero, 53 joints, clips and UV/material provenance; produce a reversible source-hashed v3 artifact plus separate GLB candidate, validate watertight/normal/skin constraints and test real neutral front/profile/three-quarter/macro Chrome screenshots. Expected outcome is a geometrically sound preview, NOT automatic photorealism approval. Tests NOT RUN for v3 (proposal only); pink rims and eyelid/eye depth are still blocked. Next: implement contour depth audit and non-destructive lid candidate, then visual review.

- 2026-10-15 [COMMITTED] Geometry Artifact v3 initial non-destructive lid-surface candidate: added geometry/eyelid-reconstruction.mjs, reproducible CLI, a source-hashed measured v3 sidecar, tests, browser smoke runner and review documentation. On the pinned corrected CC0 hero, generated four head-bone-attached curved upper/lower lid meshes (224 additional triangles), preserving all original source GLB mesh data, 53 rig joints and four authored animations. Four focused local tests PASS; real GLB opened in an offline VTK renderer, and red-pixel proxy in fixed crop fell from 6179 to 2583 (~58% fewer) under identical offline lighting. Real Chrome/Three.js CI: PENDING (must not call passed yet). PHOTOREALISM: BLOCKED; residual pink rim, synthetic eye/eyelid geometry, distinct skin tone and absent blinking; overlay is not watertight retopology or skinned blinking. Next: inspect Chrome macro/profile/three-quarter images and refine or reject the geometry proposal. Do not deploy Vercel.
- 2026-10-15 [COMMITTED] Re-ran v3 QA after first CI source-hash rejection. Entire engine suite: 162 PASSED, 2 SKIPPED (fixture-gated), 0 FAILED; real GLB tests: 2 PASSED, 2 FAILED because newly rebuilt hero-v22 SHA differs from archived source used locally, so Chrome was SKIPPED. This is a deliberate provenance failure, not proof that geometry fit is sound on the fresh build. Updated one-time CI workflow to print SHA-256 of original and corrected source for reconciliation; rerun pending. Next: pin exact reproducible current builder output, reject unrecognized assets, then rerun v3 geometry and browser tests.
- 2026-10-15 [COMMITTED] Resolved v3 source-provenance mismatch without weakening hash verification. The prior archived corrected GLB had SHA 207ba426..., but the current pinned upstream input with the repo's hero-eyes-build.mjs deterministically produces a968567c4c61f06de8d09601bbaeba721f79d3f06d91a433968cefc7f93efcb0 (confirmed by live GitHub Actions job 38846202121). Updated v3 to accept ONLY that exact corrected source, regenerated measured v3 artifact, corrected review documentation. Four focused real-GLB tests PASS locally with the current source; offline fixed-crop strongly-red pixel proxy 6183 before vs 2593 after (not a visual acceptance). Chrome GitHub run PENDING; material/eyelid fidelity remains BLOCKED. Next: real Chrome evidence, then remove one-time workflow and document results.
- 2026-10-15 [COMMITTED] v3 provenance corrected, current CI run 38846376452: engine regression suite PASS (162 passed, 2 fixture-gated skipped, 0 failed), four pinned real-GLB v3 tests PASS, reproducible measured candidate and sidecar generated PASS; Chrome stage FAILED before loading due to ERR_HTTP_HEADERS_SENT in temporary browser-test file server. This is a server-error-path bug, NOT a verified geometry result. Fixed test server to read file before sending HTTP 200 and to send 404 only if headers unsent; new Chrome verification PENDING. Original source/face/53 joints and four clips unchanged, visual realism BLOCKED.
- 2026-10-15 [COMMITTED] v3 QA run 38846473493: regression tests and source-pinned real-GLB reconstruction passed, but Chrome failed before loading character because the test server returned 404 for /character-lab/ instead of its index.html. Patched the smoke server directory-index mapping and added an explicit 200 assertion; browser visual evidence PENDING, photorealism still BLOCKED. Next: rerun browser, archive screenshots, remove one-time test trigger.
- 2026-10-15 [COMMITTED] v3 Chrome test run 38846611087 correctly loaded both original and eyelid-v3 character and captured before/after images; the smoke test then failed on a stale UI assertion expecting status 'Loaded' after the neutral pose had legitimately changed status to 'Neutral idle pose frozen'. Replaced with an accurate neutral-state assertion, preserving 4-clip audit. Remaining macro/profile/mobile browser checks PENDING; visual approval BLOCKED.
- 2026-10-15 [COMMITTED] v3 run 38846736838 technical Chrome verification PASS (real source and candidate GLBs load, original 4 clips remain, front/profile/three-quarter/mobile captures; engine 162 passed/2 skipped, pinned-real v3 4 passed). Visual check remains BLOCKED. Images exposed that the standard Character Lab face preset was not macro enough to evaluate eyelid detail; added explicit universal-inspector ray pick, 0.34 m focus-distance before/after screenshots and failure on missing selected geometry. New comparison run PENDING. Next: inspect close-up macro, report actual remaining defect; cleanup temporary workflow.
- 2026-10-15 [COMMITTED] Geometry Artifact v3 technical milestone acceptance: GitHub run 38847010619 PASS, with engine regression 162 passed/2 fixture skips, 4 real GLB v3 tests PASS, source-checked builder PASS, real Three.js Chrome before/after universal-inspector face macros, profile/three-quarter/mobile screens PASS. Source hero SHA a968567c4c61f06de8d09601bbaeba721f79d3f06d91a433968cefc7f93efcb0, added 4 rigid head-parented upper/lower eyelid surface meshes, 224 triangles, unchanged original face data/53 joints/4 clips. Visual appraisal remains BLOCKED: pink exposure reduced but protruding eyeballs, material discontinuity, artificial lids and no blink/gaze remain. Source-v3 module and .geometry.json retained; temporary push test trigger REMOVED, manual-only workflow retained. Next: author or acquire robust eyelid/head topology and consistent skin material; do not deploy Vercel.

- 2026-10-16 [PROPOSED] Geometry v4 replaces independent eyelid overlays with a source-pinned modification of the original skinned face primitive; measure both actual UV split boundaries per eye, preserve source face weights/animations, and validate close-up Chrome imagery before human approval. This is NOT a photorealism claim.
- 2026-10-16 [COMMITTED] Experimental v4 skinned facial socket primitive with unchanged original weights: source-pinned on actual v2 eye-fitted MakeHuman GLB, adds 112 skin-weighted face vertices/224 triangles in the original `base` primitive, recedes 348 front-facing inner-socket vertices per eye up to 2.7 mm and eight linked eyeball components 1.2 mm. Nine focused real-asset tests passed locally. A first test caught unintended back-head edits; narrowed depth bounds and retested. VTK untextured comparison performed; realistic face materials and Chrome browser review remain UNVERIFIED/BLOCKED. One-time GitHub browser QA workflow prepared; next verify, archive results, delete push trigger; no Vercel deploy.
- 2026-10-16 [COMMITTED] Geometry v4 real Chrome evidence + manual-only QA cleanup: GitHub run 38879560781 SUCCESS, 171 passed / 2 skipped / 0 failed in full suite; 9/9 actual fitted-GLB reconstruction tests PASS; original skeleton (53 joints), 4 authored clips, skinning prefix and eye-depth alignment confirmed; neutral before/after macros, profile, three-quarter and mobile Chrome captures saved as time-limited workflow evidence. Human visual review remains BLOCKED: slightly improved sclera seating, pink exposed eyelid rims and artificial socket-to-skin transitions. Renderer evidence is headless Chrome software WebGL, NOT a measured Android FPS test. Removed one-shot push-trigger and retained workflow_dispatch-only v4 verification. Next: repair residual texture UV/color and surface continuity on original skinned eyelid geometry, followed by actual close-up human acceptance; do NOT deploy Vercel.
- 2026-10-16 [COMMITTED] Documentation-only continuity reconciliation from reviewed HEAD f6acba64ab7ea5c12d85129bcebe7c44154bb660: corrected active P0 from already-implemented v3 reconstruction to v4 residual UV/material and skin/eyelid transitions, archived v2/v3 chronology, linked successful v4 run 38879560781 (171 pass, 2 skipped, 0 failed; nine pinned GLB pass; Chrome success), corrected stale checklists/evidence, aligned AGENTS.md and docs/continuity-state.json. Validation: document cross-field/content assertions PASS; engine tests NOT RUN (no runtime changes); photorealism BLOCKED; GitHub remote continuity branch enforcement not enabled. Next: measured reversible v4 UV/material repair and human before/after visual decision; no Vercel deploy.
- 2026-10-16 [PROPOSED] Experimental v5 sample in branch experiment/eye-v5-github-sample: correct v4 new-triangle backface winding, collapsed UV mapping and new-ring normals without altering original face/eye rig; run same-camera Three.js Chrome before/after via branch-scoped one-shot GitHub Actions, then remove temporary push trigger. Expected real A/B evidence, **not** assumed photorealism; Vercel untouched.
- 2026-10-16 [COMMITTED] Trial-only script, Chrome A/B workflow, and experiment instructions added together with continuity. Prior local Python prototype passed on archived v4 GLB: all 224 new triangles repaired from zero UV and backwards winding to valid UV and positive normals; original face prefix preserved; median oriented face-normal error about 140.5° -> 18°. GitHub workflow: PENDING at commit; next collect real Chrome run evidence and remove one-shot branch-only push trigger; human visual review BLOCKED.
- 2026-10-16 [COMMITTED] Experimental v5 GitHub workflow run 38893284477 SUCCESS from sample branch commit 122c649 (full engine suite and pinned v4 GLB checks PASS; v5 structural audit PASS; actual Three.js Chrome macro/profile/three-quarter/mobile A/B capture PASS). 224/224 previously degenerate-UV and reverse-wound v4 new triangles became 0/224; normal mismatch median 140.508° -> 17.961° oriented. Actual equal-camera macro changed only 1006/404460 pixels by >3 RGB levels (~0.25%), with pink rims and visibly synthetic sockets still present: VISUAL IMPROVEMENT NOT ACCEPTED / PHOTOREALISM BLOCKED. Workflow sample archive: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38893284477 (7-day artifacts). Removed one-time branch push trigger in the same commit, restoring workflow_dispatch-only. Next: test measured connection of outer/inner eyelid UV seams and replacement of pink atlas texels with anatomical fitting, not repeated UV/winding tweaks. No main merge or Vercel deployment.
- 2026-10-16 [PROPOSED] Experimental v6 source-contour eyelid bridge: replace v5's structurally sound but visually ineffective added rim with a measured 3D transition from its inner lip to the original paired 28-vertex socket boundary, sampled in skin UV island without touching original pink socket UVs. Test same-camera Three.js/Chrome visual result, full real-asset regressions, artifact checks; **no claim of photorealism** and no live deploy.
- 2026-10-16 [COMMITTED] Isolated v6 generator, manual workflow with temporary experiment-branch push trigger for one test, matching Chrome v5/v6 before-and-after camera screenshots and research notes. Local geometry prototype PASS: original contour separation ~2.313 mm mean both eyes; +112 skinned vertices/+224 triangles; 0 degenerate UV/3D or inverted normals; unmodified source face data. GitHub test PENDING; next inspect actual rendered result, record BLOCKED/PASS honestly, remove push trigger. No Vercel deployment.
- 2026-10-16 [COMMITTED] GitHub experimental v6 review and test-trigger cleanup: workflow run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38895668953 SUCCESS, builds source-pinned v5/v6, engine/pinned-GLB tests PASS, v6 geometry QA PASS (two 28-point contours, mean gap 2.313 mm, +112 vertices/+224 triangles, no degenerate UV/3D or inverted shading normals), Chrome real Three.js A/B screenshots PASS. **VISUAL FAIL/BLOCKED:** matched before/after eye-region screenshot crop has 0 changed pixels (threshold >8 RGB units), and pink rims and synthetic eye remain; structural completion cannot be counted as eye repair. Removed single-use experiment-branch push trigger and retained workflow_dispatch only. Next: investigate camera-visible triangle depth, face/backface occlusion and texture atlas sampling with per-surface debug render and visibility measurement before another topology change. No production merge, no Vercel deploy.
- 2026-10-16 [PROPOSED] Research followup to visually invisible v6: actual Character Lab front camera is +Z but v5/v6 experimental 448 triangles face -Z, explaining a possible complete backface-culling failure. Preserve source mesh, invert only experimental triangle winding to front and derive normals from corrected geometry, then compare real Chrome v6/v7; don't assume appearance improvement. Manual-only branch workflow gets a single temporary scoped push trigger for CI; no deployment.
- 2026-10-16 [COMMITTED] v7 camera-facing experimental patch, same camera Chrome A/B and one-shot branch-only GitHub test. Local preflight PASS on archived exact v6 SHA: 448/448 experimental triangles front +Z, original 15,500 triangles/8,456 source vertex normals untouched. GitHub full/Chrome QA PENDING; visual BLOCKED until screenshot review. Remove push trigger after run; no Vercel deploy.
- 2026-10-16 [COMMITTED] v7 front-visible eye geometry GitHub test PASS technically, human realism BLOCKED: workflow https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38896437213 completed SUCCESS, source-hashed v6→v7 build, 448 newly added v5/v6 faces oriented toward +Z Character Lab camera, original base 15,500 triangles and 8,456 source normals unchanged, engine regression and real-GLB tests PASS, Three.js Chrome comparison PASS. Pixel audit on identical Chrome macro crop x185..445 y280..365: v6→v7 3.946% pixels changed at >8 RGB-channel threshold (v5→v6 had 0%); confirms prior culling suppressed the visible effect. **VISUAL BLOCKED:** pink upper/lower eye rims and visibly artificial iris/sclera/face shading persist; do not merge to main as realism fix. Removed temporary experiment-branch push trigger, retaining manual-only workflow_dispatch; next inspect atlas UV ownership, eye shape/material system and correct eyelid anatomy with human review. No Vercel deployment.
- 2026-10-16 [PROPOSED] Ask Kimi independently to diagnose ongoing v4–v7 pink eyelid/texture failure. Owner supplied GitHub Actions repo secret names MOONSHOT_API_KEY and MOONSHOT_ID (values never read/exposed). Create isolated experiment/kimi-eye-review branch, read-only script using Moonshot /models and chat/completions, include actual source files and optional archived v7 real-Chrome macros. Return report as Actions artifact. No production edits or deploy.
- 2026-10-16 [COMMITTED] Added standalone read-only Kimi eye-review script and GitHub Actions workflow with one-time scoped experimental push trigger + manual dispatch; continuity updated atomically. Validation: Python source syntax review preflight planned; GitHub CI and external Kimi response PENDING at commit. If Kimi unavailable, report failure without pretending an answer. Next: verify run and retrieve original Kimi output, remove trigger, log substantive findings. Human photorealism review BLOCKED; no Vercel deploy.
- 2026-10-16 [PROPOSED] First independent Moonshot Kimi /chat/completions request failed due confirmed network read timeout after 245 seconds in run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38901358182, with no Kimi answer/artifact. Retry with 2400-character excerpts of 7 most relevant code/docs files, text-only input up to 23.5k characters, kimi-k2.6 or kimi-k2.5 non-thinking, 4200 token output cap, 125 second timeout. No secrets exposed or production edits.
- 2026-10-16 [COMMITTED] Bounded Kimi review retry after read timeout: source code shortened, documented faster non-thinking model selected via /models, image input excluded, restricted second one-shot branch-only push for test; continuity appended. Current evidence: first Kimi run FAIL/TIMED OUT and no answer; second run pending. Next retrieve response or explicit error, remove push trigger; human photorealism BLOCKED and no Vercel deploy.
