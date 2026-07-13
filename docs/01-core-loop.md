# The Daily Descent — Core Loop

*(internal shorthand: Echo Dungeon: Daily Draft — merge of Echo Dungeon, Daily Dungeon Draft, and Subreddit Dungeon)*

## One-line pitch
A daily rogue-lite dungeon crawl where everyone in the subreddit plays the exact same seed, dies to the ghosts and comments of the players before them, and votes tomorrow's traps and cards into existence from today's run.

## The loop, end to end

1. **Midnight (server time): new seed drops.**
   A new dungeon layout generates from a fixed daily seed. Every player who opens the post today plays the *same* layout, with the *same* card draft pool.

2. **Player opens the post.**
   They see:
   - The dungeon, generated fresh for today.
   - Ghost trails of a handful of recent runs (semi-transparent replays showing where past players moved, and where they died).
   - "Spirit messages" — short warnings pulled from top comments on today's post, anchored to the room/location the commenter died in or wants to warn about.

3. **Player picks a starting loadout** from today's draft pool (3–5 cards). The draft pool is populated partly from a fixed base set and partly from yesterday's top-upvoted community-submitted cards (see User Contribution below).

4. **Player descends.**
   Turn-based or real-time-lite movement through procedurally generated rooms (grid-based, Phaser-rendered). Standard rogue-lite tension: limited resources, permadeath for the run, score based on depth reached + loot collected.

5. **Player dies or reaches the bottom.**
   - On death: they can drop a Spirit Message (a short text warning, pulled from their own comment on the post, or a quick in-game prompt) at the location they died, visible to future players today.
   - On success: their time/depth is submitted to today's leaderboard.

6. **Player leaves a comment (optional but incentivized).**
   Top-upvoted comments that read as a trap/card suggestion in a light format (e.g. `[Card] Vampire Fangs: heal 2 HP on hit`) become eligible for tomorrow's draft pool, pending a lightweight validation pass (see Guardrails).

7. **Next midnight: repeat**, with a new seed and a refreshed draft pool shaped by yesterday's top comments.

## Why this loop hits the judging criteria directly

- **Hook-y:** Same seed for everyone creates a genuine "did you beat today's dungeon" community conversation. Streak/leaderboard mechanics reward daily return without punishing a missed day too harshly (see MVP scope for exact tuning).
- **Reddit-y:** The dungeon literally can't exist without the subreddit's comments — spirit messages and draft cards are sourced from real community text, not decorative Reddit branding.
- **User Contributions:** Every player's death becomes content for the next player (spirit message) and every top comment can become a permanent-ish game mechanic (draft card). This is the loop's primary UGC engine.
- **Retention Mechanics:** Daily reset + evolving draft pool + leaderboard reset gives three overlapping reasons to return every 24 hours.
- **Delightful UX / Polish:** Single, well-scoped genre (rogue-lite dungeon crawl) means visual and interaction polish can go deep instead of being spread across a sprawling system.
- **Avoids "AI Slop" and "Common Ideas" traps:** The genre (dungeon crawler) is common, but the daily-seed-shared-by-everyone + comment-sourced-cards + spirit-message-ghosts combination is not something any of Reddit's example subs (r/honk, r/bridgedit, etc.) are doing, and it's explicitly *not* a space shooter, platformer, or trivia app.

## Non-goals for v1 (deliberately excluded from the core loop)

- No real-time multiplayer presence (players don't see each other live — everything is asynchronous via ghosts/comments).
- No player-vs-player combat or griefing surface.
- No persistent player-owned economy or trading.
- No level *editor* in v1 — dungeon layout is procedurally generated, not hand-built by players (this avoids Canvas Cartographer/Subreddit Dungeon's harder "manual level design" scope).
