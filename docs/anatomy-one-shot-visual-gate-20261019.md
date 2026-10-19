# One-shot anatomy: Blender/WebGL visual quality gate, 2026-10-19

## Implementation and quantitative results

The original rejected procedural body is NOT reused. The browser exports the
actual CC0 MakeHuman topology, 13,524 body/eye vertices and 26,756 body
triangles; all 93 controls; real morphology; exact eye ornaments; shared
scalp follicle geometry and transform matrices. Blender 5.0.1 reconstructs
a fresh scene from this source with maximum accepted vertex difference of one micron.

The eye diameter control now modifies actual sclera geometry, not just iris
and pupil. Real Chromium measurements confirm both eyes at 24mm with default
settings and both at 30mm when configured to 3.0cm. The canonical iris/pupil
matrices transfer to Blender without its previous double eye-spacing offset.

The old icosphere hair cap was rejected after close inspection. In its place,
six actual tapered, curved tubular strands are constructed per deterministic
scalp-root follicle in WebGL. The browser includes the exact strand-template
vertices and indices in the snapshot. Blender reproduces those strands, not
another approximate hair generator. Curly-hair shrinkage and follicle tilt
were adjusted after the initial result looked excessively spiky.

Six Cycles views (front, 3/4, profile, face closeup, hand closeup, elevated
right-foot closeup) make visual defects inspectable. The original macro
camera mistakenly targeted the torso and was corrected following a real render.
Blender now rejects non-manifold and boundary body edges and measurements
inconsistent with the configured eyeball diameter.

## Realistic human-quality gate: VISUAL HOLD

- Face uses genuine connected MakeHuman anatomy, but eyelid/sclera contact,
  eyebrows, skin fine detail and realistic reflections remain unapproved.
- Hand shows thumb and independently modeled fingers, but wrist taper,
  knuckle and nails still need authored detail.
- The foot closeup shows individual toes, with low-fidelity nails and
  soft-tissue transitions.
- Hair no longer resembles polygon popcorn, but the current short Afro
  is still too bristly and not certified photorealistic.
- The original previously preferred Blender head was not restored.

Geometry parity alone must never count as passing the visual-anatomy gate.
Real human reference comparison, sculpting and detailed scene review are still
required. No Vercel deployment was performed.

## Reproducible testing

Use the local Node anatomy server to submit the captured canonical snapshot
to the actual Blender worker. Check all six images and the editable blend,
then inspect report.json for torso topology, exact eyeball diameters,
Blender displacement error and visual status. Test with African feminine and
European masculine morphology, including 3cm-eyeball variation.

Next: replace weakly approximated regional morphs and improve eyelid-to-eye
fit, fingers/feet fine topology and hair texture with licensed high-detail
geometry while keeping numeric one-shot source parity.


## Evidence thumbnails — UNAPPROVED

These are screenshots of real Blender Cycles output, reduced in resolution
only for repository inspection. They document unresolved deficiencies.

- [Face and curly hair](assets/anatomy-face-macro-candidate-20261019.jpg)
- [Hand and finger closeup](assets/anatomy-hand-macro-candidate-20261019.jpg)
- [Feet and toes closeup](assets/anatomy-foot-macro-candidate-20261019.jpg)
