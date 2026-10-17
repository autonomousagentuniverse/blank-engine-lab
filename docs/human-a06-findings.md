# HUMAN-A06: verified scalp geometry, not yet realistic hair

Date: 2026-10-17

**Final visual gate: REJECTED. Best full-material asset remains HUMAN-A05.**

## Actual evidence
- Full-material A06 code: branch experiment/human-a06-visible-scalp-clean-skin, source commit d4ab895c7852dee131e61928b6f39345a139e3f3. Its bruise/skin node changes have NOT been tested or rendered.
- GitHub Actions runs 39028152760 and 39028316671: both failed *before Blender started* due Blender Studio original 580 MB source archive transfer errors (curl 92, curl 18, 503/504). Do not claim complexion was changed.
- GitHub Actions run 39028864347: PASSED actual Blender 4.5.3 Cycles CLAY front and macro render after pulling existing A05 derivative .blend from GitHub artifact. 11,500 strands of length 15-36 mm, radius 0.22 mm; visibly rendered but looked stiff, too pale and blown out by cumulative scene lights. Visual gate FAIL.
- GitHub Actions run 39029093890: PASSED actual Blender Cycles CLAY front and macro. Artifact ID 12099797198, 12,064 strands from 13,000 attempts, 7-20mm lengths, 0.15mm radius, backward guide and fewer overexposed lights. Forehead coverage too sparse, scalp silhouettes have unrealistic floating halo. Visual gate FAIL.
- Actual procedural code: experiments/human-a06/debug_groom_from_a05.py; source remains Einar CC-BY derivative. Uploaded .blend project in artifact excludes original publisher TIFF textures.

## Findings and next corrective boundary
1. Procedural scalp hairs ARE render-visible in Cycles with a stable node-based Principled material and root offsets, disproving that Blender is incapable of creating strands.
2. Strand count is insufficient. We have NOT established if the earlier A03 invisibility was primarily thickness, shader curve attributes or scalp root location; it could be a combination.
3. The visual root failure is the scalp grooming system: crude polygon sampling, insufficient mapped hairline, poorly controlled region flow, and guide distributions that create a bristle halo.
4. Next test should derive an evaluated scalp-cap with source vertex attachments, measured root clearance, a density/hairline mask, and guided forelock/side/crown directions. Use one clay macro before full-material Cycles. The full Einar source image archive must be available or persistently rights-cleared; do not fake missing skin maps.

**No source-identity replacement, approved new human, WebGL parity or production deployment. Workflow manual-only.**

Links:
- [Initial A06 source-blocked test](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39028152760)
- [HTTP/1.1 source-blocked retest](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39028316671)
- [Real clay hair test 1](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39028864347)
- [Real clay hair test 2](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39029093890)
