# Gameplay guide

[Documentation index](README.md)

## Controls and rooms

| Action            | Desktop                                           | Mobile                                    |
| ----------------- | ------------------------------------------------- | ----------------------------------------- |
| Start             | Quick Play (2+ humans) or Practice vs Bots (solo) | Same menu; Tutorial for guided onboarding |
| Move              | WASD / arrow keys                                 | MOVE thumb stick                          |
| Aim and fire      | Mouse aim, hold left click                        | AIM + FIRE stick; drag to shoot           |
| Reload            | Automatic                                         | Automatic                                 |
| Dash              | Space (5s cooldown)                               | DASH                                      |
| Reflective shield | E (1.5s duration, 12s cooldown)                   | SHIELD                                    |
| Special           | Q (Nova, Mend, Blink, or Pulse)                   | On-screen special button                  |
| Scoreboard        | Hold Tab                                          | SCORES button                             |
| Invite friends    | Copy room link/code or show QR                    | Scan QR or enter the code                 |

Rooms use six-character codes and support up to two players per team (2-vs-1 is allowed with a warning). The host picks the arena and mode, everyone chooses a loadout and readies up, and the host starts once each team has someone. No accounts, no installs.

---

## Classes, weapons, and specials

### Classes

| Class   | HP  | Move speed | Outgoing damage |
| ------- | --- | ---------- | --------------- |
| Assault | 100 | 175 px/s   | 100%            |
| Tank    | 140 | 145 px/s   | 85%             |
| Scout   | 80  | 210 px/s   | 90%             |
| Medic   | 110 | 170 px/s   | 90%             |
| Ranger  | 90  | 195 px/s   | 100%            |

### Weapons

| Weapon          | Damage         | Fire interval | Magazine | Auto reload | Range    |
| --------------- | -------------- | ------------- | -------- | ----------- | -------- |
| Blaster         | 20             | 0.8s          | 10       | 1.2s        | 378 px   |
| Shotgun         | 8 x 5 pellets  | 1.5s          | 4        | 1.6s        | 231 px   |
| Precision rifle | 50             | 1.5s          | 4        | 1.8s        | 704 px   |
| Arc Repeater    | 12             | 0.4s          | 14       | 1.4s        | 433.5 px |
| Twin Scatter    | 12 x 2 pellets | 1s            | 6        | 1.5s        | 329 px   |

### Specials

| Special | Effect                                                                                                        | Cooldown |
| ------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| Nova    | Three 15-damage bolts                                                                                         | 8s       |
| Mend    | Restore up to 30 HP; Medic also heals teammates within 100 px (only consumed when healing)                    | 12s      |
| Blink   | Teleport up to 120 px toward your aim, stopping at walls                                                      | 10s      |
| Pulse   | 20 damage to enemies within 120 px and a push of up to 72 px; blocked by cover, shields, and spawn protection | 9s       |

Class and damage-pickup multipliers apply before a single rounding step per hit. HP, ammo, and buffs reset on respawn and rematch. These are starting balance values to tune in playtests.

### Pickups

| Pickup | Effect                                  | Duration       | Respawn |
| ------ | --------------------------------------- | -------------- | ------- |
| Health | +35 HP, capped at class max             | Instant        | 15s     |
| Shield | 35 absorption; excess damage reaches HP | 5s or depleted | 15s     |
| Speed  | Move speed x1.4                         | 5s             | 15s     |
| Damage | Outgoing damage x2 (also doubles Pulse) | 5s             | 15s     |

---

## Modes

| Mode             | Scoring                                                                                        | Target                 |
| ---------------- | ---------------------------------------------------------------------------------------------- | ---------------------- |
| Crystal Clash    | Crystals +1, knockouts +3                                                                      | 20                     |
| Blitz            | Crystals +2, knockouts +3, 90-second timer                                                     | 30                     |
| Knockout         | Knockouts +3, no crystals                                                                      | 15                     |
| Rift Control     | Hold the center with no opponent inside: +1 per second. KOs clear the zone but award no points | 40                     |
| Capture the Flag | Bring the enemy flag home while your flag is at base; KOs do not score                         | 3 captures / 4 minutes |

Crystal Clash, Knockout, and Rift Control last three minutes unless a team reaches the target first. Ties trigger 30 seconds of sudden death, where the next score that creates a lead wins. In these modes and Blitz, during overtime the play area shrinks every five seconds, and standing outside deals 25 HP per second. Still tied afterward is a draw. Players respawn after three seconds with 1.5 seconds of protection. There is no friendly fire.

CTF ties get 30 seconds of overtime without a shrinking boundary. Touch your dropped flag to return it; abandoned flags return after 12 seconds. Selecting CTF selects Citadel Crossing.

**Quick Play** lets players opt into a public lobby by mode; two ready humans on opposing teams start automatically after five seconds. Private room codes stay private, and solo practice always runs in a private room with bots.

---

## Arenas

| Arena            | What makes it different                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Astral Keep      | Paired portals at opposite sides with automatic transport (2s per-player cooldown)                           |
| Ember Forge      | Lava strips (5 HP/s) and vents (10 HP/s for 1.5s of every 4s cycle)                                          |
| Verdant Ruins    | Bushes conceal enemies (hidden from snapshots, not just visually); cracked walls break after three bolt hits |
| Frost Bridge     | Narrow mirrored lanes and slippery ice that allows coasting and slower turns                                 |
| Citadel Crossing | Two mirrored bases, cover, and three routes for Capture the Flag                                             |

---

## Bots and tutorial

- **Practice vs Bots:** hosts choose Easy, Normal, or Hard for all bots in a private room. Bots obey the same server rules as players (movement, ammo, cooldowns, damage), navigate with A* pathfinding, and cannot see enemies hiding in bushes. Easy uses Assault/Blaster; Hard varies classes, weapons, and specials.
- **Guided tutorial:** an 11-stage private round covering kit selection, movement, hitting dummies, reload, dash, shield reflection, specials, pickups, crystals, and an Easy-bot fight. It never affects stats, can't be joined by code, and can be skipped or replayed at any time.

## What's new in 1.3

The 1.3 expansion is merged into `main`. It requires protocol 4, so older open tabs get a reload prompt.

- **Capture the Flag:** up to 2v2, first to 3 captures or highest score after four minutes. KOs do not score, dropped friendly flags can be returned by touch, abandoned flags return after 12 seconds, and ties get 30 seconds of overtime. Bots pursue flags and returns.
- **Citadel Crossing:** a new mirrored arena with three traversable routes and shared cover. Selecting CTF selects this arena.
- **Spectators:** enter a room code and choose Watch Room. Eight read-only seats separate from the four player slots, with concealed players hidden from viewers. Intended for friendly rooms, not ranked anti-collusion play.
- **New classes:** Medic (110 HP, 170 speed, 90% damage; Mend also heals nearby teammates within 100 px) and Ranger (90 HP, 195 speed, 100% damage).
- **New weapons:** Arc Repeater (12 damage, 400 ms cadence, 14 rounds) and Twin Scatter (two 12-damage pellets, 1000 ms cadence, 6 rounds).
- **Results and scoreboard:** actual HP damage, healing from Mend, KOs, objective contributions, flag captures and returns.
- **Progression:** XP per completed non-forfeit round (100 base, +50 for a win, up to +100 for contributions), a level every 250 XP, and unlockable cosmetic interface themes. No combat advantage is locked behind XP. Progress is stored only in your browser, so it is not an account or a secure competitive record.
