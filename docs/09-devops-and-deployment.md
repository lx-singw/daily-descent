# The Daily Descent — DevOps, Deployment & Repo Hygiene

## Repo setup checklist (do this before first commit)

- [ ] `.gitignore` — Node/TypeScript template minimum: `node_modules/`, `dist/`, `.env`, Devvit build artifacts, `*.log`.
- [ ] `.env.example` committed (see `10-env-vars.md`) — placeholder values only.
- [ ] `.env` created locally, confirmed gitignored, never committed.
- [ ] `README.md` — project name, one-line description, current status, link to `docs/`, setup instructions (added once `package.json` exists).
- [ ] Repo visibility set to **private** (see rationale below).
- [ ] License decided in principle (MIT recommended) even if deferred until public flip — see prior discussion; not urgent to add the `LICENSE` file while private.
- [ ] First commit is the `docs/01–10` folder alone, before any code — so repo history starts with design intent.

## Repo visibility: private now, public later

Private during build and initial launch, for two concrete reasons specific to this project:
- The card-effect whitelist and Gemini moderation gate logic (Tier 2/4) becomes gameable if visible before launch — someone could read the validation rules and craft a submission designed to slip past them.
- Daily seed generation logic being public before launch risks someone predicting or pre-computing a day's layout, undermining the "everyone faces it fresh" fairness at the core of the hook (doc 01).

**Trigger to flip to public:** once the game has launched and stabilized (roughly, once Phase 2 in `07-roadmap.md` is complete) — at that point the fairness/gaming risk is much lower relative to the portfolio/visibility upside. Re-check `git log` for any accidentally-committed secrets before flipping, per `10-env-vars.md`'s rotation notes.

## Branch strategy

- `main` — always working, always deployable. Nothing broken gets merged here.
- Feature branches for anything experimental, especially:
  - Tier 2/4 pipeline work (highest-risk area per `04-risks-and-validation.md`) — isolate parser/whitelist/moderation-gate changes until tested against real comment samples.
  - Any Phase 3+ work — keep post-MVP experimentation clearly separated from the stable MVP branch history.
- Solo-dev note: even without collaborators, branches cost nothing and make it easy to abandon an experiment (e.g. a Tier 2 approach that turns out to be exploitable) without polluting `main`'s history.

## Devvit deployment flow

1. **Local development:** Devvit's CLI dev/playtest mode (test against a real or test subreddit before publishing) — confirm the exact command/workflow during Phase 0, since this is central to the whole build-test loop and isn't optional to figure out early.
2. **Staging/test subreddit:** maintain a separate, low-traffic or private test subreddit for iterating before pushing changes to the live subreddit — this is where `scripts/seed-demo-data.ts` gets exercised repeatedly during development.
3. **Publish to live subreddit:** via Devvit's publish/upload flow once a build is confirmed stable on the test subreddit.
4. **Rollback plan:** confirm what Devvit's versioning/rollback story actually is (can you revert to a previous published version quickly if something breaks live?) — add this to the Phase 0 validation checklist in `04-risks-and-validation.md` if not already covered, since it's a genuine gap in that doc as currently written.

## CI (lightweight, MVP-appropriate)

Given the hackathon timeline, don't over-invest here — but a minimal automated check is worth the small setup cost:
- A single CI job (GitHub Actions is the natural default given the repo is on GitHub) that runs on every push: type-check (`tsc --noEmit`), run the test suite (see `11-testing-strategy.md`), and lint.
- Do **not** build a full deploy pipeline for the hackathon — manual Devvit publish is fine at this stage. Automating deployment is a Phase 2+ nicety, not an MVP need.

## Post-MVP (Phase 3+) infrastructure notes

- If the AWS fallback described in `10-env-vars.md` (Phase 3 analytics, Phase 5 personalization compute) is ever triggered, treat it as a separate, small infrastructure project with its own IaC (even something lightweight like a single CloudFormation/CDK stack) rather than manually-clicked AWS console resources — this avoids configuration drift once real credentials and real user data are involved.
- Don't set this up speculatively. Per `07-roadmap.md`, these phases are explicitly gated on concrete, observed limits in Devvit's own capabilities — building AWS infrastructure ahead of that need is exactly the kind of premature scope this whole document set has been careful to avoid.

## Monitoring (Phase 2+, once live)

- MVP: no dedicated monitoring infrastructure — Devvit's own platform likely provides basic install/usage visibility; confirm what's available during Phase 0 and rely on that rather than building custom logging for the hackathon submission.
- Phase 2+: once success metrics (doc 06 §6) are being tracked, decide whether Devvit's built-in visibility is sufficient or whether lightweight external tracking is worth the small added complexity — this is a judgment call to make with real usage data in hand, not in advance.
