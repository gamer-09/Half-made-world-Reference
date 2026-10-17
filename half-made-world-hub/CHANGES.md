# Fix summary - Half-Made World data

- Backup: `server/data/world.backup-fix-2026-10-11T23-16-21.json` and angel backup `world.backup-20261011-232447.json` preserved
- All changes written to `server/data/world.json` (1033 entries, valid JSON)

## Core systems
- Grade System (seed-080): Field description aligned to G → S (included G/F/E).
- Classes (seed-098): Replaced legacy 18-class list with current 19-class roster (Mage, Alchemist, Beastmaster, Smithing, Enchanter, Diviner, Exorcist, Broker, Saintess, Clergy, Archer, Paladin, Grimtender, Bladesinger, Berserker, Sentinel, Ren Archer, Veilrunner, Shudonkeeper).
- Holy Energy (seed-067): Removed "paladins" from channels/users (paladins use Auric Ren).
- Combat (seed-576): Removed Paladins from Holy Energy user lists.
- Mages activation (seed-635): Replaced grade-based (F/A rank) timing with Rune Star Circle terminology (Low-Circle / high-Circle).
- Veyn flow (seed-832, seed-849, seed-960): Qualified "indefinitely" to limited by reserves.
- Vitality (seed-716): Rephrased safe minimum to ~25 Burns for consistency.
- Corruption staging (seed-073, seed-720): Harmonized wording; clarified holy energy works in early stages, Revenant Purification for advanced stages; removed absolute "only cure" exclusivity where appropriate.

## Skills / Classes references
- Renamed legacy class terms in skill entries: Blacksmith → Smithing (seed-390), Cleric/Medic → Clergy (seed-433, seed-441, seed-450, seed-451), Crossbowman → Ren Archer (seed-516), Shadow Blade → Veilrunner (seed-529, seed-531), Guardian → Sentinel (seed-502+ series), Necromancer → Grimtender/Grimcaller where appropriate (seed-474+ series, seed-553).
- Skill rank/type adjustments for flagged mismatches (seed-161, seed-176, seed-177, seed-186, seed-199, seed-296) with canon = description-oriented fields.
- Effect fields for core skills adjusted to align with descriptions (seed-160, seed-161, seed-162, seed-171).

## Governance / World
- Six vs Five Pillars: Renamed/clarified (seed-777 subtitle/name context); fixed "Archangel Veradis" → "Aetherblade Lord Veradis" (seed-647).
- Demon titles: Standardized to Mordrach where appropriate (seed-695, seed-729). Class rank title adjusted in Grimtender progression for clarity.
- Text hygiene: Cleaned garbled fragments (seed-092, seed-097, seed-577); removed instrument references from seed-982 per user instruction (music deleted everywhere as requested).

## Story / Characters (Jaiden forms)
- Jaiden forms renumbered to canonical order per user: 1. Normal (seed-154), 2. Full Angel (seed-156), 3. Full Demon (seed-157), 4. Halo & Horns (seed-155), 5. True Hybrid (seed-158). Subtitles updated; seal chain (seed-143) rewritten to map coherently to forms 2-5.
- Lisa plot (seed-151): Removed the Fallen-Angel misclassification for a demon; clarified retention of sanity.
- Timeline: 4th Turning ~Year 2000. Updated year references (seed-588, seed-705, seed-1012) to reflect ~1999 VC (just before 4th Turning) and turning year ~2000 to satisfy "every 500 years" math.
- Angels use world coin system: Corrected (seed-681) to reflect coin-based economy.
- Titles/pillar names: Normalized spellings (Chronous/Helious/Areous/Deimous/Horkous/Argous) in subtitle/description contexts where applicable (seed-246, seed-260-264, seed-307).

All edits preserve structure/tags and update `updatedAt` where modified. JSON validated (1033 entries). Remaining lower-priority mismatches (Dawnveil/Duskveil/aura effect fields, some numeric/item price harmonizations, cross-ref cycles) can be batch-fixed in a follow-up pass if needed.
