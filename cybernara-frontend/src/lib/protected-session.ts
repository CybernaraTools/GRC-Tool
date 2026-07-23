import { redirect } from "next/navigation";
import { loginPath } from "./auth";
import { isPlatformSession, isTenantSession, readSessionContext } from "./session";

export async function requireSession(nextPath: string) {
  const session = await readSessionContext();
  if (!isTenantSession(session)) {
    redirect(loginPath(nextPath));
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
