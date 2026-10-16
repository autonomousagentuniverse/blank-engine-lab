# Character Builder v2.1 — Static Hero Quality Gate

This is an isolated visual QA pass, **not** proof of photorealism or a change to movement / physics.

## Asset finishing

The source is pinned to a CC0 MakeHuman suited humanoid. Material correction runs first, then PBR finishing changes only material roughness (skin .72, fabric .93, shoes .72). It preserves all mesh buffers, UVs, textures, skin weights, 53 source skeleton bones, and authored animations; no replacement face/hair assets or new clothing mesh are claimed. `scripts/finish-hero.mjs` builds an auditable GLB. The source and license remain attributed to the original MakeHuman/MPFB asset package.

## Static review

The lab now supports a frozen authored idle pose, full-body front/three-quarter/side/rear framing, and a closer face view. Neutral inspection, portrait studio and daylight lighting are available independently. PNG review captures are user-initiated; the automated browser smoke generates the five equivalent screenshots from actual Chrome/WebGL. A full manual review must verify scalp/hair treatment, face/eyes, clothing fit/neck seam, hands/shoes, and silhouettes. Neither an automated test nor a screenshot count may set `quality.status` to `approved`.

## Known limitations

The sourced hero remains bald and has limited face geometry; adding real hair and professionally modeled eye/face details is a separate asset-authoring task. No automated validation can prove absence of all intersections or certify facial realism. Headless Chrome on SwiftShader is not a measured physical-Android FPS benchmark. Character physics/IK were already tested in the Night Market and are outside this isolated static review.

## QA

Run `npm test`. On GitHub, use the manual Hero v2.1 workflow: it downloads the pinned source, builds the refined GLB, runs the browser, captures five viewport angles and a full mobile screenshot. Never deploy without explicit user approval.
