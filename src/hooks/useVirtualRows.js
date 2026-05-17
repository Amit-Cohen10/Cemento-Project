import { useEffect, useMemo, useState } from "react";
import { getVirtualRange } from "../utils/virtualRows.js";

// Bridges DOM scroll state into the pure virtualization utility.
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

    readMetrics();
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
