"use client";

import { CircleAlert, CircleCheck, Clock, LoaderCircle, RotateCw, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadItem } from "./photo-upload-queue";

type PhotoUploadListProps = {
  items: readonly UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
};

type Line = { icon: React.ReactNode; text: string; tone: "muted" | "success" | "error" };

const SPIN = "size-4 shrink-0 animate-spin";
const ICON = "size-4 shrink-0";

const lineOf = (item: UploadItem): Line => {
  switch (item.status) {
    case "queued":
      return { icon: <Clock className={ICON} aria-hidden="true" />, text: "У черзі", tone: "muted" };
    case "processing":
      return { icon: <LoaderCircle className={SPIN} aria-hidden="true" />, text: "Обробка…", tone: "muted" };
    case "waiting":
      return { icon: <Clock className={ICON} aria-hidden="true" />, text: "Чекає на завантаження", tone: "muted" };
    case "uploading":
      return { icon: <Upload className={ICON} aria-hidden="true" />, text: `Завантаження ${item.progress}%`, tone: "muted" };
    case "done":
      return { icon: <CircleCheck className={ICON} aria-hidden="true" />, text: "Готово", tone: "success" };
    case "failed":
      return { icon: <CircleAlert className={ICON} aria-hidden="true" />, text: item.message, tone: "error" };
    default: {
      const unreachable: never = item;
      return unreachable;
    }
  }
};

const TONE: Record<Line["tone"], string> = {
  muted: "text-muted-foreground",
  success: "text-success",
  error: "text-destructive",
};

/** Per-file progress of the photos being added. Not a live region: the summary above it is. */
export const PhotoUploadList = ({ items, onRetry, onDismiss }: PhotoUploadListProps) => (
  <ul aria-label="Завантаження фото" className="flex w-full flex-col gap-2">
    {items.map((item) => {
      const line = lineOf(item);
      return (
        <li key={item.id} className="flex min-h-14 items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-sm font-medium" title={item.name}>
              {item.name}
            </p>
            <div className={cn("flex min-w-0 items-start gap-1.5 text-sm", TONE[line.tone])}>
              <span className="mt-0.5">{line.icon}</span>
              <span className={cn("wrap-anywhere", item.status === "uploading" && "shrink-0 tabular-nums")}>
                {line.text}
              </span>
              {item.status === "uploading" && (
                <progress
                  value={item.progress}
                  max={100}
                  aria-label={`${item.name}: ${line.text}`}
                  className="mt-1.5 h-1.5 min-w-0 flex-1 appearance-none overflow-hidden rounded-full bg-background [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-background [&::-webkit-progress-value]:bg-primary"
                />
              )}
            </div>
          </div>
          {item.status === "failed" && item.canRetry && (
            <Button type="button" variant="outline" onClick={() => onRetry(item.id)} className="bg-background">
              <RotateCw aria-hidden="true" />
              Повторити
            </Button>
          )}
          {(item.status === "failed" || item.status === "done") && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Прибрати «${item.name}» зі списку`}
              title="Прибрати зі списку"
              onClick={() => onDismiss(item.id)}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </li>
      );
    })}
  </ul>
);
