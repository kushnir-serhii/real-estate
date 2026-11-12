"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { createPostExtensions } from "./post-editor-extensions";
import { POST_EDITOR_PROSE } from "./post-editor-styles";
import { PostEditorToolbar } from "./post-editor-toolbar";
import { PostEditorFallback } from "./post-editor-fallback";
import { PostLinkBar } from "./post-link-bar";

type PostEditorProps = {
  /** Id of the editable area (the field's label points at it). */
  id: string;
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** The visual editor: TipTap in, Markdown out. Loaded only on the admin post pages (`post-body-field.tsx`). */
export const PostEditor = ({ id, initialMarkdown, onChange, invalid, describedBy }: PostEditorProps) => {
  const [linkOpen, setLinkOpen] = useState(false);

  const editor = useEditor({
    extensions: createPostExtensions(),
    content: initialMarkdown,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Текст статті",
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class: "min-h-64 px-4 py-3 outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getMarkdown()),
  });

  if (!editor) return <PostEditorFallback />;

  const closeLink = () => {
    setLinkOpen(false);
    editor.chain().focus().run();
  };

  const applyLink = (href: string) => {
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  const currentHref = String(editor.getAttributes("link").href ?? "");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-control bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive",
      )}
    >
      <PostEditorToolbar editor={editor} linkOpen={linkOpen} onToggleLink={() => setLinkOpen((open) => !open)} />
      {linkOpen && (
        <PostLinkBar
          initialHref={currentHref}
          onApply={applyLink}
          onRemove={editor.isActive("link") ? removeLink : null}
          onClose={closeLink}
        />
      )}
      <div className="max-h-[70dvh] overflow-y-auto">
        <EditorContent editor={editor} className={POST_EDITOR_PROSE} />
      </div>
    </div>
  );
};
