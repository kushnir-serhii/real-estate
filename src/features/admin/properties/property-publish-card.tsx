"use client";

import { CircleAlert, CircleCheck, Eye, EyeOff, ImageOff, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { AdminListStatus } from "@/lib/db/admin-property-filters";
import { cn } from "@/lib/utils";
import { hideProperty, publishProperty } from "./actions";
import { DeleteDraftButton } from "./delete-draft-button";
import type { PublishRequirement } from "./property-form-schema";
import { INITIAL_PROPERTY_ACTION_STATE } from "./property-form-state";
import type { PropertyActionState } from "./property-form-state";
import { propertyFieldId } from "./property-form-values";

type PropertyPublishCardProps = {
  propertyId: string;
  title: string;
  status: AdminListStatus;
  /** Never published and fully editable (`admin` mode). */
  canDelete: boolean;
  hasPhotos: boolean;
  /** The form has unsaved changes: publishing would put the stored version live. */
  dirty: boolean;
  /** How long a hidden property keeps its «sold» page. */
  soldPageDays: number;
  /** Missing fields from a publish attempt (empty after any other result). */
  onMissing: (missing: PublishRequirement[]) => void;
};

const STATUS_TEXT: Record<AdminListStatus, string> = {
  draft: "Чернетка: на сайті її не видно.",
  hidden: "Прихований: у каталозі його немає.",
  published: "Опублікований: видно в каталозі.",
};

const ACTION_LINE = "flex items-start gap-1.5 text-sm font-medium wrap-anywhere";

/** Publish / hide / delete draft, with the results announced next to the buttons. */
export const PropertyPublishCard = ({
  propertyId,
  title,
  status,
  canDelete,
  hasPhotos,
  dirty,
  soldPageDays,
  onMissing,
}: PropertyPublishCardProps) => {
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: PropertyActionState, formData: FormData): Promise<PropertyActionState> => {
      const next =
        formData.get("intent") === "hide" ? await hideProperty(prev, formData) : await publishProperty(prev, formData);
      onMissing(next.status === "incomplete" ? next.missing : []);
      return next;
    },
    INITIAL_PROPERTY_ACTION_STATE,
  );

  // The pressed button is replaced by the other one (publish <-> hide): keep the focus on the result.
  useEffect(() => {
    if (state.status === "published" || state.status === "hidden") statusRef.current?.focus();
  }, [state]);

  let success: string | null = null;
  switch (state.status) {
    case "published":
      success = "Опубліковано. Об'єкт уже видно в каталозі.";
      break;
    case "hidden":
      success = `Сховано. Ще ${soldPageDays} днів за посиланням буде сторінка «Продано», потім вона зникне.`;
      break;
    case "idle":
    case "deleted":
    case "incomplete":
    case "error":
      break;
    default: {
      const unreachable: never = state;
      success = unreachable;
    }
  }

  const canPublish = status !== "published";
  const dirtyHintId = `${propertyId}-publish-dirty`;

  return (
    <section
      aria-labelledby="publish-title"
      className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="publish-title" className="text-lg font-bold">
          Публікація
        </h2>
        <p className="text-sm text-muted-foreground">{STATUS_TEXT[status]}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={propertyId} />
        {canPublish ? (
          <Button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending || dirty}
            aria-describedby={dirty ? dirtyHintId : undefined}
            className="w-full"
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {pending ? "Публікуємо…" : "Опублікувати"}
          </Button>
        ) : (
          <>
            <Button type="submit" name="intent" value="hide" variant="outline" disabled={pending} className="w-full">
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
              {pending ? "Ховаємо…" : "Сховати"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Після цього {soldPageDays} днів за посиланням буде сторінка «Продано», потім вона зникне.
            </p>
          </>
        )}

        {canPublish && dirty && (
          <p id={dirtyHintId} className="text-sm text-muted-foreground">
            Спершу збережіть зміни: опублікується збережена версія.
          </p>
        )}

        {canPublish && !hasPhotos && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <ImageOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Без фото оголошення виглядає гірше. Опублікувати можна й без них.
          </p>
        )}

        <p
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className={cn(ACTION_LINE, "text-success outline-none empty:hidden")}
        >
          {!pending && success && (
            <>
              <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {success}
            </>
          )}
        </p>

        {!pending && state.status === "incomplete" && (
          <div role="alert" className="flex flex-col gap-1.5 text-sm text-destructive">
            <p className={ACTION_LINE}>
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Не опубліковано. Заповніть і збережіть:
            </p>
            <ul className="flex flex-col pl-6">
              {state.missing.map((item) => (
                <li key={item.field}>
                  <a
                    href={`#${propertyFieldId(item.field)}`}
                    className="inline-flex min-h-11 items-center rounded-sm font-medium underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {item.message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!pending && state.status === "error" && (
          <p role="alert" className={cn(ACTION_LINE, "text-destructive")}>
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        )}
      </form>

      {canDelete && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <DeleteDraftButton propertyId={propertyId} title={title} />
          <p className="text-sm text-muted-foreground">Чернетку ще не публікували, тож її можна видалити зовсім.</p>
        </div>
      )}
    </section>
  );
};
