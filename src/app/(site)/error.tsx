"use client";

import { Button } from "@/components/ui/button";

type SiteErrorProps = { error: Error & { digest?: string }; reset: () => void };

const SiteError = ({ reset }: SiteErrorProps) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
    <div role="alert" className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-bold">Щось пішло не так</h1>
      <p className="text-muted-foreground">
        Не вдалося завантажити сторінку. Спробуйте ще раз або поверніться пізніше.
      </p>
    </div>
    <Button type="button" onClick={reset}>
      Спробувати ще
    </Button>
  </div>
);

export default SiteError;
