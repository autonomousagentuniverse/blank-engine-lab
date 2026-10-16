# Blank Engine agent handoff — REQUIRED

Before substantial work read [docs/CONTINUITY.md](docs/CONTINUITY.md) and [docs/continuity-state.json](docs/continuity-state.json); check the real current GitHub HEAD and domain sources. The continuity snapshot is not proof that no subsequent work occurred.

## Owner decisions (non-negotiable)

- GitHub source of truth: autonomousagentuniverse/blank-engine-lab.
- Work on hard underlying problems first. Current experimental P0: **replace the inadequate MakeHuman hero starting asset with a license-verified higher-quality realistic human head, and prove visual anatomy/materials before committing to a full new character**. Previous geometry v1–v10 experiments are retained as history; skin/UV microfixes are NOT the current priority. Human photorealism approval remains BLOCKED.
- Character Builder first; one high-quality isolated hero, then Object Builder, Scene Builder and composited world. Universal Inspector and Geometry Artifacts are **builder-independent**.
- **No automatic Vercel deployment** and no manual Vercel deployment without explicit authorization for a **major** release. Alpha 0.5 remains live while 0.6 accumulates on GitHub.
- No secrets or credentials in Git, browser, URLs, logs or docs. NVIDIA_API_KEY and BLANK_PG_URL are server-side GitHub Actions secrets.
- Use real GLB geometry/topology, versioned reversible artifacts and source hashes. Do not claim screenshots or unit-test passes establish photorealism. Preserve original rig, animations and license. Review eye geometry in front, profile and three-quarter macro.
- All permanent workflows are manual workflow_dispatch. Tests and documentation accompany fixes. Never silently regress game editor/physics/quest.
- Human reviewer approves subjective realism; an AI-only acceptance flag is insufficient.

## Fast entry points

- Current experimental focus: docs/hero-v2-source-evaluation.md and experiments/hero-v2/; old Geometry v1–v10 eye revisions are historical diagnostics, not the active baseline
- Saved measurement: geometry/artifacts/hero-eye-assembly.geometry.json
- Universal schema: geometry/artifact.mjs and docs/geometry-artifact.md
- Hero preview: character-lab/index.html; controller: character-lab/lab.mjs
- Run all tests: npm test; use the workflow_dispatch-only blank-eye-socket-v4-manual workflow for pinned real GLB + Chrome checks. Latest v4 run 38879560781 passed technically, not visually.
- Handoff/roadmap: docs/CONTINUITY.md (includes past work, limitations, plan, acceptance gates, evidence).

**MANDATORY ON EVERY COMMIT OR PROPOSED CHANGE:** Update docs/CONTINUITY.md within the same commit/PR diff and add a dated `[PROPOSED]` or `[COMMITTED]` entry explaining scope, intent, tests (PASS/FAIL/NOT RUN), blockers and next step. For git CLI checkouts, enable the hook with `git config core.hooksPath .githooks`; for PRs run `node scripts/check-continuity.mjs --base origin/main`. GitHub API/web edits bypass local hooks, so agents MUST include the continuity update atomically in their GitHub commit. At substantial milestones refresh docs/continuity-state.json too. The full rule and limitations are in docs/CONTINUITY.md section 10.
