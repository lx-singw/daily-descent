# The Daily Descent — Core Loop

*(internal shorthand: Echo Dungeon: Daily Draft — merge of Echo Dungeon, Daily Dungeon Draft, and Subreddit Dungeon)*

## One-line pitch
A daily rogue-lite dungeon crawl where everyone in the subreddit plays the exact same seed, dies to the ghosts of the players before them, leaves tactical warnings at their death location, and works toward a collective community goal.

## The loop, end to end

1. **Midnight (UTC): seed rotation.**
   The game operates inside a single, persistent pinned post on the subreddit. At midnight UTC, the seed rotates. The client-side generator uses the new seed to render today's dungeon. All leaderboard, ghost trail, and tactical marker data are day-keyed in the persistent post's storage.

2. **Player opens the post.**
   They see:
   - The dungeon, generated dynamically for today's seed.
   - Ghost trails of a handful of recent runs today (semi-transparent replays showing where past players moved and died).
   - Tactical warning markers (e.g. "Trap!", "Dead end") left by past players at their exact locations of death.

3. **Player descends.**
   Grid-based movement through procedurally generated rooms (Phaser-rendered). Standard rogue-lite tension: limited resources, permadeath for the run, score based on depth reached + time elapsed.
   *Starting loadout parameters (e.g. number of torches) may be boosted by yesterday's completed collective goal.*

4. **Player dies or reaches the bottom.**
   - On death: they choose a tactical warning marker (e.g., *"Trap!"*, *"Dead end"*, *"Heal here"*, *"Boss route"*, or *"I regret everything"*) and place it at their death tile, visible to future players today. They can optionally choose to post this as an authenticated Reddit comment.
   - On success: their time/depth is submitted to today's daily leaderboard.
   - For all runs: the final room reached contributes to today's **collective community goal** (e.g., *"If 25 players reach Room 5 today, tomorrow's descent begins with one extra torch"*).

5. **Next midnight UTC: repeat**, with a new day key, fresh seed, and a starting perk shaped by yesterday's collective goal achievement.

## Why this loop hits the judging criteria directly

- **Hook-y:** Same seed for everyone creates a genuine "did you beat today's dungeon" community conversation. The collective goal gives every attempt (even deaths) immediate value.
- **Reddit-y:** The dungeon populated by other players' ghosts and markers feels like a shared space. It integrates Reddit's social mechanics by allowing explicit manual User Action posting.
- **User Contributions:** Every player's path and death becomes content for the next player (ghost trails and tactical markers). This creates an immediate, low-barrier feedback loop.
- **Delightful UX / Polish:** Single, well-scoped loop (2-minute dungeon run) ensures animations, viewport scaling, and rendering are exceptionally polished.

## Non-goals for the Hackathon MVP (Sequenced to Post-Launch/Platform Bet)

- No free-form custom text warnings in-game (avoids moderation/abuse debt; handled via tactical markers instead).
- No complex comment-to-card parsing pipeline or automated card creation in-game.
- No player-vs-player combat or real-time multiplayer.
- No persistent player economies.
