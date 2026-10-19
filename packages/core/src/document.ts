/**
 * The save-file format. This is what `Export` writes and `Import` reads, so it
 * has to survive being edited by hand, copied between machines, and read by a
 * future version — hence the schema version and the defensive parsing.
 */

import type { Block, Prompt } from "./types.js";
import { SCHEMA_VERSION, createId } from "./types.js";

export interface PromptDocument {
  /** Identifies the file when the user has several. */
  name?: string;
  prompt: Prompt;
}

export function toPromptDocument(prompt: Prompt, name?: string): string {
  const document: PromptDocument = name ? { name, prompt } : { prompt };
  return JSON.stringify(document, null, 2);
}

export type ParseResult =
  | { ok: true; document: PromptDocument }
  | { ok: false; error: string };

/**
 * Accepts either a full document (`{ prompt: … }`) or a bare prompt, so pasting
 * either half of an export still works. Unknown fields are dropped, missing ids
 * are regenerated, and anything structurally wrong is reported rather than
 * thrown.
 */
export function parsePromptDocument(input: string | unknown): ParseResult {
  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch (error) {
      return { ok: false, error: `Not valid JSON: ${(error as Error).message}` };
    }
  }

  if (!isRecord(data)) return { ok: false, error: "Expected a JSON object." };

  const name = typeof data["name"] === "string" ? (data["name"] as string) : undefined;
  const promptSource = isRecord(data["prompt"]) ? data["prompt"] : data;

  if (!Array.isArray(promptSource["blocks"])) {
    return { ok: false, error: 'Expected a "blocks" array.' };
  }

  const version = promptSource["schemaVersion"];
  if (version !== undefined && version !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schemaVersion ${String(version)}; this build reads version ${SCHEMA_VERSION}.`,
    };
  }

  const blocks = (promptSource["blocks"] as unknown[]).map(parseBlock).filter(isBlock);
  const prompt: Prompt = { schemaVersion: SCHEMA_VERSION, blocks };
  return { ok: true, document: name ? { name, prompt } : { prompt } };
}

function parseBlock(value: unknown): Block | null {
  if (!isRecord(value)) return null;
  const tag = value["tag"];
  if (typeof tag !== "string" || tag.length === 0) return null;

  const block: Block = {
    id: typeof value["id"] === "string" && value["id"] ? (value["id"] as string) : createId(),
    tag,
    content: typeof value["content"] === "string" ? (value["content"] as string) : "",
    enabled: value["enabled"] !== false,
  };

  const attributes = value["attributes"];
  if (isRecord(attributes)) {
    const entries = Object.entries(attributes).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
    if (entries.length > 0) block.attributes = Object.fromEntries(entries);
  }

  const children = value["children"];
  if (Array.isArray(children)) {
    const parsed = children.map(parseBlock).filter(isBlock);
    if (parsed.length > 0) block.children = parsed;
  }

  return block;
}

function isBlock(value: Block | null): value is Block {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
