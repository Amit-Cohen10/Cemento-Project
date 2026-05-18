// this hook handles virtualization — only rendering the rows visible in the scroll window.
// without this, a table with 2,500 rows would put all 2,500 <tr> elements in the DOM at once,
// which would be very slow to render and scroll.
// instead, we only render the rows that are actually visible on screen (plus a few extras above
// and below for smooth scrolling), and replace all the others with invisible spacer rows.
//
// it listens to scroll events on the table's scroll container and recalculates the visible
// window every time the user scrolls or resizes the browser.
//
// it talks to: DataTable (which passes it the scrollRef and row count),
//              virtualRows.js (the pure math function that calculates which rows to render).

import { useEffect, useMemo, useState } from "react";
import { getVirtualRange } from "../utils/virtualRows.js";

export function useVirtualRows({ rowCount, rowHeight, scrollRef, overscan = 8 }) {
  // we track two numbers from the DOM: how far the user has scrolled,
  // and how tall the visible area is.
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

    // read once on first mount so the initial render shows the correct rows.
    readMetrics();

    // passive: true tells the browser we will not call preventDefault inside this handler.
    // this allows the browser to keep scrolling smooth without waiting for our code to finish.
    scrollElement.addEventListener("scroll", readMetrics, { passive: true });
    window.addEventListener("resize", readMetrics);

    // cleanup: remove the listeners when the component unmounts.
    return () => {
      scrollElement.removeEventListener("scroll", readMetrics);
      window.removeEventListener("resize", readMetrics);
    };
  }, [scrollRef]);

  // pass the current scroll position into the pure math function and get back
  // the list of row indexes to render, plus the top/bottom padding heights.
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
