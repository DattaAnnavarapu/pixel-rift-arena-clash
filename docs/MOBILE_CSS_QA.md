# Mobile CSS QA — not physical-device certification

The **previous stabilization branch** reported browser iframe geometry checks at 320×568, 390×844 and 844×390 with no overflow. This event branch has **not** yet been rendered or captured in a current browser session. Screenshots are intentionally **not attached**, because doing so without a run would misrepresent acceptance. Capture them in the same built revision after CI passes and save screenshots under `docs/screenshots/`.

| Viewport | Current candidate screenshot | Checks to repeat |
|---|---|---|
| 320×568 | NOT RUN / no screenshot yet | joystick/abilities within bounds, HUD, bottom safe area |
| 390×844 | NOT RUN / no screenshot yet | touch dock visibility, game canvas, settings |
| 844×390 | NOT RUN / no screenshot yet | landscape dock beside arena, all actions, HUD |

Code audit: both sticks have independent pointer IDs and capture, pointer-up/cancel/lost-capture releases, blur/hidden-tab cleanup; left-handed CSS is keyed off `data-left`, sizes are bounded to 88–132px, ability targets are intended to meet 44px, and responsive sizing/safe areas are already present. Event patch now responds to updated aim sensitivity immediately and clears aim ownership on cancel. Check on actual Android/iOS before saying these work physically.

**Manual procedure:** open a fresh private room on the deployed URL, set each viewport in browser responsive tools, verify no horizontal/vertical overflow and that every touch control fits, then capture and name `320x568-css.png`, `390x844-css.png`, `844x390-css.png`. Labels must read “browser CSS geometry; not physical-phone input.” On two real devices repeat move+aim+fire, release/cancel, app switch, rotate, maximum stick size, left-handed swap, fullscreen fallback and safe-area behavior.
