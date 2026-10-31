# Event stabilization phase log

Baseline: 70 tests, 1.2.0-alpha.1, protocol 3. New wire fields remain optional. No merge/deploy or real-device/international certification is implied.

## Phase 1 — Stability and matchmaking
1. Findings: socket handlers lacked exception isolation; shared counters mixed input/lobby/ping limits; online-token refresh was rejected; stale disconnect timers lacked connection ownership. Health omitted operating metrics. Render's production install could omit build types.
2. Changes: server/robustness.ts validates payloads and implements separate token buckets; index.ts guards handlers and per-room ticks, provides memory/tick/errors/room/server metrics, supports atomic session takeover and connection-owned expiry, compresses HTTP and caches hashed assets. start.ts/dev entry install process logging. Package engines require Node >=24; Render explicitly uses Ohio, one instance, dev-inclusive build and sleep warning. README stale branch references fixed.
3. Tests: 70 baseline plus two robustness/network tests pass (72 total); npm test, npm run build and npm run release:check pass.
4. Risks/manual checks: process-level recovery cannot guarantee consistency after an arbitrary uncaught exception. Monitor errors/tick/memory, test free-plan cold start and real-device refresh beyond the old 30s timer. Per-socket limits are not a distributed/IP anti-abuse system.

## Phase 2 — High-ping transport and rendering
1. Findings: no fault harness, no remote snapshot buffer, no shot correlation and no redundant input recovery. Delayed snapshots must be cloned at enqueue time to avoid later mutation.
2. Changes: server/network.ts provides bounded dev/test-only one-way latency/jitter/volatile loss. Optional protocol-3 shot IDs, input history, per-player RTT and capped projectile catch-up; adaptive remote interpolation, immediate cosmetic bolts, local dash/shield visuals, measured ping queue preference, WebSocket-first/polling fallback and disabled-by-default region helper. No predicted object awards hits or rewards.
3. Tests: 77 tests plus build/release checks pass. Four clients completed a full locally faulted Blitz match at injected 400ms RTT, 30ms jitter, 3% volatile loss: 6,084 snapshots, 0 disconnects, 0 rejected inputs, 0 score/phase desyncs, 103,281ms elapsed. This metric checks score/phase agreement, not visual positional accuracy. Two-/three-client and physical/international trials remain manual.
4. Remaining limitation: backdated shield start is bounded to 150ms; it does NOT rewind already-applied damage/KO scores. Full historical rollback is not implemented. Client cosmetics may disappear after rejection/expiry. No production latency injection or region routing is enabled.
