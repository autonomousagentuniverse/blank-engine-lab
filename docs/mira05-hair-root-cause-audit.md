# MIRA05 original character failure: material causality

This is a diagnostic and does not create a new human. Frozen original integrated Blender project SHA256 07806e89a1ad2389bb7c216144b57878748d0f54536fe2a47f026f229e2db076 from successful original render run 39051879470. Four identical head/camera geometry render tests: original hair BSDF, magenta emission binding probe, dark emission, dark Principled shader. Per-image hashes and material graph parameters are stored. Compare hair mask pixels across these modes before claiming whether the source Hair BSDF or material binding causes the pale hair.

Confirmed from original code: 7-point downward groom with near-common lengths creates curtain; eyebrows have no groom distribution field; four thin face-projected eyelid arcs do not reconstruct lids; shader roughness/SSS and pore noise have not been calibrated by real reference; max displacement is not a valid measure of distinct facial identity. The actual source is CC0-derived Vitruvian, not original independent anatomy. Photorealism was never achieved.

Technical test outcome: pending. No production deployment.