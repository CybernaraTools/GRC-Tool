import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { CybernaraApiError } from "../../../src/lib/api/generated";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return NextResponse.json({ error: `Authentication required. Sign in at ${loginPath("/risks")}.` }, { status: 401 });
  }

  try {
    const api = createServerApiClient(session);
    const recommendation = await api.assistRiskProposal(await request.json());
    return NextResponse.json(recommendation);
  } catch (error) {
    const status = error instanceof CybernaraApiError ? error.status : 500;
    return NextResponse.json({ error: apiErrorMessage(error) }, { status });
  }
}
