/**
 * JSON outputs: a plain object view of the prompt, and a ready-to-send Anthropic
 * Messages API request body.
 */

import type { Block, Prompt } from "../types.js";
import { DEFAULT_SYSTEM_TAGS } from "../tags.js";
import { serializeXml, isRenderable, trimSurroundingBlankLines, type SerializeXmlOptions } from "./xml.js";

export type JsonValue = string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Renders the prompt as a JSON object keyed by tag name.
 *
 * Repeated tags collapse into an array, so a container of examples becomes
 * `{ "examples": ["…", "…"] }` rather than a redundant extra level. A block that
 * has both its own text and children keeps them apart under `content` and the
 * child tag names.
 */
export function serializeJsonObject(prompt: Prompt): Record<string, JsonValue> {
  return groupBlocks(prompt.blocks);
}

export function serializeJson(prompt: Prompt, space = 2): string {
  return JSON.stringify(serializeJsonObject(prompt), null, space);
}

function groupBlocks(blocks: Block[]): Record<string, JsonValue> {
  const grouped: Record<string, JsonValue[]> = {};
  for (const block of blocks) {
    if (!isRenderable(block)) continue;
    (grouped[block.tag] ??= []).push(blockValue(block));
  }
  const result: Record<string, JsonValue> = {};
  for (const [tag, values] of Object.entries(grouped)) {
    const first = values[0];
    result[tag] = values.length === 1 && first !== undefined ? first : values;
  }
  return result;
}

function blockValue(block: Block): JsonValue {
  const content = trimSurroundingBlankLines(block.content);
  const children = (block.children ?? []).filter(isRenderable);

  if (children.length === 0) return content;

  // A pure container whose children all share one tag flattens to an array.
  const tags = new Set(children.map((c) => c.tag));
  if (content.length === 0 && tags.size === 1) {
    return children.map(blockValue);
  }

  const value: Record<string, JsonValue> = {};
  if (content.length > 0) value["content"] = content;
  Object.assign(value, groupBlocks(children));
  return value;
}

export interface MessagesRequestOptions extends SerializeXmlOptions {
  model?: string;
  maxTokens?: number;
  /** Tags routed to the system prompt. Defaults to `DEFAULT_SYSTEM_TAGS`. */
  systemTags?: readonly string[];
}

export interface MessagesRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{ role: "user"; content: string }>;
}

/**
 * Splits the prompt into a system prompt and a single user message.
 *
 * If every block is a system-tagged one there would be nothing to respond to, so
 * in that case the whole prompt goes into the user message instead of producing
 * a request that does nothing.
 */
export function toMessagesRequest(
  prompt: Prompt,
  options: MessagesRequestOptions = {},
): MessagesRequest {
  const systemTags = new Set(options.systemTags ?? DEFAULT_SYSTEM_TAGS);
  const renderable = prompt.blocks.filter(isRenderable);

  let systemBlocks = renderable.filter((b) => systemTags.has(b.tag));
  let userBlocks = renderable.filter((b) => !systemTags.has(b.tag));

  if (userBlocks.length === 0) {
    userBlocks = systemBlocks;
    systemBlocks = [];
  }

  // Key order matters only for readability, but this is a body people read and
  // paste, so it is built in the order the API documents it.
  const request: MessagesRequest = {
    model: options.model ?? "claude-opus-5",
    max_tokens: options.maxTokens ?? 4096,
    ...(systemBlocks.length > 0 ? { system: serializeSubset(systemBlocks, options) } : {}),
    messages: [{ role: "user", content: serializeSubset(userBlocks, options) }],
  };

  return request;
}

export function serializeMessagesRequest(
  prompt: Prompt,
  options: MessagesRequestOptions = {},
): string {
  return JSON.stringify(toMessagesRequest(prompt, options), null, 2);
}

function serializeSubset(blocks: Block[], options: SerializeXmlOptions): string {
  return serializeXml({ schemaVersion: 1, blocks }, options);
}
