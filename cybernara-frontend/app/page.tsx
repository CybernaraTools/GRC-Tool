import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../src/components/app-shell";
import { loginPath } from "../src/lib/auth";
import { operationalNavItems, uploadAccessState } from "../src/lib/navigation";
import { readSessionContext } from "../src/lib/session";

const foundations = [
  {
    title: "BFF Session Boundary",
    detail: "Browser requests are routed through server-side session context before reaching backend APIs."
  },
  {
    title: "Generated Contract",
    detail: "The frontend client is regenerated from the backend OpenAPI artifact and checked in CI."
  },
  {
    title: "Reusable UI States",
    detail: "Loading, empty, error, and protected states are shared primitives for F0 and later workflows."
  }
];

export default async function Home() {
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/"));
  }
  if (session.kind === "platform") {
    redirect("/platform/tenants");
  }

  const quarantinedUpload = uploadAccessState("quarantined");

  return (
    <AppShell session={session}>
      <section className="workspace" aria-labelledby="f0-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">F0 foundations</p>
            <h2 id="f0-heading">Operational shell</h2>
          </div>
          <span>{session ? "Session context active" : "Session required for tenant data"}</span>
        </div>
        <div className="cardGrid">
          {foundations.map((item) => (
            <article className="featureCard" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="statusGrid" aria-label="Hardening controls">
        <article>
          <span className="label">Bulk Action Guard</span>
          <strong>{operationalNavItems.filter((item) => item.bulkActions).length} scoped areas</strong>
        </article>
        <article>
          <span className="label">Upload Vault</span>
          <strong>{quarantinedUpload.label}</strong>
        </article>
        <article>
          <span className="label">Audit Viewer</span>
          <strong>Policy-gated list</strong>
        </article>
      </section>

      <section className="stateBox">
        <h2>Authenticated workspace ready</h2>
        <p>
          Tenant-scoped workflows now use the active Supabase Auth session and BFF-derived policy context.
        </p>
        <div className="stateAction">
          <Link href="/audit">Open the audit log viewer</Link>
        </div>
      </section>
    </AppShell>
  );
}
