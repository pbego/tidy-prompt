import { useEffect, useMemo, useState } from "react";
import {
  PROMPT_TEMPLATES,
  createPromptFromTemplate,
  createStarterPrompt,
  estimatePromptTokens,
  getTemplate,
  isRenderable,
  parsePromptDocument,
  serializeXml,
  suggestImprovements,
  toPromptDocument,
  validatePrompt,
  type ValidationIssue,
} from "@tidy-prompt/core";
import { usePromptActions, usePromptStore } from "./state/promptStore.js";
import { BlockList } from "./components/BlockList.js";
import { PreviewPane } from "./components/PreviewPane.js";
import { StatsBar } from "./components/StatsBar.js";
import { IssueList } from "./components/IssueList.js";
import { copyText } from "./lib/clipboard.js";
import { downloadText, pickTextFile } from "./lib/download.js";

/** Errors first, then warnings, then hints; stable within each group. */
const SEVERITY_RANK: Record<ValidationIssue["severity"], number> = { error: 0, warning: 1, hint: 2 };

export function App(): React.ReactNode {
  const { state, storageAvailable } = usePromptStore();
  const actions = usePromptActions();
  const [notice, setNotice] = useState<string | null>(null);

  const { prompt } = state;
  const issues = useMemo(() => {
    // A template switches on several blocks at once; warning that each one is empty
    // before anything has been typed is noise, since the placeholders already say so.
    const started = prompt.blocks.some(isRenderable);
    const found = [...validatePrompt(prompt), ...suggestImprovements(prompt)].filter(
      (issue) => started || issue.code !== "empty-block",
    );
    return found.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  }, [prompt]);
  const estimate = useMemo(() => estimatePromptTokens(prompt), [prompt]);
  const characters = useMemo(() => serializeXml(prompt).length, [prompt]);
  const enabledCount = prompt.blocks.filter((block) => block.enabled).length;

  // ⌘/Ctrl+Enter copies the XML — the thing you came here to do.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void copyText(serializeXml(prompt)).then((ok) =>
          flash(ok ? "Copied the XML prompt" : "Could not reach the clipboard"),
        );
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [prompt]);

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2600);
  };

  const confirmDiscard = (question: string): boolean => {
    const hasContent = prompt.blocks.some((block) => block.content.trim().length > 0);
    return !hasContent || confirm(question);
  };

  const onNew = () => {
    if (!confirmDiscard("Start a new prompt? The current one will be cleared.")) return;
    actions.replacePrompt(createStarterPrompt());
    flash("Started a new prompt");
  };

  const onTemplate = (id: string) => {
    const template = getTemplate(id);
    if (!template) return;
    if (!confirmDiscard(`Start a ${template.label} prompt? The current one will be cleared.`)) return;
    actions.replacePrompt(createPromptFromTemplate(id));
    flash(`Started a ${template.label} prompt`);
  };

  const onSave = () => {
    const name = window.prompt("Save this prompt as:")?.trim();
    if (!name) return;
    actions.saveAs(name);
    flash(`Saved as "${name}"`);
  };

  const onLoad = (name: string) => {
    const entry = state.saved.find((s) => s.name === name);
    if (!entry) return;
    actions.replacePrompt(entry.prompt);
    flash(`Loaded "${name}"`);
  };

  const onExport = () => {
    downloadText("prompt.tidy.json", toPromptDocument(prompt), "application/json");
  };

  const onImport = async () => {
    const file = await pickTextFile("application/json,.json");
    if (!file) return;
    const result = parsePromptDocument(file.text);
    if (!result.ok) {
      flash(`Could not import: ${result.error}`);
      return;
    }
    actions.replacePrompt(result.document.prompt);
    flash(`Imported ${file.name}`);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <h1>tidy-prompt</h1>
          <p>Structured prompts for AI work.</p>
          <details className="info">
            <summary className="info__summary">How tags help</summary>
            <div className="info__body">
              <strong>Tags are labels, not code</strong>
              <p>
                The model does not run your XML. It reads the tag names as cues for where the task,
                the background and the limits begin and end. Anthropic recommends tags for prompts
                that mix instructions with pasted material. Clear writing inside them matters more
                than the tags themselves.
              </p>
              <strong>Stays in this browser</strong>
              <p>
                Your prompt is kept in this browser&rsquo;s local storage so a reload does not lose
                it. Nothing is uploaded, and there are no cookies.
              </p>
            </div>
          </details>
        </div>

        <div className="app__toolbar">
          <select
            className="app__template"
            aria-label="Start from a template"
            value=""
            onChange={(event) => {
              if (event.target.value) onTemplate(event.target.value);
            }}
          >
            <option value="">New from template…</option>
            {PROMPT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id} title={template.description}>
                {template.label}
              </option>
            ))}
          </select>
          {state.saved.length > 0 && (
            <select
              className="app__saved"
              aria-label="Load a saved prompt"
              value=""
              onChange={(event) => {
                if (event.target.value) onLoad(event.target.value);
              }}
            >
              <option value="">Load…</option>
              {state.saved.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="button" onClick={onSave}>
            Save
          </button>
          <button type="button" className="button button--ghost" onClick={onImport}>
            Import
          </button>
          <button type="button" className="button button--ghost" onClick={onExport}>
            Export
          </button>
          <button type="button" className="button button--ghost" onClick={onNew}>
            New
          </button>
        </div>
      </header>

      {!storageAvailable && (
        <p className="app__warning">
          Browser storage is unavailable, so this prompt will not be here after a reload. Export it
          before you close the tab.
        </p>
      )}

      {notice && (
        <p className="app__notice" role="status">
          {notice}
        </p>
      )}

      <main className="app__panes">
        <section className="pane pane--editor" aria-label="Prompt blocks">
          <StatsBar
            estimate={estimate}
            blockCount={prompt.blocks.length}
            enabledCount={enabledCount}
            characters={characters}
          />
          <IssueList issues={issues} />
          <BlockList />
        </section>

        <div className="pane pane--preview">
          <PreviewPane prompt={prompt} />
        </div>
      </main>

      <footer className="app__footer">
        <span>Everything stays in this browser — nothing is uploaded.</span>
        <span className="app__shortcut">
          <kbd>⌘</kbd>
          <kbd>↵</kbd> copy XML
        </span>
      </footer>
    </div>
  );
}
