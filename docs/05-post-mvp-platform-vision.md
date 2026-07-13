# The Daily Descent — Post-MVP Platform Vision

**A note on scope and honesty:** this document is deliberately separate from the hackathon build docs (01–04). Nothing here should be read as hackathon scope — the game submitted for judging should remain exactly what's described in those four docs, because the brief explicitly penalizes visible/obvious AI features and rewards a tight, polished, self-explanatory single-session experience. What follows is a genuine longer-term vision, graded honestly by how buildable and how speculative each piece is, so nothing gets oversold.

Each section is labeled with a horizon:
- 🟢 **Near-term** — buildable within weeks of a successful launch, low technical risk
- 🟡 **Mid-term** — buildable, but depends on real usage data or infrastructure not needed for MVP
- 🔴 **Long-term / speculative** — the real vision, but genuinely uncertain and dependent on things outside your control (Devvit platform evolution, actual community growth, whether a second game gets built at all)

---

## 1. Profile, Trend, and Reputation Layer 🟢

This is the strongest, most immediately buildable idea in the whole conversation, and it doesn't need any "agent" framing to work — it just needs the run/contribution data you're already collecting in the MVP to be surfaced back to players in a persistent, personal way.

### Personal profile
- Full run history: every attempt, depth reached, cause of death, date.
- Every spirit message ever left, with a running count of how many subsequent players it visibly helped (e.g., "died in the same spot" avoided, or a simple "was this helpful" tally from Tier 3's spirit message voting).
- Every card ever contributed, with lifetime stats: how many times it's been drafted, how many runs it's contributed to, whether it's still active in rotation or retired.
- Badges/milestones earned (first clear, top-10 finish, most-upvoted spirit message, longest streak).

### Trending / discovery feed
- "Today's deadliest room," "this week's most legendary run," "top contributed card of the month" — surfaced as a lightweight feed on the post or a dedicated profile-adjacent view, visible to the whole community, not just the contributor.
- This is the actual mechanism behind the "domino effect" you're describing: visible reputation is what motivates a new player to leave a spirit message or submit a card, because they can see contributions get seen, credited, and remembered rather than vanishing into a single day's post. Reputation systems are what turn a one-off play session into a reason to keep participating.

### Why this is the highest-value idea in this whole conversation
It requires no new categories of technology — it's a view layer over data your MVP is already generating (run results, spirit messages, card submissions). The "big, inevitable, can't-live-without" quality you're describing doesn't usually come from novel AI — it comes from **visible, durable identity and reputation**, which is a much older and better-understood mechanism (think: Stack Overflow reputation, Reddit karma itself, Duolingo streaks). You already have the raw material for this in Tier 0–3 of the MVP; this section is about surfacing it, not inventing new systems.

### Where this would run
Devvit's storage remains the default here too. Existing AWS credits become relevant only if the trending/discovery feed's aggregation needs (e.g. "deadliest room this week" across a growing history) genuinely exceed what Devvit's storage/query model can support — at which point a small external datastore mirroring aggregated stats (e.g. DynamoDB) is a reasonable, low-effort fallback. See doc 07, Phase 3, for the exact trigger condition.

**Build note:** this can start as genuinely simple — a profile page that's just a filtered view of existing stored data — and grow richer over time. It doesn't require the personalization or pipeline-automation work in sections 2–3 to deliver real value on its own.

---

## 2. Personalization Layer (the legitimate "agentic" feature) 🟡

This is the honest, scoped-down version of "an agent with persistent memory." The key design principle: **it should never be visible as an agent.** No chat interface, no "your AI companion suggests...", no personified assistant. It's a quiet layer that shapes what the game shows a specific returning player, based on their own history.

### What it actually does
- Tracks per-player tendencies from their own run history: which cards they favor, where they tend to die, how cautious vs. reckless their play style reads as (e.g., do they rush or explore fully, do they hoard resources or spend freely).
- Uses that profile to make small, invisible adjustments: which of the available draft cards get shown first, which past ghost trails get surfaced as most relevant to *this* player's likely path, which spirit messages are prioritized (e.g., a player who dies to traps a lot sees trap-warning messages surfaced more prominently).
- None of this changes the actual dungeon layout or difficulty — the daily seed stays identical for everyone, which is a core fairness/hook mechanic from the MVP docs and must not be compromised. Personalization only affects *framing and emphasis* of shared content, never the underlying fairness of the shared challenge.

### Why this is legitimate and worth building eventually
This is real personalization, not a gimmick — it's the same category of thing that makes a recommendation feed feel like it "knows you" over time, applied to a single-player-facing surface instead of a social feed. It's genuinely different from what any of the other Reddit hackathon submissions are likely doing, and it directly serves retention (a game that feels like it's paying attention to you individually is stickier than one that treats every player identically).

### Why it's mid-term, not MVP
It requires enough accumulated per-player history to be useful (a brand-new player has no signal yet), and it requires you to have already built and stabilized the core run-tracking and card systems from Tier 0–2. Building this before the core loop is proven would be solving a problem you don't have real data for yet.

### Where this would run
Devvit's backend storage/compute is the default and should stay the default as long as it's sufficient. If the tendency model and emphasis engine ever outgrow what Devvit's backend can comfortably run inline, existing AWS credits (e.g. a small Lambda function Devvit calls out to) are the fallback — but per the roadmap (doc 07, Phase 5), this move should only happen once Devvit's limits are concretely hit, not anticipated in advance.

**Guardrail carried over from the hackathon risk doc:** never surface this as a visible "AI" feature. If it's ever mentioned to players at all, it should read as "the game remembers you play cautiously" — plain language, not "your AI companion has learned your preferences."

---

## 3. Self-Running Content Pipeline (the honest version of "workflow automation") 🟡

This is the mature, operational version of the Tier 2/Tier 4 comment-to-card pipeline from the MVP scope doc — not a new category of feature, but that same pipeline maturing from "works for a hackathon demo" to "runs reliably without you watching it every day."

### The pipeline, end to end, at maturity
1. Comments submitted in the `[Card] Name: Effect` format get parsed (existing Tier 2 whitelist parser).
2. A moderation pass (the Tier 4 Gemini-based gate, via Google AI Studio / Vertex AI on the existing Google Ultra plan) flags anything technically well-formatted but exploitative, nonsensical, or off-tone.
3. A **balance pass** — genuinely new at this stage — checks a proposed card against the current draft pool's actual in-game performance data (is a similar effect already overused, is the numeric range within historical norms) rather than just checking format validity.
4. A **curation pass** — also new — selects which validated, balanced cards actually enter tomorrow's pool if there are more good submissions than slots, rather than defaulting to pure upvote-count.
5. Results feed back: which cards got drafted, which performed well (associated with successful runs) or poorly, informing the balance pass's judgment the next day.

This is what "automating a workflow end-to-end" honestly means for your specific product: a pipeline with multiple sequential quality gates, each doing one narrow job, feeding results back into the next day's decisions — not "agents negotiating with each other," which was never a real mechanism to begin with, just a way of describing sequential automated stages.

### Why this matters, stated plainly
Right now (per the risk doc), Tier 2 is explicitly your highest-risk, most cuttable tier because a bad card can silently unbalance the game. A mature pipeline is what makes Tier 2 something you'd trust to run unattended for months, rather than something you nursemaid daily. That's a legitimate, valuable engineering goal — it's just not an MVP-week goal.

### Why it's mid-term, not MVP
The balance and curation passes need real historical performance data to have anything to reason about — there's no "balance history" on day one. Building this before you have weeks of real card-performance data would mean building a system that has nothing real to calibrate against.

---

## 4. Cross-Game Platform Identity 🔴

This is the genuine long-term vision, and it's the part of your original ask that's real but should be labeled clearly as speculative, because it depends on things outside this project's control: whether the game succeeds enough to justify a second title, whether Devvit's platform supports cross-app identity/data sharing in the way this needs, and whether the community actually wants this (rather than it being assumed on their behalf).

### The idea, stated honestly
If The Daily Descent succeeds and a second Devvit game gets built, a shared player identity — reputation, badges, contribution history — that carries across titles is what would turn "a game" into "a platform" in the sense you're describing. A player's Daily Descent reputation could unlock something in a second game, or a unified profile could show activity across every game you've built on Devvit. This is the actual mechanism behind the "domino effect" and "inevitable, can't-live-without" quality at platform scale, not personalization or agent tech — it's identity and reputation portability across an ecosystem.

### Why this is correctly labeled speculative
- It assumes a second game gets built at all, which depends entirely on whether the first one succeeds.
- It assumes Devvit's platform supports the kind of cross-app data-sharing this needs — this is genuinely unknown and would need its own dedicated technical validation, similar in spirit to the Devvit unknowns already flagged in the hackathon risk doc, but for a capability well beyond a single app's scope.
- It assumes the community actually wants a unified identity across multiple games rather than experiencing it as unwanted platform lock-in — this is a real design question, not a given, and should be validated with actual players rather than assumed.

**Honest framing for this section, if you ever pitch it to anyone:** this is a vision to work toward if section 1 (profiles/reputation) proves out and a second title gets greenlit — not a promise, and not something to design *for* right now. The right move today is to build section 1 well enough that this becomes a natural next question, not to architect for it prematurely.

---

## How the four sections relate to each other

Section 1 (profiles/reputation) is the foundation everything else depends on — it's also the only one that's genuinely near-term and low-risk. Sections 2 and 3 (personalization, pipeline maturity) are real engineering investments that make sense *after* section 1 is live and generating real data to work from. Section 4 (cross-game identity) is the actual "big vision" you're reaching for, but it's honestly a bet on future success, not a thing to build toward now — the way to earn the option to pursue it is by nailing section 1 first.

If forced to rank these by "which one thing would most convincingly make this feel like a platform rather than a single hackathon game": it's section 1, by a wide margin. Reputation and visible history are what make people come back and contribute more than the game mechanics alone ever will — and it's the one piece of this entire vision you could realistically start building the week after the hackathon ends.
