import { redirect } from "next/navigation";
import { platformOperatorPath, safeRedirectPath } from "../../src/lib/auth";
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
      redirect(platformOperatorPath(nextPath) ? nextPath : "/platform/dashboard");
    }
    redirect(nextPath === "/" || nextPath.startsWith("/platform") ? "/dashboard" : nextPath);
  }

  return (
    <main className="authShell">
      <div className="orbCanvas" aria-hidden="true">
        <div className="orbMint" />
        <div className="orbPeach" />
        <div className="orbLavender" />
      </div>

      <section className="authPanel" aria-labelledby="login-heading">
        <div>
    
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
            <input name="email" type="email" autoComplete="email" required placeholder="admin@cybernara.internal" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••••••" />
          </label>
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

