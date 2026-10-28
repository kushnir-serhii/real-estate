import Link from "next/link";
import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import { Markdown } from "@/features/pages/markdown";
import { getPageContent } from "@/features/pages/get-page-content";

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getPageContent("about");
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    alternates: { canonical: "/about" },
  };
};

const AboutPage = async () => {
  const page = await getPageContent("about");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-balance break-words sm:text-4xl">{page.title}</h1>
      <Markdown>{page.body}</Markdown>
      <div className="flex flex-wrap gap-2">
        <Link href="/contacts" className={buttonVariants()}>
          Зв&apos;язатися з нами
        </Link>
        <Link href="/catalog" className={buttonVariants({ variant: "outline" })}>
          Перейти до каталогу
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
