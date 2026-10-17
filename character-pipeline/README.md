# Character Pipeline Reset (2026-10-17)

**Executable engineering reset, not a finished autonomous new-human generator.**

## Freeze and source provenance

- **HUMAN-A05**: freeze as the most complete original-Cycles-material reference. It is a **CC-BY Einar-derived character**, not an independent person. See `reference-a05.json`, frozen actual Blender/PDF source hashes, and [GitHub Actions run 39026642127](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39026642127). Its .blend still depends on external textures.
- A06/A07: real hair geometry research with **failed visual acceptance**. Do not create A08 by copying an Einar generation script.
- No automatic Blender Studio 580 MB download; that source was returning HTTP 503/504. Use a rights-cleared locally available .blend with verified SHA256. No reusable legal storage cache is yet provisioned.
- The source may be licensed or self-authored, but the candidate must be a **genuinely distinct human** and explicitly documented as such. Einar-derived ancestry or asset hashes are rejected.

## Executable path

1. Author or otherwise legally obtain a *new, different human* .blend with genuine head/eye/hair/skin material assets and four camera objects (front, three-quarter, profile, eye macro). The system **does not currently create that head**: this is the next unsolved milestone.
2. Copy `example-new-human.plan.json` to a new local plan; populate actual source author, license, rights verification, SHA256, camera names. The template intentionally fails closed.
3. Verify the contract: `node character-pipeline/gate-cli.mjs check-plan /path/to/plan.json`.
4. Lock exact source bytes: `node character-pipeline/gate-cli.mjs prepare /path/to/plan.json /path/to/run-dir`. Source file path in plan is relative to plan file. Run directory must be new.
5. Actual Blender: `python3 character-pipeline/render-cycles.py /path/to/run-dir /path/to/character.blend` in Blender 4.5.3 Python/`bpy`. Verifies pinned source, refuses missing texture files, uses authored cameras, saves **four 700×700 real Cycles PNGs** and `render-report.json` with SHA256 hashes.
6. Evaluate: `node character-pipeline/gate-cli.mjs evaluate /path/to/run-dir/plan.json /path/to/run-dir`. Even if all checks pass it **exits blocked pending a real human review**. It emits an evidence fingerprint.
7. Human reviewer actually inspects matched front/3⁄4/profile/macro and A05 reference, supplies separate JSON with `schema: "blank.character.human-review.v1"`, `fingerprint`, named `reviewer`, ISO `reviewed_at`, and *explicit* booleans `human_attestation`, `anatomy_ok`, `distinct_from_reference`, `photoreal_ok`. Repeat `evaluate` with review file path. The output is **Cycles-accepted only, never production**.
8. glTF and matched WebGL proof are **not implemented in this reset**; those and a separate human acceptance are required before any Blank Engine release.

## What the automated checks can and cannot establish

Source origin/rights declared in a manifest and a distinct SHA do not prove independent creation by themselves. Manual verification of source provenance and likeness is required. A PNG signature, resolution and hash are proof of consistent evidence, **not** a realism score. The render profile validates camera identities and output resolution, not that unrelated authors positioned cameras identically; human side-by-side visual comparison is mandatory.

The renderer fails rather than substituting clay or low-quality skin, and the CLI never auto-approves on passing unit tests. The final approval lock is deliberately `release_allowed: false`.

## Commands for engineering verification

```bash
node --test character-pipeline/contract.test.mjs
python3 -m py_compile character-pipeline/render-cycles.py
node character-pipeline/gate-cli.mjs check-plan character-pipeline/example-new-human.plan.json
# Last command MUST fail: it contains no actual independently authored human.
```

**No deployments, no automatic reruns, no original source archive committed.**
