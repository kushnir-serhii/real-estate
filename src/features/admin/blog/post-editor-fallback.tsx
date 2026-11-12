import { Skeleton } from "@/components/ui/skeleton";

/** Textarea-sized skeleton while the editor chunk loads (it can't render on the server). */
export const PostEditorFallback = () => (
  <div role="status" aria-label="Завантаження редактора" className="overflow-hidden rounded-xl border border-control">
    <div className="flex gap-1 border-b bg-muted/40 p-1">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="size-11" />
      ))}
    </div>
    <Skeleton className="h-64 w-full rounded-none" />
  </div>
);
