import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Below this, the node canvas is replaced — not shrunk. */
export const useIsCompact = () => useMediaQuery('(max-width: 980px)');
