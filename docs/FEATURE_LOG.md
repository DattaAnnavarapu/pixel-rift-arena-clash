# Pixel Rift — last-day feature triage and execution log

**Baseline:** `origin/main`, 1.2.0-alpha.2, protocol 3. User supplied evidence of **109/109 passing tests**, build, release gate and deployed two-client event check on the verified production build. That evidence applies **only to the previously tested main commit**, not to branches created below.

**Deadline:** [SUBMISSION DEADLINE] was not filled in. The event is described as tomorrow night; exact H (hours remaining), H−12 and H−8 thresholds cannot be calculated reliably. Do not guess the freeze time. Obtain the exact organizer deadline and enforce the last 8 hours as device QA, video and submission only.

**Environment blocker:** This assistant's terminal has Node **22.16.0**, no local GitHub checkout/dependencies, and `git ls-remote https://github.com/DattaAnnavarapu/pixel-rift-arena-clash.git` failed with `Could not resolve host: github.com`. GitHub connector allows source commits but not execution of Node 24 tests or Playwright. Consequently **none of the new branches have passed `npm test`, `npm run build`, `npm run release:check`, `npm run test:high-ping`, or localhost `event:check`**. No PRs were opened, no merges and no deploys occurred for this batch.

## Existing features — don't duplicate

Verified through source inspection and earlier user tests: QR invite, help `?`/Field Manual, guided tutorial, solo Practice vs Bots (Easy/Normal/Hard), hit markers/feedback, emotes, ping/server status, resilient reconnect, settings and mobile controls, authoritative Quick Play. These are **not new tasks**. Keep the deployed version as the fallback.

## Per-task execution and decision log

| Task | Branch | Status | Tests added / gate | Bundle delta | Manual checks / reason / revert |
|---|---|---|---|---|---|
| 0.1 Client `?safe=1` switch | `polish/safe-mode-foundation` | **PARTIAL** | 2 unit tests authored; full gate **NOT RUN** | Unknown: build blocked | `src/polish.ts` persists session opt-out; `main.tsx` adds `data-polish`. No new visual effects are enabled yet. Confirm effect setting, session persistence, refresh, URL behavior. Revert branch/not merge. |
| 0.2 Default-off server flag registry | `feature/server-event-flags` | **PARTIAL** | 2 unit tests authored; full/high-ping gate **NOT RUN** | Unknown | Registry for future features only; **no server features consume flags**, so flags have no effect. Requires review before any use. Revert branch/not merge. |
| 0.3 Fallback tag / staging reminder | no code | **DONE (instruction only)** | Not applicable | 0 | Operator may run `git tag event-fallback e7f7329 && git push origin event-fallback` **after verifying commit and no existing tag**. Deploy experimental branches only to a **separate staging Render service**; never overwrite verified production during experimentation. No tag created. |
| 1.1 Match-start 3-2-1 + GO | none | **SKIPPED** | No tests; gate unavailable | 0 | Existing startsAt/phase hooks; new overlay can confuse reconnects. Needs actual transitions/sound/mobile QA; don't rush. |
| 1.2 Results dialog / MVP | none | **SKIPPED** | No tests; gate unavailable | 0 | Current result banner exists; results overlay risks focus/reconnect/rematch regressions. |
| 1.3 Menu/button CSS polish | none | **SKIPPED** | No tests; gate unavailable | 0 | Recent viewport-fit changes already stabilized; avoid last-day layout changes without 15 viewport captures. |
| 1.4 Compact control help | none | **SKIPPED (already covered in part)** | No tests | 0 | Existing `?`/Field Manual and first-run tutorial reduce benefit of another overlay. |
| 1.5 Extra jingles/KO banners/shake | none | **SKIPPED** | No tests; gate unavailable | 0 | Existing sound, hit markers and feed. Requires reduced-motion, hidden-tab, low-quality and headphone checks. |
| 1.6 Additional toasts | none | **SKIPPED (existing notices)** | No tests | 0 | Existing copied-invite/reconnect notices; avoid duplicate toast announcements. |
| 1.7 Loading/meta share polish | none | **SKIPPED (existing wake state)** | No tests; gate unavailable | 0 | Already shows connection/wake-up status; HTML metadata not verified. |
| 1.8 Mobile install tip | none | **SKIPPED** | No tests; gate unavailable | 0 | Browser/platform dependent; avoid obstructing game and submission time. |
| 1.9 Accessibility pass | none | **PARTIAL (audit only)** | No new tests | 0 | Existing aria labels/live regions/focus styles reviewed; new behavior needs keyboard/screen-reader/mobile checks. |
| 2.1 Combat match statistics | none | **SKIPPED** | Full server/high-ping gate unavailable | 0 | New state/snapshot fields require authoritative calculations and tests; high risk. |
| 2.2 Spectator mode | none | **SKIPPED** | Full server/high-ping gate unavailable | 0 | Role, snapshot privacy, caps and routing are significant security/operational changes. |
| 2.3 Day leaderboard | none | **SKIPPED** | Full server/high-ping gate unavailable | 0 | Per-user identity, privacy, invalidation and persistence issues; not worth event risk. |
| 2.4 Emote/chat safety | none | **SKIPPED** | No tests | 0 | Existing whitelist/rate-limiting. No demonstrated bug supplied. |
| 3.1 JSON arena migration | none | **SKIPPED** | No collision snapshot gate available | 0 | Can silently change wall/collision/spawn behavior. |
| 3.2 New maps | none | **SKIPPED** | No authoritative hazard/high-ping gate | 0 | Maps require gameplay changes; prioritize known good arenas. |
| 3.3 New game modes | none | **SKIPPED** | No high-ping/simulation gate | 0 | Scoring, state machine and matchmaking behavior changes. |
| 3.4 New classes/weapons/pickups | none | **SKIPPED** | No TTK/seeded bots/high-ping gate | 0 | Combat stability and balance risk. |
| 3.5 Cosmetics/progression | none | **SKIPPED** | No browser/snapshot/gate verification | 0 | Local progression and validation add test surface at deadline. |
| 3.6 Adaptive/coordinated bots | none | **SKIPPED** | No seeded bot/full gate | 0 | Deterministic difficulty ranking cannot be certified. |
| 4.1 Compact snapshots | none | **SKIPPED** | No high-ping gate | 0 | Wire compatibility risk even with optional capability. |
| 4.2 Lag rewind | none | **SKIPPED** | No high-ping gate | 0 | Authoritative combat history and shield/KO semantics too risky. |
| 4.3 Region routing | none | **SKIPPED** | No multi-region deployment | 0 | Region selection needs multiple reachable regions and failover QA. |
| 4.4 Monitoring / Playwright | none | **SKIPPED** | No local browser dependencies | 0 | Can be revisited after event; no user analytics without explicit opt-in. |
| 4.5 GitHub Actions Node 24 CI | `polish/safe-mode-foundation` | **PARTIAL** | `.github/workflows/event-ci.yml` authored; no execution results available | 0 runtime | CI includes npm ci, test, build and release:check on candidate branches and PRs. Verify GitHub Actions triggers/checks on branch before considering gate passed. Revert/not merge if failing. |
| 4.6 Shared-state scaling design | none | **SKIPPED** | No tests | 0 | Nonessential to submission; architecture remains single-instance/in-memory. |
| FINAL docs / release hygiene | `docs/event-feature-triage-log` | **PARTIAL** | This inventory and manual gate; no tests | 0 | README and event checklist remain unchanged on production; update only after verified changes merge. |

## Safety and merge policy

**Recommended merge order (if any future gates pass):** 1) client safe-mode foundation **after removing/splitting its CI change if necessary**, 2) standalone CI, 3) default-off server registry. **Do not merge any of these simply because code was committed.** No high-risk gameplay/server extensions are recommended before the submission.

**Required per-branch gate in Node 24 checkout:**
```powershell
npm ci
npm test
npm run build
npm run release:check
```
For server or snapshot changes, also `npm run test:high-ping` and `npm run event:check -- http://localhost:<port>` against a local production start. For UI, capture Playwright menu/lobby/match CSS screenshots at 1366×768, 1920×1080, 390×844 and 844×390. All unrun checks are **PENDING**, not passed.

**Verified-production limitations:** shield activation backdates at most 150ms and cannot rewind committed damage/KO; rooms and session tokens live in memory and reset on deploy; no cross-country certification or sustained-load test. Real-phone and headphone/audio testing were reported by the user on the verified build, **not on these new branches**.

**Operator next action:** finish the actual event recording and submit the tested production build. Do not gamble on unverified features inside the freeze window. The isolated branches may be retained for post-event development.
