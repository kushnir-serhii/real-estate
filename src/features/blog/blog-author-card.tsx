import { Building2, Phone, User } from "lucide-react";

import { BLOG_DEFAULT_AUTHOR, BLOG_POST_PAGE } from "@/constants/blog";
import { CONTACTS } from "@/constants/contacts";
import type { PropertyAgent } from "@/lib/db/properties";
import { toTel } from "@/lib/format/to-tel";
import { photoUrl } from "@/lib/photos/photo-url";

const PHONE_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-md font-medium text-foreground tabular-nums outline-none hover:text-dawn-text focus-visible:ring-3 focus-visible:ring-ring/50";

/** Author of the post: the agent with a phone, or the agency when there is none. */
export const BlogAuthorCard = ({ author }: { author: PropertyAgent | null }) => {
  const phone = author?.phones[0] ? { display: author.phones[0], href: `tel:${toTel(author.phones[0])}` } : CONTACTS.phone;
  return (
    <aside aria-label={BLOG_POST_PAGE.authorEyebrow} className="flex items-center gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      {author?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small photo in a fixed-size box
        <img
          src={photoUrl(author.photo_url)}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          className="size-16 shrink-0 rounded-full bg-muted object-cover ring-2 ring-dawn"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary text-dawn-text ring-2 ring-dawn"
        >
          {author ? <User className="size-7" /> : <Building2 className="size-7" />}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <p className="eyebrow text-dawn-text">{BLOG_POST_PAGE.authorEyebrow}</p>
        <p className="font-heading text-base font-semibold tracking-tight break-words">
          {author ? author.name : BLOG_DEFAULT_AUTHOR}
        </p>
        <p className="text-sm text-muted-foreground">
          {author ? BLOG_POST_PAGE.authorRole : BLOG_POST_PAGE.authorTeamRole}
        </p>
        <a href={phone.href} className={PHONE_CLASS}>
          <Phone className="size-4" aria-hidden="true" />
          {phone.display}
        </a>
      </div>
    </aside>
  );
};
