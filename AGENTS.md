# Blank Engine agent handoff — REQUIRED

Before substantial work read [docs/CONTINUITY.md](docs/CONTINUITY.md) and [docs/continuity-state.json](docs/continuity-state.json); check the real current GitHub HEAD and domain sources. The continuity snapshot is not proof that no subsequent work occurred.

## Owner decisions (non-negotiable)

- GitHub source of truth: autonomousagentuniverse/blank-engine-lab.
- Work on hard underlying problems first. Current P0: **topology-aware eyelid reconstruction on the source-pinned hero**; the v2 measured contour fit passed technical tests but the hero still fails visual photorealism review.
- Character Builder first; one high-quality isolated hero, then Object Builder, Scene Builder and composited world. Universal Inspector and Geometry Artifacts are **builder-independent**.
- **No automatic Vercel deployment** and no manual Vercel deployment without explicit authorization for a **major** release. Alpha 0.5 remains live while 0.6 accumulates on GitHub.
- No secrets or credentials in Git, browser, URLs, logs or docs. NVIDIA_API_KEY and BLANK_PG_URL are server-side GitHub Actions secrets.
- Use real GLB geometry/topology, versioned reversible artifacts and source hashes. Do not claim screenshots or unit-test passes establish photorealism. Preserve original rig, animations and license. Review eye geometry in front, profile and three-quarter macro.
- All permanent workflows are manual workflow_dispatch. Tests and documentation accompany fixes. Never silently regress game editor/physics/quest.
- Human reviewer approves subjective realism; an AI-only acceptance flag is insufficient.

## Fast entry points

- Current focus: docs/eye-aperture-solver-v2.md and geometry/eyelid-fit.mjs
- Saved measurement: geometry/artifacts/hero-eye-assembly.geometry.json
- Universal schema: geometry/artifact.mjs and docs/geometry-artifact.md
- Hero preview: character-lab/index.html; controller: character-lab/lab.mjs
- Run all tests: npm test; use the manual eye-fit workflow for real GLB + Chrome checks.
- Handoff/roadmap: docs/CONTINUITY.md (includes past work, limitations, plan, acceptance gates, evidence).

At every meaningful milestone, update docs/CONTINUITY.md and docs/continuity-state.json with verified SHA, run URL, status and next blocker.
