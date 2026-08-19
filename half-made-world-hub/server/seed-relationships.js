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
  r("Jaiden Marlock", "Lisa", "child of", "Child of", "Jaiden is the son of Lisa and Ordium — the first angel-demon hybrid in the world."),
  r("Jaiden Marlock", "Ordium", "child of", "Child of", "Jaiden is the son of Lisa and Ordium — the first angel-demon hybrid in the world."),
  r("Ordium", "Lisa", "loves", "Loves", "Love at first sight. He left his post and spent 9 months with her in a secret place in the Human Realm."),
  r("Lisa", "Tera Morage", "right-hand of", "Right-hand of", "The most powerful demon in the Demon Realm after the Mordrach; held the top Bloodward position as the ruler’s right-hand."),
  r("Ordium", "Clint Ashborn", "right-hand of", "Right-hand of", "Ordium is the right-hand man of the Angel Realm’s ruler."),
  r("Licent Varak", "Tera Morage", "right-hand of", "Right-hand of", "The second right-hand man to Tera Morage in the Demon Realm."),
  r("Sofia Marlock", "Lisa", "serves", "Serves", "Lisa’s personal maid — she received the child Jaiden and the Auralis Ruby from Lisa."),
  r("Licent Varak", "Lisa", "rival of", "Rival of", "Always hated Lisa for being stronger than him and holding the top Bloodward position; constantly looked for a way to take her power and rank away."),
  r("Licent Varak", "Lisa", "betrayed", "Betrayed", "Saw Lisa meet with an angel, discovered the pregnancy, and reported her to Tera Morage — which enraged the ruler."),
  r("Tera Morage", "Lisa", "demoted", "Demoted", "Demoted Lisa to Gnash rank after Licent Varak reported her relationship with an angel."),
  r("Licent Varak", "Lisa", "ordered killed", "Ordered killed", "After her demotion, Lisa was killed by Licent’s men on his orders."),
  r("Sofia Marlock", "Jaiden Marlock", "guardian of", "Guardian of", "Raised Jaiden in the Human Realm after receiving him from Lisa, with the Auralis Ruby sealing his auras so he looks human."),
  r("Licent Varak", "Sofia Marlock", "knows", "Knows", "Saw Sofia heading to an unknown location and tried to follow her, but lost track of her."),
  r("Jaiden Marlock", "Lisa", "unaware of", "Unaware of", "Given away as a baby with his auras sealed by the Auralis Ruby — he has no idea who his parents are."),
  r("Jaiden Marlock", "Ordium", "unaware of", "Unaware of", "Given away as a baby with his auras sealed by the Auralis Ruby — he has no idea who his parents are."),
  r("Kael von Ashen", "Jaiden Marlock", "takes", "Takes to the Hidden Realm", "The Head Master is the character who takes the MC, Jaiden, to the Hidden Realm (comment 126)."),
  r("Clint Ashborn", "Ordium", "ordered killed", "Ordered killed", "after have a child with a demon lisa, clint was enraged and ordered the execution of Ordium"),
  r("Carin", "Lisa", "serves", "Serves", "she used to work for Lisa"),
  r("Carin", "Jaiden Marlock", "Demon trainer for", "Demon trainer for", "she trained Jaiden further on how to use his demonic powers"),
  r("Sofia Marlock", "Jaiden Marlock", "Trainer of", "Trainer of", "She trained Jaiden on how to use some of his angelic powers since she was once an angel too"),
  r("Licent Varak", "Tera Morage", "Going to kill", "Going to kill", "planning to kill her for her position and become the new ruler of the demon realm"),
  r("Laren Vornath", "Tera Morage", "serves", "Serves", "Laren Vornath is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm."),
  r("Sythra Kaelis", "Tera Morage", "serves", "Serves", "Sythra Kaelis is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm."),
  r("Nyra Thessan", "Tera Morage", "serves", "Serves", "Nyra Thessan is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm."),
  r("Isella Marrek", "Tera Morage", "serves", "Serves", "Isella Marrek is a Bloodward general serving under Tera Morage, the Mordrach ruler of the Demon Realm."),
  r("Cyrion", "Clint Ashborn", "serves", "Serves", "Cyrion is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm."),
  r("Serathiel", "Clint Ashborn", "serves", "Serves", "Serathiel is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm."),
  r("Liora Veyne", "Clint Ashborn", "serves", "Serves", "Liora Veyne is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm."),
  r("Thalor Elwin", "Clint Ashborn", "serves", "Serves", "Thalor Elwin is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm."),
  r("Aranweis", "Clint Ashborn", "serves", "Serves", "Aranweis is an Aetherblade Lord Angel general serving under Clint Ashborn, the Serapharch ruler of the Angel Realm."),
  r("Sythra Kaelis", "Lisa", "drained", "Drained", "She was sent to “comfort” Lisa after her demotion to Gnash, draining what remained of her before Licent Varak’s men finished it."),
  r("Cyrion", "Ordium", "knows", "Knows", "Saw Ordium slip away and has kept the secret of his parentage ever since."),
  r("Cyrion", "Jaiden Marlock", "knows", "Knows", "Kept the secret of Jaiden’s parentage."),
  r("Serathiel", "Ordium", "rival of", "Rival of", "Resents that Ordium threw away the seat she would have bled to hold."),
  r("Liora Veyne", "Ordium", "knows", "Knows", "Brought the execution order to Ordium’s door."),
  r("Thalor Elwin", "Ordium", "knows", "Knows", "Saw Ordium’s vow fraying and said nothing."),
  r("Licent Varak", "Tera Morage", "serves", "Serves", "A Bloodward general serving under Tera Morage."),
  r("Ruby Divina", "Jaiden Marlock", "knows", "Knows", "She has known of the hybrid hiding in her realm from the beginning."),
  r("Wener Leger", "Clint Ashborn", "opposes", "Opposes", "Dark Moon’s leader stands against the angelic order Clint upholds."),
  r("Wener Leger", "Jaiden Marlock", "watches", "Watches", "He watches the first hybrid the way a collector watches a rare weapon."),
  r("Tera Morage", "Lisa", "friend of", "Friend of", "The one demon Tera trusted enough to keep close — and the one mercy she ever allowed."),
  r("Tera Morage", "Licent Varak", "unaware of", "Unaware of", "She does not see that her own second right-hand is plotting her death with Dark Moon."),
  r("Tera Morage", "Jaiden Marlock", "unaware of", "Unaware of", "She does not know the hybrid child of Lisa and Ordium exists."),
  r("Ruby Divina", "Aldermere", "ruler of", "Ruler of", "Ruby Divina rules Aldermere, the kingdom of the Human Realm."),
  r("Clint Ashborn", "Aurelion", "ruler of", "Ruler of", "Clint Ashborn rules Aurelion, the kingdom of the Angel Realm."),
  r("Tera Morage", "Vorath", "ruler of", "Ruler of", "Tera Morage rules Vorath, the kingdom of the Demon Realm."),
  r("Eva Aldermere Divina", "Ruby Divina", "child of", "Child of", "She is the daughter to Ruby Divina"),
  r("Bella Rose", "Jaiden Marlock", "friend of", "Friend of", "she is the childhood friend of jaiden"),
  r("Mark Wesley", "Jaiden Marlock", "friend of", "Friend of", "he later became friends with jaiden"),
  r("Aldric Malgrave", "Kael von Ashen", "hunted", "Hunted", "He hunted the Aelthar to extinction — Kael von Ashen is the one survivor he never caught."),
];
