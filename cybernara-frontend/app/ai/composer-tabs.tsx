import { AiSubmitButton } from "./submit-button";

type AiComposerTabsProps = {
  actionPath: string;
  frameworkKeys: string[];
};

export function AiComposerTabs({ actionPath, frameworkKeys }: AiComposerTabsProps) {
  return (
    <div className="aiComposerPanel">
      <div className="aiModeHeader">
        <div className="aiModeSwitch" role="radiogroup" aria-label="AI generation mode">
          <input className="aiModeInput" type="radio" id="ai-mode-prompt" name="aiComposerMode" aria-label="Prompt Workspace" defaultChecked />
          <input className="aiModeInput" type="radio" id="ai-mode-fallback" name="aiComposerMode" aria-label="Fallback" />
          <span className="aiModeSlider" aria-hidden="true" />
          <label htmlFor="ai-mode-prompt">
            <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
            <span>Prompt Workspace</span>
          </label>
          <label htmlFor="ai-mode-fallback">
            <span className="material-symbols-outlined" aria-hidden="true">published_with_changes</span>
            <span>Fallback</span>
          </label>
        </div>
        <p>OpenAI generation is selected by default; switch to fallback only when the AI gateway is unavailable.</p>
      </div>

      <div className="aiComposerViews">
        <div className="aiComposerView aiComposerViewPrompt">
          <PromptWorkspaceForm actionPath={actionPath} frameworkKeys={frameworkKeys} />
        </div>
        <div className="aiComposerView aiComposerViewFallback">
          <FallbackForm actionPath={actionPath} frameworkKeys={frameworkKeys} />
        </div>
      </div>
    </div>
  );
}

function PromptWorkspaceForm({ actionPath, frameworkKeys }: AiComposerTabsProps) {
  const canGenerate = frameworkKeys.length > 0;
  return (
    <form className="aiComposerPrimary" action={actionPath} method="post" aria-label="Request AI question generation">
      <input type="hidden" name="intent" value="generate" />
      <div className="composerHeader">
        <div>
          <p className="eyebrow">Prompt workspace</p>
          <h3>Generate a governed question set</h3>
        </div>
        <span className="badge restricted">OpenAI</span>
      </div>
      <label className="focusField">
        <span>Question focus</span>
        <textarea
          name="questionFocus"
          defaultValue="Multi-factor authentication enforcement for privileged, remote, and high-risk access."
        />
      </label>
      <div className="aiOptionGrid">
        <fieldset className="fieldsetGroup">
          <legend>Response types</legend>
          <div className="checkboxGrid compactCheckboxGrid" aria-label="Response types">
            <label><input type="checkbox" name="responseType.boolean" defaultChecked /> Boolean</label>
            <label><input type="checkbox" name="responseType.text" defaultChecked /> Text</label>
            <label><input type="checkbox" name="responseType.maturity" defaultChecked /> Maturity</label>
            <label><input type="checkbox" name="responseType.multi_select" defaultChecked /> Multi-select</label>
          </div>
        </fieldset>
        <FrameworkSelector frameworkKeys={frameworkKeys} />
      </div>
      <div className="composerFooter">
        <span>Selected enabled frameworks and harmonized controls drive evidence and citations.</span>
        <AiSubmitButton icon="auto_awesome" pendingLabel="Generating question set" disabled={!canGenerate}>
          Generate with OpenAI
        </AiSubmitButton>
      </div>
    </form>
  );
}

function FallbackForm({ actionPath, frameworkKeys }: AiComposerTabsProps) {
  const canGenerate = frameworkKeys.length > 0;
  return (
    <form className="aiComposerAside" action={actionPath} method="post" aria-label="Trigger AI fallback">
      <input type="hidden" name="intent" value="fallback" />
      <div className="composerHeader">
        <div>
          <p className="eyebrow">Fallback</p>
          <h3>Curated baseline</h3>
        </div>
      </div>
      <label>
        Fallback focus
        <textarea
          name="questionFocus"
          defaultValue="Incident response escalation and evidence for security events."
        />
      </label>
      <FrameworkSelector frameworkKeys={frameworkKeys} />
      <AiSubmitButton icon="published_with_changes" pendingLabel="Preparing fallback" secondary disabled={!canGenerate}>
        Trigger fallback generation
      </AiSubmitButton>
    </form>
  );
}

function FrameworkSelector({ frameworkKeys }: { frameworkKeys: string[] }) {
  if (frameworkKeys.length === 0) {
    return (
      <fieldset className="fieldsetGroup">
        <legend>Framework scope</legend>
        <div className="constraintNote errorNote">
          No frameworks are enabled for this tenant. Enable at least one framework before generating assessment questions.
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="fieldsetGroup">
      <legend>Framework scope</legend>
      <div className="checkboxGrid frameworkCheckboxGrid" aria-label="Framework scope">
        {frameworkKeys.map((frameworkKey) => (
          <label key={frameworkKey}>
            <input type="checkbox" name={`framework.${frameworkKey}`} defaultChecked />
            {frameworkKey}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
