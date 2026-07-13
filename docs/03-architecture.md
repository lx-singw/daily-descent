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

### Daily seed generation
- Server-side: a scheduled Devvit job (or a check-on-first-load-of-the-day pattern if scheduled jobs aren't available/reliable) generates a new seed once per 24h window and stores it (post-associated key-value store).
- Client requests "today's seed" on load; dungeon generation algorithm runs **client-side** using that seed (deterministic PRNG) so you don't need to transmit the whole layout — just the seed and generation parameters.
- **Validate early:** confirm Devvit's storage APIs support simple per-post key-value persistence with the read/write patterns you need before designing anything more complex on top of it.

### Ghost replays
- Client records its own run as a lightweight array of `{t: timestamp, x, y}` samples (sample every ~250-500ms, not every frame — keep payload small).
- On death or completion, client sends this trail + outcome to the backend, which stores it (with a cap — keep only the most recent N runs per seed, or a representative sample, to avoid unbounded storage growth).
- On load, client fetches N recent trails for today's seed and renders them as replay sprites, interpolating between sampled points.

### Spirit messages
- On death, client shows a prompt: "Leave a warning for the next Redditor?" with a short text field (pre-filled with a suggestion based on cause of death, fully editable).
- If the player opts in, the backend posts this as an actual Reddit comment on the post (via Devvit's Reddit API access) AND stores it tagged with the in-game death location so it can be rendered as an in-game icon at that spot.
- Separately, the backend periodically (or on load) pulls the post's top-level comments via the Reddit API and surfaces a handful as ambient spirit messages even if they weren't generated through the death flow — this is what makes the dungeon feel populated by real community text from the start of the day, not just after a few deaths.
- **Validate early:** confirm the scope/permissions Devvit grants for posting comments programmatically on a player's behalf, since this needs explicit player consent and correct attribution.

### Draft pool / comment-derived cards (Tier 2, if time allows)
- Backend job runs once daily (tied to the seed rotation): fetch top-upvoted comments from *yesterday's* post, run them through a strict regex/format matcher for the `[Card] Name: Effect` pattern.
- Effects are matched against a small **whitelist** of allowed effect types with numeric parameters only (e.g. `heal:<int>`, `damage_bonus:<int>`, `speed_bonus:<float>`) — never eval free text as logic. Anything that doesn't match the whitelist is silently dropped, not partially applied.
- Matched cards get added to a bounded pool (cap total cards available per day, e.g. max 2-3 community cards alongside a fixed base set) to prevent runaway power creep.

### Invisible moderation gate (Tier 4, optional, pairs with Tier 2)
- Once a submitted card passes the whitelist parser above, an additional check via **Gemini** (Google AI Studio / Vertex AI API, using an existing Google Ultra plan) evaluates it for tone/exploitativeness/nonsense that a strict format-and-whitelist check wouldn't catch on its own — e.g. a technically valid `heal:9999` that's absurd even though it's numerically well-formed.
- This is a small, structured classification call, not a reasoning-heavy task — a lightweight prompt asking "is this card balanced and in-tone for the game, yes/no/flag" is sufficient; no need for a frontier-tier model.
- The whitelist parser remains the hard technical backstop regardless of what Gemini decides — this call never replaces it, only adds a second, fuzzier opinion on top.
- **Validate early (see doc 04, item 6):** confirm Devvit's backend environment permits outbound calls to an external API (Gemini) at all, and within what latency/timeout constraints a scheduled/triggered job can tolerate, before designing the daily card-processing job around this dependency.

### Leaderboard
- Backend stores `{username, depth, time, timestamp}` per completed run, keyed to today's seed.
- Client fetches top N sorted by depth (tiebreak: time) for display.
- Reset/rotate this store on each new seed generation — don't let it grow unbounded across days.

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
| Storage (MVP) | Devvit's built-in key-value storage | Runs/leaderboard/ghost trails/card pool; limits unconfirmed — see doc 04, item 7 |
| Reddit integration | Devvit's Reddit API access | Comment read/write, flair-setting; permission scope unconfirmed — see doc 04, items 2–3, 5 |
| Moderation gate (Tier 4 only) | Gemini via Google AI Studio / Vertex AI (Google Ultra plan) | Structured classification only, paired with — never replacing — the hard whitelist parser |
| Post-MVP analytics infra (Phase 3–4, speculative) | AWS (existing credits) | Only if Devvit's storage proves insufficient for richer usage-metric tracking once real data exists — not part of MVP scope |
| Post-MVP personalization compute (Phase 5, speculative) | AWS Lambda or equivalent (existing credits) | Only if per-player tendency modeling outgrows what Devvit's backend can reasonably run — not part of MVP scope |

**Why AWS isn't part of the MVP stack:** Devvit doesn't allow pointing the game's core hosting at external infrastructure — the app runs inside Reddit's platform by design. AWS credits are being held in reserve for genuinely post-MVP needs (see doc 07, Phases 3–5), not used during the hackathon build itself.

## Key technical unknowns to validate before committing further design time
(see `04-risks-and-validation.md` for the full list and suggested order of testing)
