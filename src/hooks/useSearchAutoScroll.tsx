import React, { useEffect } from 'react';

export const useSearchAutoScroll = (
  containerRef: React.RefObject<HTMLElement | null>,
  searchTerm: string,
  matchingIds: Set<string> | null,
  currentMatchIndex: number,
  setCurrentMatchIndex: (index: number | ((prev: number) => number)) => void,
  setMatchCount: (count: number) => void
) => {
  useEffect(() => {
    if (searchTerm && matchingIds && matchingIds.size > 0) {
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.querySelectorAll('[data-search-active="true"]').forEach(el => el.removeAttribute('data-search-active'));
          const matches = containerRef.current.querySelectorAll('[data-search-match="true"]');
          setMatchCount(matches.length);
          if (matches.length > 0) {
            let safeIndex = currentMatchIndex;
            if (safeIndex >= matches.length) safeIndex = 0;
            if (safeIndex < 0) safeIndex = matches.length - 1;

            if (safeIndex !== currentMatchIndex) {
              setCurrentMatchIndex(safeIndex);
            } else {
              matches[safeIndex].setAttribute('data-search-active', 'true');
              matches[safeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setMatchCount(0);
      if (containerRef.current) {
        containerRef.current.querySelectorAll('[data-search-active="true"]').forEach(el => el.removeAttribute('data-search-active'));
      }
    }
  }, [matchingIds, searchTerm, currentMatchIndex, containerRef, setCurrentMatchIndex, setMatchCount]);
};
