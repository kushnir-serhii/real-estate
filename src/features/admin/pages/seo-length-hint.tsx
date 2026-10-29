import { pluralUk } from "@/lib/format/count-objects";
import { seoLengthStatus } from "@/features/pages/page-seo";

type SeoLengthHintProps = {
  length: number;
  /** Recommended range (a warning only). */
  range: { min: number; max: number };
  /** Hard limit: above it the form won't save. */
  limit: number;
  /** What happens when the field is left empty. */
  emptyText: string;
};

const symbols = (n: number) => `${n} ${pluralUk(n, { one: "символ", few: "символи", many: "символів" })}`;

/** Live length counter + advice for an SEO field. Rendered inside the field's hint (read with the field). */
export const SeoLengthHint = ({ length, range, limit, emptyText }: SeoLengthHintProps) => {
  const recommended = `рекомендовано ${range.min}–${range.max}`;
  if (length > limit) {
    return (
      <span className="font-medium text-destructive">
        <span className="tabular-nums">{symbols(length)}</span> — більше {limit}, так не збережеться. Скоротіть текст.
      </span>
    );
  }
  const status = seoLengthStatus(length, range);
  switch (status) {
    case "empty":
      return <span>{emptyText}</span>;
    case "short":
      return (
        <span>
          <span className="tabular-nums">{symbols(length)}</span>, {recommended}. Коротко, але можна.
        </span>
      );
    case "ok":
      return (
        <span>
          <span className="font-medium tabular-nums text-success">{symbols(length)}</span> — добра довжина.
        </span>
      );
    case "long":
      return (
        <span className="text-warning">
          <span className="font-medium tabular-nums">{symbols(length)}</span>, {recommended}. Задовго: у пошуку кінець
          обріжеться.
        </span>
      );
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};
