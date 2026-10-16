# HUMAN-01 automatic human generation proof

The requested example is a HUMAN, not a mechanical ASTER-01 character and not a republished Einar picture. This is a new individually parameterized human from MakeHuman/MPFB2 macro targets, CC0 body, skin, eyes, hair, brows, lashes, clothing and automatic game rig.

Sources:
- Official MPFB2 program at github.com/makehumancommunity/mpfb2, pinned commit 3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf, program GPLv3, graphical core assets CC0.
- Official MakeHuman system asset pack CC0 from files2.makehumancommunity.org.
- Config assets/specs/human-01.json defines individual proportions and source asset choices.

The unattended GitHub workflow must generate human geometry via documented HumanService.create_human(), attach proper game skeleton, apply licensed skin and fit official CC0 human eyes, hair, brows, lashes and clothes, export genuine newly created GLB, validate source identity and 3D rig/texture, run unchanged engine tests, and capture 5 REAL Chrome Three.js canvas views plus a contact sheet.

No source images may be substituted as proof of Blank Engine rendering. GLB creation and WebGL tests are technical milestones; photorealistic face/eyes/hair remains subject to visual examination and owner acceptance. Stay on isolated experiment branch, no main merge/Vercel deploy. After first QA, restore workflow_dispatch only and update continuity in the same commit.
