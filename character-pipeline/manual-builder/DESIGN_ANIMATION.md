# Blank Engine — Animated Anatomy Builder, Phase 36 (2026-10-19)

## First implemented animation milestone

Each one-shot from the existing 93-variable browser Anatomy Builder now emits an **editable skeletal character** in the original .blend file plus a portable, skinned GLB, two playable video previews, and the six static anatomical diagnostic views.

The anatomical mesh remains the exact browser-deformed CC0 MakeHuman indexed surface. In Blender, the fresh one-shot:
1. Rebuilds the body, eyes and scalp foliage from the browser snapshot.
2. Fits an independent 22-bone deterministic biped armature to measured height and A-pose.
3. Creates normalized vertex-group skinning for body / legs / arms / neck / head.
4. Attaches eye surfaces and shared scalp follicle meshes to the head bone.
5. Defines separate NLA animation clips: Idle_Breath and Walk_InPlace.
6. Exports animated_character.glb with a skin, 22 joints and two named animation channels.
7. Saves anatomical_character.blend with Idle_Breath initially active, editable in Blender.
8. Renders 25 genuine Cycles PNG frames per animation, then encodes two 12fps H.264 MP4 files with FFmpeg.
9. Records per-clip evaluated mesh vertex displacement at four timeline frames and rejects unexpected topology changes or unanimated clips.

## Generated files

- animated_character.glb: skinned GLB model with both clips, suitable for importing into Blank Engine / WebGL.
- anatomical_character.blend: Blender project with animation armature and NLA tracks.
- idle_preview.mp4: 25 frames at 12fps, around 2.08 seconds.
- walk_preview.mp4: 25 frames at 12fps, around 2.08 seconds.
- front.png, three_quarter.png, profile.png, face_macro.png, hand_macro.png and feet_macro.png.
- report.json includes animation.bones, animation.clips, animation.previews and vertex_motion_audit.

## Environment

Prepared Vercel Sandbox requires blender, python3-numpy and ffmpeg.
The deployed website receives all assets from the per-job Sandbox, and downloads are temporary (about 30 minutes). There is no Blob store permission for durable storage at present.
Hosting requires both a preview deployment of the website and refreshing the base Vercel Sandbox snapshot used by API Sandbox.fork.

## Technical acceptance vs anatomical realism

Acceptance means the server truly executed Blender, GLB has exactly one 22-joint skin and both named animations, videos are actual frame renders, and both clips visibly deform the source mesh.

**This is not yet a physiologically realistic gait.** Missing features include toe roll and ground contact, foot IK, avoiding knee hyperextension, anatomically-authored facial and finger phalanx weights, muscular correctives, collision/contact, continuous world-space root motion, facial expressions and robust retargeting of third-party mocap. The current walk is in place, so do not call it production game locomotion or imply it has passed a visual quality gate.

## Verification

- Node UI/server contract tests.
- Real local HTTP POST of canonical snapshot -> Blender worker -> status polling -> download of both MP4s, GLB and .blend.
- GLB binary JSON inspection: one skin, 22 joints, exactly two named clips.
- FFprobe H.264 stream validation, 25 frames, 346x480 for baseline.
- Real Chromium browser-sourced masculine/African snapshot with 286 scalp follicles is tested independently before deployment.

