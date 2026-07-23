import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../src/lib/api/server";
import type { AuditEvent } from "../../src/lib/api/generated";
import { auditQuery, formatAuditDate, parseAuditFilters } from "../../src/lib/audit";
import { loginPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";

type AuditPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await readSessionContext();
  if (!session) {
    const query = serializeSearchParams(resolvedSearchParams);
    redirect(loginPath(`/audit${query ? `?${query}` : ""}`));
  }

  const parsed = parseAuditFilters(resolvedSearchParams);
  let events: AuditEvent[] = [];
  let apiError: string | null = null;

  if (parsed.errors.length === 0) {
    try {
      events = await createServerApiClient(session).listAuditEvents(auditQuery(parsed.filters));
    } catch (error) {
      apiError = apiErrorMessage(error);
    }
  }

  return (
    <AppShell session={session} title="Audit Log">
      <section className="workspace" aria-labelledby="audit-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">AuditSecurity</p>
            <h2 id="audit-heading">Read-only event trail</h2>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>Filtered by real `audit_events` columns</span>
            <Link href="/audit/verify" className="badge restricted" style={{ textDecoration: "none" }}>
              Verify Audit Trail
            </Link>
          </div>
        </div>

        <AuditFiltersForm defaults={resolvedSearchParams} />

        {parsed.errors.length > 0 ? (
          <ErrorState title="Filter validation failed" detail={parsed.errors.join(" ")} />
        ) : null}

        {apiError ? <ErrorState title="Audit events could not be loaded" detail={apiError} /> : null}

        {parsed.errors.length === 0 && !apiError ? <AuditTable events={events} /> : null}
      </section>
    </AppShell>
  );
}

function AuditFiltersForm({ defaults }: { defaults: Record<string, string | string[] | undefined> }) {
  return (
    <form className="filterForm" method="get" aria-label="Audit event filters">
      <label>
        Event type
        <input name="eventType" defaultValue={value(defaults.eventType)} placeholder="assessment.answer_submitted" />
      </label>
      <label>
        Target type
        <input name="targetType" defaultValue={value(defaults.targetType)} placeholder="assessment" />
      </label>
      <label>
        Target ID
        <input name="targetId" defaultValue={value(defaults.targetId)} />
      </label>
      <label>
        Actor ID
        <input name="actorId" defaultValue={value(defaults.actorId)} />
      </label>
      <label>
        Classification
        <select name="classification" defaultValue={value(defaults.classification)}>
          <option value="">Any</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted</option>
        </select>
      </label>
      <label>
        From
        <input name="from" defaultValue={value(defaults.from)} placeholder="2026-03-01T00:00:00.000Z" />
      </label>
      <label>
        To
        <input name="to" defaultValue={value(defaults.to)} placeholder="2026-03-31T23:59:59.999Z" />
      </label>
      <label>
        Limit
        <input name="limit" inputMode="numeric" defaultValue={value(defaults.limit) || "50"} />
      </label>
      <div className="formActions">
        <button type="submit">Apply filters</button>
        <a href="/audit">Reset</a>
      </div>
    </form>
  );
}

function AuditTable({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No audit events match these filters"
        detail="Try widening the date range, removing a target filter, or checking whether the session has the expected tenant context."
      />
    );
  }

  return (
    <div className="tableScroller">
      <table>
        <caption>Audit events</caption>
        <thead>
          <tr>
            <th scope="col">Occurred</th>
            <th scope="col">Event</th>
            <th scope="col">Actor</th>
            <th scope="col">Target</th>
            <th scope="col">Class</th>
            <th scope="col">Sequence</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{formatAuditDate(event.occurredAt)}</td>
              <td>
                <strong>{event.eventType}</strong>
                <small>{event.traceId}</small>
              </td>
              <td>
                <code>{event.actorId}</code>
              </td>
              <td>
                <span>{event.targetType}</span>
                <code>{event.targetId}</code>
              </td>
              <td>
                <span className={`badge ${event.classification}`}>{event.classification}</span>
              </td>
              <td>{event.sequence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function serializeSearchParams(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    if (Array.isArray(input)) {
      for (const item of input) {
        search.append(key, item);
      }
    } else if (typeof input === "string") {
      search.set(key, input);
    }
  }
  return search.toString();
}
