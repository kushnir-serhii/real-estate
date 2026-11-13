import { Suspense } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema } from "@/features/seo/schemas";
import { getSiteUrl } from "@/lib/site-url";
import { SiteFooter } from "@/components/layout/site-footer";
import { AssistantLauncher } from "@/features/assistant/assistant-launcher";
import { NavProgress } from "@/components/layout/nav-progress";
import { SiteHeader } from "@/components/layout/site-header";

const SiteLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-dvh flex-col">
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-primary focus:px-5 focus:py-3 focus:text-primary-foreground"
    >
      Перейти до змісту
    </a>
    <JsonLd data={organizationSchema(getSiteUrl())} />
    {/* useSearchParams needs a boundary; it renders nothing, so no content is hidden in the HTML */}
    <Suspense fallback={null}>
      <NavProgress />
    </Suspense>
    <SiteHeader />
    <main id="main" className="flex-1">
      {children}
    </main>
    <SiteFooter />
    <AssistantLauncher />
  </div>
);

export default SiteLayout;
