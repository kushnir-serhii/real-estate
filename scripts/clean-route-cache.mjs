// Runs before `pnpm build`: Next 16 keeps prerendered pages in `.next/server/route-cache/` and `next build`
// does not clear it, so `next start` could serve a page from an older build. Remove it (cross-platform).
import { rmSync } from "node:fs";

rmSync(".next/server/route-cache", { recursive: true, force: true });
