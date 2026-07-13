# The Daily Descent — Environment Variables & Secrets

This doc is the single source of truth for every environment variable, secret, and config value the project needs, across all phases. Nothing here should be duplicated or redefined elsewhere — `03-architecture.md` and `08-repo-structure.md` reference this doc rather than restating values.

**Hard rule carried from `09-devops-and-deployment.md` and general good practice: nothing in this file's "Secret" column ever gets committed to the repo.** Use `.env` (gitignored) locally and Devvit's/your platform's secret storage in deployed environments. `.env.example` in the repo contains only variable names and placeholder values, never real ones.

---

## MVP (Phase 0–1) — required before hackathon submission

| Variable | Where it's used | Secret? | Notes |
|---|---|---|---|
| `DEVVIT_APP_ID` | Devvit manifest / CLI | No | Assigned by Devvit when the app is created; safe to reference in docs, not secret |
| `DEVVIT_SUBREDDIT` | `scripts/seed-demo-data.ts`, local testing | No | The subreddit the app is installed/tested on |
| `GEMINI_API_KEY` | `server/pipeline/moderationGate.ts` (Tier 4, only if built) | **Yes** | Google AI Studio / Vertex AI key under the existing Google Ultra plan; only needed if Tier 4 is reached |
| `GEMINI_MODEL` | `server/pipeline/moderationGate.ts` | No | e.g. a lightweight/fast model tier — this is a structured classification task, not a reasoning-heavy one (see doc 03) |
| `CARD_POOL_MAX_SIZE` | `server/routes/cards.ts` | No | Config value, not a secret — caps daily draft pool size per doc 02's power-creep guardrail |
| `GHOST_TRAIL_RETENTION_COUNT` | `server/storage/ghostTrailStore.ts` | No | How many recent trails to keep per seed (doc 03's storage-growth guardrail) |
| `NODE_ENV` | Build tooling | No | `development` / `production` |

**Note on Devvit-native secrets:** Devvit's own Reddit API access (comment read/write, flair-setting) is handled through Devvit's platform permission model, not a manually-managed API key — there is no `REDDIT_API_KEY` to set. Confirm this during Phase 0 validation (doc 04, items 2–3, 5); if Devvit's model turns out to require any manual credential, add it here immediately rather than letting it live undocumented.

---

## Phase 2 (post-submission stabilization) — no new variables expected

Phase 2 is stabilization of what Phase 1 already built. If a bug fix requires a new config value (e.g. a rate-limit tuning parameter), add it to the MVP table above rather than starting a separate table — Phase 2 doesn't introduce a new environment tier.

---

## Phase 3 (reputation layer) — only if AWS fallback is triggered

Per `07-roadmap.md`, these only apply if Devvit's storage/query capabilities prove insufficient for the trending feed and an external datastore becomes necessary. Not needed otherwise.

| Variable | Where it's used | Secret? | Notes |
|---|---|---|---|
| `AWS_REGION` | External datastore client (if triggered) | No | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | External datastore client (if triggered) | **Yes** | Scope narrowly — read/write to the specific table only, not broad account access |
| `AWS_SECRET_ACCESS_KEY` | External datastore client (if triggered) | **Yes** | Same scoping note as above |
| `DYNAMODB_TABLE_PROFILE_STATS` | `server/storage/profileStore.ts` (if migrated) | No | Table name, not a secret |

---

## Phase 4 (pipeline maturity) — no new variables expected beyond Gemini tuning

| Variable | Where it's used | Secret? | Notes |
|---|---|---|---|
| `GEMINI_BALANCE_CHECK_ENABLED` | `server/pipeline/balancePass.ts` | No | Feature flag — lets you toggle the balance pass on/off independently of the moderation gate while stabilizing it |

---

## Phase 5 (personalization layer) — only if AWS Lambda fallback is triggered

Per `07-roadmap.md`, these only apply if per-player tendency modeling outgrows Devvit's backend. Not needed otherwise.

| Variable | Where it's used | Secret? | Notes |
|---|---|---|---|
| `PERSONALIZATION_LAMBDA_ENDPOINT` | `server/personalization/emphasisEngine.ts` (if migrated) | No | URL, not a secret, but should still not be hardcoded |
| `AWS_LAMBDA_INVOKE_ROLE_ARN` | Lambda invocation from Devvit backend (if triggered) | **Yes** (treat ARN handling carefully even though it's not a raw key) | Scope narrowly to invoke permission only |

---

## `.env.example` (commit this; never commit `.env` itself)

```
# Devvit (non-secret identifiers)
DEVVIT_APP_ID=
DEVVIT_SUBREDDIT=

# Gemini (Tier 4 — only needed once you build the moderation gate)
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-lightweight-tier

# Game config (non-secret)
CARD_POOL_MAX_SIZE=5
GHOST_TRAIL_RETENTION_COUNT=5

# Environment
NODE_ENV=development

# --- Below this line: Phase 3+ only, uncomment if/when AWS fallback is triggered ---
# AWS_REGION=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# DYNAMODB_TABLE_PROFILE_STATS=
```

## Where secrets actually live, by environment

- **Local development:** `.env` file, gitignored (see `09-devops-and-deployment.md`).
- **Devvit deployed app:** Devvit's own secret/config management for anything it requires natively (confirm exact mechanism during Phase 0 validation — this may be a CLI command like a secrets-upload step rather than a `.env` file at all).
- **AWS resources (Phase 3+/5+, only if triggered):** AWS Secrets Manager or equivalent, not raw environment variables in a config file, once real infrastructure is involved — this is a step up in rigor appropriate once you're managing IAM-scoped credentials rather than a single API key.

## Rotation and scoping notes

- `GEMINI_API_KEY`: scope to the minimum API surface needed (classification calls only) if Google's console allows key-level scoping; rotate if the repo is ever made public and there's any chance the key touched a committed file at any point in history (check `git log` for this specifically before flipping to public per the earlier repo-setup discussion).
- Any future AWS credentials: always scope IAM permissions to the specific resource (e.g. one DynamoDB table, one Lambda function) rather than broad account-level access, per the notes in the tables above.
