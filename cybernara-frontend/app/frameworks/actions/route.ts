import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session || session.kind !== "tenant") {
    return redirectTo(request, loginPath("/frameworks"));
  }

  const api = createServerApiClient(session);
  if (text(formData, "intent") === "enableFramework") {
    await api.enableFramework({
      frameworkVersionId: text(formData, "frameworkVersionId")
    });
    return redirectTo(request, "/frameworks");
  }

  return NextResponse.json({ error: "Unsupported framework action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  revalidatePath("/frameworks");
  revalidatePath("/assessments");
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
