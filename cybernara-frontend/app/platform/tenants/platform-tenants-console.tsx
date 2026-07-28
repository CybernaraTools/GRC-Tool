"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AdminUser, PlatformTenant } from "../../../src/lib/api/generated";

type SubmitState =
  | { kind: "idle" }
  | { kind: "working"; message: string }
  | { kind: "success"; message: string; temporaryPassword?: string }
  | { kind: "error"; message: string };

const clearanceLevels = ["public", "internal", "confidential", "restricted"] as const;

export function PlatformTenantsConsole({ tenants }: { tenants: PlatformTenant[] }) {
  const [rows, setRows] = useState(tenants);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [ready, setReady] = useState(false);
  const activeRows = rows.filter((tenant) => tenant.status === "active");

  useEffect(() => {
    setReady(true);
  }, []);

  async function submit(form: HTMLFormElement, workingMessage: string) {
    setState({ kind: "working", message: workingMessage });
    const formData = new FormData(form);
    const intentValue = formData.get("intent");
    const intent = typeof intentValue === "string" ? intentValue : "";
    const response = await fetch("/platform/tenants/actions", {
      method: "POST",
      body: formData,
      headers: { accept: "application/json" }
    });
    const body = (await response.json()) as {
      tenant?: PlatformTenant;
      user?: AdminUser;
      temporaryPassword?: string;
      error?: string;
    };
    if (!response.ok || (!body.tenant && !body.user)) {
      setState({ kind: "error", message: body.error ?? "Platform onboarding action failed." });
      return;
    }

    if (body.tenant) {
      setRows((current) => {
        const existing = current.some((tenant) => tenant.id === body.tenant?.id);
        if (!existing) {
          return [body.tenant, ...current].filter((entry): entry is PlatformTenant => Boolean(entry));
        }
        return current.map((tenant) => (tenant.id === body.tenant?.id ? body.tenant : tenant));
      });
      setState({ kind: "success", message: tenantSuccessMessage(body.tenant, intent) });
      if (intent === "createTenant") {
        form.reset();
      }
      return;
    }

    if (body.user) {
      setState({
        kind: "success",
        message: `Created first tenant admin ${body.user.email}. Share the temporary password through an approved channel.`,
        temporaryPassword: body.temporaryPassword
      });
      form.reset();
    }
  }

  return (
    <>
      <section className="workspace" aria-labelledby="platform-create-tenant-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Platform super-admin</p>
            <h2 id="platform-create-tenant-heading">Create client tenant</h2>
          </div>
          <span>{rows.length} client tenant{rows.length === 1 ? "" : "s"}</span>
        </div>

        <form
          className="filterForm"
          aria-label="Create client tenant"
          method="post"
          action="/platform/tenants/actions"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void submit(event.currentTarget, "Creating client tenant...");
          }}
        >
          <input type="hidden" name="intent" value="createTenant" />
          <label>
            Client organization name
            <input name="name" required minLength={2} />
          </label>
          <label>
            Default classification
            <select name="classification" defaultValue="confidential">
              {clearanceLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <div className="formActions">
            <button type="submit" disabled={!ready}>
              Create tenant
            </button>
          </div>
        </form>
      </section>

      <section className="workspace" aria-labelledby="platform-admin-invite-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Client first admin</p>
            <h2 id="platform-admin-invite-heading">Provision tenant admin</h2>
          </div>
          <span>Tenant-scoped role only</span>
        </div>

        <form
          className="filterForm"
          aria-label="Create first tenant admin"
          method="post"
          action="/platform/tenants/actions"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void submit(event.currentTarget, "Creating first tenant admin...");
          }}
        >
          <input type="hidden" name="intent" value="inviteFirstAdmin" />
          <label>
            Client tenant
            <select name="tenantId" required disabled={activeRows.length === 0}>
              {activeRows.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Admin email
            <input name="email" type="email" required />
          </label>
          <label>
            Display name
            <input name="displayName" />
          </label>
          <label>
            Clearance
            <select name="clearance" defaultValue="restricted">
              {clearanceLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <div className="formActions">
            <button type="submit" disabled={!ready || activeRows.length === 0}>
              Create first admin
            </button>
          </div>
        </form>

        <ActionState state={state} />
      </section>

      <section className="workspace" aria-labelledby="platform-tenants-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Client directory</p>
            <h2 id="platform-tenants-heading">Tenant onboarding list</h2>
          </div>
          <span>Operational data access excluded</span>
        </div>
        <div className="tableScroller">
          <table>
            <caption>Client tenants</caption>
            <thead>
              <tr>
                <th scope="col">Tenant</th>
                <th scope="col">Status</th>
                <th scope="col">Classification</th>
                <th scope="col">Created</th>
                <th scope="col">Access</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No client tenants exist yet.</td>
                </tr>
              ) : (
                rows.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <strong>{tenant.name}</strong>
                      <small>{tenant.id}</small>
                    </td>
                    <td>
                      <span className={`badge ${tenantBadgeClass(tenant.status)}`}>{tenant.status}</span>
                    </td>
                    <td>{tenant.classification}</td>
                    <td>{new Date(tenant.createdAt).toLocaleString()}</td>
                    <td>
                      <TenantAccessButton tenant={tenant} onSubmit={submit} ready={ready} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TenantAccessButton({
  tenant,
  onSubmit,
  ready
}: {
  tenant: PlatformTenant;
  onSubmit: (form: HTMLFormElement, workingMessage: string) => Promise<void>;
  ready: boolean;
}) {
  const activating = tenant.status !== "active";
  const intent = activating ? "activateTenant" : "deactivateTenant";
  const label = activating ? "Activate" : "Deactivate";
  const icon = activating ? "check_circle" : "block";
  return (
    <form
      className="inlineForm"
      aria-label={`${label} ${tenant.name}`}
      method="post"
      action="/platform/tenants/actions"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit(event.currentTarget, `${activating ? "Activating" : "Deactivating"} ${tenant.name}...`);
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="tenantId" value={tenant.id} />
      <button className="buttonWithIcon" type="submit" disabled={!ready}>
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
        {label}
      </button>
    </form>
  );
}

function tenantSuccessMessage(tenant: PlatformTenant, intent: string): string {
  if (intent === "deactivateTenant") {
    return `Deactivated ${tenant.name}. Tenant user login access is suspended.`;
  }
  if (intent === "activateTenant") {
    return `Activated ${tenant.name}. Tenant user login access is restored.`;
  }
  return `Created client tenant ${tenant.name}.`;
}

function tenantBadgeClass(status: PlatformTenant["status"]): string {
  if (status === "active") {
    return "internal";
  }
  if (status === "suspended") {
    return "restricted";
  }
  return "confidential";
}

function ActionState({ state }: { state: SubmitState }) {
  if (state.kind === "idle") {
    return null;
  }
  return (
    <div className={`constraintNote ${state.kind === "error" ? "errorNote" : ""}`} role="status" aria-live="polite">
      <strong>{state.message}</strong>
      {state.kind === "success" && state.temporaryPassword ? (
        <p>
          Temporary password: <code>{state.temporaryPassword}</code>
        </p>
      ) : null}
    </div>
  );
}
