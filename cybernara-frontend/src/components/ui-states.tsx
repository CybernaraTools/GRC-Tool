import type { ReactNode } from "react";

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <section className="stateBox" aria-live="polite">
      <h2>{title}</h2>
      <p>{detail}</p>
      {action ? <div className="stateAction">{action}</div> : null}
    </section>
  );
}

export function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="stateBox errorState" role="alert">
      <h2>{title}</h2>
      <p>{detail}</p>
    </section>
  );
}
