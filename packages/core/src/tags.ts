/**
 * The built-in tag vocabulary.
 *
 * It is deliberately small. An agent brief needs a handful of things — the task,
 * the background, what to read, what the result must do, what to leave alone — and
 * every extra near-synonym is one more name to choose between. So there is one tag
 * for each job: `context` also carries the codebase and stack, `code` covers both
 * the code to change and a diff to review, and `requirements` is also where "done
 * when" goes. Anything else can be added as a custom tag; nothing here is a closed set.
 *
 * Order is "material first, ask last": background, code and data come before the
 * task that acts on them. Anthropic's prompting guidance puts long inputs above the
 * query and says a closing query improves quality on large, multi-part prompts;
 * short prompts are unaffected, so it costs nothing to default to it.
 *
 * Tags that only make sense in one kind of brief (a bug report, a review) name
 * their templates and stay out of the Add tag menu elsewhere.
 */

export interface TagDefinition {
  tag: string;
  label: string;
  description: string;
  /** Suggested position when a block is added; lower sorts earlier. */
  defaultOrder: number;
  /** True when the tag is a container for repeated child blocks. */
  container?: boolean;
  /** Tag name used for children of a container. */
  childTag?: string;
  /** Placeholder shown in the editor textarea. */
  placeholder?: string;
  /**
   * Template ids this tag belongs to. When set, it is offered in the Add tag menu
   * only while one of those templates is in use. It can still be added by typing
   * its name, and it keeps its description and placeholder wherever it appears.
   */
  templates?: readonly string[];
}

export const BUILTIN_TAGS: readonly TagDefinition[] = [
  // Material: what the model reads before it is told what to do.
  {
    tag: "context",
    label: "Context",
    description:
      "Background the model needs but should not act on: goals, history, how the codebase is laid out, the stack and its conventions.",
    defaultOrder: 10,
    placeholder:
      "Dashboard filters reset on reload, which is the top support complaint. State lives in src/state/useDashboardStore.ts and persistence helpers are in src/lib/storage.ts. React 19, strict TypeScript, no new runtime dependencies.",
  },
  {
    tag: "references",
    label: "References",
    description:
      "Where to look, not what to paste: links, file paths, tickets or docs the model should read.",
    defaultOrder: 20,
    placeholder:
      "Spec: https://example.com/saved-views-spec\nPersistence helpers: src/lib/storage.ts\nTicket: DASH-482",
  },
  {
    tag: "symptoms",
    label: "Symptoms",
    description: "What is going wrong: the observed behaviour, error messages and logs.",
    defaultOrder: 30,
    templates: ["debug"],
    placeholder:
      "Saving a view throws QuotaExceededError in Safari private mode, and the page stays on the spinner.",
  },
  {
    tag: "expected_behavior",
    label: "Expected behaviour",
    description: "What should happen instead.",
    defaultOrder: 40,
    templates: ["debug"],
    placeholder: "The view saves, or a clear message explains why it cannot.",
  },
  {
    tag: "reproduction",
    label: "Reproduction",
    description: "The steps that trigger it, and how often it happens.",
    defaultOrder: 50,
    templates: ["debug"],
    placeholder:
      "1. Open the dashboard in a private window. 2. Apply any filter. 3. Click Save view. Happens every time.",
  },
  {
    tag: "code",
    label: "Code",
    description: "Source code or a diff: what to change, match or review.",
    defaultOrder: 60,
    placeholder: "Paste the files, functions or diff the work touches.",
  },
  {
    tag: "data",
    label: "Data",
    description:
      "Pasted material to work from: documents, excerpts, records, schemas or sample payloads.",
    defaultOrder: 70,
    placeholder: "Paste the passages, notes, API response or sample rows.",
  },

  // The ask: everything from here on tells the model what to do with the above.
  {
    tag: "task",
    label: "Task",
    description:
      "What you want done, in a sentence or two. One clear objective beats five vague ones.",
    defaultOrder: 80,
    placeholder:
      "Go through the open support tickets about saved views and suggest the three changes that would remove the most of them.",
  },
  {
    tag: "review_focus",
    label: "Review focus",
    description: "What to look for, and what to skip.",
    defaultOrder: 90,
    templates: ["review"],
    placeholder: "Correctness and error handling first. Ignore formatting; the linter covers it.",
  },
  {
    tag: "requirements",
    label: "Requirements",
    description:
      "What the result must do, one per line or one per child block. Say how you will tell it is done.",
    defaultOrder: 100,
    container: true,
    childTag: "requirement",
    placeholder:
      "A view stores the active filters, sort order and column layout.\nView names are unique per user; saving a duplicate name prompts to overwrite.\nDone when reloading the page lists every saved view in the order it was created.",
  },
  {
    tag: "examples",
    label: "Examples",
    description: "Worked examples of the input and the output you expect.",
    defaultOrder: 110,
    container: true,
    childTag: "example",
    placeholder: "",
  },
  {
    tag: "out_of_scope",
    label: "Out of scope",
    description: "Work to explicitly leave alone — the cheapest way to prevent scope creep.",
    defaultOrder: 120,
    placeholder: "Server-side sync, sharing views between users, and the mobile layout.",
  },
];

const BY_TAG = new Map(BUILTIN_TAGS.map((d) => [d.tag, d]));

export function getTagDefinition(tag: string): TagDefinition | undefined {
  return BY_TAG.get(tag);
}

export function isBuiltinTag(tag: string): boolean {
  return BY_TAG.has(tag);
}

/**
 * The built-in tags to offer while `templateId` is in use: everything that is not
 * tied to a template, plus the tags that belong to this one. With no template —
 * a prompt that came from a saved file or an import — only the general tags.
 */
export function builtinTagsFor(templateId: string | null): readonly TagDefinition[] {
  return BUILTIN_TAGS.filter(
    (definition) =>
      !definition.templates || (templateId !== null && definition.templates.includes(templateId)),
  );
}

/**
 * True for the built-in tags that carry material the model reads before the ask:
 * everything positioned ahead of `task`, the first of the ask tags.
 */
export function isMaterialTag(tag: string): boolean {
  const definition = BY_TAG.get(tag);
  const task = BY_TAG.get("task");
  if (!definition || !task) return false;
  return definition.defaultOrder < task.defaultOrder;
}

/**
 * Tags routed to the `system` message by `toMessagesRequest`. Only `role`: the one
 * thing that is standing guidance about the model rather than part of this request.
 * It is not a built-in tag, but people type it, and it belongs in the system prompt
 * when they do. Everything else — the task included — goes in the user turn.
 */
export const DEFAULT_SYSTEM_TAGS: readonly string[] = ["role"];

/** Turns `out_of_scope` into `Out of scope` for headings and labels. */
export function humanizeTag(tag: string): string {
  const known = BY_TAG.get(tag);
  if (known) return known.label;
  const words = tag.split(/[_\-.]+/).filter(Boolean);
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toLowerCase(),
    )
    .join(" ");
}
