"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ToolbarButtonProps = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  /** Shown in the tooltip after the label. */
  shortcut?: string;
  expanded?: boolean;
};

const ToolbarButton = ({ label, icon: Icon, onClick, pressed, disabled, shortcut, expanded }: ToolbarButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={shortcut ? `${label} (${shortcut})` : label}
    aria-pressed={pressed}
    aria-expanded={expanded}
    disabled={disabled}
    // Keep the selection in the editor when the button is clicked.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={cn(
      "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
      pressed && "bg-secondary text-secondary-foreground",
    )}
  >
    <Icon className="size-5" aria-hidden="true" />
  </button>
);

type PostEditorToolbarProps = { editor: Editor; linkOpen: boolean; onToggleLink: () => void };

/** Formatting buttons for the blog editor: labelled, 44px targets, `aria-pressed` reflects the selection. */
export const PostEditorToolbar = ({ editor, linkOpen, onToggleLink }: PostEditorToolbarProps) => {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const run = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Форматування тексту"
      className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1"
    >
      <ToolbarButton
        label="Заголовок розділу"
        icon={Heading2}
        pressed={state.h2}
        onClick={() => run().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="Підзаголовок"
        icon={Heading3}
        pressed={state.h3}
        onClick={() => run().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarButton
        label="Жирний"
        shortcut="Ctrl+B"
        icon={Bold}
        pressed={state.bold}
        onClick={() => run().toggleBold().run()}
      />
      <ToolbarButton
        label="Курсив"
        shortcut="Ctrl+I"
        icon={Italic}
        pressed={state.italic}
        onClick={() => run().toggleItalic().run()}
      />
      <ToolbarButton
        label="Маркований список"
        icon={List}
        pressed={state.bullet}
        onClick={() => run().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Нумерований список"
        icon={ListOrdered}
        pressed={state.ordered}
        onClick={() => run().toggleOrderedList().run()}
      />
      <ToolbarButton label="Цитата" icon={Quote} pressed={state.quote} onClick={() => run().toggleBlockquote().run()} />
      <ToolbarButton label="Посилання" icon={Link2} pressed={state.link} expanded={linkOpen} onClick={onToggleLink} />
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
      <ToolbarButton
        label="Скасувати дію"
        shortcut="Ctrl+Z"
        icon={Undo2}
        disabled={!state.canUndo}
        onClick={() => run().undo().run()}
      />
      <ToolbarButton
        label="Повернути дію"
        shortcut="Ctrl+Shift+Z"
        icon={Redo2}
        disabled={!state.canRedo}
        onClick={() => run().redo().run()}
      />
    </div>
  );
};
