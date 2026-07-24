import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { PaginationControls } from "../../src/components/pagination-controls";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type { ControlMapping, HarmonizedControl } from "../../src/lib/api/generated";
import {
  firstValue,
  parsePage,
  textParam,
  type SearchParamsRecord,
  unknownToText
} from "../../src/lib/listing";
import { requireAnySession } from "../../src/lib/protected-session";
import { isPlatformSession } from "../../src/lib/session";

type HarmonizationPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function HarmonizationPage({ searchParams }: HarmonizationPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = `/harmonization${serializeSearchParams(params)}`;
  const session = await requireAnySession(nextPath);
  const isPlatform = isPlatformSession(session);
  const api = createServerApiClient(session);
  const controlsPage = parsePage(params, "controls", 25);
  const mappingsPage = parsePage(params, "mappings", 25);
  const uniquePage = parsePage(params, "unique", 25);
  const harmonizedId = textParam(params, "harmonizedId");
  const frameworkKey = textParam(params, "frameworkKey");
  let controls: HarmonizedControl[] = [];
  let selectedControl: HarmonizedControl | null = null;
  let mappingsByControl: ControlMapping[] = [];
  let mappingsByFramework: ControlMapping[] = [];
  let uniqueControls: ControlMapping[] = [];
  let enabledFrameworkKeys: string[] = [];
  let apiError: string | null = null;

  try {
    if (!isPlatform) {
      const enabledFrameworks = await api.listEnabledFrameworks();
      enabledFrameworkKeys = enabledFrameworks.map((framework) => framework.frameworkKey).sort();
    }
    controls = isPlatform
      ? await api.listPlatformHarmonizedControls({ limit: controlsPage.limit, offset: controlsPage.offset })
      : await api.listHarmonizedControls({ limit: controlsPage.limit, offset: controlsPage.offset });
    if (harmonizedId) {
      selectedControl = isPlatform
        ? await api.getPlatformHarmonizedControl(harmonizedId)
        : await api.getHarmonizedControl(harmonizedId);
      mappingsByControl = isPlatform
        ? await api.listPlatformHarmonizationMappingsByControl(harmonizedId, {
            limit: mappingsPage.limit,
            offset: mappingsPage.offset
          })
        : await api.listHarmonizationMappingsByControl(harmonizedId, {
            limit: mappingsPage.limit,
            offset: mappingsPage.offset
          });
    }
    const effectiveFrameworkKey = isPlatform || enabledFrameworkKeys.includes(frameworkKey) ? frameworkKey : "";
    if (effectiveFrameworkKey) {
      [mappingsByFramework, uniqueControls] = await Promise.all([
        isPlatform
          ? api.listPlatformHarmonizationMappingsByFramework(effectiveFrameworkKey, {
              limit: mappingsPage.limit,
              offset: mappingsPage.offset
            })
          : api.listHarmonizationMappingsByFramework(effectiveFrameworkKey, {
              limit: mappingsPage.limit,
              offset: mappingsPage.offset
            }),
        isPlatform
          ? api.listPlatformHarmonizationUniqueControlsByFramework(effectiveFrameworkKey, {
              limit: uniquePage.limit,
              offset: uniquePage.offset
            })
          : api.listHarmonizationUniqueControlsByFramework(effectiveFrameworkKey, {
              limit: uniquePage.limit,
              offset: uniquePage.offset
            })
      ]);
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Harmonization Explorer">
      <section className="workspace" aria-labelledby="harmonization-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Harmonization</p>
            <h2 id="harmonization-heading">Harmonized control library</h2>
          </div>
          <span>Mappings by control or framework</span>
        </div>

        <form className="filterForm" method="get" aria-label="Harmonization filters">
          <label>
            Harmonized control ID
            <input name="harmonizedId" defaultValue={harmonizedId} placeholder="HARM-00001" />
          </label>
          {isPlatform ? (
            <label>
              Framework key
              <input name="frameworkKey" defaultValue={frameworkKey} placeholder="SOC2" />
            </label>
          ) : (
            <label>
              Framework key
              <select name="frameworkKey" defaultValue={enabledFrameworkKeys.includes(frameworkKey) ? frameworkKey : ""}>
                <option value="">Enabled frameworks only</option>
                {enabledFrameworkKeys.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Page size
            <input name="controlsLimit" inputMode="numeric" defaultValue={String(controlsPage.limit)} />
          </label>
          <div className="formActions">
            <button type="submit">Apply server filter</button>
            <Link href="/harmonization">Reset</Link>
          </div>
        </form>

        {apiError ? <ErrorState title="Harmonization data could not be loaded" detail={apiError} /> : null}
        {!apiError ? (
          <>
            <p className="constraintNote">
              {isPlatform
                ? "Platform super-admin view: global harmonized controls and mappings only. Tenant execution data is not shown."
                : "Tenant view: harmonized controls and mappings are limited to frameworks enabled for this tenant."}
            </p>
            {!isPlatform && enabledFrameworkKeys.length === 0 ? (
              <div className="constraintNote errorNote">No frameworks are enabled for this tenant, so harmonization mappings are not available yet.</div>
            ) : null}
            <ControlsTable controls={controls} params={params} />
            <PaginationControls
              pathname="/harmonization"
              params={params}
              prefix="controls"
              limit={controlsPage.limit}
              offset={controlsPage.offset}
              itemCount={controls.length}
            />
          </>
        ) : null}
      </section>

      {!apiError && selectedControl ? <SelectedControl control={selectedControl} /> : null}

      {!apiError && harmonizedId ? (
        <section className="workspace" aria-labelledby="control-mappings-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Mappings by control</p>
              <h2 id="control-mappings-heading">{harmonizedId}</h2>
            </div>
            <span>{mappingsByControl.length} rows returned</span>
          </div>
          <MappingsTable mappings={mappingsByControl} emptyTitle="No mappings returned for this harmonized control" />
          <PaginationControls
            pathname="/harmonization"
            params={params}
            prefix="mappings"
            limit={mappingsPage.limit}
            offset={mappingsPage.offset}
            itemCount={mappingsByControl.length}
          />
        </section>
      ) : null}

      {!apiError && (isPlatform || enabledFrameworkKeys.includes(frameworkKey)) && frameworkKey ? (
        <section className="workspace" aria-labelledby="framework-mappings-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Mappings by framework</p>
              <h2 id="framework-mappings-heading">{frameworkKey}</h2>
            </div>
            <span>Mapped, partial, conflicting, and unique entries</span>
          </div>
          <MappingsTable mappings={mappingsByFramework} emptyTitle="No framework mappings returned" />
          <PaginationControls
            pathname="/harmonization"
            params={params}
            prefix="mappings"
            limit={mappingsPage.limit}
            offset={mappingsPage.offset}
            itemCount={mappingsByFramework.length}
          />
        </section>
      ) : null}

      {!apiError && (isPlatform || enabledFrameworkKeys.includes(frameworkKey)) && frameworkKey ? (
        <section className="workspace" aria-labelledby="unique-controls-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Framework-unique controls</p>
              <h2 id="unique-controls-heading">{frameworkKey} unique entries</h2>
            </div>
            <span>Controls without harmonized equivalents</span>
          </div>
          <MappingsTable mappings={uniqueControls} emptyTitle="No unique controls returned for this framework page" />
          <PaginationControls
            pathname="/harmonization"
            params={params}
            prefix="unique"
            limit={uniquePage.limit}
            offset={uniquePage.offset}
            itemCount={uniqueControls.length}
          />
        </section>
      ) : null}
    </AppShell>
  );
}

function ControlsTable({ controls, params }: { controls: HarmonizedControl[]; params: SearchParamsRecord }) {
  if (controls.length === 0) {
    return <EmptyState title="No harmonized controls found" detail="The selected page returned no controls." />;
  }

  return (
    <div className="tableScroller">
      <table>
        <caption>Harmonized controls</caption>
        <thead>
          <tr>
            <th scope="col">Harmonized ID</th>
            <th scope="col">Domain</th>
            <th scope="col">Control</th>
            <th scope="col">Source</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {controls.map((control) => (
            <tr key={control.id}>
              <td>
                <strong>{control.harmonizedId}</strong>
                {control.tenantId === "00000000-0000-4000-8000-000000000001" ? (
                  <span className="badge global">Global</span>
                ) : (
                  <span className="badge tenant">Tenant Overlay</span>
                )}
              </td>
              <td>{control.domain}</td>
              <td>
                <strong>{control.controlName}</strong>
                <small>{control.controlDescription}</small>
              </td>
              <td>
                <span>{control.sourceWorkbook}</span>
                <small>
                  {control.sourceSheet} row {control.sourceRowNumber ?? "n/a"}
                </small>
              </td>
              <td><Link className="reviewLink" href={controlHref(params, control.harmonizedId)}>Inspect mappings</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectedControl({ control }: { control: HarmonizedControl }) {
  return (
    <section className="workspace" aria-labelledby="selected-control-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Selected control</p>
          <h2 id="selected-control-heading">{control.harmonizedId}</h2>
        </div>
        <span>{control.status}</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Domain</span>
          <strong>{control.domain}</strong>
        </article>
        <article>
          <span className="label">Control name</span>
          <strong>{control.controlName}</strong>
        </article>
        <article>
          <span className="label">Description</span>
          <p>{control.controlDescription}</p>
        </article>
      </div>
    </section>
  );
}

function MappingsTable({ mappings, emptyTitle }: { mappings: ControlMapping[]; emptyTitle: string }) {
  if (mappings.length === 0) {
    return <EmptyState title={emptyTitle} detail="Try a different framework key, harmonized ID, or page offset." />;
  }

  return (
    <div className="tableScroller">
      <table>
        <caption>Control mappings</caption>
        <thead>
          <tr>
            <th scope="col">Framework</th>
            <th scope="col">Source control</th>
            <th scope="col">Harmonized target</th>
            <th scope="col">Classification</th>
            <th scope="col">Confidence</th>
            <th scope="col">Rationale</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => (
            <tr key={mapping.id}>
              <td>
                {mapping.frameworkKey}
                {mapping.tenantId === "00000000-0000-4000-8000-000000000001" ? (
                  <span className="badge global">Global</span>
                ) : (
                  <span className="badge tenant">Tenant Overlay</span>
                )}
              </td>
              <td>{mapping.sourceControlId}</td>
              <td>{mapping.harmonizedControlId}</td>
              <td>
                <span className={`badge ${mapping.mappingClassification === "unique" ? "restricted" : "internal"}`}>
                  {mapping.mappingClassification}
                </span>
              </td>
              <td>{unknownToText(mapping.confidence)}</td>
              <td>{unknownToText(mapping.rationale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function controlHref(params: SearchParamsRecord, harmonizedId: string): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value && key !== "harmonizedId") {
      search.set(key, value);
    }
  }
  search.set("harmonizedId", harmonizedId);
  return `/harmonization?${search.toString()}`;
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
