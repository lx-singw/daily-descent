# The Daily Descent — MVP Scope

This doc defines what "done" means at each tier, so that if time runs out, you know exactly where to stop and still have a submittable, judge-able game.

## Tier 0 — Must exist for this to be a game at all (build first, in this order)

1. Procedural dungeon generator, seeded, deterministic (same seed → same layout for every player).
2. Phaser grid-based movement + rendering of the dungeon (walls, floor, player sprite, exit/treasure).
3. Basic combat/hazard system: at least one enemy type and one trap type that can kill the player.
4. Death state + depth/score tracking.
5. A visible leaderboard (even a simple sorted list: username + depth/time) for today's seed.
6. Daily reset: at midnight (or a fixed interval for demo purposes), generate a new seed and clear/rotate the leaderboard.

**If you stop here:** you have a complete, playable, launch-viable single-player daily rogue-lite. It will score reasonably on Delightful UX, Polish, and Hook-y (daily reset alone is a real hook), but weakly on Reddit-y and User Contributions. This is your floor — never ship less than this.

## Tier 1 — The Reddit-native layer (build second)

7. **Spirit messages:** on death, prompt the player to leave a short text message (pre-filled suggestion, editable) that gets posted as a Reddit comment AND anchored visually at their death location in-game for future players today.
8. **Ghost replays:** record a lightweight trail (position + timestamp) of the last N runs (start with N=3–5) and render them as semi-transparent moving sprites during a new player's run.
9. Pull the current post's top comments via Devvit and surface a small number of them as spirit messages even for players who didn't die there (i.e., seed some messages from real comments, not just death-triggered ones), so the room feels populated even early in the day.

**If you stop here:** the game now visibly and directly incorporates real Reddit activity into the play experience — this is what should meaningfully move the Reddit-y and User Contributions scores.

## Tier 2 — The evolving draft pool (build third, only if time allows)

10. Simple card/loadout system: player picks 1 of 3-5 "cards" (a stat modifier or ability) before descending.
11. Comment parser: scan top-upvoted comments from the previous day's post for a fixed, simple format (e.g. `[Card] Name: Effect`), matched against a small whitelist of allowed effect types (heal amount, damage bonus, speed bonus — numeric fields only, no freeform effect text executed as code).
12. Validated comment-cards get added to today's draft pool, credited to the commenter's username in-game.

**If you stop here:** this is the full vision from the pitch. This tier is explicitly the highest-risk, lowest-priority tier — cut it first if time is short, because Tier 0 + Tier 1 already score well across every rubric category without it.

## Tier 3 — Reinforcement features (build fourth, only after Tier 0–1 are solid)

These are low-to-moderate cost additions that strengthen the existing loop rather than introduce new systems. Prioritize in this order if time is limited:

13. **Death cause tagging:** auto-tag how a player died (trap type, enemy type, fall) alongside the death location. Cheap — you already track cause of death for the ghost/post-mortem flow — and gives every future player useful signal even from deaths where the player didn't leave a comment.
14. **Community stat summary:** a small daily readout on the post (attempts today, clears, deadliest room, average depth). Nearly free once run data exists in storage; strong "Reddit-y, human-first" signal for very low build cost. Keep the tone dry and mechanical (a plain stat line), not an attempt at AI-narrator wit — a generic "clever" voice reads as templated and undercuts the game's own identity.
15. **Spirit message voting:** let players upvote/downvote in-game spirit messages (separate from the Reddit comment's own score) so the most helpful ones surface first. Doubles as griefing mitigation (see risks doc) — a low-quality or troll message just sinks in the ranking rather than needing manual moderation.
16. **Flair/badge milestones:** award a Reddit flair or in-game badge for milestones (first clear, top-10 finish, most-upvoted spirit message). Strong "embracing subreddit tools" signal per the brief's actual definition of Reddit-y; validate Devvit's flair-setting API access before committing design time (add to the risks/validation doc's checklist).
17. **Weekly meta-layer:** track an all-time or weekly "hall of fame" (deepest-ever run, most helpful spirit message of the week) separate from the daily leaderboard. Cheap — just don't reset one particular stat on daily rollover — and gives a reason to care beyond just today's run.

**If you stop here:** these round out the entry across every judging category without introducing new failure surfaces — none of them can break the core game if something goes wrong (worst case, a stat readout is momentarily stale or a badge doesn't get awarded).

## Tier 3.5 — Cheap identity & rhythm deepeners (build after Tier 3, before Tier 2)

These reuse data/systems you already have from Tier 0–3 — none require new infrastructure, so they're high signal per unit of build time:

19. **Room-level community heatmap:** subtle tint on rooms based on how many players died there today, reusing death-cause-tagging data (item 13). The dungeon visually communicates "everyone's struggling here" without the player needing to read any comments.
20. **"Last survivor" ambient marker:** a faint, non-interactive silhouette showing where the current leaderboard leader reached their deepest point, visible as an implicit goalpost in whatever room the current player is exploring. Reuses leaderboard + ghost-trail data already being recorded.
21. **Named runs:** let a player who reaches the bottom name their run (shown next to their leaderboard entry and ghost trail label). Pure flavor/identity, near-zero build cost, no new systems.
22. **Weekday/weekend modifier:** a small fixed rule flag on a schedule (e.g. "double torches Saturdays," "no healing Mondays") that existing systems already read — adds daily variety without new content generation or parsing.
23. **Community goal thresholds:** e.g. "if 50 people clear today's dungeon, tomorrow's draft pool gets a bonus card slot." Reuses the attempt-counting from the community stat summary (item 14) to tie daily participation to a visible collective payoff.

**If you stop here:** the dungeon now has real personality and daily texture without touching the comment-parsing or AI-gate systems at all — this tier is arguably the best time-to-signal ratio in the entire scope document.

## Tier 4 — Invisible AI moderation gate (build last, optional, pairs with Tier 2 only)

18. **LLM-based quality gate for comment-derived cards:** before a `[Card] Name: Effect` comment enters tomorrow's draft pool, run it through an LLM check (in addition to, not instead of, the strict numeric whitelist parser from Tier 2) to catch submissions that are technically well-formatted but nonsensical, exploitative in spirit, or off-tone. This is backend-only — invisible to players, never surfaced as a feature or a visible "AI" touchpoint in the game itself, since the brief explicitly warns against AI usage that's obvious the moment the app is opened.

**Only build this if Tier 2 is already in and stable.** It's a refinement of the comment-parsing pipeline, not a substitute for the whitelist safeguard — the whitelist stays as the hard technical backstop regardless of what the LLM gate decides. Do not use AI to generate dungeon layouts, art, or any player-facing content (flavor text included, per item 14's guidance above) — that's the kind of visible AI usage the brief is warning against, and it risks undercutting your Polish/identity scores rather than helping them.

## Explicitly out of scope for the hackathon build

- Player-submitted level geometry/editors.
- Real-money or persistent cross-day currency systems.
- PvP or player-vs-player griefing mechanics.
- Mobile-specific input schemes beyond making sure touch targets and viewport scaling work (this is a polish requirement, not a separate feature — verify early, don't treat as a stretch goal).

## Note on scope
This document covers the **hackathon MVP only**. For the longer-term vision beyond the hackathon deadline — features intentionally out of scope here because they need more runway, infrastructure, or community scale than a hackathon window allows — see `05-future-vision.md`. Nothing in this doc should be read as "the whole plan"; it's the first slice of a bigger build.

## Suggested build order across a multi-day window

- **Day 1:** Tier 0 items 1–4. Get a dungeon you can walk through and die in.
- **Day 2:** Tier 0 items 5–6, then start Tier 1 item 8 (ghost replay recording/playback — this can be built and tested without needing live Reddit data).
- **Day 3:** Tier 1 items 7 and 9 — this is where Devvit integration (posting comments, reading comments) has to actually work, so front-load testing this against the real API early rather than late.
- **Remaining time, in priority order:** Tier 3 items 13–17, then Tier 3.5 items 19–23 (both cheap, additive, no new failure surface) before Tier 2 (comment-derived draft cards) — Tier 3/3.5 are lower-risk and cheaper per point of rubric coverage than Tier 2 is. Only move to Tier 2 once Tier 0, 1, 3, and 3.5 are solid and tested. Tier 4 (AI moderation gate) is last on the list overall, and only relevant if Tier 2 shipped and is stable. Polish pass (mobile viewport, animations, sound) takes priority over both Tier 2 and Tier 4 if you have to choose.
