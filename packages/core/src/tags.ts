/**
 * The built-in tag vocabulary.
 *
 * These are aimed at the main use case: briefing an AI coding agent to build or
 * change a piece of software. A feature brief has a recognisable shape — what to
 * build, the codebase it lands in, what "done" means, what not to touch — and
 * each of those is a separate tag so the model can be pointed at one without
 * dragging in the rest.
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
  /** Present in a new, empty prompt. */
  defaultEnabled?: boolean;
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
  {
    tag: "instructions",
    label: "Instructions",
    description: "The change to make. One clear objective beats five vague ones.",
    defaultOrder: 20,
    defaultEnabled: true,
    placeholder:
      "Add a saved-views feature to the dashboard: users can name the current filter set, reload it later, and delete saved views.",
  },
  {
    tag: "context",
    label: "Context",
    description:
      "Background the model needs but should not act on: product goals, history, why this is being built.",
    defaultOrder: 30,
    defaultEnabled: true,
    placeholder:
      "Dashboard filters currently reset on reload, which is the top support complaint. We ship weekly and cannot break existing URLs.",
  },
  {
    tag: "codebase",
    label: "Codebase",
    description:
      "Where the change lands: architecture, relevant files, conventions to follow.",
    defaultOrder: 40,
    placeholder:
      "State lives in src/state/useDashboardStore.ts (useReducer + context). Persistence helpers are in src/lib/storage.ts. Components are function components with colocated CSS modules.",
  },
  {
    tag: "tech_stack",
    label: "Tech stack",
    description: "Languages, frameworks and versions the solution must fit.",
    defaultOrder: 50,
    placeholder: "React 19, TypeScript 5.7 strict, Vite 6, vitest. No new runtime dependencies.",
  },
  {
    tag: "requirements",
    label: "Requirements",
    description: "The functional requirements, one per line or one per child block.",
    defaultOrder: 60,
    container: true,
    childTag: "requirement",
    defaultEnabled: true,
    placeholder:
      "A view stores the active filters, sort order and column layout.\nView names are unique per user; saving a duplicate name prompts to overwrite.",
  },
  {
    tag: "acceptance_criteria",
    label: "Acceptance criteria",
    description: "Observable conditions that decide whether the work is done.",
    defaultOrder: 70,
    container: true,
    childTag: "criterion",
    placeholder:
      "Given three saved views, when I reload the page, then all three are listed in the order they were created.",
  },
  {
    tag: "existing_code",
    label: "Existing code",
    description: "The current implementation to modify, extend or match.",
    defaultOrder: 80,
    placeholder: "Paste the files or functions the change touches.",
  },
  {
    tag: "data",
    label: "Data",
    description: "Schemas, sample payloads, fixtures or records to work against.",
    defaultOrder: 90,
    placeholder: 'Paste the API response, schema or sample rows.',
  },
  {
    tag: "examples",
    label: "Examples",
    description: "Worked examples of the input and the output you expect.",
    defaultOrder: 100,
    container: true,
    childTag: "example",
    placeholder: "",
  },
  {
    tag: "constraints",
    label: "Constraints",
    description:
      "Hard limits: performance budgets, security rules, backwards compatibility, what not to change.",
    defaultOrder: 110,
    placeholder:
      "Do not change the public API of useDashboardStore. No migrations. Keep the bundle under 200 KB gzipped.",
  },
  {
    tag: "edge_cases",
    label: "Edge cases",
    description: "The awkward inputs and states the implementation must survive.",
    defaultOrder: 120,
    placeholder:
      "localStorage is full or disabled. A saved view references a filter that no longer exists.",
  },
  {
    tag: "testing",
    label: "Testing",
    description: "How the change should be verified, and what must be covered.",
    defaultOrder: 130,
    placeholder:
      "Unit tests for the reducer with vitest. Cover the duplicate-name path and the storage-unavailable path.",
  },
  {
    tag: "out_of_scope",
    label: "Out of scope",
    description: "Work to explicitly leave alone — the cheapest way to prevent scope creep.",
    defaultOrder: 140,
    placeholder: "Server-side sync, sharing views between users, and the mobile layout.",
  },
  {
    tag: "output_format",
    label: "Output format",
    description: "The exact shape of the answer: diff, whole files, JSON, prose.",
    defaultOrder: 150,
    placeholder:
      "Return a unified diff per file, then a short summary of the trade-offs you made.",
  },
  {
    tag: "thinking",
    label: "Thinking",
    description: "How the model should reason before it answers.",
    defaultOrder: 160,
    placeholder:
      "List the files you would touch and why before writing any code. Flag anything ambiguous instead of guessing.",
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
 * Tags routed to the `system` message by `toMessagesRequest`: the standing
 * instructions, as opposed to the material of this particular request.
 */
export const DEFAULT_SYSTEM_TAGS: readonly string[] = [
  "role",
  "instructions",
  "constraints",
  "output_format",
  "thinking",
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
