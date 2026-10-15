# Full curated CC0 material validation + browser viewport proxy

This milestone checks the five independently authored CC0 material sets under `materials/catalog.mjs`: concrete, asphalt, wood, rusted metal, and leather.

The CI preparation script fetches the actual 1K material files from Poly Haven's official API, checks size and optional upstream MD5, writes SHA-256 to a same-origin manifest, then the catalog-acceptance script independently rehashes every map and imports each asset in a fresh Chrome game session. Every material must preserve quest progress, WebGL canvas identity, Rapier physics and day/night controls; browser errors fail the run. Screenshots and a structured JSON record are uploaded as GitHub Actions artifacts.

**Important methodology limitation:** GitHub Actions Chrome uses software-rendered WebGL (SwiftShader) in a simulated 390×844 viewport, not an Android GPU. We record 75 frame intervals before/after each material import and compute median/p95 `requestAnimationFrame` intervals and the HUD FPS. These measure only this test environment's event-loop/raster cadence, **not** physical device frame rate, texture VRAM, battery life, thermal behavior, or production-device stability. `performance.memory` is JS heap only. The benchmark must not be used to claim 30 or 60 FPS on actual phones.

Testing one authored material per fresh page proves each asset independently without exceeding the 32 MiB aggregate authored texture allocation. It does **not** prove that all five 1K sets can be loaded simultaneously. For the major Alpha 0.6 release, mobile QA still needs actual Android devices and a separate multi-material compression/LOD budget strategy.

No Vercel deployment, automatic production deployment, or new secrets are permitted. After successful one-time QA, delete the temporary push workflow and keep a manual-only alternative.
