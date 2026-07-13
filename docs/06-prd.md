# The Daily Descent — Product Requirements Document (PRD)

## 1. Summary

The Daily Descent is a daily-seeded, asynchronous rogue-lite dungeon crawler built on Devvit Web + Phaser for Reddit's Games with a Hook hackathon. Every player in a subreddit plays the same procedurally generated dungeon each day, encounters the ghosts and warnings of players before them, and can contribute cards/traps that shape tomorrow's run. Beyond the hackathon, the product's long-term thesis is that **visible, durable player reputation** — not agentic AI — is the mechanism that turns a single game into something players return to and a subreddit invests in collectively.

This PRD covers three horizons in one document, cross-referenced to the existing design docs so nothing is duplicated:
- **MVP (hackathon submission):** docs 01–04
- **Post-MVP platform vision:** doc 05
- **This document:** ties the two together as a single product spec, states goals/non-goals/success metrics explicitly, and hands off into the roadmap (doc 07) and repo structure (doc 08)

## 2. Problem statement

Reddit hackathon submissions in this space historically cluster around a few overdone patterns (space shooters, r/place clones, trivia apps, collaborative storytelling) that don't create durable reasons to return. Separately, most "AI-powered" game features read as gimmicky or obviously bolted-on, which the hackathon brief explicitly penalizes. The Daily Descent's bet: a well-scoped daily rogue-lite with real community-sourced content and (eventually) a genuine reputation system is a more durable hook than either genre novelty or visible AI.

## 3. Goals

### MVP goals (hackathon)
- Ship a complete, polished, single-session-legible dungeon crawler that works standalone (Tier 0), enhanced by real Reddit-sourced content (Tier 1), reinforced by cheap additive features (Tier 3), and optionally deepened by a community-driven card system (Tier 2) with an invisible quality gate (Tier 4).
- Score well against all five hackathon judging criteria (Delightful UX, Polish, Reddit-y, Hook-y, Phaser Innovation) and at least two sub-awards (Retention Mechanics, User Contributions).
- Be mobile-viewport-correct and self-explanatory to a first-time player within a single session, since judging is largely one play-through of a demo post.

### Post-MVP goals (platform vision)
- Convert the MVP's raw run/contribution data into a visible profile and trend/reputation layer (doc 05, section 1) that gives players a durable reason to keep contributing beyond any single day.
- Mature the comment-to-card pipeline (doc 05, section 3) into something that runs reliably without daily manual oversight.
- Explore (not commit to) whether a personalization layer and, further out, a cross-game identity system are worth pursuing once real usage data exists.

## 4. Non-goals

- **Not building a visible AI agent, chatbot, or assistant character at any horizon.** This is a hard constraint carried through every doc in this project, not just the MVP — see doc 05's guardrails.
- **Not building a player-vs-player or griefing-capable system.** Every mechanic across every tier is either additive-only or has a bounded, non-exploitable failure mode.
- **Not committing to cross-game platform identity (doc 05, section 4) as a planned feature.** It's documented as a labeled speculative vision, not a roadmap item, until a second game and real usage data exist.
- **Not building a persistent player-owned economy or real-money system** at any horizon covered by this PRD.

## 5. Target users

- **Primary:** members of the host subreddit who play casually, once or a few times a day, and may never comment or contribute a card — the core loop (Tier 0–1) must be fully satisfying for this group alone.
- **Secondary:** engaged community members who leave spirit messages, vote on messages, and submit cards (Tier 2–3) — the reputation layer (doc 05 §1) is built primarily for this group's retention.
- **Tertiary (post-MVP):** subreddit moderators, who may care about community health signals (e.g., is the daily content pipeline producing balanced, non-toxic cards) — relevant to doc 05 §3's balance/curation passes, not an MVP concern.

## 6. Success metrics

### MVP (hackathon) — qualitative, since there's no live usage data pre-submission
- Judges can understand the full loop from the demo post alone, without external explanation, within one session.
- The demo post shows real (not obviously synthetic) evidence of the Reddit-native layer working: at least a few real ghost trails, spirit messages, and (if Tier 2 shipped) community-submitted cards.

### Post-MVP — quantitative, once live
- **Day-over-day return rate** (players who play on consecutive days) — the core signal that the daily-seed hook is working.
- **Contribution rate** (% of players who leave a spirit message or submit a card, not just play) — the core signal that the reputation layer (doc 05 §1) is doing its job once built.
- **Card pipeline health** (% of submitted cards passing the whitelist + moderation gate, % of live cards causing balance complaints) — the core signal for whether doc 05 §3's pipeline maturity work is paying off.
- **Profile page engagement** (% of players who visit their own or another player's profile) — the core signal for whether the reputation layer is actually creating the "domino effect" it's designed for, versus being a feature nobody looks at.

## 7. Constraints and dependencies

- Built entirely on Devvit Web + Phaser; every feature is gated by what Devvit's platform actually exposes (see doc 04's validation checklist — this is a hard dependency, not a formality).
- Hackathon deadline is a hard external constraint on the MVP scope; see doc 02's tiered cut-list for exactly what gets dropped under time pressure and in what order.
- Post-MVP work (doc 05) is explicitly gated on the MVP succeeding and generating real usage data — none of it should be started early "just in case," per doc 05's own reasoning.

## 8. Open questions (carried from earlier docs, not yet resolved)

1. Does Devvit support scheduled/triggered jobs for daily seed rotation, or does it need a check-on-load pattern? (doc 04, item 4)
2. Can the app post comments on a player's behalf with proper consent UX, and read comment scores at sufficient freshness? (doc 04, items 2–3)
3. Can the app set Reddit flair for milestone badges? (doc 04, item 5)
4. What are Devvit's storage size/rate limits, and do they comfortably support ghost trail + leaderboard growth at scale? (doc 04, item 7)
5. (Post-MVP) Does Devvit support any form of cross-app/cross-game data sharing, which doc 05 §4 depends on entirely? This has not been investigated at all and should not be assumed either way.

## 9. Document map

| Doc | Purpose |
|---|---|
| `01-core-loop.md` | The gameplay loop and why it maps to judging criteria |
| `02-mvp-scope.md` | Tiered build scope (0–4), build order, cut-list |
| `03-architecture.md` | Devvit Web + Phaser technical architecture for the MVP, tech stack summary |
| `04-risks-and-validation.md` | Platform unknowns to test early, design risks, cut priorities |
| `05-post-mvp-platform-vision.md` | Profile/reputation, personalization, pipeline maturity, cross-game identity — labeled by horizon |
| `06-prd.md` | This document — ties MVP and platform vision into one product spec |
| `07-roadmap.md` | Phased timeline across hackathon, post-launch, and platform horizons |
| `08-repo-structure.md` | Concrete directory/file layout for implementation |
| `09-devops-and-deployment.md` | Repo setup, visibility, branching, Devvit deployment flow, CI, monitoring |
| `10-env-vars.md` | Every environment variable/secret across all phases, `.env.example`, rotation notes |
| `11-testing-strategy.md` | Test priorities, what must pass before submission, what to cut if a test fails late |
