# Event stabilization phase log

Baseline: 70 tests, 1.2.0-alpha.1, protocol 3. New wire fields remain optional. No merge/deploy or real-device/international certification is implied.

## Phase 1 — Stability and matchmaking
1. Findings: socket handlers lacked exception isolation; shared counters mixed input/lobby/ping limits; online-token refresh was rejected; stale disconnect timers lacked connection ownership. Health omitted operating metrics. Render's production install could omit build types.
2. Changes: server/robustness.ts validates payloads and implements separate token buckets; index.ts guards handlers and per-room ticks, provides memory/tick/errors/room/server metrics, supports atomic session takeover and connection-owned expiry, compresses HTTP and caches hashed assets. start.ts/dev entry install process logging. Package engines require Node >=24; Render explicitly uses Ohio, one instance, dev-inclusive build and sleep warning. README stale branch references fixed.
3. Tests: 70 baseline plus two robustness/network tests pass (72 total); npm test, npm run build and npm run release:check pass.
4. Risks/manual checks: process-level recovery cannot guarantee consistency after an arbitrary uncaught exception. Monitor errors/tick/memory, test free-plan cold start and real-device refresh beyond the old 30s timer. Per-socket limits are not a distributed/IP anti-abuse system.
