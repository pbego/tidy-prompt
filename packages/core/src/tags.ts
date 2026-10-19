/**
 * The built-in tag vocabulary.
 *
 * The defaults lean towards briefing an AI agent to build or change software —
 * what to build, the codebase it lands in, what "done" means, what not to touch
 * — but the templates in ./templates.ts also cover research, debugging and code
 * review, so the vocabulary carries tags for those as well. Each tag is separate
 * so the model can be pointed at one without dragging in the rest.
 *
 * Order is "material first, ask last": background, code and data come before the
 * instructions that act on them. Anthropic's prompting guidance puts long inputs
 * above the query and says a closing query improves quality on large, multi-part
 * prompts; short prompts are unaffected, so it costs nothing to default to it.
 *
 * Users can add any other tag name; nothing here is a closed set.
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
}

export const BUILTIN_TAGS: readonly TagDefinition[] = [
  {
    tag: "role",
    label: "Role",
    description: "Who the model should act as, and the seniority to assume.",
    defaultOrder: 10,
    placeholder:
      "You are a senior TypeScript engineer working in an existing React codebase. You favour small, reviewable changes over rewrites.",
  },

  // Material: what the model reads before it is told what to do.
  {
    tag: "context",
    label: "Context",
    description:
      "Background the model needs but should not act on: goals, history, why this is being done.",
    defaultOrder: 20,
    placeholder:
      "Dashboard filters currently reset on reload, which is the top support complaint. We ship weekly and cannot break existing URLs.",
  },
  {
    tag: "sources",
    label: "Sources",
    description: "Documents, links or excerpts to ground the answer in.",
    defaultOrder: 30,
    placeholder: "Paste the passages or notes to work from, and say where each one came from.",
  },
  {
    tag: "symptoms",
    label: "Symptoms",
    description: "What is going wrong: the observed behaviour, error messages and logs.",
    defaultOrder: 40,
    placeholder:
      "Saving a view throws QuotaExceededError in Safari private mode, and the page stays on the spinner.",
  },
  {
    tag: "expected_behavior",
    label: "Expected behaviour",
    description: "What should happen instead.",
    defaultOrder: 50,
    placeholder: "The view saves, or a clear message explains why it cannot.",
  },
  {
    tag: "reproduction",
    label: "Reproduction",
    description: "The steps that trigger it, and how often it happens.",
    defaultOrder: 60,
    placeholder:
      "1. Open the dashboard in a private window. 2. Apply any filter. 3. Click Save view. Happens every time.",
  },
  {
    tag: "codebase",
    label: "Codebase",
    description:
      "Where the change lands: architecture, relevant files, conventions to follow.",
    defaultOrder: 70,
    placeholder:
      "State lives in src/state/useDashboardStore.ts (useReducer + context). Persistence helpers are in src/lib/storage.ts. Components are function components with colocated CSS modules.",
  },
  {
    tag: "tech_stack",
    label: "Tech stack",
    description: "Languages, frameworks and versions the solution must fit.",
    defaultOrder: 80,
    placeholder: "React 19, TypeScript 5.7 strict, Vite 6, vitest. No new runtime dependencies.",
  },
  {
    tag: "existing_code",
    label: "Existing code",
    description: "The current implementation to modify, extend or match.",
    defaultOrder: 90,
    placeholder: "Paste the files or functions the change touches.",
  },
  {
    tag: "changes",
    label: "Changes",
    description: "The diff or files under review.",
    defaultOrder: 100,
    placeholder: "Paste the diff, or the files that changed.",
  },
  {
    tag: "data",
    label: "Data",
    description: "Schemas, sample payloads, fixtures or records to work against.",
    defaultOrder: 110,
    placeholder: "Paste the API response, schema or sample rows.",
  },

  // The ask: everything from here on tells the model what to do with the above.
  {
    tag: "instructions",
    label: "Instructions",
    description: "The task. One clear objective beats five vague ones.",
    defaultOrder: 120,
    placeholder:
      "Add a saved-views feature to the dashboard: users can name the current filter set, reload it later, and delete saved views.",
  },
  {
    tag: "review_focus",
    label: "Review focus",
    description: "What to look for, and what to skip.",
    defaultOrder: 130,
    placeholder: "Correctness and error handling first. Ignore formatting; the linter covers it.",
  },
  {
    tag: "requirements",
    label: "Requirements",
    description: "The functional requirements, one per line or one per child block.",
    defaultOrder: 140,
    container: true,
    childTag: "requirement",
    placeholder:
      "A view stores the active filters, sort order and column layout.\nView names are unique per user; saving a duplicate name prompts to overwrite.",
  },
  {
    tag: "acceptance_criteria",
    label: "Acceptance criteria",
    description: "Observable conditions that decide whether the work is done.",
    defaultOrder: 150,
    container: true,
    childTag: "criterion",
    placeholder:
      "Given three saved views, when I reload the page, then all three are listed in the order they were created.",
  },
  {
    tag: "examples",
    label: "Examples",
    description: "Worked examples of the input and the output you expect.",
    defaultOrder: 160,
    container: true,
    childTag: "example",
    placeholder: "",
  },
  {
    tag: "constraints",
    label: "Constraints",
    description:
      "Hard limits: performance budgets, security rules, backwards compatibility, what not to change.",
    defaultOrder: 170,
    placeholder:
      "Do not change the public API of useDashboardStore. No migrations. Keep the bundle under 200 KB gzipped.",
  },
  {
    tag: "edge_cases",
    label: "Edge cases",
    description: "The awkward inputs and states the answer must survive.",
    defaultOrder: 180,
    placeholder:
      "localStorage is full or disabled. A saved view references a filter that no longer exists.",
  },
  {
    tag: "testing",
    label: "Testing",
    description: "How the change should be verified, and what must be covered.",
    defaultOrder: 190,
    placeholder:
      "Unit tests for the reducer with vitest. Cover the duplicate-name path and the storage-unavailable path.",
  },
  {
    tag: "out_of_scope",
    label: "Out of scope",
    description: "Work to explicitly leave alone — the cheapest way to prevent scope creep.",
    defaultOrder: 200,
    placeholder: "Server-side sync, sharing views between users, and the mobile layout.",
  },
  {
    // Deliberately not "thinking": current Claude models may decline a request to
    // write their reasoning out (often in <thinking> tags) and are steered by
    // effort settings instead. This tag is about method, not a reasoning dump,
    // and states goals rather than a step list.
    tag: "approach",
    label: "Approach",
    description:
      "How to go about it: what to look at first and when to stop and ask. Goals beat step lists.",
    defaultOrder: 210,
    placeholder:
      "Read the files this touches before changing anything. If something is ambiguous, say so instead of guessing.",
  },
  {
    tag: "output_format",
    label: "Output format",
    description: "The exact shape of the answer: diff, whole files, JSON, prose.",
    defaultOrder: 220,
    placeholder:
      "Return a unified diff per file, then a short summary of the trade-offs you made.",
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
 * True for the built-in tags that carry material the model reads before the ask:
 * everything positioned after `role` and before `instructions`.
 */
export function isMaterialTag(tag: string): boolean {
  const definition = BY_TAG.get(tag);
  const role = BY_TAG.get("role");
  const instructions = BY_TAG.get("instructions");
  if (!definition || !role || !instructions) return false;
  return definition.defaultOrder > role.defaultOrder && definition.defaultOrder < instructions.defaultOrder;
}

/**
 * Tags routed to the `system` message by `toMessagesRequest`: the standing
 * instructions, as opposed to the material of this particular request.
 */
export const DEFAULT_SYSTEM_TAGS: readonly string[] = [
  "role",
  "instructions",
  "constraints",
  "approach",
  "output_format",
];

/** Turns `output_format` into `Output format` for headings and labels. */
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
