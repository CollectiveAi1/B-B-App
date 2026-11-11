import { useCallback, useEffect, useState } from 'react';
import { SECTION_IDS } from '../domain/sections';
import type { SectionId } from '../types';

/** The workspace named in the URL hash, or undefined when the hash is something else (such as #main). */
function readSection(): SectionId | undefined {
  const hash = window.location.hash.slice(1);
  return SECTION_IDS.find((id) => id === hash);
}

/**
 * Keeps the open section in the URL hash, so `/#cleaning` can be bookmarked on
 * a cleaner's phone and a reload returns to the same place.
 */
export function useHashSection(): [SectionId, (next: SectionId) => void] {
  const [section, setSection] = useState<SectionId>(() => readSection() ?? 'messages');

  useEffect(() => {
    // An unrelated hash, like the skip link's #main, leaves the open workspace alone.
    const onHashChange = () => setSection((current) => readSection() ?? current);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const select = useCallback((next: SectionId) => {
    setSection(next);
    // replaceState keeps tab switches out of the back-button history.
    window.history.replaceState(null, '', `#${next}`);
  }, []);

  return [section, select];
}
