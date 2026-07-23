import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath, sessionCookieOptions } from "../../../../src/lib/auth";
import {
  accessTokenCookieName,
  refreshTokenCookieName,
  sessionContextFromSupabaseUser
} from "../../../../src/lib/session";
import { createSupabaseSessionClient } from "../../../../src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = stringField(form.get("email"));
  const password = stringField(form.get("password"));
  const nextPath = safeRedirectPath(form.get("next"));

  if (!email || !password) {
    return redirectToLogin(request, nextPath, "Email and password are required.");
  }

  const supabase = createSupabaseSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return redirectToLogin(request, nextPath, "Email or password did not match an active Cybernara account.");
  }

  if (!sessionContextFromSupabaseUser(data.user)) {
    await supabase.auth.signOut();
    return redirectToLogin(
      request,
      nextPath,
      "This Supabase user is missing Cybernara tenant or platform metadata, or has been deactivated."
    );
  }

  const response = NextResponse.redirect(sameOriginUrl(request, nextPath), { status: 303 });
  response.cookies.set(
    accessTokenCookieName,
    data.session.access_token,
    sessionCookieOptions(Math.max(60, data.session.expires_in ?? 3600))
  );
  response.cookies.set(refreshTokenCookieName, data.session.refresh_token, sessionCookieOptions(60 * 60 * 24 * 30));
  return response;
}

function redirectToLogin(request: NextRequest, nextPath: string, message: string) {
  const url = sameOriginUrl(request, "/login");
  url.searchParams.set("next", nextPath);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, { status: 303 });
}

function sameOriginUrl(request: NextRequest, path: string): URL {
  return new URL(path, request.headers.get("origin") ?? request.url);
}

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
