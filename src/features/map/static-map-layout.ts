export const MAP_WIDTH = 400;
export const MAP_HEIGHT = 240;
export const PIN_X = MAP_WIDTH / 2;
export const PIN_Y = MAP_HEIGHT / 2;

const STREET = 9;

export type MapBlock = { x: number; y: number; w: number; h: number; park: boolean };
export type MapLayout = {
  blocks: MapBlock[];
  /** Wide avenue across the map, as a line. */
  avenue: { x1: number; y1: number; x2: number; y2: number };
};

// mulberry32: a tiny seeded PRNG, so the same coordinates always draw the same map.
const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seedFrom = (lat: number, lng: number) =>
  Math.abs(Math.round(lat * 10_000) * 73_856_093) ^ Math.abs(Math.round(lng * 10_000) * 19_349_663);

const round = (value: number) => Math.round(value * 10) / 10;

/** Breakpoints along one axis, jittered, always starting at 0 and ending at `size`. */
const cuts = (random: () => number, size: number, min: number, max: number) => {
  const result = [0];
  let position = 0;
  while (position < size - max) {
    position += min + random() * (max - min);
    result.push(position);
  }
  result.push(size);
  return result;
};

/** A stylised city grid: irregular blocks, a park or two, one avenue. Not a real map. */
export const buildMapLayout = (lat: number, lng: number): MapLayout => {
  const random = seeded(seedFrom(lat, lng));
  const xs = cuts(random, MAP_WIDTH, 55, 95);
  const ys = cuts(random, MAP_HEIGHT, 42, 70);

  const blocks: MapBlock[] = [];
  for (let row = 0; row < ys.length - 1; row += 1) {
    for (let col = 0; col < xs.length - 1; col += 1) {
      const x = xs[col] + STREET / 2;
      const y = ys[row] + STREET / 2;
      const w = xs[col + 1] - xs[col] - STREET;
      const h = ys[row + 1] - ys[row] - STREET;
      if (w < 10 || h < 10) continue;
      blocks.push({ x: round(x), y: round(y), w: round(w), h: round(h), park: random() < 0.12 });
    }
  }

  const slope = (random() - 0.5) * 0.9;
  const avenue = {
    x1: 0,
    y1: round(PIN_Y - slope * PIN_X),
    x2: MAP_WIDTH,
    y2: round(PIN_Y + slope * PIN_X),
  };
  return { blocks, avenue };
};
