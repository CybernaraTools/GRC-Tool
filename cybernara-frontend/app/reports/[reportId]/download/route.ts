import { NextResponse, type NextRequest } from "next/server";
import { sessionBackendHeaders, accessTokenCookieName, readSessionContextFromAccessToken } from "../../../../src/lib/session";

// The generated API client's downloadAuditReport() always does
// response.json() (a pre-existing codegen limitation shared by the
// existing downloadReportExport() method), which cannot handle a binary
// PDF response. Proxying the raw fetch directly here, rather than through
// the generated client, avoids that limitation without touching the
// codegen script.
export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return NextResponse.redirect(new URL(`/login?redirect=/reports/${reportId}`, request.url), 303);
  }

  const baseUrl = process.env.BACKEND_API_BASE_URL ?? "http://localhost:3000";
  const backendResponse = await fetch(`${baseUrl}/v1/audit-reports/${encodeURIComponent(reportId)}/download`, {
    headers: sessionBackendHeaders(session),
    cache: "no-store"
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return NextResponse.json({ error: `Report download failed with status ${backendResponse.status}.` }, { status: backendResponse.status });
  }

  return new NextResponse(backendResponse.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="audit-report-${reportId}.pdf"`
    }
  });
}
