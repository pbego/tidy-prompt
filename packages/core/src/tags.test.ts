import { describe, it, expect } from "vitest";
import {
  BUILTIN_TAGS,
  DEFAULT_SYSTEM_TAGS,
  builtinTagsFor,
  getTagDefinition,
  isBuiltinTag,
  isMaterialTag,
} from "./tags.js";

const orderOf = (tag: string) => getTagDefinition(tag)!.defaultOrder;

/** Read by the model before it is told what to do. */
const MATERIAL = [
  "context",
  "references",
  "symptoms",
  "expected_behavior",
  "reproduction",
  "code",
  "data",
];

/** Tell the model what to do with the material. */
const ASK = ["task", "review_focus", "requirements", "examples", "out_of_scope"];

/** Cut as near-synonyms, or as tags that do not fit an agent brief. */
const REMOVED = [
  "role",
  "instructions",
  "sources",
  "codebase",
  "tech_stack",
  "existing_code",
  "changes",
  "acceptance_criteria",
  "constraints",
  "edge_cases",
  "testing",
  "approach",
  "output_format",
];

describe("the built-in vocabulary", () => {
  it("stays small", () => {
    expect(BUILTIN_TAGS.length).toBeLessThanOrEqual(12);
    expect(BUILTIN_TAGS.map((t) => t.tag).sort()).toEqual([...MATERIAL, ...ASK].sort());
  });

  it("no longer carries the near-synonyms it replaced", () => {
    for (const tag of REMOVED) expect(isBuiltinTag(tag), tag).toBe(false);
  });

  it("describes references as pointers and data as pasted material", () => {
    expect(getTagDefinition("references")!.description).toMatch(/where to look/i);
    expect(getTagDefinition("data")!.description).toMatch(/pasted/i);
  });

  it("makes requirements the place for 'done when'", () => {
    expect(getTagDefinition("requirements")!.description).toMatch(/done/i);
    expect(getTagDefinition("requirements")!.container).toBe(true);
  });
});

describe("built-in tag order", () => {
  it("lists the registry in the same order as defaultOrder", () => {
    const orders = BUILTIN_TAGS.map((t) => t.defaultOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("gives every tag a distinct position", () => {
    expect(new Set(BUILTIN_TAGS.map((t) => t.defaultOrder)).size).toBe(BUILTIN_TAGS.length);
  });

  it("puts material the model reads before the task that acts on it", () => {
    for (const material of MATERIAL) {
      expect(orderOf(material), material).toBeLessThan(orderOf("task"));
    }
  });

  it("starts the ask with task and keeps the rest of it after", () => {
    for (const ask of ASK.filter((tag) => tag !== "task")) {
      expect(orderOf(ask), ask).toBeGreaterThan(orderOf("task"));
    }
  });

  it("opens with context and closes with what to leave alone", () => {
    expect(BUILTIN_TAGS[0]!.tag).toBe("context");
    expect(BUILTIN_TAGS[BUILTIN_TAGS.length - 1]!.tag).toBe("out_of_scope");
  });
});

describe("isMaterialTag", () => {
  it("is true for exactly the tags that sit ahead of the task", () => {
    expect(BUILTIN_TAGS.map((t) => t.tag).filter(isMaterialTag)).toEqual(MATERIAL);
  });

  it("is false for the ask and for tags it does not know", () => {
    for (const tag of ASK) expect(isMaterialTag(tag), tag).toBe(false);
    expect(isMaterialTag("role")).toBe(false);
    expect(isMaterialTag("rollout_plan")).toBe(false);
  });
});

describe("builtinTagsFor", () => {
  const names = (templateId: string | null) => builtinTagsFor(templateId).map((t) => t.tag);

  it("offers the general tags everywhere", () => {
    for (const templateId of [null, "task", "build", "debug", "review", "blank"]) {
      for (const tag of ["context", "references", "code", "data", "task", "requirements", "examples", "out_of_scope"]) {
        expect(names(templateId), `${templateId}: ${tag}`).toContain(tag);
      }
    }
  });

  it("offers the bug-report tags only in the debug template", () => {
    const bug = ["symptoms", "expected_behavior", "reproduction"];
    for (const tag of bug) expect(names("debug")).toContain(tag);
    for (const templateId of [null, "task", "build", "review", "research", "blank"]) {
      for (const tag of bug) expect(names(templateId), `${templateId}: ${tag}`).not.toContain(tag);
    }
  });

  it("offers the review focus only in the review template", () => {
    expect(names("review")).toContain("review_focus");
    expect(names("debug")).not.toContain("review_focus");
    expect(names(null)).not.toContain("review_focus");
  });

  it("keeps a template-only tag's definition available for lookup", () => {
    expect(getTagDefinition("symptoms")!.placeholder).toBeTruthy();
    expect(isBuiltinTag("review_focus")).toBe(true);
  });
});

describe("system routing", () => {
  it("sends only a hand-typed role to the system prompt", () => {
    expect(DEFAULT_SYSTEM_TAGS).toEqual(["role"]);
  });

  it("routes no built-in tag to the system prompt", () => {
    for (const { tag } of BUILTIN_TAGS) expect(DEFAULT_SYSTEM_TAGS, tag).not.toContain(tag);
  });
});
