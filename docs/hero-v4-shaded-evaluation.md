# Hero v4 — source-pinned Einar real texture and shaded close-up proof

Source: official Blender Studio Einar v1 CC-BY archive, ZIP SHA256 3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7 (579,834,421 bytes), one 91MB original .blend and 63 external image files. Blender v3 proved genuine corneas, menisci, eyelid rigs/blink shapes, 95 materials, 799 control bones but had ZERO packed image files. Do not claim final photorealistic hero before visual approval.

Restore the 63 external textures to original relative textures/ paths next to immutable Einar source Blend in ephemeral GitHub Actions. Verify full SHA/CRC. Inspect actual loaded skin and eye albedo, record every missing image path; STOP rather than show broken textures as authentic skin.

Render isolated original head, brows, lashes, eye/cornea/meniscus in Blender Cycles with neutral studio lights, CPU 12 samples 600px, fixed face/world orientation inferred from real eye locations. Capture front, 3/4, profile, extreme eye front and eye oblique close-ups. Image audit and small contact sheet are archived. This is a FULL source-shaded Blender material test, not automatic glTF/PBR conversion or Android performance test.

The original ZIP/Blend and texture files are not committed and not uploaded as artifacts. Preserve required CC-BY credit: Einar Rig (CC-BY) Blender Foundation | studio.blender.org. Source render and small audit may be shared for project review.

If Blender cannot load/complete before runner limit, persist partial status and PNGs and report failure honestly. Visual human acceptance BLOCKED by default regardless of successful 171-regression. Experimental branch only; temporary branch-specific push CI trigger must be removed after run, leaving workflow_dispatch only. Production main and Alpha0.5 Vercel unchanged. Subsequent work only if source photo-quality closeups pass: preserve/bake original licensed maps and prove runtime Three.js eye geometry, blink and mobile performance.

## Run outcome

Successful real Cycles run https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38947591860. Five source-shaded views generated at 600px/12spp using actual external textures; 58/63 source referenced images loaded including both head and eye albedo, five unrelated tool-prop maps missing. See docs/hero-v4-findings.md. Blender exited 124 AFTER source-shaded image completion (slow shutdown), standalone gate and 171/2-skipped engine tests passed. Human photorealism BLOCKED. Manual-only workflow.
