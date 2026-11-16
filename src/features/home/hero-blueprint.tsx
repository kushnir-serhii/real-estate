import { HERO } from "@/constants/home";

type Group = { delay: number; tone: string; paths: string[] };

/* Coordinates are pixels of house-exterior-1.webp (1280x849). Traced by eye against the photo. */
const GROUPS: Group[] = [
  {
    delay: 0,
    tone: "text-on-ink",
    paths: [
      "M477 568L1280 645",
      "M477 585L1280 672",
      "M335 546H475V590",
      "M383 648V752",
      "M215 686L383 648",
      "M215 686L289 760L383 752",
      "M383 752L515 717L634 756V849",
      "M52 690C52 600 95 540 165 520S300 520 330 548",
      "M118 612C120 580 150 548 200 538S290 538 320 552",
    ],
  },
  {
    delay: 250,
    tone: "text-on-ink",
    paths: [
      "M378 362L650 400",
      "M352 395L648 415",
      "M338 400V540",
      "M353 446L388 432M353 446V540",
      "M476 553H720",
      "M650 415V553",
      "M890 566L1015 568L1195 553",
      "M1195 395H1280",
    ],
  },
  {
    delay: 550,
    tone: "text-on-ink",
    paths: [
      "M601 222V395",
      "M601 222L855 85L930 107",
      "M856 85V375",
      "M930 107L1148 175V285",
      "M668 418L920 380",
      "M648 398L862 366",
      "M925 356L975 332",
      "M1015 325L1195 392V553",
      "M975 330V565M1015 325V568",
    ],
  },
  {
    delay: 900,
    tone: "text-on-ink",
    paths: [
      "M707 243L818 188V345L708 368Z",
      "M612 305L677 275V385L612 392Z",
      "M678 258V365M706 255V368",
      "M980 224L1012 227V328H980Z",
      "M388 432L497 436V548L388 540Z",
      "M665 448L712 450V550H665Z",
      "M722 445L888 430V558H722Z",
      "M1060 422L1122 430V562H1060Z",
    ],
  },
  {
    delay: 1200,
    tone: "text-on-ink",
    paths: [
      "M612 205L852 25L952 90",
      "M852 25V85",
      "M932 280L1012 256L1180 316V375",
      "M342 390L394 305L600 340M394 305V360",
      "M930 342L1010 325L1180 375",
      "M930 280V342M1012 256V325",
    ],
  },
  {
    delay: 1450,
    tone: "text-brand-on-ink",
    paths: [
      "M290 85V540",
      "M278 85H302M278 395H302M278 540H302",
      "M601 14H1148",
      "M601 6V22M852 6V22M1148 6V22",
      "M1215 85H1262M1215 395H1262M1215 555H1262",
    ],
  },
];

const LEVELS = [
  { x: 1216, y: 80, t: "+9.20" },
  { x: 1216, y: 390, t: "+3.40" },
  { x: 1216, y: 550, t: "±0.00" },
];

/** A trace of the photographed villa that draws itself (stroke-dashoffset, groups staggered), then stays as a faint overlay exactly on the edges. */
export const HeroBlueprint = () => (
  <svg
    viewBox={`0 0 ${HERO.image.width} ${HERO.image.height}`}
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className="hero-blueprint absolute inset-0 size-full stroke-[1.8]"
    strokeLinejoin="round"
    strokeLinecap="round"
  >
    {GROUPS.map((g, gi) => (
      <g key={gi} className={`${g.tone} stroke-current`} style={{ "--d": `${g.delay}ms` } as React.CSSProperties}>
        {g.paths.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="hero-draw" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </g>
    ))}
    {LEVELS.map((l) => (
      <text
        key={l.t}
        x={l.x}
        y={l.y}
        fontSize={13}
        strokeWidth={0}
        className="hero-bp-text fill-brand-on-ink font-mono"
        style={{ "--d": "1800ms" } as React.CSSProperties}
      >
        {l.t}
      </text>
    ))}
  </svg>
);
