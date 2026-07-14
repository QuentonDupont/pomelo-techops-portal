// src/components/board/useContainerWidth.js
// Container-aware sizing: observe an element's content width with
// ResizeObserver so the board can adapt card density to the space each
// column actually gets — window breakpoints lie once a sidebar is involved.

import { useEffect, useRef, useState } from 'react';

export function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}
