type FieldErrorProps = { id: string; message: string | undefined };

/** Inline error under a field; `id` is what the control's `aria-describedby` points to. */
export const FieldError = ({ id, message }: FieldErrorProps) =>
  message ? (
    <p id={id} role="alert" className="text-sm font-medium break-words text-destructive">
      {message}
    </p>
  ) : null;
