# Blank Engine — Project Continuity, Architecture and Next Execution Plan

**Snapshot:** 2026-10-16 UTC (2026-10-15 US evening)
**Repository:** https://github.com/autonomousagentuniverse/blank-engine-lab
**Baseline commit:** 92c4588a99c4b22661a05197b8585da8334b806f
**Release:** Alpha 0.6 development on GitHub; Vercel remains on manually deployed Alpha 0.5
**Purpose:** Authoritative handoff for a new engineer or AI agent. Read this before making changes.

> **State of the project:** The systems are technically advancing, but the one hero character has **not** passed photorealism review. The next job is topology-aware eyelid reconstruction on the actual measured face, not another invented eye-size guess, lighting-only change, or premature game-wide rebuild.

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
| Geometry Artifact | General bounded translation/scale sidecar v1; measured paired-eye contour solver v2 | Both implemented/tested; **not** a topology-reconstruction engine |
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
- Real eye-fit pipeline: geometry/eyelid-fit.mjs, scripts/fit-hero-eyes.mjs, scripts/eyelid-fit-browser-smoke.mjs
- Texture system: materials/, scripts/prepare-material-library.mjs
- Tests: test/, test.mjs
- Current supporting documentation: docs/ (especially eye-aperture-solver-v2.md, geometry-artifact.md, universal-inspection.md, character-builder-v1.md and character-v21-static-review.md)

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
- Found original skin face had pink socket area and lacked separate eye geometry. Added head-bone-linked sclera, iris, pupil and catchlight meshes. Original facial topology remains.
- Built Universal Inspector for any 3D detail, with inspect/bookmark/close-up controls in Character Lab and game editor.
- Built general Geometry Artifact v1 for reversible measured local transforms with optional mirrored correction.
- Built **Geometry Artifact v2 eye aperture solver** using real source facial mesh boundary loops, not inferred image pixels. Tested in Chrome, but **still NOT visually approved**.

### Latest verified milestone (baseline commit 92c4588)

- **152/152 regression tests passed**, including **6/6 real-GLB fitting tests**, plus Chrome interaction test.
- Successful workflow: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38842660754
- **Measured eyelid openings (native GLB meters):** left and right each 28 boundary vertices; 24.61 mm opening width and ~8.01 mm height; horizontal centers ~−34.36 mm and +34.36 mm in the source bind-pose frame.
- Coupled fit solver positions/scales both sclera, iris, pupil and catchlights against measured contours, with **0.35 mm projected 2D contour clearance**. This is NOT verified three-dimensional clearance or complete eyelid sealing.
- Current artifact: geometry/artifacts/hero-eye-assembly.geometry.json; source GLB pinned by SHA-256, contour coordinates included. General sample: geometry/artifacts/hero-eye-sclera-calibration.geometry.json.
- Documentation: docs/eye-aperture-solver-v2.md.
- Known failure: pink exposed eyelid rims and artificial eye appearance remain in actual Chrome close-ups; three-quarter/profile/gaze/blink approval is blocked.
- Chrome files from runs are time-limited Actions artifacts: regenerate using scripts and manual workflow, rather than assuming an old ZIP still exists.

## 4. Geometry Artifact design — evergreen contract

Geometry artifacts are **data**, not merely screenshots or untracked instructions.

**General v1:** schema blank.geometry.v1; asset SHA-256; named target mesh; local geometric bounds; parent-local baseline transform; requested translation/scale; permitted limits; optional measured envelope; optional mirrored target; computed solution; visual-review status. Reversible editor preview/undo. Import/export sidecar does not modify original GLB automatically. A box-envelope pass does not certify mesh fit.

**Measured eye-fit v2:** schema blank.geometry.eye-fit.v2; pinned corrected source GLB; raw contour coordinates and duplicate-UV-loop accounting from actual mesh boundary topology; symmetry checks; face/head coordinate transforms; grouped left/right eye component transforms and projected fit constraints; review still required. It deliberately rejects unrelated GLBs rather than applying the pinned hero's anthropometric measurements to arbitrary characters.

**Long-term generalized pipeline:** inspect selected feature → measure real geometry/topology → define constraints and target → compute candidate(s) → non-destructive preview → compare repeatable close-ups and silhouette → physics/rig/UV validation → approve/reject → export asset and machine-readable artifact. Any automated authoring agent should log measurement source, assumptions, failures and changes.

## 5. Next job (P0): reconstruct the eyelid surfaces, not another eyeball-only tweak

**Technical problem:** The current solver fits eye components *inside a projected contour* but does not generate correct eyelid surfaces around the eyeball. It cannot solve exposed pink rim, side-view gaps, proper upper/lower lid overlap, corneal shape or blinking by changing eye transforms alone.

**Proposed implementation sequence:**

1. **Baseline and source lock.** Checkout main at this snapshot or later; check current revision before modifications. Rebuild the pinned hero via scripts/hero-eyes-build.mjs and fit with scripts/fit-hero-eyes.mjs. Record source hashes, eye component transforms, face vertex/index/UV/skin accessor ranges, and neutral pose. Capture front, side, three-quarter and eye macro at consistent camera coordinates. Preserve before images.
2. **Real 3D lid profiling.** For both 28-point eyelid contours, measure not only XY opening but Z-depth, surface normals, depth relative to fitted sclera and local tangent. Audit triangles, winding, UV seam duplication, eyelid boundary adjacency and skin weights. Check mirrored and asymmetric cases instead of assuming simple ellipses.
3. **Construct a reversible topology-aware proposal.** Under a new geometry module (e.g. geometry/eyelid-reconstruction.mjs), generate controlled upper/lower eyelid lip/inner transition surfaces or carefully reshape existing boundary vertices. Keep 3D profile rounded, ensure contact/occlusion over sclera without z-fighting, and prevent self-intersections. Prefer separate non-destructive overlay geometry as an initial candidate if direct base-face retopology risks UV/weights. Include normals, skin weights to head/appropriate facial joints, material continuity and a visual debug overlay. **Never conceal the issue with a flat skin-colored decal or shift the entire eye without measurement.**
4. **Geometry Artifact v3.** Store source hash, contour vertex IDs, reconstructed geometry or reversible vertex deltas, derived normal/UV/weight data, symmetry choices, tolerances, deterministic generation parameters, validation stats, before/after bounds and unresolved edge cases. Preserve v1/v2 compatibility.
5. **Real neutral-pose Chrome comparison.** Capture both eyes at macro scale, neutral face, side profile, three-quarter and harsh grazing light. Check exposed pink lip, eyelid overlap, iris occlusion, eye alignment, corneal shape, translucency and shading. Add consistent screenshots and machine-readable geometry audit to CI. A successful unit suite does **not** mean visual PASS.
6. **Motion compatibility.** Verify four original animation clips are unchanged; head-bound eye/lid geometry follows animated head; test extreme look angles where supported. **Blink/gaze is not yet provided by this model:** implement separately only if supporting joints/geometry are authored and validated. Do not invent gaze animation on an asset with no such rig.
7. **Acceptance/review.** Require actual human visual approval at front/profile/three-quarter/macros, no obvious intersections, preserved UV/material/rig behavior, safe undo, bound draw-call/texture cost. If topology is irreparably impoverished, flag an art-authoring escalation and source/build a better CC0/properly licensed facial asset; don't silently declare the procedural fix photorealistic.

**Specific immediate tests to write:** contour-fidelity under UV duplicates; non-manifold boundary rejection; screen-space and 3D depth tolerances (separate units); symmetry; normal winding; zero-area/degenerated triangle rejection; skin weight sum and joint range; hash/source mismatch; round-trip artifact validation; preview/undo; head rotation continuity; Chrome screenshots; corruption rejection.

**Definition of done for next milestone:** a source-pinned, reproducible eyelid-geometry artifact and a non-destructive fitted GLB with passing structural/browser tests **and** explicit visual status. If images still show pink eyelid exposure, report **BLOCKED** and state why; never force an acceptance pass.

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

- [ ] Read AGENTS.md and this document; fetch actual current main SHA.
- [ ] Inspect docs/eye-aperture-solver-v2.md, geometry/eyelid-fit.mjs and geometry/artifacts/hero-eye-assembly.geometry.json.
- [ ] Check newest Actions run; latest passing baseline: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38842660754 (152/152 tests).
- [ ] Rebuild the reference eye-corrected GLB from pinned, licensed source and confirm SHA matches the artifact before applying any changes.
- [ ] Inspect Chrome front/profile/three-quarter close-ups; document still-exposed rim.
- [ ] Implement P0 geometry reconstruction with measured normals/depth, reversible v3 artifact and tests.
- [ ] Re-run full tests + pinned real-library Chrome QA; inspect actual screenshots.
- [ ] Commit docs, tests and corrected geometry; log remaining visual blockers.
- [ ] Do **not** deploy Alpha 0.6 to Vercel without explicit authorization.

## 9. Key links and evidence

- Project repo: https://github.com/autonomousagentuniverse/blank-engine-lab
- Baseline at this handoff: https://github.com/autonomousagentuniverse/blank-engine-lab/commit/92c4588a99c4b22661a05197b8585da8334b806f
- Successful eye-fit QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38842660754
- Geometry v1 QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38840053847
- Universal inspector QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38837769431
- Character eye mesh QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38834968357
- CC0 material catalogue QA: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38801721687
- AI GameSpec + DB run: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38743314124

**Last updated at snapshot:** Baseline geometry eye-fit technically verified; appearance still blocked. Update this document with each proposal and repository commit; refresh docs/continuity-state.json at substantial milestones.

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
