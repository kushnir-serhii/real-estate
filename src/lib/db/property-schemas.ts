import { z } from "zod";

import { HOUSING_CLASSES, PROP_KINDS, REPAIRS, WALL_MATERIALS } from "./property-values";

// zod schemas of the property enums. Kept apart from property-values.ts, which client components import (no zod in first-load JS).
export const propKindSchema = z.enum(PROP_KINDS);
export const repairSchema = z.enum(REPAIRS);
export const wallMaterialSchema = z.enum(WALL_MATERIALS);
export const housingClassSchema = z.enum(HOUSING_CLASSES);
