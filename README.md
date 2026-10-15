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

The initial Vercel deployment was uploaded directly and is not Git-linked; pushing this repository does not automatically change that deployed build.

This repository is proprietary work in progress. No open-source license has been granted.
