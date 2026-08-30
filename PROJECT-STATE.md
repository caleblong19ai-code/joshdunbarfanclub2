# Josh Dunbar Fanclub V2 Project State

Last updated: 2026-08-30

## Current Objective

Maintain and refine the V2 redesign and Bean Galaga in this staging repository, then promote the reviewed result to the separate production repository that serves the public site.

## Current State

- This repository is the V2 development/staging source.
- The production source remains `Big-JoshD/joshdunbarfanclub` according to the repository README.
- The site is static HTML/CSS/JavaScript.
- Bean Galaga is playable and has been iteratively rebuilt toward Galaga-style formation entry, dive paths, bombing cadence, capture/rescue, dual-fighter behavior, challenging stages, portrait playfield geometry, and themed fauna.
- Latest verified game milestone in commit history: **V12 sprite renderer** at commit `7f08a76f7803676bcd0c86fd0b7aa1859758e8fd`.
- The staging repository is public. Do not add secrets, private media, personal contact details beyond deliberate public site content, or proprietary assets without permission.

## Locked Decisions

- Keep V2 changes in this repository until reviewed.
- Do not assume a staging commit has reached production.
- Preserve the Josh/Bean parody theme and the Institute of Dunbar Studies presentation.
- Bean Galaga should behave like a Galaga-inspired fixed shooter, not a generic bullet-hell game.
- Avoid copying copyrighted original game art/audio; use original themed assets and mechanics-inspired behavior.

## Canonical Sources

- `README.md` — staging/production boundary.
- `index.html`, shared styles/scripts, and the Bean Galaga page/runtime.
- Git history for the implemented mechanics sequence.
- The production repository and live domain are authoritative for what is actually deployed.

## Next Action

1. Play-test V12 on desktop and mobile for input, difficulty, collision, formation, capture/rescue, and performance regressions.
2. Document any remaining fidelity gaps as specific mechanics rather than “make it more like Galaga.”
3. Review public assets/content and accessibility.
4. Connect the production repository separately, compare branches/files, and promote only after explicit review.

## Open Variables

- Current production HEAD and whether any V2 changes were already copied there.
- Hosting/DNS configuration and deployment workflow.
- Remaining gameplay balance targets after V12 play-testing.
