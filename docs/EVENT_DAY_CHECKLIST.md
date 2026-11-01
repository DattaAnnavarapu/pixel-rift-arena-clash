# Pixel Rift — event day runbook

Date/event format: **confirm with organizer**. Public URL: **add after deployment**. Backup URL: **add only after tested**.

## Before doors open

- [ ] Review GitHub PR, checks, source commit and the `event-candidate` tag (suggested only; do not tag automatically).
- [ ] Deploy the chosen commit only during a quiet window. **Every deployment resets all in-memory rooms and player reconnect tokens.**
- [ ] Wake host with `/ping`, then inspect `/health` for `ok`, version `1.2.0-alpha.2`, protocol 3, tick/memory/errors, and server ID.
- [ ] Run `npm run event:check -- https://YOUR-HOST.onrender.com` **before guests join**. It creates a short-lived public Quick Play round.
- [ ] Verify two independent real phones (iOS Safari/Android Chrome if available), both sticks, move/aim/fire, three abilities, portrait/landscape and safe areas. Mark actual results with devices and time.
- [ ] Two actual humans join Quick Play in the same mode, complete a round, and rematch. Validate code invites and practice.
- [ ] Listen to music and SFX through headphones; test reduced-motion and settings.
- [ ] Take production screenshots from a live validated build, not an illustrative mockup.
- [ ] Confirm backup Render URL and local backup connectivity *before* announcing either.

## During the demo

- [ ] Keep Render Events/Logs open; note tick spikes, memory and health errors. Confirm host remains Live.
- [ ] Avoid new deploys. If the host sleeps or connection stalls, display the wake-up status and wait for the same origin to recover.
- [ ] Keep a friend/second device ready to join Quick Play; use private Practice vs Bots if no second human is available.
- [ ] Record any failures: UTC/local time, device/browser, mode, room code, server instance and symptoms.

## Rollback / restore

1. Save failing logs and identify the last confirmed-good commit/tag.
2. Prepare a reviewed revert commit (`git revert <bad-commit>`) or restore the prior tagged revision using Git/PR; never force-push main in the event.
3. Deploy only after communicating that active matches will reset; verify `/health`, `/api/status`, JS and a new Quick Play after the deployment.
4. A backup URL is a **new server**: players must create/join new rooms. There is no state migration or seamless failover.

## Outstanding before saying “release approved”

- [ ] Real Android/iOS touch, rotation, sound and layout.
- [ ] Human feel/balance across classes, weapons, pickups and bot difficulty.
- [ ] 350–450ms **human** RTT, polling fallback, and sustained four-player load.
- [ ] Cold start, Render paid/free status and backup readiness.
- [ ] Shield limitation acknowledged: at most 150ms activation backdate; committed hits/KO do not rewind.
- [ ] No region routing, no verified cross-country test, no persistent rooms/stats.

**After** green verification, you may choose to run `git tag event-candidate && git push origin event-candidate` yourself. This document does not create a tag or deploy anything.
