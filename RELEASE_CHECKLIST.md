# Pixel Rift 1.1 release review

This candidate is on `feature/release-ready`. It is not merged or published automatically.

## Automated gate

Run Node.js 24, `npm ci`, then `npm run release:check`. This runs simulation/network tests, TypeScript, the production build, and an ephemeral production HTTP/asset smoke test. The game stays on one Node process; no external database is required.

## Review on real devices

- [ ] Two humans enter Quick Play in the same mode, join one public lobby, then auto-start after five seconds. A private room is never selected by Quick Play.
- [ ] Four humans complete a match on independent devices/networks; test one mobile device using every special action.
- [ ] Pulse respects cover, shields, spawn protection and friendly fire. Blitz ends at 90 seconds or target 30; crystals score two.
- [ ] Refresh reconnects the same player within 30 seconds. Expired sessions return a clear message. LEAVE frees the slot immediately.
- [ ] Tutorial/settings focus correctly; closing them restores input. Motion/particle/volume preferences persist after refresh.
- [ ] Scoreboard, respawn spectating, outcomes, rematch and local progress work through a full round.
- [ ] Listen to the sound mix, check reduced motion, and assess playability at actual public-network latency.

## Publish after approval

1. Merge the candidate PR into `main` after review.
2. Verify the existing Render service builds that exact merged commit; confirm its HTTP health-check path is `/health`.
3. Wait for a Live deployment, then verify `/health` returns version `1.1.0` and protocol `2`.
4. Open the public URL in a fresh browser and complete the two-player Quick Play check. A deploy status alone does not verify gameplay.
5. Existing open tabs may need reload because this release adds a protocol version check. Deployments reset in-memory rooms; the shutdown event explains this to connected players.
6. If the release fails, retain the failing logs and revert the source change through a reviewed Git change; remember that rooms cannot survive a process replacement.

## Operating limits

Quick Play matches by mode on this server; it has no rank, region or skill rating. It needs two humans; use private rooms with bots for solo practice. Public lobbies have fixed teams/rules while private lobbies retain host customization. Personal stats/settings live in the visitor's browser, and are not verified rankings. This release keeps single-instance, in-memory rooms. Sleeping hosts can cause cold starts; verify the chosen hosting plan against the expected traffic before announcing the game.

No real-device certification, load-test capacity claim, audio listening approval or production deployment is implied by the local automated checks.
