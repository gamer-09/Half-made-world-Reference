import { useCallback, useEffect, useState } from 'react';
import type { Entry, Relationship, StoryLink } from '../types';
import { loadSnapshot } from '../snapshot';

export type ArchiveMode = 'loading' | 'ready';

export interface ArchiveState {
  mode: ArchiveMode;
  entries: Entry[];
  relationships: Relationship[];
  storyLinks: StoryLink[];
  error: string;
}

function emptyState(): ArchiveState {
  return {
    mode: 'loading',
    entries: [],
    relationships: [],
    storyLinks: [],
    error: '',
  };
}

export function useArchive() {
  const [state, setState] = useState<ArchiveState>(emptyState);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, mode: 'loading', error: '' }));
    try {
      const data = await loadSnapshot();
      setState({
        mode: 'ready',
        entries: data.entries,
        relationships: data.relationships,
        storyLinks: data.storyLinks,
        error: '',
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        mode: s.mode === 'loading' ? 'loading' : s.mode,
        error: err instanceof Error ? err.message : 'Failed to load the archive.',
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  return {
    ...state,
    load: refresh,
  };
}
