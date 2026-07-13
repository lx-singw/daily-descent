# The Daily Descent

> **A daily rogue-lite dungeon crawl where everyone in the subreddit plays the exact same seed, dies to the ghosts of the players before them, leaves tactical warning markers, and collaborates toward collective community goals.**

---

## 🎮 The Core Gameplay Loop

1. **Midnight Seed Rotation:** A new dungeon layout is generated server-side from a deterministic daily seed. Every player who opens the post on a given day plays the *exact same* layout.
2. **Asynchronous Multi-Player Context:**
   * **Ghost Replays:** Rendered as semi-transparent moving sprites showing where recent players moved and died.
   * **Tactical Warning Markers:** Humorous and informative predefined warnings left by players at their tiles of death (e.g. *"Trap!"*, *"Dead end"*).
   * **Last Survivor Silhouette:** A highlighted silhouette/sprite marking the current daily leader's deepest point reached.
3. **Collective Community Goal:** Every run contributes to a daily collective goal (e.g., *"If 25 players reach Room 5 today, tomorrow's dungeon begins with one extra torch"*), driving daily returns and player cooperation.
4. **Epitaph Statistics:** On death, players select their cause of death from a predefined list (e.g. *"Greed"*, *"Spike Trap"*, *"Guard Corner"*), producing daily community metrics.
5. **Dungeon Descent:** Grid-based movement through procedurally generated rooms (Phaser-rendered). Turn-based action, limited resources, permadeath, and high-tension gameplay.

---

## 🛠️ Architecture & Tech Stack

The application is structured to split logic between a local client-side Phaser webview and the Devvit serverless backend:

```
Reddit Post (Devvit Interactive Post)
  └── Devvit Web App (webview)
        └── Phaser game instance (renders dungeon, handles input/movement)
        └── Client-side game state (current run: position, HP, active light)
  └── Devvit Backend (server-side, via Devvit's platform APIs)
        ├── Seed generator (daily, deterministic UTC Midnight Lazy-Rollover)
        ├── Run storage & RLE Ghost Trails (compressed direction lists)
        ├── Tactical warning markers (FIFO set)
        └── Leaderboard store (combined score: depth reached + duration tie-breaker)
```

* **Frontend Framework:** Phaser (TypeScript) inside a Devvit Webview wrapper for high-fidelity tilemap rendering, animations, and input handling.
* **Backend Framework:** Devvit Web Server (Express routes inside Devvit runtime) managing daily keys, Redis sorted sets/hashes, and Reddit API integrations.

---

## 📂 Repository Structure

The project layout is divided between the Devvit server-side code, client webview assets, and technical documentation:

```
daily-descent/
├── devvit.json            # Devvit app manifest/config
├── package.json
├── tsconfig.json
├── LICENSE
├── README.md              # This file
├── .gitignore
├── .env.example
│
├── src/
│   ├── client/            # Web app running in the Devvit webview
│   │   ├── index.tsx      # App entry point
│   │   ├── game/          # Phaser game engine, scenes, and entities
│   │   └── api/           # Typed client wrapper for Devvit backend API calls
│   │
│   ├── server/            # Devvit backend (server-side logic)
│   │   ├── index.ts       # Devvit app entry and route registration
│   │   ├── routes/        # API route handlers (seeds, runs, leaderboards, markers)
│   │   ├── pipeline/      # Path validation & RLE encoding
│   │   └── storage/       # Key-value wrappers for runs and trails
│   │
│   └── shared/            # Common types and constants shared across client/server
│
├── assets/                # Game sprites, tilesets, UI art, and audio files
├── tests/                 # Determinism, parsing, and daily rollover unit tests
├── scripts/               # Platform validation and demo data seed tools
└── docs/                  # Design documentation and technical specifications
```

---

## 📚 Technical Documentation

For more in-depth architectural and mechanical details, consult the spec sheets in the `docs/` directory:

* [01-core-loop.md](file:///z:/home/lx_singw/projects/daily-descent/docs/01-core-loop.md) — Detailed user-experience flows and loop mechanics.
* [02-mvp-scope.md](file:///z:/home/lx_singw/projects/daily-descent/docs/02-mvp-scope.md) — Scope breakdown across feature horizons and delivery cuts.
* [03-architecture.md](file:///z:/home/lx_singw/projects/daily-descent/docs/03-architecture.md) — Client-server API splits, data definitions, and tech decisions.
* [04-risks-and-validation.md](file:///z:/home/lx_singw/projects/daily-descent/docs/04-risks-and-validation.md) — Platform risk checklist and mitigation strategies.
* [05-post-mvp-platform-vision.md](file:///z:/home/lx_singw/projects/daily-descent/docs/05-post-mvp-platform-vision.md) — Multi-game growth strategy and long-term vision.
* [06-prd.md](file:///z:/home/lx_singw/projects/daily-descent/docs/06-prd.md) — Product requirement document (personas, metrics, balance specs).
* [07-roadmap.md](file:///z:/home/lx_singw/projects/daily-descent/docs/07-roadmap.md) — Full phased timeline from Phase 0 to Phase 4.
* [08-repo-structure.md](file:///z:/home/lx_singw/projects/daily-descent/docs/08-repo-structure.md) — Detailed mapping of files, folders, and components.
* [09-devops-and-deployment.md](file:///z:/home/lx_singw/projects/daily-descent/docs/09-devops-and-deployment.md) — Branch strategies, visibility flips, rollback flows, and CI checks.
* [10-env-vars.md](file:///z:/home/lx_singw/projects/daily-descent/docs/10-env-vars.md) — Source of truth for config keys and environment variables.
* [11-testing-strategy.md](file:///z:/home/lx_singw/projects/daily-descent/docs/11-testing-strategy.md) — Test priority groups, whitelists, and failure closed loops.

---

## 🚀 Getting Started & Test Strategy

### Local Environment Setup
1. Copy `.env.example` to `.env`.
2. Populate the parameters according to your local sandbox properties.

### Run Tests
The testing suite verifies determinism, path validation, speed limits, and day rotation locks using Vitest:
```bash
npm run test
```
