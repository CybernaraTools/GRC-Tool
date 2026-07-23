"use client";

import { useState } from "react";

type AiSubmitButtonProps = {
  children: string;
  icon: string;
  pendingLabel: string;
  disabled?: boolean;
  secondary?: boolean;
};

export function AiSubmitButton({ children, icon, pendingLabel, disabled = false, secondary = false }: AiSubmitButtonProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <button
      type="submit"
      className={`buttonWithIcon${secondary ? " buttonSecondary" : ""}`}
      disabled={disabled}
      aria-busy={submitted}
      onClick={() => setSubmitted(true)}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {submitted ? "sync" : icon}
      </span>
      <span>{submitted ? pendingLabel : children}</span>
    </button>
  );
}
