# The Daily Descent — Core Loop

*(internal shorthand: Echo Dungeon: Daily Draft — merge of Echo Dungeon, Daily Dungeon Draft, and Subreddit Dungeon)*

## One-line pitch
A daily rogue-lite dungeon crawl where everyone in the subreddit plays the exact same seed, dies to the ghosts of the players before them, leaves tactical warnings, and collaborates/competes toward community goals and faction wars.

## The loop, end to end

1. **Midnight (UTC): seed rotation.**
   The game operates inside a single, persistent pinned post on the subreddit. At midnight UTC, the seed rotates. The client-side generator uses the new seed to render today's dungeon. All leaderboard, ghost trail, tactical marker, and faction statistics are day-keyed in the persistent post's storage.

2. **Player opens the post.**
   They see:
   - The dungeon, generated dynamically for today's seed.
   - Ghost trails of a handful of recent runs today (semi-transparent replays showing where past players moved and died).
   - Predefined tactical warning markers (e.g. "Trap!", "Dead end") left by past players at their exact locations of death.
   - Today's **Epitaph Statistics** chart (e.g. *"Today Room 4 killed 61%; 40% died of Greed"*).
   - An ongoing **Faction War** score tracker (Lurkers vs. Posters).

3. **Player descends.**
   Grid-based movement through procedurally generated rooms (Phaser-rendered). Standard rogue-lite tension: limited resources, permadeath for the run, score based on depth reached + time elapsed.
   *Starting loadout parameters (e.g. number of torches) may be boosted by yesterday's completed collective goal.*
   As they play, they can see the highlighted static **"Last Survivor" silhouette** of the current daily leader. Touching tombstones of players trapped deep in the dungeon triggers a **Daily Rescue** co-op event.

4. **Player dies or reaches the bottom.**
   - On death: they choose a tactical warning marker (e.g., *"Trap!"*) and select a predefined death cause/epitaph (e.g., *"Greed got the best of me"*), contributing to today's **Epitaph Statistics**.
   - On success: their time/depth is submitted to today's daily leaderboard.
   - For all runs: their progress contributes to today's **collective community goal** and their team's score in the **Faction War**.

5. **Next midnight UTC: repeat**, with a new day key, fresh seed, and tomorrow's starting perk shaped by yesterday's collective goal and native comment curation vote upcounts.

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
