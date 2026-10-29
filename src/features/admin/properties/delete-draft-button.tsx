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
import { deleteDraft } from "./actions";
import { INITIAL_PROPERTY_ACTION_STATE } from "./property-form-state";
import type { PropertyActionState } from "./property-form-state";
import { ADMIN_PROPERTIES_PATH } from "./properties-params";

type DeleteDraftButtonProps = { propertyId: string; title: string };

/** «Видалити чернетку» with a confirm dialog; on success goes back to the list. Errors stay in the dialog. */
export const DeleteDraftButton = ({ propertyId, title }: DeleteDraftButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissedError, setDismissedError] = useState<PropertyActionState | null>(null);

  const [state, formAction, pending] = useActionState(async (prev: PropertyActionState, formData: FormData) => {
    const next = await deleteDraft(prev, formData);
    if (next.status === "deleted") router.replace(ADMIN_PROPERTIES_PATH);
    return next;
  }, INITIAL_PROPERTY_ACTION_STATE);

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
        <Button type="button" variant="destructive" className="w-full">
          <Trash2 aria-hidden="true" />
          Видалити чернетку
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={propertyId} />
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-lg font-bold">Видалити чернетку?</AlertDialogTitle>
            <AlertDialogDescription className="text-left wrap-anywhere">
              «{title}» і всі її фото зникнуть назавжди. Відновити не вийде.
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
              Чернетку видалено. Повертаємося до списку…
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
