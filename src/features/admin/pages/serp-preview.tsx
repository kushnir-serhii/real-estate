import { EyeOff } from "lucide-react";

type SerpPreviewProps = {
  /** Site origin, e.g. `https://sofiacity.example`. */
  siteUrl: string;
  /** Public path of the page (`/`, `/about`). */
  path: string;
  title: string;
  description: string;
  noindex: boolean;
};

/** `https://site.example/about` -> `site.example › about`, the way Google prints it. */
const displayUrl = (siteUrl: string, path: string) => {
  const host = new URL(siteUrl).host;
  const parts = path.split("/").filter(Boolean);
  return [host, ...parts].join(" › ");
};

/** An approximate Google result card for the current values (Google may still rewrite the text). */
export const SerpPreview = ({ siteUrl, path, title, description, noindex }: SerpPreviewProps) => (
  <figure className="flex min-w-0 flex-col gap-2">
    <figcaption className="text-sm font-medium">Як це може виглядати в Google</figcaption>
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-background p-4">
      {noindex && (
        <p className="mb-1 flex items-start gap-1.5 text-sm font-medium text-warning">
          <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Увімкнено «Не показувати в пошуку»: у Google цієї сторінки не буде.
        </p>
      )}
      <p className="truncate text-sm text-muted-foreground" title={`${siteUrl}${path}`}>
        {displayUrl(siteUrl, path)}
      </p>
      <p className="line-clamp-2 text-lg leading-snug wrap-anywhere text-primary">{title}</p>
      <p className="line-clamp-3 text-sm wrap-anywhere text-muted-foreground">{description}</p>
    </div>
  </figure>
);
