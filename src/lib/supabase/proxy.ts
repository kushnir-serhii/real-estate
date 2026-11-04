import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/data-driver";
import { DEMO_COOKIE_NAME, verifyDemoSession } from "@/lib/demo/session";
import type { Database } from "./database.types";
import { getSupabasePublicEnvOrNull } from "./env";

const SIGN_IN_PATH = "/admin/sign-in";
const ROBOTS_HEADER = "noindex, nofollow";

type CookieToSet = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

/** Refreshes the Supabase auth session, syncs cookies and guards `/admin/*` for anonymous users. */
export const updateSession = async (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const admin = isAdminPath(pathname);

  const finish = (response: NextResponse) => {
    if (admin) response.headers.set("X-Robots-Tag", ROBOTS_HEADER);
    return response;
  };

  // Demo driver: the signed demo cookie decides, no Supabase call (even when its env happens to be set).
  if (isDemoMode()) {
    const signedIn = (await verifyDemoSession(request.cookies.get(DEMO_COOKIE_NAME)?.value)) !== null;
    const redirectTo = (pathnameTarget: string, searchTarget = "") => {
      const url = request.nextUrl.clone();
      url.pathname = pathnameTarget;
      url.search = searchTarget;
      return finish(NextResponse.redirect(url));
    };
    if (admin && !signedIn && pathname !== SIGN_IN_PATH) {
      return redirectTo(SIGN_IN_PATH, `?next=${encodeURIComponent(pathname + search)}`);
    }
    if (admin && signedIn && pathname === SIGN_IN_PATH) return redirectTo("/admin/leads");
    return finish(NextResponse.next({ request }));
  }

  const env = getSupabasePublicEnvOrNull();
  // Supabase not configured (CI): pass through without calling it.
  if (!env) return finish(NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  let refreshedCookies: CookieToSet[] = [];

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        refreshedCookies = cookiesToSet;
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validates the JWT and refreshes it if needed. Do not run code between
  // createServerClient and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const redirectTo = (pathnameTarget: string, searchTarget = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathnameTarget;
    url.search = searchTarget;
    const redirect = NextResponse.redirect(url);
    for (const { name, value, options } of refreshedCookies) {
      redirect.cookies.set(name, value, options);
    }
    return finish(redirect);
  };

  if (admin) {
    if (!signedIn && pathname !== SIGN_IN_PATH) {
      return redirectTo(SIGN_IN_PATH, `?next=${encodeURIComponent(pathname + search)}`);
    }
    if (signedIn && pathname === SIGN_IN_PATH) {
      return redirectTo("/admin/leads");
    }
  }

  return finish(response);
};
