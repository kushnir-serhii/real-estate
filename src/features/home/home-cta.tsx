import { Phone } from "lucide-react";

import { MessengerLinks } from "@/components/layout/messenger-links";
import { buttonVariants } from "@/components/ui/button";
import { SITE_CONFIG } from "@/lib/site-config";

export const HomeCta = () => (
  <section className="flex flex-col gap-4 rounded-xl bg-secondary p-6 text-secondary-foreground sm:p-8">
    <h2 className="text-2xl font-bold text-balance">Не знайшли потрібне?</h2>
    <p className="max-w-2xl">Зателефонуйте або напишіть — підберемо варіанти.</p>
    <div className="flex flex-wrap items-center gap-2">
      <a href={SITE_CONFIG.phone.href} className={buttonVariants({ size: "lg" })}>
        <Phone aria-hidden="true" />
        {SITE_CONFIG.phone.display}
      </a>
      <MessengerLinks />
    </div>
  </section>
);
