# The Daily Descent — Testing Strategy

Scoped to match the hackathon timeline — this is deliberately not a heavyweight QA process. The priority order below reflects where a bug actually costs you the most (fairness-breaking or exploit-enabling bugs first, cosmetic bugs last).

## Priority 1 — Must be tested before any submission: fairness and exploit surfaces

- **Deterministic seed generation:** the same seed must always produce the same dungeon layout. This is the single most important correctness property in the whole game — if it breaks, "everyone plays the same dungeon today" (the core hook, doc 01) is false, silently, and probably undetectable without a dedicated test. Cover this with `tests/client/generation/DungeonGenerator.test.ts` (already scoped in doc 08) — assert identical output across repeated runs with the same seed input.
- **Card whitelist parser:** must reject anything outside the numeric-parameter whitelist (doc 02's Tier 2 guardrail), with zero exceptions. Test against both well-formed and deliberately malformed/adversarial comment strings — see `tests/fixtures/sampleComments.json` (doc 08) for adversarial test cases specifically, not just happy-path ones.
- **Moderation gate behavior when Gemini is unavailable or errors:** the whitelist parser must remain the hard backstop regardless of Gemini's availability (doc 03's guardrail) — test the failure path explicitly: if the Gemini call times out or errors, confirm the system fails closed (card doesn't enter the pool) rather than failing open (card enters unchecked).
- **Daily rollover boundary:** confirm the seed-rotation logic correctly identifies a new day exactly once, without double-rotating or missing a rotation, especially if using a check-on-load pattern rather than a true scheduled job (doc 04, item 4).

## Priority 2 — Must be tested before submission: core loop functions correctly

- Player movement, collision, death conditions.
- Leaderboard sorting and tiebreak logic (depth first, time as tiebreak per doc 02).
- Ghost trail recording and playback — confirm trails render at reasonable fidelity from sampled points (doc 03's ~250-500ms sampling interval), and that a trail with very few samples (a very fast death) doesn't break rendering.
- Spirit message flow: consent prompt appears, opted-in messages post correctly, opted-out messages don't post anywhere.

## Priority 3 — Should be tested before submission, can slip if time-constrained

- Mobile viewport correctness across a couple of real screen sizes (the brief explicitly calls this out as a scoring factor — don't skip entirely, but this can be manual spot-checking rather than automated testing given the timeline).
- Tier 3 features (community stat summary accuracy, spirit message voting, flair award triggers) — functional correctness, not edge-case hardening.
- Onboarding tooltip appears on first load only, not on every load.

## Priority 4 — Nice to have, genuinely optional for the hackathon

- Load/stress testing (what happens with hundreds of simultaneous players) — worth a mental note for Phase 2, not a pre-submission requirement, since demo-post judging traffic is unlikely to be a genuine stress test.
- Automated visual regression testing — skip entirely for the hackathon; manual visual review is sufficient at this scale.

## Test types, by layer

| Layer | Approach | Tooling note |
|---|---|---|
| Dungeon generation determinism | Unit test | Pure function, easy to test in isolation — no Devvit dependency needed |
| Whitelist parser | Unit test | Same — pure function over string input, test outside Devvit |
| Moderation gate | Unit test with mocked Gemini responses | Never call the real Gemini API in automated tests — mock success, failure, and timeout cases explicitly |
| Devvit storage/routes | Integration test where feasible, manual verification otherwise | Devvit's platform-specific APIs may not be easily unit-testable in isolation — confirm what Devvit's own testing tools support during Phase 0, and fall back to manual playtest-mode verification for anything that can't be automated |
| Phaser rendering/UI | Manual playtest | Automated visual testing is out of scope per Priority 4 |

## What happens if a Priority 1 test fails close to the deadline

Per `02-mvp-scope.md`'s cut-list logic: a failing Priority 1 test is a signal to **cut the feature it belongs to**, not to ship it broken and hope. Concretely:
- Broken seed determinism → this blocks submission entirely; there is no version of this game without it working (Tier 0 floor, doc 02).
- Broken whitelist parser or moderation-gate fail-open behavior → cut Tier 2/4 entirely per the existing cut-list priority (doc 04), rather than shipping an exploitable card pipeline.
- Broken rollover logic → fall back to the simplest possible check-on-load implementation (doc 04, item 4) rather than a more elaborate scheduled-job approach, if the elaborate version isn't reliably testable in time.

## Post-MVP (Phase 2+) testing additions

- Real comment data from live usage should replace/supplement synthetic test fixtures for the whitelist parser and moderation gate — adversarial inputs from real users are more informative than anything written in advance.
- Once Phase 3's profile/trending views exist, add tests confirming aggregation correctness (e.g. "deadliest room this week" actually reflects the underlying run data) — this is exactly the kind of silent-drift bug (correct-looking UI, wrong underlying number) that's easy to ship unnoticed without a dedicated test.
