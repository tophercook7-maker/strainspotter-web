import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const gardenPath = req.nextUrl.pathname.startsWith("/garden");

  if (gardenPath && !session) {
    const redirectTo = req.nextUrl.pathname + req.nextUrl.search;
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/garden/:path*"],
};

