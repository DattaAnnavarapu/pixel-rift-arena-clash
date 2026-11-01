# Event cold-start, wake-up and fallback

## Event uptime and backup operations

Render deployment: `render.yaml` uses **Ohio**, **one instance**, **/health** for Render's health check, Node 24 and `npm start`. The **free plan can sleep** and the first request may have a cold-start delay; a paid always-on instance is recommended for the event, subject to budget. Do not increase `numInstances` without shared room/session infrastructure.

**Before the event:** open the public URL and `https://YOUR-HOST.onrender.com/ping`; wait for `pong`. Check `/health` for `ok:true`, `errors:0`, version, protocol, tick and memory. Run `npm run event:check -- https://YOUR-HOST.onrender.com` **before** participants connect; it creates two temporary Quick Play entrants. Keep an uptime monitor pointed at `/ping` at its supported interval, but do not use monitoring as a substitute for a paid plan or operator observation. Monitor Render Events/Logs and match traffic while demonstrating.

**Backup Render service:** create a separate service deploying the same validated commit with one instance, correct Node 24 build/start commands, and a distinct publicly reachable URL. Verify `/health` and `event:check` there. To switch, distribute the backup URL to *new* players; active matches and reconnect tokens do **not** migrate because each process holds its own rooms.

**Local backup (Windows / VS Code):** from a tagged/verified checkout run `npm ci --include=dev`, `npm run build`, then `$env:NODE_ENV="production"; npm start`. Verify `http://localhost:3000/ping` and `/health`. Localhost is not accessible to event attendees; only advertise this backup after securing and verifying a reachable host address, port forwarding/firewall or trusted tunnel, and a correct HTTPS origin. Use a separate room session: local and Render rooms cannot synchronize.

**Recovery:** Prefer avoiding changes during active rounds. If a deploy is necessary, warn players; all active rooms and 30-second reconnect tokens reset. Never call the backups seamless failover.
