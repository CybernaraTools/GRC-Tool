import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { textParam, type SearchParamsRecord } from "../../../src/lib/listing";
import { requireSession } from "../../../src/lib/protected-session";
import type { RetentionSchedule, DeletionJob, DeletionItem } from "../../../src/lib/api/generated";

type RetentionPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const actionsPath = "/privacy/retention/actions";

export default async function PrivacyRetentionPage({ searchParams }: RetentionPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedJobId = textParam(params, "jobId");
  const session = await requireSession(`/privacy/retention`);
  const api = createServerApiClient(session);

  let schedules: RetentionSchedule[] = [];
  let deletionJobs: DeletionJob[] = [];
  let proofs: DeletionItem[] = [];
  let apiError: string | null = null;

  try {
    [schedules, deletionJobs] = await Promise.all([
      api.listRetentionSchedules({ limit: 50, offset: 0 }),
      api.listDeletionJobs({ limit: 50, offset: 0 })
    ]);

    if (selectedJobId) {
      proofs = await api.listDeletionItems(selectedJobId, { limit: 50, offset: 0 });
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedJob = deletionJobs.find(j => j.id === selectedJobId);

  return (
    <AppShell session={session} title="Retention & Deletion Console">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <Link href="/privacy" className="badge internal" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
          Back to Privacy Operations
        </Link>
      </div>

      {apiError ? <ErrorState title="Retention information could not be loaded" detail={apiError} /> : null}

      {!apiError && (
        <div style={{ display: "grid", gap: "24px" }}>
          
          {/* Top Row: Create Retention Schedule & Trigger Deletion Job */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            
            {/* Create Retention Schedule */}
            <section className="workspace" aria-labelledby="schedule-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Retention policies</p>
                  <h2 id="schedule-heading">Define retention schedule</h2>
                </div>
              </div>
              <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                <input type="hidden" name="intent" value="createSchedule" />
                <label>
                  Data Category
                  <input name="dataCategory" required placeholder="e.g. customer_pii" />
                </label>
                <label>
                  Retention Period (Months)
                  <input name="retentionMonths" required type="number" min="1" placeholder="e.g. 36" />
                </label>
                <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", textTransform: "none", letterSpacing: "normal", fontWeight: "normal" }}>
                  <input name="legalHold" type="checkbox" style={{ width: "auto", minHeight: "auto" }} />
                  Apply Legal Hold immediately (blocks deletions)
                </label>
                <button type="submit" style={{ marginTop: "12px" }}>Save schedule</button>
              </form>
            </section>

            {/* Trigger Deletion Job */}
            <section className="workspace" aria-labelledby="trigger-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Data disposition</p>
                  <h2 id="trigger-heading">Initialize Deletion Job</h2>
                </div>
              </div>
              <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                <input type="hidden" name="intent" value="createDeletionJob" />
                <label>
                  Deletion Trigger
                  <select name="deletionTrigger" required>
                    <option value="retention_schedule">Retention Schedule Expiry</option>
                    <option value="rights_request">Subject Rights Erasure Request</option>
                    <option value="manual_dpo_override">DPO Manual Override</option>
                  </select>
                </label>
                <button type="submit" style={{ marginTop: "12px" }}>Initialize erasure execution</button>
              </form>
            </section>
          </div>

          {/* Schedules and Deletion Jobs Lists */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "24px" }}>
            
            {/* Retention Schedules List */}
            <section className="workspace" aria-labelledby="schedules-list-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Schedule registry</p>
                  <h2 id="schedules-list-heading">Active schedules</h2>
                </div>
              </div>
              <div className="tableScroller" style={{ maxHeight: "350px" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Data Category</th>
                      <th scope="col">Period</th>
                      <th scope="col">Legal Hold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                          No retention schedules defined yet.
                        </td>
                      </tr>
                    ) : (
                      schedules.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.dataCategory}</strong></td>
                          <td><code>{s.retentionMonths} months</code></td>
                          <td>
                            <span className={`badge ${s.legalHold ? "restricted" : "internal"}`}>
                              {s.legalHold ? "Active hold" : "Standard"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Deletion Jobs List */}
            <section className="workspace" aria-labelledby="jobs-list-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Jobs queue</p>
                  <h2 id="jobs-list-heading">Erasure & Deletion Jobs</h2>
                </div>
              </div>
              <div className="tableScroller" style={{ maxHeight: "350px" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Job ID</th>
                      <th scope="col">Trigger</th>
                      <th scope="col">Status</th>
                      <th scope="col">Started</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletionJobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#8a8686" }}>
                          No deletion jobs initialized.
                        </td>
                      </tr>
                    ) : (
                      deletionJobs.map((j) => (
                        <tr key={j.id} style={selectedJobId === j.id ? { background: "var(--surface-strong)" } : {}}>
                          <td>
                            <small style={{ fontFamily: "monospace" }}>{j.id.slice(0, 8)}</small>
                          </td>
                          <td><code>{j.deletionTrigger}</code></td>
                          <td>
                            <span className={`badge ${j.status === "failed" ? "restricted" : j.status === "completed" ? "internal" : "confidential"}`}>
                              {j.status}
                            </span>
                          </td>
                          <td>
                            <small>{j.startedAt ? new Date(j.startedAt).toLocaleDateString() : "Not started"}</small>
                          </td>
                          <td><Link className="reviewLink" href={`/privacy/retention?jobId=${j.id}`}>
                              View proofs
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Selected Job Proofs & Add Proof Form */}
          {selectedJob && (
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px" }}>
              
              {/* Proofs list */}
              <section className="workspace" aria-labelledby="proofs-heading">
                <div className="sectionHeader">
                  <div>
                    <p className="eyebrow">Erasure proofs</p>
                    <h2 id="proofs-heading">Recorded deletion items for Job: {selectedJob.id.slice(0, 8)}</h2>
                  </div>
                </div>
                <div className="tableScroller" style={{ maxHeight: "350px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Target Type</th>
                        <th scope="col">Target ID</th>
                        <th scope="col">Disposition</th>
                        <th scope="col">Keys</th>
                        <th scope="col">Proof Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proofs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "#8a8686" }}>
                            No proofs recorded for this deletion job.
                          </td>
                        </tr>
                      ) : (
                        proofs.map((p) => (
                          <tr key={p.id}>
                            <td><code>{p.targetType}</code></td>
                            <td><small style={{ fontFamily: "monospace" }}>{p.targetId.slice(0, 8)}</small></td>
                            <td>
                              <span className={`badge ${p.disposition === "blocked_by_hold" ? "restricted" : "internal"}`}>
                                {p.disposition}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${p.keyDestroyed ? "internal" : "confidential"}`}>
                                {p.keyDestroyed ? "Destroyed" : "Intact"}
                              </span>
                            </td>
                            <td>
                              <small style={{ fontFamily: "monospace" }}>{p.proofHash || "N/A"}</small>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Record Deletion Proof Form */}
              <section className="workspace" aria-labelledby="add-proof-heading">
                <div className="sectionHeader">
                  <div>
                    <p className="eyebrow">Dispositions</p>
                    <h2 id="add-proof-heading">Record proof of deletion</h2>
                  </div>
                </div>
                <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                  <input type="hidden" name="intent" value="createProof" />
                  <input type="hidden" name="deletionJobId" value={selectedJob.id} />
                  <label>
                    Target Type
                    <select name="targetType" required>
                      <option value="consent_event">consent_event</option>
                      <option value="data_inventory_record">data_inventory_record</option>
                      <option value="rights_request">rights_request</option>
                      <option value="evidence_object">evidence_object</option>
                      <option value="evidence_version">evidence_version</option>
                    </select>
                  </label>
                  <label>
                    Target ID (UUID)
                    <input name="targetId" required placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
                  </label>
                  <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", textTransform: "none", letterSpacing: "normal", fontWeight: "normal" }}>
                    <input name="keyDestroyed" type="checkbox" style={{ width: "auto", minHeight: "auto" }} />
                    Cryptographic key permanently destroyed
                  </label>
                  <label>
                    Proof Hash (SHA-256)
                    <input name="proofHash" required placeholder="SHA-256 hash value..." />
                  </label>
                  <button type="submit" style={{ marginTop: "12px" }}>Submit deletion proof</button>
                </form>
              </section>

            </div>
          )}

        </div>
      )}
    </AppShell>
  );
}
