/**
 * XML text handling.
 *
 * Prompt content is very often code, HTML or JSON, so raw `<` and `&` are the
 * normal case rather than an edge case. Two strategies:
 *
 *  - escape `&` and `<` into entities (readable for prose), or
 *  - wrap the whole block in `CDATA` (readable for code and markup).
 *
 * `escapeContent` picks between them so the emitted document is always
 * well-formed and the content survives round-tripping unchanged.
 */

/**
 * Escapes character data appearing between tags.
 *
 * A bare `>` is legal in character data and only has to be escaped inside the
 * sequence `]]>`. Leaving it alone matters here: `->`, `=>` and `if (a > b)` are
 * everywhere in prompts about code, and turning each one into `-&gt;` makes the
 * prompt materially harder to read for both the author and the model.
 */
export function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/]]>/g, "]]&gt;");
}

/** Escapes a value going inside a double-quoted attribute. */
export function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * True when the text reads as markup — an opening tag, a closing tag, a comment
 * or a processing instruction. Escaping those into entities is technically
 * correct but makes the prompt far harder for a human (and arguably a model) to
 * read, so they go into CDATA instead.
 */
export function looksLikeMarkup(text: string): boolean {
  return /<(?:[/?]?[A-Za-z]|!--|!\[CDATA\[|!DOCTYPE)/.test(text);
}

/**
 * Wraps text in a CDATA section, splitting around any literal `]]>` — that
 * sequence cannot appear inside CDATA, so the run is closed and reopened around
 * it. The concatenated character data is byte-identical to the input.
 */
export function wrapCdata(text: string): string {
  return `<![CDATA[${text.split("]]>").join("]]]]><![CDATA[>")}]]>`;
}

export interface EscapeContentOptions {
  /** "auto" (default) picks CDATA for markup-ish text; the others force it. */
  strategy?: "auto" | "escape" | "cdata";
}

/** Prepares block content for inclusion in an XML document. */
export function escapeContent(text: string, options: EscapeContentOptions = {}): string {
  const strategy = options.strategy ?? "auto";
  if (strategy === "cdata") return wrapCdata(text);
  if (strategy === "escape") return escapeXmlText(text);
  return looksLikeMarkup(text) ? wrapCdata(text) : escapeXmlText(text);
}
