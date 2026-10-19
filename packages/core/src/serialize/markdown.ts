/**
 * Markdown serialization, for models and tools that respond better to heading
 * structure than to tags. Content is passed through verbatim — it may itself be
 * Markdown, and rewriting it would be a surprise.
 */

import type { Block, Prompt } from "../types.js";
import { humanizeTag } from "../tags.js";
import { isRenderable, trimSurroundingBlankLines } from "./xml.js";

export interface SerializeMarkdownOptions {
  /** Heading level for top-level blocks. Default 2 (`##`). */
  baseLevel?: number;
}

export function serializeMarkdown(prompt: Prompt, options: SerializeMarkdownOptions = {}): string {
  const baseLevel = options.baseLevel ?? 2;
  const sections: string[] = [];
  for (const block of prompt.blocks) {
    if (!isRenderable(block)) continue;
    sections.push(renderBlock(block, baseLevel));
  }
  return sections.join("\n\n");
}

function renderBlock(block: Block, level: number): string {
  // Markdown only defines six heading levels; deeper nesting reuses the last.
  const hashes = "#".repeat(Math.min(level, 6));
  const parts = [`${hashes} ${humanizeTag(block.tag)}`];

  const content = trimSurroundingBlankLines(block.content);
  if (content.length > 0) parts.push(content);

  for (const child of block.children ?? []) {
    if (!isRenderable(child)) continue;
    parts.push(renderBlock(child, level + 1));
  }

  return parts.join("\n\n");
}
