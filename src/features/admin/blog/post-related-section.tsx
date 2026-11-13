"use client";

import { ArrowDown, ArrowUp, CircleAlert, ImageOff, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListStatusBadge } from "@/features/admin/properties/list-status-badge";
import { PropertyFormSection } from "@/features/admin/properties/property-form-section";
import { cn } from "@/lib/utils";
import { saveRelatedProperties, searchPickerProperties } from "./media-actions";
import { RELATED_MAX } from "./post-media-values";
import type { PickerProperty } from "./post-media-values";

type PostRelatedSectionProps = { postId: string; initial: PickerProperty[] };

type Search =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; items: PickerProperty[] }
  | { kind: "error"; message: string };

const SEARCH_DELAY_MS = 300;
const ICON_BUTTON = "size-11 shrink-0";

const Thumb = ({ src }: { src: string | null }) => (
  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element -- photos come from R2/public; Workers has no image optimizer
      <img src={src} alt="" width={64} height={48} loading="lazy" decoding="async" className="size-full object-cover" />
    ) : (
      <div className="flex size-full items-center justify-center text-muted-foreground">
        <ImageOff className="size-5" aria-hidden="true" />
        <span className="sr-only">Без фото</span>
      </div>
    )}
  </div>
);

const PropertyText = ({ property }: { property: PickerProperty }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
    <p className="line-clamp-2 text-sm font-medium wrap-anywhere" title={property.title}>
      {property.title}
    </p>
    <p className="truncate text-sm text-muted-foreground" title={property.address ?? undefined}>
      <span className="font-medium text-foreground tabular-nums">{property.price}</span>
      {property.address ? ` · ${property.address}` : ""}
    </p>
  </div>
);

/**
 * Related properties picker: search published properties, up to 3, order with up / down buttons (no drag).
 * Every change is saved at once. Lives inside the post form, so Enter never submits the post.
 */
export const PostRelatedSection = ({ postId, initial }: PostRelatedSectionProps) => {
  const id = useId();
  const router = useRouter();
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const full = selected.length >= RELATED_MAX;
  const hiddenCount = selected.filter((property) => property.status !== "published").length;

  const runSearch = async (text: string) => {
    const ticket = ++latest.current;
    const result = await searchPickerProperties(text);
    if (ticket !== latest.current) return;
    setSearch(result.ok ? { kind: "done", items: result.items } : { kind: "error", message: result.message });
  };

  const onQuery = (text: string) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim() === "") {
      latest.current += 1;
      setSearch({ kind: "idle" });
      return;
    }
    setSearch({ kind: "loading" });
    timer.current = setTimeout(() => void runSearch(text), SEARCH_DELAY_MS);
  };

  const apply = async (next: PickerProperty[], done: string) => {
    const previous = selected;
    setSelected(next);
    setSaving(true);
    setError(null);
    setNotice(null);
    const result = await saveRelatedProperties(
      postId,
      next.map((property) => property.id),
    );
    setSaving(false);
    if (!result.ok) {
      setSelected(previous);
      setError(result.message);
      return;
    }
    setNotice(done);
    router.refresh();
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = [...selected];
    const target = index + delta;
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    void apply(next, "Порядок збережено.");
  };

  const results = search.kind === "done" ? search.items : [];

  return (
    <PropertyFormSection
      id="related"
      title="Об’єкти до статті"
      description={`Показуються під статтею. До ${RELATED_MAX} об’єктів, у вибраному порядку. Зберігається одразу. На сайті видно лише опубліковані об’єкти.`}
    >
      <div className="flex flex-col gap-2">
        <h3 className="font-sans text-sm font-medium">
          Вибрано: <span className="tabular-nums">{selected.length}</span> з {RELATED_MAX}
        </h3>
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Об’єктів ще немає. Знайдіть їх у пошуку нижче.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {selected.map((property, index) => (
              <li
                key={property.id}
                className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted/40 p-2 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums">{index + 1}</span>
                  <Thumb src={property.thumb} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <PropertyText property={property} />
                    {property.status !== "published" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <ListStatusBadge status={property.status} />
                        <span className="text-xs text-muted-foreground">Не показується на сайті</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={ICON_BUTTON}
                    disabled={saving || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Підняти вище: ${property.title}`}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={ICON_BUTTON}
                    disabled={saving || index === selected.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Опустити нижче: ${property.title}`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={ICON_BUTTON}
                    disabled={saving}
                    onClick={() =>
                      void apply(
                        selected.filter((other) => other.id !== property.id),
                        "Об’єкт прибрано зі статті.",
                      )
                    }
                    aria-label={`Прибрати зі статті: ${property.title}`}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        {hiddenCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Об’єкти без позначки «Опубліковано» під статтею не показуються, але лишаються в списку.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-search`} className="text-sm font-medium">
          Знайти опублікований об’єкт
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={`${id}-search`}
            type="search"
            value={query}
            maxLength={100}
            autoComplete="off"
            placeholder="Назва, адреса або код об’єкта"
            aria-describedby={`${id}-search-hint`}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            className="pl-9"
          />
        </div>
        <p id={`${id}-search-hint`} className="text-sm text-muted-foreground">
          {full
            ? `Вибрано максимум — ${RELATED_MAX} об’єкти. Приберіть один, щоб додати інший.`
            : "Знайдені лише опубліковані об’єкти."}
        </p>

        <div aria-live="polite" className="flex flex-col gap-2">
          {search.kind === "loading" && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Шукаємо…
            </p>
          )}
          {search.kind === "error" && (
            <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {search.message}
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => void runSearch(query)}>
                Повторити
              </Button>
            </p>
          )}
          {search.kind === "done" && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Нічого не знайдено серед опублікованих об’єктів. Спробуйте інше слово.
            </p>
          )}
          {results.length > 0 && (
            <ul className="flex flex-col gap-2">
              {results.map((property) => {
                const added = selected.some((other) => other.id === property.id);
                return (
                  <li
                    key={property.id}
                    className={cn(
                      "flex min-w-0 flex-col gap-2 rounded-lg p-2 ring-1 ring-foreground/10 sm:flex-row sm:items-center",
                      added && "bg-muted/40",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Thumb src={property.thumb} />
                      <PropertyText property={property} />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || added || full}
                      onClick={() => void apply([...selected, property], "Об’єкт додано до статті.")}
                      aria-label={`Додати до статті: ${property.title}`}
                      className="w-full sm:w-auto"
                    >
                      <Plus aria-hidden="true" />
                      {added ? "Додано" : "Додати"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p role="status" className="flex items-start gap-1.5 text-sm font-medium text-success empty:hidden">
        {saving ? "Зберігаємо…" : notice}
      </p>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium wrap-anywhere text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </PropertyFormSection>
  );
};
