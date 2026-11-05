# Deployment and hosting

[Documentation index](README.md)

Public game: <https://pixel-rift-arena-clash.onrender.com>

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
npm run event:check -- https://pixel-rift-arena-clash.onrender.com
```

It checks `/health`, `/api/status`, the built HTML and JavaScript, and security/caching headers, then opens two temporary sessions to confirm they land in the same Quick Play room. It creates a short-lived public match, so run it **before** players arrive, never during an event round. A sleeping free-tier instance may need to wake first.

## Hosting limitations

Rooms and reconnect tokens live in memory on one instance. Deploys and restarts end active matches. Browser-local progression is separate from server storage.

The repository uses Render's free plan. The existing keep-alive workflow requests `/health` on a five-minute schedule; scheduling delays, free-tier quotas, and restarts mean it is not a 24/7 uptime guarantee. Keep deployment settings and the keep-alive workflow unchanged during documentation cleanup.

Confirm the deployed commit and `/health` response before claiming a version is live. The source baseline is `1.3.0-alpha.2`, protocol `4`.

## Screenshots

Use actual deployed-game captures for submission evidence and identify the build captured. The README screenshot is an explicitly labeled local CTF spectator test, preserved from expansion QA; it is not production verification.
