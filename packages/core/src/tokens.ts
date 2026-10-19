/**
 * Token estimation.
 *
 * This is a heuristic, not a tokenizer — it exists so the editor can show
 * relative weight ("the data block is 90% of this prompt") and catch a prompt
 * that has quietly grown enormous. Every number it produces should be presented
 * as approximate.
 *
 * The common chars/4 rule badly undercounts CJK text, where a character is
 * roughly a token, and undercounts dense code, where whitespace and punctuation
 * split more aggressively than prose. So: count CJK characters individually,
 * apply chars/4 to the rest, and take the larger of that and a word-based
 * estimate.
 */

import type { Block, Prompt } from "./types.js";
import { isRenderable } from "./serialize/xml.js";

// Han, Hiragana, Katakana, Hangul.
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/gu;

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  const cjkCount = (text.match(CJK) ?? []).length;
  const rest = text.length - cjkCount;
  const charEstimate = cjkCount + Math.ceil(rest / 4);
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordEstimate = Math.ceil(words * 0.75);
  return Math.max(charEstimate, wordEstimate);
}

/**
 * Estimate for one block including its tags and children. A block that
 * contributes nothing to the output — disabled, or empty — costs nothing, so the
 * count always matches what would actually be sent.
 */
export function estimateBlockTokens(block: Block): number {
  if (!isRenderable(block)) return 0;
  // Roughly account for the tag pair itself; a short tag is 1–3 tokens a side.
  const tagOverhead = estimateTokens(`<${block.tag}></${block.tag}>`);
  const attributeText = Object.entries(block.attributes ?? {})
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  const childTotal = (block.children ?? []).reduce(
    (sum, child) => sum + estimateBlockTokens(child),
    0,
  );
  return tagOverhead + estimateTokens(block.content) + estimateTokens(attributeText) + childTotal;
}

export interface PromptTokenEstimate {
  total: number;
  /** Per top-level block, keyed by block id. */
  byBlock: Record<string, number>;
}

export function estimatePromptTokens(prompt: Prompt): PromptTokenEstimate {
  const byBlock: Record<string, number> = {};
  let total = 0;
  for (const block of prompt.blocks) {
    const count = estimateBlockTokens(block);
    byBlock[block.id] = count;
    total += count;
  }
  return { total, byBlock };
}
