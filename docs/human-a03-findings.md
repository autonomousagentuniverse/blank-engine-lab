# HUMAN-A03 — genuine Blender Cycles visual result and corrected evidence

Date: 2026-10-17

## What actually executed

- Source branch: `experiment/human-a03-neutral-expression-hair`.
- Initial test [39024983885](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39024983885) **FAILED before render**: Blender hair shader API `ShaderNodeBsdfHair.parametrization` unsupported. Fixed by retaining the source Einar `einar.hair` shader and repairing procedural strand parent transforms.
- Corrected test [39025133361](https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/39025133361) **rendered all four 700×700 Cycles frames and saved Blender .blend/report successfully**, archived artifact `human-a03-neutral-expression-groom` (ID `12097937679`, 95MB archive). **Overall GitHub job marked FAILURE only because its post-render integrity check expected `human-a03-neutral-groom.blend` while generated filename was `human-a03-neutral-mouth.blend`.** This filename mismatch is now corrected in the experimental source for future runs, without claiming the existing failed job turned green.
- Output artifact: `front.png`, `three_quarter.png`, `profile.png`, `eyes_macro.png`, `human-a03-cycles-contact-sheet.jpg`, `human-a03-neutral-mouth.blend`, `report.json`.
- Render source: original pinned CC-BY Blender Studio Einar v1 `.blend` and its maps, unmodified on disk. A03 remains a source-derived facial variant, not an independently sculpted person; generated .blend has external texture dependencies.

## Quantified changes

- 3,900 short procedural scalp curves, each 3–9mm, sampled from **331 candidate source scalp polygons**.
- Four source brow raise shape-key values were requested: inner L/R `0.42`, outer L/R `0.20`; key blocks have active source drivers. The visually evaluated brow remained deeply furrowed.
- A02 localized lip closing shape key retained and skin material / eye stack unchanged.

## Visual verdict: MIXED, not approved

Review of the real pixels shows: removal of long, unruly original scalp hair; new short procedural hair does not yet visibly produce the intended groom (head appears clean-shaven). Mouth remains closed, eyeballs/corneas and film skin detail remain realistic relative to earlier MakeHuman. **Original angry brow/frown largely unchanged, hanging black shoulder strap still present.** Therefore no convincing overall aesthetic improvement and no release.

## Confirmed engineering learnings

- Source shape-key `value` can be driven by rig actions/controls: the A03 audit captured live drivers for `A_EyebrowRaise_Inner/Outer.L/R`. A future attempt must inspect and manipulate actual driver variables, evaluated rig pose, or author an independent additive corrective; do not promise neutral expression by setting a driven value.
- The strap survives despite the visual whitelist. Its actual evaluated source object/instance has **not** been identified. Find it through Blender dependency-graph evaluated instances or object-level render pass before removing it. Do not cosmetically crop to claim a geometric cleanup.
- Procedural hair creation passing an object/strand count does **not** mean the groom is visible in Cycles. Examine its shading, object transform, material and hair root placement on evaluated scalp before interpreting geometry count as success.
- Do not move original eye meshes or simplify the successful film skin material.

## Next bounded experiment

Identify the **evaluated objects/instances** contributing to the strap and the **drivers/neutral pose** controlling the furrow, then target those exact dependencies in Blender, perform one quick front-view proof and only expand to four views if objectively corrected. Review hair separately; do not regenerate arbitrary long hairstyles.

No Vercel deploy, no production merge. Manual-only workflow.
