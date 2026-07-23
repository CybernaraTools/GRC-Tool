import Link from "next/link";
import type { ReactNode } from "react";
import { CONTRACT_SHA256, operations } from "../lib/api/generated";
import { resolvePrimaryRole as resolvePrimaryRoleFromRoles, visibleNavForSession } from "../lib/navigation";
import type { SessionContext } from "../lib/session";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({
  children,
  session,
  title = "Cybernara Operations Console"
}: {
  children: ReactNode;
  session: SessionContext | null;
  title?: string;
}) {
  const primaryRole = resolvePrimaryRole(session);
  const navItems = visibleNavForSession(session);

  return (
    <div className="appFrame">
      <aside className="sidebar">
        <Link href="/" className="sidebarBrand">
          <span className="sidebarBrandMark" aria-hidden="true">
            <span className="material-symbols-outlined">shield</span>
          </span>
          <span>
            <strong>Cybernara</strong>
            <small>GRC PLATFORM</small>
          </span>
        </Link>

        <SidebarNav items={navItems} />

        <div className="sidebarFooter">
          <div className="contract" aria-label="Backend contract status">
            <span>Backend API</span>
            <strong>0.1.0-m0</strong>
            <code>{CONTRACT_SHA256.slice(0, 16)}</code>
          </div>
          {session ? (
            <div className="userPanel" aria-label="Signed-in user">
              <span className="userPanelIdentity">
                <span className="material-symbols-outlined" aria-hidden="true">
                  account_circle
                </span>
                <span>
                  <strong>{session.email ?? session.userId}</strong>
                  <small>{primaryRole ?? "role pending"}</small>
                </span>
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="secondaryButton" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="workspaceColumn">
        <header className="topbar">
          <div>
            <p className="eyebrow">Private-cloud GRC and privacy compliance</p>
            <h1>{title}</h1>
          </div>
        </header>

        <div className="workspaceContent">
          <section className="statusGrid" aria-label="Foundation status">
            <article>
              <span className="label">Generated Operations</span>
              <strong>{operations.length}</strong>
            </article>
            <article>
              <span className="label">Session</span>
              <strong>{sessionLabel(session)}</strong>
            </article>
            <article>
              <span className="label">Business Data Path</span>
              <strong>Backend API only</strong>
            </article>
          </section>

          {children}
        </div>
      </main>
    </div>
  );
}

function resolvePrimaryRole(session: SessionContext | null) {
  if (session?.kind === "platform") {
    return "super_admin";
  }
  return resolvePrimaryRoleFromRoles(session?.roles ?? []);
}

function sessionLabel(session: SessionContext | null): string {
  if (!session) {
    return "Required";
  }
  return session.kind === "platform" ? session.platformRole : session.clearance;
}
