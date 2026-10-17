# HUMAN-A01 actual Blender Cycles experiment — 2026-10-16

## Verified real execution

**GitHub Actions run:** https://github.com/autonomousagentuniverse/blank-engine-lab/actions/runs/38993936500 — every stage SUCCESS. Artifact `human-a01-first-real-cycles-derivative` (ID 12086142525), 95,587,013 bytes zipped, contains four actual Blender Cycles 700×700/18spp renders, contact sheet, report JSON, and real 92,358,625-byte modified Blender project.

**License:** Einar Rig (CC-BY) Blender Foundation | studio.blender.org. Pinned, authenticated 579 MB Einar source from the official publisher. The source ZIP and original source blend were unchanged; full source archive/texture binaries not committed. This modified experimental `.blend` is a **licensed derivative** that references original external source texture files; it is NOT standalone packed/self-contained.

**Actual output:** `human-a01-derived.blend` SHA256 `407560af321e851f3da5e19f989dabd25b3d30c31f89cb1164db58221de41cb2`; `front.png`, `three_quarter.png`, `profile.png`, `eyes_macro.png`, `human-a01-cycles-contact-sheet.jpg`, `report.json`. Source head 4,596 vertices. Deterministic facial morph: max displacement 0.01256 meters; median 0.001043 meters. 66 shape keys retained (not only 60), native eye/cornea/meniscus/plica geometry, source film skin shader unchanged at 301 nodes/379 links. Real Blender Cycles; **no WebGL test**.

## Visual evaluation (actual pixels manually inspected)

**REJECTED — not a convincing independent new human.** The face remains unmistakably similar to Einar; slight chin/nose/jaw changes are cosmetic morphs rather than genuinely independent anatomy or identity. Neutral closed-lip mouth remains a prominent unnatural black slit/void. Receding source hairstyle looks like Einar, visible stylized/scarred/ruddy source facial textures, frowning brows and odd silhouette. Clothing/strap remnants are visible in several shots despite isolated asset intent, including detached black surfaces near shoulder in profile.

Despite rendering successfully, this **does not meet the owner's photorealistic new-human standard**. Technical pass does not imply visual pass. A scene with a modified Einar face is not evidence of a robust new-human generator.

## Diagnosis and bounded next work

1. **Stop Einar-face identity morph loop.** This test demonstrates that uniformly preserving a character's scan-grade skin/hair/rig while morphing only the head does not create a distinct, professionally acceptable person.
2. **Use Einar deconstruction only as a technical reference for eye anatomy, facial corrective deformation, shader baking and hair attachment.** Generate a novel head from a separately acquired/created anatomical base with verifiable rights and distinct geometry, then validate skin/hair look in Cycles before web export. Do not simply import an existing likeness and relabel it as independently created.
3. For any Einar-derived future technical control, isolate film props and fix mouth occlusion by inspecting actual closed-lip neutral rig drivers/material masks. These are *reference rig* improvements, not proof of a new human.
4. Human photorealism review remains BLOCKED; no merge to main, no deploy. One-shot run finished and permanent workflow returned to `workflow_dispatch` only.

**Experiment code commit:** https://github.com/autonomousagentuniverse/blank-engine-lab/commit/5823a940745d0938b05716ac226e6a9aff168f4d. **No additional automatic runs.**
