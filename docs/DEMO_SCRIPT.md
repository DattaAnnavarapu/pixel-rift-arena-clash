# Pixel Rift: event demo and recording script (60–90 seconds)

**Recording requirement:** Every screenshot and video clip must come from the **actual deployed build** at the verified event commit. Do not use mockups, staged UI composites, or footage of a different version. Confirm the public URL, protocol 3, and version 1.2.0-alpha.2 before recording. Record a clean browser window with legible HUD; avoid displaying personal information, browser notifications, or secret tokens.

## Screen-recording shot list (target: 85 seconds)

| Time | Shot / capture plan | Voiceover or caption |
|---|---|---|
| 0–8s | **Main menu**: title, Quick Play and Practice vs Bots buttons; show the live browser URL briefly | “Pixel Rift: instant 2–4 player arena battles. No sign-up or installation.” |
| 8–18s | **Tutorial**: tap Tutorial, move to objective, aim/fire, then show one ability; use cuts between actual steps if needed | “A guided round teaches movement, weapons, abilities, and objectives.” |
| 18–31s | **Practice vs Bots**, three short clips: select **Easy** (4s), **Normal** (4s), **Hard** (5s), each with its actual difficulty shown on screen | “Solo visitors can practice against Easy, Normal, or Hard bots.” |
| 31–46s | **Quick Play on two devices**: show both independent browsers/phones at the same deployed URL and mode; capture lobby, readiness/countdown, and both seeing the live match | “Two players join the same queue; the authoritative server starts the match.” |
| 46–61s | **Combat montage**: class/weapon selection, movement/aim/fire, DASH, SHIELD reflect, one special, and a crystal or knockout | “Three classes, three weapons, and tactical abilities create short, competitive rounds.” |
| 61–69s | **Network/ping indicator** visible in the HUD or scoreboard, preferably with server ID | “Client prediction smooths movement, while the server decides hits and points.” |
| 69–79s | **Private room**: reveal **SHOW JOIN QR**, scan from a second device and show the joined lobby; also show COPY INVITE | “Invite friends by room code, link, or offline-generated QR.” |
| 79–85s | **Final moment**: scoreboard/match progress or real result screen; display game title and verified public URL | “Choose your loadout. Join the Rift.” |

**Editing:** These are sequential clips from actual gameplay, not a claim that a complete tutorial or three bot matches can each finish in a few seconds. Crop/cut only for pacing; do not fake network or scoring events. Keep any displayed ping value genuine. Prefer an 85-second finished video, with a 60-second variant that trims the combat montage and intro—not the two-device or real-build proof.

## Recording checklist

- [ ] Verify the deployed commit in Render, then `/ping` and `/health` (version, protocol, errors, tick, memory).
- [ ] Run `npm run event:check -- <url>` **before** inviting participants; it creates an actual temporary Quick Play room.
- [ ] Capture the menu, guided tutorial, and all three bot levels from the live candidate.
- [ ] Capture real two-device Quick Play and the same live room from both clients.
- [ ] Include genuine abilities, confirmed outcomes, scoreboard ping, and private invite QR scan.
- [ ] Keep the 60–90 second edit legible at phone size, with clear narration or captions.
- [ ] Verify the final recording's link, captions, orientation, and playback on the presentation device.
- [ ] Record device/browser and date for manual acceptance; a video does not itself certify real-phone performance, international play, load, or audio quality.

## Live-demo flow (60–90 seconds)

Start on the menu; launch Tutorial briefly; show Practice difficulty selection, then use a second participant already standing by for Quick Play. Demonstrate one class/weapon change, movement, one ability, the ping display, and finally a private-room QR invite. Explain that the server remains authoritative over damage, pickups and scores. Use the [judge pitch](PITCH.md) for fuller Q&A.

## If the live demo fails

1. **Slow wake or connection:** “The server is responding slowly; we have health checks and a recorded walkthrough from the same deployed candidate.” Verify `/ping` and `/health` before another attempt.
2. **No Quick Play partner / queue issue:** “Quick Play needs two humans in the same mode; let's demonstrate private Practice vs Bots.” Do not claim a second player connected unless observed.
3. **Phone orientation or fullscreen is blocked:** continue in portrait or desktop; browser capabilities vary.
4. **Disconnected player:** try reconnect on the same origin within the roughly 30-second grace window. Do not imply a backup host inherits the room.
5. **Live server unavailable:** play the **pre-recorded, verified production-build** video with a clear label **Recorded demo**. Show the last confirmed health/status evidence if available; do not call a failing live test successful.
6. **Unexpected deploy/restart:** warn that rooms and session tokens are in memory and reset. Create a fresh room after recovery rather than presenting it as a resumed game.
7. **Latency/reflect limitation:** simulated 400ms RTT stress results are transport checks, not a real-world latency guarantee; shield backdating is capped at 150ms and does not reverse committed hits/KO scores.

**Manual checks not certified here:** actual Android/iOS touch ergonomics, cross-country network conditions, sustained load, and perceptual audio/listening. Do not report any of them as passed without direct testing.
