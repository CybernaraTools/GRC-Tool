import { redirect } from "next/navigation";
import { loginPath } from "./auth";
import { isPlatformSession, isTenantSession, readSessionContext } from "./session";
import { operationalNavItems } from "./navigation";

export async function requireSession(nextPath: string) {
  const session = await readSessionContext();
  if (!isTenantSession(session)) {
    redirect(loginPath(nextPath));
  }

  const routePath = nextPath.split("?")[0];
  const navItem = operationalNavItems.find((item) => item.href === routePath);
  if (navItem && navItem.roles.length > 0) {
    const primaryRole = (session.roles[0] || "viewer").toLowerCase();
    const allowedRoles = navItem.roles.map((role) => role.toLowerCase());
    if (!allowedRoles.includes(primaryRole)) {
      redirect("/dashboard");
    }
  }

  return session;
}

export async function requireAnySession(nextPath: string) {
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath(nextPath));
  }
  return session;
}

export async function requirePlatformSession(nextPath: string) {
  const session = await readSessionContext();
  if (!isPlatformSession(session)) {
    redirect(loginPath(nextPath));
  }
  return session;
}
