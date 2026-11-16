import { describe, expect, it } from 'vitest';
import worldRaw from '../../../server/data/world.json?raw';
import { ACADEMY_DOSSIER, GUILD_DOSSIER, resolveDossier } from '../dossiers';
import type { Entry } from '../types';

const world = JSON.parse(worldRaw) as Entry[];

describe('dossier definitions', () => {
  it('every Academy thread name exists in the archive', () => {
    const names = new Set(world.map((entry) => entry.name));
    const missing = [...ACADEMY_DOSSIER.sections.flatMap((section) => section.names), ACADEMY_DOSSIER.introName].filter(
      (name) => !names.has(name),
    );
    expect(missing).toEqual([]);
  });

  it('every Guild thread name exists in the archive', () => {
    const names = new Set(world.map((entry) => entry.name));
    const missing = [...GUILD_DOSSIER.sections.flatMap((section) => section.names), GUILD_DOSSIER.introName].filter(
      (name) => !names.has(name),
    );
    expect(missing).toEqual([]);
  });

  it('resolves the full Academy thread with entries in every section', () => {
    const resolved = resolveDossier(ACADEMY_DOSSIER, world);
    expect(resolved.entries.length).toBe(31);
    expect(resolved.sections.every((section) => section.entries.length > 0)).toBe(true);
    expect(resolved.entries.map((entry) => entry.name)).toContain('Elyndor Academy');
    expect(resolved.entries.map((entry) => entry.name)).toContain('The Academy Graduation Ceremony');
  });

  it('keeps each guild in its own section', () => {
    const resolved = resolveDossier(GUILD_DOSSIER, world);
    expect(resolved.entries.length).toBe(18);

    const broker = resolved.sections.find((section) => section.key === 'brokers-guild');
    const concord = resolved.sections.find((section) => section.key === 'silver-concord');
    const skills = resolved.sections.find((section) => section.key === 'skill-guilds');
    const crystal = resolved.sections.find((section) => section.key === 'crystal-artisans');

    expect(broker?.entries.map((entry) => entry.name)).toContain("The Broker's Guild");
    expect(broker?.entries.map((entry) => entry.name)).not.toContain('Silver Concord');
    expect(concord?.entries.map((entry) => entry.name)).toEqual([
      'Silver Concord',
      'Silver Concord — Guild Ranks',
      'Silver Concord — Guild Facilities',
      'Silver Concord — Rift Hunts',
    ]);
    expect(skills?.entries.map((entry) => entry.name)).toEqual(['The Human Realm Skill Guilds']);
    expect(crystal?.entries.map((entry) => entry.name)).toEqual([
      'The Angel Realm Crystal Artisan Guild',
    ]);
  });

  it('drops names that no longer exist instead of rendering blanks', () => {
    const resolved = resolveDossier(
      {
        key: 'academy',
        eyebrow: '',
        title: '',
        subtitle: '',
        introName: 'Nope',
        sections: [{ key: 's', label: 'S', color: '#fff', names: ['Nope', 'Elyndor Academy'] }],
      },
      world,
    );
    expect(resolved.entries.map((entry) => entry.name)).toEqual(['Elyndor Academy']);
  });
});
