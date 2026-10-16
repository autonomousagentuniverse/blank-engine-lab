# Source-measured eyelid transition — v6 A/B experiment

**Not production-ready or photorealism-approved.**

Sources informing the experiment:
- Disney Research 2015 *Detailed Spatio-Temporal Reconstruction of Eyelids*: adjacent facial skin boundaries and eyelid folding must be coupled.
- Khronos glTF 2.0 spec: a vertex index selects all attributes, so UV seam splitting must be represented explicitly.
- Disney Research 2014 *High-Quality Capture of Eyes*: even improved eyelids do not provide physical cornea or nonrigid iris.

The v5 experiment made all 224 new triangles UV-valid and correctly oriented but hardly changed the Chrome screenshot. v6 adds **a source-measured skinned bridge** between the v5 lip and the source mesh inner eye socket: 28-point cyclic contour correspondence per eye, 112 new face vertices, 224 triangles, skin-island UVs, inherited bone weights, and normals computed from 3D faces. The original GLB is immutable and hash-pinned.

GitHub manual workflow rebuilds v2 -> v4 -> v5 -> v6 and captures matched real Three.js Chrome v5/v6 head and macro, profile, 3/4 and mobile. Temporary push event is **one-shot on experiment branch only** and must be removed immediately after evidence is archived.

**Known gaps:** Original inner socket UV island remains, possible overlap with older socket triangles, and eye optical shape and blink/gaze are unmodified. Passing test and Chrome load != photorealism. Human visual review mandatory. Main and Vercel untouched.
