# Pixel Rift: Arena Clash

**Pixel Rift: Arena Clash** is a free-to-try, no-login, browser-based team arena game for **2–4 players** on desktop and mobile. Choose Assault, Tank, or Scout; bring a Blaster, Shotgun, or Precision rifle; and compete for crystals, control points, and knockouts while using Dash, a reflective Shield, and special abilities. New players can learn in a guided tutorial or jump into private Practice vs Bots; friends can join by room code, invite link, or QR. A 30 Hz authoritative Node/Socket.IO server decides hits, pickups, scores, and outcomes while client-side prediction improves responsiveness. This is a **1.2.0-alpha.2 event candidate**, not a certified global-scale release.

**Live game:** [PUBLIC URL] — replace this placeholder only with the tested production address before submission.

## Play in 30 seconds

| Action | Desktop | Mobile |
|---|---|---|
| Start | **Quick Play** (two or more humans); **Practice vs Bots** (solo) | Same menu; **Tutorial** for guided onboarding |
| Move | WASD or arrow keys | MOVE thumb stick |
| Aim and fire | Aim with mouse; hold left click | AIM + FIRE thumb stick; drag to shoot |
| Reload | Automatic when magazine empties | Automatic |
| Dash | Space | DASH |
| Reflective shield | E | SHIELD |
| Special ability | Q (Nova, Mend, Blink, or Pulse) | On-screen special button |
| Invite friends | Copy a private room link/code or show its QR | Scan a private-room QR or enter the code |

## What's ready for the event

- **Combat loadouts:** Assault, Tank, Scout; Blaster, Shotgun, Precision rifle; four specials and collectible health, shield, speed, and damage boosts.
- **Onboarding:** first-run prompt and guided tutorial; private Practice vs Bots with **Easy / Normal / Hard** difficulty.
- **Multiplayer:** Quick Play for 2–4 people, private invites, room-link QR sharing, server-owned outcomes, and session resume/reconnect handling.
- **Mobile controls:** two-thumb movement/aiming, touch abilities, portrait/landscape layouts, configurable stick size, left-handed layout, and quality preferences.
- **Connection diagnostics:** in-game ping and server status. Automated tests included a **simulated** four-client match at 400 ms RTT, 30 ms jitter, and 3% loss; that does **not** prove human high-ping playability.
- **Event tooling:** `/ping`, `/health`, `npm run event:check -- <url>`, plus an [event-day checklist](docs/EVENT_DAY_CHECKLIST.md) and [demo script](docs/DEMO_SCRIPT.md).

## Known limitations and acceptance checks

The service uses **one Render instance with in-memory rooms**; a deploy/restart ends active matches and reconnect tokens, and a free-tier instance may sleep. Quick Play has no region routing, ranked skill matching, or shared state between servers. Shield activation may backdate **up to 150 ms** but cannot undo damage or KOs already committed. A local, synthetic high-ping test is not cross-country certification. **Real-phone usability, cross-network play, sustained load, and perceptual audio** still require manual checks; see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Planned maps, modes, cosmetics, and region servers are **future work**, not shipped features.

**For judges:** [30- and 60-second pitches, Q&A, and roadmap](docs/PITCH.md). **For operators:** [event-day runbook](docs/EVENT_DAY_CHECKLIST.md), [60–90 second demo flow](docs/DEMO_SCRIPT.md), [hosting fallback](docs/EVENT_UPTIME.md), and [CSS viewport QA status](docs/MOBILE_CSS_QA.md). Demo screenshots and videos should come from the actual deployed build, not mockups.

## v1.2 event candidate — 1.2.0-alpha.2

The event candidate adds stability, high-ping transport tools, mobile settings, classes, weapons, four pickup types, bot difficulty, guided training and combat feedback. See [the phase-by-phase findings and acceptance log](docs/EVENT_STABILIZATION.md). It is a development preview, not the full v1.2 release. The architecture review, implementation plan and acceptance checks are in [docs/V1_2_PHASE1_PLAN.md](docs/V1_2_PHASE1_PLAN.md).

| Class   |  HP | Move speed | Outgoing damage |
| ------- | --: | ---------: | --------------: |
| Assault | 100 |   175 px/s |            100% |
| Tank    | 140 |   145 px/s |             85% |
| Scout   |  80 |   210 px/s |             90% |

| Weapon          |   Base damage | Fire interval | Magazine | Auto reload | Range |
| --------------- | ------------: | ------------: | -------: | ----------: | ----: |
| Blaster         |            20 |          0.8s |       10 |        1.2s | 378px |
| Shotgun         | 8 × 5 pellets |          1.5s |        4 |        1.6s | 231px |
| Precision rifle |            50 |          1.5s |        4 |        1.8s | 704px |

Class and damage-pickup multipliers apply before one rounding step to each projectile/Pulse hit. Class, weapon and special are selected independently in the lobby. The last shot starts automatic reload; held fire resumes after it. Specials use their own cooldowns and no ammunition. HP, ammo and buffs reset on respawn/rematch. These are starting balance values to tune in playtests.

| Pickup | Effect                                                 | Duration       | Respawn |
| ------ | ------------------------------------------------------ | -------------- | ------- |
| Health | +35 HP, capped at class maximum                        | Instant        | 15s     |
| Shield | 35 absorption; excess damage reaches HP; no reflection | 5s or depleted | 15s     |
| Speed  | Class move speed ×1.4                                  | 5s             | 15s     |
| Damage | Outgoing damage ×2                                     | 5s             | 15s     |

Repeated shield collection refreshes to 35 rather than stacking. A full active shield or full HP does not waste its pickup. Shield pickups sit at each arena's center; the E ability still reflects projectiles. Fast bolts use short collision steps through walls and players.

The weapon HUD shows magazine, fire cooldown and auto-reload time; buff readouts show shield/speed/damage duration. Classes have subtle procedural silhouette changes, and weapons have distinct sounds/projectile accents. PR #7's input pump, dead zone, MOVE / AIM + FIRE and three ability buttons are preserved; reloading needs no extra touch button. Protocol is **3**; reload older tabs.

Validation: 93 automated tests (including the original 70), TypeScript/production build and production smoke checks. Physical-phone responsiveness, full two-human rounds and balance are manual acceptance checks. International testing remains outside this phase and is not marked fixed. No profiles, rankings, new maps or persistent progression are included yet.

### Verify a deployed event candidate (read-only smoke check)

After your Render deployment reports **Live**, run from a Node 24 checkout of the **same version**:

```powershell
npm ci
npm run event:check -- https://YOUR-RENDER-SERVICE.onrender.com
```

The command validates `/health` (version, protocol 3, errors, tick time, room count, memory, server ID), `/api/status`, the built HTML and JavaScript bundle, and security/caching response headers. It then opens **two temporary Socket.IO sessions** in the same Crystal Clash Quick Play queue and confirms they join the same room and both receive the auto-started game. It exits non-zero and prints the failing check on any failure. It creates a short-lived public match on the deployed service: run it **before players arrive**, never during an event round. A sleeping Render instance may need to wake up first; this command allows 20 seconds for HTTP requests. It is not a real-phone, cross-country, load or audio test.

## Run the game from GitHub in VS Code (Windows)

**Requirements:** [Git](https://git-scm.com/downloads), [Node.js 24](https://nodejs.org/en/download) (includes npm), and [Visual Studio Code](https://code.visualstudio.com/).

1. Open **VS Code → Terminal → New Terminal** (PowerShell).
2. Clone the repository and enter its folder:

```powershell
git clone https://github.com/DattaAnnavarapu/pixel-rift-arena-clash.git
cd pixel-rift-arena-clash
code .
```

3. **Use the released main branch**:

```powershell
git fetch origin
git switch main
```

4. Check that Node.js and npm work, then install dependencies:

```powershell
node -v
npm -v
npm ci
```

5. Start the game:

```powershell
npm run dev
```

6. Visit **http://localhost:3000** in your browser. Keep the VS Code terminal open while playing. **One command starts both the React/Phaser frontend and the Socket.IO multiplayer server**—you do not need a second terminal.

To stop, press **Ctrl+C** in the terminal. On later runs, open the project folder and run `npm run dev` again; there is no need to clone or reinstall each time.

### Play multiplayer locally

Open the game in two or more browser tabs/windows. Create a room, copy the six-character code or invitation URL, and join from the other tabs. Each player picks a team/loadout and marks ready; the host starts once both teams have players and everyone is ready. For other devices on the **same Wi-Fi**, use `http://YOUR-PC-LAN-IP:3000` (find the IPv4 address with `ipconfig`); Windows Firewall must permit incoming connections. For internet play, use a deployed server instead—`localhost` is only your own computer.

### Update your local checkout

```powershell
git switch feature/event-stabilization
git pull origin main
npm ci
npm run dev
```

### Troubleshooting

- **`git` / `node` / `npm` not recognized:** install Git or Node.js, then restart VS Code.
- **`ENOENT ... package.json`:** open the cloned `pixel-rift-arena-clash` directory (not its parent). Run `dir package.json` to confirm.
- **Port 3000 already in use:** stop the previous running server with Ctrl+C, then retry.
- **Room won't connect:** confirm `npm run dev` is still running and visit the URL printed in the terminal. Other devices cannot connect using `localhost`.
- **PowerShell blocks `npm.ps1`:** use `npm.cmd ci` and `npm.cmd run dev` instead.

### Check your changes

```powershell
npm test
npm run build
```

## Release candidate 1.1

- **Quick Play:** opt into a public lobby by mode. Private codes stay private. Two ready humans on opposing teams start automatically after five seconds; solo practice remains in private rooms with bots. Teams/rules are fixed in public lobbies.
- **Pulse:** Q/touch special deals 20 damage to enemies within 120px and pushes them up to 72px, stopping at walls. Cover, shields and spawn protection block it; cooldown is 9s. Double damage also doubles Pulse damage.
- **Blitz:** a 90-second crystal race. Crystals +2, KOs +3, target 30. Existing overtime and forfeit rules apply.
- First-match field guide; arena previews; saved volume, reduced-motion and particle settings. Match controls pause while a panel is open, but the multiplayer match continues.
- Visible latency and stalled-snapshot feedback; volatile sequenced inputs; transport fallback; explicit leave cleanup; expired-session and protocol-update messages; graceful shutdown notice.
- Phaser loads when entering a room, rather than on the menu. Production output separates the menu, renderer and engine bundles.
- `npm run release:check` runs tests, build and production smoke checks. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for manual review and the publish procedure.

## What's new

- Four arenas with shared server/client level data: **Astral Keep**, **Verdant Ruins**, **Ember Forge**, and **Frost Bridge**.
- Layered pixel knights with walking animation, directional weapons, textured terrain, floating crystals and ambient particles.
- Projectile trails, hit flashes, damage numbers, KO bursts, dash trails, shield rings, healing and spawn effects. Camera shake respects reduced-motion preferences.
- Redesigned main menu, map previews, host arena/mode controls, team/player cards, readiness, loadouts, results and invite feedback.
- **Nova**: three 15-damage bolts with an eight-second cooldown. **Mend**: restore up to 30 HP with a 12-second cooldown, consumed only when healing. **Blink** teleports up to 120px toward aim, stopping at walls (10s cooldown). Choose one in the lobby; use **Q** or the touch special button.
- Original synthesized chiptune music and distinct combat sounds. Independent SFX/music toggles persist locally. Audio starts after a user gesture; music defaults off and pauses while the tab is hidden.
- Mobile MOVE and AIM + FIRE sticks, three ability buttons, pointer-cancel recovery and landscape control layout.
- Local movement prediction with gentle server correction; capped bolt extrapolation, firing feedback, kill feed, Tab/touch scoreboard and teammate spectating on respawn.
- Reflective shields and aim-directed stationary dashes; hosts can fill/remove explicitly labeled bots for solo practice. Bots count as active team members and keep their ready status through lobby setting changes.
- Procedural lava/vents, portals, concealing bushes, destructible walls, mirrored flank crystals, pickups and slippery ice (see Levels below).
- Match forfeits when one team has zero online players for 15 seconds. Both teams absent for the grace period is a draw. Normal room cleanup remains separate.
- Pooled combat effects; 600ms snapshot effects; animation fields replace full player inputs. Expired player tokens are removed. Express 4 types align with Express 4, npm run build compiles the server, and npm start runs build/server/start.js without tsx or Vite.
- Original 32-note (two-section) music loop: 230ms steps normally, 165ms in overtime or once a team reaches 80% of the score target. One master gain/compressor protects the mix; hits/KOs fade with distance.
- Browser-local wins, KOs and most-played loadout persist across refreshes. They are convenience stats, not competitive records. Match/player IDs prevent reconnect double-counting; clearing browser storage resets them.

## Modes

| Mode          | Scoring                                                                                       | Target |
| ------------- | --------------------------------------------------------------------------------------------- | ------ |
| Crystal Clash | Crystals +1; knockouts +3                                                                     | 20     |
| Blitz         | Crystals +2; knockouts +3; 90-second timer                                                    | 30     |
| Knockout      | Knockouts +3; no crystals                                                                     | 15     |
| Rift Control  | Occupy the center without an opponent; +1 per second. KOs clear the zone but award no points. | 40     |

All modes except Blitz last three minutes unless a team reaches the target first. A tie triggers 30 seconds of sudden death: the next score that creates a lead wins. Overtime bounds shrink every five seconds by 60px horizontally and 35px vertically per side (capped at 360/210px). Outside deals 25 HP each second, subject to shield/spawn protection. Still tied after overtime is a draw. Players respawn after three seconds with 1.5 seconds of protection. No friendly fire.

## Controls and lobby

WASD/arrows move, mouse aims, hold click to fire the selected weapon (see the Phase 1 table; automatic reload), Space dashes (five-second cooldown), E shields for 1.5 seconds (12-second cooldown), Q uses Nova/Mend/Blink/Pulse. Shields reflect bolts with ownership transferred to the defender; a reflected bolt can be reflected again. Touch devices have MOVE and AIM + FIRE sticks plus DASH/SHIELD/special buttons; landscape is recommended.

| Action     | Desktop                                              | Mobile                           |
| ---------- | ---------------------------------------------------- | -------------------------------- |
| Move / aim | WASD or arrows / mouse                               | MOVE / AIM + FIRE sticks         |
| Fire       | Hold click                                           | Drag AIM + FIRE; release to stop |
| Dash       | Space · 5s, 180ms burst; aim direction if stationary | DASH                             |
| Shield     | E · 1.5s duration, 12s cooldown, reflects bolts      | SHIELD                           |
| Special    | Q · Nova 8s, Mend 12s, Blink 10s, Pulse 9s           | NOVA / MEND / BLINK / PULSE      |
| Scoreboard | Hold Tab                                             | SCORES button                    |
| Practice   | Host: FILL WITH BOTS / REMOVE BOTS                   | Same lobby buttons               |

Create a six-character room code or join an invitation URL. Up to two players per team; 2-vs-1 is allowed with a warning. The host chooses the arena and mode. Changing either clears everyone's ready status. Each player chooses a loadout and marks ready; the host starts when all connected players are ready and each team has someone. Results allow a new ready check and rematch. No accounts or installs. Quick Play automatically readies newcomers; changing a special preserves readiness and the countdown. UNREADY pauses the queue.

## Levels

| Arena         | Interactions                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astral Keep   | Glowing paired portals at opposite sides; automatic transport with a 2s per-player cooldown.                                                                                                |
| Ember Forge   | Lava strips: 5 HP/second. Vents: 10 HP/second while active for the first 1.5s of a 4s cycle.                                                                                                |
| Verdant Ruins | Bushes hide enemies and render allies/self at half opacity; enemy coordinates and bush effects are redacted from snapshots. Cracked walls break after three bolt hits and reset each match. |
| Frost Bridge  | Mirrored narrow lanes and ice: velocity approaches desired input at rate 3/s, allowing coasting and slower turns.                                                                           |

Crystal Clash cycles through shared mirrored spawn points, including flanks, at the existing 3.5s interval (max five). Risky pickup locations are shared data: green health restores 35 HP (not consumed at full health), blue speed boosts movement from 175 to 245px/s for 5s, gold double damage lasts 5s. Pickups respawn 15s after collection. Boosts end on respawn; all terrain state resets on rematch. Hazard deaths award the opposing team the usual KO points outside Rift Control. Bots use simple steering, target crystals/center, aim with error, and do not detect enemies hiding in bushes.

## Multiplayer architecture

The server simulates at 30Hz and broadcasts snapshots at 15Hz. Clients send bounded movement/action inputs at up to 60Hz, independently of the 10Hz UI clock. The server calculates collisions, cooldowns, hits, healing, health, respawns, objectives and match results. Remote rendering smooths authoritative positions. Local movement replays inputs newer than the server sequence acknowledgement with shared collisions and gently reconciles; projectile extrapolation is capped at 100ms. Prediction never awards damage, scores or pickups. Short-lived event IDs drive effects/audio without duplicate playback. Input older than 500ms is cleared. Optional sequence numbers reject duplicate/out-of-order inputs. Protocol 3 is required on join; older tabs receive a reload message. The client uses volatile input packets, so reconnection never replays queued attacks.

Reconnect tokens are random per-tab sessionStorage values; nicknames and audio preferences use localStorage. Disconnected slots remain for 30 seconds. Hosts migrate to connected players, and a returning player can become host when everyone else is offline. Rooms with no connected humans expire after ten minutes, even if bots remain. Rooms and tokens live in memory: restarts/deployments end matches. Run a single instance. Multi-instance scaling requires shared room ownership/routing, not just a Socket.IO adapter. Room codes are join conveniences, not access-security boundaries.

## Build and deploy

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

`render.yaml` configures a single Node web service, `npm ci --include=dev && npm run build`, `npm start`, `NODE_ENV=production`, and `/health`. Render supplies PORT. The checked-in source does not include generated `dist/`; deployment builds it. Reset NODE_ENV or open a new terminal before returning to development mode.

The existing Render service tracks `main`. This feature branch is for review and is **not automatically deployed to production**. Merge only after approval. After deploying, verify `/health`, join from independent devices, and test a cold start. Free hosting may sleep. Do not split client/backend without adding a configurable socket origin and explicit CORS handling.

## Validation

```powershell
npm test
npm run build
```

The suite includes regression tests for all new gameplay systems plus a real multi-client network integration test. The network test starts a disposable in-process server and uses actual Socket.IO clients: four-player capacity, full-room rejection, readiness, host-only settings, shared map/mode, movement validation, room isolation, loadout preservation on reconnect and host migration. No skipped tests in the default run. Set TEST_URL only to test a disposable external deployment instead.

Browser QA includes the earlier four-client flow plus single-human Frost Bridge launch with three labeled bots, live combat, kill feed, scoreboard and teammate spectating. A production-only dependency install served /health and the built client successfully. Physical iOS/Android touch testing, perceptual audio quality and public-host latency remain manual checks before merging. Bots use local steering rather than full pathfinding, and movement prediction replays unacknowledged inputs, capped to 300ms. The Phaser chunk remains large, but it is separate from the initial menu bundle. The production build succeeds.

All game art and audio are generated procedurally in code. No downloaded asset packs or recordings are required.

Release validation: `npm run release:check` also checks `/health` version/protocol, `/api/status`, built HTML/JS, and response headers using a temporary production server. The release remains a review candidate until merged and verified on the public host.

### Mobile match layout

Phone matches use a compact HUD and a separate touch-control area. Portrait places the controls below the arena; landscape places movement on the left and aim/actions on the right for a larger play view. Ability buttons display server cooldowns. Drag the right stick to aim and fire with one thumb; release it to stop. A radial dead zone prevents drift and preserves the last aim angle at rest. Scores, settings and leaving remain available during matches. Rotate to landscape for the clearest arena view on small phones.

### Input latency and cross-country diagnostics

Local movement, weapon aim and a cosmetic muzzle flash react immediately. Damage, projectiles and abilities remain server-authoritative and still wait for network transit. High RTT cannot be eliminated by prediction. The match toolbar shows RTT; lobbies show a per-process server identifier. All players must use the exact same deployed URL and mode. There is no country filter in matchmaking. If public lobbies differ, compare server IDs, modes and whether an earlier lobby already started. Different server IDs indicate separate processes or a restart; rooms currently live in one process and are not shared across replicas.

Connections start with HTTP polling and attempt WebSocket upgrade. Polling-only multiplayer is covered by a network regression. In-match snapshots and inputs avoid an unbounded stale backlog; pending action taps are not drained while the transport is unwritable. This is connection hardening, not verification that the reported cross-country failure is resolved. Record both server IDs, room codes, RTT, countries and visible errors for the next public retest.

### Stabilization Phase 1

Socket exception boundaries, separate token buckets, bounded payloads, atomic reconnect takeover, health tick/memory/room diagnostics, HTTP compression and immutable hashed-asset caching. Protocol remains 3. Render is explicitly one Ohio instance; free-plan cold starts remain a manual check. Uncaught error logging keeps the process alive but cannot certify state integrity; health error counters require operator review.

### Stabilization Phase 2 — latency tools

`npm run test:high-ping` runs four real clients through a full Blitz match using 200ms simulated one-way delay (400ms RTT), 30ms jitter and 3% volatile-message loss. Set PLAYERS=2/3/4 to vary clients. SIM_LATENCY_MS is one-way delay; SIM_JITTER_MS and SIM_LOSS are bounded. Production forcibly disables all injection. Control/ack messages are delayed but not dropped; only volatile inputs/states lose messages. This is local fault testing, not international/load certification.

Optional protocol-3 shot IDs reconcile cosmetic bolts with authoritative shots; projectile catch-up is capped at 200ms. Remote snapshot interpolation adapts to spacing/jitter (100–250ms), packets repeat two previous inputs, and server-measured RTT informs lobby warnings and queue preference. Legacy protocol-3 clients may omit these fields. WebSocket-first transport retains polling fallback and regression coverage. Region probing is an opt-in helper with no configured endpoints and no default requests.

Dash/shield predictions are visual only. Shield activation records a capped 150ms backdated start, but does not rewind damage or scores already committed; full historical shield rollback remains unresolved and must not be advertised as implemented.

### Stabilization Phase 3 — mobile preferences

Standalone manifest, optional fullscreen/orientation lock, bounded stick size, travel sensitivity, left-handed sticks, supported-device haptics and quality/shadow preferences persist locally. Low quality suppresses particles/shadows immediately and caps rendering at 30fps on the next match. Hidden tabs suspend the render loop and AudioContext; controls reset on blur/cancel. Settings render outside the touch-locked game container so long dialogs can scroll. Fullscreen, orientation lock and vibration depend on browser support; no offline play is promised.

### Stabilization Phase 4 — balance gate

Cadence is now 800ms Blaster, 1500ms Shotgun and 1500ms rifle. The TTK gate covers nine attacker class/weapon combinations against an unshielded stationary 100-HP target, with and without attacker damage boost; it includes reloads and assumes all shotgun pellets hit. Target 1.5–4s measures elapsed time after the first shot, not acquisition/travel. Defender shields, misses, other target classes and terrain require separate playtests. Projectile damage is unchanged to preserve existing combat regressions. A rifle hit cannot take a full-class-health target directly to zero: excess damage leaves 1 HP, so the next hit can finish. This preserves damage-pickup scaling without a hidden rifle-only multiplier. Rifle speed is 720px/s, lifetime 704/720s: range remains 704px. Balance feel is unverified on devices.

### Stabilization Phase 5 — bots

Hosts can select Easy/Normal/Hard for all private-room bots. Shared presets govern reaction, aim error, firing decisions, leading, dodging and ability choices. Easy uses Assault/Blaster; Hard varies classes, weapons and specials. All movement, ammo, cooldown and damage still run through the normal server rules; bushes hide enemies from bots. Four-neighbour A* uses shared wall clearance and broken walls, with cached paths and decision intervals. Internal training bots stay still, do not shoot and have at most 30HP. Seeded tests use 20 runs per matchup; these measure the fixed scenario, not general win-rate guarantees. Per-bot overrides and adaptive difficulty are not enabled.

### Stabilization Phase 6 — guided tutorial

TUTORIAL/PLAY TUTORIAL creates a private one-human training round. It cannot be joined by code or selected by Quick Play, has no timer/overtime/forfeit, and never updates browser wins/KOs/favorite kit. Eleven snapshot-driven stages cover kit selection, move ring, three real dummy hits, automatic reload, dash, reflection, special, four pickups, crystal, an Easy-bot fight/respawn, and completion. Training bots are stationary/non-firing/30HP; reflection practice uses a harmless server projectile emitter that retries missed bolts. Skip step, skip round and replay are explicit actions, not invented progress. Normal controls remain available; stuck hints strengthen after 15s. First-run dismissal/completion is local, with a permanent replay entry. The two-minute duration is an estimate, not a measured completion guarantee.

### Stabilization Phase 7 — feedback

Confirmed server hits drive hit markers, optional coarse incoming direction and a killed-by card (no historical kill-cam). A cosmetic ammo ring, static low-HP vignette, team shapes, ping colors and scoreboard RTT improve readability. Synthesized control-taken/heartbeat cues and stereo panning use the existing master volume/compressor; hidden tabs are silent and reduced-motion/effect options remain respected. The emote wheel offers four whitelisted, per-socket-rate-limited messages; no free text or client rewards. These changes need listening and readability checks on physical devices.
