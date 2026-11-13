import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our type-scale utilities (globals.css) are font sizes; without this, tailwind-merge reads `text-h3` as a colour
// and `cn("text-h3", "text-muted-foreground")` drops the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "price"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
