import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieOptions } from "../../../../src/lib/auth";
import { accessTokenCookieName, refreshTokenCookieName } from "../../../../src/lib/session";
import { createSupabaseSessionClient } from "../../../../src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(accessTokenCookieName)?.value;
  if (accessToken) {
    const supabase = createSupabaseSessionClient(accessToken);
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(sameOriginUrl(request, "/login"), { status: 303 });
  response.cookies.set(accessTokenCookieName, "", sessionCookieOptions(0));
  response.cookies.set(refreshTokenCookieName, "", sessionCookieOptions(0));
  return response;
}

function sameOriginUrl(request: NextRequest, path: string): URL {
  return new URL(path, request.headers.get("origin") ?? request.url);
}
