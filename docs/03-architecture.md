# The Daily Descent — Devvit Web + Phaser Architecture

## High-level structure

```
Reddit Post (Devvit Interactive Post)
  └── Devvit Web App (webview)
        └── Phaser game instance (renders dungeon, handles input/movement)
        └── Client-side game state (current run: position, HP, cards held)
  └── Devvit Backend (server-side, via Devvit's platform APIs)
        ├── Seed generator (daily, deterministic)
        ├── Run storage (per-player run results: depth, time, death location)
        ├── Comment reader (pulls top comments from the post)
        ├── Comment writer (posts spirit messages as comments on behalf of player, with consent)
        └── Leaderboard store (today's seed's run results, sorted)
```

## Why Devvit Web fits this project specifically

Devvit Web lets the game be built as a standard web app (Phaser + whatever framework wraps it) that runs inside a Reddit post as a webview, while still being able to call back to a Devvit backend for anything that needs to touch Reddit data (comments, upvotes, user identity) or needs server-authoritative state (the daily seed, the leaderboard — these must NOT be purely client-side or they're trivially fakeable).

## Core data flow, by feature

### Daily seed generation (UTC Midnight Lazy-Rollover)
- **Persistent Post Model:** The game runs inside a single, persistent pinned post on the subreddit. All daily seeds, leaderboards, and trails are partitioned by day keys in the post's Redis storage namespace.
- **Lazy Rollover with Locks:** Seed rotation is lazy-loaded (triggered on the first `/api/seed` fetch of the day). To prevent competing seeds on simultaneous first-loads, the backend uses an atomic Redis lock (`SETNX` or transactional multi/exec) on the current date key (`daily_seed:postId:YYYY-MM-DD`). 
- **Rollover Overlaps:** Runs that cross midnight are validated against the seed corresponding to their run start timestamp rather than the current server time, ensuring that longer runs are not invalidated.

### Ghost replays (RLE Directional Compression)
- **Compression Scheme:** The client compresses the player's movements into a run-length encoded direction log (e.g., `U5R2D1W3` indicating Up, Right, Down, Wait counts) paired with absolute tile coordinates and timestamp checkpoints every 10 steps to bound interpolation drift (format: `startX,startY,startTimeMs:U5:C,12,9,1200`).
- **Caps & TTL:** Redis storage enforces strict caps: a maximum of 15 ghost trails per seed key, a maximum move log size of 12KB (or 1000 moves), and a Time-To-Live (TTL) of 7 days on historical keys to maintain memory limits.

### Tactical warning markers [Hackathon Critical]
- On death, client prompts the player to select a tactical warning marker (predefined options: *"Trap!"*, *"Dead end"*, *"Heal here"*, *"Boss route"*, or *"I regret everything"*).
- The selected marker ID is stored alongside coordinates `(x, y)` in today's Redis set for the persistent post.
- If the player opts in, an explicit manual User Action (`runAs: 'USER'`) triggers the Devvit backend to post a formatted comment credit to the player's account. Otherwise, the marker is stored locally in Redis and rendered inside subsequent players' runs.

### Collective Community Goal [Hackathon Critical]
- The backend stores daily progression indices in Redis (e.g. tracking how many players reach Room 5 today).
- If the daily goal target is achieved (e.g., >= 25 runs reach Room 5), the lazy rollover process for tomorrow's seed applies a starting loadout modifier (e.g. starting with an extra torch or additional +2 HP) dynamically.

### Epitaph Statistics & Death Breakdown [Hackathon Stretch]
- **Redis Schema:** Today's death causes are stored in a Redis Hash (`daily_descent:epitaphs:postId:YYYY-MM-DD`) where keys are cause IDs and values are increments.
- **Client Render:** Selected cause from a predefined list (e.g. *Greed*, *Guard*, *Spikes*) is posted via `/api/run`. The landing screen reads this hash to show percentage breakdowns.

### "Last Survivor" Silhouette [Hackathon Stretch]
- **Redis Schema:** Tracks the absolute coordinates and path of today's best run in a single date-keyed string (`daily_descent:leader_endpoint:postId:YYYY-MM-DD`).
- **Client Render:** Retrieves the leader's final coordinates during initial seed fetch and renders a highlighted static tombstone/silhouette at that cell.

### Native Comment Curation Upvote Scraper [Post-Launch]
- **Flow:** The midnight rollover job fetches upvote deltas from the three stickied comments containing tomorrow's gameplay modifiers (using Devvit's Reddit API access).
- **Storage:** The winning modifier ID is saved to the day's seed metadata (`daily_descent:modifier:postId:YYYY-MM-DD`) to apply layout modifiers.

### Faction Wars [Post-Launch]
- **Flow:** Player class is inferred from karma and account age metadata:
  - *Lurkers:* karma < 1,000 and age > 180 days.
  - *Posters:* All other users.
- **Storage:** Run depths are accumulated into faction keys (`daily_descent:faction:lurkers:postId:YYYY-MM-DD` and `daily_descent:faction:posters:postId:YYYY-MM-DD`). A real-time progress bar compares team scores.

### The "Daily Rescue" Event [Platform Bet]
- **Redis Schema:** Tombstones of players who died in deep rooms are pushed to a Redis Sorted Set (`daily_descent:trapped_tombstones:postId:YYYY-MM-DD`).
- **Flow:** Clients fetch today's trapped coordinates. Touching a trapped tile triggers `/api/rescue`, incrementing the trapped player's reputation points (`daily_descent:reputation:username`) and awarding the rescuer bonus score.

### Draft pool / comment-derived cards (Tier 2, if time allows)
- Backend job runs once daily (tied to the seed rotation): fetch top-upvoted comments from *yesterday's* post, run them through a strict regex/format matcher for the `[Card] Name: Effect` pattern.
- Effects are matched against a small **whitelist** of allowed effect types with numeric parameters only (e.g. `heal:<int>`, `damage_bonus:<int>`, `speed_bonus:<float>`) — never eval free text as logic. Anything that doesn't match the whitelist is silently dropped, not partially applied.
- Matched cards get added to a bounded pool (cap total cards available per day, e.g. max 2-3 community cards alongside a fixed base set) to prevent runaway power creep.

### Invisible moderation gate (Tier 4, optional, pairs with Tier 2)
- Once a submitted card passes the whitelist parser above, an additional check via **Gemini** (Google AI Studio / Vertex AI API, using an existing Google Ultra plan) evaluates it for tone/exploitativeness/nonsense that a strict format-and-whitelist check wouldn't catch on its own — e.g. a technically valid `heal:9999` that's absurd even though it's numerically well-formed.
- This is a small, structured classification call, not a reasoning-heavy task — a lightweight prompt asking "is this card balanced and in-tone for the game, yes/no/flag" is sufficient; no need for a frontier-tier model.
- The whitelist parser remains the hard technical backstop regardless of what Gemini decides — this call never replaces it, only adds a second, fuzzier opinion on top.
- **Validate early (see doc 04, item 6):** confirm Devvit's backend environment permits outbound calls to an external API (Gemini) at all, and within what latency/timeout constraints a scheduled/triggered job can tolerate, before designing the daily card-processing job around this dependency.

### Leaderboard Trust & Verification Model
- **Trust Model:** The leaderboard is designed for friendly, unverified competition. We do not claim cryptographic anti-cheat.
- **Abuse Prevention:** The backend reconstructs steps from the RLE log and validates coordinate bounds, legal tile transitions (no wall-walking), minimum speed/timing thresholds (`180ms` between moves), and checks that the final position matches the reported status.
- **Rate Limits & Idempotency:** Users are limited to **one ranked run submission per day** (saved as a played flag key in Redis). Duplicate submissions are rejected, and payload validation ensures fields are well-formed before write.

## Phaser-specific notes
- Grid-based dungeon: a tilemap-driven scene is the simplest reliable approach — use Phaser's tilemap support rather than hand-placing sprites per room.
- Ghost trails: render as separate sprite layers with reduced alpha, interpolated movement using Phaser tweens between recorded sample points — avoids needing per-frame replay data.
- Keep the viewport responsive from day one: test on a narrow mobile width early, since the brief explicitly calls out mobile experience as a scoring factor, and retrofitting responsive layout late is expensive.

## Tech stack summary

| Layer | Choice | Notes |
|---|---|---|
| Platform / hosting | Devvit Web | Required by the hackathon; runs both client and server on Reddit's infrastructure — no external hosting needed for the MVP |
| Rendering | Phaser (TypeScript) | Required framing for the Best Use of Phaser sub-award; well-suited to tilemap-based dungeon generation |
| Language | TypeScript | Client, server, and shared types, per `08-repo-structure.md` |
| Storage (MVP) | Devvit Redis | Scoped per post using day keys; limits details verified — see doc 04, item 7 |
| Reddit integration | Devvit's Reddit API access | Comment read/write, flair-setting; permission scope unconfirmed — see doc 04, items 2–3, 5 |
| Moderation gate (Tier 4 only) | Gemini via Google AI Studio / Vertex AI (Google Ultra plan) | Structured classification only, paired with — never replacing — the hard whitelist parser |
| Post-MVP analytics infra (Phase 3–4, speculative) | AWS (existing credits) | Only if Devvit's storage proves insufficient for richer usage-metric tracking once real data exists — not part of MVP scope |
| Post-MVP personalization compute (Phase 5, speculative) | AWS Lambda or equivalent (existing credits) | Only if per-player tendency modeling outgrows what Devvit's backend can reasonably run — not part of MVP scope |

**Why AWS isn't part of the MVP stack:** Devvit doesn't allow pointing the game's core hosting at external infrastructure — the app runs inside Reddit's platform by design. AWS credits are being held in reserve for genuinely post-MVP needs (see doc 07, Phases 3–5), not used during the hackathon build itself.

## Key technical unknowns to validate before committing further design time
(see `04-risks-and-validation.md` for the full list and suggested order of testing)
