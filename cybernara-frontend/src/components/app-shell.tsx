"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const primaryRole = resolvePrimaryRole(session);
  const navItems = visibleNavForSession(session);

  useEffect(() => {
    const saved = localStorage.getItem("cybernara_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("cybernara_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <div className={collapsed ? "appFrame sidebarCollapsed" : "appFrame"}>
      <div className="orbCanvas" aria-hidden="true">
        <div className="orbMint" />
        <div className="orbPeach" />
        <div className="orbLavender" />
      </div>

      <aside className="sidebar">
        <div className="sidebarHeader">
          <Link href="/" className="sidebarBrand">
            <span className="sidebarBrandMark" aria-hidden="true">
              <span className="material-symbols-outlined">shield</span>
            </span>
            <span>
              <strong>Cybernara</strong>
              <small>GRC PLATFORM</small>
            </span>
          </Link>
        </div>

        <SidebarNav items={navItems} />

        <div className="sidebarFooter">
          {session ? (
            <div className="userPanel" aria-label="Signed-in user">
              <span className="userPanelIdentity" title={session.email ?? session.userId}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  account_circle
                </span>
                <span>
                  <strong>{session.email ?? session.userId}</strong>
                  <small>{primaryRole ?? "role pending"}</small>
                </span>
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="secondaryButton logoutBtn" type="submit" title="Sign out">
                  <span className="material-symbols-outlined">logout</span>
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="workspaceColumn">
        <header className="topbar">
          <div className="topbarLeft">
            <button
              type="button"
              className="sidebarToggleBtn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <span className="material-symbols-outlined">
                {collapsed ? "menu" : "menu_open"}
              </span>
            </button>
            <div>
              <h1>{title}</h1>
            </div>
          </div>

          <button
            type="button"
            className="themeToggleBtn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle color theme"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </header>

        <div className="workspaceContent">
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
