import { useEffect, useMemo, useState } from "react";
import { getVirtualRange } from "../utils/virtualRows.js";

/*
 * React-side glue around getVirtualRange.
 * Listens to the scroll container's scrollTop and viewport height, and feeds
 * them to the pure function. I split it like this so the math is testable
 * without rendering anything.
 */
export function useVirtualRows({ rowCount, rowHeight, scrollRef, overscan = 8 }) {
  const [metrics, setMetrics] = useState({
    scrollTop: 0,
    viewportHeight: 480,
  });

  useEffect(() => {
    const scrollElement = scrollRef.current;

    if (!scrollElement) {
      return undefined;
    }

    const readMetrics = () => {
      setMetrics({
        scrollTop: scrollElement.scrollTop,
        viewportHeight: scrollElement.clientHeight,
      });
    };

    // Read once on mount so the first paint is already in the right window,
    // then update on scroll and on window resize.
    readMetrics();
    // passive: true tells the browser we won't call preventDefault, so it can
    // keep scrolling smooth on mobile.
    scrollElement.addEventListener("scroll", readMetrics, { passive: true });
    window.addEventListener("resize", readMetrics);

    return () => {
      scrollElement.removeEventListener("scroll", readMetrics);
      window.removeEventListener("resize", readMetrics);
    };
  }, [scrollRef]);

  return useMemo(
    () =>
      getVirtualRange({
        rowCount,
        rowHeight,
        viewportHeight: metrics.viewportHeight,
        scrollTop: metrics.scrollTop,
        overscan,
      }),
    [metrics.scrollTop, metrics.viewportHeight, overscan, rowCount, rowHeight],
  );
}
