"use client";

import { ArrowLeftRight, CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
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
import type { PropertiesMode } from "@/lib/db/property-permissions";
import { cn } from "@/lib/utils";
import { switchPropertiesSource } from "./actions";
import { INITIAL_SWITCH_SOURCE_STATE } from "./settings-state";
import type { SwitchSourceState } from "./settings-state";

type SourceSwitchProps = {
  /** The mode the button switches to (the opposite of the current one). */
  target: PropertiesMode;
  /** Consequences of the switch with the real counts (built on the server). */
  consequences: string[];
};

const COPY: Record<PropertiesMode, { button: string; title: string; confirm: string; done: string }> = {
  admin: {
    button: "Перейти на ведення в адмінці",
    title: "Вести об'єкти в адмінці?",
    confirm: "Так, вести в адмінці",
    done: "Готово: тепер об'єкти ведуться тут, в адмінці.",
  },
  plektan: {
    button: "Перейти на Plektan",
    title: "Повернутися до Plektan?",
    confirm: "Так, повернутися до Plektan",
    done: "Готово: тепер об'єкти приходять з Plektan.",
  },
};

type Result = { tone: "success" | "info"; text: string };

const resultOf = (state: SwitchSourceState): Result | null => {
  switch (state.status) {
    case "idle":
    case "error":
      return null;
    case "switched":
      return { tone: "success", text: COPY[state.mode].done };
    case "unchanged":
      return { tone: "info", text: "Нічого не змінилося: цей режим уже був увімкнений. Сторінку оновлено." };
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};

const ICONS = { success: CircleCheck, info: Info } as const;
const TONES = { success: "text-success", info: "text-muted-foreground" } as const;

/** «Перейти на …» + a confirm dialog with the consequences; the result is announced below the button. */
export const SourceSwitch = ({ target, consequences }: SourceSwitchProps) => {
  const [open, setOpen] = useState(false);
  // An error stays in the dialog until it is closed; reopening starts clean.
  const [dismissedError, setDismissedError] = useState<SwitchSourceState | null>(null);

  const [state, formAction, pending] = useActionState(async (prev: SwitchSourceState, formData: FormData) => {
    const next = await switchPropertiesSource(prev, formData);
    if (next.status !== "error") setOpen(false);
    return next;
  }, INITIAL_SWITCH_SOURCE_STATE);

  const copy = COPY[target];
  const result = resultOf(state);
  const Icon = result ? ICONS[result.tone] : null;
  const error = state.status === "error" && state !== dismissedError ? state.message : null;

  const onOpenChange = (next: boolean) => {
    if (pending) return; // keep the dialog while the switch is being saved
    if (!next) setDismissedError(state);
    setOpen(next);
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" className="h-auto min-h-11 w-full py-2 whitespace-normal sm:w-auto">
            <ArrowLeftRight aria-hidden="true" />
            {copy.button}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={target} />
            <input type="hidden" name="confirm" value="yes" />

            <AlertDialogHeader className="place-items-start text-left">
              <AlertDialogTitle className="text-lg font-bold">{copy.title}</AlertDialogTitle>
              <AlertDialogDescription>
                Після перемикання:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
              {consequences.map((line) => (
                <li key={line} className="wrap-anywhere">
                  {line}.
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted-foreground">Перемкнути назад можна будь-коли тут, у налаштуваннях.</p>

            {error && (
              <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Скасувати</AlertDialogCancel>
              <Button type="submit" disabled={pending} className="h-auto min-h-11 py-2 whitespace-normal">
                {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                {pending ? "Перемикаємо…" : copy.confirm}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <p
        role="status"
        className={cn(
          "flex items-start gap-1.5 text-sm font-medium wrap-anywhere empty:hidden",
          result && TONES[result.tone],
        )}
      >
        {result && Icon && (
          <>
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{result.text}</span>
          </>
        )}
      </p>
    </div>
  );
};
