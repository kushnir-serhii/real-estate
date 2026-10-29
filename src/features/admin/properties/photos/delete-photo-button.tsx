"use client";

import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

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
import type { PhotoActionResult } from "../photo-actions";

type DeletePhotoButtonProps = {
  /** 1-based, as shown on the photo. */
  number: number;
  onDelete: () => Promise<PhotoActionResult>;
  /** After a successful delete; the caller moves the focus (the trigger is gone). */
  onDeleted: () => void;
};

type Phase = { status: "idle" } | { status: "deleting" } | { status: "error"; message: string };

/** Icon button «Видалити» with a confirm dialog; errors stay in the dialog. */
export const DeletePhotoButton = ({ number, onDelete, onDeleted }: DeletePhotoButtonProps) => {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  const deletedRef = useRef(false);
  const deleting = phase.status === "deleting";

  const onOpenChange = (next: boolean) => {
    if (deleting) return;
    if (next) setPhase({ status: "idle" });
    setOpen(next);
  };

  const confirm = async () => {
    setPhase({ status: "deleting" });
    const result = await onDelete();
    if (result.ok) {
      deletedRef.current = true;
      setOpen(false);
      onDeleted();
    } else {
      setPhase({ status: "error", message: result.message });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="w-full"
          aria-label={`Видалити фото ${number}`}
          title="Видалити"
          data-photo-control="delete"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto data-[size=default]:max-w-md data-[size=default]:sm:max-w-md"
        onCloseAutoFocus={(event) => {
          // The trigger left with the photo: the photo grid decides where the focus goes.
          if (deletedRef.current) event.preventDefault();
        }}
      >
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="text-lg font-bold">Видалити фото {number}?</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Фото зникне з об&apos;єкта і з сайту. Відновити не вийде.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {phase.status === "error" && (
          <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {phase.message}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Скасувати</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={confirm}
            className="h-auto min-h-11 py-2 whitespace-normal"
          >
            {deleting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {deleting ? "Видаляємо…" : "Так, видалити"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
