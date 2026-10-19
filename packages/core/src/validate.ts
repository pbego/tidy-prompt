/**
 * Validation. Every function here returns issues rather than throwing: a prompt
 * being edited is allowed to be temporarily invalid, and the UI wants to render
 * the problem next to the field, not catch an exception.
 */

import type { Block, Prompt, ValidationIssue } from "./types.js";
import { estimatePromptTokens } from "./tokens.js";

/**
 * XML NCName, minus the wider Unicode ranges the spec allows. Restricting tag
 * names to ASCII is a deliberate simplification: these end up in prompts read by
 * both people and models, and an ASCII name is unambiguous in every editor.
 */
const NCNAME = /^[A-Za-z_][A-Za-z0-9_.\-]*$/;

/** Returns an issue when the tag name cannot be emitted, or null when it is fine. */
export function validateTagName(tag: string, blockId?: string): ValidationIssue | null {
  const issue = (code: ValidationIssue["code"], message: string): ValidationIssue => {
    const result: ValidationIssue = { severity: "error", code, message };
    if (blockId) result.blockId = blockId;
    return result;
  };

  if (tag.trim().length === 0) {
    return issue("empty-tag-name", "Tag name is empty.");
  }
  if (!NCNAME.test(tag)) {
    return issue(
      "invalid-tag-name",
      `"${tag}" is not a valid tag name. Use letters, digits, "_", "-" and "." only, starting with a letter or "_".`,
    );
  }
  if (/^xml/i.test(tag)) {
    return issue("reserved-tag-name", `Tag names starting with "xml" are reserved.`);
  }
  return null;
}

export function isValidTagName(tag: string): boolean {
  return validateTagName(tag) === null;
}

/** Normalises free text into a usable tag name: "Output Format" -> "output_format". */
export function suggestTagName(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]+/g, "_")
    .replace(/^[^a-z_]+/, "")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug;
}

export interface ValidatePromptOptions {
  /** Warn once the whole prompt passes this estimated token count. */
  largePromptThreshold?: number;
}

export function validatePrompt(
  prompt: Prompt,
  options: ValidatePromptOptions = {},
): ValidationIssue[] {
  const threshold = options.largePromptThreshold ?? 100_000;
  const issues: ValidationIssue[] = [];

  const walk = (blocks: Block[]): void => {
    for (const block of blocks) {
      const tagIssue = validateTagName(block.tag, block.id);
      if (tagIssue) issues.push(tagIssue);

      for (const name of Object.keys(block.attributes ?? {})) {
        if (!NCNAME.test(name)) {
          issues.push({
            severity: "error",
            code: "invalid-attribute-name",
            message: `"${name}" is not a valid attribute name on <${block.tag}>.`,
            blockId: block.id,
          });
        }
      }

      const hasChildren = (block.children ?? []).length > 0;
      if (block.enabled && block.content.trim().length === 0 && !hasChildren) {
        issues.push({
          severity: "warning",
          code: "empty-block",
          message: `<${block.tag}> is empty and will be omitted from the output.`,
          blockId: block.id,
        });
      }

      if (looksTruncated(block.content)) {
        issues.push({
          severity: "warning",
          code: "unbalanced-markup",
          message: `<${block.tag}> ends mid-tag — check the content was not truncated when it was pasted.`,
          blockId: block.id,
        });
      }

      if (containsOwnTag(block.content, block.tag)) {
        issues.push({
          severity: "warning",
          code: "redundant-tag",
          message: `<${block.tag}> already contains its own <${block.tag}> tag. Paste the content only — the tags are added for you.`,
          blockId: block.id,
        });
      }

      if (block.children) walk(block.children);
    }
  };

  walk(prompt.blocks);

  const seen = new Map<string, number>();
  for (const block of prompt.blocks) {
    if (!block.enabled) continue;
    seen.set(block.tag, (seen.get(block.tag) ?? 0) + 1);
  }
  for (const [tag, count] of seen) {
    if (count > 1) {
      issues.push({
        severity: "warning",
        code: "duplicate-tag",
        message: `<${tag}> appears ${count} times at the top level. Consider merging them, or nesting them under one container tag.`,
      });
    }
  }

  const { total } = estimatePromptTokens(prompt);
  if (total > threshold) {
    issues.push({
      severity: "warning",
      code: "large-prompt",
      message: `This prompt is roughly ${total.toLocaleString("en-US")} tokens, above the ${threshold.toLocaleString("en-US")} warning threshold.`,
    });
  }

  return issues;
}

/**
 * A deliberately narrow truncation check: the last `<` has no `>` after it, so
 * the text stops part-way through a tag. Comparing total counts of `<` and `>`
 * would be broader but fires constantly on ordinary code (`a < b`, `=>`), and a
 * warning that is usually wrong gets ignored.
 */
function looksTruncated(text: string): boolean {
  const lastOpen = text.lastIndexOf("<");
  if (lastOpen === -1) return false;
  return text.indexOf(">", lastOpen) === -1;
}

/** Detects content that already carries the wrapper the composer will add. */
function containsOwnTag(text: string, tag: string): boolean {
  if (!tag) return false;
  return new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>`, "i").test(text);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
