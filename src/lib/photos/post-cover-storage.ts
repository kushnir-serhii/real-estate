import "server-only";
import { isDemoMode } from "@/lib/data-driver";
import { deleteDemoObjects } from "@/lib/demo/photos";
import { deleteObjects } from "@/lib/r2";

/**
 * Deletes a blog cover object. Never throws (the row is already updated; an orphan is harmless, so a failure is
 * only logged). Seed covers (`placeholders/…`) and external URLs are never touched: only `posts/…` keys in R2 and
 * `demo-uploads/…` keys in the demo store are removed.
 */
export const deletePostCoverObject = async (key: string | null): Promise<void> => {
  if (key === null || key === "") return;
  try {
    if (isDemoMode()) deleteDemoObjects([key]);
    else if (key.startsWith("posts/")) await deleteObjects([key]);
  } catch (error) {
    console.error(`deletePostCoverObject failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
};
