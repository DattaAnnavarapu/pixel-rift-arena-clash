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

## Phase 3 — Mobile
1. Findings: no install metadata/fullscreen or ergonomic preferences; existing audio only skipped new tones while hidden.
2. Changes: manifest/procedural icon/meta; persisted bounded optional settings, two layout directions, fullscreen gesture/fallback, render/audio suspension, scrollable portaled settings, next-match 30fps low quality.
3. Tests: 79 tests, build and release gate pass; layout screenshot/geometry checks are recorded separately below.
4. Manual: physical devices, haptics/orientation/browser bars and perceptual performance are NOT certified. Browser permissions/platform support can deny fullscreen/lock. Existing settings retain the same serialized shape until new preferences are chosen.

## Phase 4 — Balance
1. Findings: boosted rifle one-hit KOs and sub-1.5s boosted reference TTKs. A strict target band requires cadence changes, not merely tests.
2. Changes: 800/1500/1500ms Blaster/Shotgun/rifle cadence, 720px/s rifle at unchanged 704px range; rifle-only full-health one-shot protection leaves 1HP. Damage values/multipliers remain unchanged. README defines the reference scenario.
3. Tests: 82 tests, build and release checks pass. The original 70 remain unchanged. The matrix covers all nine attacker kits against an unshielded 100HP target, with/without attacker damage pickup; reloads count. Shield expiry/refresh/respawn/rematch tests remain enabled. The new Phase 2 dedupe test now waits beyond the tuned cadence.
4. Risks: this is a substantial firing-rate reduction and needs a feel/balance playtest. The band is NOT a guarantee across all defender classes/shields/ranges/pellet misses; those cases are explicitly outside the reference assertion.
