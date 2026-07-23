import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { requireSession } from "../../../src/lib/protected-session";
import type { AuditCheckpoint, AuditVerification } from "../../../src/lib/api/generated";

const actionsPath = "/audit/verify/actions";

export default async function AuditVerifyPage() {
  const session = await requireSession(`/audit/verify`);
  const api = createServerApiClient(session);

  let checkpoints: AuditCheckpoint[] = [];
  let verifications: AuditVerification[] = [];
  let apiError: string | null = null;

  try {
    [checkpoints, verifications] = await Promise.all([
      api.listAuditCheckpoints({ limit: 50, offset: 0 }),
      api.listAuditVerifications({ limit: 50, offset: 0 })
    ]);
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Audit Verification">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <Link href="/audit" className="badge internal" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Back to Audit Log
        </Link>
        <form action={actionsPath} method="post">
          <input type="hidden" name="intent" value="createCheckpoint" />
          <button type="submit" className="button">Trigger Next Checkpoint</button>
        </form>
      </div>

      {apiError ? <ErrorState title="Audit checkpoints could not be loaded" detail={apiError} /> : null}

      {!apiError && (
        <div style={{ display: "grid", gap: "24px" }}>
          
          {/* Checkpoints List */}
          <section className="workspace" aria-labelledby="checkpoints-heading">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Cryptographic Checkpoints</p>
                <h2 id="checkpoints-heading">Audit Trail Checkpoints</h2>
              </div>
              <span className="badge internal">{checkpoints.length} Checkpoints</span>
            </div>
            
            <div className="tableScroller">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Checkpoint ID</th>
                    <th scope="col">Sequence Range</th>
                    <th scope="col">Root Hash</th>
                    <th scope="col">Signed At</th>
                    <th scope="col" style={{ width: "200px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checkpoints.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#8a8686", padding: "24px" }}>
                        No audit checkpoints recorded yet. Click "Trigger Next Checkpoint" to generate one.
                      </td>
                    </tr>
                  ) : (
                    checkpoints.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <small style={{ fontFamily: "monospace" }}>{c.id.slice(0, 8)}</small>
                        </td>
                        <td>
                          <code>{c.startSequence} - {c.endSequence}</code>
                        </td>
                        <td>
                          <small style={{ fontFamily: "monospace", overflowWrap: "anywhere", fontSize: "0.85em" }}>
                            {c.rootHash}
                          </small>
                        </td>
                        <td>
                          <span>{new Date(c.signedAt).toLocaleString()}</span>
                        </td>
                        <td>
                          <form action={actionsPath} method="post" style={{ display: "inline-block" }}>
                            <input type="hidden" name="intent" value="verifyCheckpoint" />
                            <input type="hidden" name="checkpointId" value={c.id} />
                            <button type="submit" className="badge internal" style={{ border: "none", cursor: "pointer" }}>
                              Verify Integrity
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Verification Outcomes History */}
          <section className="workspace" aria-labelledby="verifications-heading">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Verification outcomes</p>
                <h2 id="verifications-heading">Cryptographic Verification History</h2>
              </div>
              <span className="badge restricted">
                {verifications.filter(v => v.result === "fail").length} Failures
              </span>
            </div>

            <div className="tableScroller">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Verification ID</th>
                    <th scope="col">Checkpoint ID</th>
                    <th scope="col">Outcome Status</th>
                    <th scope="col">Mismatches</th>
                    <th scope="col">Verified At</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#8a8686", padding: "24px" }}>
                        No integrity verifications run yet. Click "Verify Integrity" on any checkpoint above.
                      </td>
                    </tr>
                  ) : (
                    verifications.map((v) => {
                      const failed = v.result === "fail";
                      
                      return (
                        <tr key={v.id}>
                          <td>
                            <small style={{ fontFamily: "monospace" }}>{v.id.slice(0, 8)}</small>
                          </td>
                          <td>
                            <small style={{ fontFamily: "monospace" }}>{v.checkpointId.slice(0, 8)}</small>
                          </td>
                          <td>
                            <span className={`badge ${failed ? "restricted" : "internal"}`}>
                              {failed ? "verification_failed" : "verified_passed"}
                            </span>
                          </td>
                          <td>
                            {failed ? (
                              <div style={{ color: "red" }}>
                                <span>• Hash chain or signature check failed</span>
                                {v.mismatchSequence && <span>• Mismatch sequence: {v.mismatchSequence}</span>}
                              </div>
                            ) : (
                              <span style={{ color: "green" }}>Chain integrity intact</span>
                            )}
                          </td>
                          <td>
                            <span>{new Date(v.verifiedAt).toLocaleString()}</span>
                            <small style={{ color: "#8a8686", marginTop: "2px" }}>
                              Verifier version: {v.verifierVersion}
                            </small>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}
    </AppShell>
  );
}
