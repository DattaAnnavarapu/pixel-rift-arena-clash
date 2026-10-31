# Pixel Rift: Arena Clash

A 2–4-player, no-login team arena game built with React 19, Phaser 3, TypeScript, Node.js, Express and Socket.IO. One process serves both the client and the authoritative game server.

## Run on Windows in VS Code

Install Node.js 24. Open the project folder containing `package.json`, then use the VS Code PowerShell terminal:

```powershell
npm ci
npm run dev
```

Open **http://localhost:3000**. Keep the terminal running. On subsequent runs you only need `npm run dev`. The frontend and multiplayer backend start together; no second server or Vite command is needed. Use separate browser tabs as players. Friends on the same LAN can use the host computer's IP and port 3000 if the firewall permits it.

To test this feature branch:

```powershell
git fetch origin
git switch feature/game-enhancements
npm ci
npm run dev
```

## What's new

- Three arenas with shared server/client collision geometry: **Astral Keep**, **Verdant Ruins**, **Ember Forge**.
- Layered pixel knights with walking animation, directional weapons, textured terrain, floating crystals and ambient particles.
- Projectile trails, hit flashes, damage numbers, KO bursts, dash trails, shield rings, healing and spawn effects. Camera shake respects reduced-motion preferences.
- Redesigned main menu, map previews, host arena/mode controls, team/player cards, readiness, loadouts, results and invite feedback.
- **Nova**: three 15-damage bolts with an eight-second cooldown. **Mend**: restore up to 30 HP with a 15-second cooldown, consumed only when healing. Choose one in the lobby; use **Q** or the touch special button.
- Original synthesized chiptune music and distinct combat sounds. Independent SFX/music toggles persist locally. Audio starts after a user gesture; music defaults off and pauses while the tab is hidden.
- Mobile MOVE/AIM sticks, four combat buttons, pointer-cancel recovery and landscape control layout.
- Separate renderer/audio/runtime modules; reusable server factory for real Socket.IO integration tests.

## Modes

| Mode          | Scoring                                                                                       | Target |
| ------------- | --------------------------------------------------------------------------------------------- | ------ |
| Crystal Clash | Crystals +1; knockouts +3                                                                     | 20     |
| Knockout      | Knockouts +3; no crystals                                                                     | 15     |
| Rift Control  | Occupy the center without an opponent; +1 per second. KOs clear the zone but award no points. | 40     |

All matches last three minutes unless a team reaches the target first. A tie triggers 30 seconds of sudden death: the next score that creates a lead wins. Still tied after overtime is a draw. Players respawn after three seconds with 1.5 seconds of protection. No friendly fire.

## Controls and lobby

WASD/arrows move, mouse aims, hold click to fire (20 damage per bolt, 0.5s interval), Space dashes (five-second cooldown), E shields for 1.5 seconds (12-second cooldown), Q uses Nova/Mend. Touch devices have MOVE/AIM sticks plus FIRE/DASH/SHIELD/special buttons; landscape is recommended.

Create a six-character room code or join an invitation URL. Up to two players per team; 2-vs-1 is allowed with a warning. The host chooses the arena and mode. Changing either clears everyone's ready status. Each player chooses a loadout and marks ready; the host starts when all connected players are ready and each team has someone. Results allow a new ready check and rematch. No accounts or installs.

## Multiplayer architecture

The server simulates at 30Hz and broadcasts snapshots at 15Hz. Clients send bounded movement/action inputs. The server calculates collisions, cooldowns, hits, healing, health, respawns, objectives and match results. Rendering smooths authoritative positions. Short-lived event IDs drive effects/audio without duplicate playback. Input older than 500ms is cleared.

Reconnect tokens are random per-tab sessionStorage values; nicknames and audio preferences use localStorage. Disconnected slots remain for 30 seconds. Hosts migrate to connected players, and a returning player can become host when everyone else is offline. Empty rooms expire after ten minutes. Rooms and tokens live in memory: restarts/deployments end matches. Run a single instance. Multi-instance scaling requires shared room ownership/routing, not just a Socket.IO adapter. Room codes are join conveniences, not access-security boundaries.

## Build and deploy

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

`render.yaml` configures a single Node web service, `npm ci && npm run build`, `npm start`, `NODE_ENV=production`, and `/health`. Render supplies PORT. The checked-in source does not include generated `dist/`; deployment builds it. Reset NODE_ENV or open a new terminal before returning to development mode.

The existing Render service tracks `main`. This feature branch is for review and is **not automatically deployed to production**. Merge only after approval. After deploying, verify `/health`, join from independent devices, and test a cold start. Free hosting may sleep. Do not split client/backend without adding a configurable socket origin and explicit CORS handling.

## Validation

```powershell
npm test
npm run build
```

The suite includes 15 simulation tests plus one real network integration test. The network test starts a disposable in-process server and uses actual Socket.IO clients: four-player capacity, full-room rejection, readiness, host-only settings, shared map/mode, movement validation, room isolation, loadout preservation on reconnect and host migration. No skipped tests in the default run. Set TEST_URL only to test a disposable external deployment instead.

Browser QA on this branch: redesigned menu/lobby; four players joining and readying; arena/mode and loadout selection; Ember Forge Knockout launch; Nova and shield cooldown response; refresh resume. Physical iOS/Android touch testing, perceptual audio quality and public-host latency remain manual checks before merging. A large Phaser bundle warning remains informational; the production build succeeds.

All game art and audio are generated procedurally in code. No downloaded asset packs or recordings are required.
