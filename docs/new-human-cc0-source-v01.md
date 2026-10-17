# First non-Einar Blender human source experiment — MIRA-01

**Goal:** produce a different human using the architecture reset, without altering the protected HUMAN-A05 reference or creating another Einar hair/mouth patch.

Source: `ibrews/VitruvianGodot` revision `bdecdcd537b4031fdd0fb299b7e4f93f084fffa0`. Its full female human head, eyes, tearline, mouth and card-based hair are derived from CC0 Vitruvian/Antonia Polygon and documented in the pinned `NOTICE.md`. The subject is **not Einar** and no Einar geometry, shader graph, archive or textures are used. Licensing: CC0 character assets; repo tool MIT. See https://github.com/ibrews/VitruvianGodot and authors Sean Buckley / Olaf Delgado-Friedrichs.

**Honest authorship distinction:** This is **a new facial variant authored by the experimental Blender script FROM the existing CC0 Vitruvian base**, not a head sculpted fully from scratch and not proof of a universal autonomous generator. Source ancestry is recorded, never empty or obscured. The architecture reset's strict `independent_original_human` gate is **not** silently bypassed: it will reject CC0-derived sources until a separately reviewed ancestry-aware gate is implemented.

Implementation: `experiments/new-human-v01/from_vitruvian_cc0.py` imports the head and actual authored hair cards, applies localized cheeks/jaw/chin/nose variant geometry to the Basis and all FACS morph keys without moving the source eyeballs, rebuilds real Blender Cycles skin/eye/cornea/tearline/hair shaders using eight CC0 texture maps, packs textures into source `.blend`, saves the source SHA, then renders a fixed 700x700 front, three-quarter, profile and eye closeup camera set. All source bytes downloaded from pinned SHA, per-file hashes recorded. No 580MB publisher dependency or deployment.

Visual acceptance is deliberately blocked at creation time. Full character generation is incomplete until the genuinely new identity is visually distinguishable from the Vitruvian base and realistically convincing **and** a contract provision for source-derived CC0 provenance and human signoff has been separately reviewed and tested.

CI run at code commit: **PENDING**. Do not claim visual/photo success until actually examining the four Cycles files.
