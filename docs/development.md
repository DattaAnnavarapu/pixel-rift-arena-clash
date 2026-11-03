# Development

[Documentation index](README.md)

## Local setup

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

| Problem                                | Fix                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `git`, `node`, or `npm` not recognized | Install Git or Node.js, then restart VS Code                                  |
| `ENOENT ... package.json`              | Open the cloned `pixel-rift-arena-clash` folder, not its parent               |
| Port 3000 already in use               | Stop the previous server with `Ctrl+C` and retry                              |
| Room won't connect                     | Make sure `npm run dev` is still running; other devices can't use `localhost` |
| PowerShell blocks `npm.ps1`            | Use `npm.cmd ci` and `npm.cmd run dev`                                        |

## Commands

| Command                  | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `npm test`               | Automated tests                                         |
| `npm run build`          | Type checking and production build                      |
| `npm run release:check`  | Tests, build, HTTP/assets smoke, compiled startup smoke |
| `npm run format`         | Format maintained files                                 |
| `npm run format:check`   | Check formatting without writing                        |
| `npm run test:high-ping` | Local network fault-injection test                      |

## Project layout

- `src/`: React UI, Phaser rendering, input, audio, and client networking.
- `server/`: authoritative game simulation, rooms, combat rules, and server startup. Some definitions are shared with the client.
- `tests/`: automated regression and network integration tests.
- `scripts/`: release and network smoke checks.
- `public/`: icon and web manifest.
- `docs/`: current guides, screenshots, and historical records.

## Multiplayer architecture

- The server simulates at **30 Hz** and sends snapshots at **15 Hz**. Clients send bounded inputs at up to 60 Hz.
- The server owns collisions, cooldowns, hits, healing, respawns, objectives, and results. Local prediction never awards damage, scores, or pickups.
- Adaptive snapshot interpolation (100-250 ms), repeated recent inputs, and capped projectile catch-up help with high ping.
- Reconnect tokens keep your slot for 30 seconds. The host migrates automatically if they drop.
- Connections prefer WebSocket, with HTTP polling fallback.
- The in-game toolbar shows ping and server status. Public endpoints: `/health` and `/ping`.

**High-ping testing:** `npm run test:high-ping` runs four real clients through a full Blitz match at 400 ms RTT, 30 ms jitter, and 3% volatile-message loss. Set `PLAYERS=2`, `3`, or `4` to vary the client count. This is local fault injection, not international or load certification. Prediction cannot remove network latency, and real-device, cross-network testing is still a manual check.

## Release checklist

- [ ] Run `npm ci`, `npm run format:check`, and `npm run release:check`.
- [ ] For networking changes, run `npm run test:high-ping`.
- [ ] Test desktop and physical-phone controls, rotation, reconnect, and a complete multiplayer round.
- [ ] Check CTF, spectators, results, and browser-local progression when those areas change.
- [ ] Review the exact commit and plan deployment outside active matches.
- [ ] After an approved deployment, follow [deployment verification](deployment.md).

Keep test evidence tied to the tested commit. Historical reports are not verification of a newer build. Make large formatting changes separately from functional changes.
