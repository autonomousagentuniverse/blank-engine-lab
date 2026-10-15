# Blank Engine Lab — Alpha 0.1

AI-native game engine experiment for the **Blank Box** console concept.

This repository contains the **browser-ready single-file build** of Blank Engine Lab, matching the initial Vercel prototype. The native C++/Vulkan game engine and LLM orchestration layer are future phases, not present in this alpha.

## Try it

- [Vercel preview](https://blank-engine-ib4ze16uz-autonomousagentuniverse-3582.vercel.app) (may require access through the owner’s Vercel account)
- Run locally: `python3 -m http.server 8080` from the repository root, then open `http://localhost:8080`.

A browser with WebGL and network access to the Three.js CDN is required.

## Implemented

- Real-time 3D environment with controllable player, third-person camera, buildings and robots.
- A versioned GameSpec with validation and seeded procedural world generation.
- Simple deterministic robot patrol simulation and player/world interaction.
- Rule-based world-edit commands (for example: add robots, change the lighting, regenerate layout).
- JSON editing, local browser save and GameSpec export.
- Mouse/keyboard and touch controls.

## Current limitations

- **No LLM connection yet.** World editing uses a deterministic command parser.
- **No original Vulkan renderer.** Three.js/WebGL is the prototype rendering backend.
- **No multiplayer, asset-generation pipeline, real physics middleware, server persistence or AAA-grade graphics.**
- This is a prototype and does not yet include production hardening or full browser E2E testing.

## Next engineering milestones

1. Extract the engine compiler and renderer adapter into independently tested modules.
2. Connect a provider-agnostic LLM service that emits only validated GameSpec patches.
3. Implement scene snapshots, change history, rollback, and automated gameplay testing.
4. Expand gameplay systems and performance benchmarks.

## Deployment

The initial preview was uploaded directly to Vercel. The Vercel project is **not Git-linked yet**, so GitHub commits do not automatically update that deployment.

This project is proprietary work in progress. No open-source license has been granted.
