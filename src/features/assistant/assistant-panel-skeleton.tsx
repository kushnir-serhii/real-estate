import { Skeleton } from "@/components/ui/skeleton";
import { AssistantPanelHeader } from "./assistant-panel-header";

/** Shown while the chat code loads on first open. */
export const AssistantPanelSkeleton = () => (
  <>
    <AssistantPanelHeader />
    <div className="flex flex-1 flex-col gap-3 p-4" aria-busy="true">
      <p role="status" className="sr-only">
        Завантажуємо чат…
      </p>
      <Skeleton className="h-20 w-4/5 rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
    </div>
    <div className="shrink-0 border-t p-3">
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  </>
);
