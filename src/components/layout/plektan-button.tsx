import Image from "next/image";

// Partner badge, stored locally (public/partners). Shown only while the Plektan integration is on:
// `PLEKTAN_API_KEY` is read on the server and never reaches the client.
export const isPlektanEnabled = () => (process.env.PLEKTAN_API_KEY ?? "").trim() !== "";

export const PlektanButton = () => {
  if (!isPlektanEnabled()) return null;
  return (
    <a
      href="https://plektan.com/"
      title="plektan.com"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Image
        src="/partners/work-with-plektan-uk.png"
        alt="Ми працюємо з PLEKTAN CRM"
        width={120}
        height={30}
        unoptimized
      />
    </a>
  );
};
