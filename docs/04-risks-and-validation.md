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

- **Griefing via spirit messages:** even with consent-based posting, someone could leave a deliberately unhelpful or troll message. Low stakes since it's just flavor text, not game-state-altering — but worth a lightweight report/hide mechanism if time allows.
- **Draft pool power creep (Tier 2 only):** the whitelist-only, numeric-parameter approach in the architecture doc is your main defense here. Don't loosen this under time pressure — an exploited or broken card showing up during judging is worse than not having Tier 2 at all.
- **Empty-room problem early in the day:** if very few people have played yet, there won't be many ghosts or spirit messages to populate the dungeon with. The architecture doc's plan to seed ambient spirit messages from top comments (not just death events) is the mitigation — make sure this works even with a near-empty leaderboard, since judges may play early in a given day's cycle.

## Submission-prep tasks (not game features — do these before judging, regardless of build tier reached)

- **Seed your own demo post with test data.** Judging is largely a single play session on your demo link. If a judge opens the post on effectively "day one" with no accumulated ghosts, spirit messages, or comment-cards, the dungeon will look empty regardless of how good the systems are. Before submitting, populate your demo post yourself with a handful of planted ghost trails, spirit messages, and (if Tier 2 shipped) draft cards. This is submission prep, not a game feature — make sure it's clearly your own test data and not misrepresented as organic community activity.
- **Add a short, skippable onboarding beat on first load.** One or two lines explaining the daily-seed/ghosts/spirit-message concept in plain language. This loop has enough moving parts (shared seed, ghost replays, spirit messages, draft pool) that a first-time judge benefits from a five-second frame before diving in — the brief explicitly calls out that the experience should be self-explanatory from the demo link alone.

## Cut-list summary
1. Tier 4 (AI moderation gate) — first to go; it's a refinement, not core functionality, and only relevant if Tier 2 shipped anyway.
2. Tier 2 (comment-derived draft cards) — entire tier, next to go.
3. Tier 3.5 identity/rhythm deepeners (items 19–23) — cut in reverse order listed (23 → 19); cheap individually, keep as many as time allows.
4. Tier 3 reinforcement features (items 13–17) — cut in reverse order listed (17 → 13); these are cheap individually, so keep as many as time allows, but none are load-bearing.
5. Ghost replay trails (Tier 1, item 8) — keep spirit messages (item 7/9), which are cheaper to build and arguably more Reddit-y, if you can only keep one.
6. Leaderboard polish (keep the leaderboard functioning, but simplify the UI/sorting/tiebreak logic if needed).
7. Never cut: the core dungeon generation, movement, and death loop (Tier 0) — this is the floor below which there's no game to submit.
