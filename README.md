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
