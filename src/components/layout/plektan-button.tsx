// Mandatory partner badge. Static equivalent of the provided document.write snippet.
export const PlektanButton = () => (
  <a
    href="https://plektan.com/"
    title="plektan.com"
    target="_blank"
    rel="noopener"
    className="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
  >
    {/* eslint-disable-next-line @next/next/no-img-element -- external partner badge, must stay exactly as provided */}
    <img
      src="https://plektan.com/img/btn/work-with-plektan-uk.png"
      alt="Ми працюємо з PLEKTAN CRM"
      width={120}
      height={30}
    />
  </a>
);
