# The Daily Descent — Roadmap

This roadmap spans three horizons: the hackathon build itself, the immediate post-launch period, and the longer platform vision. Each phase states its entry criteria (what must be true before starting it) so nothing here gets pursued prematurely — this is a direct continuation of the horizon-labeling discipline from doc 05.

---

## Phase 0: Pre-build validation (before writing game code)

**Entry criteria:** none — do this first.

- Work through doc 04's validation checklist items 1–4 and 7 (storage persistence, comment reading, comment posting, scheduled jobs, storage limits) against the real Devvit platform.
- Confirm mobile webview rendering basics work in a throwaway Devvit Web + Phaser test app before committing to the full build.

**Exit criteria:** you know, concretely, which of Tier 0–4 (doc 02) are actually buildable on Devvit as designed, and have adjusted the MVP scope doc if any assumption failed.

---

## Phase 1: Hackathon MVP build

**Entry criteria:** Phase 0 complete.

- **Tier 0** (core dungeon, movement, death loop, leaderboard, daily reset) — the non-negotiable floor.
- **Tier 1** (spirit messages, ghost replays, ambient comment surfacing) — the Reddit-native layer.
- **Tier 3** (death cause tagging, community stat summary, spirit message voting, flair milestones, weekly meta-layer) — cheap reinforcement, prioritized ahead of Tier 2 per doc 02's build order.
- **Tier 2** (comment-derived draft cards) — only if time allows after Tiers 0/1/3 are solid.
- **Tier 4** (LLM moderation gate) — only if Tier 2 shipped and is stable.
- Polish pass: mobile viewport correctness, onboarding beat, demo post seeded with planted ghosts/messages/cards (doc 04's submission-prep notes).

**Exit criteria:** hackathon submission — app listing + demo post link, submitted by deadline.

---

## Phase 2: Post-submission stabilization (first 2–4 weeks after hackathon, regardless of placing)

**Entry criteria:** hackathon submitted; game is live on at least one subreddit.

- Fix whatever broke under real usage that a hackathon timeline didn't surface (edge cases in comment parsing, storage limits under real load, mobile issues from real device diversity).
- If Tier 2/4 didn't ship for the hackathon, this is the point to finish them properly, now with real comment volume to test the parser and moderation gate against — rather than synthetic test data.
- Start capturing the success metrics defined in the PRD (doc 06 §6) even in their simplest form (a spreadsheet counting return rate is fine at this stage — don't over-build tooling before you know what's worth tracking). Existing AWS credits are not needed yet at this stage — Devvit's storage is sufficient for simple metric counting; only reach for AWS once metrics tooling genuinely outgrows that (see Phase 3–4 notes below).

**Exit criteria:** Tier 0–4 all shipped and stable under real usage; you have at least 2–4 weeks of real return-rate and contribution-rate data.

---

## Phase 3: Reputation layer (doc 05 §1) — the first real post-MVP investment

**Entry criteria:** Phase 2 exit criteria met, AND contribution rate data suggests players who do contribute (spirit messages, cards) would plausibly want to see their own history reflected back (a low or declining contribution rate might mean this isn't the right next investment — check the data rather than assuming).

- Build the personal profile page as a straightforward view over existing stored data (run history, spirit messages left, cards contributed, badges).
- Build the trending/discovery feed (deadliest room today, most legendary run this week, top contributed card this month).
- This phase deliberately does **not** require any new backend systems beyond what Phase 1–2 already built — it's a presentation-layer investment, which is why it's sequenced first among the post-MVP ideas.

**Exit criteria:** profile and trending views are live; profile page engagement (doc 06 §6) is being tracked. If Devvit's storage/query capabilities prove too limited for the kind of aggregation a trending feed needs at scale, this is the point where standing up a small external datastore (e.g. DynamoDB, using existing AWS credits) to mirror aggregated stats becomes worth considering — not before, and only if the need is concrete rather than anticipated.

---

## Phase 4: Pipeline maturity (doc 05 §3)

**Entry criteria:** Phase 2 exit criteria met, AND enough real card submission/performance history exists for a balance pass to have something meaningful to reason about (this likely needs longer than Phase 3's entry bar — weeks to months of real card rotation, not just weeks of general play).

- Add the balance pass (checking proposed cards against actual in-game performance data of similar existing cards).
- Add the curation pass (selecting among validated submissions when supply exceeds available slots, rather than defaulting to raw upvote count).
- This phase can run in parallel with Phase 3 — they don't depend on each other — but both depend on Phase 2's stabilization being genuinely complete, not just "the hackathon version working."
- The Gemini-based moderation gate (Tier 4) is a direct input to the balance pass here — if Gemini's classification calls need to run more frequently or at higher volume than the daily job in the MVP, this is the point to evaluate whether that workload is still comfortable inside Devvit's backend or whether it's worth moving to an external process (e.g. AWS Lambda, using existing credits) that Devvit calls out to instead.

**Exit criteria:** the comment-to-card pipeline runs reliably without daily manual review; card pipeline health metrics (doc 06 §6) are being tracked and trending acceptably.

---

## Phase 5: Personalization layer (doc 05 §2)

**Entry criteria:** Phase 3 complete (profile/reputation data model exists) AND enough per-player run history has accumulated for personalization to have real signal to work from — this is explicitly not a Phase 1–2 item because a new player has no history to personalize against yet.

- Build the per-player tendency tracking (card preferences, death patterns, play style) as a backend-only signal.
- Use it to adjust which draft cards, ghost trails, and spirit messages get emphasized for a returning player — never the underlying shared daily seed or difficulty.
- Explicitly re-verify at this stage that nothing here is surfaced as a visible "AI" feature, per the guardrail carried through every doc in this project.
- If per-player tendency modeling grows heavier than Devvit's backend can comfortably run inline, this is the point to consider hosting that computation externally (e.g. AWS Lambda, using existing credits), with Devvit's backend calling out to it — not before, and only once Devvit's own limits are concretely hit rather than assumed.

**Exit criteria:** personalization is live and measurably improving retention for returning players versus a control group, without any player-facing "AI" framing.

---

## Phase 6: Cross-game platform identity (doc 05 §4) — speculative, not committed

**Entry criteria:** ALL of the following, none of which are guaranteed to happen:
- The Daily Descent has succeeded enough (by whatever metrics matter to you — placing in the hackathon is not required, but sustained real usage is) to justify building a second Devvit game at all.
- A second game is actually greenlit and in development.
- Devvit's platform is confirmed (not assumed) to support cross-app identity or data sharing in some form.
- Community sentiment (validated with actual players, not assumed) supports a unified identity across multiple games rather than experiencing it as unwanted platform lock-in.

- **This phase has no build tasks defined yet, on purpose.** Doc 05 §4 is explicit that this should not be designed for prematurely. If and when entry criteria are met, this phase should start with its own scoping discussion, not by resuming a plan written before any of the above was known.

---

## Summary timeline view

| Phase | Depends on | Nature |
|---|---|---|
| 0. Pre-build validation | Nothing | Required, immediate |
| 1. Hackathon MVP | Phase 0 | Required, deadline-bound |
| 2. Post-submission stabilization | Phase 1 | Required |
| 3. Reputation layer | Phase 2 + contribution data | Recommended, high-confidence |
| 4. Pipeline maturity | Phase 2 + card history | Recommended, medium-confidence |
| 5. Personalization layer | Phase 3 + per-player history | Exploratory, medium-confidence |
| 6. Cross-game identity | Multiple unmet conditions | Speculative, not planned |
