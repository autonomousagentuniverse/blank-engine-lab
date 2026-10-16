# Blank Engine · Universal Feature Inspector (Alpha 0.6)

The inspector is an engine subsystem, **not a face-only tool**. The same `inspection/focus.mjs` module is used by Character Lab and the Night Market/world editor; Object Builder and Scene Builder can adopt it without their own bespoke close-up cameras.

## How it works

1. Enter **Pick any detail**. Tap or click any visible surface (character face, clothing seam, hand, eye, building window, door hinge, prop, or scene object).
2. The raycaster selects the **exact world-space hit point**, not a hard-coded body part. The inspector stores an anchor in that mesh's local space, so the camera can follow the selected object if it moves.
3. Adjust focus distance down to 0.13 world units for small details, then orbit and zoom as usual.
4. Save up to twelve independent camera bookmarks or capture a PNG before editing an asset. Re-select the bookmark to compare revisions. Bookmarks are session-local; there is no server-side asset mutation.
5. Exit inspection to return to the original overview or gameplay camera.

## Safety and regression contracts

- Raycast selection and camera changes must **never mutate mesh geometry, material values, skeletons, quest progress, or physics bodies**.
- Pointer movement over 8 screen pixels is interpreted as orbiting/dragging, not selection, reducing accidental taps on phones.
- Keep close camera distance bounded to avoid negative clipping or accidental travel outside the view.
- Close-up capture does not certify photorealism; visual acceptance still requires a human review.
- The Night Market pauses movement *input* while inspection is active, while Rapier and other simulation updates continue. Exiting returns to the gameplay camera.
- Input textures and GLBs are not uploaded. Camera bookmarks are not persisted across browser sessions.

## Adoption by other builders

Instantiate `createUniversalInspector(THREE,{camera,canvas,controls,getRoots,afterFocus})` inside any asset or scene preview. `getRoots()` returns that builder's currently inspectable Object3D roots. No role-specific skeleton logic is required. Use `.focusPoint(hit.point,{object:hit.object})` for scripted feature selection; `.pickAt(x,y)` for a user's click; `.bookmark()` and `.recall(id)` for repeatable QA.

## Verification

`node --test test/feature-inspection.test.mjs`, followed by `node scripts/universal-inspection-browser.mjs` in GitHub Actions with pinned Three.js and Rapier. The latter takes actual Chrome screenshots of a human detail and a scene object, and verifies quest/physics remain active. No Vercel deployment.
