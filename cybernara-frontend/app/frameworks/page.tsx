import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { PaginationControls } from "../../src/components/pagination-controls";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type {
  FrameworkContentPack,
  FrameworkEnablement,
  FrameworkRequirement,
  RejectedContentRecord,
  SourcePackage
} from "../../src/lib/api/generated";
import {
  firstValue,
  formatDateTime,
  parsePage,
  textParam,
  type SearchParamsRecord,
  unknownToText
} from "../../src/lib/listing";
import { requireAnySession } from "../../src/lib/protected-session";
import { isPlatformSession } from "../../src/lib/session";
import { isOnlyViewer } from "../../src/lib/authorization";

type FrameworksPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function FrameworksPage({ searchParams }: FrameworksPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = `/frameworks${serializeSearchParams(params)}`;
  const session = await requireAnySession(nextPath);
  const isPlatform = isPlatformSession(session);
  const isViewer = isOnlyViewer(session);
  const api = createServerApiClient(session);
  const packsPage = parsePage(params, "packs", 25);
  const requirementsPage = parsePage(params, "requirements", 25);
  const frameworkKey = textParam(params, "frameworkKey");
  let packs: FrameworkContentPack[] = [];
  let requirements: FrameworkRequirement[] = [];
  let enabledFrameworks: FrameworkEnablement[] = [];
  let sources: SourcePackage[] = [];
  let rejected: RejectedContentRecord[] = [];
  let apiError: string | null = null;

  try {
    [packs, enabledFrameworks, sources, rejected] = await Promise.all([
      isPlatform
        ? api.listPlatformFrameworkContentPacks({ limit: packsPage.limit, offset: packsPage.offset })
        : api.listFrameworkContentPacks({ limit: packsPage.limit, offset: packsPage.offset }),
      isPlatform ? Promise.resolve([]) : api.listEnabledFrameworks(),
      isPlatform
        ? api.listPlatformFrameworkSourcePackages({ limit: 5, offset: 0 })
        : api.listFrameworkSourcePackages({ limit: 5, offset: 0 }),
      isPlatform
        ? api.listPlatformFrameworkRejectedRecords({ limit: 5, offset: 0 })
        : api.listFrameworkRejectedRecords({ limit: 5, offset: 0 })
    ]);

    requirements = isPlatform
      ? await api.listPlatformFrameworkRequirements({
          frameworkKey: frameworkKey || undefined,
          limit: requirementsPage.limit,
          offset: requirementsPage.offset
        })
      : await api.listFrameworkRequirements({
          frameworkKey: frameworkKey || undefined,
          limit: requirementsPage.limit,
          offset: requirementsPage.offset
        });
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Framework Library">
      <section className="workspace" aria-labelledby="frameworks-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Canonical catalog</p>
            <h1 id="frameworks-heading">Framework Library</h1>
          </div>
          <span>{packs.length} content packs</span>
        </div>

        <form className="filterForm" method="get" aria-label="Framework requirement filters">
          <label>
            Framework key
            <input name="frameworkKey" defaultValue={frameworkKey} placeholder="SOC2" />
          </label>
          <label>
            Page size
            <input name="requirementsLimit" inputMode="numeric" defaultValue={String(requirementsPage.limit)} />
          </label>
          <div className="formActions">
            <button type="submit">Apply server filter</button>
            <Link href="/frameworks">Reset</Link>
          </div>
        </form>

        {apiError ? <ErrorState title="Framework catalog could not be loaded" detail={apiError} /> : null}

        {!apiError ? (
          <>
            <p className="constraintNote">
              This view uses only server-supported filters. The current backend contract supports exact framework-key
              filtering and offset pagination; it does not expose free-text requirement search.
            </p>
            {isPlatform ? (
              <p className="constraintNote">Platform super-admin view: global catalog content only. Tenant enablement and assessment execution data are not shown here.</p>
            ) : null}
            <ContentPackTable packs={packs} params={params} enabledFrameworks={enabledFrameworks} isPlatform={isPlatform} isViewer={isViewer} />
            <PaginationControls
              pathname="/frameworks"
              params={params}
              prefix="packs"
              limit={packsPage.limit}
              offset={packsPage.offset}
              itemCount={packs.length}
            />
          </>
        ) : null}
      </section>

      {!apiError && !isPlatform ? <EnabledFrameworks frameworks={enabledFrameworks} isViewer={isViewer} /> : null}

      {!apiError ? (
        <section className="workspace" aria-labelledby="requirements-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Controls and sub-controls</p>
              <h2 id="requirements-heading">Canonical requirements</h2>
            </div>
            <span>{frameworkKey || "All frameworks"}</span>
          </div>
          <RequirementsTable requirements={requirements} />
          <PaginationControls
            pathname="/frameworks"
            params={params}
            prefix="requirements"
            limit={requirementsPage.limit}
            offset={requirementsPage.offset}
            itemCount={requirements.length}
          />
        </section>
      ) : null}

      {!apiError ? <LineageDiagnostics sources={sources} rejected={rejected} /> : null}
    </AppShell>
  );
}

function ContentPackTable({
  packs,
  params,
  enabledFrameworks,
  isPlatform,
  isViewer
}: {
  packs: FrameworkContentPack[];
  params: SearchParamsRecord;
  enabledFrameworks: FrameworkEnablement[];
  isPlatform: boolean;
  isViewer?: boolean;
}) {
  if (packs.length === 0) {
    return <EmptyState title="No content packs found" detail="The selected tenant has no published content packs in this page." />;
  }

  const enabledVersionIds = new Set(enabledFrameworks.map((entry) => entry.frameworkVersionId));

  return (
    <div className="tableScroller">
      <table>
        <caption>Published framework content packs</caption>
        <thead>
          <tr>
            <th scope="col">Framework</th>
            <th scope="col">Version</th>
            <th scope="col">Status</th>
            <th scope="col">Published</th>
            <th scope="col">Source hash</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {packs.map((pack) => (
            <tr key={pack.id}>
              <td>
                <strong>{pack.frameworkKey}</strong>
                <small>{pack.packVersion}</small>
              </td>
              <td>{pack.packVersion}</td>
              <td>
                <span className="badge internal">{pack.status}</span>
                {pack.tenantId === "00000000-0000-4000-8000-000000000001" ? (
                  <span className="badge global">Global</span>
                ) : (
                  <span className="badge tenant">Tenant Overlay</span>
                )}
              </td>
              <td>{pack.publishedAt ? formatDateTime(pack.publishedAt) : "Unpublished"}</td>
              <td>
                <code>{pack.sourceSha256.slice(0, 24)}</code>
              </td>
              <td>
                <div className="formActions compactActions">
                  <Link href={frameworkHref(params, pack.frameworkKey)}>View requirements</Link>
                  {isPlatform ? (
                    <span className="badge global">Global content</span>
                  ) : isViewer ? (
                    <span className="badge internal">{enabledVersionIds.has(pack.id) ? "Enabled" : "Disabled"}</span>
                  ) : enabledVersionIds.has(pack.id) ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="badge internal">Enabled</span>
                      <form action="/frameworks/actions" method="post" style={{ margin: 0 }}>
                        <input type="hidden" name="intent" value="disableFramework" />
                        <input type="hidden" name="frameworkVersionId" value={pack.id} />
                        <button type="submit" className="secondaryButton">
                          Disable framework
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action="/frameworks/actions" method="post">
                      <input type="hidden" name="intent" value="enableFramework" />
                      <input type="hidden" name="frameworkVersionId" value={pack.id} />
                      <button type="submit">Enable framework</button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnabledFrameworks({ frameworks, isViewer }: { frameworks: FrameworkEnablement[]; isViewer?: boolean }) {
  return (
    <section className="workspace" aria-labelledby="enabled-frameworks-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Tenant enablement</p>
          <h2 id="enabled-frameworks-heading">Enabled frameworks</h2>
        </div>
        <span>{frameworks.length} enabled</span>
      </div>
      {frameworks.length === 0 ? (
        <EmptyState title="No frameworks enabled" detail="Enable a published framework above to make approved questions available for assessments." />
      ) : (
        <div className="tableScroller">
          <table>
            <caption>Enabled framework versions</caption>
            <thead>
              <tr>
                <th scope="col">Framework</th>
                <th scope="col">Version</th>
                <th scope="col">Status</th>
                <th scope="col">Enabled</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((framework) => (
                <tr key={framework.id}>
                  <td>
                    <strong>{framework.frameworkKey}</strong>
                    <small>{framework.frameworkName}</small>
                  </td>
                  <td>{framework.versionKey}</td>
                  <td><span className="badge internal">{framework.status}</span></td>
                  <td>{formatDateTime(framework.subscribedAt)}</td>
                  <td>
                    {isViewer ? (
                      <span className="badge internal">Enabled</span>
                    ) : (
                      <form action="/frameworks/actions" method="post" style={{ margin: 0 }}>
                        <input type="hidden" name="intent" value="disableFramework" />
                        <input type="hidden" name="frameworkVersionId" value={framework.frameworkVersionId} />
                        <button type="submit" className="secondaryButton">
                          Disable framework
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RequirementsTable({ requirements }: { requirements: FrameworkRequirement[] }) {
  if (requirements.length === 0) {
    return <EmptyState title="No requirements found" detail="Try a different framework key or page offset." />;
  }

  return (
    <div className="tableScroller">
      <table>
        <caption>Framework requirements</caption>
        <thead>
          <tr>
            <th scope="col">Framework</th>
            <th scope="col">Control</th>
            <th scope="col">Sub-control</th>
            <th scope="col">Requirement</th>
            <th scope="col">Lineage</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((requirement) => (
            <tr key={requirement.id}>
              <td>
                {requirement.frameworkKey}
                {requirement.tenantId === "00000000-0000-4000-8000-000000000001" ? (
                  <span className="badge global">Global</span>
                ) : (
                  <span className="badge tenant">Tenant Overlay</span>
                )}
              </td>
              <td>
                <strong>{requirement.controlId}</strong>
                <small>{requirement.controlTitle}</small>
              </td>
              <td>
                <span>{unknownToText(requirement.subControlId, "Parent control")}</span>
                <small>{unknownToText(requirement.subControlTitle, "")}</small>
              </td>
              <td>{requirement.requirementText}</td>
              <td>
                <span>{requirement.sourceWorkbook}</span>
                <small>
                  {requirement.sourceSheet} row {requirement.sourceRowNumber ?? "n/a"}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineageDiagnostics({ sources, rejected }: { sources: SourcePackage[]; rejected: RejectedContentRecord[] }) {
  return (
    <section className="statusGrid" aria-label="Source diagnostics">
      <article>
        <span className="label">Recent source packages</span>
        <strong>{sources.length}</strong>
        <small>{sources.map((source) => source.sourceFileName).join(", ") || "No sources returned"}</small>
      </article>
      <article>
        <span className="label">Rejected diagnostics sampled</span>
        <strong>{rejected.length}</strong>
        <small>{rejected[0]?.reason ?? "No rejected records in this page"}</small>
      </article>
      <article>
        <span className="label">Pinned version behavior</span>
        <strong>Enablement available</strong>
        <small>Enabled frameworks seed approved baseline questions for assessment creation.</small>
      </article>
    </section>
  );
}

function frameworkHref(params: SearchParamsRecord, frameworkKey: string): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value && key !== "frameworkKey") {
      search.set(key, value);
    }
  }
  search.set("frameworkKey", frameworkKey);
  return `/frameworks?${search.toString()}`;
}

function serializeSearchParams(params: SearchParamsRecord): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
