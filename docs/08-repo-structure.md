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
│   ├── client/                          # [Hackathon Critical] Web app running in the Devvit webview
│   │   ├── index.tsx                    # App entry point
│   │   ├── game/                        # Phaser game code
│   │   │   ├── main.ts                  # Phaser game instance bootstrap
│   │   │   ├── scenes/
│   │   │   │   ├── BootScene.ts         # Asset loading, seed fetch
│   │   │   │   ├── DungeonScene.ts      # Core gameplay: movement, combat, tilemap
│   │   │   │   ├── DraftScene.ts        # [Post-Launch] Card selection screen
│   │   │   │   └── ResultScene.ts       # Death/win screen, leaderboard, marker prompt
│   │   │   ├── entities/
│   │   │   │   ├── Player.ts
│   │   │   │   ├── Enemy.ts
│   │   │   │   ├── Trap.ts
│   │   │   │   └── GhostTrail.ts        # [Hackathon Critical] Replay rendering
│   │   │   ├── generation/
│   │   │   │   └── DungeonGenerator.ts  # Deterministic seeded generation
│   │   │   └── ui/
│   │   │       ├── HUD.ts
│   │   │       ├── Leaderboard.ts
│   │   │       ├── TacticalMarkerOverlay.ts  # [Hackathon Critical] Preset death warnings
│   │   │       ├── CommunityGoalBanner.ts    # [Hackathon Critical] Daily collective goal progression
│   │   │       └── OnboardingTooltip.ts      # [Hackathon Stretch] first-load explainer
│   │   ├── profile/                     # [Post-Launch] Profile & trending views
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── TrendingFeed.tsx
│   │   │   └── BadgeDisplay.tsx
│   │   └── api/
│   │       └── client.ts                # Typed wrapper for calling the Devvit backend
│   │
│   ├── server/                          # [Hackathon Critical] Devvit backend
│   │   ├── index.ts                     # Devvit app entry, route registration
│   │   ├── routes/
│   │   │   ├── seed.ts                  # [Hackathon Critical] GET today's seed with locking lock

│   │   │   ├── run.ts                   # [Hackathon Critical] POST run result (depth, duration, outcome, trail)
│   │   │   ├── leaderboard.ts           # [Hackathon Critical] GET daily leaderboard
│   │   │   ├── tacticalMarker.ts        # [Hackathon Critical] POST/GET tactical warning markers
│   │   │   ├── flair.ts                 # [Post-Launch] Award milestone flair
│   │   │   └── profile.ts               # [Post-Launch] GET a player's profile data
│   │   ├── generation/
│   │   │   └── seedRotation.ts          # [Hackathon Critical] Lazy seed generation and lock check
│   │   ├── pipeline/                    # Validation, curation, and moderation pipeline
│   │   │   ├── pathValidator.ts         # [Hackathon Critical] Abuse prevention, speed thresholds, collisions
│   │   │   ├── whitelistParser.ts       # [Post-Launch] Strict format + numeric whitelist matcher
│   │   │   ├── moderationGate.ts        # [Post-Launch] Gemini-based quality check
│   │   │   ├── balancePass.ts           # [Platform Bet] Checks proposed cards against performance history
│   │   │   └── curationPass.ts          # [Platform Bet] Selects among validated submissions when oversupplied
│   │   ├── personalization/             # [Platform Bet]
│   │   │   ├── playerTendencyModel.ts   # Tracks per-player tendencies
│   │   │   └── emphasisEngine.ts        # Adjusts content weights dynamically
│   │   ├── storage/
│   │   │   ├── runStore.ts              # [Hackathon Critical] Daily runs, leaderboard, and RLE ghost trails
│   │   │   ├── tacticalMarkerStore.ts   # [Hackathon Critical] Predefined death markers and limits
│   │   │   ├── cardStore.ts             # [Post-Launch] Draft pool and card statistics
│   │   │   └── profileStore.ts          # [Post-Launch] Aggregated profile data
│   │   └── reddit/
│   │       ├── commentWriter.ts         # [Hackathon Critical] Posts formatted comments, runAs: USER
│   │       └── flairWriter.ts           # [Post-Launch] Sets player flair milestones
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

- **`server/pipeline/` is split into multiple files even though many are deferred to `[Post-Launch]` or `[Platform Bet]`.** This is deliberate — the balance and curation passes plug into the same pipeline interface later without restructuring the folder, since they're sequential stages over the same data.
- **`server/personalization/` exists as an empty/stub folder until `[Platform Bet]`.** Scaffolding it early can help if you want the shared types (`shared/types.ts`) to anticipate it, but no logic should be implemented here before the long-term roadmap.
- **`scripts/validate-devvit-platform.ts` corresponds to `[Hackathon Critical]` smoke-testing** and should be the very first thing run — it's the executable form of doc 04's validation checklist.
- **`scripts/seed-demo-data.ts` exists specifically for the submission-prep tactic** from doc 04 (planting believable demo content so a judge opening the post fresh doesn't hit an empty dungeon) — keep this clearly separated from production data paths so seeded/test content is never confused with real player activity.
- **`shared/cardEffectWhitelist.ts` is called out specifically** because both the parser and the moderation gate (deferred to `[Post-Launch]`) need to agree on what's allowed — this should be one file both import from, not duplicated logic.

## Tech stack, by layer (see `03-architecture.md` for full rationale)

- **Platform/hosting:** Devvit Web — required by the hackathon, runs client and server on Reddit's infrastructure. No external hosting in the MVP.
- **Rendering:** Phaser (TypeScript).
- **Storage (MVP):** Devvit Redis.
- **Reddit integration:** Devvit's Reddit API access (comments, flair, User Actions).
- **Moderation gate (Tier 4 only):** Gemini via Google AI Studio / Vertex AI (existing Google Ultra plan) — a small structured classification call, paired with (never replacing) the hard whitelist parser. Outbound domains must be configured in `devvit.json`.
- **Post-MVP analytics infra (Phase 3–4, speculative):** AWS (existing credits) — only if Devvit's storage proves insufficient once real usage data exists to analyze. Not part of MVP scope; see `07-roadmap.md`.
- **Post-MVP personalization compute (Phase 5, speculative):** AWS Lambda or equivalent (existing credits) — only if per-player tendency modeling outgrows Devvit's backend. Not part of MVP scope.

No AWS-specific folders or configuration appear in the MVP directory tree above by design — see `03-architecture.md`'s tech stack summary for why AWS is deliberately held in reserve for later phases rather than wired in now.
