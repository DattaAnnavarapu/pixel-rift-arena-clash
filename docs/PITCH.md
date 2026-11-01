# Pixel Rift: Arena Clash — Judge Pitch

**Build:** 1.2.0-alpha.2 · **Protocol:** 3 · **Live demo:** [PUBLIC URL] (replace only after verification)

## 30-second pitch

“Pixel Rift is a no-login team arena game you can open on a phone or computer and play with friends immediately. Two to four players choose a class, weapon, and special ability, then compete for crystals and knockouts. First-time players can follow a tutorial or try Easy, Normal, or Hard bots. The server—not the browser—decides damage, scores, and pickups, while client prediction helps controls feel responsive. You can invite a friend with a room code or QR and start playing without an installation.”

## 60-second pitch

“Think of Pixel Rift as a quick competitive arena experience that works right in a browser. There are three distinct classes—Assault, Tank, and Scout—and three weapons, so each match offers choices without making newcomers memorize a complicated rulebook. Players dash, reflect shots with shields, use specials, and fight over objectives in short team rounds.

We built two paths into the game: Quick Play for two to four human players and private Practice vs Bots for anyone visiting alone. New players can also try a guided tutorial. On desktop, the controls use a keyboard and mouse; on mobile, there are two thumb sticks and touch ability buttons. Friends can join private rooms using a code, URL, or QR.

The key technical choice is an authoritative 30 Hz Node and Socket.IO server. Clients predict movement and show cosmetic effects, but they cannot award themselves hits, points, or pickups. We added reconnection handling, health checks, and local synthetic high-ping match testing to improve reliability. We're showing an event candidate, so real-device feel, capacity, and international latency remain honest acceptance items rather than claimed guarantees.”

## Five likely judge questions

**1. How does it handle latency?**

The client predicts local movement and smooths remote snapshots; the server remains authoritative. A four-client automated local simulation completed a match at injected 400 ms round-trip latency, 30 ms jitter, and 3% volatile packet loss without reported disconnects, rejected inputs, or score/phase disagreement. That does not establish perceptual smoothness or worldwide network performance. Shield backdating is bounded to 150 ms and cannot reverse already committed damage.

**2. Can a player cheat by editing browser code?**

Clients can display speculative movement and shots, but actual damage, hit detection, pickups, cooldowns, scores, and winners are calculated on the server. Incoming inputs and identifiers are validated/rate-limited. This reduces common client-side cheating; it is not a claim of comprehensive anti-cheat security or resistance to every automated/bot attack.

**3. How would it scale to hundreds of players?**

The current product is intentionally a single Node process and one Render instance with process-local rooms and sessions. It supports small matches, not hundreds of concurrent users proven by load testing. Scaling would require shared session/room state, distributed room placement, monitoring, and load tests before enabling multiple instances.

**4. What makes it welcoming to first-time players?**

No registration or install is needed. The guided tutorial explains movement, aiming, reloading, abilities, and objectives using server-confirmed events. Private Practice vs Bots starts a solo round at Easy, Normal, or Hard; desktop/mobile controls are shown in the README. Physical phone ergonomics still require manual acceptance.

**5. What have you verified, and what is still risky?**

The project has automated simulation and network regression coverage and production health/smoke tooling. The event baseline reported 103 passing tests before this documentation-only task; those results must be rechecked at the exact event commit. Real iOS/Android play, cross-country matches, sustained load, and subjective audio quality are not certified. Deployments reset all in-memory rooms, and the free Render tier may take time to wake.

## What's next — future work, **not included in this event build**

1. **Maps:** more arenas and fully data-driven hazard layouts after playtesting and regression coverage.
2. **Modes:** additional objective and elimination formats with distinct scoring and server tests.
3. **Cosmetics:** optional procedural palettes, hats, trails, and KO effects with validated identifiers.
4. **Region servers:** latency-aware placement with routing, regional health checks, and shared/migratable session infrastructure.
5. **Scale and operations:** sustained-load benchmarking, always-on hosting, deeper recovery guarantees, and improved accessibility/device certification.

**Demo fallback:** If live matchmaking is unavailable, show the already-built private Practice vs Bots flow and a verified recording from the same deployed candidate; do not invent an outcome or claim a failed test passed. See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) and [EVENT_DAY_CHECKLIST.md](EVENT_DAY_CHECKLIST.md).
