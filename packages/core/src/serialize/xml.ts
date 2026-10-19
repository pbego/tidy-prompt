/**
 * XML serialization — the primary output.
 *
 * One deliberate rule: **block content is never re-indented**. Leading
 * whitespace is meaningful in the things people paste into prompts (Python,
 * YAML, diffs, log excerpts), so tags are indented by depth while the content
 * between them is emitted exactly as typed. `indentContent: true` opts into the
 * prettier-but-lossy behaviour.
 */

import type { Block, Prompt } from "../types.js";
import { escapeContent, escapeXmlAttribute, type EscapeContentOptions } from "../escape.js";

export interface SerializeXmlOptions extends EscapeContentOptions {
  /** Spaces per nesting level for tags. Default 2. */
  indent?: number;
  /** Re-indent content to match its tag depth. Default false — see above. */
  indentContent?: boolean;
  /** Separate top-level blocks with a blank line. Default true. */
  blankLineBetweenBlocks?: boolean;
}

/** True when a block contributes anything to the output. */
export function isRenderable(block: Block): boolean {
  if (!block.enabled) return false;
  if (block.content.trim().length > 0) return true;
  return (block.children ?? []).some(isRenderable);
}

export function serializeXml(prompt: Prompt, options: SerializeXmlOptions = {}): string {
  const indent = options.indent ?? 2;
  const blankLine = options.blankLineBetweenBlocks ?? true;
  const parts: string[] = [];

  for (const block of prompt.blocks) {
    if (!isRenderable(block)) continue;
    parts.push(serializeBlock(block, 0, indent, options));
  }

  return parts.join(blankLine ? "\n\n" : "\n");
}

/**
 * Serializes a single block. Exported so callers can render a subset.
 * `ancestors` names the tags this block sits inside; it is filled in as the
 * recursion descends, so a child's text is also guarded against closing its parent.
 */
export function serializeBlock(
  block: Block,
  depth: number,
  indent: number,
  options: SerializeXmlOptions = {},
  ancestors: readonly string[] = [],
): string {
  const pad = " ".repeat(depth * indent);
  const open = `${pad}<${block.tag}${formatAttributes(block.attributes)}>`;
  const close = `${pad}</${block.tag}>`;

  const content = trimSurroundingBlankLines(block.content);
  const children = (block.children ?? []).filter(isRenderable);
  const lines: string[] = [];

  if (content.length > 0) {
    const escaped = escapeContent(content, {
      ...options,
      guardTags: [...(options.guardTags ?? []), block.tag, ...ancestors],
    });
    // A short, single-line value reads better inline: <role>You are…</role>
    if (!escaped.includes("\n") && children.length === 0) {
      return `${open}${escaped}</${block.tag}>`;
    }
    lines.push(options.indentContent ? indentLines(escaped, pad + " ".repeat(indent)) : escaped);
  }

  for (const child of children) {
    lines.push(serializeBlock(child, depth + 1, indent, options, [...ancestors, block.tag]));
  }

  return [open, ...lines, close].join("\n");
}

function formatAttributes(attributes: Record<string, string> | undefined): string {
  const entries = Object.entries(attributes ?? {});
  if (entries.length === 0) return "";
  return ` ${entries.map(([k, v]) => `${k}="${escapeXmlAttribute(v)}"`).join(" ")}`;
}

/** Drops blank lines around the content without touching interior whitespace. */
export function trimSurroundingBlankLines(text: string): string {
  return text.replace(/^[\r\n]+/, "").replace(/\s+$/, "");
}

function indentLines(text: string, pad: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim().length === 0 ? line : pad + line))
    .join("\n");
}
