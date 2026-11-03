# Pixel Rift: Arena Clash

A free, no-login, browser-based team arena game for 2-4 players on desktop and mobile.

Pick a class, bring a weapon, and fight for crystals, control points, and knockouts using Dash, a reflective Shield, and special abilities. Learn in a guided tutorial, jump into private practice against bots, or invite friends with a room code, link, or QR code.

**Live game:** [PUBLIC URL]
<!-- Replace the placeholder only with the tested production address before submission. -->

> **Status:** `1.2.0-alpha.2` event candidate. This is a development preview, not a certified global-scale release. The `1.3` expansion (see below) lives on a review branch and is not deployed to the public game yet.

---

## Highlights

- **Team arena combat** with 3 classes, 3 weapons, and 4 specials selected independently in the lobby
- **Four modes** (Crystal Clash, Blitz, Knockout, Rift Control) across **four arenas** with their own hazards and mechanics
- **Server-authoritative multiplayer**: a 30 Hz Node/Socket.IO server decides hits, pickups, scores, and outcomes, while client-side prediction keeps controls responsive
- **Mobile-first controls**: two-thumb sticks, touch abilities, portrait and landscape layouts, left-handed mode
- **Practice vs Bots** (Easy / Normal / Hard) and an **11-stage guided tutorial**
- **No downloaded assets**: all art and audio are generated procedurally in code

---

## Play in 30 seconds

| Action | Desktop | Mobile |
| --- | --- | --- |
| Start | Quick Play (2+ humans) or Practice vs Bots (solo) | Same menu; Tutorial for guided onboarding |
| Move | WASD / arrow keys | MOVE thumb stick |
| Aim and fire | Mouse aim, hold left click | AIM + FIRE stick; drag to shoot |
| Reload | Automatic | Automatic |
| Dash | Space (5s cooldown) | DASH |
| Reflective shield | E (1.5s duration, 12s cooldown) | SHIELD |
| Special | Q (Nova, Mend, Blink, or Pulse) | On-screen special button |
| Scoreboard | Hold Tab | SCORES button |
| Invite friends | Copy room link/code or show QR | Scan QR or enter the code |

Rooms use six-character codes and support up to two players per team (2-vs-1 is allowed with a warning). The host picks the arena and mode, everyone chooses a loadout and readies up, and the host starts once each team has someone. No accounts, no installs.

---

## Classes, weapons, and specials

### Classes

| Class | HP | Move speed | Outgoing damage |
| --- | --- | --- | --- |
| Assault | 100 | 175 px/s | 100% |
| Tank | 140 | 145 px/s | 85% |
| Scout | 80 | 210 px/s | 90% |

### Weapons

| Weapon | Damage | Fire interval | Magazine | Auto reload | Range |
| --- | --- | --- | --- | --- | --- |
| Blaster | 20 | 0.8s | 10 | 1.2s | 378 px |
| Shotgun | 8 x 5 pellets | 1.5s | 4 | 1.6s | 231 px |
| Precision rifle | 50 | 1.5s | 4 | 1.8s | 704 px |

### Specials

| Special | Effect | Cooldown |
| --- | --- | --- |
| Nova | Three 15-damage bolts | 8s |
| Mend | Restore up to 30 HP (only consumed when healing) | 12s |
| Blink | Teleport up to 120 px toward your aim, stopping at walls | 10s |
| Pulse | 20 damage to enemies within 120 px and a push of up to 72 px; blocked by cover, shields, and spawn protection | 9s |

Class and damage-pickup multipliers apply before a single rounding step per hit. HP, ammo, and buffs reset on respawn and rematch. These are starting balance values to tune in playtests.

### Pickups

| Pickup | Effect | Duration | Respawn |
| --- | --- | --- | --- |
| Health | +35 HP, capped at class max | Instant | 15s |
| Shield | 35 absorption; excess damage reaches HP | 5s or depleted | 15s |
| Speed | Move speed x1.4 | 5s | 15s |
| Damage | Outgoing damage x2 (also doubles Pulse) | 5s | 15s |

---

## Modes

| Mode | Scoring | Target |
| --- | --- | --- |
| Crystal Clash | Crystals +1, knockouts +3 | 20 |
| Blitz | Crystals +2, knockouts +3, 90-second timer | 30 |
| Knockout | Knockouts +3, no crystals | 15 |
| Rift Control | Hold the center with no opponent inside: +1 per second. KOs clear the zone but award no points | 40 |

All modes except Blitz last three minutes unless a team reaches the target first. Ties trigger 30 seconds of sudden death, where the next score that creates a lead wins. During overtime the play area shrinks every five seconds, and standing outside deals 25 HP per second. Still tied afterward is a draw. Players respawn after three seconds with 1.5 seconds of protection. There is no friendly fire.

**Quick Play** lets players opt into a public lobby by mode; two ready humans on opposing teams start automatically after five seconds. Private room codes stay private, and solo practice always runs in a private room with bots.

---

## Arenas

| Arena | What makes it different |
| --- | --- |
| Astral Keep | Paired portals at opposite sides with automatic transport (2s per-player cooldown) |
| Ember Forge | Lava strips (5 HP/s) and vents (10 HP/s for 1.5s of every 4s cycle) |
| Verdant Ruins | Bushes conceal enemies (hidden from snapshots, not just visually); cracked walls break after three bolt hits |
| Frost Bridge | Narrow mirrored lanes and slippery ice that allows coasting and slower turns |

---

## Bots and tutorial

- **Practice vs Bots:** hosts choose Easy, Normal, or Hard for all bots in a private room. Bots obey the same server rules as players (movement, ammo, cooldowns, damage), navigate with A* pathfinding, and cannot see enemies hiding in bushes. Easy uses Assault/Blaster; Hard varies classes, weapons, and specials.
- **Guided tutorial:** an 11-stage private round covering kit selection, movement, hitting dummies, reload, dash, shield reflection, specials, pickups, crystals, and an Easy-bot fight. It never affects stats, can't be joined by code, and can be skipped or replayed at any time.

---

## Multiplayer and latency

- The server simulates at **30 Hz** and sends snapshots at **15 Hz**. Clients send bounded inputs at up to 60 Hz.
- The server owns collisions, cooldowns, hits, healing, respawns, objectives, and results. Local prediction never awards damage, scores, or pickups.
- Adaptive snapshot interpolation (100-250 ms), repeated recent inputs, and capped projectile catch-up help with high ping.
- Reconnect tokens keep your slot for 30 seconds. The host migrates automatically if they drop.
- Connections start on HTTP polling and upgrade to WebSocket, with polling fallback.
- The in-game toolbar shows ping and server status. Public endpoints: `/health` and `/ping`.

**High-ping testing:** `npm run test:high-ping` runs four real clients through a full Blitz match at 400 ms RTT, 30 ms jitter, and 3% volatile-message loss. Set `PLAYERS=2`, `3`, or `4` to vary the client count. This is local fault injection, not international or load certification. Prediction cannot remove network latency, and real-device, cross-network testing is still a manual check.

---

## Run it locally

**Requirements:** Git and Node.js 24 (includes npm).

```bash
git clone https://github.com/DattaAnnavarapu/pixel-rift-arena-clash.git
cd pixel-rift-arena-clash
git switch main
npm ci
npm run dev
```

Open <http://localhost:3000>. One command starts both the React/Phaser frontend and the Socket.IO server, so no second terminal is needed. Stop with `Ctrl+C`. On later runs, just `npm run dev` again.

To update an existing checkout:

```bash
git switch main
git pull origin main
npm ci
npm run dev
```

### Play multiplayer locally

Open the game in two or more tabs, create a room, copy the code or invite link, and join from the other tabs. For other devices on the same Wi-Fi, use `http://YOUR-PC-LAN-IP:3000` (find it with `ipconfig`) and allow incoming connections in Windows Firewall. For internet play, use a deployed server, since `localhost` only reaches your own machine.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `git`, `node`, or `npm` not recognized | Install Git or Node.js, then restart VS Code |
| `ENOENT ... package.json` | Open the cloned `pixel-rift-arena-clash` folder, not its parent |
| Port 3000 already in use | Stop the previous server with `Ctrl+C` and retry |
| Room won't connect | Make sure `npm run dev` is still running; other devices can't use `localhost` |
| PowerShell blocks `npm.ps1` | Use `npm.cmd ci` and `npm.cmd run dev` |

---

## Build, test, and deploy

```bash
npm test             # automated test suite
npm run build        # production build
npm run release:check  # tests + build + production smoke checks
```

The test suite includes regression tests for all gameplay systems and a real multi-client network integration test using actual Socket.IO clients against a disposable in-process server.

To run the production build locally:

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

`render.yaml` configures a single Node web service (`npm ci --include=dev && npm run build`, then `npm start`) with `/health` as the health check. Render supplies `PORT`, and the generated `dist/` folder is built at deploy time, not checked in.

### Verify a deployed build

After a deployment reports Live, run this from a Node 24 checkout of the same version:

```bash
npm run event:check -- https://YOUR-RENDER-SERVICE.onrender.com
```

It checks `/health`, `/api/status`, the built HTML and JavaScript, and security/caching headers, then opens two temporary sessions to confirm they land in the same Quick Play room. It creates a short-lived public match, so run it **before** players arrive, never during an event round. A sleeping free-tier instance may need to wake first.

---

## Tech stack

- **Client:** React and Phaser (loaded when you enter a room; the production build splits menu, renderer, and engine bundles)
- **Server:** Node.js, Express 4, Socket.IO
- **Language:** TypeScript
- **Hosting:** Render (single Ohio instance)
- **Assets:** procedurally generated art, plus original synthesized chiptune music and sound effects

---

## 1.3 expansion (review branch, not yet deployed)

This branch requires protocol 4, so older clients get a reload prompt.

- **Capture the Flag:** up to 2v2, first to 3 captures or highest score after four minutes. KOs do not score, dropped friendly flags can be returned by touch, abandoned flags return after 12 seconds, and ties get 30 seconds of overtime. Bots pursue flags and returns.
- **Citadel Crossing:** a new mirrored arena with three traversable routes and shared cover. Selecting CTF selects this arena.
- **Spectators:** enter a room code and choose Watch Room. Eight read-only seats separate from the four player slots, with concealed players hidden from viewers. Intended for friendly rooms, not ranked anti-collusion play.
- **New classes:** Medic (110 HP, 170 speed, 90% damage; Mend also heals nearby teammates within 100 px) and Ranger (90 HP, 195 speed, 100% damage).
- **New weapons:** Arc Repeater (12 damage, 400 ms cadence, 14 rounds) and Twin Scatter (two 12-damage pellets, 1000 ms cadence, 6 rounds).
- **Results and scoreboard:** actual HP damage, healing from Mend, KOs, objective contributions, flag captures and returns.
- **Progression:** XP per completed non-forfeit round (100 base, +50 for a win, up to +100 for contributions), a level every 250 XP, and unlockable cosmetic interface themes. No combat advantage is locked behind XP. Progress is stored only in your browser, so it is not an account or a secure competitive record.

---

## Known limitations

- One server instance with in-memory rooms: a deploy or restart ends active matches and reconnect tokens, and free-tier hosting may sleep.
- No region routing, ranked matchmaking, or shared state between servers. Matchmaking has no country filter.
- Shield activation may backdate up to 150 ms but cannot undo damage or KOs already committed.
- Browser-local stats (wins, KOs, favorite loadout) are convenience data, not competitive records, and reset if browser storage is cleared.
- Bots use local steering and A* pathfinding, not a full tactical AI.
- Physical-phone usability, cross-network play, sustained load, perceptual audio, and human combat balance still need manual playtesting. See `RELEASE_CHECKLIST.md`.
- Planned region servers, additional maps, and further cosmetics are future work, not shipped features.

---

## Credits

Built by [@DattaAnnavarapu](https://github.com/DattaAnnavarapu).
