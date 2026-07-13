# The Daily Descent — Product Scope & Horizons

This document defines what is built for each developmental horizon. We follow a strict sequencing principle:

> **Priority Principle:**
> *"Nothing is cut from the product vision. Features are only removed from the deadline-critical path when they would reduce the quality or reliability of the proof."*

We sequence features into four distinct horizons to ensure a flawless, polished submission for the hackathon while preserving our long-term platform ambition.

---

## 1. [Hackathon Critical] — Must work in the demo
*These features form the non-negotiable floor. They must be completely implemented, bug-free, and seeded with mock data before the submission deadline.*

### Tier 0: The Core Engine
1. **Deterministic Generator**: Procedural dungeon generator, seeded and deterministic (same seed → same layout).
2. **Phaser Engine**: Grid-based rendering of walls, floors, players, exits, traps, and enemies.
3. **Hazards & Combat**: Basic combat/hazard system (spikes/guards) that can kill the player.
4. **Death & Score Tracking**: Core score formula:
   $$\text{Score} = (\text{Depth} \times 1,000,000,000) + (1,000,000,000 - \text{Duration}_{\text{ms}})$$
5. **Leaderboard**: Persistent daily leaderboard keyed by date and post ID in Devvit Redis.
6. **Lazy UTC Rollover**: Rollover of daily seeds at midnight UTC using atomic locking to handle concurrency.

### Tier 1: The Social Echo
7. **Tactical Death Markers**: On death, the player places a predefined marker on their tile:
   * *"Trap!"*
   * *"Dead end"*
   * *"Heal here"*
   * *"Boss route"*
   * *"I regret everything"*
   This avoids moderation debt/griefing and integrates with standard user comment posting via an optional User Action.
8. **Ghost Replays**: Record a compressed move log (RLE direction streams with checkpoints) of the last 15 runs and render them as semi-transparent moving sprites.
9. **Collective Community Goal**: A shared daily challenge showing collective progress, e.g.:
   * *"If 25 players reach Room 5 today, tomorrow's descent begins with one extra torch."*
   Makes every run matter, even if the player dies, and scales nicely at low player counts.

---

## 2. [Hackathon Stretch] — Non-critical MVP Polish
*Built only after Hackathon Critical features are fully polished, verified, and test suites are passing.*

10. **Onboarding tooltip**: A brief, skippable tooltip beat on first load explaining: *"Everyone plays today's same dungeon. Follow the echoes. Leave one when you fall."*
11. **Heatmaps**: Subtle room-level death heatmap tinting using cumulative death-coordinate counts today.
12. **"Last survivor" silhouette**: Render a faint, highlighted static ghost sprite showing where the current daily leaderboard leader reached their deepest point.
13. **Named runs**: Allow a player who reaches the bottom of the dungeon to name their run next to their leaderboard name.
14. **Epitaph Statistics (Death Breakdown)**: On death, players select a cause from a predefined list (e.g. *"Greed"*, *"Spike Trap"*, *"Guard Corner"*). Landing screen displays today's aggregated death cause chart.

---

## 3. [Post-Launch] — Post-Submission Maturity (First 2-4 Weeks)
*Ambitious features deferred post-hackathon to avoid API approval delays, moderation debt, or because they require active player volumes to test.*

15. **Native Thread Curation (No-UI Voting)**: Bot stickies three comments for tomorrow's dungeon modifier. Midnight job parses upvote delta to select the rule.
16. **Subreddit Factions ("Faction Wars")**: Automatic player splitting into *Lurkers* vs *Posters* groups using account karma/age metadata. Contributions feed into a faction progression meter.
17. **Free-Form Spirit Messages**: Allow players to leave custom text messages on death. Implements report/removal tools and user verification.
18. **Comment-Derived Draft Cards**: Scan top-voted comments using a strict whitelist parser (numeric bounds only) and compile them into tomorrow's draft pool.
19. **Flair & Badge Milestones**: Award subreddit flair milestones for first clears, top finishes, or streak counts.
20. **Weekly leagues**: Track weekly halls of fame across date keys.

---

## 4. [Platform Bet] — Long-Term Platform Vision
*Highly speculative layers requiring proven retention and custom Devvit platform features.*

21. **The "Daily Rescue" Event**: Tombstones of deep deaths are marked as "trapped." Touching them rescues the player's ghost, granting bonus points to the rescuer and profile points to the rescued.
22. **Personalization Layer**: Quiet tendency modeling (analyzing player habits) to emphasize specific ghost trails or cards, without altering the shared daily seed.
23. **Automated Curation Pipeline**: Auto-balance checking of card effects against historical completion statistics.
24. **Cross-Game Portability**: Portable player profiles and achievements across multiple Devvit games.

---

## Suggested Build & Dependency Flow
To maintain stability, features should be built in the following order:

```
[Phaser Grid Engine + Seeded Layout] (Tier 0)
                 ↓
[Abuse Prevention Path Validation + UTC Rollover Locks] (Tier 0)
                 ↓
[Ghost Trails + Tactical Markers + Collective Goals] (Tier 1)
                 ↓
[Polish, Heatmaps, and Seeded Demo Data] (Hackathon Stretch)
                 ↓
[Comment Parsing + User Action Attributions] (Post-Launch)
                 ↓
[Personalization & Balance Pipeline] (Platform Bet)
```

For the long-term roadmap details, consult [05-post-mvp-platform-vision.md](file:///z:/home/lx_singw/projects/daily-descent/docs/05-post-mvp-platform-vision.md). For details on metrics and scoring parameters, see [06-prd.md](file:///z:/home/lx_singw/projects/daily-descent/docs/06-prd.md).
