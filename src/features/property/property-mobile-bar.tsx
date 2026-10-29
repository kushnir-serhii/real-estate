import { Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContactPhone } from "./property-details";
import { REQUEST_ANCHOR } from "./property-details";

type PropertyMobileBarProps = { phone: ContactPhone };

/**
 * Call + request bar on phones. `sticky bottom-0` as the last child of the page: it rides the
 * viewport bottom while the page scrolls and stops above the footer, so it never covers content.
 * «Залишити заявку» scrolls to the request form. `data-property-mobile-bar` lifts the chat launcher above it.
 */
export const PropertyMobileBar = ({ phone }: PropertyMobileBarProps) => (
  <div
    data-property-mobile-bar=""
    className="sticky bottom-0 z-30 -mx-4 mt-8 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
  >
    <div className="grid grid-cols-2 gap-2">
      <a href={phone.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
        <Phone aria-hidden="true" />
        Подзвонити
      </a>
      <a href={`#${REQUEST_ANCHOR}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Залишити заявку
      </a>
    </div>
  </div>
);
