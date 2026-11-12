"use client";

import dynamic from "next/dynamic";

import { PostEditorFallback } from "./post-editor-fallback";

// TipTap / ProseMirror are heavy and admin-only: a separate chunk, never on public routes.
const PostEditor = dynamic(() => import("./post-editor").then((module) => module.PostEditor), {
  ssr: false,
  loading: () => <PostEditorFallback />,
});

type PostBodyFieldProps = {
  id: string;
  /** Form field name for the Markdown. */
  name: string;
  value: string;
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** The editor plus a hidden input that carries its Markdown through the form to the server action. */
export const PostBodyField = ({ id, name, value, initialMarkdown, onChange, invalid, describedBy }: PostBodyFieldProps) => (
  <>
    <input type="hidden" name={name} value={value} />
    <PostEditor
      id={id}
      initialMarkdown={initialMarkdown}
      onChange={onChange}
      invalid={invalid}
      describedBy={describedBy}
    />
  </>
);
