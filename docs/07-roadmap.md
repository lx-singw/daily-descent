# The Daily Descent — Roadmap

This roadmap spans three horizons: the hackathon build itself, the immediate post-launch period, and the longer platform vision. Each phase states its entry criteria (what must be true before starting it) so nothing here gets pursued prematurely — this is a direct continuation of the horizon-labeling discipline.

---

## Phase 0: Pre-build validation (before writing game code)

**Entry criteria:** none — do this first.

- Work through the validation checklist items (storage persistence, comment reading, comment posting, scheduled jobs, storage limits) against the real Devvit platform.
- Confirm mobile webview rendering basics work in a throwaway Devvit Web + Phaser test app before committing to the full build.

**Exit criteria:** you know, concretely, which features are actually buildable on Devvit as designed, and have adjusted the MVP scope doc if any assumption failed.

---

## Phase 1: Hackathon MVP Build (Critical & Stretch)

**Entry criteria:** Phase 0 complete.

- **[Hackathon Critical]** (Core engine, grid movement, basic spikes/guards combat, death/run score, unverified leaderboard in Redis, lazy UTC rollover locks).
- **[Hackathon Critical]** (RLE ghost replays compression, predefined tactical markers, and collective daily goals).
- **[Hackathon Stretch]** (Room heatmaps, named runs, leader's deepest point silhouette, onboarding overlay, Epitaph Statistics death causes) — only built if critical loop is verified and test coverage is complete.
- Polish pass: mobile viewport scaling, touch control response, seeded demo post with mock trails/leaderboard entries for judging.

**Exit criteria:** hackathon submission — working app listing + seeded demo post link submitted by the deadline.

---

## Phase 2: Post-Launch Stabilization & Content (First 2–4 weeks)

**Entry criteria:** hackathon submitted; game is live on at least one subreddit.

- **[Post-Launch]** (Free-form spirit messages with reporting/removal controls and verification).
- **[Post-Launch]** (Subreddit Factions scorewar tracking, Native Thread Curation modifier voting).
- **[Post-Launch]** (Subreddit flair milestones, badges, user profiles with run history and stats).
- **[Post-Launch]** (Comment-derived card submission parser with numeric balance ranges and budget caps).
- Start tracking the success metrics defined in [06-prd.md](file:///z:/home/lx_singw/projects/daily-descent/docs/06-prd.md) (return rate, contribution rate, leaderboard/faction participation).

**Exit criteria:** free-form messages, comment modifier curation, and faction wars stable under real traffic.

---

## Phase 3: Reputation & Curation (Phase 3–4, post-launch)

**Entry criteria:** Phase 2 exit criteria met, and enough real player data has accumulated.

- **[Post-Launch]** (Trending/discovery feeds: deadliest room this week, top contributed card this month).
- **[Platform Bet]** (The "Daily Rescue" Event).
- **[Platform Bet]** (Automated card curation and balance checking against performance history).
- If Redis storage or aggregation requirements exceed limits, this is the point where mirroring stats to an external datastore (e.g. DynamoDB) is evaluated.

**Exit criteria:** Rescue events and trending feeds live; curation pass runs autonomously.

---

## Phase 4: Personalization & Platform Portability (Phase 5–6, speculative)

**Entry criteria:** proven player retention and multi-game expansion.

- **[Platform Bet]** (Personalization tendency model emphasizing trails/options without changing the daily seed).
- **[Platform Bet]** (Portable profile identity and achievements carrying across multiple Devvit games).
- AI/Gemini integration used purely as a backend helper tool (moderation filters, curation assistance).

**Exit criteria:** personalization live; cross-game profile sharing enabled.

---

## Summary timeline view

| Phase | Priority Category | Nature |
|---|---|---|
| 0. Pre-build validation | `[Hackathon Critical]` | Required, immediate smoke-testing |
| 1. Hackathon MVP | `[Hackathon Critical]` & `[Hackathon Stretch]` | Required, deadline-bound |
| 2. Post-launch stabilization | `[Post-Launch]` | Core loop maturation |
| 3. Reputation & Curation | `[Post-Launch]` & `[Platform Bet]` | Community scaling |
| 4. Personalization & Portability | `[Platform Bet]` | Long-term speculative vision |
