import { redirect } from "next/navigation";
import { safeRedirectPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = safeRedirectPath(value(params.next));
  const error = value(params.error);
  const session = await readSessionContext();

  if (session) {
    if (session.kind === "platform") {
      redirect(platformOperatorPath(nextPath) ? nextPath : "/platform/tenants");
    }
    redirect(nextPath.startsWith("/platform") ? "/" : nextPath);
  }

  return (
    <main className="authShell">
      <section className="authPanel" aria-labelledby="login-heading">
        <div>
          <span className="authMark material-symbols-outlined" aria-hidden="true">
            shield
          </span>
          <p className="eyebrow">Cybernara secure access</p>
          <h1 id="login-heading">Sign in to Cybernara</h1>
          <p>
            Use a Supabase email/password account provisioned with Cybernara tenant metadata or platform operator
            metadata.
          </p>
        </div>

        {error ? (
          <div className="authError" role="alert">
            {error}
          </div>
        ) : null}

        <form className="authForm" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Sign in</button>
        </form>

        <p className="authNote">
          Missing or expired sessions return here automatically. Successful sign-in returns to <code>{nextPath}</code>.
        </p>
      </section>
    </main>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function platformOperatorPath(path: string): boolean {
  return (
    path.startsWith("/platform") ||
    path === "/frameworks" ||
    path.startsWith("/frameworks?") ||
    path.startsWith("/frameworks/updates") ||
    path === "/harmonization" ||
    path.startsWith("/harmonization?")
  );
}
