"use client";

import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deletePostAction } from "./actions";
import { ADMIN_BLOG_PATH, INITIAL_POST_DELETE_STATE } from "./post-form-values";
import type { PostDeleteState } from "./post-form-values";

type PostDeleteButtonProps = { postId: string; title: string; published: boolean };

/** «Видалити статтю» with a confirm dialog; on success goes back to the list. Errors stay in the dialog. */
export const PostDeleteButton = ({ postId, title, published }: PostDeleteButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissedError, setDismissedError] = useState<PostDeleteState | null>(null);

  const [state, formAction, pending] = useActionState(async (prev: PostDeleteState, formData: FormData) => {
    const next = await deletePostAction(prev, formData);
    if (next.status === "deleted") router.replace(ADMIN_BLOG_PATH);
    return next;
  }, INITIAL_POST_DELETE_STATE);

  const deleted = state.status === "deleted";
  const error = state.status === "error" && state !== dismissedError ? state.message : null;

  const onOpenChange = (next: boolean) => {
    if (pending || deleted) return;
    if (!next) setDismissedError(state);
    setOpen(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="w-full sm:w-auto">
          <Trash2 aria-hidden="true" />
          Видалити статтю
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={postId} />
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-2xl leading-tight font-semibold">Видалити статтю?</AlertDialogTitle>
            <AlertDialogDescription className="text-left wrap-anywhere">
              «{title || "Без заголовка"}» зникне назавжди
              {published ? ", а посилання на неї перестане відкриватися" : ""}. Відновити не вийде.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {deleted && (
            <p role="status" className="text-sm font-medium text-muted-foreground">
              Статтю видалено. Повертаємося до списку…
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending || deleted}>Скасувати</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || deleted}
              className="h-auto min-h-11 py-2 whitespace-normal"
            >
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
              {pending ? "Видаляємо…" : "Так, видалити"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
