/**
 * Story web seed — the whole-world connection map, grounded in "Half_made world ideas.docx".
 * Links entries (and characters) to each other: located in, guards, rules, kills, sealed in, etc.
 * Node names must match entry names (case-insensitive, prefix allowed).
 */
const seededAt = '2026-08-12T00:00:00.000Z';

let n = 0;
function s(source, target, type, label, description) {
  n += 1;
  return {
    id: 'link-seed-' + String(n).padStart(3, '0'),
    source,
    target,
    type,
    label,
    description,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
}

module.exports = [
  // --- Realms & inhabitants ------------------------------------------------
  s('Angels (Overview)', 'Angel Realm', 'home of', 'Home of', 'The Angel Realm is home to all four angel ranks.'),
  s('Demons (Overview)', 'Demon Realm', 'home of', 'Home of', 'The Demon Realm is home to all four demon ranks.'),
  s('Humans', 'Human Realm', 'home of', 'Home of', 'The Human Realm is home to humanity.'),
  s('Arubian Forest', 'Ether Forest', 'part of', 'Part of', 'Arubian is the light half of the Ether Forest.'),
  s('Umbrage Forest', 'Ether Forest', 'part of', 'Part of', 'Umbrage is the dark half of the Ether Forest.'),
  s('Arubian Forest', 'Human Realm', 'located in', 'Located in', 'The light half of the forest lies within the Human Realm.'),
  s('Umbrage Forest', 'Demon Realm', 'located in', 'Located in', 'The dark half of the forest lies within the Demon Realm.'),
  s('Umbrage Forest', 'Hidden Realm (Shadow Realm)', 'portal to', 'Portal to', 'At the beginning of the story, the portal to the Hidden Realm is located here.'),
  s('Thornlost Forest', 'Hidden Realm (Shadow Realm)', 'located in', 'Located in', 'A forest of the Hidden Realm.'),
  s('Sentient River', 'Hidden Realm (Shadow Realm)', 'located in', 'Located in', 'The living river of the Shadow Realm.'),
  s('Lethmoor Kingdom', 'Hidden Realm (Shadow Realm)', 'located in', 'Located in', 'A replicated fallen kingdom within the Hidden Realm.'),

  // --- Monsters ------------------------------------------------------------
  s('Pixies', 'Hidden Realm (Shadow Realm)', 'lives in', 'Lives in', 'Pixies stay in the Hidden Realm.'),
  s('Fairies', 'Arubian Forest', 'lives in', 'Lives in', 'Fairies roam the Arubian Forest.'),
  s('Trolls', 'Umbrage Forest', 'lives in', 'Lives in', 'Trolls stay on the darker side of the forest.'),
  s('Minotaur', 'Umbrage Forest', 'lives in', 'Lives in', 'Minotaurs stay in the Umbrage Forest.'),
  s('Elves', 'Arubian Forest', 'lives in', 'Lives in', 'Pallantine Elves stay in the Arubian Forest.'),
  s('Elves', 'Umbrage Forest', 'lives in', 'Lives in', 'Veilborn Elves stay in the Umbrage Forest.'),
  s('Coilmane', 'Thornlost Forest', 'guards', 'Guards', 'The guardian of the Thornlost Forest.'),
  s('Harpies', 'Umbrage Forest', 'lives in', 'Lives in', 'Harpies stay in the Umbrage Forest.'),
  s('Dragons', 'Hidden Realm (Shadow Realm)', 'lives in', 'Lives in', 'Dragons stay in the Shadow Realm and guard high mountain tops in the Hidden Realm.'),
  s('Sirens', 'Sentient River', 'lives in', 'Lives in', 'Sirens make their home in the Sentient River.'),

  // --- Beings --------------------------------------------------------------
  s('Shudon', 'Human Realm', 'guards', 'Guards', 'A Shudon guards every realm entrance.'),
  s('Shudon', 'Angel Realm', 'guards', 'Guards', 'A Shudon guards every realm entrance.'),
  s('Shudon', 'Demon Realm', 'guards', 'Guards', 'A Shudon guards every realm entrance.'),
  s('Shudon', 'Hidden Realm (Shadow Realm)', 'guards', 'Guards', 'A Shudon guards every realm entrance.'),
  s('Leviathan', 'Lethmoor Kingdom', 'guards', 'Guards', 'The lava-adapted serpent guards the approach to the kingdom.'),
  s('Cindergrave Wraith Lord', 'Lethmoor Kingdom', 'rules', 'Rules', 'The Wraith Lord rules from Lethmoor’s throne room.'),
  s('Lesser Cindergrave Wraiths', 'Cindergrave Wraith Lord', 'serves', 'Serves', 'Lesser wraiths rally under their lord.'),
  s('The Wanderer', 'Hidden Realm (Shadow Realm)', 'home of', 'Home of', 'The Wanderer mainly stays in the Hidden Realm.'),
  s('The Seer', 'Humans', 'part of', 'Part of', 'The Seer is the one human who knows who the next Healer will be.'),

  // --- Angels --------------------------------------------------------------
  s('Serapharch', 'Angels (Overview)', 'rank of', 'Rank of', 'Rank 1 of the angel hierarchy.'),
  s('Aetherblade Lord Angel', 'Angels (Overview)', 'rank of', 'Rank of', 'Rank 2 of the angel hierarchy.'),
  s('Virtue', 'Angels (Overview)', 'rank of', 'Rank of', 'Rank 3 of the angel hierarchy.'),
  s('Lumen', 'Angels (Overview)', 'rank of', 'Rank of', 'Rank 4 of the angel hierarchy.'),
  s('Fallen Angel', 'Angels (Overview)', 'part of', 'Part of', 'Angels cast out for breaking the Veyn Vow.'),
  s('The Angel Veyn Vow', 'Angels (Overview)', 'part of', 'Part of', 'The bond that regulates every angel’s Veyn.'),
  s('Clint Ashborn', 'Angel Realm', 'rules', 'Rules', 'The Serapharch ruler of the Angel Realm.'),
  s('Vireth, the Fallen Grace', 'Serapharch', 'kills', 'Can kill', 'A corrupted Divine Weapon — one of the only things that can kill a Serapharch.'),
  s('Solvane, the Hallowed Edge', 'Serapharch', 'kills', 'Can kill', 'A Divine Weapon — one of the only things that can kill a Serapharch.'),

  // --- Demons --------------------------------------------------------------
  s('Mordrach', 'Demons (Overview)', 'rank of', 'Rank of', 'Rank 1 of the demon hierarchy.'),
  s('Bloodward', 'Demons (Overview)', 'rank of', 'Rank of', 'Rank 2 of the demon hierarchy.'),
  s('Scourge', 'Demons (Overview)', 'rank of', 'Rank of', 'Rank 3 of the demon hierarchy.'),
  s('Gnash', 'Demons (Overview)', 'rank of', 'Rank of', 'Rank 4 of the demon hierarchy.'),
  s('Duskveil', 'Demons (Overview)', 'part of', 'Part of', 'The innate demonic disguise ability.'),
  s('Tera Morage', 'Demon Realm', 'rules', 'Rules', 'The Mordrach ruler of the Demon Realm.'),
  s('Tera Morage', 'Mordrach', 'rank of', 'Rank of', 'Tera Morage holds the Mordrach rank.'),

  // --- Classes -------------------------------------------------------------
  s('Shudonkeeper', 'Shudon', 'studies', 'Studies', 'The class exists to preserve and study the Shudon.'),

  // --- Items ---------------------------------------------------------------
  s('Restoration Potion', 'Veyn Stone', 'made from', 'Made from', 'Brewed with Veyn stones to restore Veyn.'),
  s('Lucent Stone', 'Veyn Stone', 'refined from', 'Refined from', 'A purified, far more potent form of a Veyn Stone.'),
  s('Lucent Reserve', 'Lucent Stone', 'made from', 'Made from', 'A potion made from the Lucent Stone.'),
  s('Iron-will Ring', 'Lethmoor Kingdom', 'needed for', 'Needed for', 'Required to pass safely through Lethmoor’s unstable Veyn terrain.'),

  // --- Hidden Realm ingredients --------------------------------------------
  s('Pixies', 'Pixie Dust', 'produces', 'Produces', 'Pixies produce the rare pixie dust.'),
  s('Ethereal Potion', 'Pixie Dust', 'ingredient of', 'Ingredient of', 'Pixie dust is one of the potion’s core ingredients.'),
  s('Ethereal Potion', 'Grimbough Tree', 'ingredient of', 'Ingredient of', 'Grinded Grimbough leaves are an ingredient.'),
  s('Ethereal Potion', 'Kaelroot Tree', 'ingredient of', 'Ingredient of', 'Grinded Kaelroot bark is an ingredient.'),
  s('Ethereal Potion', 'Dragons', 'ingredient of', 'Ingredient of', 'The heart of a dragon is the final ingredient.'),
  s('Rejuvenating Elixir', 'Kaelroot Tree', 'made from', 'Made from', 'The leaves of the Kaelroot tree brew this elixir.'),

  // --- Artifacts -----------------------------------------------------------
  s('Vireth, the Fallen Grace', 'Sentient River', 'sealed in', 'Sealed in', 'Held beneath the river under two seals.'),
  s('Virastra, the Ascendant Vow', 'Hidden Realm (Shadow Realm)', 'lost in', 'Lost in', 'Lost somewhere in the ruins across the Hidden Realm.'),
  s('Aerendrel, the Skybound Wrath', 'Lethmoor Kingdom', 'found in', 'Found in', 'Kept in the chamber beneath the throne chair.'),
  s("Liework’s Fallen Crown", 'Lethmoor Kingdom', 'found in', 'Found in', 'Kept in the chamber beneath the throne chair.'),
  s("Sael’s Luck", 'Lethmoor Kingdom', 'found in', 'Found in', 'Kept in the chamber beneath the throne chair.'),
  s('Auralis Ruby', 'Lisa', 'crafted by', 'Crafted by', 'Made by Lisa and given to Sofia to seal Jaiden’s auras.'),
  s('Auralis Ruby', 'Jaiden Marlock', 'seals', 'Seals', 'Its five seals hide Jaiden’s five forms — and both of his auras.'),

  // --- Plot ----------------------------------------------------------------
  s("Lisa’s Plot", 'Lisa', 'story of', 'Story of', 'A forbidden love, a hidden child, and a death sentence.'),
  s("Lisa’s Plot", 'Licent Varak', 'story of', 'Story of', 'Licent’s betrayal is the pivot of Lisa’s fate.'),
  s("Lisa’s Plot", 'Ordium', 'story of', 'Story of', 'Ordium is Lisa’s forbidden love.'),
  s("Licent Varak’s Plot", 'Licent Varak', 'story of', 'Story of', 'Jealousy that cost Lisa her life.'),
  s("Ordium’s Plot", 'Ordium', 'story of', 'Story of', 'Love at first sight — left unfinished.'),

  // --- Gifts, finders, and ownership ---------------------------------------
  // Auralis Ruby: crafted by Lisa and given to her maid Sofia,
  // who passed the pendant on to Lisa's son Jaiden to seal his auras.
  s('Auralis Ruby', 'Sofia', 'given to', 'Given to', 'Crafted by Lisa and given to her personal maid Sofia.'),
  s('Auralis Ruby', 'Jaiden Marlock', 'given to', 'Given to', 'Lisa gave the pendant to her son through her maid Sofia — its five seals hide Jaiden’s five forms and both auras.'),
  s('Jaiden Marlock', 'Sofia', 'given to', 'Given to', 'Lisa gave her newborn son to her personal maid Sofia to raise in the Human Realm.'),
  // Treasures found in the chamber beneath Lethmoor's throne chair.
  s('Aerendrel, the Skybound Wrath', 'Jaiden Marlock', 'found by', 'Found by', 'Among the treasures found in the chamber beneath Lethmoor’s throne chair — the Mc’s to claim.'),
  s('Liework’s Fallen Crown', 'Jaiden Marlock', 'found by', 'Found by', 'Among the treasures found in the chamber beneath Lethmoor’s throne chair.'),
  s('Sael’s Luck', 'Jaiden Marlock', 'found by', 'Found by', 'Among the treasures found in the chamber beneath Lethmoor’s throne chair.'),
  // Solvane: the Divine Spear held by the Angel Realm's ruler — can be passed down.
  s('Solvane, the Hallowed Edge', 'Clint Ashborn', 'passed down', 'Passed down', 'The Divine Spear held by the Angel Realm’s ruler — a user-bound weapon that can be passed down.'),
  // Ownership, per the doc's comments.
  s('Vireth, the Fallen Grace', 'Jaiden Marlock', 'owned by', 'Owned by', 'The Mc becomes the owner of the corrupted divine sword.'),
  s('The Truthstone', 'The Seer', 'owned by', 'Owned by', 'The Seer is entrusted with the gem that locates the next Healer — and is the only one who knows where it lies.'),


  // --- Subsections connected back to their sources -------------------------
  s("Kings Record", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Sixth Sense", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Time Reversal", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Chronos Fury", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Will Mastery", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Holy Rain", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Dignified Presence", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Angelic Aura (Serapharch)", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Holy Flame", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("God's Index Finger", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("God Chain", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Holy Grail", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Warpstep", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Dawnveil (Serapharch)", "Serapharch", 'skill of', 'Skill of', 'A Serapharch skill.', 'One of the Serapharch\'s abilities.'),
  s("Skyward Chains", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Vanguard's Cry", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Aegis Ward", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Holy Mend", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Angelic Aura (Aetherblade)", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Swiftstep", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Dawnveil (Aetherblade)", "Aetherblade Lord Angel", 'skill of', 'Skill of', 'A Aetherblade Lord Angel skill.', 'One of the Aetherblade Lord Angel\'s abilities.'),
  s("Guiding Light", "Virtue", 'skill of', 'Skill of', 'A Virtue skill.', 'One of the Virtue\'s abilities.'),
  s("Radiant Strike", "Virtue", 'skill of', 'Skill of', 'A Virtue skill.', 'One of the Virtue\'s abilities.'),
  s("Formation Discipline", "Virtue", 'skill of', 'Skill of', 'A Virtue skill.', 'One of the Virtue\'s abilities.'),
  s("Angelic Aura (Virtue)", "Virtue", 'skill of', 'Skill of', 'A Virtue skill.', 'One of the Virtue\'s abilities.'),
  s("Dawnveil (Virtue)", "Virtue", 'skill of', 'Skill of', 'A Virtue skill.', 'One of the Virtue\'s abilities.'),
  s("Warmth of the Realm", "Lumen", 'skill of', 'Skill of', 'A Lumen skill.', 'One of the Lumen\'s abilities.'),
  s("Faint Ward", "Lumen", 'skill of', 'Skill of', 'A Lumen skill.', 'One of the Lumen\'s abilities.'),
  s("Angelic Aura (Lumen)", "Lumen", 'skill of', 'Skill of', 'A Lumen skill.', 'One of the Lumen\'s abilities.'),
  s("Dawnveil (Lumen)", "Lumen", 'skill of', 'Skill of', 'A Lumen skill.', 'One of the Lumen\'s abilities.'),
  s("Death Scythe", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Chain Reaper Scythe", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Call of the Dead", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Dominating Will", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Soul Oath", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Veyn Decomposition (Mordrach)", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Hands of Death", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Purgatory Flames", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Charm", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Soul-Sight", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Berserk (Mordrach)", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Demonic Aura (Mordrach)", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Duskveil (Mordrach)", "Mordrach", 'skill of', 'Skill of', 'A Mordrach skill.', 'One of the Mordrach\'s abilities.'),
  s("Blood Chains", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Warcry of Dominion", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Crimson Ward", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Blood Pact", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Veyn Decomposition (Bloodward)", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Demonic Aura (Bloodward)", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Berserk (Bloodward)", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Duskveil (Bloodward)", "Bloodward", 'skill of', 'Skill of', 'A Bloodward skill.', 'One of the Bloodward\'s abilities.'),
  s("Vitality Surge", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Rend Claws", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Pack Tactics", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Veyn Decomposition (Scourge)", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Berserk (Scourge)", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Demonic Aura (Scourge)", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Duskveil (Scourge)", "Scourge", 'skill of', 'Skill of', 'A Scourge skill.', 'One of the Scourge\'s abilities.'),
  s("Binding Contract", "Gnash", 'skill of', 'Skill of', 'A Gnash skill.', 'One of the Gnash\'s abilities.'),
  s("Veyn Decomposition (Gnash)", "Gnash", 'skill of', 'Skill of', 'A Gnash skill.', 'One of the Gnash\'s abilities.'),
  s("Instinctive Bargaining", "Gnash", 'skill of', 'Skill of', 'A Gnash skill.', 'One of the Gnash\'s abilities.'),
  s("Demonic Aura (Gnash)", "Gnash", 'skill of', 'Skill of', 'A Gnash skill.', 'One of the Gnash\'s abilities.'),
  s("Duskveil (Gnash)", "Gnash", 'skill of', 'Skill of', 'A Gnash skill.', 'One of the Gnash\'s abilities.'),
  s("Jaiden Marlock — Normal", 'Jaiden Marlock', 'form of', 'Form of', 'One of Jaiden\'s forms.', 'A transformation Jaiden can take.'),
  s("Jaiden Marlock — Halo & Horns", 'Jaiden Marlock', 'form of', 'Form of', 'One of Jaiden\'s forms.', 'A transformation Jaiden can take.'),
  s("Jaiden Marlock — Full Angel Form", 'Jaiden Marlock', 'form of', 'Form of', 'One of Jaiden\'s forms.', 'A transformation Jaiden can take.'),
  s("Jaiden Marlock — Full Demon Form", 'Jaiden Marlock', 'form of', 'Form of', 'One of Jaiden\'s forms.', 'A transformation Jaiden can take.'),
  s("Jaiden Marlock — True Hybrid Form", 'Jaiden Marlock', 'form of', 'Form of', 'One of Jaiden\'s forms.', 'A transformation Jaiden can take.'),
  s("Graceless Edge", 'Vireth, the Fallen Grace', 'skill of', 'Skill of', 'A skill of the corrupted divine sword.', 'One of Vireth\'s signature abilities.'),
  s("Split Grace", 'Vireth, the Fallen Grace', 'skill of', 'Skill of', 'A skill of the corrupted divine sword.', 'One of Vireth\'s signature abilities.'),
  s("Pallantine", 'Elves', 'class of', 'Class of', 'One of the two types of Elves stated in the doc - a class of Elf.', 'The doc says there are two types of Elves.'),
  s("Veilborn", 'Elves', 'class of', 'Class of', 'One of the two types of Elves stated in the doc - a class of Elf.', 'The doc says there are two types of Elves.'),

  // --- Class of: occupations -> the magic system they are a class of -------------
  s('Mage', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class.'),
  s('Alchemist', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class.'),
  s('Beastmaster', 'Ren', 'class of', 'Class of', 'A Ren class.'),
  s('Smithing', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn and Ren class - the Veyn half of Smithing.'),
  s('Smithing', 'Ren', 'class of', 'Class of', 'A Magic/Veyn and Ren class - the Ren half of Smithing.'),
  s('Enchanter', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class.'),
  s('Diviner', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class - channels holy energy, a purified form of Veyn.'),
  s('Exorcist', 'Veyn', 'class of', 'Class of', 'A slight use of Veyn/Magic class.'),
  s('Broker', 'Ren', 'class of', 'Class of', 'A Ren class.'),
  s('Saintess', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class, Holy class - channels holy energy, a purified form of Veyn.'),
  s('Healer', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class.'),
  s('Archer', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class.'),
  s('Paladin', 'Ren', 'class of', 'Class of', 'A Ren class - the physical half of Paladin.'),
  s('Paladin', 'Veyn', 'class of', 'Class of', 'A Holy class - heals and protects using holy energy, a purified form of Veyn.'),
  s('Grimtender', 'Veyn', 'class of', 'Class of', 'A Magic/Veyn class.'),
  s('Bladesinger', 'Ren', 'class of', 'Class of', 'A Ren class.'),
  s('Berserker', 'Ren', 'class of', 'Class of', 'A Ren class.'),
  s('Sentinel', 'Ren', 'class of', 'Class of', 'A Ren class.'),
  s('Ren Archer', 'Ren', 'class of', 'Class of', 'A Ren class.'),
  s('Veilrunner', 'Ren', 'class of', 'Class of', 'A Ren class.'),

  // --- Class of: rank-variant skills -> their base skill ------------------------
  s('Angelic Aura (Serapharch)', 'Angelic Aura', 'class of', 'Class of', 'The Serapharch rank version of the shared angelic aura.'),
  s('Angelic Aura (Aetherblade)', 'Angelic Aura', 'class of', 'Class of', 'The Aetherblade Lord Angel rank version of the shared angelic aura.'),
  s('Angelic Aura (Virtue)', 'Angelic Aura', 'class of', 'Class of', 'The Virtue rank version of the shared angelic aura.'),
  s('Angelic Aura (Lumen)', 'Angelic Aura', 'class of', 'Class of', 'The Lumen rank version of the shared angelic aura.'),
  s('Dawnveil (Serapharch)', 'Dawnveil', 'class of', 'Class of', 'The Serapharch rank version of the innate angelic disguise.'),
  s('Dawnveil (Aetherblade)', 'Dawnveil', 'class of', 'Class of', 'The Aetherblade Lord Angel rank version of the innate angelic disguise.'),
  s('Dawnveil (Virtue)', 'Dawnveil', 'class of', 'Class of', 'The Virtue rank version of the innate angelic disguise.'),
  s('Dawnveil (Lumen)', 'Dawnveil', 'class of', 'Class of', 'The Lumen rank version of the innate angelic disguise.'),
  s('Veyn Decomposition (Mordrach)', 'Veyn Decomposition', 'class of', 'Class of', 'The Mordrach rank version of the innate demonic miasma.'),
  s('Veyn Decomposition (Bloodward)', 'Veyn Decomposition', 'class of', 'Class of', 'The Bloodward rank version of the innate demonic miasma.'),
  s('Veyn Decomposition (Scourge)', 'Veyn Decomposition', 'class of', 'Class of', 'The Scourge rank version of the innate demonic miasma.'),
  s('Veyn Decomposition (Gnash)', 'Veyn Decomposition', 'class of', 'Class of', 'The Gnash rank version of the innate demonic miasma.'),
  s('Berserk (Mordrach)', 'Berserk', 'class of', 'Class of', 'The Mordrach rank version of the berserk state.'),
  s('Berserk (Bloodward)', 'Berserk', 'class of', 'Class of', 'The Bloodward rank version of the berserk state.'),
  s('Berserk (Scourge)', 'Berserk', 'class of', 'Class of', 'The Scourge rank version of the berserk state.'),
  s('Demonic Aura (Mordrach)', 'Demonic Aura', 'class of', 'Class of', 'The Mordrach rank version of the shared demonic aura.'),
  s('Demonic Aura (Bloodward)', 'Demonic Aura', 'class of', 'Class of', 'The Bloodward rank version of the shared demonic aura.'),
  s('Demonic Aura (Scourge)', 'Demonic Aura', 'class of', 'Class of', 'The Scourge rank version of the shared demonic aura.'),
  s('Demonic Aura (Gnash)', 'Demonic Aura', 'class of', 'Class of', 'The Gnash rank version of the shared demonic aura.'),
  s('Duskveil (Mordrach)', 'Duskveil', 'class of', 'Class of', 'The Mordrach rank version of the innate demonic disguise.'),
  s('Duskveil (Bloodward)', 'Duskveil', 'class of', 'Class of', 'The Bloodward rank version of the innate demonic disguise.'),
  s('Duskveil (Scourge)', 'Duskveil', 'class of', 'Class of', 'The Scourge rank version of the innate demonic disguise.'),
  s('Duskveil (Gnash)', 'Duskveil', 'class of', 'Class of', 'The Gnash rank version of the innate demonic disguise.'),

  // --- Class of: Ren Archer is the Ren counterpart of Archer --------------------
  s('Ren Archer', 'Archer', 'class of', 'Class of', 'The Ren-based counterpart to Archer.'),

  // --- Class of: character class (from the doc comments) ----------------------
  s('Jaiden Marlock', 'Mage', 'class of', 'Class of', 'Per the doc comment: the Mc\'s class is a mage.'),

  // --- Head Master: stays in the Human Realm; only hid in the Hidden Realm (doc + comment 126) ---
  s('Head Master of the Academy', 'Human Realm', 'lives in', 'Lives in', 'The Head Master stays in the Human Realm.'),
  s('Head Master of the Academy', 'Hidden Realm (Shadow Realm)', 'hides in', 'Hides in', 'He was only hiding in the Hidden Realm to hide.'),

  // --- Head Master of the Academy (doc: "the Head master of the academy" + comment 126) ---
  s('Head Master of the Academy', 'Academy', 'head master of', 'Head Master of', 'The sole survivor of the old race killed by the former Human Realm ruler is the academy’s Head Master (comment 126).'),

  // --- Title: Crown-less, borne by Lisa ---
  s('Crown-less', 'Lisa', 'held by', 'Held by', 'The title “Crown-less” is borne by Lisa — the strongest Bloodward after the Mordrach, who never wore the crown herself.'),

  // --- Titles & generals ---
  s('Demon of Abundance', 'Lisa', 'held by', 'Held by', 'A title borne by Lisa — the strongest demon in the Demon Realm after the Mordrach, whose power overflows beyond a single body.'),
  s('First Pillar, Chronous', 'Ordium', 'held by', 'Held by', 'The First Pillar of the Six Pillars of Angels — borne by Ordium, referencing Chronos, god of time.'),
  s('Angel of the Vast', 'Aetherblade Lord Angel', 'held by', 'Held by', 'The widest reach beneath the throne, held by the Aetherblade Lord Angel.'),
  s('Demon of the Overflow', 'Bloodward', 'held by', 'Held by', 'Power beyond a single vessel — the Bloodward’s surfeit of Veyn.'),
  s('Jester demon', 'Kael Vornath', 'held by', 'Held by', 'The title “Demon of the Toll” is borne by Kael Vornath — Exacts a price from every soul that crosses the Demon army’s path.'),
  s('Demon of melancholy', 'Sythra Kaelis', 'held by', 'Held by', 'The title “Demon of the Harvest” is borne by Sythra Kaelis — Reaps what the war sows, and keeps the best of it.'),
  s('Demon of gluttony', 'Nyra Thessan', 'held by', 'Held by', 'The title “Demon of gluttony” is borne by Nyra Thessan — the general who devours magic and is never filled.'),
  s('Demon of usurpation', 'Othrek Veyne', 'held by', 'Held by', 'The title “Demon of usurpation” is borne by Othrek Veyne — the general who rose by taking what belonged to others.'),
  s('Demon of love', 'Isella Marrek', 'held by', 'Held by', 'The title “Demon of the Debt” is borne by Ilsa Marrek — Collects what is owed — in blood, always.'),
  s('Second Pillar, Helious', 'Cyrion', 'held by', 'Held by', 'The title “Helious” is borne by Cyrion — the Second Pillar of the Six Pillars of Angels.'),
  s('Third Pillar, Areous', 'Serathiel', 'held by', 'Held by', 'The title “Areous” is borne by Serathiel — the Third Pillar of the Six Pillars of Angels.'),
  s('Fourth Pillar, Deimous', 'Liora Veyne', 'held by', 'Held by', 'The title “Deimous” is borne by Liora Veyne — the Fourth Pillar of the Six Pillars of Angels.'),
  s('Fifth Pillar, Horkous', 'Thalor Elwin', 'held by', 'Held by', 'The title “Horkous” is borne by Thalor Elwin — the Fifth Pillar of the Six Pillars of Angels.'),
  s('Sixth Pillar, Argous', 'Aranweis', 'held by', 'Held by', 'The title “Argous” is borne by Aranweis — the Sixth Pillar of the Six Pillars of Angels.'),

  // --- Title: Demon of the Bloodhound, borne by Licent Varak ---
  s('Demon of the Bloodhound', 'Licent Varak', 'held by', 'Held by', 'The title “Demon of the Bloodhound” is borne by Licent Varak — he hunts a scent to its end and never lets it go.'),

  // --- General skills, linked to their titles ---
  s('Red Whisper', 'Jester demon', 'skill of', 'Skill of', 'One of Kael Vornath’s abilities — the Jester demon.'),
  s('Blood Jape', 'Jester demon', 'skill of', 'Skill of', 'One of Kael Vornath’s abilities — the Jester demon.'),
  s('Traitor’s Step', 'Jester demon', 'skill of', 'Skill of', 'One of Kael Vornath’s abilities — the Jester demon.'),
  s('Grey Miasma', 'Demon of melancholy', 'skill of', 'Skill of', 'One of Sythra Kaelis’s abilities — the Demon of melancholy.'),
  s('Widow’s Toll', 'Demon of melancholy', 'skill of', 'Skill of', 'One of Sythra Kaelis’s abilities — the Demon of melancholy.'),
  s('Fading Wound', 'Demon of melancholy', 'skill of', 'Skill of', 'One of Sythra Kaelis’s abilities — the Demon of melancholy.'),
  s('Heart-Bind', 'Demon of love', 'skill of', 'Skill of', 'One of Isella Marrek’s abilities — the Demon of love.'),
  s('Lover’s Step', 'Demon of love', 'skill of', 'Skill of', 'One of Isella Marrek’s abilities — the Demon of love.'),
  s('Bond-Sight', 'Demon of love', 'skill of', 'Skill of', 'One of Isella Marrek’s abilities — the Demon of love.'),

  // --- General skills, linked to their titles ---
  s('Siphon', 'Demon of gluttony', 'skill of', 'Skill of', 'One of the Demon of gluttony’s abilities.'),
  s('Unslaked', 'Demon of gluttony', 'skill of', 'Skill of', 'One of the Demon of gluttony’s abilities.'),
  s('Seal', 'Demon of gluttony', 'skill of', 'Skill of', 'One of the Demon of gluttony’s abilities.'),
  s('Mirror', 'Demon of usurpation', 'skill of', 'Skill of', 'One of the Demon of usurpation’s abilities.'),
  s('Hollow Step', 'Demon of usurpation', 'skill of', 'Skill of', 'One of the Demon of usurpation’s abilities.'),
  s('Voided', 'Demon of usurpation', 'skill of', 'Skill of', 'One of the Demon of usurpation’s abilities.'),

  // --- Pillar skills, linked to their titles ---
  s('Lapse', 'First Pillar, Chronous', 'skill of', 'Skill of', 'One of the First Pillar, Chronous’s abilities.'),
  s('Rewind', 'First Pillar, Chronous', 'skill of', 'Skill of', 'One of the First Pillar, Chronous’s abilities.'),
  s('Still Hour', 'First Pillar, Chronous', 'skill of', 'Skill of', 'One of the First Pillar, Chronous’s abilities.'),
  s('Long Sight', 'Second Pillar, Helious', 'skill of', 'Skill of', 'One of the Second Pillar, Helious’s abilities.'),
  s('Burning Path', 'Second Pillar, Helious', 'skill of', 'Skill of', 'One of the Second Pillar, Helious’s abilities.'),
  s('Second Sun', 'Second Pillar, Helious', 'skill of', 'Skill of', 'One of the Second Pillar, Helious’s abilities.'),
  s('Battle Trance', 'Third Pillar, Areous', 'skill of', 'Skill of', 'One of the Third Pillar, Areous’s abilities.'),
  s('Ravager’s Grasp', 'Third Pillar, Areous', 'skill of', 'Skill of', 'One of the Third Pillar, Areous’s abilities.'),
  s('War-Worn', 'Third Pillar, Areous', 'skill of', 'Skill of', 'One of the Third Pillar, Areous’s abilities.'),
  s('Dread-Herald', 'Fourth Pillar, Deimous', 'skill of', 'Skill of', 'One of the Fourth Pillar, Deimous’s abilities.'),
  s('Unheralded', 'Fourth Pillar, Deimous', 'skill of', 'Skill of', 'One of the Fourth Pillar, Deimous’s abilities.'),
  s('Kneel', 'Fourth Pillar, Deimous', 'skill of', 'Skill of', 'One of the Fourth Pillar, Deimous’s abilities.'),
  s('Altar-Rite', 'Fifth Pillar, Horkous', 'skill of', 'Skill of', 'One of the Fifth Pillar, Horkous’s abilities.'),
  s('Oath-Curse', 'Fifth Pillar, Horkous', 'skill of', 'Skill of', 'One of the Fifth Pillar, Horkous’s abilities.'),
  s('True-Witness', 'Fifth Pillar, Horkous', 'skill of', 'Skill of', 'One of the Fifth Pillar, Horkous’s abilities.'),
  s('All-Seeing Eye', 'Sixth Pillar, Argous', 'skill of', 'Skill of', 'One of the Sixth Pillar, Argous’s abilities.'),
  s('Warden’s Recall', 'Sixth Pillar, Argous', 'skill of', 'Skill of', 'One of the Sixth Pillar, Argous’s abilities.'),
  s('Warden’s Mark', 'Sixth Pillar, Argous', 'skill of', 'Skill of', 'One of the Sixth Pillar, Argous’s abilities.'),

  // --- Pillar duties ---
  s('Thalor Elwin', 'The Sundering Altar', 'guards', 'Guards', 'The Fifth Pillar guards the Sundering Altar, where vows are sworn and halos form.'),
  s('Aranweis', 'Clint Ashborn', 'guards', 'Guards', 'The Sixth Pillar is the personal guard of the Serapharch, the first-rank ruler of the Angel Realm.'),

  // --- Lisa + Ordium mastered/personalized skills ---
  s('Glut', 'Demon of Abundance', 'skill of', 'Skill of', 'One of the Demon of Abundance’s abilities.'),
  s('Cornucopia', 'Demon of Abundance', 'skill of', 'Skill of', 'One of the Demon of Abundance’s abilities.'),
  s('Reap', 'Demon of Abundance', 'skill of', 'Skill of', 'One of the Demon of Abundance’s abilities.'),
  s('Sovereign Aura', 'Demon of Abundance', 'skill of', 'Skill of', 'One of the Demon of Abundance’s abilities.'),
  s('Auralis Seal', 'Demon of Abundance', 'skill of', 'Skill of', 'One of the Demon of Abundance’s abilities.'),
  s('Time’s Grasp', 'First Pillar, Chronous', 'skill of', 'Skill of', 'One of the First Pillar, Chronous’s abilities.'),
  s('The Stolen Hour', 'First Pillar, Chronous', 'skill of', 'Skill of', 'One of the First Pillar, Chronous’s abilities.'),

  // --- Inherited skills passed down to the MC ---
  s('Auralis Seal', 'Jaiden Marlock', 'passed down', 'Passed down', 'Inherited from Lisa — the sealing craft she used to make the Auralis Ruby that seals his forms and auras.'),
  s('The Stolen Hour', 'Jaiden Marlock', 'passed down', 'Passed down', 'Inherited from Ordium — a time-warping skill passed down through his father’s line.'),

  // --- Plot & Rules/Notes cross-links ---
  s("Lisa’s Plot", 'Sofia', 'story of', 'Story of', 'Lisa gave the child to her maid Sofia to raise in the Human Realm.'),
  s("Lisa’s Plot", 'Jaiden Marlock', 'story of', 'Story of', "The plot is the story of Jaiden’s birth and hidden parentage."),
  s("Lisa’s Plot", 'Auralis Ruby', 'story of', 'Story of', "Lisa sealed Jaiden’s auras with the Auralis Ruby."),
  s("Licent Varak’s Plot", 'Lisa', 'story of', 'Story of', "Licent Varak’s plot is the story of how he reported Lisa’s affair."),
  s("Licent Varak’s Plot", 'Tera Morage', 'story of', 'Story of', 'He reported Lisa to Tera Morage, which enraged the ruler.'),
  s("Licent Varak’s Plot", 'Sofia', 'story of', 'Story of', 'He followed Sofia heading to an unknown location.'),
  s("Ordium’s Plot", 'Lisa', 'story of', 'Story of', "Ordium’s plot is the story of his love for Lisa."),
  s('Affinity & Awakening', 'Veyn', 'about', 'About', "The Sundering Altar unlocks a person’s latent connection to Veyn."),
  s('Class Skill Limits', 'Angels (Overview)', 'about', 'About', 'Angel-realm beings are limited to 5 class skills because of their innate skills.'),
  s('Class Skill Limits', 'Demons (Overview)', 'about', 'About', 'Demon-realm beings are limited to 5 class skills because of their innate skills.'),
  s('Class Skill Limits', 'Humans', 'about', 'About', 'Humans can learn all the skills of their chosen class.'),
  s('Veyn & Ren Incompatibility', 'Bladesinger', 'about', 'About', 'Bladesinger — a Ren class — cannot be joined with magic, since Veyn and Ren are incompatible.'),
  s('Inheritance of Ranks & Abilities', 'Angels (Overview)', 'about', 'About', "An angel’s rank can be passed down to an offspring."),
  s('Inheritance of Ranks & Abilities', 'Demons (Overview)', 'about', 'About', "A demon’s rank can be passed down to an offspring."),
  s('The Hidden Realm Portal', 'Shudon', 'about', 'About', 'The entrances to the different realms are guarded by a Shudon.'),
  s('Nyra Thessan', 'Cindergrave Wraith Lord', 'hungers like', 'Hungers like', 'She hungers the way the Cindergrave wraiths do, drawing Veyn from the living.'),
];
