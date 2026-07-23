"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AdminRole, AdminUser } from "../../../src/lib/api/generated";

type SubmitState =
  | { kind: "idle" }
  | { kind: "working"; message: string }
  | { kind: "success"; message: string; temporaryPassword?: string }
  | { kind: "error"; message: string };

export function AdminUsersConsole({
  users,
  roles,
  clearanceLevels
}: {
  users: AdminUser[];
  roles: AdminRole[];
  clearanceLevels: Array<"public" | "internal" | "confidential" | "restricted">;
}) {
  const [rows, setRows] = useState(users);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [ready, setReady] = useState(false);
  const roleOptions = useMemo(() => roles.map((role) => ({ key: role.roleKey, label: role.displayName })), [roles]);

  useEffect(() => {
    setReady(true);
  }, []);

  async function submit(form: HTMLFormElement, workingMessage: string) {
    setState({ kind: "working", message: workingMessage });
    const response = await fetch("/admin/users/actions", {
      method: "POST",
      body: new FormData(form),
      headers: { accept: "application/json" }
    });
    const body = (await response.json()) as { user?: AdminUser; temporaryPassword?: string; error?: string };
    if (!response.ok || !body.user) {
      setState({ kind: "error", message: body.error ?? "Admin action failed." });
      return;
    }

    setRows((current) => {
      const existingIndex = current.findIndex((candidate) => candidate.id === body.user?.id);
      if (existingIndex === -1) {
        return [body.user, ...current].filter((entry): entry is AdminUser => Boolean(entry));
      }
      return current.map((candidate) => (candidate.id === body.user?.id ? body.user : candidate));
    });
    setState({
      kind: "success",
      message: body.temporaryPassword
        ? `Invited ${body.user.email}. Share the temporary password through an approved channel.`
        : `Updated ${body.user.email}.`,
      temporaryPassword: body.temporaryPassword
    });
    form.reset();
  }

  return (
    <>
      <section className="workspace" aria-labelledby="admin-users-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Identity administration</p>
            <h2 id="admin-users-heading">Users and roles</h2>
          </div>
          <span>{rows.length} user{rows.length === 1 ? "" : "s"}</span>
        </div>

        <form
          className="filterForm"
          aria-label="Invite user"
          method="post"
          action="/admin/users/actions"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void submit(event.currentTarget, "Inviting user...");
          }}
        >
          <input type="hidden" name="intent" value="invite" />
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Display name
            <input name="displayName" />
          </label>
          <label>
            Initial role
            <select name="roleKey" defaultValue="viewer">
              {roleOptions.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Clearance
            <select name="clearance" defaultValue="internal">
              {clearanceLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <div className="formActions">
            <button type="submit" disabled={!ready}>
              Invite user
            </button>
          </div>
        </form>

        <ActionState state={state} />
      </section>

      <section className="workspace" aria-labelledby="tenant-users-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Tenant directory</p>
            <h2 id="tenant-users-heading">Active assignments</h2>
          </div>
          <span>Supabase Auth synced</span>
        </div>
        <div className="tableScroller">
          <table>
            <caption>Tenant users</caption>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Role</th>
                <th scope="col">Clearance</th>
                <th scope="col">Scopes</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No tenant users found.</td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.email}</strong>
                      <small>{user.displayName ?? user.id}</small>
                    </td>
                    <td>
                      <span className={`badge ${user.status === "active" ? "internal" : "confidential"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{user.roleKeys.join(", ") || "unassigned"}</td>
                    <td>{user.clearance}</td>
                    <td>{user.scopes.length}</td>
                    <td>
                      <div className="rowActions">
                        <AssignmentForm
                          user={user}
                          roleOptions={roleOptions}
                          clearanceLevels={clearanceLevels}
                          onSubmit={submit}
                          ready={ready}
                        />
                        <StatusButton user={user} onSubmit={submit} ready={ready} />
                      </div>
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

function AssignmentForm({
  user,
  roleOptions,
  clearanceLevels,
  onSubmit,
  ready
}: {
  user: AdminUser;
  roleOptions: Array<{ key: string; label: string }>;
  clearanceLevels: Array<"public" | "internal" | "confidential" | "restricted">;
  onSubmit: (form: HTMLFormElement, workingMessage: string) => Promise<void>;
  ready: boolean;
}) {
  return (
    <form
      className="inlineForm"
      aria-label={`Update ${user.email} assignment`}
      method="post"
      action="/admin/users/actions"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit(event.currentTarget, `Updating ${user.email}...`);
      }}
    >
      <input type="hidden" name="intent" value="updateAssignment" />
      <input type="hidden" name="userId" value={user.id} />
      <select name="roleKey" defaultValue={user.roleKeys[0] ?? "viewer"} aria-label="Role">
        {roleOptions.map((role) => (
          <option key={role.key} value={role.key}>
            {role.label}
          </option>
        ))}
      </select>
      <select name="clearance" defaultValue={user.clearance} aria-label="Clearance">
        {clearanceLevels.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      <button type="submit" disabled={!ready}>
        Save assignment
      </button>
    </form>
  );
}

function StatusButton({
  user,
  onSubmit,
  ready
}: {
  user: AdminUser;
  onSubmit: (form: HTMLFormElement, workingMessage: string) => Promise<void>;
  ready: boolean;
}) {
  const nextStatus = user.status === "disabled" ? "active" : "disabled";
  return (
    <form
      className="inlineForm"
      aria-label={`${nextStatus === "disabled" ? "Deactivate" : "Reactivate"} ${user.email}`}
      method="post"
      action="/admin/users/actions"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit(event.currentTarget, `${nextStatus === "disabled" ? "Deactivating" : "Reactivating"} ${user.email}...`);
      }}
    >
      <input type="hidden" name="intent" value="setStatus" />
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="status" value={nextStatus} />
      <button type="submit" disabled={!ready}>
        {nextStatus === "disabled" ? "Deactivate" : "Reactivate"}
      </button>
    </form>
  );
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
