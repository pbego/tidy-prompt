/**
 * The assembled prompt, in whichever format the user is about to paste
 * somewhere. Everything here comes straight from @tidy-prompt/core.
 */

import { useMemo, useState } from "react";
import {
  serializeJson,
  serializeMarkdown,
  serializeXml,
  type Prompt,
} from "@tidy-prompt/core";
import { copyText } from "../lib/clipboard.js";
import { downloadText } from "../lib/download.js";

export type FormatId = "xml" | "markdown" | "json";

interface Format {
  id: FormatId;
  label: string;
  hint: string;
  extension: string;
  mimeType: string;
  render: (prompt: Prompt) => string;
}

export const FORMATS: readonly Format[] = [
  {
    id: "xml",
    label: "XML",
    hint: "Tagged sections. Anthropic recommends tags for keeping instructions apart from pasted material. Test important prompts on your target model.",
    extension: "xml",
    mimeType: "application/xml",
    render: (prompt) => serializeXml(prompt),
  },
  {
    id: "markdown",
    label: "Markdown",
    hint: "The same structure as headings, for tools that prefer Markdown.",
    extension: "md",
    mimeType: "text/markdown",
    render: (prompt) => serializeMarkdown(prompt),
  },
  {
    id: "json",
    label: "JSON",
    hint: "Each tag as a field — for feeding the prompt to your own code.",
    extension: "json",
    mimeType: "application/json",
    render: (prompt) => serializeJson(prompt),
  },
];

export function PreviewPane({ prompt }: { prompt: Prompt }): React.ReactNode {
  const [formatId, setFormatId] = useState<FormatId>("xml");
  const [copied, setCopied] = useState(false);

  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0]!;
  const output = useMemo(() => format.render(prompt), [format, prompt]);

  const onCopy = async () => {
    const ok = await copyText(output);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="preview" aria-label="Assembled prompt">
      <div className="preview__tabs" role="tablist">
        {FORMATS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === formatId}
            className={entry.id === formatId ? "preview__tab preview__tab--active" : "preview__tab"}
            onClick={() => setFormatId(entry.id)}
          >
            {entry.label}
          </button>
        ))}
        <div className="preview__tab-actions">
          <button type="button" className="button" onClick={onCopy} disabled={output.length === 0}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="button button--ghost"
            disabled={output.length === 0}
            onClick={() => downloadText(`prompt.${format.extension}`, output, format.mimeType)}
          >
            Download
          </button>
        </div>
      </div>

      <p className="preview__hint">{format.hint}</p>

      {output.length === 0 ? (
        <p className="preview__empty">
          Nothing to show yet — fill in a block and it appears here.
        </p>
      ) : (
        <pre className="preview__output">
          <code>{output}</code>
        </pre>
      )}
    </section>
  );
}
