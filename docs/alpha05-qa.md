# Alpha 0.5 — gameplay validation checklist

The automated suite checks the compiled GameSpec, location bounds, reachability over a twelve-seed sample, quest progression, no stage skipping, persistence, and editor DOM IDs. It does not replace GPU/browser gameplay testing.

## Browser acceptance test (manual, no Vercel auto deploy)

1. Serve the repository with a static file server (`python -m http.server 8000`) from the root and open http://localhost:8000. The browser must be able to retrieve `three.module.js` from jsDelivr. Do not open the HTML directly via file://.
2. On a new browser session, the real six-agent Night Market example should load automatically. Otherwise click **Load AI demo**. Confirm title, 10 buildings, 4 robots, nighttime cyan lighting and `Barter with 4 robots` quest HUD.
3. Walk with WASD or touch controls; confirm building collision. Drag the viewport to orbit.
4. Approach each **distinct** golden-ringed robot and press E (or tap **Interact**). Confirm trade counter and current stage; confirm repeat trade does not progress. Gate and lantern must not be collectible before all trades.
5. After four trades, collect the crystal lantern, then go to the arch and press Interact. The gate should rise and the HUD should say `MISSION COMPLETE`.
6. Reload the page and verify the same mission progress persists. Click **Restart mission** and check that the sequence resets without replacing the GameSpec.
7. Click **Load AI demo** again to restore the source AI example. Import another valid v1 GameSpec and verify quest progress resets and the world regenerates. Verify invalid/malformed JSON import is rejected.
8. On a mobile viewport, confirm touch movement, Interact, HUD and editor buttons remain accessible.
9. Run `npm test` (41 tests expected) and inspect browser console for exceptions and GPU errors.

## Scope limitations

- Narrative GameSpec v1 (`mission` as text) is deterministically adapted into a **Night Market** trade/lantern/gate quest when recognized. It is **not** arbitrary LLM-generated executable logic.
- Unrecognized mission descriptions use a safe **reach the beacon** interaction fallback. The next schema should encode typed objectives and mechanics explicitly, with strict validators.
- PostgreSQL stores authoritative GameSpecs and agent run provenance; the **browser quest progress is local** to the user's device at this alpha stage. No production authentication, cloud game-save API or server-side action permission checks exist yet.
- External Three.js CDN access is required at runtime. Visual WebGL and GPU rendering were **not verified in the restricted local test container**.
- Changes in GitHub are never supposed to trigger a Vercel deployment; a deployment requires an explicit manual instruction.
