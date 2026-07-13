# The Daily Descent — Risks & Validation Checklist

This is the list of things to test against the *real* Devvit platform before you sink design time into anything that assumes they work. Test these in roughly this order — each one gates a chunk of the build.

## 1. Can you persist server-side state per post, keyed by day?
**Why it matters:** the entire daily-seed mechanic depends on this. Without reliable per-post key-value storage, you can't guarantee everyone sees the same dungeon today.
**How to test:** build the smallest possible Devvit Web app that writes a value on first load and reads it back on a second load, and confirm it's consistent across different users/sessions on the same post.

## 2. Can your app read comments (and their scores) on its own post?
**Why it matters:** gates Tier 1 (spirit messages from top comments) and Tier 2 (comment-derived cards) entirely.
**How to test:** confirm what Devvit's Reddit API access actually returns — comment text, author, score, timestamp — and how fresh that data is (real-time vs. some delay).

## 3. Can your app post a comment on behalf of a consenting player?
**Why it matters:** gates the "leave a spirit message" flow, which is one of your two clearest Reddit-y differentiators.
**How to test:** verify the permission model for `runAs: 'USER'` comment posting. Since user actions require app approval and are restricted in playtesting, build a fallback: store and display the message in-game (locally in Redis) and show an optional but explicit manual "Post as u/username" trigger action button showing the exact text to be submitted.

## 4. Can you run a scheduled/timed job (e.g., for daily seed rotation), or do you need a "check on load" pattern instead?
**Why it matters:** determines whether "midnight rollover" is a clean server-side event or something you simulate by checking timestamps whenever a user loads the post.
**How to test:** check Devvit's docs/examples for scheduled triggers; if unavailable, design the seed-check to run cheaply on every page load instead (compare stored date to today's date, regenerate if different).

## 5. Can your app set/award Reddit flair on a player's behalf?
**Why it matters:** gates Tier 3 item 16 (flair/badge milestones) — one of the cheaper, higher-signal "Reddit-y" additions.
**How to test:** confirm Devvit's permission model for flair-setting (does it require explicit per-action consent similar to comment-posting, and what's the UX for granting that).

## 6. If using the Gemini moderation gate (Tier 4), what's the latency/cost of a call in the daily card-processing job?
**Why it matters:** Tier 4's card quality-gate runs once daily against a batch of comments — confirm this fits comfortably within whatever job-execution constraints Devvit's scheduled/triggered jobs impose (time limits, external API call allowances) before designing around it.
**How to test:** prototype a single Gemini API call (via Google AI Studio / Vertex AI, using the existing Google Ultra plan) against a sample comment batch outside of Devvit first, then confirm Devvit's backend environment can make outbound API calls at all, and within what constraints. Note that outbound domains (like `generativelanguage.googleapis.com`) must be explicitly declared in `devvit.json` under `permissions.http.domains`.

## 7. What are the actual size/rate limits on Devvit's storage?
**Why it matters:** ghost replay trails and leaderboard entries both grow over time; you need to know if you're storing megabytes or kilobytes comfortably, and how often you can write.
**How to test:** find Devvit's documented storage limits early, and design the trail-sampling rate (see architecture doc) and leaderboard cap accordingly.

## Design risks (not platform risks) to keep an eye on

- **Marker Spam/Throttling**: While predefined tactical markers eliminate profanity and text abuse, players could spam markers. The backend restricts marker placement to one per run per player, caps stored messages to 50 per date key, and automatically deletes old markers using FIFO eviction.
- **Empty-Room Problem**: A judge opening the post fresh on day one would see an empty dungeon. The system pre-seeds the persistent post with labeled mock data (ghosts, markers, runs) to ensure immediate visual feedback.
- **Upvote Scraping Rate Limits (Post-Launch)**: Fetching upvote counts for modifier comment curation could exceed API request limits if performed on demand. The rollover job runs strictly once a day at UTC midnight and caches results.
- **Faction War Skew (Post-Launch)**: If the size of one faction (e.g., Lurkers) is significantly larger than the other, the faction leaderboard will be permanently unbalanced. We normalize scores using *average depth reached per faction attempt* rather than cumulative sums.
- **Rescue Spoofing (Platform Bet)**: Players could forged fake rescue requests to boost their reputation profile scores. The path validator ensures that rescue positions coincide with verified historical tombstones before awarding points.

## Sequence Cut-List (Applying Priority Principle)
1. **[Platform Bet]** (personalization, automated balance pipelines, cross-game integrations) — deferred immediately.
2. **[Post-Launch]** (free-form custom messages, automated comment-to-card parsing, subreddit flairs/badges) — deferred from the hackathon build.
3. **[Hackathon Stretch]** (room heatmaps, named runs, leader's deepest point marker, skippable onboarding overlay) — cut only if Hackathon Critical components require additional stabilization.
4. **Never Cut / [Hackathon Critical]** (seeded dungeon generator, movement engine, traps/guards, daily leaderboard, tactical markers, collective goals) — the non-negotiable proof.
