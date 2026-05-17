/*
 * Inline SVG of the Cemento logo. Using an SVG instead of a PNG so it
 * scales cleanly on any screen size and ships zero extra HTTP requests.
 *
 * If we ever want the official PNG file, drop it in `public/cemento-logo.png`
 * and replace this component's usage with <img src="/cemento-logo.png">.
 *
 * Brand palette:
 *   - black:  #1a1a1a
 *   - orange: #f97316
 */
export function CementoLogo({ height = 44 }) {
  return (
    <svg
      viewBox="0 0 320 96"
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Cemento Technologies"
    >
      {/* C-shaped badge: solid black disk minus a notch on the right */}
      <g>
        <path
          d="M 48 8
             A 40 40 0 1 1 48 88
             L 48 70
             A 22 22 0 1 0 48 26
             Z"
          fill="#1a1a1a"
        />
        {/* Orange arc that fills the top-right quarter of the inner circle */}
        <path
          d="M 48 26
             A 22 22 0 0 1 70 48
             L 48 48
             Z"
          fill="#f97316"
        />
        {/* Building shapes carved into the top of the badge */}
        <rect x="32" y="6" width="6" height="20" fill="#1a1a1a" />
        <rect x="40" y="2" width="6" height="24" fill="#1a1a1a" />
        <rect x="48" y="6" width="6" height="20" fill="#1a1a1a" />
        {/* Compass needle pointing right from the centre */}
        <line x1="48" y1="48" x2="68" y2="48" stroke="#1a1a1a" strokeWidth="2.5" />
        <circle cx="48" cy="48" r="3" fill="#1a1a1a" />
      </g>

      {/* Wordmark "cemento" + subtitle "technologies" */}
      <text
        x="108"
        y="56"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="38"
        fontWeight="600"
        fill="#1a1a1a"
        letterSpacing="-0.5"
      >
        cemento
      </text>
      <text
        x="110"
        y="80"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="16"
        fontWeight="500"
        fill="#f97316"
        letterSpacing="0.5"
      >
        technologies
      </text>
    </svg>
  );
}
