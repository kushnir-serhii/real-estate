"use client";

import { CircleAlert, ImageOff, ImagePlus, LoaderCircle, Replace, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PropertyField, fieldDescribedBy } from "@/features/admin/properties/property-field";
import { PropertyFormSection } from "@/features/admin/properties/property-form-section";
import { checkPhotoFile, SOURCE_LIMIT_MB } from "@/features/admin/properties/photos/photo-file-check";
import { ACCEPT_ATTRIBUTE } from "@/features/admin/properties/photos/photo-limits";
import { resizePhoto } from "@/features/admin/properties/photos/photo-resize";
import { photoUrl } from "@/lib/photos/photo-url";
import { cn } from "@/lib/utils";
import { removeCover, saveCoverAlt } from "./media-actions";
import { COVER_ALT_MAX } from "./post-cover-contract";
import { sendCover } from "./send-cover";

type PostCoverSectionProps = {
  postId: string;
  initialKey: string | null;
  initialAlt: string | null;
};

type Busy =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "uploading"; percent: number }
  | { kind: "saving-alt" }
  | { kind: "removing" };

const IDLE: Busy = { kind: "idle" };
const STATUS_LINE = "flex items-start gap-1.5 text-sm font-medium wrap-anywhere";

/**
 * Blog cover: upload / replace / remove and the alt text. Every action is saved at once (the cover has its own
 * route and actions, independent of «Зберегти»). Lives inside the post form, so Enter never submits the post.
 */
export const PostCoverSection = ({ postId, initialKey, initialAlt }: PostCoverSectionProps) => {
  const id = useId();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [coverKey, setCoverKey] = useState(initialKey);
  const [savedAlt, setSavedAlt] = useState(initialAlt ?? "");
  const [alt, setAlt] = useState(initialAlt ?? "");
  const [altError, setAltError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<Busy>(IDLE);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const working = busy.kind !== "idle";
  const altId = `${id}-alt`;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    const problem = checkPhotoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy({ kind: "processing" });
    const resized = await resizePhoto(file);
    if (!resized.ok) {
      setError(resized.message);
      setBusy(IDLE);
      return;
    }
    // Outputs are narrowest first: the widest (up to 1600 px) is the cover.
    const output = resized.photo.outputs.at(-1);
    if (!output) {
      setError("Не вдалося обробити фото. Спробуйте ще раз.");
      setBusy(IDLE);
      return;
    }
    setBusy({ kind: "uploading", percent: 0 });
    const sent = await sendCover({
      postId,
      alt: alt.trim(),
      ext: resized.photo.ext,
      output,
      onProgress: (percent) => setBusy({ kind: "uploading", percent }),
    });
    setBusy(IDLE);
    if (!sent.ok) {
      setError(sent.message);
      return;
    }
    setCoverKey(sent.key);
    setSavedAlt(sent.alt);
    setAlt(sent.alt);
    setAltError(undefined);
    setNotice("Обкладинку збережено.");
    router.refresh();
  };

  const onSaveAlt = async () => {
    setError(null);
    setNotice(null);
    if (alt.trim() === "") {
      setAltError("Опишіть, що на фото: це читають скрінрідери й пошук.");
      return;
    }
    setAltError(undefined);
    setBusy({ kind: "saving-alt" });
    const result = await saveCoverAlt(postId, alt);
    setBusy(IDLE);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSavedAlt(alt.trim());
    setAlt(alt.trim());
    setNotice("Опис збережено.");
    router.refresh();
  };

  const onRemove = async () => {
    setError(null);
    setNotice(null);
    setBusy({ kind: "removing" });
    const result = await removeCover(postId);
    setBusy(IDLE);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCoverKey(null);
    setSavedAlt("");
    setAlt("");
    setAltError(undefined);
    setNotice("Обкладинку прибрано.");
    router.refresh();
  };

  const uploadLabel =
    busy.kind === "processing"
      ? "Обробляємо фото…"
      : busy.kind === "uploading"
        ? `Завантажуємо… ${busy.percent}%`
        : coverKey
          ? "Замінити обкладинку"
          : "Додати обкладинку";

  return (
    <PropertyFormSection
      id="cover"
      title="Обкладинка"
      description="Показується в списку статей, на сторінці статті, на головній і в прев’ю посилання. Зберігається одразу, без кнопки «Зберегти»."
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
        <div className="aspect-video w-full max-w-sm shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
          {coverKey ? (
            // eslint-disable-next-line @next/next/no-img-element -- covers come from R2/public; Workers has no image optimizer
            <img
              src={photoUrl(coverKey)}
              alt={savedAlt}
              width={1280}
              height={720}
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="size-8" aria-hidden="true" />
              <span className="text-sm">Обкладинки ще немає</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              tabIndex={-1}
              aria-label="Файл обкладинки"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onFile(file);
              }}
            />
            <Button
              type="button"
              variant={coverKey ? "outline" : "default"}
              disabled={working}
              onClick={() => fileInput.current?.click()}
              className="w-full sm:w-auto"
            >
              {busy.kind === "processing" || busy.kind === "uploading" ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : coverKey ? (
                <Replace aria-hidden="true" />
              ) : (
                <ImagePlus aria-hidden="true" />
              )}
              {uploadLabel}
            </Button>

            {coverKey && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={working} className="w-full sm:w-auto">
                    {busy.kind === "removing" ? (
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 aria-hidden="true" />
                    )}
                    Прибрати
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[calc(100%-2rem)] data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
                  <AlertDialogHeader className="place-items-start text-left">
                    <AlertDialogTitle className="text-2xl leading-tight font-semibold">Прибрати обкладинку?</AlertDialogTitle>
                    <AlertDialogDescription className="text-left">
                      Фото буде видалено. У списку й на сторінці статті з’явиться заглушка.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Скасувати</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => void onRemove()} className="min-h-11">
                      Так, прибрати
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            JPEG, PNG, WebP або HEIC до {SOURCE_LIMIT_MB} МБ. Краще горизонтальне фото 16:9.
          </p>

          {coverKey && (
            <PropertyField
              id={altId}
              label="Опис фото"
              error={altError}
              hint={
                <span>
                  Коротко, що на фото. Обов’язковий.{" "}
                  <span className="tabular-nums">
                    {alt.trim().length} з {COVER_ALT_MAX}.
                  </span>
                </span>
              }
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input
                  id={altId}
                  value={alt}
                  maxLength={COVER_ALT_MAX}
                  autoComplete="off"
                  disabled={working}
                  aria-invalid={altError ? true : undefined}
                  aria-describedby={fieldDescribedBy(altId, true, altError)}
                  onChange={(event) => setAlt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (alt.trim() !== savedAlt) void onSaveAlt();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={working || alt.trim() === savedAlt}
                  onClick={() => void onSaveAlt()}
                  className="w-full sm:w-auto"
                >
                  {busy.kind === "saving-alt" ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  Зберегти опис
                </Button>
              </div>
            </PropertyField>
          )}

          <p role="status" className={cn(STATUS_LINE, "text-success empty:hidden")}>
            {notice}
          </p>
          {error && (
            <p role="alert" className={cn(STATUS_LINE, "text-destructive")}>
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      </div>
    </PropertyFormSection>
  );
};
