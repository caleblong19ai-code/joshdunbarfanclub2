# Josh Dunbar Fanclub V2 Project State

Last updated: 2026-09-02

## Current Objective

Maintain and refine the V2 redesign, Bean Run, Bean Galaga, and restored historical content in this staging repository, then promote the reviewed result to the separate production repository that serves the public site.

## Current State

- This repository is the V2 development/staging source.
- The production/historical source remains `Big-JoshD/joshdunbarfanclub` according to the repository README.
- The site is static HTML/CSS/JavaScript.
- The V2 home page and navigation establish the "Institute of Dunbar Studies" visual system and information architecture.
- Historical restoration is underway from the Big-JoshD source. The goal is not a verbatim port: preserve canonical jokes/content while rebuilding each feature as a stronger V2 experience.
- Restored/revamped content pages as of 2026-09-02:
  - `lore.html` — recovered canonical backstory and legendary tales, expanded into an archival chronology/case-file presentation.
  - `dailyfacts.html` — preserved the historical rotating fact library, now presented as a daily intelligence brief with category, anomaly level, analyst note, deterministic daily rotation, and an alternate-brief control.
  - `bicepsize.html` — preserved the softball / bowling ball / Vegas Sphere / singularity progression, rebuilt as an interactive normalized comparison lab rather than relying on the old Chart.js/Infinity chart behavior.
  - `beancam.html` — preserved the original Bean Tracker premise and absurd 1–2 billion kB power readings, rebuilt as a live simulated electrical telemetry console with saturation state, arc rate, field stability, threat posture, confidence, overload handling, and a rolling event log.
  - `livecam.html` — preserved the original 24/7 live-feed/Platinum-access gag, including the 275 lb bench requirement, Bean letter of intent, $1 tier, and inevitable rejection; rebuilt as a secure camera terminal with fake uplink negotiation, multiple camera channels, clearance state, and a giant fake-antivirus/scareware denial sequence. The scareware is DOM-only, deliberately theatrical, and includes an emergency dismiss control rather than opening real browser windows or trapping navigation.
  - `archive.css` — shared presentation layer for restored archive, intelligence, and metrics pages; loaded by `site.js` only for relevant page classes.
  - `surveillance.css` — shared presentation layer for Bean telemetry and the secure camera network.
  - `scareware.css` — dedicated giant fake-security-alert presentation for the Secure Camera rejection sequence.
- Several navigation targets still do not exist in V2 and remain restoration candidates: poetry, fan submissions, fan fiction, spicy photos, Rocket League rank, chess metrics, merch, FAQ, and contact.
- Surveillance pages currently reference several archived public images from `Big-JoshD/joshdunbarfanclub` by raw GitHub URL, consistent with the existing V2 hero treatment. These can be copied into V2 later if production independence from the historical repo becomes a requirement.
- Bean Run has been migrated into V2 as one responsive implementation in `game.html` with game logic in `bean-run.js`.
- Bean Run now uses shared desktop/mobile physics, distance-based obstacle spacing, five explicit threat tiers, touch and keyboard controls, persistent local high scores, automatic visibility pausing, tactical lightning, synthesized sound, smaller collision boxes than the visible sprites, and cached parallax layers to reduce mobile render work.
- The Bean Run renderer is capped at 60 updates per second on high-refresh displays and stops its animation loop while paused or hidden. Each forest layer and the moving ground are pre-rendered for one blit per frame, HUD refreshes are throttled, pickup/bolt glows are cached, and runtime lightning no longer relies on expensive canvas shadow blur.
- An instrumented canvas-operation regression check preserved identical two-second travel distance at 30, 60, 90, 120, and 144 Hz. At 120 Hz, draw work is now equal to the 60 Hz path; a normal 60 Hz frame dropped from nine to seven image blits and removed the earlier per-frame ground rectangles. This is not a substitute for physical-device frame profiling.
- Bean remains visually stable while running; the earlier oscillating bob/rotation was removed. A held charge now uses independently timed, persistent sparks without a shield perimeter or synchronized redraw, while fired lightning uses a jagged multi-layer core with branching secondary arcs.
- Lightning economy is intentionally scarce after the tutorial charge: replacement cooldown is 2,300–3,100 world units and pauses while a charge is held or a pickup is already on screen.
- Each deployment begins with a short, non-interactive chase shot: Bean and three armed squirrels enter at speed, the camera settles continuously onto Bean's normal position, and control returns before the first obstacle can spawn.
- `game-mobile.html` is now a compatibility redirect to `game.html`; it is not a second game implementation.
- Bean Galaga is playable and has been iteratively rebuilt toward Galaga-style formation entry, dive paths, bombing cadence, capture/rescue, dual-fighter behavior, challenging stages, portrait playfield geometry, and themed fauna.
- Latest verified Bean Galaga milestone in commit history before the archive restoration pass: **V12 sprite renderer** at commit `7f08a76f7803676bcd0c86fd0b7aa1859758e8fd`.
- The staging repository is public. Do not add secrets, private media, personal contact details beyond deliberate public site content, or proprietary assets without permission.

## Locked Decisions

- Keep V2 changes in this repository until reviewed.
- Do not assume a staging commit has reached production.
- Preserve the Josh/Bean parody theme and the Institute of Dunbar Studies presentation.
- Historical content is source material, not a requirement to reproduce old layout/implementation defects.
- When restoring a historical page, preserve recognizable canonical jokes, terminology, and comparisons unless there is a specific reason to retire them.
- Prefer native static HTML/CSS/JavaScript over unnecessary third-party dependencies for archive pages.
- Surveillance functionality is explicitly theatrical/simulated; do not turn the joke camera/telemetry pages into real tracking or surveillance systems.
- Bean Galaga should behave like a Galaga-inspired fixed shooter, not a generic bullet-hell game.
- Avoid copying copyrighted original game art/audio; use original themed assets and mechanics-inspired behavior.
- Bean Run must remain one responsive ruleset. Do not reintroduce separate desktop and mobile implementations.
- Keep distance-based obstacle spacing so increased world speed does not silently create impossible time-based spawn compression.

## Canonical Sources

- `README.md` — staging/production boundary.
- `PROJECT-STATE.md` — current V2 restoration/game state and locked decisions.
- `index.html`, `navbar.html`, `style.css`, `site.js`, `archive.css`, `surveillance.css`, and `scareware.css` — current V2 site system.
- `game.html` / `bean-run.js` and Bean Galaga runtime files — current game implementations.
- `Big-JoshD/joshdunbarfanclub` — historical content/reference source for pages not yet restored.
- Git history for implemented mechanics and restoration sequence.
- The production repository and live domain are authoritative for what is actually deployed.

## Next Action

1. Browser-test the newly restored Lore, Daily Intelligence, Bicep Metrics, Bean Monitor, and Secure Camera pages for desktop/mobile layout and interaction defects; tune from observed failures.
2. Continue restoration in themed batches. The strongest next batch is remaining Metrics (`ranktracker.html` / `chessmetrics.html`).
3. Rebuild Archives (`poetry.html`, `fansubmissions.html`, `fanfics.html`) using the new archival presentation after their historical content is reviewed.
4. Decide whether historical `spicy.html` belongs in the restored Surveillance department as-is, should be reinterpreted, or should be retired.
5. Rebuild utility/public pages (`merch.html`, `faq.html`, `contact.html`) once the main content departments are functional.
6. Continue physical play-testing of Bean Run and Bean Galaga.
7. Compare staging against production and promote only after explicit review.

## Open Variables

- Current production HEAD and whether any V2 changes were already copied there.
- Hosting/DNS configuration and deployment workflow.
- Browser/physical-device QA results for the restored V2 content pages.
- Whether V2 should eventually vendor/copy the archived public surveillance image assets instead of referencing them from the historical repo.
- Bean Run balance after physical-device play-testing.
- Remaining Bean Galaga balance targets after V12 play-testing.
