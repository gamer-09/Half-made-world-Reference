import { useEffect, useState } from 'react';

/**
 * True once the viewport is narrow enough that the dossier views drop their
 * side panel and open entries in the usual modal instead. Mirrors the
 * `max-width: 1100px` breakpoint in styles.css.
 */
export function useNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1100px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return narrow;
}
