# Pixel Rift — bug-fix-only mode after feature freeze

**Trigger:** A concrete user-reported bug or observed release blocker, not a wish list. This document does **not** authorize changes to server gameplay logic, matchmaking or wire protocol. Protocol stays 3. No Phase 8 features.

## For every bug the operator pastes

1. **Reproduce or explain the cause.** Record exact deployed commit, client/browser/device, room ID (if safe), expected and observed behavior, steps, Render logs, and whether the issue occurs in the current candidate. If unable to reproduce, explicitly label the hypothesis and do not guess at a root cause.
2. **Assess event risk.** Prefer a reproducible, targeted patch. If a proposed fix changes server gameplay, matchmaking, protocol, loadout rules, or significant user flows, stop; explain why the change is risky and provide an event workaround instead.
3. **Make the smallest edit**, with no unrelated refactor. One issue per commit, on a fresh branch from the actual latest `main`. Do not merge or deploy without operator approval.
4. **Add a regression test** that fails on the bug and passes on the change when feasible. Existing test files remain enabled; test additions must not falsely certify device-specific behavior.
5. **Run the full Node 24 gate** after each patch:
   ```powershell
   npm ci
   npm test
   npm run build
   npm run release:check
   ```
   The baseline at event planning was **103 tests**. Check the current suite count and require **all existing tests plus additions** to pass. Do not equate a prior green build with the current patch.
6. **Report in this order:** (1) cause/reproduction and risk; (2) changed files and commit/PR; (3) tests added and **actual** results; (4) manual checks. Mark unrun checks explicitly.
7. **Only if approved:** follow the [event day checklist](EVENT_DAY_CHECKLIST.md) for commit selection, safe deploy window, /ping, /health, event:check, phone validation, and rollback.

## Workarounds to prefer over risky emergency rewrites

- **Quick Play teammate missing:** use private Practice vs Bots or a prearranged second participant in the same Quick Play mode.
- **Server sleeping:** verify the same origin using `/ping` and `/health`, then retry; do not move players to a different instance expecting shared rooms.
- **Reconnect failure:** attempt a fresh join; sessions last only within the 30-second grace period on the same instance and cannot survive a deploy.
- **Phone orientation lock unavailable:** use the supported responsive portrait layout or desktop demo without forcing browser permissions.
- **Demo network failure:** present a clearly labeled recording from the verified deployed build rather than pretending gameplay occurred live.

**Never claim** real-phone, international, sustained-load or perceptual audio acceptance passed without direct recorded evidence. Feature freeze starts three hours before the organizer-confirmed deadline. Even bug fixes require a deliberate risk decision during the freeze.
