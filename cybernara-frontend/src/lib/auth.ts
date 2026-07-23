export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined, fallback = "/"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}

export function loginPath(nextPath: string): string {
  return `/login?next=${encodeURIComponent(safeRedirectPath(nextPath))}`;
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  } as const;
}
