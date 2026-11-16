import type { ConnectionInfo, Entry, Relationship, StoryLink } from './types';
import { relationshipType } from './relationshipTypes';
import { storyLinkType } from './storyLinkTypes';

/**
 * Every story link and relationship that touches `entry`, in the same shape
 * `EntryDetail` renders. Shared by the dossier views and the main app.
 */
export function buildEntryConnections(
  entry: Entry | null,
  storyLinks: StoryLink[],
  relationships: Relationship[],
  resolveName: (name: string) => string,
): ConnectionInfo[] {
  if (!entry) return [];
  const out: ConnectionInfo[] = [];

  for (const link of storyLinks) {
    const source = resolveName(link.source);
    const target = resolveName(link.target);
    if (source === entry.name || target === entry.name) {
      const type = storyLinkType(link.type);
      out.push({
        kind: 'story',
        typeLabel: link.label || type.label,
        color: type.color,
        otherName: source === entry.name ? target : source,
      });
    }
  }

  for (const rel of relationships) {
    const source = resolveName(rel.source);
    const target = resolveName(rel.target);
    if (source === entry.name || target === entry.name) {
      const type = relationshipType(rel.type);
      out.push({
        kind: 'relationship',
        typeLabel: rel.label || type.label,
        color: type.color,
        otherName: source === entry.name ? target : source,
      });
    }
  }

  return out;
}
