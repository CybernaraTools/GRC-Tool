import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import { textParam, type SearchParamsRecord } from "../../../src/lib/listing";
import { requireAnySession } from "../../../src/lib/protected-session";
import { isPlatformSession } from "../../../src/lib/session";
import type {
  FrameworkContentPack,
  FrameworkDiff,
  FrameworkDiffItem,
  FrameworkEnablement,
  FrameworkUpdateImpact
} from "../../../src/lib/api/generated";
interface ControlDiffPayload {
  title?: string;
  requirementText?: string;
  citation?: string;
}

type UpdatesPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const actionsPath = "/frameworks/updates/actions";

export default async function FrameworkUpdatesPage({ searchParams }: UpdatesPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedDiffId = textParam(params, "diffId");
  const session = await requireAnySession(`/frameworks/updates`);
  const isPlatform = isPlatformSession(session);
  const api = createServerApiClient(session);

  let diffs: FrameworkDiff[] = [];
  let packs: FrameworkContentPack[] = [];
  let enabledFrameworks: FrameworkEnablement[] = [];
  let diffItems: FrameworkDiffItem[] = [];
  let impacts: FrameworkUpdateImpact[] = [];
  let apiError: string | null = null;

  try {
    const [diffRows, packRows, impactRows, enabledRows] = await Promise.all([
      isPlatform ? api.listPlatformDiffs({ limit: 50, offset: 0 }) : api.listDiffs({ limit: 50, offset: 0 }),
      isPlatform ? api.listPlatformFrameworkContentPacks({ limit: 100, offset: 0 }) : api.listFrameworkContentPacks({ limit: 100, offset: 0 }),
      isPlatform ? Promise.resolve([]) : api.listImpacts({ limit: 50, offset: 0 }),
      isPlatform ? Promise.resolve([]) : api.listEnabledFrameworks()
    ]);
    diffs = diffRows;
    enabledFrameworks = enabledRows;
    const enabledFrameworkKeys = new Set(enabledFrameworks.map((framework) => framework.frameworkKey));
    packs = isPlatform ? packRows : packRows.filter((pack) => enabledFrameworkKeys.has(pack.frameworkKey));
    impacts = impactRows;

    if (selectedDiffId) {
      diffItems = isPlatform
        ? await api.listPlatformDiffItems(selectedDiffId, { limit: 100, offset: 0 })
        : await api.listDiffItems(selectedDiffId, { limit: 100, offset: 0 });
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedDiff = diffs.find(d => d.id === selectedDiffId);

  return (
    <AppShell session={session} title="Framework Update Analysis">
      {apiError ? <ErrorState title="Framework updates could not be loaded" detail={apiError} /> : null}

      {!apiError && (
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Top Row: Diffs Calculation & Available Packs */}
          <div style={{ display: "grid", gridTemplateColumns: isPlatform ? "1fr" : "1fr 1.2fr", gap: "24px" }}>
            
            {/* Form to Calculate Diff */}
            {!isPlatform ? <section className="workspace" aria-labelledby="calc-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Framework updates</p>
                  <h2 id="calc-heading">Calculate version differences</h2>
                </div>
              </div>
              {enabledFrameworks.length === 0 ? (
                <div className="constraintNote errorNote">
                  No frameworks are enabled for this tenant, so version comparisons cannot be calculated yet.
                </div>
              ) : (
                <form action={actionsPath} method="post" className="miniForm" style={{ border: "none", background: "transparent" }}>
                  <input type="hidden" name="intent" value="calculateDiff" />
                  <label>
                    Framework key
                    <select name="frameworkKey" required>
                      {enabledFrameworks.map((framework) => (
                        <option key={framework.frameworkKey} value={framework.frameworkKey}>
                          {framework.frameworkKey}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Source Version Key
                    <input name="fromVersionKey" required placeholder="e.g. v1" />
                  </label>
                  <label>
                    Target Version Key
                    <input name="toVersionKey" required placeholder="e.g. v2" />
                  </label>
                  <button type="submit" style={{ marginTop: "12px" }}>Run version comparison</button>
                </form>
              )}
            </section> : null}

            {/* Available Content Packs Reference */}
            <section className="workspace" aria-labelledby="packs-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Reference library</p>
                  <h2 id="packs-heading">Available content packs</h2>
                </div>
                {isPlatform ? <span>Global catalog only</span> : null}
              </div>
              <div className="tableScroller" style={{ maxHeight: "280px" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Framework Key</th>
                      <th scope="col">Version Key</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packs.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                          No content packs available.
                        </td>
                      </tr>
                    ) : (
                      packs.map((p) => (
                        <tr key={p.id}>
                          <td><strong>{p.frameworkKey}</strong></td>
                          <td><code>{p.packVersion}</code></td>
                          <td>
                            <span className={`badge ${p.status === "published" ? "internal" : "confidential"}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Diffs List & Selected Diff Comparison View */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
            
            {/* Diffs List */}
            <section className="workspace" aria-labelledby="diffs-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">History</p>
                  <h2 id="diffs-heading">Calculated comparisons</h2>
                </div>
              </div>
              <div className="tableScroller" style={{ maxHeight: "400px" }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Framework</th>
                      <th scope="col">Comparison</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                          No calculations run yet.
                        </td>
                      </tr>
                    ) : (
                      diffs.map((d) => (
                        <tr key={d.id} style={selectedDiffId === d.id ? { background: "var(--surface-strong)" } : {}}>
                          <td><strong>{d.frameworkKey || "Framework"}</strong></td>
                          <td>
                            <code>{d.fromVersionKey || "v1"} ➔ {d.toVersionKey || "v2"}</code>
                          </td>
                          <td>
                            <Link href={`/frameworks/updates?diffId=${d.id}`} className="badge internal" style={{ textDecoration: "none" }}>
                              View Diffs
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Selected Diff Details */}
            <section className="workspace" aria-labelledby="diff-details-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Comparison details</p>
                  <h2 id="diff-details-heading">
                    {selectedDiff ? `Requirements Diff: ${selectedDiff.id.slice(0, 8)}` : "Select a comparison"}
                  </h2>
                </div>
              </div>
              
              {!selectedDiff ? (
                <EmptyState title="No comparison selected" detail="Select a calculated comparison from the list on the left to see requirements diffs." />
              ) : (
                <div className="tableScroller" style={{ maxHeight: "400px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "100px" }}>Change</th>
                        <th scope="col" style={{ width: "120px" }}>Control ID</th>
                        <th scope="col">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffItems.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", color: "#8a8686" }}>
                            No differences found between these versions.
                          </td>
                        </tr>
                      ) : (
                        diffItems.map((item) => {
                          const isModified = item.changeType === "modified";
                          const isAdded = item.changeType === "added";
                          const isRemoved = item.changeType === "removed";
                          const oldValue = item.oldValue as ControlDiffPayload | undefined;
                          const newValue = item.newValue as ControlDiffPayload | undefined;
                          
                          return (
                            <tr key={item.id}>
                              <td>
                                <span className={`badge ${isAdded ? "internal" : isRemoved ? "restricted" : "confidential"}`}>
                                  {item.changeType}
                                </span>
                              </td>
                              <td>
                                <strong style={{ fontFamily: "monospace" }}>{item.controlKey}</strong>
                              </td>
                              <td>
                                {isAdded && newValue && (
                                  <div style={{ color: "green" }}>
                                    <strong>+ {newValue.title}</strong>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "0.9em" }}>{newValue.requirementText}</p>
                                  </div>
                                )}
                                {isRemoved && oldValue && (
                                  <div style={{ color: "red", textDecoration: "line-through" }}>
                                    <strong>- {oldValue.title}</strong>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "0.9em" }}>{oldValue.requirementText}</p>
                                  </div>
                                )}
                                {isModified && oldValue && newValue && (
                                  <div style={{ display: "grid", gap: "8px" }}>
                                    <div style={{ color: "red", textDecoration: "line-through" }}>
                                      <strong>- {oldValue.title}</strong>
                                      <p style={{ margin: "2px 0 0 0", fontSize: "0.85em" }}>{oldValue.requirementText}</p>
                                    </div>
                                    <div style={{ color: "green" }}>
                                      <strong>+ {newValue.title}</strong>
                                      <p style={{ margin: "2px 0 0 0", fontSize: "0.85em" }}>{newValue.requirementText}</p>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Bottom Row: Active Assessment Impact Resolution Queue */}
          {!isPlatform ? <section className="workspace" aria-labelledby="impact-heading">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Remediation action</p>
                <h2 id="impact-heading">Active assessment impact queue</h2>
              </div>
              <span className="badge restricted">{impacts.filter(i => i.status === "pending").length} Pending action</span>
            </div>
            <div className="tableScroller">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Impact ID</th>
                    <th scope="col">Control Instance</th>
                    <th scope="col">Status</th>
                    <th scope="col">Resolution / Rationale</th>
                    <th scope="col" style={{ width: "300px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {impacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#8a8686", padding: "24px" }}>
                        No affected active assessments.
                      </td>
                    </tr>
                  ) : (
                    impacts.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <small style={{ fontFamily: "monospace" }}>{i.id.slice(0, 8)}</small>
                        </td>
                        <td>
                          <div>
                            <strong>Instance:</strong> <code>{i.controlInstanceId?.slice(0, 8) || "N/A"}</code>
                          </div>
                          <div style={{ marginTop: "4px" }}>
                            <strong>Assessment:</strong> <code>{i.assessmentId.slice(0, 8)}</code>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${i.status === "pending" ? "restricted" : "internal"}`}>
                            {i.status}
                          </span>
                        </td>
                        <td>
                          {i.status === "pending" ? (
                            <em style={{ color: "#8a8686" }}>Pending analysis</em>
                          ) : (
                            <div>
                              <strong>{i.resolutionRationale}</strong>
                              <small style={{ color: "#8a8686", marginTop: "2px" }}>
                                Resolved by: {i.resolvedBy?.slice(0, 8)} at {new Date(i.resolvedAt!).toLocaleDateString()}
                              </small>
                            </div>
                          )}
                        </td>
                        <td>
                          {i.status === "pending" && (
                            <form action={actionsPath} method="post" className="miniForm" style={{ padding: "0", border: "none", background: "transparent" }}>
                              <input type="hidden" name="intent" value="resolveImpact" />
                              <input type="hidden" name="impactId" value={i.id} />
                              <input type="hidden" name="diffId" value={selectedDiffId || ""} />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <select name="status" style={{ minHeight: "34px", padding: "4px 8px" }}>
                                  <option value="accepted">Accept</option>
                                  <option value="ignored">Ignore</option>
                                </select>
                                <input name="resolutionRationale" required placeholder="Rationale..." style={{ minHeight: "34px", padding: "4px 8px" }} />
                                <button type="submit" style={{ minHeight: "34px", padding: "0 12px" }}>Resolve</button>
                              </div>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section> : (
            <section className="workspace" aria-labelledby="platform-update-boundary-heading">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Platform boundary</p>
                  <h2 id="platform-update-boundary-heading">Tenant impact queue hidden</h2>
                </div>
              </div>
              <p className="constraintNote">
                Platform super-admins can inspect global content diffs here. Tenant assessment impact queues remain tenant-scoped and are not exposed in this view.
              </p>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
