import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../../src/lib/auth";
import { createServerApiClient } from "../../../../src/lib/api/server";
import { accessTokenCookieName, isPlatformSession, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/frameworks/updates"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");
  const currentDiffId = text(formData, "diffId");

  if (intent === "calculateDiff") {
    const frameworkKey = text(formData, "frameworkKey");
    const fromVersionKey = text(formData, "fromVersionKey");
    const toVersionKey = text(formData, "toVersionKey");

    try {
      if (isPlatformSession(session)) {
        return redirectTo(request, "/frameworks/updates");
      }
      const enabledFrameworks = await api.listEnabledFrameworks();
      if (!enabledFrameworks.some((framework) => framework.frameworkKey === frameworkKey)) {
        return redirectTo(request, "/frameworks/updates");
      }
      const diff = await api.calculateDiff({
        frameworkKey,
        fromVersionKey,
        toVersionKey
      });
      return redirectTo(request, `/frameworks/updates?diffId=${diff.id}`);
    } catch (error) {
      console.error("Failed to calculate version diff:", error);
      return redirectTo(request, `/frameworks/updates`);
    }
  }

  if (intent === "resolveImpact") {
    const impactId = text(formData, "impactId");
    const status = text(formData, "status");
    const resolutionRationale = text(formData, "resolutionRationale");

    try {
      await api.resolveImpact(impactId, {
        status: status as "accepted" | "ignored",
        resolutionRationale
      });
      return redirectTo(request, `/frameworks/updates?diffId=${currentDiffId}`);
    } catch (error) {
      console.error("Failed to resolve impact item:", error);
      return redirectTo(request, `/frameworks/updates?diffId=${currentDiffId}`);
    }
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
