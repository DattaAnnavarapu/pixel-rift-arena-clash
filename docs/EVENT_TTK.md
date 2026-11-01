# Event baseline reference time-to-kill (TTK)

**No cadence changes in this branch**: Blaster 800ms, Shotgun 1500ms, Precision rifle 1500ms. These are reference-calculation figures at a stationary 100HP Assault target, each pellet hitting, no projectile travel time, no cover, no shield, no reload delay before defeat, and a first shot at t=0. This is *not* a logged new automated run. The same underlying game balance as merged alpha.2 remains; test and real combat can differ. Human playtest required.

| Attacker class | Weapon | Before: no boost | After: no boost | Before: double damage | After: double damage |
|---|---|---:|---:|---:|---:|
| Assault | Blaster | 3.2s | 3.2s | 1.6s | 1.6s |
| Tank | Blaster | 4.0s | 4.0s | 1.6s | 1.6s |
| Scout | Blaster | 4.0s | 4.0s | 1.6s | 1.6s |
| Assault | Shotgun (5/5 pellets) | 3.0s | 3.0s | 1.5s | 1.5s |
| Tank | Shotgun (5/5 pellets) | 3.0s | 3.0s | 1.5s | 1.5s |
| Scout | Shotgun (5/5 pellets) | 3.0s | 3.0s | 1.5s | 1.5s |
| Assault | Precision rifle | 1.5s | 1.5s | 1.5s | 1.5s |
| Tank | Precision rifle | 3.0s | 3.0s | 1.5s | 1.5s |
| Scout | Precision rifle | 3.0s | 3.0s | 1.5s | 1.5s |

Rifle full-health one-shot protection prevents an otherwise lethal boosted initial hit. Reference TTK isn't a guarantee for Scout/Tank defenders, misses, reflection, buffs expiring, spawn protection, moving targets or latency. **Do not adjust weapon cadence immediately before the event without running the reference TTK matrix and seeded bot matchups** and testing at least one real multiplayer round. Existing tests are unchanged; new event cadence test checks table wiring.
