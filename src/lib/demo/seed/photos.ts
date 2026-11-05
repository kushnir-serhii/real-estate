/** Photo files in public/placeholders/ with their real sizes (w x h). */
export const SEED_PHOTO_FILES = {
  "flat-living-1": { width: 1280, height: 1129 },
  "flat-living-2": { width: 1280, height: 853 },
  "flat-living-3": { width: 1280, height: 854 },
  "flat-kitchen-1": { width: 1280, height: 767 },
  "flat-bedroom-1": { width: 1000, height: 667 },
  "flat-bathroom-1": { width: 1280, height: 853 },
  "house-exterior-1": { width: 1280, height: 849 },
  "house-exterior-2": { width: 1100, height: 733 },
  "office-interior-1": { width: 1280, height: 854 },
  "building-facade-1": { width: 1100, height: 733 },
  "plot-landscape-1": { width: 1280, height: 720 },
} as const;

export type SeedPhotoFile = keyof typeof SEED_PHOTO_FILES;

/** Photo set per property slug (position = index). Listings not mentioned have no photos. */
export const SEED_PHOTO_SETS: Record<string, readonly SeedPhotoFile[]> = {
  "2-kimnatna-kvartyra-na-oboloni-3f9a1c": ["flat-living-2", "flat-kitchen-1", "flat-bedroom-1", "flat-bathroom-1"],
  "studiia-v-novobudovi-na-pechersku-b27d40": ["flat-living-3", "flat-bathroom-1"],
  "2-kimnatna-kvartyra-lisovyi-masyv-c81e5a": ["flat-living-1", "flat-kitchen-1", "flat-bedroom-1"],
  "pentkhaus-z-terasoiu-holosiiv-7d02ef": ["flat-living-2", "flat-living-1", "flat-kitchen-1", "flat-bedroom-1", "flat-bathroom-1"],
  "3-kimnatna-kvartyra-bohdana-khmelnytskoho-e4a9b6": ["flat-living-2", "flat-kitchen-1", "flat-bedroom-1"],
  "2-kimnatna-kvartyra-na-podoli-52c7d8": ["flat-living-3", "flat-kitchen-1", "flat-bedroom-1", "flat-bathroom-1"],
  "1-kimnatna-kvartyra-na-berezniakakh-9a5d02": ["flat-living-1"],
  "1-kimnatna-kvartyra-v-orendu-saksahanskoho-0a6b93": ["flat-living-3", "flat-kitchen-1", "flat-bathroom-1"],
  "3-kimnatna-kvartyra-orenda-holosiivskyi-prospekt-d15f28": ["flat-living-2", "flat-bedroom-1", "flat-kitchen-1"],
  "1-kimnatna-kvartyra-podobovo-prorizna-6e84a0": ["flat-living-3", "flat-bedroom-1"],
  "2-kimnatna-kvartyra-podobovo-kostiantynivska-ab20d4": ["flat-living-1", "flat-kitchen-1", "flat-bedroom-1", "flat-bathroom-1"],
  "budynok-z-diliankoiu-v-irpeni-1d4c8e": ["house-exterior-2", "flat-living-2", "flat-kitchen-1"],
  "prostorii-budynok-u-kozyni-8a52b6": ["house-exterior-1", "house-exterior-2", "flat-living-2", "flat-kitchen-1", "flat-bedroom-1"],
  "taunkhaus-u-feofanii-2f97d3": ["house-exterior-2", "flat-living-1"],
  "chastyna-budynku-v-buchi-c6e01a": ["house-exterior-1"],
  "budynok-v-orendu-u-vyshnevomu-74b3f9": ["house-exterior-2", "flat-living-3", "flat-bedroom-1"],
  "ofis-na-shovkovychnii-b4a8d7": ["office-interior-1", "building-facade-1"],
  "torhove-prymishchennia-yaroslavskii-5a1f63": ["office-interior-1"],
  "restoran-yaroslavovomu-valu-d83b19": ["office-interior-1", "building-facade-1", "flat-kitchen-1"],
  "ofis-na-oboloni-biznes-tsentr-2c49e5": ["office-interior-1", "building-facade-1"],
  "dilianka-10-sotok-v-irpeni-f12a77": ["plot-landscape-1"],
  "dilianka-15-sotok-u-kozyni-83d6b0": ["plot-landscape-1"],
  "zemelna-dilianka-120-sotok-bucha-4be958": ["plot-landscape-1"],
};
