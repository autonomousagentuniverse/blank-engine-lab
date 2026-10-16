# Hero v5 — Einar rendered by Blank Engine real WebGL, NOT Blender Cycles

Owner explicitly requests that Blank Engine itself reproduce a believable 3D character image. Old screenshots were produced using Blender Cycles and do not qualify as Blank Engine rendering.

This new isolated experiment uses the official Blender Studio Einar v1 CC-BY ZIP, SHA-256 3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7. Required attribution: Einar Rig (CC-BY) Blender Foundation | studio.blender.org. No original source archive, textures or Blender file may be committed to Git; only a derived licensed copy in a short-lived Actions artifact.

The source-to-GLB process copies/evaluates genuine original head, separate eye spheres, corneas, menisci, tear structures and polygon eyelashes from Einar, without altering original files. It maps the original genuine skin and eye albedo images to simple standard glTF Principled PBR materials, using bounded 2048px converted copies for the initial browser proof. The original film Cycles shader, full SSS/hair curves and full 799-bone control rig cannot simply be transplanted into a web renderer.

This specific test is a STATIC transfer baseline. It does NOT implement blinking, rigged facial animation or Cycles-quality shader equivalence. Real WebGL2/Three.js GLTFLoader must load the newly generated GLB from the Blank Engine experimental Character Lab and screenshot directly from a WebGL canvas at neutral front, three-quarter, profile, frontal eye closeup, and oblique eye closeup. Fail if no real Einar head, both eyes, separate corneas, source skin and iris maps, or actual WebGL context.

Also run unchanged engine regressions and archive glTF integrity audit, PBR material/texture runtime audit and five authentic Chrome PNGs plus contact sheet for visual comparison against prior Blender source renders. Human visual approval and real Android phone performance remain BLOCKED. Do not claim that technical success means likeness, animation, or photorealism quality passes.

This test may start through a temporary one-shot push event restricted to the isolated experiment branch. Remove that trigger after first successful technical QA and record outcomes in continuity/state. No production main edit, no Vercel deploy, no promotion without human approval.
