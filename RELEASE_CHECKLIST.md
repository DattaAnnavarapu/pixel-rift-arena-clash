# Pixel Rift release review

Current candidate: `feature/event-stabilization`, version `1.2.0-alpha.2` (event candidate). It is not merged or published automatically. Earlier v1.1 test history remains below.

## Event day gate — 1.2.0-alpha.2 (protocol 3)

**Automated checks on this event-polish branch: NOT RUN in the assistant environment.** Before merging, run on Node 24: `npm ci`, `npm test` (93 baseline plus new event tests), `npm run build`, `npm run release:check`; then check Prettier. Any failure blocks the candidate.

- [ ] Confirm the exact GitHub commit and complete checks before approving the PR. No deployment or merge performed in this branch.
- [ ] Run `npm run event:check -- https://YOUR-HOST.onrender.com` **after** an explicitly approved deployment but before visitors connect.
- [ ] Verify `/ping` and `/health`: version, protocol, `ok`, errors, tick time, memory, server ID.
- [ ] Verify a paid always-on Render plan for an uninterrupted event; current `render.yaml` is a free Ohio single instance and may sleep.
- [ ] Capture CSS layout screenshots at 320×568, 390×844 and 844×390 from this exact build; label them browser CSS checks, not phone results.
- [ ] Pass real Android and iOS joystick/aim/fire, left-hand, cancel/blur, fullscreen/rotation, safe-area and frame-rate checks.
- [ ] Two real humans complete Quick Play, a private invite and a rematch; one human completes Practice vs Bots at Easy/Normal/Hard.
- [ ] Test tutorial completion, shield reflections and damage pickup, reconnect before/after 30s, and no duplicate player after refresh.
- [ ] Listen to all audio on device/headphones and confirm reduced-motion/particle/volume preferences.
- [ ] Inspect live Render metrics, server wake/cold start, and confirm a verified separate backup URL or local reachable host.

**Known limitations:** shield activation backdates up to 150ms but does not undo committed damage/KO; region routing disabled; cross-country, perceptual audio and sustained load not certified; rooms and reconnect tokens are process-local and reset on deploy. Quick Play is not skill-matched. A backup service cannot inherit active rooms. Phase 8 maps/modes/cosmetics remain deferred.

**Release-hygiene suggestion, do NOT execute until approved:** `git tag event-candidate && git push origin event-candidate`. See [event day runbook](docs/EVENT_DAY_CHECKLIST.md), [uptime/backup](docs/EVENT_UPTIME.md), [TTK matrix](docs/EVENT_TTK.md), [mobile CSS QA](docs/MOBILE_CSS_QA.md) and [demo script](docs/DEMO_SCRIPT.md).

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
3. Wait for a Live deployment, then verify `/health` returns version `1.2.0-alpha.2` and protocol `3`.
4. Open the public URL in a fresh browser and complete the two-player Quick Play check. A deploy status alone does not verify gameplay.
5. Existing open tabs may need reload because this release adds a protocol version check. Deployments reset in-memory rooms; the shutdown event explains this to connected players.
6. If the release fails, retain the failing logs and revert the source change through a reviewed Git change; remember that rooms cannot survive a process replacement.

## Operating limits

Quick Play matches by mode on this server; it has no rank, region or skill rating. It needs two humans; use private rooms with bots for solo practice. Public lobbies have fixed teams/rules while private lobbies retain host customization. Personal stats/settings live in the visitor's browser, and are not verified rankings. This release keeps single-instance, in-memory rooms. Sleeping hosts can cause cold starts; verify the chosen hosting plan against the expected traffic before announcing the game.

No real-device certification, load-test capacity claim, audio listening approval or production deployment is implied by the local automated checks.

## Public test follow-up

Reported passing: menu, solo bots, abilities, synchronized movement and winner.
Reported failing: Quick Play and mobile compatibility. Cross-network multiplayer remains untested.

Fix candidate: public loadout selection preserves ready status/countdown; touch controls appear on hybrid devices and narrow screens, track joystick pointer ownership, and fit narrow screens/safe areas. Touch releases on the arena no longer cancel a held FIRE button.

Retest before release:

- Two fresh browser sessions choose the same Quick Play mode. Change loadouts during countdown; both should start together. Repeat with three and four players. UNREADY intentionally pauses the queue.
- On an actual phone, test portrait and landscape, MOVE + AIM + held FIRE simultaneously, release AIM while holding FIRE, then each ability. Rotate and verify all controls remain reachable; no scrolling/zoom gesture should steal a joystick.
- Use Wi-Fi on one device and cellular on another. Join by code and Quick Play, finish a round, refresh/reconnect within 30 seconds and test connection loss. Record device/browser, mode, time and symptom for any failure.

Automated checks cannot certify physical touch input or independent-network reliability. Keep release blocked until these retests pass on the deployed fix.

## PR #5 deployed public results and mobile redesign

User-reported passes: same Quick Play lobby, countdown/auto-start, joystick movement, fire/dash/shield/special, Wi-Fi/cellular matching and synchronized gameplay without disconnecting. Ability changes during matchmaking are still untested publicly. Mobile layout failed playability review.

The follow-up branch `fix/mobile-match-layout` replaces the mobile match stack with a viewport-sized grid. Portrait has a separate bottom control dock; landscape puts controls beside the arena. Health stays visible, action buttons show server cooldowns, and Scores/Settings/Leave remain accessible. Parent resize observation refreshes Phaser sizing after rotation. The lobby Leave button is visible on small screens again.

Local QA: browser preview frames at 320×568, 390×844 and 844×390; check no control/arena overlap, no main-container overflow, rotation resizing, settings and scoreboard. This verifies CSS layout, not physical-phone ergonomics or safe-area hardware.

Release remains blocked pending the redesigned build's real-phone playability check (portrait and landscape, browser bars visible, simultaneous move/aim/fire, all loadouts, rotation, settings, scoreboard, leaving and rematch) and a deployed two-human Quick Play test changing abilities while the countdown is active. Keep the earlier Wi-Fi/cellular passes recorded; repeat a short network smoke after deployment rather than treating them as untested.

## Reopened public blockers: latency, aiming and international matching

The later public report supersedes the earlier passing round: cross-country Quick Play, input/control lag and mobile joystick playability are release blockers again. Do not call v1.1 stable based on the earlier checks.

Branch `fix/input-latency-mobile-controls` adds immediate local weapon aim/flash, bounded unacknowledged-movement replay, up-to-60Hz input dispatch separate from the UI clock, writable-transport checks, disposable in-match snapshots, HTTP-polling-first connection/upgrade, and server-instance/RTT diagnostics. Mobile is a two-thumb MOVE / AIM + FIRE layout with larger sticks, a dead zone and three centered abilities; releasing aim stops firing, and blur/cancel resets controls.

Required public retest: two players abroad use the exact same URL and mode; record server IDs, room codes, RTT and any connection error. Try a private invite as well as Quick Play. Run movement/aim/fire under the actual latency, then a full match. Test portrait, landscape, simultaneous two-thumb play, releases/cancels, switching apps and rotating on physical Android/iOS devices. Verify the right stick center preserves aim and stops firing. Local tests with 50–250ms prediction histories are not a real-network latency/load certification. Server placement and physical transit delay remain limits; multi-instance rooms need shared state before scaling.

## v1.2 Phase 1 candidate

Branch `feature/v1.2-phase1-combat`, version `1.2.0-alpha.1`, protocol 3. Scope and balance tables: docs/V1_2_PHASE1_PLAN.md and README. PR #7 input dispatch, movement replay and two-thumb controls remain the baseline.

Automated gate: 70 tests plus TypeScript/Vite build and production smoke. New coverage exercises nine class/weapon combinations, magazines/reload, class-aware healing/resets, damage modifiers, absorption/expiry/refresh, fast bolts/cover/reflection, prediction and actual Socket.IO selection validation. Old mobile-input and polling regressions remain enabled.

Manual acceptance before deployment/release:

- Two humans select different class/weapon/special combinations, complete full rounds and reconnect; compare HP, ammo and damage feedback on both clients.
- Confirm no movement/aim latency regression on real phones in portrait and landscape. Hold AIM + FIRE through reload; tap all three abilities while moving. Verify ammo/reload, HP and buffs stay readable after rotation.
- Try all nine class/weapon combinations, including close-range shotgun and long-range rifle, with shields and damage pickups. Tune balance from playtests; automated correctness is not a fairness certification.
- Check class silhouettes, weapon tones, shield absorption feedback and reduced-motion/particles settings. Assess supported-phone frame rates.
- Deploy only after review/approval; stale protocol-2 tabs must reload. No international matchmaking claim or full v1.2 release approval follows from this phase.

## Stabilization Phase 1 manual checks

- [ ] Cold-start on the free Render plan; review health tick/memory/errors under expected traffic.
- [ ] Refresh/take over a session during an active match; confirm the superseded tab disconnects and the new player remains online past the old cleanup timer.

## Stabilization Phase 2 manual checks

- [ ] Evaluate aiming/movement/projectile correction on physical devices at 350–450ms RTT; inspect shield late-packet behavior (no retroactive damage rollback).
- [ ] Run the full-match latency script with 2, 3 and 4 players, plus polling-only. Compare per-player RTT and same-server matching. Region probing remains disabled.

## Stabilization Phase 3 — real phone acceptance (NOT RUN)

- [ ] iOS Safari and Android Chrome: 320×568, 390×844, 844×390 with browser bars/notch safe areas.
- [ ] Both stick owners, simultaneous move/aim/fire, cancel/blur/app switching, left-handed mode and maximum stick size.
- [ ] Fullscreen/orientation fallback, standalone launch, Settings scrolling, haptics support and saved preferences.
- [ ] High/low quality FPS/audio/heat test; low-quality FPS cap starts on the next match.

## Stabilization Phase 4 manual checks

- [ ] Evaluate the slower cadences and rifle one-shot protection with real players; compare all defender classes, range, shotgun pellet misses and shielding.

## Stabilization Phase 5 manual checks

- [ ] Host difficulty changes, all arenas/corner routes, broken walls, hidden enemies, bots vs humans and CPU/tick metrics with four bots. No general balance guarantee follows from seeded duels.

## Stabilization Phase 6 manual checks

- [ ] New-browser first-run prompt and No thanks persistence; tutorial replay after completion.
- [ ] Complete every step with desktop and physical touch controls, all specials/weapons, reflection misses, reload, all four pickups and fight/respawn.
- [ ] Check hint placement, ring visibility, touch highlights, reduced motion, skip/replay/leave and no browser-stat changes. Full hardware tutorial completion is NOT yet certified.

## Stabilization Phase 7 manual checks

- [ ] Team shape distinction without color, scoreboard pings, ammo ring, confirmed hits, damage direction and killed-by card.
- [ ] Headphone panning, heartbeat/control cue levels, volume/motion/particle preferences and hidden-tab silence.
- [ ] Emote wheel on touch/desktop, flood limit and menu closure. No perceptual audio/device pass is claimed.

## Event candidate final gate

- Automated: 93 tests (original 70 retained), build, production HTTP/assets smoke and compiled Node startup pass.
- Browser viewport QA: 320×568, 390×844, 844×390 fit; short dash, shield reflect and special confirmed by real tutorial events. This is not a real-phone pass.
- Faulted full-match trials: 2, 3 and 4 clients at 400ms injected RTT, 30ms jitter, 3% volatile loss: no disconnects/input rejects/score-phase disagreement. Positional/perceptual desync is not covered.
- [ ] Complete historical late-shield acceptance/rollback design; current backdating cannot undo committed damage/KO.
- [ ] Playtest slower firing cadence and rifle tuning with humans at 350–450ms RTT.
- [ ] Complete tutorial on real phones, including all pickups, crystals, final fight and respawn.
- [ ] Run sustained load, free-plan sleep/cold-start and cross-country tests.
- Phase 8 and optional per-bot/adaptive settings remain deferred. No merge or deployment was performed.
