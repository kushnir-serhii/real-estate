"use client";

import { useEffect, useRef } from "react";

/**
 * Submits the surrounding form when a select or checkbox changes. Text and date fields wait for
 * Enter / «Показати» (a half-typed date would navigate). Without JS the form works as a plain GET form.
 */
export const FiltersAutoSubmit = () => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (event: Event) => {
      const target = event.target;
      const instant =
        target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "checkbox");
      if (instant) form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <span ref={ref} hidden />;
};
