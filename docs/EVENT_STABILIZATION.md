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
3. Tests: 77 tests plus build/release checks pass. Four clients completed a full locally faulted Blitz match at injected 400ms RTT, 30ms jitter, 3% volatile loss: 6,084 snapshots, 0 disconnects, 0 rejected inputs, 0 score/phase desyncs, 103,281ms elapsed. This metric checks score/phase agreement, not visual positional accuracy. Later 2-/3-client trials passed as recorded below; physical/international trials remain manual.
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

## Phase 5 — Bot manager

1. Findings: fixed steering/error lacked levels, reaction delays or routes around cover.
2. Changes: one difficulty table, host whitelist/config UI, private training tier, varied hard kits, cached A* paths using shared collision, seeded decisions. Bots use ordinary gameplay rules. Adaptive and per-bot UI options are not enabled.
3. Tests: 84 tests plus build/release pass. Twenty seeded runs per matchup: Hard/Normal 19–1; Normal/Easy 20–0; Hard/Easy 20–0. Whitelist/path safety tests pass. These are controlled same-class duels, not live-player statistics.
4. Manual: path behavior on all terrain, perception of difficulty and live server CPU require checks. A* uses static wall occupancy, not tactical hazard avoidance.

## Phase 6 — Guided training round

1. Findings: the existing tutorial was a field guide, not a round; hit/pickup events lacked actor/type attribution for reliable progress.
2. Changes: optional private tutorial room/state, server-driven event progress/targets, training dummies, harmless reflection emitter, final Easy bot, no ending/forfeit/reward flow, first-run/replay/skip UI and touch-specific hints/highlights. New event fields are optional protocol-3 extensions.
3. Tests: 88 tests plus build/release pass. Fake-context tests cover all director transitions and wrong actors, stuck/touch wording, room isolation/no stats/no ending, and actual socket code-join rejection/Quick Play isolation.
4. Manual: full hardware completion, hint ergonomics and all kit choices remain unverified. Skip is deliberately permitted, yields no rewards, and is not achievement verification. The two-minute estimate is not certified.

## Phase 7 — Feedback and social polish

1. Findings: feedback lacked hit attribution, direction, team shapes and ping color/scoreboard readings.
2. Changes: game.ts adds optional server-attributed direction/killer IDs; social.ts/index.ts validate and rate-limit four emotes. Arena/React draw hit/ammo/damage/team/ping/low-HP/killed-by feedback. audio.ts adds stereo panning, heartbeat and control cues under existing controls.
3. Tests: 90 tests plus build/release pass; feedback helpers validate ID, team distinction, pan bounds and missing/high ping. Original gameplay and tutorial checks remain green.
4. Manual: perceptual audio, reduced effects, controls and emote positioning need device checks. Killed-by card implements the requested alternative to a kill-cam; no history playback is added.

## Phase 8 — Later / not implemented

The four new maps, JSON level migration, cosmetic unlocks and four new modes remain deferred as marked LATER in the request. They would add independent gameplay and acceptance work; none is advertised as shipped.

## Final input QA and production cleanup

1. Findings: a press/release pair could arrive between 30Hz simulation ticks and erase an action. Very short fire taps could also miss cosmetic correlation when no render frame ran between input packets. Delayed state could arrive after leaving its room.
2. Changes: server/input-latch.ts retains validated actions until one simulation consumes them; runtime shot requests allocate IDs from the input pump as well as the renderer. ActionLatch supports keyboard/assistive click activation without double pointer activation. Room membership and monotonic snapshot checks reject stale views. Fullscreen, navigation and tutorial touch targets have at least 44px dimensions. tsconfig.server.json compiles NodeNext output; npm start uses Node directly. PORT=0 supports isolated startup checks. Candidate is 1.2.0-alpha.2, protocol 3.
3. Results: 93 tests pass, including all 70 original tests with their files unchanged. npm test, npm run build and npm run release:check pass; the latter checks both production HTTP assets and the actual compiled startup entry. Browser QA confirmed a real short Dash press, shield reflect and special each advanced server-driven training. Browser geometry at 320×568, 390×844 and 844×390 had no page overflow, all sticks/buttons inside the viewport, and no control overlap. Screenshots were saved for each size. This uses a browser iframe viewport, not physical-device touch emulation.
4. Fault trials: full matches with 2/3/4 clients at 400ms injected RTT, 30ms jitter and 3% volatile loss completed with zero disconnects, rejected inputs and score/phase disagreements (3,086 / 4,213 / 5,602 snapshots respectively). This does not measure positional correctness or human playability. Real-phone, international, accessibility, audio, sustained load and free-plan cold-start acceptance remain unchecked. Full late-shield historical rollback remains a critical unfinished item; region selection is prepared only. Optional per-bot overrides/adaptation and all Phase 8 work are not implemented.

Final post-input-fix four-client rerun: 6,125 snapshots, 0 disconnects, 0 rejected inputs, 0 score/phase disagreements, 103,514ms elapsed at the same 400ms RTT / 30ms jitter / 3% loss.
