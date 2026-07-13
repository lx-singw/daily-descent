# The Daily Descent

> **A daily rogue-lite dungeon crawl where everyone in the subreddit plays the exact same seed, dies to the ghosts and comments of the players before them, and votes tomorrow's traps and cards into existence from today's run.**

---

## 🎮 The Core Gameplay Loop

1. **Midnight Seed Rotation:** A new dungeon layout is generated server-side from a deterministic daily seed. Every player who opens the post on a given day plays the *exact same* layout.
2. **Asynchronous Multi-Player Context:**
   * **Ghost Replays:** Rendered as semi-transparent moving sprites showing where recent players moved and died.
   * **Spirit Messages:** Warning messages left by fallen players at their location of death, or pulled from top comments.
3. **Card Selection:** Players choose a starting card loadout from today's draft pool (modifiers/abilities) to customize their play style before descending.
4. **Dungeon Descent:** Grid-based movement through procedurally generated rooms (Phaser-rendered). Turn-based action, limited resources, permadeath, and high-tension gameplay.
5. **Post-Mortem Contribution:**
   * On death, players can leave a **Spirit Message** (posted as a Reddit comment and anchored visually at their death coordinates for subsequent players).
   * Upvoted comment suggestions matching a simple pattern (e.g., `[Card] Vampire Fangs: heal 2 HP on hit`) undergo regex validation and LLM verification to become part of tomorrow's draft pool.

---

## 🛠️ Architecture & Tech Stack

The application is structured to split logic between a local client-side game wrapper and the Reddit serverless platform:

```
Reddit Post (Devvit Interactive Post)
  └── Devvit Web App (webview)
        └── Phaser game instance (renders dungeon, handles input/movement)
        └── Client-side game state (current run: position, HP, cards held)
  └── Devvit Backend (server-side, via Devvit's platform APIs)
        ├── Seed generator (daily, deterministic)
        ├── Run storage (per-player run results: depth, time, death location)
        ├── Comment reader (pulls top comments from the post)
        ├── Comment writer (posts spirit messages as comments on behalf of player, with consent)
        └── Leaderboard store (today's seed's run results, sorted)
```

* **Frontend Framework:** Phaser (TypeScript) inside a Devvit Webview wrapper for high-fidelity tilemap rendering, animations, and input handling.
* **Backend Framework:** Devvit's server-side platform APIs managing daily cron/checking triggers, Reddit authentication, and persistent Key-Value storage.
* **Moderation & Whitelist Parser:** A strict formatting regex validation paired with a lightweight **Gemini** (Google AI Studio / Vertex AI) moderation check to keep user-generated cards clean and balanced.
* **Infrastructure Strategy:** Zero external cloud hosting dependencies in the MVP to minimize latency and leverage Reddit's native hosting bounds.

---

## 📂 Repository Structure

The project layout is divided between the Devvit server-side code, client webview assets, and technical documentation:

```
daily-descent/
├── devvit.yaml            # Devvit app manifest/config
├── package.json
├── tsconfig.json
├── LICENSE
├── README.md              # This file
│
├── src/
│   ├── client/            # Web app running in the Devvit webview
│   │   ├── index.tsx      # App entry point
│   │   ├── game/          # Phaser game engine, scenes, and entities
│   │   └── api/           # Typed client wrapper for Devvit backend API calls
│   │
│   ├── server/            # Devvit backend (server-side logic)
│   │   ├── index.ts       # Devvit app entry and route registration
│   │   ├── routes/        # API route handlers (seeds, runs, leaderboards)
│   │   ├── pipeline/      # User-submitted card parsing and AI moderation
│   │   ├── storage/       # Key-value wrappers for run and trail history
│   │   └── reddit/        # Devvit Reddit API integrations (comments, flair)
│   │
│   └── shared/            # Common types and constants shared across client/server
│
├── assets/                # Game sprites, tilesets, UI art, and audio files
├── tests/                 # Determinism, parsing, and daily rollover unit tests
├── scripts/               # Platform validation and demo data seed tools
└── docs/                  # Design documentation and technical specifications
```

---

## 🗺️ Product Roadmap

Development is structured into prioritized milestones to manage risk and validate key platform capabilities iteratively:

* **Phase 0: Pre-Build Validation:** Verify Devvit Key-Value storage, comment posting/reading, scheduled jobs, and basic Phaser mobile webview rendering.
* **Phase 1: Hackathon MVP:** Build core gameplay (movement, hazards, death, daily reset), native Reddit integrations (spirit messages, ghost trails), and basic leaderboards.
* **Phase 2: Post-Submission Stabilization:** Real-world testing, bug fixing, and completing the automated comment-to-card compilation loop.
* **Phase 3: Reputation Layer:** Introduce user profile pages and trending/discovery feeds for community-wide stats.
* **Phase 4: Pipeline Maturity:** Refine moderation passes, card balancing algorithms, and curation flows.
* **Phase 5: Personalization:** Emphasize relevant cards and trails based on individual player history (without altering the shared seed).

---

## 📚 Technical Documentation

For more in-depth architectural and mechanical details, consult the spec sheets in the `docs/` directory:

* [01-core-loop.md](file:///z:/home/lx_singw/projects/daily-descent/docs/01-core-loop.md) — Detailed user-experience flows and loop mechanics.
* [02-mvp-scope.md](file:///z:/home/lx_singw/projects/daily-descent/docs/02-mvp-scope.md) — Scope breakdown across feature tiers and delivery cuts.
* [03-architecture.md](file:///z:/home/lx_singw/projects/daily-descent/docs/03-architecture.md) — Client-server API splits, data definitions, and tech decisions.
* [04-risks-and-validation.md](file:///z:/home/lx_singw/projects/daily-descent/docs/04-risks-and-validation.md) — Platform risk checklist and mitigation strategies.
* [05-post-mvp-platform-vision.md](file:///z:/home/lx_singw/projects/daily-descent/docs/05-post-mvp-platform-vision.md) — Multi-game growth strategy and long-term vision.
* [07-roadmap.md](file:///z:/home/lx_singw/projects/daily-descent/docs/07-roadmap.md) — Full phased timeline from Phase 0 to Phase 6.
* [08-repo-structure.md](file:///z:/home/lx_singw/projects/daily-descent/docs/08-repo-structure.md) — Detailed mapping of files, folders, and components.
