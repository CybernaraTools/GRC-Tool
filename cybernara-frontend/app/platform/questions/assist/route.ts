import { NextResponse, type NextRequest } from "next/server";
import { apiErrorMessage, createServerApiClient } from "../../../../src/lib/api/server";
import { loginPath } from "../../../../src/lib/auth";
import { accessTokenCookieName, isPlatformSession, readSessionContextFromAccessToken } from "../../../../src/lib/session";

export async function POST(request: NextRequest) {
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!isPlatformSession(session)) {
    return NextResponse.json({ error: "Platform session required.", loginPath: loginPath("/platform/questions") }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid AI assist request." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const responseType = payload.responseType === "boolean" ||
    payload.responseType === "maturity" ||
    payload.responseType === "multi_select"
    ? payload.responseType
    : "text";

  try {
    const api = createServerApiClient(session);
    const suggestion = await api.assistQuestionRepositoryDraft({
      harmonizedControlId: typeof payload.harmonizedControlId === "string" ? payload.harmonizedControlId : "",
      questionText: typeof payload.questionText === "string" ? payload.questionText : "",
      responseType
    });
    return NextResponse.json(suggestion);
  } catch (error) {
    return NextResponse.json({ error: apiErrorMessage(error) }, { status: 502 });
  }
}
