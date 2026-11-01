# Pixel Rift: event demo script (60–90 seconds)

**Before speaking:** use the public deployed URL with a friend ready on a second device, confirm /ping and /health, and complete `npm run event:check -- <url>` before spectators join. Avoid doing a new deploy during the demo.

| Time | On screen | Say |
|---|---|---|
| 0–12s | Main menu; Quick Play and Practice vs Bots | “Pixel Rift is an instant 2–4-player arena battle. No account or download.” |
| 12–22s | Tutorial entry and first guided step | “New players learn movement, aim, reload and abilities in a live guided round.” |
| 22–36s | Quick Play lobby on two browsers | “Players join the same mode and the server automatically starts when the teams are ready.” |
| 36–53s | Assault/Tank/Scout and Blaster/Shotgun/Rifle | “Choose a class and weapon; the server validates every hit, ability and pickup.” |
| 53–66s | Practice vs Bots difficulty menu | “For solo visitors, private practice launches immediately with Easy, Normal or Hard bots.” |
| 66–80s | Game movement, shield, crystal, scoreboard ping | “Dual sticks work on mobile. Network ping is visible; movement responds locally while scores remain server-owned.” |
| 80–90s | Invite link / scoreboard / final screen | “Share an invite, play a full round, and rematch. Four arenas are included in this candidate.” |

## If something breaks

- **First page is slow:** “The host is waking up; this can happen on sleeping free instances. We have a standby URL and can verify /ping.”
- **Matchmaking finds nobody:** “Quick Play needs two humans in the same mode. We can demonstrate the private bot practice immediately.”
- **A participant disconnects:** “A refresh can resume within 30 seconds on the same instance. Switching host services starts a new room.”
- **A phone’s rotation or fullscreen is blocked:** “We can use the portrait controls or demonstrate on desktop; browser orientation lock varies.”
- **High ping or visual correction:** “The authoritative server keeps outcomes consistent. We have measured synthetic RTT; we do not claim every connection is seamless.”
- **Unexpected deploy/restart:** “Rooms are in memory, so matches reset. We’ll start a fresh room rather than pretend sessions migrated.”
- **An ability feels late:** “The shield protects from validated activations, but the current 150ms backdating does not undo already committed damage.”

**Never claim** real-phone coverage, cross-country latency, sustained load or perceptual audio testing passed until those manual checks are actually completed.
