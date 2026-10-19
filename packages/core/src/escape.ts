/**
 * Preparing block content for the XML output.
 *
 * The output is read by a model, not parsed as XML, and that decides the default:
 * content goes in exactly as typed. Prompt content is very often code, and
 * turning `a && b` into `a &amp;&amp; b` or `a < b` into `a &lt; b` shows the
 * model something other than what was pasted — which it may then copy into a
 * file. A model also has no need for the document to be well-formed.
 *
 * What does need guarding is structure. If a block's own text contains the
 * closing tag of the block it sits in — pasted markup, or a prompt about prompts
 * — the model can read the block as ending early. Only then is the content
 * wrapped in CDATA, which marks it as literal.
 *
 * For a consumer that really does parse the output as XML, `strategy: "escape"`
 * or `"cdata"` still produces a well-formed document.
 */

/** Escapes character data appearing between tags, for strict-XML output. */
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
 * Wraps text in a CDATA section, splitting around any literal `]]>` — that
 * sequence cannot appear inside CDATA, so the run is closed and reopened around
 * it. The concatenated character data is byte-identical to the input.
 */
export function wrapCdata(text: string): string {
  return `<![CDATA[${text.split("]]>").join("]]]]><![CDATA[>")}]]>`;
}

export interface EscapeContentOptions {
  /**
   * - `"auto"` (default): exactly as typed, except CDATA when the text contains a
   *   closing tag from `guardTags`.
   * - `"raw"`: exactly as typed, with no guard at all.
   * - `"escape"`: entities for `&` and `<`, for output that will be parsed as XML.
   * - `"cdata"`: always wrapped in CDATA.
   */
  strategy?: "auto" | "raw" | "escape" | "cdata";
  /**
   * Tag names whose closing tag would end the content early: the block's own tag
   * and those of the blocks around it. Used by `"auto"` only.
   */
  guardTags?: readonly string[];
}

/** Prepares block content for inclusion in an XML document. */
export function escapeContent(text: string, options: EscapeContentOptions = {}): string {
  switch (options.strategy ?? "auto") {
    case "raw":
      return text;
    case "escape":
      return escapeXmlText(text);
    case "cdata":
      return wrapCdata(text);
    case "auto":
      return closesGuardedTag(text, options.guardTags ?? []) ? wrapCdata(text) : text;
  }
}

/**
 * True when the text holds `</tag>` for any guarded tag. Matches the whole name
 * (`</data>` is not triggered by `</database>`), ignores case and allows
 * whitespace before the `>`, since a reader takes `</DATA >` for a closing tag
 * too.
 */
function closesGuardedTag(text: string, tags: readonly string[]): boolean {
  if (tags.length === 0 || !text.includes("</")) return false;
  const names = tags.filter((tag) => tag.length > 0).map(escapeRegExp);
  if (names.length === 0) return false;
  return new RegExp(`</\\s*(?:${names.join("|")})\\s*>`, "i").test(text);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
