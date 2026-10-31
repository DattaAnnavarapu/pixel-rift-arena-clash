# v1.2 Phase 1: combat expansion implementation plan

## Architecture review and boundaries

Baseline: main includes PR #7 (60Hz input dispatch, bounded unacknowledged movement replay, two-thumb MOVE / AIM + FIRE, 30Hz authoritative simulation and 15Hz snapshots). `server/game.ts` owns entities, collisions, cooldowns, damage, respawns and shared arena definitions. `server/index.ts` validates lobby choices and input. `server/bots.ts` uses that same simulation. `src/prediction.ts` uses shared movement/collision rules; `src/arena.ts` draws snapshots and immediate cosmetic feedback. React renders selection/HUD; audio is procedural. Tests cover simulation and actual Socket.IO clients.

No new dependencies, accounts, persistence or Phase 2–5 features. International networking remains a separate known limitation. Preserve the input schema, pointer handling, packet pump, prediction cap and two-thumb layout. No merge or deployment is part of this change.

## 1. Shared combat definitions

Add `server/combat.ts`, imported by server and client, with typed class/weapon/pickup configs and shared derived-stat helpers. Selections are independent of the existing special ability. Defaults remain Assault + Blaster + Nova.

| Class | Max HP | Move px/s | Damage multiplier |
|---|---:|---:|---:|
| Assault | 100 | 175 | 1.00 |
| Tank | 140 | 145 | 0.85 |
| Scout | 80 | 210 | 0.90 |

Dash remains 650px/s for 180ms. Speed pickup multiplies each class's normal speed by 1.4 for 5s. Class multipliers apply to weapon bolts, Nova and Pulse; round final outgoing damage once. Existing incoming damage rules, immunity and shield reflection remain.

| Weapon | Damage | Interval | Magazine | Auto reload | Bolt speed | Lifetime | Spread |
|---|---:|---:|---:|---:|---:|---:|---|
| Blaster | 20 | 400ms | 10 | 1200ms | 420 | 900ms | single |
| Shotgun | 8 × 5 | 900ms | 4 | 1600ms | 420 | 550ms | -0.24,-0.12,0,0.12,0.24 rad |
| Precision rifle | 50 | 1000ms | 4 | 1800ms | 640 | 1100ms | single |

Reload automatically starts after the final shot; fire held through reload resumes when both reload and fire cooldown finish. Specials retain their own cooldowns and do not consume ammunition. No manual reload action. Balance numbers are starting values for playtests.

## 2. Authoritative state and combat

Add class/weapon IDs, ammo, reload deadline, temporary shield amount/deadline and weapon metadata on visual events/bolts. Validate selections only in lobby/finished, for the requesting player, using own config keys. Private changes clear readiness; public changes preserve the queue as in PR #5. Reject in-match selection changes. Never accept stats/ammo/buffs from input.

Use class HP for match reset, respawn, Mend, health pickups and all health bars. Reset ammunition and buffs on respawn/rematch. Centralize movement speed so prediction and server agree, including ice and boosts. Substep fast projectiles at <=8px per collision step to protect walls/players, shield reflection and cracked-wall hit counts.

## 3. Four pickup types

Keep arena-driven health (+35 HP), speed (1.4× for 5s), damage (2× for 5s), and 15s shared pickup respawns. Add shield (+35 absorption, expires after 5s) at each arena's clear center. Recollection refreshes without stacking; full/active shield pickups are not consumed unnecessarily. Absorption does not reflect shots, and excess damage reaches health. Existing E shield still reflects bolts. Shared pickup metadata drives labels and durations.

## 4. Client presentation and bots

Lobby: independent class and weapon choices with numeric tradeoffs; roster/scoreboard show selections. HUD: class-aware HP, weapon/ammo, fire cooldown, auto-reload countdown and active buffs, including a compact mobile readout. Cosmetic gun feedback follows selected weapon cadence and reload state; projectile style, weapon tones, shield absorb feedback and a subtle class badge remain procedural and use existing effect pools/reduced-motion settings. Bots receive varied class/weapon choices and range-aware firing, with relative HP thresholds.

## 5. Validation and rollout

Add simulation tests for all nine class/weapon combinations, cadence, magazines/reload, class-aware heal/reset, boosted damage, absorption/expiry, pickup respawn, projectiles/cover/reflection and prediction parity. Actual Socket.IO tests verify own-player selection, invalid values, private/public readiness and in-match rejection. Retain PR #7 joystick, replay and polling regressions. Run npm test and npm run build after each implementation checkpoint; final gate npm run release:check. Browser-check desktop selection and phone-sized portrait/landscape HUD bounds and controls.

Mark build 1.2.0-alpha.1 / protocol 3 so stale clients reload rather than interpret new required fields. Open one draft PR with final changelog and validation. Physical-phone responsiveness, two-human full rounds, class/weapon balance and international reliability remain manual retests before a public release.

## Implemented checkpoint results

- Simulation/shared-state checkpoint: all 49 baseline tests and build passed.
- Selection/rendering checkpoint: all 49 baseline tests and build passed.
- Expanded acceptance gate: all 70 tests and build passed; production HTTP/assets smoke passed as 1.2.0-alpha.1 / protocol 3.
- Browser preview: desktop Tank + rifle selection and varied-bot roster verified; 320×568 portrait and 844×390 landscape have no main-container overflow, no control/arena overlap and a fitting health/weapon readout. A held right-stick fire exhausted the rifle magazine and displayed the auto-reload countdown. Rotation retained the match.
- PR #7 runtime packet pump and joystick implementation files have no changes. Prediction only switches to the shared class-aware speed helper; local movement replay remains bounded and server rules retain authority.

Pending manual work: hardware touch/FPS/audio checks, two-human full-match/reconnect regression and balance tuning. No Phase 1 feature was intentionally skipped. Automatic reload is the scoped reload design; manual reload and later-roadmap systems are excluded.
