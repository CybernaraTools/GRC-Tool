import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";
import type { UniversalTaskStatus } from "../../../src/lib/api/generated";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/tasks"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "updateTaskStatus") {
    const taskId = text(formData, "taskId");
    const status = text(formData, "status");
    await api.updateUniversalTask(taskId, {
      status: status as UniversalTaskStatus
    });
    return redirectTo(request, `/tasks`);
  }

  return NextResponse.json({ error: "Unsupported task action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
