# The Daily Descent — Product Requirements Document (PRD)

This document establishes the product requirements, success metrics, and core game-balance parameters for **The Daily Descent**.

---

## 1. Product Overview & Experience Goals

*   **Genre:** Daily rogue-lite dungeon crawler.
*   **Format:** Subreddit interactive post (Devvit Web + Phaser).
*   **Core Value Proposition:** Single-session, high-tension asynchronous multiplayer. Everyone plays the exact same seed each day. Subreddit comments directly generate in-game benefits or warnings, turning simple Reddit threads into persistent collaborative game mechanics.

---

## 2. Core Game-Balance Specifications

To make "Tier 0" testable and establish solvable generation parameters, the game relies on the following game-balance invariants:

### A. Dungeon Dimensions & Geometry
*   **Grid Size:** 60x60 tiles.
*   **Room Constraints:** 
    *   Minimum rooms per seed: 8.
    *   Maximum rooms per seed: 15.
    *   Room sizes: width and height between 6 and 12 tiles.
*   **Corridors:** L-shaped paths carved using single-tile widths, connecting rooms sequentially to guarantee a spanning tree.

### B. Map Solvability Invariant
*   **Solvability Check:** At dungeon generation time, the client runs a Breadth-First Search (BFS) starting from the spawn point `(4, 4)` to the exit tile. 
*   **Invariant:** Every generated seed **must** have a valid, unblocked path from the start point to the exit tile. If the path is blocked, the generator throws an error and falls back to a safe backup generation seed.

### C. Combat & Hazard Values
*   **Player Health (HP):** Starts at `10` HP. Permadeath (HP <= 0 ends the run).
*   **Hazard Trap (Spikes/Fire):** Deals `2` HP damage. Traps trigger when a player walks onto their tile.
*   **Hazard Enemy (Guard/Ghost):** Deals `3` HP damage. Enemies chase the player when in line-of-sight and attack on proximity.
*   **Target Clear Rate:** 20% to 30% of players should successfully exit the dungeon daily.

### D. Movement & Turn Model
*   **Turn Model:** Real-time-lite grid-based movement. 
*   **Timing Constraint:** The game locks movement to a maximum of `5` steps per second. The client throttles inputs to a minimum interval of `200ms` per tile. 

### E. Leaderboard Score Formula
To rank players primarily on depth reached and secondarily on speed:
$$\text{Score} = (\text{Depth} \times 1,000,000,000) + (1,000,000,000 - \text{Duration}_{\text{ms}})$$
*This maps both metrics to a single safe integer score in Redis where higher is better.*

---

## 3. Product Success Metrics

We measure community retention and engagement through the following metrics:

### A. Return Rate (Daily Retention)
*   **Definition:** Percentage of users who play today's seed and return to play tomorrow's seed.
*   **Target:** >25% return rate within the first week of installation.

### B. Contribution Rate (Reddit Integration)
*   **Definition:** Percentage of players who complete a run (win/loss) and submit a content contribution.
    *   **Spirit Message:** Submitting an in-game warning posted as a Reddit comment.
    *   **Card Draft (Tier 2):** Commenting on the post in the `[Card]` format.
*   **Target:** >15% contribution rate.

### C. Leaderboard Participation
*   **Definition:** Ratio of unique players who submit a run to total page loads.
*   **Target:** >60% of users who load the post submit at least one run.
