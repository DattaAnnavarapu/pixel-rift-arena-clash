# Event viewport QA — browser CSS layout checks (NOT REAL DEVICE)

**Status: NOT RUN for this branch.** This environment cannot run the repository's Node 24 app or Playwright. No screenshots are attached yet; do **not** interpret this file as evidence of passing layout. The previous screenshots are from older code and are not a substitute.

For the **exact unmerged candidate**, run locally (Node 24):
```powershell
git fetch origin
git switch --track origin/fix/event-viewport-ui-only
npm ci
npm test
npm run build
npm run release:check
npm run dev
```

Using Playwright or browser DevTools against `http://localhost:3000`, capture **menu**, **private lobby**, and a **live match** for each viewport below. Use two local browser sessions for Quick Play or a private bot practice. Save screenshots under `docs/screenshots/ui-css/`, with filenames like `1366x768-menu.png`, `1366x768-lobby.png`, and `1366x768-match.png` (15 images total). For screenshots that expose names/URLs, redact personal identifiers without changing layout. Label every image **CSS viewport check — not a real phone test**.

| Browser viewport | Menu | Lobby | Match | Checks |
|---|---|---|---|---|
| 1366×768 | [ ] | [ ] | [ ] | Quick Play and Practice visible; full arena and Vitality/ammo/abilities visible without scroll |
| 1536×864 | [ ] | [ ] | [ ] | Same, with uninterrupted 16:10 arena |
| 1920×1080 | [ ] | [ ] | [ ] | Same, no unnecessary vertical scroll |
| 390×844 (portrait) | [ ] | [ ] | [ ] | No horizontal overflow; hint and fullscreen controls fit; no overlaps |
| 844×390 (landscape) | [ ] | [ ] | [ ] | Existing mobile layout unchanged; all sticks/actions reachable |

For every capture, record `document.documentElement.scrollWidth <= innerWidth`; check relevant DOM element rectangles have no overlaps. On desktop match, verify `.arenaWrap`, `.abilities` and the health HUD end at or above `innerHeight`, and document scrolling is unnecessary. Test the dismissible rotation hint and verify it does not return during the same tab session.

**Manual limitations still open:** actual Android/iPhone touch, browser address bars/notches, orientation changes, performance, international/cross-network matches, sustained load and perceptual audio. A Playwright viewport is **not** physical-device certification.
