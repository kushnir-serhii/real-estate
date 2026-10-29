"use client";

import { SendHorizontal } from "lucide-react";
import { useId, useState } from "react";
import type { FormEvent, KeyboardEvent, Ref } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_DISCLAIMER } from "@/constants/assistant";
import { cn } from "@/lib/utils";
import { ASSISTANT_MESSAGE_MAX_LENGTH } from "./assistant-events";

type AssistantComposerProps = {
  /** A reply is on its way: typing is fine, sending waits. */
  busy: boolean;
  onSend: (text: string) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

/** The counter appears this close to the limit. */
const COUNTER_FROM = ASSISTANT_MESSAGE_MAX_LENGTH - 200;

const formatCount = new Intl.NumberFormat("uk-UA").format;

export const AssistantComposer = ({ busy, onSend, textareaRef }: AssistantComposerProps) => {
  const [value, setValue] = useState("");
  const id = useId();
  const inputId = `${id}-input`;
  const counterId = `${id}-counter`;
  const tooLongId = `${id}-too-long`;
  const disclaimerId = `${id}-disclaimer`;

  const length = value.length;
  const tooLong = length > ASSISTANT_MESSAGE_MAX_LENGTH;
  const showCounter = length >= COUNTER_FROM;
  const canSend = !busy && !tooLong && value.trim() !== "";

  const send = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };

  // Enter sends, Shift+Enter makes a new line; Enter while composing (IME) is left alone.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  };

  const describedBy = [showCounter && counterId, tooLong && tooLongId, disclaimerId].filter(Boolean).join(" ");

  return (
    <form
      onSubmit={handleSubmit}
      className="flex shrink-0 flex-col gap-2 border-t bg-popover px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <Label htmlFor={inputId} className="sr-only">
        Ваше повідомлення
      </Label>
      <div className="flex items-end gap-2">
        <Textarea
          id={inputId}
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишіть повідомлення…"
          enterKeyHint="send"
          aria-invalid={tooLong || undefined}
          aria-describedby={describedBy}
          className="max-h-32 min-h-11 resize-none rounded-xl"
        />
        <Button type="submit" size="icon" disabled={!canSend} aria-label="Надіслати повідомлення" className="rounded-xl">
          <SendHorizontal aria-hidden="true" />
        </Button>
      </div>
      {(showCounter || tooLong) && (
        <div className="flex items-start justify-between gap-2 text-xs">
          {tooLong ? (
            <p id={tooLongId} role="alert" className="font-medium text-destructive">
              Повідомлення задовге. Скоротіть його до {formatCount(ASSISTANT_MESSAGE_MAX_LENGTH)} символів.
            </p>
          ) : (
            <span />
          )}
          <p
            id={counterId}
            className={cn("shrink-0 tabular-nums text-muted-foreground", tooLong && "font-medium text-destructive")}
          >
            {formatCount(length)} / {formatCount(ASSISTANT_MESSAGE_MAX_LENGTH)}
          </p>
        </div>
      )}
      <p id={disclaimerId} className="text-center text-xs text-muted-foreground">
        {ASSISTANT_DISCLAIMER}
      </p>
    </form>
  );
};
