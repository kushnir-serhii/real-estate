type HeroProps = { title: string; lead: string };

export const Hero = ({ title, lead }: HeroProps) => (
  <section className="relative isolate overflow-hidden bg-muted">
    {/* eslint-disable-next-line @next/next/no-img-element -- static placeholder from public/; Workers has no image optimizer */}
    <img
      src="/placeholders/flat-living-2.webp"
      alt=""
      width={1280}
      height={853}
      fetchPriority="high"
      decoding="async"
      className="absolute inset-0 -z-10 size-full object-cover"
    />
    <div className="absolute inset-0 -z-10 bg-scrim" aria-hidden="true" />
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-14 pb-24 text-on-scrim sm:pt-20 sm:pb-28">
      <h1 className="max-w-3xl text-3xl font-bold text-balance sm:text-5xl">{title}</h1>
      <p className="max-w-2xl text-base text-pretty sm:text-lg">{lead}</p>
    </div>
  </section>
);
