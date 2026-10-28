import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export const proxy = (request: NextRequest) => updateSession(request);

export const config = {
  matcher: ["/admin/:path*"],
};
