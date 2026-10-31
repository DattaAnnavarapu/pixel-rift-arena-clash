# Pixel Rift: Arena Clash

2–4 player browser arena, Crimson vs Azure. React 19 + Phaser 3 + TypeScript client, Node.js + Express + Socket.IO authoritative server. No player accounts. One service serves the client and WebSocket endpoint on the same origin.

## Run

Node.js 24 recommended.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 in separate browser tabs/devices. Set PORT if necessary. For LAN phone testing, use the host computer's LAN address and permit the server through the local firewall.

Production:

```sh
npm ci
npm run build
NODE_ENV=production npm start
```

## Deploy to Render

The included render.yaml configures one Node web service. Connect this source repository in Render, or create a Web Service from its Git repository. Build: `npm ci && npm run build`. Start: `npm start`. Environment: `NODE_ENV=production`. Health endpoint: `/health`. Render provides the PORT environment variable. Publish the returned HTTPS URL and verify /health before sharing it.

Do not split frontend/backend without adding explicit origin handling and a configurable socket URL. Run exactly ONE server instance: rooms live in memory. Restarts or deployments end rooms. Free hosting may sleep; test a cold start before submitting. Scaling to multiple instances requires shared simulation ownership and room routing, not just a Socket.IO adapter.

## Rules

- First to 20 points, or highest score after three minutes.
- Crystal +1; knockout +3. 100 HP; bolts deal 20 damage.
- Tied timer: 30 seconds of sudden death, next score wins. If still tied, draw.
- Respawn after three seconds; 1.5 seconds protection on spawn.
- Dash: 180ms burst, five-second cooldown. Shield: 1.5 seconds, 12-second cooldown.
- WASD/arrows move, mouse aim, hold click fire, Space dash, E shield.
- Touch MOVE/AIM joysticks and FIRE/DASH/SHIELD buttons; landscape recommended.
- Create or join using six-character code or invitation URL. Select teams, ready up, host starts. Two per team, 2-vs-1 allowed with warning.

## Network model

Clients send bounded inputs at about 30Hz. Server simulates at 30Hz and broadcasts snapshots at 15Hz. Rendering smooths authoritative positions. Server validates movement, walls, cooldowns, damage and scoring. Clients never supply health or scores. Reconnect tokens are random, per-tab sessionStorage values; nicknames persist in localStorage. Disconnected slots remain for 30 seconds. Host migrates immediately; empty rooms expire after ten minutes. Room codes are join conveniences, not private security boundaries.

## Validation

`npm test`: eight deterministic simulation tests; network test skipped unless TEST_URL is provided. `TEST_URL=https://your-host npm test` runs the integration test with actual WebSocket clients against a disposable deployment.

Completed: TypeScript check and production bundle; simulation tests for walls, movement, damage, shields, scoring, respawn, sudden death, draw, dash, friendly fire, separate team spawns and rematch resets. Browser QA: four clients joined one lobby, fifth rejected as full, readiness gate, four-player match launch, refresh resume, host migration. Preview WebSocket connection established. Test clients use fictional nicknames.

Not yet verified: public deployment, public cold start, physical mobile devices, sustained cross-device combat under real network latency, full three-minute browser match/rematch, and automated end-to-end network suite. The local shell could not reach the managed preview's WebSocket endpoint; browser checks were used instead. Browser tabs share a machine and are not a substitute for testing friends' devices.

## Submission checklist

1. Deploy and open the public HTTPS URL without signing in.
2. Join from two physical devices, then four; verify shared movement, damage and scores.
3. Test touch controls on iOS/Android, portrait lobby and landscape combat.
4. Test disconnect/reconnect within 30 seconds, host departure and room-full errors.
5. Finish a match, rematch, and verify reset. Test cold start and use an always-on plan if needed.
6. Submit the verified URL and a short gameplay recording through the contest's official submission flow. No contest entry has been submitted automatically.

## Assets

Arena, sprites and effects are drawn procedurally in Phaser; no external game assets are required. UI uses a system-font fallback if the optional Google Font cannot load.
