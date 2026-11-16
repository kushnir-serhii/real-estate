type Group = { delay: number; tone: string; paths: string[] };

const upperWindows = [230, 345, 460, 575].flatMap((x) => [
  `M${x} 244H${x + 95}V340H${x}Z`,
  `M${x + 47.5} 244V340`,
  `M${x} 292H${x + 95}`,
]);
const slats = Array.from({ length: 6 }, (_, i) => `M${490 + i * 12} 392V490`);
const hatch = Array.from({ length: 38 }, (_, i) => `M${30 + i * 20} 500l-8 8`).join("");

const GROUPS: Group[] = [
  { delay: 0, tone: "text-on-ink", paths: ["M20 500H820", hatch] },
  {
    delay: 500,
    tone: "text-on-ink",
    paths: [
      "M120 372V500M560 372V500",
      "M680 372V500M694 372V500",
      "M110 360H710V372H110Z",
      "M200 360V224M700 360V224",
      "M190 224H710V212H190Z",
      "M110 360V330H200V360M155 360V330",
    ],
  },
  {
    delay: 1300,
    tone: "text-on-ink",
    paths: [
      ...upperWindows,
      "M140 392H350V490H140Z",
      "M210 392V490M280 392V490",
      "M390 500V392H450V500M440 450V462",
      ...slats,
    ],
  },
  {
    delay: 2000,
    tone: "text-brand-on-ink",
    paths: [
      "M70 212V500",
      "M60 212H80M60 360H80M60 500H80",
      "M84 212H186M84 360H104M84 500H110",
      "M120 548H700",
      "M120 538V558M410 538V558M700 538V558",
      "M120 512V542M700 512V542",
      "M725 500H785M755 500l-8-12h16z",
      "M725 360H785M755 360l-8-12h16z",
      "M725 212H785M755 212l-8-12h16z",
    ],
  },
];

const LEVELS = [
  { y: 504, t: "±0.00" },
  { y: 364, t: "+3.20" },
  { y: 216, t: "+6.40" },
];

/** C: a thin-line elevation of a modern villa that draws itself (stroke-dashoffset, groups staggered), then stays as a faint overlay. */
export const BlueprintElevation = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 840 600"
    preserveAspectRatio="xMidYMid meet"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={`lab-blueprint stroke-[2.2] lg:stroke-[1.3] ${className ?? ""}`}
  >
    {GROUPS.map((g, gi) => (
      <g key={gi} className={`${g.tone} stroke-current`} style={{ "--d": `${g.delay}ms` } as React.CSSProperties}>
        {g.paths.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="lab-draw" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </g>
    ))}
    {LEVELS.map((l) => (
      <text
        key={l.t}
        x={792}
        y={l.y}
        fontSize={12}
        className="lab-bp-text fill-brand-on-ink font-mono"
        style={{ "--d": "2400ms" } as React.CSSProperties}
      >
        {l.t}
      </text>
    ))}
  </svg>
);
