# Hero v2 — license-first replacement-character baseline, not an eye patch

**Owner decision, 2026-10-16:** Stop spending P0 work on MakeHuman eyelid v1–v10 microfixes. Those experiments proved structural/UV correctness does not yield the photographic quality target. Begin a NEW isolated hero head geometry and rendering pipeline, then revisit full character only after close-up approval.

## Reference and rights

The owner's uploaded two close-up portrait screenshots are *visual quality references*, not licensed 3D assets and not source textures or identity targets. Reconstructing a photograph in 2D does not satisfy the editable, animatable 3D character requirement.

Candidate A: official Blender Studio/Blender Foundation Human Base Meshes bundle v1.4.1, CC0. Source: https://www.blender.org/download/demo-files/ and official binary https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip. Official Blender documentation notes suitable quad topology, UVs/UDIM and multi-resolution realistic bases. Blender v4.0 notes also mention improvements to eye scale and realistic head meshes. **A base mesh is NOT yet a photorealistic character**, nor do these docs assert it has eyelid motion, separate eyes or high-resolution skin/eyelash materials.

Alternative B: Blender Studio Project Heist "realistic_human_base.blend" under CC-BY, with attribution required. https://studio.blender.org/training/realistic-human-research/use-of-base-meshes/. Download/access must be verified before use; also a modeling base, not automatically a finished face.

Alternative C: textured CC-BY Sketchfab realistic human bust (https://sketchfab.com/3d-models/realistic-human-head-329a051ef9ae4e24a941f879009fe7bd), about 194.4k triangles; downloads/authentication, provenance and completeness of eyes, rig and skin maps **not yet established**, so not imported.

Alternative D: Digital Reality Lab commercial-use sample PBR head advertises separate eyes and 16k textures, but its FAQ **disallows resale or free distribution of originals and derivatives** on other websites, which raises a real distribution conflict with Blank Engine's downloadable characters; not imported. https://www.digitalrealitylab.com/sample-model/.

## First experiment deliverables

- Download *only from the official Blender mirror* into the temporary GitHub runner, record full SHA-256 and each source .blend SHA-256; preserve the original files unchanged and never commit huge binary assets.
- In pinned Blender 4.5.3, inspect real mesh object names, vertex/poly density, UVs, material image nodes, facial shape keys, armatures, and nearby possible eye components; select a realistic head rather than a stylized mannequin.
- Export an isolated copy as GLB, reducing triangle density on **only the output copy** when necessary. Render four orthogonal neutral WORKBENCH clay views and a contact sheet. This is an **anatomical source evaluation**, not a photorealistic skin/lighting demonstration.
- Continue engine regression without modifying old hero, builders, geometry artifacts, shared runtime or deploy config.
- Archive a factual audit JSON and previews in a GitHub Actions artifact. Inspect the result before any promotion; remove one-shot experiment-branch-only CI trigger and preserve permanent workflow_dispatch.

## Required gates

1. **Source/license:** exact official URL + hash + explicit CC0 scope recorded; no ambiguous embedded third-party license.
2. **Anatomy:** connected lid margin, eyelid volume and socket depth, tear region, visible realistic shape from front, 3/4 and profile, not just higher polygon counts.
3. **Eyes:** separate cornea/iris/sclera anatomically and optically plausible. If missing, mark as required work; do not invent success.
4. **Skin:** high quality color/normal/roughness/SSS maps or a verifiable production method. Workbench clay preview alone is not a photographic renderer.
5. **Animation/game:** facial deformation, blinking, correct rig/LOD/geometry; test actual Three.js and then real Android.
6. **Human visual acceptance:** actual digital human looks credibly photorealistic at 0.3–0.5 m neutral macros and matched side views. No automatic approval.

If Candidate A does not meet the high-end bar, **reject it as final** and evaluate a truly textured, complete and distributable scan or rigged digital human next. Do not repeat MakeHuman eye patches. Alpha 0.5 Vercel remains live; no major deploy and no main merge without explicit approval.
