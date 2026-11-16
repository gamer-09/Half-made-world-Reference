import type { Entry } from './types';

/** One thread section — a colored knot on the string with its beads. */
export interface DossierSectionDef {
  key: string;
  label: string;
  color: string;
  names: string[];
}

export interface DossierDef {
  key: 'academy' | 'guild';
  eyebrow: string;
  title: string;
  subtitle: string;
  /** The entry shown in the detail panel when the page opens. */
  introName: string;
  sections: DossierSectionDef[];
}

export interface ResolvedDossierSection extends DossierSectionDef {
  entries: Entry[];
}

export interface ResolvedDossier extends Omit<DossierDef, 'sections'> {
  sections: ResolvedDossierSection[];
  entries: Entry[];
}

/**
 * The Academy thread — everything the archive holds about Elyndor Academy.
 * The school's own entries (the "Academy" category) plus the three core
 * entries that define the place. Every name here exists in world.json.
 */
export const ACADEMY_DOSSIER: DossierDef = {
  key: 'academy',
  eyebrow: 'The Thread of Elyndor',
  title: 'Academy',
  subtitle:
    'Everything the archive holds about Elyndor Academy — the school, its people, its places, and its lessons.',
  introName: 'Elyndor Academy',
  sections: [
    {
      key: 'the-school',
      label: 'The School',
      color: '#c8a876',
      names: ['Elyndor Academy', 'The Academy Grounds', 'The Founding of Elyndor Academy'],
    },
    {
      key: 'student-life',
      label: 'Student Life',
      color: '#6b9bd1',
      names: ['Academy Daily Life', 'Academy Instructors', 'Academy Examinations'],
    },
    {
      key: 'education',
      label: 'Education & Mentorship',
      color: '#8fb878',
      names: [
        'The Academy Examination System',
        'The Human Apprenticeship System',
        'The Academy Mentor System',
        'The Academy History Curriculum',
        'The Academy Veyn Sensitivity Testing',
      ],
    },
    {
      key: 'training',
      label: 'Training Methods',
      color: '#7fb8c9',
      names: [
        'Veyn Conditioning',
        'Veyn Drawing Meditation',
        'The Academy Veyn Detection Training',
      ],
    },
    {
      key: 'knowledge',
      label: 'Knowledge & Research',
      color: '#a07850',
      names: [
        'Human Written Knowledge System',
        'The Academy Library Access Tiers',
        'The Academy Veyn Library Catalog',
        'Veyn Frequency Mapping',
      ],
    },
    {
      key: 'campus',
      label: 'Campus Places',
      color: '#b08d57',
      names: [
        'The Academy Dueling Grounds',
        'The Academy Library Crypt',
        'The Academy Combat Hall',
        'The Academy Library Reading Rooms',
      ],
    },
    {
      key: 'people',
      label: 'People & Alumni',
      color: '#d4894a',
      names: [
        'The Academy Faculty Council',
        'The Academy Alumni Network',
        'The Human Realm Academy Alumni Benefits',
      ],
    },
    {
      key: 'ceremonies',
      label: 'Ceremonies',
      color: '#c9a0dc',
      names: ['The Academy Graduation Ceremony'],
    },
    {
      key: 'networks',
      label: 'Networks & Infrastructure',
      color: '#7f8fa3',
      names: [
        'Academy Mirror Network',
        'The Human Realm Library Network',
        'The Angel Realm Crystal Garden Maps',
      ],
    },
    {
      key: 'professional-training',
      label: 'Professional Training',
      color: '#9b7bb8',
      names: ["Broker's Certification Examination", 'The Five Trials of the Broker'],
    },
  ],
};

/**
 * The Guild thread — every guild gets its own section, with the entries
 * that belong to it threaded underneath. Every name here exists in world.json.
 */
export const GUILD_DOSSIER: DossierDef = {
  key: 'guild',
  eyebrow: 'The Thread of the Guilds',
  title: 'Guilds',
  subtitle:
    'Every guild in the world, each on its own thread — the brokers who bind contracts, the Concord who hunt rifts, and the craft guilds beyond the Human Realm.',
  introName: "The Broker's Guild",
  sections: [
    {
      key: 'brokers-guild',
      label: "The Broker's Guild",
      color: '#9b7bb8',
      names: [
        "The Broker's Guild",
        'Broker',
        'Broker — Contract Tier Ranks',
        "The Broker's Daily Life",
        "Broker's Certification Examination",
        'The Five Trials of the Broker',
        'Broker Contract Enforcement',
        "The Broker's Guild Enforcement Division",
        "The Broker's Guild Dispute Resolution",
        "The Broker's Guild Vault System",
        "The Broker's Guild Ethics Code",
        'Information Brokers',
      ],
    },
    {
      key: 'silver-concord',
      label: 'Silver Concord',
      color: '#8f9bb3',
      names: [
        'Silver Concord',
        'Silver Concord — Guild Ranks',
        'Silver Concord — Guild Facilities',
        'Silver Concord — Rift Hunts',
      ],
    },
    {
      key: 'skill-guilds',
      label: 'The Human Realm Skill Guilds',
      color: '#8fb878',
      names: ['The Human Realm Skill Guilds'],
    },
    {
      key: 'crystal-artisans',
      label: 'The Angel Realm Crystal Artisan Guild',
      color: '#e8d9a0',
      names: ['The Angel Realm Crystal Artisan Guild'],
    },
  ],
};

/** Turn a definition into real entries, dropping any name the archive no longer has. */
export function resolveDossier(def: DossierDef, entries: Entry[]): ResolvedDossier {
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const sections = def.sections.map((section) => ({
    ...section,
    entries: section.names
      .map((name) => byName.get(name))
      .filter((entry): entry is Entry => Boolean(entry)),
  }));
  return {
    ...def,
    sections,
    entries: sections.flatMap((section) => section.entries),
  };
}
