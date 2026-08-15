/**
 * Seed relationships between characters — grounded in "Half_made world ideas.docx".
 * Stored separately from entries so the archive stays pristine.
 * source -> target (directed). type drives the color/legend in the UI.
 */
const seededAt = '2026-08-12T00:00:00.000Z';

let n = 0;
function r(source, target, type, label, description) {
  n += 1;
  return {
    id: 'rel-seed-' + String(n).padStart(3, '0'),
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
  r('Jaiden Marlock', 'Lisa', 'child of', 'Child of', 'Jaiden is the son of Lisa and Ordium — the first angel-demon hybrid in the world.'),
  r('Jaiden Marlock', 'Ordium', 'child of', 'Child of', 'Jaiden is the son of Lisa and Ordium — the first angel-demon hybrid in the world.'),
  r('Ordium', 'Lisa', 'loves', 'Loves', 'Love at first sight. He left his post and spent 9 months with her in a secret place in the Human Realm.'),
  r('Lisa', 'Tera Morage', 'right-hand of', 'Right-hand of', 'The most powerful demon in the Demon Realm after the Mordrach; held the top Bloodward position as the ruler’s right-hand.'),
  r('Ordium', 'Clint Ashborn', 'right-hand of', 'Right-hand of', 'Ordium is the right-hand man of the Angel Realm’s ruler.'),
  r('Licent Varak', 'Tera Morage', 'right-hand of', 'Right-hand of', 'The second right-hand man to Tera Morage in the Demon Realm.'),
  r('Sofia', 'Lisa', 'serves', 'Serves', 'Lisa’s personal maid — she received the child Jaiden and the Auralis Ruby from Lisa.'),
  r('Licent Varak', 'Lisa', 'rival of', 'Rival of', 'Always hated Lisa for being stronger than him and holding the top Bloodward position; constantly looked for a way to take her power and rank away.'),
  r('Licent Varak', 'Lisa', 'betrayed', 'Betrayed', 'Saw Lisa meet with an angel, discovered the pregnancy, and reported her to Tera Morage — which enraged the ruler.'),
  r('Tera Morage', 'Lisa', 'demoted', 'Demoted', 'Demoted Lisa to Gnash rank after Licent Varak reported her relationship with an angel.'),
  r('Licent Varak', 'Lisa', 'ordered killed', 'Ordered killed', 'After her demotion, Lisa was killed by Licent’s men on his orders.'),
  r('Sofia', 'Jaiden Marlock', 'guardian of', 'Guardian of', 'Raised Jaiden in the Human Realm after receiving him from Lisa, with the Auralis Ruby sealing his auras so he looks human.'),
  r('Licent Varak', 'Sofia', 'knows', 'Knows', 'Saw Sofia heading to an unknown location and tried to follow her, but lost track of her.'),
  r('Jaiden Marlock', 'Lisa', 'unaware of', 'Unaware of', 'Given away as a baby with his auras sealed by the Auralis Ruby — he has no idea who his parents are.'),
  r('Jaiden Marlock', 'Ordium', 'unaware of', 'Unaware of', 'Given away as a baby with his auras sealed by the Auralis Ruby — he has no idea who his parents are.'),
  r('Head Master of the Academy', 'Jaiden Marlock', 'takes', 'Takes to the Hidden Realm', 'The Head Master is the character who takes the MC, Jaiden, to the Hidden Realm (comment 126).'),

  // --- Generals: serve their realms' rulers ---
  r('Kael Vornath', 'Tera Morage', 'serves', 'Serves', 'Kael Vornath is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm.'),
  r('Sythra Kaelis', 'Tera Morage', 'serves', 'Serves', 'Sythra Kaelis is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm.'),
  r('Nyra Thessan', 'Tera Morage', 'serves', 'Serves', 'Nyra Thessan is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm.'),
  r('Othrek Veyne', 'Tera Morage', 'serves', 'Serves', 'Othrek Veyne is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm.'),
  r('Isella Marrek', 'Tera Morage', 'serves', 'Serves', 'Isella Marrek is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm.'),
  r('Cyrion', 'Clint Ashborn', 'serves', 'Serves', 'Cyrion is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm.'),
  r('Serathiel', 'Clint Ashborn', 'serves', 'Serves', 'Serathiel is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm.'),
  r('Liora Veyne', 'Clint Ashborn', 'serves', 'Serves', 'Liora Veyne is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm.'),
  r('Thalor Elwin', 'Clint Ashborn', 'serves', 'Serves', 'Thalor Elwin is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm.'),
  r('Aranweis', 'Clint Ashborn', 'serves', 'Serves', 'Aranweis is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm.'),

  // --- New-character ties to existing cast ---
  r('Sythra Kaelis', 'Lisa', 'drained', 'Drained', "She was sent to “comfort” Lisa after her demotion to Gnash, draining what remained of her before Licent Varak’s men finished it."),
  r('Cyrion', 'Ordium', 'knows', 'Knows', 'Saw Ordium slip away and has kept the secret of his parentage ever since.'),
  r('Cyrion', 'Jaiden Marlock', 'knows', 'Knows', "Kept the secret of Jaiden’s parentage."),
  r('Serathiel', 'Ordium', 'rival of', 'Rival of', 'Resents that Ordium threw away the seat she would have bled to hold.'),
  r('Liora Veyne', 'Ordium', 'knows', 'Knows', "Brought the execution order to Ordium’s door."),
  r('Thalor Elwin', 'Ordium', 'knows', 'Knows', "Saw Ordium’s vow fraying and said nothing."),

  // --- Licent Varak serves Tera Morage ---
  r('Licent Varak', 'Tera Morage', 'serves', 'Serves', 'A Bloodward general serving under Tera Morage.'),
];
