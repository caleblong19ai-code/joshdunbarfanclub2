# Josh Dunbar Fanclub V2 Project State

Last updated: 2026-09-01

## Current Objective

Maintain and refine the V2 redesign, Bean Run, and Bean Galaga in this staging repository, then promote the reviewed result to the separate production repository that serves the public site.

## Current State

- This repository is the V2 development/staging source.
- The production source remains `Big-JoshD/joshdunbarfanclub` according to the repository README.
- The site is static HTML/CSS/JavaScript.
- Bean Run has been migrated into V2 as one responsive implementation in `game.html` with game logic in `bean-run.js`.
- Bean Run now uses shared desktop/mobile physics, distance-based obstacle spacing, five explicit threat tiers, touch and keyboard controls, persistent local high scores, automatic visibility pausing, tactical lightning, synthesized sound, smaller collision boxes than the visible sprites, and cached parallax layers to reduce mobile render work.
- The Bean Run renderer is capped at 60 updates per second on high-refresh displays and stops its animation loop while paused or hidden. Each forest layer and the moving ground are pre-rendered for one blit per frame, HUD refreshes are throttled, pickup/bolt glows are cached, and runtime lightning no longer relies on expensive canvas shadow blur.
- An instrumented canvas-operation regression check preserved identical two-second travel distance at 30, 60, 90, 120, and 144 Hz. At 120 Hz, draw work is now equal to the 60 Hz path; a normal 60 Hz frame dropped from nine to seven image blits and removed the earlier per-frame ground rectangles. This is not a substitute for physical-device frame profiling.
- Bean remains visually stable while running; the earlier oscillating bob/rotation was removed. A held charge now uses independently timed, persistent sparks without a shield perimeter or synchronized redraw, while fired lightning uses a jagged multi-layer core with branching secondary arcs.
- Lightning economy is intentionally scarce after the tutorial charge: replacement cooldown is 2,300–3,100 world units and pauses while a charge is held or a pickup is already on screen.
- Each deployment begins with a short, non-interactive chase shot: Bean and three armed squirrels enter at speed, the camera settles continuously onto Bean's normal position, and control returns before the first obstacle can spawn.
- `game-mobile.html` is now a compatibility redirect to `game.html`; it is not a second game implementation.
- Bean Galaga is playable and has been iteratively rebuilt toward Galaga-style formation entry, dive paths, bombing cadence, capture/rescue, dual-fighter behavior, challenging stages, portrait playfield geometry, and themed fauna.
- Latest verified game milestone in commit history: **V12 sprite renderer** at commit `7f08a76f7803676bcd0c86fd0b7aa1859758e8fd`.
- The staging repository is public. Do not add secrets, private media, personal contact details beyond deliberate public site content, or proprietary assets without permission.

## Locked Decisions

- Keep V2 changes in this repository until reviewed.
- Do not assume a staging commit has reached production.
- Preserve the Josh/Bean parody theme and the Institute of Dunbar Studies presentation.
- Bean Galaga should behave like a Galaga-inspired fixed shooter, not a generic bullet-hell game.
- Avoid copying copyrighted original game art/audio; use original themed assets and mechanics-inspired behavior.
- Bean Run must remain one responsive ruleset. Do not reintroduce separate desktop and mobile implementations.
- Keep distance-based obstacle spacing so increased world speed does not silently create impossible time-based spawn compression.

## Canonical Sources

- `README.md` — staging/production boundary.
- `index.html`, shared styles/scripts, `game.html` / `bean-run.js`, and the Bean Galaga page/runtime.
- Git history for the implemented mechanics sequence.
- The production repository and live domain are authoritative for what is actually deployed.

## Next Action

1. Manually play-test Bean Run on physical desktop and mobile browsers, focusing on frame pacing, parallax seams, lightning appearance, jump/duck timing, pickup height, touch ergonomics, audio, and threat-tier transitions.
2. Tune Bean Run only from observed failures; do not split the implementation by device.
3. Play-test Bean Galaga on desktop and mobile for input, difficulty, collision, formation, capture/rescue, and performance regressions.
4. Review public assets/content and accessibility.
5. Connect the production repository separately, compare branches/files, and promote only after explicit review.

## Open Variables

- Current production HEAD and whether any V2 changes were already copied there.
- Hosting/DNS configuration and deployment workflow.
- Bean Run balance after physical-device play-testing.
- Remaining gameplay balance targets after V12 play-testing.
