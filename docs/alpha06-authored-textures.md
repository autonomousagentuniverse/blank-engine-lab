# Alpha 0.6 authored PBR texture import

A surface can use a browser-local PNG/JPEG/WebP color map (required), tangent-space normal map (optional), and glTF-style packed ORM (optional: R=occlusion, G=roughness, B=metalness). Color maps use sRGB; normal and ORM maps are linear. Maps are repeated over meter-scaled UVs. Unprovided channels use the existing procedural PBR preset.

Choose Buildings, Terrain, Roads, Robots or Player Armor, pick files, then use **Import PBR images**. This changes materials without replacing the 3D canvas, resetting physics or losing quest progress. **Apply texture** restores a procedural preset. Files are never uploaded to a service and never saved to localStorage. Uploaded maps are restored during same-tab world rebuilds, but not across browser reloads.

Limits: PNG/JPEG/WebP signature and MIME checks; per-map up to 2048 px per side and 5 MiB transfer; per-set up to 10 MiB transfer; across all authored surfaces no more than 8,388,608 decoded RGBA pixels (~32 MiB). Actual GPU memory may be higher due to mipmaps and driver buffers. Replacing an image disposes its GPU texture and closes its ImageBitmap.

Limitations: No KTX2/Basis GPU compression, no AI texture synthesis, no binary texture persistence, no displacement or guaranteed photorealism. Browser QA confirms decoding/integration but human evaluation of authored texture quality and mobile performance is still required.

Run: npm test, node scripts/authored-real-smoke.mjs, node scripts/authored-browser-smoke.mjs (latter needs Playwright/Chrome/Three/Rapier).
