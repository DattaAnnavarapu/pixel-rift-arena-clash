# Pixel Rift: event-day release and feature-freeze checklist

**Candidate:** 1.2.0-alpha.2 · protocol **3** · authoritative single-instance server. **Deadline:** event night (confirm exact time and timezone with organizers). **Feature freeze begins exactly 3 hours before that deadline**; calculate the cutoff from the confirmed event time, not from a guess.

**Live game URL:** [PUBLIC URL] (replace after checking the actual deployed address). **Backup:** [VERIFIED BACKUP URL] (only fill after testing).

## Execute in this exact order

1. **Pre-event deploy — before the freeze, to a quiet instance.**
   - [ ] Record the intended Git commit and review that `npm test` (103+ expected), `npm run build`, and `npm run release:check` all pass on Node 24.
   - [ ] Deploy this candidate explicitly to Render and confirm its deployed commit is the intended one.
   - [ ] Tell testers that **every deployment resets in-memory rooms, matches and reconnect tokens**; do not deploy while people are mid-round.
2. **Wake the service using `/ping`.**
   - [ ] Open `https://YOUR-HOST.onrender.com/ping`; expect `pong`. A free Render service can sleep and take time to respond.
3. **Verify `/health`.**
   - [ ] Inspect `ok`, release version, protocol **3**, errors (target 0), tick duration, memory, room count and instance ID.
   - [ ] Check Render Events/Logs, and confirm the service is Live on the intended revision.
4. **Run the remote two-client event smoke test.**
   - [ ] From a local checkout at the *same* version: `npm run event:check -- https://YOUR-HOST.onrender.com`.
   - [ ] It creates a temporary public Quick Play match; run it **before participants enter**, not during the demo.
5. **Test on two actual phones and a second human.**
   - [ ] Record device/browser, OS, connection type, and outcome; ideally one Android Chrome and one iPhone Safari.
   - [ ] Verify portrait/landscape, left-handed setting, safe areas, move+aim+fire simultaneously, cancel/blur, abilities, settings, QR invitation, bot practice, and tutorial.
   - [ ] Complete Quick Play with two human players on independent devices, then test invitation and rematch.
6. **Reconnect fault test — airplane mode for approximately 10 seconds.**
   - [ ] With a match in progress, briefly switch airplane mode on (~10 s), then off on one real phone.
   - [ ] Confirm `Reconnecting…` appears, the token is retained for transient errors, and the player rejoins the same room/ID if still within the server's 30-second grace window.
   - [ ] Repeat a page refresh; examine logs for duplicate players or stale retries. A reconnect cannot be guaranteed after the grace window or across deploys.
7. **Start the feature freeze at T−3 hours.**
   - [ ] Record the actual freeze timestamp and named release commit.
   - [ ] **Bug-fix-only rule after freeze:** no maps, modes, classes, cosmetics, leaderboards, matchmaking changes or protocol changes. Apply only small, demonstrated release-blocking fixes with regression coverage and full checks. Avoid speculative refactors.
8. **Create the event candidate tag after green checks.**
   - [ ] Suggestion only; do **not** create it automatically: `git tag event-candidate <tested-commit>` then `git push origin event-candidate`.
   - [ ] If the tag already exists, inspect it first; don't silently move or force-update it.
9. **Final deploy of the tagged revision.**
   - [ ] Deploy only if needed to put the exact tested/tagged commit live. Warn everyone first: **all active rooms reset on deployment**.
   - [ ] Recheck `/ping`, `/health`, Render logs and `npm run event:check -- <url>` before admitting players. Skip this deployment if the verified revision is already live; unnecessary redeploys can break ongoing matches.
10. **Rehearse and freeze the demo.**
    - [ ] Perform the [60–90 second demo script](DEMO_SCRIPT.md) end-to-end and verify its real-build screen recording fallback plays offline on the presentation device.
    - [ ] Keep the second player/device ready, monitor Render logs, confirm the backup URL (if configured), and display the tested public URL.
    - [ ] After the freeze, do not alter code, configuration or host plan except for a demonstrated blocking bug.

## During the event

- [ ] Keep Render Events/Logs and `/health` available, watching errors, CPU/tick spikes, memory and server instance.
- [ ] Avoid deployments during active rounds. Practice vs Bots is the fallback if there is no second human for Quick Play.
- [ ] For every failure, record time, revision, browser/OS, network, room code, instance, repro steps, and logs.
- [ ] The backup Render service/local server is a **separate origin with separate rooms**; players must start fresh. A localhost server is not reachable over the public internet without verified secure access.

## Rollback if a release-blocking issue appears

1. **Save logs first:** Render Events, application error traces, deployed commit hash, `/health` output and reproduction steps.
2. **Revert the offending commit** in a reviewed branch: `git revert <bad-commit>`. If it is a merge commit, get an operator to choose the proper mainline parent (`git revert -m 1 <merge-sha>`) instead of guessing.
3. **Run the full gate** (`npm test`, `npm run build`, `npm run release:check`); only proceed if green. Coordinate the revert/merge with the release owner.
4. **Redeploy the verified revision**, warning players that this **resets every in-memory room, match, and reconnect token**.
5. **Re-run `/ping`, `/health`, `npm run event:check -- <url>` and a real two-player lobby check** on the recovered service before reopening.

## Open manual acceptance items — do not mark these passed without evidence

- [ ] Real Android/iPhone touch, rotation, audio, accessibility and thermal/frame-rate checks.
- [ ] Independent-network/cross-country human matches and sustained-load capacity.
- [ ] Cold-start time and paid/free Render plan suitability; backup URL connectivity.
- [ ] Shield backdate limitation understood: capped at 150ms and **no historical damage/KO rollback**.
- [ ] No region routing or shared multi-instance room state; browser-local progress is not competitive ranking.

**No deploy, tag, or merge is performed by editing this checklist.**
