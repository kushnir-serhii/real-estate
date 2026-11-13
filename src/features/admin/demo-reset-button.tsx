"use client";

import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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

const RESET_URL = "/api/demo/reset";
const FAILED = "Не вдалося скинути дані. Спробуйте ще раз.";

type Phase = { status: "idle" } | { status: "pending" } | { status: "done" } | { status: "error"; message: string };

/** «Скинути демо-дані»: confirm dialog, then POST; the result is announced in a status line next to the button. */
export const DemoResetButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  const pending = phase.status === "pending";

  const reset = async () => {
    setPhase({ status: "pending" });
    try {
      const response = await fetch(RESET_URL, { method: "POST" });
      if (!response.ok) throw new Error(`reset failed: ${response.status}`);
      setPhase({ status: "done" });
      setOpen(false);
      // A property created in the demo no longer exists after a reset: leave its edit page.
      if (pathname.startsWith("/admin/properties/")) router.replace("/admin/properties");
      else router.refresh();
    } catch {
      setPhase({ status: "error", message: FAILED });
    }
  };

  const onOpenChange = (next: boolean) => {
    if (pending) return;
    if (next) setPhase({ status: "idle" });
    setOpen(next);
  };

  return (
    <div className="-my-0.5 flex items-center gap-2">
      <p role="status" className="text-sm font-medium empty:hidden">
        {phase.status === "done" ? "Демо-дані скинуто" : ""}
      </p>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" className="px-3 underline underline-offset-4">
            <RotateCcw aria-hidden="true" />
            Скинути демо-дані
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-2xl leading-tight font-semibold">Скинути демо-дані?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Усі ваші зміни зникнуть: нові й змінені об’єкти, завантажені фото, сторінки, заявки та розмови з асистентом. Повернуться
              початкові тестові дані.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {phase.status === "error" && (
            <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {phase.message}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Скасувати</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={reset} className="h-auto min-h-11 py-2 whitespace-normal">
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
              {pending ? "Скидаємо…" : "Так, скинути"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
