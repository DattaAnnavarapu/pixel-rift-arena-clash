# Pixel Rift: Arena Clash

A 2–4-player, no-login team arena game built with React 19, Phaser 3, TypeScript, Node.js, Express and Socket.IO. One process serves both the client and the authoritative game server.

## Run the game from GitHub in VS Code (Windows)

**Requirements:** [Git](https://git-scm.com/downloads), [Node.js 24](https://nodejs.org/en/download) (includes npm), and [Visual Studio Code](https://code.visualstudio.com/).

1. Open **VS Code → Terminal → New Terminal** (PowerShell).
2. Clone the repository and enter its folder:

```powershell
git clone https://github.com/DattaAnnavarapu/pixel-rift-arena-clash.git
cd pixel-rift-arena-clash
code .
```

3. **Switch to the improved version** (the changes are in the feature branch until the pull request is merged):

```powershell
git fetch origin
git switch feature/game-enhancements
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
git switch feature/game-enhancements
git pull origin feature/game-enhancements
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
