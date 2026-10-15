# Blank Engine Alpha 0.6 — first procedural IK integration

## Scope
- A two-bone world-space IK layer can pose knees and elbows without changing the Rapier collider or animation root translation.
- Ground contacts are sampled from Rapier's collider raycast, excluding the player capsule. A flat-plane fallback is used only when Rapier is unavailable.
- Foot contacts use a finite height and surface-normal filter (reject walls/large steps), cached stance anchors, and a limited reach budget. They release when airborne or during a swing phase.
- The right hand reaches towards a nearby quest interaction for a short time; this is a gesture, not guaranteed fingertip contact.
- Procedural limbs expose two bones and virtual ankle/wrist offsets. Rigged GLB imports participate only if the relevant upper, lower, and ankle/wrist bones can be mapped. Incomplete skeletons keep base animation.
- Ground adaptation remains limited by the current flat Night Market level and its colliders. No authored uneven terrain or verified foot-to-surface rotation alignment yet.

## Safety and lifecycle
The pose controller owns no rigid bodies and does not set actor world coordinates. Imported animation remains the base layer. IK is best-effort and may be disabled for unsupported skeletons. No GPU skin attachment, cloth collision, or ragdoll claims.

## Regression
`npm test` (73 cases). Real-library smoke requires pinned `three@0.186.1` and `@dimforge/rapier3d-compat@0.18.0`; run `node scripts/ik-real-smoke.mjs` and `node scripts/physics-real-smoke.mjs`.

## Release gate
Inspect animation blending, foot sliding, stair/uneven terrain support, pole knee direction and hand contact on mobile and desktop before an Alpha 0.6 Vercel manual deployment. Current tests do not establish visual quality or production-grade IK.
