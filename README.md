# Blank Engine Lab — alpha 0.1

A browser-based first test of the **Blank Box** AI-native game-engine core. This is a 3D **runtime and deterministic GameSpec compiler**, **not** a native Vulkan engine or a completed LLM-connected game generator.

## Features
- Realtime 3D sandbox rendered with Three.js WebGL (`0.186.1`, module loaded from jsDelivr).
- First-party versioned world specification, validator, procedural city generator and prompt-to-command compiler.
- Player movement, third-person camera, basic entity simulation, collision, procedural robots and buildings.
- Rebuild environment from commands, edit GameSpec as JSON, browser-local save, JSON export.
- Desktop WASD/arrow controls, mouse orbit and touch directional controls.
- Prototype tests of compiler validation and deterministic generation.

## Local development
Serve this folder with any local static server, e.g. `python3 -m http.server 8080`, and open `http://localhost:8080`. Modern browser and access to jsDelivr are required. No build or npm install is needed.

Run unit tests with `node --test test.mjs` (Node 18+). These tests validate the compiler and world generator; WebGL needs separate browser tests.

## Vercel
Deploy as a static project with the project root as the output (no build step). Preview deployments are the initial target.

## Limitations / next work
- Three.js currently abstracts WebGL; a production native engine would replace the renderer adapter.
- Natural language edit commands use a **rule-based parser**. No LLM is wired and no provider credentials are stored.
- Robots follow simple deterministic patrols; they're not autonomous LLM agents.
- No networking, marketplace, persistence server, advanced physics or sophisticated AAA visuals.
- Add an LLM on the server side that outputs strictly validated GameSpec patches before live application; version and review all updates.


### Alpha 0.4 — persistent AI→game bridge

Run **Blank Engine — create playable GameSpec (manual)** in GitHub Actions. Enter a world-building prompt, wait for six NVIDIA agents plus QA to finish, then download the workflow artifact. Import `blank-game-spec.json` in the updated browser editor (only after a separately authorized Vercel deploy) to regenerate the matching procedural 3D scene. PostgreSQL stores the accepted GameSpec revision and per-agent provenance. This is not a live interactive AI endpoint; browser requests cannot access the model or database directly.

The existing Vercel deployment stays unchanged until explicitly authorized. Only Actions workflow_dispatch events invoke NVIDIA inference.

## Alpha 0.5 — playable AI-generated quests (browser runtime)

Click **Load AI demo** to load the actual six-agent output saved in `examples/neon-frontier-night-market.json`. On first launch the editor automatically loads it unless you already have a saved project. No API keys or database access are sent to the browser.

The deterministic v1 quest adapter in `quest.mjs` turns recognized narrative patterns into executable mechanics:

- **Night Market**: barter with four distinct robots (walk close and press **E**, or tap **INTERACT**), collect the crystal lantern, then unlock the gate. The gate physically opens when the mission succeeds.
- **Legacy and unrecognized quests**: the engine provides a reachable golden beacon interaction as the safe playable fallback. This is **not** arbitrary AI-written quest logic; v1 GameSpec has only a mission string. A future structured mission schema will remove this limitation.
- **Collision and navigation**: robot, lantern, gate and player spawn locations are placed outside buildings; obstacles block movement. Objective markers and distance indicators guide the player.
- **Persistence**: progress is stored in local browser storage for the current exact GameSpec. Changes to the game or imported projects reset progress. **Restart mission** resets progress without changing the world; **Reset player** retains progress. GameSpec export remains a pure specification and does not include local player-state.

Offline engine tests: `npm test`. WebGL rendering needs a browser that supports hardware acceleration and access to the Three.js CDN. Browser runtime visuals and GPU behavior must be tested before a production release.

**Deployment policy:** GitHub commits do not auto-deploy Vercel. Only deploy on explicit manual authorization.


## Alpha 0.6-dev: Hard part first

The **rigged-skin / physical-character** integration is in progress. See [engineering notes](docs/alpha06-engineering.md) for accurate capabilities, test evidence, and limitations. Major Vercel deployment is intentionally deferred.

## Alpha 0.6 development: imported humanoid GLB + animation retargeting

This is a GitHub-only development feature until the next authorized **major manual Vercel deployment**. In the editor choose **Import rigged GLB**. An uploaded, **self-contained glTF 2.0 `.glb`** (up to 8 MB) must contain a skinned humanoid with hips and left/right upper arms and legs. Supported bone aliases include Mixamo-style and Blender-style naming. The browser validates the GLB before loading; external resource URLs, required decoder extensions, and oversized rigs are rejected.

The avatar is normalized to approximately 3 meters high. Existing authored bone-quaternion animation clips are blended between idle/walk/run/jump/fall when their names match; missing locomotion states use procedural joint animation. Translation/root-motion tracks do **not** control the physics body. The same camera, collision, quest interaction, and movement controls remain in use. User-uploaded GLB data stays in the **current browser session memory only** and is reloaded on world edits; browser refresh returns to the procedural avatar. **Skin** returns to procedural mode after importing a GLB.

`character/retarget.mjs` provides rotation-only local-rest-delta clip retargeting between similarly oriented humanoid skeletons; this does **not yet** solve dramatically different T-pose/A-pose bone axes, hand/foot inverse kinematics, foot sliding, cloth/hair or facial animations. Advanced animation retargeting and grounded foot IK are still acceptance gates before we can call the characters production-ready.

Run `npm test` for the pure contracts. To verify with actual glTFExporter/GLTFLoader, `npm install --no-save --ignore-scripts three@0.186.1 @dimforge/rapier3d-compat@0.18.0` and `node scripts/avatar-real-smoke.mjs`. The real-library smoke synthesizes a rigged humanoid `.glb` in memory, reloads it and exercises motion blending and retargeted clips.

## Alpha 0.6 IK development milestone

The optional pose layer (`character/ik.mjs`) probes Rapier ground contacts and applies two-bone knee/elbow IK after the skeletal animation update. It preserves physics authority and degrades gracefully when imported GLBs lack a complete two-bone chain. See `docs/alpha06-ik-qa.md`. This code is **not deployed to Vercel**.


## Alpha 0.6 slope + browser integration (not deployed)
- Static low-angle calibration ramp with matching Rapier collider and Three.js mesh, placed clear of quest locations.
- Physical raycasts supply foot planting and imported ankle orientation while physics remains authoritative.
- Run `node scripts/ik-real-smoke.mjs` and `node scripts/browser-integration.mjs` with pinned Three/Rapier/Playwright dependencies installed.
- See `docs/alpha06-browser-qa.md` for validation scope and remaining manual QA.

### Authored PBR textures (Alpha 0.6 development)

Import a local albedo PNG/JPEG/WebP plus optional tangent-space normal and glTF packed ORM maps to any procedural surface. Imported images up to 2048px are bounded by a total 32 MiB decoded-source budget; preset materials remain the fallback, and physics/quest state is preserved during texture-only changes. No images leave the browser or persist beyond its session. See [`docs/alpha06-authored-textures.md`](docs/alpha06-authored-textures.md).


### Alpha 0.6 — licensed real-world PBR asset packs (development)

A curated set of **five authored Poly Haven CC0 materials** can be prepared offline and selected in the editor: worn concrete, weathered asphalt, grey wood planks, rusty metal and worn leather. Source pages and real-world tile dimensions are declared in `materials/catalog.mjs`. Assets are **not embedded in Git**; run `npm run materials:prepare -- --out . --resolution 1k` on an internet-connected build machine to create `library/manifest.json` and the three map files per material. Local image integrity, file budgets and licensed provenance are checked before use; no live Poly Haven requests occur inside a running game. The editor labels the Poly Haven source clearly. It uses built-in PBR presets when a pack has not been prepared. A 32 MiB global GPU estimate still applies. Build artifacts are intended to be included explicitly in a future, approved major deployment; the Alpha 0.5 deployment stays unchanged. See `docs/alpha06-cc0-library.md`.

### Full material-catalog QA (Alpha 0.6 development)

Run `node scripts/prepare-material-library.mjs --out . --resolution 1k` in an internet-enabled build environment; run `node scripts/cc0-catalog-acceptance.mjs` after installing pinned Three.js, Rapier, and Playwright. This checks all five real Poly Haven CC0 assets (three maps each) in Chrome with a phone-sized viewport, SHA-256 verification, quest and physics continuity, and JSON/screenshot artifacts. Browser RAF frame timings are software-rendered QA proxies **not physical-phone performance**. See `docs/alpha06-cc0-mobile-validation.md`.


### Alpha 0.6: budgeted architecture and visual regression

The procedural Night Market buildings now include deterministic windows batched into GPU instanced draws, entry doors, distinct rooftop styles and shared trim/glass materials. Colliders and navigation remain unchanged. The HUD reports draw calls, and a manual browser regression exercises real Chrome, Three.js/Rapier, mobile-width controls, and day/night screenshots. See [architecture QA](docs/alpha06-architecture.md). No Vercel deployment.


## Character Builder v1 — isolated hero studio (Alpha 0.6 development)

Open `/character-lab/` for a standalone realistic, rigged humanoid test lab. The lab previews a license-verified MakeHuman/MPFB suited human GLB (CC0), with authored animations, UV/PBR material inspection, studio lighting, bones/wireframe diagnostics, model statistics, SHA-256 CharacterSpec export, and mobile responsive layout. Asset files are prepared locally or at CI time; see [full build / acceptance documentation](docs/character-builder-v1.md).

A high-quality realtime preview is not a certification of photorealism; visual acceptance and optional Blender/Cycles still rendering remain separate gates. No Vercel deployment or backend secrets.


### Character Builder v2.1 — isolated static hero review

Character Lab adds reproducible PBR finishing of the corrected CC0 suited reference (skin/cloth/shoes roughness only), a frozen authored idle pose, full-body front/three-quarter/side/rear and face portrait framing, studio/neutral/daylight lighting, and user-exported review PNG captures. It never auto-certifies photorealism. See `docs/character-v21-static-review.md`. A standalone offline GLB finisher is `scripts/finish-hero.mjs`. No automatic Vercel deploy.
