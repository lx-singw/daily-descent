# The Daily Descent — Repository Structure

This is a concrete directory layout for implementation, structured around Devvit Web's client/server split (see `03-architecture.md`). Sections are marked by the phase (from `07-roadmap.md`) in which they're first introduced, so the repo can be scaffolded minimally at MVP time and grow into later phases without restructuring.

```
daily-descent/
├── devvit.json                          # Devvit app manifest/config
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── client/                          # [Phase 1] Web app running in the Devvit webview
│   │   ├── index.tsx                    # App entry point
│   │   ├── game/                        # Phaser game code
│   │   │   ├── main.ts                  # Phaser game instance bootstrap
│   │   │   ├── scenes/
│   │   │   │   ├── BootScene.ts         # Asset loading, seed fetch
│   │   │   │   ├── DungeonScene.ts      # Core gameplay: movement, combat, tilemap
│   │   │   │   ├── DraftScene.ts        # [Phase 1, Tier 2 if shipped] Card selection screen
│   │   │   │   └── ResultScene.ts       # Death/win screen, leaderboard, spirit message prompt
│   │   │   ├── entities/
│   │   │   │   ├── Player.ts
│   │   │   │   ├── Enemy.ts
│   │   │   │   ├── Trap.ts
│   │   │   │   └── GhostTrail.ts        # [Phase 1, Tier 1] Replay rendering
│   │   │   ├── generation/
│   │   │   │   └── DungeonGenerator.ts  # Deterministic seeded generation, runs client-side
│   │   │   └── ui/
│   │   │       ├── HUD.ts
│   │   │       ├── Leaderboard.ts
│   │   │       ├── SpiritMessageOverlay.ts   # [Phase 1, Tier 1]
│   │   │       ├── CommunityStatBanner.ts    # [Phase 1, Tier 3]
│   │   │       └── OnboardingTooltip.ts      # [Phase 1] first-load explainer
│   │   ├── profile/                     # [Phase 3] Profile & trending views
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── TrendingFeed.tsx
│   │   │   └── BadgeDisplay.tsx
│   │   └── api/
│   │       └── client.ts                # Typed wrapper for calling the Devvit backend
│   │
│   ├── server/                          # [Phase 1] Devvit backend (server-side logic)
│   │   ├── index.ts                     # Devvit app entry, route registration
│   │   ├── routes/
│   │   │   ├── seed.ts                  # [Phase 1] GET today's seed; generates+stores if new day
│   │   │   ├── run.ts                   # [Phase 1] POST run result (depth, time, death location, trail)
│   │   │   ├── leaderboard.ts           # [Phase 1] GET today's sorted leaderboard
│   │   │   ├── spiritMessage.ts         # [Phase 1, Tier 1] POST spirit message (+ Reddit comment)
│   │   │   ├── comments.ts              # [Phase 1, Tier 1] GET top comments for ambient messages
│   │   │   ├── cards.ts                 # [Phase 1, Tier 2] GET today's draft pool
│   │   │   ├── cardSubmission.ts        # [Phase 1, Tier 2] Parses comments into card candidates
│   │   │   ├── flair.ts                 # [Phase 1, Tier 3] Award milestone flair
│   │   │   └── profile.ts               # [Phase 3] GET a player's full profile data
│   │   ├── generation/
│   │   │   └── seedRotation.ts          # [Phase 1] Daily seed generation job (or check-on-load)
│   │   ├── pipeline/                    # Comment-to-card processing pipeline
│   │   │   ├── whitelistParser.ts       # [Phase 1, Tier 2] Strict format + numeric whitelist matcher
│   │   │   ├── moderationGate.ts        # [Phase 1, Tier 4] Gemini-based quality check (invisible, backend-only)
│   │   │   ├── balancePass.ts           # [Phase 4] Checks proposed cards against performance history
│   │   │   └── curationPass.ts          # [Phase 4] Selects among validated submissions when oversupplied
│   │   ├── personalization/             # [Phase 5]
│   │   │   ├── playerTendencyModel.ts   # Tracks per-player card/death/style signal
│   │   │   └── emphasisEngine.ts        # Adjusts which cards/trails/messages surface per player
│   │   ├── storage/
│   │   │   ├── keyValueStore.ts         # [Phase 1] Thin wrapper over Devvit's storage APIs
│   │   │   ├── runStore.ts              # [Phase 1] Per-seed run results
│   │   │   ├── ghostTrailStore.ts       # [Phase 1, Tier 1] Capped recent-trail storage
│   │   │   ├── cardStore.ts             # [Phase 1, Tier 2] Draft pool + card lifetime stats
│   │   │   ├── profileStore.ts          # [Phase 3] Aggregated per-player profile data
│   │   │   └── pipelineHistoryStore.ts  # [Phase 4] Card performance history for balance pass
│   │   └── reddit/
│   │       ├── commentReader.ts         # [Phase 1] Reads comments + scores via Devvit's Reddit API
│   │       ├── commentWriter.ts         # [Phase 1] Posts spirit messages as comments, with consent
│   │       └── flairWriter.ts           # [Phase 1, Tier 3] Sets player flair for milestones
│   │
│   └── shared/                          # Types/constants shared between client and server
│       ├── types.ts                     # RunResult, Card, SpiritMessage, PlayerProfile, etc.
│       ├── constants.ts                 # Whitelist effect types, storage caps, tier flags
│       └── cardEffectWhitelist.ts       # [Phase 1, Tier 2] Single source of truth for allowed card effects
│
├── assets/
│   ├── sprites/
│   ├── tilesets/
│   ├── audio/
│   └── ui/
│
├── tests/
│   ├── client/
│   │   └── generation/
│   │       └── DungeonGenerator.test.ts # Determinism tests: same seed → same layout
│   ├── server/
│   │   ├── pipeline/
│   │   │   ├── pathValidator.test.ts    # Abuse prevention, timing limits, collisions
│   │   │   ├── whitelistParser.test.ts  # Format validation, whitelist enforcement (Tier 2)
│   │   │   └── moderationGate.test.ts   # Mocked Gemini responses, edge cases (Tier 4)
│   │   └── routes/
│   │       └── seedRotation.test.ts     # Rollover lock races, rollover overlap validation
│   └── fixtures/
│       └── sampleComments.json          # Test data for parser/moderation tests
│
├── scripts/
│   ├── seed-demo-data.ts                # [Phase 1] Populates a fresh demo post with planted ghosts/
│   │                                     #           messages/cards for judging (per doc 04's submission-prep note)
│   └── validate-devvit-platform.ts      # [Phase 0] Smoke-tests storage, comment read/write, flair APIs
│                                          #           against the real platform — run this FIRST
│
└── docs/                                # This document set
    ├── 01-core-loop.md
    ├── 02-mvp-scope.md
    ├── 03-architecture.md
    ├── 04-risks-and-validation.md
    ├── 05-post-mvp-platform-vision.md
    ├── 06-prd.md
    ├── 07-roadmap.md
    └── 08-repo-structure.md             # This file
```

## Notes on structure decisions

- **`server/pipeline/` is split into four files even though only two (`whitelistParser.ts`, `moderationGate.ts`) are MVP scope.** This is deliberate — the balance and curation passes (Phase 4) plug into the same pipeline interface later without restructuring the folder, since they're sequential stages over the same data.
- **`server/personalization/` exists as an empty/stub folder until Phase 5.** Scaffolding it early (even as empty files with interfaces defined) can help if you want the shared types (`shared/types.ts`) to anticipate it, but no logic should be implemented here before Phase 5's entry criteria (doc 07) are met.
- **`scripts/validate-devvit-platform.ts` corresponds to Phase 0 and should be the very first thing written**, before any game code — it's the executable form of doc 04's validation checklist.
- **`scripts/seed-demo-data.ts` exists specifically for the submission-prep tactic** from doc 04 (planting believable demo content so a judge opening the post fresh doesn't hit an empty dungeon) — keep this clearly separated from production data paths so seeded/test content is never confused with real player activity.
- **`shared/cardEffectWhitelist.ts` is called out specifically** because both `whitelistParser.ts` (Tier 2) and `moderationGate.ts` (Tier 4) need to agree on what's allowed — this should be one file both import from, not duplicated logic, to avoid the whitelist and the moderation gate ever disagreeing on what's a valid card.

## Tech stack, by layer (see `03-architecture.md` for full rationale)

- **Platform/hosting:** Devvit Web — required by the hackathon, runs client and server on Reddit's infrastructure. No external hosting in the MVP.
- **Rendering:** Phaser (TypeScript).
- **Storage (MVP):** Devvit Redis.
- **Reddit integration:** Devvit's Reddit API access (comments, flair, User Actions).
- **Moderation gate (Tier 4 only):** Gemini via Google AI Studio / Vertex AI (existing Google Ultra plan) — a small structured classification call, paired with (never replacing) the hard whitelist parser. Outbound domains must be configured in `devvit.json`.
- **Post-MVP analytics infra (Phase 3–4, speculative):** AWS (existing credits) — only if Devvit's storage proves insufficient once real usage data exists to analyze. Not part of MVP scope; see `07-roadmap.md`.
- **Post-MVP personalization compute (Phase 5, speculative):** AWS Lambda or equivalent (existing credits) — only if per-player tendency modeling outgrows Devvit's backend. Not part of MVP scope.

No AWS-specific folders or configuration appear in the MVP directory tree above by design — see `03-architecture.md`'s tech stack summary for why AWS is deliberately held in reserve for later phases rather than wired in now.
