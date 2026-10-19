/**
 * The prompt model. Deliberately plain data: no classes, no framework types, no
 * DOM. Anything that consumes tidy-prompt — the web app, a browser extension, an
 * editor plugin, a future server-side "tidy this prompt" pass — works with these
 * same structures.
 */

/** A single tagged section of a prompt, e.g. `<instructions>…</instructions>`. */
export interface Block {
  id: string;
  /** Tag name as it will be emitted. Validated as an XML NCName. */
  tag: string;
  content: string;
  /** Disabled blocks stay in the document but are omitted from every output. */
  enabled: boolean;
  /** Optional XML attributes, e.g. `{ index: "1" }` -> `<example index="1">`. */
  attributes?: Record<string, string>;
  /** Repeated sub-sections, e.g. several `<example>` inside `<examples>`. */
  children?: Block[];
}

export interface Prompt {
  schemaVersion: 1;
  blocks: Block[];
}

/**
 * `error` and `warning` come from validation: the output is broken or probably
 * not what was meant. `hint` comes from `suggestImprovements`: the output is
 * fine, but the prompt could ask for more clearly.
 */
export type IssueSeverity = "error" | "warning" | "hint";

export interface ValidationIssue {
  severity: IssueSeverity;
  /** Stable machine-readable code, so UIs can style or filter without parsing text. */
  code:
    | "invalid-tag-name"
    | "reserved-tag-name"
    | "empty-tag-name"
    | "empty-block"
    | "duplicate-tag"
    | "invalid-attribute-name"
    | "unbalanced-markup"
    | "redundant-tag"
    | "large-prompt"
    | "thin-task"
    | "vague-wording"
    | "no-done-check"
    | "material-without-task";
  message: string;
  /** Block the issue belongs to, when it is not a whole-prompt issue. */
  blockId?: string;
}

export const SCHEMA_VERSION = 1 as const;

/** An empty prompt document. */
export function emptyPrompt(): Prompt {
  return { schemaVersion: SCHEMA_VERSION, blocks: [] };
}

/**
 * Generates a block id, preferring `crypto.randomUUID`. The global is reached
 * structurally rather than through the DOM `Crypto` type so this package keeps
 * compiling with no DOM lib — it has to run in a service worker and in Node too.
 */
export function createId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoRef?.randomUUID === "function") return cryptoRef.randomUUID();
  // Fallback for older runtimes: not cryptographically meaningful, just unique
  // enough to key a list.
  return `b-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export interface CreateBlockInput {
  tag: string;
  content?: string;
  enabled?: boolean;
  attributes?: Record<string, string>;
  children?: Block[];
}

export function createBlock(input: CreateBlockInput): Block {
  const block: Block = {
    id: createId(),
    tag: input.tag,
    content: input.content ?? "",
    enabled: input.enabled ?? true,
  };
  if (input.attributes && Object.keys(input.attributes).length > 0) {
    block.attributes = { ...input.attributes };
  }
  if (input.children && input.children.length > 0) {
    block.children = input.children;
  }
  return block;
}
