# Plan: Demon Evolution and Succession Logic

## Goal
Define and implement the narrative and system logic for how Demons evolve to 1st Rank following the death of the Demon King and the subsequent coronation of the heir.

## Current Context
- The world is a "Half-Made World" (Reference).
- There is a hierarchy of Demons (Ranks).
- A power vacuum is created upon the death of the King.
- An heir is designated to become the new King.

## Proposed Approach
The transition of power should not be a simple toggle but a system-wide event that triggers evolution for high-ranking demons. This creates a "Golden Age" of evolution or a "Chaos Period" depending on the narrative intent.

### Narrative Logic
1. **The Void**: Upon the King's death, a portion of the King's essence/mana is released into the atmosphere or distributed among the nobility.
2. **The Catalyst**: The act of the heir ascending to the throne "locks" the new hierarchy, triggering an evolution wave for those who proved their loyalty or strength during the transition.
3. **Evolution Trigger**: Demons of a certain rank (e.g., 2nd Rank) evolve to 1st Rank by absorbing the residual essence of the fallen King.

## Step-by-Step Implementation Plan

### Phase 1: Narrative Documentation
- [ ] Create/Update a world-building document (e.g., `docs/demons/evolution.md`) detailing the biological and spiritual process of this specific evolution.
- [ ] Define the requirements for a Demon to be eligible for 1st Rank (e.g., current rank, alignment with the new King, or specific achievements).

### Phase 2: Data Model Updates
- [ ] **Server-side**: Update the `world.json` or the database schema to include "Rank Evolution" states.
- [ ] Define the "Essence" variable that triggers the evolution.

### Phase 3: Logic Implementation (Backend)
- [ ] Implement a `triggerSuccessionEvent()` function in the server:
    - Marks the old King as deceased.
    - Assigns the `King` role to the heir.
    - Iterates through all Demons and applies evolution logic to eligible candidates.
- [ ] Implement the evolution transition (e.g., updating the `category` or `rank` field of the affected entries).

### Phase 4: Frontend Visualization
- [ ] Update `StoryWeb.tsx` to visually highlight evolved nodes (e.g., a special glow or animation when the succession event is triggered).
- [ ] Add a notification or "World Event" banner in the UI to announce the new King and the evolved 1st Ranks.

## Files Likely to Change
- `server/index.js` (Succession logic)
- `server/data/world.json` (Data updates)
- `client/src/components/StoryWeb.tsx` (Visual feedback)
- `docs/demons/evolution.md` (New documentation)

## Validation
- [ ] **Scenario Test**: Kill the King $\rightarrow$ Promote Heir $\rightarrow$ Verify that 2nd Rank demons with sufficient criteria have moved to 1st Rank.
- [ ] **Edge Case**: What happens if multiple heirs exist? What happens if no one is eligible for evolution?

## Risks & Trade-offs
- **Balance**: Too many 1st Rank demons might break the power scaling of the world.
- **Complexity**: Triggering mass updates in `world.json` requires careful state management to avoid data corruption.
