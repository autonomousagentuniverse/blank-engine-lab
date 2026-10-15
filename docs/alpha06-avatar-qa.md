# Alpha 0.6: Rigged Avatar / Retargeting Acceptance Criteria

Status: development only; no Vercel release authorized.

## Completed in code (requires live library smoke and browser test)
- File-picker imports only glTF 2.0 GLB (max 8 MiB) with embedded binary and embedded textures; external references are rejected.
- Humanoid bone matching supports common Mixamo and Blender conventions.
- At least one SkinnedMesh and five main humanoid bones required; the current procedural character survives rejected uploads.
- AnimationMixer blends imported named animation clips across idle/walk/run/jump/fall; fallback procedural joint clips fill missing states.
- Rapier owns world collision/position; animation root-motion translations are never applied to the authoritative physics body.
- Imported rig survives GameSpec rebuild inside current browser session and is disposed on replacement; never saved to localStorage, PostgreSQL or GitHub.
- The editor accepts a second rigged motion-donor GLB and transfers matching named locomotion clips between equivalent humanoid joint roles, excluding translations. Imported motion stays in session memory.

## Not yet complete
- Retarget calibration for dissimilar bind-pose axes and varied proportions.
- Planted-foot inverse kinematics, step-height and slope adaptation.
- Facial, hand, cloth, hair or high-fidelity skin shading.
- Full interactive phone/tablet/desktop playthrough with a variety of third-party authored GLBs.

## Verification
1. Run Node regression suite and the real exporter→loader smoke.
2. Manually import a legally usable rigged GLB with different naming conventions; verify animation appearance and scaling in the browser.
3. Verify run, jump, land, collision, and NPC interaction work without letting animation move the physics collider.
4. Test malformed GLB and external URI rejection; confirm existing world/character are preserved.
5. Verify world edits recreate imported avatar and movement remains functional.
6. Do not deploy until these major-release gates pass and the user approves one manual deployment.
