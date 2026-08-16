# Plan: Revised Demon Evolution and Succession Logic

## Goal
Define a narrative and system logic for how Demons evolve to 1st Rank following the death of the Demon King and the ascension of the heir, grounded in the existing world data.

## Current Context & Findings
- **Existing Hierarchy**: The Demon Realm is ruled by **Tera Morage**, who holds the **Mordrach rank**.
- **Comparison**: The Angel Realm has a clear ranking system (Serapharch $\rightarrow$ Aetherblade Lord $\rightarrow$ Virtue $\rightarrow$ Lumen). The Demon Realm needs a similarly explicit ranking structure to make "1st Rank" meaningful.
- **Key Concept**: The "Mordrach" is the pinnacle. The transition of power involves moving from the current King to an heir, which should catalyze a shift in the ranks of the nobility.

## Proposed Approach
Instead of a generic "evolution," we will tie the process to the **Mordrach's Veyn**. In this world, Veyn is the source of magic and awakening. The death of a Mordrach (the King) creates a "Veyn Surge" or "Crown Leak" that the nobility can absorb.

### Narrative Logic: The Mordrach's Legacy
1. **The Sunder**: When the Demon King dies, their massive reserve of Veyn doesn't vanish but fragments.
2. **The Vacuum**: The Demon Realm becomes unstable. This instability forces lower-rank demons to either collapse or adapt.
3. **The Ascension**: When the heir claims the throne, they "anchor" the Realm's Veyn. This anchoring creates a wave of stability that pushes the most powerful 2nd Rank demons (the "High Nobility") into the 1st Rank.
4. **The Price**: Evolution is not free. It requires a specific alignment with the new King's "Veyn Signature." Those who oppose the heir may be stripped of rank or remain stagnant.

## Step-by-Step Implementation Plan

### Phase 1: Defining the Hierarchy
- [ ] **Establish Demon Ranks**: Formally define the ranks (e.g., Mordrach $\rightarrow$ 1st Rank $\rightarrow$ 2nd Rank $\rightarrow$ 3rd Rank).
- [ ] **Update Documentation**: Create `docs/demons/hierarchy.md` to mirror the Angel Realm's structure.

### Phase 2: System Logic (Backend)
- [ ] **Succession Event Trigger**:
    - Function `handleKingDeath()`: Changes the current Ruler status to "Deceased" and triggers the "Veyn Surge" state in the realm.
    - Function `handleHeirCoronation()`: 
        - Updates the Ruler of the Demon Realm to the heir.
        - Identifies all demons of "2nd Rank".
        - Applies a probability/criteria check (e.g., Loyalty $\ge$ 70% or Power $\ge$ Threshold).
        - Updates eligible demons to "1st Rank".
- [ ] **Data Migration**: Update the `fields` array in `world.json` for affected demons to reflect their new rank.

### Phase 3: Frontend Integration
- [ ] **Visual Evolution**: In `StoryWeb.tsx`, add a visual indicator (e.g., a gold ring or pulsing glow) to nodes that have recently evolved to 1st Rank.
- [ ] **Event Log**: Add a "World Archive" log entry: *"The Mordrach has fallen. [Heir Name] ascends. A new era of 1st Rank nobility begins."*

## Files Likely to Change
- `server/data/world.json` (Entry updates for the King and evolved demons)
- `server/index.js` (The logic for the succession event)
- `client/src/components/StoryWeb.tsx` (Visual feedback for evolved nodes)

## Validation
- [ ] **Succession Flow**: Verify: Death $\rightarrow$ Vacuum $\rightarrow$ Coronation $\rightarrow$ Rank Shift.
- [ ] **Stability**: Ensure that the evolution doesn't accidentally promote *all* demons, only the eligible nobility.

## Risks & Trade-offs
- **Power Creep**: If too many demons become 1st Rank, the new King's authority is weakened.
- **Narrative Rigidity**: Tying evolution strictly to the King's death might limit other ways demons can evolve. (Solution: Make the King's death a *shortcut* to 1st Rank, not the only way).
