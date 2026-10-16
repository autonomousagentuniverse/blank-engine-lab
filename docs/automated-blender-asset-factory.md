# Blank Engine — automated headless Blender asset factory v1

**User requirement: the asset creation process must be automated.** No human Blender clicks or manual GLB manipulation between source and runtime. This is the **first working Einar character profile**, not a claim that arbitrary characters, object creation, scene generation, hair cards, PBR baking, and blinking have all been implemented.

## Workflow

\`\`\`
assets/specs/einar-static-hero.json   (license, URL, source SHA256, asset ID, target)
             │
             ▼
scripts/asset_factory.py  (one command; bounded stages, write-on-every-stage JSON)
             │
     ┌───────┴───────────────────────────────────────────┐
     │ Authentic official asset source → CRC/texture prep│
     │ Blender bpy headless: source geometry + skin/eyes  │
     │ Source-copy glTF/GLB PBR export                    │
     │ Verify mesh topology & embedded color textures    │
     │ All existing engine regression tests              │
     │ Real Three.js/Chrome WebGL2 five-view screenshots  │
     │ Contact sheet + auditable output SHA              │
     └───────┬───────────────────────────────────────────┘
             ▼
TECHNICAL_PASS_VISUAL_APPROVAL_PENDING (never auto-ship)
\`\`\`

Blender automatically uses and transforms actual source mesh assets; final images come directly from Blank Engine WebGL, NOT a substituted Blender screenshot. The exporter is adapted from the **verified v5 Einar** tested source path (run 38953227006). Original source ZIP and .blend remain immutable and are not committed or uploaded; the copied licensed GLB and screenshot evidence are archived. Required credit: **Einar Rig (CC-BY) Blender Foundation | studio.blender.org**.

## Invoke

Preflight only, without downloading or altering source:

\`python3 scripts/asset_factory.py --manifest assets/specs/einar-static-hero.json --mode plan\`

Full unattended build, given bpy 4.5.3, Pillow 11.3.0, Node 22, Three r0.186.1, Playwright 1.56.1, Linux software OpenGL and Chrome:

\`python3 -u scripts/asset_factory.py --manifest assets/specs/einar-static-hero.json --mode run\`

In GitHub: Actions → **Blank Engine - automated Blender asset factory** → **Run workflow** → profile \`einar-static-hero\`. This is a *manual initiation of an unattended automated pipeline*, not an automatic Vercel deployment. The initial experiment branch temporarily tests the full workflow by a one-time branch push, then restores \`workflow_dispatch\` only.

## Output and failure policy

Every stage is bounded, fail-closed and logged:
- \`artifacts/asset-factory/einar-hero-v1/factory-report.json\`
- \`artifacts/asset-factory/einar-hero-v1/logs/*.log\`
- \`artifacts/hero-v5-einar/einar-static-pbr.glb\`
- \`artifacts/hero-v5-einar/blank-webgl-*.png\`, \`blank-webgl-contact-sheet.jpg\`
- GLB/browser/source JSON audits.

Any missing original source hash, invalid license, missing embedded eye or skin texture, failed WebGL2 gate, regression failure or renderer error produces \`status=BLOCKED\`. No assets are promoted automatically. A successful deterministic engineering pipeline still has \`visual_approval=BLOCKED_REQUIRES_HUMAN_REVIEW\`, because the v5 WebGL result was *visually inadequate*. JSON profile has no arbitrary shell commands and supported adapters are hard-coded to avoid running untrusted job definitions. No secrets passed into client code.

## Scope of implementation

**Automated now** for Einar v1 preset: source retrieval/hash, source texture restoration, Blender asset copy and PBR material construction, export GLB, structural validation, full engine regression, actual Three.js WebGL rendering, screenshots and audit. Blender processing runs without manual UI.

**Still NOT implemented:** automatic creation from a prose description of *new* character topology; procedural hair grooming/card generation; high-resolution source normal/roughness/SSS transfer; blink/rig animations; arbitrary Object Builder/Scene Builder recipes; Android hardware profiling; photorealism approval. Add independently tested adapters for these rather than silently marking Einar v1 static output as a final hero.

**Continuity rule:** every proposal and code change updates \`docs/CONTINUITY.md\` in its commit and major milestones update \`docs/continuity-state.json\`; production \`main\`, existing hero and Vercel remain untouched.

## Verified first full build

Automated profile build SUCCESS: https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38959953800. Verified official source SHA, original source texture restoration, headless Blender copy-only Einar GLB SHA 658d56f0b9112963e2369154725de41a87aa7460135cf1e6db1291897825a1ac, real Chrome/Three.js five screenshots and audit report. Fail-closed offline suite 13/13 PASS and unchanged game regression 171 pass/2 skip. Downloadable short-lived GitHub artifact `blank-engine-automated-asset-factory-einar` (ID 12072367075). Visual photorealism FAIL/not approved; automation pass does not improve the existing bald, flat-material source-copy appearance. Temporary push trigger removed, permanent workflow_dispatch only. This fulfills unattended process orchestration for one Einar static profile, NOT full autonomous generation of novel characters, hair, or blink.
