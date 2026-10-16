# Hero v3 — Einar official source and license gate

**Goal:** Obtain a complete, distributable, high-quality realistic human for the Blank Engine isolated Character Lab. The user's photographic portrait screenshots define the *visual quality threshold*, not an identity/texture reuse license.

Blender Studio's official character page https://studio.blender.org/characters/einar/v1/ lists the **Einar** v1 character as Free/CC-BY, released 14 Dec 2022, requires Blender 3.5+, and specifies the credit:

> Einar Rig (CC-BY) Blender Foundation | studio.blender.org

Official Charge production documentation shows its facial shading, rigging and eye deformation development. These are **publisher descriptions**; they do not verify the downloadable production file's exact texture, bone or render contents, and don't guarantee Three.js GLB compatibility or mobile performance.

## Test 1: Authentic binary acquisition gate (this branch)

The GitHub Actions runner accesses only the official https://studio.blender.org/characters/einar/v1/ page, enumerates original Blender Studio-domain download hrefs/embedded URLs, HEAD-verifies direct binary links, and records URL response, source page hash and license. It must not guess download URLs, use unauthenticated clone/mirrors with questionable redistribution rights, exfiltrate credentials, bypass a paywall or assume all linked assets are released on the same license.

The report clearly distinguishes:
- \`DIRECT_PUBLIC_BINARY_FOUND_REQUIRES_SOURCE_HASH_AND_RIG_INSPECTION\`: candidate official direct URL located; **not yet** downloaded, rendered, approved or converted.
- \`BLOCKED_NO_VERIFIABLE_DIRECT_PUBLIC_DOWNLOAD\` or \`BLOCKED_OFFICIAL_PAGE_UNREACHABLE\`: the actual file cannot be obtained with the current public workflow. User-authorized publisher download of the authentic ZIP/BLEND is the next required input.

## Test 2: conditional next stage (not automatically claimed)

Only after receiving the authentic publisher file with an exact SHA-256, inspect archive safety, texture/image dependencies, separate sclera/iris/cornea, eyelid rig and blink shapes, armature/skin weights, sculpt/mesh density, eyelashes/hair, CC-BY license and attribution. Convert to separate GLB/Three.js with a source-pinned reversible pipeline, compare matched face macros/profile/three-quarter, and test real Android performance before any approval.

Continue existing engine regression to ensure zero source/runtime changes. No MakeHuman eye patches, no new synthetic 2D portrait, no replacement of the playable hero and no Vercel deploy. The repository's continuity file and structured state must be updated with real outcomes; once initial experiment-branch QA is obtained, remove the temporary push trigger and keep workflow_dispatch only.

Current source-gate acceptance is **BLOCKED** until a real Einar asset is retrieved, audited and visually reviewed. A passing GitHub job on the source-resolution script means only that the *audit ran*.
## Real source result (2026-10-16)

Verified publisher ZIP SHA-256 `3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7`, 579,834,421 bytes, CRC PASS. Real Blender source v1 loaded. Separate corneas, menisci, upper/lower eyelid bones and blink head shape keys confirmed; 95 materials, 63 separately shipped external textures (no packed images), 799-bone animation control rig. See `docs/hero-v3-einar-findings.md` for measured evidence and renderer-risk caveats. No GLB conversion or visual human acceptance yet.

The full-scene process timed out on shutdown AFTER writing a complete inventory; an initial fallback status incorrectly overwrote the successful source-load status. The workflow classification is corrected without claiming a clean exit. Temporary push trigger removed; workflow is manual-only.
