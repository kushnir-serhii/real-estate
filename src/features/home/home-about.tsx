import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Markdown } from "@/features/pages/markdown";
import { cn } from "@/lib/utils";

export const HomeAbout = ({ body }: { body: string }) => (
  <section aria-label="Про агентство" className="max-w-3xl">
    <Markdown>{body}</Markdown>
    <Link href="/about" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
      Більше про нас
    </Link>
  </section>
);
