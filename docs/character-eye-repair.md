# Character Builder v2.2 — Head-rigged eye correction

The MakeHuman suited CC0 source has salmon-pink textured eye sockets but no independent eyeballs. This defect cannot be fixed by lighting alone.

The isolated Character Lab now repairs this pinned reference after opacity and PBR finishing, adding four shared PBR meshes for sclera, iris, pupil and small highlight, attached as eight left/right nodes to the original animated head bone. Source geometry, UVs, weight buffers, 53-joint humanoid rig and four clips are retained. It is not a general eye-generation tool; its socket measurements apply only to the pinned asset. Inverting mesh winding previously caused dark/black eyes; outward-facing triangles are mandatory.

Run the offline builder with a source and output GLB path. Unit tests cover data preservation, head attachment and rejecting non-pinned sources. Browser QA saves five camera views and mobile screenshots, and tests walking with corrected eyes. Human review is still necessary: natural eyelids, blinks, gaze movement, hair and facial fidelity are outstanding. Vercel remains on Alpha 0.5 until major-release approval.
